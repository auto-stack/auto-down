// code_language_icon_ext.ts — Hand-written TS extension for the
// CodeLanguageIcon widget (../code_language_icon.at). Same dual-resolution
// re-export pattern as slash_menu_ext.ts: the language→icon mapping must
// stay in the real src/utils/codeBlockLanguage.ts (single source of truth,
// also used by CodeBlockMenu), but a `use` path cannot leave the project
// src/, so the widget imports it via this re-export. The relative path
// resolves both in the editor package (src/auto/src/front/utils →
// src/utils) and in the gen project (src/ext/src/front/utils → src/utils,
// mirrored by the regen script).

export { getLanguageIconUrl } from '../../../../utils/codeBlockLanguage'
