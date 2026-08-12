<!-- MainArea component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed } from 'vue'
import { editorTabs, hasGraphTab, graphTabPath, graphCenter, graphDepth, hasWhiteboardTab, whiteboardPath, noTabs, EmptyFileIcon } from '../../auto/src/front/utils/main_area_ext'
import { useTabsStore } from '../../auto/src/front/utils/main_area_ext'

const tabsStore = useTabsStore()

import EditorTab from '@/components/EditorTab.vue'
import GraphPage from '@/components/GraphPage.vue'
import TabStrip from '@/components/TabStrip.vue'
import WhiteboardPage from '@/components/WhiteboardPage.vue'


const editor_tabs = computed<any>(() => editorTabs(tabsStore.tabs, tabsStore.activePath))
const has_graph = computed<any>(() => hasGraphTab(tabsStore.activeTab))
const graph_key = computed<any>(() => graphTabPath(tabsStore.activeTab))
const graph_center = computed<any>(() => graphCenter(tabsStore.activeTab))
const graph_depth = computed<any>(() => graphDepth(tabsStore.activeTab))
const has_whiteboard = computed<any>(() => hasWhiteboardTab(tabsStore.activeTab))
const whiteboard_path = computed<any>(() => whiteboardPath(tabsStore.activeTab))
const no_tabs = computed<any>(() => noTabs(tabsStore.tabs))


</script>

<template>
    <main class="flex h-full flex-col overflow-hidden bg-background">
      <TabStrip :key="'TabStrip-1'" />
      <div class="relative flex flex-1 overflow-hidden">
        <EditorTab :class="'absolute inset-0'" :key="tab.path" :path="tab.path" :style="({ display: tab.display } as any)"  v-for="tab in editor_tabs"/>
        <template v-if="has_graph">
          <GraphPage :depth="graph_depth" :key="graph_key" :centerPath="graph_center" :class="'absolute inset-0'" />
        </template>
        <template v-if="has_whiteboard">
          <WhiteboardPage :path="whiteboard_path" :key="whiteboard_path" :class="'absolute inset-0'" />
        </template>
        <template v-if="no_tabs">
          <div class="flex h-full flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <div class="rounded-full bg-accent p-3">
              <component :is="(EmptyFileIcon) as any" class="h-6 w-6" />
            </div>
            <p class="text-sm">
              <span>Select a file from the sidebar to open it.</span>
            </p>
          </div>
        </template>
      </div>
    </main>

</template>

<style>
/* Component styles */

</style>
