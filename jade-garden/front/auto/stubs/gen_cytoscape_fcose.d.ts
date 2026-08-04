// gen_cytoscape_fcose.d.ts — gen-project type shim for 'cytoscape-fcose'.
//
// The fcose layout package ships no TypeScript types; the front tree carries
// the same declaration in front/src/types/cytoscape-fcose.d.ts. The gen
// project (strict vue-tsc) needs its own copy for graph_view_ext.ts, which
// is mirrored verbatim into the gen tree. Mirrored into
// gen/front/vue/src/types/cytoscape-fcose.d.ts by the widget regen flow.
// NEVER SHIPS.
declare module 'cytoscape-fcose' {
  import type cytoscape from 'cytoscape'
  const cytoscapeFcose: (cytoscape: typeof cytoscape) => void
  export default cytoscapeFcose
}
