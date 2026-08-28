// Regenerate the editor chrome-layer Vue SFCs from the Auto language widget
// sources in this directory (plan 021 Phase 1 — source recovery & pipeline).
//
//   auto/editor/*.at        (14 widget sources, plan 013 era, restored from
//                            git history c7364cd^ — see README.md)
//   auto/editor/ext/*.ts    (7 hand-written TS extension bridges)
//
// Usage:  pnpm gen:editor        (from packages/engine)
//         node auto/editor/gen.mjs
//
// The Auto compiler binary is resolved in this order:
//   1. $AUTO_EXE
//   2. D:/autostack/auto-lang/target/release/auto.exe
//   3. D:/autostack/auto-lang/target/debug/auto.exe
//
// The widget DSL only compiles in project mode (`auto build -r vue`,
// scene: ui — `auto trans ... ts` cannot parse `widget { view {} }`), and the
// vue backend hard-codes the project layout `<root>/src/front/*.at`. This
// script therefore stages a transient project at auto/editor/gen/_stage/
// (recreated from scratch on every run — the compiler's incremental emission
// cache is NOT trusted to re-emit into a wiped directory), runs
// `auto build --gen-only --lenient` there, and harvests the emitted SFCs into
// the ISOLATED output area auto/editor/gen/components/.
//
// PHASE 1 BOUNDARY: nothing here deploys into src/. The frozen products under
// src/editor/{menus,components,node-views,core} stay untouched until Phase 2
// (ext bridge retargeting + diff review). The emitted SFCs import the ext
// bridges through the gen-project alias `@/ext/ext/<name>_ext` — the E1
// import-specifier rewrite to real editor-tree paths is a deployment-time
// post-fix and is deliberately NOT applied yet.
//
// Flags:
//   --gen-only  skip the gen project's pnpm install / vue-tsc / vite build
//               (Phase 1 has no type-check gate; the ext bridges still
//               reference Tiptap-era modules by design until Phase 2).
//   --lenient   keep building despite codegen validation warnings. Strict
//               mode (default since auto-lang plan 015) escalates them to
//               failure; the plan-013 widget set trips S002 (`<dyn>` unknown
//               element — emitted correctly anyway as `<component :is>`),
//               R011 and S001 advisories. The full census is written to
//               gen/validation.log on every run.
//
// Known compiler flakiness (auto-lang master 1487b5c5d, 2026-08-28): the
// build occasionally exits 1 silently right after the validation phase
// without emitting anything (~1 in 4 runs, timing-sensitive). This script
// detects the missing output and retries the build once before failing.
//
// app.at is the mandatory placeholder root widget (the generator always
// emits the root as App.vue); its output is discarded.

import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url)) // packages/engine/auto/editor
const genRoot = join(here, 'gen')
const stage = join(genRoot, '_stage')
const outComponents = join(genRoot, 'components')

const candidates = [
  process.env.AUTO_EXE,
  'D:/autostack/auto-lang/target/release/auto.exe',
  'D:/autostack/auto-lang/target/debug/auto.exe',
].filter(Boolean)
const autoExe = candidates.find((p) => existsSync(p))
if (!autoExe) {
  console.error('auto.exe not found; set AUTO_EXE to the Auto compiler binary')
  process.exit(1)
}

const widgets = readdirSync(here)
  .filter((f) => f.endsWith('.at') && f !== 'pac.at')
  .sort()
if (widgets.length !== 14) {
  console.error(`expected 14 widget sources in auto/editor/, found ${widgets.length}: ${widgets}`)
  process.exit(1)
}

// app.at is the placeholder root; everything else must land as a component SFC.
const expectedComponents = widgets.length - 1

const stageProject = () => {
  rmSync(stage, { recursive: true, force: true })
  mkdirSync(join(stage, 'src', 'front'), { recursive: true })
  mkdirSync(join(stage, 'ext'), { recursive: true })
  cpSync(join(here, 'pac.at'), join(stage, 'pac.at'))
  for (const f of widgets) cpSync(join(here, f), join(stage, 'src', 'front', f))
  for (const f of readdirSync(join(here, 'ext'))) {
    cpSync(join(here, 'ext', f), join(stage, 'ext', f))
  }
}

const runBuild = () => {
  stageProject()
  // root_dir comes from the process cwd in the gen-only dispatch path;
  // run inside the stage dir (and pass -d . for good measure). Validation
  // warnings are printed to stderr — capture both streams.
  const r = spawnSync(
    autoExe,
    ['build', '-d', '.', '--gen-only', '--lenient', '-e', '100'],
    { cwd: stage, encoding: 'utf8' }
  )
  return { code: r.status ?? 1, log: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}

let { code, log } = runBuild()
let emitted = existsSync(join(stage, 'gen', 'front', 'vue', 'src', 'components'))
  ? readdirSync(join(stage, 'gen', 'front', 'vue', 'src', 'components')).filter((f) =>
      f.endsWith('.vue')
    )
  : []

if (code !== 0 || emitted.length !== expectedComponents) {
  console.error(
    `[gen] first build pass incomplete (exit=${code}, ${emitted.length}/${expectedComponents} components) — retrying once (known intermittent compiler failure, see header)`
  )
  ;({ code, log } = runBuild())
  emitted = existsSync(join(stage, 'gen', 'front', 'vue', 'src', 'components'))
    ? readdirSync(join(stage, 'gen', 'front', 'vue', 'src', 'components')).filter((f) =>
        f.endsWith('.vue')
      )
    : []
}

writeFileSync(join(genRoot, 'validation.log'), log)

if (code !== 0 || emitted.length !== expectedComponents) {
  console.error(
    `[gen] auto build failed: exit=${code}, emitted ${emitted.length}/${expectedComponents} component SFCs (see auto/editor/gen/validation.log)`
  )
  process.exit(1)
}

rmSync(outComponents, { recursive: true, force: true })
mkdirSync(outComponents, { recursive: true })
for (const f of emitted.sort()) {
  cpSync(join(stage, 'gen', 'front', 'vue', 'src', 'components', f), join(outComponents, f))
  console.log(`[gen] ${f}`)
}
console.log(
  `[gen] ${emitted.length} widget SFCs -> auto/editor/gen/components/ (isolated; src/ untouched, validation census at gen/validation.log)`
)
