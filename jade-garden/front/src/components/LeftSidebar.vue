<script setup lang="ts">
import { useSidebarStore } from '@/stores/sidebar'
import FileTree from './FileTree.vue'
import SearchPanel from './SearchPanel.vue'

const sidebar = useSidebarStore()
</script>

<template>
  <aside
    v-if="sidebar.leftOpen"
    class="flex h-full flex-col border-r bg-card"
    :style="{ width: `${sidebar.leftWidth}px` }"
  >
    <FileTree v-if="sidebar.leftPanel === 'files'" />
    <SearchPanel v-else-if="sidebar.leftPanel === 'search'" />
    <div v-else-if="sidebar.leftPanel === 'recent'" class="flex h-full flex-col">
      <div class="flex h-[var(--header-height)] items-center border-b px-3">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent</span>
      </div>
      <div class="flex-1 p-3 text-sm text-muted-foreground">
        Recent files (coming soon)
      </div>
    </div>
  </aside>
</template>
