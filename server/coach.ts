import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { updateBands } from '../core/exam.ts'
import type { Task } from '../core/types.ts'
import { clips, load, save } from './store.ts'
import { complete } from './provider.ts'
import { transcribe, wavInfo } from './speech.ts'
function json(text: string) {
  return JSON.parse(
    text
      .trim()
      .replace(/^\x60\x60\x60(?:json)?\s*/, '')
      .replace(/\x60\x60\x60$/, ''),
  )
}
const rubric: Partial<Record<Task, string>> = {
  repeat:
    'Check accurate repetition and preservation of meaning against the reference, including omissions. Transcription is uncertain evidence.',
  interview:
    'Assess relevance, coherent elaboration, vocabulary and grammar, with pacing from local timing. Audio intelligibility and prosody have limited evidence.',
  email:
    'Assess fulfillment of all requested points, appropriate register, organization, vocabulary and sentence control.',
  discussion:
    'Assess contribution to the discussion, elaboration and examples, clarity and language control.',
}
export async function localTranscript(id: string, itemId: string) {
  const a = load(id)
  if (!a.ended) throw Error('Finish the attempt before reviewing.')
  const q = a.stages.flatMap((s) => s.items).find((i) => i.id === itemId)
  const ans = a.answers[itemId]
  if (!q || !ans?.clip) throw Error('Select a recorded response.')
  if (ans.transcript && ans.timing) return a
  const path = join(clips, ans.clip + '.wav'),
    w = wavInfo(readFileSync(path))
  const total = w.pcm.length / (2 * w.rate)
  let silent = 0,
    quietRun = 0,
    pauses = 0
  for (let p = 0; p < w.pcm.length; p += 640) {
    let energy = 0,
      count = 0
    for (let k = p; k + 1 < Math.min(w.pcm.length, p + 640); k += 2) {
      energy += (w.pcm.readInt16LE(k) / 32768) ** 2
      count++
    }
    if (energy / Math.max(1, count) < 0.0001) {
      silent += 0.02
      quietRun += 0.02
    } else {
      if (quietRun >= 0.4) pauses++
      quietRun = 0
    }
  }
  const timing =
    'Duration ' +
    total.toFixed(1) +
    's; quiet time ' +
    silent.toFixed(1) +
    's; pauses over 0.4s: ' +
    pauses +
    '.'
  const transcript = await transcribe(path),
    latest = load(id)
  Object.assign(latest.answers[itemId], { transcript, timing })
  if (
    !transcript ||
    /^\s*[\[(].*[\])]\s*$/.test(transcript) ||
    silent >= total * 0.95
  )
    latest.answers[itemId].note =
      'Uncertain transcript. Replay the recording and retry this item.'
  save(latest)
  return latest
}
export async function review(id: string, itemId: string) {
  let a = load(id)
  if (!a.ended) throw Error('Finish the attempt before reviewing.')
  const q = a.stages.flatMap((s) => s.items).find((i) => i.id === itemId)
  if (!q || !rubric[q.task])
    throw Error('Select a speaking or written response.')
  if (a.answers[itemId]?.reviewed) return a
  if (a.answers[itemId]?.clip) a = await localTranscript(id, itemId)
  const ans = (a.answers[itemId] ??= {}),
    timing = ans.timing ?? ''
  if (ans.note?.startsWith('Uncertain transcript')) return a
  if (!ans.clip && !ans.text?.trim()) {
    ans.score = 0
    ans.note = 'No response submitted.'
    ans.reviewed = true
    updateBands(a)
    save(a)
    return a
  }
  const raw = await complete(
    'Apply this practice rubric: ' +
      rubric[q.task] +
      ' Give an integer 0–5 or null if evidence is insufficient. Use 5 for complete, precise, well-developed work, 3 for partial but meaningful success, and 1 for minimal relevant material. Return JSON {"points":number|null,"note":"one observed detail that supports the rating"}. Save coaching for a learner question. Do not estimate pronunciation from a transcript.',
    JSON.stringify({
      prompt: q.prompt,
      context: q.passage ?? q.speech,
      answer: ans.transcript ?? ans.text,
      timing,
    }),
  )
  const result = json(raw)
  if (
    (result.points !== null &&
      (!Number.isInteger(result.points) ||
        result.points < 0 ||
        result.points > 5)) ||
    typeof result.note !== 'string'
  )
    throw Error('Invalid assessment. Retry the review.')
  a = load(id)
  const target = a.answers[itemId]
  if (!target.reviewed) {
    if (result.points !== null) {
      target.score = result.points / 5
      delete target.gradingState
    } else target.gradingState = 'insufficient'
    target.note = result.note
    target.reviewed = result.points !== null
    updateBands(a)
    save(a)
  }
  return a
}
