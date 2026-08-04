<!-- GraphView component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { buildElements, initGraph, updateGraphElements, applyGraphSettings, applyGraphHighlight, destroyGraph, graphFit, graphRelayout } from '../../auto/src/front/utils/graph_view_ext'


const handle = ref<any[]>([])
const open_emit_wiring = ref<boolean>(false)

const containerEl = ref<HTMLElement | null>(null)

const els = computed<any>(() => buildElements(props.nodes, props.edges, props.settings))

const props = defineProps<{
  nodes: any
  edges: any
  settings: GraphSettings
  loading?: boolean
  highlightQuery?: string
}>()

import type { GraphSettings } from '@/lib/api'

const emit = defineEmits<{
  Fit: []
  Relayout: []
  open: [string]
}>()

watch(els, () => {
  updateGraphElements(handle.value, els.value, props.settings, props.highlightQuery);
})

watch(() => props.settings, () => {
  applyGraphSettings(handle.value, props.settings);
}, { deep: true })

watch(() => props.highlightQuery, () => {
  applyGraphHighlight(handle.value, props.highlightQuery);
})

function Fit(): void {
  graphFit(handle.value);

  emit('Fit')
}

function Relayout(): void {
  graphRelayout(handle.value, props.settings);

  emit('Relayout')
}

function open(p: any): void {

  emit('open', p)
}

onMounted(() => {
  let on_open = (p: any) => { open(p);
   };
  handle.value = initGraph(containerEl.value!, props.nodes, props.edges, props.settings, on_open);
})

onUnmounted(() => {
  destroyGraph(handle.value);

})

defineExpose({ Fit, Relayout })

</script>

<template>
    <div class="graph-view" ref="containerEl">
      <template v-if="open_emit_wiring">
        <button class="hidden" @click="open">
          <span>open</span>
        </button>
      </template>
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
