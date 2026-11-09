import { useEffect, useRef, useState } from 'react'
import {
  catalog,
  type PracticeLength as Length,
  type Task,
} from '../core/types.ts'
import { api } from './api.ts'
interface Preview {
  planId: string
  questions: number
  responses: number
  sets: number
}
export function PracticeLength({
  task,
  close,
  start,
}: {
  task: Task
  close: () => void
  start: (id: string) => void
}) {
  const [length, setLength] = useState<Length>('standard'),
    [plan, setPlan] = useState<Preview>(),
    [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  useEffect(() => {
    let live = true
    setPlan(undefined)
    setError('')
    api<Preview>('practice-plan', { task, length })
      .then((p) => {
        if (live) setPlan(p)
      })
      .catch((e) => {
        if (live) setError(e.message)
      })
    return () => {
      live = false
    }
  }, [task, length])
  return (
    <dialog
      ref={dialog}
      className="practiceDialog"
      onCancel={close}
      aria-labelledby="practiceTitle"
    >
      <h2 id="practiceTitle">{catalog[task][1]}</h2>
      <p>Choose your practice length.</p>
      <div className="filterChips">
        {(['short', 'standard', 'long'] as const).map((l) => (
          <button
            key={l}
            className={l === length ? 'on' : ''}
            aria-pressed={l === length}
            onClick={() => setLength(l)}
          >
            {l[0].toUpperCase() + l.slice(1)}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <p role="status">
          {plan
            ? task === 'words'
              ? `${plan.sets} texts · ${plan.questions} gaps`
              : plan.sets < plan.responses
                ? `${plan.sets} sets · ${plan.responses} questions`
                : `${plan.responses} ${['email', 'discussion'].includes(task) ? 'written responses' : 'questions'}`
            : 'Selecting your questions…'}
        </p>
      )}
      <div className="row">
        <button onClick={close}>Cancel</button>
        <button
          className="primary"
          disabled={!plan}
          onClick={() => plan && start(plan.planId)}
        >
          Start practice
        </button>
      </div>
    </dialog>
  )
}
