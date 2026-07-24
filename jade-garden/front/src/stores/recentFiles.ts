import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'jade-garden-recent-files'
const MAX_RECENT = 25

export interface RecentFile {
  path: string
  title: string
  openedAt: number
}

function load(): RecentFile[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as RecentFile[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(items: RecentFile[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const useRecentFilesStore = defineStore('recentFiles', () => {
  const files = ref<RecentFile[]>(load())

  function record(path: string, title: string) {
    const filtered = files.value.filter((f) => f.path !== path)
    filtered.unshift({ path, title, openedAt: Date.now() })
    files.value = filtered.slice(0, MAX_RECENT)
    save(files.value)
  }

  function remove(path: string) {
    files.value = files.value.filter((f) => f.path !== path)
    save(files.value)
  }

  function clear() {
    files.value = []
    save([])
  }

  return { files, record, remove, clear }
})
