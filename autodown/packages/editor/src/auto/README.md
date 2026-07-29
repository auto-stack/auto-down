# Auto widget sources for @autodown/editor

`src/components/CodeLanguageIcon.vue` is generated from Auto language
widget DSL sources in this directory by the Auto compiler
(`D:/autostack/auto-lang`, binary `target/debug/auto.exe`).

## Layout

- `pac.at` — Auto project manifest (`scene: "ui"`, `render: "vue"`)
- `src/front/code_language_icon.at` — the `CodeLanguageIcon` widget
- `src/front/app.at` — placeholder root widget. The generator always emits
  the root widget as `App.vue`; secondary widgets land in
  `gen/front/vue/src/components/<Name>.vue`. The dummy App exists only so
  `CodeLanguageIcon` is generated as a standalone component SFC.
- `gen/` — transient generator output (gitignored, safe to delete)

## Regenerate

From `autodown/packages/editor`:

```sh
cd src/auto
D:/autostack/auto-lang/target/debug/auto.exe build -d .
cd ..
cp src/auto/gen/front/vue/src/components/CodeLanguageIcon.vue src/components/CodeLanguageIcon.vue
```

（注意：`-d` 只接受项目目录本身（如 `-d .`），从包根 `-d src/auto` 会报
"pac.at not found in workspace"。）

`auto build` also runs `pnpm install` + `vue-tsc` + `vite build` inside
`src/auto/gen/front/vue` (a self-contained project, not part of the
autodown pnpm workspace), which type-checks the generated SFC.

## Known Auto language gaps (as of 2026-07, compiler not patched)

1. **No import of hand-written TS from widget code.** `use` only covers
   Auto stores/types and `back.api`; plain-function sibling `.at` modules
   are not transpiled for the `ui` scene, and there is no raw-TS escape
   hatch. Therefore `getLanguageIconUrl` from
   `src/utils/codeBlockLanguage.ts` is **reimplemented** in
   `code_language_icon.at` instead of imported. Keep the two in sync.
2. **`computed` expressions are too limited for this logic** (bare
   identifiers and plain function calls like `btoa(x)` fail to parse;
   `.prop` refs mis-generate as `self.prop`; object literals and string
   concatenation mis-codegen), and the DSL has **no `watch`**, so the
   original's reactive `computed(() => ...)` is approximated by computing
   the URL once in `.Init` (-> `onMounted`). A `language` prop change
   after mount will not update the icon (the prop is static per code
   block in practice).
3. Browser globals used by generated code: `btoa` (passes through the
   a2ts transpiler verbatim; typed by TS DOM lib).

Minor generated-output differences vs the original hand-written SFC
(behaviorally identical DOM):

- `width`/`height` are emitted as bound attributes (`:width="16"`).
- An empty `defineEmits<{}>()` and an empty `<style>` block are emitted.
