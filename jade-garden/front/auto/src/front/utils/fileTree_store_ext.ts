// fileTree_store_ext.ts — hand-written TS extension for fileTree_store.at.
//
// The store codegen emits every external function as an import from
// '@/lib/api'; the Regenerate flow sed-rewrites that import to THIS module
// when copying the composable into front/src/stores/auto/.
//
// Two kinds of wrappers, mirroring the original store exactly:
// - listFilesResult: never rejects (the original load() had try/catch —
//   the DSL has none), returns { files, error } with error == "" on success.
// - createFileRaw / duplicateFileRaw / renameFileRaw / deleteFileRaw: the
//   original actions had NO try/catch and propagated rejections to callers,
//   so these re-throw on purpose; the generated handler awaits them and the
//   rejection propagates through the facade to the caller, unchanged.
// Plus toggleExpanded: the DSL has no Set type, so the reactive Set (created
// by the facade) is mutated here in place (Vue 3 tracks Set mutations).
import {
  createFile,
  deleteFile,
  listFiles,
  readWiki,
  renameFile,
  writeWiki,
  type FileNode,
} from '../../../../src/lib/api'

export interface ListFilesResult {
  files: FileNode[]
  error: string
}

/** The original load() body (try/catch/finally), as a result map. */
export async function listFilesResult(): Promise<ListFilesResult> {
  try {
    return { files: await listFiles('', true), error: '' }
  } catch (e: any) {
    return { files: [], error: e.message || String(e) }
  }
}

/** Original createFile action's api call — rejections propagate. */
export async function createFileRaw(path: string, isDir: boolean): Promise<void> {
  await createFile(path, isDir)
}

/** Original duplicateFile action's api calls — rejections propagate. */
export async function duplicateFileRaw(sourcePath: string, targetPath: string): Promise<void> {
  const source = await readWiki(sourcePath)
  await createFile(targetPath, false)
  await writeWiki(targetPath, source)
}

/** Original renameFile action's api call — rejections propagate. */
export async function renameFileRaw(oldPath: string, newPath: string): Promise<void> {
  await renameFile(oldPath, newPath)
}

/** Original deleteFile action's api call — rejections propagate. */
export async function deleteFileRaw(path: string): Promise<void> {
  await deleteFile(path)
}

/** The original toggle(): has/delete/add on the reactive Set. */
/** expanded arrives as the ?str placeholder (typed string | null, really a
 *  Set once the facade assigns it) -- DSL has no Set type annotation. */
export function toggleExpanded(expanded: Set<string> | string | null, path: string): Set<string> {
  const set = expanded instanceof Set ? expanded : new Set<string>()
  if (set.has(path)) {
    set.delete(path)
  } else {
    set.add(path)
  }
  return set
}
