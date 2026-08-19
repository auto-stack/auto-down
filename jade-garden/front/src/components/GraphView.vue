<!-- GraphView component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { buildElements, initGraph, updateGraphElements, applyGraphSettings, applyGraphHighlight, destroyGraph, graphFit, graphRelayout } from '../../auto/src/front/utils/graph_view_ext'


const handle = ref<any[]>([])

const containerEl = ref<HTMLElement | null>(null)

const els = computed<any>(() => buildElements(props.nodes, props.edges, props.settings))

const props = withDefaults(defineProps<{
  nodes: any
  edges: any
  settings: GraphSettings
  loading?: boolean
  highlightQuery?: string
}>(), {
  loading: false,
  highlightQuery: '',
})

const emit = defineEmits<{
  Fit: []
  Relayout: []
  Open: [string]
}>()

import type { GraphNode, GraphEdge, GraphSettings } from '@/lib/api'

watch(els, () => {
  updateGraphElements(handle.value, els.value, props.settings, props.highlightQuery);
})

watch(() => props.settings, () => {
  applyGraphSettings(handle.value, props.settings);
}, { deep: true })

watch(() => props.highlightQuery, () => {
  applyGraphHighlight(handle.value, props.highlightQuery);
})

function Open(p: any): void {

  emit('Open', p)
}

function Fit(): void {
  graphFit(handle.value);

  emit('Fit')
}

function Relayout(): void {
  graphRelayout(handle.value, props.settings);

  emit('Relayout')
}

onMounted(() => {
  let on_open = (p: any) => { Open(p);
   };
  handle.value = initGraph(containerEl.value!, props.nodes, props.edges, props.settings, on_open);
})

onUnmounted(() => {
  destroyGraph(handle.value);

})

defineExpose({ Fit, Relayout, Open })

</script>

<template>
    <div class="graph-view" ref="containerEl">
      <template v-if="loading">
        <div class="graph-loading">
          <span>加载图谱…</span>
        </div>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        /* The original GraphView.vue scoped styles, verbatim. */
        .graph-view {
            width: 100%;
            height: 100%;
            background: transparent;
            position: relative;
        }
        .graph-loading {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: hsl(var(--muted-foreground));
            font-size: 0.875rem;
            pointer-events: none;
        }
    </style>
