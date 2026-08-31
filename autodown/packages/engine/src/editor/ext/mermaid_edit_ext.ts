// mermaid_edit_ext.ts — platform bridge for the MermaidEditBlock widget
// (plan 031 T3). The .at source owns the chrome; the async preview state
// machine's untyped pieces live here, same boundary as
// code_editor_block_ext.ts / math_edit_ext.ts:
//
// 1. scheduleMermaidRender(source, cb) — the D2 debounce: 300ms
//    setTimeout + a monotonic version counter. Every call bumps the
//    version; a render that resolves while a newer call was scheduled is
//    discarded (stale-version guard — no out-of-order svg flashes over the
//    draft). The callback fires with { loading: true } when the debounce
//    window ends and the render starts, then once more with the settled
//    { svg, error, loading: false }. Empty/whitespace source settles
//    synchronously without touching mermaid (mermaid errors on empty
//    input; the empty editing state shows neither preview nor banner).
// 2. renderMermaidPreview — re-export of the render layer's single mermaid
//    bridge (src/render/preview.ts; npm imports + try/catch are
//    inexpressible in the DSL — plan 017 ruling). The bridge itself does
//    the actual rendering (called here, not re-implemented).
// 3. focusCodeArea / textareaRows — re-exports (code_editor_block_ext /
//    math_edit_ext): mount-time focus + caret-at-end, rows-attr growth.
//
// Deployed verbatim to src/editor/ext/mermaid_edit_ext.ts by gen.mjs
// (assert-editor-gen guards the byte sync).

import { renderMermaidPreview } from '../../render/preview'

export { renderMermaidPreview }
export { focusCodeArea } from './code_editor_block_ext'
export { textareaRows } from './math_edit_ext'

export interface MermaidRenderState {
  svg: string
  error: string
  loading: boolean
}

type RenderCallback = (state: MermaidRenderState) => void

// Module-level scheduler state: one pending timer + one version. The
// MermaidEditBlock face is the only consumer; a second instance's call
// naturally supersedes the first's (single edit face is mounted at a time
// — the focused block owns the assembly).
let pending: ReturnType<typeof setTimeout> | null = null
let version = 0

const DEBOUNCE_MS = 300

export function scheduleMermaidRender(source: string, cb: RenderCallback): void {
  const v = ++version
  if (pending != null) clearTimeout(pending)
  if (source.trim() === '') {
    cb({ svg: '', error: '', loading: false })
    return
  }
  pending = setTimeout(() => {
    pending = null
    cb({ svg: '', error: '', loading: true })
    void renderMermaidPreview(source).then((res) => {
      if (v !== version) return // a newer edit superseded this render
      cb({ svg: res.svg, error: res.error, loading: false })
    })
  }, DEBOUNCE_MS)
}
