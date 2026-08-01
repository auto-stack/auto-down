// theme_popover_ext.ts — hand-written TS extension for theme_popover.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the theme-store facade re-export (dual-resolution shim — resolves to
//   front/src/stores/theme.ts in the front tree and to a stub in the gen
//   project),
// - the Teleport/lucide re-exports (the DSL has no teleport element and no
//   npm imports; rendered via `dyn`),
// - the static accents list (object literals as a computed body emit
//   invalid JS; an imported const is dot-stripped to a bare symbol),
// - the onClickOutside closest() guard (DOM API + the DSL's
//   `.contains` → `.includes` array-method trap).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { Teleport, h } from 'vue'
import { Sun, Moon } from 'lucide-vue-next'
import { useThemeStore, type ThemeAccent } from '../../../../src/stores/theme'

export { useThemeStore, Sun, Moon }

/** <Teleport to="body"> wrapper: the DSL has no teleport element and `to:`
 *  on a dyn block mis-parses (to is a keyword token) into junk children —
 *  the widget renders this via `dyn`, same mounted DOM as the original's
 *  <Teleport to="body">. */
export const BodyTeleport = (_props: any, { slots }: any) =>
  h(Teleport, { to: 'body' }, slots)

export interface AccentSwatch {
  key: ThemeAccent
  label: string
  color: string
}

/** Original: the static accents list from ThemePopover.vue's script.
 *  Exposed through a zero-arg fn: a computed whose body is a dot-ref to an
 *  imported const is mis-typed `computed<number>` by the DSL's name
 *  heuristic, while a Call body emits `computed<any>` (backlinks
 *  current_title precedent). */
export function themeAccents(): AccentSwatch[] {
  return [
    { key: 'indigo', label: 'Indigo', color: 'hsl(238 55% 58%)' },
    { key: 'emerald', label: 'Emerald', color: 'hsl(160 60% 38%)' },
    { key: 'rose', label: 'Rose', color: 'hsl(350 70% 55%)' },
    { key: 'amber', label: 'Amber', color: 'hsl(38 90% 50%)' },
    { key: 'slate', label: 'Slate', color: 'hsl(220 10% 45%)' },
  ]
}

/** Original onClickOutside guard: `!target.closest('.theme-popover')`.
 *  Kept verbatim even though the overlay and the popover are sibling fixed
 *  layers (the popover sits above the overlay), so a click that reaches the
 *  overlay is always "outside" — see the .Close handler note in
 *  theme_popover.at. */
export function isOutsideThemePopover(event: MouseEvent): boolean {
  const target = event.target as HTMLElement
  return !target.closest('.theme-popover')
}
