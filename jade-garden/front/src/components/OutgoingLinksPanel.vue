<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTabsStore } from '@/stores/tabs'
import { useFileTreeStore } from '@/stores/fileTree'
import { getOutlinks, createWikiPage, type Outlink } from '@/lib/api'
import { wikiTitleToPath } from '@/lib/wikiLink'

const tabs = useTabsStore()
const fileTree = useFileTreeStore()

function fileStem(path: string): string {
  const name = path.split('/').pop() || path
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

const currentTitle = computed(() => {
  const path = tabs.activeTab?.path
  return path ? fileStem(path) : ''
})

const outlinks = ref<Outlink[]>([])
const loading = ref(false)

async function fetchOutlinks() {
  if (!currentTitle.value) {
    outlinks.value = []
    return
  }
  loading.value = true
  try {
    const res = await getOutlinks(currentTitle.value)
    outlinks.value = res.links
  } catch (e) {
    outlinks.value = []
  } finally {
    loading.value = false
  }
}

watch(currentTitle, fetchOutlinks, { immediate: true })

async function openTarget(link: Outlink) {
  if (link.exists && link.target_path) {
    await tabs.open(link.target_path, link.target_title)
  } else {
    const ok = confirm(`Create missing page [[${link.target_title}]]?`)
    if (!ok) return
    const path = wikiTitleToPath(link.target_title)
    await createWikiPage(link.target_title)
    await fileTree.load()
    await tabs.open(path, link.target_title)
  }
}
</script>

<template>
  <div class="rounded-lg border bg-background/50 p-2.5">
    <h4 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Outgoing links</h4>
    <p v-if="loading" class="text-xs text-muted-foreground">Loading…</p>
    <ul v-else-if="outlinks.length" class="space-y-0.5">
      <li
        v-for="link in outlinks"
        :key="`${link.target_title}-${link.block_id ?? ''}`"
        class="flex cursor-pointer items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
        @click="openTarget(link)"
      >
        <span
          class="h-1.5 w-1.5 rounded-full shrink-0"
          :class="link.exists ? 'bg-[hsl(var(--af-success))]' : 'bg-destructive'"
        />
        <span class="truncate">{{ link.target_title }}</span>
        <span v-if="link.block_id" class="text-[10px] text-muted-foreground">#{{ link.block_id }}</span>
      </li>
    </ul>
    <p v-else class="text-xs text-muted-foreground">No outgoing links.</p>
  </div>
</template>
