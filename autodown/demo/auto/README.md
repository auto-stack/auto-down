# Auto widget sources for the demo app

`src/App.vue` and `src/components/CustomScrollbar.vue` are generated from
Auto language widget DSL sources in this directory by the Auto compiler
(`D:/autostack/auto-lang`, binary `target/debug/auto.exe`).
The original hand-written scrollbar is kept at
`src/components/CustomScrollbar.vue.bak`.

## VM desktop track（VM 桌面跑法，plan 040 双轨）

The same `src/front/app.at` drives BOTH render targets:

```sh
# vue track (regenerates + deploys demo/src/App.vue, see Regenerate below)
bash gen/regen.sh

# iced native desktop track — from autodown/demo/auto:
D:/autostack/auto-lang/target/debug/auto.exe run -r vm
```

Feature prerequisite: since plan 040 the `autodown` feature is part of the
auto CLI **default** set — any fresh `cargo build -p auto` (run in
`D:/autostack/auto-lang`) produces a binary with true rendering; no manual
`--features autodown` is needed. If a stale binary without the feature runs
the vm track, both panels degrade to plain textareas (D-GAP-3) — rebuild to
fix.

What works on the VM track (v1): dual equal-width panels with true
rendering (heading / paragraph with inline marks / lists / blockquote /
code fence — the 6-block subset), the left block-editor shell
(block-granularity editing, `oninput: .Edit` linkage via the INPUT_TEXT
payload channel), and the AutoUI MCP channel on `http://127.0.0.1:9247`
(`autoui_snapshot` / `autoui_type` into the editor / `autoui_screenshot`)
for scripted verification. First-light evidence: `vm-first-light.png`
(plan 040 T11, captured via the MCP internal screenshot channel); the
two-column acceptance shot is `vm-two-columns.png` (PLAN-046 T2).

VM track status (see DEBTS.md 040/043 rows and `PARITY.md`):

- **Two-column layout — CONSUMED since PLAN-046**: the panels are a
  core-layout `row` of two `col`s (`flex-1` equal width) — VM consumes
  row/col natively and `flex-1` → Flex1 → width=Fill; the pre-046
  vertical-stack degradation (README「Layout note」v1 divergence) is
  retired. Evidence: `vm-two-columns.png`.
- **Scroll sync — CONSUMED since PLAN-043**: `scroll_sync: true` wraps the
  pane in a View::Scrollable — `scroll_top` binding is the write arm and
  the `onscroll` event the read arm (args = scrollHeight, clientHeight,
  scrollTop); the two panes sync proportionally in both directions
  (vm-smoke group 4 asserts it).
- **Ghost placeholder — CONSUMED since PLAN-044**:
  `placeholder_block_id`/`placeholder_height` bind into the read-only arm —
  the `block-N`-hit block grows a fixed-height `View::Container{bg-muted}`
  ghost box; the emission chain is the editor's `onfocusblock` message
  (block index + DocLayout-measured height → rust fast-path writes the
  `ghost_id`/`ghost_height` state; vue rides `@focusblock` → bridge).
  vm-smoke group 5 asserts it (MCP `click` → state + snapshot wrap).
  `streaming` stays always-final (exemption retained — see DEBTS 040).
