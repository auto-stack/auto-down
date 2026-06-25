<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/workspace'
import { useTabsStore } from '@/stores/tabs'

const workspace = useWorkspaceStore()
const tabs = useTabsStore()
</script>

<template>
  <footer class="flex h-7 items-center justify-between border-t bg-card px-3 text-xs text-muted-foreground">
    <div class="flex items-center gap-3">
      <span v-if="workspace.root" class="truncate max-w-[240px]">
        {{ workspace.root }}
      </span>
      <span v-else>No workspace</span>
    </div>
    <div class="flex items-center gap-3">
      <span>{{ tabs.tabs.length }} tab(s)</span>
    </div>
  </footer>
</template>
