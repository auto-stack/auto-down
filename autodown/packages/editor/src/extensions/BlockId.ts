import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Editor } from '@tiptap/core'

export const BLOCK_ID_PREFIX = 'block-'

export interface BlockInfo {
  id: string
  index: number
  pos: number
  el: HTMLElement | null
  top: number
  height: number
}

function buildDecorations(doc: any) {
  const decorations: Decoration[] = []

  doc.forEach((node: any, offset: number, index: number) => {
    const from = offset
    const to = offset + node.nodeSize
    const id = `${BLOCK_ID_PREFIX}${index}`
    decorations.push(
      Decoration.node(from, to, {
        'data-block-id': id,
        'data-block-index': String(index),
      })
    )
  })

  return DecorationSet.create(doc, decorations)
}

export const BlockId = Extension.create({
  name: 'blockId',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockId'),
        state: {
          init(_, { doc }) {
            return buildDecorations(doc)
          },
          apply(tr, set) {
            if (!tr.docChanged) return set.map(tr.mapping, tr.doc)
            return buildDecorations(tr.doc)
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})

export function getBlockMap(editor: Editor | undefined): BlockInfo[] {
  if (!editor?.view) return []

  const view = editor.view
  const doc = view.state.doc
  const wrapper = view.dom.closest('.autodown-editor-content-wrapper') as HTMLElement | null
  const map: BlockInfo[] = []

  const wrapperRect = wrapper?.getBoundingClientRect()

  doc.forEach((node, offset, index) => {
    const pos = offset + 1
    const el = view.nodeDOM(pos)
    const htmlEl = el instanceof HTMLElement ? el : wrapper?.querySelector(`[data-block-id="${BLOCK_ID_PREFIX}${index}"]`) as HTMLElement | null
    const elRect = htmlEl?.getBoundingClientRect()

    map.push({
      id: `${BLOCK_ID_PREFIX}${index}`,
      index,
      pos,
      el: htmlEl,
      top: elRect && wrapperRect ? elRect.top - wrapperRect.top : 0,
      height: htmlEl?.offsetHeight ?? 0,
    })
  })

  return map
}
