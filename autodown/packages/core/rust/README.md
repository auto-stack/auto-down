# autodown-core (Rust pilot crate, plan 016 Phase 4)

Zero-dependency Rust crate emitted by the a2r backend from the .at single
sources of `@autodown/core`:

- `src/block_model.rs` ← `../auto/block_model.at` — block tree, selection, op
  set, `invertOp` undo inversion;
- `src/serializer.rs` ← `../auto/serializer.at` — block tree → `.ad` text.

Both modules are **generated** — do not edit by hand. The crate is standalone
(own `[workspace]`, own `target/`), not part of any enclosing cargo workspace.

## Regenerate

Requires a locally built auto compiler from the auto-lang checkout
(`D:/autostack/auto-lang`, branch with the plan-016 emitter fixes — see
`tmp/dsl-probes/plan016/REPORT.md` Phase 4 addendum):

```bash
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
  serialized by the TS emission (golden `tests/golden/parity.ad`, regenerated
  by `packages/core/src/__tests__/rust-parity-gen.test.ts` on every
  `pnpm test`) and by this crate; outputs must match byte for byte.

## Notes

- a2r maps Auto `str` params to `&str`, `List<T>` params/fields to owned
  `Vec<T>`, `int` to `i64`, `T?` to `Option<T>`. Enum variants with payloads
  are tuple variants; `Value::Null` is a unit variant (the a2ts side spells it
  `Value.Null()` — the emitter drops the parens for Rust).
- The markdown parser (`markdown_parser.at`) is intentionally NOT in this
  crate: it uses RegExp passthroughs and `any` indexing, which a2r cannot
  handle yet (deferred to plan 019).
