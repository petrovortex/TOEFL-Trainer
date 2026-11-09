import { useEffect, useState } from 'react'
import { api, type Prefs } from './api.ts'
import { microphone, stopStream } from './audio.ts'
export function Settings() {
  const [bank, setBank] = useState<{
    enabled: boolean
    state: string
    pending: number
    batches: number
    requests: number
    error?: string
  }>()
  const [prefs, setPrefs] = useState<Prefs>(),
    [provider, setProvider] = useState('chatgpt'),
    [model, setModel] = useState(''),
    [key, setKey] = useState(''),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState(''),
    [micNote, setMicNote] = useState(''),
    [checkingMic, setCheckingMic] = useState(false)
  function apply(p: Prefs) {
    setPrefs(p)
    setProvider(p.provider)
    setModel(p.model)
  }
  useEffect(() => {
    api<Prefs>('prefs')
      .then(apply)
      .catch((e) => setNote(e.message))
  }, [])
  useEffect(() => {
    let live = true
    const check = () =>
      api<NonNullable<typeof bank>>('bank')
        .then((v) => {
          if (live) setBank(v)
        })
        .catch((e) => {
          if (live) setNote(e.message)
        })
    void check()
    const timer = setInterval(check, 5000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [])
  async function run(fn: () => Promise<string>) {
    setBusy(true)
    setNote('')
    try {
      setNote(await fn())
    } catch (e) {
      setNote((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="pagehead">
        <h1>Settings</h1>
      </div>
      <div className="settingsList">
        <section className="panel">
          <h2>AI trainer</h2>
          <small>
            {prefs?.configured && prefs.provider === provider
              ? 'Account connected'
              : 'Optional for offline practice'}
          </small>
          <p>
            Connect an account for scoring and questions about your answers. The
            trainer sends text and timing to the provider. Recordings stay on
            your computer.
          </p>
          <label>
            Provider
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value)
                setModel(e.target.value === prefs?.provider ? prefs.model : '')
                setKey('')
              }}
            >
              <option value="chatgpt">ChatGPT plan</option>
              <option value="openai">OpenAI API key</option>
              <option value="gemini">Gemini API key</option>
            </select>
          </label>
          {provider === 'chatgpt' ? (
            <>
              <p>
                Eligible Plus and Pro accounts can authorize use of their plan.
              </p>
              <button
                className="primary"
                data-oai-siwc-button=""
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const r = await api<{ url: string }>('connect', {})
                    window.location.assign(r.url)
                    return 'Opening sign-in…'
                  })
                }
              >
                Continue with ChatGPT
              </button>
              {prefs?.provider === 'chatgpt' &&
              prefs.configured &&
              prefs.models.length ? (
                <label>
                  Plan model
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  >
                    {prefs.models.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
              ) : null}
            </>
          ) : (
            <>
              <label>
                API key
                <input
                  type="password"
                  autoComplete="off"
                  value={key}
                  placeholder={
                    prefs?.provider === provider && prefs.configured
                      ? 'Saved in Windows credential protection'
                      : 'Enter your key'
                  }
                  onChange={(e) => setKey(e.target.value)}
                />
              </label>
              <label>
                Model ID
                <input
                  value={model}
                  placeholder="Model available to your account"
                  onChange={(e) => setModel(e.target.value)}
                />
              </label>
            </>
          )}
          <div className="row">
            {(provider !== 'chatgpt' ||
              (prefs?.provider === provider && prefs.configured)) && (
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    apply(await api<Prefs>('prefs', { provider, key, model }))
                    setKey('')
                    apply(await api<Prefs>('verify', {}))
                    return 'Connected. A test request completed.'
                  })
                }
              >
                Save and test connection
              </button>
            )}
            {prefs?.configured && prefs.provider === provider && (
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    apply(await api<Prefs>('disconnect', {}))
                    return 'Credentials removed.'
                  })
                }
              >
                Disconnect
              </button>
            )}
          </div>
          {provider === 'chatgpt' &&
            prefs?.provider === provider &&
            prefs.configured && (
              <a
                href="https://chatgpt.com/settings/usage"
                target="_blank"
                rel="noreferrer"
              >
                Manage ChatGPT usage ↗
              </a>
            )}
          {(busy || note) && <p role="status">{busy ? 'Connecting…' : note}</p>}
        </section>
        <section className="panel">
          <h2>Fresh practice material</h2>
          <label className="toggleLabel">
            <input
              type="checkbox"
              checked={bank?.enabled ?? true}
              disabled={!bank || busy}
              onChange={(e) => {
                const enabled = e.target.checked
                void run(async () => {
                  setBank(
                    await api<NonNullable<typeof bank>>('bank', { enabled }),
                  )
                  return enabled
                    ? 'Automatic replenishment on.'
                    : 'Automatic replenishment off.'
                })
              }}
            />{' '}
            Add material automatically
          </label>
          <p>
            The trainer adds checked exercises when unfamiliar material runs
            low. Up to four batches and eight generation/review requests per 24
            hours, using your connected AI account. Pauses during tests.
          </p>
          {bank && (
            <small role="status">
              {bank.state} · {bank.batches}/4 batches · {bank.requests}/8
              requests{bank.pending > 0 && ` · ${bank.pending} queued`}
            </small>
          )}
          {bank?.error && <p>{bank.error}</p>}
        </section>
        <section className="panel">
          <h2>Microphone and sound</h2>
          <p>Test the microphone you’ll use for speaking.</p>
          <button
            disabled={checkingMic}
            onClick={async () => {
              setCheckingMic(true)
              try {
                const stream = await microphone()
                const label = stream.getAudioTracks()[0]?.label
                stopStream(stream)
                setMicNote(
                  label ? 'Microphone ready · ' + label : 'Microphone ready.',
                )
              } catch (e) {
                setMicNote((e as Error).message)
              } finally {
                setCheckingMic(false)
              }
            }}
          >
            Check microphone
          </button>
          {micNote && <p role="status">{micNote}</p>}
          <label>
            Listen to a sample prompt
            <audio
              controls
              preload="none"
              src="/api/voice-preview"
              aria-label="Preview local voices"
            />
          </label>
        </section>
      </div>
    </>
  )
}
