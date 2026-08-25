import './styles/autodown-editor.css'

export { default as AutoDownEditor } from './core/AutoDownEditor.vue'
export { useAutoDownEditor } from './composables/useAutoDownEditor'
export { createExtensions } from './extensions'
export { getBlockMap, BLOCK_ID_PREFIX } from './extensions/BlockId'
export type { BlockInfo } from './extensions/BlockId'
export { default as CodeBlockMenu } from './menus/CodeBlockMenu.vue'
export type { SlashItem } from './menus/slashItem'

// plan 018: self-built editing engine (experimental parallel assembly —
// AutoDownEditor switches here in Phase 4, Tiptap retires)
export { default as AutoDownEditorEngine } from './components/EngineEditor.vue'
export type { BlockInfo as EngineBlockInfo } from './components/EngineEditor.vue'
export {
  EditorEngine,
  BlockHostController,
  insertTemplate,
  replaceSelection,
  focusBlock,
  tableAddRow,
  tableDeleteRow,
  tableAddColumn,
  tableDeleteColumn,
  moveBlock,
  setBlockAttrs,
} from './engine'
