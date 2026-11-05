import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  existsSync,
  realpathSync,
  rmSync,
} from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { chromium } from 'playwright-core'
import { setTimeout as delay } from 'node:timers/promises'
const origin = 'http://127.0.0.1:43283'
const state =
  process.env.FIELDWORK_CHROME ??
  'C:/Program Files/Google/Chrome/Application/chrome.exe'
assert.ok(
  existsSync(state),
  'Set FIELDWORK_CHROME to an installed Chromium browser.',
)
const qa = resolve('.work/qa')
mkdirSync(qa, { recursive: true })
assert.equal(realpathSync(qa), join(realpathSync('.'), '.work', 'qa'))
const data = mkdtempSync(join(qa, 'run-'))
let server, browser
async function launch() {
  server = spawn(process.execPath, ['server/main.ts'], {
    cwd: resolve('.'),
    env: {
      ...process.env,
      PATH: process.env.SystemRoot + '/System32',
      FIELDWORK_PORT: '43283',
      FIELDWORK_DATA: data,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  server.stderr.on('data', (b) => process.stderr.write(b))
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(origin + '/api/status')
      if (r.ok) return
    } catch {}
    await delay(100)
  }
  throw Error('Local server did not start.')
}
async function shutdown() {
  if (!server || server.exitCode !== null) return
  const s = server
  await new Promise((r) => {
    s.once('exit', r)
    s.kill()
  })
}
async function post(path, b) {
  const r = await fetch(origin + '/api/' + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-fieldwork': 'local' },
    body: JSON.stringify(b),
  })
  const v = await r.json()
  assert.ok(r.ok, JSON.stringify(v))
  return v
}
try {
  await launch()
  browser = await chromium.launch({
    executablePath: state,
    headless: true,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  })
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 850 },
    permissions: ['microphone'],
  })
  const outbound = [],
    errors = []
  await ctx.route(/.*/, (r) => {
    if (r.request().url().startsWith(origin)) return r.continue()
    outbound.push(r.request().url())
    return r.abort()
  })
  const page = await ctx.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', (e) => errors.push(e.message))
  const start = performance.now()
  await page.goto(origin)
  await page.getByRole('heading', { name: 'Practice desk' }).waitFor()
  console.log(
    'Local home ready in',
    Math.round(performance.now() - start),
    'ms',
  )
  await page.screenshot({ path: join(data, 'home.png') })
  await page.getByRole('button', { name: 'Try Listen and Repeat' }).click()
  await page.getByRole('button', { name: 'Begin exercise' }).click()
  const speakingId = page.url().split('/').pop()
  await page.getByRole('button', { name: 'Play prompt' }).click()
  await page
    .getByRole('button', { name: 'Finish recording' })
    .waitFor({ timeout: 20000 })
  await delay(1300)
  await page.getByRole('button', { name: 'Finish recording' }).click()
  await page.getByText('Recording saved', { exact: true }).waitFor()
  await page.reload()
  await page.getByText('Recording saved', { exact: true }).waitFor()
  await page.locator('audio[controls]').evaluate(async (a) => {
    await a.play()
    a.pause()
  })
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Next →' }).click()
    if (i < 2) await page.getByText('Question ' + (i + 2) + ' of 3').waitFor()
  }
  await page.getByRole('heading', { name: 'Discuss this attempt' }).waitFor()
  await shutdown()
  await launch()
  await page.reload()
  await page.getByLabel('Your recording').waitFor()
  const saved = await (
    await fetch(origin + '/api/attempt/' + speakingId)
  ).json()
  const answer = Object.values(saved.answers).find((v) => v.clip)
  assert.ok(answer.clip)
  assert.ok((await fetch(origin + '/clips/' + answer.clip + '.wav')).ok)
  console.log(
    'Speaking: played prompt, recorded microphone fixture, replayed and recovered recording after browser and server restart.',
  )
  await page.goto(origin + '/#practice')
  await page.getByRole('button', { name: 'Writing', exact: true }).click()
  await page.getByRole('button', { name: /Write an Email/ }).click()
  await page.getByRole('button', { name: 'Begin exercise' }).click()
  await page
    .getByRole('textbox', { name: 'Your response' })
    .fill('Dear coordinator, I am writing to request an appointment.')
  await delay(350)
  await page.reload()
  assert.match(
    await page.getByRole('textbox', { name: 'Your response' }).inputValue(),
    /appointment/,
  )
  await page.getByRole('button', { name: 'Next →' }).click()
  await page.getByRole('heading', { name: 'Discuss this attempt' }).waitFor()
  await page.getByRole('button', { name: 'Assess results' }).click()
  await page
    .getByRole('status')
    .filter({ hasText: /connect|model/i })
    .waitFor()
  console.log(
    'Writing: draft survived refresh; unavailable AI left completed work intact.',
  )
  await page.goto(origin)
  await page.getByRole('button', { name: 'Start a full mock' }).click()
  await page.getByRole('button', { name: 'Begin module' }).click()
  const fullId = page.url().split('/').pop(),
    first = await (await fetch(origin + '/api/attempt/' + fullId)).json()
  await page.reload()
  await page.getByText('Question 1 of 12').waitFor()
  const after = await (await fetch(origin + '/api/attempt/' + fullId)).json()
  assert.equal(first.deadline, after.deadline)
  const step = () =>
    page.evaluate(async () => {
      const start = performance.now()
      const text = document.querySelector('.examTools>span').textContent
      const changed = new Promise((resolve) => {
        const obs = new MutationObserver(() => {
          if (document.querySelector('.examTools>span')?.textContent !== text) {
            obs.disconnect()
            resolve(performance.now() - start)
          }
        })
        obs.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        })
      })
      ;[...document.querySelectorAll('button')]
        .find((b) => b.textContent === 'Next →')
        .click()
      return changed
    })
  const timings = []
  for (let i = 0; i < 8; i++) timings.push(await step())
  timings.sort((a, b) => a - b)
  console.log('Cached question transition median', Math.round(timings[4]), 'ms')
  await page.getByRole('button', { name: '← Back' }).click()
  await page.getByText('Question 8 of 12').waitFor()
  let v = await (await fetch(origin + '/api/attempt/' + fullId)).json()
  let stages = 0
  while (!v.ended) {
    if (!v.itemStarted) {
      v = await post('begin', { id: fullId, item: v.item.id })
      stages++
    }
    v = await post('next', { id: fullId, item: v.item.id })
  }
  assert.equal(v.stages.length, 8)
  assert.equal(v.stage, 7)
  assert.equal(v.mode, 'full')
  assert.equal(stages, 7)
  await page.reload()
  await page.getByRole('heading', { name: 'Discuss this attempt' }).waitFor()
  await page.getByRole('columnheader', { name: 'Band (1–6)' }).waitFor()
  assert.equal(await page.getByRole('columnheader', { name: 'Previous scale' }).count(), 0)
  await page.getByRole('rowheader', { name: 'Overall' }).waitFor()
  assert.equal(await page.locator('.chatLog > div').count(), 0)
  for (const width of [390, 1366]) {
    await page.setViewportSize({ width, height: 850 })
    const report = await page.locator('.scoreReport').boundingBox()
    const responses = await page.locator('.columns').boundingBox()
    assert.ok(responses.y - (report.y + report.height) >= 20)
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
  }
  await page.goto(origin + '/#history')
  await page.getByText('Browse individual responses').click()
  await page.locator('.responseList a').first().click()
  await page.getByRole('heading', { name: 'Discuss this attempt' }).waitFor()
  await page.getByRole('button', { name: 'Retry this item' }).click()
  await page.getByRole('button', { name: 'Begin exercise' }).click()
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Permission denied', 'NotAllowedError')
    }
  })
  await page.getByRole('button', { name: 'Play prompt' }).click()
  await page
    .getByRole('alert')
    .filter({ hasText: 'Microphone unavailable' })
    .waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: 'Next →' }).click()
  await page.getByRole('link', { name: 'Open the original attempt' }).waitFor()
  console.log(
    'History drill-down, linked retry and microphone-denial recovery passed.',
  )
  await page.goto(origin + '/#settings')
  await page.getByRole('heading', { name: 'Microphone and sound' }).waitFor()
  await page.getByRole('heading', { name: 'AI trainer', exact: true }).waitFor()
  const voice = page.getByLabel('Preview local voices')
  await voice.evaluate(async (el) => {
    await el.play()
    el.pause()
  })
  assert.equal(await page.getByRole('button', { name: /generate/i }).count(), 0)
  console.log('Local voice preview and Settings passed.')
  assert.equal(outbound.length, 0, outbound.join(', '))
  assert.equal(errors.length, 0, errors.join(', '))
  console.log(
    'Finished offline four-section mock. No external browser requests. No page errors.',
  )
} finally {
  try {
    await browser?.close()
  } finally {
    try {
      await shutdown()
    } finally {
      assert.equal(dirname(realpathSync(data)), realpathSync(qa))
      rmSync(data, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      })
    }
  }
}
