// blocks_store_ext.ts — hand-written TS extension for blocks_store.at.
//
// The store codegen emits every external function as an import from
// '@/lib/api'; the Regenerate flow sed-rewrites that import to THIS module
// when copying the composable into front/src/stores/auto/.
//
// plan-022 Phase 5: blockParser.ts 三镜像退役——解析改接引擎 a2ts 产物
// （@autodown/engine/parser，单源 autodown/packages/engine/auto/
// markdown_parser.at），本模块只做 BlockNode 树 → 扁平 ParsedBlock 行
// 模型的视图装配（解析逻辑零本地实现）。
import {
  parse_blocks,
  BlockType,
  anchorOf,
  attrGetInt,
  spansText,
  type BlockNode,
} from '@autodown/engine/parser'

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
  // engine 产物不带行号（BlockNode.source 恒 rng(0,0)）；下游唯一消费者
  // （OutlinePanel 大纲）的跳转走块 id slug，不读行号——恒 0 并登记。
  lineStart: number
  lineEnd: number
  level?: number
}

export interface PageBlocks {
  path: string
  blocks: ParsedBlock[]
  updatedAt: number
}

/** Deep text of a block: own inline text, then children on newlines. */
function deepText(n: BlockNode): string {
  const parts: string[] = []
  const own = spansText(n.inlines)
  if (own) parts.push(own)
  for (const c of n.children) {
    const t = deepText(c)
    if (t) parts.push(t)
  }
  return parts.join('\n')
}

function taskOf(content: string): BlockKind | null {
  if (content.startsWith('[ ] ')) return 'task'
  if (content.startsWith('[x] ') || content.startsWith('[X] ')) return 'task'
  return null
}

/** Flatten the engine block tree into the flat row model the facade and
 *  OutlinePanel consume. Heading fidelity is exact (kind/level/content/
 *  anchor); container kinds map best-effort. */
function flatten(n: BlockNode, out: ParsedBlock[], orderedParent: boolean): void {
  const t = n.kind
  if (t === BlockType.Heading) {
    out.push({
      kind: 'heading',
      content: deepText(n),
      blockId: anchorOf(n) || undefined,
      level: attrGetInt(n.attrs, 'level', 1),
      lineStart: 0,
      lineEnd: 0,
    })
    for (const c of n.children) flatten(c, out, false)
    return
  }
  if (t === BlockType.Fence) {
    out.push({ kind: 'code', content: deepText(n), lineStart: 0, lineEnd: 0 })
    return
  }
  if (t === BlockType.Blockquote) {
    out.push({ kind: 'blockquote', content: deepText(n), lineStart: 0, lineEnd: 0 })
    for (const c of n.children) flatten(c, out, false)
    return
  }
  if (t === BlockType.Callout) {
    out.push({ kind: 'callout', content: deepText(n), lineStart: 0, lineEnd: 0 })
    return
  }
  if (t === BlockType.Details) {
    out.push({ kind: 'details', content: deepText(n), lineStart: 0, lineEnd: 0 })
    return
  }
  if (t === BlockType.ThematicBreak) {
    out.push({ kind: 'hr', content: '', lineStart: 0, lineEnd: 0 })
    return
  }
  if (t === BlockType.ListBlock) {
    const ordered = attrGetInt(n.attrs, 'ordered', 0) !== 0
    for (const c of n.children) flatten(c, out, ordered)
    return
  }
  if (t === BlockType.ListItem) {
    const content = deepText(n)
    out.push({
      kind: taskOf(content) ?? (orderedParent ? 'ordered' : 'bullet'),
      content,
      lineStart: 0,
      lineEnd: 0,
    })
    return
  }
  // Paragraph / Table / Query / embed families: flat paragraph rows.
  const content = deepText(n)
  if (content) out.push({ kind: 'paragraph', content, lineStart: 0, lineEnd: 0 })
  for (const c of n.children) flatten(c, out, false)
}

/** Engine-backed parse: the single source (auto/markdown_parser.at) via its
 *  a2ts emission, flattened for the store's row consumers. */
export function parseBlocks(src: string): ParsedBlock[] {
  const doc = parse_blocks(src, false)
  const out: ParsedBlock[] = []
  for (const c of doc.children) flatten(c, out, false)
  return out
}

/** The original parse(): parse, cache.set with timestamp, return blocks.
 *  Called directly by the facade (msg handlers cannot return values). */
/** cache arrives as the ?str placeholder (typed string | null, really a Map
 *  once the facade assigns it) -- DSL has no Map type annotation. */
export function parseIntoCache(
  cache: Map<string, PageBlocks> | string | null,
  path: string,
  body: string,
): ParsedBlock[] {
  const blocks = parseBlocks(body)
  const liveCache = cache instanceof Map ? cache : null
  liveCache?.set(path, { path, blocks, updatedAt: Date.now() })
  return blocks
}

/** The original clear(): delete one entry, or clear all when path is the
 *  empty-string sentinel (facade maps the optional arg to ""). */
export function cacheClear(cache: Map<string, PageBlocks> | string | null, path: string): void {
  if (!(cache instanceof Map)) {
    return
  }
  if (path === '') {
    cache.clear()
  } else {
    cache.delete(path)
  }
}
