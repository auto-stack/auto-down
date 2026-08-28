// bubble_menu_ext.ts — Hand-written TS extension for the BubbleMenu widget
// (../bubble_menu.at). The gen pipeline copies this file into the transient
// gen project (never type-checked there) and deploys it verbatim to
// src/editor/ext/bubble_menu_ext.ts; the generated BubbleMenu.vue imports it
// from ../ext/bubble_menu_ext (gen.mjs E1 rewrite).
//
// The button list itself (names, tooltips, active flags, actions) lives in
// the widget DSL. What remains here genuinely cannot be expressed in the DSL
// (plan 021 Phase 2 retarget — everything now speaks engine, no Tiptap):
//
// 1. EngineBubbleMenu — the selection bubble host. Tiptap's BubbleMenu
//    wrapper is replaced by a local component over the ENGINE handle: the
//    editor prop is the engine adapter bag (`__engine` carries the session),
//    visibility is re-derived on every engine change, and the menu floats
//    above the anchor block element. v1 caveat: the engine selection is
//    block-granular (anchor/focus BlockPos), so `state.selection.empty` is
//    true for every real selection and the bubble stays hidden until the
//    inline-mark/selection extension lands (plan 018 Phase 4 deferral,
//    handed over with plan 020). The DOM contract when visible matches the
//    old wrapper: a positioned div carrying the widget's class + buttons.
// 2. bubbleIcon — the static lucide icon set. The `dyn (.btn.icon)` pattern
//    carries icon components as data; the DSL cannot import npm-package
//    components as plain values, so the name → component map stays here.
// 3. bubbleShouldShow — the host calls it with an engine-faithful
//    { editor, state } (state.selection.empty = collapsed block selection)
//    and needs a boolean RETURN value; DSL msg handlers always return void.
// 4. runBubbleLink — the link action's if/else + window.prompt body needs a
//    block-body closure, which computed expressions do not support. The
//    set/unsetLink chains are optional-called: the engine chain adapter
//    does not carry inline-mark commands until the inline-mark extension.

import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Underline,
} from 'lucide-vue-next'
import type { EditorEngine } from '../engine/editor-engine'

// The static lucide icon set, looked up by button name from the widget's
// buttons computed and rendered via `dyn (.btn.icon)`.
const BUBBLE_ICONS = {
  bold: Bold,
  italic: Italic,
  underline: Underline,
  strike: Strikethrough,
  code: Code,
  link: LinkIcon,
} as const

export function bubbleIcon(name: keyof typeof BUBBLE_ICONS): unknown {
  return BUBBLE_ICONS[name]
}

// shouldShow for the engine host: editable editor + non-collapsed selection
// only. v1 note: a block-granular selection is collapsed whenever anchor ==
// focus, so this only opens once an inline selection model exists.
export function bubbleShouldShow({
  editor,
  state,
}: {
  editor: any
  state: { selection: { empty: boolean } }
}): boolean {
  const { empty } = state.selection
  if (!editor.isEditable || empty || editor.isActive('image')) {
    return false
  }
  return true
}

// The link button's action: unset an active link, otherwise prompt for a
// URL and set it. Generated prop defaults are NOT applied at runtime (no
// withDefaults), so `prompt ?? 'Enter URL'` is handled here.
export function runBubbleLink(editor: any, prompt: string | null | undefined): void {
  if (editor.isActive('link')) {
    editor.chain().focus().unsetLink?.().run()
  } else {
    const url = window.prompt(prompt ?? 'Enter URL')
    if (url) {
      editor.chain().focus().setLink?.({ href: url }).run()
    }
  }
}

// Engine-side state derivation for shouldShow: the engine selection is
// collapsed (empty) when anchor and head coincide.
function engineStateOf(engine: EditorEngine): { selection: { empty: boolean } } {
  const sel = engine.selection
  const empty =
    sel.anchor.blockId === sel.head.blockId && sel.anchor.offset === sel.head.offset
  return { selection: { empty } }
}

// The selection bubble host (engine replacement for tiptap's BubbleMenu).
// Renders a positioned div (the widget's class + the button slot) whenever
// shouldShow accepts the current engine state; visibility re-derives on
// every engine change (the engine is not Vue-reactive). Dismisses on
// outside pointerdown and Escape, like the old plugin.
const EngineBubbleMenu = defineComponent({
  name: 'EngineBubbleMenu',
  props: {
    editor: { type: Object, default: null },
    options: { type: Object, default: null },
    shouldShow: { type: Function, default: null },
  },
  setup(props, { slots }) {
    const visible = ref(false)
    const top = ref('0px')
    const left = ref('0px')
    let unsubscribe: (() => void) | null = null

    const derive = (): void => {
      const engine: EditorEngine | undefined = props.editor?.__engine
      if (!engine) {
        visible.value = false
        return
      }
      const ctx = { editor: props.editor, state: engineStateOf(engine) }
      visible.value = props.shouldShow ? Boolean(props.shouldShow(ctx)) : false
      if (!visible.value) return
      // v1 positioning: float above the anchor block element (the engine
      // has no caret-coordinate API; refined with the inline selection
      // model). placement "top" is the only placement the widget requests.
      const host = document.querySelector<HTMLElement>(
        `[data-block-id="${engine.selection.anchor.blockId}"]`
      )
      const scope = host?.closest<HTMLElement>('.autodown-editor')
      if (host && scope) {
        const hostRect = host.getBoundingClientRect()
        const scopeRect = scope.getBoundingClientRect()
        left.value = `${hostRect.left - scopeRect.left}px`
        top.value = `${Math.max(0, hostRect.top - scopeRect.top)}px`
      }
    }

    const onPointerDown = (e: PointerEvent): void => {
      if (visible.value && !(e.target as HTMLElement | null)?.closest?.('.autodown-bubble-menu')) {
        visible.value = false
      }
    }
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && visible.value) visible.value = false
    }

    onMounted(() => {
      const engine: EditorEngine | undefined = props.editor?.__engine
      if (engine) {
        const listener = (): void => derive()
        engine.onChange(listener)
        unsubscribe = () => {
          // EditorEngine has no off(); listeners live for the editor's
          // lifetime, so the unsubscribe is a no-op tombstone.
        }
      }
      document.addEventListener('pointerdown', onPointerDown)
      document.addEventListener('keydown', onKeydown)
      derive()
    })
    onBeforeUnmount(() => {
      unsubscribe?.()
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeydown)
    })

    return () =>
      visible.value
        ? h(
            'div',
            { class: 'autodown-bubble-menu', style: { position: 'absolute', top: top.value, left: left.value } },
            slots.default?.()
          )
        : null
  },
})

// Exported under the widget's historical import name (`component:
// TiptapBubbleMenu from "ext/bubble_menu_ext.ts"`) — the widget source stays
// byte-stable while the implementation is engine-native.
export { EngineBubbleMenu as TiptapBubbleMenu }
