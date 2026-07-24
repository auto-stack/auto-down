<script setup lang="ts">
import { ref, watch } from 'vue'
import { CalendarClock } from 'lucide-vue-next'
import { getAgenda, type AgendaGroup } from '@/lib/api'
import { useTabsStore } from '@/stores/tabs'

const tabs = useTabsStore()
const groups = ref<AgendaGroup[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getAgenda(14)
    groups.value = res.groups
  } catch (e) {
    console.error('Failed to load agenda', e)
  } finally {
    loading.value = false
  }
}

watch(() => tabs.activeTab?.path, load, { immediate: true })

function openTask(path: string) {
  tabs.open(path)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function markerClass(marker: string): string {
  switch (marker.toUpperCase()) {
    case 'TODO':
    case 'LATER':
      return 'text-muted-foreground'
    case 'DOING':
    case 'NOW':
      return 'text-primary'
    case 'DONE':
      return 'text-emerald-600 line-through'
    default:
      return 'text-muted-foreground'
  }
}
</script>

<template>
  <div class="rounded-md border">
    <div class="flex items-center gap-2 border-b px-3 py-2">
      <CalendarClock class="h-4 w-4 text-muted-foreground" />
      <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agenda</span>
    </div>
    <div class="max-h-[40vh] overflow-auto p-2">
      <div v-if="loading" class="px-2 py-4 text-center text-xs text-muted-foreground">Loading…</div>
      <div v-else-if="!groups.length" class="px-2 py-4 text-center text-xs text-muted-foreground">
        No upcoming tasks
      </div>
      <div v-else class="space-y-3">
        <div v-for="group in groups" :key="group.date">
          <div class="sticky top-0 bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {{ formatDate(group.date) }}
          </div>
          <ul class="space-y-1">
            <li
              v-for="task in group.tasks"
              :key="`${task.page_path}-${task.line}`"
              class="cursor-pointer rounded px-2 py-1 text-xs hover:bg-accent"
              @click="openTask(task.page_path)"
            >
              <div class="flex items-start gap-1.5">
                <span class="font-semibold" :class="markerClass(task.marker)">{{ task.marker }}</span>
                <span v-if="task.priority" class="font-semibold text-amber-600">[#{{ task.priority }}]</span>
                <span class="line-clamp-2">{{ task.content }}</span>
              </div>
              <div class="mt-0.5 truncate text-[10px] text-muted-foreground">{{ task.title || task.page_path }}</div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
