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

export async function writeWiki(_path: string, _doc: any): Promise<any> {
  return null
}

export function rethrow(e: unknown): never {
  throw e
}

export function ensureBlockAnchors(body: string, _originalBody: string): string {
  return body
}

export function recordRecent(_path: string, _title: string): void {}

export function stripExt(path: string, _ext: string): string {
  return path
}

/** Loose mirror of tabs_store_ext.adoptSaveResult (gen-tree
 * typecheck only — see readWikiSafe above for the idiom). */
export function adoptSaveResult(
  _tab: any,
  _sentFm: Record<string, any>,
  _sentBody: string,
  _saved: any,
): void {}

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
  block_id: string | null
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
  children: FileNode[]
}

export interface Backlink {
  source_title: string
  source_path: string
  context: string
}

export interface Outlink {
  target_title: string
  target_path: string | null
  exists: boolean
  block_id: string | null
}

export interface UnlinkedRef {
  page_path: string
  block_uuid: string | null
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
  priority: string | null
  content: string
  scheduled: string | null
  deadline: string | null
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
  type: string
  path: string | null
  title: string | null
  uuid: string | null
  page_path: string | null
  block_id: string | null
  content: string | null
  snippet: string | null
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
  deck: string | null
  ease_factor: number
  repeats: number
  last_interval: number
  next_schedule: string | null
  last_score: number | null
  last_reviewed: string | null
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

// Phase 5.3d (whiteboard_page_ext): the whiteboard persistence API.

export interface WhiteboardShape {
  id: string
  kind: string
  x: number
  y: number
  width: number
  height: number
  label: string
  target: string | null
}

export interface WhiteboardDoc {
  shapes: WhiteboardShape[]
}

export async function readWhiteboard(_path: string): Promise<WhiteboardDoc> {
  return { shapes: [] }
}

export async function writeWhiteboard(
  _path: string,
  doc: WhiteboardDoc,
): Promise<WhiteboardDoc> {
  return doc
}
