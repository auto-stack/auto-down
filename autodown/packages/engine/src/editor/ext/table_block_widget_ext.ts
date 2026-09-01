// table_block_widget_ext.ts — platform bridge for the TableBlockWidget
// (plan 037 T2/T4). The .at source owns the chrome; row/column commands and
// the cell blur-commit semantics stay on the hand-written
// TableEditorController (engine kernel, passed in as a prop by the
// EngineEditor edit slot — the TableEditorBlock boundary unchanged).
//
// What lives here:
// 1. commitTableCell — verbatim from table_editor_block_ext.ts (plan 023
//    P1T8): extract the cell id / text from the blur event (the DSL has no
//    dataset access) and hand them to controller.commitCell (diffToOp).
// 2. The family root's per-mode chrome reads: the three faces have three
//    roots (edit div.autodown-table-editor / view table.table-node / stream
//    div.streaming-table), so the dyn root's tag, class chain, and
//    attr-presence map come from here — undefined drops the attr (the Vue
//    attr rule, the CodeBlockWidget root_data_language idiom), keeping each
//    face's byte contract: the view root carries NO data-block-id /
//    data-node-type (the retired tablePanel emitted none), the edit/stream
//    roots carry no aria-busy (that lives on the view root table / the edit
//    branch's inner table), and the edit root's conditional is-readonly
//    class folds into the one class string (two :class bindings on the dyn
//    root would collide; the merged string renders identically).
// 3. htmlText — the escaped-text re-export for the stream face's v-html
//    text nodes (`text` emits a <span>{{}}</span> wrapper; the retired
//    StreamingTable template pinned bare text children).
//
// Deployed verbatim to src/editor/ext/table_block_widget_ext.ts by gen.mjs
// (assert-editor-gen guards the byte sync).

export function commitTableCell(controller: any, e: any): void {
  const el = e?.target as HTMLElement | null
  const cellId = el?.dataset?.cellId
  if (!cellId) return
  controller.commitCell(cellId, (el as HTMLElement).innerText.replace(/\n+$/, ''))
}

/** The dyn root's tag: the view face IS the table (tablePanel's root), the
 *  other two faces are divs. */
export function rootTag(mode: string): string {
  return mode === 'view' ? 'table' : 'div'
}

/** The dyn root's single class chain per face (see header note 2). */
export function rootClass(mode: string, final: boolean, readonly: boolean): string {
  if (mode === 'view') return 'table-node'
  if (mode === 'stream') return final ? 'streaming-table final' : 'streaming-table'
  return readonly ? 'autodown-table-editor is-readonly' : 'autodown-table-editor'
}

/** The view root table's aria-busy (tablePanel pinned "false"); absent on
 *  the edit/stream roots. */
export function rootAriaBusy(mode: string): string | undefined {
  return mode === 'view' ? 'false' : undefined
}

/** The edit root's data-block-id; absent on the view/stream roots. */
export function rootBlockId(mode: string, blockId: string): string | undefined {
  return mode === 'edit' ? blockId : undefined
}

/** The edit root's data-node-type; absent on the view/stream roots. */
export function rootNodeType(mode: string): string | undefined {
  return mode === 'edit' ? 'Table' : undefined
}

export { htmlText } from './code_block_widget_ext'
