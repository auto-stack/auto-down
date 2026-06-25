import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/lib/api'

export const useFileTreeStore = defineStore('fileTree', () => {
  const files = ref<api.FileNode[]>([])
  const expanded = ref<Set<string>>(new Set())
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      files.value = await api.listFiles('', true)
    } catch (e: any) {
      error.value = e.message || String(e)
    } finally {
      loading.value = false
    }
  }

  function toggle(path: string) {
    if (expanded.value.has(path)) {
      expanded.value.delete(path)
    } else {
      expanded.value.add(path)
    }
  }

  async function createFile(path: string, isDir = false) {
    await api.createFile(path, isDir)
    await load()
  }

  async function renameFile(oldPath: string, newPath: string) {
    await api.renameFile(oldPath, newPath)
    await load()
  }

  async function deleteFile(path: string) {
    await api.deleteFile(path)
    await load()
  }

  return { files, expanded, loading, error, load, toggle, createFile, renameFile, deleteFile }
})
