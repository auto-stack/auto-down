// Builtin panel renderers (plan 017 Phase 2). One entry per builtin panel
// kind from auto/palette_map.at (Text, H1..H6, Separator, Codeblock, Quote,
// List, Table). The DOM shape is byte-identical to the pre-registry
// render-node switch — the render.test.ts DOM contract and the downstream
// chrome (scroll sync, code-header injection, CSS) pin it.
//
// Extension panel kinds (Callout/Details/MathBlock/Mermaid/Query/Embed)
// deliberately have no entry here: consumers register them (see
// panel-registry.ts and PANEL-ALIGNMENT.md).

import { h, type VNode } from 'vue'
import type { PanelRenderCtx, PanelRenderer } from './panel-registry'

function renderTextPanel({ node, final, budget, renderInlineChildren }: PanelRenderCtx): VNode {
  if (node.type === 'text') {
    // a bare text block (e.g. inside a table cell)
    return h('span', { class: 'whitespace-pre-wrap break-words text-node' }, [h('span', node.content)])
  }
  return h('p', { class: 'paragraph-node', dir: 'auto' }, renderInlineChildren(node.children, final, budget))
}

function renderHeadingPanel({ node, final, budget, renderInlineChildren }: PanelRenderCtx): VNode {
  const level = Math.min(6, Math.max(1, node.level))
  return h(`h${level}`, { class: `heading-node heading-${level}`, dir: 'auto' }, [
    ...renderInlineChildren(node.children, final, budget),
  ])
}

function renderSeparatorPanel(): VNode {
  return h('hr', { class: 'hr-node' })
}

function renderQuotePanel({ node, final, budget, renderEmbedded }: PanelRenderCtx): VNode {
  return h('blockquote', { class: 'blockquote', dir: 'auto' }, [
    renderEmbedded(node.children, final, budget),
  ])
}

function renderListPanel({ node, final, budget, renderEmbedded }: PanelRenderCtx): VNode {
  const tag = node.ordered ? 'ol' : 'ul'
  return h(
    tag,
    { class: node.ordered ? 'list-node list-decimal' : 'list-node list-disc' },
    (node.items ?? []).map((item: any) =>
      h('li', { class: 'list-item', dir: 'auto' }, [renderEmbedded(item.children ?? [], final, budget)])
    )
  )
}

function alignClass(cell: any): string {
  if (cell.align === 'center') return 'text-center'
  if (cell.align === 'right') return 'text-right'
  return 'text-left'
}

function renderTablePanel({ node, final, budget, renderEmbedded }: PanelRenderCtx): VNode {
  return h('table', { class: 'table-node', 'aria-busy': 'false' }, [
    h('thead', {}, [
      h(
        'tr',
        {},
        (node.header?.cells ?? []).map((cell: any) =>
          h('th', { dir: 'auto', class: alignClass(cell) }, [
            renderEmbedded(cell.children ?? [], final, budget),
            h('button', { type: 'button', class: 'table-node__resize-handle' }),
          ])
        )
      ),
    ]),
    h(
      'tbody',
      {},
      (node.rows ?? []).map((row: any) =>
        h(
          'tr',
          {},
          (row.cells ?? []).map((cell: any) =>
            h('td', { dir: 'auto', class: alignClass(cell) }, [
              renderEmbedded(cell.children ?? [], final, budget),
            ])
          )
        )
      )
    ),
  ])
}

/**
 * Codeblock chrome: header (language label + actions area) over a
 * pre[data-language] > code pair. The pre attributes (data-language) are the
 * contract for downstream highlighters and header injection.
 * Optional capability degradation (plan 008 goal 3): without a highlighter
 * factory the code renders as plain text inside the same structure.
 */
function renderCodeblockPanel({ node }: PanelRenderCtx): VNode {
  const language = node.language ? String(node.language) : ''
  return h('div', { class: 'code-block-container rounded-lg border' }, [
    h('div', { class: 'code-block-header flex justify-between items-center' }, [
      h('div', { class: 'code-header-main' }, [
        h('div', { class: 'code-header-copy' }, [
          h('div', { class: 'code-header-title' }, language),
        ]),
      ]),
      h('div', { class: 'flex items-center gap-0.5' }),
    ]),
    h(
      'pre',
      {
        class: `language-${language || 'text'} code-pre-fallback is-wrap`,
        'data-language': language,
        'aria-busy': 'false',
        tabindex: '0',
      },
      [h('code', { translate: 'no' }, node.code)]
    ),
  ])
}

const headingRenderer: PanelRenderer = renderHeadingPanel

export const builtinPanelRenderers: Record<string, PanelRenderer> = {
  Text: renderTextPanel,
  H1: headingRenderer,
  H2: headingRenderer,
  H3: headingRenderer,
  H4: headingRenderer,
  H5: headingRenderer,
  H6: headingRenderer,
  Separator: renderSeparatorPanel,
  Codeblock: renderCodeblockPanel,
  Quote: renderQuotePanel,
  List: renderListPanel,
  Table: renderTablePanel,
}
