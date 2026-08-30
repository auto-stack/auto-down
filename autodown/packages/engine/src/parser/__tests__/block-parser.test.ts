// Tests for the strong block-tree output layer
// (auto/markdown_parser.at converter section -> ../markdown-parser.ts).
// Assertions target the typed tree shape (kinds, attrs, ids, inline marks) and
// the IAL pre-step wiring; `parseDocument` itself is covered byte-for-byte by
// the vue parity suite, so here we only assert the observable contract that
// parse_blocks relies on.

import { describe, expect, it } from 'vitest'
import {
  Attr,
  BlockType,
  Mark,
  Value,
  attrGet,
  attrGetBool,
  attrGetInt,
  attrGetStr,
  hasMark,
  spansText,
} from '../block-model'
import { parse_blocks, parseDocument } from '../markdown-parser'
import { serialize } from '../serializer'

describe('parse_blocks tree shape', () => {
  it('returns a doc root with indexed top-level ids', () => {
    const root = parse_blocks('# Title\n\nsome text\n', true)
    expect(root.id).toBe('doc')
    expect(root.kind).toBe(BlockType.Paragraph)
    expect(root.children.map((b) => b.id)).toEqual(['block-0', 'block-1'])
  })

  it('maps headings to Heading kind with a level attr', () => {
    const root = parse_blocks('## Hello **world**\n', true)
    const h = root.children[0]
    expect(h.kind).toBe(BlockType.Heading)
    expect(attrGetInt(h.attrs, 'level', 0)).toBe(2)
    expect(spansText(h.inlines)).toBe('Hello world')
    expect(hasMark(h.inlines[1].marks, Mark.Strong)).toBe(true)
  })

  it('maps fenced code to Fence with language attr and code span', () => {
    const root = parse_blocks('```ts\nconst x = 1\n```\n', true)
    const f = root.children[0]
    expect(f.kind).toBe(BlockType.Fence)
    expect(attrGetStr(f.attrs, 'language', '')).toBe('ts')
    expect(spansText(f.inlines)).toBe('const x = 1\n')
  })

  it('maps thematic breaks', () => {
    const root = parse_blocks('a\n\n---\n\nb\n', true)
    expect(root.children[1].kind).toBe(BlockType.ThematicBreak)
  })

  it('nests blockquote children with hierarchical ids', () => {
    const root = parse_blocks('> quoted\n', true)
    const q = root.children[0]
    expect(q.kind).toBe(BlockType.Blockquote)
    expect(q.children).toHaveLength(1)
    expect(q.children[0].kind).toBe(BlockType.Paragraph)
    expect(q.children[0].id).toBe('block-0-0')
    expect(spansText(q.children[0].inlines)).toBe('quoted')
  })

  it('nests list items with ordered/start attrs and hierarchical ids', () => {
    const root = parse_blocks('3. three\n4. four\n', true)
    const list = root.children[0]
    expect(list.kind).toBe(BlockType.ListBlock)
    expect(attrGetBool(list.attrs, 'ordered', false)).toBe(true)
    expect(attrGetInt(list.attrs, 'start', 0)).toBe(3)
    expect(list.children.map((b) => b.id)).toEqual(['block-0-0', 'block-0-1'])
    for (const item of list.children) {
      expect(item.kind).toBe(BlockType.ListItem)
      expect(item.children[0].kind).toBe(BlockType.Paragraph)
    }
    expect(spansText(list.children[0].children[0].inlines)).toBe('three')
  })
})

describe('parse_blocks inlines', () => {
  it('carries link href/title in span attrs, mark stays a unit enum', () => {
    const root = parse_blocks('see [docs](https://example.com "title") now\n', true)
    const p = root.children[0]
    const link = p.inlines.find((s) => hasMark(s.marks, Mark.Link))
    expect(link).toBeDefined()
    expect(link!.text).toBe('docs')
    expect(attrGetStr(link!.attrs, 'href', '')).toBe('https://example.com')
    expect(attrGetStr(link!.attrs, 'title', '')).toBe('title')
  })

  it('carries image src/alt in span attrs', () => {
    const root = parse_blocks('![pic](img.png)\n', true)
    const img = root.children[0].inlines.find((s) => hasMark(s.marks, Mark.Image))
    expect(img).toBeDefined()
    expect(attrGetStr(img!.attrs, 'src', '')).toBe('img.png')
    expect(attrGetStr(img!.attrs, 'alt', '')).toBe('pic')
  })

  it('converts hardbreaks to newline spans', () => {
    const root = parse_blocks('line one  \nline two\n', true)
    expect(spansText(root.children[0].inlines)).toBe('line one\nline two')
  })
})

