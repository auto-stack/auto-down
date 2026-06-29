<script setup lang="ts">
import { useGraphStore } from '@/stores/graph'
import BacklinksPanel from './BacklinksPanel.vue'
import OutgoingLinksPanel from './OutgoingLinksPanel.vue'
import OutlinePanel from './OutlinePanel.vue'
import PropertiesPanel from './PropertiesPanel.vue'
import GraphSidebar from './GraphSidebar.vue'

const graph = useGraphStore()
</script>

<template>
  <aside class="flex w-64 flex-col gap-3 overflow-y-auto border-l bg-card p-3 text-sm">
    <template v-if="graph.viewMode === 'graph'">
      <GraphSidebar />
    </template>
    <template v-else>
      <OutlinePanel />
      <BacklinksPanel />
      <OutgoingLinksPanel />
      <PropertiesPanel />
    </template>
  </aside>
</template>
