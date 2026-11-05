import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
process.env.FIELDWORK_DATA = mkdtempSync(join(tmpdir(), 'fieldwork-test-'))
const { completionText, authorize, callback, complete, setProvider } =
  await import('../server/provider.ts')
test('provider accepts only completed streams, including fragmented SSE', async () => {
  const chunks = [
    'data: {"type":"response.output_text.',
    'delta","delta":"Fine"}\r\n\r\n',
    'data: {"type":"response.completed"}\n\n',
  ]
  const resp = new Response(
    new ReadableStream({
      start(c) {
        chunks.forEach((x) => c.enqueue(new TextEncoder().encode(x)))
        c.close()
      },
    }),
  )
  assert.equal(await completionText(resp), 'Fine')
  await assert.rejects(
    completionText(
      new Response(
        'data: {"type":"response.output_text.delta","delta":"partial"}\n\n',
      ),
    ),
    /incomplete/,
  )
})
test('loopback sign-in uses PKCE, a stable host and single-use validated state', async () => {
  const first = new URL(authorize('http://127.0.0.1:43127')),
    second = new URL(authorize('http://127.0.0.1:43127'))
  assert.equal(second.origin, 'https://auth.openai.com')
  assert.equal(
    second.searchParams.get('ext_agent_host_id'),
    first.searchParams.get('ext_agent_host_id'),
  )
  assert.notEqual(
    second.searchParams.get('state'),
    first.searchParams.get('state'),
  )
  assert.equal(second.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(
    second.searchParams.get('redirect_uri'),
    'http://127.0.0.1:43127/auth/callback',
  )
  await assert.rejects(
    callback(new URLSearchParams({ state: 'wrong' })),
    /expired/,
  )
  const denied = new URLSearchParams({
    state: second.searchParams.get('state')!,
    error: 'access_denied',
  })
  await assert.rejects(callback(denied), /declined/)
  await assert.rejects(callback(denied), /expired/)
})
test(
  'a provider quota response preserves saved work and reports a retryable error',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const { load, save } = await import('../server/store.ts'),
      { buildStages, RULES } = await import('../core/exam.ts')
    const { review } = await import('../server/coach.ts'),
      stages = buildStages('drill', 'email', 8),
      item = stages[0].items[0]
    const id = 'quota-test'
    save({
      id,
      mode: 'drill',
      focus: 'email',
      rules: RULES,
      seed: 8,
      stages,
      started: 1,
      ended: 3,
      stage: 0,
      index: 0,
      deadline: 0,
      itemStarted: 1,
      answers: {
        [item.id]: { text: 'Dear coordinator, may we change rooms?' },
      },
      bands: {},
      messages: [],
    })
    setProvider('openai', 'fixture-model', 'fixture-only-credential')
    t.mock.method(
      globalThis,
      'fetch',
      async () => new Response('', { status: 429 }),
    )
    await assert.rejects(review(id, item.id), /usage limit/)
    assert.equal(
      load(id).answers[item.id].text,
      'Dear coordinator, may we change rooms?',
    )
    assert.equal(load(id).answers[item.id].score, undefined)
    await assert.rejects(complete('Test', 'Retry'), /usage limit/)
  },
)
test(
  'only an audited and nonduplicate generated exercise enters its intended pool',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const { generate } = await import('../server/author.ts'),
      { extras } = await import('../server/store.ts')
    setProvider('openai', 'fixture-model', 'fixture-only-credential')
    let audit = 'REJECT'
    const generated = {
      title: 'A workshop waitlist',
      prompt: 'You want to attend a workshop. Write to its organizer.',
      passage:
        'Describe your background. Explain your interest. Ask about the waiting list.',
      evidence: 'Include the three requested points.',
    }
    t.mock.method(globalThis, 'fetch', async (_url: RequestInfo | URL, init?: RequestInit) => {
      const prompt = JSON.parse(String(init?.body)).instructions
      const value = prompt.startsWith('Independently')
        ? audit
        : JSON.stringify(generated)
      return new Response(
        'data: ' +
          JSON.stringify({ type: 'response.output_text.delta', delta: value }) +
          '\n\ndata: {"type":"response.completed"}\n\n',
      )
    })
    await assert.rejects(generate('email', true), /rejected during review/)
    assert.equal(extras().length, 0)
    audit = 'PASS'
    await generate('email', true)
    assert.ok(extras()[0].personal)
    await assert.rejects(generate('email', false), /Duplicate/)
    assert.equal(extras().length, 1)
  },
)
