<!-- BlockEmbedNodeView component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NodeViewWrapper } from '../auto/src/front/utils/node_view_ext'
import { errorMessage } from '../auto/src/front/utils/node_view_ext'


const block = ref<any>(null)
const loading = ref<boolean>(false)
const error_text = ref<string>('')

const attr_raw = computed<any>(() => props.node.attrs.raw || '![[Untitled]]')
const attr_title = computed<any>(() => props.node.attrs.title || 'Untitled')
const attr_block_id = computed<any>(() => props.node.attrs.blockId || null)
const display_label = computed<any>(() => (attr_block_id.value ? attr_title.value + '#' + attr_block_id.value : attr_title.value))
const loading_text = computed<string>(() => 'Loading ' + display_label.value + '…' || 'Loading…')
const block_content = computed<any>(() => block.value && block.value.content || '')
const show_loading = computed<boolean>(() => loading.value)
const show_error = computed<boolean>(() => !loading.value && !!(error_text.value))
const show_block = computed<any>(() => !loading.value && !(error_text.value) && block.value)

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

watch(attr_block_id, async () => {
  let id = attr_block_id.value;

  if (id != null) {let loader = null;
  let opts = props.extension.options;
  if (opts != null) {loader = opts.loadBlock;
  }if (loader == null) {error_text.value = 'No block loader configured';
  }if (loader != null) {loading.value = true;
  error_text.value = '';

  let clean_id = id;
  if (id.startsWith('^')) {clean_id = id.substring(1);
  }

  try {let result = (await loader(clean_id));
  block.value = result;
  if (!result) {error_text.value = 'Block not found';
  }} catch (e) {error_text.value = errorMessage(e);
  block.value = null;
  } finally {loading.value = false;
  }
  }}
})

onMounted(async () => {


  let id = attr_block_id.value;
  if (id != null) {let loader = null;
  let opts = props.extension.options;
  if (opts != null) {loader = opts.loadBlock;
  }if (loader == null) {error_text.value = 'No block loader configured';
  }if (loader != null) {loading.value = true;
  error_text.value = '';
  let clean_id = id;
  if (id.startsWith('^')) {clean_id = id.substring(1);
  }

  try {let result = (await loader(clean_id));
  block.value = result;
  if (!result) {error_text.value = 'Block not found';
  }} catch (e) {error_text.value = errorMessage(e);
  block.value = null;
  } finally {loading.value = false;
  }
  }}
})


</script>

<template>
    <NodeViewWrapper :class="'autodown-block-embed'" :as="'div'" :data-title="attr_title" :data-block-id="attr_block_id" :key="'NodeViewWrapper-1'">
      <template v-if="show_loading">
        <div class="embed-state">
          <span>{{ loading_text }}</span>
        </div>
      </template>
      <template v-if="show_error">
        <div class="embed-state embed-error">
          <span>{{ error_text }}</span>
        </div>
      </template>
      <template v-if="show_block">
        <div class="embed-header">
          <span class="embed-title">
            <span>{{ display_label }}</span>
          </span>
        </div>
      </template>
      <template v-if="show_block">
        <div class="embed-content">
          <span>{{ block_content }}</span>
        </div>
      </template>
    </NodeViewWrapper>

</template>

<style>
/* Component styles */

</style>

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
