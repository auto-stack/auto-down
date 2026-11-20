<template>
  <div ref="root" class="autodown-book" @pointerup="reportSelection" @keyup="reportSelection">
    <h2 v-if="projection?.title" class="autodown-book-title">{{ projection.title }}</h2>
    <div
      v-for="part in parts"
      :key="part.index"
      class="markdown-renderer"
      :data-book-block="part.index"
      :data-book-id="part.block.id || undefined"
    >
      <component v-for="(node, i) in part.nodes" :key="i" :is="node" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  locateBookSelection,
  locateBookTarget,
  parseBookChapter,
  projectBookChapter,
} from '../parser/book-reading'
import { parseDocument } from '../parser/markdown-parser'
import { renderNodes } from './render-node'

const props = defineProps<{
  source: string
  chapterId?: string
  cardId?: string
  targetId?: string
  final: boolean
}>()
const emit = defineEmits<{ bookselect: [payload: string] }>()
const root = ref<HTMLDivElement>()
const chapter = computed(() => parseBookChapter(props.source, props.chapterId ?? '', props.final))
const projection = computed(() => projectBookChapter(chapter.value, props.cardId ?? ''))
const parts = computed(() => {
  const view = projection.value
  if (!view) return []
  return chapter.value.blocks.flatMap((block, index) => {
    const start = Math.max(block.start, view.start)
    const end = Math.min(block.end, view.end)
    if (end <= start) return []
    const markdown = chapter.value.markdown.slice(start, end)
    return [{ block, index, nodes: renderNodes(parseDocument(markdown, props.final), props.final) }]
  })
})
const jumpPart = computed(() => {
  if (!props.targetId || !projection.value) return undefined
  const target = locateBookTarget(chapter.value, props.targetId)
  if (!target || target.start >= projection.value.end || target.end <= projection.value.start)
    return undefined
  return parts.value.find(({ block }) => block.start <= target.start && target.end <= block.end)?.index
})

watch([root, jumpPart, () => props.targetId, () => props.cardId], async () => {
  await nextTick()
  const index = jumpPart.value
  if (index !== undefined)
    root.value?.querySelector(`[data-book-block="${index}"]`)?.scrollIntoView?.({ block: 'nearest' })
}, { flush: 'post' })

function containerElement(node: Node) {
  return node.nodeType === 1 ? node as Element : node.parentElement
}

function rangeText(range: Range) {
  const contents = range.cloneContents()
  for (const lineBreak of contents.querySelectorAll('br')) lineBreak.replaceWith('\n')
  return contents.textContent ?? ''
}

function selectionPart(node: Node) {
  const part = containerElement(node)?.closest<HTMLElement>('[data-book-block]')
  return part && root.value?.contains(part) ? part : undefined
}

function reportSelection() {
  const selected = root.value?.ownerDocument.getSelection()
  const view = projection.value
  if (!view || !selected || selected.isCollapsed || selected.rangeCount !== 1) return
  const range = selected.getRangeAt(0)
  const part = selectionPart(range.startContainer)
  if (!part || selectionPart(range.endContainer) !== part) return
  const block = chapter.value.blocks[Number(part.dataset.bookBlock)]
  const paragraph = containerElement(range.startContainer)?.closest('p')
  if (!paragraph || !part.contains(paragraph) || !paragraph.contains(range.endContainer)) return
  const prefix = range.cloneRange()
  prefix.selectNodeContents(paragraph)
  prefix.setEnd(range.startContainer, range.startOffset)
  const text = rangeText(range)
  const start = rangeText(prefix).length
  const payload = locateBookSelection(chapter.value, view, block, start, start + text.length)
  if (payload?.text === text) emit('bookselect', JSON.stringify(payload))
}
</script>
