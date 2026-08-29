<template>
  <div
    ref="el"
    class="autodown-block-host"
    :data-block-id="controller.id"
    :data-node-type="blockKind"
    contenteditable="true"
    spellcheck="false"
    @input="onInput"
    @keydown="onKeydown"
    @compositionstart="onCompositionStart"
    @compositionupdate="onCompositionUpdate"
    @compositionend="onCompositionEnd"
    @paste="onPaste"
    @blur="onBlur"
  v-html="initialHtml"></div>
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
import { computed, onMounted, ref } from 'vue'
import type { BlockHostController } from '../engine/host-controller'
import { dispatchSlashState, slashQueryAt } from '../engine/tiptap-adapter'
import { spansToHtml } from '../engine/rich-html'

const props = defineProps<{ controller: BlockHostController; blockKind: string }>()

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

function onInput(): void {
  const text = el.value?.textContent ?? ''
  props.controller.onInput(text)
  if (typeof document !== 'undefined') {
    dispatchSlashState(slashQueryAt(text, caretOffset()), props.controller.id, caretOffset())
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (props.controller.composition.composing) return
  if (e.key === 'Enter') {
    e.preventDefault()
    const offset = caretOffset()
    props.controller.onEnter(offset, `b-${Math.random().toString(36).slice(2, 8)}`)
  } else if (e.key === 'Backspace' && caretOffset() === 0) {
    const prev = previousSiblingId()
    if (prev) e.preventDefault()
    props.controller.onBackspaceAtStart(prev)
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
  props.controller.compositionCommit(el.value?.textContent ?? '')
}

/** Focus leave: flush any pending plain-text diff first (the normal input
 *  path already committed each keystroke), then walk the rich structure back
 *  into the model as one undo step (plan 024 P2T2). */
function onBlur(): void {
  const node = el.value
  if (!node) return
  const text = node.textContent ?? ''
  if (text !== props.controller.text) props.controller.onInput(text)
  props.controller.onRichBlur(node)
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
