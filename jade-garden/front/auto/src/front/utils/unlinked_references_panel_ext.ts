// unlinked_references_panel_ext.ts — hand-written TS extension for
// unlinked_references_panel.at.
//
// PLAN-074 T-03 sink: tabTitle/tabPath (trivial accessors) and the
// fetchUnlinkedSafe orchestration + row construction moved INTO the .at
// (module fns + watch try/catch/finally around the `use back.api:` call).
// What stays here is exactly the web host face:
// - the tabs-store facade re-export (dual-resolution shim),
// - the get_unlinked_refs contract alias (deploy sed rewrites the emitted
//   '@/lib/api' import onto this shim; tabs_store_ext read_wiki precedent),
// - the regex highlighter (regex literals have no DSL word; the .at watch
//   calls it per row to precompute the v-html payload).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { getUnlinkedRefs, type UnlinkedRef } from '../../../../src/lib/api'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useTabsStore }

/** Contract-name alias (see PLAN-064 T-04's read_wiki). Returns the
 *  { title, refs } envelope; the .at watch builds the display rows
 *  ({ page_path, html }) in its own try and maps failures to the empty
 *  list in its own catch. */
export async function get_unlinked_refs(title: string): Promise<{ title: string; refs: UnlinkedRef[] }> {
  return getUnlinkedRefs(title)
}

/** Original highlightContext, verbatim (regex literals). Exported for the
 *  .at watch's row construction (`use { fn: highlight_context }` — an ext
 *  TS import, so Plan 522's emission skip keeps this hand-written body). */
export function highlight_context(context: string, matched: string): string {
  if (!matched) return context
  const re = new RegExp(`(${matched.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return context.replace(re, '<mark class="bg-primary/20 text-primary">$1</mark>')
}
