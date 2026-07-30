<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'
import katex from 'katex'

const props = defineProps<NodeViewProps>()

const source = computed(() => props.node.textContent || '')
const html = ref('')
const error = ref<string | null>(null)

function render() {
  try {
    html.value = katex.renderToString(source.value, {
      throwOnError: true,
      displayMode: true,
    })
    error.value = null
  } catch (e: any) {
    error.value = e.message || String(e)
    html.value = ''
  }
}

watch(() => source.value, render, { immediate: true })
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="autodown-math-block"
    data-math-block
  >
    <div
      v-if="!error"
      class="autodown-math-preview"
      v-html="html"
    />
    <div
      v-else
      class="autodown-math-error"
      title="Math preview error"
    >
      {{ error }}
    </div>
    <NodeViewContent as="pre" class="math-block-source"><code /></NodeViewContent>
  </NodeViewWrapper>
</template>

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
