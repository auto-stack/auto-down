// gen_tiptapBubbleMenu.ts — Gen-project stub for the Auto build.
//
// The self-contained gen project (src/auto/gen/front/vue) does not depend on
// @tiptap/*, so the real src/composables/tiptapBubbleMenu.ts re-export cannot
// type-check/build there. The regen script (see src/auto/README.md) mirrors
// THIS file into the gen project as
// gen/front/vue/src/composables/tiptapBubbleMenu.ts, satisfying the
// ../../../../composables/tiptapBubbleMenu import inside the copied
// bubble_menu_ext.ts with a behavior-free stand-in. The generated
// BubbleMenu.vue copied into the editor package resolves the REAL module
// instead, so the stub never ships.
import { defineComponent, h } from 'vue'

export const BubbleMenu = defineComponent({
  name: 'BubbleMenu',
  props: {
    editor: { type: Object, required: false },
    options: { type: Object, required: false },
    shouldShow: { type: Function, required: false },
  },
  setup(_props, { slots, attrs }) {
    return () => h('div', { ...attrs }, slots.default ? slots.default() : [])
  },
})
