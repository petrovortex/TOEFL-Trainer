import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import type { Item } from '../core/types.ts'
const run = promisify(execFile)
export const speechRoot = resolve(
  process.env.FIELDWORK_SPEECH ??
    (existsSync('speech') ? 'speech' : '.work/speech'),
)
const model = join(speechRoot, 'kokoro-en-v0_19')
const tts = join(speechRoot, 'tts', 'sherpa-onnx-offline-tts.exe')
const asr = join(speechRoot, 'asr', 'whisper-cli.exe')
const voicePack = 'kokoro-en-v0.19-production-1'
function voice(q: Item, line: number) {
  const seed = createHash('sha256')
    .update(q.group ?? q.speech ?? q.title)
    .digest()[0]
  if (q.task === 'conversation')
    return line % 2 ? [5, 6, 10][seed % 3] : [0, 3, 7][seed % 3]
  return [0, 3, 5, 6, 7, 9, 10][seed % 7]
}
export const audioKey = (q: Item) =>
  createHash('sha256')
    .update([voicePack, q.task, voice(q, 0), voice(q, 1), q.speech].join('|'))
    .digest('hex')
export function wave(pcm: Buffer, rate: number) {
  const h = Buffer.alloc(44)
  h.write('RIFF')
  h.writeUInt32LE(36 + pcm.length, 4)
  h.write('WAVEfmt ', 8)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20)
  h.writeUInt16LE(1, 22)
  h.writeUInt32LE(rate, 24)
  h.writeUInt32LE(rate * 2, 28)
  h.writeUInt16LE(2, 32)
  h.writeUInt16LE(16, 34)
  h.write('data', 36)
  h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}
export function wavInfo(b: Buffer) {
  if (
    b.toString('ascii', 0, 4) !== 'RIFF' ||
    b.toString('ascii', 8, 12) !== 'WAVE'
  )
    throw Error('Invalid WAV recording.')
  let rate = 0
  for (let pos = 12; pos + 8 <= b.length;) {
    const n = b.readUInt32LE(pos + 4),
      tag = b.toString('ascii', pos, pos + 4),
      end = pos + 8 + n
    if (end > b.length) break
    if (
      tag === 'fmt ' &&
      n >= 16 &&
      b.readUInt16LE(pos + 8) === 1 &&
      b.readUInt16LE(pos + 10) === 1 &&
      b.readUInt16LE(pos + 22) === 16
    )
      rate = b.readUInt32LE(pos + 12)
    if (tag === 'data' && rate && n > 0)
      return { rate, pcm: b.subarray(pos + 8, end) }
    pos = end + (n % 2)
  }
  throw Error('Expected mono 16-bit PCM audio.')
}
const jobs = new Map<string, Promise<void>>()
export async function synth(q: Item, cache: string, checkpoint?: () => void) {
  const key = audioKey(q),
    path = join(cache, key + '.wav')
  if (existsSync(path)) return
  if (jobs.has(path)) return jobs.get(path)
  async function generate() {
    if (!existsSync(tts))
      throw Error(
        'The local voices are missing. Close the app and run Start TOEFL Trainer again to install them.',
      )
    mkdirSync(cache, { recursive: true })
    const segments: Buffer[] = []
    let rate = 24000
    for (const [i, line] of q.speech!.split('\n').entries()) {
      const sid = voice(q, i)
      const hash = createHash('sha256')
        .update(voicePack + '|' + sid + '|' + line)
        .digest('hex')
      const single = join(cache, hash + '.wav')
      if (!existsSync(single)) {
        checkpoint?.()
        const tmp = single + '.' + randomUUID() + '.wav'
        await run(
          tts,
          [
            '--kokoro-model=' + join(model, 'model.onnx'),
            '--kokoro-voices=' + join(model, 'voices.bin'),
            '--kokoro-tokens=' + join(model, 'tokens.txt'),
            '--kokoro-data-dir=' + join(model, 'espeak-ng-data'),
            '--num-threads=2',
            '--sid=' + sid,
            '--output-filename=' + tmp,
            line,
          ],
          { windowsHide: true, timeout: 180000, maxBuffer: 4e6 },
        )
        wavInfo(readFileSync(tmp))
        renameSync(tmp, single)
      }
      const wav = wavInfo(readFileSync(single))
      rate = wav.rate
      if (i) segments.push(Buffer.alloc(Math.round(rate * 0.22) * 2))
      segments.push(wav.pcm)
    }
    const tmp = path + '.tmp'
    writeFileSync(tmp, wave(Buffer.concat(segments), rate))
    renameSync(tmp, path)
  }
  const work = generate().finally(() => jobs.delete(path))
  jobs.set(path, work)
  return work
}
export async function transcribe(path: string) {
  if (!existsSync(asr))
    throw Error('The offline transcription engine is missing.')
  const { stdout } = await run(
    asr,
    [
      '-m',
      join(speechRoot, 'ggml-base.en-q5_1.bin'),
      '-f',
      path,
      '-l',
      'en',
      '-nt',
      '-np',
      '-t',
      '3',
    ],
    { windowsHide: true, timeout: 120000, maxBuffer: 2e6 },
  )
  return stdout.trim().replace(/\s+/g, ' ')
}
