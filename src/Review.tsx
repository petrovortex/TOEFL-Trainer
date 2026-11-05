import { useEffect, useState } from 'react'
import {
  catalog,
  sections,
  units,
  type Attempt,
  type Section,
} from '../core/types.ts'
import { api, date } from './api.ts'
import { practiceReport, type BandRange } from '../core/bands.ts'
function rangeText({ low, high }: BandRange) {
  return low === high ? String(low) : low + '–' + high
}
export function Review({
  a,
  update,
  start,
  startFollow,
}: {
  a: Attempt
  update: (v: Attempt) => void
  start: (task: string, retry?: { id: string; item: string }) => void
  startFollow: (task: string) => void
}) {
  const [section, setSection] = useState<Section | 'All'>('All'),
    [selected, setSelected] = useState(
      () => new URLSearchParams(location.hash.split('?')[1]).get('item') ?? '',
    ),
    [ask, setAsk] = useState(''),
    [busy, setBusy] = useState(false),
    [assessing, setAssessing] = useState(false),
    [assessNote, setAssessNote] = useState(''),
    [mockNote, setMockNote] = useState(''),
    [error, setError] = useState('')
  useEffect(() => {
    setMockNote('')
    if (!a.mockPreparationId || assessing) return
    let open = true
    let timer: ReturnType<typeof setTimeout>
    async function check() {
      try {
        const draft = await api<{
          id?: string
          state: string
          done: number
          total: number
          error?: string
        }>('mock')
        if (!open || draft.id !== a.mockPreparationId) return
        if (draft.state === 'preparing') {
          setMockNote(
            `Preparing fresh material for your next mock · ${draft.done} of ${draft.total} sets ready.`,
          )
          timer = setTimeout(check, 4000)
        } else if (draft.state === 'paused') {
          setMockNote(
            'New mock preparation paused. Your scores are saved. Assess again to resume. ' +
              (draft.error ?? ''),
          )
        } else if (draft.state === 'ready') {
          setMockNote('Fresh material is ready for your next full mock.')
        }
      } catch {
        if (open)
          setMockNote('Reopen these results to check on new mock preparation.')
      }
    }
    void check()
    return () => {
      open = false
      clearTimeout(timer)
    }
  }, [a.mockPreparationId, assessing])
  const items = a.stages
      .filter((s) => section === 'All' || s.section === section)
      .flatMap((s) => s.items),
    item = items.find((q) => q.id === selected) ?? items[0],
    answer = a.answers[item.id] ?? {}
  async function job(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const correct = Object.values(a.answers).filter((v) => v.score === 1).length,
    count = Object.values(a.answers).filter((v) => v.score !== undefined).length
  const pending = a.stages
    .flatMap((s) => s.items)
    .filter((q) => !q.keys && a.answers[q.id]?.score === undefined)
  const { ranges, comparable } = practiceReport(a)
  const shown = sections.filter((s) =>
    a.stages.some((stage) => stage.section === s),
  )
  async function assess() {
    setAssessing(true)
    setAssessNote('')
    try {
      const scored = await api<Attempt>('assess', { id: a.id })
      update(scored)
      const ungraded = scored.stages
        .flatMap((s) => s.items)
        .filter((q) => !q.keys && scored.answers[q.id]?.score === undefined)
      setAssessNote(
        ungraded.length
          ? 'Assessment finished. Some responses have too little evidence for a score.'
          : 'Assessment complete.',
      )
    } catch (error) {
      // Each response is saved separately, even if the provider stops mid-assessment.
      try {
        update(await api<Attempt>('attempt/' + a.id))
      } catch {}
      setAssessNote((error as Error).message)
    } finally {
      setAssessing(false)
    }
  }
  function scoreRow(label: Section | 'Overall') {
    const band = ranges[label]
    return (
      <tr
        key={label}
        className={label === 'Overall' ? 'overallScore' : undefined}
      >
        <th scope="row">{label}</th>
        <td>
          {band ? rangeText(band) : '—'}
          {label === 'Overall' && comparable && <small className="overallLegacy">{rangeText(comparable)}/120</small>}
        </td>
      </tr>
    )
  }
  return (
    <>
      <div className="pagehead">
        <span className="eyebrow">{date(a.started)}</span>
        <h1>{a.mode === 'drill' ? catalog[item.task][1] : a.focus}</h1>
        <p>
          {count
            ? correct + ' fully correct of ' + count + ' scored responses.'
            : 'Your responses are saved.'}
        </p>
      </div>
      <section className="scoreReport" aria-label="Practice results">
        <div className="scoreHeading">
          <div>
            <h2>
              {a.mode === 'drill' ? 'Exercise results' : 'Estimated scores'}
            </h2>
            {pending.length > 0 && <p>{pending.length} awaiting assessment</p>}
          </div>
          <button
            className="primary"
            disabled={assessing || busy}
            onClick={assess}
          >
            {assessing ? 'Assessing…' : 'Assess results'}
          </button>
        </div>
        {a.mode !== 'drill' && (
          <>
            <table className="scoreTable">
              <thead>
                <tr>
                  <th scope="col">Section</th>
                  <th scope="col">Band (1–6)</th>
                </tr>
              </thead>
              <tbody>{shown.map(scoreRow)}</tbody>
              {a.mode === 'full' && <tfoot>{scoreRow('Overall')}</tfoot>}
            </table>
            <details className="scoreHelp">
              <summary>Scoring method</summary>
              <p>
                A section needs at least half its questions answered and a score
                on every item. The overall estimate needs all four sections. A
                dash means there is too little graded evidence.
              </p>
              <p>
                Objective questions earn one point each, and extended responses
                earn up to five. We multiply the fraction earned by five and add one,
                allowing half a band either way for Reading and Listening and
                one band for Writing and Speaking. Full marks across a section
                earn 6.0. Section endpoints are rounded to half bands and limited to 1–6. Each section estimate rounds to the nearest half band. We average the four estimates equally and round to the nearest half band, rounding ties up. We apply the same rounding to the average lower and upper limits.
              </p><p>
                Our section ranges are practice allowances. Their predictive accuracy has not been measured on real exams. ETS calibrates the difficulty of its own test forms.
              </p><p>
                We convert both endpoints of the overall range to the 120-point scale. For bands 2–6 we use values observed on score reports. For 1 and 1.5 we use the rounded midpoint of the ETS comparison range as an approximation.{' '}
                <a href="https://www.toeflresources.com/blog/converting-between-old-1-120-and-new-1-6-toefl-scores/" target="_blank" rel="noreferrer">Observed conversions ↗</a>{' '}
                <a
                  href="https://www.ets.org/toefl/institutions/ibt/score-scale-update.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  ETS score comparison ↗
                </a>
              </p>
            </details>
          </>
        )}
        {(assessing || assessNote) && (
          <p role="status" className="assessmentStatus">
            {assessing
              ? 'Scoring your responses and checking for useful practice…'
              : assessNote}
          </p>
        )}
        {mockNote && (
          <p role="status" className="assessmentStatus">
            {mockNote}
          </p>
        )}
        {a.followUp?.item && a.followUp.task && (
          <button
            className="followLink"
            disabled={assessing || busy}
            onClick={() => startFollow(a.followUp!.task!)}
          >
            Practice recommended exercise →
          </button>
        )}
      </section>
      {a.retryOf && (
        <p>
          <a href={'#attempt/' + a.retryOf.id}>Open the original attempt →</a>
        </p>
      )}
      <div className="columns">
        <section className="panel">
          <div className="row">
            <select
              aria-label="Filter section"
              value={section}
              onChange={(e) => {
                setSection(e.target.value as Section)
                setSelected('')
              }}
            >
              <option>All</option>
              {sections
                .filter((s) => a.stages.some((v) => v.section === s))
                .map((s) => (
                  <option key={s}>{s}</option>
                ))}
            </select>
            <select
              aria-label="Select response"
              value={item.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {items.map((v, i) => (
                <option key={v.id} value={v.id}>
                  {i + 1}. {catalog[v.task][1]}
                </option>
              ))}
            </select>
          </div>
          <span className="eyebrow">
            {catalog[item.task][0]} · {catalog[item.task][1]}
          </span>
          <h2>{item.title}</h2>
          <p>{item.prompt}</p>
          {item.passage && <p className="excerpt">{item.passage}</p>}
          {item.speech && (
            <>
              <small>Original prompt</small>
              <audio
                aria-label="Original prompt"
                controls
                src={'/api/reference?id=' + a.id + '&item=' + item.id}
              />
              <p className="excerpt">{item.speech}</p>
            </>
          )}
          <h3>Your answer</h3>
          {answer.elapsed !== undefined && (
            <small>{Math.round(answer.elapsed)} seconds on this item</small>
          )}
          {answer.clip ? (
            <>
              <audio
                aria-label="Your recording"
                controls
                src={'/clips/' + answer.clip + '.wav'}
              />
              <button
                disabled={busy || assessing}
                onClick={() =>
                  job(async () =>
                    update(
                      await api<Attempt>('transcript', {
                        id: a.id,
                        item: item.id,
                      }),
                    ),
                  )
                }
              >
                Transcribe locally
              </button>
            </>
          ) : (
            <p className="excerpt">
              {answer.text?.replaceAll(' | ', ' ') || 'No answer submitted.'}
            </p>
          )}
          {answer.timing && <small>{answer.timing}</small>}
          {answer.transcript && (
            <p>
              <b>Local transcript</b>
              <br />
              {answer.transcript}
            </p>
          )}
          {item.keys && (
            <p>
              <b>Answer key</b>
              <br />
              {item.keys.join(' · ')}
            </p>
          )}
          <p className="itemScore">
            {answer.score === undefined
              ? 'Score unavailable.'
              : item.keys
                ? 'Item score · ' +
                  Math.round(answer.score * units(item)) +
                  ' / ' +
                  units(item)
                : 'Rubric score · ' + Math.round(answer.score * 5) + ' / 5'}
          </p>
          <div className="row">
            <button
              disabled={busy || assessing}
              onClick={() => start(item.task, { id: a.id, item: item.id })}
            >
              Retry this item
            </button>
            <button
              disabled={busy || assessing}
              onClick={() => start(item.task)}
            >
              Try a fresh exercise →
            </button>
          </div>
        </section>
        <section className="panel coach">
          <h2>Discuss this attempt</h2>
          <p>Ask about the selected answer or your overall scores.</p>
          <div className="chatLog">
            {a.messages.map((m, i) => (
              <div key={i} className={m.role}>
                <small>{m.role === 'user' ? 'YOU' : 'TRAINER'}</small>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              job(async () => {
                update(
                  await api<Attempt>('chat', {
                    id: a.id,
                    item: item.id,
                    message: ask,
                  }),
                )
                setAsk('')
              })
            }}
          >
            <textarea
              aria-label="Question for the trainer"
              placeholder="Ask a question about your results…"
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
            />
            <button
              className="primary"
              disabled={busy || assessing || !ask.trim()}
            >
              Ask trainer →
            </button>
          </form>
        </section>
      </div>
      {(error || busy) && (
        <div className="notice" role="status">
          {busy ? 'Working on this attempt…' : error}
        </div>
      )}
    </>
  )
}
