<script setup lang="ts">
import { useSidebarStore } from '@/stores/sidebar'
import FileTree from './FileTree.vue'
import SearchPanel from './SearchPanel.vue'
import RecentFilesPanel from './RecentFilesPanel.vue'

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
    <RecentFilesPanel v-else-if="sidebar.leftPanel === 'recent'" />
  </aside>
</template>
