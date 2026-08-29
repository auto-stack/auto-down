// code_editor_block_ext.ts — platform bridge for the CodeEditorBlock widget
// (plan 023 P1T7; highlight overlay plan 024 P4T1). The .at source owns the
// chrome; the headless commit protocol stays on the hand-written
// CodeEditorController (engine kernel, constructed by the EngineEditor edit
// slot and passed in as a prop), and the DOM helpers live here — the DSL's
// template refs are typed HTMLElement and have no casts, so
// setSelectionRange/scrollHeight access needs plain TS (same gap as
// focusAndSelect in node_view_ext.ts).

import { getHighlightImpl } from '../../render/highlight'
import { lowlightHighlighter } from '../../render/highlight-lowlight'

export function focusCodeArea(el: HTMLElement | null, readonly: boolean): void {
  if (!el || readonly) return
  const area = el as HTMLTextAreaElement
  area.focus()
  const end = area.value.length
  area.setSelectionRange(end, end)
  resizeCodeArea(area)
}

export function resizeCodeArea(el: HTMLElement | null): void {
  const area = el as HTMLTextAreaElement | null
  if (!area) return
  area.style.height = 'auto'
  area.style.height = `${area.scrollHeight}px`
}

// -- highlight overlay (plan 024 P4T1) -------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Highlight HTML for the overlay pre: the render pipeline's highlight
 *  bridge with the Vue-layer lowlight fallback (builtin-panels' resolve
 *  pattern), degrading to escaped plain text so the transparent-text
 *  textarea always has visible text under it. */
export function renderCodeHighlight(code: string, language: string): string {
  const impl = getHighlightImpl() ?? lowlightHighlighter
  const html = impl(code, language)
  if (html !== undefined) return html
  return escapeHtml(code)
}

/** Keep the overlay pre glued to the textarea: mirror its height and any
 *  scroll offsets (the textarea auto-resizes, but wrapping/zoom edges can
 *  still scroll transiently). */
export function syncCodeHighlight(areaEl: HTMLElement | null, preEl: HTMLElement | null): void {
  const area = areaEl as HTMLTextAreaElement | null
  if (!area || !preEl) return
  preEl.style.height = area.style.height || `${area.offsetHeight}px`
  preEl.scrollTop = area.scrollTop
  preEl.scrollLeft = area.scrollLeft
}
