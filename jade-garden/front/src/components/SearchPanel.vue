<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useTabsStore } from '@/stores/tabs'
import { search, type SearchResult } from '@/lib/api'
import { Search, FileText, Box } from 'lucide-vue-next'

const tabs = useTabsStore()
const query = ref('')
const results = ref<SearchResult[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const hasQuery = computed(() => query.value.trim().length > 0)

const debouncedSearch = useDebounceFn(async () => {
  const q = query.value.trim()
  if (!q) {
    results.value = []
    return
  }
  loading.value = true
  error.value = null
  try {
    const res = await search(q, 30)
    results.value = res.results
  } catch (e: any) {
    error.value = e.message || String(e)
    results.value = []
  } finally {
    loading.value = false
  }
}, 250)

watch(query, debouncedSearch)

function snippetHtml(snippet?: string | null): string {
  if (!snippet) return ''
  return snippet.replace(/\u0001/g, '<mark class="bg-primary/20 text-primary">').replace(/\u0002/g, '</mark>')
}

function openResult(r: SearchResult) {
  if (r.type === 'Page' && r.path) {
    tabs.open(r.path, r.title)
  } else if (r.type === 'Block' && r.page_path) {
    tabs.open(r.page_path).then(() => {
      if (r.block_id) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('jade-scroll-to-block', {
            detail: { path: r.page_path, id: r.block_id },
          }))
        }, 150)
      }
    })
  }
}
</script>

<template>
  <div class="flex h-full flex-col p-3">
    <div class="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
      <Search class="h-4 w-4 text-muted-foreground" />
      <input
        v-model="query"
        type="text"
        placeholder="Search pages and blocks..."
        class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      >
    </div>

    <div v-if="loading" class="mt-4 text-center text-xs text-muted-foreground">Searching…</div>
    <div v-else-if="error" class="mt-4 text-center text-xs text-destructive">{{ error }}</div>
    <ul v-else-if="results.length" class="mt-2 flex-1 space-y-1 overflow-y-auto">
      <li
        v-for="r in results"
        :key="r.type === 'Page' ? r.path : r.uuid"
        class="cursor-pointer rounded px-2 py-1.5 text-sm hover:bg-accent"
        @click="openResult(r)"
      >
        <div class="flex items-center gap-1.5">
          <FileText v-if="r.type === 'Page'" class="h-3.5 w-3.5 text-muted-foreground" />
          <Box v-else class="h-3.5 w-3.5 text-muted-foreground" />
          <span class="truncate font-medium">{{ r.type === 'Page' ? r.title : r.page_path }}</span>
        </div>
        <div
          v-if="r.snippet"
          class="mt-0.5 pl-5 text-xs text-muted-foreground"
          v-html="snippetHtml(r.snippet)"
        />
      </li>
    </ul>
    <p v-else-if="hasQuery" class="mt-4 text-center text-xs text-muted-foreground">No results</p>
    <p v-else class="mt-4 text-center text-xs text-muted-foreground">Type to search pages and blocks</p>
  </div>
</template>
