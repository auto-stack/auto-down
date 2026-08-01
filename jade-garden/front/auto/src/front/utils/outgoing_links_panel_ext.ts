// outgoing_links_panel_ext.ts — hand-written TS extension for
// outgoing_links_panel.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the tabs/fileTree store facade re-exports (dual-resolution shim — a
//   `use` path cannot leave the auto project's src/),
// - try/catch around the outlinks API (the DSL has no try/catch/finally),
// - the whole openTarget flow (confirm + early return + three sequential
//   awaits; the DSL has no async/await/early return).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { getOutlinks, createWikiPage, type Outlink } from '../../../../src/lib/api'
import { wikiTitleToPath } from '../../../../src/lib/wikiLink'
import { useTabsStore } from '../../../../src/stores/tabs'
import { useFileTreeStore } from '../../../../src/stores/fileTree'

export { useTabsStore }

/** Original: currentTitle = tabs.activeTab?.path ? fileStem(path) : ''. */
export function tabFileStem(tab: { path: string } | null): string {
  if (!tab) return ''
  const name = tab.path.split('/').pop() || tab.path
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

/** getOutlinks that never rejects (the DSL has no try/catch); the
 *  original's catch branch maps to a silent empty-array return. */
export async function fetchOutlinksSafe(title: string): Promise<Outlink[]> {
  try {
    const res = await getOutlinks(title)
    return res.links
  } catch (e) {
    return []
  }
}

/** Original openTarget, verbatim: confirm + early return + sequential
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
