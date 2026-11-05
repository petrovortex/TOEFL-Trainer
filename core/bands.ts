import {
  sections,
  units,
  missingWrittenResponse,
  type Attempt,
  type Section,
} from './types.ts'
export interface BandRange {
  low: number
  high: number
}
export type BandRanges = Partial<Record<Section | 'Overall', BandRange>>
const half = (v: number) => Math.round(v * 2) / 2

// These are practice sensitivity bands. They are not calibrated statistical intervals.
export function estimateBands(a: Attempt, points?: Partial<Record<Section, number>>): BandRanges {
  const ranges: BandRanges = {}
  if (!a.ended || a.mode === 'drill') return ranges
  for (const section of sections) {
    const items = a.stages
      .filter((s) => s.section === section)
      .flatMap((s) => s.items)
    if (
      !items.length ||
      items.some((q) => !Number.isFinite(a.answers[q.id]?.score))
    )
      continue
    let earned = 0,
      available = 0,
      answered = 0,
      count = 0
    for (const q of items) {
      const ans = a.answers[q.id],
        weight = q.keys ? units(q) : 5
      available += weight
      earned += weight * ans.score!
      count += units(q)
      answered +=
        q.task === 'words'
          ? (ans.text ?? '').split('|').filter((s) => s.trim()).length
          : Number(
              !!ans.clip ||
                (!!ans.text?.trim() && !missingWrittenResponse(q, ans.text)),
            )
    }
    if (answered < count / 2) continue
    if (points) points[section] = half(1 + 5 * earned / available)
    if (earned === available && answered >= count) {
      ranges[section] = { low: 6, high: 6 }
      continue
    }
    const center = 1 + (5 * earned) / available
    const margin = section === 'Speaking' || section === 'Writing' ? 1 : 0.5
    ranges[section] = {
      low: Math.max(1, half(center - margin)),
      high: Math.min(6, half(center + margin)),
    }
  }
  if (sections.every((s) => ranges[s])) {
    const mean = (end: 'low' | 'high') =>
      sections.reduce((v, s) => v + ranges[s]![end], 0) / 4
    // Round outwards so averaging does not collapse a non-perfect mock to 6.0.
    ranges.Overall = {
      low: Math.floor(mean('low') * 2) / 2,
      high: Math.ceil(mean('high') * 2) / 2,
    }
  }
  return ranges
}
export function displayBand(r: BandRange) {
  return r.low === r.high
    ? r.low.toFixed(1)
    : r.low.toFixed(1) + '–' + r.high.toFixed(1)
}

export function practiceReport(a: Attempt) {
  const points: Partial<Record<Section | 'Overall', number>> = {}
  const ranges = estimateBands(a, points)
  let comparable: BandRange | undefined
  if (ranges.Overall) {
    const mean = (get: (s: Section) => number) => half(sections.reduce((v, s) => v + get(s), 0) / 4)
    points.Overall = mean(s => points[s]!)
    ranges.Overall = { low: mean(s => ranges[s]!.low), high: mean(s => ranges[s]!.high) }
    const scores = [6, 18, 28, 38, 51, 65, 80, 90, 100, 110, 118]
    comparable = {
      low: scores[2 * (ranges.Overall.low - 1)],
      high: scores[2 * (ranges.Overall.high - 1)],
    }
  }
  return { points, ranges, comparable }
}

// ETS's section-specific concordance, indexed by half band from 1 to 6.
// Each entry is the lowest old-scale score that corresponds to that band.
// https://www.ets.org/toefl/institutions/ibt/score-scale-update.html
const legacyFloors: Record<Section, number[]> = {
  Reading: [0, 2, 3, 4, 6, 12, 18, 22, 24, 27, 29],
  Listening: [0, 2, 4, 6, 9, 13, 17, 20, 22, 26, 28],
  Writing: [0, 3, 7, 11, 13, 15, 17, 21, 24, 27, 29],
  Speaking: [0, 5, 10, 13, 16, 18, 20, 23, 25, 27, 28],
}

export function legacyEstimates(bands: BandRanges): BandRanges {
  const result: BandRanges = {}
  for (const section of sections) {
    const range = bands[section]
    if (!range) continue
    const floors = legacyFloors[section]
    result[section] = {
      low: floors[(range.low - 1) * 2],
      high: (floors[(range.high - 1) * 2 + 1] ?? 31) - 1,
    }
  }
  if (sections.every((s) => result[s])) {
    result.Overall = {
      low: sections.reduce((n, s) => n + result[s]!.low, 0),
      high: sections.reduce((n, s) => n + result[s]!.high, 0),
    }
  }
  return result
}
