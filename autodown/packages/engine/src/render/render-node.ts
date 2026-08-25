// Node tree -> VNode renderer for the self-hosted MarkdownRender
// (plan 008, Phase 3; registry-driven since plan 017 Phase 2).
//
// Block-level dispatch goes through the panel registry: the palette map
// (auto/palette_map.at, single source) resolves the block type to a panel
// spec, panel-registry resolves the spec to a renderer (custom → builtin →
// degrade). Inline rendering and the streaming typewriter budget stay here.
//
// The DOM shape mirrors what the retired markstream-vue renderer produced
// (node-slot/node-content wrappers, data-node-type, pre[data-language],
// table-node, embedded markdown-renderer containers) so downstream chrome
// (scroll sync via .node-slot, code-header injection via
// pre[data-language], CSS overrides) keeps working unchanged.

import { h, type VNode } from 'vue'
import { resolvePanelRenderer, specForNode, type RevealBudget } from './panel-registry'

export type { RevealBudget } from './panel-registry'

export function renderNodes(nodes: any[], final: boolean | undefined, reveal?: number): VNode[] {
  const budget =
    reveal !== undefined && Number.isFinite(reveal) ? { remaining: reveal } : undefined
  return (nodes ?? []).map((node: any, i: number) => {
    // the typewriter budget applies only to the LAST top-level node
    const isLast = i === nodes.length - 1
    return renderBlockNode(node, i, final, isLast ? budget : undefined)
  })
}

/** Block-level node: wraps the element in node-slot / node-content. */
function renderBlockNode(node: any, index: number, final: boolean | undefined, budget?: RevealBudget): VNode {
  return h('div', { class: 'node-slot', 'data-node-index': String(index), 'data-node-type': node.type }, [
    h('div', { class: 'node-content' }, [renderNodeElement(node, final, budget)]),
  ])
}

/** Nested block content (li body, quote body, table cells) renders as an
 *  embedded markdown-renderer whose entries carry their own slots. */
function renderEmbedded(children: any[], final: boolean | undefined, budget?: RevealBudget): VNode {
  const inner = (children ?? []).map((node: any, i: number) => {
    const isLast = i === (children?.length ?? 0) - 1
    return renderBlockNode(node, i, final, isLast ? budget : undefined)
  })
  // root class dropped the legacy `markstream-vue` segment in plan 017
  // Phase 3 — the only sanctioned DOM break (see the plan); consumers
  // audited clean (demo/jade-garden), musk noted as a plan 020 item
  return h('div', { class: 'markdown-renderer' }, inner)
}

function renderInlineChildren(children: any[] | undefined, final: boolean | undefined, budget?: RevealBudget): VNode[] {
  return (children ?? []).map((child: any) => renderInlineNode(child, final, budget))
}

function inlineFallbackText(node: any): string {
  return node.content ?? node.code ?? ''
}

function clipText(text: string, budget?: RevealBudget): string {
  if (!budget) return text
  if (budget.remaining <= 0) return ''
  const clip = budget.remaining >= text.length ? text : text.slice(0, budget.remaining)
  budget.remaining -= clip.length
  return clip
}

function renderInlineNode(node: any, final: boolean | undefined, budget?: RevealBudget): VNode {
  switch (node.type) {
    case 'text':
      return h('span', { class: 'whitespace-pre-wrap break-words text-node' }, [h('span', clipText(node.content, budget))])
    case 'strong':
      return h('strong', { class: 'strong-node' }, renderInlineChildren(node.children, final, budget))
    case 'emphasis':
      return h('em', { class: 'emphasis-node' }, renderInlineChildren(node.children, final, budget))
    case 'strikethrough':
      return h('del', { class: 'strikethrough-node' }, renderInlineChildren(node.children, final, budget))
    case 'inline_code':
      return h('code', { class: 'inline-code' }, [h('span', node.code)])
    case 'link':
      return h(
        'a',
        {
          class: 'link-node',
          href: node.href,
          title: node.title ?? undefined,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        renderInlineChildren(node.children, final, budget)
      )
    case 'image':
      return h('span', { class: 'image-node-container' }, [
        h('img', {
          src: node.src,
          alt: node.alt,
          title: node.alt,
          class: 'image-node__img',
          loading: 'lazy',
        }),
      ])
    case 'hardbreak':
      return h('br')
    default:
      return h('span', { class: 'whitespace-pre-wrap break-words text-node' }, [
        h('span', inlineFallbackText(node)),
      ])
  }
}

/** Registry dispatch: palette map resolves the panel spec, the registry
 *  resolves the renderer (custom → builtin), unregistered extension panels
 *  and unknown types degrade to the unknown-node div. */
function renderNodeElement(node: any, final: boolean | undefined, budget?: RevealBudget): VNode {
  const spec = specForNode(node)
  const renderer = resolvePanelRenderer(spec)
  if (renderer) {
    return renderer({ node, final, budget, spec, renderEmbedded, renderInlineChildren })
  }
  return h('div', { class: 'unknown-node' }, String(node.type))
}
