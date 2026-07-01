<script setup lang="ts">
import { ref } from 'vue'
import { FolderTree, Search, Clock, Palette, Network } from 'lucide-vue-next'
import { useSidebarStore } from '@/stores/sidebar'
import { useGraphStore } from '@/stores/graph'
import type { LeftPanel } from '@/stores/sidebar'
import ThemePopover from './ThemePopover.vue'

const sidebar = useSidebarStore()
const graph = useGraphStore()
const themeOpen = ref(false)

const items: { panel: LeftPanel | 'graph'; icon: any; label: string; action?: () => void }[] = [
  { panel: 'files', icon: FolderTree, label: 'Files' },
  { panel: 'search', icon: Search, label: 'Search' },
  { panel: 'recent', icon: Clock, label: 'Recent' },
  { panel: 'graph', icon: Network, label: '全局图谱', action: openGlobalGraph },
]

function select(item: typeof items[number]) {
  if (item.action) {
    item.action()
    return
  }
  sidebar.setLeftPanel(item.panel as LeftPanel)
}

function openGlobalGraph() {
  graph.showGlobal()
  graph.viewMode = 'graph'
}

function active(item: typeof items[number]): boolean {
  if (item.panel === 'graph') return graph.viewMode === 'graph'
  return sidebar.leftPanel === item.panel && sidebar.leftOpen
}
</script>

<template>
  <nav class="flex w-11 flex-col items-center gap-1 border-r bg-card py-2">
    <button
      v-for="item in items"
      :key="item.panel"
      type="button"
      :title="item.label"
      class="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      :class="{ 'text-primary bg-primary/10 hover:bg-primary/15': active(item) }"
      @click="select(item)"
    >
      <component :is="item.icon" class="h-[18px] w-[18px]" />
      <span
        v-if="active(item)"
        class="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
      />
    </button>

    <div class="flex-1" />

    <button
      type="button"
      title="Theme"
      class="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      :class="{ 'text-primary bg-primary/10': themeOpen }"
      @click="themeOpen = !themeOpen"
    >
      <Palette class="h-[18px] w-[18px]" />
    </button>

    <ThemePopover :open="themeOpen" @close="themeOpen = false" />
  </nav>
</template>
