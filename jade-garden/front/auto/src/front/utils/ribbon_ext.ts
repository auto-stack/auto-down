// ribbon_ext.ts — hand-written TS extension for ribbon.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the store facade re-exports (dual-resolution shims — resolve to
//   front/src/stores/*.ts in the front tree and to stubs in the gen
//   project),
// - the ThemePopover child component re-export (same shim; the generated
//   Ribbon.vue imports it through this module),
// - the lucide icon re-exports (rendered via `dyn`),
// - the static ribbon items list with the per-item active flag precomputed
//   (no Call conditions in view class bindings, and the original's
//   `active(item)` helper takes the store state),
// - the graph-button active predicate (optional chaining + a typed boolean
//   return — the && / || idiom would be mis-typed computed<boolean>),
// - openTodayNote (new Date via todayDate + the dailyNote lib call; the
//   DSL cannot import lib modules).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { FolderTree, Search, Clock, Palette, Network, CalendarDays } from 'lucide-vue-next'
import { useSidebarStore, type LeftPanel } from '../../../../src/stores/sidebar'
import { useTabsStore, type Tab } from '../../../../src/stores/tabs'
import { useFileTreeStore } from '../../../../src/stores/fileTree'
import { openDailyNote, todayDate } from '../../../../src/lib/dailyNote'
import ThemePopover from '../../../../src/components/ThemePopover.vue'

export { useSidebarStore, useTabsStore, useFileTreeStore, ThemePopover, Palette, Network, CalendarDays }

export interface RibbonItem {
  panel: LeftPanel
  icon: any
  label: string
  active: boolean
}

const ITEMS: { panel: LeftPanel; icon: any; label: string }[] = [
  { panel: 'files', icon: FolderTree, label: 'Files' },
  { panel: 'search', icon: Search, label: 'Search' },
  { panel: 'recent', icon: Clock, label: 'Recent' },
]

/** Original: the static items list + active(item) =
 *  `sidebar.leftPanel === item.panel && sidebar.leftOpen`, precomputed per
 *  item (no Call conditions in DSL view bindings). */
export function ribbonItems(leftPanel: LeftPanel, leftOpen: boolean): RibbonItem[] {
  return ITEMS.map(item => ({ ...item, active: leftPanel === item.panel && leftOpen }))
}

/** Original: `tabs.activeTab?.isGraph && !tabs.activeTab?.graphCenterPath`. */
export function graphActive(tab: Tab | null): boolean {
  return !!(tab && tab.isGraph && !tab.graphCenterPath)
}

/** Original: async function openToday() { await openDailyNote(todayDate(), tabs, fileTree) }. */
export async function openTodayNote(
  tabs: { open: (path: string, title?: string) => Promise<void> },
  fileTree: { files: any[]; load: () => Promise<void> },
): Promise<void> {
  await openDailyNote(todayDate(), tabs, fileTree)
}
