<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useTabsStore } from '@/stores/tabs'

const tabs = useTabsStore()
</script>

<template>
  <main class="flex h-full flex-col overflow-hidden bg-background">
    <div v-if="tabs.tabs.length === 0" class="flex h-full items-center justify-center text-muted-foreground">
      Select a file from the sidebar to open it.
    </div>
    <template v-else>
      <div class="flex h-9 items-center gap-1 border-b bg-card px-1">
        <button
          v-for="tab in tabs.tabs"
          :key="tab.path"
          class="group flex max-w-[160px] items-center gap-2 rounded-md px-2 py-1 text-xs"
          :class="tabs.activePath === tab.path ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'"
          @click="tabs.activePath = tab.path"
        >
          <span class="truncate">{{ tab.title }}</span>
          <span v-if="tab.dirty" class="text-[10px]">●</span>
          <X
            class="h-3 w-3 opacity-0 group-hover:opacity-100"
            @click.stop="tabs.close(tab.path)"
          />
        </button>
      </div>
      <div class="flex-1 overflow-auto p-4">
        <div v-if="tabs.activeTab" class="text-sm text-muted-foreground">
          Open: <span class="font-medium text-foreground">{{ tabs.activeTab.path }}</span>
          <p class="mt-2">Editor will be integrated in Phase 4.</p>
        </div>
      </div>
    </template>
  </main>
</template>
