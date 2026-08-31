<!-- MermaidEditBlock component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { scheduleMermaidRender, focusCodeArea, textareaRows } from '../ext/mermaid_edit_ext'


const props = defineProps<{
  controller: any
  blockId: string
  source: string
  readonly: boolean
}>()

const draft = ref<string>(props.source)
const svg = ref<string>('')
const error_text = ref<string>('')
const loading = ref<boolean>(false)

const area = ref<HTMLElement | null>(null)

const show_preview = computed<boolean>(() => loading.value === false && !(error_text.value) && !!(svg.value))
const show_error = computed<boolean>(() => loading.value === false && !!(error_text.value))
const rows_value = computed<any>(() => textareaRows(draft.value))

const emit = defineEmits<{
  Init: []
  AreaInput: [any]
  Blur: [any]
}>()

function AreaInput(e: any): void {
  draft.value = e.target.value;
  loading.value = true;
  scheduleMermaidRender(draft.value, (res: any) => { svg.value = res.svg;
  error_text.value = res.error;
  loading.value = res.loading;
   });

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
  loading.value = true;
  scheduleMermaidRender(props.source, (res: any) => { svg.value = res.svg;
  error_text.value = res.error;
  loading.value = res.loading;
   });
})


</script>

<template>
    <div class="autodown-mermaid-editor" :class="{ 'is-readonly': readonly }" :data-block-id="blockId" :data-node-type="'Mermaid'">
      <template v-if="readonly">
        <div class="autodown-stream-banner">
          <span>流式生成中</span>
        </div>
      </template>
      <div class="mermaid-editor-stack">
        <template v-if="show_preview">
          <div class="autodown-mermaid-preview" v-html="svg" />
        </template>
        <template v-if="show_error">
          <div class="autodown-mermaid-error" :title="'Mermaid render error'">
            <span>{{ error_text }}</span>
          </div>
        </template>
        <template v-if="loading">
          <div class="mermaid-editor-loading">
            <span>渲染中…</span>
          </div>
        </template>
        <textarea class="mermaid-editor-textarea" :disabled="readonly" ref="area" :rows="rows_value" :spellcheck="'false'" v-model="draft" @blur="Blur($event)" @input="AreaInput($event)" />
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        .autodown-mermaid-editor {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f8f9fa;
          overflow: hidden;
        }
        .autodown-mermaid-editor.is-readonly {
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
        .mermaid-editor-stack {
          display: flex;
          flex-direction: column;
        }
        .autodown-mermaid-preview {
          padding: 0.75rem 1rem;
          overflow-x: auto;
          border-bottom: 1px solid #e5e7eb;
          background: #ffffff;
        }
        .autodown-mermaid-preview :deep(svg) {
          margin: 0 auto;
          display: block;
          max-width: 100%;
        }
        .autodown-mermaid-error {
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          color: hsl(var(--destructive, 0 72% 51%));
          background: hsl(var(--destructive/10, 0 72% 51% / 0.1));
          border-bottom: 1px solid #e5e7eb;
        }
        .mermaid-editor-loading {
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground, 220 9% 46%));
          background: hsl(var(--muted, 210 20% 96%));
          border-bottom: 1px solid #e5e7eb;
          user-select: none;
        }
        .mermaid-editor-textarea {
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
        .mermaid-editor-textarea:disabled {
          cursor: not-allowed;
        }
    </style>
