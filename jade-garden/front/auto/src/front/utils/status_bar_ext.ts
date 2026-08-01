// status_bar_ext.ts — hand-written TS extension for status_bar.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the workspace/tabs facade re-exports (dual-resolution shims),
// - the string math with regex literals (workspaceName's replace, the
//   word-count split, the [[ count) — the DSL has no regex literals,
// - optional chaining with typed fallbacks (tabBody/tabPath/tabSaving/
//   tabDirty — `??` emits undefined in DSL computeds and the && / ||
//   idiom is mis-typed computed<boolean>),
// - the saveLabel / plural text helpers (ternaries emit undefined in DSL
//   computeds),
// - fetchBacklinkCountSafe (try/catch around the backlinks API; the
//   original's catch branch maps to a 0 return that never rejects),
// - rootTitle (`root ?? undefined` — a null title binding drops the attr
//   either way, kept for exactness).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { getBacklinks } from '../../../../src/lib/api'
import { useWorkspaceStore } from '../../../../src/stores/workspace'
import { useTabsStore, type Tab } from '../../../../src/stores/tabs'

export { useWorkspaceStore, useTabsStore }

/** Original: the workspaceName computed. */
export function workspaceName(root: string | null): string {
  if (!root) return 'No workspace'
  const parts = root.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] || root
}

/** Original: `:title="workspace.root ?? undefined"`. */
export function rootTitle(root: string | null): string | undefined {
  return root ?? undefined
}

/** Original: `tabs.activeTab?.body ?? ''`. */
export function tabBody(tab: Tab | null): string {
  return tab?.body ?? ''
}

/** Original: `tabs.activeTab?.path` watch source ('' = no active tab). */
export function tabPath(tab: Tab | null): string {
  return tab?.path ?? ''
}

/** Original: `!!tabs.activeTab?.saving` (truthy check in saveLabel). */
export function tabSaving(tab: Tab | null): boolean {
  return !!tab?.saving
}

/** Original: `!!tabs.activeTab?.dirty` (truthy check in saveLabel/class). */
export function tabDirty(tab: Tab | null): boolean {
  return !!tab?.dirty
}

/** Original: text.trim().split(/\s+/).length (0 when empty). */
export function wordCount(body: string): number {
  const text = body.trim()
  if (!text) return 0
  return text.split(/\s+/).length
}

/** Original: body.length. */
export function charCount(body: string): number {
  return body.length
}

/** Original: (body.match(/\[\[/g) || []).length. */
export function linkCount(body: string): number {
  return (body.match(/\[\[/g) || []).length
}

/** Original: saving ? 'Saving…' : dirty ? 'Unsaved' : 'Saved'. */
export function saveLabel(saving: boolean, dirty: boolean): string {
  if (saving) return 'Saving…'
  if (dirty) return 'Unsaved'
  return 'Saved'
}

/** Original: `${n} ${word}${n === 1 ? '' : 's'}`. */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function fileStem(path: string): string {
  const name = path.split('/').pop() || path
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

/** Original fetchBacklinks: the DSL has no try/catch, so the catch branch
 *  (silently zero the count) maps to a 0 return and the promise never
 *  rejects. */
export async function fetchBacklinkCountSafe(path: string): Promise<number> {
  try {
    const res = await getBacklinks(fileStem(path))
    return res.links.length
  } catch {
    return 0
  }
}
