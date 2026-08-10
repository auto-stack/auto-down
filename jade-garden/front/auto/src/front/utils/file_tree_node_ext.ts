// file_tree_node_ext.ts — hand-written TS extension for file_tree_node.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the fileTree/tabs store facade re-exports (dual-resolution shims —
//   resolve to front/src/stores/*.ts in the front tree and to stubs in the
//   gen project),
// - the lucide chevron re-exports (rendered via dyn) and NodeIcon, the
//   stand-in for the original's
//   `<component :is="node.is_dir ? (isExpanded ? FolderOpen : Folder) : FileText">`
//   including its conditional :class (the DSL's dyn takes a static symbol,
//   not a state-dependent expression),
// - isNodeExpanded (Set.has — the DSL has no Set type; the facade holds the
//   reactive Set and Vue 3 tracks its mutations),
// - px / nodeIndent (template-literal style values; the DSL has no string
//   concatenation in computed bodies),
// - openNodeFile (the toggle() else-branch: .canvas suffix test +
//   /\.canvas$/ and /\.ad$/ regex strips — no regex literals in the DSL),
// - the five context-menu actions (window.prompt/confirm + split/slice/join/
//   lastIndexOf path surgery + the facade CRUD calls; each keeps the
//   original's rejection propagation — the DSL handlers do not await the
//   returned promise, so a failure stays an unhandled rejection, as before),
// - listenFirstClickOutside (the original's setup-time
//   document.addEventListener('click', clickOutside, { once: true }) with
//   the closest('.file-context-menu') guard — DOM APIs plus the DSL's
//   `.contains` → `.includes` trap).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { h } from 'vue'
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
} from 'lucide-vue-next'
import { useFileTreeStore } from '../../../../src/stores/fileTree'
import { useTabsStore } from '../../../../src/stores/tabs'
import type { FileNode } from '../../../../src/lib/api'

export { useFileTreeStore, useTabsStore, ChevronRight, ChevronDown }

/** Original: <component :is="node.is_dir ? (isExpanded ? FolderOpen : Folder)
 *  : FileText" class="h-3.5 w-3.5 shrink-0" :class="[node.is_dir ?
 *  'text-muted-foreground/70' : isActive ? 'text-primary' :
 *  'text-muted-foreground']" /> — icon component and conditional class are
 *  both state-dependent, so both live here. The Tailwind classes stay in
 *  this scanned ext file (front/tailwind.config.cjs content glob, README
 *  gap 26). */
export const NodeIcon = (props: { is_dir: boolean; expanded: boolean; active: boolean }) =>
  h(props.is_dir ? (props.expanded ? FolderOpen : Folder) : FileText, {
    class: [
      'h-3.5 w-3.5 shrink-0',
      props.is_dir
        ? 'text-muted-foreground/70'
        : props.active
          ? 'text-primary'
          : 'text-muted-foreground',
    ],
  })

/** Original isExpanded computed: fileTree.expanded.has(props.node.path). */
export function isNodeExpanded(fileTree: any, path: string): boolean {
  return fileTree.expanded.has(path)
}

/** `${n}px` for the context-menu fixed position. */
export function px(n: number): string {
  return `${n}px`
}

/** Original row style's marginLeft: `${level * 12}px`. */
export function nodeIndent(level: number): string {
  return `${level * 12}px`
}

/** Original toggle()'s non-directory branch: whiteboard for .canvas files,
 *  plain tab otherwise (regex extension strips). */
export function openNodeFile(tabs: any, node: FileNode): void {
  if (node.path.toLowerCase().endsWith('.canvas')) {
    tabs.openWhiteboard(node.path, node.name.replace(/\.canvas$/, ''))
  } else {
    tabs.open(node.path, node.name.replace(/\.ad$/, ''))
  }
}

/** Parent directory of a path ('' at the root). */
function parentDir(path: string): string {
  return path.split('/').slice(0, -1).join('/') || ''
}

/** Original createFile(): close the menu (done by the handler), prompt,
 *  create inside the node (dir) or next to it (file). */
export async function ctxNewFile(fileTree: any, node: FileNode): Promise<void> {
  const base = node.is_dir ? node.path : parentDir(node.path)
  const name = window.prompt('New file name:', 'Untitled.ad')
  if (!name) return
  const path = base ? `${base}/${name}` : name
  await fileTree.createFile(path, false)
}

/** Original createFolder(). */
export async function ctxNewFolder(fileTree: any, node: FileNode): Promise<void> {
  const base = node.is_dir ? node.path : parentDir(node.path)
  const name = window.prompt('New folder name:', 'New Folder')
  if (!name) return
  const path = base ? `${base}/${name}` : name
  await fileTree.createFile(path, true)
}

/** Original renameItem(). */
export async function ctxRename(fileTree: any, node: FileNode): Promise<void> {
  const name = window.prompt('Rename to:', node.name)
  if (!name || name === node.name) return
  const base = parentDir(node.path)
  const newPath = base ? `${base}/${name}` : name
  await fileTree.renameFile(node.path, newPath)
}

/** Original duplicateItem(). */
export async function ctxDuplicate(fileTree: any, node: FileNode): Promise<void> {
  const parts = node.path.split('/')
  const name = parts[parts.length - 1]
  const base = parts.slice(0, -1).join('/') || ''
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  const newName = `${stem} (copy)${ext}`
  const newPath = base ? `${base}/${newName}` : newName
  await fileTree.duplicateFile(node.path, newPath)
}

/** Original deleteItem(). */
export async function ctxDelete(fileTree: any, node: FileNode): Promise<void> {
  const ok = confirm(`Delete "${node.name}"?`)
  if (!ok) return
  await fileTree.deleteFile(node.path)
}

/** Original: the setup-time document.addEventListener('click', clickOutside,
 *  { once: true }) — fires once on the first document click after mount and
 *  closes this node's menu when the click lands outside .file-context-menu. */
export function listenFirstClickOutside(closeMenu: () => void): void {
  if (typeof document === 'undefined') return
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement
      if (!target.closest('.file-context-menu')) {
        closeMenu()
      }
    },
    { once: true },
  )
}