describe('parse_blocks tables + IAL', () => {
  const tableDoc = '| a | b |\n| --- | --- |\n| 1 | 2 |\n'

  it('maps header/rows/cells with header and align attrs', () => {
    const root = parse_blocks(tableDoc, true)
    const t = root.children[0]
    expect(t.kind).toBe(BlockType.Table)
    expect(t.children).toHaveLength(2)
    expect(t.children[0].kind).toBe(BlockType.TableRow)
    const headCell = t.children[0].children[0]
    expect(headCell.kind).toBe(BlockType.TableCell)
    expect(attrGetBool(headCell.attrs, 'header', false)).toBe(true)
    const bodyCell = t.children[1].children[0]
    expect(attrGetBool(bodyCell.attrs, 'header', true)).toBe(false)
    expect(spansText(bodyCell.inlines)).toBe('1')
  })

  it('attaches IAL cols/rows to the Table block as an AttrsV attr', () => {
    const root = parse_blocks(tableDoc + '{cols:[120,"auto"], rows:[40,"auto"]}\n', true)
    const t = root.children[0]
    expect(t.kind).toBe(BlockType.Table)
    const ial = attrGet(t.attrs, 'ial')
    expect(ial?._tag).toBe('AttrsV')
    if (ial?._tag !== 'AttrsV') throw new Error('unreachable')
    const cols = ial.value.find((a: Attr) => a.key === 'cols')!.value
    const rows = ial.value.find((a: Attr) => a.key === 'rows')!.value
    expect(cols._tag).toBe('ListV')
    expect(rows._tag).toBe('ListV')
    if (cols._tag !== 'ListV' || rows._tag !== 'ListV') throw new Error('unreachable')
    // int? null (the "auto" entry) maps to Value.Null
    expect(cols.value.map((v: Value) => v._tag)).toEqual(['Int', 'Null'])
    expect(rows.value.map((v: Value) => v._tag)).toEqual(['Int', 'Null'])
    if (cols.value[0]._tag === 'Int') expect(cols.value[0].value).toBe(120)
  })

  it('leaves tables without IAL untouched', () => {
    const root = parse_blocks(tableDoc, true)
    expect(attrGet(root.children[0].attrs, 'ial')).toBeNull()
  })
})

describe('parse_blocks block ids', () => {
  it('lets an explicit ^anchor override the fallback id', () => {
    const root = parse_blocks('first\n\nsecond paragraph ^my-anchor\n', true)
    expect(root.children[0].id).toBe('block-0')
    expect(root.children[1].id).toBe('my-anchor')
  })

  it('ignores anchor-like tokens that fail the charset', () => {
    const root = parse_blocks('text ^not ok\n', true)
    expect(root.children[0].id).toBe('block-0')
  })
})

describe('parseDocument legacy behavior is unchanged', () => {
  it('does not run the IAL pre-step (IAL line stays content)', () => {
    const doc = '| a |\n| --- |\n| 1 |\n{cols:[120]}\n'
    const weak = parseDocument(doc, true)
    // legacy parser sees the IAL line as a paragraph after the table
    expect(weak.map((n) => n.type)).toEqual(['table', 'paragraph'])
    const strong = parse_blocks(doc, true)
    expect(strong.children.map((b) => b.kind)).toEqual([BlockType.Table])
  })
})

describe('nested emphasis delimiters (plan 028 P2T1)', () => {
  const spansOf = (md: string) => parse_blocks(md, true).children[0].inlines

  it('***x*** parses to one span carrying BOTH Strong and Em', () => {
    const spans = spansOf('both ***marks*** now\n')
    const target = spans.find((s) => s.text === 'marks')
    expect(target).toBeDefined()
    expect(hasMark(target!.marks, Mark.Strong)).toBe(true)
    expect(hasMark(target!.marks, Mark.Em)).toBe(true)
  })

  it('**_x_** mixed-delimiter nesting parses to the same double mark', () => {
    const spans = spansOf('a **_deep_** b\n')
    const target = spans.find((s) => s.text === 'deep')
    expect(target).toBeDefined()
    expect(hasMark(target!.marks, Mark.Strong)).toBe(true)
    expect(hasMark(target!.marks, Mark.Em)).toBe(true)
  })

  it('inline code inside the nesting keeps its own span, text keeps both marks', () => {
    const spans = spansOf('***a `b` c***\n')
    expect(spans.map((s) => s.text).join('')).toBe('a b c')
    expect(spans.find((s) => hasMark(s.marks, Mark.Code))?.text).toBe('b')
    for (const s of spans.filter((s) => !hasMark(s.marks, Mark.Code))) {
      expect(hasMark(s.marks, Mark.Strong)).toBe(true)
      expect(hasMark(s.marks, Mark.Em)).toBe(true)
    }
  })

  it('serialize→parse roundtrip loses neither mark (md reload path)', () => {
    const src = 'both ***marks*** and **_deep_**\n'
    const md = serialize(parse_blocks(src, true), true)
    const spans = parse_blocks(md, true).children[0].inlines
    const marks = spans.find((s) => s.text === 'marks')?.marks ?? []
    const deep = spans.find((s) => s.text === 'deep')?.marks ?? []
    expect(hasMark(marks, Mark.Strong) && hasMark(marks, Mark.Em)).toBe(true)
    expect(hasMark(deep, Mark.Strong) && hasMark(deep, Mark.Em)).toBe(true)
  })

  it('unclosed triples stay literal (no phantom nesting)', () => {
    const spans = spansOf('a *** b\n')
    expect(spansText(spans)).toBe('a *** b')
    expect(spans.some((s) => hasMark(s.marks, Mark.Strong) || hasMark(s.marks, Mark.Em))).toBe(false)
  })
})
