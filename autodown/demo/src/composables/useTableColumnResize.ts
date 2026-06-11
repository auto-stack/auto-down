import { onMounted, onUnmounted, type Ref } from 'vue'

export function useTableColumnResize(containerRef: Ref<HTMLElement | null>) {
  let isResizing = false
  let currentTh: HTMLTableCellElement | null = null
  let currentTable: HTMLTableElement | null = null
  let startX = 0
  let startWidth = 0
  let indicator: HTMLDivElement | null = null

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

  function showIndicatorAt(x: number, table: HTMLTableElement) {
    const rect = table.getBoundingClientRect()
    const el = ensureIndicator()
    el.style.left = `${x - 1}px`
    el.style.top = `${rect.top}px`
    el.style.height = `${rect.height}px`
    el.style.display = 'block'
  }

  function getCell(e: MouseEvent): HTMLTableCellElement | null {
    const el = e.target as HTMLElement
    if (el.tagName === 'TH' || el.tagName === 'TD') return el as HTMLTableCellElement
    return el.closest('th, td') as HTMLTableCellElement | null
  }

  function getTable(cell: HTMLTableCellElement): HTMLTableElement | null {
    return cell.closest('table') as HTMLTableElement | null
  }

  function getColumnIndex(cell: HTMLTableCellElement): number {
    const row = cell.parentElement as HTMLTableRowElement
    let index = 0
    for (const c of row.cells) {
      if (c === cell) return index
      index++
    }
    return -1
  }

  function getHeaderCell(table: HTMLTableElement, colIndex: number): HTMLTableCellElement | null {
    const thead = table.tHead
    if (!thead) return null
    const row = thead.rows[0]
    if (!row) return null
    return row.cells[colIndex] || null
  }

  function isNearEdge(e: MouseEvent, cell: HTMLTableCellElement): boolean {
    const rect = cell.getBoundingClientRect()
    return e.clientX >= rect.right - 6 && e.clientX <= rect.right + 4
  }

  function freezeTableLayout(table: HTMLTableElement) {
    // Snapshot current natural widths into explicit widths, then switch to
    // fixed layout with auto table width so columns are sized exactly.
    const thead = table.tHead
    if (!thead) return
    const row = thead.rows[0]
    if (!row) return
    for (const th of row.cells) {
      const w = th.getBoundingClientRect().width
      th.style.width = `${w}px`
      th.style.minWidth = `${w}px`
    }
    table.style.tableLayout = 'fixed'
    table.style.width = 'auto'
  }

  function onMove(e: MouseEvent) {
    if (isResizing) return
    const cell = getCell(e)
    if (!cell) {
      document.body.style.cursor = ''
      hideIndicator()
      return
    }
    const near = isNearEdge(e, cell)
    if (near) {
      document.body.style.cursor = 'col-resize'
      const table = getTable(cell)
      if (table) showIndicatorAt(cell.getBoundingClientRect().right, table)
    } else {
      document.body.style.cursor = ''
      hideIndicator()
    }
  }

  function onDown(e: MouseEvent) {
    const cell = getCell(e)
    if (!cell || !isNearEdge(e, cell)) return
    const table = getTable(cell)
    if (!table) return
    const colIndex = getColumnIndex(cell)
    const headerCell = getHeaderCell(table, colIndex)
    if (!headerCell) return

    freezeTableLayout(table)

    isResizing = true
    currentTh = headerCell
    currentTable = table
    const rect = headerCell.getBoundingClientRect()
    startX = rect.right
    startWidth = rect.width
    showIndicatorAt(rect.right, table)
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', onUp)
    e.preventDefault()
  }

  function onDrag(e: MouseEvent) {
    if (!isResizing || !currentTh || !currentTable) return
    const newWidth = Math.max(40, startWidth + (e.clientX - startX))
    currentTh.style.width = `${newWidth}px`
    currentTh.style.minWidth = `${newWidth}px`
    // Show indicator at the ACTUAL column boundary so users see when the
    // browser clamps the width (indicator stops while mouse keeps moving).
    const actualRight = currentTh.getBoundingClientRect().right
    showIndicatorAt(actualRight, currentTable)
  }

  function onUp() {
    isResizing = false
    currentTh = null
    currentTable = null
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    hideIndicator()
  }

  onMounted(() => {
    const el = containerRef.value
    if (!el) return
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mousedown', onDown)
  })

  onUnmounted(() => {
    const el = containerRef.value
    if (!el) return
    el.removeEventListener('mousemove', onMove)
    el.removeEventListener('mousedown', onDown)
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', onUp)
    hideIndicator()
    if (indicator) {
      indicator.remove()
      indicator = null
    }
  })
}
