<!-- AutoDownEditor component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { BubbleMenu } from '../auto/src/front/utils/auto_down_editor_ext'
import { CodeBlockMenu } from '../auto/src/front/utils/auto_down_editor_ext'
import { EditorContent } from '../auto/src/front/utils/auto_down_editor_ext'
import { SlashMenu } from '../auto/src/front/utils/auto_down_editor_ext'
import { TableMenu } from '../auto/src/front/utils/auto_down_editor_ext'
import { normalizeAnchors, editorCheckIcon, editorXIcon, appendTableIAL, blockMapOf } from '../auto/src/front/utils/auto_down_editor_ext'
import { useAutoDownEditorBridge } from '../auto/src/front/utils/auto_down_editor_ext'

const autoDownEditorBridge = useAutoDownEditorBridge()


const getBlockMap = ref<any>(null)

const check_icon = computed<any>(() => editorCheckIcon())
const x_icon = computed<any>(() => editorXIcon())
const focused = computed<any>(() => (autoDownEditorBridge.editor != null ? autoDownEditorBridge.editor.isFocused : false))

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
  onOpenWikiLink?: any
  loadBlock?: any
  extraSlashItems?: any[]
  onAssetUpload?: any
  taskWorkflow?: string
  runQuery?: any
}>(), {
  placeholder: '',
  canEdit: true,
  autofocus: false,
  showActions: true,
  saveLabel: 'Save',
  cancelLabel: 'Cancel',
  imageUrlPrompt: 'Enter image URL',
  linkUrlPrompt: 'Enter URL',
  pageTitle: '',
  onOpenWikiLink: null,
  loadBlock: null,
  extraSlashItems: (null as any),
  onAssetUpload: null,
  taskWorkflow: '',
  runQuery: null,
})

const emit = defineEmits<{
  update: [string]
  save: [string]
  cancel: []
  blur: []
  focus: []
  'link-click': [string]
  'open-wiki-link': [string, any]
  handleSave: []
}>()

watch(() => props.content, () => {
  if (autoDownEditorBridge.editor != null) {let current = autoDownEditorBridge.editor.getMarkdown();
  if (normalizeAnchors(current) != normalizeAnchors(props.content)) {autoDownEditorBridge.editor.commands.setContent(props.content, { emitUpdate: false, contentType: 'markdown' });
  }}
})

watch(() => props.canEdit, () => {
  if (autoDownEditorBridge.editor != null) {autoDownEditorBridge.editor.setEditable(props.canEdit);
  }
})

function cancel(): void {

  emit('cancel')
}

function handleSave(): void {
  if (autoDownEditorBridge.editor != null) {let md = autoDownEditorBridge.editor.getMarkdown();
  let md_ial = appendTableIAL(md, autoDownEditorBridge.editor);





  save(md_ial);
  }

  emit('handleSave')
}

function save(md: any): void {

  emit('save', md)
}

onMounted(() => {


  getBlockMap.value = () => blockMapOf(autoDownEditorBridge.editor);
})

defineExpose({ handleSave, getBlockMap })

</script>

<template>
    <div class="autodown-editor" :class="{ 'is-focused': focused }">
      <EditorContent :class="'autodown-editor-content-wrapper'" :editor="autoDownEditorBridge.editor" :key="'EditorContent-1'" />
      <template v-if="autoDownEditorBridge.editor">
        <BubbleMenu :editor="autoDownEditorBridge.editor" :linkPrompt="linkUrlPrompt" :key="'BubbleMenu-2'" />
        <SlashMenu :editor="autoDownEditorBridge.editor" :items="autoDownEditorBridge.items" :key="'SlashMenu-3'" />
        <TableMenu :editor="autoDownEditorBridge.editor" :key="'TableMenu-4'" />
        <CodeBlockMenu :editor="autoDownEditorBridge.editor" :key="'CodeBlockMenu-5'" />
      </template>
      <template v-if="showActions">
        <div class="autodown-editor-actions">
          <button class="autodown-save-btn" @click="handleSave">
            <component :is="(check_icon) as any" :size="13" />
            <slot name="save-label">
              <span>{{ saveLabel }}</span>
            </slot>
          </button>
          <button class="autodown-cancel-btn" @click="cancel">
            <component :is="(x_icon) as any" :size="13" />
            <slot name="cancel-label">
              <span>{{ cancelLabel }}</span>
            </slot>
          </button>
        </div>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
