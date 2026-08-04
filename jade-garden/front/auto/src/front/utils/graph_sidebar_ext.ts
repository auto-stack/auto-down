// graph_sidebar_ext.ts — hand-written TS extension for graph_sidebar.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the graph/tabs store facade re-exports (dual-resolution shims),
// - the Network lucide re-export (rendered via `dyn`),
// - graphStats (the original stats computed: four filters/counts over the
//   node list),
// - topDegreeNodes (the original topNodes computed: copy-sort-slice —
//   spread + sort + slice have no DSL form — plus the precomputed `display`
//   for the original template's `node.label || node.id`),
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { Network } from 'lucide-vue-next'
import { useGraphStore } from '../../../../src/stores/graph'
import { useTabsStore } from '../../../../src/stores/tabs'
import type { GraphEdge, GraphNode } from '../../../../src/lib/api'

export { useGraphStore, useTabsStore, Network }

/** The original stats computed, verbatim. */
export function graphStats(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { total: number; existing: number; missing: number; orphan: number; edges: number } {
  const total = nodes.length
  const existing = nodes.filter((n) => n.exists).length
  const missing = total - existing
  const orphan = nodes.filter((n) => n.degree === 0).length
  return { total, existing, missing, orphan, edges: edges.length }
}

/** The original topNodes computed, verbatim — plus a precomputed `display`
 *  (`node.label || node.id`), because a Call in view text has no DSL form
 *  (README gap 46). The click handler still passes the raw node.label as
 *  the tab title, exactly like the original. */
export function topDegreeNodes(nodes: GraphNode[]): (GraphNode & { display: string })[] {
  return [...nodes]
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 15)
    .map((n) => ({ ...n, display: n.label || n.id }))
}
