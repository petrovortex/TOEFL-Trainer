import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bank, buildStages, learnerTrend, RULES } from '../core/exam.ts'
import {
  catalog,
  emptyTrend,
  type Attempt,
  type Task,
  type PracticeLength,
  type Item,
} from '../core/types.ts'
import { materialKeys, materialSets, practiceSize } from '../core/material.ts'
import { points, responseStatus } from '../core/report.ts'
process.env.FIELDWORK_DATA = mkdtempSync(join(tmpdir(), 'toefl-review-'))
const store = await import('../server/store.ts')
const { chat, evidence } = await import('../server/analysis.ts')
const { setProvider } = await import('../server/provider.ts')
const { assessAttempt } = await import('../server/assess.ts')
const { practicePlan, consumePlan } = await import('../server/practice.ts')
import type { BankJob } from '../server/bank.ts'
const { runBank, replenish, bankStatus, migratePreparedMaterial } =
  await import('../server/bank.ts')
const { examActivity, foregroundWork } = await import('../server/work.ts')
function attempt(
  mode: 'full' | 'drill' = 'full',
  focus = 'Full mock',
): Attempt {
  const a: Attempt = {
    id: randomUUID(),
    mode,
    focus,
    rules: RULES,
    seed: 19,
    started: Date.now() - 10000,
    ended: Date.now(),
    stage: 0,
    index: 0,
    deadline: 0,
    itemStarted: 0,
    stages: buildStages(mode, focus, 19),
    answers: {},
    messages: [],
    bands: {},
  }
  for (const q of a.stages.flatMap((s) => s.items))
    a.answers[q.id] = {
      text: q.keys?.join('|') ?? 'A saved response with supporting details.',
      score: 1,
    }
  return a
}
function stream(text: string) {
  return new Response(
    'data: ' +
      JSON.stringify({ type: 'response.output_text.delta', delta: text }) +
      '\n\ndata: {"type":"response.completed"}\n\n',
  )
}

