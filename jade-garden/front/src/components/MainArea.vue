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
    <div v-if="tabs.tabs.length === 0" class="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <div class="rounded-full bg-accent p-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <p class="text-sm">Select a file from the sidebar to open it.</p>
    </div>
    <template v-else>
      <div class="flex h-[var(--header-height)] shrink-0 items-center gap-1 border-b bg-card px-2">
        <button
          v-for="tab in tabs.tabs"
          :key="tab.path"
          type="button"
          class="group relative flex h-7 max-w-[180px] items-center gap-1.5 rounded-md px-2 text-xs transition-colors"
          :class="[
            tabs.activePath === tab.path
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          ]"
          @click="onSwitch(tab.path)"
        >
          <span class="truncate">{{ tab.title }}</span>
          <span v-if="tab.dirty" class="text-[9px] leading-none">●</span>
          <span
            class="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-sm opacity-0 transition-opacity"
            :class="tabs.activePath === tab.path ? 'opacity-100' : 'group-hover:opacity-100'"
            @click.stop="onClose(tab.path)"
          >
            <X class="h-3 w-3" />
          </span>
        </button>
      </div>
      <div class="relative flex flex-1 overflow-hidden">
        <EditorTab
          v-if="tabs.activeTab"
          :path="tabs.activeTab.path"
        />
      </div>
    </template>
  </main>
</template>
