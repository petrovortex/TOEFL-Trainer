import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import {
  readFileSync,
  writeFileSync,
  existsSync,
  createReadStream,
  statSync,
  renameSync,
} from 'node:fs'
import { resolve, join, extname, sep } from 'node:path'
import { spawn } from 'node:child_process'
import metadata from '../package.json' with { type: 'json' }
import {
  buildStages,
  bank,
  learnerTrend,
  advance,
  begin,
  expire,
  RULES,
} from '../core/exam.ts'
import { catalog, current, secondsLimit, emptyTrend } from '../core/types.ts'
import type { Attempt, Mode, Item } from '../core/types.ts'
import {
  history,
  responseHistory,
  load,
  save,
  recent,
  extras,
  clips,
  cache,
} from './store.ts'
import { audioKey, synth, wavInfo, wave } from './speech.ts'
import {
  authorize,
  callback,
  preferences,
  setProvider,
  disconnect,
  verify,
} from './provider.ts'
import { chat, localTranscript } from './coach.ts'
import { mockStatus, readyMock, completePrepared } from './mock.ts'
import { assessAttempt } from './assess.ts'

const port = Number(process.env.FIELDWORK_PORT ?? 43127),
  host = '127.0.0.1:' + port,
  origin = 'http://' + host
const prompts = resolve(existsSync('prompts') ? 'prompts' : '.work/prompts'),
  dist = resolve('dist')
