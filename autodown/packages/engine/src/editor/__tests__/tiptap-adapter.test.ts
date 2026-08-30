// Tiptap chain adapter tests (plan 018 余量批次): the slash manifest's
// chain API runs unchanged against the engine; the slash trigger helper
// derives the Suggestion-compatible query.

import { describe, expect, it } from 'vitest'
import {
  BlockNode,
  BlockType,
  Mark,
  Selection,
  block,
  blockText,
  collapsedSel,
  findBlock,
  leafBlock,
  pos,
  span,
  spanWith,
  withChildren,
  withInlines,
} from '../../parser/block-model'
import { serialize } from '../../parser/serializer'
import { EditorEngine } from '../engine/editor-engine'
import { createEditorAdapter, slashQueryAt } from '../engine/tiptap-adapter'

function doc(...kids: BlockNode[]): BlockNode {
  return withChildren(block('doc', BlockType.Paragraph), kids)
}

describe('tiptap chain adapter', () => {
  it('setHeading sets kind + level attr in one run()', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'x')), collapsedSel('p1', 0))
    const adapter = createEditorAdapter(e)
    adapter.chain().focus().setHeading({ level: 2 }).run()
    const found = findBlock(e.doc, 'p1') as any
    expect(found.kind).toBe(BlockType.Heading)
    expect(found.attrs.some((a: any) => a.key === 'level' && a.value.value === 2)).toBe(true)
    // one undo step
    e.undo()
    expect(findBlock(e.doc, 'p1')!.kind).toBe(BlockType.Paragraph)
  })

  it('toggle commands map to block kinds', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'x')), collapsedSel('p1', 0))
    const adapter = createEditorAdapter(e)
    const c: any = adapter.chain()
    c.focus().toggleBlockquote().run()
    expect(findBlock(e.doc, 'p1')!.kind).toBe(BlockType.Blockquote)
    c.focus().setCodeBlock().run()
    expect(findBlock(e.doc, 'p1')!.kind).toBe(BlockType.Fence)
    c.focus().setHorizontalRule().run()
    expect(findBlock(e.doc, 'p1')!.kind).toBe(BlockType.ThematicBreak)
  })

  it('insertContent appends markdown text into the focused block', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'a')), collapsedSel('p1', 0))
    const adapter = createEditorAdapter(e)
    adapter.chain().focus().insertContent('b').run()
    expect(blockText(findBlock(e.doc, 'p1')!)).toBe('ab')
  })

  it('setImage inserts an image markdown', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, '')), collapsedSel('p1', 0))
    const adapter = createEditorAdapter(e)
    adapter.chain().focus().setImage({ src: 'u.png', alt: 'alt' }).run()
    expect(blockText(findBlock(e.doc, 'p1')!)).toBe('![alt](u.png)')
  })

  it('storage carries the slash-command handshake shape', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, '')), collapsedSel('p1', 0))
    const adapter = createEditorAdapter(e)
    expect(adapter.storage['slash-command']).toMatchObject({ query: '', handled: false })
  })

  it('carries __engine so engine-native manifest readers reach the session (plan 021 Phase 2)', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'x')), collapsedSel('p1', 0))
    const adapter = createEditorAdapter(e)
    // optional field on the frozen interface; the factory always sets it
    expect(adapter.__engine).toBeDefined()
    expect(adapter.__engine!.selection.anchor.blockId).toBe('p1')
  })
})

describe('slashQueryAt (Suggestion-compatible trigger)', () => {
  it('finds the query after a block-start slash', () => {
    expect(slashQueryAt('/he', 3)).toBe('he')
    expect(slashQueryAt('/', 1)).toBe('')
  })

  it('requires start-of-block or whitespace before the slash', () => {
    expect(slashQueryAt('a/he', 4)).toBeNull()
    expect(slashQueryAt('a /he', 5)).toBe('he')
  })

  it('no slash, no query', () => {
    expect(slashQueryAt('hello', 5)).toBeNull()
  })
})

// -- event bus + selectionUpdate dispatch (plan 026 P0T1) ------------------------

