// tiptapNodeView.ts — Re-export of tiptap's NodeViewWrapper/NodeViewContent
// for the Auto-generated node-view components (see src/auto/README.md).
//
// Same dual-resolution trick as tiptapBubbleMenu.ts: the Auto widget
// extension (src/auto/src/front/utils/node_view_ext.ts) re-exports the
// components via a ../../../../composables/tiptapNodeView path that resolves
// HERE in the editor package (the real @tiptap/vue-3 components) and to a
// stub in the self-contained gen project (no @tiptap/* dependency — the
// stub is mirrored from src/auto/stubs/gen_tiptapNodeView.ts by the regen
// script). Only the editor-tree resolution ever ships.
export { NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
