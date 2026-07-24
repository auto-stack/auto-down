<script setup lang="ts">
import { Clock, X, Trash2 } from 'lucide-vue-next'
import { useRecentFilesStore } from '@/stores/recentFiles'
import { useTabsStore } from '@/stores/tabs'

const recent = useRecentFilesStore()
const tabs = useTabsStore()

function open(path: string) {
  tabs.open(path)
}

function remove(e: Event, path: string) {
  e.stopPropagation()
  recent.remove(path)
}

function clearAll() {
  recent.clear()
}

function formatTime(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex h-[var(--header-height)] shrink-0 items-center justify-between border-b px-3">
      <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent</span>
      <button
        v-if="recent.files.length"
        type="button"
        title="Clear recent files"
        class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        @click="clearAll"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </button>
    </div>
    <div class="flex-1 overflow-auto py-1">
      <div v-if="!recent.files.length" class="flex flex-col items-center gap-2 p-4 text-sm text-muted-foreground">
        <Clock class="h-5 w-5 opacity-50" />
        <span>No recent files</span>
      </div>
      <ul v-else class="space-y-0.5 px-1">
        <li
          v-for="file in recent.files"
          :key="file.path"
          class="group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
          @click="open(file.path)"
        >
          <div class="min-w-0 flex-1">
            <div class="truncate">{{ file.title }}</div>
            <div class="truncate text-[10px] text-muted-foreground">{{ file.path }}</div>
          </div>
          <div class="ml-2 flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
            <span class="text-[10px] text-muted-foreground">{{ formatTime(file.openedAt) }}</span>
            <button
              type="button"
              title="Remove from recent"
              class="flex h-5 w-5 items-center justify-center rounded hover:bg-destructive hover:text-destructive-foreground"
              @click="remove($event, file.path)"
            >
              <X class="h-3 w-3" />
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
