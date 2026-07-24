import type { FileNode } from './api'

export interface TemplateContext {
  currentPageTitle?: string | null
  now?: Date
}

export interface TemplateInfo {
  name: string
  path: string
}

export function findTemplates(nodes: FileNode[]): TemplateInfo[] {
  const templates: TemplateInfo[] = []

  function walk(list: FileNode[]) {
    for (const node of list) {
      if (node.is_dir && node.children) {
        if (node.name.toLowerCase() === 'templates' || node.path.toLowerCase() === 'templates') {
          for (const child of node.children) {
            if (!child.is_dir && child.path.toLowerCase().endsWith('.ad')) {
              templates.push({
                name: child.name.replace(/\.ad$/i, ''),
                path: child.path,
              })
            }
          }
        }
        walk(node.children)
      }
    }
  }

  walk(nodes)
  return templates
}

function formatDate(date: Date, format: string): string {
  const tokens: Record<string, string> = {
    yyyy: String(date.getFullYear()),
    yy: String(date.getFullYear()).slice(-2),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    dd: String(date.getDate()).padStart(2, '0'),
    HH: String(date.getHours()).padStart(2, '0'),
    mm: String(date.getMinutes()).padStart(2, '0'),
    ss: String(date.getSeconds()).padStart(2, '0'),
  }
  const pattern = new RegExp(Object.keys(tokens).sort((a, b) => b.length - a.length).join('|'), 'g')
  return format.replace(pattern, (match) => tokens[match] ?? match)
}

export function stripFrontmatter(body: string): string {
  const trimmed = body.trimStart()
  if (!trimmed.startsWith('---\n')) return body
  const end = trimmed.indexOf('\n---', 4)
  if (end === -1) return body
  const after = trimmed.slice(end + 4)
  return after.replace(/^\n+/, '')
}

export function expandTemplate(body: string, context: TemplateContext = {}): string {
  const now = context.now ?? new Date()
  const today = formatDate(now, 'yyyy_MM_dd')
  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(now.getDate() - 1)
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(now.getDate() + 1)

  const currentPage = context.currentPageTitle?.trim() || 'Untitled'

  return body.replace(/<%\s*(\w+)\s*(?:\|\|([^%]*))?%>/g, (_match, key, fallback) => {
    const defaultValue = fallback?.trim() ?? ''
    switch (key.trim()) {
      case 'today':
        return `[[${today}]]`
      case 'yesterday':
        return `[[${formatDate(yesterdayDate, 'yyyy_MM_dd')}]]`
      case 'tomorrow':
        return `[[${formatDate(tomorrowDate, 'yyyy_MM_dd')}]]`
      case 'time':
        return formatDate(now, 'HH:mm')
      case 'date':
        return formatDate(now, 'yyyy-MM-dd')
      case 'current page':
      case 'current_page':
      case 'page':
        return `[[${currentPage}]]`
      default:
        return defaultValue
    }
  })
}
