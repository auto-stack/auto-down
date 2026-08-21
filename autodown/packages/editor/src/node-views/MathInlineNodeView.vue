<!-- MathInlineNodeView component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NodeViewWrapper } from '../auto/src/front/utils/node_view_ext'
import { renderKatexPreview } from '../auto/src/front/utils/node_view_ext'


const html = ref<string>('')
const error_text = ref<string>('')

const source = computed<any>(() => props.node.attrs.source || '')
const source_label = computed<string>(() => '$' + source.value + '$')
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
}>()

watch(source, () => {
  let result = renderKatexPreview(source.value, false);
  html.value = result.html;
  error_text.value = result.error;
})

onMounted(() => {

  let result = renderKatexPreview(source.value, false);
  html.value = result.html;
  error_text.value = result.error;
})


</script>

<template>
    <NodeViewWrapper :as="'span'" :class="'autodown-math-inline'" :data-math-inline="''" :key="'NodeViewWrapper-1'">
      <template v-if="show_preview">
        <span class="autodown-math-inline-preview" v-html="html" />
      </template>
      <template v-if="show_error">
        <span class="autodown-math-inline-error" :title="'Math preview error'">
          <span>{{ source_label }}</span>
        </span>
      </template>
    </NodeViewWrapper>

</template>

<style>
/* Component styles */

</style>

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
