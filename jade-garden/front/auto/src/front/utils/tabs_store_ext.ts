// tabs_store_ext.ts — hand-written TS extension for tabs_store.at.
//
// The store codegen emits every external function as an import from
// '@/lib/api'; the Regenerate flow sed-rewrites that import to THIS module
// when copying the composable into front/src/stores/auto/. (In the gen
// project the import resolves to stubs/gen_lib_api.ts, a behavior-free
// mirror that only exists so gen-side vue-tsc passes — it never ships.)
//
// Only what the DSL genuinely cannot express lives here:
// - the load() catch branch (readWikiSafe's null return maps to the store's
//   `if doc == null` branches — the original caught load errors),
// - `rethrow` (the DSL has try/catch/finally but no `throw` statement; the
//   Save handler's catch calls it so save rejections propagate to facade
//   callers exactly like the original Pinia store),
// - regex literals (stripExt; the DSL has no regex),
// - the cross-store call into the Pinia recentFiles store,
// - window.confirm with an interpolated message.
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { readWiki, writeWiki, type WikiDoc } from '../../../../src/lib/api'
import { ensureBlockAnchors } from '../../../../src/lib/blockParser'
import { useRecentFilesStore } from '../../../../src/stores/recentFiles'

export { ensureBlockAnchors, writeWiki }

/** Re-throws the caught error. The DSL gained try/catch/finally
 *  (compiler >= c5b5fecf) but has no `throw` statement, so the Save
 *  handler's `catch (e) { rethrow(e) }` restores the original save()
 *  semantics: the rejection propagates out of the async handler (after the
 *  finally block clears tab.saving) to whoever awaited save(). This closes
 *  the deviation formerly documented here and in front/auto/README.md
 *  gap 4 (writeWikiSafe swallowed save failures into console.error). */
export function rethrow(e: unknown): never {
  throw e
}

/** readWiki that never rejects: the original load() had a try/catch whose
 *  catch branch marked the tab loaded, kept the body, and logged — that
 *  maps to a null return handled in the store's `if doc == null` branch. */
export async function readWikiSafe(path: string): Promise<WikiDoc | null> {
  try {
    return await readWiki(path)
  } catch (e) {
    console.error('Failed to load wiki doc', e)
    return null
  }
}

/** Cross-store bridge into the (still Pinia) recentFiles store. */
export function recordRecent(path: string, title: string): void {
  useRecentFilesStore().record(path, title)
}

/** Adopt a save's server echo without clobbering concurrent user edits
 * (plan 022 Phase 3 double-writer fix). The VM backend's slower save
 * round-trips exposed it: a panel frontmatter commit landing while
 * writeWiki is in flight was reverted by the stale echo
 * (`tab.frontmatter = saved.frontmatter` wrote back the PRE-edit map,
 * silently dropping the edit — e2e 11-properties' disk showed the add-row
 * key surviving next to a reverted `status`).
 *
 * Reference compare-and-swap: commitFrontmatter REPLACES tab.frontmatter
 * (never mutates in place), so an unchanged reference means no user edit
 * raced the round-trip and the echo is safe to adopt wholesale; a changed
 * reference keeps the user's map and re-stamps only the server-owned
 * `updated_at`. The body gets the same guard — the editor re-pushes its
 * body on every change so it self-heals, but adopting a stale echo would
 * flash-revert dirty state mid-typing. */
export function adoptSaveResult(
  tab: any,
  sentFm: Record<string, any>,
  sentBody: string,
  saved: WikiDoc,
): void {
  if (tab.frontmatter === sentFm) {
    tab.frontmatter = saved.frontmatter || {}
  } else {
    const stamped = { ...(tab.frontmatter ?? {}) }
    const updated = (saved.frontmatter ?? {}).updated_at
    if (updated !== undefined) stamped.updated_at = updated
    tab.frontmatter = stamped
  }
  if (tab.body === sentBody) {
    tab.body = saved.body
    tab.originalBody = saved.body
  }
}

/** path.replace(/<ext>$/, '') — the DSL has no regex literals. */
export function stripExt(path: string, ext: string): string {
  return path.replace(new RegExp(ext.replace(/\./g, '\\.') + '$'), '')
}

/** confirm(`Close "${title}" without saving?`) — kept verbatim. */
export function confirmClose(title: string): boolean {
  return confirm(`Close "${title}" without saving?`)
}
