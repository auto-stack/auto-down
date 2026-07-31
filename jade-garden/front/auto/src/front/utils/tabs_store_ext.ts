// tabs_store_ext.ts — hand-written TS extension for tabs_store.at.
//
// The store codegen emits every external function as an import from
// '@/lib/api'; the Regenerate flow sed-rewrites that import to THIS module
// when copying the composable into front/src/stores/auto/. (In the gen
// project the import resolves to stubs/gen_lib_api.ts, a behavior-free
// mirror that only exists so gen-side vue-tsc passes — it never ships.)
//
// Only what the DSL genuinely cannot express lives here:
// - try/catch around the wiki API (the DSL has no try/catch/finally),
// - regex literals (stripExt; the DSL has no regex),
// - the cross-store call into the Pinia recentFiles store,
// - window.confirm with an interpolated message.
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { readWiki, writeWiki, type WikiDoc } from '../../../../src/lib/api'
import { ensureBlockAnchors } from '../../../../src/lib/blockParser'
import { useRecentFilesStore } from '../../../../src/stores/recentFiles'

export { ensureBlockAnchors }

/** readWiki that never rejects: the DSL has no try/catch, so the original
 *  load()'s catch branch (mark loaded, keep body, log) maps to a null
 *  return handled in the store's `if doc == null` branch. */
export async function readWikiSafe(path: string): Promise<WikiDoc | null> {
  try {
    return await readWiki(path)
  } catch (e) {
    console.error('Failed to load wiki doc', e)
    return null
  }
}

/** writeWiki that never rejects (logs + null). DEVIATION from the original
 *  Pinia store: a failed save no longer propagates a rejection to callers
 *  (the original re-threw after its finally block; no caller awaited save,
 *  so the only observable difference is the console.error instead of an
 *  unhandled rejection). Documented in front/auto/README.md. */
export async function writeWikiSafe(path: string, doc: WikiDoc): Promise<WikiDoc | null> {
  try {
    return await writeWiki(path, doc)
  } catch (e) {
    console.error('Failed to save wiki doc', e)
    return null
  }
}

/** Cross-store bridge into the (still Pinia) recentFiles store. */
export function recordRecent(path: string, title: string): void {
  useRecentFilesStore().record(path, title)
}

/** path.replace(/<ext>$/, '') — the DSL has no regex literals. */
export function stripExt(path: string, ext: string): string {
  return path.replace(new RegExp(ext.replace(/\./g, '\\.') + '$'), '')
}

/** confirm(`Close "${title}" without saving?`) — kept verbatim. */
export function confirmClose(title: string): boolean {
  return confirm(`Close "${title}" without saving?`)
}
