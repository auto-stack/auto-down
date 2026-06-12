import './styles/autodown-editor.css'

export { default as AutoDownEditor } from './core/AutoDownEditor.vue'
export { useAutoDownEditor } from './composables/useAutoDownEditor'
export { createExtensions } from './extensions'
export { default as CodeBlockMenu } from './menus/CodeBlockMenu.vue'
export type { SlashItem } from './menus/SlashMenu.vue'
