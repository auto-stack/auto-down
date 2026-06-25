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
