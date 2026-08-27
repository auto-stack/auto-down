// Editing engine barrel (plan 018 Phase 1-3) — UI-free core: session +
// undo/redo, input rules, IME composition protocol, host text diff, block
// host controller, and the command layer (insertTemplate / table ops /
// moveBlock / setBlockAttrs).
export { EditorEngine, type EngineChange, type EngineListener } from './editor-engine'
export { INPUT_RULES, matchInputRule, inputRuleOps, applyRuleAttrs, fireRuleOn, type InputRule, type InputRuleResult } from './input-rules'
export { CompositionSession } from './composition'
export { diffToOp } from './text-diff'
export { BlockHostController, isEditableLeaf } from './host-controller'
export { createEditorAdapter, type EditorAdapter, type ChainLike } from './tiptap-adapter'
export {
  insertTemplate,
  replaceSelection,
  focusBlock,
  tableAddRow,
  tableDeleteRow,
  tableAddColumn,
  tableDeleteColumn,
  moveBlock,
  setBlockAttrs,
  tableAddRowTree,
  tableAddColumnTree,
  ensureBlockAnchor,
  generateAnchorId,
} from './commands'
