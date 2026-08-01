// right_sidebar_ext.ts — hand-written TS extension for right_sidebar.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the tabs-store facade re-export (dual-resolution shim),
// - the child panel re-exports (GraphSidebar / PropertiesPanel are not yet
//   Auto-translated; AgendaPanel / OutlinePanel / BacklinksPanel /
//   OutgoingLinksPanel / UnlinkedReferencesPanel are generated SFCs — all
//   imported through this module so the gen project type-checks against its
//   stubs),
// - tabIsGraph: the original's `tabs.activeTab?.isGraph ?? false` (optional
//   chaining + ?? is not DSL syntax).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { useTabsStore, type Tab } from '../../../../src/stores/tabs'
import GraphSidebar from '../../../../src/components/GraphSidebar.vue'
import AgendaPanel from '../../../../src/components/AgendaPanel.vue'
import OutlinePanel from '../../../../src/components/OutlinePanel.vue'
import BacklinksPanel from '../../../../src/components/BacklinksPanel.vue'
import OutgoingLinksPanel from '../../../../src/components/OutgoingLinksPanel.vue'
import UnlinkedReferencesPanel from '../../../../src/components/UnlinkedReferencesPanel.vue'
import PropertiesPanel from '../../../../src/components/PropertiesPanel.vue'

export {
  useTabsStore,
  GraphSidebar,
  AgendaPanel,
  OutlinePanel,
  BacklinksPanel,
  OutgoingLinksPanel,
  UnlinkedReferencesPanel,
  PropertiesPanel,
}

/** Original: `tabs.activeTab?.isGraph ?? false`. */
export function tabIsGraph(tab: Tab | null): boolean {
  return tab?.isGraph ?? false
}
