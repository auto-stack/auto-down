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

export function transformWikiLinks(
  text: string,
  exists: (title: string) => boolean
): string {
  return text.replace(WIKI_LINK_RE, (_, titleRaw: string, blockIdRaw?: string) => {
    const title = titleRaw.trim()
    const blockId = blockIdRaw?.trim()
    const isDangling = !exists(title)
    const hash = blockId ? `#${encodeURIComponent(blockId)}` : ''
    const cls = isDangling ? 'wikilink dangling' : 'wikilink'
    return `<a class="${cls}" href="wiki://${encodeURIComponent(title)}${hash}">${title}${blockId ? `#${blockId}` : ''}</a>`
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
