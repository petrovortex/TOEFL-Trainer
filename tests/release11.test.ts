import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'
import { randomUUID } from 'node:crypto'
import { estimateBands, displayBand, legacyEstimates } from '../core/bands.ts'
import { buildStages, mark, reconcileWriting, RULES } from '../core/exam.ts'
import type { Attempt, Item } from '../core/types.ts'
process.env.FIELDWORK_DATA = mkdtempSync(join(tmpdir(), 'fieldwork-release11-'))
const { prepareMock, mockStatus, readyMock, completePrepared, needsFreshMock } =
  await import('../server/mock.ts')
const { save, load, extras } = await import('../server/store.ts')
const { planFollowUp } = await import('../server/followup.ts')
const { setProvider } = await import('../server/provider.ts')
function full(): Attempt {
  const a: Attempt = {
    id: randomUUID(),
    mode: 'full',
    focus: 'Full mock',
    rules: RULES,
    seed: 23,
    started: 1,
    ended: 2,
    stage: 7,
    index: 0,
    deadline: 0,
    itemStarted: 1,
    stages: buildStages('full', '', 23),
    answers: {},
    messages: [],
    bands: {},
  }
  for (const q of a.stages.flatMap((s) => s.items))
    a.answers[q.id] = {
      text: q.task === 'words' ? q.keys!.join('|') : 'answer',
      score: 1,
    }
  return a
}
test('old full mocks finalize dash-only essays without a provider call and keep other grades', async (t) => {
  const { review } = await import('../server/coach.ts')
  const a = full(),
    items = a.stages.flatMap((s) => s.items)
  const essays = items.filter(
    (q) => q.task === 'email' || q.task === 'discussion',
  )
  const sentences = items.filter((q) => q.task === 'sentence')
  for (const q of sentences.slice(0, 2)) a.answers[q.id].score = 0
  for (const q of essays)
    a.answers[q.id] = {
      text: '-',
      note: 'Insufficient evidence',
      reviewed: false,
    }
  const other = items.find((q) => q.task === 'interview')!
  const originalSpeaking = { ...a.answers[other.id] }
  save(a)
  t.mock.method(globalThis, 'fetch', () => {
    throw Error('Unexpected network request')
  })
  const result = await review(a.id, essays[0].id)
  assert.deepEqual(result.bandRanges?.Writing, { low: 2, high: 4 })
  assert.ok(result.bandRanges?.Overall)
  for (const q of essays) {
    assert.equal(result.answers[q.id].score, 0)
    assert.equal(result.answers[q.id].text, '-')
    assert.equal(result.answers[q.id].reviewed, true)
    assert.match(result.answers[q.id].note!, /only punctuation/)
  }
  assert.deepEqual(result.answers[other.id], originalSpeaking)
  assert.equal(reconcileWriting(load(a.id)), false)
})
test('new writing items distinguish punctuation from short answers that require rubric review', () => {
  const q = full()
    .stages.flatMap((s) => s.items)
    .find((q) => q.task === 'discussion')!
  for (const text of ['', ' — … ']) {
    const ans: Attempt['answers'][string] = { text }
    mark(q, ans)
    assert.equal(ans.score, 0)
    assert.ok(ans.reviewed)
  }
  const short = { text: 'Yes.' }
  mark(q, short)
  assert.deepEqual(short, { text: 'Yes.' })
})
test('both possible routes vary substantive prompts while allowing repeated task directions', () => {
  for (let seed = 0; seed < 80; seed++) {
    const stages = buildStages('full', '', seed)
    for (const upper of [false, true]) {
      const items = stages.flatMap((s) =>
        upper && s.upper ? s.upper : s.items,
      )
      for (const task of [
        'daily',
        'passage',
        'talk',
        'conversation',
        'announcement',
      ]) {
        const prompts = items
          .filter((q) => q.task === task)
          .map((q) => q.prompt)
        assert.equal(new Set(prompts).size, prompts.length, task)
      }
    }
  }
})
test('legacy full snapshots display ranges; perfect mocks alone earn a single overall 6.0', () => {
  const a = full()
  assert.equal(displayBand(estimateBands(a).Overall!), '6.0')
  const q = a.stages[0].items[0]
  a.answers[q.id].score = 0.9
  assert.ok(estimateBands(a).Overall!.low < 6)
  assert.equal(displayBand(estimateBands(a).Reading!), '5.5–6.0')
  delete a.answers[a.stages[7].items[0].id].score
  assert.equal(estimateBands(a).Overall, undefined)
  assert.ok(estimateBands(a).Writing)
  a.mode = 'drill'
  assert.deepEqual(estimateBands(a), {})
})
test('mock preparation checkpoints sets, resumes both branches, and consumes only a complete form', async () => {
  let calls = 0
  const writer = async (slots: Item[]) =>
    slots.map((q) => ({ ...q, id: randomUUID(), title: 'fresh ' + q.title }))
  prepareMock(async (slots) => {
    if (++calls === 3) throw Error('fixture quota')
    return writer(slots)
  })
  while (mockStatus().state === 'preparing') await delay(5)
  assert.equal(mockStatus().done, 2)
  assert.equal(mockStatus().state, 'paused')
  assert.throws(readyMock, /Finish/)
  prepareMock(writer)
  while (mockStatus().state === 'preparing') await delay(5)
  const d = readyMock()
  assert.ok(
    d.stages.every((s) =>
      [...s.items, ...(s.upper ?? [])].every((q) =>
        q.title.startsWith('fresh '),
      ),
    ),
  )
  assert.throws(
    () =>
      completePrepared(d.id, () => {
        throw Error('write failed')
      }),
    /write failed/,
  )
  assert.equal(mockStatus().state, 'ready')
  completePrepared(d.id, () => {})
  assert.equal(mockStatus().state, 'empty')
})
test(
  'follow-up decision uses actual errors and creates one private drill even on concurrent retry',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const a = full()
    const q = a.stages.find((s) => s.items[0].task === 'email')!.items[0]
    a.answers[q.id] = {
      text: 'I forgot to include the request.',
      note: 'No action requested.',
      score: 0.4,
    }
    save(a)
    setProvider('openai', 'test-model', 'fixture-key')
    const outputs = [
      JSON.stringify({
        task: 'email',
        reason: 'Practice making a specific request.',
        brief: 'Ask for a replacement for a missing locker key.',
      }),
      JSON.stringify({
        title: 'A replacement key',
        prompt: 'Write to the facilities office about a missing locker key.',
        passage:
          'Explain when you lost it. Request a replacement. Ask about the fee.',
        evidence: 'Include all three points.',
      }),
      'PASS',
    ]
    let calls = 0
    t.mock.method(
      globalThis,
      'fetch',
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        if (calls === 0) assert.match(String(init?.body), /No action requested/)
        const delta = outputs[calls++]
        assert.ok(delta)
        return new Response(
          'data: ' +
            JSON.stringify({ type: 'response.output_text.delta', delta }) +
            '\n\ndata: {"type":"response.completed"}\n\n',
        )
      },
    )
    await Promise.all([planFollowUp(a.id), planFollowUp(a.id)])
    await planFollowUp(a.id)
    assert.equal(calls, 3)
    assert.equal(extras().length, 1)
    assert.equal(extras()[0].id, load(a.id).followUp?.item)
    assert.ok(extras()[0].personal)
  },
)
test('a perfect mock does not consume a generation request', async () => {
  const a = full()
  save(a)
  assert.equal((await planFollowUp(a.id)).followUp?.item, undefined)
})

