// Regenerate src/index.ts from auto/ial.at (Auto language source).
//
// Usage:  pnpm gen           (from packages/core)
//         node auto/gen.mjs  (same thing)
//
// The Auto compiler binary is resolved in this order:
//   1. $AUTO_EXE
//   2. D:/autostack/auto-lang/target/release/auto.exe
//   3. D:/autostack/auto-lang/target/debug/auto.exe
//
// `auto trans --path auto/ial.at ts` emits raw TS next to the source (auto/ial.ts).
// The raw output is kept at auto/ial.raw.ts for inspection, and the following
// documented post-fixes are applied to produce src/index.ts (each is asserted —
// the script fails loudly if the compiler output changes and a fix no longer applies):
//
//   F1  `number | null[]` -> `(number | null)[]`
//       a2ts maps `List<int?>` without parentheses, which changes the meaning
//       (number OR null-array instead of array of nullable numbers).
//   F2  a2ts emits no `export` keyword -> prepend `export ` to the public functions.
//   F3  `type TableAttr` becomes a TS `class` with a dead constructor; the original
//       API exposes an `interface` -> rewrite the class block to the interface.
//   F4  `preprocessMarkdown` return type is `any` in the raw output -> restore the
//       precise `{ md: string; tableAttrs: TableAttr[] }` annotation, and annotate
//       the `tableAttrs` local as `TableAttr[]`.
//   F5  a2ts always appends an empty `function main() {...}` + `main();` trailer
//       -> strip it.
//
// No other manual edits are made; if any assertion fails, re-check the compiler
// output before adjusting.

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

// 1. Transpile Auto -> TS (output: auto/ial.ts)
execFileSync(autoExe, ['trans', '--path', join(here, 'ial.at'), 'ts'], {
  stdio: 'inherit',
})
const rawPath = join(here, 'ial.ts')
let raw = readFileSync(rawPath, 'utf8')
renameSync(rawPath, join(here, 'ial.raw.ts'))

let out = raw
const apply = (label, fn) => {
  const next = fn(out)
  if (next === out) {
    console.error(`post-fix ${label} did not match anything; compiler output changed?`)
    process.exit(1)
  }
  out = next
}

// F1: List<int?> precedence fix
apply('F1', (s) => s.replaceAll('number | null[]', '(number | null)[]'))

// F2: exports for the public API
for (const name of ['formatValue', 'formatArray', 'hasAnyValue', 'preprocessMarkdown', 'buildIAL']) {
  apply(`F2:${name}`, (s) => s.replace(`function ${name}(`, `export function ${name}(`))
}

// F3: class TableAttr -> interface TableAttr (dead constructor removed)
apply('F3', (s) =>
  s.replace(
    /class TableAttr \{[\s\S]*?\n\}/,
    'export interface TableAttr {\n    cols: (number | null)[];\n    rows: (number | null)[];\n}'
  )
)

// F4a: precise return type for preprocessMarkdown
apply('F4a', (s) =>
  s.replace(
    'function preprocessMarkdown(md: string): any {',
    'function preprocessMarkdown(md: string): { md: string; tableAttrs: TableAttr[] } {'
  )
)
// F4b: annotate the accumulator
apply('F4b', (s) =>
  s.replace('let tableAttrs = [];', 'const tableAttrs: TableAttr[] = [];')
)

// F5: strip the empty main() trailer
apply('F5', (s) => s.replace(/\nfunction main\(\): void \{[\s\S]*$/, '\n'))

const header = `/**
 * AutoDown Core — Shared types and IAL (Inline Attribute List) utilities.
 *
 * GENERATED FILE — do not edit by hand.
 * Source: auto/ial.at (Auto language). Regenerate with: pnpm gen
 * (see auto/README.md for the pipeline and the applied post-fixes)
 */

`

writeFileSync(join(pkgRoot, 'src', 'index.ts'), header + out)
console.log('[gen] auto/ial.at -> src/index.ts (raw kept at auto/ial.raw.ts)')
