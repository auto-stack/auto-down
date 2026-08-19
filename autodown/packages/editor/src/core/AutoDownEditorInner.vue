<!-- AutoDownEditorInner component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed, watch } from 'vue'
import { BubbleMenu } from '../auto/src/front/utils/auto_down_editor_ext'
import { CodeBlockMenu } from '../auto/src/front/utils/auto_down_editor_ext'
import { EditorContent } from '../auto/src/front/utils/auto_down_editor_ext'
import { SlashMenu } from '../auto/src/front/utils/auto_down_editor_ext'
import { TableMenu } from '../auto/src/front/utils/auto_down_editor_ext'
import { normalizeAnchors, editorCheckIcon, editorXIcon } from '../auto/src/front/utils/auto_down_editor_ext'
import { useAutoDownEditorBridge } from '../auto/src/front/utils/auto_down_editor_ext'

const autoDownEditorBridge = useAutoDownEditorBridge()


const check_icon = computed<any>(() => editorCheckIcon())
const x_icon = computed<any>(() => editorXIcon())

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
  editor?: any
  focused?: boolean
  saveLabelRender?: any
  cancelLabelRender?: any
  updateCb?: any
  blurCb?: any
  focusCb?: any
  linkClickCb?: any
  openWikiLinkCb?: any
  editorReadyCb?: any
}>(), {
  placeholder: '',
  canEdit: false,
  autofocus: false,
  showActions: false,
  saveLabel: '',
  cancelLabel: '',
  imageUrlPrompt: '',
  linkUrlPrompt: '',
  pageTitle: '',
  onOpenWikiLink: null,
  loadBlock: null,
  extraSlashItems: (null as any),
  onAssetUpload: null,
  taskWorkflow: '',
  runQuery: null,
  editor: null,
  focused: false,
  saveLabelRender: null,
  cancelLabelRender: null,
  updateCb: null,
  blurCb: null,
  focusCb: null,
  linkClickCb: null,
  openWikiLinkCb: null,
  editorReadyCb: null,
})

const emit = defineEmits<{
  SaveRequest: []
  Cancel: []
}>()

watch(() => props.content, () => {
  if (props.editor != null) {let current = props.editor.getMarkdown();
  if (normalizeAnchors(current) != normalizeAnchors(props.content)) {props.editor.commands.setContent(props.content, { emitUpdate: false, contentType: 'markdown' });
  }}
})

watch(() => props.canEdit, () => {
  if (props.editor != null) {props.editor.setEditable(props.canEdit);
  }
})

function SaveRequest(): void {
  let noop_save: number = 0;

  emit('SaveRequest')
}

function Cancel(): void {
  let noop_cancel: number = 0;

  emit('Cancel')
}


</script>

<template>
    <div class="autodown-editor" :class="{ 'is-focused': focused }">
      <EditorContent :class="'autodown-editor-content-wrapper'" :editor="editor" :key="'EditorContent-1'" />
      <template v-if="editor">
        <BubbleMenu :editor="editor" :linkPrompt="linkUrlPrompt" :key="'BubbleMenu-2'" />
        <SlashMenu :items="autoDownEditorBridge" :editor="editor" :key="'SlashMenu-3'" />
        <TableMenu :editor="editor" :key="'TableMenu-4'" />
        <CodeBlockMenu :editor="editor" :key="'CodeBlockMenu-5'" />
      </template>
      <template v-if="showActions">
        <div class="autodown-editor-actions">
          <button class="autodown-save-btn" @click="SaveRequest">
            <component :is="(check_icon) as any" :size="13" />
            <component :is="(saveLabelRender) as any" />
          </button>
          <button class="autodown-cancel-btn" @click="Cancel">
            <component :is="(x_icon) as any" :size="13" />
            <component :is="(cancelLabelRender) as any" />
          </button>
        </div>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
