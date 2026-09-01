// Regenerate the editor chrome-layer Vue SFCs from the Auto language widget
// sources in this directory (plan 021 Phase 1 — source recovery & pipeline).
//
//   auto/editor/*.at        (20 widget sources: 12 plan-013-era views/menus
//                            + table_editor_block + the three family
//                            widgets of plan 033 + rich_text_host of plan
//                            034 — see README.md)
//   auto/editor/ext/*.ts    (11 hand-written TS extension bridges)
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
// PHASE 2 DEPLOYMENT (plan 021): after harvesting, this script now WRITES
// into src/editor/:
//   1. the ext bridges  auto/editor/ext/*.ts  ->  src/editor/ext/*.ts
//      (deploy list below — auto_down_editor_ext.ts lands with the Phase 3
//      menu batch, its ../menus re-exports don't resolve until then);
//   2. the DEPLOY_COMPONENTS SFCs -> their src/editor/ destinations, with
//      the E1 import-specifier rewrite applied: the emitted
//      `from '@/ext/ext/<name>'` becomes `from '../ext/<name>'` (every
//      destination dir — menus/, components/, node-views/, core/ — is a
//      direct child of src/editor/, so one uniform prefix). E1 is asserted:
//      a deploying component without an ext import fails the run.
// Components outside DEPLOY_COMPONENTS stay in the isolated
// auto/editor/gen/components/ area until their phase turns them on
// (Phase 3: BubbleMenu/TableMenu/CodeBlockMenu/CodeLanguageIcon + the seven
// node views; Phase 4: AutoDownEditor per the assembly evaluation).
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
const pkgRoot = join(here, '../..') // packages/engine
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
// 13 plan-013-era widgets + table_editor_block.at (plan 023 P1T8); the
// three family widgets (plan 033 T2-T4) replaced code_editor_block.at,
// math_edit_block.at / mermaid_edit_block.at (plan 031) and the block
// math/mermaid node views (plan 013 era) — one widget per pilot kind,
// three modes each; rich_text_host.at (plan 034 T2) replaces the
// hand-written BlockHost.vue; attr_host.at (plan 035 T2) replaces the
// hand-written AttrHost.vue (plan 030 T7).
if (widgets.length !== 20) {
  console.error(`expected 20 widget sources in auto/editor/, found ${widgets.length}: ${widgets}`)
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
  `[gen] ${emitted.length} widget SFCs -> auto/editor/gen/components/ (isolated; validation census at gen/validation.log)`
)

// -- deployment (Phase 2) ------------------------------------------------------

const EXT_DEPLOY = [
  'slash_menu_ext.ts',
  'code_language_icon_ext.ts',
  'table_menu_ext.ts',
  'code_block_menu_ext.ts',
  'bubble_menu_ext.ts',
  'node_view_ext.ts',
  // plan 023 P1T8 — the table editing face's DOM helpers.
  'table_editor_block_ext.ts',
  // plan 033 T2-T4 — the pilot families' widget bridges (view-highlight
  // parity + absorbed edit helpers + node-view render bridges with the
  // artifact final-put; replaced code_editor_block_ext / math_edit_ext /
  // mermaid_edit_ext).
  'code_block_widget_ext.ts',
  'math_block_widget_ext.ts',
  'mermaid_block_widget_ext.ts',
  // plan 034 T3 — the rich text host's platform wiring (all of the retired
  // BlockHost.vue's event/mount/caret logic; the widget owns only chrome).
  'rich_text_host_ext.ts',
  // plan 035 T2 — the single-line attr host's wiring (the retired AttrHost.vue
  // semantics: mount/sync/commit; shared by the Callout-title and
  // Details-summary container widgets).
  'attr_host_ext.ts',
  // plan 035 T3+ — the container family's shared bridge (BlockChildren hole
  // + AttrHost widget product + the callout flat chrome reads).
  'container_ext.ts',
  // Phase 3: its ../menus/*.vue re-exports resolve now that the menu SFCs
  // below deploy alongside it.
  'auto_down_editor_ext.ts',
]

