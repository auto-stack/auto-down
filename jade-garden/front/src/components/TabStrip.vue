<!-- TabStrip component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed } from 'vue'
import { stripTabs, hasStripTabs, canOpenLocalGraph, openLocalGraphTab, switchTab, closeTab, openTodayNote, navigateDailyNote, hasStripDaily, stripDailyTitle, X, Focus, Network, ChevronLeft, ChevronRight, CalendarDays } from '../../auto/src/front/utils/tab_strip_ext'
import { useTabsStore, useFileTreeStore } from '../../auto/src/front/utils/tab_strip_ext'

const tabsStore = useTabsStore()
const fileTreeStore = useFileTreeStore()


const items = computed<any>(() => stripTabs(tabsStore.tabs, tabsStore.activePath))
const has_tabs = computed<any>(() => hasStripTabs(tabsStore))
const can_local_graph = computed<any>(() => canOpenLocalGraph(tabsStore.activeTab))
const has_daily = computed<any>(() => hasStripDaily(tabsStore.activeTab))
const daily_title = computed<any>(() => stripDailyTitle(tabsStore.activeTab))

const emit = defineEmits<{
  SwitchTab: [any]
  CloseTab: [any]
  OpenLocalGraph: []
  OpenToday: []
  NavPrev: []
  NavNext: []
}>()

function CloseTab(tab: any): void {
  closeTab(tabsStore, tab.path);

  emit('CloseTab', tab)
}

function OpenLocalGraph(): void {
  openLocalGraphTab(tabsStore);

  emit('OpenLocalGraph')
}

function SwitchTab(tab: any): void {
  switchTab(tabsStore, tab.path);

  emit('SwitchTab', tab)
}

function OpenToday(): void {
  openTodayNote(tabsStore, fileTreeStore);

  emit('OpenToday')
}

function NavPrev(): void {
  navigateDailyNote('prev', tabsStore, fileTreeStore);

  emit('NavPrev')
}

function NavNext(): void {
  navigateDailyNote('next', tabsStore, fileTreeStore);

  emit('NavNext')
}


</script>

<template>
    <template v-if="has_tabs">
      <div class="flex h-[var(--header-height)] shrink-0 items-center gap-1 border-b bg-card px-2">
        <button :class="(tab.active ? 'group relative flex h-7 max-w-[180px] items-center gap-1.5 rounded-md px-2 text-xs transition-colors bg-primary/10 text-primary' : 'group relative flex h-7 max-w-[180px] items-center gap-1.5 rounded-md px-2 text-xs transition-colors text-muted-foreground hover:bg-accent hover:text-foreground')" :type="'button'" @click="SwitchTab(tab)" v-for="tab in items">
          <template v-if="tab.isGraph">
            <component :is="(Network) as any" class="h-3.5 w-3.5" />
          </template>
          <span class="truncate">
            <span>{{ tab.title }}</span>
          </span>
          <template v-if="tab.dirty">
            <span class="text-[9px] leading-none">
              <span>●</span>
            </span>
          </template>
          <span :class="(tab.active ? 'ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-sm opacity-0 transition-opacity opacity-100' : 'ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-sm opacity-0 transition-opacity group-hover:opacity-100')" @click.stop="CloseTab(tab)">
            <component :is="(X) as any" class="h-3 w-3" />
          </span>
        </button>
        <div class="mx-1 h-4 w-px bg-border" />
        <template v-if="can_local_graph">
          <button class="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" :title="'当前文档的局部图谱'" :type="'button'" @click="OpenLocalGraph">
            <component :is="(Focus) as any" class="h-3.5 w-3.5" />
            <span>
              <span>局部图谱</span>
            </span>
          </button>
        </template>
        <button class="ml-auto flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" :type="'button'" :title="'今日笔记'" @click="OpenToday">
          <component :is="(CalendarDays) as any" class="h-3.5 w-3.5" />
          <span>
            <span>今日笔记</span>
          </span>
        </button>
        <template v-if="has_daily">
          <div class="flex items-center gap-0.5 rounded-md border bg-card px-1 text-xs text-muted-foreground">
            <button class="flex h-6 w-6 items-center justify-center rounded hover:bg-accent hover:text-foreground" :type="'button'" :title="'前一天'" @click="NavPrev">
              <component :is="(ChevronLeft) as any" class="h-3.5 w-3.5" />
            </button>
            <span class="px-1">
              <span>{{ daily_title }}</span>
            </span>
            <button class="flex h-6 w-6 items-center justify-center rounded hover:bg-accent hover:text-foreground" :title="'后一天'" :type="'button'" @click="NavNext">
              <component :is="(ChevronRight) as any" class="h-3.5 w-3.5" />
            </button>
          </div>
        </template>
      </div>
    </template>

</template>

<style>
/* Component styles */

</style>
