// fileTree.ts — hand-written facade over the Auto-generated fileTree store
// composable (auto/src/front/fileTree_store.at →
// stores/auto/useFileTreeStore.ts).
//
// Plan 011 Phase 5.1 (Pinia → Auto store migration): the Pinia defineStore
// was replaced by this facade, which keeps the original store API shape
// (default arg on createFile, camelCase state) so all consumers stay
// unchanged. Error propagation is unchanged: the raw ext wrappers reject
// like the original api calls, and the rejection travels through the
// generated handler to the caller.
import { useFileTreeStore as useGeneratedFileTreeStore } from './auto/useFileTreeStore'
import type { FileNode } from '@/lib/api'

const g = useGeneratedFileTreeStore()

// Real initial value (the .at model only carries a placeholder; the DSL
// has no Set type).
g.expanded.value = new Set<string>()

export function useFileTreeStore() {
  return {
    get files(): FileNode[] {
      return g.files.value
    },
    set files(v: FileNode[]) {
      g.files.value = v
    },
    get expanded(): Set<string> {
      return g.expanded.value
    },
    set expanded(v: Set<string>) {
      g.expanded.value = v
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
    toggle: (path: string): void => {
      g.Toggle(path)
    },
    createFile: (path: string, isDir = false): Promise<void> => g.CreateFile({ path, isDir }),
    duplicateFile: (sourcePath: string, targetPath: string): Promise<void> =>
      g.DuplicateFile({ sourcePath, targetPath }),
    renameFile: (oldPath: string, newPath: string): Promise<void> =>
      g.RenameFile({ oldPath, newPath }),
    deleteFile: (path: string): Promise<void> => g.DeleteFile(path),
  }
}
