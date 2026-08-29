export { default as StreamingRenderer } from './StreamingRenderer.vue'
export { default as StreamingTable } from './StreamingTable.vue'
export { default as MarkdownRender } from './MarkdownRender.vue'
export { useStreamingDocument } from './useStreamingDocument'
export { parseDocument } from './markdown-parser.generated'
export {
  enableKatex,
  enableMermaid,
  enableHighlight,
  isCapabilityEnabled,
  clearOptionalCapabilities,
} from './optional-capabilities'
export { setHighlightImpl, getHighlightImpl } from './highlight'
export type { HighlightFn } from './highlight'
export { lowlightHighlighter } from './highlight-lowlight'
export type {
  MarkdownSegment,
  ComponentSegment,
  StreamingSegment,
} from './useStreamingDocument'
