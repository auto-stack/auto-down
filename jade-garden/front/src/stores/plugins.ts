import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listFiles } from '@/lib/api'

export interface PluginManifest {
  id: string
  name: string
  version: string
  entry: string
  permissions?: string[]
}

export const usePluginsStore = defineStore('plugins', () => {
  const plugins = ref<PluginManifest[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const nodes = await listFiles('', true)
      const found: PluginManifest[] = []
      function walk(list: any[]) {
        for (const node of list) {
          if (node.is_dir && node.name.toLowerCase() === 'plugins' && node.children) {
            for (const child of node.children) {
              if (!child.is_dir && child.path.toLowerCase().endsWith('.json')) {
                found.push(loadManifest(child.path))
              }
            }
          }
          if (node.children) walk(node.children)
        }
      }
      walk(nodes)
      plugins.value = found
    } catch (e: any) {
      error.value = e.message || String(e)
    } finally {
      loading.value = false
    }
  }

  function loadManifest(path: string): PluginManifest {
    // Manifests are loaded on demand by PluginFrame; the store only knows the path.
    return {
      id: path.replace(/\.json$/, '').replace(/^plugins\//, ''),
      name: path.replace(/\.json$/, '').replace(/^plugins\//, ''),
      version: '0.0.0',
      entry: path,
    }
  }

  return { plugins, loading, error, load }
})
