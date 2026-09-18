// menu_bar_ext.ts — hand-written TS extension for menu_bar.at (PLAN-070 T-06).
//
// The menubar's action handlers delegate to the facade stores — the same
// behaviors the hand-written command surfaces (command palette / ribbon)
// ride. The DSL cannot express window.prompt, so the open-workspace path
// prompt lives here (file_tree_ext prompt precedent).
//
// v1 action set mirrors desktop PLAN-067's high-frequency four + graph;
// PLAN-071 ruling: zip import/export and flashcard review stay in the
// command palette, they never join the menubar.

import { useWorkspaceStore } from '../../../../src/stores/workspace'
import { useTabsStore } from '../../../../src/stores/tabs'
import { useFileTreeStore } from '../../../../src/stores/fileTree'

/** ws.open — prompt for the workspace directory (WorkspaceOpener parity). */
export function menuOpenWorkspace(): void {
  const path = window.prompt('工作区目录路径', '')
  if (!path) return
  void useWorkspaceStore().open(path)
}

/** files.reload — re-read the file tree from the backend. */
export function menuReloadFiles(): void {
  void useFileTreeStore().load()
}

/** file.save — save the active tab (no-op when none). */
export function menuSave(): void {
  const tabs = useTabsStore()
  const path = tabs.activePath
  if (path) void tabs.save(path)
}

/** tab.close — close the active tab (no-op when none). */
export function menuCloseTab(): void {
  const tabs = useTabsStore()
  const path = tabs.activePath
  if (path) void tabs.close(path)
}

/** graph.open — open the global graph tab (tabs-model native). */
export function menuOpenGraph(): void {
  void useTabsStore().openGraph()
}
