import './styles/autodown-editor.css'

export { default as AutoDownEditor } from './core/AutoDownEditor.vue'
export { useAutoDownEditor } from './composables/useAutoDownEditor'
export { createExtensions } from './extensions'
export { getBlockMap, BLOCK_ID_PREFIX } from './extensions/BlockId'
export type { BlockInfo } from './extensions/BlockId'
export { default as CodeBlockMenu } from './menus/CodeBlockMenu.vue'
export type { SlashItem } from './menus/SlashMenu.vue'
