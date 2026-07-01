<script setup lang="ts">
import { X, Focus, Network } from 'lucide-vue-next'
import { useTabsStore } from '@/stores/tabs'
import EditorTab from './EditorTab.vue'
import GraphPage from './GraphPage.vue'

const tabs = useTabsStore()

function openLocalGraph() {
  const path = tabs.activeTab?.path
  if (!path) return
  tabs.openGraph(path, 1)
}

function openGlobalGraph() {
  tabs.openGraph()
}

function onClose(path: string) {
  tabs.close(path)
}

function onSwitch(path: string) {
  tabs.activePath = path
}

const activeTab = tabs.activeTab
</script>

<template>
  <main class="flex h-full flex-col overflow-hidden bg-background">
    <div
      v-if="tabs.tabs.length > 0"
      class="flex h-[var(--header-height)] shrink-0 items-center gap-1 border-b bg-card px-2"
    >
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
        <Network v-if="tab.isGraph" class="h-3.5 w-3.5" />
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
      <div class="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        title="全局图谱"
        class="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        @click="openGlobalGraph"
      >
        <Network class="h-3.5 w-3.5" />
        <span>图谱</span>
      </button>
      <button
        type="button"
        title="局部图谱"
        class="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        @click="openLocalGraph"
      >
        <Focus class="h-3.5 w-3.5" />
        <span>局部</span>
      </button>
    </div>

    <div class="relative flex flex-1 overflow-hidden">
      <GraphPage
        v-if="tabs.activeTab?.isGraph"
        :center-path="tabs.activeTab.graphCenterPath"
        :depth="tabs.activeTab.graphDepth || 1"
        :key="tabs.activeTab.path"
      />
      <EditorTab
        v-else-if="tabs.activeTab"
        :key="tabs.activeTab.path"
        :path="tabs.activeTab.path"
      />
      <div
        v-else
        class="flex h-full flex-1 flex-col items-center justify-center gap-3 text-muted-foreground"
      >
        <div class="rounded-full bg-accent p-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <p class="text-sm">Select a file from the sidebar to open it.</p>
      </div>
    </div>
  </main>
</template>
