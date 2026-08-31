<!-- AttrHost (plan 030 T7) — attr read/write host for container blocks. -->
<template>
  <span
    ref="el"
    class="autodown-attr-host"
    :class="hostClass"
    :data-placeholder="placeholder"
    :contenteditable="readonly ? 'false' : 'true'"
    :spellcheck="false"
    @keydown="onKeydown"
    @blur="commit"
  />
</template>

<script setup lang="ts">
// The Details-summary / Callout-title in-place editor (plan 030's attr-host
// ruling): unlike BlockHost this carries NO inlines/split-block semantics —
// a plain contenteditable bound to one block attr. Mounted value comes from
// the model; blur writes back through setBlockAttrs (ONE undo step, the
// 023 command protocol); Enter/Escape simply blur (commit). The parent's
// repaint version re-syncs the text when the model changed elsewhere (undo,
// checkbox flips) — never while focused, so the user's caret is never
// clobbered mid-edit. Layout classes come from the caller: the host aligns
// with the node-view element it replaces (CSS single-channel).
import { onMounted, ref, watch } from 'vue'
import { Value, attrGetStr, findBlock } from '../../parser/block-model'
import { setBlockAttrs } from '../engine/commands'
import type { EditorEngine } from '../engine/editor-engine'

const props = defineProps<{
  blockId: string
  attrKey: string
  engine: EditorEngine
  placeholder?: string
  hostClass?: string
  /** parent repaint version — model-side sync trigger (skipped while focused) */
  version?: number
  /** stream→edit v1 gate: render read-only while streaming */
  readonly?: boolean
}>()

const el = ref<HTMLElement | null>(null)

function modelValue(): string {
  const found = findBlock(props.engine.doc, props.blockId)
  return found ? attrGetStr(found.attrs, props.attrKey, '') : ''
}

onMounted(() => {
  if (el.value) el.value.textContent = modelValue()
})

watch(
  () => props.version,
  () => {
    if (el.value && document.activeElement !== el.value) el.value.textContent = modelValue()
  },
)

function commit(): void {
  if (props.readonly) return
  // nbsp from contentediting normalizes back to a plain space
  const text = (el.value?.textContent ?? '').replace(/\u00a0/g, ' ').trim()
  if (text === modelValue()) return
  setBlockAttrs(props.engine, props.blockId, [{ key: props.attrKey, value: Value.Str(text) }])
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === 'Escape') {
    e.preventDefault()
    el.value?.blur()
  }
}
</script>
