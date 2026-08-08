<!-- GraphPage component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGraphStore, useTabsStore } from '../../auto/src/front/utils/graph_page_ext'
import { visibleGraphNodes, visibleGraphEdges, centerTitle, fitGraphView, relayoutGraphView, Globe, Maximize, RefreshCw } from '../../auto/src/front/utils/graph_page_ext'

const graphStore = useGraphStore()
const tabsStore = useTabsStore()

import GraphControls from '@/components/GraphControls.vue'
import GraphView from '@/components/GraphView.vue'


const graphViewRef = ref<any>(null)

const is_local = computed<boolean>(() => props.centerPath != null)
const visible_nodes = computed<any>(() => visibleGraphNodes(graphStore.nodes, graphStore.edges, props.centerPath, props.depth))
const visible_edges = computed<any>(() => visibleGraphEdges(graphStore.nodes, graphStore.edges, props.centerPath, props.depth))
const center_title = computed<any>(() => centerTitle(graphStore.nodes, props.centerPath))

const props = defineProps<{
  centerPath?: string | null
  depth?: number
}>()

const emit = defineEmits<{
  OpenPage: [any]
  SwitchToGlobal: []
  FitView: []
  RelayoutView: []
}>()

function SwitchToGlobal(): void {
  tabsStore.openGraph();

  emit('SwitchToGlobal')
}

function OpenPage(p: any): void {
  tabsStore.open(p);

  emit('OpenPage', p)
}

function FitView(): void {
  fitGraphView(graphViewRef.value!);

  emit('FitView')
}

function RelayoutView(): void {
  relayoutGraphView(graphViewRef.value!);

  emit('RelayoutView')
}

onMounted(() => {
  graphStore.load();
})


</script>

<template>
    <div class="graph-page">
      <div class="graph-toolbar">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-muted-foreground">
            <span>关系图谱</span>
          </span>
          <template v-if="is_local">
            <span class="local-badge">
              <span>局部：{{ center_title }}</span>
            </span>
          </template>
        </div>
        <div class="flex items-center gap-1">
          <template v-if="is_local">
            <button class="graph-tool-btn" :title="'返回全局图谱'" :type="'button'" @click="SwitchToGlobal">
              <component :is="(Globe) as any" class="h-3.5 w-3.5" />
            </button>
          </template>
          <button class="graph-tool-btn" :title="'适应画布'" :type="'button'" @click="FitView">
            <component :is="(Maximize) as any" class="h-3.5 w-3.5" />
          </button>
          <button class="graph-tool-btn" :type="'button'" :title="'重新布局'" @click="RelayoutView">
            <component :is="(RefreshCw) as any" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div class="graph-body">
        <GraphView class="graph-canvas" :highlightQuery="graphStore.searchQuery" :loading="graphStore.loading" :edges="visible_edges" :nodes="visible_nodes" ref="graphViewRef" :settings="graphStore.settings" @open="OpenPage" :key="'GraphView-1'" />
        <GraphControls :key="'GraphControls-2'" />
      </div>
      <template v-if="graphStore.error">
        <div class="graph-error">
          <span>{{ graphStore.error }}</span>
        </div>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        /* The original GraphPage.vue scoped styles, verbatim. */
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
