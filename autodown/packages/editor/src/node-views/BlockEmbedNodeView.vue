<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'

interface BlockInfo {
  uuid: string
  page_path: string
  block_id?: string
  kind: string
  content: string
  properties: Record<string, any>
  line_start: number
  line_end: number
}

const props = defineProps<NodeViewProps>()

const attrs = computed(() => ({
  raw: (props.node.attrs.raw as string) || '![[Untitled]]',
  title: (props.node.attrs.title as string) || 'Untitled',
  blockId: (props.node.attrs.blockId as string | null | undefined) || null,
}))

const block = ref<BlockInfo | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const displayLabel = computed(() => {
  return attrs.value.blockId ? `${attrs.value.title}#${attrs.value.blockId}` : attrs.value.title
})

async function load() {
  const id = attrs.value.blockId
  if (!id) return
  const loader = (props.extension.options as any)?.loadBlock
  if (typeof loader !== 'function') {
    error.value = 'No block loader configured'
    return
  }
  loading.value = true
  error.value = null
  try {
    const cleanId = id.startsWith('^') ? id.slice(1) : id
    const result = await loader(cleanId)
    block.value = result || null
    if (!result) error.value = 'Block not found'
  } catch (e: any) {
    error.value = e.message || String(e)
    block.value = null
  } finally {
    loading.value = false
  }
}

watch(() => attrs.value.blockId, load, { immediate: true })
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="autodown-block-embed"
    :data-title="attrs.title"
    :data-block-id="attrs.blockId || undefined"
  >
    <div v-if="loading" class="embed-state">Loading {{ displayLabel }}…</div>
    <div v-else-if="error" class="embed-state embed-error">{{ error }}</div>
    <template v-else-if="block">
      <div class="embed-header">
        <span class="embed-title">{{ displayLabel }}</span>
      </div>
      <div class="embed-content">{{ block.content }}</div>
    </template>
  </NodeViewWrapper>
</template>

<style scoped>
.autodown-block-embed {
  border: 1px solid hsl(var(--border, 220 13% 91%));
  border-radius: 0.375rem;
  background: hsl(var(--muted, 210 20% 96%));
  padding: 0.75rem;
  margin: 0.5rem 0;
}
.embed-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.embed-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: hsl(var(--primary, 238 55% 58%));
}
.embed-content {
  font-size: 0.875rem;
  color: hsl(var(--foreground, 224 64% 33%));
  white-space: pre-wrap;
}
.embed-state {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground, 220 9% 46%));
}
.embed-error {
  color: hsl(var(--destructive, 0 72% 51%));
}
</style>
