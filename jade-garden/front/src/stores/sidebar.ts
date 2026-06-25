import { defineStore } from 'pinia'
import { ref } from 'vue'

export type LeftPanel = 'files' | 'search' | 'recent'

export const useSidebarStore = defineStore('sidebar', () => {
  const leftOpen = ref(true)
  const rightOpen = ref(false)
  const leftPanel = ref<LeftPanel>('files')
  const leftWidth = ref(260)

  function toggleLeft() {
    leftOpen.value = !leftOpen.value
  }

  function setLeftPanel(panel: LeftPanel) {
    leftPanel.value = panel
    leftOpen.value = true
  }

  return { leftOpen, rightOpen, leftPanel, leftWidth, toggleLeft, setLeftPanel }
})
