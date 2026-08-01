// outline_panel_ext.ts — hand-written TS extension for outline_panel.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the blocks/tabs store facade re-exports (dual-resolution shim),
// - the per-heading padding math: `((h.level ?? 1) - 1) * 0.6 + 0.375` —
//   the DSL has no `??` in view bindings and DROPS expression parentheses,
//   so the rem string is precomputed per item,
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

export interface OutlineHeading {
  content: string
  lineStart: number
  pad: string
}

/** Original: blocks.activeBlocks.filter(b => b.kind === 'heading'), with
 *  the `:style="{ paddingLeft: `${((h.level ?? 1) - 1) * 0.6 + 0.375}rem` }"`
 *  precomputed per heading. */
export function outlineHeadings(blocks: any[]): OutlineHeading[] {
  return blocks
    .filter((b) => b.kind === 'heading')
    .map((b) => ({
      content: b.content,
      lineStart: b.lineStart,
      pad: `${((b.level ?? 1) - 1) * 0.6 + 0.375}rem`,
    }))
}

/** Original scrollToHeading, verbatim: slugify the heading text, then
 *  dispatch the jade-scroll-to-block CustomEvent for the active tab. */
export function dispatchScrollToHeading(content: string): void {
  const id = headingTextToBlockId(content)
  const tab = useTabsStore().activeTab
  if (!tab) return
  window.dispatchEvent(new CustomEvent('jade-scroll-to-block', { detail: { path: tab.path, id } }))
}
