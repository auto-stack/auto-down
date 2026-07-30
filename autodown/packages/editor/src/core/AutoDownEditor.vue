<script setup lang="ts">
// AutoDownEditor.vue — thin hand-written shell around the Auto-generated
// AutoDownEditorInner (src/auto/src/front/auto_down_editor.at →
// src/core/AutoDownEditorInner.vue; the original fully hand-written
// version is kept as src/core/AutoDownEditor.vue.bak). The shell owns the
// parts of the public contract the Auto widget DSL cannot express:
//
// 1. Emit names — DSL component events are PascalCase-only, so the inner
//    reports through callback props (updateCb/blurCb/focusCb/linkClickCb/
//    openWikiLinkCb/editorReadyCb — bridge-originated) and the two
//    view-originated component events (@SaveRequest/@Cancel); the shell
//    re-emits the contractual lowercase/hyphenated names (update, save,
//    cancel, blur, focus, link-click, open-wiki-link).
// 2. defineExpose — the DSL has no expose support; demo/jade-garden
//    consume editorRef.value.getBlockMap() and .$el.
// 3. Slots — the DSL has no slot support, so the save-label/cancel-label
//    slots are passed to the inner as functional components (rendered via
//    `dyn`), each falling back to the label prop text exactly like the
//    original's `<slot name="...">{{ label }}</slot>`.
// 4. Prop defaults — generated prop defaults are not applied at runtime,
//    so the original's withDefaults lives here and arrives at the inner
//    resolved via v-bind="$props".
//
// The editor instance is created INSIDE the inner component (tiptap's
// useEditor must register its lifecycle hooks in the owner's setup) and
// reported back through editorReadyCb; the shell stores it and passes it
// straight back down as the `editor` prop that gates the menus.
import { computed, shallowRef, useSlots } from 'vue'
import type { Editor } from '@tiptap/core'
import { appendTableIAL } from '../extensions/tableAttributes'
import { getBlockMap } from '../extensions/BlockId'
import AutoDownEditorInner from './AutoDownEditorInner.vue'
import type { SlashItem } from '../menus/slashItem'

const props = withDefaults(defineProps<{
  content: string
  placeholder?: string
  canEdit?: boolean
  autofocus?: boolean
  showActions?: boolean
  saveLabel?: string
  cancelLabel?: string
  imageUrlPrompt?: string
  linkUrlPrompt?: string
  pageTitle?: string
  onOpenWikiLink?: (title: string, blockId?: string | null) => void
  loadBlock?: (id: string) => Promise<any | null>
  extraSlashItems?: SlashItem[]
  onAssetUpload?: (file: File) => Promise<string>
  taskWorkflow?: 'todo' | 'now'
  runQuery?: (q: string) => Promise<any>
}>(), {
  canEdit: true,
  autofocus: false,
  showActions: true,
  saveLabel: 'Save',
  cancelLabel: 'Cancel',
  imageUrlPrompt: 'Enter image URL',
  linkUrlPrompt: 'Enter URL',
})

const emit = defineEmits<{
  update: [markdown: string]
  save: [markdown: string]
  cancel: []
  blur: []
  focus: []
  'link-click': [id: string]
  'open-wiki-link': [title: string, blockId?: string | null]
}>()

const slots = useSlots()

const editor = shallowRef<Editor>()

// Same semantics as the original's computed over the useEditor ref (it
// re-evaluates only when the editor instance identity changes — tiptap's
// isFocused is not Vue-reactive).
const focused = computed(() => editor.value?.isFocused ?? false)

// Slot bridge: a functional component per label, rendered by the inner
// via `dyn`. Returns the slot's VNodes when the caller provided the slot,
// the (defaulted) label text otherwise — identical rendered DOM to the
// original's slot-with-fallback.
const saveLabelRender = () => slots['save-label']?.() ?? props.saveLabel
const cancelLabelRender = () => slots['cancel-label']?.() ?? props.cancelLabel

function onEditorReady(instance: Editor) {
  editor.value = instance
}

function handleSave() {
  if (editor.value) {
    const md = editor.value.getMarkdown()
    const mdWithIAL = appendTableIAL(md, editor.value)
    emit('save', mdWithIAL)
  }
}

defineExpose({
  editor,
  handleSave,
  getBlockMap: () => getBlockMap(editor.value),
})
</script>

<template>
  <AutoDownEditorInner
    v-bind="$props"
    :editor="editor"
    :focused="focused"
    :save-label-render="saveLabelRender"
    :cancel-label-render="cancelLabelRender"
    :update-cb="(md: string) => emit('update', md)"
    :blur-cb="() => emit('blur')"
    :focus-cb="() => emit('focus')"
    :link-click-cb="(id: string) => emit('link-click', id)"
    :open-wiki-link-cb="(title: string, blockId?: string | null) => emit('open-wiki-link', title, blockId)"
    :editor-ready-cb="onEditorReady"
    @SaveRequest="handleSave"
    @Cancel="emit('cancel')"
  />
</template>
