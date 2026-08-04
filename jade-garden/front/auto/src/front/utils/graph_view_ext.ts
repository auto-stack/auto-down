// graph_view_ext.ts — hand-written TS extension for graph_view.at.
//
// The whole cytoscape instance lifecycle lives here (plan 011 非目标 #3:
// third-party imperative widget instances stay in hand-written TS, same
// strategy as the editor package's Tiptap encapsulation in plan 010). The
// .at widget owns the container div, watches the props, forwards every
// change to these functions, and exposes fit/relayout via `expose {}`.
//
// Only what the DSL genuinely cannot express lives here:
// - cytoscape / cytoscape-fcose (npm libs, imperative instance, event
//   handlers, layout API),
// - hsl() (getComputedStyle + regex split — no regex literals in the DSL),
// - buildStyle / buildElements (large object literals over the settings),
// - the hover/tap handlers (the tap handler calls back into the widget
//   through the onOpen closure passed to initGraph),
// - the update/fit/relayout/destroy helpers (all null-guarded: the widget
//   model var starts as the `[]` placeholder and initGraph returns null
//   when the container is missing, exactly like the original's
//   `if (!containerRef.value) return`).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import cytoscape from 'cytoscape'
import cytoscapeFcose from 'cytoscape-fcose'
import type { GraphEdge, GraphNode, GraphSettings } from '../../../../src/lib/api'

cytoscape.use(cytoscapeFcose)

interface GraphHandle {
  cy: cytoscape.Core
}

/** The original `elements` computed, verbatim. */
export function buildElements(
  nodes: GraphNode[],
  edges: GraphEdge[],
  settings: GraphSettings,
): cytoscape.ElementsDefinition {
  const filteredNodes = nodes.filter((n) => {
    if (!settings.showMissing && !n.exists) return false
    if (!settings.showOrphans && n.degree === 0) return false
    return true
  })
  const nodeIds = new Set(filteredNodes.map((n) => n.id))
  const filteredEdges = edges.filter(
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
}

/** The original hsl() helper, verbatim (CSS var -> cytoscape hsl(a)). */
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

/** The original buildStyle(), verbatim (settings passed explicitly). */
function buildStyle(settings: GraphSettings): cytoscape.StylesheetStyle[] {
  const nodeSize = Math.max(4, settings.nodeSize)
  const textOpacity = Math.max(0, Math.min(1, settings.textOpacity))
  const edgeWidth = Math.max(0.5, settings.edgeWidth)
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
        'target-arrow-shape': settings.showArrows ? 'triangle' : 'none',
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

/** The original updateHighlight(), verbatim (query passed explicitly). */
function updateHighlight(cy: cytoscape.Core, highlightQuery: string | undefined) {
  const query = (highlightQuery || '').trim().toLowerCase()
  if (!query) {
    cy.elements().removeClass('dimmed matched')
    return
  }
  cy.elements().addClass('dimmed')
  const matched = cy.nodes().filter((n) => {
    const label = ((n.data('label') as string) || '').toLowerCase()
    const path = ((n.data('path') as string) || '').toLowerCase()
    return label.includes(query) || path.includes(query)
  })
  matched.removeClass('dimmed').addClass('matched')
  matched.connectedEdges().removeClass('dimmed')
}

/** The original runLayout(), verbatim. */
function runLayout(cy: cytoscape.Core, settings: GraphSettings) {
  const layout = cy.layout({
    name: 'fcose',
    quality: 'default',
    animate: true,
    animationDuration: 500,
    fit: true,
    padding: 24,
    nodeSeparation: 80,
    idealEdgeLength: settings.linkLength,
    nodeRepulsion: settings.repulsion,
    edgeElasticity: settings.attraction,
    gravity: settings.gravity,
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

/** The original initCy() + onMounted, verbatim. onOpen is the widget-side
 *  closure that fires the `open` emit (the DSL widget cannot pass its emit
 *  into an extension any other way). Returns null when the container is
 *  missing (the original's `if (!containerRef.value) return`). */
export function initGraph(
  container: HTMLElement | null,
  nodes: GraphNode[],
  edges: GraphEdge[],
  settings: GraphSettings,
  onOpen: (path: string) => void,
): any {
  if (!container) return null
  const cy = cytoscape({
    container,
    elements: buildElements(nodes, edges, settings),
    style: buildStyle(settings),
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
    if (path) onOpen(path)
  })

  cy.on('mouseover', 'node', (evt) => {
    evt.target.addClass('hover')
  })

  cy.on('mouseout', 'node', (evt) => {
    evt.target.removeClass('hover')
  })

  runLayout(cy, settings)
  const handle: GraphHandle = { cy }
  return handle
}

/** The original watch(elements) body, verbatim: swap elements, re-run the
 *  layout, then re-apply the highlight. The original closures captured
 *  `props.settings` / `props.highlightQuery`; the widget passes both per
 *  call instead. */
export function updateGraphElements(
  handle: any,
  els: cytoscape.ElementsDefinition,
  settings: GraphSettings,
  highlightQuery: string | undefined,
): void {
  if (!handle || !handle.cy) return
  handle.cy.elements().remove()
  handle.cy.add(els)
  runLayout(handle.cy, settings)
  updateHighlight(handle.cy, highlightQuery)
}

/** The original watch(() => props.settings, { deep: true }) body. */
export function applyGraphSettings(handle: any, settings: GraphSettings): void {
  if (!handle || !handle.cy) return
  handle.cy.style(buildStyle(settings))
  runLayout(handle.cy, settings)
}

/** The original watch(() => props.highlightQuery) body. */
export function applyGraphHighlight(handle: any, highlightQuery: string | undefined): void {
  if (!handle || !handle.cy) return
  updateHighlight(handle.cy, highlightQuery)
}

/** The original onUnmounted body. */
export function destroyGraph(handle: any): void {
  if (!handle || !handle.cy) return
  handle.cy.destroy()
}

/** The original exposed fit(). */
export function graphFit(handle: any): void {
  if (!handle || !handle.cy) return
  handle.cy.fit(undefined, 24)
}

/** The original exposed relayout(). */
export function graphRelayout(handle: any, settings: GraphSettings): void {
  if (!handle || !handle.cy) return
  runLayout(handle.cy, settings)
}