test('every drill length uses whole, distinct sets and correct counts', () => {
  for (const task of Object.keys(catalog) as Task[])
    for (const length of ['short', 'standard', 'long'] as PracticeLength[]) {
      const items = buildStages('drill', task, 7, undefined, [], length)[0]
        .items
      assert.equal(
        materialSets(items).length,
        practiceSize(task, length),
        task + length,
      )
      assert.equal(new Set(items.map((q) => q.id)).size, items.length)
      for (const set of materialSets(items))
        if (set[0].group)
          assert.equal(
            set.length,
            bank.filter((q) => q.group === set[0].group).length,
          )
    }
})
test('fresh stimuli outrank overdue repeats, then choose least recently used', () => {
  const past = attempt('drill', 'passage')
  past.ended = 1000
  const trend = learnerTrend([past], 'passage')
  const next = buildStages('drill', 'passage', 7, trend)[0].items
  assert.ok(
    next.every(
      (q) => !past.stages[0].items.some((old) => old.group === q.group),
    ),
  )
  const sets = materialSets(bank.filter((q) => q.task === 'passage'))
  const lastUsed = Object.fromEntries(
    sets.flatMap((set, i) =>
      set.flatMap((q) => materialKeys(q).map((key) => [key, (i + 1) * 1000])),
    ),
  )
  assert.equal(
    buildStages(
      'drill',
      'passage',
      99,
      { ...emptyTrend(), lastUsed },
      [],
      'short',
    )[0].items[0].group,
    sets[0][0].group,
  )
})
test('full seed and routing material stay independent of exposure and personal bank', () => {
  const a = buildStages('full', '', 38)
  const extra = { ...bank[0], id: 'private', personal: true }
  assert.deepEqual(
    buildStages(
      'full',
      '',
      38,
      {
        ...emptyTrend(),
        level: 3,
        seen: bank.map((q) => q.id),
        lastUsed: Object.fromEntries(
          bank.flatMap((q) => materialKeys(q).map((k) => [k, 123])),
        ),
      },
      [extra],
    ),
    a,
  )
})
test('preview is frozen and can only be consumed once', () => {
  const preview = practicePlan('passage', 'standard')
  const plan = consumePlan(preview.planId, 'passage')
  assert.equal(plan.stages[0].items.length, preview.responses)
  assert.equal(preview.sets, 2)
  assert.throws(() => consumePlan(preview.planId, 'passage'), /expired/)
})
test('response report distinguishes cloze points, missing, partial and ungraded evidence', () => {
  const cloze = bank.find((q) => q.task === 'words')!,
    email = bank.find((q) => q.task === 'email')!
  assert.equal(points(cloze, { score: 0.7 }), '7/10')
  assert.equal(
    responseStatus(cloze, { text: 'suffix', score: 0.7 }),
    'Partly correct',
  )
  assert.equal(responseStatus(email, { text: '--' }), 'No response')
  assert.equal(
    responseStatus(email, { text: 'Some writing' }),
    'Awaiting grading',
  )
  assert.equal(
    responseStatus(email, {
      text: 'Some writing',
      gradingState: 'insufficient',
    }),
    'Insufficient evidence',
  )
})
test('all-attempt evidence includes every section, keeps full answers and deduplicates stimuli', () => {
  const a = attempt(),
    items = a.stages.flatMap((s) => s.items)
  const pack = evidence(a, items)
  assert.equal(pack.responses.length, items.length)
  assert.equal(new Set(pack.responses.map((r) => r.section)).size, 4)
  const grouped = items.find((q) => q.group && q.passage)!
  assert.equal(
    Object.values(pack.contexts).filter((text) => text === grouped.passage)
      .length,
    1,
  )
})
test('objective assessment is a no-op with no AI, coach or generation side effects', async (t) => {
  const a = attempt('drill', 'passage')
  store.save(a)
  t.mock.method(globalThis, 'fetch', () => {
    throw Error('Unexpected AI request')
  })
  const result = await assessAttempt(a.id)
  assert.deepEqual(result.answers, a.answers)
  assert.equal(result.followUp, undefined)
  assert.deepEqual(result.messages, [])
})
test('partial grading persists and retries only ungraded responses', async (t) => {
  setProvider('openai', 'test-model', 'fixture-key')
  const a = attempt('drill', 'email')
  for (const q of a.stages[0].items) delete a.answers[q.id].score
  store.save(a)
  let requests = 0
  t.mock.method(globalThis, 'fetch', async () =>
    ++requests === 2
      ? new Response('quota', { status: 429 })
      : stream(
          JSON.stringify({
            points: 4,
            note: 'Clear request with supporting context.',
          }),
        ),
  )
  await assert.rejects(assessAttempt(a.id), /limit/)
  assert.equal(store.load(a.id).answers[a.stages[0].items[0].id].score, 0.8)
  await assessAttempt(a.id)
  assert.equal(requests, 3)
  assert.deepEqual(store.load(a.id).messages, [])
})
test('analysis covers all responses, caches reopening, refreshes grades, and scopes conversation', async (t) => {
  setProvider('openai', 'test-model', 'fixture-key')
  const a = attempt()
  store.save(a)
  const ids = new Set<string>(),
    payloads: string[] = []
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = String(init?.body)
      payloads.push(body)
      for (const q of a.stages.flatMap((s) => s.items))
        if (body.includes(q.id)) ids.add(q.id)
      return stream(
        body.includes('Return JSON')
          ? JSON.stringify({
              text: `Accurate details. Review [Q1](response:${a.stages[0].items[0].id}).`,
              practice: null,
            })
          : 'Evidence summary with task coverage.',
      )
    },
  )
  await chat(a.id, '', { action: 'analyze' })
  assert.equal(ids.size, a.stages.flatMap((s) => s.items).length)
  const calls = payloads.length
  await chat(a.id, '', { action: 'analyze' })
  assert.equal(payloads.length, calls)
  const updated = store.load(a.id)
  updated.answers[a.stages[0].items[0].id].score = 0.5
  store.save(updated)
  await chat(a.id, '', { action: 'analyze' })
  assert.ok(payloads.length > calls)
  await chat(a.id, 'Explain this answer.', {
    scope: 'item',
    item: a.stages[0].items[0].id,
  })
  const last = store.load(a.id).messages.at(-1)!
  assert.equal(last.scope, 'item')
  assert.equal(last.item, a.stages[0].items[0].id)
})
test('bank jobs checkpoint, serialize, honor exam/foreground and survive retry without partial admission', async (t) => {
  setProvider('openai', 'test-model', 'fixture-key')
  const a = attempt('drill', 'email')
  store.save(a)
  replenish()
  assert.equal(store.jobs<BankJob>().length > 0, true)
  let calls = 0
  const writer: typeof import('../server/author.ts').author = async (
    slots,
    personal,
    previous,
    brief,
    control,
  ) => {
    calls++
    control!.checkpoint(true)
    control!.progress.audited = true
    control!.persist()
    return slots.map((q) => ({
      ...q,
      id: randomUUID(),
      title: randomUUID(),
      prompt: randomUUID(),
      personal,
    }))
  }
  examActivity()
  await runBank(writer)
  assert.equal(calls, 0)
  examActivity(false)
  await foregroundWork(async () => {
    await runBank(writer)
    assert.equal(calls, 0)
  })
  const before = store.extras().length
  await Promise.all([runBank(writer), runBank(writer)])
  assert.equal(calls, 1)
  assert.ok(store.extras().length > before)
  replenish()
  await runBank(async (_slots, _personal, _previous, _brief, control) => {
    control!.checkpoint(true)
    throw Error('Offline fixture')
  })
  const failed = store.jobs<BankJob>().find((j) => j.state === 'paused')!
  assert.match(failed.error!, /Offline/)
  const used = store.bankUsage()
  await runBank(writer)
  assert.deepEqual(store.bankUsage(), used)
  assert.ok(bankStatus().pending > 0)
  // The job row and request accounting survive reopening the same SQLite file.
  const { spawnSync } = await import('node:child_process')
  const probe = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      'const s=await import("./server/store.ts"); console.log(JSON.stringify({jobs:s.jobs().length,usage:s.bankUsage()}))',
    ],
    { env: process.env, encoding: 'utf8', windowsHide: true },
  )
  assert.equal(probe.status, 0, probe.stderr)
  assert.deepEqual(JSON.parse(probe.stdout).usage, used)
  for (let i = used.requests; i < 8; i++) store.spendBank('request')
  store.configure('bank-backoff', '')
  failed.retryAfter = 0
  store.saveJob(failed)
  const beforeLimit = calls
  await runBank(writer)
  assert.equal(calls, beforeLimit)
  // An already audited batch can finish local work even after all eight AI requests are spent.
  failed.started = true
  failed.progress = { audited: true }
  store.saveJob(failed)
  const atLimit = store.bankUsage(),
    readyBefore = store.extras().length
  await runBank(async (slots, personal, _previous, _brief, control) => {
    control!.checkpoint(false)
    return slots.map((q) => ({
      ...q,
      id: randomUUID(),
      prompt: randomUUID(),
      personal,
    }))
  })
  assert.ok(store.extras().length > readyBefore)
  assert.deepEqual(store.bankUsage(), atLimit)
  const tomorrow = Date.now() + 172800000
  t.mock.method(Date, 'now', () => tomorrow)
  for (let i = 0; i < 4; i++) store.spendBank('batch')
  assert.deepEqual(store.bankUsage(), { batches: 4, requests: 0 })
  await runBank(writer)
  assert.equal(calls, beforeLimit)
})
test('validated legacy mock material migrates once without touching attempt snapshots', () => {
  const a = attempt()
  store.save(a)
  const q = {
    ...bank.find((q) => q.task === 'email')!,
    id: 'gen-' + randomUUID(),
    prompt: 'A unique archived prompt.',
  }
  store.configure(
    'prepared-mock-v1',
    JSON.stringify({
      done: 1,
      stages: [
        {
          section: 'Writing',
          name: 'Old mock',
          minutes: 7,
          items: [q, bank[0]],
        },
      ],
    }),
  )
  migratePreparedMaterial()
  const n = store.extras().length
  migratePreparedMaterial()
  assert.equal(store.extras().length, n)
  assert.ok(store.extras().some((item) => item.id === q.id))
  assert.deepEqual(
    store.load(a.id).stages,
    JSON.parse(JSON.stringify(a.stages)),
  )
})

