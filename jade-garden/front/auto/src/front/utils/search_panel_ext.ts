// search_panel_ext.ts — hand-written TS extension for search_panel.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the tabs facade re-export (dual-resolution shim),
// - the useDebounceFn re-export (@vueuse/core — present in both trees;
//   the DSL cannot import npm packages),
// - the lucide icon re-exports (rendered via `dyn`),
// - searchSafe (try/catch/finally around the search API: the catch branch
//   comes back as { results: [], error } data and the promise never
//   rejects; "" error = the original's null — falsy either way),
// - snippetHtml (regex literals — \u0001/\u0002 → <mark>) and the HtmlDiv
//   v-html stand-in (unlinked_references_panel precedent),
// - withSearchDisplay (per-result display fields: the type ternary, the
//   v-if="r.snippet" guard — no Call/ternary bindings in the DSL view),
// - scheduleScrollToBlock (setTimeout + new CustomEvent + dispatchEvent),
// - strTruthy (the error string's truthy check: `!= null` in a DSL
//   computed emits !== undefined, which is wrong for a nullable string).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { h } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Search, FileText, Box } from 'lucide-vue-next'
import { search, type SearchResult } from '../../../../src/lib/api'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useTabsStore, useDebounceFn, Search, FileText, Box }

/** v-html stand-in (the DSL has no v-html): renders the original's
 *  `<div class="mt-0.5 pl-5 ..." v-html="snippetHtml(r.snippet)" />`. */
export const HtmlDiv = (props: { class?: string; html?: string }) =>
  h('div', { class: props.class, innerHTML: props.html ?? '' })

export interface SearchOutcome {
  results: SearchResult[]
  error: string
}

/** Original debouncedSearch body: `search(q, 30)`; the catch branch comes
 *  back as { results: [], error } data so the promise never rejects and
 *  the widget's single .then callback carries both branches plus the
 *  finally's loading=false. */
export async function searchSafe(q: string): Promise<SearchOutcome> {
  try {
    const res = await search(q, 30)
    return { results: res.results, error: '' }
  } catch (e: any) {
    return { results: [], error: e.message || String(e) }
  }
}

/** Original snippetHtml: \u0001/\u0002 → <mark …>/</mark>. */
export function snippetHtml(snippet?: string | null): string {
  if (!snippet) return ''
  return snippet.replace(/\u0001/g, '<mark class="bg-primary/20 text-primary">').replace(/\u0002/g, '</mark>')
}

export interface SearchResultView extends SearchResult {
  is_page: boolean
  is_block: boolean
  title_text: string
  has_snippet: boolean
  snippet_html: string
}

/** Precomputes the per-result display fields: `r.type === 'Page' ? r.title
 *  : r.page_path`, the v-else icon branch, and the v-if="r.snippet" +
 *  v-html pair (undefined title/page_path renders empty, same as the
 *  original's interpolation). */
export function withSearchDisplay(results: SearchResult[]): SearchResultView[] {
  return (results ?? []).map(r => ({
    ...r,
    is_page: r.type === 'Page',
    is_block: r.type !== 'Page',
    title_text: r.type === 'Page' ? (r.title ?? '') : (r.page_path ?? ''),
    has_snippet: !!r.snippet,
    snippet_html: snippetHtml(r.snippet),
  }))
}

/** Original: truthy check on the error string (v-else-if="error"). */
export function strTruthy(s: string): boolean {
  return !!s
}

/** Original: setTimeout(150) + window.dispatchEvent(new CustomEvent(
 *  'jade-scroll-to-block', { detail: { path, id } })). */
export function scheduleScrollToBlock(pagePath: string, blockId: string): void {
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('jade-scroll-to-block', {
      detail: { path: pagePath, id: blockId },
    }))
  }, 150)
}
