<!-- EditorTab component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { BodyTeleport } from '../../auto/src/front/utils/editor_tab_ext'
import { EditorShell } from '../../auto/src/front/utils/editor_tab_ext'
import { HoverLinkBtn } from '../../auto/src/front/utils/editor_tab_ext'
import { useDebounceFn, findTab, tabBody, tabTitle, overlayDisplay, saveTabIfDirty, loadTabIfNeeded, loadBlockFn, assetUploadFn, runQueryFn, extraSlashItemsFn, openWikiLinkFn, listenEditorHover, unlistenEditorHover, copyBlockLinkSafe, scrollToBlockFromEvent } from '../../auto/src/front/utils/editor_tab_ext'
import { useTabsStore, useFileTreeStore } from '../../auto/src/front/utils/editor_tab_ext'

const tabsStore = useTabsStore()
const fileTreeStore = useFileTreeStore()


const hover_block = ref<any>(null)
const hover_handle = ref<any>(null)
const debounced_save = ref<any>(null)
const load_block = ref<any>(null)
const asset_upload = ref<any>(null)
const run_query = ref<any>(null)
const extra_slash = ref<any>(null)
const open_wiki_link = ref<any>(null)

const editorRef = ref<any>(null)

const tab = computed<any>(() => findTab(tabsStore.tabs, props.path))
const body = computed<any>(() => tabBody(tab.value))
const page_title = computed<any>(() => tabTitle(tab.value))
const overlay_display = computed<any>(() => overlayDisplay(tab.value))

const props = defineProps<{
  path: string
}>()

const emit = defineEmits<{
  OnUpdate: [any]
  CopyBlockLink: []
  OnScrollToBlock: [any]
}>()

watch(() => props.path, () => {
  loadTabIfNeeded(tabsStore, tab.value, props.path);
}, { immediate: true })

function OnUpdate(md: any): void {
  tabsStore.setBody(props.path, md);
  let f = debounced_save.value;
  f();

  emit('OnUpdate', md)
}

function OnScrollToBlock(e: any): void {
  scrollToBlockFromEvent(editorRef.value!, props.path, e);

  emit('OnScrollToBlock', e)
}

function CopyBlockLink(): void {
  let ok = copyBlockLinkSafe(hover_block.value, tab.value);
  if (ok) {hover_block.value = null;
  }

  emit('CopyBlockLink')
}

onMounted(() => {
  let run = () => { saveTabIfDirty(tabsStore, props.path);
   };
  let f = useDebounceFn(run, 2000);
  debounced_save.value = f;
  load_block.value = loadBlockFn();
  asset_upload.value = assetUploadFn();
  run_query.value = runQueryFn();
  extra_slash.value = extraSlashItemsFn(fileTreeStore, tabsStore, props.path);
  open_wiki_link.value = openWikiLinkFn(tabsStore, fileTreeStore);
  hover_handle.value = listenEditorHover(editorRef.value!, (hb: any) => { hover_block.value = hb;
   });
})

onUnmounted(() => {
  unlistenEditorHover(hover_handle.value);

})

function __auto_gl_jade_scroll_to_block_OnScrollToBlock(e: any) {
  OnScrollToBlock(e)
}

onMounted(() => {
  window.addEventListener('jade-scroll-to-block', __auto_gl_jade_scroll_to_block_OnScrollToBlock)
})

onUnmounted(() => {
  window.removeEventListener('jade-scroll-to-block', __auto_gl_jade_scroll_to_block_OnScrollToBlock)
})


</script>

<template>
    <div class="editor-workspace">
      <EditorShell :openWikiLink="open_wiki_link" :class="'h-full w-full'" :loadBlock="load_block" :pageTitle="page_title" :assetUpload="asset_upload" :extraSlashItems="extra_slash" ref="editorRef" :content="body" :runQuery="run_query" :placeholder="'Start typing...'" :showActions="false" :key="'EditorShell-1'" @update="OnUpdate" />
      <div class="absolute inset-0 z-10 flex items-center justify-center bg-background/80 text-muted-foreground" :style="({ display: overlay_display } as any)">
        <span>Loading…</span>
      </div>
      <component :is="(BodyTeleport) as any">
        <HoverLinkBtn :hb="hover_block" :key="'HoverLinkBtn-2'" @copy="CopyBlockLink" />
      </component>
    </div>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        /* The original EditorTab.vue scoped styles, verbatim. */
        .editor-workspace {
            position: relative;
            flex: 1;
            min-height: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
        }

        .editor-workspace :deep(.autodown-editor) {
            border: none;
            border-radius: 0;
            background: transparent;
            height: 100%;
            width: 100%;
            display: flex;
            flex-direction: column;
        }

        .editor-workspace :deep(.autodown-editor-content-wrapper) {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding: 1rem 1.5rem;
        }
    </style>
