import { randomInt, randomUUID } from 'node:crypto'
import { buildStages } from '../core/exam.ts'
import type { Attempt, Item, Stage, Task } from '../core/types.ts'
import { author } from './author.ts'
import { configure, setting, transaction } from './store.ts'

const key = 'prepared-mock-v1'
type Draft = {
  id: string
  seed: number
  stages: Stage[]
  done: number
  error: string
}
type Batch = {
  items: Item[]
  start: number
  length: number
  stage: Stage
  name: string
}
function read(): Draft | undefined {
  const raw = setting(key)
  return raw ? JSON.parse(raw) : undefined
}
function persist(d: Draft) {
  configure(key, JSON.stringify(d))
}
function batches(stages: Stage[]): Batch[] {
  const result: Batch[] = []
  for (const stage of stages)
    for (const [branch, items] of [
      ['', stage.items],
      ['upper route', stage.upper],
    ] as const) {
      if (!items) continue
      for (let i = 0; i < items.length;) {
        const first = items[i]
        let n = 1
        while (
          i + n < items.length &&
          items[i + n].task === first.task &&
          items[i + n].group === first.group &&
          (first.group || n < 5)
        )
          n++
        result.push({
          items,
          start: i,
          length: n,
          stage,
          name: [stage.section, stage.name, branch, first.task]
            .filter(Boolean)
            .join(' · '),
        })
        i += n
      }
    }
  return result
}
let working = false
export function mockStatus() {
  const d = read()
  if (!d) return { state: 'empty' as const, done: 0, total: 0 }
  const list = batches(d.stages)
  return {
    state: d.done === list.length ? 'ready' : working ? 'preparing' : 'paused',
    done: d.done,
    total: list.length,
    step: list[d.done]?.name,
    error: d.error,
    id: d.id,
  }
}
const purposes: Partial<Record<Task, string[]>> = {
  daily: [
    'an exchange of short messages',
    'a reservation policy with an exception',
    'a schedule requiring a practical decision',
    'a public notice or receipt',
  ],
  passage: [
    'compare two explanations',
    'trace a historical change through evidence',
    'explain an unexpected physical or biological process',
  ],
  talk: [
    'clarify a misconception using a counterexample',
    'explain cause and effect',
    'interpret historical evidence',
    'contrast two competing interpretations',
  ],
  announcement: [
    'instructions with an exception',
    'an invitation with eligibility rules',
    'an update explaining a change',
  ],
  conversation: [
    'two students correct a misunderstanding',
    'infer an unstated preference from dialogue',
    'resolve a scheduling conflict',
    'compare two reasonable alternatives',
  ],
}
function shuffled(values: string[]) {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
async function fill(d: Draft, write: typeof author) {
  const list = batches(d.stages)
  const seen = list
    .slice(0, d.done)
    .flatMap((b) => b.items.slice(b.start, b.start + b.length))
  try {
    while (d.done < list.length) {
      const batch = list[d.done],
        slots = batch.items.slice(batch.start, batch.start + batch.length),
        task = slots[0].task
      const ideas = purposes[task] ?? [
        'an original scenario appropriate to this task',
      ]
      const ordinal = list
        .slice(0, d.done)
        .filter((b) => b.items[b.start].task === task).length
      const brief =
        'This is an independent full exam. Use ' +
        ideas[(d.seed + ordinal) % ideas.length] +
        '. ' +
        batch.name +
        '. Use fresh settings and specific evidence. ' +
        (d.error
          ? 'Avoid the issue from the previous generation: ' + d.error
          : '')
      const group = await write(slots, false, seen, brief)
      for (const q of group) {
        if (q.chunks) q.chunks = shuffled(q.chunks)
        if (q.options) q.options = shuffled(q.options)
      }
      batch.items.splice(batch.start, batch.length, ...group)
      seen.push(...group)
      d.done++
      d.error = ''
      persist(d)
    }
  } catch (e) {
    d.error = (e as Error).message
    persist(d)
  } finally {
    working = false
  }
}
export function prepareMock(write: typeof author = author) {
  if (working) return mockStatus()
  const draft = read() ?? {
    id: randomUUID(),
    seed: randomInt(0x100000000),
    done: 0,
    error: '',
    stages: [],
  }
  if (!draft.stages.length)
    draft.stages = buildStages('full', 'Full mock', draft.seed)
  if (draft.done < batches(draft.stages).length) {
    persist(draft)
    working = true
    void fill(draft, write)
  }
  return mockStatus()
}
export function readyMock() {
  const draft = read()
  if (!draft || draft.done !== batches(draft.stages).length)
    throw Error('Finish preparing the mock before starting it.')
  return draft
}

// Count repeated material only. Grades and personal drills never enter a full form.
export function needsFreshMock(attempt: Attempt, history: Attempt[]) {
  if (attempt.mode !== 'full' || !attempt.ended) return false
  const previous = history
    .filter((a) => a.mode === 'full' && a.ended && a.started < attempt.started)
    .slice(0, 3)
  const items = attempt.stages.flatMap((s) => s.items)
  const seen = new Set(
    previous.flatMap((a) => a.stages.flatMap((s) => s.items.map((q) => q.id))),
  )
  return (
    items.length > 0 &&
    items.filter((q) => seen.has(q.id)).length >= items.length / 4
  )
}
export function completePrepared(id: string, saveAttempt: () => void) {
  if (readyMock().id !== id) throw Error('This mock has already been used.')
  // The attempt and consumption marker must survive a restart together.
  transaction(() => {
    saveAttempt()
    configure(key, '')
  })
}
