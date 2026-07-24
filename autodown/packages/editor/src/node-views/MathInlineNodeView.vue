<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'
import katex from 'katex'

const props = defineProps<NodeViewProps>()

const source = computed(() => props.node.attrs.source as string || '')
const html = ref('')
const error = ref<string | null>(null)

function render() {
  try {
    html.value = katex.renderToString(source.value, {
      throwOnError: true,
      displayMode: false,
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
    as="span"
    class="autodown-math-inline"
    data-math-inline
  >
    <span
      v-if="!error"
      class="autodown-math-inline-preview"
      v-html="html"
    />
    <span
      v-else
      class="autodown-math-inline-error"
      title="Math preview error"
    >
      ${{ source }}$
    </span>
  </NodeViewWrapper>
</template>

<style scoped>
.autodown-math-inline {
  display: inline;
}
.autodown-math-inline-preview {
  display: inline;
}
.autodown-math-inline-error {
  color: hsl(var(--destructive, 0 72% 51%));
  text-decoration: wavy underline;
}
</style>
