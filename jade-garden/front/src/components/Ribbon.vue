<script setup lang="ts">
import { FolderTree, Search, Clock } from 'lucide-vue-next'
import { useSidebarStore } from '@/stores/sidebar'
import type { LeftPanel } from '@/stores/sidebar'

const sidebar = useSidebarStore()

const items: { panel: LeftPanel; icon: any; label: string }[] = [
  { panel: 'files', icon: FolderTree, label: 'Files' },
  { panel: 'search', icon: Search, label: 'Search' },
  { panel: 'recent', icon: Clock, label: 'Recent' },
]

function select(panel: LeftPanel) {
  sidebar.setLeftPanel(panel)
}
</script>

<template>
  <nav class="flex w-12 flex-col items-center gap-2 border-r bg-card py-3">
    <button
      v-for="item in items"
      :key="item.panel"
      :title="item.label"
      class="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      :class="{ 'bg-accent text-foreground': sidebar.leftPanel === item.panel && sidebar.leftOpen }"
      @click="select(item.panel)"
    >
      <component :is="item.icon" class="h-5 w-5" />
    </button>
  </nav>
</template>
