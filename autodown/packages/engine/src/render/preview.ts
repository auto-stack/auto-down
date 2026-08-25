// KaTeX / Mermaid preview rendering — the single implementation since plan
// 017 Phase 2 (editor renderPreview and the render-layer optional
// capabilities converge here). Not re-exported through the ./render barrel:
// consumers who want katex/mermaid import the module explicitly, so the
// renderer core stays dependency-clean (plan 008 goal 3 degradation).
//
// What lives here genuinely cannot be expressed in the widget DSL:
// 1. katex/mermaid are npm packages — the DSL cannot import them.
// 2. try/catch — the DSL has no exceptions, so render error paths return a
//    plain { html/svg, error } result ("" error = success, matching the
//    original node views' falsy null).

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
