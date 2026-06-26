<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Maximize, RefreshCw, Focus, Globe, X } from 'lucide-vue-next'
import GraphView from './GraphView.vue'
import GraphControls from './GraphControls.vue'
import { useGraphStore } from '@/stores/graph'
import { useTabsStore } from '@/stores/tabs'
import type { GraphNode, GraphEdge } from '@/lib/api'

const graph = useGraphStore()
const tabs = useTabsStore()
const graphViewRef = ref<InstanceType<typeof GraphView> | null>(null)

onMounted(() => {
  graph.load()
})

const isLocal = computed(() => !!graph.centerPath)

const localNodeIds = computed(() => {
  if (!graph.centerPath) return new Set<string>()
  const ids = new Set<string>()
  const visited = new Set<string>()
  const queue: [string, number][] = [[graph.centerPath, 0]]
  while (queue.length > 0) {
    const [id, d] = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    ids.add(id)
    if (d >= graph.depth) continue
    for (const e of graph.edges) {
      if (e.source === id && !visited.has(e.target)) {
        queue.push([e.target, d + 1])
      }
      if (e.target === id && !visited.has(e.source)) {
        queue.push([e.source, d + 1])
      }
    }
  }
  return ids
})

const visibleNodes = computed<GraphNode[]>(() => {
  if (!isLocal.value) return graph.nodes
  const ids = localNodeIds.value
  return graph.nodes.filter((n) => ids.has(n.id))
})

const visibleEdges = computed<GraphEdge[]>(() => {
  const ids = new Set(visibleNodes.value.map((n) => n.id))
  return graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target))
})

const centerTitle = computed(() => {
  if (!graph.centerPath) return ''
  const node = graph.nodes.find((n) => n.id === graph.centerPath)
  return node?.label || graph.centerPath.replace(/\.ad$/, '')
})

function openPage(path: string) {
  tabs.open(path)
  graph.viewMode = 'editor'
}
</script>

<template>
  <div class="graph-page">
    <div class="graph-toolbar">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-muted-foreground">关系图谱</span>
        <span v-if="isLocal" class="local-badge">
          局部：{{ centerTitle }}
        </span>
      </div>
      <div class="flex items-center gap-1">
        <button
          v-if="isLocal"
          type="button"
          class="graph-tool-btn"
          title="返回全局图谱"
          @click="graph.showGlobal()"
        >
          <Globe class="h-3.5 w-3.5" />
        </button>
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
        :nodes="visibleNodes"
        :edges="visibleEdges"
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
.local-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background: hsl(var(--primary) / 0.12);
  color: hsl(var(--primary));
  font-size: 0.7rem;
  font-weight: 500;
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
