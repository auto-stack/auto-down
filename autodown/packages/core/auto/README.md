# Auto source of `@autodown/core`

`src/ial.ts`, `src/block-model.ts` and `src/markdown-parser.ts` are
**generated from Auto source** — do not edit them by hand. `src/index.ts` is a
generated pure re-export barrel (`export * from` the three modules).

- `ial.at` — the Auto language source of the IAL (Inline Attribute List) utilities
  (`TableAttr`, `preprocessMarkdown`, `buildIAL`, `formatValue`, `formatArray`,
  `hasAnyValue`; `parseValue`/`parseArray` stay internal, same as before).
- `block_model.at` — the unified block model (plan 016 Phase 1): `BlockNode` /
  `InlineSpan` / `Mark` / `BlockType` / `Attr` / `Value` / `BlockPos` /
  `Selection`, tree lookup/surgery helpers, the `Op` operation set
  (`InsertText`/`SplitBlock`/`MergeBlocks`/`SetBlockType`/`LiftBlock`/`WrapBlock`/
  `ReplaceRange`) as pure functions (`applyOp`), and `invertOp` for undo.
  Generated to `src/block-model.ts`.
- `markdown_parser.at` — the incremental markdown parser (plan 016 Phase 2,
  moved here from `packages/vue/auto`): unchanged weak-tree `parseDocument`
  (byte-identical legacy behavior, no IAL), plus a strong typed-tree output
  layer appended at the end of the file: `parse_blocks(src, isFinal)` runs
  `preprocessMarkdown` as a pre-step, converts the weak tree to `BlockNode`
  (`convertBlock`/`convertInlines`/table converters), attaches extracted IAL
  table attrs to top-level `Table` blocks (`ial` attr, `AttrsV[cols, rows]`,
  `int?` nulls → `Value.Null`), and assigns editor-convention block ids
  (`^anchor` wins, else `block-<i>` top-level / `<parent>-<j>` nested).
  Generated to `src/markdown-parser.ts`; post-fix M1 rewrites the
  `use block_model:` / `use ial:` imports to `./block-model.js` / `./ial.js`
  and hoists them to the top of the file, plus B1 (struct-`new`).
- `serializer.at` — block tree → `.ad` text (plan 016 Phase 3):
  `serialize(root, emitIds)` / `serializeBlocks(blocks, emitIds)`. Covers the
  plan-008 whitelist set plus structural placeholders for the extended blocks
  (`$callout(type: …) {…}` / `$details(…)` / `[[wikilink]]` / `$query(…)` /
  `$embed(…)` / mermaid fence / `%{…}%` math). Re-emits table IAL in the
  exact `preprocessMarkdown` shape (ialText mirrors `buildIAL`; reimplemented
  so the serializer depends on block_model ONLY and stays in the a2r-clean
  Phase 4 subset). Multi-line (setext) headings round-trip as setext.
  Roundtrip-pinned by `src/__tests__/serializer-roundtrip.test.ts` (three
  layers: semantic equivalence / byte-stable snapshots / BlockId roundtrip).
  Post-fixes: M1 (shared helper `hoistUseImports`), B1 lenient.
- `gen.mjs` — build pipeline: runs `auto trans --path auto/X.at ts` per source,
  keeps the raw compiler output at `X.raw.ts`, applies the documented post-fixes
  (listed at the top of `gen.mjs`), writes `src/*.ts` and the `src/index.ts`
  barrel (a barrel, not a module the parser imports — avoids an ESM cycle).
- `index.handwritten.ts.bak` — the original hand-written `src/index.ts`, kept for
  reference/comparison only (not compiled, not imported).

## Regenerate

```bash
cd packages/core
pnpm gen        # = node auto/gen.mjs
pnpm build      # = tsc, emits dist/ (src/__tests__ excluded from the build)
pnpm test       # = vitest run (block-model 43 + block-parser 15
                #   + serializer-roundtrip 46 = 104)
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
  (ial.at and markdown_parser.at only — block_model.at avoids them for a2r
  compatibility; the parser is a2ts-only territory, it also reads the weak tree
  via `any` indexing which a2r cannot do).

## Parser migration note (plan 016 Phase 2)

`markdown_parser.at` lived in `packages/vue/auto/` under plan 008 and moved
here in plan 016 Phase 2 so both the vue renderer and the editor share one
parser. The vue package keeps `src/markdown-parser.generated.ts` as a
hand-maintained redirect (`export { parseDocument } from '@autodown/core'`) so
existing import sites did not change; the vue parity suite (43 cases) now
exercises the core build through that redirect. `parse_blocks` is the new
strong-typed entry; its invariants are pinned by
`src/__tests__/block-parser.test.ts`.
