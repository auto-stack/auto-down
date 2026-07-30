<template>
  <NodeViewWrapper class="autodown-details" :data-open="isOpen">
    <div class="autodown-details-summary">
      <span
        class="autodown-details-marker"
        aria-hidden="true"
        title="点击展开详细内容"
        @click.stop="toggleOpen"
      >
        {{ isOpen ? '▼' : '▶' }}
      </span>
      <span
        v-if="!editingSummary"
        class="autodown-details-summary-text"
        @click.stop="toggleOpen"
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
      <button
        v-if="!editingSummary"
        type="button"
        class="autodown-details-edit-btn"
        aria-label="编辑摘要"
        title="编辑摘要"
        @click.stop="startEditingSummary"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>
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
