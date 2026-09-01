// Block-widget panel registrations (plan 033 T5) — the render-layer face
// of the fence family widget. renderCodeblockPanel retired: the Codeblock
// builtin entry is gone from builtin-panels, and this module registers the
// widget's view face (panelOf) on the registry's custom slot instead —
// same channel StreamingTable pioneered (plan 032), pulled in by
// render-node's side-effect import so EVERY render consumer (MarkdownRender,
// StreamingRenderer right panes, the editor preview column) resolves the
// same widget with no editor-layer import at the call sites.
//
// The registration is module-scope and unconditional: the widget IS the
// single chrome source for the pilot kinds now — unregisterPanel('Codeblock')
// would degrade code blocks to unknown-node (the builtin no longer exists
// as a fallback), which is the same shape Table has had since 032.

import CodeBlockWidget from '../editor/components/CodeBlockWidget.vue'
import { panelOf } from './block-widget'
import { registerPanel } from './panel-registry'

registerPanel('Codeblock', panelOf(CodeBlockWidget))
