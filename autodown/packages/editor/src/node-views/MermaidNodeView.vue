<!-- MermaidNodeView component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NodeViewContent } from '../auto/src/front/utils/node_view_ext'
import { NodeViewWrapper } from '../auto/src/front/utils/node_view_ext'
import { renderMermaidPreview, strOr } from '../auto/src/front/utils/node_view_ext'


const svg = ref<string>('')
const error_text = ref<string>('')

const source = computed<any>(() => strOr(props.node.textContent, ''))
const code_tag = computed<string>(() => 'code')
const show_preview = computed<boolean>(() => !!(svg.value))
const show_error = computed<boolean>(() => !(svg.value) && !!(error_text.value))

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
  if (source.value.trim() == '') {svg.value = '';
  error_text.value = '';
  }
  if (source.value.trim() != '') {let p = renderMermaidPreview(source.value);



  p.then((res: any) => { svg.value = res.svg;
  error_text.value = res.error;
   });
  }
})

onMounted(() => {


  if (source.value.trim() == '') {svg.value = '';
  error_text.value = '';
  }
  if (source.value.trim() != '') {let p = renderMermaidPreview(source.value);
  p.then((res: any) => { svg.value = res.svg;
  error_text.value = res.error;
   });
  }
})


</script>

<template>
    <NodeViewWrapper :class="'autodown-mermaid-block'" :as="'div'" :data-mermaid-block="''" :key="'NodeViewWrapper-1'">
      <template v-if="show_preview">
        <div class="autodown-mermaid-preview" v-html="svg" />
      </template>
      <template v-if="show_error">
        <div class="autodown-mermaid-error" :title="'Mermaid render error'">
          <span>{{ error_text }}</span>
        </div>
      </template>
      <NodeViewContent :as="'pre'" :class="'mermaid-source'" :key="'NodeViewContent-2'">
        <component :is="(code_tag) as any" />
      </NodeViewContent>
    </NodeViewWrapper>

</template>

<style>
/* Component styles */

</style>

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