test('author resumes validated generation at audit without repeating paid generation', async (t) => {
  setProvider('openai', 'test-model', 'fixture-key')
  const { author } = await import('../server/author.ts')
  const progress: import('../server/author.ts').AuthorProgress = {}
  let requests = 0,
    checkpoints = 0
  t.mock.method(globalThis, 'fetch', async () =>
    stream(
      ++requests === 1
        ? JSON.stringify([
            {
              title: 'Borrowing a field recorder',
              prompt:
                'Write to a museum about borrowing its field recorder for an oral history project.',
              passage:
                'Describe the people you will interview. Specify the dates you need the recorder. Ask about the return procedure.',
              evidence:
                'Address the three requests with suitable register and specific details.',
            },
          ])
        : 'PASS',
    ),
  )
  const slots = [bank.find((q) => q.task === 'email')!]
  await assert.rejects(
    author(slots, false, [], 'Original communication task.', {
      progress,
      persist: () => {},
      checkpoint: () => {
        if (++checkpoints === 2) throw Error('Exam started')
      },
    }),
    /Exam started/,
  )
  assert.equal(requests, 1)
  assert.ok(progress.items?.length)
  const result = await author(
    slots,
    false,
    [],
    'Original communication task.',
    { progress, persist: () => {}, checkpoint: () => {} },
  )
  assert.equal(requests, 2)
  assert.equal(result.length, 1)
  assert.equal(progress.audited, true)
})

