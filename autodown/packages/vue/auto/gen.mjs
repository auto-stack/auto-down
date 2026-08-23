// Regenerate src/streaming.generated.ts + src/streaming-table.generated.ts
// from the Auto language sources in this directory (plan 008, Phase 1).
//
// Usage:  pnpm gen           (from packages/vue)
//         node auto/gen.mjs  (same thing)
//
// The Auto compiler binary is resolved in this order:
//   1. $AUTO_EXE
//   2. D:/autostack/auto-lang/target/release/auto.exe
//   3. D:/autostack/auto-lang/target/debug/auto.exe
//
// `auto trans --path <src>.at ts` emits raw TS next to the source. The raw
// output is kept at auto/<src>.raw.ts for inspection, and the documented
// post-fixes below are applied to produce src/<src>.generated.ts (each is
// asserted — the script fails loudly if the compiler output changes and a
// fix no longer applies):
//
//   P1  `from "helpers"` -> `from "./auto-helpers"`
//       `use helpers:` maps to a bare module specifier; the hand-written
//       bridge lives at src/auto-helpers.ts (inside the tsconfig rootDir,
//       unlike this auto/ directory).
//   P2  `type JSONBlock {...}` becomes a TS `class` with a dead constructor
//       -> rewrite to an `export interface` (same as core's F3 post-fix).
//   P3  Auto has no union types, so the segment type can't live in the .at
//       source -> inject the StreamingSegment interfaces into the generated
//       file and restore the precise `buildSegments(...): StreamingSegment[]`
//       return annotation (same idea as core's F4 post-fix).
//
// No other manual edits are made; if any assertion fails, re-check the
// compiler output before adjusting.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url)) // packages/vue/auto
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

function transpile(stem) {
  // 1. Transpile Auto -> TS (output: auto/<stem>.ts)
  execFileSync(autoExe, ['trans', '--path', join(here, `${stem}.at`), 'ts'], {
    stdio: 'inherit',
  })
  const rawPath = join(here, `${stem}.ts`)
  const raw = readFileSync(rawPath, 'utf8')
  renameSync(rawPath, join(here, `${stem}.raw.ts`))
  return raw
}

let out = transpile('streaming')
const apply = (label, fn) => {
  const next = fn(out)
  if (next === out) {
    console.error(`post-fix ${label} did not match anything; compiler output changed?`)
    process.exit(1)
  }
  out = next
}

// P1: point the helpers bridge import at src/auto-helpers.ts
apply('P1', (s) => s.replace('from "helpers"', 'from "./auto-helpers"'))

// P2: class JSONBlock -> export interface JSONBlock (dead constructor removed)
apply('P2', (s) =>
  s.replace(
    /export class JSONBlock \{[\s\S]*?\n\}/,
    [
      'export interface JSONBlock {',
      '    start: number;',
      '    end: number;',
      '    content: string;',
      '    closed: boolean;',
      '}',
    ].join('\n')
  )
)

// P3a: inject the segment union types (Auto cannot express them) right after the import
const segmentTypes = `
export interface MarkdownSegment {
    type: 'markdown';
    text: string;
}

export interface ComponentSegment {
    type: 'component';
    componentType: string;
    props: Record<string, any>;
    final: boolean;
}

export type StreamingSegment = MarkdownSegment | ComponentSegment;
`
apply('P3a', (s) => s.replace('from "./auto-helpers";', `from "./auto-helpers";\n${segmentTypes}`))

// P3b: precise return type for buildSegments
apply(
  'P3b',
  (s) => s.replace(
    'export function buildSegments(text: string): any[] {',
    'export function buildSegments(text: string): StreamingSegment[] {'
  )
)

const streamingHeader = `/**
 * @autodown/vue — streaming document segmentation.
 *
 * GENERATED FILE — do not edit by hand.
 * Source: auto/streaming.at (Auto language). Regenerate with: pnpm gen
 * (see auto/README.md for the pipeline and the applied post-fixes)
 */

`

writeFileSync(join(pkgRoot, 'src', 'streaming.generated.ts'), streamingHeader + out)
console.log('[gen] auto/streaming.at -> src/streaming.generated.ts (raw kept at auto/streaming.raw.ts)')

// streaming_table.at needs no post-fixes today; still run through the same
// pipeline so the raw output stays inspectable.
const tableOut = transpile('streaming_table')
const tableHeader = `/**
 * @autodown/vue — StreamingTable prop normalization.
 *
 * GENERATED FILE — do not edit by hand.
 * Source: auto/streaming_table.at (Auto language). Regenerate with: pnpm gen
 * (see auto/README.md for the pipeline and the applied post-fixes)
 */

`

writeFileSync(join(pkgRoot, 'src', 'streaming-table.generated.ts'), tableHeader + tableOut)
console.log(
  '[gen] auto/streaming_table.at -> src/streaming-table.generated.ts (raw kept at auto/streaming_table.raw.ts)'
)
