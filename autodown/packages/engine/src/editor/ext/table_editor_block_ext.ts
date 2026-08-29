// table_editor_block_ext.ts — platform bridge for the TableEditorBlock
// widget (plan 023 P1T8). The .at source owns the chrome; row/column
// commands and the cell blur-commit semantics stay on the hand-written
// TableEditorController (engine kernel, passed in as a prop by the
// EngineEditor edit slot). This bridge only extracts the cell id / text
// from the blur event — the DSL has no dataset access.
export function commitTableCell(controller: any, e: any): void {
  const el = e?.target as HTMLElement | null
  const cellId = el?.dataset?.cellId
  if (!cellId) return
  controller.commitCell(cellId, (el as HTMLElement).innerText.replace(/\n+$/, ''))
}
