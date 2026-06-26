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

export async function createWikiPage(title: string): Promise<string> {
  const path = `${title.replace(/[\\/:*?"<>|]/g, '-').trim()}.ad`
  await createFile(path, false)
  return path
}
