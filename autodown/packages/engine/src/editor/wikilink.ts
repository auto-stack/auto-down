// Editor-side wikilink interaction (plan 020 Phase 3). The parser keeps
// [[title]] / [[title#block]] as plain text (WikilinkBlock exists only for
// serializer round-trips), so the editor decorates its preview render:
// text under element vnodes splits and each wikilink becomes a clickable
// .autodown-wikilink-label span emitting open-wiki-link (title, blockId).
// The focused block stays raw source (live-preview model), and code
// contexts (inline code / fence bodies) are skipped — a [[..]] inside
// backticks is literal text.

import { h, type VNode } from 'vue'

const WIKI_LINK_RE = /\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?\]\]/g

export type OpenWikiLink = (title: string, blockId?: string) => void

export function decorateWikilinks(nodes: VNode[], open: OpenWikiLink): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (!node || typeof node !== 'object') continue
    const replacement = walkVNode(node, open)
    if (!replacement) continue
    // nested arrays are flattened during vnode normalization
    if (Array.isArray(replacement)) nodes.splice(i, 1, ...replacement)
    else nodes[i] = replacement
  }
}

/** Walk one vnode; returns a replacement when a TEXT_CHILDREN vnode needed
 *  splitting — swapping children in place would leave the stale text
 *  shapeFlag and the renderer would stringify the array. */
function walkVNode(vnode: VNode, open: OpenWikiLink): VNode | VNode[] | null {
  // only element vnodes carry splittable text; component vnodes own their
  // own trees
  if (typeof vnode.type !== 'string') return null
  if (vnode.type === 'code' || vnode.type === 'pre') return null
  const children = vnode.children
  if (typeof children === 'string') {
    const parts = decorateText(children, open)
    return parts ? h(vnode.type, vnode.props ?? {}, parts) : null
  }
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (typeof child === 'string') {
        const parts = decorateText(child, open)
        if (parts) children[i] = parts
      } else if (child && typeof child === 'object') {
        const replacement = walkVNode(child as VNode, open)
        if (replacement) children[i] = replacement
      }
    }
  }
  return null
}

/** Split one text run into mixed text/label children; null = no wikilink. */
function decorateText(text: string, open: OpenWikiLink): VNode[] | null {
  if (!text.includes('[[')) return null
  const parts: unknown[] = []
  let last = 0
  let found = false
  for (const m of text.matchAll(WIKI_LINK_RE)) {
    found = true
    const start = m.index ?? 0
    if (start > last) parts.push(text.slice(last, start))
    const title = (m[1] ?? '').trim()
    const blockId = m[2]?.trim()
    const label = blockId ? `${title}#${blockId}` : title
    parts.push(
      h(
        'span',
        {
          class: 'autodown-wikilink-label',
          'data-wikilink-title': title,
          onClick: (ev: MouseEvent) => {
            ev.stopPropagation()
            open(title, blockId)
          },
        },
        label,
      ),
    )
    last = start + m[0].length
  }
  if (!found) return null
  if (last < text.length) parts.push(text.slice(last))
  return parts as VNode[]
}
