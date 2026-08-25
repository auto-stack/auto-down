// renderPreview.ts — KaTeX / Mermaid preview rendering for the Auto
// render-type node-view widgets (MermaidNodeView, MathBlockNodeView,
// MathInlineNodeView). Imported by the generated SFCs through the
// src/auto extension re-export (src/auto/src/front/utils/node_view_ext.ts).
//
// This module is the REAL implementation, resolved in the editor package
// tree. The Auto gen project (src/auto/gen/front/vue) has no katex/mermaid
// dependency and resolves a behavior-free stub instead
// (src/auto/stubs/gen_renderPreview.ts, mirrored into
// gen/front/vue/src/composables/ by the regen script — same dual-resolution
// trick as tiptapNodeView.ts, see src/auto/README.md).
//
// What lives here genuinely cannot be expressed in the widget DSL:
// 1. katex/mermaid are npm packages — the DSL cannot import them.
// 2. try/catch — the DSL has no exceptions, so the render error paths of
//    the original hand-written node views are captured here and returned
//    as a plain { html/svg, error } result ("" error = success, matching
//    the originals' falsy null).
//
// The call sequences (mermaid.initialize options, random id shape, katex
// throwOnError/displayMode options, error message extraction) are verbatim
// from the original node views.

import katex from 'katex'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'default' })

export interface RenderedKatex {
  html: string
  error: string
}

// renderKatexPreview — the original MathBlock/MathInline render() bodies:
// katex.renderToString with throwOnError: true; on success error = ""
// (the originals' null), on failure html = "" and the extracted message.
export function renderKatexPreview(source: string, displayMode: boolean): RenderedKatex {
  try {
    return {
      html: katex.renderToString(source, { throwOnError: true, displayMode }),
      error: '',
    }
  } catch (e: any) {
    return { html: '', error: e.message || String(e) }
  }
}

export interface RenderedMermaid {
  svg: string
  error: string
}

// renderMermaidPreview — the original MermaidNodeView render() body (the
// empty-source early return stays in the widget). Same random id shape,
// same error extraction; error = "" on success (the originals' null).
export async function renderMermaidPreview(source: string): Promise<RenderedMermaid> {
  try {
    const id = `mermaid-${Math.random().toString(36).slice(2)}`
    const result = await mermaid.render(id, source)
    return { svg: result.svg, error: '' }
  } catch (e: any) {
    return { svg: '', error: e.message || String(e) }
  }
}

