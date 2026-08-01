// backlinks_panel_ext.ts — hand-written TS extension for backlinks_panel.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the tabs-store facade re-export (a `use` path cannot leave the auto
//   project's src/, so the widget consumes the facade through this
//   dual-resolution shim — resolves to front/src/stores/tabs.ts in the
//   front tree and to a stub in the gen project),
// - try/catch around the backlinks API (the DSL has no try/catch/finally;
//   the original's catch branch maps to a silent empty-array return),
// - the fileStem string math (split/pop/lastIndexOf/slice chains are not
//   reliably transpiled by the DSL).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { getBacklinks, type Backlink } from '../../../../src/lib/api'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useTabsStore }

/** Original: currentTitle = tabs.activeTab?.path ? fileStem(path) : ''. */
export function tabFileStem(tab: { path: string } | null): string {
  if (!tab) return ''
  const name = tab.path.split('/').pop() || tab.path
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

/** getBacklinks that never rejects: the DSL has no try/catch, so the
 *  original fetchBacklinks()'s catch branch (silently clear the list)
 *  maps to an empty-array return; the finally's loading=false is done by
 *  the widget's single .then callback (the promise never rejects). */
export async function fetchBacklinksSafe(title: string): Promise<Backlink[]> {
  try {
    const res = await getBacklinks(title)
    return res.links
  } catch (e) {
    return []
  }
}
