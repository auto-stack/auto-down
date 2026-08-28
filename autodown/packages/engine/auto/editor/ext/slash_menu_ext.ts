// slash_menu_ext.ts — Hand-written TS extension for the SlashMenu widget
// (../slash_menu.at). Imported via `use { fn: ... }`; the Auto build copies
// it into the gen project as src/ext/src/front/utils/slash_menu_ext.ts, and
// the generated SlashMenu.vue (copied to src/menus/) imports it from
// ../auto/src/front/utils/slash_menu_ext.
//
// Everything else from the original port (filtering, two-phase positioning,
// scroll-into-view, markHandled, command dispatch, list length) lives in the
// widget DSL itself — those moves were originally forced by the mistaken
// belief that the DSL had no closures/object literals/`??`; probes against
// the phase3 worktree compiler proved otherwise (see src/auto/README.md).
// What remains here genuinely cannot be expressed in the DSL:
//
// 1. computeMenuPosition re-export. The position math must stay in the real
//    composables/useMenuBounds.ts (single source of truth, also used by
//    TableMenu/CodeBlockMenu), but a `use` path cannot leave the project
//    src/ (`..` is rejected by auto-man), so the widget imports it via this
//    re-export. The relative path resolves both in the editor package
//    (src/auto/src/front/utils → src/composables) and in the gen project
//    (src/ext/src/front/utils → src/composables, mirrored by the regen
//    script).

export { computeMenuPosition } from '../../../../composables/useMenuBounds'
