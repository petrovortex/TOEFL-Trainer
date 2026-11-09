import type { Item, PracticeLength, Task, Trend } from './types.ts'

export const groupedTasks = new Set<Task>([
  'daily',
  'passage',
  'conversation',
  'announcement',
  'talk',
  'repeat',
  'interview',
])
export function materialKeys(q: Item) {
  return [
    q.id,
    ...(q.group ? ['group:' + q.group] : []),
    'stimulus:' +
      (q.passage || q.speech || q.prompt)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim(),
  ]
}
export function lastUsed(items: Item[], trend: Trend) {
  return Math.max(
    0,
    ...items.flatMap((q) =>
      materialKeys(q).map(
        (key) => trend.lastUsed?.[key] ?? (trend.seen.includes(q.id) ? 1 : 0),
      ),
    ),
  )
}
export function materialSets(items: Item[]) {
  const result = new Map<string, Item[]>()
  for (const q of items) {
    const key = q.task + ':' + (q.group || q.id)
    const group = result.get(key) ?? []
    group.push(q)
    result.set(key, group)
  }
  return [...result.values()]
}
export function practiceSize(task: Task, length: PracticeLength = 'standard') {
  const n = { short: 1, standard: 2, long: 3 }[length]
  if (!n) throw Error('Unknown practice length.')
  return n * (task === 'reply' || task === 'sentence' ? 5 : 1)
}
export function practiceSets(pool: Item[], task: Task) {
  return materialSets(pool.filter((q) => q.task === task)).filter((set) =>
    task === 'repeat'
      ? set.length === 7
      : task === 'interview'
        ? set.length === 4
        : true,
  )
}
