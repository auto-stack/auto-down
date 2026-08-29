<template>
  <div
    class="autodown-code-editor"
    :data-block-id="ctx.blockId"
    data-node-type="Fence"
    :class="{ 'is-readonly': ctx.readonly }"
  >
    <div v-if="ctx.readonly" class="autodown-stream-banner">流式生成中</div>
    <div class="code-block-header flex justify-between items-center">
      <div class="code-header-main">
        <div class="code-header-copy">
          <div class="code-header-title">{{ language }}</div>
        </div>
      </div>
      <div class="flex items-center gap-0.5"></div>
    </div>
    <textarea
      ref="area"
      class="code-editor-textarea"
      spellcheck="false"
      :disabled="ctx.readonly"
      @blur="onBlur"
      @input="autoresize"
    >{{ controller.code }}</textarea>
  </div>
</template>

<script setup lang="ts">
// CodeEditorBlock (plan 023 P1T4) — the typed editing face for code blocks:
// language title bar (code-block-header DOM contract, display-only in v1 —
// language changes stay on the code-block menu's IAL channel) over a
// multiline auto-resizing textarea. Host protocol preserved: while focused
// the textarea owns its text; blur commits the whole code back through
// CodeEditorController (one undo step).
import { computed, onMounted, ref } from 'vue'
import { attrGetStr } from '../../parser/block-model'
import type { BlockNode } from '../../parser/block-model'
import { CodeEditorController } from '../engine/code-editor-controller'
import type { BlockEditCtx } from '../../render/block-component'

const props = defineProps<{ node: BlockNode; ctx: BlockEditCtx }>()

const controller = new CodeEditorController(props.ctx.engine, props.ctx.blockId)
const area = ref<HTMLTextAreaElement | null>(null)

const language = computed(() => attrGetStr(props.node.attrs, 'language', ''))

// when the block mounts it IS the focused block — take focus with the caret
// at the end (BlockHost parity)
onMounted(() => {
  const el = area.value
  if (!el || props.ctx.readonly) return
  el.focus()
  const end = el.value.length
  el.setSelectionRange(end, end)
  autoresize()
})

function onBlur(): void {
  if (props.ctx.readonly) return
  controller.commit(area.value?.value ?? '')
}

function autoresize(): void {
  const el = area.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
</script>

<style scoped>
.autodown-code-editor {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8f9fa;
  overflow: hidden;
}

.autodown-code-editor.is-readonly {
  opacity: 0.75;
}

/* Streaming banner (plan 023 stream→edit v1: readonly while streaming) */
.autodown-stream-banner {
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #92400e;
  background: #fef3c7;
  border-bottom: 1px solid #fcd34d;
  user-select: none;
}

.code-editor-textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  min-height: 3rem;
  padding: 0.6rem 0.75rem;
  border: none;
  outline: none;
  resize: none;
  overflow: hidden;
  background: transparent;
  color: #111827;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.code-editor-textarea:disabled {
  cursor: not-allowed;
}
</style>
