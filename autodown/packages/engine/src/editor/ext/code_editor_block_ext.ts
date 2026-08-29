// code_editor_block_ext.ts — platform bridge for the CodeEditorBlock widget
// (plan 023 P1T7). The .at source owns the chrome; the headless commit
// protocol stays on the hand-written CodeEditorController (engine kernel,
// constructed by the EngineEditor edit slot and passed in as a prop), and
// the DOM helpers live here — the DSL's template refs are typed HTMLElement
// and have no casts, so setSelectionRange/scrollHeight access needs plain
// TS (same gap as focusAndSelect in node_view_ext.ts).

export function focusCodeArea(el: HTMLElement | null, readonly: boolean): void {
  if (!el || readonly) return
  const area = el as HTMLTextAreaElement
  area.focus()
  const end = area.value.length
  area.setSelectionRange(end, end)
  resizeCodeArea(area)
}

export function resizeCodeArea(el: HTMLElement | null): void {
  const area = el as HTMLTextAreaElement | null
  if (!area) return
  area.style.height = 'auto'
  area.style.height = `${area.scrollHeight}px`
}
