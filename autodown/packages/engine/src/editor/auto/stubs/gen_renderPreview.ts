// gen_renderPreview.ts — Gen-project stub for the Auto build.
//
// The self-contained gen project (src/auto/gen/front/vue) does not depend
// on katex/mermaid, so the real src/composables/renderPreview.ts cannot
// type-check/build there. The regen script (see src/auto/README.md) mirrors
// THIS file into the gen project as
// gen/front/vue/src/composables/renderPreview.ts, satisfying the
// ../../../../composables/renderPreview import inside the copied
// node_view_ext.ts with a behavior-free stand-in. The generated node-view
// SFCs copied into the editor package resolve the REAL module instead, so
// the stub never ships. Same trick as gen_tiptapNodeView.ts.

export interface RenderedKatex {
  html: string
  error: string
}

export function renderKatexPreview(_source: string, _displayMode: boolean): RenderedKatex {
  return { html: '', error: '' }
}

export interface RenderedMermaid {
  svg: string
  error: string
}

export function renderMermaidPreview(_source: string): Promise<RenderedMermaid> {
  return Promise.resolve({ svg: '', error: '' })
}

