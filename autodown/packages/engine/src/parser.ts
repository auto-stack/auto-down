// @autodown/engine — ./parser exit, frozen in plan 017 Phase 3. Kernel
// layer public surface: document parse (streaming subset) + block parse +
// serialize. The wider kernel internals (block ops, IAL preprocessing)
// stay layer-internal; the vue-free property is asserted at build time
// (scripts/assert-parser-pure.mjs).
export { parseDocument, parse_blocks } from './parser/markdown-parser'
export { serialize, serializeBlocks } from './parser/serializer'
export type { BlockNode } from './parser/block-model'
