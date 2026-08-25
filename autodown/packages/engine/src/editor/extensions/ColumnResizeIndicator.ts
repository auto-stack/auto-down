import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const ColumnResizeIndicator = Extension.create({
  name: 'columnResizeIndicator',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('columnResizeIndicator'),

        view(editorView) {
          let indicator: HTMLDivElement | null = null
          let rafId: number | null = null
          let mouseX = -1
          let mouseY = -1

          function ensureIndicator() {
            if (indicator) return indicator
            const div = document.createElement('div')
            div.style.cssText = `
              position: fixed;
              width: 2px;
              background: hsl(220 90% 56%);
              pointer-events: none;
              z-index: 9999;
              display: none;
              opacity: 0.8;
            `
            document.body.appendChild(div)
            indicator = div
            return div
          }

          function hideIndicator() {
            if (indicator) indicator.style.display = 'none'
          }

          function showIndicator(x: number, top: number, height: number) {
            const el = ensureIndicator()
            el.style.left = `${x - 1}px`
            el.style.top = `${top}px`
            el.style.height = `${height}px`
            el.style.display = 'block'
          }

          function onMouseMove(e: MouseEvent) {
            mouseX = e.clientX
            mouseY = e.clientY
          }

          editorView.dom.addEventListener('mousemove', onMouseMove)

          function tick() {
            const handle = editorView.dom.querySelector('.column-resize-handle') as HTMLElement | null
            if (!handle || mouseX < 0) {
              hideIndicator()
              rafId = requestAnimationFrame(tick)
              return
            }

            // Temporarily hide the indicator so it doesn't intercept elementFromPoint.
            const wasDisplayed = indicator && indicator.style.display !== 'none'
            if (wasDisplayed) indicator!.style.display = 'none'

            const elAtPoint = document.elementFromPoint(mouseX, mouseY)

            // Restore indicator visibility after probing.
            if (wasDisplayed) indicator!.style.display = 'block'

            const cell = elAtPoint?.closest('td, th') as HTMLTableCellElement | null
            if (!cell) {
              hideIndicator()
              rafId = requestAnimationFrame(tick)
              return
            }

            // Ensure the cell belongs to a table inside this editor (not preview).
            const table = cell.closest('table') as HTMLTableElement | null
            if (!table || !editorView.dom.contains(table)) {
              hideIndicator()
              rafId = requestAnimationFrame(tick)
              return
            }

            const cellRect = cell.getBoundingClientRect()
            const tableRect = table.getBoundingClientRect()

            // Place the indicator at the boundary the mouse is closest to.
            const distToLeft = Math.abs(mouseX - cellRect.left)
            const distToRight = Math.abs(mouseX - cellRect.right)
            const boundaryX = distToLeft < distToRight ? cellRect.left : cellRect.right

            showIndicator(boundaryX, tableRect.top, tableRect.height)
            rafId = requestAnimationFrame(tick)
          }

          rafId = requestAnimationFrame(tick)

          return {
            update() {},
            destroy() {
              editorView.dom.removeEventListener('mousemove', onMouseMove)
              if (rafId) cancelAnimationFrame(rafId)
              hideIndicator()
              if (indicator) {
                indicator.remove()
                indicator = null
              }
            },
          }
        },
      }),
    ]
  },
})
