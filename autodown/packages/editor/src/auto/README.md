# Auto widget sources for @autodown/editor

`src/components/CodeLanguageIcon.vue`, `src/menus/SlashMenu.vue`,
`src/menus/BubbleMenu.vue`, `src/menus/TableMenu.vue`,
`src/menus/CodeBlockMenu.vue`, the seven node views
`src/node-views/DetailsNodeView.vue`, `WikiLinkNodeView.vue`,
`QueryBlockNodeView.vue`, `BlockEmbedNodeView.vue`,
`MermaidNodeView.vue`, `MathBlockNodeView.vue`,
`MathInlineNodeView.vue` and the top-level assembly component
`src/core/AutoDownEditor.vue` are
generated from Auto language widget DSL sources in this directory by the
Auto compiler. The original fully hand-written version is kept as
`src/core/AutoDownEditor.vue.bak`. Since plan 013 Phase 2 the editor
package's Vue component layer is 100% Auto-generated — the hand-written
shell and the `AutoDownEditorInner.vue` split are gone (Tiptap
extensions and CSS stay hand-written by design).

**Compiler**: use the worktree binary
`D:/autostack/auto-lang/.worktree/auto-down/target/debug/auto.exe`
(branch `auto-down`). It carries the plan 013 Phase 2 quoted-msg-variant
fix (`quoted` variants are always declared in `defineEmits` and always
tail-emit, even when self-called with no view reference — commit
`ecc9c841`, pending merge back to auto-lang master by the auto-lang
side). The master binary still works for every other widget but will
mis-compile `auto_down_editor.at` (missing emit declarations).

**Workaround status (2026-08-19, post plan 013)**: the widget set is
fully migrated to native DSL capabilities — plan 013 Phase 0.3 re-probed
every workaround (12 of 13 now native), Phase 1 migrated the widgets off
the retired ones (`show:`, `html:`, ternary/`??` computeds, real
`async`/`try`/`catch`, extension-imported `getLanguageIconUrl`), and
Phase 2 eliminated the AutoDownEditor shell (quoted msg variants carry
the lowercase/hyphenated emit contract; `expose {}` + named slots +
withDefaults runtime defaults are all native). The plan 013 follow-up
then fixed the last two confirmed compiler bugs on the auto-lang
`auto-down` branch: **dropped parentheses** (probe 09 — emitters now
re-derive parens from precedence/associativity, capability-locked by
`cap_bina_parens_*`) and the **mis-typed `computed<boolean>` for
standalone `||`/`&&`** (probe 14 — operand-type inference now,
`cap_logical_computed_infers_operand_type`), so `strOr`/`orNull` are
deleted from the extensions and all seven node views use native `||`.
**Current true residue**:

- **Ternary condition `==/!= ""` collapses to `!`/`!!`** (probe 14③) —
  deliberate PLAN-026 semantics (`undefined !== ''` misjudged missing
  fields; `!!x` covers null/undefined/empty alike). Not a bug, but mind
  it when porting a literal `x !== ''` check.
- Tooltip/title spread merges route through extensions (object spread
  in a computed is unverified).
- Statement-initial dot needs a blank line before it (the parser glues
  `foo\n.bar` onto the previous statement) — seen in the save relay.

Individual workaround notes below are the 2026-07 baseline, kept for
reference; the migrated ones are marked RETIRED.

## Layout

- `pac.at` — Auto project manifest (`scene: "ui"`, `render: "vue"`)
- `src/front/code_language_icon.at` — the `CodeLanguageIcon` widget
- `src/front/slash_menu.at` — the `SlashMenu` widget (port of the original
  hand-written `src/menus/SlashMenu.vue`, kept as `src/menus/SlashMenu.vue.bak`)
- `src/front/bubble_menu.at` — the `BubbleMenu` widget (port of the original
  hand-written `src/menus/BubbleMenu.vue`, kept as
  `src/menus/BubbleMenu.vue.bak`)
- `src/front/table_menu.at` — the `TableMenu` widget (port of the original
  hand-written `src/menus/TableMenu.vue`, kept as
  `src/menus/TableMenu.vue.bak`)
- `src/front/code_block_menu.at` — the `CodeBlockMenu` widget (port of the
  original hand-written `src/menus/CodeBlockMenu.vue`, kept as
  `src/menus/CodeBlockMenu.vue.bak`)
- `src/front/details_node_view.at` — the `DetailsNodeView` widget (port of
  the original hand-written `src/node-views/DetailsNodeView.vue`, kept as
  `src/node-views/DetailsNodeView.vue.bak`)
- `src/front/wiki_link_node_view.at` — the `WikiLinkNodeView` widget (port,
  original kept as `src/node-views/WikiLinkNodeView.vue.bak`)
- `src/front/query_block_node_view.at` — the `QueryBlockNodeView` widget
  (port, original kept as `src/node-views/QueryBlockNodeView.vue.bak`)
- `src/front/block_embed_node_view.at` — the `BlockEmbedNodeView` widget
  (port, original kept as `src/node-views/BlockEmbedNodeView.vue.bak`)
- `src/front/mermaid_node_view.at` — the `MermaidNodeView` widget (port,
  original kept as `src/node-views/MermaidNodeView.vue.bak`)
- `src/front/math_block_node_view.at` — the `MathBlockNodeView` widget
  (port, original kept as `src/node-views/MathBlockNodeView.vue.bak`)
- `src/front/math_inline_node_view.at` — the `MathInlineNodeView` widget
  (port, original kept as `src/node-views/MathInlineNodeView.vue.bak`)
- `src/front/auto_down_editor.at` — the `AutoDownEditor` widget (port
  of the original hand-written `src/core/AutoDownEditor.vue` assembly
  component, kept as `src/core/AutoDownEditor.vue.bak`). The generated
  SFC IS the public component — it deploys straight to
  `src/core/AutoDownEditor.vue` with the full contract (props with
  runtime defaults, the seven quoted lowercase/hyphenated emits, named
  slots, `expose { handleSave, getBlockMap }`) — see the AutoDownEditor
  section below.
