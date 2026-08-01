// tab_strip_ext.ts — hand-written TS extension for tab_strip.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the store facade re-exports (dual-resolution shims),
// - the lucide icon re-exports (rendered via `dyn`),
// - stripTabs: the per-tab active flag precompute (view class conditions
//   must be field accesses — ribbon ribbonItems precedent),
// - switchTab / closeTab / openLocalGraphTab: facade setter assignment and
//   the original's guard logic (not DSL lvalues/expressions),
// - openTodayNote / navigateDailyNote: the dailyNote lib calls (regex/Date —
//   no DSL import channel),
// - hasStripTabs / hasStripDaily / stripDailyTitle: typed predicates for the
//   v-if computeds (bare dot-ref bodies would be mis-typed — README gap 28;
//   parseDailyDateFromPath returns Date|null — no DSL optional chaining).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { X, Focus, Network, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-vue-next'
import { useTabsStore, type Tab } from '../../../../src/stores/tabs'
import { useFileTreeStore } from '../../../../src/stores/fileTree'
import {
  openDailyNote,
  openAdjacentDailyNote,
  todayDate,
  parseDailyDateFromPath,
  getDailyNoteTitle,
} from '../../../../src/lib/dailyNote'

export {
  useTabsStore,
  useFileTreeStore,
  X,
  Focus,
  Network,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
}

export interface StripTab extends Tab {
  active: boolean
}

/** Original: tabs.tabs rendered with
 *  `:class="[tabs.activePath === tab.path ? '...' : '...']"` — the active
 *  flag is precomputed per tab (no comparison conditions in DSL view class
 *  bindings). */
export function stripTabs(tabs: Tab[], activePath: string | null): StripTab[] {
  return tabs.map(t => ({ ...t, active: activePath === t.path }))
}

/** Original: v-if="tabs.tabs.length > 0" on the strip div. */
export function hasStripTabs(tabs: { tabs: Tab[] }): boolean {
  return tabs.tabs.length > 0
}

/** Original: v-if="tabs.activeTab && !tabs.activeTab.isGraph". */
export function canOpenLocalGraph(tab: Tab | null): boolean {
  return !!tab && !tab.isGraph
}

/** Original: function onSwitch(path) { tabs.activePath = path }. */
export function switchTab(tabs: { activePath: string | null }, path: string): void {
  tabs.activePath = path
}

/** Original: function onClose(path) { tabs.close(path) } (not awaited). */
export function closeTab(tabs: { close: (path: string) => Promise<void> }, path: string): void {
  tabs.close(path)
}

/** Original: function openLocalGraph() { const path = tabs.activeTab?.path;
 *  if (!path || tabs.activeTab?.isGraph) return; tabs.openGraph(path, 1) }. */
export function openLocalGraphTab(tabs: {
  activeTab: Tab | null
  openGraph: (centerPath?: string | null, depth?: number) => Promise<void>
}): void {
  const path = tabs.activeTab?.path
  if (!path || tabs.activeTab?.isGraph) return
  tabs.openGraph(path, 1)
}

type TabsLike = { open: (path: string, title?: string) => Promise<void>; activeTab: Tab | null }
type FileTreeLike = { files: any[]; load: () => Promise<void> }

/** Original: async function openToday() { await openDailyNote(todayDate(),
 *  tabs, fileTree) } (the click handler does not await it). */
export async function openTodayNote(tabs: TabsLike, fileTree: FileTreeLike): Promise<void> {
  await openDailyNote(todayDate(), tabs, fileTree)
}

/** Original: function navigateDaily(direction) { const path =
 *  tabs.activeTab?.path; if (!path) return; openAdjacentDailyNote(direction,
 *  path, tabs, fileTree) }. Direction arrives as "prev"/"next" (the DSL
 *  call-arg path has no negative numeric literal guarantee). */
export function navigateDailyNote(
  direction: 'prev' | 'next',
  tabs: TabsLike,
  fileTree: FileTreeLike,
): void {
  const path = tabs.activeTab?.path
  if (!path) return
  openAdjacentDailyNote(direction === 'prev' ? -1 : 1, path, tabs, fileTree)
}

/** Original: const activeDailyDate = computed(() => { const path =
 *  tabs.activeTab?.path; return path ? parseDailyDateFromPath(path) : null })
 *  — as a boolean guard for the v-if. */
export function hasStripDaily(tab: Tab | null): boolean {
  const path = tab?.path
  return !!(path && parseDailyDateFromPath(path))
}

/** Original: getDailyNoteTitle(activeDailyDate) (rendered only when the
 *  guard above is true; "" otherwise). */
export function stripDailyTitle(tab: Tab | null): string {
  const path = tab?.path
  const date = path ? parseDailyDateFromPath(path) : null
  return date ? getDailyNoteTitle(date) : ''
}
