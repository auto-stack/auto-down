// Regenerate the engine parser TS sources from the Auto language sources in
// this directory:
//
//   auto/ial.at             -> src/ial.ts
//   auto/block_model.at     -> src/block-model.ts
//   auto/markdown_parser.at -> src/markdown-parser.ts
//   auto/serializer.at      -> src/serializer.ts
//   (barrel)                -> src/index.ts  (pure re-exports)
//
// Usage:  pnpm gen:parser    (from packages/engine)
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
//   B1  RETIRED (plan 577 / auto-lang PLAN-577 T4a): a2ts now inserts `new`
//   for struct constructions at every position (return/let included) — the
//   assertion-style fix stopped matching and was removed.
//   B2  RETIRED (plan 577 / auto-lang PLAN-577 T4b): a2ts emits plain
//   `export enum` (isolatedModules-safe) — no const-enum rewrite needed.
//
// markdown_parser.at (plan 016 Phase 2, moved from packages/vue/auto):
//   M1  `use block_model:` / `use ial:` emit bare module specifiers mid-file
//       (at the `use` site) -> rewrite to "./block-model.js" / "./ial.js" and
//       hoist both import lines to the top of the file. M1 is shared via
//       hoistUseImports(label, src, {from: to}).
//   B1  RETIRED (see above).
//
// serializer.at (plan 016 Phase 3):
//   M1  `use block_model:` -> "./block-model.js", hoisted (same helper).
//   B1  RETIRED (see above).
//
// Historical note (2026-08-25): the pre-existing F1 (`number | null[]`
// precedence) and F2 (missing `export`) fixes were retired — current auto.exe
// (auto-lang master bd629c7a) emits parenthesized union arrays and `export`
// keywords natively. F5 (empty main() trailer strip) only ever applied to
// sources with a `main`; none of the current sources has one.
// Historical note (2026-09-07, plan 577): B1/B2 retired — auto-lang PLAN-577
// T4a/T4b made the emitter natively emit `new <Struct>(` everywhere and plain
// `enum`; the assertion-style post-fixes stopped matching (by design) and
// were removed.
//
// No other manual edits are made; if any assertion fails, re-check the
// compiler output before adjusting.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url)) // packages/engine/auto/parser
const pkgRoot = join(here, '../..')

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

// B1/B2 struct-`new` + const-enum post-fixes RETIRED (plan 577 — the
// assertion on B1-ial fired first: zero matches against the new emitter
// output). No replacement needed.

// C1 (plan 019): Auto's snake_case `char_at` is not a JS string method —
// a2ts passes member calls through verbatim, so rewrite to charCodeAt.
const charAtFix = (s) => s.split('.char_at(').join('.charCodeAt(')

const headerFor = (title, src) => `/**
 * ${title}
 *
 * GENERATED FILE — do not edit by hand.
 * Source: auto/${src} (Auto language). Regenerate with: pnpm gen
 * (see auto/README.md for the pipeline and the applied post-fixes)
 */

`

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

