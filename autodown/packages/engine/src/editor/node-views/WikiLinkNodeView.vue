<!-- WikiLinkNodeView component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NodeViewWrapper } from '../ext/node_view_ext'
import { nextTick } from 'vue'
import { parseWikiLinkRaw, wikiLinkPencilIcon, focusAndSelect } from '../ext/node_view_ext'


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

const editing = ref<boolean>(false)
const input_value = ref<string>('')

const inputEl = ref<HTMLElement | null>(null)

const attr_raw = computed<any>(() => props.node.attrs.raw || '[[Untitled]]')
const attr_title = computed<any>(() => props.node.attrs.title || 'Untitled')
const attr_block_id = computed<any>(() => props.node.attrs.blockId || null)
const display_label = computed<any>(() => (attr_block_id.value ? attr_title.value + '#' + attr_block_id.value : attr_title.value))
const open_title = computed<string>(() => 'Open ' + display_label.value || 'Open')
const pencil_icon = computed<any>(() => wikiLinkPencilIcon())
const wrapper_class = computed<any>(() => editing.value && 'autodown-wikilink-node is-editing' || 'autodown-wikilink-node')

const emit = defineEmits<{
  StartEdit: []
  OpenLink: []
  Commit: []
  Cancel: []
  OnKeydown: [any]
  InputInput: [any]
  Noop: [any]
}>()

watch(attr_raw, () => {
  if (!editing.value) {input_value.value = attr_raw.value;
  }
})

function Cancel(): void {
  editing.value = false;
  input_value.value = attr_raw.value;
}

function Commit(): void {
  let update_attributes = props.updateAttributes;
  let value = input_value.value.trim();
  if (value == '') {
  editing.value = false;
  input_value.value = attr_raw.value;
  }
  if (value != '') {let parsed = parseWikiLinkRaw(value);
  update_attributes({ raw: parsed.raw, title: parsed.title, blockId: parsed.blockId });
  editing.value = false;
  }

  emit('Commit')
}

function InputInput(e: any): void {
  input_value.value = e.target.value;

  emit('InputInput', e)
}

function Noop(e: any): void {

  emit('Noop', e)
}

function OnKeydown(e: any): void {
  if (e.key == 'Enter') {e.preventDefault();


  let update_attributes = props.updateAttributes;
  let value = input_value.value.trim();
  if (value == '') {editing.value = false;
  input_value.value = attr_raw.value;
  }if (value != '') {let parsed = parseWikiLinkRaw(value);
  update_attributes({ raw: parsed.raw, title: parsed.title, blockId: parsed.blockId });
  editing.value = false;
  }}
  if (e.key == 'Escape') {e.preventDefault();

  editing.value = false;
  input_value.value = attr_raw.value;
  }

  emit('OnKeydown', e)
}

function OpenLink(): void {


  let handler = null;
  let opts = props.extension.options;
  if (opts != null) {handler = opts.openWikiLink;
  }
  if (handler != null) {handler(attr_title.value, attr_block_id.value || null);
  }
  if (handler == null) {
  input_value.value = attr_raw.value;
  editing.value = true;
  nextTick(() => { focusAndSelect(inputEl.value!);
   });
  }

  emit('OpenLink')
}

function StartEdit(): void {
  input_value.value = attr_raw.value;
  editing.value = true;
  nextTick(() => { focusAndSelect(inputEl.value!);
   });

  emit('StartEdit')
}


</script>

<template>
    <NodeViewWrapper :as="'span'" :class="wrapper_class" :key="'NodeViewWrapper-1'">
      <template v-if="! editing">
        <span class="autodown-wikilink-label" :title="open_title" @click.stop="OpenLink">
          <span>{{ display_label }}</span>
        </span>
      </template>
      <template v-if="! editing">
        <span class="autodown-wikilink-edit" :title="'Edit link'" @click.stop="StartEdit">
          <component :is="(pencil_icon) as any" class="h-3 w-3" />
        </span>
      </template>
      <template v-if="editing">
        <input class="autodown-wikilink-input" ref="inputEl" :type="'text'" v-model="input_value" @blur="Commit" @click.stop="Noop($event)" @input="InputInput($event)" @keydown="OnKeydown($event)" />
      </template>
    </NodeViewWrapper>

</template>

<style>
/* Component styles */

</style>

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
