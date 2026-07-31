// tabs.ts — hand-written facade over the Auto-generated tabs store
// composable (auto/src/front/tabs_store.at → stores/auto/useTabsStore.ts).
//
// Plan 011 Phase 5.1 (Pinia → Auto store pilot): the Pinia defineStore was
// replaced by this facade, which keeps the original store API shape
// (camelCase state, optional args) so all consumers stay unchanged.
//
// Singleton semantics: the generated composable declares its refs at module
// level, so `g` below is instantiated once and shared by every useTabsStore()
// call — identical to the Pinia singleton. State is exposed through getters
// (and a setter for activePath) so property access stays reactive.
import { useTabsStore as useGeneratedTabsStore } from './auto/useTabsStore'

export interface Tab {
  path: string
  title: string
  body: string
  originalBody: string
  frontmatter: Record<string, any>
  dirty?: boolean
  loaded?: boolean
  saving?: boolean
  isGraph?: boolean
  graphCenterPath?: string | null
  graphDepth?: number
  isWhiteboard?: boolean
}

const g = useGeneratedTabsStore()

export function useTabsStore() {
  return {
    get tabs(): Tab[] {
      return g.tabs.value
    },
    get activePath(): string | null {
      return g.active_path.value
    },
    set activePath(v: string | null) {
      g.active_path.value = v
    },
    get activeTab(): Tab | null {
      return g.active_tab ?? null
    },
    open: (path: string, title?: string): Promise<void> => g.Open({ path, title: title ?? '' }),
    openGraph: (centerPath?: string | null, depth = 1): Promise<void> =>
      g.OpenGraph({ center: centerPath ?? '', depth }),
    openWhiteboard: (path: string, title?: string): Promise<void> =>
      g.OpenWhiteboard({ path, title: title ?? '' }),
    close: (path: string): Promise<void> => g.Close(path),
    load: (path: string): Promise<void> => g.Load(path),
    setBody: (path: string, body: string): void => g.SetBody({ path, body }),
    save: (path: string): Promise<void> => g.Save(path),
  }
}
