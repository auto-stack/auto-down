// Prepares an isolated runtime for the Playwright E2E suite:
//   front/e2e/.runtime/jade-garden-back.exe   (copy of the cargo debug binary)
//   front/e2e/.runtime/workspace/wiki/        (fresh copy of tmp/wiki-demo/wiki)
// A stale jade-garden-config.json next to the copied binary is removed so the
// JADE_GARDEN_DEFAULT_WORKSPACE env var (set in playwright.config.ts) applies.
//
// Runs automatically via the `pretest:e2e` npm hook. Safe to run repeatedly.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(frontDir, '..', '..')
const runtimeDir = path.join(frontDir, 'e2e', '.runtime')
const workspaceDir = path.join(runtimeDir, 'workspace')

// Plan 027: dist freshness guard up front. E2E itself consumes engine src
// (development condition), but this keeps the dist-consuming surface honest
// and fails fast in parallel sessions where engine src moved ahead of a
// rebuild — long before a stale-dist white screen can eat an afternoon.
execFileSync(
  process.execPath,
  [path.join(repoRoot, 'autodown', 'packages', 'engine', 'scripts', 'assert-dist-fresh.mjs')],
  { stdio: 'inherit' },
)

const exeSource = path.join(repoRoot, 'jade-garden', 'back', 'server', 'target', 'debug', 'jade-garden-back.exe')
const fixtureWiki = path.join(repoRoot, 'tmp', 'wiki-demo', 'wiki')

if (!fs.existsSync(exeSource)) {
  console.error(`[e2e-prepare] Backend binary not found: ${exeSource}`)
  console.error('[e2e-prepare] Build it first: cd jade-garden/back/server && cargo build')
  process.exit(1)
}
if (!fs.existsSync(fixtureWiki)) {
  console.error(`[e2e-prepare] Fixture workspace not found: ${fixtureWiki}`)
  process.exit(1)
}

// Fresh fixture workspace every run (tests type into files and save them).
fs.rmSync(workspaceDir, { recursive: true, force: true })
fs.mkdirSync(workspaceDir, { recursive: true })
fs.cpSync(fixtureWiki, path.join(workspaceDir, 'wiki'), { recursive: true })

// Extra E2E-only fixture page: a dangling wiki link placed MID-document.
// (The only dangling link in tmp/wiki-demo, [[首页]] in Projects.ad, sits at
// the very end of the doc where a ProseMirror block-boundary widget overlays
// it and swallows real clicks.) tmp/wiki-demo itself stays untouched.
fs.writeFileSync(
  path.join(workspaceDir, 'wiki', 'E2E Links.ad'),
  [
    '---',
    'title: E2E Links',
    '---',
    '# E2E Links',
    '',
    '第一段，包含一个 [[E2E Dangling Page]] 悬空链接。',
    '',
    '结尾段落，让链接远离文档末尾的块边界。',
    '',
  ].join('\n'),
)


// Fresh backend copy + drop stale config so the env-provided workspace wins.
fs.mkdirSync(runtimeDir, { recursive: true })
fs.copyFileSync(exeSource, path.join(runtimeDir, 'jade-garden-back.exe'))
fs.rmSync(path.join(runtimeDir, 'jade-garden-config.json'), { force: true })

console.log(`[e2e-prepare] runtime ready at ${runtimeDir}`)
