<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'
import mermaid from 'mermaid'

const props = defineProps<NodeViewProps>()

const source = computed(() => props.node.textContent || '')
const svg = ref('')
const error = ref<string | null>(null)

mermaid.initialize({ startOnLoad: false, theme: 'default' })

async function render() {
  if (!source.value.trim()) {
    svg.value = ''
    error.value = null
    return
  }
  try {
    const id = `mermaid-${Math.random().toString(36).slice(2)}`
    const result = await mermaid.render(id, source.value)
    svg.value = result.svg
    error.value = null
  } catch (e: any) {
    error.value = e.message || String(e)
    svg.value = ''
  }
}

watch(() => source.value, render, { immediate: true })
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="autodown-mermaid-block"
    data-mermaid-block
  >
    <div
      v-if="svg"
      class="autodown-mermaid-preview"
      v-html="svg"
    />
    <div
      v-else-if="error"
      class="autodown-mermaid-error"
      title="Mermaid render error"
    >
      {{ error }}
    </div>
    <NodeViewContent as="pre" class="mermaid-source"><code /></NodeViewContent>
  </NodeViewWrapper>
</template>

<style scoped>
.autodown-mermaid-block {
  border: 1px solid hsl(var(--border, 220 13% 91%));
  border-radius: 0.375rem;
  background: hsl(var(--card, 0 0% 100%));
  overflow: hidden;
}
.autodown-mermaid-preview {
  padding: 0.75rem 1rem;
  overflow-x: auto;
}
.autodown-mermaid-preview :deep(svg) {
  margin: 0 auto;
  display: block;
}
.autodown-mermaid-error {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: hsl(var(--destructive, 0 72% 51%));
  background: hsl(var(--destructive/10, 0 72% 51% / 0.1));
}
.mermaid-source {
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
