// gen_BlockId.ts — gen-project stub for src/extensions/BlockId.ts (the real
// module pulls in @tiptap/pm, which the self-contained gen project lacks).
// Mirrored into gen/front/vue/src/extensions/BlockId.ts by the regen
// script. Never ships: the copied src/core/AutoDownEditor.vue resolves the
// real module in the editor tree. Only `getBlockMap` is consumed (via the
// auto_down_editor_ext re-export as `blockMapOf`).

export interface BlockInfo {
  id: string
  index: number
  pos: number
  el: HTMLElement | null
  top: number
  height: number
}

export function getBlockMap(_editor: any): BlockInfo[] {
  return []
}
