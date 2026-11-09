export const catalog = {
  words: ['Reading', 'Complete the Words'],
  daily: ['Reading', 'Read in Daily Life'],
  passage: ['Reading', 'Read an Academic Passage'],
  reply: ['Listening', 'Listen and Choose a Response'],
  conversation: ['Listening', 'Listen to a Conversation'],
  announcement: ['Listening', 'Listen to an Announcement'],
  talk: ['Listening', 'Listen to an Academic Talk'],
  sentence: ['Writing', 'Build a Sentence'],
  email: ['Writing', 'Write an Email'],
  discussion: ['Writing', 'Write for an Academic Discussion'],
  repeat: ['Speaking', 'Listen and Repeat'],
  interview: ['Speaking', 'Take an Interview'],
} as const
export type Task = keyof typeof catalog
export type Section = (typeof catalog)[Task][0]
export const sections: Section[] = [
  'Reading',
  'Listening',
  'Writing',
  'Speaking',
]
export type Mode = 'full' | 'section' | 'drill'
export type PracticeLength = 'short' | 'standard' | 'long'
export interface CoachMessage {
  role: 'user' | 'assistant'
  text: string
  scope?: 'attempt' | 'item'
  item?: string
  analysis?: string
}
export interface Item {
  id: string
  task: Task
  level: number
  title: string
  prompt: string
  passage?: string
  speech?: string
  options?: string[]
  keys?: string[]
  chunks?: string[]
  evidence?: string
  group?: string
  personal?: boolean
}
export interface Answer {
  text?: string
  clip?: string
  transcript?: string
  timing?: string
  seconds?: number
  elapsed?: number
  score?: number
  note?: string
  reviewed?: boolean
  gradingState?: 'insufficient'
}
export interface Stage {
  section: Section
  name: string
  minutes: number
  items: Item[]
  upper?: Item[]
}
export interface Attempt {
  bandRanges?: import('./bands.ts').BandRanges
  followUp?: { reason: string; task?: Task; item?: string }
  mockPreparationId?: string
  id: string
  rules: number
  mode: Mode
  focus: string
  seed: number
  started: number
  stage: number
  index: number
  deadline: number
  itemStarted: number
  ended?: number
  stages: Stage[]
  answers: Record<string, Answer>
  messages: CoachMessage[]
  analysis?: { fingerprint: string; text: string }
  analysisParts?: Record<string, string>
  practiceLength?: PracticeLength
  bands: Partial<Record<Section | 'Overall', number>>
  retryOf?: { id: string; item: string }
}
export type HistoryRow = Pick<
  Attempt,
  'id' | 'mode' | 'focus' | 'started' | 'ended' | 'bands'
>
export interface Trend {
  seen: string[]
  level: number
  weakness: Partial<Record<Task, number>>
  due?: Partial<Record<string, number>>
  lastUsed?: Record<string, number>
}
export const emptyTrend = (): Trend => ({ seen: [], level: 2, weakness: {} })
export const current = (a: Attempt) => a.stages[a.stage]?.items[a.index]
export function missingWrittenResponse(q: Item, text?: string) {
  return (
    (q.task === 'email' || q.task === 'discussion') &&
    /^[\s\p{P}]*$/u.test(text ?? '')
  )
}
export const units = (q: Item) =>
  q.task === 'words' ? (q.keys?.length ?? 10) : 1
export const secondsLimit = (q: Item) =>
  q.task === 'interview'
    ? 45
    : q.task === 'repeat'
      ? Math.min(
          12,
          Math.max(8, Math.ceil((q.speech?.split(' ').length ?? 8) * 0.8)),
        )
      : 0
