// graph_page_ext.ts — hand-written TS extension for graph_page.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the graph/tabs store facade re-exports (dual-resolution shims),
// - the lucide icon re-exports (rendered via `dyn`),
// - the local-graph BFS + visible node/edge filtering (Set/queue traversal —
//   the DSL has no Set type; the original localNodeIds / visibleNodes /
//   visibleEdges computeds, verbatim),
// - centerTitle (the `.replace(/\.ad$/, '')` regex — no regex literals in
//   the DSL),
// - fitGraphView / relayoutGraphView (the original template's
//   `graphViewRef?.fit()` / `graphViewRef?.relayout()` optional-chained
//   calls through the child template ref; the exposed methods are the
//   generated GraphView's Fit/Relayout — the DSL has no `?.`, so the
//   null-guard lives here).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { Globe, Maximize, RefreshCw } from 'lucide-vue-next'
import { useGraphStore } from '../../../../src/stores/graph'
import { useTabsStore } from '../../../../src/stores/tabs'
import type { GraphEdge, GraphNode } from '../../../../src/lib/api'

export { useGraphStore, useTabsStore, Globe, Maximize, RefreshCw }

/** The original localNodeIds computed: BFS from centerPath up to depth
 *  hops over the (undirected) edge list. */
function localNodeIds(
  edges: GraphEdge[],
  centerPath: string | null | undefined,
  depth: number | undefined,
): Set<string> {
  const center = centerPath
  if (!center) return new Set<string>()
  const ids = new Set<string>()
  const visited = new Set<string>()
  const queue: [string, number][] = [[center, 0]]
  const maxDepth = depth ?? 1
  while (queue.length > 0) {
    const [id, d] = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    ids.add(id)
    if (d >= maxDepth) continue
    for (const e of edges) {
      if (e.source === id && !visited.has(e.target)) {
        queue.push([e.target, d + 1])
      }
      if (e.target === id && !visited.has(e.source)) {
        queue.push([e.source, d + 1])
      }
    }
  }
  return ids
}

/** The original visibleNodes computed: all nodes for the global graph, the
 *  BFS neighbourhood for a local one. */
export function visibleGraphNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  centerPath: string | null | undefined,
  depth: number | undefined,
): GraphNode[] {
  if (!centerPath) return nodes
  const ids = localNodeIds(edges, centerPath, depth)
  return nodes.filter((n) => ids.has(n.id))
}

/** The original visibleEdges computed (over the visible node ids). */
export function visibleGraphEdges(
  nodes: GraphNode[],
  edges: GraphEdge[],
  centerPath: string | null | undefined,
  depth: number | undefined,
): GraphEdge[] {
  const ids = new Set(visibleGraphNodes(nodes, edges, centerPath, depth).map((n) => n.id))
  return edges.filter((e) => ids.has(e.source) && ids.has(e.target))
}

/** The original centerTitle computed. */
export function centerTitle(nodes: GraphNode[], centerPath: string | null | undefined): string {
  if (!centerPath) return ''
  const node = nodes.find((n) => n.id === centerPath)
  return node?.label || centerPath.replace(/\.ad$/, '')
}

/** Original: isLocal = computed(() => !!props.centerPath). The DSL's
 *  `!= null` compiles to `!== undefined` (README gap 47), which is true for
 *  an explicit null — so the truthiness check lives here. */
export function hasCenter(centerPath: string | null | undefined): boolean {
  return !!centerPath
}

/** Original template: @click="graphViewRef?.fit()" (the generated
 *  GraphView exposes Fit). */
export function fitGraphView(graphViewRef: any): void {
  graphViewRef?.Fit()
}

/** Original template: @click="graphViewRef?.relayout()". */
export function relayoutGraphView(graphViewRef: any): void {
  graphViewRef?.Relayout()
}
