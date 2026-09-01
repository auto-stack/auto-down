// BlockWidget family mechanism (plan 033 D1) — hand-written platform layer,
// same pattern as block-component.ts: never generated.
//
// The family sugar: one .at widget per block kind serves all three modes
// (view / stream / edit) behind a single `mode` prop, so the chrome (DOM
// skeleton / class chain / styles) has exactly one source — cross-mode style
// drift becomes structurally impossible. registerBlockWidget wraps the
// widget into the three BlockComponent slot factories; the per-slot
// registerBlockComponent API stays untouched (the family is sugar, not a
// replacement).
//
// panelOf mounts the same widget on the panel-registry custom slot, so the
// view face reaches BOTH panel consumers (editor preview panes and static
// render) through the same component — one widget, every consumption face.

import { h, type Component, type VNode } from 'vue'
import type { Attr, BlockNode } from '../parser/block-model'
import { BlockType, Value, span } from '../parser/block-model'
import type { WNode } from '../parser/markdown-parser'
import type { BlockEditCtx } from './block-component'
import { registerBlockComponent, unregisterBlockComponent } from './block-component'
import { blockOfWNode } from './block-wnode'
import type { PanelRenderCtx, PanelRenderer } from './panel-registry'

export type BlockWidgetMode = 'view' | 'stream' | 'edit'

export interface BlockWidgetProps {
  mode: BlockWidgetMode
  /** the block's model — payload shape is the same in every mode */
  node: BlockNode
  /** stream consumption: false while the segment is still open */
  final?: boolean
  /** edit consumption (engine / blockId / readonly) */
  ctx?: BlockEditCtx
}

/** Register one widget as a kind's whole family: the three BlockComponent
 *  slots become thin wrappers that mount the widget with the right mode.
 *  A family registration owns all three slots (it replaces earlier
 *  per-slot registrations for the kind). */
export function registerBlockWidget(kind: string, widget: Component): void {
  registerBlockComponent(kind, {
    view: (node, final) => h(widget, { mode: 'view', node, final }),
    stream: (node, final) => h(widget, { mode: 'stream', node, final }),
    edit: (node, ctx) => h(widget, { mode: 'edit', node, ctx }),
  })
}

/** Drop a kind's family registration (builtin fallback resumes). */
export function unregisterBlockWidget(kind: string): void {
  unregisterBlockComponent(kind)
}

/** Wrap a family widget as a PanelRenderer — the panel face of view mode.
 *  The registry WNode resolves back to its model BlockNode when the editor
 *  bridge produced it; parse-side WNodes (static render, no back-link) get a
 *  fabricated model from the WNode slots (code/language -> inlines/attrs),
 *  the same shape EngineEditor's node-view fallback built (plan 030). */
export function panelOf(widget: Component): PanelRenderer {
  return (ctx: PanelRenderCtx): VNode => {
    const node = blockOfWNode(ctx.node) ?? wnodeFallbackModel(ctx.node)
    return h(widget, { mode: 'view', node, final: ctx.final ?? true })
  }
}

/** Static-render fallback model for the widget kinds (fence/math/mermaid):
 *  WNode slot data re-shaped into the model the edit slots read — source in
 *  inlines, fence language + the 032 open-fence loading flag in attrs. */
function wnodeFallbackModel(w: WNode): BlockNode {
  const attrs: Attr[] = []
  const src = typeof w?.code === 'string' ? w.code : ''
  if (w?.type === 'code_block') {
    attrs.push({ key: 'language', value: Value.Str(String(w.language ?? '')) })
    if (w?.loading === true) attrs.push({ key: 'loading', value: Value.Bool(true) })
  }
  return {
    id: 'nv',
    kind: kindOfWNode(w?.type ?? ''),
    attrs,
    children: [],
    inlines: src.length > 0 ? [span(src)] : [],
    source: { start: 0, end: 0 },
  } as unknown as BlockNode
}

function kindOfWNode(type: string): BlockType {
  if (type === 'code_block') return BlockType.Fence
  if (type === 'mermaid') return BlockType.Mermaid
  return BlockType.MathBlock
}
