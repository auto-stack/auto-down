<!-- CodeBlockWidget component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { renderCodeHighlight, focusCodeArea, resizeCodeArea, syncCodeHighlight, nodeLanguage, nodeText, nodeLoading, ctxReadonly, ctxBlockId, codeController, htmlText, viewCodeInner, rootDataLanguage } from '../ext/code_block_widget_ext'


const props = defineProps<{
  mode: string
  node: any
  ctx: any
  final: boolean
}>()

const code_draft = ref<any>(nodeText(props.node))
const controller = ref<any>(codeController(props.ctx))

const hl = ref<HTMLElement | null>(null)
const area = ref<HTMLElement | null>(null)

const is_edit = computed<boolean>(() => props.mode === 'edit')
const language = computed<any>(() => nodeLanguage(props.node))
const code = computed<any>(() => nodeText(props.node))
const readonly = computed<any>(() => ctxReadonly(props.ctx))
const block_id = computed<any>(() => ctxBlockId(props.ctx))
const loading = computed<any>(() => nodeLoading(props.node))
const root_class = computed<any>(() => (is_edit.value ? 'autodown-codeblock-node' : (loading.value ? 'code-block-container rounded-lg border autodown-block-placeholder is-loading' : 'code-block-container rounded-lg border')))
const root_data_language = computed<any>(() => rootDataLanguage(props.mode, language.value))
const badge_label = computed<any>(() => (!(language.value) ? 'text' : language.value))
const badge_html = computed<any>(() => htmlText(badge_label.value))
const title_html = computed<any>(() => htmlText(language.value))
const pre_class = computed<string>(() => 'language-' + badge_label.value + ' code-pre-fallback is-wrap')
const aria_busy = computed<any>(() => (loading.value ? 'true' : 'false'))
const view_inner_html = computed<any>(() => viewCodeInner(code.value, language.value))
const highlight_html = computed<any>(() => renderCodeHighlight(code_draft.value, language.value))

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
  if (!readonly.value) {let c = controller.value;
  c.commit(e.target.value);
  }

  emit('Blur', e)
}

onMounted(() => {
  if (is_edit.value) {focusCodeArea(area.value!, readonly.value);
  syncCodeHighlight(area.value!, hl.value!);
  }
})


</script>

<template>
    <div :class="root_class" :data-language="root_data_language">
      <template v-if="is_edit">
        <button class="autodown-codeblock-language-badge" :data-codeblock-language-badge="''" v-html="badge_html" :title="'切换语言'" :type="'button'" />
        <div class="autodown-code-editor" :class="{ 'is-readonly': readonly }" :data-block-id="block_id" :data-node-type="'Fence'">
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
      <template v-if="! is_edit">
        <div class="code-block-header flex justify-between items-center">
          <div class="code-header-main">
            <div class="code-header-copy">
              <div class="code-header-title" v-html="title_html" />
            </div>
          </div>
          <div class="flex items-center gap-0.5" />
        </div>
        <pre :class="pre_class" :aria-busy="aria_busy" :data-language="language" v-html="view_inner_html" :tabindex="'0'" />
      </template>
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
