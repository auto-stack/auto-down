<!-- LeftSidebar component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed } from 'vue'
import { FileTree } from '../../auto/src/front/utils/left_sidebar_ext'
import { RecentFilesPanel } from '../../auto/src/front/utils/left_sidebar_ext'
import { SearchPanel } from '../../auto/src/front/utils/left_sidebar_ext'
import { sidebarLeftWidth } from '../../auto/src/front/utils/left_sidebar_ext'
import { useSidebarStore } from '../../auto/src/front/utils/left_sidebar_ext'

const sidebarStore = useSidebarStore()


const left_width = computed<any>(() => sidebarLeftWidth(sidebarStore))


</script>

<template>
    <template v-if="sidebarStore.leftOpen">
      <aside class="flex h-full flex-col border-r bg-card" :style="({ width: left_width } as any)">
        <template v-if="sidebarStore.leftPanel == 'files'">
          <FileTree :key="'FileTree-1'" />
        </template>
        <template v-if="sidebarStore.leftPanel == 'search'">
          <SearchPanel :key="'SearchPanel-2'" />
        </template>
        <template v-if="sidebarStore.leftPanel == 'recent'">
          <RecentFilesPanel :key="'RecentFilesPanel-3'" />
        </template>
      </aside>
    </template>

</template>

<style>
/* Component styles */

</style>
