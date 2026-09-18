// backlinks_panel_ext.ts — hand-written TS extension for backlinks_panel.at.
//
// PLAN-074 T-02 sink: tabFileStem (string math) and the fetchBacklinksSafe
// orchestration (try/catch mapping + loading) moved INTO the .at (module
// fn + watch try/catch/finally around the `use back.api:` call). What
// stays here is exactly the web host face:
// - the tabs-store facade re-export (dual-resolution shim — a `use` path
//   cannot leave the auto project's src/),
// - the get_backlinks contract alias: the widget's watch emits
//   `import { get_backlinks } from '@/lib/api'` and the deploy sed
//   rewrites that import onto this shim, which forwards to the
//   hand-written client (tabs_store_ext read_wiki alias precedent).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { getBacklinks, type Backlink } from '../../../../src/lib/api'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useTabsStore }

/** Contract-name alias (see PLAN-064 T-04's read_wiki). Returns the
 *  { title, links } envelope; the .at watch reads `.links` and maps
 *  failures to the empty list in its own catch. */
export async function get_backlinks(title: string): Promise<{ title: string; links: Backlink[] }> {
  return getBacklinks(title)
}
