# Auto source of `@autodown/core`

`src/index.ts` and `src/block-model.ts` are **generated from Auto source** — do not
edit them by hand.

- `ial.at` — the Auto language source of the IAL (Inline Attribute List) utilities
  (`TableAttr`, `preprocessMarkdown`, `buildIAL`, `formatValue`, `formatArray`,
  `hasAnyValue`; `parseValue`/`parseArray` stay internal, same as before).
- `block_model.at` — the unified block model (plan 016 Phase 1): `BlockNode` /
  `InlineSpan` / `Mark` / `BlockType` / `Attr` / `Value` / `BlockPos` /
  `Selection`, tree lookup/surgery helpers, the `Op` operation set
  (`InsertText`/`SplitBlock`/`MergeBlocks`/`SetBlockType`/`LiftBlock`/`WrapBlock`/
  `ReplaceRange`) as pure functions (`applyOp`), and `invertOp` for undo.
  Generated to `src/block-model.ts`; `src/index.ts` re-exports it.
- `gen.mjs` — build pipeline: runs `auto trans --path auto/X.at ts` per source,
  keeps the raw compiler output at `X.raw.ts`, applies the documented post-fixes
  (listed at the top of `gen.mjs`), and writes `src/*.ts`.
- `index.handwritten.ts.bak` — the original hand-written `src/index.ts`, kept for
  reference/comparison only (not compiled, not imported).

## Regenerate

```bash
cd packages/core
pnpm gen        # = node auto/gen.mjs
pnpm build      # = tsc, emits dist/ (src/__tests__ excluded from the build)
pnpm test       # = vitest run (src/__tests__/block-model.test.ts)
```

The Auto compiler binary comes from a local checkout of the auto-lang repo
(`D:/autostack/auto-lang`); override with `AUTO_EXE=/path/to/auto.exe`.

## Compiler drift note (2026-08-25)

Current auto.exe (auto-lang master bd629c7a) natively emits `export` keywords and
parenthesized union arrays, so the old F1/F2 post-fixes were retired; the
`main()` trailer strip (F5) is moot for sources without a `main`. Remaining ial
post-fixes: I1 (class→interface `TableAttr`), I2 (precise `preprocessMarkdown`
return type). Remaining block_model post-fixes: B1 (struct constructions outside
argument position miss `new` → inserted by regex), B2 (`const enum` → `enum` for
isolatedModules safety).

## Dual-emission discipline (block_model.at)

`block_model.at` is written to compile through BOTH a2ts (acceptance here) and
a2r (plan 016 Phase 4 rust crate). The rules are documented at the top of the
.at file and verified by `tmp/dsl-probes/plan016/` probes; highlights:

- enum payloads in paren form; `Op` variants carry single-field payload structs
  (a2ts emits broken multi-arg calls for multi-payload variants);
- no `else ->` arm in `is` (broken in a2ts); no `is` on optionals (consume via
  `??` on plain identifiers);
- attrs are `List<Attr>` and marks `List<Mark>` — deliberately NOT
  `Map<str, Value>`/`Set<Mark>` from the docs/09 §5.1 sketch: a2ts maps `Map`
  to `Record` but passes `.contains` through unmapped, and a2r cannot index
  maps (probe A3). List scans over tiny sets are portable on both targets;
- string ops restricted to `.slice(a, b)` / `.length` / `+` / `==`;
- `.length.to(int)` wherever a length feeds arithmetic or `<`;
- field names avoid Rust keywords (`kind`, not `type`).

## Known a2r (Auto -> Rust backend) gaps remaining against block_model.at

`auto trans --path auto/block_model.at rust` emits, but `cargo check` still
reports 24 errors in two emitter-bug classes (both small, localized auto-lang
fixes — see tmp/dsl-probes/plan016/REPORT.md addendum):

- R1 (21× E0308): `String` struct-enum field args (match-binding dot chains like
  `a.aId`, `a.text`) miss the `.as_str()`/borrow treatment that plain locals get;
- R4 (2× E0382): an owned `Vec` local passed as a fn arg inside a loop is moved
  instead of cloned (`repl` in `spliceChildren`/`spliceRange` recursion).

## Known a2ts (Auto -> TypeScript backend) gaps worked around here

- No regex literal syntax; `RegExp(pattern, flags)` calls pass through as plain JS,
  so patterns are expressed as strings (see `ial.at`).
- `type X { ... }` becomes a TS `class` with a constructor, not an `interface`
  (post-fix I1 for `TableAttr`; block-model keeps the generated classes).
- `parseInt` / `isNaN` / string methods (`.trim()/.split()/.replace()/.map()/.join()/.some()`)
  are not Auto builtins but pass through transparently to their JS equivalents
  (ial.at only — block_model.at avoids them for a2r compatibility).
