# Auto widget sources for the demo app

`src/components/CustomScrollbar.vue` is generated from Auto language
widget DSL sources in this directory by the Auto compiler
(`D:/autostack/auto-lang`, binary `target/debug/auto.exe`).
The original hand-written component is kept at
`src/components/CustomScrollbar.vue.bak`.

## Layout

- `pac.at` — Auto project manifest (`scene: "ui"`, `render: "vue"`)
- `src/front/custom_scrollbar.at` — the `CustomScrollbar` widget
- `src/front/app.at` — placeholder root widget. The generator always emits
  the root widget as `App.vue`; secondary widgets land in
  `gen/front/vue/src/components/<Name>.vue`. The dummy App exists only so
  `CustomScrollbar` is generated as a standalone component SFC.
- `gen/` — transient generator output (gitignored, safe to delete)

## Regenerate

From `autodown/demo`:

```sh
cd auto
D:/autostack/auto-lang/target/debug/auto.exe build -d .
cd ..
cp auto/gen/front/vue/src/components/CustomScrollbar.vue src/components/CustomScrollbar.vue
```

（注意：`-d` 只接受项目目录本身（如 `-d .`），从 demo 根 `-d auto` 会报
"pac.at not found in workspace"。）

`auto build` also runs `pnpm install` + `vue-tsc` + `vite build` inside
`auto/gen/front/vue` (a self-contained project, not part of the autodown
pnpm workspace), which type-checks the generated SFC.

Quick syntax check of the widget source without a full build:

```sh
D:/autostack/auto-lang/target/debug/auto.exe src/front/custom_scrollbar.at
# parse errors surface immediately; the VM runtime error that follows for a
# widget file is expected and harmless
```

## Interface differences vs the original hand-written SFC

The Auto widget DSL derives Vue emits from msg variants (PascalCase only)
and cannot produce literal emit names. `demo/src/App.vue` (hand-written
glue) was adjusted accordingly:

| original                     | generated                |
| ---------------------------- | ------------------------ |
| `update:scrollTop` (number)  | `UpdateScrollTop` (number) |
| `hover-change` (boolean)     | `HoverChange` (number, 1/0) |

Parent bindings changed from `@update:scroll-top` / `@hover-change` to
`@UpdateScrollTop` / `@HoverChange`. Behavior is unchanged.

Other differences (behaviorally invisible):

- Dynamic classes are `visible` / `dragging` instead of `is-visible` /
  `is-dragging`: the DSL style-map codegen does not quote hyphenated keys,
  which would produce invalid JS. The scoped CSS was renamed in sync.
  e2e selectors (`.custom-scrollbar`, `.custom-scrollbar-thumb`) are
  unaffected.
- The generated SFC also declares/emits the internal msgs (`TrackDown`,
  `StartDrag`, `DragMove`, `EndDrag`, `ScrollSync`, `SyncThumb`) — noise
  the parent simply never listens to.
- Thumb geometry (`height` / `transform` inline styles) is written
  imperatively via the `thumbEl` ref from a `SyncThumb` handler, because
  the DSL has no `:style` object binding and no `watch`. `SyncThumb` runs
  on: mount, window `scroll` (capture phase — catches any panel scroll,
  which is how prop changes manifest), hover, and thumb drag.
  Residual gap: an edit that changes `scrollHeight` without firing any
  scroll/mouse event leaves the thumb stale until the next such event
  (in practice a mousemove follows any edit immediately).
- `visible` prop is required, not optional (the parent always passes it).
- The track/thumb carry inert `@scroll` bindings (`@scroll="UpdateScrollTop"`
  / `@scroll="SyncThumb"`). Neither element can scroll, so they never fire;
  they exist only so the Auto generator marks those handlers as "used" and
  emits the corresponding functions + `defineEmits` entries.

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
