// recent_files_panel_ext.ts — hand-written TS extension for
// recent_files_panel.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the recentFiles/tabs store facade re-exports (dual-resolution shim),
// - the lucide icon re-exports (npm imports are not expressible in the
//   DSL; the icons render via `dyn` — <component :is> — so the rendered
//   DOM is identical). Both the front tree and the gen project depend on
//   lucide-vue-next, so no gen stub is needed for this import,
// - formatTime (Date/toLocaleTimeString are not expressible) — exported
//   since the PLAN-077 sink: the .at's recent_files_with_time module fn
//   calls it per row over the use-fn channel (Q-3 time bridge,
//   snippet_html precedent).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { useRecentFilesStore } from '../../../../src/stores/recentFiles'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useRecentFilesStore, useTabsStore }
export { Clock, X, Trash2 } from 'lucide-vue-next'

/** Original formatTime, verbatim. */
export function formatTime(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** recent.remove(path) — routed through the extension because the DSL
 *  transpiler maps a `.remove(...)` method call to `.splice(...)` (its
 *  array-method mapping) on ANY receiver. */
export function removeRecent(path: string): void {
  useRecentFilesStore().remove(path)
}
