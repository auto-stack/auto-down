declare module 'cytoscape-fcose' {
  import type cytoscape from 'cytoscape'
  const cytoscapeFcose: (cytoscape: typeof cytoscape) => void
  export default cytoscapeFcose
}
