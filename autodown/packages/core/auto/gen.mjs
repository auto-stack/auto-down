// Regenerate the @autodown/core TS sources from the Auto language sources in
// this directory:
//
//   auto/ial.at             -> src/ial.ts
//   auto/block_model.at     -> src/block-model.ts
//   auto/markdown_parser.at -> src/markdown-parser.ts
//   auto/serializer.at      -> src/serializer.ts
//   (barrel)                -> src/index.ts  (pure re-exports)
//
// Usage:  pnpm gen           (from packages/core)
//         node auto/gen.mjs  (same thing)
//
// The Auto compiler binary is resolved in this order:
//   1. $AUTO_EXE
//   2. D:/autostack/auto-lang/target/release/auto.exe
//   3. D:/autostack/auto-lang/target/debug/auto.exe
//
// `auto trans --path auto/X.at ts` emits raw TS next to the source (auto/X.ts).
// The raw output is kept at auto/X.raw.ts for inspection, and the following
// documented post-fixes are applied (each is asserted — the script fails
// loudly if the compiler output changes and a fix no longer applies):
//
// ial.at:
//   I1  `export class TableAttr` -> `export interface TableAttr` (the original
//       API exposes an interface; the emitted class has a dead constructor).
//   I2  `preprocessMarkdown` return type is `any` in the raw output -> restore
//       the precise `{ md: string; tableAttrs: TableAttr[] }` annotation, and
//       annotate the `tableAttrs` local as `TableAttr[]`.
//
// block_model.at:
//   B1  a2ts only inserts `new` for struct constructions in argument position;
//       return/let positions emit bare `Type(...)` calls (TS2348) -> rewrite
//       every `<Struct>(` construction to `new <Struct>(` (enum constructors
//       like `Op.InsertText(` are dot-prefixed and not matched).
//   B2  a2ts emits `export const enum`; `const enum` is unsafe across module
//       boundaries under isolatedModules -> rewrite to `export enum`.
//
// markdown_parser.at (plan 016 Phase 2, moved from packages/vue/auto):
//   M1  `use block_model:` / `use ial:` emit bare module specifiers mid-file
//       (at the `use` site) -> rewrite to "./block-model.js" / "./ial.js" and
//       hoist both import lines to the top of the file. M1 is shared via
//       hoistUseImports(label, src, {from: to}).
//   B1  same struct-`new` fix as block_model (the converter section
//       constructs BlockNode/InlineSpan/Attr in return/let positions).
//
// serializer.at (plan 016 Phase 3):
//   M1  `use block_model:` -> "./block-model.js", hoisted (same helper).
//   B1  applied leniently (no-op today: the serializer constructs no structs
//       outside argument position).
//
// Historical note (2026-08-25): the pre-existing F1 (`number | null[]`
// precedence) and F2 (missing `export`) fixes were retired — current auto.exe
// (auto-lang master bd629c7a) emits parenthesized union arrays and `export`
// keywords natively. F5 (empty main() trailer strip) only ever applied to
// sources with a `main`; none of the current sources has one.
//
// No other manual edits are made; if any assertion fails, re-check the
// compiler output before adjusting.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url)) // packages/core/auto
const pkgRoot = join(here, '..')

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

const apply = (label, out, fn) => {
  const next = fn(out)
  if (next === out) {
    console.error(`post-fix ${label} did not match anything; compiler output changed?`)
    process.exit(1)
  }
  return next
}

const transpile = (name) => {
  execFileSync(autoExe, ['trans', '--path', join(here, `${name}.at`), 'ts'], {
    stdio: 'inherit',
  })
  const rawPath = join(here, `${name}.ts`)
  const raw = readFileSync(rawPath, 'utf8')
  renameSync(rawPath, join(here, `${name}.raw.ts`))
  return raw
}

// B1 shared: struct constructions need `new` outside argument position
const structNames = [
  'SourceRange',
  'Attr',
  'InlineSpan',
  'SpanSplit',
  'BlockNode',
  'BlockPos',
  'Selection',
  'EditResult',
  'InsertTextOp',
  'SplitBlockOp',
  'MergeBlocksOp',
  'SetBlockTypeOp',
  'LiftBlockOp',
  'WrapBlockOp',
  'ReplaceRangeOp',
]
const ctorRe = new RegExp(`(?<!new )\\b(${structNames.join('|')})\\(`, 'g')
const addNewToStructCtors = (s) =>
  s
    .split('\n')
    .map((line) =>
      line.startsWith('export class ') ? line : line.replace(ctorRe, 'new $1(')
    )
    .join('\n')

