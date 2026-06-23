import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Editor } from '@tiptap/core'

const PLUGIN_KEY = new PluginKey('blockInsertHandle')

function createBoundaryWidget(editor: Editor, pos: number) {
  const container = document.createElement('div')
  container.className = 'autodown-block-boundary'
  container.setAttribute('aria-hidden', 'true')

  const line = document.createElement('div')
  line.className = 'autodown-block-boundary-line'
  container.appendChild(line)

  const plus = document.createElement('button')
  plus.type = 'button'
  plus.className = 'autodown-block-boundary-plus'
  plus.title = '插入新块'
  plus.innerHTML =
    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>'

  plus.addEventListener('mousedown', (event) => {
    event.preventDefault()
    event.stopPropagation()
    editor
      .chain()
      .insertContentAt(pos, { type: 'paragraph' })
      .focus()
      .run()
  })

  container.appendChild(plus)
  return container
}

function buildDecorations(doc: Parameters<typeof DecorationSet.create>[0], editor: Editor) {
  const decorations: Decoration[] = []
  const docSize = doc.content.size
  doc.forEach((node, offset) => {
    const pos = offset + 1
    const endPos = pos + node.nodeSize
    // Add a handle at the bottom boundary of each top-level block. Place the
    // widget just inside the block's closing token so it becomes the last child
    // of the block's DOM wrapper; hovering near the block's bottom edge reveals
    // the handle and clicking it inserts a new paragraph below that block.
    if (node.isBlock && endPos < docSize) {
      const widgetPos = pos + node.nodeSize - 1
      decorations.push(
        Decoration.widget(widgetPos, () => createBoundaryWidget(editor, endPos), {
          side: 1,
          key: `boundary-${offset}`,
        })
      )
    }
  })
  // Also allow inserting a new paragraph after the last block.
  if (docSize > 0) {
    decorations.push(
      Decoration.widget(docSize, () => createBoundaryWidget(editor, docSize), {
        side: 1,
        key: 'boundary-end',
      })
    )
  }
  return DecorationSet.create(doc, decorations)
}

export const BlockInsertHandle = Extension.create({
  name: 'blockInsertHandle',

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        key: PLUGIN_KEY,
        state: {
          init(_, { doc }) {
            return buildDecorations(doc, editor)
          },
          apply(tr, value) {
            if (!tr.docChanged) return value
            return buildDecorations(tr.doc, editor)
          },
        },
        props: {
          decorations(state) {
            return this.getState(state) as DecorationSet
          },
        },
      }),
    ]
  },
})
