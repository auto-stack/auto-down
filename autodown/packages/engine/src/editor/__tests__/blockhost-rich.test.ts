// Rich BlockHost tests (plan 024 Phase 2): focused text leaf blocks render
// their InlineSpan marks as inline elements (mount-time v-html from
// spansToHtml); the blur walk is pinned in host-controller tests.

import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { BlockType, attrSet, Value } from '../../parser/block-model'
import { parse_blocks } from '../../parser/markdown-parser'
import { EditorEngine } from '../engine/editor-engine'
import { BlockHostController } from '../engine/host-controller'
import { spansToHtml } from '../engine/rich-html'
import BlockHost from '../components/BlockHost.vue'

describe('spansToHtml (pure)', () => {
  it('maps the five inline marks to elements, nested marks nest', async () => {
    const { spans } = await richSpans('**b** *i* ~~d~~ `c` [l](https://x)')
    const html = spansToHtml(spans)
    expect(html).toContain('<strong>b</strong>')
    expect(html).toContain('<em>i</em>')
    expect(html).toContain('<del>d</del>')
    expect(html).toContain('<code>c</code>')
    expect(html).toContain('href="https://x"')
  })

  it('renders Underline as <u> (plan 028 P2T2)', async () => {
    const { spans } = await richSpans('__u__ and ___ue___')
    const html = spansToHtml(spans)
    expect(html).toContain('<u>u</u>')
    expect(html).toContain('<u><em>ue</em></u>')
  })

  it('renders anchors uneditable (contenteditable=false) and click-proof', async () => {
    const { spans } = await richSpans('[l](https://x)')
    const html = spansToHtml(spans)
    expect(html).toContain('contenteditable="false"')
  })

  it('escapes text and attribute payloads', async () => {
    const { spans } = await richSpans('a < b & c')
    const html = spansToHtml(spans)
    expect(html).toContain('a &lt; b &amp; c')
    expect(html).not.toContain('< b')
  })
})

describe('BlockHost.vue rich SSR', () => {
  it('renders strong/em/a elements for a focused marked-up paragraph', async () => {
    const md = '**bold** plain *em* and [link](https://example.com)'
    const doc = parse_blocks(md, true)
    const engine = new EditorEngine(doc)
    const first = doc.children[0]
    const controller = new BlockHostController(engine, first.id)
    const app = createSSRApp({
      render: () => h(BlockHost as any, { controller, blockKind: BlockType[first.kind] }),
    })
    const html = (await renderToString(app)).replace(/<!--.*?-->/g, '')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>em</em>')
    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain('contenteditable="false"')
    expect(html).toContain('data-block-id')
  })
})

async function richSpans(md: string): Promise<{ spans: import('../../parser/block-model').InlineSpan[] }> {
  const doc = parse_blocks(md, true)
  return { spans: doc.children[0].inlines }
}
