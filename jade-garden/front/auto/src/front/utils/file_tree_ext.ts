// file_tree_ext.ts — hand-written TS extension for file_tree.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the fileTree store facade re-export (dual-resolution shim — resolves to
//   front/src/stores/fileTree.ts in the front tree and to a stub in the gen
//   project),
// - the lucide icon re-exports (rendered via dyn, theme_popover precedent),
// - promptNewFile / promptNewFolder (window.prompt + the early return —
//   DOM prompt API is not expressible in the DSL). The rejection of
//   fileTree.createFile propagates exactly like the original's async
//   click handlers (the DSL handler does not await the returned promise,
//   so a failure stays an unhandled rejection, as before).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { Plus, FolderPlus } from 'lucide-vue-next'
import { useFileTreeStore } from '../../../../src/stores/fileTree'

export { useFileTreeStore, Plus, FolderPlus }

/** Original createFile(): prompt, bail on empty, create a file at the
 *  workspace root. */
export async function promptNewFile(fileTree: any): Promise<void> {
  const name = window.prompt('New file name:', 'Untitled.ad')
  if (!name) return
  await fileTree.createFile(name, false)
}

/** Original createFolder(): prompt, bail on empty, create a folder at the
 *  workspace root. */
export async function promptNewFolder(fileTree: any): Promise<void> {
  const name = window.prompt('New folder name:', 'New Folder')
  if (!name) return
  await fileTree.createFile(name, true)
}
