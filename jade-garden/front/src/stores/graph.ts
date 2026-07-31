// graph.ts — hand-written facade over the Auto-generated graph store
// composable (auto/src/front/graph_store.at → stores/auto/useGraphStore.ts).
//
// Plan 011 Phase 5.1 (Pinia → Auto store migration): the Pinia defineStore
// was replaced by this facade, which keeps the original store API shape
// (camelCase writable state, default arg on openLocal) so all consumers
// stay unchanged.
//
// Adaptations: the real initial settings value comes from the ext module
// (localStorage), and Pinia's $patch (used by GraphControls' reset) is
// emulated — only the `settings` key is patched, which is the only key
// any consumer passes.
import { useGraphStore as useGeneratedGraphStore } from './auto/useGraphStore'
import {
  loadGraphSettings,
  type GraphSettings,
} from '../../auto/src/front/utils/graph_store_ext'
import type { GraphEdge, GraphNode } from '@/lib/api'

export type { GraphSettings }

const g = useGeneratedGraphStore()

// Real initial value (the .at model only carries a placeholder).
g.settings.value = loadGraphSettings()

export function useGraphStore() {
  return {
    get nodes(): GraphNode[] {
      return g.nodes.value
    },
    set nodes(v: GraphNode[]) {
      g.nodes.value = v
    },
    get edges(): GraphEdge[] {
      return g.edges.value
    },
    set edges(v: GraphEdge[]) {
      g.edges.value = v
    },
    get loading(): boolean {
      return g.loading.value
    },
    set loading(v: boolean) {
      g.loading.value = v
    },
    get error(): string | null {
      return g.error.value
    },
    set error(v: string | null) {
      g.error.value = v
    },
    get settings(): GraphSettings {
      return g.settings.value
    },
    set settings(v: GraphSettings) {
      g.settings.value = v
    },
    get searchQuery(): string {
      return g.search_query.value
    },
    set searchQuery(v: string) {
      g.search_query.value = v
    },
    get viewMode(): 'editor' | 'graph' {
      return g.view_mode.value
    },
    set viewMode(v: 'editor' | 'graph') {
      g.view_mode.value = v
    },
    get centerPath(): string | null {
      return g.center_path.value
    },
    set centerPath(v: string | null) {
      g.center_path.value = v
    },
    get depth(): number {
      return g.depth.value
    },
    set depth(v: number) {
      g.depth.value = v
    },
    load: (): Promise<void> => g.Load(),
    saveSettings: (): void => {
      g.SaveSettings()
    },
    toggleView: (): void => g.ToggleView(),
    openLocal: (path: string, d = 1): void => g.OpenLocal({ path, depth: d }),
    showGlobal: (): void => g.ShowGlobal(),
    // Pinia $patch emulation (GraphControls' reset passes only `settings`).
    $patch: (partial: { settings?: GraphSettings }): void => {
      if (partial.settings) g.settings.value = partial.settings
    },
  }
}
