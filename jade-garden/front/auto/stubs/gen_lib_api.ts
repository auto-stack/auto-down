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

// Phase 5.3b: graph widget prop/extension types (mirror front/src/lib/api.ts).
export interface GraphNode {
  id: string
  label: string
  path: string
  exists: boolean
  degree: number
}

export interface GraphEdge {
  source: string
  target: string
  block_id?: string
}

export interface GraphSettings {
  showOrphans: boolean
  showMissing: boolean
  nodeSize: number
  textOpacity: number
  edgeWidth: number
  showArrows: boolean
  gravity: number
  repulsion: number
  attraction: number
  linkLength: number
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

// --- Phase 5.1 widget panel additions (types + link/page API) ---

// Phase 5.3a: FileTreeNode widget prop type (mirrors front/src/lib/api.ts).
export interface FileNode {
  name: string
  path: string
  is_dir: boolean
  children?: FileNode[]
}

export interface Backlink {
  source_title: string
  source_path: string
  context: string
}

export interface Outlink {
  target_title: string
  target_path?: string
  exists: boolean
  block_id?: string
}

export interface UnlinkedRef {
  page_path: string
  block_uuid?: string
  context: string
  matched_text: string
}

export async function getBacklinks(_title: string): Promise<any> {
  return { links: [] }
}

export async function getOutlinks(_title: string): Promise<any> {
  return { links: [] }
}

export async function getUnlinkedRefs(_title: string): Promise<any> {
  return { title: '', refs: [] }
}

export async function createWikiPage(_title: string): Promise<string> {
  return ''
}

// --- Phase 5.1 batch 2 additions (agenda + search) ---

export interface TaskItem {
  page_path: string
  title: string
  line: number
  raw: string
  marker: string
  priority?: string
  content: string
  scheduled?: string
  deadline?: string
}

export interface AgendaGroup {
  date: string
  tasks: TaskItem[]
}

export interface AgendaResponse {
  groups: AgendaGroup[]
}

export async function getAgenda(_days = 14): Promise<AgendaResponse> {
  return { groups: [] }
}

export interface SearchResult {
  type: 'Page' | 'Block'
  path?: string
  title?: string
  uuid?: string
  page_path?: string
  block_id?: string
  content?: string
  snippet?: string | null
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
}

export async function search(_query: string, _limit = 20): Promise<SearchResponse> {
  return { query: '', results: [] }
}

// Batch 4 (flashcard_modal_ext): the SRS card API the extension re-exports.

export interface Card {
  page_path: string
  block_id: string
  uuid: string
  raw: string
  question: string
  answer: string
  deck?: string
  ease_factor: number
  repeats: number
  last_interval: number
  next_schedule?: string
  last_score?: number
  last_reviewed?: string
}

export interface CardsResponse {
  cards: Card[]
}

export async function getDueCards(_limit = 50): Promise<CardsResponse> {
  return { cards: [] }
}

export async function reviewCard(
  _pagePath: string,
  _blockId: string,
  _grade: number,
): Promise<{ card: Card | null }> {
  return { card: null }
}

// Batch 4 (command_palette_ext): the workspace import/export API.

export async function exportMarkdown(): Promise<Blob> {
  return new Blob()
}

export async function importMarkdown(_zipFile: File): Promise<{ imported: number }> {
  return { imported: 0 }
}

// Phase 5.3c (editor_tab_ext): the editor shell's data props + the
// dangling-link create flow.

export async function getBlock(_id: string): Promise<any> {
  return { found: false }
}

export async function readWiki(_path: string): Promise<any> {
  return { path: '', body: '', frontmatter: {} }
}

export async function uploadAsset(_file: File): Promise<string> {
  return ''
}

export async function runQuery(_q: string): Promise<any> {
  return { results: [] }
}
