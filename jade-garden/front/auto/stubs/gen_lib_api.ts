// gen_lib_api.ts — gen-project stub for '@/lib/api'.
//
// Mirrored into gen/front/vue/src/lib/api.ts by the Regenerate flow so the
// generated store composable's `import { ... } from '@/lib/api'` type-checks
// inside the self-contained gen project. NEVER SHIPS: the copied composable
// in front/src/stores/auto/ has its import sed-rewritten to
// auto/src/front/utils/tabs_store_ext.ts (the real implementations).

export async function readWikiSafe(_path: string): Promise<any> {
  return null
}

export async function writeWikiSafe(_path: string, _doc: any): Promise<any> {
  return null
}

export function ensureBlockAnchors(body: string, _originalBody: string): string {
  return body
}

export function recordRecent(_path: string, _title: string): void {}

export function stripExt(path: string, _ext: string): string {
  return path
}

export function confirmClose(_title: string): boolean {
  return true
}

export function recordRecentFile(files: any[], _path: string, _title: string): any[] {
  return files
}

export function removeRecentFile(files: any[], _path: string): any[] {
  return files
}

export function clearRecentFiles(): any[] {
  return []
}

export async function getWorkspaceResult(): Promise<any> {
  return { root: null, wiki_dir: null, error: '' }
}

export async function openWorkspaceResult(_path: string): Promise<any> {
  return { root: null, wiki_dir: null, error: '' }
}

export async function getGraphResult(): Promise<any> {
  return { nodes: [], edges: [], error: '' }
}

export function saveGraphSettings(_settings: any): void {}

export async function listFilesResult(): Promise<any> {
  return { files: [], error: '' }
}

export async function createFileRaw(_path: string, _isDir: boolean): Promise<void> {}

export async function duplicateFileRaw(_sourcePath: string, _targetPath: string): Promise<void> {}

export async function renameFileRaw(_oldPath: string, _newPath: string): Promise<void> {}

export async function deleteFileRaw(_path: string): Promise<void> {}

export function toggleExpanded(_expanded: any, _path: string): void {}

export async function loadPluginsResult(): Promise<any> {
  return { plugins: [], error: '' }
}

export function cacheClear(_cache: any, _path: string): void {}