test('previous-scale estimates use section-specific ETS rows and sum only four available sections', () => {
  const bands = estimateBands(full())
  assert.deepEqual(legacyEstimates(bands), {
    Reading: { low: 29, high: 30 },
    Listening: { low: 28, high: 30 },
    Writing: { low: 29, high: 30 },
    Speaking: { low: 28, high: 30 },
    Overall: { low: 114, high: 120 },
  })
  const partial = legacyEstimates({
    Reading: { low: 1, high: 2 },
    Speaking: { low: 5.5, high: 5.5 },
  })
  assert.deepEqual(partial, {
    Reading: { low: 0, high: 3 },
    Speaking: { low: 27, high: 27 },
  })
})

test('the trainer refreshes a full form for repeated material independently of learner grades', () => {
  const past = full(),
    current = full()
  current.started = past.started + 10
  assert.equal(needsFreshMock(current, [current]), false)
  assert.equal(needsFreshMock(current, [past]), true)
  past.answers = {}
  assert.equal(needsFreshMock(current, [past]), true)
  past.mode = 'drill'
  assert.equal(needsFreshMock(current, [past]), false)
})

test('whole-attempt assessment preserves saved grades and leaves coaching to the learner', async () => {
  const { assessAttempt } = await import('../server/assess.ts')
  const a = full()
  save(a)
  const [first, second] = await Promise.all([
    assessAttempt(a.id),
    assessAttempt(a.id),
  ])
  assert.deepEqual(first.answers, a.answers)
  assert.deepEqual(second.messages, [])
  assert.ok(first.followUp)
})

test(
  'assessment starts one independent mock for repeated material and resumes its saved draft',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const { assessAttempt } = await import('../server/assess.ts')
    const past = full(),
      a = full()
    a.started = 20
    a.ended = 21
    save(past)
    save(a)
    setProvider('openai', 'test-model', 'fixture-key')
    let calls = 0
    t.mock.method(globalThis, 'fetch', async () => {
      calls++
      return new Response('quota', { status: 429 })
    })
    const [first, same] = await Promise.all([
      assessAttempt(a.id),
      assessAttempt(a.id),
    ])
    while (mockStatus().state === 'preparing') await delay(5)
    assert.ok(first.mockPreparationId)
    assert.equal(first.mockPreparationId, same.mockPreparationId)
    assert.equal(mockStatus().state, 'paused')
    assert.equal(calls, 1)
    await assessAttempt(a.id)
    while (mockStatus().state === 'preparing') await delay(5)
    assert.equal(load(a.id).mockPreparationId, first.mockPreparationId)
    assert.equal(calls, 2)
    assert.deepEqual(load(a.id).messages, [])
  },
)
