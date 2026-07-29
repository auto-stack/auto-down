# Auto source of `@autodown/core`

`src/index.ts` is **generated from Auto source** — do not edit it by hand.

- `ial.at` — the Auto language source of the IAL (Inline Attribute List) utilities
  (`TableAttr`, `preprocessMarkdown`, `buildIAL`, `formatValue`, `formatArray`,
  `hasAnyValue`; `parseValue`/`parseArray` stay internal, same as before).
- `gen.mjs` — build pipeline: runs `auto trans --path auto/ial.at ts`, keeps the raw
  compiler output at `ial.raw.ts`, applies the documented post-fixes (listed at the
  top of `gen.mjs`), and writes `src/index.ts`.
- `index.handwritten.ts.bak` — the original hand-written `src/index.ts`, kept for
  reference/comparison only (not compiled, not imported).

## Regenerate

```bash
cd packages/core
pnpm gen        # = node auto/gen.mjs
pnpm build      # = tsc, emits dist/
```

The Auto compiler binary comes from a local checkout of the auto-lang repo
(`D:/autostack/auto-lang`); override with `AUTO_EXE=/path/to/auto.exe`.

## Known a2ts (Auto -> TypeScript backend) gaps worked around here

- No `export` keyword is emitted for top-level declarations (post-fix F2).
- No regex literal syntax; `RegExp(pattern, flags)` calls pass through as plain JS,
  so patterns are expressed as strings (see `ial.at`).
- `List<int?>` maps to `number | null[]` instead of `(number | null)[]` (post-fix F1).
- Top-level `const` declarations are emitted inside a synthetic `main()`, so constants
  are inlined at their use sites in `ial.at`; the empty `main()` trailer is stripped
  (post-fix F5).
- `type X { ... }` becomes a TS `class` with a constructor, not an `interface`
  (post-fix F3).
- `parseInt` / `isNaN` / string methods (`.trim()/.split()/.replace()/.map()/.join()/.some()`)
  are not Auto builtins but pass through transparently to their JS equivalents.
