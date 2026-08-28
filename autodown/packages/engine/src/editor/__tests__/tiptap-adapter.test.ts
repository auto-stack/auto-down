// Tiptap chain adapter tests (plan 018 余量批次): the slash manifest's
// chain API runs unchanged against the engine; the slash trigger helper
// derives the Suggestion-compatible query.

import { describe, expect, it } from 'vitest'
import {
  BlockNode,
  BlockType,
  block,
  blockText,
  collapsedSel,
  findBlock,
  leafBlock,
  withChildren,
} from '../../parser/block-model'
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
