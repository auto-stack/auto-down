// Command layer (plan 018 Phase 3) — the public editor commands that
// replace `editor.chain()` bypasses (the single jade-garden leak), plus the
// model-level extended operations (table rows/columns, block move, block
// attrs) layered on the 016 core ops. Tree-level commands go through
// EditorEngine.applyTree → ONE undo step each.

import {
  Attr,
  BlockNode,
  BlockType,
  BlockPos,
  Selection,
  attrSet,
  block,
  childIndex,
  findBlock,
  leafBlock,
  parentOf,
  replaceNode,
  withChildren,
} from '../../parser/block-model'
import type { EditorEngine } from './editor-engine'

// -- command layer (jade-garden migration surface) --------------------------------

/** Insert template blocks replacing the anchor block (slash templates). */
export function insertTemplate(engine: EditorEngine, anchorId: string, blocks: BlockNode[]): void {
  if (!findBlock(engine.doc, anchorId)) return
  engine.applyTree((tree) => replaceNode(tree, anchorId, blocks.length > 0 ? blocks : [leafBlock(anchorId, BlockType.Paragraph, '')]))
}

/** Replace the selection's block with the given blocks. */
export function replaceSelection(engine: EditorEngine, blocks: BlockNode[]): void {
  const id = engine.selection.anchor.blockId
  if (!id || !findBlock(engine.doc, id)) return
  engine.applyTree((tree) => replaceNode(tree, id, blocks))
}

/** Focus a block at an offset; the host picks the move up. No history. */
export function focusBlock(engine: EditorEngine, id: string, offset = 0): void {
  if (!findBlock(engine.doc, id)) return
  engine.select(new Selection(new BlockPos(id, offset), new BlockPos(id, offset)))
}

// -- extended ops (model level; wrap with engine.applyTree for undo) ----------------

/** Table: add a row after `afterRowId` (null = first). One undo step. */
export function tableAddRow(engine: EditorEngine, tableId: string, afterRowId: string | null): void {
  engine.applyTree((tree) => tableAddRowTree(tree, tableId, afterRowId))
}

export function tableAddRowTree(tree: BlockNode, tableId: string, afterRowId: string | null): BlockNode {
  const table = findBlock(tree, tableId)
  if (!table) return tree
  const colCount = table.children[0]?.children.length ?? 1
  const newRowId = `row-${Math.random().toString(36).slice(2, 8)}`
  const cells: BlockNode[] = []
  for (let i = 0; i < colCount; i++) cells.push(leafBlock(`${newRowId}-c${i}`, BlockType.TableCell, ''))
  const row = withChildren(block(newRowId, BlockType.TableRow), cells)
  const rows = [...table.children]
  const idx = afterRowId == null ? 0 : childIndex(table, afterRowId) + 1
  rows.splice(idx < 0 ? rows.length : idx, 0, row)
  return replaceNode(tree, tableId, [withChildren(table, rows)])
}

/** Table: delete a row. One undo step. */
export function tableDeleteRow(engine: EditorEngine, rowId: string): void {
  engine.applyTree((tree) => replaceNode(tree, rowId, []))
}

/** Table: append a column (empty cell on every row). One undo step. */
export function tableAddColumn(engine: EditorEngine, tableId: string): void {
  engine.applyTree((tree) => tableAddColumnTree(tree, tableId))
}

export function tableAddColumnTree(tree: BlockNode, tableId: string): BlockNode {
  const table = findBlock(tree, tableId)
  if (!table) return tree
  const rows = table.children.map((row) =>
    withChildren(row, [...row.children, leafBlock(`${row.id}-nc`, BlockType.TableCell, '')])
  )
  return replaceNode(tree, tableId, [withChildren(table, rows)])
}

/** Table: delete the last column of every row. One undo step. */
export function tableDeleteColumn(engine: EditorEngine, tableId: string): void {
  engine.applyTree((tree) => {
    const table = findBlock(tree, tableId)
    if (!table) return tree
    const rows = table.children.map((row) => withChildren(row, row.children.slice(0, -1)))
    return replaceNode(tree, tableId, [withChildren(table, rows)])
  })
}

/** Move a block up/down one position within its parent (drag parity). */
export function moveBlock(engine: EditorEngine, id: string, dir: -1 | 1): void {
  engine.applyTree((tree) => {
    const parent = parentOf(tree, id)
    if (!parent) return tree
    const idx = childIndex(parent, id)
    const target = idx + dir
    if (target < 0 || target >= parent.children.length) return tree
    const kids = [...parent.children]
    const [moved] = kids.splice(idx, 1)
    kids.splice(target, 0, moved)
    return replaceNode(tree, parent.id, [withChildren(parent, kids)])
  })
}

/** Set attrs on a block (heading level etc. — completes the input rule). */
export function setBlockAttrs(engine: EditorEngine, id: string, attrs: Attr[]): void {
  engine.applyTree((tree) => {
    const found = findBlock(tree, id)
    if (!found) return tree
    let next = found
    for (const a of attrs) next = { ...next, attrs: attrSet(next.attrs, a.key, a.value) }
    return replaceNode(tree, id, [next])
  })
}
