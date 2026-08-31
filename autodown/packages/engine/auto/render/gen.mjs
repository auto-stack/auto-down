// Regenerate src/render/streaming.generated.ts + src/render/streaming-table.generated.ts
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

const here = dirname(fileURLToPath(import.meta.url)) // packages/engine/auto/render
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

writeFileSync(join(pkgRoot, 'src', 'render', 'streaming.generated.ts'), streamingHeader + out)
console.log('[gen] auto/streaming.at -> src/render/streaming.generated.ts (raw kept at auto/streaming.raw.ts)')

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

writeFileSync(join(pkgRoot, 'src', 'render', 'streaming-table.generated.ts'), tableHeader + tableOut)
console.log(
  '[gen] auto/streaming_table.at -> src/render/streaming-table.generated.ts (raw kept at auto/streaming_table.raw.ts)'
)

// markdown_parser.at moved to @autodown/core in plan 016 Phase 2
// (packages/core/auto/markdown_parser.at -> core src/markdown-parser.ts).
// src/markdown-parser.generated.ts is now a hand-maintained redirect that
// re-exports `parseDocument` from '@autodown/core'; it is intentionally NOT
// regenerated here.

// render_scheduler.at (plan 008 Phase 3): pure scheduling decisions, no
// post-fixes today.
const schedOut = transpile('render_scheduler')
const schedHeader = `/**
 * @autodown/vue — render scheduler decisions (batch / live-window /
 * typewriter stepping).
 *
 * GENERATED FILE — do not edit by hand.
 * Source: auto/render_scheduler.at (Auto language). Regenerate with: pnpm gen
 * (see auto/README.md for the pipeline and the applied post-fixes)
 */

`

writeFileSync(join(pkgRoot, 'src', 'render', 'render-scheduler.generated.ts'), schedHeader + schedOut)
console.log(
  '[gen] auto/render_scheduler.at -> src/render/render-scheduler.generated.ts (raw kept at auto/render_scheduler.raw.ts)'
)

// palette_map.at (plan 017 Phase 2): block type -> view panel spec, the
// single source of the panel vocabulary (see PANEL-ALIGNMENT.md). Pure data
// + total functions.
let paletteOut = transpile('palette_map')

// PP1: a2ts emits structs as classes but CALLS them without `new` (same
// emitter quirk streaming's JSONBlock fix hit). Convert to an interface +
// factory; call sites are all `return PanelSpec(...)`.
{
  const applyPalette = (label, fn) => {
    const next = fn(paletteOut)
    if (next === paletteOut) {
      console.error(`palette post-fix ${label} did not match anything; compiler output changed?`)
      process.exit(1)
    }
    paletteOut = next
  }
  applyPalette('PP1a', (s) =>
    s.replace(
      /export class PanelSpec \{[\s\S]*?\n\}/,
      [
        'export interface PanelSpec {',
        '    kind: string;',
        '    tag: string;',
        '    class_token: string;',
        '    registry: string;',
        '    extension: boolean;',
        '}',
        '',
        'function mkPanelSpec(kind: string, tag: string, class_token: string, registry: string, extension: boolean): PanelSpec {',
        '    return { kind, tag, class_token, registry, extension }',
        '}',
      ].join('\n')
    )
  )
  applyPalette('PP1b', (s) => s.split('return PanelSpec(').join('return mkPanelSpec('))
}

const paletteHeader = `/**
 * @autodown/engine — palette map (render layer).
 *
 * GENERATED FILE — do not edit by hand.
 * Source: auto/palette_map.at (Auto language). Regenerate with: pnpm gen:render
 * (see auto/README.md for the pipeline and the applied post-fixes)
 */

`

writeFileSync(join(pkgRoot, 'src', 'render', 'palette-map.generated.ts'), paletteHeader + paletteOut)
console.log(
  '[gen] auto/palette_map.at -> src/render/palette-map.generated.ts (raw kept at auto/palette_map.raw.ts)'
)

// palette_map.at -> rust (plan 019 Phase 1 / auto-lang plan-450 批次五):
// the same source is a2r-emitted into the autodown-core crate
// (packages/core/rust — standalone cargo crate, plan 016 Phase 4 pilot).
// `auto trans --path palette_map.at rust` writes the raw a2r next to the
// source (kept at palette_map.a2r.rs for inspection); the single post-fix
// RP1 makes the emitted struct public (a2r emits a private struct behind
// pub fns — private type in public interface). Cross-target parity is
// guarded by tests/palette_parity.rs against a TS-generated golden (see
// src/render/__tests__/rust-palette-parity-gen.test.ts).
execFileSync(autoExe, ['trans', '--path', join(here, 'palette_map.at'), 'rust'], {
  stdio: 'inherit',
})
let paletteRs = readFileSync(join(here, 'palette_map.a2r.rs'), 'utf8')
paletteRs = paletteRs.replace(
  '// Auto-generated by a2r transpiler\n\n#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]\nstruct PanelSpec {',
  [
    '// GENERATED FILE — do not edit by hand.',
    '// Source: packages/engine/auto/render/palette_map.at (Auto language, plan 017',
    '// Phase 2 — panel vocabulary single source, see PANEL-ALIGNMENT.md there).',
    '// Regenerate with: pnpm gen:render (auto/render/gen.mjs —',
    '// `auto trans --path palette_map.at rust` + RP1 pub-struct post-fix).',
    '// Cross-target parity: tests/palette_parity.rs asserts the TS emission\'s',
    '// golden projection (tests/golden/palette-map.golden.txt, rewritten by the',
    "// engine's rust-palette-parity-gen.test.ts on every `pnpm test`).",
    '',
    '#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]',
    'pub struct PanelSpec {',
  ].join('\n')
)
if (!paletteRs.includes('pub struct PanelSpec')) {
  console.error('rust post-fix RP1 did not match anything; compiler output changed?')
  process.exit(1)
}
writeFileSync(join(pkgRoot, '../core/rust/src/palette_map.rs'), paletteRs)
console.log(
  '[gen] auto/palette_map.at -> ../core/rust/src/palette_map.rs (raw kept at auto/palette_map.a2r.rs)'
)

