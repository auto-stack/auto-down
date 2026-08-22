// main_area_ext.ts — hand-written TS extension for main_area.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the tabs store facade re-export (dual-resolution shim),
// - editorTabs (the original's `tabs.tabs.filter(t => !t.isGraph)` PLUS the
//   per-tab active flag precomputed from tabs.activePath for the native
//   v-show keep-alive switch — `show:` is native since plan 013 Phase 1;
//   the `:style="{ display }"` replication was retired in plan 015 batch B),
// - the v-if guards and key/prop derivations (optional chaining, ||, ===
//   have no exact DSL form — and `!= null` compiles to `!== undefined`,
//   README gap 47),
// - EmptyFileIcon (the empty-state inline SVG — svg is not a DSL element,
//   gap 31; rendered via dyn + innerHTML, file_tree_node precedent).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { h } from 'vue'
import { useTabsStore } from '../../../../src/stores/tabs'

export { useTabsStore }

/** Original: editorTabs = computed(() => tabs.tabs.filter(t => !t.isGraph)),
 *  plus the per-tab v-show active flag (native `show:` on EditorTab). */
export function editorTabs(tabs: any[], activePath: string | null): any[] {
  return (tabs ?? [])
    .filter((t) => !t.isGraph)
    .map((t) => ({ ...t, active: activePath === t.path }))
}

/** Original: activeGraphTab = tabs.activeTab?.isGraph ? tabs.activeTab : null
 *  (consumed as v-if="activeGraphTab"). */
export function hasGraphTab(activeTab: any): boolean {
  return !!activeTab?.isGraph
}

/** Original: :key="activeGraphTab.path". */
export function graphTabPath(activeTab: any): string {
  return activeTab?.isGraph ? activeTab.path : ''
}

/** Original: :center-path="activeGraphTab.graphCenterPath". */
export function graphCenter(activeTab: any): string | null {
  return activeTab?.graphCenterPath ?? null
}

/** Original: :depth="activeGraphTab.graphDepth || 1". */
export function graphDepth(activeTab: any): number {
  return activeTab?.graphDepth || 1
}

/** Original: activeWhiteboardTab = tabs.activeTab?.isWhiteboard ?
 *  tabs.activeTab : null (consumed as v-if="activeWhiteboardTab"). */
export function hasWhiteboardTab(activeTab: any): boolean {
  return !!activeTab?.isWhiteboard
}

/** Original: :key="activeWhiteboardTab.path" + :path="activeWhiteboardTab.path". */
export function whiteboardPath(activeTab: any): string {
  return activeTab?.isWhiteboard ? activeTab.path : ''
}

/** Original: v-if="tabs.tabs.length === 0". */
export function noTabs(tabs: any[]): boolean {
  return (tabs ?? []).length === 0
}

/** The empty-state inline SVG, verbatim (innerHTML — svg is not a DSL
 *  element). */
export const EmptyFileIcon = (props: any) =>
  h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: '24',
    height: '24',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: props.class,
    innerHTML:
      '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>',
  })
