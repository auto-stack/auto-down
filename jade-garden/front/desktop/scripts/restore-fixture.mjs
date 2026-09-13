// restore-fixture.mjs — PLAN-064 T-03: fixture restore protocol for the
// jade vm-smoke harness. Pays the P022-6 终审登记 hygiene debt (probes
// wrote straight into the SHARED fixture); the fixture is now treated as
// restore-after-use: every run snapshots it, and restores the committed
// state afterwards so repeat runs start identical (AC-02 跑前后一致).
//
// Source of truth = git (tmp/wiki-demo is fully tracked). Restore =
// scoped `git checkout --` + `git clean -f` INSIDE tmp/wiki-demo only
// (import-arms create untracked docs; checkout alone would leave them).
//
// CLI: node restore-fixture.mjs   → restore + print hash
// API: snapshotFixture() / restoreFixture() / hashFixture()

import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const REPO_ROOT = process.env.JADE_REPO_ROOT ?? 'D:/autostack/auto-down'
export const FIXTURE_ROOT = process.env.JADE_FIXTURE ?? path.join(REPO_ROOT, 'tmp', 'wiki-demo')

// The fixture content contract = the wiki DOCUMENTS (wiki/**/*.ad). The
// backend-owned runtime caches (jade-garden-index.sqlite/.json, SRS .edn)
// live in the same dir by design, are gitignored, and are NOT part of the
// contract — they are regenerated/derived and not byte-deterministic.
export function hashFixture() {
  const out = []
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (p.slice(-3).toLowerCase() === '.ad') {
        const h = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16)
        out.push(`${path.relative(FIXTURE_ROOT, p).replace(/\\/g, '/')} ${h}`)
      }
    }
  }
  walk(path.join(FIXTURE_ROOT, 'wiki'))
  return out.join('\n')
}

export function restoreFixture() {
  const git = (argv) => execFileSync('git', ['-C', REPO_ROOT, ...argv], { stdio: 'pipe' })
  const rel = path.relative(REPO_ROOT, FIXTURE_ROOT).replace(/\\/g, '/')
  git(['checkout', '--', rel])
  git(['clean', '-f', '--', rel])
  return hashFixture()
}

export function assertRestored(beforeHash, afterHash) {
  if (beforeHash !== afterHash) {
    const a = beforeHash.split('\n')
    const b = afterHash.split('\n')
    const diff = a.filter((l) => !b.includes(l)).concat(b.filter((l) => !a.includes(l)))
    throw new Error(`fixture drift after restore:\n${diff.join('\n')}`)
  }
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (invokedDirectly) {
  const h = restoreFixture()
  console.log(`restore-fixture: restored ${FIXTURE_ROOT}`)
  console.log(h)
}
