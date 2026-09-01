// rich_text_host_ext.ts — Hand-written TS extension for the RichTextHost
// widget (../rich_text_host.at, plan 034). Carries ALL of the retired
// BlockHost.vue's platform wiring, migrated line-for-line (semantic comments
// preserved); the widget owns only the chrome and the event face. The gen
// pipeline copies this file into the transient gen project (never
// type-checked there) and deploys it verbatim to
// src/editor/ext/rich_text_host_ext.ts; the generated RichTextHost.vue
// imports it from ../ext/rich_text_host_ext (gen.mjs E1 rewrite).
//
// What genuinely cannot be expressed in the widget DSL (T1 probe verdicts):
// - mount HTML injection: `html:` on a dyn root emits a :html ATTRIBUTE
//   binding, not v-html — the mount snapshot is written via $el here;
// - the root element: `ref:` on a dyn root emits no const declaration —
//   mountHost grabs it through getCurrentInstance().$el (the
//   auto_down_editor_ext.ts idiom) and event handlers receive e.target;
// - str() has no DSL builtin — the host-face computation (hostTag/hostCls,
//   absorbed from engine/host-face.ts) lives here;
// - Selection/Range/caret math and window.prompt are imperative by nature.
//
// Everything below is engine-side logic only — zero auto-lang dependency.

import { getCurrentInstance, onBeforeUnmount } from 'vue'
import type { BlockHostController } from '../engine/host-controller'
import { dispatchSlashState, slashQueryAt } from '../engine/tiptap-adapter'
import { spansToHtml } from '../engine/rich-html'
import { setFocusedRichHost, getFocusedRichHost, domToggleMark, domSetLink } from '../engine/dom-marks'

// -- semantic host face (absorbed from engine/host-face.ts, plan 029) ------------
//
// The focused edit host renders the view-side tag/class (Heading →
// h1-h6.heading-node, Paragraph → p.paragraph-node) so the editor CSS hits
// the host exactly like the preview — WYSIWYG parity, pinned by the
// wysiwyg-typography e2e computed-style assertions. Every other editable
// kind keeps the bare div of old.

export function hostTag(kind: string, level?: number): string {
  return hostFaceFor(kind, level).tag
}

/** Full class chain incl. the base autodown-block-host (BlockHost rendered
 *  ['autodown-block-host', face.cls] — same computed DOM as one string). */
export function hostCls(kind: string, level?: number): string {
  const face = hostFaceFor(kind, level)
  return face.cls ? `autodown-block-host ${face.cls}` : 'autodown-block-host'
}

function hostFaceFor(kind: string, level?: number): { tag: string; cls: string } {
  if (kind === 'Heading') {
    const l = Math.min(6, Math.max(1, level ?? 1))
    return { tag: `h${l}`, cls: `heading-node heading-${l}` }
  }
  if (kind === 'Paragraph') return { tag: 'p', cls: 'paragraph-node' }
  return { tag: 'div', cls: '' }
}

// -- mount / unmount ----------------------------------------------------------------

/** Mount: when the host mounts it IS the newly focused block — inject the
 *  rich snapshot (spansToHtml of the model inlines, evaluated once by the
 *  assembler — the engine is not Vue-reactive, so it never invalidates
 *  under the user's caret), take DOM focus with the caret at the end
 *  (append-at-end flows, Ctrl+End parity), and register the unmount
 *  deregistration of the focused-rich-host slot (BlockHost's
 *  onBeforeUnmount). */
export function mountHost(initialHtml: string): void {
  const inst = getCurrentInstance()
  const node = (inst?.proxy?.$el as HTMLElement | undefined) ?? null
  if (!node) return
  node.innerHTML = initialHtml
  node.focus()
  caretToEnd(node)
  onBeforeUnmount(() => {
    if (getFocusedRichHost() === node) setFocusedRichHost(null)
  })
}

function caretToEnd(node: HTMLElement): void {
  const range = document.createRange()
  range.selectNodeContents(node)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

// -- text/caret math -----------------------------------------------------------------

/** Chromium renders a trailing space in contenteditable as U+00A0 —
 *  normalize at the DOM boundary or the "- "/"# " input-rule markers never
 *  match and the model collects nbsp pollution. */
export function hostText(el: HTMLElement): string {
  return (el.textContent ?? '').replace(/\u00A0/g, ' ')
}

/** Caret offset in text-code-unit terms (Range math over the host subtree). */
export function caretOffset(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return 0
  const range = sel.getRangeAt(0).cloneRange()
  range.selectNodeContents(el)
  range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset)
  return range.toString().length
}

