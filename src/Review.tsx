import { Fragment, useEffect, useRef, useState } from 'react'
import { catalog, sections, type Attempt, type Section } from '../core/types.ts'
import { reportRows, points } from '../core/report.ts'
import { api, date } from './api.ts'
import { practiceReport, type BandRange } from '../core/bands.ts'
import { ScoringMethod } from './ScoringMethod.tsx'
const rangeText = ({ low, high }: BandRange) =>
  low === high ? String(low) : low + '–' + high
const duration = (n?: number) =>
  n === undefined
    ? '—'
    : n < 60
      ? Math.round(n) + 's'
      : Math.floor(n / 60) + 'm ' + Math.round(n % 60) + 's'
export function Review({
  a,
  update,
  start,
  startFollow,
}: {
  a: Attempt
  update: (a: Attempt) => void
  start: (task: string, retry?: { id: string; item: string }) => void
  startFollow: (task: string) => void
}) {
  const initial =
    new URLSearchParams(location.hash.split('?')[1]).get('item') ?? ''
  const [section, setSection] = useState<Section | 'All'>('All'),
    [filter, setFilter] = useState('All'),
    [selected, setSelected] = useState(initial),
    [detailsOpen, showDetails] = useState(!!initial),
    [tab, setTab] = useState('Report'),
    [scope, setScope] = useState<'attempt' | 'item'>('attempt'),
    [chatItem, setChatItem] = useState(''),
    [ask, setAsk] = useState(''),
    [busy, setBusy] = useState(false),
    [assessing, setAssessing] = useState(false),
    [error, setError] = useState(''),
    [note, setNote] = useState('')
  const detailTop = useRef<HTMLHeadingElement>(null)
  const rows = reportRows(a)
  const visible = rows.filter(
    (r) =>
      (section === 'All' || r.section === section) &&
      (filter === 'All' ||
        (filter === 'Awaiting grading'
          ? r.answer.score === undefined && !r.q.keys
          : r.answer.score === undefined || r.answer.score < 1)),
  )
  const selectedRow = visible.find((r) => r.q.id === selected) ?? visible[0]
  const item = selectedRow?.q,
    answer = selectedRow?.answer ?? {}
  const index = visible.findIndex((r) => r.q.id === item?.id)
  const pending = rows.filter((r) => !r.q.keys && r.answer.score === undefined)
  const pendingSections = new Set(pending.map((r) => r.section))
  const gradeLabel =
    pendingSections.size > 1
      ? 'Grade writing & speaking'
      : pendingSections.has('Writing')
        ? 'Grade writing'
        : 'Grade speaking'
  const { ranges, comparable } = practiceReport(a)
  const shown = sections.filter((s) =>
    a.stages.some((stage) => stage.section === s),
  )
  const graded = rows.filter((r) => r.answer.score !== undefined).length
  useEffect(() => {
    if (!assessing) return
    let live = true
    const timer = setInterval(() => {
      void api<Attempt>('attempt/' + a.id)
        .then((v) => {
          if (live) update(v)
        })
        .catch(() => {})
    }, 1000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [assessing, a.id, update])
  useEffect(() => {
    if (!a.followUp?.task || a.followUp.item) return
    let live = true
    const timer = setInterval(() => {
      void api<Attempt>('attempt/' + a.id)
        .then((v) => {
          if (live) update(v)
        })
        .catch(() => {})
    }, 5000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [a.id, a.followUp?.task, a.followUp?.item, update])
  async function job(fn: () => Promise<void>) {
    if (busy) return
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
  function select(id: string, focus = false) {
    setSelected(id)
    showDetails(true)
    history.replaceState(
      null,
      '',
      '#attempt/' + a.id + '?item=' + encodeURIComponent(id),
    )
    if (focus) requestAnimationFrame(() => detailTop.current?.focus())
  }
  function responseLink(id: string) {
    if (!rows.some((r) => r.q.id === id)) return
    setSection('All')
    setFilter('All')
    setTab('Report')
    select(id, true)
  }
  function message(text: string) {
    return text.split(/(\[[^\]]+\]\(response:[^)]+\))/g).map((part, i) => {
      const link = /^\[([^\]]+)\]\(response:([^)]+)\)$/.exec(part)
      return link && rows.some((r) => r.q.id === link[2]) ? (
        <button
          className="textLink"
          key={i}
          onClick={() => responseLink(link[2])}
        >
          {link[1]}
        </button>
      ) : (
        part
      )
    })
  }
  async function assess() {
    setAssessing(true)
    setError('')
    setNote('')
    try {
      const result = await api<Attempt>('assess', { id: a.id })
      update(result)
      const remaining = reportRows(result).filter(
        (r) => !r.q.keys && r.answer.score === undefined,
      ).length
      setNote(
        remaining
          ? `${remaining} responses still need sufficient evidence. Open their details.`
          : 'Grading complete.',
      )
    } catch (e) {
      setError((e as Error).message)
      try {
        update(await api<Attempt>('attempt/' + a.id))
      } catch {}
    } finally {
      setAssessing(false)
    }
  }
  function discuss() {
    setScope('attempt')
    setTab('Trainer')
    void job(async () =>
      update(
        await api<Attempt>('chat', {
          id: a.id,
          scope: 'attempt',
          action: 'analyze',
        }),
      ),
    )
  }
  const messages = a.messages.filter((m) =>
    scope === 'attempt'
      ? !m.scope || m.scope === 'attempt'
      : m.scope === 'item' && m.item === chatItem,
  )
  return (
    <>
      <div className="reviewHeading">
        <div>
          <small>{date(a.started)}</small>
          <h1>
            {a.mode === 'drill'
              ? (catalog[a.focus as keyof typeof catalog]?.[1] ?? a.focus)
              : a.focus}
          </h1>
          <p>
            {rows.length} responses · {graded} graded
          </p>
        </div>
        <div className="reviewActions">
          {pending.length > 0 && (
            <button disabled={busy || assessing} onClick={assess}>
              {assessing
                ? `Grading… ${graded}/${rows.length}`
                : gradeLabel + ` (${pending.length})`}
            </button>
          )}
          <button
            className="primary"
            disabled={busy || assessing}
            onClick={discuss}
          >
            Discuss results
          </button>
        </div>
      </div>
      {a.mode !== 'drill' && (
        <section
          className="scoreReport compactScores"
          aria-label="Practice results"
        >
          <table className="scoreTable">
            <thead>
              <tr>
                <th>Section</th>
                <th>Band (1–6)</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s}>
                  <th scope="row">{s}</th>
                  <td>{ranges[s] ? rangeText(ranges[s]!) : '—'}</td>
                </tr>
              ))}
            </tbody>
            {a.mode === 'full' && (
              <tfoot>
                <tr className="overallScore">
                  <th scope="row">Overall</th>
                  <td>
                    {ranges.Overall ? rangeText(ranges.Overall) : '—'}
                    {comparable && (
                      <small className="overallLegacy">
                        {rangeText(comparable)}/120
                      </small>
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          <ScoringMethod />
        </section>
      )}
      {assessing && (
        <p role="status">
          Grading saved responses · {pending.length} remaining
        </p>
      )}
      {note && <p role="status">{note}</p>}
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {a.retryOf && (
        <p>
          <a href={'#attempt/' + a.retryOf.id}>Open the original attempt →</a>
        </p>
      )}
      <div className="tabs reviewTabs" aria-label="Results view">
        {['Report', 'Trainer'].map((t) => (
          <button
            key={t}
            className={tab === t ? 'on' : ''}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div hidden={tab !== 'Report'}>
        <div className="reviewFilters">
          <div className="tabs" aria-label="Sections">
            {(['All', ...shown] as const).map((s) => (
              <button
                key={s}
                className={section === s ? 'on' : ''}
                aria-pressed={section === s}
                onClick={() => {
                  setSection(s)
                  showDetails(false)
                }}
              >
                {s === 'All' ? 'All sections' : s}
              </button>
            ))}
          </div>
          <div className="filterChips" aria-label="Response status">
            {['All', 'Needs attention', 'Awaiting grading'].map((f) => (
              <button
                key={f}
                className={filter === f ? 'on' : ''}
                aria-pressed={filter === f}
                onClick={() => {
                  setFilter(f)
                  showDetails(false)
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div
          className={'reviewWorkspace' + (detailsOpen ? ' showingDetails' : '')}
        >
          <div className="responseTableWrap">
            <table className="responseTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Exercise</th>
                  <th>Result</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <Fragment key={r.q.id}>
                    {r.q.group &&
                      (i === 0 || visible[i - 1].q.group !== r.q.group) && (
                        <tr className="groupRow">
                          <th colSpan={5}>{r.q.title}</th>
                        </tr>
                      )}
                    <tr
                      className={r.q.id === item?.id ? 'selectedResponse' : ''}
                      onClick={() => select(r.q.id)}
                    >
                      <td>{r.number}</td>
                      <th scope="row">
                        <button
                          aria-current={
                            r.q.id === item?.id ? 'true' : undefined
                          }
                          onClick={() => select(r.q.id, true)}
                        >
                          <b>{catalog[r.q.task][1]}</b>
                          <span>{r.q.title}</span>
                        </button>
                      </th>
                      <td className="responsePoints">
                        {points(r.q, r.answer)}
                      </td>
                      <td>
                        <span
                          className={
                            'responseStatus ' +
                            (r.status === 'Correct' ? 'correct' : '')
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td>{duration(r.answer.elapsed)}</td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <p className="empty">No responses match this filter.</p>
            )}
          </div>
          {item && (
            <aside className="responseDetail" aria-label="Response details">
              <button
                className="backToReport"
                onClick={() => showDetails(false)}
              >
                ← Back to report
              </button>
              <div className="detailNav">
                <button
                  disabled={index <= 0}
                  onClick={() => select(visible[index - 1].q.id, true)}
                >
                  Previous
                </button>
                <small>
                  {index + 1} of {visible.length}
                </small>
                <button
                  disabled={index >= visible.length - 1}
                  onClick={() => select(visible[index + 1].q.id, true)}
                >
                  Next
                </button>
              </div>
              <div className="detailBody" key={item.id}>
                <small>
                  Q{selectedRow.number} · {catalog[item.task][1]} ·{' '}
                  {points(item, answer)}
                </small>
                <h2 ref={detailTop} tabIndex={-1}>
                  {item.title}
                </h2>
                <p>{item.prompt}</p>
                {item.passage && (
                  <p className="excerpt">
                    {item.task === 'words'
                      ? item.passage.split(/(\{\d+\})/g).map((part, i) => {
                          const match = /^\{(\d+)\}$/.exec(part)
                          if (!match) return part
                          const n = Number(match[1]),
                            value = answer.text?.split('|')[n] ?? ''
                          return (
                            <mark
                              key={i}
                              className={
                                value.trim().toLowerCase() ===
                                item.keys?.[n].toLowerCase()
                                  ? 'gapCorrect'
                                  : 'gapMissed'
                              }
                            >
                              {value || '____'}
                              <sup>{n + 1}</sup>
                            </mark>
                          )
                        })
                      : item.passage}
                  </p>
                )}
                {item.options && (
                  <ol className="savedOptions" type="A">
                    {item.options.map((option) => (
                      <li key={option}>{option}</li>
                    ))}
                  </ol>
                )}
                {item.speech && (
                  <>
                    <label>
                      Original prompt
                      <audio
                        controls
                        preload="none"
                        aria-label="Original prompt"
                        src={'/api/reference?id=' + a.id + '&item=' + item.id}
                      />
                    </label>
                    <details>
                      <summary>Audio script</summary>
                      <p className="excerpt">{item.speech}</p>
                    </details>
                  </>
                )}
                <h3>Your answer</h3>
                {answer.clip ? (
                  <>
                    <audio
                      controls
                      preload="none"
                      aria-label="Your recording"
                      src={'/clips/' + answer.clip + '.wav'}
                    />
                    {!answer.transcript && (
                      <button
                        disabled={busy || assessing}
                        onClick={() =>
                          void job(async () =>
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
                    )}
                  </>
                ) : item.task === 'words' ? (
                  <table className="gapAnswers">
                    <thead>
                      <tr>
                        <th>Gap</th>
                        <th>Your answer</th>
                        <th>Key</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(item.keys ?? []).map((key, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{answer.text?.split('|')[i] || '—'}</td>
                          <td>{key}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="excerpt">
                    {answer.text?.replaceAll(' | ', ' ') ||
                      'No answer submitted.'}
                  </p>
                )}
                {answer.transcript && (
                  <>
                    <h3>Local transcript</h3>
                    <p className="excerpt">{answer.transcript}</p>
                  </>
                )}
                <small>
                  {duration(answer.elapsed)} on this response
                  {answer.timing && ' · ' + answer.timing}
                </small>
                {item.keys && item.task !== 'words' && (
                  <details open>
                    <summary>Answer key</summary>
                    <p>{item.keys.join(' · ')}</p>
                  </details>
                )}
                {answer.note && (
                  <details>
                    <summary>Scoring evidence</summary>
                    <p>{answer.note}</p>
                  </details>
                )}
                <p>{selectedRow.status}</p>
                <button
                  className="primary"
                  onClick={() => {
                    setScope('item')
                    setChatItem(item.id)
                    setTab('Trainer')
                  }}
                >
                  Ask about this response
                </button>
                <div className="row">
                  <button
                    disabled={busy || assessing}
                    onClick={() =>
                      start(item.task, { id: a.id, item: item.id })
                    }
                  >
                    Retry this item
                  </button>
                  <button
                    disabled={busy || assessing}
                    onClick={() => start(item.task)}
                  >
                    Fresh practice →
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
      <section hidden={tab !== 'Trainer'} className="trainerWorkspace">
        <div className="trainerContext">
          <h2>Trainer</h2>
          <span>
            {scope === 'attempt'
              ? 'Entire attempt'
              : 'Response Q' + rows.find((r) => r.q.id === chatItem)?.number}
          </span>
          {scope === 'item' && (
            <button onClick={() => setScope('attempt')}>
              Discuss entire attempt
            </button>
          )}
        </div>
        {!messages.length && (
          <p>Ask about your results, or use Discuss results for an overview.</p>
        )}
        <div className="chatLog">
          {messages.map((m, i) => (
            <div key={i} className={m.role}>
              <small>{m.role === 'user' ? 'YOU' : 'TRAINER'}</small>
              <p>{message(m.text)}</p>
            </div>
          ))}
        </div>
        {busy && <p role="status">Reviewing your saved evidence…</p>}
        {a.followUp?.item && a.followUp.task && (
          <button
            disabled={busy || assessing}
            onClick={() => startFollow(a.followUp!.task!)}
          >
            Practice recommended exercise →
          </button>
        )}
        {a.followUp?.task && !a.followUp.item && <p>{a.followUp.reason}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void job(async () => {
              update(
                await api<Attempt>('chat', {
                  id: a.id,
                  scope,
                  item: scope === 'item' ? chatItem : undefined,
                  message: ask,
                }),
              )
              setAsk('')
            })
          }}
        >
          <textarea
            aria-label="Question for the trainer"
            placeholder={
              scope === 'attempt'
                ? 'Ask about this attempt…'
                : 'Ask about this response…'
            }
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
    </>
  )
}
