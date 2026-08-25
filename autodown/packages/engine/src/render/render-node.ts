// Node tree -> VNode renderer for the self-hosted MarkdownRender
// (plan 008, Phase 3). Functional and recursive — no component recursion
// limits. The DOM shape mirrors what the retired markstream-vue renderer
// produced (node-slot/node-content wrappers, data-node-type,
// pre[data-language], table-node, code-block-header, embedded
// markdown-renderer containers) so downstream chrome (scroll sync via
// .node-slot, code-header injection via pre[data-language], CSS overrides)
// keeps working unchanged.

import { h, type VNode } from 'vue'

export interface RevealBudget {
  /** characters of inline text still revealable (typewriter); Infinity = all */
  remaining: number
}

export function renderNodes(nodes: any[], final: boolean | undefined, reveal?: number): VNode[] {
  const budget: RevealBudget | undefined =
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
  return h('div', { class: 'markstream-vue markdown-renderer' }, inner)
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

function alignClass(cell: any): string {
  if (cell.align === 'center') return 'text-center'
  if (cell.align === 'right') return 'text-right'
  return 'text-left'
}

function renderNodeElement(node: any, final: boolean | undefined, budget?: RevealBudget): VNode {
  switch (node.type) {
    case 'heading': {
      const level = Math.min(6, Math.max(1, node.level))
      return h(`h${level}`, { class: `heading-node heading-${level}`, dir: 'auto' }, [
        ...renderInlineChildren(node.children, final, budget),
      ])
    }
    case 'paragraph':
      return h('p', { class: 'paragraph-node', dir: 'auto' }, renderInlineChildren(node.children, final, budget))
    case 'text':
      // a bare text block (e.g. inside a table cell)
      return h('span', { class: 'whitespace-pre-wrap break-words text-node' }, [h('span', node.content)])
    case 'thematic_break':
      return h('hr', { class: 'hr-node' })
    case 'code_block':
      return renderCodeBlock(node)
    case 'blockquote':
      return h('blockquote', { class: 'blockquote', dir: 'auto' }, [
        renderEmbedded(node.children, final, budget),
      ])
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul'
      return h(
        tag,
        { class: node.ordered ? 'list-node list-decimal' : 'list-node list-disc' },
        (node.items ?? []).map((item: any) =>
          h('li', { class: 'list-item', dir: 'auto' }, [renderEmbedded(item.children ?? [], final, budget)])
        )
      )
    }
    case 'table':
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
    default:
      return h('div', { class: 'unknown-node' }, String(node.type))
  }
}

/**
 * Code block chrome: header (language label + actions area) over a
 * pre[data-language] > code pair. The pre attributes (data-language) are the
 * contract for downstream highlighters and header injection.
 * Optional capability degradation (plan 008 goal 3): without a highlighter
 * factory the code renders as plain text inside the same structure.
 */
function renderCodeBlock(node: any): VNode {
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
