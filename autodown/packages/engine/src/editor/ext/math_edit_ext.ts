// math_edit_ext.ts — platform bridge for the MathEditBlock widget (plan 031
// T3). The .at source owns the chrome; what genuinely cannot live in the DSL
// stays here, same boundary as code_editor_block_ext.ts:
//
// 1. renderKatexPreview — re-export of the render layer's single katex
//    bridge (src/render/preview.ts; npm imports + try/catch are
//    inexpressible in the DSL — plan 017 ruling).
// 2. focusCodeArea — re-export from code_editor_block_ext.ts (mount-time
//    focus + caret-at-end; template refs are typed HTMLElement and the DSL
//    has no casts).
// 3. textareaRows — the draft's line-count -> rows approximation (D1 v1:
//    the textarea grows via the rows attr, no resize-on-input machinery).
//
// Deployed verbatim to src/editor/ext/math_edit_ext.ts by gen.mjs
// (assert-editor-gen guards the byte sync).

export { renderKatexPreview } from '../../render/preview'
export { focusCodeArea } from './code_editor_block_ext'

/** rows attr for the source textarea: draft line count + 1 breathing line,
 *  clamped to [4, 24] — past the cap CSS takes over (max-height +
 *  overflow). */
export function textareaRows(source: string): string {
  const lines = source.split('\n').length
  return String(Math.max(4, Math.min(24, lines + 1)))
}
