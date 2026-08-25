// Editing engine barrel (plan 018 Phase 1) — UI-free core: session +
// undo/redo, input rules, IME composition protocol, host text diff.
export { EditorEngine, type EngineChange, type EngineListener } from './editor-engine'
export { INPUT_RULES, matchInputRule, inputRuleOps, applyRuleAttrs, fireRuleOn, type InputRule, type InputRuleResult } from './input-rules'
export { CompositionSession } from './composition'
export { diffToOp } from './text-diff'
