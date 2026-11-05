import {
  catalog,
  current,
  emptyTrend,
  missingWrittenResponse,
  units,
} from './types.ts'
import type {
  Answer,
  Attempt,
  Item,
  Mode,
  Section,
  Stage,
  Task,
  Trend,
} from './types.ts'
import { reading } from './reading.ts'
import { listening } from './listening.ts'
import { writing } from './writing.ts'
import { speaking } from './speaking.ts'
import { advanced } from './advanced.ts'
import { estimateBands } from './bands.ts'
export const bank: Item[] = [
  ...reading,
  ...advanced,
  ...listening,
  ...writing,
  ...speaking,
]
export const RULES = 202601
function random(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
}
function shuffle<T>(values: T[], rng: () => number): T[] {
  const out = values.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
export const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ')
function markMissingWriting(q: Item, a: Answer) {
  if (a.score !== undefined || !missingWrittenResponse(q, a.text)) return false
  a.score = 0
  a.reviewed = true
  a.note = a.text?.trim()
    ? '0/5. The saved response contains only punctuation.'
    : '0/5. No written response was submitted.'
  return true
}
export function mark(q: Item, a: Answer) {
  if (!q.keys) {
    markMissingWriting(q, a)
    return
  }
  const parts =
    q.task === 'words'
      ? (a.text ?? '').split('|')
      : [
          q.task === 'sentence'
            ? (a.text ?? '').split(' | ').join(' ')
            : (a.text ?? ''),
        ]
  const correct = q.keys.filter(
    (k, i) => normalize(k) === normalize(parts[i] ?? ''),
  ).length
  a.score = correct / q.keys.length
  a.note = correct + ' of ' + q.keys.length + ' correct. ' + (q.evidence ?? '')
}
export function buildStages(
  mode: Mode,
  focus: string,
  seed: number,
  history = emptyTrend(),
  extra: Item[] = [],
): Stage[] {
  const rng = random(seed),
    trend = mode === 'full' ? emptyTrend() : history
  const pool = [...bank, ...extra.filter((q) => mode !== 'full' || !q.personal)]
  const used = new Set<string>()
  function pick(task: Task, count: number, level = 2, grouped = false) {
    const cohesive = grouped && (task === 'repeat' || task === 'interview')
    const candidates = shuffle(
      pool.filter(
        (q) => q.task === task && !used.has(q.id) && (!cohesive || q.group),
      ),
      rng,
    )
    const rank = (q: Item) =>
      (level === 0 ? 0 : Math.abs(q.level - level)) +
      (trend.seen.includes(q.id) ? 4 : 0) +
      (trend.due?.[q.id] ?? 0)
    candidates.sort((a, b) => rank(a) - rank(b))
    const picks: Item[] = []
    for (const q of candidates) {
      if (picks.length >= count) break
      if (used.has(q.id)) continue
      const group =
        grouped && q.group
          ? pool.filter((x) => x.group === q.group && x.task === q.task)
          : [q]
      for (const item of group) {
        used.add(item.id)
        if (picks.length < count) picks.push(item)
      }
      if (task === 'words' || task === 'passage')
        pool
          .filter((x) => x.title === q.title && x.task !== task)
          .forEach((x) => used.add(x.id))
    }
    if (picks.length !== count)
      throw Error('The bank needs more ' + catalog[task][1] + ' items.')
    return picks.map((q) => ({
      ...q,
      options: q.options ? shuffle(q.options, rng) : undefined,
      chunks: q.chunks ? shuffle(q.chunks, rng) : undefined,
    }))
  }
  if (mode === 'drill') {
    const task = focus as Task
    if (!catalog[task]) throw Error('Unknown exercise.')
    const items = pick(
      task,
      task === 'repeat'
        ? 3
        : task === 'interview'
          ? 2
          : task === 'email' || task === 'discussion' || task === 'words'
            ? 1
            : 3,
      trend.level,
    )
    return [
      {
        name: 'Focused practice',
        section: catalog[task][0],
        minutes: 0,
        items,
      },
    ]
  }
  const stages: Stage[] = []
  for (const section of [
    'Reading',
    'Listening',
    'Writing',
    'Speaking',
  ] as Section[]) {
    if (mode === 'section' && focus !== section) continue
    const level = mode === 'full' ? 0 : trend.level
    function target(task: Task, fallback: number) {
      const weakness = trend.weakness[task]
      return mode === 'section' && weakness !== undefined
        ? weakness > 0.45
          ? 1
          : weakness < 0.2
            ? 3
            : 2
        : fallback
    }
    if (section === 'Reading' || section === 'Listening') {
      function module(l: number, second: boolean) {
        const draw = (task: Task, n: number, grouped = false) =>
          pick(task, n, second ? l : target(task, l), grouped)
        if (section === 'Reading')
          return [
            ...draw('words', second ? 1 : 2),
            ...draw('daily', 5, true),
            ...draw('passage', 5, true),
          ]
        const lower = second && l === 1
        return [
          ...draw('reply', second ? (lower ? 9 : 5) : 10),
          ...draw('conversation', second ? 4 : 6, true),
          ...draw('announcement', second ? (lower ? 6 : 2) : 4, true),
          ...draw('talk', lower ? 0 : 8, true),
        ]
      }
      stages.push({
        section,
        name: 'Module 1',
        minutes: section === 'Reading' ? 21 : 18,
        items: module(level, false),
      })
      const firstUsed = new Set(used)
      const lower = module(1, true)
      used.clear()
      firstUsed.forEach((x) => used.add(x))
      const upper = module(3, true)
      stages.push({
        section,
        name: 'Module 2',
        minutes: section === 'Reading' ? 9 : 7,
        items: lower,
        upper,
      })
    } else if (section === 'Writing') {
      for (const [task, n, min] of [
        ['sentence', 10, 6],
        ['email', 1, 7],
        ['discussion', 1, 10],
      ] as const)
        stages.push({
          section,
          name: catalog[task][1],
          minutes: min,
          items: pick(task, n, target(task, level)),
        })
    } else
      stages.push({
        section,
        name: 'Speaking',
        minutes: 8,
        items: [
          ...pick('repeat', 7, target('repeat', level), true),
          ...pick('interview', 4, target('interview', level), true),
        ],
      })
  }
  if (!stages.length) throw Error('Unknown section.')
  return stages
}
export function begin(a: Attempt, now = Date.now()) {
  if (a.ended || a.itemStarted) return
  a.itemStarted = now
  a.deadline =
    a.stages[a.stage].minutes > 0 ? now + a.stages[a.stage].minutes * 60000 : 0
}
function finishStage(a: Attempt, now: number) {
  const old = a.stages[a.stage]
  if (a.itemStarted) {
    const active = current(a),
      answer = (a.answers[active.id] ??= {})
    answer.elapsed ??= Math.max(
      0,
      ((a.deadline ? Math.min(a.deadline, now) : now) - a.itemStarted) / 1000,
    )
  }
  for (const item of old.items) {
    const ans = (a.answers[item.id] ??= {})
    mark(item, ans)
  }
  if (a.stage === a.stages.length - 1) {
    a.ended = now
    a.deadline = 0
    updateBands(a)
    return
  }
  const next = a.stages[++a.stage]
  if (next.upper) {
    const total = old.items.reduce((v, q) => v + units(q), 0)
    const points = old.items.reduce(
      (v, q) => v + (a.answers[q.id]?.score ?? 0) * units(q),
      0,
    )
    if (points / total >= 0.65) {
      next.items = next.upper
      if (next.section === 'Listening') next.minutes = 11
    }
    delete next.upper
  }
  a.index = 0
  a.itemStarted = 0
  a.deadline = 0
}
export function expire(a: Attempt, now = Date.now()) {
  if (!a.ended && a.deadline && now >= a.deadline) {
    finishStage(a, now)
    return true
  }
  return false
}
export function advance(a: Attempt, now = Date.now()) {
  if (a.ended || expire(a, now) || !a.itemStarted) return
  const item = current(a),
    ans = (a.answers[item.id] ??= {})
  ans.elapsed = (ans.elapsed ?? 0) + Math.max(0, (now - a.itemStarted) / 1000)
  mark(item, ans)
  if (a.index + 1 === a.stages[a.stage].items.length) finishStage(a, now)
  else {
    a.index++
    a.itemStarted = now
  }
}
export function updateBands(a: Attempt) {
  a.bandRanges = estimateBands(a)
}
// Older graders could leave punctuation-only submissions unscored indefinitely.
export function reconcileWriting(a: Attempt) {
  if (!a.ended) return false
  let changed = false
  for (const stage of a.stages.filter((s) => s.section === 'Writing')) {
    for (const q of stage.items) {
      const answer = a.answers[q.id] ?? {}
      if (markMissingWriting(q, answer)) {
        a.answers[q.id] = answer
        changed = true
      }
    }
  }
  if (changed) updateBands(a)
  return changed
}
export function learnerTrend(attempts: Attempt[], focus: string): Trend {
  const trend = emptyTrend(),
    totals = new Map<Task, number[]>()
  trend.due = {}
  for (const a of attempts) {
    for (const q of a.stages.flatMap((s) => s.items)) {
      const answer = a.answers[q.id]
      if (!answer) continue
      trend.seen.push(q.id)
      if (
        trend.due[q.id] === undefined &&
        answer.score !== undefined &&
        a.ended
      ) {
        const days = (Date.now() - a.ended) / 86400000,
          interval = answer.score < 0.6 ? 1 : answer.score < 0.9 ? 3 : 7
        trend.due[q.id] = days >= interval ? -4.25 : 0
      }
      if (answer.score !== undefined) {
        const scores = totals.get(q.task) ?? []
        if (scores.length < 12) scores.push(answer.score)
        totals.set(q.task, scores)
      }
    }
  }
  let sum = 0,
    n = 0
  for (const [task, values] of totals) {
    trend.weakness[task] = 1 - values.reduce((v, s) => v + s, 0) / values.length
    if (task === focus || catalog[task][0] === focus) {
      sum += values.reduce((v, s) => v + s, 0)
      n += values.length
    }
  }
  trend.level = n === 0 ? 2 : sum / n < 0.55 ? 1 : sum / n > 0.8 ? 3 : 2
  return trend
}
