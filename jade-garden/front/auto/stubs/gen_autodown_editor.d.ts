// gen_autodown_editor.d.ts — gen-project module declaration for
// '@autodown/editor'.
//
// The editor package is a workspace `link:` dependency of jade-garden/front
// and cannot be installed into the self-contained gen project; editor_tab_ext
// re-exports AutoDownEditor from it. Mirrored into
// gen/front/vue/src/types/autodown-editor.d.ts by the widget Regenerate flow
// so gen-side vue-tsc accepts the import. NEVER SHIPS.
// (cytoscape-fcose.d.ts precedent — same mechanism for an untyped package.)

declare module '@autodown/editor' {
  export const AutoDownEditor: any
}
