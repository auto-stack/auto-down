// outgoing_links_panel_ext.ts — hand-written TS extension for
// outgoing_links_panel.at.
//
// PLAN-074 T-03 sink: tabFileStem (string math) and the fetchOutlinksSafe
// orchestration moved INTO the .at (module fn + watch try/catch/finally
// around the `use back.api:` call). What stays here is exactly the web
// host face:
// - the tabs-store facade re-export (dual-resolution shim),
// - the get_outlinks contract alias (deploy sed rewrites the emitted
//   '@/lib/api' import onto this shim; tabs_store_ext read_wiki precedent),
// - the whole openTarget flow (confirm + early return + three sequential
//   awaits — window/store host face the DSL cannot express).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { getOutlinks, createWikiPage, type Outlink } from '../../../../src/lib/api'
import { wikiTitleToPath } from '../../../../src/lib/wikiLink'
import { useTabsStore } from '../../../../src/stores/tabs'
import { useFileTreeStore } from '../../../../src/stores/fileTree'

export { useTabsStore }

/** Contract-name alias (see PLAN-064 T-04's read_wiki). Returns the
 *  { title, links } envelope; the .at watch reads `.links` and maps
 *  failures to the empty list in its own catch. */
export async function get_outlinks(title: string): Promise<{ title: string; links: Outlink[] }> {
  return getOutlinks(title)
}

/** Original openTarget, verbatim: confirm + early return + three sequential
 *  awaits cannot be expressed in the DSL (no async/await/early return). */
export async function openOutlinkTarget(link: Outlink): Promise<void> {
  const tabs = useTabsStore()
  const fileTree = useFileTreeStore()
  if (link.exists && link.target_path) {
    await tabs.open(link.target_path, link.target_title)
  } else {
    const ok = confirm(`Create missing page [[${link.target_title}]]?`)
    if (!ok) return
    const path = wikiTitleToPath(link.target_title)
    await createWikiPage(link.target_title)
    await fileTree.load()
    await tabs.open(path, link.target_title)
  }
}
