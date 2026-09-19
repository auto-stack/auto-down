<!-- GraphSidebar component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Network } from '../../auto/src/front/utils/graph_sidebar_ext'
import { useGraphStore, useTabsStore } from '../../auto/src/front/utils/graph_sidebar_ext'

const graphStore = useGraphStore()
const tabsStore = useTabsStore()


const stats = computed<any>(() => graph_stats(graphStore.nodes, graphStore.edges))
const top_nodes = computed<any>(() => top_degree_nodes(graphStore.nodes))
const ul_tag = computed<string>(() => 'ul')
const li_tag = computed<string>(() => 'li')

const emit = defineEmits<{
  Init: []
  OpenNode: [any]
}>()

function OpenNode(node: any): void {
  tabsStore.open(node.path, node.label);

  emit('OpenNode', node)
}

function graph_stats(nodes_in: any, edges_in: any): any {
  let total: number = 0;
  let existing: number = 0;
  let orphan: number = 0;
  for (const n of nodes_in) {total = total + 1;
  if (n.exists) {existing = existing + 1;
  }if (n.degree == 0) {orphan = orphan + 1;
  }}
  return { total: total, existing: existing, missing: total - existing, orphan: orphan, edges: edges_in.length };
}

function top_degree_nodes(nodes_in: any): any {
  let copy: any[] = [];
  for (const n of nodes_in) {copy.push(n);
  }
  let total = copy.length;
  let i: number = 0;
  while (i < total) {let max_i: number = i;
  let j: number = i + 1;
  while (j < total) {let cj = copy[j];
  let cm = copy[max_i];
  if (cj.degree > cm.degree) {max_i = j;
  }j = j + 1;
  }
  let ci = copy[i];
  let cmax = copy[max_i];
  copy[i] = cmax;
  copy[max_i] = ci;
  i = i + 1;
  }
  let out: any[] = [];
  let k: number = 0;
  while (k < total) {if (k >= 15) {break;
  }let nd = copy[k];
  let disp = nd.id;
  if (nd.label != null && nd.label != '') {disp = nd.label;
  }out.push({ id: nd.id, label: nd.label, path: nd.path, exists: nd.exists, degree: nd.degree, display: disp });
  k = k + 1;
  }
  return out;
}

onMounted(() => {
  if (graphStore.nodes.length == 0 && !graphStore.loading) {graphStore.load();
  }
})


</script>

<template>
    <div class="flex h-full flex-col">
      <div class="flex h-[var(--header-height)] items-center border-b px-3">
        <component :is="(Network) as any" class="mr-1.5 h-4 w-4 text-primary" />
        <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>图谱</span>
        </span>
      </div>
      <div class="flex-1 overflow-y-auto p-3">
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="stat-card">
            <span class="stat-label">
              <span>页面</span>
            </span>
            <span class="stat-value">
              <span>{{ stats.total }}</span>
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">
              <span>链接</span>
            </span>
            <span class="stat-value">
              <span>{{ stats.edges }}</span>
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">
              <span>缺失</span>
            </span>
            <span class="stat-value">
              <span>{{ stats.missing }}</span>
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">
              <span>孤立</span>
            </span>
            <span class="stat-value">
              <span>{{ stats.orphan }}</span>
            </span>
          </div>
        </div>
        <div class="mt-5">
          <div class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>连接最多的页面</span>
          </div>
          <template v-if="graphStore.loading">
            <div class="text-xs text-muted-foreground">
              <span>加载中…</span>
            </div>
          </template>
          <template v-if="! graphStore.loading">
            <component :is="(ul_tag) as any" class="space-y-1">
              <component :is="(li_tag) as any" class="flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-accent cursor-pointer" :key="node.id" @click="OpenNode(node)" v-for="node in top_nodes">
                <span class="truncate">
                  <span>{{ node.display }}</span>
                </span>
                <span class="shrink-0 text-[10px] text-muted-foreground">
                  <span>{{ node.degree }}</span>
                </span>
              </component>
            </component>
          </template>
        </div>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        /* The original GraphSidebar.vue scoped styles, verbatim. */
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
