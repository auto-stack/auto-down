<template>
  <component
    :is="hostTag"
    ref="el"
    :class="['autodown-block-host', face.cls]"
    :data-block-id="controller.id"
    :data-node-type="blockKind"
    dir="auto"
    contenteditable="true"
    spellcheck="false"
    @click.stop
    @input="onInput"
    @keydown="onKeydown"
    @compositionstart="onCompositionStart"
    @compositionupdate="onCompositionUpdate"
    @compositionend="onCompositionEnd"
    @paste="onPaste"
    @focus="onFocus"
    @blur="onBlur"
  :innerHTML="initialHtml"></component>
</template>

<script setup lang="ts">
// BlockHost (plan 018 Phase 2; rich host 024 P2T1) — the per-leaf-block
// contenteditable shell. All logic lives in BlockHostController (headless);
// this file only wires DOM events. While focused, the host owns its DOM text
// (model updates flow host → model); the engine repaint happens on focus
// leave / history only. The mount render is RICH: spans become inline
// elements (spansToHtml, evaluated once — the engine is not Vue-reactive,
// so the computed never invalidates under the user's caret). The blur
// writeback (controller.onRichBlur) collects the structure back.
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import type { BlockHostController } from '../engine/host-controller'
import { dispatchSlashState, slashQueryAt } from '../engine/tiptap-adapter'
import { spansToHtml } from '../engine/rich-html'
import { hostFaceFor } from '../engine/host-face'
import { setFocusedRichHost, getFocusedRichHost, domToggleMark, domSetLink } from '../engine/dom-marks'

const props = defineProps<{ controller: BlockHostController; blockKind: string; level?: number }>()

// semantic host face (plan 029): the root renders the view-side tag/class
// (Heading → h1-h6.heading-node, Paragraph → p.paragraph-node) so the editor
// CSS hits it like the preview — WYSIWYG parity. Same mount-once semantics
// as initialHtml: the engine is not Vue-reactive, and a kind/level change
// remounts via the epoch key.
const face = computed(() => hostFaceFor(props.blockKind, props.level))
const hostTag = computed(() => face.value.tag)

const el = ref<HTMLElement | null>(null)

// when the host mounts it IS the newly focused block — take DOM focus with
// the caret at the end (append-at-end flows, Ctrl+End parity)
onMounted(() => {
  const node = el.value
  if (!node) return
  node.focus()
  const range = document.createRange()
  range.selectNodeContents(node)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
})
const initialHtml = computed(() => spansToHtml(props.controller.inlines))

onBeforeUnmount(() => {
  if (getFocusedRichHost() === el.value) setFocusedRichHost(null)
})

/** Chromium renders a trailing space in contenteditable as U+00A0 —
 *  normalize at the DOM boundary or the "- "/"# " input-rule markers never
 *  match and the model collects nbsp pollution. */
function hostText(): string {
  return (el.value?.textContent ?? '').replace(/\u00A0/g, ' ')
}

function onInput(): void {
  const text = hostText()
  props.controller.onInput(text)
  // An input rule may have consumed the marker in the model (kind change /
  // container wrap) while the DOM still shows it — resync the host DOM to
  // the model so the marker cannot leak back into the next keystroke diff
  // (plan 025 P2T1; also fixes the pre-existing heading-marker leak).
  // Skipped mid-composition: the preedit lives only in the DOM.
  const node = el.value
  if (node && !props.controller.composition.composing && hostText() !== props.controller.text) {
    node.innerHTML = spansToHtml(props.controller.inlines)
    const range = document.createRange()
    range.selectNodeContents(node)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }
  if (typeof document !== 'undefined') {
    dispatchSlashState(slashQueryAt(props.controller.text, caretOffset()), props.controller.id, caretOffset())
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (props.controller.composition.composing) return
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
    const offset = caretOffset()
    props.controller.onEnter(offset, `b-${Math.random().toString(36).slice(2, 8)}`)
  } else if (e.key === 'Backspace' && caretOffset() === 0) {
    const prev = previousSiblingId()
    if (prev) e.preventDefault()
    props.controller.onBackspaceAtStart(prev)
  } else if (e.key === 'Tab') {
    // list indent / outdent (plan 025 P1T3); outside a list the browser
    // default (focus move) is untouched
    if (props.controller.onTab(e.shiftKey)) e.preventDefault()
  }
}

function onPaste(ev: ClipboardEvent): void {
  const text = ev.clipboardData?.getData('text/plain') ?? ''
  if (!text) return
  ev.preventDefault()
  const md = text.trim()
  if (!md.includes('\n') && !/^[#>*`\-\d]/.test(md)) {
    props.controller.onInput(props.controller.text + md)
    return
  }
  props.controller.onPasteMarkdown(md)
}

function onCompositionStart(): void {
  props.controller.compositionBegin(props.controller.text, caretOffset())
}

function onCompositionUpdate(e: CompositionEvent): void {
  props.controller.compositionUpdate(e.data ?? '')
}

function onCompositionEnd(e: CompositionEvent): void {
  props.controller.compositionCommit(hostText())
}

/** Focus leave: flush any pending plain-text diff first (the normal input
 *  path already committed each keystroke), then walk the rich structure back
 *  into the model as one undo step (plan 024 P2T2). */
function onBlur(): void {
  const node = el.value
  setFocusedRichHost(null)
  if (!node) return
  const text = hostText()
  if (text !== props.controller.text) props.controller.onInput(text)
  props.controller.onRichBlur(node)
}

/** Register as the focused rich host so the adapter's mark chains can wrap
 *  this DOM in place (plan 024 P3T1). */
function onFocus(): void {
  if (el.value) setFocusedRichHost(el.value)
}

function caretOffset(): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !el.value) return 0
  const range = sel.getRangeAt(0).cloneRange()
  range.selectNodeContents(el.value)
  range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset)
  return range.toString().length
}

function previousSiblingId(): string | null {
  const prev = el.value?.previousElementSibling as HTMLElement | null | undefined
  return prev?.dataset.blockId ?? null
}
</script>