export function previousSiblingId(el: HTMLElement): string | null {
  const prev = el.previousElementSibling as HTMLElement | null
  return prev?.dataset.blockId ?? null
}

// -- event wiring (BlockHost.vue handlers, verbatim) --------------------------------

export function hostInput(el: HTMLElement, controller: BlockHostController): void {
  const text = hostText(el)
  controller.onInput(text)
  // An input rule may have consumed the marker in the model (kind change /
  // container wrap) while the DOM still shows it — resync the host DOM to
  // the model so the marker cannot leak back into the next keystroke diff
  // (plan 025 P2T1; also fixes the pre-existing heading-marker leak).
  // Skipped mid-composition: the preedit lives only in the DOM.
  if (!controller.composition.composing && hostText(el) !== controller.text) {
    el.innerHTML = spansToHtml(controller.inlines)
    caretToEnd(el)
  }
  if (typeof document !== 'undefined') {
    dispatchSlashState(slashQueryAt(controller.text, caretOffset(el)), controller.id, caretOffset(el))
  }
}

export function hostKeydown(e: KeyboardEvent, controller: BlockHostController): void {
  if (controller.composition.composing) return
  // currentTarget is the listener's element during real dispatch; direct
  // unit invocations only carry target — both are the host root here.
  const el = (e.currentTarget ?? e.target) as HTMLElement
  if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase()
    // inline mark shortcuts (plan 024 P3T3): wrap the live DOM in place —
    // the model catches up on blur. Overriding the browser's native <b>
    // keeps the DOM canonical (<strong>) for the blur walk.
    if (k === 'b') {
      e.preventDefault()
      domToggleMark('strong')
      return
    }
    if (k === 'i') {
      e.preventDefault()
      domToggleMark('em')
      return
    }
    if (k === 'k') {
      e.preventDefault()
      const url = window.prompt('Enter URL')
      if (url) domSetLink(url)
      return
    }
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    controller.onEnter(caretOffset(el), `b-${Math.random().toString(36).slice(2, 8)}`)
  } else if (e.key === 'Backspace' && caretOffset(el) === 0) {
    const prev = previousSiblingId(el)
    if (prev) e.preventDefault()
    controller.onBackspaceAtStart(prev)
  } else if (e.key === 'Tab') {
    // list indent / outdent (plan 025 P1T3); outside a list the browser
    // default (focus move) is untouched
    if (controller.onTab(e.shiftKey)) e.preventDefault()
  }
}

export function hostPaste(ev: ClipboardEvent, controller: BlockHostController): void {
  const text = ev.clipboardData?.getData('text/plain') ?? ''
  if (!text) return
  ev.preventDefault()
  const md = text.trim()
  if (!md.includes('\n') && !/^[#>*`\-\d]/.test(md)) {
    controller.onInput(controller.text + md)
    return
  }
  controller.onPasteMarkdown(md)
}

export function hostCompositionBegin(
  el: HTMLElement,
  controller: BlockHostController
): void {
  controller.compositionBegin(controller.text, caretOffset(el))
}

export function hostCompositionUpdate(
  e: CompositionEvent,
  controller: BlockHostController
): void {
  controller.compositionUpdate(e.data ?? '')
}

export function hostCompositionCommit(
  el: HTMLElement,
  controller: BlockHostController
): void {
  controller.compositionCommit(hostText(el))
}

/** Register as the focused rich host so the adapter's mark chains can wrap
 *  this DOM in place (plan 024 P3T1). */
export function hostFocus(el: HTMLElement, _controller: BlockHostController): void {
  void _controller
  setFocusedRichHost(el)
}

/** Focus leave: flush any pending plain-text diff first (the normal input
 *  path already committed each keystroke), then walk the rich structure back
 *  into the model as one undo step (plan 024 P2T2). */
export function hostBlur(el: HTMLElement, controller: BlockHostController): void {
  setFocusedRichHost(null)
  const text = hostText(el)
  if (text !== controller.text) controller.onInput(text)
  controller.onRichBlur(el)
}