const mime: Record<string, string> = {
  '.js': 'text/javascript',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
}
async function body(req: IncomingMessage, limit = 100000) {
  const parts: Buffer[] = []
  let size = 0
  for await (const part of req) {
    size += part.length
    if (size > limit) throw Error('Upload is too large.')
    parts.push(part)
  }
  return Buffer.concat(parts)
}
function file(res: ServerResponse, path: string) {
  if (!existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, {
    'Content-Type': mime[extname(path)] ?? 'application/octet-stream',
    'Content-Length': statSync(path).size,
    'Cache-Control': path.endsWith('.wav')
      ? 'private, max-age=31536000, immutable'
      : 'no-cache',
  })
  createReadStream(path).pipe(res)
}
function audioPath(key: string) {
  const cached = join(prompts, key + '.wav')
  return existsSync(cached) ? cached : join(cache, key + '.wav')
}
async function prepare(q: Item) {
  if (q.speech && !existsSync(audioPath(audioKey(q)))) await synth(q, cache)
}
type Live = Attempt & {
  played?: string[]
  responseUntil?: number
  capture?: { item: string; start: number; end: number }
}
function view(a: Live) {
  if (a.ended) return a
  const st = a.stages[a.stage],
    q = current(a)
  return {
    id: a.id,
    mode: a.mode,
    focus: a.focus,
    stage: a.stage,
    index: a.index,
    deadline: a.deadline,
    itemStarted: a.itemStarted,
    stageName: st.name,
    section: st.section,
    count: st.items.length,
    minutes: st.minutes,
    answer: a.answers[q.id] ?? {},
    responseUntil: a.responseUntil ?? 0,
    item: {
      ...q,
      keys: undefined,
      evidence: undefined,
      speech: undefined,
      passage:
        q.task === 'words' ? q.passage : q.speech ? undefined : q.passage,
    },
    audio: q.speech
      ? existsSync(audioPath(audioKey(q)))
        ? '/audio/' + audioKey(q) + '.wav'
        : '/api/stimulus?id=' + a.id + '&item=' + q.id
      : null,
    played:
      a.played?.includes(
        q.group && q.task !== 'repeat' && q.task !== 'interview'
          ? q.group
          : q.id,
      ) ?? false,
    limit: secondsLimit(q),
  }
}
function active(id: string): Live {
  const a = load(id) as Live
  if (expire(a)) {
    a.responseUntil = 0
    save(a)
  }
  return a
}
const server = createServer(async (req, res) => {
  const out = (data: unknown) => {
    res.writeHead(200, {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    })
    res.end(JSON.stringify(data))
  }
  try {
    if (
      req.headers.host !== host ||
      (req.headers.origin && req.headers.origin !== origin)
    ) {
      res.writeHead(403).end()
      return
    }
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
    )
    const url = new URL(req.url ?? '/', origin),
      path = url.pathname
    if (path === '/auth/callback') {
      try {
        await callback(url.searchParams)
        res.writeHead(303, { Location: '/#settings' }).end()
      } catch (e) {
        res
          .writeHead(400, { 'content-type': 'text/plain' })
          .end((e as Error).message + ' Open Settings to reconnect.')
      }
      return
    }
    if (req.method === 'GET') {
      if (path === '/api/history') return out(history())
      if (path === '/api/voice-preview') {
        const q = bank.find((q) => q.task === 'conversation')!
        await prepare(q)
        return file(res, audioPath(audioKey(q)))
      }
      if (path === '/api/responses')
        return out(
          responseHistory(
            url.searchParams.get('section') ?? '',
            url.searchParams.get('task') ?? '',
          ),
        )
      if (path === '/api/prefs') return out(preferences())
      if (path === '/api/mock') return out(mockStatus())
      if (path === '/api/status')
        return out({
          app: 'TOEFL Trainer',
          rules: RULES,
          release: metadata.version,
        })
      if (path.startsWith('/api/attempt/')) {
        const a = active(path.split('/').pop()!)
        if (!a.ended) await prepare(current(a))
        return out(view(a))
      }
      if (path === '/api/reference') {
        const a = load(url.searchParams.get('id') ?? ''),
          q = a.stages
            .flatMap((s) => s.items)
            .find((q) => q.id === url.searchParams.get('item'))
        if (!a.ended || !q?.speech)
          throw Error('No reference recording for this response.')
        await prepare(q)
        return file(res, audioPath(audioKey(q)))
      }
      if (path === '/api/stimulus') {
        const a = active(url.searchParams.get('id') ?? ''),
          q = current(a)
        if (a.ended || q.id !== url.searchParams.get('item') || !q.speech)
          throw Error('This audio is not the active prompt.')
        await prepare(q)
        return file(res, audioPath(audioKey(q)))
      }
      if (/^\/audio\/[a-f0-9]{64}\.wav$/.test(path))
        return file(res, audioPath(path.slice(7, -4)))
      if (/^\/clips\/[a-f0-9-]{36}\.wav$/.test(path))
        return file(res, join(clips, path.slice(7)))
      const filename = resolve(
        dist,
        '.' + decodeURIComponent(path === '/' ? '/index.html' : path),
      )
      if (!filename.startsWith(dist + sep)) {
        res.writeHead(403).end()
        return
      }
      return file(res, filename)
    }
    if (req.method !== 'POST' || req.headers['x-fieldwork'] !== 'local') {
      res.writeHead(403).end()
      return
    }
    if (path === '/api/record') {
      const wav = await body(req, 4e6),
        { rate, pcm } = wavInfo(wav)
      const a = active(url.searchParams.get('id') ?? ''),
        capture = a.capture
      if (
        !capture ||
        capture.item !== url.searchParams.get('item') ||
        Date.now() > capture.end + 15000 ||
        rate !== 16000 ||
        pcm.length > 16000 * 2 * 90
      )
        throw Error('This recording does not match the active response window.')
      const samples = pcm.subarray(
        0,
        Math.max(0, Math.floor(((capture.end - capture.start) * rate) / 1000)) *
          2,
      )
      if (!samples.length) throw Error('The response window has closed.')
      const key = randomUUID()
      writeFileSync(join(clips, key + '.tmp'), wave(samples, rate))
      renameSync(join(clips, key + '.tmp'), join(clips, key + '.wav'))
      a.answers[capture.item] = {
        ...a.answers[capture.item],
        clip: key,
        seconds: samples.length / (rate * 2),
      }
      delete a.capture
      save(a)
      return out(view(a))
    }
    const b = JSON.parse((await body(req)).toString() || '{}')
    if (path === '/api/start') {
      const mode: Mode = b.mode
      if (!['full', 'section', 'drill'].includes(mode))
        throw Error('Unknown mode.')
      const focus = mode === 'full' ? 'Full mock' : String(b.focus)
      const prepared =
        mode === 'full' && mockStatus().state === 'ready'
          ? readyMock()
          : undefined
      const seed = prepared?.seed ?? randomBytes(4).readUInt32LE(),
        trend = mode === 'full' ? emptyTrend() : learnerTrend(recent(), focus)
      const stages =
        prepared?.stages ?? buildStages(mode, focus, seed, trend, extras())
      if (mode === 'drill' && b.followUp) {
        const f = load(b.followUp).followUp
        const item = f?.item
          ? extras().find((q) => q.id === f.item && q.task === focus)
          : undefined
        if (!item) throw Error('Follow-up exercise is unavailable.')
        stages[0].items = [item]
        stages[0].name = 'Trainer follow-up'
      }
      let retryOf: Attempt['retryOf']
      if (mode === 'drill' && b.retry) {
        const original = load(b.retry.id),
          item = original.stages
            .flatMap((s) => s.items)
            .find((q) => q.id === b.retry.item)
        if (!original.ended || !item || item.task !== focus)
          throw Error('Choose a completed item to retry.')
        stages[0].items = [item]
        stages[0].name = 'Guided retry'
        retryOf = { id: original.id, item: item.id }
      }
      for (const s of stages)
        for (const q of [...s.items, ...(s.upper ?? [])]) await prepare(q)
      const a: Live = {
        id: randomUUID(),
        mode,
        focus,
        seed,
        started: Date.now(),
        stage: 0,
        index: 0,
        deadline: 0,
        itemStarted: 0,
        rules: RULES,
        stages,
        answers: {},
        bands: {},
        messages: [],
      }
      a.retryOf = retryOf
      if (prepared) completePrepared(prepared.id, () => save(a))
      else save(a)
      return out(view(a))
    }
    if (path === '/api/connect') return out({ url: authorize(origin) })
    if (path === '/api/disconnect') {
      disconnect()
      return out(preferences())
    }
    if (path === '/api/prefs') {
      setProvider(b.provider, String(b.model ?? ''), b.key)
      return out(preferences())
    }
    if (path === '/api/verify') return out(await verify())
    if (path === '/api/assess') return out(await assessAttempt(b.id))
    if (path === '/api/transcript')
      return out(await localTranscript(b.id, b.item))
    if (path === '/api/chat') return out(await chat(b.id, b.message, b.item))
    const a = active(b.id),
      q = current(a)
    if (a.ended || q.id !== b.item) return out(view(a))
    switch (path) {
      case '/api/begin':
        begin(a)
        break
      case '/api/play': {
        const key =
          q.group && !['repeat', 'interview'].includes(q.task) ? q.group : q.id
        a.played ??= []
        if (!a.played.includes(key)) a.played.push(key)
        break
      }
      case '/api/response': {
        if (!a.itemStarted || !secondsLimit(q))
          throw Error('Start a speaking item first.')
        if (!a.responseUntil || a.mode === 'drill') {
          const start = Date.now(),
            end = Math.min(
              start + secondsLimit(q) * 1000,
              a.deadline || Infinity,
            )
          a.capture = { item: q.id, start, end }
          a.responseUntil = end
        }
        break
      }
      case '/api/answer':
        if (!a.itemStarted) throw Error('Start the module first.')
        ;(a.answers[q.id] ??= {}).text = String(b.text ?? '').slice(0, 40000)
        break
      case '/api/next':
        advance(a)
        a.responseUntil = 0
        break
      case '/api/back':
        if (
          a.itemStarted &&
          a.stages[a.stage].section === 'Reading' &&
          a.index > 0
        ) {
          ;(a.answers[q.id] ??= {}).elapsed =
            (a.answers[q.id]?.elapsed ?? 0) +
            (Date.now() - a.itemStarted) / 1000
          a.index--
          a.itemStarted = Date.now()
        }
        break
      default:
        res.writeHead(404).end()
        return
    }
    save(a)
    out(view(a))
  } catch (e) {
    if (!res.headersSent) {
      res.writeHead(400, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: (e as Error).message }))
    } else res.end()
  }
})
function openBrowser() {
  spawn('explorer.exe', [origin], {
    windowsHide: true,
    stdio: 'ignore',
  }).unref()
}
server.on('error', async (e: NodeJS.ErrnoException) => {
  if (e.code === 'EADDRINUSE' && process.argv.includes('--open')) {
    try {
      const running = await (await fetch(origin + '/api/status')).json()
      if (
        running.app === 'Fieldwork' ||
        (running.app === 'TOEFL Trainer' &&
          running.release !== metadata.version)
      ) {
        console.error(
          'Close the older trainer window, then open Start TOEFL Trainer again.',
        )
        process.exitCode = 1
        return
      }
      if (running.app === 'TOEFL Trainer') {
        openBrowser()
        return
      }
    } catch {}
  }
  console.error('Unable to start TOEFL Trainer:', e.message)
  process.exitCode = 1
})
server.listen(port, '127.0.0.1', () => {
  console.log('TOEFL Trainer is ready at ' + origin)
  if (process.argv.includes('--open')) openBrowser()
})
