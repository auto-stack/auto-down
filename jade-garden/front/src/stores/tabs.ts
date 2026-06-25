import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Tab {
  path: string
  title: string
  dirty?: boolean
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([])
  const activePath = ref<string | null>(null)

  const activeTab = computed(() => tabs.value.find(t => t.path === activePath.value) || null)

  function open(path: string, title?: string) {
    const existing = tabs.value.find(t => t.path === path)
    if (existing) {
      activePath.value = path
      return
    }
    tabs.value.push({
      path,
      title: title || path.replace(/\.ad$/, ''),
    })
    activePath.value = path
  }

  function close(path: string) {
    const idx = tabs.value.findIndex(t => t.path === path)
    if (idx === -1) return
    tabs.value.splice(idx, 1)
    if (activePath.value === path) {
      activePath.value = tabs.value[Math.min(idx, tabs.value.length - 1)]?.path || null
    }
  }

  function setDirty(path: string, dirty: boolean) {
    const tab = tabs.value.find(t => t.path === path)
    if (tab) tab.dirty = dirty
  }

  return { tabs, activePath, activeTab, open, close, setDirty }
})
