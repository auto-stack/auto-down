<!-- RecentFilesPanel component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed } from 'vue'
import { recentFilesWithTime, removeRecent, Clock, X, Trash2 } from '../../auto/src/front/utils/recent_files_panel_ext'
import { useRecentFilesStore, useTabsStore } from '../../auto/src/front/utils/recent_files_panel_ext'

const recentFilesStore = useRecentFilesStore()
const tabsStore = useTabsStore()


const files = computed<any>(() => recentFilesWithTime(recentFilesStore.files))
const has_files = computed<boolean>(() => files.value.length > 0)
const show_empty = computed<boolean>(() => files.value.length === 0)
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
  Open: [any]
  Remove: [any]
  ClearAll: []
}>()

function Remove(rf: any): void {
  removeRecent(rf.path);

  emit('Remove', rf)
}

function ClearAll(): void {
  recentFilesStore.clear();

  emit('ClearAll')
}

function Open(rf: any): void {
  tabsStore.open(rf.path);

  emit('Open', rf)
}


</script>

<template>
    <div class="flex h-full flex-col">
      <div class="flex h-[var(--header-height)] shrink-0 items-center justify-between border-b px-3">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Recent</span>
        </span>
        <template v-if="has_files">
          <button class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" :title="'Clear recent files'" :type="'button'" @click="ClearAll">
            <component :is="(Trash2) as any" class="h-3.5 w-3.5" />
          </button>
        </template>
      </div>
      <div class="flex-1 overflow-auto py-1">
        <template v-if="show_empty">
          <div class="flex flex-col items-center gap-2 p-4 text-sm text-muted-foreground">
            <component :is="(Clock) as any" class="h-5 w-5 opacity-50" />
            <span>
              <span>No recent files</span>
            </span>
          </div>
        </template>
        <template v-if="has_files">
          <component :is="(ul_tag) as any" class="space-y-0.5 px-1">
            <component :is="(li_tag) as any" class="group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground" @click="Open(rf)" v-for="rf in files">
              <div class="min-w-0 flex-1">
                <div class="truncate">
                  <span>{{ rf.title }}</span>
                </div>
                <div class="truncate text-[10px] text-muted-foreground">
                  <span>{{ rf.path }}</span>
                </div>
              </div>
              <div class="ml-2 flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
                <span class="text-[10px] text-muted-foreground">
                  <span>{{ rf.time }}</span>
                </span>
                <button class="flex h-5 w-5 items-center justify-center rounded hover:bg-destructive hover:text-destructive-foreground" :title="'Remove from recent'" :type="'button'" @click.stop="Remove(rf)">
                  <component :is="(X) as any" class="h-3 w-3" />
                </button>
              </div>
            </component>
          </component>
        </template>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
