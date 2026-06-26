<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Pencil } from 'lucide-vue-next'
import type { NodeViewProps } from '@tiptap/vue-3'

const props = defineProps<NodeViewProps>()

interface WikiLinkAttrs {
  raw: string
  title: string
  blockId?: string | null
}

const attrs = computed<WikiLinkAttrs>(() => ({
  raw: (props.node.attrs.raw as string) || '[[Untitled]]',
  title: (props.node.attrs.title as string) || 'Untitled',
  blockId: (props.node.attrs.blockId as string | null | undefined) || null,
}))

const editing = ref(false)
const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const displayLabel = computed(() => {
  return attrs.value.blockId ? `${attrs.value.title}#${attrs.value.blockId}` : attrs.value.title
})

function parseRaw(raw: string): WikiLinkAttrs {
  const match = raw.match(/^\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?\]\]/)
  if (!match) {
    return { raw, title: raw }
  }
  return {
    raw,
    title: match[1].trim(),
    blockId: match[2]?.trim() || null,
  }
}

function startEdit() {
  inputValue.value = attrs.value.raw
  editing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function commit() {
  const value = inputValue.value.trim()
  if (!value) {
    cancel()
    return
  }
  const parsed = parseRaw(value)
  props.updateAttributes({
    raw: parsed.raw,
    title: parsed.title,
    blockId: parsed.blockId,
  })
  editing.value = false
}

function cancel() {
  editing.value = false
  inputValue.value = attrs.value.raw
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commit()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
  }
}

watch(() => attrs.value.raw, (newRaw) => {
  if (!editing.value) {
    inputValue.value = newRaw
  }
})
</script>

<template>
  <NodeViewWrapper
    as="span"
    class="autodown-wikilink-node"
    :class="{ 'is-editing': editing }"
  >
    <template v-if="!editing">
      <span class="autodown-wikilink-label" @click.stop="startEdit">
        {{ displayLabel }}
      </span>
      <span class="autodown-wikilink-edit" @click.stop="startEdit">
        <Pencil class="h-3 w-3" />
      </span>
    </template>
    <input
      v-else
      ref="inputRef"
      v-model="inputValue"
      type="text"
      class="autodown-wikilink-input"
      @keydown="onKeydown"
      @blur="commit"
      @click.stop
    >
  </NodeViewWrapper>
</template>

<style scoped>
.autodown-wikilink-node {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  vertical-align: middle;
  cursor: pointer;
  border-radius: 0.25rem;
  padding: 0 0.125rem;
  color: hsl(var(--primary, 238 55% 58%));
  background: hsl(var(--primary, 238 55% 58%) / 0.08);
  transition: background 0.15s ease;
}
.autodown-wikilink-node:hover {
  background: hsl(var(--primary, 238 55% 58%) / 0.14);
}

.autodown-wikilink-label {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.autodown-wikilink-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.autodown-wikilink-node:hover .autodown-wikilink-edit,
.autodown-wikilink-node.is-selected .autodown-wikilink-edit {
  opacity: 1;
}

.autodown-wikilink-input {
  width: auto;
  min-width: 8rem;
  font: inherit;
  color: inherit;
  background: hsl(var(--background, 0 0% 100%));
  border: 1px solid hsl(var(--ring, 238 55% 58%));
  border-radius: 0.25rem;
  padding: 0 0.25rem;
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--ring, 238 55% 58%) / 0.2);
}
</style>
