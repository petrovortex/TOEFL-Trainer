import { load, previousFullMocks, save } from './store.ts'
import { review } from './coach.ts'
import { planFollowUp } from './followup.ts'
import { mockStatus, needsFreshMock, prepareMock } from './mock.ts'
import { preferences } from './provider.ts'
import { missingWrittenResponse, type Attempt } from '../core/types.ts'

const running = new Map<string, Promise<Attempt>>()

export function assessAttempt(id: string) {
  const existing = running.get(id)
  if (existing) return existing
  const job = assess(id).finally(() => running.delete(id))
  running.set(id, job)
  return job
}

async function assess(id: string) {
  let a = load(id)
  if (!a.ended) throw Error('Finish the attempt before assessment.')
  const items = a.stages.flatMap((s) => s.items)
  for (const q of items) {
    if (!q.keys && a.answers[q.id]?.score === undefined)
      a = await review(id, q.id)
  }
  const hasEvidence = items.some((q) => {
    const answer = a.answers[q.id]
    return (
      answer?.score !== undefined &&
      (answer.clip ||
        (answer.text?.trim() && !missingWrittenResponse(q, answer.text)))
    )
  })
  if (!hasEvidence) return a
  if (!a.followUp) a = await planFollowUp(id)
  if (a.mode === 'full' && preferences().configured) {
    const status = mockStatus()
    const resume =
      a.mockPreparationId &&
      a.mockPreparationId === status.id &&
      status.state === 'paused'
    if (resume || (!a.mockPreparationId && needsFreshMock(a, previousFullMocks(a.started)))) {
      const draft = prepareMock()
      a = load(id)
      a.mockPreparationId = draft.id
      save(a)
    }
  }
  return a
}
