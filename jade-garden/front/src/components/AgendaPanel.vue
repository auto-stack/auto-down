<!-- AgendaPanel component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { tabPath, fetchAgendaSafe, agendaDisplay, CalendarClock } from '../../auto/src/front/utils/agenda_panel_ext'
import { useTabsStore } from '../../auto/src/front/utils/agenda_panel_ext'

const tabsStore = useTabsStore()


const groups = ref<any[]>([])
const loading = ref<boolean>(false)

const current_path = computed<any>(() => tabPath(tabsStore.activeTab))
const display_groups = computed<any>(() => agendaDisplay(groups.value))
const show_loading = computed<boolean>(() => loading.value)
const show_empty = computed<boolean>(() => !loading.value && groups.value.length === 0)
const show_groups = computed<boolean>(() => !loading.value && groups.value.length > 0)
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
  OpenTask: [any]
}>()

watch(current_path, () => {
  loading.value = true;
  let p = fetchAgendaSafe();
  p.then((res: any) => { 
  if (res != null) {groups.value = res;
  }loading.value = false;
   });
}, { immediate: true })

function OpenTask(tk: any): void {
  tabsStore.open(tk.page_path);

  emit('OpenTask', tk)
}


</script>

<template>
    <div class="rounded-md border">
      <div class="flex items-center gap-2 border-b px-3 py-2">
        <component :is="(CalendarClock) as any" class="h-4 w-4 text-muted-foreground" />
        <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Agenda</span>
        </span>
      </div>
      <div class="max-h-[40vh] overflow-auto p-2">
        <template v-if="show_loading">
          <div class="px-2 py-4 text-center text-xs text-muted-foreground">
            <span>Loading…</span>
          </div>
        </template>
        <template v-if="show_empty">
          <div class="px-2 py-4 text-center text-xs text-muted-foreground">
            <span>No upcoming tasks</span>
          </div>
        </template>
        <template v-if="show_groups">
          <div class="space-y-3">
            <div :key="g.formatted_date" v-for="g in display_groups">
              <div class="sticky top-0 bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground">
                <span>{{ g.formatted_date }}</span>
              </div>
              <component :is="(ul_tag) as any" class="space-y-1">
                <component :is="(li_tag) as any" class="cursor-pointer rounded px-2 py-1 text-xs hover:bg-accent" :key="tk.page_path" @click="OpenTask(tk)" v-for="tk in g.tasks">
                  <div class="flex items-start gap-1.5">
                    <span class="font-semibold" :class="{ 'text-muted-foreground': tk.marker_muted, 'text-primary': tk.marker_primary, 'text-emerald-600 line-through': tk.marker_done }">
                      <span>{{ tk.marker }}</span>
                    </span>
                    <template v-if="tk.priority">
                      <span class="font-semibold text-amber-600">
                        <span>[#{{ tk.priority }}]</span>
                      </span>
                    </template>
                    <span class="line-clamp-2">
                      <span>{{ tk.content }}</span>
                    </span>
                  </div>
                  <div class="mt-0.5 truncate text-[10px] text-muted-foreground">
                    <span>{{ tk.line }}</span>
                  </div>
                </component>
              </component>
            </div>
          </div>
        </template>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
