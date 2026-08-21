<!-- App component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AutoDownEditor } from '../auto/src/front/utils/app_ext'
import { StreamingRenderer } from '../auto/src/front/utils/app_ext'
import { logSave, logCancel } from '../auto/src/front/utils/app_ext'
import { useDemoAppBridge } from '../auto/src/front/utils/app_ext'

const demoAppBridge = useDemoAppBridge()

import CustomScrollbar from './components/CustomScrollbar.vue'


const hovering_splitter = ref<number>(0)

const workspaceRef = ref<HTMLElement | null>(null)
const editorRef = ref<any>(null)
const rendererRef = ref<any>(null)

const placeholder_id = computed<any>(() => (demoAppBridge.editingBlock != null ? demoAppBridge.editingBlock.id : null))
const placeholder_height = computed<any>(() => (demoAppBridge.editingBlock != null ? demoAppBridge.editingBlock.height : null))

const emit = defineEmits<{
  handleSave: [string]
  handleCancel: []
  handleUpdate: [string]
  SetScrollTop: [number]
  SplitterHover: [number]
}>()

function SplitterHover(v: any): void {
  hovering_splitter.value = v;

  emit('SplitterHover', v)
}

function handleSave(md: any): void {
  logSave(md);

  emit('handleSave', md)
}

function handleCancel(): void {
  logCancel();

  emit('handleCancel')
}

function SetScrollTop(v: any): void {
  demoAppBridge.setScrollTop(v);

  emit('SetScrollTop', v)
}

function handleUpdate(md: any): void {
  demoAppBridge.content = md;

  emit('handleUpdate', md)
}

onMounted(() => {
  demoAppBridge.workspaceRef = workspaceRef.value!;
  demoAppBridge.editorRef = editorRef.value!;
  demoAppBridge.rendererRef = rendererRef.value!;
})


</script>

<template>
    <div class="app">
      <header class="toolbar">
        <span>AutoDown v0.1</span>
      </header>
      <main class="workspace" ref="workspaceRef">
        <div class="panels">
          <section class="panel left">
            <AutoDownEditor :placeholder="'Start typing...'" ref="editorRef" :class="'fill'" :content="demoAppBridge.content" :key="'AutoDownEditor-1'" @save="handleSave($event)" @update="handleUpdate($event)" @cancel="handleCancel" />
          </section>
          <section class="panel right">
            <StreamingRenderer :source="demoAppBridge.content" :streaming="false" ref="rendererRef" :placeholderBlockId="placeholder_id" :placeholderHeight="placeholder_height" :class="'fill'" :key="'StreamingRenderer-2'" />
          </section>
        </div>
        <div class="splitter-hover-zone" @mouseleave="SplitterHover(0)" @mouseenter="SplitterHover(1)" />
        <CustomScrollbar :scrollHeight="demoAppBridge.scrollHeight" :visible="hovering_splitter == 1" :scrollTop="demoAppBridge.scrollTop" :clientHeight="demoAppBridge.clientHeight" :key="'CustomScrollbar-3'" @UpdateScrollTop="SetScrollTop($event)" />
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

        .panels {
            display: flex;
            height: 100%;
            width: 100%;
        }

        .panel {
            flex: 1;
            min-width: 0;
            height: 100%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .panel::-webkit-scrollbar {
            display: none;
        }

        .panel {
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        .left {
            border-right: 1px solid #e5e7eb;
        }

        .left :deep(.autodown-editor) {
            border: none;
            border-radius: 0;
        }

        .left :deep(.autodown-editor-content-wrapper) {
            height: 100%;
            overflow-y: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        .left :deep(.autodown-editor-content-wrapper)::-webkit-scrollbar {
            display: none;
        }

        .right :deep(.streaming-document) {
            height: 100%;
            overflow-y: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
            /* Create a block formatting context so child margins do not collapse
               through the top padding of the scrolling container. */
            display: flow-root;
        }

        .right :deep(.streaming-document)::-webkit-scrollbar {
            display: none;
        }

        .right .fill {
            padding: 1rem 1.25rem;
        }

        .fill {
            flex: 1;
            min-height: 0;
            overflow: hidden;
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
