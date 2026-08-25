// gen_tiptapEditorContent.ts — Gen-project stub for
// src/composables/tiptapEditorContent.ts (the real re-export of tiptap's
// EditorContent + the katex CSS import). Mirrored into
// gen/front/vue/src/composables/tiptapEditorContent.ts by the regen
// script. Never ships: the copied src/core/AutoDownEditorInner.vue
// resolves the real module in the editor tree. The gen project has no
// @tiptap/katex dependency, so this stub is a behavior-free stand-in that
// only needs to type-check the generated SFC's usage
// (`<EditorContent :editor="..." class="..." />`).
import { defineComponent, h } from 'vue'

export const EditorContent = defineComponent({
  name: 'EditorContent',
  props: ['editor'],
  setup() {
    return () => h('div')
  },
})
