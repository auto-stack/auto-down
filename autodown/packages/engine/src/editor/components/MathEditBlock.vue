<!-- MathEditBlock component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { renderKatexPreview, focusCodeArea, textareaRows } from '../ext/math_edit_ext'


const props = defineProps<{
  controller: any
  blockId: string
  source: string
  readonly: boolean
}>()

const draft = ref<string>(props.source)

const area = ref<HTMLElement | null>(null)

const preview_html = computed<any>(() => renderKatexPreview(draft.value, true)?.html)
const error_text = computed<any>(() => renderKatexPreview(draft.value, true)?.error)
const show_preview = computed<boolean>(() => !(error_text.value))
const show_error = computed<boolean>(() => !!(error_text.value))
const rows_value = computed<any>(() => textareaRows(draft.value))

const emit = defineEmits<{
  Init: []
  AreaInput: [any]
  Blur: [any]
}>()

function AreaInput(e: any): void {
  draft.value = e.target.value;

  emit('AreaInput', e)
}

function Blur(e: any): void {
  if (!props.readonly) {let c = props.controller;
  c.commit(e.target.value);
  }

  emit('Blur', e)
}

onMounted(() => {
  focusCodeArea(area.value!, props.readonly);
})


</script>

<template>
    <div class="autodown-math-editor" :class="{ 'is-readonly': readonly }" :data-block-id="blockId" :data-node-type="'MathBlock'">
      <template v-if="readonly">
        <div class="autodown-stream-banner">
          <span>流式生成中</span>
        </div>
      </template>
      <div class="math-editor-stack">
        <template v-if="show_preview">
          <div class="autodown-math-preview" v-html="preview_html" />
        </template>
        <template v-if="show_error">
          <div class="autodown-math-error" :title="'Math preview error'">
            <span>{{ error_text }}</span>
          </div>
        </template>
        <textarea class="math-editor-textarea" :disabled="readonly" ref="area" :rows="rows_value" :spellcheck="'false'" v-model="draft" @blur="Blur($event)" @input="AreaInput($event)" />
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        .autodown-math-editor {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f8f9fa;
          overflow: hidden;
        }
        .autodown-math-editor.is-readonly {
          opacity: 0.75;
        }
        .autodown-stream-banner {
          padding: 0.3rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 500;
          color: #92400e;
          background: #fef3c7;
          border-bottom: 1px solid #fcd34d;
          user-select: none;
        }
        .math-editor-stack {
          display: flex;
          flex-direction: column;
        }
        .autodown-math-preview {
          padding: 0.75rem 1rem;
          overflow-x: auto;
          border-bottom: 1px solid #e5e7eb;
          background: #ffffff;
        }
        .autodown-math-preview :deep(.katex-display) {
          margin: 0;
        }
        .autodown-math-error {
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          color: hsl(var(--destructive, 0 72% 51%));
          background: hsl(var(--destructive/10, 0 72% 51% / 0.1));
          border-bottom: 1px solid #e5e7eb;
        }
        .math-editor-textarea {
          display: block;
          width: 100%;
          box-sizing: border-box;
          min-height: 3rem;
          max-height: 24rem;
          padding: 0.6rem 0.75rem;
          border: none;
          outline: none;
          resize: none;
          overflow: auto;
          background: transparent;
          color: #111827;
          caret-color: #111827;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.88rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .math-editor-textarea:disabled {
          cursor: not-allowed;
        }
    </style>
