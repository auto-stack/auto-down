// unlinked_references_panel_ext.ts — hand-written TS extension for
// unlinked_references_panel.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the tabs-store facade re-export (dual-resolution shim),
// - try/catch around the unlinked-refs API (the DSL has no try/catch),
// - the highlightContext regex (the DSL has no regex literals) — applied
//   per item in the safe wrapper so the view needs no Call bindings,
// - the v-html rendering (the DSL has no v-html): HtmlDiv is a functional
//   component that sets innerHTML, rendering the same DOM as the
//   original's `<div class="text-foreground/80" v-html="..." />`.
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { h } from 'vue'
import { getUnlinkedRefs, type UnlinkedRef } from '../../../../src/lib/api'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useTabsStore }

/** Original load() read tabs.activeTab?.title. */
export function tabTitle(tab: { title: string } | null): string {
  return tab ? tab.title : ''
}

/** Original: watch(() => tabs.activeTab?.path, load, { immediate: true }). */
export function tabPath(tab: { path: string } | null): string {
  return tab ? tab.path : ''
}

/** Original highlightContext, verbatim (regex literals). */
function highlightContext(context: string, matched: string): string {
  if (!matched) return context
  const re = new RegExp(`(${matched.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return context.replace(re, '<mark class="bg-primary/20 text-primary">$1</mark>')
}

export interface UnlinkedRefItem extends UnlinkedRef {
  html: string
}

/** getUnlinkedRefs that never rejects (the DSL has no try/catch), with the
 *  highlighted context HTML precomputed per item. */
export async function fetchUnlinkedSafe(title: string): Promise<UnlinkedRefItem[]> {
  try {
    const res = await getUnlinkedRefs(title)
    return res.refs.map((r: any) => ({ ...r, html: highlightContext(r.context, r.matched_text) }))
  } catch (e) {
    return []
  }
}

/** v-html stand-in (the DSL has no v-html). Renders exactly the original's
 *  `<div class="text-foreground/80" v-html="html" />`. */
export const HtmlDiv = (props: { class?: string; html?: string }) =>
  h('div', { class: props.class, innerHTML: props.html ?? '' })
