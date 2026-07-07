export interface WikiLink {
  raw: string
  title: string
  blockId?: string
}

const WIKI_LINK_RE = /\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?\]\]/g

export function parseWikiLinks(text: string): WikiLink[] {
  const links: WikiLink[] = []
  for (const match of text.matchAll(WIKI_LINK_RE)) {
    links.push({
      raw: match[0],
      title: match[1].trim(),
      blockId: match[2]?.trim(),
    })
  }
  return links
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40)
    .replace(/-+$/, '')
}

function encodeBlockId(blockId: string): string {
  // If the blockId contains spaces, treat it as a heading text and slugify it.
  if (/\s/.test(blockId)) {
    return slugify(blockId)
  }
  return encodeURIComponent(blockId)
}

export function transformWikiLinks(
  text: string,
  exists: (title: string) => boolean
): string {
  return text.replace(WIKI_LINK_RE, (_, titleRaw: string, blockIdRaw?: string) => {
    const title = titleRaw.trim()
    const blockId = blockIdRaw?.trim()
    const isDangling = !exists(title)
    const hash = blockId ? `#${encodeBlockId(blockId)}` : ''
    const displayBlockId = blockId ? `#${blockId}` : ''
    const cls = isDangling ? 'wikilink dangling' : 'wikilink'
    return `<a class="${cls}" href="wiki://${encodeURIComponent(title)}${hash}">${title}${displayBlockId}</a>`
  })
}

export function wikiTitleToPath(title: string): string {
  // Keep Chinese / spaces as-is; strip characters that are invalid on common filesystems.
  const safe = title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return `${safe}.ad`
}

export function headingTextToBlockId(text: string): string {
  return slugify(text)
}
