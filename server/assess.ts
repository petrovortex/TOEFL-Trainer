import { load } from './store.ts'
import { review } from './coach.ts'
import type { Attempt } from '../core/types.ts'
import { foregroundWork } from './work.ts'
const running = new Map<string, Promise<Attempt>>()
export function assessAttempt(id: string) {
  const pending = running.get(id)
  if (pending) return pending
  const job = foregroundWork(async () => {
    let a = load(id)
    if (!a.ended) throw Error('Finish the attempt before grading.')
    for (const q of a.stages.flatMap((s) => s.items)) {
      if (!q.keys && a.answers[q.id]?.score === undefined)
        a = await review(id, q.id)
    }
    return a
  }).finally(() => running.delete(id))
  running.set(id, job)
  return job
}
