// BlockHostController tests (plan 018 Phase 2) — the contenteditable host
// protocol, headless: input diffing, Enter/Backspace block ops, composition
// delegation, and the input-rule hook after each input.

import { describe, expect, it } from 'vitest'
import {
  Attr,
  BlockNode,
  BlockType,
  Mark,
  Value,
  attrGetStr,
  block,
  blockText,
  collapsedSel,
  findBlock,
  leafBlock,
  span,
  spanWith,
  withChildren,
  withInlines,
} from '../../parser/block-model'
import { serialize } from '../../parser/serializer'
import { EditorEngine } from '../engine/editor-engine'
import { BlockHostController, isEditableLeaf } from '../engine/host-controller'
import { richTreeToSpans } from '../engine/rich-html'

function doc(...kids: BlockNode[]): BlockNode {
  return withChildren(block('doc', BlockType.Paragraph), kids)
}

describe('BlockHostController', () => {
  it('input diffs old→new into one engine op', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'ad')), collapsedSel('p1', 0))
    const c = new BlockHostController(e, 'p1')
    const op = c.onInput('abcd')
    expect(op!._tag).toBe('InsertText')
    expect(blockText(findBlock(e.doc, 'p1')!)).toBe('abcd')
  })

  it('input completing a marker fires the input rule (heading, level attr included)', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, '')), collapsedSel('p1', 0))
    const c = new BlockHostController(e, 'p1')
    c.onInput('# ') // typing '#' then ' ' arrives here as two inputs normally
    const found = findBlock(e.doc, 'p1') as any
    expect(found.kind).toBe(BlockType.Heading)
    expect(blockText(found)).toBe('')
    expect(found.attrs.some((a: any) => a.key === 'level')).toBe(true)
    // the whole interaction is ONE undo step (marker ops + attr patch)
    e.undo()
    expect(findBlock(e.doc, 'p1')!.kind).toBe(BlockType.Paragraph)
    expect(blockText(findBlock(e.doc, 'p1')!)).toBe('# ')
  })

  it('Enter splits via the engine and backspace-at-start merges with the sibling', () => {
    const e = new EditorEngine(
      doc(leafBlock('p1', BlockType.Paragraph, 'ab'), leafBlock('p2', BlockType.Paragraph, 'cd')),
      collapsedSel('p2', 0)
    )
    const c1 = new BlockHostController(e, 'p1')
    c1.onEnter(1, 'p3')
    expect(e.doc.children.map((c) => blockText(c))).toEqual(['a', 'b', 'cd'])
    const c3 = new BlockHostController(e, 'p3')
    expect(c3.onBackspaceAtStart('p1')).toBe(true)
    expect(e.doc.children.map((c) => blockText(c))).toEqual(['ab', 'cd'])
  })

  it('composition: preedit inputs are ignored, commit lands once', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, '')), collapsedSel('p1', 0))
    const c = new BlockHostController(e, 'p1')
    c.compositionBegin('', 0)
    expect(c.onInput('中')).toBeNull() // preedit never enters the op stack
    c.compositionUpdate('中文')
    const op = c.compositionCommit('中文')
    expect(op!._tag).toBe('InsertText')
    expect(blockText(findBlock(e.doc, 'p1')!)).toBe('中文')
    expect(c.text).toBe('中文')
  })
})

// -- parent-chain dispatch (plan 025 P1T3) --------------------------------------

function ul(id: string, ...items: BlockNode[]): BlockNode {
  return withChildren(block(id, BlockType.ListBlock), items)
}

function li(id: string, ...kids: BlockNode[]): BlockNode {
  return withChildren(block(id, BlockType.ListItem), kids)
}

function quote(id: string, ...kids: BlockNode[]): BlockNode {
  return withChildren(block(id, BlockType.Blockquote), kids)
}

