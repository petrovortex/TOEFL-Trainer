let foreground = 0
const exams = new Map<string, number>()
export function examActivity(active = true, client = 'server') {
  if (active) exams.set(client, Date.now() + 45000)
  else exams.delete(client)
}
export function backgroundAllowed() {
  for (const [client, until] of exams)
    if (until <= Date.now()) exams.delete(client)
  return foreground === 0 && exams.size === 0
}
export async function foregroundWork<T>(fn: () => Promise<T>) {
  foreground++
  try {
    return await fn()
  } finally {
    foreground--
  }
}
