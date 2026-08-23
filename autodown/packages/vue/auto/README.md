# Auto sources of `@autodown/vue` (plan 008, Phase 1)

The streaming segmentation, table normalization, markdown parsing, and
render scheduling logic of this package is **generated from Auto language
sources** — the hand-written TS versions were retired in plan 008 after
parity was proven. Since Phase 3 the package also renders markdown itself
(`MarkdownRender.vue` + `render-node.ts` + `use-render-scheduler.ts` are
hand-written Vue layers over the generated logic); markstream-vue is no
longer a dependency.

## Layout

In this directory:

- `streaming.at` — streaming document segmentation (the former
  `useStreamingDocument.ts` logic: partial-JSON repair, ```json fence
  scanning, component-type detection, sticky props cache, `buildSegments`).
- `streaming_table.at` — StreamingTable prop normalization (the former
  `columns ?? []` / `rows ?? []` script logic, as `normalizeTableProps`).
- `markdown_parser.at` — incremental markdown parser (plan 008, Phase 2):
  semantic subset of stream-markdown-parser 0.0.95 — blocks heading(ATX+
  setext)/paragraph/fence(+loading)/blockquote/list(ul/ol/start/nested/
  lazy/empty item)/thematic_break/table(+streaming pre-parse), inline
  text/strong/emphasis/inline_code/link/image/strikethrough/hardbreak,
  typographer smart quotes, streaming tail-fragment trimming (dangling
  `(`/`*`/`|`/html-like/`- ` markers), loading-link href extraction.
  Parity: `src/__tests__/markdown-parity.test.ts` asserts deep equality
  with the real package under a documented semantic projection (raw/
  center/text/diff/maybeCheckbox/startLine/endLine/attrs dropped,
  undefined-valued keys dropped) — directed cases × 2 modes, 5 musk
  fixtures × 2 modes, and character-by-character streaming prefix scans.
  Out of subset (whitelisted): math, footnotes, mark/sub/sup/insert,
  `:::` containers, html blocks, linkify, the escapes-become-emphasis
  quirk, indented code (stays a paragraph, matching the reference's
  fixIndentedCodeBlock).
- `render_scheduler.at` — render scheduling decisions (Phase 3 batch B):
  batch progression (`nextBatchCount`), max-live-nodes windowing
  (`liveWindowStart`), typewriter stepping (`typewriterNextChars`). Pure
  math only — time comes from an injectable timer port
  (`useRenderScheduler` in src/, VM backends supply their own adapter).
- `gen.mjs` — build pipeline: runs `auto trans` per source, keeps the raw
  compiler output at `*.raw.ts` for inspection, applies the documented
  post-fixes (listed at the top of `gen.mjs`), and writes the generated files.
- `streaming.raw.ts` / `streaming_table.raw.ts` / `markdown_parser.raw.ts` —
  raw compiler output, kept for inspection only (not compiled, not imported).

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

## a2ts gaps first hit by markdown_parser.at (Phase 2)

- `let` transpiles to TS `const` — reassignable locals must be declared `var`
- a bare `return` in a void function emits `return null;` (invalid TS) —
  restructure with conditionals instead of early returns
- string literals cannot contain curly quotes or other non-CJK "unknown
  characters" — build them from `String.fromCharCode(code)` (see
  CURLY_LDQUO etc.); likewise sentinel escapes via fromCharCode
- `\uXXXX` escapes are NOT supported in Auto string literals (lexer error)
- `s[i]` on a string sometimes annotates as `number` in the output — use
  `s.charAt(i)` when the value feeds a typed comparison
- `String.raw`-style patterns are unavailable; keep regex patterns
  double-escaped (`"\\p{P}"`) — they pass through to JS RegExp verbatim,
  including the `u` flag and property escapes
