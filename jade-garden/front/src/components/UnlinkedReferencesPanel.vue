<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTabsStore } from '@/stores/tabs'
import { getUnlinkedRefs, type UnlinkedRef } from '@/lib/api'

const tabs = useTabsStore()
const refs = ref<UnlinkedRef[]>([])
const loading = ref(false)

async function load() {
  const title = tabs.activeTab?.title
  if (!title) {
    refs.value = []
    return
  }
  loading.value = true
  try {
    const res = await getUnlinkedRefs(title)
    refs.value = res.refs
  } catch (e) {
    refs.value = []
  } finally {
    loading.value = false
  }
}

watch(() => tabs.activeTab?.path, load, { immediate: true })

function openRef(r: UnlinkedRef) {
  tabs.open(r.page_path)
}

function highlightContext(context: string, matched: string): string {
  if (!matched) return context
  const re = new RegExp(`(${matched.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return context.replace(re, '<mark class="bg-primary/20 text-primary">$1</mark>')
}
</script>

<template>
  <div class="rounded-lg border bg-background/50 p-2.5">
    <h4 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Unlinked References</h4>
    <div v-if="loading" class="text-xs text-muted-foreground">Loading…</div>
    <ul v-else-if="refs.length" class="space-y-1">
      <li
        v-for="(r, idx) in refs"
        :key="idx"
        class="cursor-pointer rounded px-1.5 py-1 text-xs hover:bg-accent"
        @click="openRef(r)"
      >
        <div class="mb-0.5 truncate text-[10px] text-muted-foreground">{{ r.page_path }}</div>
        <div class="text-foreground/80" v-html="highlightContext(r.context, r.matched_text)" />
      </li>
    </ul>
    <p v-else class="text-xs text-muted-foreground">No unlinked references.</p>
  </div>
</template>
