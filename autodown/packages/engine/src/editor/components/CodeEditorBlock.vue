<!-- CodeEditorBlock component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { focusCodeArea, resizeCodeArea, renderCodeHighlight, syncCodeHighlight } from '../ext/code_editor_block_ext'


const props = defineProps<{
  controller: any
  blockId: string
  language: string
  code: string
  readonly: boolean
}>()

const code_draft = ref<string>(props.code)

const hl = ref<HTMLElement | null>(null)
const area = ref<HTMLElement | null>(null)

const highlight_html = computed<any>(() => renderCodeHighlight(code_draft.value, props.language))

const emit = defineEmits<{
  Init: []
  AreaInput: [any]
  AreaScroll: [any]
  Blur: [any]
}>()

function AreaInput(e: any): void {
  resizeCodeArea(e.target);
  syncCodeHighlight(e.target, hl.value!);

  emit('AreaInput', e)
}

function AreaScroll(e: any): void {
  syncCodeHighlight(e.target, hl.value!);

  emit('AreaScroll', e)
}

function Blur(e: any): void {
  if (!props.readonly) {let c = props.controller;
  c.commit(e.target.value);
  }

  emit('Blur', e)
}

onMounted(() => {
  focusCodeArea(area.value!, props.readonly);
  syncCodeHighlight(area.value!, hl.value!);
})


</script>

<template>
    <div class="autodown-code-editor" :class="{ 'is-readonly': readonly }" :data-block-id="blockId" :data-node-type="'Fence'">
      <template v-if="readonly">
        <div class="autodown-stream-banner">
          <span>流式生成中</span>
        </div>
      </template>
      <div class="code-block-header flex justify-between items-center">
        <div class="code-header-main">
          <div class="code-header-copy">
            <div class="code-header-title">
              <span>{{ language }}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-0.5" />
      </div>
      <div class="code-editor-stack">
        <pre class="code-editor-highlight" :aria-hidden="'true'" v-html="highlight_html" ref="hl" />
        <textarea class="code-editor-textarea" :disabled="readonly" ref="area" :spellcheck="'false'" v-model="code_draft" @blur="Blur($event)" @input="AreaInput($event)" @scroll="AreaScroll($event)" />
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>

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
        .autodown-stream-banner {
          padding: 0.3rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 500;
          color: #92400e;
          background: #fef3c7;
          border-bottom: 1px solid #fcd34d;
          user-select: none;
        }
        .code-editor-stack {
          position: relative;
        }
        .code-editor-highlight {
          position: absolute;
          inset: 0;
          margin: 0;
          box-sizing: border-box;
          padding: 0.6rem 0.75rem;
          border: none;
          overflow: hidden;
          pointer-events: none;
          background: transparent;
          color: #111827;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.88rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
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
          /* overlay plan 024 P4T1: the highlight pre below shows the text;
             the caret stays visible via caret-color */
          color: transparent;
          caret-color: #111827;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.88rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .code-editor-textarea:disabled {
          cursor: not-allowed;
        }
    </style>
