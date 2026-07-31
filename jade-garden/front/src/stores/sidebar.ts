// sidebar.ts — hand-written facade over the Auto-generated sidebar store
// composable (auto/src/front/sidebar_store.at → stores/auto/useSidebarStore.ts).
//
// Plan 011 Phase 5.1 (Pinia → Auto store migration): the Pinia defineStore
// was replaced by this facade, which keeps the original store API shape
// (camelCase writable state) so all consumers stay unchanged.
//
// Singleton semantics: the generated composable declares its refs at module
// level, so `g` below is instantiated once and shared by every
// useSidebarStore() call — identical to the Pinia singleton.
import { useSidebarStore as useGeneratedSidebarStore } from './auto/useSidebarStore'

export type LeftPanel = 'files' | 'search' | 'recent'

const g = useGeneratedSidebarStore()

export function useSidebarStore() {
  return {
    get leftOpen(): boolean {
      return g.left_open.value
    },
    set leftOpen(v: boolean) {
      g.left_open.value = v
    },
    get rightOpen(): boolean {
      return g.right_open.value
    },
    set rightOpen(v: boolean) {
      g.right_open.value = v
    },
    get leftPanel(): LeftPanel {
      return g.left_panel.value
    },
    set leftPanel(v: LeftPanel) {
      g.left_panel.value = v
    },
    get leftWidth(): number {
      return g.left_width.value
    },
    set leftWidth(v: number) {
      g.left_width.value = v
    },
    toggleLeft: (): void => g.ToggleLeft(),
    setLeftPanel: (panel: LeftPanel): void => g.SetLeftPanel(panel),
  }
}
