// Rich host HTML (plan 024 Phase 2) — mount-time inline rendering for the
// focused text-leaf host: InlineSpan marks become real elements
// (strong/em/del/code/a). Text is always escaped; anchors render
// contenteditable=false so editing never follows the link. Image-marked
// spans fall back to plain text (v1: the blur walk skips blocks that
// contain them — no data loss, no in-place image editing).

import { InlineSpan, Mark, attrGetStr, hasMark } from '../../parser/block-model'

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
      inner = `<a href="${href}" contenteditable="false" data-autodown-link>${inner}</a>`
    }
    out += inner
  }
  return out
}
