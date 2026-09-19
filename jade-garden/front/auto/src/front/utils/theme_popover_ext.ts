// theme_popover_ext.ts — hand-written TS extension for theme_popover.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the theme-store facade re-export (dual-resolution shim — resolves to
//   front/src/stores/theme.ts in the front tree and to a stub in the gen
//   project),
// - the lucide re-exports (the DSL has no npm imports; rendered via `dyn`
//   — the teleport itself is now the DSL's native teleport element,
//   compiler f8acfb43),
// - the onClickOutside closest() guard (DOM API + the DSL's
//   `.contains` → `.includes` array-method trap).
//
// PLAN-077 T-01 sink: the static accents list moved into the .at module fn
// theme_accents (object-literal list return — Q-4 probe green both tracks,
// mode doc §6.0#3); the AccentSwatch interface went with it (no consumer
// left on the ext side).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { Sun, Moon } from 'lucide-vue-next'
import { useThemeStore } from '../../../../src/stores/theme'

export { useThemeStore, Sun, Moon }

/** Original onClickOutside guard: `!target.closest('.theme-popover')`.
 *  Kept verbatim even though the overlay and the popover are sibling fixed
 *  layers (the popover sits above the overlay), so a click that reaches the
 *  overlay is always "outside" — see the .Close handler note in
 *  theme_popover.at. */
export function isOutsideThemePopover(event: MouseEvent): boolean {
  const target = event.target as HTMLElement
  return !target.closest('.theme-popover')
}
