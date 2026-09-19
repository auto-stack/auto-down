// graph_sidebar_ext.ts — hand-written TS extension for graph_sidebar.at.
//
// PLAN-078 T-01 sink: graphStats / topDegreeNodes moved into graph_sidebar.at
// module fns (graph_stats / top_degree_nodes — 074-sink-mode §7.1). What
// remains is only what the DSL genuinely cannot express:
// - the graph/tabs store facade re-exports (dual-resolution shims),
// - the Network lucide re-export (rendered via `dyn`).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { Network } from 'lucide-vue-next'
import { useGraphStore } from '../../../../src/stores/graph'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useGraphStore, useTabsStore, Network }