- **Table column-width dragging** → PLAN-045 (PARITY #4).
- **CustomScrollbar data — resolved since PLAN-043**: the csb_* computeds
  dispatch by track — vue reads the ext bridge (unchanged), VM reads the
  scroll state fed by onscroll messages. Thumb visuals trail the vue look
  → theme wave (PARITY #8).
- **Theme look — divergence (PARITY #5)**: vue is light (toolbar #fff /
  text #111827 from the app.at style block), VM renders the dark default
  theme; renderer-pane padding/border cosmetics are in the same family.
  Home: wave W2, gated on auto-lang PLAN-527 T8 (dark/theme).
- **Initial document seed — divergence (PARITY #6)**: vue loads
  `src/content.ts` through the ext `initial_content()`; the VM ext stub
  returns "" (empty start — type to see live rendering). Home: wave W3,
  gated on an auto-lang ext-asset mechanism or DSL multi-line literals.
- **Ext stub warnings** — `initial_content` / `is_vue` / `logSave` /
  `logCancel` / `useDemoAppBridge` have no VM-target implementation and
  degrade to no-op platform stubs (runtime warns once each; expected;
  PARITY #11).

Layout note: the scoped `style {}` block still compiles to vue
`<style scoped>` — since PLAN-046 it carries (a) scoped definitions of
exactly the Tailwind utilities the view tree uses (the demo build has no
Tailwind runtime, so these are the vue-side fallback; the VM track
consumes the same classes natively through auto-lang's tailwind parser)
and (b) the `:deep` vue-only enhancements. The two panels themselves are
a core-layout `row` + two `col`s (equal width on both tracks — see the
「Two-column layout」 status bullet above).

## Layout

- `pac.at` — Auto project manifest (`scene: "ui"`, `render: "vue"`).
  `npm_deps` links the real `@autodown/editor` / `@autodown/vue` packages
  (`link:` relative to `gen/front/vue`), so the gen build type-checks and
  bundles against the real editor, not stubs.
- `src/front/app.at` — the real root `widget App` (plan 014): full demo
  layout (toolbar / panels / splitter / CustomScrollbar), event wiring,
  component refs, and the scoped `style {}` block. Emitted as `App.vue`.
- `src/front/custom_scrollbar.at` — the `CustomScrollbar` widget, emitted
  as `gen/front/vue/src/components/CustomScrollbar.vue`.
- `src/front/utils/app_ext.ts` — ext module: `useDemoAppBridge()` (zero-arg
  composable holding the workspace/editor/renderer refs,
  `useSyncedScroll`, `useTableColumnResize` in a `reactive` bag), the
  `initial_content()` document seed + `is_vue()` track probe (plan 040),
  and the save/cancel log helpers. The AutoDownEditor/StreamingRenderer
  component re-exports are RETIRED (plan 040) — the dual-track tags
  `autodown_editor` / `autodown` resolve the engine components via the
  widget registry (`pac.at` `npm_deps` still links `@autodown/engine`).
- `gen/` — transient generator output (gitignored, safe to delete);
  `gen/regen.sh` is the regen+gate+deploy script (also gitignored).

Hand-written (out of DSL scope, same boundary as the editor package):
`demo/src/composables/*.ts` (DOM measurement), `demo/src/main.ts`,
`demo/src/content.ts` (initial markdown — DSL has no multi-line template
strings), `demo/src/app.css` (global `html, body, #app` styles — the DSL
`style {}` block only emits `<style scoped>`).

## Regenerate

From `autodown/demo/auto`:

```sh
bash gen/regen.sh
# use a specific compiler build (e.g. a worktree):
AUTO=D:/autostack/auto-lang/.worktree/auto-down/target/debug/auto.exe bash gen/regen.sh
```

`regen.sh` runs `auto build -d .` (which itself runs `pnpm install` +
`vue-tsc` + `vite build` inside `auto/gen/front/vue` — a self-contained
project, not part of the autodown pnpm workspace), gates on compiler
warnings / TS errors, then deploys:
`App.vue` → `demo/src/App.vue`,
`components/CustomScrollbar.vue` → `demo/src/components/CustomScrollbar.vue`.
Deploy rewrites gen-tree paths (`@/ext/src/front/utils/app_ext` →
`../auto/...`, `@/components/CustomScrollbar.vue` → `./components/...`)
via sed.

（注意：`auto build` 的 `-d` 只接受项目目录本身（如 `-d .`），从 demo 根
`-d auto` 会报 "pac.at not found in workspace"。）

### double-src mirror (jade gap 32)

The ext module imports `../../../../src/...` (the hand-written demo
composables). In the gen tree those resolve to `src/src/...`, so `regen.sh`
copies the real `demo/src/{composables,content.ts}` into
`gen/front/vue/src/src/...` before building. This mirrors the known jade
double-src workaround.

Quick syntax check of a widget source without a full build:

```sh
D:/autostack/auto-lang/target/debug/auto.exe src/front/app.at
# parse errors surface immediately; the VM runtime error that follows for a
# widget file is expected and harmless
```

## Interface differences vs the original hand-written SFC

Plan 015 batch A restored the original emit contract via quoted msg
variants — `update:scrollTop` (number) and `hover-change` (boolean) are
verbatim again, and `visible` is optional (`withDefaults`) as in the
original. One residual deviation:

- `hover-change` call sites pass int `1`/`0` (the DSL still can't pass bool
  literals as view event args — plan 015 P1#5); the handler reassigns
  `v = v == 1` so the emitted payload is a proper boolean.

Remaining differences (behaviorally invisible):

- Dynamic classes are `visible` / `dragging` instead of `is-visible` /
  `is-dragging`: the DSL style-map codegen does not quote hyphenated keys,
  which would produce invalid JS. The scoped CSS was renamed in sync.
  e2e selectors (`.custom-scrollbar`, `.custom-scrollbar-thumb`) are
  unaffected.
- The generated SFC also declares/emits the internal msgs (`TrackDown`,
  `StartDrag`, `DragMove`, `EndDrag`) — noise the parent never listens to.
- The track carries an inert `@scroll="update_scrollTop"` binding. The
  track never scrolls, so it never fires; it exists only so the Auto
  generator marks the handler as "used" and emits the function +
  `defineEmits` entry (plan 015 P1#4, compiler fix pending).

Plan 015 batch A also retired the imperative thumb geometry: thumb
`height`/`transform` are computeds bound via `style_obj:` (native `:style`),
replacing the `thumbEl` ref + `SyncThumb` handler + window-scroll capture.
The old residual gap — an edit changing `scrollHeight` without a
scroll/mouse event left the thumb stale — is gone: props now propagate
reactively.

## DSL gotchas discovered (compiler not patched)

1. Event-handler params must be `$event` paths or identifiers — literal
   params like `.HoverChange(true)` fail to parse ("Expected term, got
   RBrace"). Use ints (`.HoverChange(1)`).
2. Logical operators in view expressions are `||` / `&&`, not `or` / `and`.
3. Bare `.Msg()` expression statements are not accepted in `on` blocks;
   use `let _ = .Msg()`.
4. Empty `on` handler bodies (`-> {}`) are not accepted; add a no-op.
5. msg variant payloads are positional (`UpdateScrollTop(f64)`), not named.
6. A handler-local variable must not share a name with a model state var —
   every ident with that name gets the `.value` state treatment.
7. `col`/`row` layout primitives inject `flex flex-col` classes and, when
   combined with a `style:` map, drop the user `class`. Plain `div` avoids
   both problems.

## Plan 014 additions (App.vue Auto 化)

New probe conclusions (probe project: `tmp/dsl-probes/plan014/`, gitignored):

8. External component event binding works: `on"save": .h($event)` on an ext
   component emits `@save="h($event)"`; PascalCase msg events likewise
   (`on_UpdateScrollTop:` → `@UpdateScrollTop`).
9. `ref: "editorRef"` on a component emits `const editorRef = ref<any>(null)`.
   In `.Init` (onMounted), `.bridge.x = .x` assigns `x.value!` through the
   reactive bag — this is how the widget refs are handed to the bridge.
10. **Ordering trap**: DSL `composable:` imports are called at the TOP of
    setup, but `.Init` registers onMounted AFTER them — so
    `useSyncedScroll`'s DOM init must be lazy. `useSyncedScroll` was
    refactored accordingly (`initWorkspace()` + a `watch` on
    `options.workspaceRef.value` instead of direct onMounted init).
11. `style {}` passes through verbatim into `<style scoped>` (`:deep()` OK).
    There is NO global-style channel — global rules go to `demo/src/app.css`.
12. `streaming: false` (bool literal prop), ternary computeds, and empty
    handler bodies (with a no-op) all work as expected.
13. The dead `hoveringScrollbar` state from the hand-written App.vue was
    dropped in the Auto version (it was write-only; no behavior change).
14. f-strings are NOT supported as computed bodies (silently emit
    `computed<any>(() => undefined)` — plan 015 batch A). Put the f-string
    inline in the `style_obj:` value instead; string-returning computeds
    otherwise need an ext helper (jade `sidebarLeftWidth` precedent).

### auto-lang division regression (fixed in worktree)

c2f57577 ("补回 bug 1/2/3 修复", 2026-08-08) regressed `/` and `%` lowering
in `ts_adapter.rs`: `expr_looks_float` was purely structural (float literals
only), so f64-typed state/props got wrapped in `Math.trunc` — e.g.
`Math.trunc(clientHeight / scrollHeight) * clientHeight` = 0, killing the
CustomScrollbar thumb (e2e scroll-sync:29 red). Fixed on the
`.worktree/auto-down` branch: `/`/`%` lower to `Math.trunc` ONLY when both
operands are proven int (int literals or int-typed state/props via the new
`typed_ints` context set); float-typed and unknown-type operands keep native
JS division. Locked by `cap_div_mod_trunc_only_for_proven_int` in
`crates/auto-lang/tests/vue_capabilities.rs`. Merged to auto-lang master as
327462e4; the stock master binary (`target/debug/auto.exe`) is again the
default for regen.

## VM smoke（plan 042 T8：`vm-smoke.mjs`）

Scripted smoke over the same AutoUI MCP channel (replaces 040 T11's pure
manual check). Two terminals:

```sh
# 1) the window (from autodown/demo/auto):
D:/autostack/auto-lang/target/debug/auto.exe run -r vm

# 2) the smoke (asserts: editor input face focusable+typable, .Edit ->
#    state.content linkage, right panel renders the typed doc with the
#    `# ` marker consumed):
node vm-smoke.mjs            # exit 0 = pass; --port <n> for a non-default
                              # AUTOUI_MCP_PORT window
```

Notes: the script types a per-attempt nonce doc, so it is repeatable
against a live window (no restart between runs); on failure it retries the
whole run once (the jade README:127 silent-exit bar — physical-click probes
flake; this script stays on the MCP logical channel).