describe('adapter event bus', () => {
  it("dispatches 'selectionUpdate' when the engine selection changes", () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'x')), collapsedSel('p1', 0))
    const adapter = createEditorAdapter(e)
    const seen: number[] = []
    adapter.on('selectionUpdate', () => seen.push(1))
    e.select(collapsedSel('p1', 1))
    expect(seen.length).toBe(1)
    e.select(new Selection(pos('p1', 0), pos('p1', 1)))
    expect(seen.length).toBe(2)
  })

  it('does not dispatch when the same selection is re-set (change gating)', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'x')), collapsedSel('p1', 0))
    const adapter = createEditorAdapter(e)
    const seen: number[] = []
    adapter.on('selectionUpdate', () => seen.push(1))
    e.select(collapsedSel('p1', 0)) // same anchor+head — no dispatch
    expect(seen.length).toBe(0)
  })

  it('does not dispatch for selection-neutral changes (streaming append)', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'x')), collapsedSel('p1', 0))
    const adapter = createEditorAdapter(e)
    const seen: number[] = []
    adapter.on('selectionUpdate', () => seen.push(1))
    e.appendBlocks([leafBlock('p2', BlockType.Paragraph, 'streamed')])
    expect(seen.length).toBe(0)
  })

  it("off() removes the subscription", () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'x')), collapsedSel('p1', 0))
    const adapter = createEditorAdapter(e)
    const seen: number[] = []
    const cb = () => seen.push(1)
    adapter.on('selectionUpdate', cb)
    adapter.off('selectionUpdate', cb)
    e.select(collapsedSel('p1', 1))
    expect(seen.length).toBe(0)
  })

  it('undo/redo selection restores still dispatch (selection moved back)', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'x')), collapsedSel('p1', 0))
    const adapter = createEditorAdapter(e)
    const seen: number[] = []
    adapter.on('selectionUpdate', () => seen.push(1))
    e.select(collapsedSel('p1', 1))
    e.select(collapsedSel('p1', 0)) // back to the initial position — still a change vs p1:1
    expect(seen.length).toBe(2)
  })
})

// -- mark chain + isActive (plan 024 P3T1) --------------------------------------

describe('adapter mark surface', () => {
  function markedEngine() {
    const spans = [span('a'), spanWith('b', [Mark.Strong], []), spanWith('c', [Mark.Em], [])]
    const e = new EditorEngine(doc(withInlines(leafBlock('p1', BlockType.Paragraph, ''), spans)), collapsedSel('p1', 0))
    return e
  }

  it('isActive reads the selection marks from the engine', () => {
    const e = markedEngine()
    const adapter = createEditorAdapter(e)
    e.select(new Selection(pos('p1', 1), pos('p1', 2)))
    expect(adapter.isActive('bold')).toBe(true)
    expect(adapter.isActive('italic')).toBe(false)
    e.select(new Selection(pos('p1', 2), pos('p1', 3)))
    expect(adapter.isActive('italic')).toBe(true)
    expect(adapter.isActive('bold')).toBe(false)
    // caret inside the bold run reads the enclosing span
    e.select(collapsedSel('p1', 1))
    expect(adapter.isActive('bold')).toBe(true)
  })

  it('isActive is false for unknown/unsupported names (underline)', () => {
    const e = markedEngine()
    const adapter = createEditorAdapter(e)
    expect(adapter.isActive('underline')).toBe(false)
    expect(adapter.isActive('heading')).toBe(false)
    expect(adapter.isActive('image')).toBe(false)
  })

  it('mark chain methods exist and run without a focused host (no-op)', () => {
    const e = markedEngine()
    const adapter = createEditorAdapter(e)
    const c: any = adapter.chain()
    expect(c.focus().toggleBold().run()).toBe(true)
    expect(c.focus().toggleItalic().run()).toBe(true)
    expect(c.focus().toggleStrike().run()).toBe(true)
    expect(c.focus().toggleCode().run()).toBe(true)
    expect(c.focus().toggleUnderline().run()).toBe(true)
    // DOM wrap never happened — model untouched
    expect(serialize(e.doc, false)).toContain('a**b***c*')
  })

  it('setLink/unsetLink chain methods run without a host (no-op safe)', () => {
    const e = markedEngine()
    const adapter = createEditorAdapter(e)
    const c: any = adapter.chain()
    expect(c.focus().setLink({ href: 'https://x' }).run()).toBe(true)
    expect(c.focus().unsetLink().run()).toBe(true)
  })
})
