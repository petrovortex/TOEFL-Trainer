import { useEffect, useState } from 'react'
import { catalog, sections, type Section, type Task } from '../core/types.ts'
import { api, date } from './api.ts'
type Entry = {
  id: string
  item: string
  title: string
  task: Task
  started: number
}
export function Notebook() {
  const [section, setSection] = useState<Section>('Speaking'),
    [task, setTask] = useState(''),
    [rows, setRows] = useState<Entry[]>([]),
    [error, setError] = useState(''),
    [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    let active = true
    setError('')
    api<Entry[]>('responses?' + new URLSearchParams({ section, task }))
      .then((v) => {
        if (active) setRows(v)
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
    }
  }, [open, section, task])
  return (
    <details
      className="notebook"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>Browse individual responses</summary>
      <div className="row">
        <select
          aria-label="History section"
          value={section}
          onChange={(e) => {
            setSection(e.target.value as Section)
            setTask('')
          }}
        >
          {sections.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="History exercise"
          value={task}
          onChange={(e) => setTask(e.target.value)}
        >
          <option value="">All exercise types</option>
          {Object.entries(catalog)
            .filter(([, v]) => v[0] === section)
            .map(([t, [, name]]) => (
              <option value={t} key={t}>
                {name}
              </option>
            ))}
        </select>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="responseList">
        {rows.map((r) => (
          <a href={'#attempt/' + r.id + '?item=' + r.item} key={r.id + r.item}>
            <b>{r.title}</b>
            <small>
              {catalog[r.task][1]} · {date(r.started)}
            </small>
          </a>
        ))}
        {!rows.length && <p>No completed responses for this selection.</p>}
      </div>
    </details>
  )
}
