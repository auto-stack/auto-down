// table_menu_ext.ts — Hand-written TS extension for the TableMenu widget
// (../table_menu.at). Imported via `use { fn: ... }`; the Auto build copies
// it into the gen project as src/ext/src/front/utils/table_menu_ext.ts, and
// the generated TableMenu.vue (copied to src/menus/) imports it from
// ../auto/src/front/utils/table_menu_ext.
//
// Everything else from the original port (the reactive state composable,
// the selectionUpdate subscription with its rAF throttle, the outside-click
// listener, the two-phase positioning, the command dispatch) lives in the
// widget DSL itself — those moves were originally forced by the mistaken
// belief that the DSL had no closures/object literals; probes against the
// phase3 worktree compiler proved otherwise (see src/auto/README.md). What
// remains here genuinely cannot be expressed in the DSL:
//
// 1. computeMenuPosition re-export. The position math must stay in the real
//    composables/useMenuBounds.ts (single source of truth, also used by
//    SlashMenu/CodeBlockMenu), but a `use` path cannot leave the project
//    src/ (`..` is rejected by auto-man), so the widget imports it via this
//    re-export. The relative path resolves both in the editor package
//    (src/auto/src/front/utils → src/composables) and in the gen project
//    (src/ext/src/front/utils → src/composables, mirrored by the regen
//    script).
// 2. tableMenuTitles. `??` works in handler bodies but NOT in computed
//    expressions, an object-literal computed body does not parse (probe:
//    emitted as a block, TS1005), and scalar `&&`/`||` computeds are
//    mis-typed `computed<boolean>` (probe). The spread merge keeps the
//    original's `??` semantics (an explicitly empty-string title is kept).

export { computeMenuPosition } from '../../../../composables/useMenuBounds'

type TableTitleKey =
  | 'addRowBefore'
  | 'addRowAfter'
  | 'addColumnBefore'
  | 'addColumnAfter'
  | 'deleteRow'
  | 'deleteColumn'
  | 'deleteTable'

const DEFAULT_TITLES: Record<TableTitleKey, string> = {
  addRowBefore: 'Add row above',
  addRowAfter: 'Add row below',
  addColumnBefore: 'Add column left',
  addColumnAfter: 'Add column right',
  deleteRow: 'Delete row',
  deleteColumn: 'Delete column',
  deleteTable: 'Delete table',
}

// titles prop merged over the defaults (generated prop defaults are not
// applied at runtime, so the merge lives here; bound via a computed).
export function tableMenuTitles(
  titles: Partial<Record<TableTitleKey, string>> | null | undefined
): Record<TableTitleKey, string> {
  return { ...DEFAULT_TITLES, ...(titles ?? {}) }
}
