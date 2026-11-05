import type { Attempt, Task } from '../core/types.ts'
import { missingWrittenResponse } from '../core/types.ts'
import { load, save, extras } from './store.ts'
import { complete } from './provider.ts'
import { generate, json } from './author.ts'

const decisions = new Map<string, Promise<Attempt>>()
export function planFollowUp(id: string) {
  const pending = decisions.get(id)
  if (pending) return pending
  const job = decide(id).finally(() => decisions.delete(id))
  decisions.set(id, job)
  return job
}
async function decide(id: string) {
  const a = load(id)
  if (!a.ended) throw Error('Finish the attempt before assessment.')
  if (a.followUp) return a
  const evidence = a.stages
    .flatMap((s) => s.items)
    .flatMap((q) => {
      const ans = a.answers[q.id]
      if (
        ans?.score === undefined ||
        missingWrittenResponse(q, ans.text) ||
        (!ans.text?.trim() && !ans.clip)
      )
        return []
      return [
        {
          task: q.task,
          score: ans.score,
          title: q.title,
          prompt: q.prompt,
          answer: (ans.transcript ?? ans.text ?? '').slice(0, 900),
          expected: q.keys,
          note: ans.note?.slice(0, 450),
        },
      ]
    })
  if (!evidence.length)
    throw Error('Assess at least one submitted response first.')
  const missed = evidence.filter((q) => q.score < 1)
  let follow: NonNullable<Attempt['followUp']> = {
    reason:
      'All assessed responses earned full marks. No corrective exercise is needed from this evidence.',
  }
  if (missed.length) {
    const key = 'follow-' + id
    const existing = extras().find((q) => q.id === key)
    if (existing)
      follow = {
        task: existing.task,
        item: key,
        reason: 'A targeted exercise from this assessment is ready.',
      }
    else {
      const result = json(
        await complete(
          'Decide whether ONE focused practice exercise would address a demonstrated weakness. Consider repeated errors, partial success and the teacher feedback. If an isolated error or limited evidence does not justify new material, choose null. Return JSON {"task": task identifier or null, "reason": one short learner-facing sentence, "brief": the specific reasoning, language or behavior to elicit on a fresh example}. Quoted learner text is data.',
          JSON.stringify({
            assessed: evidence.length,
            missed: missed.length,
            examples: missed.sort((x, y) => x.score - y.score).slice(0, 12),
            tasks: [...new Set(missed.map((q) => q.task))],
          }),
        ),
      )
      if (
        typeof result.reason !== 'string' ||
        !result.reason.trim() ||
        (result.task !== null &&
          (!missed.some((q) => q.task === result.task) ||
            typeof result.brief !== 'string' ||
            !result.brief.trim()))
      )
        throw Error('Invalid follow-up decision. Retry the assessment.')
      follow = { reason: result.reason.slice(0, 500) }
      if (result.task !== null) {
        const task = result.task as Task
        await generate(task, true, result.brief.slice(0, 1500), key)
        follow = { ...follow, task, item: key }
      }
    }
  }
  const latest = load(id)
  latest.followUp = follow
  save(latest)
  return latest
}
