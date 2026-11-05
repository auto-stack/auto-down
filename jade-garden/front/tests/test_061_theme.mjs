// test_061_theme.mjs — PLAN-061 targeted theme-adoption probe for
// jade-garden (auto-down/jade-garden front facade).
//
// Consumption form (PLAN-061 T-03): the official Auto family reaches the
// deployed app as a BUILD-CHAIN PROJECTION — front/auto (dep themes + use
// themes.themes: Auto) -> generated index.css four blocks (light/dark
// core+sidebar, receipt .theme-inputs.json digest 9fa07742..bef838e) ->
// front/src/assets/index.css var values. The app's OWN theme business
// (.dark class + .theme-<accent> brand overlay + ThemePopover +
// localStorage) drives mode/accent on top, unchanged.
//
// Legs:
//   A (dark boot, real init path): localStorage mode=dark -> html.dark +
//      --background == '240 10% 4%' (official Auto/dark projection)
//   B (light via REAL popover click + brand overlay): toggle [title=Theme]
//      -> sun button -> --background == '0 0% 100%' AND --primary ==
//      '238 55% 58%' (theme-indigo brand overlay preserved on top of the
//      official family); localStorage persisted
//   C (family-channel boundary, negative control): no theme-family-* class;
//      active background is the Auto value, NOT Solarized (#fdf6e3 family
//      value absent) — the static projection is single-family; a second
//      family needs the runtime switcher channel (named boundary, receipt)
//   D (V-02 business during mode flip): open a note via the real tree,
//      type into the block editor, flip mode via the popover -> typed text
//      survives in the DOM; pixel record via screenshot
//   E (reload persistence): reload -> mode persisted (real store boot) +
//      official values still active
//
// Isolation: fixture workspace + evidence under
// D:/autostack/plan-artifacts/plan-061/auto-os/jade-garden (never inside a
// repo). Original gate: pnpm test:e2e (24 specs) — runs separately.

import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(frontDir, '..', '..')
const EVIDENCE = String.raw`D:\autostack\plan-artifacts\plan-061\auto-os\jade-garden`
const WORKSPACE = path.join(EVIDENCE, 'workspace')
const FIXTURE_SOURCE = path.join(repoRoot, 'tmp', 'wiki-demo')
const BACK_EXE = path.join(repoRoot, 'jade-garden', 'back', 'server', 'target', 'debug', 'jade-garden-back.exe')
const BACK_PORT = 18191
const FRONT_PORT = 13101
const FRONT_URL = `http://localhost:${FRONT_PORT}`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitPort(port, label, ms) {
  const deadline = Date.now() + ms
  for (;;) {
    try {
      const res = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(1500) })
      if (res.status < 600) return
    } catch {}
    if (Date.now() > deadline) throw new Error(`${label} not ready on :${port} within ${ms}ms`)
    await sleep(800)
  }
}

const cssVar = async (page, name) =>
  (await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name))

const failures = []
const check = (ok, what) => {
  console.log(`  ${ok ? '[+]' : '[-]'} ${what}`)
  if (!ok) failures.push(what)
}

