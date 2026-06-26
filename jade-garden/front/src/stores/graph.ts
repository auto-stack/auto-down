import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/lib/api'
import type { GraphData, GraphNode, GraphEdge } from '@/lib/api'

export interface GraphSettings {
  showOrphans: boolean
  showMissing: boolean
  nodeSize: number
  textOpacity: number
  edgeWidth: number
  showArrows: boolean
  gravity: number
  repulsion: number
  attraction: number
  linkLength: number
}

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

function loadSettings(): GraphSettings {
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

export const useGraphStore = defineStore('graph', () => {
  const nodes = ref<GraphNode[]>([])
  const edges = ref<GraphEdge[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const settings = ref<GraphSettings>(loadSettings())
  const searchQuery = ref('')
  const viewMode = ref<'editor' | 'graph'>('editor')
  const centerPath = ref<string | null>(null)
  const depth = ref(1)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const data: GraphData = await api.getGraph()
      nodes.value = data.nodes
      edges.value = data.edges
    } catch (e: any) {
      error.value = e.message || String(e)
    } finally {
      loading.value = false
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem('jade-garden.graph.settings', JSON.stringify(settings.value))
    } catch {
      // ignore
    }
  }

  function toggleView() {
    viewMode.value = viewMode.value === 'editor' ? 'graph' : 'editor'
  }

  function openLocal(path: string, d = 1) {
    centerPath.value = path
    depth.value = d
    viewMode.value = 'graph'
  }

  function showGlobal() {
    centerPath.value = null
  }

  return {
    nodes,
    edges,
    loading,
    error,
    settings,
    searchQuery,
    viewMode,
    centerPath,
    depth,
    load,
    saveSettings,
    toggleView,
    openLocal,
    showGlobal,
  }
})
