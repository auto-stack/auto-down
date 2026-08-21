// app_ext.ts — Hand-written TS extension for the demo root widget
// (../app.at). Imported via `use { fn/component/composable: ... }`; the Auto
// build copies it into the gen project as src/ext/src/front/utils/app_ext.ts,
// and the generated App.vue (deployed to demo/src/) imports it from
// ./auto/src/front/utils/app_ext.
//
// What stays here (plan 014 Phase 0 probe conclusions):
//
// 1. useDemoAppBridge — the zero-argument bridge composable (the DSL's
//    composable imports are called at setup top level, before the widget's
//    template refs exist, so the refs live here and the widget's .Init
//    handler assigns the mounted elements/instances into the bag). Owns the
//    initial document content, the three template refs, useSyncedScroll and
//    useTableColumnResize — the original App.vue's glue.
// 2. AutoDownEditor / StreamingRenderer re-exports — they come from the
//    workspace packages '@autodown/editor' / '@autodown/vue'; the gen project
//    resolves them through pac.at `npm_deps` link: entries.
// 3. logSave / logCancel — console handlers.
// 4. editingBlock — reserved state for the future block-level inline editing
//    box (always null today), kept here so the widget can bind
//    placeholder-block-id/-height via ternary computeds.
//
// The relative imports below resolve in BOTH trees at the same depth:
// demo tree demo/auto/src/front/utils → demo/src/..., gen tree
// gen/front/vue/src/ext/src/front/utils → gen/front/vue/src/src/... (the
// double-src mirror is copied in by gen/regen.sh — jade gap 32 precedent).

import { computed, reactive, ref } from 'vue'
import type { BlockInfo } from '@autodown/editor'
import { initialContent } from '../../../../src/content'
import { useSyncedScroll } from '../../../../src/composables/useSyncedScroll'
import { useTableColumnResize } from '../../../../src/composables/useTableColumnResize'

export { AutoDownEditor } from '@autodown/editor'
export { StreamingRenderer } from '@autodown/vue'

export function useDemoAppBridge() {
  const workspaceRef = ref<HTMLElement | null>(null)
  const editorRef = ref<{ getBlockMap: () => BlockInfo[] } | null>(null)
  const rendererRef = ref<{ containerRef: HTMLElement | null } | null>(null)
  const content = ref(initialContent())
  // Reserved state for future block-level inline editing box (always null).
  const editingBlock = ref<{ id: string; height: number } | null>(null)

  const { scrollTop, scrollHeight, clientHeight, setScrollTop } = useSyncedScroll({
    workspaceRef,
    editorRef,
    rendererRef,
  })

  const rendererContainerRef = computed(() => rendererRef.value?.containerRef ?? null)
  useTableColumnResize(rendererContainerRef)

  return reactive({
    workspaceRef,
    editorRef,
    rendererRef,
    content,
    editingBlock,
    scrollTop,
    scrollHeight,
    clientHeight,
    setScrollTop,
  })
}

export function logSave(md: string) {
  console.log('saved:', md)
}

export function logCancel() {
  console.log('cancelled')
}
