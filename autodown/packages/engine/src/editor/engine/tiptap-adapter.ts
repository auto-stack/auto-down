// Tiptap chain adapter (plan 018 余量批次) — lets the 30-item slash
// manifest (auto_down_editor_ext.ts getSlashItems) run UNCHANGED on the
// self-built engine: item.command({ editor, range }) receives this adapter
// as `editor`. Covers exactly the API surface the manifest uses:
// chain().focus().{setHeading|setParagraph|setCodeBlock|setMathBlock|
// setMermaidBlock|setCallout|setDetails|setImage|setHorizontalRule|
// toggleBulletList|toggleOrderedList|toggleTaskList|toggleBlockquote|
// insertContent}().run(), plus the storage['slash-command'] handshake.
//
// Block-level only (v1): inline mark chains (bold/italic bubbles) come with
// the inline-mark op extension in Phase 4.

import {
  BlockNode,
  attrSet,
  replaceNode,
  BlockType,
  BlockPos,
  Selection,
  Value,
  blockText,
  findBlock,
  leafBlock,
} from '../../parser/block-model'
import { parse_blocks } from '../../parser/markdown-parser'
import type { EditorEngine } from './editor-engine'

const KIND_COMMANDS: Record<string, BlockType> = {
  setParagraph: BlockType.Paragraph,
  setCodeBlock: BlockType.Fence,
  setMathBlock: BlockType.MathBlock,
  setMermaidBlock: BlockType.Mermaid,
  setCallout: BlockType.Callout,
  setDetails: BlockType.Details,
  setHorizontalRule: BlockType.ThematicBreak,
  toggleBulletList: BlockType.ListItem,
  toggleOrderedList: BlockType.ListItem,
  toggleTaskList: BlockType.ListItem,
  toggleBlockquote: BlockType.Blockquote,
}

export interface ChainLike {
  focus(): ChainLike
  setHeading(opts: { level: number }): ChainLike
  insertContent(content: string): ChainLike
  deleteRange(range: { from: number; to: number }): ChainLike
  insertTable(opts: unknown): ChainLike
  setImage(opts: Record<string, unknown>): ChainLike
  run(): boolean
}

export interface EditorAdapter {
  storage: Record<string, any>
  chain(): ChainLike
  isActive(_name: string, _attrs?: any): boolean
  isEditable: boolean
}

export function createEditorAdapter(engine: EditorEngine): EditorAdapter {
  const adapter: EditorAdapter = {
    storage: { 'slash-command': { query: '', range: null, handled: false } },
    isEditable: true,
    isActive: () => false,
    chain: () => createChain(engine),
  }
  return adapter
}

function createChain(engine: EditorEngine): ChainLike {
  const pending: Array<(tree: BlockNode) => BlockNode> = []
  const chain: ChainLike = {
    focus: () => chain,
    run: () => {
      engine.applyTree((tree) => pending.reduce((t, fn) => fn(t), tree))
      return true
    },
    setHeading: (opts: { level: number }) => {
      pending.push((tree) => setKind(tree, engine, BlockType.Heading, [{ key: 'level', value: Value.Int(opts?.level ?? 1) }]))
      return chain
    },
    insertContent: (content: string) => {
      pending.push((tree) => insertMarkdown(tree, engine, String(content ?? '')))
      return chain
    },
    deleteRange: (range: { from: number; to: number }) => {
      // v1: ranges always live inside the focused block — drop the trailing
      // (to - from) characters (the typed /query)
      pending.push((tree) => {
        const id = currentBlockId(engine)
        const found = findBlock(tree, id)
        if (!found) return tree
        const text = blockText(found)
        const len = Math.max(0, Math.min(range.to - range.from, text.length))
        return replaceNode(tree, id, [leafBlock(id, found.kind, text.slice(0, text.length - len))])
      })
      return chain
    },
    insertTable: (_opts: unknown) => {
      pending.push((tree) => insertMarkdown(tree, engine, '| a | b |\n| --- | --- |\n|  |  |\n|  |  |'))
      return chain
    },
    setImage: (opts: Record<string, unknown>) => {
      const src = String(opts?.src ?? '')
      const alt = String((opts as any)?.alt ?? '')
      pending.push((tree) => insertMarkdown(tree, engine, `![${alt}](${src})`))
      return chain
    },
  }
  const dynamic = chain as any
  for (const [name, kind] of Object.entries(KIND_COMMANDS)) {
    dynamic[name] = () => {
      pending.push((tree) => setKind(tree, engine, kind))
      return chain
    }
  }
  return chain
}

function currentBlockId(engine: EditorEngine): string {
  return engine.selection.anchor.blockId || engine.doc.children[0]?.id || ''
}

function setKind(tree: BlockNode, engine: EditorEngine, kind: BlockType, attrs?: { key: string; value: any }[]): BlockNode {
  const id = currentBlockId(engine)
  const found = findBlock(tree, id)
  if (!found) return tree
  let next: BlockNode = { ...found, kind }
  if (attrs) {
    for (const a of attrs) next = { ...next, attrs: attrSet(next.attrs, a.key, a.value) }
  }
  return replaceNode(tree, id, [next])
}

function insertMarkdown(tree: BlockNode, engine: EditorEngine, md: string): BlockNode {
  // v1: single-block insertion into the current (focused) block; multi-block
  // templates should go through insertTemplate directly.
  const id = currentBlockId(engine)
  const found = findBlock(tree, id)
  if (!found) return tree
  const merged = blockText(found) + md
  return replaceNode(tree, id, [leafBlock(id, found.kind, merged)])
}

// -- slash trigger helper -----------------------------------------------------------

/** Derive the slash query from a host's text + caret: the '/' must sit at
 *  block start or after whitespace, with the query between it and the caret.
 *  Mirrors the Suggestion(char: '/') behavior closely enough for v1. */
export function slashQueryAt(text: string, offset: number): string | null {
  const before = text.slice(0, offset)
  const m = before.match(/(?:^|\s)\/([^\s/]*)$/)
  return m ? m[1] : null
}

/** Dispatch the slash CustomEvents for the current host state (the engine
 *  replacement for Tiptap Suggestion's onStart/onUpdate). */
export function dispatchSlashState(query: string | null, blockId: string, offset: number): void {
  if (query == null) {
    document.dispatchEvent(new CustomEvent('autodown:slash-close', { detail: {} }))
    return
  }
  const detail = {
    query,
    range: { from: offset - query.length - 1, to: offset },
    items: [],
    blockId,
  }
  document.dispatchEvent(new CustomEvent('autodown:slash-open', { detail }))
}

