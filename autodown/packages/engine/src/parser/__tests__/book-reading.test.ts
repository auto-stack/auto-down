import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  locateBookSelection,
  locateBookTarget,
  parseBookChapter,
  projectBookChapter,
  serializeBookChapter,
} from '../../parser'

const fixture = (id: string, extension: string) => readFileSync(
  new URL(`./fixtures/book-reading/${id}.${extension}`, import.meta.url), 'utf8',
)

describe('autodown-reading/1', () => {
  it.each([
    ['shiji-062', 6],
    ['lunyu-001', 16],
    ['tangshi-001', 1],
    ['tangshi-250', 5],
    ['shiji-016', 1],
    ['shiji-043', 0],
  ])('preserves the reference Markdown and card count for %s', (id, count) => {
    const source = fixture(id, 'ad')
    const chapter = parseBookChapter(source, id, true)
    expect(chapter.markdown).toBe(fixture(id, 'md'))
    expect(chapter.diagnostics).toEqual([])
    expect(chapter.cards).toHaveLength(count)
    expect(serializeBookChapter(chapter)).toBe(source)
  })

  it('resolves five shared-paragraph cards and reports the third card selection in the full paragraph', () => {
    const chapter = parseBookChapter(fixture('lunyu-001', 'ad'), 'lunyu-001', true)
    const card = projectBookChapter(chapter, 'lunyu-001-s003')!
    const span = locateBookTarget(chapter, chapter.cards[2].firstId)!
    const paragraph = chapter.blocks.find(block => block.id === span.paragraphId)!
    expect(card.title).toBe('巧言令色')
    expect(card.markdown).toBe('子曰：“巧言令色，鲜矣仁！”')
    expect(chapter.cards.slice(0, 5).map(c => locateBookTarget(chapter, c.firstId)?.paragraphId))
      .toEqual(Array(5).fill(paragraph.id))
    expect(locateBookSelection(chapter, card, paragraph, 4, 8)).toMatchObject({
      cardId: card.cardId, paragraphId: paragraph.id, targetId: span.id, text: '巧言令色',
    })
  })

  it('targets the second paragraph of a cross-paragraph card after revising its source', () => {
    const source = fixture('shiji-062', 'ad')
    const original = parseBookChapter(source, 'shiji-062', true)
    const revised = parseBookChapter('前插段。 ^new\n\n' + source.replace('越石父贤', '越石父甚贤'),
      'shiji-062', true)
    const pick = (c: typeof original) => projectBookChapter(c, 'shiji-062-s004')!
    const originalText = pick(original).markdown
    expect(originalText).toContain('\n\n')
    expect(pick(revised).markdown).toBe(originalText.replace('越石父贤', '越石父甚贤'))
    const [first, second] = original.blocks.filter(b => b.kind === 'paragraph'
      && b.start >= pick(original).start && b.end <= pick(original).end)
    expect(first.id).not.toBe(second.id)
    const secondTarget = locateBookTarget(revised, second.id)!
    expect(revised.markdown.slice(secondTarget.start, secondTarget.end)).toContain('延入为上客')
  })

  it('preserves code, lists, quotes, spacing, and permits scoped cards across a horizontal rule', () => {
    const literal = [
      '~~~', '::card code title', '[x]{^code}', '~~~', '',
      '    ::card indent title', '', '> ::card quote title', '',
      '- ::card list title', '', '\\::card escape title', '',
      'Literal `[x]{^code}` and \\[x]{^literal}.', '',
    ].join('\n')
    const source = literal + '\n::card live Study\n\n[**繁𠮷**]{^line} ^p\n\n---\n\n乙 ^q\n'
    const chapter = parseBookChapter(source.replace(/\n/g, '\r\n'), 'example', true)
    expect(chapter.diagnostics).toEqual([])
    expect(chapter.cards.map(card => card.id)).toEqual(['live'])
    expect(chapter.markdown.startsWith(literal)).toBe(true)
    expect(projectBookChapter(chapter, 'live')?.markdown).toBe('**繁𠮷**\n\n---\n\n乙')
    const span = locateBookTarget(chapter, 'line')!
    expect(chapter.markdown.slice(span.start, span.end)).toBe('**繁𠮷**')
    expect(serializeBookChapter(chapter)).toBe(source.replace(/\n/g, '\r\n'))
  })

  it('defers missing endpoints and locates duplicate, reversed, invalid, and empty declarations', () => {
    const source = '# 章 ^c\n\n甲 ^a\n\n乙 ^b\n\n::card ^reverse ^b..^a 倒序\n::card ^pending ^z 引用\n::card invalid\n::card empty 空\n\n## 结束\n\n丙 ^a\n'
    const final = parseBookChapter(source, '', true)
    expect(final.diagnostics.map(({ code, chapterId, line, targetId }) => [code, chapterId, line, targetId]))
      .toEqual(expect.arrayContaining([
        ['invalid-card', 'c', 9, 'invalid'],
        ['unknown-target', 'c', 8, 'z'],
        ['reversed-or-overlapping-range', 'c', 7, 'reverse'],
        ['empty-card', 'c', 10, 'empty'],
        ['duplicate-id', 'c', 3, 'a'],
      ].filter(row => row[0] !== 'reversed-or-overlapping-range')))
    expect(locateBookTarget(final, 'a')).toBeNull()
    expect(projectBookChapter(final, 'pending')).toBeNull()
    expect(parseBookChapter(source, '', false).diagnostics.map(d => d.code)).not.toContain('unknown-target')
    const reversed = parseBookChapter(source.replace('丙 ^a', '丙 ^other'), '', true)
    expect(reversed.diagnostics).toContainEqual(expect.objectContaining({
      code: 'reversed-or-overlapping-range', line: 7, targetId: 'reverse',
    }))
  })

  it('diagnoses anchors nested inside another anchor, emphasis or a link, and accepts complete formatting', () => {
    const source = [
      '[[甲]{^inner}乙]{^outer} ^p1',
      '**[甲]{^inside}** ^p2',
      '[前[甲]{^link}后](https://example.org) ^p3',
      '[**整段**]{^complete} ^p4',
    ].join('\n\n')
    const chapter = parseBookChapter(source, 'chapter', true)
    expect(chapter.diagnostics.map(d => [d.code, d.targetId])).toEqual([
      ['invalid-span-nesting', 'inner'], ['invalid-span-nesting', 'outer'],
      ['invalid-span-nesting', 'inside'], ['invalid-span-nesting', 'link'],
    ])
    expect(chapter.markdown).toContain('**整段**')
    expect(locateBookTarget(chapter, 'complete')).toMatchObject({ kind: 'span', paragraphId: 'p4' })
  })
})
