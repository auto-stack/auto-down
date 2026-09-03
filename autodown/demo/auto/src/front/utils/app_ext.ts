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
// 2. AutoDownEditor / StreamingRenderer re-exports — both come from the
//    workspace package '@autodown/engine' (plan 020 Phase 2: direct target
//    state, no shim); the gen project resolves it through pac.at `npm_deps`
//    link: entries.
// 3. logSave / logCancel — console handlers.
// 4. editingBlock — the focused block ({id, height} | null) for the ghost
//    placeholder. PLAN-044 T5 activates it: the editor's @focusblock emit
//    rides the generated App.vue's .OnEditorFocus handler into this ref
//    (was "reserved, always null" through plan 043).
// 5. initial_content — plan 040 单源化：widget model 的 content 初值改由 ext
//    fn 提供（vue = content.ts 真文档；VM 轨 ext 桩为 no-op，返回 ""，
//    桩告警属预期——见 demo/auto/README.md「VM 桌面跑法」豁免清单）。
//
// The relative imports below resolve in BOTH trees at the same depth:
// demo tree demo/auto/src/front/utils → demo/src/..., gen tree
// gen/front/vue/src/ext/src/front/utils → gen/front/vue/src/src/... (the
// double-src mirror is copied in by gen/regen.sh — jade gap 32 precedent).

import { computed, reactive, ref } from 'vue'
import type { BlockInfo } from '@autodown/engine'
import { initialContent } from '../../../../src/content'
import { useSyncedScroll } from '../../../../src/composables/useSyncedScroll'
import { useTableColumnResize } from '../../../../src/composables/useTableColumnResize'

export { AutoDownEditor, StreamingRenderer } from '@autodown/engine'

export function useDemoAppBridge() {
  const workspaceRef = ref<HTMLElement | null>(null)
  const editorRef = ref<{ getBlockMap: () => BlockInfo[] } | null>(null)
  const rendererRef = ref<{ containerRef: HTMLElement | null } | null>(null)
  const content = ref(initialContent())
  // Focused block info ({id, height} | null) — written by the generated
  // App.vue's OnEditorFocus handler (@focusblock emit, PLAN-044 T5).
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

// plan 040 单源化：初始文档进 widget model 的唯一通道。VM 轨该符号退化为
// ext no-op 桩（返回 ""），双轨契约不破。
export function initial_content(): string {
  return initialContent()
}

// plan 040 单源化：轨道探针——vue 轨返回 true；VM 轨退化为 ext no-op 桩
// （返回 None，见 auto-lang ext_stubs PLAN-050 T9 语义），`if is_vue() != None`
// 因而在两轨都成立可判。用于守卫 vue 专属的 bridge 喂 ref / 测量回写
// （VM 轨无模板 ref 字段，未守卫会触发 handler_App_Init 崩——040 需求
// 分析在案的崩溃形态）。
export function is_vue(): boolean {
  return true
}
