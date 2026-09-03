<!-- App component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AutoDownEditor, StreamingRenderer } from '@autodown/engine'

import { initial_content } from '@/ext/src/front/utils/app_ext'
import { logSave, logCancel, is_vue } from '@/ext/src/front/utils/app_ext'
import { useDemoAppBridge } from '@/ext/src/front/utils/app_ext'

const demoAppBridge = useDemoAppBridge()

import CustomScrollbar from '@/components/CustomScrollbar.vue'


const content = ref<string>('')
const hovering_splitter = ref<number>(0)
const ghost_id = ref<string>('')
const ghost_height = ref<number>(0)
const left_top = ref<number>(0)
const left_height = ref<number>(0)
const left_client = ref<number>(0)
const right_top = ref<number>(0)
const right_height = ref<number>(0)
const right_client = ref<number>(0)
const table_widths = ref<any>({})
const dark_mode = ref<boolean>(false)
// Plan 458: seed theme default from index.html bootstrap.
if ((window as any).__AUTO_UI_THEME__ === 'light' || (window as any).__AUTO_UI_THEME__ === 'dark') dark_mode.value = (window as any).__AUTO_UI_THEME__ === 'dark'

const workspaceRef = ref<HTMLElement | null>(null)
const editorRef = ref<any>(null)
const rendererRef = ref<any>(null)

const placeholder_id = computed<any>(() => (is_vue() != null ? (demoAppBridge.editingBlock != null ? demoAppBridge.editingBlock.id : null) : (!!(ghost_id.value) ? ghost_id.value : null)))
const placeholder_height = computed<any>(() => (is_vue() != null ? (demoAppBridge.editingBlock != null ? demoAppBridge.editingBlock.height : null) : (!!(ghost_id.value) ? ghost_height.value : null)))
const csb_top = computed<any>(() => (is_vue() != null ? demoAppBridge.scrollTop : left_top.value))
const csb_height = computed<any>(() => (is_vue() != null ? demoAppBridge.scrollHeight : left_height.value))
const csb_client = computed<any>(() => (is_vue() != null ? demoAppBridge.clientHeight : left_client.value))

const emit = defineEmits<{
  Init: []
  handleSave: [string]
  handleCancel: []
  Edit: [string]
  SetScrollTop: [number]
  SplitterHover: [number]
  OnLeftScroll: [number, number, number]
  OnRightScroll: [number, number, number]
  ToggleDetails: [string]
  OnEditorFocus: [number]
  OnColResize: [string, number, number]
}>()

function Edit(md: any): void {
  content.value = md;

  emit('Edit', md)
}

function OnColResize(tbl: any, col: any, w: any): void {

  emit('OnColResize', tbl, col, w)
}

function OnEditorFocus(blk: any): void {
  if (is_vue() != null) {demoAppBridge.editingBlock = blk;
  }

  emit('OnEditorFocus', blk)
}

function OnLeftScroll(h: any, c: any, sy: any): void {


  left_top.value = sy;
  left_height.value = h;
  left_client.value = c;

  emit('OnLeftScroll', h, c, sy)
}

function OnRightScroll(h: any, c: any, sy: any): void {
  right_top.value = sy;
  right_height.value = h;
  right_client.value = c;

  emit('OnRightScroll', h, c, sy)
}

function SetScrollTop(v: any): void {
  if (is_vue() != null) {demoAppBridge.setScrollTop(v);
  } else {

  left_top.value = v;
  }

  emit('SetScrollTop', v)
}

function SplitterHover(v: any): void {
  hovering_splitter.value = v;

  emit('SplitterHover', v)
}

function ToggleDetails(key: any): void {
  let d = content.value.indexOf('$details(');
  if (d >= 0) {let close = content.value.indexOf(') {');
  if (close >= 0 && close > d) {if (content.value.includes('open:true')) {content.value = content.value.replaceAll(', open:true', '');
  } else {let head = content.value.substring(0, close);
  let tail = content.value.substring(close);
  content.value = head + ', open:true' + tail;
  }}}

  emit('ToggleDetails', key)
}

function handleCancel(): void {
  logCancel();

  emit('handleCancel')
}

function handleSave(md: any): void {
  logSave(md);

  emit('handleSave', md)
}

