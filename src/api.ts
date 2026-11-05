import type { Answer, Attempt, Item, Mode, Section } from '../core/types.ts'
export interface LiveView {
  id: string
  mode: Mode
  focus: string
  stage: number
  index: number
  deadline: number
  itemStarted: number
  stageName: string
  section: Section
  count: number
  minutes: number
  answer: Answer
  responseUntil: number
  item: Item
  audio: string | null
  played: boolean
  limit: number
  ended?: undefined
}
export type Session = LiveView | Attempt
export const isLive = (s: Session): s is LiveView => 'item' in s
export async function api<T>(path: string, data?: unknown): Promise<T> {
  const r = await fetch(
    '/api/' + path,
    data === undefined
      ? {}
      : {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-fieldwork': 'local',
          },
          body: JSON.stringify(data),
        },
  )
  const result = await r.json()
  if (!r.ok) throw Error(result.error ?? 'The local service is unavailable.')
  return result
}
export interface Prefs {
  provider: string
  model: string
  configured: boolean
  models: string[]
}
export const date = (n: number) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(n)
