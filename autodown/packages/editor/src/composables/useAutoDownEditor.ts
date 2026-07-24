import { useEditor } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/core'
import { createExtensions } from '../extensions'
import type { EditorOptions as AutoDownEditorOptions } from '../extensions'
import type { SlashItem } from '../menus/SlashMenu.vue'
import { preprocessMarkdown } from '@autodown/core'
import { applyTableAttrs } from '../extensions/tableAttributes'

export interface UseAutoDownEditorOptions {
  content: string
  placeholder?: string
  editable?: boolean
  autofocus?: boolean
  slashItems?: SlashItem[]
  onUpdate?: (editor: Editor) => void
  onBlur?: (editor: Editor) => void
  onFocus?: (editor: Editor) => void
  onLinkClick?: (id: string) => void
  onOpenWikiLink?: (title: string, blockId?: string | null) => void
  loadBlock?: (id: string) => Promise<any | null>
  onAssetUpload?: (file: File) => Promise<string>
}

export function useAutoDownEditor(options: UseAutoDownEditorOptions) {
  const extOptions: AutoDownEditorOptions = {
    placeholder: options.placeholder,
    slashItems: options.slashItems,
    openWikiLink: options.onOpenWikiLink,
    loadBlock: options.loadBlock,
  }
  const extensions = createExtensions(extOptions)

  // Preprocess Markdown to extract table IAL attributes before parsing
  const { md: cleanContent, tableAttrs } = preprocessMarkdown(options.content)

  return useEditor({
    extensions,
    content: cleanContent,
    contentType: 'markdown',
    editable: options.editable ?? true,
    autofocus: options.autofocus ?? false,
    editorProps: {
      attributes: {
        class: 'autodown-editor-content',
      },
      handleClickOn: (view, pos, node, nodePos, event) => {
        const target = event.target as HTMLElement
        const anchor = target.closest('a')
        if (anchor && anchor.classList.contains('autodown-link')) {
          const href = anchor.getAttribute('href')
          if (href?.startsWith('#')) {
            options.onLinkClick?.(href.slice(1))
            return true
          }
        }
        return false
      },
      handleDOMEvents: {
        drop(view, event) {
          const upload = options.onAssetUpload
          if (!upload) return false
          const dragEvent = event as DragEvent
          const files = dragEvent.dataTransfer?.files
          if (!files || files.length === 0) return false
          dragEvent.preventDefault()

          const coords = { left: dragEvent.clientX, top: dragEvent.clientY }
          const pos = view.posAtCoords(coords)?.pos
          if (pos == null) return false

          ;(async () => {
            const inserts: string[] = []
            for (const file of Array.from(files)) {
              if (!file.type.startsWith('image/')) continue
              try {
                const path = await upload(file)
                inserts.push(`![${file.name}](${path})`)
              } catch (e) {
                console.error('Asset upload failed', e)
              }
            }
            if (inserts.length > 0) {
              view.dispatch(view.state.tr.insertText(inserts.join('\n\n'), pos))
            }
          })()

          return true
        },
        dragover(_view, event) {
          const dragEvent = event as DragEvent
          if (dragEvent.dataTransfer?.types.includes('Files')) {
            dragEvent.preventDefault()
            return true
          }
          return false
        },
        dblclick(view, event) {
          const target = event.target as HTMLElement
          const cellEl = target.closest('td, th') as HTMLElement | null
          const rowEl = target.closest('tr') as HTMLElement | null
          const threshold = 10

          // Double-click on column boundary → reset column width
          if (cellEl) {
            const rect = cellEl.getBoundingClientRect()
            const nearRightEdge = rect.right - event.clientX <= threshold && event.clientX <= rect.right + 2
            if (nearRightEdge) {
              const pos = view.posAtDOM(cellEl, 0)
              if (pos == null) return false
              const $pos = view.state.doc.resolve(pos)
              const cellNode = $pos.nodeAfter
              if (
                cellNode &&
                (cellNode.type.name === 'tableCell' || cellNode.type.name === 'tableHeader')
              ) {
                const tr = view.state.tr
                tr.setNodeMarkup($pos.pos, undefined, {
                  ...cellNode.attrs,
                  colwidth: null,
                })
                view.dispatch(tr)
                return true
              }
            }
          }

          // Double-click on row boundary → reset row height
          if (rowEl) {
            const rect = rowEl.getBoundingClientRect()
            const nearBottomEdge = event.clientY - rect.bottom >= -threshold && event.clientY >= rect.bottom - 2
            if (nearBottomEdge) {
              const pos = view.posAtDOM(rowEl, 0)
              if (pos == null) return false
              const $pos = view.state.doc.resolve(pos)
              const rowNode = $pos.nodeAfter
              if (rowNode && rowNode.type.name === 'tableRow') {
                const tr = view.state.tr
                tr.setNodeMarkup($pos.pos, undefined, {
                  ...rowNode.attrs,
                  rowheight: null,
                })
                view.dispatch(tr)
                return true
              }
            }
          }

          return false
        },
      },
    },
    onCreate: ({ editor }) => {
      // Apply extracted IAL attrs (colwidth/rowheight) to editor tables
      if (tableAttrs.length > 0) {
        // Use setTimeout to ensure editor is fully initialized
        setTimeout(() => applyTableAttrs(editor, tableAttrs), 0)
      }
    },
    onUpdate: ({ editor }) => {
      options.onUpdate?.(editor)
    },
    onBlur: ({ editor }) => {
      options.onBlur?.(editor)
    },
    onFocus: ({ editor }) => {
      options.onFocus?.(editor)
    },
  })
}
