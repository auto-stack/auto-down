// Wire types are GENERATED from the backend contract source
// back/auto/api.at (Plan 022 Phase 1) — change shapes there, run
// `node gen.mjs` in back/auto, and never edit lib/api_gen.ts.
// Hand-written in this file: the fetch layer, the generic links envelope
// (LinksResponse<T> — both /api/backlinks and /api/outlinks share the
// { title, links } envelope), and the front-local GraphSettings (a view
// model, not a wire shape; kept here so the Auto-generated GraphView
// widget's `import type { GraphSettings } from '@/lib/api'` resolves in
// both the front tree and the gen project, plan 011 Phase 5.3b).
import type {
  AgendaResponse,
  Backlink,
  BlockResponse,
  CardReviewRequest,
  CardReviewResponse,
  CardsResponse,
  FileNode,
  GraphData,
  ImportResult,
  Outlink,
  QueryResponse,
  SearchResponse,
  TasksResponse,
  UnlinkedRefsResponse,
  UploadAssetResponse,
  WhiteboardDoc,
  WikiDoc,
  WorkspaceInfo,
} from './api_gen'

export type {
  AgendaGroup,
  AgendaResponse,
  ApiError,
  Backlink,
  BlockInfo,
  BlockResponse,
  Card,
  CardsResponse,
  FileNode,
  GraphData,
  GraphEdge,
  GraphNode,
  ImportResult,
  Outlink,
  QueryResponse,
  SearchResponse,
  SearchResult,
  SyncStatus,
  TaskItem,
  TasksResponse,
  UnlinkedRef,
  UnlinkedRefsResponse,
  WhiteboardDoc,
  WhiteboardShape,
  WikiDoc,
  WorkspaceInfo,
} from './api_gen'

/** Generic envelope shared by /api/backlinks and /api/outlinks
 * (contract section "links" in back/auto/api.at). */
export interface LinksResponse<T> {
  title: string
  links: T[]
}

/** Graph view settings. Defined here (next to GraphNode/GraphEdge) so the
 * Auto-generated GraphView widget's `settings: GraphSettings` prop resolves
 * its `import type { GraphSettings } from '@/lib/api'` in both the front
 * tree and the gen project (plan 011 Phase 5.3b); graph_store_ext re-exports
 * it for the store facade and pre-existing consumers. */
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

/** Error bodies are JSON `{"error": "..."}` (contract type ApiError); fall
 * back to raw text for anything else. */
async function errorMessage(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    if (data && typeof data.error === 'string') return data.error
  } catch {
    // plain-text body — use it verbatim
  }
  return text || `HTTP ${res.status}`
}

export async function getWorkspace(): Promise<WorkspaceInfo> {
  const res = await fetch('/api/workspace')
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function openWorkspace(root: string): Promise<WorkspaceInfo> {
  const res = await fetch('/api/workspace/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ root }),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function listFiles(path = '', recursive = true): Promise<FileNode[]> {
  const params = new URLSearchParams({ path, recursive: recursive ? 'true' : 'false' })
  const res = await fetch(`/api/files?${params}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function createFile(path: string, isDir = false): Promise<FileNode> {
  const res = await fetch('/api/files/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, is_dir: isDir }),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function renameFile(oldPath: string, newPath: string): Promise<void> {
  const res = await fetch('/api/files/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_path: oldPath, new_path: newPath }),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
}

export async function deleteFile(path: string): Promise<void> {
  const res = await fetch('/api/files/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
}

export async function readWiki(path: string): Promise<WikiDoc> {
  const res = await fetch(`/api/wiki/${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function writeWiki(path: string, doc: WikiDoc): Promise<WikiDoc> {
  const res = await fetch(`/api/wiki/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function getGraph(): Promise<GraphData> {
  const res = await fetch('/api/graph')
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function getBacklinks(title: string): Promise<LinksResponse<Backlink>> {
  const res = await fetch(`/api/backlinks/${encodeURIComponent(title)}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function getOutlinks(title: string): Promise<LinksResponse<Outlink>> {
  const res = await fetch(`/api/outlinks/${encodeURIComponent(title)}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function search(query: string, limit = 20): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const res = await fetch(`/api/search?${params}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function searchPages(query: string, limit = 20): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const res = await fetch(`/api/search/pages?${params}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function searchBlocks(query: string, limit = 20): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const res = await fetch(`/api/search/blocks?${params}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function getUnlinkedRefs(title: string): Promise<UnlinkedRefsResponse> {
  const res = await fetch(`/api/unlinked/${encodeURIComponent(title)}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function getBlock(id: string): Promise<BlockResponse> {
  const res = await fetch(`/api/blocks/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
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
  if (!res.ok) throw new Error(await errorMessage(res))
  const data: UploadAssetResponse = await res.json()
  return data.path
}

export async function getTasks(): Promise<TasksResponse> {
  const res = await fetch('/api/tasks')
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function getAgenda(days = 14): Promise<AgendaResponse> {
  const params = new URLSearchParams({ days: String(days) })
  const res = await fetch(`/api/agenda?${params}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function runQuery(q: string): Promise<QueryResponse> {
  const params = new URLSearchParams({ q })
  const res = await fetch(`/api/query?${params}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function getDueCards(limit = 50): Promise<CardsResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  const res = await fetch(`/api/cards/due?${params}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function reviewCard(pagePath: string, blockId: string, grade: number): Promise<CardReviewResponse> {
  const body: CardReviewRequest = { page_path: pagePath, block_id: blockId, grade }
  const res = await fetch('/api/cards/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function exportMarkdown(): Promise<Blob> {
  const res = await fetch('/api/export/markdown')
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.blob()
}


export async function importMarkdown(zipFile: File): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('archive', zipFile)
  const res = await fetch('/api/import/markdown', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function readWhiteboard(path: string): Promise<WhiteboardDoc> {
  const res = await fetch(`/api/whiteboard/${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

export async function writeWhiteboard(path: string, doc: WhiteboardDoc): Promise<WhiteboardDoc> {
  const res = await fetch(`/api/whiteboard/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}
