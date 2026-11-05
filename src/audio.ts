export async function microphone() {
  return navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  })
}
export function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((t) => t.stop())
}
export async function toWave(blob: Blob) {
  const context = new AudioContext()
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer())
    const offline = new OfflineAudioContext(
      1,
      Math.max(1, Math.ceil(decoded.duration * 16000)),
      16000,
    )
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const pcm = (await offline.startRendering()).getChannelData(0)
    const buf = new ArrayBuffer(44 + pcm.length * 2),
      view = new DataView(buf)
    function str(pos: number, s: string) {
      for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i))
    }
    str(0, 'RIFF')
    view.setUint32(4, buf.byteLength - 8, true)
    str(8, 'WAVE')
    str(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, 16000, true)
    view.setUint32(28, 32000, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    str(36, 'data')
    view.setUint32(40, pcm.length * 2, true)
    for (let i = 0; i < pcm.length; i++)
      view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true)
    return new Blob([buf], { type: 'audio/wav' })
  } finally {
    await context.close()
  }
}
