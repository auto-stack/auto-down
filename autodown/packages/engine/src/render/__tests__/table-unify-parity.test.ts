// TEMPORARY dual-run parity guard (plan 032 T3): StreamingTable's terminal
// face (tablePanel) vs the still-live builtin renderTablePanel, byte-for-byte
// over real parsed table WNodes. Deleted in T4 when the builtin retires — the
// lasting guards are render.test.ts (zero-change) and the tri-state Table
// assertions, both pinning the same DOM contract.

import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { parseDocument } from '../markdown-parser.generated'
import { tablePanel } from '../StreamingTable.vue'
import { builtinPanelRenderers } from '../builtin-panels'
import { panelOfBlock } from '../palette-map.generated'
import type { PanelRenderCtx } from '../panel-registry'

const oldTablePanel = builtinPanelRenderers.Table!

function makeCtx(node: any): PanelRenderCtx {
  const spec = panelOfBlock('table')
  const renderEmbedded = (children: any[]) =>
    h('div', { class: 'markdown-renderer' }, (children ?? []).map((c: any) => h('span', c.content ?? '')))
  const renderInlineChildren = (children: any[] | undefined) =>
    (children ?? []).map((c: any) => h('span', c.content ?? ''))
  return { node, final: true, budget: undefined, spec, renderEmbedded: renderEmbedded as any, renderInlineChildren }
}

async function renderBoth(md: string): Promise<[string, string]> {
  const node = parseDocument(md, true)[0]
  const ctx = makeCtx(node)
  const wrap = async (v: any) =>
    (await renderToString(createSSRApp({ render: () => h('div', [v]) }))).replace(/<!--.*?-->/g, '')
  return Promise.all([wrap(oldTablePanel(ctx)), wrap(tablePanel(ctx))])
}

describe('table unification dual-run parity (plan 032 T3, temporary)', () => {
  it('byte-identical DOM for the plain table', async () => {
    const [oldHtml, newHtml] = await renderBoth('| a | b |\n| --- | --- |\n| 1 | 2 |')
    expect(newHtml).toBe(oldHtml)
    // and it is the real contract, not two empty strings
    expect(newHtml).toContain('table-node')
    expect(newHtml).toContain('table-node__resize-handle')
  })

  it('byte-identical DOM for aligns (left/center/right) and multi-row', async () => {
    const [oldHtml, newHtml] = await renderBoth(
      '| L | C | R |\n| :--- | :---: | ---: |\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |'
    )
    expect(newHtml).toBe(oldHtml)
    expect(newHtml).toContain('text-center')
    expect(newHtml).toContain('text-right')
    expect(newHtml).toContain('text-left')
  })
})
