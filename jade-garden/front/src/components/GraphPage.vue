<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Maximize, RefreshCw } from 'lucide-vue-next'
import GraphView from './GraphView.vue'
import GraphControls from './GraphControls.vue'
import { useGraphStore } from '@/stores/graph'
import { useTabsStore } from '@/stores/tabs'

const graph = useGraphStore()
const tabs = useTabsStore()
const graphViewRef = ref<InstanceType<typeof GraphView> | null>(null)

onMounted(() => {
  graph.load()
})

function openPage(path: string) {
  tabs.open(path)
  graph.viewMode = 'editor'
}
</script>

<template>
  <div class="graph-page">
    <div class="graph-toolbar">
      <span class="text-xs font-medium text-muted-foreground">关系图谱</span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="graph-tool-btn"
          title="适应画布"
          @click="graphViewRef?.fit()"
        >
          <Maximize class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class="graph-tool-btn"
          title="重新布局"
          @click="graphViewRef?.relayout()"
        >
          <RefreshCw class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
    <div class="graph-body">
      <GraphView
        ref="graphViewRef"
        :nodes="graph.nodes"
        :edges="graph.edges"
        :settings="graph.settings"
        :loading="graph.loading"
        :highlight-query="graph.searchQuery"
        class="graph-canvas"
        @open="openPage"
      />
      <GraphControls />
    </div>
    <div v-if="graph.error" class="graph-error">
      {{ graph.error }}
    </div>
  </div>
</template>

<style scoped>
.graph-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: hsl(var(--background));
}
.graph-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height, 2.25rem);
  padding: 0 0.75rem;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}
.graph-tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  color: hsl(var(--muted-foreground));
  transition: background 0.15s ease, color 0.15s ease;
}
.graph-tool-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}
.graph-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.graph-canvas {
  flex: 1;
  min-width: 0;
}
.graph-error {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  background: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
  font-size: 0.75rem;
}
</style>
