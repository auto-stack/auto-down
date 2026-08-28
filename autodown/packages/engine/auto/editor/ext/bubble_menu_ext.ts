// bubble_menu_ext.ts — Hand-written TS extension for the BubbleMenu widget
// (../bubble_menu.at). Imported via `use { component/fn: ... }`; the Auto
// build copies it into the gen project as
// src/ext/src/front/utils/bubble_menu_ext.ts, and the generated
// BubbleMenu.vue (copied to src/menus/) imports it from
// ../auto/src/front/utils/bubble_menu_ext.
//
// The button list itself (names, tooltips, active flags, actions) lives in
// the widget DSL now — it was originally moved here under the mistaken
// belief that the DSL had no closures/object literals; probes against the
// phase3 worktree compiler proved otherwise (see src/auto/README.md). What
// remains genuinely cannot be expressed in the DSL:
//
// 1. TiptapBubbleMenu — the tiptap BubbleMenu wrapper component, re-exported
//    from src/composables/tiptapBubbleMenu.ts via a relative path that
//    resolves both in the editor package (real @tiptap/vue-3/menus
//    re-export) and in the gen project (a stub mirrored in by the regen
//    script — the gen project does not depend on @tiptap/*).
// 2. bubbleIcon — the static lucide icon set. The `dyn (.btn.icon)` pattern
//    carries icon components as data; the DSL cannot import npm-package
//    components as plain values, so the name → component map stays here.
// 3. bubbleShouldShow — tiptap calls it with { editor, state } and needs a
//    boolean RETURN value; DSL msg handlers always return void.
// 4. runBubbleLink — the link action's if/else + window.prompt body needs a
//    block-body closure, which computed expressions do not support (the
//    computed codegen emits `undefined` for a Block closure body).
//
// No @tiptap imports on purpose: editor/state are typed structurally.

import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Underline,
} from 'lucide-vue-next'

export { BubbleMenu as TiptapBubbleMenu } from '../../../../composables/tiptapBubbleMenu'

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

// shouldShow for tiptap's BubbleMenuPlugin: text selections only, not while
// an image is active, editable editor only.
//
// The original does `import type { isNodeSelection } from '@tiptap/core'`
// (a TYPE-only import — erased at runtime) and then evaluates
// `typeof isNodeSelection === 'function'` under @ts-expect-error. At runtime
// the identifier is undefined, so that check is always false: no
// node-selection filtering ever ran. Kept equivalent here.
export function bubbleShouldShow({ editor, state }: any): boolean {
  const { selection } = state
  const { empty } = selection
  const isNode = false
  if (!editor.isEditable || empty || isNode || editor.isActive('image')) {
    return false
  }
  return true
}

// The link button's action: unset an active link, otherwise prompt for a
// URL and set it. Generated prop defaults are NOT applied at runtime (no
// withDefaults), so `prompt ?? 'Enter URL'` is handled here.
export function runBubbleLink(editor: any, prompt: string | null | undefined): void {
  if (editor.isActive('link')) {
    editor.chain().focus().unsetLink().run()
  } else {
    const url = window.prompt(prompt ?? 'Enter URL')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }
}
