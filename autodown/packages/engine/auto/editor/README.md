# Auto widget sources of the editor chrome layer (plan 021 Phase 1)

The 14 widget `.at` sources + 7 ext TS bridges of the editor component layer
(plan 013 asset, deleted in plan 018 Phase 4 / c7364cd) restored from git
history (`c7364cd^`, path `src/editor/auto/src/front/`). New layout is flat,
level with `auto/parser/` and `auto/render/` — no longer buried under
`src/editor/auto/`.

## Layout

- `pac.at` — Auto project manifest (`scene: "ui"`, `render: "vue"`). REQUIRED:
  the widget DSL only compiles in project mode (`auto build`), and the vue
  backend validates this manifest. Restored verbatim from history.
- `*.at` — the 14 widget sources: `app.at` (mandatory placeholder root; the
  generator always emits the root widget as `App.vue`, its output is
  discarded), `auto_down_editor.at` (assembly component), the four menus
  (`slash_menu` / `bubble_menu` / `table_menu` / `code_block_menu`),
  `code_language_icon.at`, and the seven node views
  (`details` / `wiki_link` / `query_block` / `block_embed` / `mermaid` /
  `math_block` / `math_inline`).
- `ext/*.ts` — the 7 hand-written TS extension bridges (Tiptap-era
  implementations, restored verbatim; **retargeting to the engine interfaces
  is Phase 2**). Widget `use { ... }` paths were mechanically rewritten from
  `src/front/utils/<name>_ext.ts` to `ext/<name>_ext.ts` for the new layout —
  the only source-level change vs the restored originals.
- `gen.mjs` — the Phase 1 pipeline (see its header comment). Stages a
  transient `auto build --gen-only --lenient` project under `gen/_stage/`,
  harvests emitted SFCs into the isolated `gen/components/` area and the
  validation census into `gen/validation.log`. **Never writes into `src/`.**
- `gen/` — transient generator output (gitignored, safe to delete).
- `README.plan013.md` — the plan 013/017-era README restored verbatim from
  `c7364cd^`: full workaround/capability notes for the widget set. Its
  Layout/Regenerate sections describe the OLD pipeline
  (`src/editor/auto/gen/regen.sh`, never committed); kept as reference only.

## Metadata decisions (plan 021 Phase 1)

- `pac.at` — **restored**: `auto build` refuses to run without it.
- `.am/` (auto-man state: `pac.atom.at`, `state.at`) — **NOT restored**:
  tool-managed cache state, regenerated into the stage dir on every build and
  discarded with it. The parser/render gen pipelines don't carry it either.
- `stubs/` (10 gen-project shims: `gen_tiptap*.ts`, `gen_menus/*.vue`,
  `gen_renderPreview.ts`, ...) — **NOT restored**: they existed only to
  satisfy the old gated build's in-gen-project `vue-tsc` type-check, which
  `--gen-only` skips. Recoverable from `c7364cd^` if a future phase
  reinstates a type-check gate.

## Regenerate

```bash
cd packages/engine
pnpm gen:editor      # = node auto/editor/gen.mjs
```

Compiler: `D:/autostack/auto-lang/target/debug/auto.exe` (auto-lang master;
override with `AUTO_EXE`). Known flakiness: the build intermittently exits 1
silently after the validation phase without emitting — `gen.mjs` detects the
missing output and retries once.

Phase 1 status: all 14 widgets emit; diffs vs the last deployed products
(`c7364cd^` `src/editor/...`) are limited to the ext import specifier lines
(`@/ext/ext/<name>_ext`, E1 rewrite pending Phase 2). See the compile
inventory in `docs/plans/021-editor-ui-re-auto-ization.md` 附录 A.
