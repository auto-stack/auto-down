<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import cytoscape from 'cytoscape'
import cytoscapeFcose from 'cytoscape-fcose'
import type { GraphNode, GraphEdge } from '@/lib/api'
import type { GraphSettings } from '@/stores/graph'

cytoscape.use(cytoscapeFcose)

const props = defineProps<{
  nodes: GraphNode[]
  edges: GraphEdge[]
  settings: GraphSettings
  loading?: boolean
  highlightQuery?: string
}>()

const emit = defineEmits<{
  open: [path: string]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let cy: cytoscape.Core | null = null

const elements = computed<cytoscape.ElementsDefinition>(() => {
  const filteredNodes = props.nodes.filter((n) => {
    if (!props.settings.showMissing && !n.exists) return false
    if (!props.settings.showOrphans && n.degree === 0) return false
    return true
  })
  const nodeIds = new Set(filteredNodes.map((n) => n.id))
  const filteredEdges = props.edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  )
  return {
    nodes: filteredNodes.map((n) => ({
      data: {
        id: n.id,
        label: n.label,
        path: n.path,
        exists: n.exists,
        degree: n.degree,
      },
    })),
    edges: filteredEdges.map((e, idx) => ({
      data: {
        id: `e-${idx}`,
        source: e.source,
        target: e.target,
        blockId: e.block_id,
      },
    })),
  }
})

function hsl(name: string, alpha?: number): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!value) return alpha != null ? `rgba(128,128,128,${alpha})` : '#888'
  // Cytoscape expects comma-separated hsl/hsla.
  const parts = value.split(/\s+/)
  if (parts.length < 3) return alpha != null ? `rgba(128,128,128,${alpha})` : '#888'
  const [h, s, l] = parts
  if (alpha != null) {
    return `hsla(${h}, ${s}, ${l}, ${alpha})`
  }
  return `hsl(${h}, ${s}, ${l})`
}

function buildStyle(): cytoscape.StylesheetStyle[] {
  const nodeSize = Math.max(4, props.settings.nodeSize)
  const textOpacity = Math.max(0, Math.min(1, props.settings.textOpacity))
  const edgeWidth = Math.max(0.5, props.settings.edgeWidth)
  return [
    {
      selector: 'core',
      style: {
        'active-bg-opacity': 0,
        'selection-box-opacity': 0,
      },
    },
    {
      selector: 'node',
      style: {
        'background-color': hsl('--primary'),
        'border-width': 1,
        'border-color': hsl('--background'),
        'width': nodeSize,
        'height': nodeSize,
        'label': 'data(label)',
        'color': hsl('--foreground'),
        'font-size': Math.max(8, nodeSize * 0.85),
        'text-opacity': textOpacity,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 4,
        'text-background-opacity': 0,
        'overlay-padding': 4,
      },
    },
    {
      selector: 'node[?exists]',
      style: {
        'background-color': hsl('--primary'),
      },
    },
    {
      selector: 'node[^exists]',
      style: {
        'background-color': hsl('--muted-foreground', 0.5),
        'border-style': 'dashed',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': hsl('--ring'),
      },
    },
    {
      selector: 'node.hover',
      style: {
        'border-width': 2,
        'border-color': hsl('--ring'),
      },
    },
    {
      selector: 'edge',
      style: {
        'width': edgeWidth,
        'line-color': hsl('--muted-foreground', 0.35),
        'target-arrow-shape': props.settings.showArrows ? 'triangle' : 'none',
        'target-arrow-color': hsl('--muted-foreground', 0.35),
        'curve-style': 'bezier',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': hsl('--primary'),
        'target-arrow-color': hsl('--primary'),
      },
    },
    {
      selector: '.matched',
      style: {
        'border-width': 3,
        'border-color': hsl('--ring'),
      },
    },
    {
      selector: '.dimmed',
      style: {
        'opacity': 0.15,
        'text-opacity': 0.15,
      },
    },
  ] as cytoscape.StylesheetStyle[]
}

function updateHighlight() {
  if (!cy) return
  const query = (props.highlightQuery || '').trim().toLowerCase()
  if (!query) {
    cy.elements().removeClass('dimmed matched')
    return
  }
  cy.elements().addClass('dimmed')
  const matched = cy.nodes().filter((n) => {
    const label = (n.data('label') as string || '').toLowerCase()
    const path = (n.data('path') as string || '').toLowerCase()
    return label.includes(query) || path.includes(query)
  })
  matched.removeClass('dimmed').addClass('matched')
  matched.connectedEdges().removeClass('dimmed')
}

function runLayout() {
  if (!cy) return
  const layout = cy.layout({
    name: 'fcose',
    quality: 'default',
    animate: true,
    animationDuration: 500,
    fit: true,
    padding: 24,
    nodeSeparation: 80,
    idealEdgeLength: props.settings.linkLength,
    nodeRepulsion: props.settings.repulsion,
    edgeElasticity: props.settings.attraction,
    gravity: props.settings.gravity,
    numIter: 2500,
    // Seed with random positions. Without this fcose's spectral step starts
    // from the nodes' initial coordinates (all at the origin) and collapses
    // them onto a single diagonal line instead of spreading them out.
    randomize: true,
    tile: true,
    tilingPaddingVertical: 20,
    tilingPaddingHorizontal: 20,
  } as any)
  layout.run()
}

function initCy() {
  if (!containerRef.value) return
  cy = cytoscape({
    container: containerRef.value,
    elements: elements.value,
    style: buildStyle(),
    minZoom: 0.05,
    maxZoom: 3,
    wheelSensitivity: 0.2,
    // No auto-layout here: we call runLayout() explicitly below. Running an
    // fcose layout in the constructor and then again in runLayout() races —
    // the second layout starts before the first has positioned the nodes.
    layout: { name: 'preset' } as any,
  })

  cy.on('tap', 'node', (evt) => {
    const path = evt.target.data('path') as string
    if (path) emit('open', path)
  })

  cy.on('mouseover', 'node', (evt) => {
    evt.target.addClass('hover')
  })

  cy.on('mouseout', 'node', (evt) => {
    evt.target.removeClass('hover')
  })

  runLayout()
}

onMounted(() => {
  initCy()
})

onUnmounted(() => {
  cy?.destroy()
  cy = null
})

watch(elements, () => {
  if (!cy) return
  cy.elements().remove()
  cy.add(elements.value)
  runLayout()
  updateHighlight()
})

watch(
  () => props.settings,
  () => {
    if (!cy) return
    cy.style(buildStyle())
    runLayout()
  },
  { deep: true },
)

watch(
  () => props.highlightQuery,
  () => {
    updateHighlight()
  },
)

function fit() {
  cy?.fit(undefined, 24)
}

function relayout() {
  runLayout()
}

defineExpose({ fit, relayout })
</script>

<template>
  <div ref="containerRef" class="graph-view">
    <div v-if="loading" class="graph-loading">加载图谱…</div>
  </div>
</template>

<style scoped>
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
