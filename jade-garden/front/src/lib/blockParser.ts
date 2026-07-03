export type BlockKind =
  | 'heading'
  | 'paragraph'
  | 'bullet'
  | 'ordered'
  | 'task'
  | 'code'
  | 'blockquote'
  | 'callout'
  | 'details'
  | 'hr'

export interface ParsedBlock {
  uuid?: string
  blockId?: string
  kind: BlockKind
  content: string
  lineStart: number
  lineEnd: number
  level?: number
}

const ANCHOR_SUFFIX_RE = /\s+\^([a-zA-Z0-9_-]+)\s*$/

function extractAnchor(content: string): { content: string; blockId?: string } {
  const trimmed = content.trimEnd()
  const match = ANCHOR_SUFFIX_RE.exec(trimmed)
  if (!match) return { content: trimmed }
  return {
    content: trimmed.slice(0, trimmed.length - match[0].length).trimEnd(),
    blockId: match[1],
  }
}

function isBlockStart(line: string): boolean {
  const trimmed = line.trimStart()
  return (
    trimmed.startsWith('#') ||
    /^\s*(- \[ \]|- \[x\]|- \[X\]|- |\d+\.\s)/.test(line) ||
    trimmed.startsWith('>') ||
    trimmed.startsWith('```') ||
    trimmed.startsWith(':::') ||
    /^(---|\*\*\*|___)$/.test(trimmed)
  )
}

function parseHeading(line: string, lineIdx: number): ParsedBlock | undefined {
  const trimmed = line.trimStart()
  const match = trimmed.match(/^(#{1,6})\s+(.*)$/)
  if (!match) return undefined
  const { content, blockId } = extractAnchor(match[2])
  return {
    kind: 'heading',
    content,
    blockId,
    level: match[1].length,
    lineStart: lineIdx,
    lineEnd: lineIdx + 1,
  }
}

function parseListItem(line: string, lineIdx: number): ParsedBlock | undefined {
  const trimmed = line.trimStart()
  let kind: BlockKind | undefined
  let prefixLen = 0
  if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
    kind = 'task'
    prefixLen = '- [ ] '.length
  } else if (trimmed.startsWith('- ')) {
    kind = 'bullet'
    prefixLen = '- '.length
  } else {
    const ordered = trimmed.match(/^(\d+)\.\s/)
    if (ordered) {
      kind = 'ordered'
      prefixLen = ordered[0].length
    }
  }
  if (!kind) return undefined
  const { content, blockId } = extractAnchor(trimmed.slice(prefixLen))
  return {
    kind,
    content,
    blockId,
    lineStart: lineIdx,
    lineEnd: lineIdx + 1,
  }
}

function parseFenced(lines: string[], start: number, opener: string): { block: ParsedBlock; next: number } {
  let end = start + 1
  while (end < lines.length && !lines[end].trimStart().startsWith(opener)) {
    end += 1
  }
  if (end < lines.length) end += 1
  return {
    block: {
      kind: opener === '```' ? 'code' : 'callout',
      content: lines.slice(start, end).join('\n'),
      lineStart: start,
      lineEnd: end,
    },
    next: end,
  }
}

function parseBlockquote(lines: string[], start: number): { block: ParsedBlock; next: number } {
  let end = start
  while (end < lines.length && lines[end].trimStart().startsWith('>')) {
    end += 1
  }
  const content = lines
    .slice(start, end)
    .map((l) => l.trimStart().replace(/^>[ \t]?/, ''))
    .join('\n')
  const { content: stripped, blockId } = extractAnchor(content)
  return {
    block: {
      kind: 'blockquote',
      content: stripped,
      blockId,
      lineStart: start,
      lineEnd: end,
    },
    next: end,
  }
}

function parseParagraph(lines: string[], start: number): { block: ParsedBlock; next: number } {
  let end = start
  while (
    end < lines.length &&
    lines[end].trim() !== '' &&
    !isBlockStart(lines[end])
  ) {
    end += 1
  }
  const content = lines.slice(start, end).join('\n')
  const { content: stripped, blockId } = extractAnchor(content)
  return {
    block: {
      kind: 'paragraph',
      content: stripped,
      blockId,
      lineStart: start,
      lineEnd: end,
    },
    next: end,
  }
}

export function parseBlocks(body: string): ParsedBlock[] {
  const lines = body.split('\n')
  const blocks: ParsedBlock[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trimStart()

    if (trimmed.startsWith('```')) {
      const { block, next } = parseFenced(lines, i, '```')
      blocks.push(block)
      i = next
      continue
    }

    if (trimmed.startsWith(':::')) {
      const kind = trimmed.startsWith(':::details') || trimmed.startsWith('::: details') ? 'details' : 'callout'
      const { block, next } = parseFenced(lines, i, ':::')
      blocks.push({ ...block, kind })
      i = next
      continue
    }

    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      blocks.push({ kind: 'hr', content: line, lineStart: i, lineEnd: i + 1 })
      i += 1
      continue
    }

    const heading = parseHeading(line, i)
    if (heading) {
      blocks.push(heading)
      i += 1
      continue
    }

    const listItem = parseListItem(line, i)
    if (listItem) {
      blocks.push(listItem)
      i += 1
      continue
    }

    if (trimmed.startsWith('>')) {
      const { block, next } = parseBlockquote(lines, i)
      blocks.push(block)
      i = next
      continue
    }

    if (trimmed === '') {
      i += 1
      continue
    }

    const { block, next } = parseParagraph(lines, i)
    blocks.push(block)
    i = next
  }
  return blocks
}