- `src/composables/renderPreview.ts` (editor tree) — the real KaTeX /
  Mermaid preview rendering for the three render-type node views
  (`renderKatexPreview`, `renderMermaidPreview`): the npm library calls
  and the try/catch error paths genuinely cannot live in the DSL (the
  imperative v-html filler `setInnerHTML` was retired in plan 013 Phase 1
  — the DSL's native `html:` binding replaced it). Re-exported through
  `utils/node_view_ext.ts` via a `../../../../composables/...` path that
  resolves in both trees (same trick as `tiptapNodeView`).
- `stubs/gen_renderPreview.ts` — gen-project stub for that module (the
  gen project has no katex/mermaid dependency), mirrored into
  `gen/front/vue/src/composables/renderPreview.ts` by the regen script.
  Never ships.
- `src/front/utils/node_view_ext.ts` — hand-written TS extension shared by
  the seven node-view widgets: the tiptap `NodeViewWrapper`/`NodeViewContent`
  re-exports (dual-resolution shim, same trick as the BubbleMenu wrapper),
  the `[[title#blockId]]` regex parser (the DSL has no regex literals), the
  WikiLink Pencil / Details inline-SVG edit icons (rendered via `dyn`),
  `normalizeQueryResults` (per-item template fallbacks/interpolations are
  not expressible in the view), `errorMessage` (TS types
  catch params `unknown`; the DSL has no casts) and
  `focusAndSelect` (DSL template refs are typed `HTMLElement`; `.select()`
  needs an input element and there is no cast), and the
  `renderKatexPreview`/`renderMermaidPreview` re-exports
  from `src/composables/renderPreview.ts` for the three render-type node
  views (same dual-resolution shim). See the extension's header
  comment and the NodeView section below.
- `src/composables/tiptapNodeView.ts` (editor tree) — the real re-export
  of `NodeViewWrapper`/`NodeViewContent` from `@tiptap/vue-3`. The node-view
  extension imports it via a `../../../../composables/...` path that
  resolves in both trees (same trick as `tiptapBubbleMenu`).
- `stubs/gen_tiptapNodeView.ts` — gen-project stub for that module,
  mirrored into `gen/front/vue/src/composables/tiptapNodeView.ts` by the
  regen script. Never ships: the copied node-view SFCs resolve the real
  module in the editor tree.
- `src/front/utils/slash_menu_ext.ts` — hand-written TS extension imported
  by `slash_menu.at` via `use { fn: ... }`. Only one thing remains (a
  genuine DSL limitation — see the SlashMenu section below): the
  `computeMenuPosition` re-export from the real
  `src/composables/useMenuBounds.ts` (single source of truth; a `use` path
  cannot leave `src/`). Everything else (filtering, two-phase positioning,
  scroll-into-view, `markHandled`, command dispatch, the
  `noResultsText ?? 'No results'` fallback) lives in the widget DSL
  itself. It is shared verbatim between the Auto gen project and the
  editor package build.
- `src/front/utils/bubble_menu_ext.ts` — hand-written TS extension for
  `bubble_menu.at`: the tiptap `BubbleMenu` wrapper re-export (as
  `TiptapBubbleMenu`), the static lucide icon set (`bubbleIcon`),
  `bubbleShouldShow` (tiptap needs a boolean return value; DSL handlers
  return void) and `runBubbleLink` (block-body closures are not supported
  in computed expressions). The button list itself (names, tooltips,
  active flags, actions) and the `{ placement: 'top' }` options object
  live in the widget DSL.
- `src/front/utils/table_menu_ext.ts` — hand-written TS extension for
  `table_menu.at`: only the `computeMenuPosition` re-export and
  `tableMenuTitles` remain (the same re-export gap as the slash
  extension, plus the titles spread-merge — object spread in a DSL
  computed is unverified).
  The visibility/position tracking with its rAF-throttled
  `editor.on('selectionUpdate', ...)` subscription, the document
  outside-click listener and the table command dispatch all live in the
  widget DSL (`.Init` closures; probe-verified, see the TableMenu
  section below).
- `src/front/utils/code_block_menu_ext.ts` — hand-written TS extension
  for `code_block_menu.at`: only three things remain — the
  `computeMenuPosition` re-export, the static language manifest
  (`CODE_BLOCK_LANGUAGES` / `codeBlockLanguages()`, with a REQUIRED
  `aliases` field so the DSL filter's `.concat(lang.aliases)`
  type-checks) and the Check icon re-export for the `dyn` render trick.
  All widget state is model vars; the open/close/select state machine,
  keyboard navigation, two-phase positioning, the wheel scroll lock and
  the editor-dom capture listeners are `.Init` closures in the DSL (see
  the CodeBlockMenu section below).
- `src/front/utils/code_language_icon_ext.ts` — re-export of
  `getLanguageIconUrl` from the real `src/utils/codeBlockLanguage.ts`
  (same dual-resolution shim as `computeMenuPosition`; the real module is
  mirrored into `gen/front/vue/src/utils/` by the regen script). Lets
  `code_language_icon.at` bind the icon URL as a plain computed instead of
  reimplementing the mapping.
- `src/composables/tiptapBubbleMenu.ts` (editor tree) — the real
  re-export of `BubbleMenu` from `@tiptap/vue-3/menus`. The bubble
  extension imports it via a `../../../../composables/...` path that
  resolves in both trees (same trick as `useMenuBounds`).
- `stubs/gen_tiptapBubbleMenu.ts` — gen-project stub for that module (the
  self-contained gen project has no `@tiptap/*` dependency); mirrored into
  `gen/front/vue/src/composables/tiptapBubbleMenu.ts` by the regen script.
  Never ships: the copied `src/menus/BubbleMenu.vue` resolves the real
  module in the editor tree.
- `src/front/utils/auto_down_editor_ext.ts` — hand-written TS extension
  for `auto_down_editor.at`: the `useAutoDownEditorBridge` composable
  (the DSL's `composable:` imports are called with ZERO arguments, so the
  `useAutoDownEditor` options object is assembled there from the component
  instance's props; `useAutoDownEditor.ts` itself is untouched). The
  bridge emits the contractual events straight through
  `getCurrentInstance().emit` (`update`/`blur`/`focus`/`link-click`/
  `open-wiki-link` — declared via quoted msg variants since plan 013
  Phase 2, no more callback props) and returns a `reactive({ items,
  editor })` bag so refs stay linked when the DSL reads
  `.autoDownEditorBridge.editor` (probe 16: in production builds the
  `<script setup>` setupState is empty, so writing a model var through
  `inst.proxy` lands on a non-reactive ctx — the reactive bag is the
  working channel). Also here: the 30-item static slash command manifest
  `getSlashItems` (lucide icons as data + block-body command closures
  with `window.prompt` / `navigator.clipboard` / DOM walking — same
  class of gap as `bubbleIcon`), `normalizeAnchors` (no regex literals
  in the DSL), the `EditorContent` / four-menu component re-exports
  (dual-resolution shim), the Check/X lucide re-exports for the `dyn`
  render trick, and the `getBlockMap` / `appendTableIAL` re-exports from
  the real `extensions/BlockId` / `extensions/tableAttributes` (same
  dual-resolution shim). See the AutoDownEditor section below.
- `src/composables/tiptapEditorContent.ts` (editor tree) — the real
  re-export of `EditorContent` from `@tiptap/vue-3`, plus the
  `katex/dist/katex.min.css` side-effect import (the original
  AutoDownEditor.vue imported it at module scope; the gen project has no
  katex dependency, so the stub omits it). Same dual-resolution trick as
  `tiptapBubbleMenu`.
- `stubs/gen_tiptapEditorContent.ts`, `stubs/gen_useAutoDownEditor.ts`,
  `stubs/gen_slashItem.ts`, `stubs/gen_blockId.ts`,
  `stubs/gen_tableAttributes.ts`, `stubs/gen_menus/*.vue` — gen-project
  stubs for `tiptapEditorContent.ts`, `useAutoDownEditor.ts`,
  `src/menus/slashItem.ts` (the real one imports `@tiptap/core` types),
  `extensions/BlockId` (`getBlockMap`) resp.
  `extensions/tableAttributes` (`appendTableIAL`) — the gen project has
  no tiptap extension tree — and the four menu SFCs re-exported by
  `auto_down_editor_ext.ts`; mirrored into
  `gen/front/vue/src/composables/`, `gen/front/vue/src/extensions/` resp.
  `gen/front/vue/src/menus/` by the regen script. Never ship.
- `src/front/app.at` — placeholder root widget. The generator always emits
  the root widget as `App.vue`; secondary widgets land in
  `gen/front/vue/src/components/<Name>.vue`. The dummy App exists only so
  the real widgets are generated as standalone component SFCs.
- `gen/` — transient generator output (gitignored, safe to delete)

## Regenerate

From `autodown/packages/editor/src/auto`:

```sh
AUTO=D:/autostack/auto-lang/.worktree/auto-down/target/debug/auto.exe bash gen/regen.sh
```

(The `AUTO` override points at the worktree binary — see the Compiler
note at the top. Without it the script uses the master binary, which
mis-compiles `auto_down_editor.at` until the quoted-variant fix lands on
auto-lang master.)

The script (kept in the gitignored `gen/` directory, like jade's) performs
the whole pipeline with gating: mirrors the `stubs/` and real modules into
the gen project (the `useMenuBounds` and `codeBlockLanguage` path tricks,
the behavior-free tiptap
BubbleMenu/NodeViewWrapper/EditorContent stubs, the KaTeX/Mermaid
renderPreview stub, the `BlockId`/`tableAttributes` extension stubs,
`gen_slashItem.ts` and the four menu SFC stubs),
runs `auto build`, aborts without touching the editor tree when the build
or the `vue-tsc` gate fails (no stale output left behind), then rewrites
the gen-only `@/ext/...` import aliases to editor-relative paths and copies
the SFCs into `src/components`, `src/menus`, `src/node-views` and
`src/core`. It also refuses to deploy output containing the `.value.value`
double-unwrap artifact (hand-written `.value` in handler/watch bodies is
auto-unwrapped since plan 408 P4 — never write `.value` in `.at` sources).

`auto build` also runs `pnpm install` + `vue-tsc` + `vite build` inside
`src/auto/gen/front/vue` (a self-contained project, not part of the
autodown pnpm workspace), which type-checks the generated SFC.
`packages/editor/tsconfig.json` excludes `src/auto/gen` so the editor
build does not type-check the gen project a second time.

**Caveat:** `auto build` does NOT fail when a widget fails to parse — it
logs `Warning: Failed to compile <path>` and regenerates the remaining
widgets, leaving the STALE generated SFC (and the stale extension copy
under `gen/.../src/ext/`) in place, then reports success. Always check
the build output for that warning (or the component's mtime) after
editing a widget.

**Caveat 2:** regen does NOT clean up after a widget is renamed or
deleted — the old generated SFC stays in `gen/front/vue/src/components/`
and gets type-checked by the gate (this bit once when
`AutoDownEditorInner` was renamed to `AutoDownEditor`: the stale
`AutoDownEditorInner.vue` failed vue-tsc until deleted by hand). After
renaming/removing a widget, delete its old output under `gen/` (and any
stale deployed copy) manually.

## Known Auto language gaps (as of 2026-08-19, plan 013 closed)

1. **No direct import of hand-written TS from widget code.** A `use` path
   cannot leave the project `src/` (auto-man rejects `..`), so widgets
   reach hand-written TS through an extension re-export (the
   dual-resolution shim). RESOLVED for `getLanguageIconUrl`:
   `code_language_icon.at` now imports the real
   `src/utils/codeBlockLanguage.ts` via `utils/code_language_icon_ext.ts`
   — the in-DSL reimplementation (and its keep-in-sync hazard) is gone.
2. **`computed` expression limitations** — retired: bare function calls,
   `.prop` refs, ternaries, `??`, `||`/`&&` with operand-type inference
   and mixed-precedence parentheses all work natively now (plan 013 +
   follow-up; `strOr`/`orNull` are deleted).
3. Browser globals used by generated code pass through the a2ts
   transpiler verbatim (typed by the TS DOM lib) — e.g. `btoa` inside
   `codeBlockLanguage.ts`, reached via the extension.

## SlashMenu notes (phase3 worktree capabilities used)

The `slash_menu.at` port uses the 3.0a/3.0b features (`on
"<event>".document:`, `style_obj`, `dyn`, `watch`, `use { fn }`) plus
closures (`item => ...`, `nextTick(() => { ... })`). Almost all of the
original hand-written SFC's logic lives in the DSL. Earlier revisions of
this file claimed the DSL had **no closures, no object literals and no
`??`** and moved the imperative glue into the extension on that basis —
all three claims were WRONG (probe-verified against the phase3 worktree
compiler, 2026-07): closures transpile with `.value`-aware bodies (the
block-body StateRef bug was fixed in the compiler), object literals emit
correctly in handlers/computeds/view props, and `??` works in handler
bodies. The logic has since flowed back into the widget. What remains in
`utils/slash_menu_ext.ts`, and the real gaps that shape the widget code:

1. **`computeMenuPosition` re-export stays in the extension.** The
   position math must stay in the real `src/composables/useMenuBounds.ts`
   (single source of truth, also used by TableMenu/CodeBlockMenu;
   `useMenuBounds.ts` itself is untouched), but `..` paths in `use` are
   rejected by auto-man, so the widget imports the function through the
   extension's re-export. The two-phase positioning ORCHESTRATION
   (render-hidden → nextTick measure → flip/clamp → reveal) is written in
   the DSL (`nextTick(() => { ... })` in `.OnOpen`/`.OnUpdate`), operating
   on three model vars (`pos_top`/`pos_left`/`pos_visibility`) bound via
   `style_obj` — the earlier `reactive({})` composable is gone.
2. **~~`noResultsOr` stays in the extension~~ RETIRED (plan 013 Phase
   1).** `??` now emits correctly in computed expressions (probe 14), so
   the widget writes `empty_text => .noResultsText ?? "No results"`
   directly and the helper was deleted from the extension. (Standalone
   `||` computeds are still mis-typed — NodeView note 2.)
3. **Menu element lookup by querySelector** (unchanged): a template ref
   captured at slash-open time is null (the menu has not mounted yet), so
   the phase-2 measurement locates the menu via
   `editorEl.querySelector('.autodown-slash-menu')` inside the owning
   `.autodown-editor`. `scrollActiveIntoView` uses the template ref
   directly (`.menuEl` → `menuEl.value!`) — it runs at keydown time, when
   the menu is mounted.
4. **Wide prop types** (unchanged): bare `any` is rejected by the DSL name
   checker, so props are declared `editor: Array<str>, items: []str` —
   `Array<str>` maps to TS `any`, `[]str` (slice) to `any[]`. `items`
   needs `any[]` specifically: with a plain `any` prop, the generated
   `props.items.filter((item) => ...)` gets no contextual type for the
   closure param and vue-tsc strict reports TS7006. The real `SlashItem`
   interface stays in hand-written `src/menus/slashItem.ts` (generated
   SFCs cannot export types).
5. **Computed refs are not auto-unwrapped outside the template.**
   `.filtered` in a handler emits the raw `ComputedRef`, so handlers and
   other computeds use the explicit `.filtered.value` form (emits
   `filtered.value` correctly). In the view, `for i, item in .filtered`
   is fine (templates unwrap), but `.filtered.length` inside a view `if`
   is mangled by the template codegen (renders `filtered.lengthgth`) — so
   emptiness goes through the named `is_empty` computed.
6. **~~Expression parentheses are dropped by the transpiler~~ FIXED
   (plan 013 follow-up).** Mixed-precedence binops re-derive parens from
   precedence/associativity (`cap_bina_parens_*`), and binop/unary
   method-call receivers keep theirs (`cap_bina_parens_on_call_receiver`
   — `(a + b).toLowerCase()` now emits correctly). The filter keeps its
   array-literal receiver (`[item.title, item.description].concat(
   item.searchTerms).join(" ")`) and the ArrowUp/ArrowDown wrap-around
   keeps its intermediate `let` locals — both work either way; no churn.
7. **A field literally named `view` cannot follow a dot-chain.**
   `.editor.view` is swallowed by the parser/codegen (`view` is a DSL
   keyword), so editor-view access uses bracket notation:
   `.editor["view"]`.
8. **The positioning block is duplicated in `.OnOpen`/`.OnUpdate`.**
   A statement starting with `.` glues onto the previous line's
   expression (`x = true` + `.Helper()` emits `true.Helper()`), and a msg
   handler no view event references is not emitted — so a shared
   `.ApplyPosition()` helper handler is not viable.
9. **`use { fn }` local paths are copied to `src/ext/` and imported via
   the `@/ext/` alias** (unchanged), which only exists in the gen project
   — the copied `src/menus/SlashMenu.vue` therefore has its import
   rewritten by `sed` (see Regenerate). The editor-tree-relative import
   inside the extension file resolves in both trees (same depth), with
   the gen-side copy satisfied by the mirror step above.

## BubbleMenu / TableMenu workarounds (in addition to the SlashMenu ones)

1. **Bare identifiers are rejected as view prop values.**
   `shouldShow: bubbleShouldShow` (referencing the imported extension fn)
   fails to parse ("Expected term, got RBrace" at the end of the view
   block). The dot-prefix form `shouldShow: .bubbleShouldShow` parses and
   the codegen strips the dot, emitting `:shouldShow="bubbleShouldShow"`
   verbatim — exactly what is needed for an imported symbol.
2. **tiptap's BubbleMenu wrapper via a dual-resolution shim.** The gen
   project has no `@tiptap/*` dependency, so the extension cannot re-export
   the wrapper from `@tiptap/vue-3/menus` directly. Instead it re-exports
   from `../../../../composables/tiptapBubbleMenu`, which resolves to the
   real re-export (`src/composables/tiptapBubbleMenu.ts`) in the editor
   tree and to a stub (`stubs/gen_tiptapBubbleMenu.ts`, mirrored into
   `gen/front/vue/src/composables/`) in the gen tree. Declared in the
   widget as `use { component: TiptapBubbleMenu from ".../bubble_menu_ext.ts" }`.
3. **No function calls in template bindings.** Attr values and `style:
   { active: ... }` class-map conditions go through
   `expr_to_vue_bound_value`, which emits `null` for Call expressions —
   so the original's `:class="{ active: btn.isActive() }"` cannot be
   expressed. `active` is precomputed inside the widget's `buttons`
   computed (which lives in the DSL now — array/object literals and
   expression-body closures like `() => .editor.chain().focus()
   .toggleBold().run()` work in computeds). Equivalent in practice:
   nothing Vue-reactive re-renders the component while the menu is open
   (tiptap state is not reactive), so the original's closures were
   effectively also evaluated only at mount.
4. **Tooltip/linkPrompt defaults use the `&&`/`||` idiom in the DSL.**
   `(tips || {}).k` needs receiver parens (still dropped for method/field
   receivers — see SlashMenu note 6), so the buttons computed writes
   `.tooltips && .tooltips.bold || "Bold"`. Difference vs the original's
   spread merge + `??`: an explicitly empty-string tooltip or linkPrompt
   falls back to the default instead of staying empty. The link action's
   if/else + `window.prompt` body needs a block-body closure — not
   supported in computed expressions (a Block body emits `undefined`) —
   so it delegates to the extension's `runBubbleLink`; and
   `bubbleShouldShow` stays in the extension because tiptap needs a
   boolean RETURN value while DSL msg handlers always return void. The
   `{ placement: 'top' }` options object is an inline object literal in
   the view (`options: { placement: "top" }` — object literals in view
   prop bindings work; the earlier `bubbleMenuOptions` helper is gone).
5. **`isNodeSelection` was dead code in the original.** It did
   `import type { isNodeSelection }` (type-only, erased at runtime) and
   then `typeof isNodeSelection === 'function'` — always false. The port
   keeps the equivalent `const isNode = false` in the extension's
   `bubbleShouldShow`, with a comment.
6. **TableMenu event wiring lives in the DSL.** An earlier revision of
   this note claimed the DSL cannot pass callbacks to
   `editor.on('selectionUpdate', ...)` — wrong (probe-verified): `.Init`
   builds a `let schedule = () => { ... }` closure (the rAF throttle and
   the whole checkVisibility/updatePosition body inside, with nested
   `nextTick(() => { ... })` phases), stores it in an `Array<str>` (= any)
   model var, passes it to `.editor.on("selectionUpdate", schedule)` and
   calls it once immediately; `.Destroy` offs it via the stored var. The
   document outside-click listener is the view's
   `on "mousedown".document` (auto-registered/detached by the codegen).
   The original's
   `watch(() => editor?.state.selection, scheduleCheck, { immediate: true })`
   only ever fired immediately (tiptap state is not Vue-reactive), so the
   initial `schedule()` call in `.Init` is equivalent.
7. **`.contains` on a DOM element must use bracket notation.** The
   transpiler's array/string method mapping rewrites `.contains(` to
   `.includes(` on ANY receiver — correct for the filter's joined string,
   but `menu.contains(e.target)` mis-emits as `menu.includes(...)` (a DOM
   Node has no `includes` → runtime TypeError on every document
   mousedown). DOM contains checks are written `menu["contains"](e.target)`
   (TableMenu outside-click; CodeBlockMenu wheel lock + outside-click).
8. **Menu element lookup** (TableMenu): the phase-2 position measurement
   uses the template ref directly (`.menuEl` → `menuEl.value!`) — it runs
   one `nextTick` after `visible` flips, when the menu is mounted (the
   SlashMenu lookup runs at open time, before the first tick, hence its
   querySelector). The outside-click handler still locates the menu via
   `root.querySelector('.autodown-table-menu')` — the same element the
   original's `menuRef` held. The widget still declares `ref: "menuEl"`.

## CodeBlockMenu workarounds (in addition to the SlashMenu/TableMenu ones)

1. **All state is widget model vars now; every listener is an `.Init`
   closure.** Earlier revisions kept everything in an extension
   composable (`useCodeBlockMenuState`) on the claim that the DSL cannot
   register editor-dom capture listeners and an extension cannot write
   widget model vars — the first half was wrong (probe-verified), so the
   second never mattered: `.Init` registers
   `dom.addEventListener("mousedown"|"click", cb, { capture: true })`,
   `document.addEventListener("wheel", cb, { passive: false, capture: true })`
   and the wrapper scroll listener with DSL closures that write model
   vars directly. The callbacks and their target elements are stored in
   `Array<str>` (= any) model vars so `.Destroy` can removeEventListener
   them (object-literal options args like `{ capture: true }` pass
   through). Because every listener target is captured at Init, removal
   never touches the editor — the original's `isDestroyed` guard (which,
   when it fired, skipped ALL removals including the document-level
   ones) is unnecessary; behaviour differs only in that edge case, where
   the port removes strictly more (leaks less).
2. **The wheel scroll lock is an imperative `.Init` listener**, not the
   view `on "wheel".document` syntax (which only emits `passive: false`
   alongside an UNCONDITIONAL `.prevent`). The closure body does the
   original's conditional logic verbatim: lock all wheel scrolling while
   the menu is open, scroll the language list instead when the wheel
   lands inside it (`list.scrollTop = list.scrollTop + e.deltaY` —
   field assignment on a local works; the DSL has no `+=`). The original
   early-return branches become exclusive if-guards.
3. **The search input uses real v-model.** With `value: .search` (plain
   model var) PLUS an `oninput:` handler, the codegen folds the pair
   into `v-model="search"` — exactly the original's template — and drops
   the explicit `@input` (the SearchInput handler is emitted but never
   called; kept as the fold's write-back target). Probe: with only
   `value:` and no oninput, just `:value` is emitted (a read-only
   input); with a composable field (the pre-reflow code), the pair was
   emitted as `:value` + `@input`.
4. **The filter computed lives in the DSL** over the extension's
   language manifest:
   `codeBlockLanguages().filter(lang => [lang.id, lang.label].concat(lang.aliases).join(" ").toLowerCase().contains(.search.toLowerCase().trim()))`.
   The query trim is inline; an empty (or whitespace-only) query matches
   everything via `''.includes('')`, identical to the original's
   trim + early return. `.contains` on the joined STRING is the
   transpiler's intended mapping (emits `.includes` — contrast TableMenu
   note 7 for DOM receivers). The manifest keeps a REQUIRED
   `aliases: string[]` (empty arrays where the original omitted the
   field) because `??`/`||` are unavailable in computed expressions and
   `.concat(lang.aliases)` must type-check; an empty array joins exactly
   like the original's `...(lang.aliases ?? [])`. The typed
   `CodeBlockLanguage[]` return gives the filter closure's parameter its
   contextual type. Emptiness goes through the named `is_empty`
   computed (the `.filtered.length`-in-view-if codegen bug, SlashMenu
   note 5).
5. **`currentLanguage` is snapshotted at open time** (same argument the
   old extension used: the original's computed only re-evaluated when
   forcedLanguage changed — tiptap attrs are not Vue-reactive). The port
   writes `getAttribute("data-language") ?? ""` and falls through to
   `getAttributes("codeBlock").language ?? ""` when empty — matching the
   ORIGINAL's truthiness check (`if (forcedLanguage.value)`); the old
   extension's `??` chain kept an explicitly empty attribute instead, an
   unobservable edge difference the port happens to fix.
6. **A local cannot be named `view` either.** `let view = .editor["view"]`
   is a parse error ("Expected term, got View") — the findActiveCodeBlock
   inlines name their locals `ed_view`/`ed_view2`.
7. **The Check icon renders via `dyn`, not a PascalCase component.**
   Inside a two-variable `for i, lang in` loop the codegen auto-adds
   `:key="'Check-N-' + (i?.id ?? i)"` to PascalCase components, and
   `i?.id` (i is the numeric index) fails vue-tsc — and an explicit
   `key:` prop does NOT suppress the auto-add (it emits a duplicate
   `:key`). The icon is re-exported from the extension
   (`codeBlockCheckIcon`) and rendered as `dyn (.check_icon)` →
   lowercase `<component :is>` with no auto key (same trick as
   SlashMenu's `dyn (.item.icon)`). Rendered DOM identical.
8. **Per-item function refs cannot be expressed**, so
   scrollHighlightedIntoCenter locates the highlighted item via
   `.autodown-codeblock-menu-item.active` inside the menu (the same
   element `itemRefs[highlightedIndex]` held) instead of
   `:ref="(el) => ..."`. The menu/list/search elements are located by
   querySelector inside the owning `.autodown-editor` (SlashMenu note 3).
9. **The original's selection `watch` was dead code.**
   `watch(() => props.editor?.state.selection, ...)` never fired (tiptap
   state is not Vue-reactive; the editor prop identity never changes),
   so only the content-wrapper scroll listener drives `scheduleUpdate`
   in the port. Same for the badge `lineHeight`/`verticalPadding`
   locals in `updatePosition` — computed but never used in the original;
   dropped.
10. **`defineExpose({ open, close, toggle })` is dropped.** The DSL has
    no expose support. Nothing consumes it: `src/index.ts` only
    re-exports the component, `AutoDownEditor.vue` uses no template ref,
    and the menu opens exclusively through its own editor-dom click
    capture listener.
11. **The original `LanguageOption` interface was not exported**, so no
    `slashItem.ts`-style type split was needed; the language list lives
    in the extension as `CODE_BLOCK_LANGUAGES` / `CodeBlockLanguage`
    (with the required `aliases` field, note 4).

## NodeView workarounds (in addition to the menu ones above)

The four interactive node views (DetailsNodeView, WikiLinkNodeView,
QueryBlockNodeView, BlockEmbedNodeView) are widget DSL ports of the
original `src/node-views/*.vue` (kept as `.bak`). The `VueNodeViewRenderer`
adapter layers in `src/extensions/` are untouched — only the Vue
components are generated. All seven/eight NodeViewProps fields are
declared on each widget (`Array<str>` = any, `[]str` = any[], `selected:
bool`) so nothing falls through as attrs onto the root element, matching
the originals' `defineProps`. New probe-verified gaps, first hit by these
widgets:

1. **~~Ternary emits `undefined` in computeds~~ RETIRED (plan 013 Phase
   1).** `cond ? a : b` now emits a correctly typed ternary in computeds
   (probe 14); `marker` and the two `display_label`s use it directly.
2. **~~Standalone `&&` / `||` computeds are mis-typed
   `computed<boolean>`~~ RETIRED (plan 013 follow-up, probe 14 fix).**
   `||`/`&&` infer the operand type now (`cap_logical_computed_infers_operand_type`),
   all seven node views use native `||` fallbacks, and `strOr`/`orNull`
   are deleted from the extension.
3. **An object literal as a computed body emits invalid JS**
   (`() => {raw: ...}` is a block, not an object). Object-literals INSIDE
   an array literal are fine (the BubbleMenu buttons computed). The
   originals' `attrs` computed objects become scalar computeds
   (`attr_raw` / `attr_title` / `attr_block_id`).
4. **`type:` and `as:` are keyword tokens, not valid brace-form prop
   names.** The brace-form prop check requires an Ident, so
   `type: "text"` / `as: "div"` mis-parse into junk `<div>` children. The
   PAREN prop form accepts any key: `input (type: "text") { ... }`,
   `NodeViewContent (as: "div") { ... }`.
5. **Calling a function PROP directly drops the `props.` prefix.**
   `.updateAttributes({ ... })` emits a bare `updateAttributes(...)`
   (TS2304). `let`-bind the prop first (`.updateAttributes` field access
   emits `props.updateAttributes` correctly) and call the local.
6. **Model vars auto-unwrap in computeds; computed refs do not.**
   `.loading` in a computed emits `loading.value` (writing `.loading.value`
   double-unwraps to `loading.value.value`), while another computed still
   needs the explicit `.filtered.value` form (SlashMenu note 5).
7. **A msg handler that no view event references is not emitted** — and
   the DSL `watch` has no `{ immediate: true }` option. The QueryBlock /
   BlockEmbed `load()` (original: `watch(..., load, { immediate: true })`)
   is therefore DUPLICATED in `.Init` (onMounted) and the `watch` body —
   same constraint as SlashMenu's duplicated positioning block.
8. **~~`!= null` in a computed emits `!== undefined`~~ RETIRED (plan 012
   Batch A gap 47; plan 013 probe 03 confirmed the loose `!= null`
   emission).** BlockEmbed's `show_block` still uses bare truthiness
   (`.block`) — equivalent and simpler, no reason to churn it.
9. **`code` / `ul` / `li` are not in the DSL element table** and fall back
   to `<div>`. `ul`/`li` would be pixel-identical as divs (the scoped CSS
   resets list-style/padding/margin), but `<code>` gets its monospace from
   the UA stylesheet — so all three render via `dyn` with a string tag
   (`code_tag => "code"`, `dyn (.code_tag) { ... }` →
   `<component :is="(code_tag) as any">` renders a real `<code>`; children
   and `v-for` inside dyn blocks work).
10. **The widget `style { ... }` block is emitted verbatim into
    `<style scoped>`** — the originals' scoped CSS moves in unchanged.
    Caveat: the style-block lexer handles `/* */` comments and CSS strings
    but NOT `//` comments — an apostrophe (e.g. `original's`) starts a CSS
    string and fails the build with "unterminated string in style block".
11. **~~NodeViewContent's `v-show` becomes `style_obj` display~~ RETIRED
    (plan 013 Phase 1).** The DSL has native `show:` (v-show), and
    DetailsNodeView binds `show: .is_open` on the NodeViewContent
    directly. Unmounting the content with `if` remains NOT equivalent —
    it would break ProseMirror's editable content DOM.
12. **NodeViewWrapper/NodeViewContent via the dual-resolution shim**
    (BubbleMenu note 2 pattern): `src/composables/tiptapNodeView.ts`
    re-exports the real components in the editor tree;
    `stubs/gen_tiptapNodeView.ts` is mirrored into the gen project.
13. **The originals' `typeof x === 'function'` guards become `!= null` /
    `== null`** (the DSL has no typeof). Differs only when
    `openWikiLink`/`loadBlock` is configured to a non-function truthy
    value, which never happens.
14. **~~Promise-based async without async/await~~ RETIRED (plan 013 Phase
    1).** Async handlers with `try`/`catch`/`finally` work
    (probe-verified), so QueryBlock/BlockEmbed's `load()` is a real
    `.await` + try/catch/finally again. One helper remains: TS types the
    catch param `unknown` and the DSL has no casts, so the
    `err.message || String(err)` narrowing goes through the extension's
    `errorMessage(e)`.
15. **The modifier-only `@click.stop` targets a `Noop` handler** (the DSL
    requires a handler); it emits a no-op component event with no
    listener — same behaviour as the original's modifier-only binding.
16. **No defineExpose in any of the four originals**, so the DSL's lack of
    expose support is irrelevant here (contrast CodeBlockMenu note 10).
    The `WikiLinkAttrs`/`QueryResult`/`BlockInfo` interfaces were local
    and unexported, so no `slashItem.ts`-style type split was needed.

## Render NodeView workarounds (Mermaid / MathBlock / MathInline)

The three render-type node views (MermaidNodeView, MathBlockNodeView,
MathInlineNodeView) are widget DSL ports of the original
`src/node-views/*.vue` (kept as `.bak`). The `VueNodeViewRenderer`
adapters in `src/extensions/` are untouched. New gaps first hit by
these widgets:

1. **katex/mermaid rendering lives in `src/composables/renderPreview.ts`**
   (re-exported through `utils/node_view_ext.ts` via the dual-resolution
   shim; gen stub `stubs/gen_renderPreview.ts`). The DSL cannot import
   npm packages and has no try/catch, so the originals' render() error
   paths return `{ html/svg, error }` data instead (`""` error = the
   originals' `null`; falsy either way). The call sequences
   (mermaid.initialize options, random id shape, katex
   throwOnError/displayMode, error message extraction) are verbatim.
2. **~~v-html becomes imperative innerHTML~~ RETIRED (plan 013 Phase
   1).** The DSL has native `html:` (v-html): the preview elements bind
   `html: .svg` / `html: .html` directly, and `setInnerHTML` was deleted
   from `renderPreview.ts`, the extension and the gen stub — the
   empty-element + `nextTick` remount dance is gone with it.
3. **Mermaid's async render needs only ONE .then callback** —
   renderMermaidPreview never rejects (its try/catch returns the error as
   data), so a single resolve callback carries both the original's try
   and catch branches (contrast QueryBlock's rejecting-promise load,
   which uses a real `try`/`catch` since Phase 1).
4. **`:deep(...)` passes the style-block lexer verbatim** (first use:
   `.autodown-mermaid-preview :deep(svg)` / `:deep(.katex-display)`) —
   required because the v-html-injected content carries no scoped data
   attribute.
5. **Bare string concatenation works in computeds** —
   `source_label => "$" + .source.value + "$"` (the MathInline error
   fallback's `${{ source }}$` interpolation) emits
   `'$' + source.value + '$'` correctly. Only PARENTHESIZED receivers
   mis-codegen (SlashMenu note 6).
6. **MathInline's source comes from node.attrs, not textContent** (the
   inline node has no editable content — no NodeViewContent), and its
   wrapper is `NodeViewWrapper (as: "span")`.
7. **The originals exported no types** (the extensions import only the
   components), so no `slashItem.ts`-style type split was needed.

### Minor generated-output differences (Render NodeViews)

(behaviorally identical DOM, on top of the NodeView list above):

- The `v-if` branches are wrapped in transparent `<template>`s; the error
  text renders inside an extra inline `<span>`; `data-mermaid-block` /
  `data-math-block` / `data-math-inline` bind the empty string (identical
  to the originals' valueless attributes); the `<code>` child of
  NodeViewContent renders as `<component :is="'code'">`; the `null` error
  sentinel is `""` (falsy either way).

### Minor generated-output differences (NodeViews)

(behaviorally identical DOM):

- The `v-if` branches are wrapped in transparent `<template>`s; texts
  render inside an extra inline `<span>`; `v-for` items carry no `:key`;
  static attrs are bound (`:type="'text'"`, `:as="'div'"`,
  `:title="'...'"`); NodeViewWrapper/NodeViewContent get an auto-generated
  `:key`; handlers emit no-op component events (SummaryInput/InputInput
  are never even called — the v-model fold); `@keydown.escape` becomes
  `@keydown.esc` (Vue alias); Details' input v-else and WikiLink's
  two-span `v-if` group become sibling `v-if`s (same rendered branch);
  the icons render as `<component :is>`; `data-query-block` binds the
  empty string (renders `data-query-block=""` — identical to the
  original's valueless attribute); the QueryBlock error/`block` refs use
  the `""`/`undefined` sentinels instead of `null` (falsy either way);
  `model = null` initializes as `undefined` (SlashMenu precedent).


### Minor generated-output differences (CodeBlockMenu)

(behaviorally identical DOM):

- The `v-if` root and the Check-icon `v-if` are wrapped in transparent
  `<template>`s; the item label and the empty text render inside an
  extra inline `<span>`; `v-for` items carry no `:key`; the Check icon
  is a `<component :is>`; handlers emit no-op component events
  (SearchInput is never even called — see note 3); `==` is emitted
  instead of `===`; `placeholder` is a bound attribute;
  `@keydown.escape` becomes `@keydown.esc` (Vue alias, same behaviour);
  the empty-list check binds the named `is_empty` computed instead of
  `filteredLanguages.length === 0`.


## AutoDownEditor notes — the fully generated assembly component

`auto_down_editor.at` ports the original `src/core/AutoDownEditor.vue`
(421 lines, kept as `.bak`): EditorContent + the four menus gated on the
editor instance + the Save/Cancel action buttons, the content/canEdit
prop watches and the save/cancel flows all live in the DSL. Since plan
013 Phase 2 the generated SFC deploys straight to
`src/core/AutoDownEditor.vue` — there is NO shell and no Inner split;
the editor package's Vue layer is 100% generated. The four historical
hard gaps are all natively expressed now:

1. **Emit names.** Quoted msg variants carry the contractual
   lowercase/hyphenated names (`"update"`, `"save"`, `"cancel"`,
   `"blur"`, `"focus"`, `"link-click"`, `"open-wiki-link"`). The
   compiler treats quoted variants as contractual (plan 013 Phase 2 fix,
   auto-lang branch `auto-down`): always declared in `defineEmits` and
   always trailing-emitted, even with no view reference. View-originated
   events (`save`/`cancel` via the buttons) emit from the handlers;
   bridge-originated ones (tiptap's onUpdate/onBlur/onFocus/onLinkClick/
   onOpenWikiLink) emit from the extension through
   `getCurrentInstance().emit`. The callback-props channel
   (`updateCb`/`blurCb`/.../`editorReadyCb`) is deleted.
2. **The `save` payload uses a computed-payload relay.** The exposed
   `.handleSave` handler computes `getMarkdown` + `appendTableIAL`, then
   self-calls `."save"(md_ial)` whose trailing emit carries the payload
   — so the Save button and the imperative `handleSave()` share ONE code
   path, like the original. (Mind the parser quirk: a statement-initial
   dot needs a blank line before it, or it glues onto the previous
   statement.)
3. **defineExpose.** The native `expose { .handleSave, .getBlockMap }`
   block covers the imperative contract; `getBlockMap` is a model var
   assigned a closure over the bridge bag in `.Init`. The `editor` ref
   is merged into `inst.exposed` by the bridge on mount (the demo e2e
   reads the raw `__vueParentComponent.exposed.editor.value`; jade's
   `$el` falls through Vue's expose proxy).
4. **Slots + runtime prop defaults.** `slot(name: "save-label")` /
   `slot(name: "cancel-label")` are native named slot outlets with the
   label prop text as fallback children (the functional-component +
   `dyn` bridge is retired), and the widget signature's defaults
   (`canEdit: bool = true`, `saveLabel: str = "Save"`, ...) generate the
   original `withDefaults` — the values in the `.at` signature ARE the
   public contract.

Remaining architecture notes (probe/codegen-confirmed):

5. **`use { composable: ... }` calls take ZERO arguments.** The codegen
   emits `const x = useX()` at `<script setup>` top level, so the
   `useAutoDownEditor` options object (props + emit-bridging callbacks)
   is assembled in the extension's `useAutoDownEditorBridge`, which
   reads the resolved props from `getCurrentInstance()`. The timing
   still satisfies tiptap's `useEditor` (its onMounted/onBeforeUnmount
   register inside this setup-scope call). `useAutoDownEditor.ts`
   itself is untouched.
6. **Production builds hide model vars from extension code (probe
   16).** Vite compiles `<script setup>` to an inline render function,
   so `setupState` is empty — writing a model var through `inst.proxy`
   lands on a non-reactive ctx and silently does nothing (dev builds
   work, which made this nasty to catch). The bridge therefore returns a
   `reactive({ items, editor })` bag — `reactive()` keeps the editor ref
   linked, and the DSL reads `.autoDownEditorBridge.editor` everywhere
   (view/computed/watch/handler all verified). The same applies to the
   slash items: `items: .autoDownEditorBridge.items`.
7. **The composable local name is derived, not choosable.** `useFooBar`
   binds to `fooBar` (strip `use`, lowercase first letter) — view code
   must reference THAT name.
8. **Empty msg handler bodies parse fine** — the pure-emit/relay
   handlers (`."cancel" -> { }`, `."save"(md) -> { }`) carry no
   statements at all.
9. **All original props are declared on the widget** (16 of them, wide
   `Array<str>`/`[]str` types as usual, nullable callback-ish props
   default to `null`) — anything undeclared would fall through as an
   attr onto the root `.autodown-editor` div. The demo's `class="fill"`
   intentionally falls through onto that root (single root, same as the
   original); jade-garden's `editorRef.value.$el` likewise resolves to
   it. jade's `onOpenWikiLink` is consumed as a PROP channel (declared
   `onOpenWikiLink: Array<str> = null`) which takes precedence over the
   emit listener — no double delivery (gap 51 avoidance).
10. **The katex CSS side-effect import lives in
    `src/composables/tiptapEditorContent.ts`** (the dual-resolution
    EditorContent shim) — the gen project's stub omits it (no katex
    dependency), the editor tree bundles it exactly as before.

### Minor generated-output differences (AutoDownEditor)

(behaviorally identical DOM):

- The four menus' separate `v-if="editor"` directives become one shared
  transparent `<template v-if>` wrapper; the action buttons' `if` is a
  transparent template too; EditorContent and each menu get an
  auto-generated `:key` (harmless); EditorContent's static class is bound
  (`:class="'autodown-editor-content-wrapper'"`); `==`/`!=` are emitted
  instead of `===`/`!==`; every msg handler carries a trailing
  `emit('handleSave')`-style self-event (harmless noise — no listener);
  the `save` relay means the emitted `save` payload is computed one call
  earlier than in the original (same value, same tick).

## Minor generated-output differences vs the original hand-written SFCs

(behaviorally identical DOM):

- `width`/`height` are emitted as bound attributes (`:width="16"`).
- An empty `defineEmits<{}>()` and an empty `<style>` block are emitted.
- SlashMenu: the `v-if="visible"` root is wrapped in a transparent
  `<template>`; title/description/empty texts render inside an extra
  inline `<span>`; `v-for` items carry no `:key`; handlers emit
  component events (no listeners, no-op); `range` ref initializes as
  `undefined` instead of `null` (both falsy); `==` is emitted instead of
  `===` in the template (operands are always strings/numbers of the same
  type); the `:style` binds the three position keys explicitly
  (`{ top, left, visibility } as any` from three `ref('')` model vars —
  empty strings are dropped by Vue, same as the original's `ref({})`).
- BubbleMenu: the static `class="autodown-bubble-menu"` on the tiptap
  wrapper is emitted as a bound `:class="'autodown-bubble-menu'"`; the
  wrapper and each lucide icon get an auto-generated `:key`; the `active`
  flags are precomputed booleans from the `buttons` computed instead of
  per-render `isActive()` template closures (see BubbleMenu note 3);
  `v-for` buttons carry no `:key`; tooltip/linkPrompt defaults use the
  `&&`/`||` idiom / `runBubbleLink`'s `??` (generated prop defaults are
  not applied at runtime).
- TableMenu: the `v-if` root is wrapped in a transparent `<template>`;
  `:style` binds the three style keys explicitly
  (`{ top, left, visibility } as any`, unset keys are dropped by Vue —
  same as the original's `ref({})`); lucide icons get an auto-generated
  `:key`; handlers emit no-op `Run`/`OutsideClick` component events.
