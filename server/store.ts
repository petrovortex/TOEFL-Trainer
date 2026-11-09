import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { homedir } from 'node:os'
import type { Attempt, HistoryRow, Item } from '../core/types.ts'
import { reconcileWriting } from '../core/exam.ts'
import { materialKeys } from '../core/material.ts'
const localAppData = process.env.LOCALAPPDATA ?? homedir()
const oldHome = join(localAppData, 'Fieldwork Trainer')
const newHome = join(localAppData, 'TOEFL Trainer')
// Continue using an existing learner database and its sibling recordings after the rename.
export const home = resolve(
  process.env.FIELDWORK_DATA ??
    (existsSync(join(oldHome, 'practice.sqlite')) &&
    !existsSync(join(newHome, 'practice.sqlite'))
      ? oldHome
      : newHome),
)
export const clips = join(home, 'recordings'),
  cache = join(home, 'prompts')
for (const dir of [home, clips, cache]) mkdirSync(dir, { recursive: true })
const db = new DatabaseSync(join(home, 'practice.sqlite'))
export function transaction(action: () => void) {
  db.exec('BEGIN IMMEDIATE')
  try {
    action()
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000')
const version = Number(db.prepare('PRAGMA user_version').get()?.user_version)
if (version > 2)
  throw Error('This database needs a newer version of TOEFL Trainer.')
if (!version)
  db.exec(`BEGIN;
 CREATE TABLE attempts(id TEXT PRIMARY KEY, started INTEGER NOT NULL, ended INTEGER, focus TEXT, mode TEXT, bands TEXT, snapshot TEXT NOT NULL);
 CREATE INDEX chronological ON attempts(started DESC);
 CREATE TABLE generated(id TEXT PRIMARY KEY, fingerprint TEXT UNIQUE, item TEXT NOT NULL);
 CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 PRAGMA user_version=1; COMMIT;`)
if (version < 2)
  transaction(() => {
    db.exec(`CREATE TABLE exposure(key TEXT PRIMARY KEY, task TEXT NOT NULL, used INTEGER NOT NULL);
    CREATE TABLE bank_jobs(id TEXT PRIMARY KEY, state TEXT NOT NULL, snapshot TEXT NOT NULL);
    CREATE TABLE bank_usage(time INTEGER NOT NULL, kind TEXT NOT NULL);
    CREATE INDEX bank_usage_time ON bank_usage(time);`)
    for (const row of db.prepare('SELECT snapshot FROM attempts').all())
      recordExposure(JSON.parse(String(row.snapshot)))
    db.exec('PRAGMA user_version=2')
  })
function recordExposure(a: Attempt) {
  const insert = db.prepare(
    'INSERT INTO exposure VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET used=MAX(used,excluded.used)',
  )
  for (const [s, stage] of a.stages.entries())
    for (const [i, q] of stage.items.entries()) {
      if (
        !a.ended &&
        !a.answers[q.id] &&
        !(a.itemStarted && s === a.stage && i <= a.index)
      )
        continue
      for (const key of materialKeys(q))
        insert.run(key, q.task, a.ended ?? a.started)
    }
}
export function exposures() {
  return Object.fromEntries(
    db
      .prepare('SELECT key,used FROM exposure')
      .all()
      .map((r) => [String(r.key), Number(r.used)]),
  )
}
export function practicedTasks(since: number) {
  return db
    .prepare(
      'SELECT task,MAX(used) AS used FROM exposure WHERE used>=? GROUP BY task ORDER BY used DESC',
    )
    .all(since)
    .map((r) => String(r.task))
}
export function jobs<T>(): T[] {
  return db
    .prepare('SELECT snapshot FROM bank_jobs ORDER BY rowid')
    .all()
    .map((r) => JSON.parse(String(r.snapshot)))
}
export function saveJob(job: { id: string; state: string }) {
  db.prepare('INSERT OR REPLACE INTO bank_jobs VALUES(?,?,?)').run(
    job.id,
    job.state,
    JSON.stringify(job),
  )
}
export function bankUsage(now = Date.now()) {
  const rows = db
    .prepare(
      'SELECT kind,COUNT(*) AS count FROM bank_usage WHERE time>? GROUP BY kind',
    )
    .all(now - 86400000)
  return {
    batches: Number(rows.find((r) => r.kind === 'batch')?.count ?? 0),
    requests: Number(rows.find((r) => r.kind === 'request')?.count ?? 0),
  }
}
export function spendBank(kind: 'batch' | 'request', now = Date.now()) {
  db.prepare('INSERT INTO bank_usage VALUES(?,?)').run(now, kind)
  db.prepare('DELETE FROM bank_usage WHERE time<=?').run(now - 86400000)
}
export function save(a: Attempt) {
  db.prepare(
    'INSERT INTO attempts VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET ended=excluded.ended,bands=excluded.bands,snapshot=excluded.snapshot',
  ).run(
    a.id,
    a.started,
    a.ended ?? null,
    a.focus,
    a.mode,
    JSON.stringify(a.bands),
    JSON.stringify(a),
  )
  recordExposure(a)
}
export function load(id: string): Attempt {
  const row = db.prepare('SELECT snapshot FROM attempts WHERE id=?').get(id)
  if (!row) throw Error('Attempt not found.')
  const a: Attempt = JSON.parse(String(row.snapshot))
  if (reconcileWriting(a)) save(a)
  return a
}
export function history(): HistoryRow[] {
  return db
    .prepare(
      'SELECT id,mode,focus,started,ended,bands FROM attempts ORDER BY started DESC',
    )
    .all()
    .map((r) => ({ ...r, bands: JSON.parse(String(r.bands)) }) as HistoryRow)
}
export function responseHistory(section: string, task: string) {
  return db
    .prepare(
      `SELECT a.id,a.started,a.mode, json_extract(item.value,'$.id') AS item,
   json_extract(item.value,'$.title') AS title, json_extract(item.value,'$.task') AS task
   FROM attempts a, json_each(a.snapshot,'$.stages') stage, json_each(stage.value,'$.items') item
   WHERE a.ended IS NOT NULL AND json_extract(stage.value,'$.section')=?
   AND (?='' OR json_extract(item.value,'$.task')=?)
   ORDER BY a.started DESC, stage.key, item.key LIMIT 200`,
    )
    .all(section, task, task)
}
export function recent(): Attempt[] {
  return db
    .prepare(
      'SELECT snapshot FROM attempts WHERE ended IS NOT NULL ORDER BY started DESC LIMIT 30',
    )
    .all()
    .map((r) => JSON.parse(String(r.snapshot)))
}
export function previousFullMocks(started: number): Attempt[] {
  return db
    .prepare(
      "SELECT snapshot FROM attempts WHERE mode='full' AND ended IS NOT NULL AND started < ? ORDER BY started DESC LIMIT 3",
    )
    .all(started)
    .map((row) => JSON.parse(String(row.snapshot)))
}
export function setting(k: string) {
  return String(
    db.prepare('SELECT value FROM settings WHERE key=?').get(k)?.value ?? '',
  )
}
export function configure(k: string, v: string) {
  db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(k, v)
}
export function extras(): Item[] {
  return db
    .prepare('SELECT item FROM generated')
    .all()
    .map((r) => JSON.parse(String(r.item)))
}
export function archivedGeneratedMaterial(): Item[] {
  return db
    .prepare("SELECT snapshot FROM attempts WHERE mode='full'")
    .all()
    .flatMap((row) => {
      const a: Attempt = JSON.parse(String(row.snapshot))
      return a.stages
        .flatMap((s) => [...s.items, ...(s.upper ?? [])])
        .filter((q) => q.id.startsWith('gen-') && !q.personal)
    })
}
export function addItem(q: Item, hash: string) {
  db.prepare('INSERT INTO generated VALUES(?,?,?)').run(
    q.id,
    hash,
    JSON.stringify(q),
  )
}