const DEPLOY_COMPONENTS = {
  // Phase 2 — SlashMenu revival (replaces the frozen product; expected diff
  // vs the frozen file: the computeMenuPosition import specifier ONLY).
  'SlashMenu.vue': 'menus/SlashMenu.vue',
  // Phase 3 — the remaining chrome set. Deployed as live generated products
  // (vue-tsc-checked, regen-owned); NOT yet mounted by EngineEditor — the
  // menus need the engine menu-host protocol (adapter .on/.off/
  // isActive('table')/getAttributes/table chains/view shim), the node
  // views need a block-view mount in the preview column. Both are recorded
  // in the plan as the documented dormant gap (018/020 口径: 待行内
  // mark/面板注入位扩展). wikilink interaction is owned by 020's preview
  // decorator (src/editor/wikilink.ts) — WikiLinkNodeView deploys as a
  // generated source only.
  'BubbleMenu.vue': 'menus/BubbleMenu.vue',
  'TableMenu.vue': 'menus/TableMenu.vue',
  'CodeBlockMenu.vue': 'menus/CodeBlockMenu.vue',
  'CodeLanguageIcon.vue': 'components/CodeLanguageIcon.vue',
  'DetailsNodeView.vue': 'node-views/DetailsNodeView.vue',
  'WikiLinkNodeView.vue': 'node-views/WikiLinkNodeView.vue',
  'QueryBlockNodeView.vue': 'node-views/QueryBlockNodeView.vue',
  'BlockEmbedNodeView.vue': 'node-views/BlockEmbedNodeView.vue',
  'MathInlineNodeView.vue': 'node-views/MathInlineNodeView.vue',
  // plan 023 P1T8 — the table's typed editing face.
  'TableEditorBlock.vue': 'components/TableEditorBlock.vue',
  // plan 033 T2-T4 — the pilot families' three-mode widgets (view/stream/
  // edit one chrome; replaced CodeEditorBlock + Math/MermaidEditBlock +
  // the block Math/Mermaid node views).
  'CodeBlockWidget.vue': 'components/CodeBlockWidget.vue',
  'MathBlockWidget.vue': 'components/MathBlockWidget.vue',
  'MermaidBlockWidget.vue': 'components/MermaidBlockWidget.vue',
  // plan 034 T3 — the text-leaf editing host (replaces the hand-written
  // BlockHost.vue; mounted by EngineEditor's assembleNode from T5).
  'RichTextHost.vue': 'components/RichTextHost.vue',
  // plan 035 T2 — the attr read/write host (replaces the hand-written
  // AttrHost.vue, plan 030 T7; name collision forced the swap in T2 —
  // EngineEditor's two expandedElement call sites moved to the generated
  // prop face). The Callout/Details container widgets embed it from T3/T4.
  'AttrHost.vue': 'components/AttrHost.vue',
  // plan 035 T3-T5 — the container family widgets (view/stream/edit one
  // chrome; deployed as generated sources until the T6 assembly switch —
  // the 021 Phase 3 dormant-deploy idiom).
  'CalloutBlockWidget.vue': 'components/CalloutBlockWidget.vue',
  'DetailsBlockWidget.vue': 'components/DetailsBlockWidget.vue',
  // Phase 4 — 'AutoDownEditor.vue': 'core/AutoDownEditor.vue' (assembly
  // evaluation decides).
}

const EXT_IMPORT_RE = /from '@\/ext\/ext\/([A-Za-z0-9_]+)'/g

mkdirSync(join(pkgRoot, 'src', 'editor', 'ext'), { recursive: true })
for (const f of EXT_DEPLOY) {
  cpSync(join(here, 'ext', f), join(pkgRoot, 'src', 'editor', 'ext', f))
  console.log(`[deploy] src/editor/ext/${f}`)
}

for (const [file, dest] of Object.entries(DEPLOY_COMPONENTS)) {
  const src = readFileSync(join(outComponents, file), 'utf8')
  let count = 0
  const rewritten = src.replace(EXT_IMPORT_RE, (_m, name) => {
    count += 1
    return `from '../ext/${name}'`
  })
  if (count === 0) {
    console.error(`[deploy] E1: no '@/ext/ext/*' import found in ${file} — compiler output drifted?`)
    process.exit(1)
  }
  const destPath = join(pkgRoot, 'src', 'editor', dest)
  mkdirSync(dirname(destPath), { recursive: true })
  writeFileSync(destPath, rewritten)
  console.log(`[deploy] src/editor/${dest} (E1 x${count})`)
}
