import { bank } from '../core/exam.ts'
import { synth, audioKey } from '../server/speech.ts'
import { readdirSync, unlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
const cache = resolve('.work/prompts')
const unique = [
  ...new Map(
    bank.filter((q) => q.speech).map((q) => [audioKey(q), q]),
  ).values(),
]
for (const [i, q] of unique.entries()) {
  await synth(q, cache)
  if ((i + 1) % 10 === 0 || i === 0)
    console.log('Prepared', i + 1, 'of', unique.length)
}
// This directory holds build outputs. Learner recordings use a separate store.
const prompts = new Set(unique.map((q) => audioKey(q) + '.wav'))
for (const file of readdirSync(cache, { withFileTypes: true })) {
  if (file.isFile() && /^[a-f0-9]{64}\.wav$/.test(file.name) && !prompts.has(file.name)) {
    unlinkSync(join(cache, file.name))
  }
}
