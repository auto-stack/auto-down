import { Extension } from '@tiptap/core'

function isTextSelection(selection: any): boolean {
  // Avoid instanceof checks across possible duplicate prosemirror-state copies.
  return selection && selection.empty && selection.$from && selection.$to
}

/**
 * Wrapper blocks whose empty trailing paragraph should be lifted out on a
 * second Enter press. This makes the "double Enter to exit" behavior work
 * consistently for Callout, Details, and Blockquote.
 */
const WRAPPER_BLOCK_TYPES = new Set(['callout', 'details', 'blockquote'])

function liftEmptyBlockAtEnd(editor: any) {
  const { state } = editor
  const { selection } = state
  if (!isTextSelection(selection)) return false

  const { $from, $to } = selection
  const parent = $from.parent
  const grandParentType = $from.node($from.depth - 1)?.type?.name

  if (
    parent.type.name !== 'paragraph' ||
    parent.childCount !== 0 ||
    $to.parentOffset !== parent.content.size ||
    !grandParentType ||
    !WRAPPER_BLOCK_TYPES.has(grandParentType)
  ) {
    return false
  }

  const range = $from.blockRange($to)
  if (!range || range.depth <= 1) return false

  const tr = state.tr.lift(range, range.depth - 1)
  if (!tr.docChanged) return false

  editor.view.dispatch(tr)
  editor.commands.focus()
  return true
}

function exitCodeLikeBlockAtEnd(editor: any) {
  const { state } = editor
  const { selection } = state
  if (!isTextSelection(selection)) return false

  const { $from, $to } = selection
  const parent = $from.parent
  const parentType = parent.type.name

  if ((parentType !== 'codeBlock' && parentType !== 'mathBlock') || $to.parentOffset !== parent.content.size) {
    return false
  }

  const text = parent.textContent
  if (text.length > 0 && !text.endsWith('\n')) return false

  const pos = $to.after()
  editor
    .chain()
    .insertContentAt(pos, { type: 'paragraph' })
    .focus()
    .run()
  return true
}

export const CustomKeymap = Extension.create({
  name: 'custom-keymap',

  // Run before block-specific Enter handlers (e.g. code block) so we can
  // intercept the "double Enter to exit" case first.
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      'Mod-a': ({ editor }) => {
        const { state } = editor
        const { from, to } = state.selection
        const $from = state.doc.resolve(from)
        const nodeStart = $from.start()
        const nodeEnd = $from.end()

        const notExtended = from > nodeStart || to < nodeEnd
        if (notExtended) {
          editor.chain().focus().selectParentNode().run()
          return true
        }
        return false
      },
      Enter: ({ editor }) => {
        if (liftEmptyBlockAtEnd(editor)) return true
        if (exitCodeLikeBlockAtEnd(editor)) return true
        return false
      },
    }
  },
})