const headerFor = (title, src) => `/**
 * ${title}
 *
 * GENERATED FILE — do not edit by hand.
 * Source: auto/${src} (Auto language). Regenerate with: pnpm gen
 * (see auto/README.md for the pipeline and the applied post-fixes)
 */

`

// ------------------------------------------------------------- ial.at

let ial = transpile('ial')

// I1: class TableAttr -> interface TableAttr (dead constructor removed)
ial = apply('I1', ial, (s) =>
  s.replace(
    /export class TableAttr \{[\s\S]*?\n\}/,
    'export interface TableAttr {\n    cols: (number | null)[];\n    rows: (number | null)[];\n}'
  )
)

// I2a: precise return type for preprocessMarkdown
ial = apply('I2a', ial, (s) =>
  s.replace(
    'export function preprocessMarkdown(md: string): any {',
    'export function preprocessMarkdown(md: string): { md: string; tableAttrs: TableAttr[] } {'
  )
)
// I2b: annotate the accumulator
ial = apply('I2b', ial, (s) =>
  s.replace('let tableAttrs = [];', 'const tableAttrs: TableAttr[] = [];')
)

writeFileSync(
  join(pkgRoot, 'src', 'ial.ts'),
  headerFor('AutoDown Core — Shared types and IAL (Inline Attribute List) utilities.', 'ial.at') + ial
)
console.log('[gen] auto/ial.at -> src/ial.ts (raw kept at auto/ial.raw.ts)')

// ------------------------------------------------------------- block_model.at

let bm = transpile('block_model')

// B2: const enum -> enum (before B1 so class-skip logic stays simple)
bm = apply('B2', bm, (s) => s.replaceAll('export const enum', 'export enum'))
// B1: struct constructions need `new` outside argument position
bm = apply('B1', bm, addNewToStructCtors)

writeFileSync(
  join(pkgRoot, 'src', 'block-model.ts'),
  headerFor('AutoDown Core — unified block model (block tree, selection, op sequence).', 'block_model.at') + bm
)
console.log('[gen] auto/block_model.at -> src/block-model.ts (raw kept at auto/block_model.raw.ts)')

// ------------------------------------------------------------- markdown_parser.at

// M1 (shared): a2ts emits `use x:` as `import {...} from "x"` at the use
// site (mid-file) with a bare module specifier -> rewrite the specifier per
// the given mapping and hoist the import lines to the top of the file.
const hoistUseImports = (label, s, mapping) =>
  apply(label, s, (src) => {
    let hoisted = ''
    let stripped = src
    for (const [from, to] of Object.entries(mapping)) {
      const m = new RegExp(`import \\{[^}]+\\} from "${from}";`).exec(stripped)
      if (!m) return src
      hoisted += m[0].replace(`from "${from}"`, `from "${to}"`) + '\n'
      stripped = stripped.replace(m[0], '')
    }
    return hoisted + stripped
  })

let md = transpile('markdown_parser')

// M1: rewrite + hoist the `use` imports
md = hoistUseImports('M1', md, { block_model: './block-model.js', ial: './ial.js' })

// B1: struct constructions need `new` outside argument position
md = apply('B1', md, addNewToStructCtors)

writeFileSync(
  join(pkgRoot, 'src', 'markdown-parser.ts'),
  headerFor('AutoDown Core — incremental markdown parser (semantic subset) + strong block-tree output.', 'markdown_parser.at') + md
)
console.log('[gen] auto/markdown_parser.at -> src/markdown-parser.ts (raw kept at auto/markdown_parser.raw.ts)')

// ------------------------------------------------------------- serializer.at

let ser = transpile('serializer')

// M1: rewrite + hoist the `use block_model:` import
ser = hoistUseImports('M1', ser, { block_model: './block-model.js' })
// B1: serializer.at constructs no structs outside argument position today;
// run the fix leniently (no-op is fine here, unlike the parser above).
ser = addNewToStructCtors(ser)

writeFileSync(
  join(pkgRoot, 'src', 'serializer.ts'),
  headerFor('AutoDown Core — block tree -> .ad text serializer (roundtrip-pinned).', 'serializer.at') + ser
)
console.log('[gen] auto/serializer.at -> src/serializer.ts (raw kept at auto/serializer.raw.ts)')

// ------------------------------------------------------------- barrel

const barrel = `/**
 * AutoDown Core — public barrel.
 *
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: pnpm gen (see auto/README.md)
 */

export * from './ial.js'
export * from './block-model.js'
export * from './markdown-parser.js'
export * from './serializer.js'
`

writeFileSync(join(pkgRoot, 'src', 'index.ts'), barrel)
console.log('[gen] wrote src/index.ts barrel')