onMounted(() => {
  content.value = initial_content();
  if (is_vue() != null) {demoAppBridge.workspaceRef = workspaceRef.value!;
  demoAppBridge.editorRef = editorRef.value!;
  demoAppBridge.rendererRef = rendererRef.value!;
  }
})


</script>

<template>
    <div :class="{ dark: dark_mode }" class="app">
      <header class="toolbar">
        <span>AutoDown v0.1</span>
      </header>
      <main class="workspace" ref="workspaceRef">
        <div class="flex flex-row h-full w-full">
          <div class="flex flex-col flex-1 min-w-0 overflow-hidden border-r left">
            <AutoDownEditor ref="editorRef" :content="content" :placeholder="'Start typing...'" :can-edit="true" :show-actions="true" class="flex-1 min-h-0 overflow-hidden" @cancel="handleCancel" @focusblock="OnEditorFocus($event)" @update:modelValue="Edit" @save="handleSave($event)" @scroll="OnLeftScroll" :key="'AutoDownEditor-1'" />
          </div>
          <div class="flex flex-col flex-1 min-w-0 overflow-hidden right">
            <StreamingRenderer ref="rendererRef" :source="content" :streaming="false" :placeholder-block-id="placeholder_id" :placeholder-height="placeholder_height" :scroll-sync="true" class="flex-1 min-h-0 overflow-hidden py-4 px-5" @colresize="OnColResize" @detailsclick="ToggleDetails" @scroll="OnRightScroll" :key="'StreamingRenderer-2'" />
          </div>
        </div>
        <div class="splitter-hover-zone" @mouseenter="SplitterHover(1)" @mouseleave="SplitterHover(0)" />
        <CustomScrollbar :clientHeight="csb_client" :is_vm="is_vue() == null" :scrollHeight="csb_height" :scrollTop="csb_top" :visible="hovering_splitter == 1" :key="'CustomScrollbar-3'" @update:scrollTop="SetScrollTop($event)" />
      </main>
    </div>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        .app {
            display: flex;
            flex-direction: column;
            height: 100vh;
            font-family: system-ui, -apple-system, sans-serif;
            color: #111827;
        }

        .toolbar {
            flex-shrink: 0;
            height: 48px;
            display: flex;
            align-items: center;
            padding: 0 1.25rem;
            border-bottom: 1px solid #e5e7eb;
            background: #fff;
            font-weight: 600;
            font-size: 1rem;
        }

        .workspace {
            position: relative;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

        .flex {
            display: flex;
        }

        .flex-row {
            flex-direction: row;
        }

        .flex-col {
            flex-direction: column;
        }

        .flex-1 {
            flex: 1 1 0%;
        }

        .h-full {
            height: 100%;
        }

        .w-full {
            width: 100%;
        }

        .min-w-0 {
            min-width: 0;
        }

        .min-h-0 {
            min-height: 0;
        }

        .overflow-hidden {
            overflow: hidden;
        }

        .border-r {
            border-right: 1px solid #e5e7eb;
        }

        .py-4 {
            padding-top: 1rem;
            padding-bottom: 1rem;
        }

        .px-5 {
            padding-left: 1.25rem;
            padding-right: 1.25rem;
        }

        :deep(.autodown-editor) {
            border: none;
            border-radius: 0;
        }

        :deep(.autodown-editor-content-wrapper) {
            height: 100%;
            overflow-y: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        :deep(.autodown-editor-content-wrapper)::-webkit-scrollbar {
            display: none;
        }

        :deep(.streaming-document) {
            height: 100%;
            overflow-y: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
            /* Create a block formatting context so child margins do not collapse
               through the top padding of the scrolling container. */
            display: flow-root;
        }

        :deep(.streaming-document)::-webkit-scrollbar {
            display: none;
        }

        .splitter-hover-zone {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 16px;
            transform: translateX(-50%);
            z-index: 11;
            cursor: default;
            background: transparent;
            pointer-events: auto;
        }

        .splitter-hover-zone::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 1px;
            background: rgba(0, 0, 0, 0.12);
            opacity: 0;
            transition: opacity 0.15s ease;
        }

        .splitter-hover-zone:hover::after {
            opacity: 1;
        }
    </style>
