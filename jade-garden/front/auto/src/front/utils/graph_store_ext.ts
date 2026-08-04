// graph_store_ext.ts — hand-written TS extension for graph_store.at.
//
// The store codegen emits every external function as an import from
// '@/lib/api'; the Regenerate flow sed-rewrites that import to THIS module
// when copying the composable into front/src/stores/auto/.
//
// Only what the DSL genuinely cannot express lives here: localStorage
// load/save of the settings (with try/catch) and the try/catch around
// getGraph (never-rejecting wrapper returning { nodes, edges, error }).
import {
  getGraph,
  type GraphEdge,
  type GraphNode,
  type GraphSettings,
} from '../../../../src/lib/api'

// GraphSettings moved to src/lib/api.ts (next to GraphNode/GraphEdge) in
// Phase 5.3b so the generated GraphView widget's prop-type import resolves;
// re-exported here for the store facade and existing consumers.
export type { GraphSettings }

const DEFAULT_SETTINGS: GraphSettings = {
  showOrphans: true,
  showMissing: false,
  nodeSize: 12,
  textOpacity: 0.85,
  edgeWidth: 1,
  showArrows: false,
  gravity: 0.05,
  repulsion: 4500,
  attraction: 0.05,
  linkLength: 120,
}

/** The original loadSettings(), verbatim. */
export function loadGraphSettings(): GraphSettings {
  try {
    const raw = localStorage.getItem('jade-garden.graph.settings')
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS }
}

/** The original saveSettings(), verbatim. */
export function saveGraphSettings(settings: GraphSettings): void {
  try {
    localStorage.setItem('jade-garden.graph.settings', JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export interface GraphLoadResult {
  nodes: GraphNode[]
  edges: GraphEdge[]
  error: string
}

/** getGraph that never rejects (the DSL has no try/catch); mirrors the
 *  original catch branch (`error.value = e.message || String(e)`). */
export async function getGraphResult(): Promise<GraphLoadResult> {
  try {
    const data = await getGraph()
    return { nodes: data.nodes, edges: data.edges, error: '' }
  } catch (e: any) {
    return { nodes: [], edges: [], error: e.message || String(e) }
  }
}