// The reading parser emits independently of legacy parser generator drift.
const generateBookReading = () => {
  const source = transpile('book_reading').replace(/[ \t]+$/gm, '')
  writeFileSync(join(here, 'book_reading.raw.ts'), source)
  let ts = hoistUseImports('book imports', source, {
    block_model: './block-model.js',
    markdown_parser: './markdown-parser.js',
  })
  ts = apply('book JS string offsets', ts, (src) => src.replace(
    /export function bookTextUnits\([\s\S]*?(?=\nexport function bookLineOf\()/,
    'function bookTextUnits(text: string): number { return text.length }\n' +
      'export function sliceBookText(text: string, start: number, end: number): string {\n' +
      '  return text.slice(start, end)\n}\n',
  ))
  writeFileSync(join(pkgRoot, 'src', 'parser', 'book-reading.ts'),
    headerFor('AutoDown reading profile v1.', 'book_reading.at') + charAtFix(ts))
  const atPath = join(here, 'book_reading.at')
  execFileSync(autoExe, ['trans', '--path', atPath, 'rust'], { stdio: 'inherit' })
  let rust = readFileSync(join(here, 'book_reading.a2r.rs'), 'utf8')
  // a2r iterates borrowed records without cloning the returned payload.
  rust = apply('book target ownership', rust, (src) => src.replaceAll('Some(target)', 'Some(target.clone())'))
  // Borrow chapter-wide data on native lookup. The JS calls already use references.
  rust = rust.replace(/(?:mut )?chapter: BookChapter/g, 'chapter: &BookChapter')
    .replaceAll('locateBookTarget(chapter.clone(),', 'locateBookTarget(chapter,')
    .replace('targets: Vec<BookTarget>, id: &str', 'targets: &[BookTarget], id: &str')
    .replaceAll('findBookTarget(targets.clone(),', 'findBookTarget(&targets,')
    .replace('for target in &targets {', 'for target in targets {')
    .replace('item: BookSpan, all: BookInline', 'item: &BookSpan, all: &BookInline')
    .replace('invalidBookSpan(item.clone(), inline.clone())', 'invalidBookSpan(item, &inline)')
    .replace('return chapter.source;', 'return chapter.source.clone();')
  rust = apply('book scalar scan', rust, (src) => src.replace(
    /fn bookCharCodes\([\s\S]*?(?=\nfn bookSpans\()/,
    'fn bookCharCodes(text: &str) -> Vec<i64> { text.chars().map(|ch| ch as i64).collect() }\n',
  ))
  // Native helpers traverse Unicode once. Auto strings use Unicode scalar
  // indexing on Rust and UTF-16 units on JS; the public offsets use UTF-16.
  rust = apply('book UTF-16 positions', rust, (src) => src.replace(
    /fn bookTextUnits\([\s\S]*?(?=\nfn bookLineOf\()/,
    [
      'fn bookTextUnits(text: &str) -> i64 { text.encode_utf16().count() as i64 }',
      'fn bookByteIndex(text: &str, offset: i64) -> usize {',
      '    let mut units = 0;',
      '    for (byte, ch) in text.char_indices() {',
      '        if units >= offset { return byte; }',
      '        units += ch.len_utf16() as i64;',
      '    }',
      '    text.len()',
      '}',
      'pub fn sliceBookText(text: &str, start: i64, end: i64) -> String {',
      '    text.get(bookByteIndex(text, start)..bookByteIndex(text, end))',
      '        .unwrap_or_default().to_owned()',
      '}',
    ].join('\n') + '\n',
  ))
  writeFileSync(join(pkgRoot, 'rust', 'src', 'book_reading.rs'), rust.replace(/[ \t]+$/gm, ''))
}

if (process.argv.includes('--book-only')) {
  generateBookReading()
  process.exit(0)
}

// ------------------------------------------------------------- ial.at

let ial = transpile('ial')

// plan 019 Phase 1: ial.at is now dual-portable (typed TableAttr/PreDoc
// structs, no regex) — the retired I1 (class->interface) and I2 (any ->
// precise return type) fixes are obsolete: the compiler output now carries
// real types. Only C1 (char_at -> charCodeAt) still applies.

ial = charAtFix(ial)

writeFileSync(
  join(pkgRoot, 'src', 'parser', 'ial.ts'),
  headerFor('AutoDown Core — Shared types and IAL (Inline Attribute List) utilities.', 'ial.at') + ial
)
console.log('[gen] auto/ial.at -> src/ial.ts (raw kept at auto/ial.raw.ts)')

// ------------------------------------------------------------- block_model.at

let bm = transpile('block_model')

writeFileSync(
  join(pkgRoot, 'src', 'parser', 'block-model.ts'),
  headerFor('AutoDown Core — unified block model (block tree, selection, op sequence).', 'block_model.at') + bm
)
console.log('[gen] auto/block_model.at -> src/block-model.ts (raw kept at auto/block_model.raw.ts)')

// ------------------------------------------------------------- markdown_parser.at

let md = transpile('markdown_parser')

// M1: rewrite + hoist the `use` imports
md = hoistUseImports('M1', md, { block_model: './block-model.js', ial: './ial.js' })

// C1: char_at -> charCodeAt (plan 019)
md = charAtFix(md)

writeFileSync(
  join(pkgRoot, 'src', 'parser', 'markdown-parser.ts'),
  headerFor('AutoDown Core — incremental markdown parser (semantic subset) + strong block-tree output.', 'markdown_parser.at') + md
)
console.log('[gen] auto/markdown_parser.at -> src/markdown-parser.ts (raw kept at auto/markdown_parser.raw.ts)')

// ------------------------------------------------------------- serializer.at

let ser = transpile('serializer')

// M1: rewrite + hoist the `use block_model:` import
ser = hoistUseImports('M1', ser, { block_model: './block-model.js' })

writeFileSync(
  join(pkgRoot, 'src', 'parser', 'serializer.ts'),
  headerFor('AutoDown Core — block tree -> .ad text serializer (roundtrip-pinned).', 'serializer.at') + ser
)
console.log('[gen] auto/serializer.at -> src/serializer.ts (raw kept at auto/serializer.raw.ts)')

generateBookReading()

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

writeFileSync(join(pkgRoot, 'src', 'parser', 'index.ts'), barrel)
console.log('[gen] wrote src/index.ts barrel')
