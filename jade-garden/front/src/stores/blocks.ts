import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { parseBlocks, type ParsedBlock } from '@/lib/blockParser'
import { useTabsStore } from './tabs'

export interface PageBlocks {
  path: string
  blocks: ParsedBlock[]
  updatedAt: number
}

export const useBlocksStore = defineStore('blocks', () => {
  const cache = ref<Map<string, PageBlocks>>(new Map())
  const tabs = useTabsStore()

  const activePath = computed(() => tabs.activePath)

  const activeBlocks = computed(() => {
    const path = activePath.value
    if (!path) return []
    return getBlocks(path)
  })

  function parse(path: string, body: string): ParsedBlock[] {
    const blocks = parseBlocks(body)
    cache.value.set(path, { path, blocks, updatedAt: Date.now() })
    return blocks
  }

  function getBlocks(path: string): ParsedBlock[] {
    return cache.value.get(path)?.blocks ?? []
  }

  function blockById(path: string, id: string): ParsedBlock | undefined {
    return getBlocks(path).find((b) => b.blockId === id)
  }

  function blockAtLine(path: string, line: number): ParsedBlock | undefined {
    return getBlocks(path).find((b) => b.lineStart <= line && line < b.lineEnd)
  }

  function headings(path: string): ParsedBlock[] {
    return getBlocks(path).filter((b) => b.kind === 'heading')
  }

  function clear(path?: string) {
    if (path) {
      cache.value.delete(path)
    } else {
      cache.value.clear()
    }
  }

  // Keep parsed blocks in sync with the active document tab.
  watch(
    () => tabs.activeTab,
    (tab) => {
      if (tab && !tab.isGraph && tab.loaded && typeof tab.body === 'string') {
        parse(tab.path, tab.body)
      }
    },
    { immediate: true }
  )

  return {
    cache,
    activeBlocks,
    parse,
    getBlocks,
    blockById,
    blockAtLine,
    headings,
    clear,
  }
})
