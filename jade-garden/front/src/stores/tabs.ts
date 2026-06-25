import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { readWiki, writeWiki, type WikiDoc } from '@/lib/api'

export interface Tab {
  path: string
  title: string
  body: string
  frontmatter: Record<string, any>
  dirty?: boolean
  loaded?: boolean
  saving?: boolean
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([])
  const activePath = ref<string | null>(null)

  const activeTab = computed(() => tabs.value.find(t => t.path === activePath.value) || null)

  async function open(path: string, title?: string) {
    const existing = tabs.value.find(t => t.path === path)
    if (existing) {
      activePath.value = path
      if (!existing.loaded) await load(path)
      return
    }
    tabs.value.push({
      path,
      title: title || path.replace(/\.ad$/, ''),
      body: '',
      frontmatter: {},
      dirty: false,
      loaded: false,
      saving: false,
    })
    activePath.value = path
    await load(path)
  }

  async function load(path: string) {
    const tab = tabs.value.find(t => t.path === path)
    if (!tab) return
    try {
      const doc: WikiDoc = await readWiki(path)
      tab.body = doc.body
      tab.frontmatter = doc.frontmatter || {}
      tab.title = doc.frontmatter?.title || tab.title
      tab.loaded = true
    } catch (e) {
      tab.loaded = true
      console.error('Failed to load wiki doc', e)
    }
  }

  function close(path: string) {
    const idx = tabs.value.findIndex(t => t.path === path)
    if (idx === -1) return
    const tab = tabs.value[idx]
    if (tab.dirty) {
      const ok = confirm(`Close "${tab.title}" without saving?`)
      if (!ok) return
    }
    tabs.value.splice(idx, 1)
    if (activePath.value === path) {
      activePath.value = tabs.value[Math.min(idx, tabs.value.length - 1)]?.path || null
    }
  }

  function setDirty(path: string, dirty: boolean) {
    const tab = tabs.value.find(t => t.path === path)
    if (tab) tab.dirty = dirty
  }

  function setBody(path: string, body: string) {
    const tab = tabs.value.find(t => t.path === path)
    if (!tab || tab.body === body) return
    tab.body = body
    tab.dirty = true
  }

  async function save(path: string) {
    const tab = tabs.value.find(t => t.path === path)
    if (!tab || !tab.loaded) return
    tab.saving = true
    try {
      const saved = await writeWiki(path, { frontmatter: tab.frontmatter, body: tab.body })
      tab.frontmatter = saved.frontmatter || {}
      tab.dirty = false
    } finally {
      tab.saving = false
    }
  }

  return { tabs, activePath, activeTab, open, close, load, setDirty, setBody, save }
})
