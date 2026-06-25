import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/lib/api'

export const useWorkspaceStore = defineStore('workspace', () => {
  const root = ref<string | null>(null)
  const wikiDir = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const info = await api.getWorkspace()
      root.value = info.root
      wikiDir.value = info.wiki_dir
    } catch (e: any) {
      error.value = e.message || String(e)
    } finally {
      loading.value = false
    }
  }

  async function open(path: string) {
    loading.value = true
    error.value = null
    try {
      const info = await api.openWorkspace(path)
      root.value = info.root
      wikiDir.value = info.wiki_dir
    } catch (e: any) {
      error.value = e.message || String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return { root, wikiDir, loading, error, load, open }
})
