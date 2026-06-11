# Plan: i18n, Icon Decoupling, Playground, and Changeset Setup

## 1. i18n — Hard-coded text → props/slots

### AutoDownEditor.vue
- Add props: `saveLabel` (default: "Save"), `cancelLabel` (default: "Cancel"), `imageUrlPrompt` (default: "Enter image URL"), `linkUrlPrompt` (default: "Enter URL").
- Save / Cancel button text use **slots** (`<slot name="save-label">{{ saveLabel }}</slot>`, `<slot name="cancel-label">{{ cancelLabel }}</slot>`) so callers can replace with icons or custom markup.
- Pass `imageUrlPrompt` / `linkUrlPrompt` down to `BubbleMenuVue` and use in `window.prompt` calls.

### BubbleMenu.vue
- Add `linkPrompt` prop (default: "Enter URL") for the link prompt text.
- Add `tooltips` prop (object `{ bold?: string, italic?: string, underline?: string, strike?: string, code?: string, link?: string }`) to override button titles; fallback to current English titles.

### SlashMenu.vue
- Add `noResultsText` prop (default: "No results").

### TableMenu.vue
- Add `titles` prop (object `{ addRowBefore?, addRowAfter?, addColumnBefore?, addColumnAfter?, deleteRow?, deleteColumn?, deleteTable? }`) to override button titles; fallback to current English titles.

> Slash-item titles / descriptions are defined in `AutoDownEditor.vue` as the `slashItems` array; consumers can already pass a fully custom `:slash-items` array for full i18n, so no extra prop is needed there.

## 2. Icon Decoupling — `lucide-vue-next` → peerDependency

### packages/editor/package.json
- Move `lucide-vue-next` from `dependencies` to `peerDependencies` (keep current version range `^0.460.0`).

### packages/editor/vite.config.ts
- No change needed — `lucide-vue-next` is already in `rollupOptions.external`.

## 3. Playground — Add `demo/` directory

Create a minimal Vite app at repo root:

```
demo/
  package.json      # workspace package, deps: vue, lucide-vue-next, vite, @vitejs/plugin-vue
  vite.config.ts    # standard Vue Vite config
  index.html        # entry HTML
  src/
    main.ts         # createApp(App)
    App.vue         # demo page using <AutoDownEditor> and <StreamingRenderer>
```

- Reference local workspace packages via `workspace:*`.
- Add `demo` to `pnpm-workspace.yaml` (or keep `packages/*` + add `demo`).
- Provide a small editable markdown sample so the user can verify components mount and render.

## 4. MarkdownContent.vue

User explicitly stated this component stays in **auto-forge** because it contains spec-link and Mermaid logic specific to that project. **No action** in this repository.

## 5. Publish — Initialize Changeset

- Run `pnpm changeset init` to create `.changeset/config.json` and related files.
- Optionally create an initial changeset for the current packages so `changeset publish` works immediately after versioning.

---

# Post-Plan Changes: Table Resize UX

## 6. Demo Layout — Full-Screen Split View

### demo/src/App.vue
- Restructured to full-screen app: toolbar header + left/right panels.
- Left panel: `<AutoDownEditor>` (scrollable).
- Right panel: `<StreamingRenderer>` preview (scrollable).
- Both panels fill available height with `overflow-y: auto`.

## 7. Preview Table Styling

### demo/src/App.vue (unscoped styles)
- Added `table { width: 100%; border-collapse: collapse; }`
- Added `th/td` borders, padding, zebra-striping (`tr:nth-child(even)`).
- Added `box-sizing: border-box` to cells for accurate width calculations.
- Hidden markstream-vue's built-in resize handle: `.table-node__resize-handle { display: none !important; }`.

## 8. Preview Column Resize (`useTableColumnResize`)

### demo/src/composables/useTableColumnResize.ts (new)
- Custom composable for preview-side table column resizing.
- Listens on container `mousemove`/`mousedown`.
- Detects when mouse is within 6px of a cell's right edge.
- Shows a **full-table-height blue indicator** (`position: fixed`, 2px wide) at the boundary.
- On drag start: freezes table layout (`table-layout: fixed; width: auto`) and snapshots current natural widths into explicit pixel widths.
- During drag: updates `th.style.width` and shows indicator at the **actual boundary** (`getBoundingClientRect().right`) so users see when the browser clamps the width.
- Handles leftward drag correctly by using the header cell's actual right edge as `startX`.

## 9. Editor Column Resize Indicator

### packages/editor/src/extensions/ColumnResizeIndicator.ts (new)
- ProseMirror plugin that replaces the default prosemirror-tables resize handle visualization.
- **Hides** the default `.column-resize-handle` via CSS (`visibility: hidden`) but keeps it in layout so the plugin can detect when prosemirror-tables thinks the mouse is near a boundary.
- Uses `requestAnimationFrame` loop + `elementFromPoint` to find the hovered cell.
- **Temporarily hides its own indicator** before calling `elementFromPoint` to avoid self-interception.
- **Verifies the cell belongs to the editor's table** (not the preview) via `editorView.dom.contains(table)`.
- Places the indicator at the **nearest boundary** (left or right edge of the hovered cell), so it stays correct even when the mouse is 1–2px into the next cell.
- Indicator is `position: fixed`, 2px wide, spans full table height, same blue color as preview.

### packages/editor/src/extensions/index.ts
- Removed `RowResizingExtension` (row resize was incomplete and not useful).
- Added `ColumnResizeIndicator` to the extensions array.
- Kept `Table.configure({ resizable: true, handleWidth: 8, cellMinWidth: 60 })` so prosemirror-tables still handles the actual resize transactions.

### packages/editor/src/styles/autodown-editor.css
- Hidden default `.column-resize-handle` with `visibility: hidden !important`.
- Kept `.resize-cursor` rules for `col-resize` cursor.
- Removed all row-resize CSS rules.

## 10. Verification

- Playwright screenshot tests confirm both editor and preview show the blue indicator at the correct column boundary.
- Both sides use `col-resize` cursor.
- Edge cases verified: mouse slightly left/right of boundary, middle of cell (no indicator), actual drag behavior.
