// search_panel_ext.ts — hand-written TS extension for search_panel.at.
//
// PLAN-076 T-02 sink (mode doc §5.1): searchSafe (fetch orchestration +
// try/catch mapping) moved INTO the .at (the debounced run closure's own
// try/catch/finally around the `use back.api: search_pages` contract call)
// and withSearchDisplay moved into the with_search_display module fn. What
// stays here is exactly the host face:
// - the tabs facade re-export (dual-resolution shim),
// - the useDebounceFn re-export (@vueuse/core — present in both trees;
//   the DSL cannot import npm packages),
// - the lucide icon re-exports (rendered via `dyn`),
// - snippetHtml (regex literals — \u0001/\u0002 → <mark>; called per row by
//   the sunk module fn over the use-fn channel; the v-html rendering itself
//   is the DSL's native `html:` prop, compiler c7034bf5),
// - scheduleScrollToBlock (setTimeout + new CustomEvent + dispatchEvent),
// - the search_pages contract alias (the widget's closure emits
//   `import { search_pages } from '@/lib/api'` and the deploy sed rewrites
//   that import onto this shim, which forwards to the hand-written client —
//   get_backlinks alias precedent),
// - errorMessage (strict-TS unknown-catch domain: the DSL catch binding
//   emits bare `catch (e)` and tsconfig strict makes it unknown, so the
//   message extraction must happen in typed TS; query_block_widget
//   precedent).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { useDebounceFn } from '@vueuse/core'
import { Search, FileText, Box } from 'lucide-vue-next'
import { search, type SearchResponse, type SearchResult } from '../../../../src/lib/api'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useTabsStore, useDebounceFn, Search, FileText, Box }

/** Contract-name alias (PLAN-076 T-02; get_backlinks precedent). Forwards to
 *  the hand-written client; the .at closure's own try/catch maps failures
 *  (empty results + message) — the old never-reject searchSafe wrapper is
 *  obsolete now that the DSL has try/catch/finally. */
export async function search_pages(q: string, limit: number): Promise<SearchResponse> {
  return search(q, limit)
}

/** Original snippetHtml: \u0001/\u0002 → <mark …>/</mark>. */
export function snippetHtml(snippet?: string | null): string {
  if (!snippet) return ''
  return snippet.replace(/\u0001/g, '<mark class="bg-primary/20 text-primary">').replace(/\u0002/g, '</mark>')
}

/** The sunk closure's catch extracts the message here (strict TS makes a
 *  bare `catch (e)` binding unknown; the DSL has no typed-catch word). */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message || String(e)
  return String(e)
}

export type { SearchResult }

/** Original: setTimeout(150) + window.dispatchEvent(new CustomEvent(
 *  'jade-scroll-to-block', { detail: { path, id } })). */
export function scheduleScrollToBlock(pagePath: string, blockId: string): void {
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('jade-scroll-to-block', {
      detail: { path: pagePath, id: blockId },
    }))
  }, 150)
}
