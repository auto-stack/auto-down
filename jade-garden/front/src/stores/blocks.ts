// blocks.ts — hand-written facade over the Auto-generated blocks store
// composable (auto/src/front/blocks_store.at →
// stores/auto/useBlocksStore.ts).
//
// Plan 011 Phase 5.1 (Pinia → Auto store migration): the Pinia defineStore
// was replaced by this facade, which keeps the original store API shape
// so all consumers stay unchanged.
//
// This facade is thicker than the others because the DSL cannot express
// most of the original store (see blocks_store.at header): the Map cache,
// the argument-taking getters, parse()'s return value, the cross-store
// watch on tabs.activeTab, and the activeBlocks computed all live here or
// in the ext module. Only the cache state declaration and clear() round-
// trip through the generated store.
import { computed, watch } from 'vue'
import { useBlocksStore as useGeneratedBlocksStore } from './auto/useBlocksStore'
import {
  cacheClear,
  parseIntoCache,
  type PageBlocks,
  type ParsedBlock,
} from '../../auto/src/front/utils/blocks_store_ext'
import { useTabsStore } from './tabs'

export type { PageBlocks }

const g = useGeneratedBlocksStore()
const tabs = useTabsStore()

// Real initial value (the .at model only carries a placeholder; the DSL
// has no Map type).
g.cache.value = new Map<string, PageBlocks>()

// Original: computed activeBlocks from the active tab's parsed blocks.
const activeBlocksComputed = computed<ParsedBlock[]>(() => {
  const path = tabs.activePath
  if (!path) return []
  return g.cache.value.get(path)?.blocks ?? []
})

// Original: keep parsed blocks in sync with the active document tab.
watch(
  () => tabs.activeTab,
  (tab) => {
    if (tab && !tab.isGraph && tab.loaded && typeof tab.body === 'string') {
      parseIntoCache(g.cache.value, tab.path, tab.body)
    }
  },
  { immediate: true }
)

export function useBlocksStore() {
  return {
    get cache(): Map<string, PageBlocks> {
      return g.cache.value
    },
    set cache(v: Map<string, PageBlocks>) {
      g.cache.value = v
    },
    get activeBlocks(): ParsedBlock[] {
      return activeBlocksComputed.value
    },
    parse: (path: string, body: string): ParsedBlock[] =>
      parseIntoCache(g.cache.value, path, body),
    getBlocks: (path: string): ParsedBlock[] => g.cache.value.get(path)?.blocks ?? [],
    blockById: (path: string, id: string): ParsedBlock | undefined =>
      (g.cache.value.get(path)?.blocks ?? []).find((b: ParsedBlock) => b.blockId === id),
    blockAtLine: (path: string, line: number): ParsedBlock | undefined =>
      (g.cache.value.get(path)?.blocks ?? []).find((b: ParsedBlock) => b.lineStart <= line && line < b.lineEnd),
    headings: (path: string): ParsedBlock[] =>
      (g.cache.value.get(path)?.blocks ?? []).filter((b: ParsedBlock) => b.kind === 'heading'),
    clear: (path?: string): void => {
      cacheClear(g.cache.value, path ?? '')
    },
  }
}
