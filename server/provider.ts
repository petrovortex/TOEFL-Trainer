import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { setting, configure } from './store.ts'
const issuer = 'https://auth.openai.com',
  resource = 'https://api.openai.com/v1'
const jwks = createRemoteJWKSet(new URL(issuer + '/.well-known/jwks.json'))
const scope =
  'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct'
type Provider = 'chatgpt' | 'openai' | 'gemini'
interface Credential {
  access_token: string
  refresh_token: string
  id_token: string
  scope: string
  expires: number
  sub: string
  client: string
}
function protect(value: string, decode = false) {
  // Standard input keeps credentials out of command-line arguments and logs.
  const ps =
    'Add-Type -AssemblyName System.Security; $v=[Console]::In.ReadToEnd(); ' +
    (decode
      ? '[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($v),$null,0))'
      : '[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($v),$null,0))')
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', ps],
    { input: value, encoding: 'utf8', windowsHide: true, timeout: 10000 },
  )
  if (result.status !== 0)
    throw Error('Windows could not access the protected credential store.')
  return result.stdout.trim()
}
const secret = (key: string) => {
  const data = setting(key)
  return data ? protect(data, true) : ''
}
const put = (key: string, v: string) => configure(key, v ? protect(v) : '')
const provider = () => (setting('provider') || 'chatgpt') as Provider
export function preferences() {
  const p = provider()
  return {
    provider: p,
    model: setting(p + '-model'),
    configured: !!setting(p + '-secret'),
    models: JSON.parse(setting('chatgpt-models') || '[]') as string[],
  }
}
export function setProvider(p: Provider, model: string, key?: string) {
  if (!['chatgpt', 'openai', 'gemini'].includes(p))
    throw Error('Unknown provider.')
  if (model.length > 100 || !/^[-\w./]*$/.test(model))
    throw Error('Invalid model name.')
  if (key && p !== 'chatgpt') put(p + '-secret', key.trim())
  configure(p + '-model', model)
  configure('provider', p)
}
export function disconnect() {
  put(provider() + '-secret', '')
  pending = undefined
}
type Pending = {
  state: string
  nonce: string
  verifier: string
  redirect: string
  until: number
  client: string
}
let pending: Pending | undefined
export function authorize(origin: string) {
  const host = setting('host') || 'urn:uuid:' + randomUUID()
  configure('host', host)
  const p = (pending = {
    state: randomBytes(32).toString('base64url'),
    nonce: randomUUID(),
    verifier: randomBytes(48).toString('base64url'),
    redirect: origin + '/auth/callback',
    until: Date.now() + 600000,
    client: setting('chatgpt-client'),
  })
  const query = new URLSearchParams({
    client_id: p.client || 'dynamic_agent_client',
    ext_agent_host_id: host,
    scope,
    resource,
    response_type: 'code',
    redirect_uri: p.redirect,
    state: p.state,
    nonce: p.nonce,
    code_challenge_method: 'S256',
    code_challenge: createHash('sha256').update(p.verifier).digest('base64url'),
  })
  if (!p.client) query.set('agent_name_hint', 'TOEFL Trainer')
  return issuer + '/api/accounts/authorize?' + query
}
async function request(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(90000),
  })
  if (!response.ok) {
    if (response.status === 429)
      throw Error(
        'The provider usage limit was reached. Your work is saved. Check your plan or retry later.',
      )
    if ([401, 403].includes(response.status))
      throw Error(
        'The provider denied access. Reconnect the account or check the key and model.',
      )
    throw Error(
      'The AI provider could not complete this request (HTTP ' +
        response.status +
        ').',
    )
  }
  return response
}
async function token(params: Record<string, string>) {
  return (
    await request(issuer + '/api/accounts/oauth/token', {
      method: 'POST',
      body: new URLSearchParams({ ...params, resource }),
    })
  ).json()
}
export async function callback(params: URLSearchParams) {
  const p = pending
  if (!p || p.until < Date.now() || params.get('state') !== p.state)
    throw Error('Sign-in has expired. Start again from Settings.')
  pending = undefined
  if (params.has('error')) throw Error('ChatGPT sign-in was declined.')
  const client = params.get('client_id') || p.client
  if (
    !client ||
    client === 'dynamic_agent_client' ||
    (p.client && p.client !== client) ||
    !params.get('code')
  )
    throw Error('Invalid client registration.')
  configure('chatgpt-client', client)
  const t = await token({
    client_id: client,
    code: params.get('code')!,
    code_verifier: p.verifier,
    redirect_uri: p.redirect,
    grant_type: 'authorization_code',
  })
  const { payload } = await jwtVerify(t.id_token, jwks, {
    issuer,
    audience: client,
    requiredClaims: ['exp', 'sub', 'nonce'],
  })
  if (
    payload.nonce !== p.nonce ||
    !t.scope?.split(' ').includes('chatgpt.tokens.use.direct')
  )
    throw Error('Grant permission to use your ChatGPT plan, then try again.')
  const prev = secret('chatgpt-secret')
  if (prev && JSON.parse(prev).sub !== payload.sub)
    throw Error('The account does not match the saved connection.')
  put(
    'chatgpt-secret',
    JSON.stringify({
      ...t,
      sub: payload.sub,
      client,
      expires: Date.now() + t.expires_in * 1000,
    }),
  )
  configure('provider', 'chatgpt')
  await verify()
}
let renewing: Promise<string> | undefined
async function access() {
  const v = secret('chatgpt-secret')
  if (!v) throw Error('Connect ChatGPT in Settings to use AI coaching.')
  const c: Credential = JSON.parse(v)
  if (c.expires > Date.now() + 60000) return c.access_token
  if (!renewing)
    renewing = (async () => {
      const t = await token({
        grant_type: 'refresh_token',
        refresh_token: c.refresh_token,
        client_id: c.client,
      })
      if (t.scope && !t.scope.split(' ').includes('chatgpt.tokens.use.direct'))
        throw Error('Reconnect ChatGPT and allow plan usage.')
      put(
        'chatgpt-secret',
        JSON.stringify({
          ...c,
          ...t,
          refresh_token: t.refresh_token || c.refresh_token,
          expires: Date.now() + t.expires_in * 1000,
        }),
      )
      return t.access_token as string
    })().finally(() => {
      renewing = undefined
    })
  return renewing
}
export async function completionText(response: Response) {
  let text = '',
    done = false,
    buffer = ''
  const reader = response.body!.getReader(),
    decoder = new TextDecoder()
  function line(s: string) {
    if (!s.startsWith('data:')) return
    const data = s.slice(5).trim()
    if (!data || data === '[DONE]') return
    const event = JSON.parse(data)
    if (event.type === 'response.output_text.delta') text += event.delta
    if (event.type === 'response.completed') done = true
    if (
      ['response.failed', 'response.incomplete', 'error'].includes(event.type)
    )
      throw Error('The AI response was interrupted. Retry from this attempt.')
  }
  for (;;) {
    const chunk = await reader.read()
    buffer += decoder.decode(chunk.value, { stream: !chunk.done })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const l of lines) line(l)
    if (chunk.done) break
  }
  line(buffer)
  if (!done || !text.trim())
    throw Error('The AI response was incomplete. Retry when connected.')
  return text.trim()
}
export async function complete(instructions: string, input: string) {
  const p = provider(),
    model = setting(p + '-model')
  if (!model)
    throw Error('Choose a model and verify your AI connection in Settings.')
  const key = p === 'chatgpt' ? await access() : secret(p + '-secret')
  if (!key) throw Error('Connect your AI provider in Settings.')
  if (p === 'gemini') {
    const response = await request(
      'https://generativelanguage.googleapis.com/v1beta/models/' +
        encodeURIComponent(model) +
        ':generateContent',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [{ role: 'user', parts: [{ text: input }] }],
        }),
      },
    )
    const r = await response.json(),
      c = r.candidates?.[0]
    const text = c?.content?.parts
      ?.filter((p: { thought?: boolean }) => !p.thought)
      .map((p: { text: string }) => p.text)
      .join('')
    if (c?.finishReason !== 'STOP' || !text)
      throw Error('Gemini returned an incomplete response.')
    return text
  }
  const response = await request(resource + '/responses', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions,
      input: [{ role: 'user', content: input }],
      stream: true,
      store: false,
    }),
  })
  return completionText(response)
}
export async function verify() {
  if (provider() === 'chatgpt') {
    const response = await request(resource + '/models', {
      headers: { Authorization: 'Bearer ' + (await access()) },
    })
    const catalog = (await response.json()).models
      ?.filter((m: { visibility: string }) => m.visibility === 'list')
      .map((m: { slug: string }) => m.slug)
    if (!catalog?.length) throw Error('No models are available on this plan.')
    configure('chatgpt-models', JSON.stringify(catalog))
    if (!catalog.includes(setting('chatgpt-model')))
      configure('chatgpt-model', catalog[0])
  }
  await complete('Answer briefly.', 'Reply with the word ready.')
  return preferences()
}
