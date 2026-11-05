import assert from 'node:assert/strict'
import test from 'node:test'
import {
  bank,
  buildStages,
  advance,
  begin,
  expire,
  mark,
  learnerTrend,
  updateBands,
  RULES,
} from '../core/exam.ts'
import { units, current, emptyTrend, catalog } from '../core/types.ts'
import type { Attempt } from '../core/types.ts'
function attempt(): Attempt {
  return {
    id: 'unit',
    started: 100,
    mode: 'full',
    focus: 'Full mock',
    seed: 42,
    rules: RULES,
    stage: 0,
    index: 0,
    deadline: 0,
    itemStarted: 0,
    stages: buildStages('full', '', 42),
    answers: {},
    bands: {},
    messages: [],
  }
}
test('original bank has unique IDs, workable objective keys and all twelve tasks', () => {
  assert.equal(Object.keys(catalog).length, 12)
  assert.equal(new Set(bank.map((q) => q.id)).size, bank.length)
  for (const q of bank) {
    if (q.options) {
      assert.ok(q.options.includes(q.keys![0]))
      assert.equal(new Set(q.options).size, q.options.length)
    }
    if (q.task === 'words') {
      assert.equal(q.keys!.length, 10)
      q.keys!.forEach((_, i) => assert.ok(q.passage!.includes('{' + i + '}')))
    }
    if (q.keys) {
      const ans = {
        text:
          q.task === 'words'
            ? q.keys.join('|')
            : q.task === 'sentence'
              ? q.chunks!.join(' | ')
              : q.keys[0],
        score: -1,
      }
      mark(q, ans)
      assert.equal(ans.score, 1, q.id)
    }
  }
})
test('both routes meet the 50/47/12/11 blueprint across seeds, independent of history', () => {
  for (let seed = 0; seed < 20; seed++) {
    const stages = buildStages('full', '', seed)
    assert.deepEqual(
      stages,
      buildStages('full', '', seed, {
        seen: bank.map((q) => q.id),
        level: 3,
        weakness: { words: 1 },
      }),
    )
    for (const upper of [false, true]) {
      const items = stages.flatMap((s) =>
        upper && s.upper ? s.upper : s.items,
      )
      assert.equal(new Set(items.map((q) => q.id)).size, items.length)
      for (const [sec, n] of Object.entries({
        Reading: 50,
        Listening: 47,
        Writing: 12,
        Speaking: 11,
      }))
        assert.equal(
          items
            .filter((q) => catalog[q.task][0] === sec)
            .reduce((sum, q) => sum + units(q), 0),
          n,
        )
      const cloze = items.filter((q) => q.task === 'words').map((q) => q.title)
      assert.ok(
        items
          .filter((q) => q.task === 'passage')
          .every((q) => !cloze.includes(q.title)),
      )
    }
  }
})
test('current performance selects upper route; deadline survives serialize/reload', () => {
  const a = attempt()
  begin(a, 1000)
  const deadline = a.deadline
  const upper = a.stages[1].upper!.map((q) => q.id)
  while (a.stage === 0) {
    const q = current(a)
    a.answers[q.id] = {
      text: q.task === 'words' ? q.keys!.join('|') : q.keys![0],
    }
    advance(a, 2000)
  }
  assert.deepEqual(
    a.stages[1].items.map((q) => q.id),
    upper,
  )
  assert.equal(a.deadline, 0)
  const b = attempt()
  begin(b, 1000)
  const copy = JSON.parse(JSON.stringify(b))
  begin(copy, 5000)
  assert.equal(copy.deadline, deadline)
  assert.ok(expire(copy, deadline + 1))
  assert.equal(copy.stage, 1)
  assert.equal(copy.stages[1].upper, undefined)
})
test('drills use prior scores and independent mocks never use personal items', () => {
  const a = attempt()
  a.ended = Date.now()
  const q = a.stages[0].items[0]
  a.answers[q.id] = { text: 'x', score: 0 }
  const trend = learnerTrend([a], q.task)
  assert.equal(trend.level, 1)
  assert.notDeepEqual(
    buildStages('drill', q.task, 1, trend),
    buildStages('drill', q.task, 1, emptyTrend()),
  )
  const personal = { ...q, id: 'private', personal: true }
  assert.deepEqual(
    buildStages('full', '', 3, trend, [personal]),
    buildStages('full', '', 3),
  )
})
test('band estimates require substantial completed evidence and weight both writing tasks', () => {
  const a = attempt()
  a.ended = 5000
  a.mode = 'section'
  a.stages = buildStages('section', 'Writing', 1)
  for (const q of a.stages.flatMap((s) => s.items))
    a.answers[q.id] = { score: 0 }
  updateBands(a)
  assert.equal(a.bandRanges?.Writing, undefined)
  for (const q of a.stages.flatMap((s) => s.items))
    a.answers[q.id] = {
      text: 'A response',
      score: q.task === 'sentence' ? 1 : 0,
    }
  updateBands(a)
  assert.deepEqual(a.bandRanges?.Writing, {low:2.5,high:4.5})
})
