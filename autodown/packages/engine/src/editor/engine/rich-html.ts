// Rich host HTML (plan 024 Phase 2) — mount-time inline rendering for the
// focused text-leaf host: InlineSpan marks become real elements
// (strong/em/del/code/a). Text is always escaped; anchors render
// contenteditable=false so editing never follows the link. Image-marked
// spans fall back to plain text (v1: the blur walk skips blocks that
// contain them — no data loss, no in-place image editing).

import { Attr, InlineSpan, Mark, Value, addMark, attrGetStr, hasMark } from '../../parser/block-model'
import { normalizeSpans } from './marks'

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;')
}

/** The focused host's initial inner HTML. The v1 mark set is exactly the
 *  five inline elements; anything else renders as escaped plain text. */
export function spansToHtml(spans: InlineSpan[]): string {
  let out = ''
  for (const s of spans) {
    let inner = escapeHtml(s.text)
    if (hasMark(s.marks, Mark.Code)) inner = `<code>${inner}</code>`
    if (hasMark(s.marks, Mark.Strong)) inner = `<strong>${inner}</strong>`
    if (hasMark(s.marks, Mark.Em)) inner = `<em>${inner}</em>`
    if (hasMark(s.marks, Mark.Del)) inner = `<del>${inner}</del>`
    if (hasMark(s.marks, Mark.Link)) {
      const href = escapeAttr(attrGetStr(s.attrs, 'href', ''))
      const title = attrGetStr(s.attrs, 'title', '')
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : ''
      inner = `<a href="${href}"${titleAttr} contenteditable="false" data-autodown-link>${inner}</a>`
    }
    out += inner
  }
  return out
}

// -- blur walk: rich DOM → spans (the spansToHtml inverse) -----------------------

/** Injected node description of a rich host subtree (headless-testable). */
export interface RichNode {
  tag?: string
  text?: string
  children?: RichNode[]
  attrs?: Record<string, string>
}

function markForTag(tag: string): Mark | null {
  const t = tag.toUpperCase()
  if (t === 'STRONG' || t === 'B') return Mark.Strong
  if (t === 'EM' || t === 'I') return Mark.Em
  if (t === 'DEL' || t === 'S') return Mark.Del
  if (t === 'CODE') return Mark.Code
  return null
}

/** Walk a rich-node tree collecting (text, marks, attrs) runs; adjacent
 *  same-format runs merge (normalizeSpans). Structure-only elements (br)
 *  contribute nothing. */
export function richTreeToSpans(root: RichNode): InlineSpan[] {
  const out: InlineSpan[] = []
  const walk = (n: RichNode, marks: Mark[], attrs: Attr[]): void => {
    if (n.text !== undefined) {
      if (n.text !== '') out.push(new InlineSpan(n.text, marks, attrs))
      return
    }
    let m = marks
    let a = attrs
    const tagMark = markForTag(n.tag ?? '')
    if (tagMark !== null) m = addMark(m, tagMark)
    if ((n.tag ?? '').toUpperCase() === 'A' && n.attrs?.href !== undefined) {
      m = addMark(m, Mark.Link)
      a = [new Attr('href', Value.Str(n.attrs.href))]
      if (n.attrs.title !== undefined) a.push(new Attr('title', Value.Str(n.attrs.title)))
    }
    for (const c of n.children ?? []) walk(c, m, a)
  }
  walk(root, [], [])
  return normalizeSpans(out)
}

/** Real-DOM adapter for richTreeToSpans (e2e-pinned). */
export function domRootToSpans(root: HTMLElement): InlineSpan[] {
  const conv = (n: Node): RichNode => {
    if (n.nodeType === 3) return { text: n.textContent ?? '' }
    const el = n as HTMLElement
    const attrs: Record<string, string> = {}
    const href = el.getAttribute?.('href')
    if (href != null) attrs.href = href
    const title = el.getAttribute?.('title')
    if (title != null) attrs.title = title
    return { tag: el.tagName ?? '', children: Array.from(n.childNodes).map(conv), attrs }
  }
  return richTreeToSpans(conv(root))
}
