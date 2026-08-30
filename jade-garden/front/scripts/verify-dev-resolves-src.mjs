// Dev-resolution probe (plan 027 T3): boots the real vite dev server (no
// backend needed — the module graph loads regardless of API failures), opens
// the page in chromium, and asserts every @autodown/engine module URL is
// served from engine **src** (development condition) with zero dist URLs.
// This is the structural guarantee that killed the 2026-08-30 stale-dist
// white screen: dev/e2e can no longer consume a stale engine dist.
import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

const port = await freePort()
const base = `http://127.0.0.1:${port}`

const vite = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
  { cwd: frontDir, stdio: ['ignore', 'pipe', 'pipe'], shell: false },
)
let viteLog = ''
vite.stdout.on('data', (d) => { viteLog += d })
vite.stderr.on('data', (d) => { viteLog += d })

async function waitForVite(ms = 60_000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      const res = await fetch(base, { signal: AbortSignal.timeout(1500) })
      if (res.ok) return
    } catch { /* not up yet */ }
    if (vite.exitCode !== null) throw new Error(`vite exited early (code ${vite.exitCode}):\n${viteLog}`)
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`vite did not come up within ${ms}ms:\n${viteLog}`)
}

let exitCode = 1
try {
  await waitForVite()
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(base, { waitUntil: 'load', timeout: 60_000 })
  await page.waitForTimeout(800) // let late module fetches land in the buffer

  const urls = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((e) => e.name),
  )
  await browser.close()

  const engineUrls = urls.filter((u) => u.includes('packages/engine'))
  const fromSrc = engineUrls.filter((u) => u.includes('/engine/src/') || u.includes('\\engine\\src\\'))
  const fromDist = engineUrls.filter((u) => u.includes('/engine/dist/') || u.includes('\\engine\\dist\\'))

  console.log(`[verify-dev-resolves-src] ${engineUrls.length} engine resource URL(s)`)
  for (const u of engineUrls) console.log(`  ${u}`)

  if (engineUrls.length === 0) {
    console.error('[verify-dev-resolves-src] FAIL — no engine modules loaded at all (module graph broken?)')
  } else if (fromDist.length > 0) {
    console.error(`[verify-dev-resolves-src] FAIL — ${fromDist.length} engine URL(s) resolved to dist:`)
    for (const u of fromDist) console.error(`  ${u}`)
  } else if (fromSrc.length !== engineUrls.length) {
    console.error('[verify-dev-resolves-src] FAIL — some engine URLs match neither src nor dist:')
    for (const u of engineUrls.filter((u) => !fromSrc.includes(u))) console.error(`  ${u}`)
  } else {
    console.log(`[verify-dev-resolves-src] ok — all ${fromSrc.length} engine URLs served from src, zero from dist`)
    exitCode = 0
  }
} catch (err) {
  console.error(`[verify-dev-resolves-src] FAIL — ${err.message ?? err}`)
} finally {
  vite.kill()
  await new Promise((r) => { vite.on('exit', r); setTimeout(r, 3000) })
}
process.exit(exitCode)
