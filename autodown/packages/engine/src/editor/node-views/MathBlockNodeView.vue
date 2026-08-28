<!-- MathBlockNodeView component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NodeViewContent } from '../ext/node_view_ext'
import { NodeViewWrapper } from '../ext/node_view_ext'
import { renderKatexPreview } from '../ext/node_view_ext'


const html = ref<string>('')
const error_text = ref<string>('')

const source = computed<any>(() => props.node.textContent || '')
const code_tag = computed<string>(() => 'code')
const show_preview = computed<boolean>(() => !(error_text.value))
const show_error = computed<boolean>(() => !!(error_text.value))

const props = defineProps<{
  node: any
  editor: any
  updateAttributes: any
  selected: boolean
  extension: any
  getPos: any
  deleteNode: any
  decorations: any[]
}>()

const emit = defineEmits<{
  Init: []
}>()

watch(source, () => {
  let result = renderKatexPreview(source.value, true);
  html.value = result.html;
  error_text.value = result.error;
})

onMounted(() => {

  let result = renderKatexPreview(source.value, true);
  html.value = result.html;
  error_text.value = result.error;
})


</script>

<template>
    <NodeViewWrapper :as="'div'" :class="'autodown-math-block'" :data-math-block="''" :key="'NodeViewWrapper-1'">
      <template v-if="show_preview">
        <div class="autodown-math-preview" v-html="html" />
      </template>
      <template v-if="show_error">
        <div class="autodown-math-error" :title="'Math preview error'">
          <span>{{ error_text }}</span>
        </div>
      </template>
      <NodeViewContent :as="'pre'" :class="'math-block-source'" :key="'NodeViewContent-2'">
        <component :is="(code_tag) as any" />
      </NodeViewContent>
    </NodeViewWrapper>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        .autodown-math-block {
          border: 1px solid hsl(var(--border, 220 13% 91%));
          border-radius: 0.375rem;
          background: hsl(var(--card, 0 0% 100%));
          overflow: hidden;
        }
        .autodown-math-preview {
          padding: 0.75rem 1rem;
          overflow-x: auto;
        }
        .autodown-math-preview :deep(.katex-display) {
          margin: 0;
        }
        .autodown-math-error {
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          color: hsl(var(--destructive, 0 72% 51%));
          background: hsl(var(--destructive/10, 0 72% 51% / 0.1));
        }
        .math-block-source {
          margin: 0;
          border-top: 1px solid hsl(var(--border, 220 13% 91%));
          border-radius: 0;
          background: hsl(var(--muted, 210 20% 96%));
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground, 220 9% 46%));
          white-space: pre-wrap;
        }
    </style>