describe('BlockHostController — nested container dispatch', () => {
  it('Enter inside a list item splits the item (not a bare paragraph)', () => {
    const e = new EditorEngine(
      doc(ul('l1', li('i1', leafBlock('p1', BlockType.Paragraph, 'one two')))),
      collapsedSel('p1', 4)
    )
    const c = new BlockHostController(e, 'p1')
    c.onEnter(4, 'b-xx')
    const list = findBlock(e.doc, 'l1')!
    expect(list.children).toHaveLength(2)
    expect(list.children.every((it) => it.kind === BlockType.ListItem)).toBe(true)
    expect(blockText(list.children[0].children[0])).toBe('one ')
    expect(blockText(list.children[1].children[0])).toBe('two')
    expect(serialize(e.doc, false)).toBe('- one \n- two\n')
  })

  it('Backspace at an item start merges into the previous item', () => {
    const e = new EditorEngine(
      doc(ul('l1', li('i1', leafBlock('p1', BlockType.Paragraph, 'one ')), li('i2', leafBlock('p2', BlockType.Paragraph, 'two')))),
      collapsedSel('p2', 0)
    )
    const c = new BlockHostController(e, 'p2')
    expect(c.onBackspaceAtStart('p1')).toBe(true)
    expect(findBlock(e.doc, 'l1')!.children).toHaveLength(1)
    expect(blockText(findBlock(e.doc, 'l1')!.children[0].children[0])).toBe('one two')
  })

  it('Tab/Shift+Tab indent and outdent the focused item', () => {
    const e = new EditorEngine(
      doc(ul('l1', li('i1', leafBlock('p1', BlockType.Paragraph, 'one')), li('i2', leafBlock('p2', BlockType.Paragraph, 'two')))),
      collapsedSel('p2', 0)
    )
    const c = new BlockHostController(e, 'p2')
    expect(c.onTab(false)).toBe(true)
    expect(serialize(e.doc, false)).toBe('- one\n  - two\n')
    expect(c.onTab(true)).toBe(true)
    expect(serialize(e.doc, false)).toBe('- one\n- two\n')
  })

  it('Tab outside a list is a pass-through (no command, no history)', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'x')), collapsedSel('p1', 0))
    const c = new BlockHostController(e, 'p1')
    expect(c.onTab(false)).toBe(false)
    expect(c.onTab(true)).toBe(false)
    expect(e.canUndo).toBe(false)
  })

  it('Enter inside a quote continues the quote; empty paragraph exits', () => {
    const e = new EditorEngine(doc(quote('q1', leafBlock('p1', BlockType.Paragraph, 'one'))), collapsedSel('p1', 3))
    const c = new BlockHostController(e, 'p1')
    c.onEnter(3, 'b-xx')
    const q = findBlock(e.doc, 'q1')!
    expect(q.kind).toBe(BlockType.Blockquote)
    expect(q.children).toHaveLength(2)
    expect(serialize(e.doc, false)).toBe('> one\n>\n>\n')

    const c2 = new BlockHostController(e, q.children[1].id)
    c2.onEnter(0, 'b-yy') // empty quote paragraph → exit
    expect(e.doc.children.map((n) => n.kind)).toEqual([BlockType.Blockquote, BlockType.Paragraph])
  })

  it('backspace never merges into a container sibling (leaf-only guard)', () => {
    const e = new EditorEngine(
      doc(quote('q1', ul('l1', li('i1', leafBlock('p1', BlockType.Paragraph, 'one'))), leafBlock('p2', BlockType.Paragraph, 'two'))),
      collapsedSel('p2', 0)
    )
    const c = new BlockHostController(e, 'p2')
    // the previous DOM sibling is the list subtree — not a mergeable leaf
    expect(c.onBackspaceAtStart('l1')).toBe(false)
    expect(findBlock(e.doc, 'l1')).toBeTruthy()
    expect(blockText(findBlock(e.doc, 'p2')!)).toBe('two')
  })
})

describe('isEditableLeaf', () => {
  it('leaf text blocks are editable; containers and thematic breaks are not', () => {
    expect(isEditableLeaf(leafBlock('p', BlockType.Paragraph, 'x'))).toBe(true)
    expect(isEditableLeaf(leafBlock('h', BlockType.ThematicBreak, ''))).toBe(false)
    expect(isEditableLeaf(withChildren(block('q', BlockType.Blockquote), [leafBlock('i', BlockType.Paragraph, '')]))).toBe(false)
  })
})

// -- rich blur writeback (plan 024 P2T2) ---------------------------------------

describe('richTreeToSpans (DOM walk, injected node description)', () => {
  it('collects nested marks with the text runs and merges neighbors', () => {
    const tree = { tag: 'div', children: [
      { text: 'a' },
      { tag: 'strong', children: [{ text: 'b' }, { text: 'c' }] },
      { tag: 'em', children: [{ tag: 'strong', children: [{ text: 'd' }] }] },
    ] }
    const spans = richTreeToSpans(tree)
    expect(spans.map((s) => s.text)).toEqual(['a', 'bc', 'd'])
    expect(spans[1].marks).toContain(Mark.Strong)
    expect(spans[2].marks).toEqual(expect.arrayContaining([Mark.Em, Mark.Strong]))
  })

  it('reads link href/title attrs into the span attrs', () => {
    const tree = { tag: 'div', children: [
      { tag: 'a', attrs: { href: 'https://x', title: 't' }, children: [{ text: 'go' }] },
    ] }
    const spans = richTreeToSpans(tree)
    expect(spans[0].marks).toContain(Mark.Link)
    expect(attrGetStr(spans[0].attrs, 'href', '')).toBe('https://x')
    expect(attrGetStr(spans[0].attrs, 'title', '')).toBe('t')
  })

  it('ignores structure-only elements (br) and drops empty runs', () => {
    const tree = { tag: 'div', children: [{ tag: 'br', children: [] }, { text: '' }, { text: 'x' }] }
    const spans = richTreeToSpans(tree)
    expect(spans).toHaveLength(1)
    expect(spans[0].text).toBe('x')
  })
})

describe('BlockHostController rich blur commit', () => {
  it('commitRichSpans rewrites the whole block as one undo step', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'abc')), collapsedSel('p1', 0))
    const c = new BlockHostController(e, 'p1')
    const changed = c.commitRichSpans([span('a'), spanWith('b', [Mark.Strong], []), span('c')])
    expect(changed).toBe(true)
    expect(serialize(e.doc, false)).toContain('a**b**c')
    expect(c.text).toBe('abc')
    e.undo()
    expect(serialize(e.doc, false)).toBe('abc\n')
    expect(e.canUndo).toBe(false)
  })

  it('commitRichSpans is a no-op when nothing changed', () => {
    const e = new EditorEngine(doc(leafBlock('p1', BlockType.Paragraph, 'ab')), collapsedSel('p1', 0))
    const c = new BlockHostController(e, 'p1')
    expect(c.commitRichSpans([span('ab')])).toBe(false)
    expect(e.canUndo).toBe(false)
  })

  it('skips blocks carrying Image marks (v1: no data-loss rewrite)', () => {
    const img = spanWith('alt', [Mark.Image], [new Attr('src', Value.Str('s.png'))])
    const e = new EditorEngine(withInlines(leafBlock('p1', BlockType.Paragraph, ''), [img]), collapsedSel('p1', 0))
    const c = new BlockHostController(e, 'p1')
    expect(c.commitRichSpans([span('alt')])).toBe(false)
    expect(findBlock(e.doc, 'p1')!.inlines[0].marks).toContain(Mark.Image)
  })
})
