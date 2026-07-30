// tiptapEditorContent.ts — Real re-export of tiptap's EditorContent for
// the AutoDownEditorInner widget's dual-resolution shim (imported by
// src/auto/src/front/utils/auto_down_editor_ext.ts via a path that
// resolves both in the editor tree — this file — and in the Auto gen
// project, which gets the behavior-free stub stubs/gen_tiptapEditorContent.ts
// mirrored in by the regen script; the gen project has no @tiptap/katex
// dependency). Same trick as tiptapBubbleMenu.ts / tiptapNodeView.ts.
//
// The katex CSS side-effect import lives here: the original
// src/core/AutoDownEditor.vue imported 'katex/dist/katex.min.css' at
// module scope, and this module is always imported with the editor
// component, so the bundle effect is identical.
import 'katex/dist/katex.min.css'

export { EditorContent } from '@tiptap/vue-3'
