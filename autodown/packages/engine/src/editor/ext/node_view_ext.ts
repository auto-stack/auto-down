// node_view_ext.ts — Hand-written TS extension shared by the seven Auto
// node-view widgets (../details_node_view.at, ../wiki_link_node_view.at,
// ../query_block_node_view.at, ../block_embed_node_view.at,
// ../mermaid_node_view.at, ../math_block_node_view.at,
// ../math_inline_node_view.at). The gen pipeline copies this file into the
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
// 6. renderKatexPreview / renderMermaidPreview — re-exports from the real
//    composables/renderPreview.ts facade (single source of truth in the
//    render layer, src/render/preview.ts). The npm library calls +
//    try/catch error paths of the render-type node views genuinely cannot
//    live in the DSL (no npm imports, no exceptions). v-html IS expressible
//    (the `html:` prop), so no setInnerHTML shim is needed.
//
// 7. errorMessage — the catch-branch `err.message || String(err)`
//    extraction; TS types the catch param `unknown` and the DSL has no
//    casts.

import { defineComponent, h } from 'vue'
import { Pencil } from 'lucide-vue-next'

export { renderKatexPreview, renderMermaidPreview } from '../composables/renderPreview'

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
    return () =>
      h(props.as as string, { ...attrs, 'data-node-view-content': '' }, slots.default?.())
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

// The Details summary edit button's inline SVG (pencil), verbatim from the
// original DetailsNodeView template.
const DETAILS_EDIT_ICON = defineComponent({
  name: 'DetailsEditIcon',
  setup() {
    return () =>
      h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: '12',
          height: '12',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        },
        [
          h('path', { d: 'M12 20h9' }),
          h('path', { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' }),
        ],
      )
  },
})

export function detailsEditIcon(): unknown {
  return DETAILS_EDIT_ICON
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
