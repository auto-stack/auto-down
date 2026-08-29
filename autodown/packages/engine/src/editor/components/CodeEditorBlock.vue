<!-- CodeEditorBlock component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { focusCodeArea, resizeCodeArea } from '../ext/code_editor_block_ext'


const props = defineProps<{
  controller: any
  blockId: string
  language: string
  code: string
  readonly: boolean
}>()

const code_draft = ref<string>('')

const area = ref<HTMLElement | null>(null)

const emit = defineEmits<{
  Init: []
  AreaInput: [any]
  Blur: [any]
}>()

function AreaInput(e: any): void {
  resizeCodeArea(e.target);

  emit('AreaInput', e)
}

function Blur(e: any): void {
  if (!props.readonly) {let c = props.controller;
  c.commit(e.target.value);
  }

  emit('Blur', e)
}

onMounted(() => {






  code_draft.value = props.code;
  focusCodeArea(area.value!, props.readonly);
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
      <textarea class="code-editor-textarea" :disabled="readonly" ref="area" :spellcheck="'false'" v-model="code_draft" @blur="Blur($event)" @input="AreaInput($event)" />
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
