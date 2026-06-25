<script setup lang="ts">
import { onMounted } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useFileTreeStore } from '@/stores/fileTree'
import Ribbon from './Ribbon.vue'
import LeftSidebar from './LeftSidebar.vue'
import MainArea from './MainArea.vue'
import QuickSwitcher from './QuickSwitcher.vue'
import RightSidebar from './RightSidebar.vue'
import StatusBar from './StatusBar.vue'
import WorkspaceOpener from './WorkspaceOpener.vue'
import { useThemeStore } from '@/stores/theme'

const workspace = useWorkspaceStore()
const fileTree = useFileTreeStore()
const theme = useThemeStore()

onMounted(async () => {
  theme.apply()
  await workspace.load()
  if (workspace.root) {
    await fileTree.load()
  }
})
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex flex-1 overflow-hidden">
      <Ribbon />
      <LeftSidebar />
      <div class="flex flex-1 flex-col overflow-hidden">
        <WorkspaceOpener v-if="!workspace.root" />
        <MainArea v-else />
      </div>
      <RightSidebar />
    </div>
    <StatusBar />
    <QuickSwitcher />
  </div>
</template>
