// node_view_ext.ts — Hand-written TS extension shared by the Auto
// node-view widgets (../wiki_link_node_view.at, ../query_block_node_view.at,
// ../block_embed_node_view.at, ../math_inline_node_view.at — the block
// math/mermaid views joined the family widgets in plan 033, the details
// node view joined the DetailsBlockWidget family in plan 035 T7). The gen pipeline copies this file into the
// transient gen project (never type-checked there) and deploys it verbatim
// to src/editor/ext/node_view_ext.ts; the generated SFCs import it from
// ../ext/node_view_ext (gen.mjs E1 rewrite).
//
// What lives here genuinely cannot be expressed in the widget DSL
// (plan 021 Phase 2 retarget — Tiptap is gone, the host components are
// engine-native):
//
// 1. NodeViewWrapper / NodeViewContent — the block-view host components.
//    Tiptap's @tiptap/vue-3 pair is replaced by local render-thin
//    components with the same DOM contract (the `as` element prop, full
//    attr/class fallthrough, data-node-view-* markers). Under the engine
//    the node-view widgets are PREVIEW-side chrome: the assembly (Phase 3)
//    mounts them for their block kinds and feeds the widget props
//    (node/editor/updateAttributes/selected/getPos/deleteNode); the
//    NodeViewContent hole renders the block's source/preview — no
//    ProseMirror contenteditable management exists anymore.
// 2. parseWikiLinkRaw — the [[title#blockId]] regex parser. The DSL has no
//    regex literals and no optional chaining (match[2]?.trim()).
// 3. wikiLinkPencilIcon / detailsEditIcon — the WikiLink lucide Pencil and
//    the Details inline-SVG edit icons. The DSL cannot import npm-package
//    components as plain values and has no svg/path view elements, so both
//    are carried as data and rendered via `dyn (...)`. Rendered DOM
//    identical to the originals.
// 4. normalizeQueryResults — precomputes the result.source field
//    (`title || page_path`) and result.priority_label (`[#${priority}]`)
//    for the QueryBlock list. The original computes them inline in the
//    template, but the view codegen emits null for Call expressions in
//    bindings, an object-literal-returning map closure is ambiguous with a
//    block-body closure in the DSL, and `||` on a loop var field is not
//    expressible in the view.
// 5. focusAndSelect — the edit-input focus+select pair. DSL template refs
//    are typed `ref<HTMLElement | null>` and the language has no casts, so
//    `.select()` (HTMLInputElement-only) fails vue-tsc on the generated
//    SFC.
// 6. renderKatexPreview — RETIRED with the MathInline node view (plan 036
//    T7): inline math renders as a render-node span (031 artifact contract
//    inline variant), so the plain re-export lost its last consumer; the
//    block bridges live in the family widget bridges (plan 033 T3/T4).
//
// 7. errorMessage — the catch-branch `err.message || String(err)`
//    extraction; TS types the catch param `unknown` and the DSL has no
//    casts.

import { defineComponent, h, inject, type VNode } from 'vue'
import { Pencil } from 'lucide-vue-next'

/** Injection key for the NodeViewContent hole's body (plan 026 P1T2): the
 *  mounting bridge provides the block's embedded VNodes; the widget templates
 *  use NodeViewContent bare (no own children), so the hole renders what the
 *  assembly injected. Nearest provider wins — nested node-views resolve to
 *  their own wrapper. */
export const NODE_VIEW_CONTENT_KEY = 'autodown-node-view-content'

// The block-view host components (engine replacements for tiptap's
// NodeViewWrapper/NodeViewContent). Render-thin: element type via `as`,
// everything else falls through; the data-node-view-* markers keep the
// historical DOM shape.
export const NodeViewWrapper = defineComponent({
  name: 'NodeViewWrapper',
  props: {
    as: { type: [String, Object], default: 'div' },
  },
  setup(props, { slots, attrs }) {
    return () =>
      h(props.as as string, { ...attrs, 'data-node-view-wrapper': '' }, slots.default?.())
  },
})

export const NodeViewContent = defineComponent({
  name: 'NodeViewContent',
  props: {
    as: { type: [String, Object], default: 'div' },
  },
  setup(props, { slots, attrs }) {
    const provided = inject<(() => VNode[]) | null>(NODE_VIEW_CONTENT_KEY, null)
    return () => {
      const body = provided ? provided() : (slots.default?.() ?? [])
      return h(props.as as string, { ...attrs, 'data-node-view-content': '' }, body)
    }
  },
})

export interface WikiLinkParsed {
  raw: string
  title: string
  blockId?: string | null
}

// parseWikiLinkRaw — verbatim port of the original WikiLinkNodeView
// parseRaw(): [[title]], [[title#blockId]], or a raw fallback when the
// source no longer matches the wiki-link pattern. Note the no-match branch
// intentionally omits the blockId key (parsed.blockId === undefined), like
// the original.
export function parseWikiLinkRaw(raw: string): WikiLinkParsed {
  const match = raw.match(/^\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?\]\]/)
  if (!match) {
    return { raw, title: raw }
  }
  return {
    raw,
    title: match[1].trim(),
    blockId: match[2]?.trim() || null,
  }
}

// The WikiLink edit-affordance icon (lucide Pencil, h-3 w-3 in the
// original = size 12 via the lucide default class mapping; rendered with
// the same class list so the stylesheet rules keep applying).
export function wikiLinkPencilIcon(): unknown {
  return Pencil
}

// normalizeQueryResults — the QueryBlock result list with the template's
// `result.title || result.page_path` fallback precomputed as `source` and
// the priority badge's `[#${priority}]` interpolation precomputed as
// `priority_label` (per-item template expressions are not expressible in
// the widget DSL view — see the header comment).
export function normalizeQueryResults(res: any): any[] {
  const list = (res && res.results) || []
  return list.map((r: any) => ({
    ...r,
    source: r.title || r.page_path,
    priority_label: r.priority ? `[#${r.priority}]` : '',
  }))
}

// errorMessage — the originals' `err.message || String(err)` catch-branch
// extraction. TS types the catch param `unknown` under strict mode (no
// annotation/cast syntax exists for it), and the DSL has no casts, so the
// narrowing lives here.
export function errorMessage(e: unknown): string {
  return (e as any)?.message || String(e)
}

// focusAndSelect — the edit-input focus+select pair. DSL template refs are
// typed `ref<HTMLElement | null>` and the language has no casts, so
// `.select()` (HTMLInputElement-only) fails vue-tsc on the generated SFC.
export function focusAndSelect(el: any): void {
  if (el != null) {
    el.focus()
    el.select()
  }
}
