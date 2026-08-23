# Auto sources of `@autodown/vue` (plan 008, Phase 1)

The streaming segmentation and table normalization logic of this package is
**generated from Auto language sources** — the hand-written TS versions were
retired in plan 008 Phase 1 after parity was proven.

## Layout

In this directory:

- `streaming.at` — streaming document segmentation (the former
  `useStreamingDocument.ts` logic: partial-JSON repair, ```json fence
  scanning, component-type detection, sticky props cache, `buildSegments`).
- `streaming_table.at` — StreamingTable prop normalization (the former
  `columns ?? []` / `rows ?? []` script logic, as `normalizeTableProps`).
- `gen.mjs` — build pipeline: runs `auto trans` per source, keeps the raw
  compiler output at `*.raw.ts` for inspection, applies the documented
  post-fixes (listed at the top of `gen.mjs`), and writes the generated files.
- `streaming.raw.ts` / `streaming_table.raw.ts` — raw compiler output, kept
  for inspection only (not compiled, not imported).

On the `src/` side (generated or bridge — do not edit by hand):

- `src/streaming.generated.ts` ← `streaming.at` (post-fixes P1–P3)
- `src/streaming-table.generated.ts` ← `streaming_table.at` (no post-fixes today)
- `src/auto-helpers.ts` — **hand-written** JS-semantic bridge (try/catch,
  `typeof`, truthiness) imported by the generated code via `use helpers:`.
  This is the only place where JS-only semantics live; everything else is
  in the `.at` sources.

`src/useStreamingDocument.ts` (Vue reactivity shell) and
`src/StreamingTable.vue` (SFC) consume the generated modules; the package's
public exports are unchanged.

## Regenerate

```bash
cd packages/vue
pnpm gen        # = node auto/gen.mjs
pnpm build      # = vue-tsc -b && vite build
pnpm test       # parity tests must stay green
```

The Auto compiler binary comes from a local checkout of the auto-lang repo
(`D:/autostack/auto-lang`); override with `AUTO_EXE=/path/to/auto.exe`.

## Parity

`src/__tests__/streaming-parity.test.ts` asserts behavioral equivalence
between the generated implementation and the retired hand-written one
(kept verbatim at `src/__tests__/legacy-streaming.ts` for as long as it is
useful): directed edge cases plus character-by-character prefix scans of
the musk render fixtures (`src/__tests__/fixtures/*.md`, copied from
auto-musk `scripts/lib-parity/fixtures/render/`). Both modules keep their
own sticky-props cache; the prefix scans feed both the same input sequence,
so cache evolution is compared too.

## a2ts notes beyond the core (packages/core/auto/README.md) channel

Newer compiler builds already export top-level `fn`/`type` and keep top-level
`var` at module scope (core's F2/F5 post-fixes are obsolete here). What
still required workarounds in `streaming.at`:

- try/catch, `throw` — not transpilable → `safeJsonParse` bridge
- `typeof` → `typeOf` bridge; truthiness coercion (`value &&`) → `isTruthy`
- object rest destructuring (`const { type, ...props }`) does not parse →
  explicit copy loop skipping the key
- `new Set` / `new Map` do not parse → array + `.includes()` / plain
  `Record` object
- ternaries and if-expressions → pre-declared `var` + if/else
- no union types → segment union injected by post-fix P3
- `use helpers:` maps to a bare `import { ... } from "helpers"` → path
  rewritten to `./auto-helpers` by post-fix P1
- parentheses are dropped around nested binary expressions → intermediate
  variables wherever grouping matters (e.g. the closer-bracket checks)
- `==`/`!=` are emitted as loose equality — deliberate: `x == nil` is used
  as the nullish check (`null` or `undefined`), matching `??` semantics

Method calls pass through verbatim, so the `.at` sources use TS method names
(`.length`, `.startsWith()`, `.slice()`, `.indexOf()`), never Rust-style ones.
