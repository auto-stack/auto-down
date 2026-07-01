<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Network } from 'lucide-vue-next'
import { useGraphStore } from '@/stores/graph'
import { useTabsStore } from '@/stores/tabs'

const graph = useGraphStore()
const tabs = useTabsStore()

onMounted(() => {
  if (graph.nodes.length === 0 && !graph.loading) {
    graph.load()
  }
})

const stats = computed(() => {
  const total = graph.nodes.length
  const existing = graph.nodes.filter((n) => n.exists).length
  const missing = total - existing
  const orphan = graph.nodes.filter((n) => n.degree === 0).length
  return { total, existing, missing, orphan, edges: graph.edges.length }
})

const topNodes = computed(() => {
  return [...graph.nodes].sort((a, b) => b.degree - a.degree).slice(0, 15)
})
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex h-[var(--header-height)] items-center border-b px-3">
      <Network class="mr-1.5 h-4 w-4 text-primary" />
      <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">图谱</span>
    </div>

    <div class="flex-1 overflow-y-auto p-3">
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="stat-card">
          <span class="stat-label">页面</span>
          <span class="stat-value">{{ stats.total }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">链接</span>
          <span class="stat-value">{{ stats.edges }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">缺失</span>
          <span class="stat-value">{{ stats.missing }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">孤立</span>
          <span class="stat-value">{{ stats.orphan }}</span>
        </div>
      </div>

      <div class="mt-5">
        <div class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          连接最多的页面
        </div>
        <div v-if="graph.loading" class="text-xs text-muted-foreground">加载中…</div>
        <ul v-else class="space-y-1">
          <li
            v-for="node in topNodes"
            :key="node.id"
            class="flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-accent cursor-pointer"
            @click="tabs.open(node.path, node.label)"
          >
            <span class="truncate">{{ node.label || node.id }}</span>
            <span class="shrink-0 text-[10px] text-muted-foreground">{{ node.degree }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.open-graph-btn {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  font-size: 0.75rem;
  font-weight: 500;
  transition: opacity 0.15s ease;
}
.open-graph-btn:hover {
  opacity: 0.9;
}
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
}
.stat-label {
  color: hsl(var(--muted-foreground));
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}
.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  font-variant-numeric: tabular-nums;
}
</style>
