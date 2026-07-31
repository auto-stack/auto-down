// recentFiles.ts — hand-written facade over the Auto-generated recentFiles
// store composable (auto/src/front/recentFiles_store.at →
// stores/auto/useRecentFilesStore.ts).
//
// Plan 011 Phase 5.1 (Pinia → Auto store migration): the Pinia defineStore
// was replaced by this facade, which keeps the original store API shape
// so all consumers stay unchanged.
//
// The real initial value (localStorage load) is assigned below; the
// generated composable's handlers are async but the ext functions they
// await are synchronous, so the original sync signatures are preserved.
import { useRecentFilesStore as useGeneratedRecentFilesStore } from './auto/useRecentFilesStore'
import { loadRecentFiles, type RecentFile } from '../../auto/src/front/utils/recentFiles_store_ext'

export type { RecentFile }

const g = useGeneratedRecentFilesStore()

// Real initial value (the .at model only carries a placeholder).
g.files.value = loadRecentFiles()

export function useRecentFilesStore() {
  return {
    get files(): RecentFile[] {
      return g.files.value
    },
    set files(v: RecentFile[]) {
      g.files.value = v
    },
    record: (path: string, title: string): void => {
      g.Record({ path, title })
    },
    remove: (path: string): void => {
      g.Remove(path)
    },
    clear: (): void => {
      g.Clear()
    },
  }
}
