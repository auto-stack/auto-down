# autodown-core (Rust pilot crate, plan 016 Phase 4)

Zero-dependency Rust crate emitted by the a2r backend from the .at single
sources of `@autodown/core` (and, from plan 019 Phase 1 on, the engine's
dual-portable sources):

- `src/block_model.rs` ← `../auto/block_model.at` — block tree, selection, op
  set, `invertOp` undo inversion;
- `src/serializer.rs` ← `../auto/serializer.at` — block tree → `.ad` text;
- `src/palette_map.rs` ← `packages/engine/auto/render/palette_map.at`
  (plan 019 / auto-lang plan-450) — block type → panel spec, the panel
  vocabulary single source (see the engine's PANEL-ALIGNMENT.md); after the
  a2r emission this is the mapping single source for iced panel renderers.

All modules are **generated** — do not edit by hand. The crate is standalone
(own `[workspace]`, own `target/`), not part of any enclosing cargo workspace.

## Regenerate

Requires a locally built auto compiler from the auto-lang checkout
(`D:/autostack/auto-lang`, branch with the plan-016 emitter fixes — see
`tmp/dsl-probes/plan016/REPORT.md` Phase 4 addendum):

```bash
# palette_map — one command from the engine package (gen.mjs applies the
# RP1 pub-struct post-fix and writes into this crate):
cd packages/engine && pnpm gen:render

# block_model / serializer / ial / markdown_parser — manual trans + copy.
# NOTE (plan 019 Phase 1): the parser/ial sources need the a2r emitter
# fixes from auto-lang worktree feat/plan-019-a2r-parser (r# keyword
# escaping, String.fromCharCode, char-based str length/slice, split ->
# Vec<String>, NullCoalesce typing) — build that branch's auto.exe and use
# it here (AUTO_EXE or the explicit path below):
cd packages/engine/auto/parser
D:/autostack/auto-lang/worktree/plan-019-a2r/target/debug/auto.exe trans --path block_model.at rust
D:/autostack/auto-lang/worktree/plan-019-a2r/target/debug/auto.exe trans --path serializer.at rust
D:/autostack/auto-lang/worktree/plan-019-a2r/target/debug/auto.exe trans --path ial.at rust
D:/autostack/auto-lang/worktree/plan-019-a2r/target/debug/auto.exe trans --path markdown_parser.at rust
cp block_model.a2r.rs ../../../core/rust/src/block_model.rs
cp serializer.a2r.rs ../../../core/rust/src/serializer.rs
cp ial.a2r.rs ../../../core/rust/src/ial.rs
cp markdown_parser.a2r.rs ../../../core/rust/src/markdown_parser.rs
cd ../../../core/rust && cargo test
```

`use block_model: …` in serializer.at is resolved relative to the working
directory, so run the trans commands from `packages/core/auto/`.

## Tests

- `tests/smoke.rs` — four directed serialize cases (heading/paragraph/list,
  table+IAL, emit-ids, hardbreak+fence) with exact-text assertions;
- `tests/parity.rs` — cross-target parity: the same hand-constructed trees are
  serialized by the TS emission (golden `tests/golden/parity.ad`, checked in
  from the plan-016 session — its intended TS-side generator test was never
  committed) and by this crate; outputs must match byte for byte;
- `tests/parse_parity.rs` — parse_blocks cross-target parity (plan 019
  Phase 1): the golden `tests/golden/parse-blocks.golden.txt` is regenerated
  by the TS side (packages/engine/src/parser/__tests__/rust-parse-parity-gen.test.ts,
  runs on every engine `pnpm test`) and asserted here over a directed
  fixture corpus (blocks + inline + streaming modes); a mismatch means the
  a2ts and a2r emissions of the same markdown_parser.at have drifted;
- `tests/palette_parity.rs` — palette-map cross-target parity (plan 019 /
  plan-450): the golden `tests/golden/palette-map.golden.txt` is regenerated
  by the TS side (`packages/engine/src/render/__tests__/rust-palette-parity-gen.test.ts`,
  runs on every engine `pnpm test`) and asserted here; a mismatch means the
  a2ts and a2r emissions of the same palette_map.at have drifted.

## Notes

- a2r maps Auto `str` params to `&str`, `List<T>` params/fields to owned
  `Vec<T>`, `int` to `i64`, `T?` to `Option<T>`. Enum variants with payloads
  are tuple variants; `Value::Null` is a unit variant (the a2ts side spells it
  `Value.Null()` — the emitter drops the parens for Rust).
- The markdown parser (`markdown_parser.at`) IS in this crate since plan
  019 Phase 1: the weak-tree layer was retyped (WNode structs + manual
  character scans, no RegExp/`any`) so a2r can emit it. Registered
  divergences: isPunctuation approximates \p{P} (ASCII + Latin-1 + General
  Punctuation + CJK + fullwidth ranges); the table+IAL line scan requires
  rows at column 0. str length/slice count CHARS (Auto code-unit semantics)
  — O(n) per call, an accepted v1 perf debt.
