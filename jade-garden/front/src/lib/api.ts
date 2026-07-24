export interface FileNode {
  name: string
  path: string
  is_dir: boolean
  children?: FileNode[]
}

export interface WikiDoc {
  frontmatter: Record<string, any>
  body: string
}

export interface WorkspaceInfo {
  root: string | null
  wiki_dir: string | null
}

export async function getWorkspace(): Promise<WorkspaceInfo> {
  const res = await fetch('/api/workspace')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function openWorkspace(root: string): Promise<WorkspaceInfo> {
  const res = await fetch('/api/workspace/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ root }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listFiles(path = '', recursive = true): Promise<FileNode[]> {
  const params = new URLSearchParams({ path, recursive: recursive ? 'true' : 'false' })
  const res = await fetch(`/api/files?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createFile(path: string, isDir = false): Promise<FileNode> {
  const res = await fetch('/api/files/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, is_dir: isDir }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function renameFile(oldPath: string, newPath: string): Promise<void> {
  const res = await fetch('/api/files/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_path: oldPath, new_path: newPath }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function deleteFile(path: string): Promise<void> {
  const res = await fetch('/api/files/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function readWiki(path: string): Promise<WikiDoc> {
  const res = await fetch(`/api/wiki/${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function writeWiki(path: string, doc: WikiDoc): Promise<WikiDoc> {
  const res = await fetch(`/api/wiki/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
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

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface LinksResponse<T> {
  title: string
  links: T[]
}

export async function getGraph(): Promise<GraphData> {
  const res = await fetch('/api/graph')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getBacklinks(title: string): Promise<LinksResponse<Backlink>> {
  const res = await fetch(`/api/backlinks/${encodeURIComponent(title)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getOutlinks(title: string): Promise<LinksResponse<Outlink>> {
  const res = await fetch(`/api/outlinks/${encodeURIComponent(title)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
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

export async function search(query: string, limit = 20): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const res = await fetch(`/api/search?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function searchPages(query: string, limit = 20): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const res = await fetch(`/api/search/pages?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function searchBlocks(query: string, limit = 20): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const res = await fetch(`/api/search/blocks?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export interface UnlinkedRef {
  page_path: string
  block_uuid?: string
  context: string
  matched_text: string
}

export interface UnlinkedRefsResponse {
  title: string
  refs: UnlinkedRef[]
}

export async function getUnlinkedRefs(title: string): Promise<UnlinkedRefsResponse> {
  const res = await fetch(`/api/unlinked/${encodeURIComponent(title)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getBlock(id: string): Promise<{ found: boolean; block?: BlockInfo }> {
  const res = await fetch(`/api/blocks/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export interface BlockInfo {
  uuid: string
  page_path: string
  block_id?: string
  kind: string
  content: string
  properties: Record<string, any>
  line_start: number
  line_end: number
}

export async function createWikiPage(title: string): Promise<string> {
  const path = `${title.replace(/[\\/:*?"<>|]/g, '-').trim()}.ad`
  await createFile(path, false)
  return path
}

export async function uploadAsset(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/assets/upload', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.path as string
}

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

export interface TasksResponse {
  tasks: TaskItem[]
}

export async function getTasks(): Promise<TasksResponse> {
  const res = await fetch('/api/tasks')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export interface AgendaGroup {
  date: string
  tasks: TaskItem[]
}

export interface AgendaResponse {
  groups: AgendaGroup[]
}

export async function getAgenda(days = 14): Promise<AgendaResponse> {
  const params = new URLSearchParams({ days: String(days) })
  const res = await fetch(`/api/agenda?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export interface QueryResponse {
  results: TaskItem[]
}

export async function runQuery(q: string): Promise<QueryResponse> {
  const params = new URLSearchParams({ q })
  const res = await fetch(`/api/query?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

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

export async function getDueCards(limit = 50): Promise<CardsResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  const res = await fetch(`/api/cards/due?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function reviewCard(pagePath: string, blockId: string, grade: number): Promise<{ card: Card }> {
  const res = await fetch('/api/cards/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_path: pagePath, block_id: blockId, grade }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
