<script setup lang="ts">
import { ref } from 'vue'
import { FolderTree, Search, Clock, Palette, Network } from 'lucide-vue-next'
import { useSidebarStore } from '@/stores/sidebar'
import { useTabsStore } from '@/stores/tabs'
import type { LeftPanel } from '@/stores/sidebar'
import ThemePopover from './ThemePopover.vue'

const sidebar = useSidebarStore()
const tabs = useTabsStore()
const themeOpen = ref(false)

const items: { panel: LeftPanel; icon: any; label: string }[] = [
  { panel: 'files', icon: FolderTree, label: 'Files' },
  { panel: 'search', icon: Search, label: 'Search' },
  { panel: 'recent', icon: Clock, label: 'Recent' },
]

function select(panel: LeftPanel) {
  sidebar.setLeftPanel(panel)
}

function openGlobalGraph() {
  tabs.openGraph()
}

function active(item: typeof items[number]): boolean {
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
      @click="select(item.panel)"
    >
      <component :is="item.icon" class="h-[18px] w-[18px]" />
      <span
        v-if="active(item)"
        class="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
      />
    </button>

    <button
      type="button"
      title="全局图谱"
      class="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      :class="{ 'text-primary bg-primary/10 hover:bg-primary/15': tabs.activeTab?.isGraph && !tabs.activeTab?.graphCenterPath }"
      @click="openGlobalGraph"
    >
      <Network class="h-[18px] w-[18px]" />
      <span
        v-if="tabs.activeTab?.isGraph && !tabs.activeTab?.graphCenterPath"
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
