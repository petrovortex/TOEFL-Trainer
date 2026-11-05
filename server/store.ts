import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { homedir } from 'node:os'
import type { Attempt, HistoryRow, Item } from '../core/types.ts'
import { reconcileWriting } from '../core/exam.ts'
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
if (version > 1)
  throw Error('This database needs a newer version of TOEFL Trainer.')
if (!version)
  db.exec(`BEGIN;
 CREATE TABLE attempts(id TEXT PRIMARY KEY, started INTEGER NOT NULL, ended INTEGER, focus TEXT, mode TEXT, bands TEXT, snapshot TEXT NOT NULL);
 CREATE INDEX chronological ON attempts(started DESC);
 CREATE TABLE generated(id TEXT PRIMARY KEY, fingerprint TEXT UNIQUE, item TEXT NOT NULL);
 CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 PRAGMA user_version=1; COMMIT;`)
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
  return db.prepare(
    "SELECT snapshot FROM attempts WHERE mode='full' AND ended IS NOT NULL AND started < ? ORDER BY started DESC LIMIT 3"
  ).all(started).map((row) => JSON.parse(String(row.snapshot)))
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
export function addItem(q: Item, hash: string) {
  db.prepare('INSERT INTO generated VALUES(?,?,?)').run(
    q.id,
    hash,
    JSON.stringify(q),
  )
}
