// workspace.ts — hand-written facade over the Auto-generated workspace
// store composable (auto/src/front/workspace_store.at →
// stores/auto/useWorkspaceStore.ts).
//
// Plan 011 Phase 5.1 (Pinia → Auto store migration): the Pinia defineStore
// was replaced by this facade, which keeps the original store API shape
// so all consumers stay unchanged.
//
// Behavior note: the original open() re-threw after setting error; the DSL
// has no try/catch, so the facade replicates that by throwing when the
// handler left a non-empty error (no caller inspects the error object —
// WorkspaceOpener only displays workspace.error).
import { useWorkspaceStore as useGeneratedWorkspaceStore } from './auto/useWorkspaceStore'

const g = useGeneratedWorkspaceStore()

export function useWorkspaceStore() {
  return {
    get root(): string | null {
      return g.root.value
    },
    set root(v: string | null) {
      g.root.value = v
    },
    get wikiDir(): string | null {
      return g.wiki_dir.value
    },
    set wikiDir(v: string | null) {
      g.wiki_dir.value = v
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
    open: async (path: string): Promise<void> => {
      await g.Open(path)
      if (g.error.value) throw new Error(g.error.value)
    },
  }
}
