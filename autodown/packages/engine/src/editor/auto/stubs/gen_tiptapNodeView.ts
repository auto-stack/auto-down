// gen_tiptapNodeView.ts — Gen-project stub for the Auto build.
//
// The self-contained gen project (src/auto/gen/front/vue) does not depend on
// @tiptap/*, so the real src/composables/tiptapNodeView.ts re-export cannot
// type-check/build there. The regen script (see src/auto/README.md) mirrors
// THIS file into the gen project as
// gen/front/vue/src/composables/tiptapNodeView.ts, satisfying the
// ../../../../composables/tiptapNodeView import inside the copied
// node_view_ext.ts with a behavior-free stand-in. The generated node-view
// SFCs copied into the editor package resolve the REAL module instead, so
// the stub never ships.
import { defineComponent, h } from 'vue'

export const NodeViewWrapper = defineComponent({
  name: 'NodeViewWrapper',
  props: {
    as: { type: String, required: false },
  },
  setup(props, { slots, attrs }) {
    return () => h(props.as || 'div', { ...attrs }, slots.default ? slots.default() : [])
  },
})

export const NodeViewContent = defineComponent({
  name: 'NodeViewContent',
  props: {
    as: { type: String, required: false },
  },
  setup(props, { slots, attrs }) {
    return () => h(props.as || 'div', { ...attrs }, slots.default ? slots.default() : [])
  },
})