test('version-one database migration backfills exposure while preserving saved responses', async () => {
  const { DatabaseSync } = await import('node:sqlite')
  const { spawnSync } = await import('node:child_process')
  const folder = mkdtempSync(join(tmpdir(), 'toefl-migration-'))
  const db = new DatabaseSync(join(folder, 'practice.sqlite'))
  db.exec(`CREATE TABLE attempts(id TEXT PRIMARY KEY, started INTEGER, ended INTEGER, focus TEXT, mode TEXT, bands TEXT, snapshot TEXT);
    CREATE TABLE generated(id TEXT PRIMARY KEY,fingerprint TEXT UNIQUE,item TEXT);
    CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);
    PRAGMA user_version=1;`)
  const a = attempt('drill', 'passage')
  db.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?)').run(
    a.id,
    a.started,
    a.ended!,
    a.focus,
    a.mode,
    '{}',
    JSON.stringify(a),
  )
  db.close()
  const probe = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      'const s=await import("./server/store.ts"); console.log(JSON.stringify({exposure:Object.keys(s.exposures()).length,attempt:s.load(process.env.TEST_ATTEMPT)}))',
    ],
    {
      env: { ...process.env, FIELDWORK_DATA: folder, TEST_ATTEMPT: a.id },
      encoding: 'utf8',
      windowsHide: true,
    },
  )
  assert.equal(probe.status, 0, probe.stderr)
  const result = JSON.parse(probe.stdout)
  assert.ok(result.exposure > a.stages[0].items.length)
  assert.deepEqual(result.attempt.answers, a.answers)
  const check = new DatabaseSync(join(folder, 'practice.sqlite'))
  assert.equal(check.prepare('PRAGMA user_version').get()!.user_version, 2)
  check.close()
})
