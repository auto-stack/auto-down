// Builtin panel renderers (plan 017 Phase 2). One entry per builtin panel
// kind from auto/palette_map.at (Text, H1..H6, Separator, Quote, List) —
// plus, since plan 030, Callout. The DOM shape is byte-identical to the
// pre-registry render-node switch — the render.test.ts DOM contract and
// the downstream chrome (scroll sync, code-header injection, CSS) pin it.
//
// Table is NOT here anymore (plan 032 P2): the single table implementation
// (progressive + terminal faces) lives in StreamingTable.vue and mounts on
// the registry's custom slot — see render-node's side-effect import.
//
// Codeblock is NOT here anymore either (plan 033 T5): the fence family
// widget (auto/editor/code_block_widget.at — view/stream/edit one chrome)
// owns the panel face now, registered on the custom slot by
// block-widget-panels.ts, same channel Table pioneered. The retired
// renderCodeblockPanel's DOM contract is absorbed byte-for-byte (the
// widget's ext bridge viewCodeInner + the 032 loading family).
//
// Extension panel kinds (Details/MathBlock/Mermaid/Query/Embed) deliberately
// have no entry here: consumers register them (see panel-registry.ts and
// PANEL-ALIGNMENT.md). Callout is the exception (plan 030): the card chrome
// ships as a builtin so view/stream render it without any registration —
// EngineEditor's expanded container mirrors this class chain verbatim (CSS
// single-channel).

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
      h(
        'li',
        {
          class: 'list-item' + (item.checked != null ? ' task-item' : ''),
          dir: 'auto',
        },
        [
          // GFM task checkbox (plan 030): present only on task items; the
          // view/stream copy is inert (disabled) — the editing assembly
          // renders its own clickable checkbox through the command channel
          ...(item.checked != null
            ? [
                h('input', {
                  type: 'checkbox',
                  class: 'task-checkbox',
                  checked: item.checked === true,
                  disabled: true,
                  'aria-label': 'task checkbox',
                }),
              ]
            : []),
          renderEmbedded(item.children ?? [], final, budget),
        ]
      )
    )
  )
}

// Callout card chrome (plan 030). Class chain is the single CSS channel:
// .autodown-callout* styles live in autodown-editor.css; the palette spec
// adds the .callout-node tag; data-callout-type carries the type for
// downstream consumers (EngineEditor's expanded container must stay in
// verbatim lockstep with this shape).
export const CALLOUT_TYPES = ['note', 'info', 'tip', 'warning', 'caution', 'danger', 'error']

function renderCalloutPanel({ node, final, budget, renderEmbedded }: PanelRenderCtx): VNode {
  const type = String(node.language ?? '')
  const title = String(node.title ?? '')
  const known = CALLOUT_TYPES.includes(type)
  return h('div', {
    class: ['callout-node', 'autodown-callout', `autodown-callout-${type}`],
    'data-callout-type': type,
  }, [
    h('div', { class: 'autodown-callout-header' }, [
      ...(known
        ? [h('span', { class: ['autodown-callout-icon', `autodown-callout-icon-${type}`], 'aria-hidden': 'true' })]
        : []),
      h('div', { class: 'autodown-callout-title', dir: 'auto' }, title.length > 0 ? title : type),
    ]),
    h('div', { class: 'autodown-callout-content' }, [renderEmbedded(node.children ?? [], final, budget)]),
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
  Quote: renderQuotePanel,
  List: renderListPanel,
  Callout: renderCalloutPanel,
}
