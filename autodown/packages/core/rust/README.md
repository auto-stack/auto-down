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

# block_model / serializer — manual trans + copy:
cd packages/core/auto
D:/autostack/auto-lang/target/debug/auto.exe trans --path block_model.at rust
D:/autostack/auto-lang/target/debug/auto.exe trans --path serializer.at rust
cp block_model.a2r.rs ../rust/src/block_model.rs
cp serializer.a2r.rs ../rust/src/serializer.rs
cd ../rust && cargo test
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
- The markdown parser (`markdown_parser.at`) is intentionally NOT in this
  crate: it uses RegExp passthroughs and `any` indexing, which a2r cannot
  handle yet (deferred to plan 019).
