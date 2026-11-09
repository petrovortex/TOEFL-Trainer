import {
  units,
  missingWrittenResponse,
  type Answer,
  type Item,
  type Attempt,
} from './types.ts'
export function responseStatus(q: Item, a: Answer = {}) {
  if ((!a.clip && !a.text?.trim()) || missingWrittenResponse(q, a.text))
    return 'No response'
  if (a.score === undefined)
    return a.note?.startsWith('Uncertain') || a.gradingState === 'insufficient'
      ? 'Insufficient evidence'
      : 'Awaiting grading'
  return q.keys
    ? a.score === 1
      ? 'Correct'
      : a.score === 0
        ? 'Incorrect'
        : 'Partly correct'
    : 'Graded'
}
export function points(q: Item, a: Answer = {}) {
  const max = q.keys ? units(q) : 5
  return a.score === undefined ? '—' : `${Math.round(a.score * max)}/${max}`
}
export function reportRows(a: Attempt) {
  return a.stages
    .flatMap((s) =>
      s.items.map((q) => ({
        q,
        section: s.section,
        answer: a.answers[q.id] ?? {},
      })),
    )
    .map((r, i) => ({
      ...r,
      number: i + 1,
      status: responseStatus(r.q, r.answer),
    }))
}
