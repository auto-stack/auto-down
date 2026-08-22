<script setup lang="ts">
import { computed } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { rust } from '@codemirror/lang-rust'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import { json } from '@codemirror/lang-json'

const props = defineProps({
  modelValue: { type: String, default: '' },
  lang: { type: String, default: 'none' },
  lineNumbers: { type: Boolean, default: true },
  wrap: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const extensions = computed(() => {
  const langs: Record<string, () => Extension> = {
    rust: rust,
    rs: rust,
    python: python,
    py: python,
    javascript: javascript,
    js: javascript,
    typescript: javascript,
    ts: javascript,
    markdown: markdown,
    md: markdown,
    json: json,
  }
  const ext: Extension[] = []
  const langFn = langs[props.lang.toLowerCase()]
  if (langFn) {
    ext.push(langFn())
  }
  if (props.wrap) {
    ext.push(EditorView.lineWrapping)
  }
  return ext
})

const on_change = (value: string) => {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="code-editor-shell w-full h-full min-h-16 rounded-md border overflow-hidden">
    <Codemirror
      :model-value="modelValue"
      :extensions="extensions"
      :style="{ height: '100%' }"
      @update:model-value="on_change"
    />
  </div>
</template>
