<script setup lang="ts">
import { onMounted } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useFileTreeStore } from '@/stores/fileTree'
import { useThemeStore } from '@/stores/theme'
import Ribbon from './Ribbon.vue'
import LeftSidebar from './LeftSidebar.vue'
import MainArea from './MainArea.vue'
import RightSidebar from './RightSidebar.vue'
import StatusBar from './StatusBar.vue'
import QuickSwitcher from './QuickSwitcher.vue'
import WorkspaceOpener from './WorkspaceOpener.vue'

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
  <div class="flex h-full flex-col bg-background text-foreground">
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
