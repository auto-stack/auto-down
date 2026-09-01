// Editor chrome-layer generation guard (plan 021 Phase 4, acceptance #1/#5):
// every deployed Auto-generated product must have its .at source in
// auto/editor/, every deployed ext bridge must be byte-identical to its
// auto/editor/ext/ source, and no stray "Auto-generated" file may exist
// without a source (the plan 018 frozen-product failure mode).
//
// Checked invariants:
//   1. every .vue under src/editor/ carrying the Auto-generated header maps
//      (PascalCase → snake_case) to an existing auto/editor/<name>.at;
//   2. the deployed chrome set is EXACTLY the expected list below (drift in
//      either direction — a hand-deleted menu, a newly generated product —
//      fails loudly and forces a conscious list update);
//   3. each auto/editor/ext/*.ts that deploys (all seven bridges) exists at
//      src/editor/ext/<name>.ts and is byte-identical (the bridges are
//      verbatim deploys — regenerate with `pnpm gen:editor` on drift).
//
// Known non-deployed sources (documented, not an error): app.at (mandatory
// placeholder root — its App.vue output is discarded) and
// auto_down_editor.at (dormant assembly widget, superseded by the
// handwritten EngineEditor platform shell — plan 021 Phase 4 ruling).

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const editorSrc = join(pkgRoot, 'src', 'editor')
const autoEditor = join(pkgRoot, 'auto', 'editor')

const failures = []
const fail = (msg) => failures.push(msg)

// -- 1. header scan: generated products ↔ .at sources ---------------------------

const HEADER_RE = /^<!-- (\w+) component - Auto-generated from Auto language -->/
const snake = (pascal) => pascal.replace(/(?<=[a-z0-9])(?=[A-Z])/g, '_').toLowerCase()

function scanDir(dir) {
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...scanDir(p))
    else if (entry.name.endsWith('.vue')) {
      const m = readFileSync(p, 'utf8').match(HEADER_RE)
      if (m) found.push({ file: p, component: m[1] })
    }
  }
  return found
}

const generated = scanDir(editorSrc)

// -- 2. exact deployed set -------------------------------------------------------

const EXPECTED = [
  'menus/SlashMenu.vue',
  'menus/BubbleMenu.vue',
  'menus/TableMenu.vue',
  'menus/CodeBlockMenu.vue',
  'components/CodeLanguageIcon.vue',
  // plan 023 P1T8 — the table's typed editing face.
  'components/TableEditorBlock.vue',
  // plan 033 T2-T4 — the pilot families' three-mode widgets (view/stream/
  // edit one chrome; replaced CodeEditorBlock + Math/MermaidEditBlock +
  // the block Math/Mermaid node views — deployed set 16 → 14).
  'components/CodeBlockWidget.vue',
  'components/MathBlockWidget.vue',
  'components/MermaidBlockWidget.vue',
  'node-views/DetailsNodeView.vue',
  'node-views/WikiLinkNodeView.vue',
  'node-views/QueryBlockNodeView.vue',
  'node-views/BlockEmbedNodeView.vue',
  'node-views/MathInlineNodeView.vue',
]

const relOf = (p) => p.slice(editorSrc.length + 1).split('\\').join('/')
const deployed = new Set()
for (const { file, component } of generated) {
  const rel = relOf(file)
  deployed.add(rel)
  const source = join(autoEditor, `${snake(component)}.at`)
  if (!existsSync(source)) fail(`generated product ${rel} has no .at source (${source})`)
}
for (const rel of EXPECTED) {
  if (!deployed.has(rel)) fail(`expected deployed chrome product missing: ${rel}`)
}
for (const rel of deployed) {
  if (!EXPECTED.includes(rel)) fail(`unexpected Auto-generated file: ${rel} (update the guard list or remove it)`)
}

// -- 3. ext bridge sync ----------------------------------------------------------

for (const f of readdirSync(join(autoEditor, 'ext'))) {
  if (!f.endsWith('.ts')) continue
  const deployedBridge = join(editorSrc, 'ext', f)
  if (!existsSync(deployedBridge)) {
    fail(`ext bridge not deployed: ${f} (expected at src/editor/ext/${f})`)
    continue
  }
  if (readFileSync(join(autoEditor, 'ext', f), 'utf8') !== readFileSync(deployedBridge, 'utf8')) {
    fail(`ext bridge out of sync: ${f} (auto/editor/ext vs src/editor/ext — rerun pnpm gen:editor)`)
  }
}

if (failures.length > 0) {
  console.error('[assert-editor-gen] FAILED:')
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(
  `[assert-editor-gen] ok — ${EXPECTED.length} chrome products sourced, ${readdirSync(join(autoEditor, 'ext')).length} ext bridges in sync`
)