export function findBlockAtLine(blocks: ParsedBlock[], lineIdx: number): ParsedBlock | undefined {
  return blocks.find((b) => b.lineStart <= lineIdx && lineIdx < b.lineEnd)
}

export function findBlockById(blocks: ParsedBlock[], id: string): ParsedBlock | undefined {
  return blocks.find((b) => b.blockId === id)
}

const ANCHORABLE_KINDS = new Set<BlockKind>([
  'heading',
  'paragraph',
  'bullet',
  'ordered',
  'task',
  'blockquote',
])

function generateBlockId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `b${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Append persistent `^id` anchors to every anchor-able block that does not already have one.
 *  When `previousBody` is supplied, ids for blocks whose kind+content are unchanged are
 *  reused; otherwise a new id is generated. */
export function ensureBlockAnchors(body: string, previousBody?: string): string {
  const lines = body.split('\n')
  const blocks = parseBlocks(body)
  const previousBlocks = previousBody ? parseBlocks(previousBody) : []
  const idByContent = new Map<string, string>()
  for (const pb of previousBlocks) {
    if (!pb.blockId) continue
    idByContent.set(`${pb.kind}:${pb.content}`, pb.blockId)
  }
  for (const block of blocks) {
    if (block.blockId || !ANCHORABLE_KINDS.has(block.kind)) continue
    const key = `${block.kind}:${block.content}`
    const id = idByContent.get(key) || generateBlockId()
    const idx = Math.min(block.lineEnd - 1, lines.length - 1)
    lines[idx] = `${lines[idx]} ^${id}`
  }
  return lines.join('\n')
}

/** Remove all `^id` anchors from the Markdown text.
 *  Useful for comparing editor state independent of auto-generated anchors. */
export function stripBlockAnchors(body: string): string {
  const lines = body.split('\n')
  const blocks = parseBlocks(body)
  for (const block of blocks) {
    if (!block.blockId) continue
    const idx = Math.min(block.lineEnd - 1, lines.length - 1)
    lines[idx] = lines[idx].replace(
      new RegExp(`\\s+\\^${escapeRegExp(block.blockId)}\\s*$`),
      ''
    )
  }
  return lines.join('\n')
}
