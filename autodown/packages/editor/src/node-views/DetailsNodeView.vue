<template>
  <NodeViewWrapper class="autodown-details" :data-open="isOpen">
    <div class="autodown-details-summary" @click="toggleOpen">
      <span class="autodown-details-marker" aria-hidden="true">{{ isOpen ? '▼' : '▶' }}</span>
      <span
        v-if="!editingSummary"
        class="autodown-details-summary-text"
        @click.stop="startEditingSummary"
      >
        {{ summary }}
      </span>
      <input
        v-else
        ref="summaryInput"
        v-model="summaryDraft"
        class="autodown-details-summary-input"
        type="text"
        @blur="commitSummary"
        @keydown.enter.prevent="commitSummary"
        @keydown.esc.prevent="cancelSummary"
        @click.stop
      />
    </div>
    <NodeViewContent
      v-show="isOpen"
      class="autodown-details-content"
      as="div"
    />
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-3'

const props = defineProps<{
  node: any
  updateAttributes: (attrs: Record<string, any>) => void
  editor: any
  selected: boolean
  extension: any
  getPos: () => number
  deleteNode: () => void
}>()

const isOpen = computed(() => Boolean(props.node.attrs.open))
const summary = computed(() => (props.node.attrs.summary as string) || 'Details')

function toggleOpen() {
  props.updateAttributes({ open: !isOpen.value })
}

const editingSummary = ref(false)
const summaryDraft = ref('')
const summaryInput = ref<HTMLInputElement>()

function startEditingSummary() {
  summaryDraft.value = summary.value
  editingSummary.value = true
  nextTick(() => {
    summaryInput.value?.focus()
    summaryInput.value?.select()
  })
}

function commitSummary() {
  const value = summaryDraft.value.trim()
  if (value) {
    props.updateAttributes({ summary: value })
  }
  editingSummary.value = false
}

function cancelSummary() {
  editingSummary.value = false
}

watch(
  () => props.selected,
  (selected) => {
    if (!selected && editingSummary.value) {
      commitSummary()
    }
  }
)
</script>
