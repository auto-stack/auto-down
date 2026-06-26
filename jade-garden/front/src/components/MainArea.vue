<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useTabsStore } from '@/stores/tabs'
import EditorTab from './EditorTab.vue'

const tabs = useTabsStore()

function onClose(path: string) {
  tabs.close(path)
}

function onSwitch(path: string) {
  tabs.activePath = path
}
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
          type="button"
          class="group flex max-w-[160px] items-center gap-2 rounded-md px-2 py-1 text-xs"
          :class="tabs.activePath === tab.path ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'"
          @click="onSwitch(tab.path)"
        >
          <span class="truncate">{{ tab.title }}</span>
          <span v-if="tab.dirty" class="text-[10px]">●</span>
          <span
            class="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-sm opacity-0 hover:bg-accent-foreground/10 group-hover:opacity-100"
            @click.stop="onClose(tab.path)"
          >
            <X class="h-3 w-3" />
          </span>
        </button>
      </div>
      <div class="relative flex flex-1 overflow-hidden">
        <EditorTab
          v-if="tabs.activeTab"
          :key="tabs.activeTab.path"
          :path="tabs.activeTab.path"
        />
      </div>
    </template>
  </main>
</template>
