<!-- Ribbon component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ThemePopover } from '../../auto/src/front/utils/ribbon_ext'
import { ribbonItems, graphActive, openTodayNote, Network, CalendarDays, Palette } from '../../auto/src/front/utils/ribbon_ext'
import { useSidebarStore, useTabsStore, useFileTreeStore } from '../../auto/src/front/utils/ribbon_ext'

const sidebarStore = useSidebarStore()
const tabsStore = useTabsStore()
const fileTreeStore = useFileTreeStore()


const theme_open = ref<boolean>(false)

const items = computed<any>(() => ribbonItems(sidebarStore.leftPanel, sidebarStore.leftOpen))
const graph_active = computed<any>(() => graphActive(tabsStore.activeTab))

const emit = defineEmits<{
  Select: [any]
  OpenGlobalGraph: []
  OpenToday: []
  ToggleTheme: []
  CloseTheme: []
}>()

function ToggleTheme(): void {
  theme_open.value = !theme_open.value;

  emit('ToggleTheme')
}

function OpenToday(): void {
  openTodayNote(tabsStore, fileTreeStore);

  emit('OpenToday')
}

function OpenGlobalGraph(): void {
  tabsStore.openGraph();

  emit('OpenGlobalGraph')
}

function CloseTheme(): void {
  theme_open.value = false;

  emit('CloseTheme')
}

function Select(item: any): void {
  sidebarStore.setLeftPanel(item.panel);

  emit('Select', item)
}


</script>

<template>
    <nav class="flex w-11 flex-col items-center gap-1 border-r bg-card py-2">
      <button class="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" :class="{ 'text-primary bg-primary/10 hover:bg-primary/15': item.active }" :type="'button'" :title="item.label" @click="Select(item)" v-for="item in items">
        <component :is="(item.icon) as any" class="h-[18px] w-[18px]" />
        <template v-if="item.active">
          <span class="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
        </template>
      </button>
      <button class="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" :class="{ 'text-primary bg-primary/10 hover:bg-primary/15': graph_active }" :type="'button'" :title="'全局图谱'" @click="OpenGlobalGraph">
        <component :is="(Network) as any" class="h-[18px] w-[18px]" />
        <template v-if="graph_active">
          <span class="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
        </template>
      </button>
      <button class="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" :type="'button'" :title="'今日笔记'" @click="OpenToday">
        <component :is="(CalendarDays) as any" class="h-[18px] w-[18px]" />
      </button>
      <div class="flex-1" />
      <button :class="theme_open ? 'relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground text-primary bg-primary/10' : 'relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'" :type="'button'" :title="'Theme'" @click="ToggleTheme">
        <component :is="(Palette) as any" class="h-[18px] w-[18px]" />
      </button>
      <ThemePopover :open="theme_open" :key="'ThemePopover-1'" @close="CloseTheme" />
    </nav>

</template>

<style>
/* Component styles */

</style>