// artifact_hash.at (plan 031 D5): the rendered-artifact cache key — FNV-1a
// 32 over the UTF-16 units of kind + U+0000 + source, key = kind:len:hex.
// Same .at source, two emissions; the UTF-16 unit materialization lives at
// the platform boundary (see the .at header): a charCodeAt wrapper in
// src/render/artifact-key.ts (TS) and an encode_utf16 wrapper appended to
// the rust emission below. Cross-target parity is guarded by the rust
// crate's tests/artifact_hash_parity.rs against a TS-generated golden (see
// src/render/__tests__/artifact-hash.test.ts).
const hashOut = transpile('artifact_hash')
// No TS post-fixes today: the .at source keeps every statement
// single-operator (the emitter drops parens on mixed-precedence arithmetic
// — see bitAt there), so the raw a2ts output is dependency-free TS.
const hashHeader = `/**
 * @autodown/engine — rendered-artifact cache key (render layer).
 *
 * GENERATED FILE — do not edit by hand.
 * Source: auto/artifact_hash.at (Auto language). Regenerate with: pnpm gen:render
 * (see auto/README.md for the pipeline and the applied post-fixes)
 */

`

writeFileSync(join(pkgRoot, 'src', 'render', 'artifact-hash.generated.ts'), hashHeader + hashOut)
console.log(
  '[gen] auto/artifact_hash.at -> src/render/artifact-hash.generated.ts (raw kept at auto/artifact_hash.raw.ts)'
)

// artifact_hash.at -> rust: `auto trans --path artifact_hash.at rust` (raw
// kept at artifact_hash.a2r.rs); the single post-fix RP2 appends the
// hand-written UTF-16 wrapper (encode_utf16 — the rust side of the unit
// materialization the .at source cannot express).
execFileSync(autoExe, ['trans', '--path', join(here, 'artifact_hash.at'), 'rust'], {
  stdio: 'inherit',
})
let hashRs = readFileSync(join(here, 'artifact_hash.a2r.rs'), 'utf8')
hashRs = hashRs.replace(
  '// Auto-generated by a2r transpiler\n',
  [
    '// GENERATED FILE — do not edit by hand.',
    '// Source: packages/engine/auto/render/artifact_hash.at (Auto language, plan',
    '// 031 D5 — rendered-artifact cache key single source). Regenerate with:',
    '// pnpm gen:render (auto/render/gen.mjs — `auto trans --path artifact_hash.at',
    '// rust` + RP2 encode_utf16 wrapper append). Cross-target parity:',
    '// tests/artifact_hash_parity.rs asserts the TS emission\'s golden',
    '// projection (tests/golden/artifact-hash.golden.txt, rewritten by the',
    "// engine's artifact-hash.test.ts on every `pnpm test`).",
    '',
  ].join('\n')
)
const RP2_WRAPPER = `

// RP2 (plan 031): hand-written platform wrapper — the UTF-16 unit
// materialization the .at source cannot express (encode_utf16 matches the
// TS side's charCodeAt loop by construction; UTF-16 is the common
// denominator both targets encode identically).
pub fn artifact_hash(kind: &str, source: &str) -> String {
    let mut units: Vec<i64> = kind.encode_utf16().map(i64::from).collect();
    units.push(0);
    units.extend(source.encode_utf16().map(i64::from));
    let source_len = source.encode_utf16().count() as i64;
    artifactKeyOf(kind, source_len, units)
}
`
if (!hashRs.startsWith('// GENERATED FILE')) {
  console.error('rust post-fix RP2 header did not match anything; compiler output changed?')
  process.exit(1)
}
if (hashRs.includes('pub fn artifact_hash(')) {
  console.error('rust post-fix RP2 wrapper already present; double append?')
  process.exit(1)
}
hashRs = hashRs + RP2_WRAPPER
writeFileSync(join(pkgRoot, '../core/rust/src/artifact_hash.rs'), hashRs)
console.log(
  '[gen] auto/artifact_hash.at -> ../core/rust/src/artifact_hash.rs (raw kept at auto/artifact_hash.a2r.rs)'
)
