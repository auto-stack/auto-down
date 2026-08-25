// getBlockMap / BLOCK_ID_PREFIX (plan 018 Phase 4) — module-level parity
// with the retired Tiptap BlockId extension. The DOM-anchored instance
// version lives on AutoDownEditor's expose; these module exports keep the
// frozen import sites (EDITOR-CONTRACT.md §3) working.

export const BLOCK_ID_PREFIX = 'block-'

export interface BlockInfo {
  id: string
  index: number
  pos: number
  el: HTMLElement
  top: number
  height: number
}

/** Anchor block info from a rendered editor root element. */
export function getBlockMap(root?: HTMLElement | null): BlockInfo[] {
  const scope: ParentNode = root ?? document
  const els = Array.from(scope.querySelectorAll<HTMLElement>('[data-block-id]'))
  return els.map((el, i) => ({
    id: el.dataset.blockId ?? '',
    index: i,
    pos: i,
    el,
    top: el.offsetTop,
    height: el.offsetHeight,
  }))
}
