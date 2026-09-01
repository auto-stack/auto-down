// code_block_widget_ext.ts — platform bridge for the CodeBlockWidget (plan
// 033 T2): the fence family's three-mode widget. Absorbs
// code_editor_block_ext.ts whole (the edit face's DOM helpers + overlay
// highlight) and adds what the family wrappers hand over: the wrapper
// contract passes the model node + edit ctx, so the flat chrome reads
// (language / code / loading / readonly / blockId) live here as typed
// readers over the wide props — the DSL has no casts and no optional
// chaining.
//
// 1. renderViewHighlight — the VIEW/STREAM face's highlight, byte-identical
//    to the builtin panel's resolveHighlighter: capability gate first
//    (highlight off = the plain-text path), bound impl, lowlight fallback,
//    '' sentinel for "no highlight" (the widget branches on it).
// 2. renderCodeHighlight — the EDIT overlay's highlight (always resolves,
//    escaped-plain-text fallback so the transparent-text textarea always
//    has visible text under it). Verbatim from code_editor_block_ext.ts.
// 3. focusCodeArea / resizeCodeArea / syncCodeHighlight — verbatim.
// 4. nodeLanguage / nodeText / nodeLoading / ctxReadonly / ctxBlockId —
//    typed readers over the family's wide node/ctx props.
// 5. codeController — the CodeEditorController factory for the edit face;
//    constructed ONCE per widget instance (model init), null in
//    view/stream modes where no ctx exists.
//
// Deployed verbatim to src/editor/ext/code_block_widget_ext.ts by gen.mjs
// (assert-editor-gen guards the byte sync).

import { getHighlightImpl } from '../../render/highlight'
import { lowlightHighlighter } from '../../render/highlight-lowlight'
import { isCapabilityEnabled } from '../../render/optional-capabilities'
import { attrGetBool, attrGetStr, blockText, type BlockNode } from '../../parser/block-model'
import { CodeEditorController } from '../engine/code-editor-controller'
import type { EditorEngine } from '../engine/editor-engine'

// -- view/stream face ------------------------------------------------------------

/** Highlight HTML for the view face — the builtin panel's resolution order
 *  verbatim (capability gate → bound impl → lowlight), '' when the pipeline
 *  yields nothing so the plain-text branch applies. */
export function renderViewHighlight(code: string, language: string): string {
  if (!isCapabilityEnabled('highlight')) return ''
  const impl = getHighlightImpl() ?? lowlightHighlighter
  return impl(code, language) ?? ''
}

/** Escaped text for a v-html binding — the DSL's `text` emits a
 *  <span>{{}}</span> wrapper, but the builtin panel's byte contract pins
 *  bare text children (render.test's pre>code regex among them). */
export function htmlText(s: string): string {
  return escapeHtml(s)
}

/** The view pre's complete <code> child as one markup string — the two
 *  builtin branches byte-for-byte (highlighted: innerHTML + data-highlighted
 *  in the builtin's attr order; plain: escaped text child). <code> is not
 *  in the DSL element table and html: on a dyn element does not compile to
 *  v-html, so the string is the only byte-exact route. */
export function viewCodeInner(code: string, language: string): string {
  const html = renderViewHighlight(code, language)
  if (html !== '') {
    return `<code translate="no" data-highlighted="${escapeAttr(language)}">${html}</code>`
  }
  return `<code translate="no">${escapeHtml(code)}</code>`
}

/** The shared root's data-language: present on the edit wrapper (the
 *  CodeBlockMenu host contract), omitted in view modes (the builtin panel
 *  root carries none — undefined drops the attr). */
export function rootDataLanguage(mode: string, language: string): string | undefined {
  return mode === 'edit' ? language : undefined
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;')
}

// -- edit face (verbatim from code_editor_block_ext.ts, plan 023 P1T7) ------------

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Highlight HTML for the overlay pre: the render pipeline's highlight
 *  bridge with the Vue-layer lowlight fallback, degrading to escaped plain
 *  text so the transparent-text textarea always has visible text under it. */
export function renderCodeHighlight(code: string, language: string): string {
  const impl = getHighlightImpl() ?? lowlightHighlighter
  const html = impl(code, language)
  if (html !== undefined) return html
  return escapeHtml(code)
}

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

// -- family prop readers ----------------------------------------------------------

export function nodeLanguage(node: BlockNode | undefined): string {
  return attrGetStr(node?.attrs ?? [], 'language', '')
}

export function nodeText(node: BlockNode | undefined): string {
  return blockText(node ?? ({ inlines: [] } as unknown as BlockNode))
}

export function nodeLoading(node: BlockNode | undefined): boolean {
  return attrGetBool(node?.attrs ?? [], 'loading', false)
}

export function ctxReadonly(ctx: unknown): boolean {
  return (ctx as { readonly?: boolean } | null | undefined)?.readonly === true
}

export function ctxBlockId(ctx: unknown): string {
  const id = (ctx as { blockId?: string } | null | undefined)?.blockId
  return typeof id === 'string' ? id : ''
}

/** The edit face's headless commit controller (whole-text blur commit, one
 *  undo step). Null when no ctx arrived (view/stream modes). */
export function codeController(ctx: unknown): CodeEditorController | null {
  if (ctx == null) return null
  const c = ctx as { engine: EditorEngine; blockId: string }
  return new CodeEditorController(c.engine, c.blockId)
}

// -- family root-attr helpers (shared by the math/mermaid widget bridges) --------

/** An attribute only the edit face carries (undefined drops the attr —
 *  view/stream roots must not grow stray empty markers). */
export function editOnlyAttr(mode: string, v: string): string | undefined {
  return mode === 'edit' ? v : undefined
}

/** A bare marker attribute only the view/stream faces carry (the node-view
 *  contract's data-*-block="" shape). */
export function viewMarker(mode: string): string | undefined {
  return mode === 'edit' ? undefined : ''
}
