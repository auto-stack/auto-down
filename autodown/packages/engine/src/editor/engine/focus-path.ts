// Focus path resolution (plan 025 Phase 1) — the deep-selection primitives
// the assembly needs. The model addresses blocks recursively
// (findBlock/parentOf); these helpers resolve WHICH block actually takes
// focus (containers never host — the deepest editable leaf or a registered
// edit face does) and WHICH ancestors render expanded along the way.

import { BlockNode, BlockType, parentOf } from '../../parser/block-model'
import { editSlotFor } from '../../render/block-component'
import { isEditableLeaf } from './host-controller'

/** Ancestor ids of `focusedId` up to (excluding) the document root — the
 *  containers that render EXPANDED while the focus sits inside them. Every
 *  subtree hanging off this chain stays preview. */
export function focusPathOf(tree: BlockNode, focusedId: string): Set<string> {
  const path = new Set<string>()
  if (!focusedId) return path
  let cur = focusedId
  for (;;) {
    const parent = parentOf(tree, cur)
    if (!parent || parent === tree) break
    path.add(parent.id)
    cur = parent.id
  }
  return path
}

/** Can this node take direct focus (host an editing face)? Registered edit
 *  faces (Fence/Table) stop the descent — focusing a table means the table
 *  face, not its first cell. */
function isFocusTarget(node: BlockNode): boolean {
  return editSlotFor(BlockType[node.kind]) != null || isEditableLeaf(node)
}

/** The block that actually takes focus when `node` is selected: containers
 *  resolve to their first focusable descendant; leaves / edit faces stay.
 *  Null when the subtree has nothing focusable (e.g. a lone ThematicBreak). */
export function focusTargetOf(node: BlockNode): BlockNode | null {
  if (isFocusTarget(node)) return node
  for (const child of node.children) {
    const target = focusTargetOf(child)
    if (target) return target
  }
  return null
}

/** Last focusable block of the subtree (Ctrl+End lands here): post-order,
 *  last child first. */
export function lastFocusTargetOf(node: BlockNode): BlockNode | null {
  if (isFocusTarget(node)) return node
  for (let i = node.children.length - 1; i >= 0; i--) {
    const target = lastFocusTargetOf(node.children[i])
    if (target) return target
  }
  return null
}
