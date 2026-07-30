# Auto widget sources for @autodown/editor

`src/components/CodeLanguageIcon.vue`, `src/menus/SlashMenu.vue`,
`src/menus/BubbleMenu.vue`, `src/menus/TableMenu.vue` and
`src/menus/CodeBlockMenu.vue` are
generated from Auto language widget DSL sources in this directory by the
Auto compiler.

**Compiler**: use the phase3 worktree binary
`D:/autostack/auto-lang/.worktree/phase3-dsl-capabilities/target/debug/auto.exe`.
The 3.0a/3.0b DSL capabilities this project relies on (quoted custom
events, `style_obj`, `dyn`, `watch`, `use { fn/composable }`) are not
merged back to master — do NOT use the main `D:/autostack/auto-lang`
binary.

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
- `src/front/utils/slash_menu_ext.ts` — hand-written TS extension imported
  by `slash_menu.at` via `use { fn: ... }`. Only two things remain (both
  genuinely inexpressible in the DSL — see the SlashMenu section below):
  the `computeMenuPosition` re-export from the real
  `src/composables/useMenuBounds.ts` (single source of truth; a `use` path
  cannot leave `src/`), and the tiny `noResultsOr` helper (`??` is not
  supported in computed expressions). Everything else (filtering, two-phase
  positioning, scroll-into-view, `markHandled`, command dispatch) lives in
  the widget DSL itself. It is shared verbatim between the Auto gen project
  and the editor package build.
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
  `tableMenuTitles` remain (the same two gaps as the slash extension).
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
- `src/composables/tiptapBubbleMenu.ts` (editor tree) — the real
  re-export of `BubbleMenu` from `@tiptap/vue-3/menus`. The bubble
  extension imports it via a `../../../../composables/...` path that
  resolves in both trees (same trick as `useMenuBounds`).
- `stubs/gen_tiptapBubbleMenu.ts` — gen-project stub for that module (the
  self-contained gen project has no `@tiptap/*` dependency); mirrored into
  `gen/front/vue/src/composables/tiptapBubbleMenu.ts` by the regen script.
  Never ships: the copied `src/menus/BubbleMenu.vue` resolves the real
  module in the editor tree.
- `src/front/app.at` — placeholder root widget. The generator always emits
  the root widget as `App.vue`; secondary widgets land in
  `gen/front/vue/src/components/<Name>.vue`. The dummy App exists only so
  the real widgets are generated as standalone component SFCs.
- `gen/` — transient generator output (gitignored, safe to delete)

## Regenerate

From `autodown/packages/editor`:

```sh
cd src/auto
# Mirror for the gen project only: slash_menu_ext.ts imports the real
# composables/useMenuBounds.ts via a path that resolves both in the editor
# package (src/auto/src/front/utils → src/composables) and in the gen
# project (src/ext/src/front/utils → src/composables). The gen mirror must
# exist before vue-tsc/vite run.
mkdir -p gen/front/vue/src/composables
cp ../composables/useMenuBounds.ts gen/front/vue/src/composables/useMenuBounds.ts
# Same trick for the tiptap BubbleMenu wrapper: the editor tree re-exports
# the real component from @tiptap/vue-3/menus; the gen project (no @tiptap
# dependency) gets the behavior-free stub.
cp stubs/gen_tiptapBubbleMenu.ts gen/front/vue/src/composables/tiptapBubbleMenu.ts
D:/autostack/auto-lang/.worktree/phase3-dsl-capabilities/target/debug/auto.exe build -d .
cd ..
cp src/auto/gen/front/vue/src/components/CodeLanguageIcon.vue src/components/CodeLanguageIcon.vue
# The generated SFC imports the extension via the gen-only `@/ext/...`
# alias; rewrite it to the editor-relative path while copying.
sed 's|@/ext/src/front/utils/slash_menu_ext|../auto/src/front/utils/slash_menu_ext|g' \
  src/auto/gen/front/vue/src/components/SlashMenu.vue > src/menus/SlashMenu.vue
sed 's|@/ext/src/front/utils/bubble_menu_ext|../auto/src/front/utils/bubble_menu_ext|g' \
  src/auto/gen/front/vue/src/components/BubbleMenu.vue > src/menus/BubbleMenu.vue
sed 's|@/ext/src/front/utils/table_menu_ext|../auto/src/front/utils/table_menu_ext|g' \
  src/auto/gen/front/vue/src/components/TableMenu.vue > src/menus/TableMenu.vue
sed 's|@/ext/src/front/utils/code_block_menu_ext|../auto/src/front/utils/code_block_menu_ext|g' \
  src/auto/gen/front/vue/src/components/CodeBlockMenu.vue > src/menus/CodeBlockMenu.vue
```

（注意：`-d` 只接受项目目录本身（如 `-d .`），从包根 `-d src/auto` 会报
"pac.at not found in workspace"。）

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

## Known Auto language gaps (as of 2026-07, compiler not patched)

1. **No import of hand-written TS from widget code.** `use` only covers
   Auto stores/types and `back.api`; plain-function sibling `.at` modules
   are not transpiled for the `ui` scene, and there is no raw-TS escape
   hatch. Therefore `getLanguageIconUrl` from
   `src/utils/codeBlockLanguage.ts` is **reimplemented** in
   `code_language_icon.at` instead of imported. Keep the two in sync.
2. **`computed` expressions are too limited for this logic** (bare
   identifiers and plain function calls like `btoa(x)` fail to parse;
   `.prop` refs mis-generate as `self.prop`; string concatenation on
   parenthesized receivers mis-codegen), so the original's reactive
   `computed(() => ...)` is approximated by computing the URL once in
   `.Init` (-> `onMounted`). A `language` prop change after mount will
   not update the icon (the prop is static per code block in practice).
   (An earlier revision of this note also claimed the DSL had "no
   `watch`" — wrong; `watch { .x -> { ... } }` exists and is used by
   `slash_menu.at`. The `computed` limitations above, however, were
   re-confirmed by probes: see the SlashMenu section.)
3. Browser globals used by generated code: `btoa` (passes through the
   a2ts transpiler verbatim; typed by TS DOM lib).

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
2. **`noResultsOr` stays in the extension.** `??` works in handler bodies
   but NOT in computed expressions (the computed codegen emits `undefined`
   for `Expr::NullCoalesce`), and a `||` substitute would be mis-typed
   `computed<boolean>` by the type inference.
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
6. **Expression parentheses are dropped by the transpiler** (unchanged):
   `(x + 1) % len` mis-emits as `x + 1 % len`, so the ArrowUp/ArrowDown
   wrap-around uses intermediate `let` locals. This also shapes the
   filter: method calls cannot chain onto a concatenation
   (`(a + b).toLowerCase()` loses the parens), so the filter joins via an
   array literal receiver — `[item.title, item.description].concat(
   item.searchTerms).join(" ")` — which needs no parens and preserves the
   original join-then-match semantics exactly (empty query still returns
   all items, via `''.includes('')`).
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
   `??` is unsupported in computed expressions and `(tips || {}).k`
   needs parens (which are dropped), so the buttons computed writes
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
