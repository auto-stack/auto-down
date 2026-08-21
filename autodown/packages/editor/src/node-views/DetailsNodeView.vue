<!-- DetailsNodeView component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NodeViewContent } from '../auto/src/front/utils/node_view_ext'
import { NodeViewWrapper } from '../auto/src/front/utils/node_view_ext'
import { detailsEditIcon, focusAndSelect } from '../auto/src/front/utils/node_view_ext'
import { nextTick } from 'vue'


const editing_summary = ref<boolean>(false)
const summary_draft = ref<string>('')

const summaryInput = ref<HTMLElement | null>(null)

const is_open = computed<any>(() => props.node.attrs.open && true || false)
const summary = computed<any>(() => props.node.attrs.summary || 'Details')
const marker = computed<any>(() => (is_open.value ? '▼' : '▶'))
const edit_icon = computed<any>(() => detailsEditIcon())
const selected_state = computed<boolean>(() => props.selected)

const props = defineProps<{
  node: any
  updateAttributes: any
  editor: any
  selected: boolean
  extension: any
  getPos: any
  deleteNode: any
}>()

const emit = defineEmits<{
  ToggleOpen: []
  StartEditingSummary: []
  CommitSummary: []
  CancelSummary: []
  SummaryInput: [any]
  Noop: [any]
}>()

watch(selected_state, () => {
  if (!props.selected && editing_summary.value) {let update_attributes = props.updateAttributes;
  let value = summary_draft.value.trim();
  if (value != '') {update_attributes({ summary: value });
  }editing_summary.value = false;
  }
})

function SummaryInput(e: any): void {
  summary_draft.value = e.target.value;

  emit('SummaryInput', e)
}

function ToggleOpen(): void {
  let update_attributes = props.updateAttributes;
  update_attributes({ open: !is_open.value });

  emit('ToggleOpen')
}

function StartEditingSummary(): void {
  summary_draft.value = summary.value;
  editing_summary.value = true;
  nextTick(() => { focusAndSelect(summaryInput.value!);
   });

  emit('StartEditingSummary')
}

function CommitSummary(): void {
  let update_attributes = props.updateAttributes;
  let value = summary_draft.value.trim();
  if (value != '') {update_attributes({ summary: value });
  }
  editing_summary.value = false;

  emit('CommitSummary')
}

function CancelSummary(): void {
  editing_summary.value = false;

  emit('CancelSummary')
}

function Noop(e: any): void {

  emit('Noop', e)
}


</script>

<template>
    <NodeViewWrapper :data-open="is_open" :class="'autodown-details'" :key="'NodeViewWrapper-1'">
      <div class="autodown-details-summary">
        <span class="autodown-details-marker" :aria-hidden="'true'" :title="'点击展开详细内容'" @click.stop="ToggleOpen">
          <span>{{ marker }}</span>
        </span>
        <template v-if="! editing_summary">
          <span class="autodown-details-summary-text" @click.stop="ToggleOpen">
            <span>{{ summary }}</span>
          </span>
        </template>
        <template v-if="editing_summary">
          <input class="autodown-details-summary-input" ref="summaryInput" :type="'text'" v-model="summary_draft" @click.stop="Noop($event)" @input="SummaryInput($event)" @keydown.enter.prevent="CommitSummary" @blur="CommitSummary" @keydown.esc.prevent="CancelSummary" />
        </template>
        <template v-if="! editing_summary">
          <button class="autodown-details-edit-btn" :aria-label="'编辑摘要'" :title="'编辑摘要'" :type="'button'" @click.stop="StartEditingSummary">
            <component :is="(edit_icon) as any" />
          </button>
        </template>
      </div>
      <NodeViewContent :as="'div'" v-show="is_open" :class="'autodown-details-content'" :key="'NodeViewContent-2'" />
    </NodeViewWrapper>

</template>

<style>
/* Component styles */

</style>
