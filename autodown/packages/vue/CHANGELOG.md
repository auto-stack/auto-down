# @autodown/vue

## 0.4.0

### Minor Changes

- plan 018: forwards @autodown/engine 0.4.0 (editor kernel replaced — see engine changelog).

## 0.3.0

### Minor Changes

- plan 017: this package is now a re-export shim forwarding to `@autodown/engine` (same public surface, zero consumer changes). The parser/render/editor sources live in the engine package; retirement is planned with plan 020.

## 0.1.1

### Patch Changes

- 4095d8e: Ensure consistent minimum spacing between matched editor/preview blocks and keep the two panes aligned during scroll sync. The block-boundary insert handle now takes zero layout space, and the preview slot styles prevent child margins from collapsing into adjacent slots.
- Updated dependencies
- Updated dependencies [ef16ae2]
  - @autodown/core@0.2.0
