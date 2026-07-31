// plugins.ts — hand-written facade over the Auto-generated plugins store
// composable (auto/src/front/plugins_store.at →
// stores/auto/usePluginsStore.ts).
//
// Plan 011 Phase 5.1 (Pinia → Auto store migration): the Pinia defineStore
// was replaced by this facade, which keeps the original store API shape
// so all consumers stay unchanged.
import { usePluginsStore as useGeneratedPluginsStore } from './auto/usePluginsStore'
import { type PluginManifest } from '../../auto/src/front/utils/plugins_store_ext'

export type { PluginManifest }

const g = useGeneratedPluginsStore()

export function usePluginsStore() {
  return {
    get plugins(): PluginManifest[] {
      return g.plugins.value
    },
    set plugins(v: PluginManifest[]) {
      g.plugins.value = v
    },
    get loading(): boolean {
      return g.loading.value
    },
    set loading(v: boolean) {
      g.loading.value = v
    },
    get error(): string | null {
      return g.error.value
    },
    set error(v: string | null) {
      g.error.value = v
    },
    load: (): Promise<void> => g.Load(),
  }
}
