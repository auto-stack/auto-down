// left_sidebar_ext.ts — hand-written TS extension for left_sidebar.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the sidebar-store facade re-export (dual-resolution shim),
// - the child component re-exports (FileTree is not yet Auto-translated;
//   SearchPanel / RecentFilesPanel are generated SFCs — all imported through
//   this module so the gen project type-checks against its stubs),
// - sidebarLeftWidth: the original's `:style="{ width: `${leftWidth}px` }"`
//   template literal (a Call computed body emits computed<any> — gap 28).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { useSidebarStore } from '../../../../src/stores/sidebar'
import FileTree from '../../../../src/components/FileTree.vue'
import SearchPanel from '../../../../src/components/SearchPanel.vue'
import RecentFilesPanel from '../../../../src/components/RecentFilesPanel.vue'

export { useSidebarStore, FileTree, SearchPanel, RecentFilesPanel }

/** Original: `` width: `${sidebar.leftWidth}px` ``. */
export function sidebarLeftWidth(sidebar: { leftWidth: number }): string {
  return `${sidebar.leftWidth}px`
}
