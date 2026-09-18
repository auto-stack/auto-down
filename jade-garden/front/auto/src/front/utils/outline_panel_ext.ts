// outline_panel_ext.ts — hand-written TS extension for outline_panel.at.
//
// PLAN-074 T-01 sink: the heading-row construction (outlineHeadings) moved
// INTO the .at as the module fn outline_headings (single source; the vue
// codegen emits it into the deployed SFC). What stays here is exactly the
// host face:
// - the blocks/tabs store facade re-exports (dual-resolution shim),
// - the CustomEvent dispatch (`new CustomEvent` is not expressible).
//
// NOTE: the panel is pinned EMPTY at runtime (the app never calls
// blocks.parse, so activeBlocks is always [] and the panel renders
// "No headings.") — the e2e baseline depends on this. The heading-list
// code path is still translated faithfully; it is simply never taken.
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { headingTextToBlockId } from '../../../../src/lib/wikiLink'
import { useBlocksStore } from '../../../../src/stores/blocks'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useBlocksStore, useTabsStore }

/** Original scrollToHeading, verbatim: slugify the heading text, then
 *  dispatch the jade-scroll-to-block CustomEvent for the active tab. */
export function dispatchScrollToHeading(content: string): void {
  const id = headingTextToBlockId(content)
  const tab = useTabsStore().activeTab
  if (!tab) return
  window.dispatchEvent(new CustomEvent('jade-scroll-to-block', { detail: { path: tab.path, id } }))
}
