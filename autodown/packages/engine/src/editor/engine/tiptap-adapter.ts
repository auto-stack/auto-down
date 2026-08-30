// Tiptap chain adapter (plan 018 余量批次) — lets the 30-item slash
// manifest (auto_down_editor_ext.ts getSlashItems) run UNCHANGED on the
// self-built engine: item.command({ editor, range }) receives this adapter
// as `editor`. Covers exactly the API surface the manifest uses:
// chain().focus().{setHeading|setParagraph|setCodeBlock|setMathBlock|
// setMermaidBlock|setCallout|setDetails|setImage|setHorizontalRule|
// toggleBulletList|toggleOrderedList|toggleTaskList|toggleBlockquote|
// insertContent}().run(), plus the storage['slash-command'] handshake and
// the __engine back-reference (engine-native manifest readers, plan 021
// Phase 2).
//
// Block-level only (v1): inline mark chains (bold/italic bubbles) come with
// the inline-mark op extension in Phase 4.

import {
  withChildren,
  BlockNode,
  attrSet,
  replaceNode,
  BlockType,
  BlockPos,
  Mark,
  Selection,
  Value,
  blockText,
  findBlock,
  hasMark,
  leafBlock,
} from '../../parser/block-model'
import { parse_blocks } from '../../parser/markdown-parser'

import { ref } from 'vue'
import type { EditorEngine } from './editor-engine'
import { marksInRange } from './commands'
import { domSetLink, domToggleMark } from './dom-marks'

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

/** tiptap mark names → engine Marks (plan 024 P3T1). Underline has no Mark
 *  representation — the bubble button is clipped at the .at source. */
const MARK_BY_NAME: Record<string, Mark> = {
  bold: Mark.Strong,
  strong: Mark.Strong,
  italic: Mark.Em,
  em: Mark.Em,
  strike: Mark.Del,
  strikethrough: Mark.Del,
  code: Mark.Code,
  link: Mark.Link,
}

export interface ChainLike {
  focus(): ChainLike
  setHeading(opts: { level: number }): ChainLike
  insertContent(content: string): ChainLike
  deleteRange(range: { from: number; to: number }): ChainLike
  insertTable(opts: unknown): ChainLike
  setImage(opts: Record<string, unknown>): ChainLike
  /** Inline mark toggles (plan 024 P3T1): wrap the focused host's live DOM;
   *  the model catches up on the blur writeback. No-op without a host. */
  toggleBold(): ChainLike
  toggleItalic(): ChainLike
  toggleStrike(): ChainLike
  toggleCode(): ChainLike
  toggleUnderline(): ChainLike
  setLink(opts: { href: string }): ChainLike
  unsetLink(): ChainLike
  run(): boolean
}

/** tiptap-shaped event callback (the mounted chrome subscribes with
 *  `editor.on('selectionUpdate', cb)` — payload unused by the widgets). */
export type AdapterListener = () => void

export interface EditorAdapter {
  storage: Record<string, any>
  chain(): ChainLike
  isActive(_name: string, _attrs?: any): boolean
  isEditable: boolean
  /** Event surface (plan 026 P0T1): 'selectionUpdate' subscribers are
   *  notified when an engine change moves the selection. Optional on the
   *  frozen interface — createEditorAdapter always sets it. */
  on?(event: string, cb: AdapterListener): void
  off?(event: string, cb: AdapterListener): void
  /** The wrapped session — engine-native readers (slash-manifest's
   *  getCurrentBlockAnchor / ensureBlockAnchor) reach the model through it.
   *  Optional: createEditorAdapter always sets it, but the interface is on
   *  the 1.0.0 frozen surface (plan 020 Phase 4) — a required field would
   *  break external implementors. */
  __engine?: EditorEngine
}

function sameSelection(a: Selection, b: Selection): boolean {
  return a.anchor.blockId === b.anchor.blockId && a.anchor.offset === b.anchor.offset && a.head.blockId === b.head.blockId && a.head.offset === b.head.offset
}

export function createEditorAdapter(engine: EditorEngine): EditorAdapter {
  // Reactive tick read inside isActive: consumers that evaluate isActive in
  // a Vue computed (the bubble's buttons) re-evaluate on every engine change
  // — the engine itself is not Vue-reactive (plan 024 P3T2).
  const selectionTick = ref(0)
  // Event-bus subscriptions (plan 026 P0T1): the mounted chrome (TableMenu)
  // subscribes by name; dispatch is gated on the selection actually moving.
  const listeners = new Map<string, Set<AdapterListener>>()
  let lastSel: Selection = engine.selection
  const dispatch = (event: string): void => {
    const subs = listeners.get(event)
    if (!subs) return
    for (const cb of [...subs]) cb()
  }
  engine.onChange((change) => {
    selectionTick.value++
    if (!sameSelection(change.selection, lastSel)) {
      lastSel = change.selection
      dispatch('selectionUpdate')
    }
  })
  const adapter: EditorAdapter = {
    storage: { 'slash-command': { query: '', range: null, handled: false } },
    isEditable: true,
    on: (event: string, cb: AdapterListener) => {
      let subs = listeners.get(event)
      if (!subs) {
        subs = new Set()
        listeners.set(event, subs)
      }
      subs.add(cb)
    },
    off: (event: string, cb: AdapterListener) => {
      listeners.get(event)?.delete(cb)
    },
    isActive: (name: string) => {
      void selectionTick.value
      const m = MARK_BY_NAME[name]
      if (m == null) return false
      return hasMark(marksInRange(engine, engine.selection), m)
    },
    chain: () => createChain(engine),
    __engine: engine,
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
      const md = String(content ?? '')
      pending.push((tree) => {
        if (!md.includes('\n')) return insertMarkdown(tree, engine, md)
        // multiline template: parse to blocks, insert after the current one
        const parsed = parse_blocks(md, true)
        const kids = parsed.children
        if (kids.length === 0) return tree
        const id = currentBlockId(engine)
        const found = findBlock(tree, id)
        if (!found) return tree
        const siblings = tree.children
        const idx = siblings.findIndex((c) => c.id === id)
        const emptied = blockText(found) === '' ? [] : [found]
        const next = [...siblings.slice(0, idx), ...emptied, ...kids, ...siblings.slice(idx + 1)]
        return withChildren(tree, next)
      })
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
    // inline mark toggles (plan 024 P3T1): wrap the FOCUSED host's live DOM —
    // the model catches up on the blur writeback. No focused host → no-op.
    toggleBold: () => {
      domToggleMark('strong')
      return chain
    },
    toggleItalic: () => {
      domToggleMark('em')
      return chain
    },
    toggleStrike: () => {
      domToggleMark('del')
      return chain
    },
    toggleCode: () => {
      domToggleMark('code')
      return chain
    },
    // underline has no Mark (button clipped at the .at source); tolerate
    // the call from a stale bubble until the regen lands
    toggleUnderline: () => chain,
    setLink: (opts: { href: string }) => {
      domSetLink(String(opts?.href ?? ''))
      return chain
    },
    unsetLink: () => {
      domSetLink(null)
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

