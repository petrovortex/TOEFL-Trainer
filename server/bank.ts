import { randomUUID } from 'node:crypto'
import { bank, learnerTrend } from '../core/exam.ts'
import {
  catalog,
  emptyTrend,
  type Item,
  type Task,
  type Stage,
} from '../core/types.ts'
import { lastUsed, practiceSets, practiceSize } from '../core/material.ts'
import { author, fingerprint, type AuthorProgress } from './author.ts'
import {
  extras,
  archivedGeneratedMaterial,
  addItem,
  setting,
  configure,
  exposures,
  practicedTasks,
  jobs,
  saveJob,
  bankUsage,
  spendBank,
  transaction,
  load,
  save,
  recent,
} from './store.ts'
import { preferences } from './provider.ts'
import { backgroundAllowed } from './work.ts'

export interface BankJob {
  id: string
  task: Task
  personal: boolean
  attempt?: string
  brief: string
  state: 'queued' | 'working' | 'paused' | 'done'
  retryAfter: number
  error?: string
  slots: Item[]
  progress: AuthorProgress
  started?: boolean
}
let working = false
class Paused extends Error {}
export function bankEnabled() {
  return setting('automatic-bank') !== 'off'
}
export function setBankEnabled(enabled: boolean) {
  configure('automatic-bank', enabled ? 'on' : 'off')
}
export function bankStatus() {
  const pending = jobs<BankJob>().filter((j) => j.state !== 'done')
  return {
    enabled: bankEnabled(),
    ...bankUsage(),
    pending: pending.length,
    state: !bankEnabled()
      ? 'Off'
      : !preferences().configured
        ? 'Connect AI to add fresh material'
        : !backgroundAllowed()
          ? 'Paused during practice or AI work'
          : working
            ? 'Preparing fresh material'
            : Number(setting('bank-backoff')) > Date.now() ||
                pending.some((j) => j.retryAfter > Date.now())
              ? 'Paused; will retry later'
              : bankUsage().batches >= 4 || bankUsage().requests >= 8
                ? 'Daily limit reached'
                : pending.length
                  ? 'Queued'
                  : 'Bank ready',
    error: pending.find((j) => j.error)?.error,
  }
}
function slotsFor(task: Task, personal: boolean) {
  const sets = practiceSets(bank, task)
  const size = sets[0].length
  const counts = bank
    .concat(extras())
    .filter((q) => q.task === task && !q.personal)
  const levels = [1, 2, 3].sort(
    (a, b) =>
      counts.filter((q) => q.level === a).length -
      counts.filter((q) => q.level === b).length,
  )
  const chosen = sets[Math.floor(Math.random() * sets.length)]
  return (
    size > 1
      ? chosen
      : task === 'reply' || task === 'sentence'
        ? sets.slice(0, 5).flat()
        : chosen
  ).map((q) => ({
    ...q,
    personal,
    level: personal ? learnerTrend(recent(), task).level : levels[0],
  }))
}
export function enqueuePersonal(attempt: string, task: Task, brief: string) {
  const id = 'personal-' + attempt
  if (jobs<BankJob>().some((j) => j.id === id)) return
  saveJob({
    id,
    task,
    personal: true,
    attempt,
    brief,
    state: 'queued',
    retryAfter: 0,
    slots: slotsFor(task, true),
    progress: {},
  } as BankJob)
}
export function replenish(now = Date.now()) {
  if (!bankEnabled() || !preferences().configured) return
  const pending = jobs<BankJob>().filter((j) => j.state !== 'done')
  const trend = { ...emptyTrend(), lastUsed: exposures() }
  for (const name of practicedTasks(now - 14 * 86400000)) {
    const task = name as Task
    if (!catalog[task] || pending.some((j) => j.task === task && !j.personal))
      continue
    const unseen = practiceSets(
      bank.concat(extras().filter((q) => !q.personal)),
      task,
    ).filter((set) => !lastUsed(set, trend)).length
    if (unseen >= practiceSize(task) * 2) continue
    saveJob({
      id: randomUUID(),
      task,
      personal: false,
      brief:
        'Create a new neutral exam set. Vary genre, communicative purpose, reasoning and sentence structure, not merely names. Balance the requested difficulty without using learner results.',
      state: 'queued',
      retryAfter: 0,
      slots: slotsFor(task, false),
      progress: {},
    } as BankJob)
  }
}
export async function runBank(write: typeof author = author, now = Date.now()) {
  if (
    working ||
    !bankEnabled() ||
    !preferences().configured ||
    !backgroundAllowed()
  )
    return
  if (Number(setting('bank-backoff')) > now) return
  const usage = bankUsage(now)
  const job = jobs<BankJob>().find(
    (j) =>
      j.state !== 'done' &&
      j.retryAfter <= now &&
      (j.started || usage.batches < 4) &&
      (j.progress.audited || usage.requests < 8),
  )
  if (!job) return
  working = true
  job.state = 'working'
  job.error = undefined
  if (!job.started) {
    spendBank('batch', now)
    job.started = true
  }
  saveJob(job)
  try {
    const result = await write(
      job.slots,
      job.personal,
      bank.concat(extras()),
      job.brief,
      {
        progress: job.progress,
        persist: () => saveJob(job),
        checkpoint: (request) => {
          if (!bankEnabled() || !backgroundAllowed())
            throw new Paused('Waiting until practice and AI work finish.')
          if (request) {
            if (bankUsage().requests >= 8)
              throw new Paused('Daily generation limit reached.')
            spendBank('request')
          }
        },
      },
    )
    transaction(() => {
      for (const q of result) addItem(q, fingerprint(q))
      const completed: BankJob = {
        ...job,
        state: 'done',
        progress: {},
        slots: [],
      }
      saveJob(completed)
      if (job.attempt) {
        const a = load(job.attempt)
        a.followUp = {
          reason: 'Targeted practice is ready.',
          task: job.task,
          item: result[0].id,
        }
        save(a)
      }
    })
  } catch (error) {
    job.state = 'paused'
    job.error = (error as Error).message
    job.retryAfter = Date.now() + (error instanceof Paused ? 15000 : 3600000)
    if (!(error instanceof Paused)) {
      configure('bank-backoff', String(job.retryAfter))
      // A new generation attempt is another batch; validated output survives transport/audio failures.
      if (!job.progress.audited) {
        job.started = false
        job.progress = {}
      }
    }
    saveJob(job)
  } finally {
    working = false
  }
}
export function migratePreparedMaterial() {
  if (setting('prepared-bank-migrated')) return
  const raw = setting('prepared-mock-v1')
  const draft = raw
    ? (JSON.parse(raw) as { stages: Stage[]; done: number })
    : undefined
  // Generated IDs identify batches already validated by the old preparer; untouched slots retain starter IDs.
  const items = [
    ...(draft?.stages
      .flatMap((s) => [...s.items, ...(s.upper ?? [])])
      .filter((q) => q.id.startsWith('gen-')) ?? []),
    ...archivedGeneratedMaterial(),
  ]
  const known = new Set(extras().map(fingerprint))
  transaction(() => {
    for (const q of items)
      if (!known.has(fingerprint(q))) {
        addItem(q, fingerprint(q))
        known.add(fingerprint(q))
      }
    configure('prepared-bank-migrated', 'yes')
    configure('prepared-mock-v1', '')
  })
}
