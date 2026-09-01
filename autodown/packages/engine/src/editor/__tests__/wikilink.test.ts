// Editor-side wikilink interaction (plan 020 Phase 3) — [[title]] /
// [[title#block]] in the editor's PREVIEW blocks. The parser keeps wikilinks
// as plain text (WikilinkBlock exists only for serializer round-trips), so
// the editor decorates its preview render: wikilink text splits into
// clickable .autodown-wikilink-label spans that emit open-wiki-link with
// (title, blockId). Code contexts stay literal.

import { createSSRApp, h, type VNode } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { parseDocument } from '../../parser/markdown-parser'
import { renderNodes } from '../../render/render-node'
import { withPanelDecorator } from '../../render/panel-registry'
import { decorateWikilinks, type OpenWikiLink } from '../wikilink'

/** The editor's preview assembly path (plan 035 T6 shape): renderNodes
 *  under the panel body decorator window, then the top-level pass —
 *  exactly what EngineEditor.previewVNodeOf does for non-focused blocks
 *  (container widget bodies ride closures only the window reaches). */
function previewVNodes(md: string, open: OpenWikiLink = () => {}): VNode[] {
  const nodes = withPanelDecorator(
    (vnodes) => decorateWikilinks(vnodes, open),
    () => renderNodes(parseDocument(md, true), true),
  )
  decorateWikilinks(nodes, open)
  return nodes
}

function collectLabels(nodes: VNode[]): VNode[] {
  const out: VNode[] = []
  const walk = (vnode: VNode): void => {
    if (typeof vnode.type !== 'string') return
    const cls = String((vnode.props as Record<string, unknown> | null)?.class ?? '')
    if (cls.includes('autodown-wikilink-label')) out.push(vnode)
    if (Array.isArray(vnode.children)) {
      for (const child of vnode.children) {
        if (child && typeof child === 'object') walk(child as VNode)
      }
    }
  }
  for (const n of nodes) walk(n)
  return out
}

async function renderHtml(nodes: VNode[]): Promise<string> {
  return renderToString(createSSRApp({ render: () => h('div', nodes) }))
}

describe('editor wikilink decoration', () => {
  it('splits [[title]] into a clickable label between plain text', async () => {
    const nodes = previewVNodes('前缀 [[Hello World]] 后缀')
    const html = await renderHtml(nodes)
    expect(html).toContain('autodown-wikilink-label')
    expect(html).toContain('Hello World')
  })

  it('emits (title, blockId) and stops propagation on click', () => {
    const opened: Array<[string, string | undefined]> = []
    const nodes = previewVNodes('链接 [[Page Two#block-two]] 处', (title, blockId) => opened.push([title, blockId]))
    const label = collectLabels(nodes)
    expect(label).toHaveLength(1)
    let stopped = false
    ;(label[0].props as { onClick: (ev: { stopPropagation(): void }) => void }).onClick({
      stopPropagation: () => {
        stopped = true
      },
    })
    expect(opened).toEqual([['Page Two', 'block-two']])
    expect(stopped).toBe(true)
  })

  it('labels [[title#block]] with the #block suffix, bare titles without', async () => {
    const withBlock = previewVNodes('[[A#b]]')
    expect(await renderHtml(withBlock)).toContain('>A#b</span>')
    const bare = previewVNodes('[[A]]')
    expect(await renderHtml(bare)).toContain('>A</span>')
  })

  it('decorates wikilinks inside list items', async () => {
    const nodes = previewVNodes('- 列表甲\n- [[Hello World]] — 基础语法示例')
    expect(await renderHtml(nodes)).toContain('autodown-wikilink-label')
  })

  it('does not decorate wikilinks inside inline code', async () => {
    const nodes = previewVNodes('代码 `[[Not A Link]]` 结束')
    decorateWikilinks(nodes, () => {
      throw new Error('inline-code wikilink must not emit')
    })
    const html = await renderHtml(nodes)
    expect(html).not.toContain('autodown-wikilink-label')
    expect(html).toContain('[[Not A Link]]')
  })

  it('leaves wikilink-free documents untouched (identity walk)', async () => {
    const md = '# 标题\n\n普通文本 **加粗** 与 `code`。'
    const before = await renderHtml(previewVNodes(md))
    const nodes = previewVNodes(md)
    expect(await renderHtml(nodes)).toBe(before)
  })
})
