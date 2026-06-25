<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTabsStore } from '@/stores/tabs'
import { getBacklinks, type Backlink } from '@/lib/api'

const tabs = useTabsStore()

function fileStem(path: string): string {
  const name = path.split('/').pop() || path
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

const currentTitle = computed(() => {
  const path = tabs.activeTab?.path
  return path ? fileStem(path) : ''
})

const backlinks = ref<Backlink[]>([])
const loading = ref(false)

async function fetchBacklinks() {
  if (!currentTitle.value) {
    backlinks.value = []
    return
  }
  loading.value = true
  try {
    const res = await getBacklinks(currentTitle.value)
    backlinks.value = res.links
  } catch (e) {
    backlinks.value = []
  } finally {
    loading.value = false
  }
}

watch(currentTitle, fetchBacklinks, { immediate: true })

function openSource(link: Backlink) {
  tabs.open(link.source_path, link.source_title)
}
</script>

<template>
  <div>
    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Backlinks</h4>
    <p v-if="loading" class="text-xs text-muted-foreground">Loading…</p>
    <ul v-else-if="backlinks.length" class="space-y-1">
      <li
        v-for="link in backlinks"
        :key="link.source_path"
        class="cursor-pointer truncate rounded px-1 py-0.5 hover:bg-accent"
        :title="link.context"
        @click="openSource(link)"
      >
        {{ link.source_title }}
      </li>
    </ul>
    <p v-else class="text-xs text-muted-foreground">No backlinks.</p>
  </div>
</template>
