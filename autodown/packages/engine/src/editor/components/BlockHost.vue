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
  >{{ initialText }}</div>
</template>

<script setup lang="ts">
// BlockHost (plan 018 Phase 2) — the per-leaf-block contenteditable shell.
// All logic lives in BlockHostController (headless); this file only wires
// DOM events. While focused, the host owns its DOM text (model updates flow
// host → model); the engine repaint happens on focus leave / history only.
import { computed, ref } from 'vue'
import type { BlockHostController } from '../engine/host-controller'

const props = defineProps<{ controller: BlockHostController; blockKind: string }>()

const el = ref<HTMLElement | null>(null)
const initialText = computed(() => props.controller.text)

function onInput(): void {
  props.controller.onInput(el.value?.textContent ?? '')
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

function onCompositionStart(): void {
  props.controller.compositionBegin(props.controller.text, caretOffset())
}

function onCompositionUpdate(e: CompositionEvent): void {
  props.controller.compositionUpdate(e.data ?? '')
}

function onCompositionEnd(e: CompositionEvent): void {
  props.controller.compositionCommit(el.value?.textContent ?? '')
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