async function main() {
  fs.mkdirSync(EVIDENCE, { recursive: true })
  // fixture pour (fresh)
  fs.rmSync(WORKSPACE, { recursive: true, force: true })
  fs.cpSync(FIXTURE_SOURCE, WORKSPACE, { recursive: true })

  // back: remove stale config next to exe (e2e-prepare discipline), spawn
  const cfgNextToExe = path.join(path.dirname(BACK_EXE), 'jade-garden-config.json')
  fs.rmSync(cfgNextToExe, { force: true })
  const back = spawn(BACK_EXE, [], {
    env: { ...process.env, JADE_GARDEN_PORT: String(BACK_PORT), JADE_GARDEN_DEFAULT_WORKSPACE: WORKSPACE.replace(/\\/g, '/') },
    stdio: 'ignore',
  })
  let vite = null
  try {
    await waitPort(BACK_PORT, 'back', 60000)
    console.log('[*] back ready')
    const viteLog = fs.openSync(path.join(EVIDENCE, 'vite-dev.log'), 'a')
    vite = spawn('pnpm', ['exec', 'vite', '--port', String(FRONT_PORT), '--strictPort'], {
      cwd: frontDir,
      env: { ...process.env, JADE_GARDEN_PORT: String(BACK_PORT), AUTO_HTTP_PROXY: `http://127.0.0.1:${BACK_PORT}` },
      stdio: ['ignore', viteLog, viteLog], shell: true,
    })
    await waitPort(FRONT_PORT, 'vite', 90000)
    console.log('[*] vite ready')

    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

    // leg A: dark via the real boot init path (localStorage seed)
    console.log('[*] leg A: dark boot (localStorage seed -> real init)')
    await page.goto(FRONT_URL)
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('jade-garden-theme-mode', 'dark')
    })
    await page.reload()
    await page.waitForSelector('.dark', { timeout: 20000 })
    await sleep(800)
    const bgA = await cssVar(page, '--background')
    const darkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    console.log(`  [*] --background = "${bgA}"; html.dark = ${darkClass}`)
    check(bgA === '240 10% 4%' && darkClass, 'leg A: official Auto/dark projection applied (--background 240 10% 4%)')
    await page.screenshot({ path: path.join(EVIDENCE, '061_jg_A_dark.png') })

    // leg B: light via the REAL popover (brand overlay preserved)
    console.log('[*] leg B: real popover flip to light + brand overlay')
    await page.click('button[title="Theme"]')
    await page.waitForSelector('.theme-popover', { timeout: 10000 })
    await page.click('.theme-popover button:has-text("Light")')
    await sleep(800)
    const bgB = await cssVar(page, '--background')
    const primB = await cssVar(page, '--primary')
    const stored = await page.evaluate(() => localStorage.getItem('jade-garden-theme-mode'))
    console.log(`  [*] --background = "${bgB}"; --primary = "${primB}"; stored mode = ${stored}`)
    check(bgB === '0 0% 100%', 'leg B: official Auto/light projection applied')
    check(primB === '238 55% 58%', 'leg B: theme-indigo brand overlay preserved (primary 238 55% 58%)')
    check(stored === 'light', 'leg B: mode persisted to localStorage (real store watch)')
    await page.screenshot({ path: path.join(EVIDENCE, '061_jg_B_light.png') })
    // close the popover (click its own overlay) so later legs can interact
    await page.mouse.click(720, 200)
    await sleep(500)

    // leg C: family-channel boundary (negative control, named gap)
    const famClass = await page.evaluate(() =>
      [...document.documentElement.classList].filter((c) => c.startsWith('theme-family-')))
    check(famClass.length === 0, 'leg C: no family class active (single-family static channel)')
    check(bgB !== '47 47% 94%', 'leg C: Solarized family not active (boundary named, not faked)')

    // leg D: business during mode flip (open note, type, flip, survive)
    console.log('[*] leg D: open note + type + flip mode + survival')
    // e2e-helper semantics: tree rows are exact-text nodes; index.ad sits at
    // the fixture root (visible without expansion); editor=.autodown-editor
    await page.getByText('index.ad', { exact: true }).first().click()
    await page.waitForSelector('.autodown-editor:visible', { timeout: 20000 })
    const editor = page.locator('.autodown-editor:visible').first()
    await editor.click()
    await page.keyboard.press('Control+End')
    await page.keyboard.type('\nPLAN-061 主题腿标记：换肤期间内容守恒。')
    await sleep(600)
    const typedBefore = await page.evaluate(() => document.body.innerText.includes('PLAN-061 主题腿标记'))
    check(typedBefore, 'leg D: marker typed into the editor')
    await page.click('button[title="Theme"]')
    await page.waitForSelector('.theme-popover', { timeout: 10000 })
    await page.click('.theme-popover button:has-text("Dark")')
    await sleep(1000)
    const typedAfter = await page.evaluate(() => document.body.innerText.includes('PLAN-061 主题腿标记'))
    const bgD = await cssVar(page, '--background')
    check(typedAfter, 'leg D: typed content survived the mode flip (V-02)')
    check(bgD === '240 10% 4%', 'leg D: flip back to dark applied')
    await page.screenshot({ path: path.join(EVIDENCE, '061_jg_D_after_flip.png') })

    // leg E: reload persistence (real store boot) + content saved via app
    console.log('[*] leg E: reload persistence')
    await page.reload()
    await sleep(1500)
    const darkAfterReload = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    const bgE = await cssVar(page, '--background')
    check(darkAfterReload && bgE === '240 10% 4%', 'leg E: mode + official dark values persist across reload')
    await page.screenshot({ path: path.join(EVIDENCE, '061_jg_E_reload.png') })

    await browser.close()
  } finally {
    try { execSync(`taskkill /PID ${back.pid} /T /F`, { stdio: 'ignore' }) } catch {}
    if (vite) { try { execSync(`taskkill /PID ${vite.pid} /T /F`, { stdio: 'ignore' }) } catch {} }
  }

  if (failures.length) {
    console.log('[-] FAILURES:')
    for (const f of failures) console.log('   -', f)
    process.exitCode = 1
  } else {
    console.log('[+] PLAN-061 jade-garden probe: all counter-controls passed')
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
