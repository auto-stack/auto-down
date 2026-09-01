// Block-widget panel registrations (plan 033 T5) — the render-layer face
// of the fence family widget. renderCodeblockPanel retired: the Codeblock
// builtin entry is gone from builtin-panels, and this module registers the
// widget's view face (panelOf) on the registry's custom slot instead —
// same channel StreamingTable pioneered (plan 032), pulled in by
// render-node's side-effect import so EVERY render consumer (MarkdownRender,
// StreamingRenderer right panes, the editor preview column) resolves the
// same widget with no editor-layer import at the call sites.
//
// plan 035 T6: renderCalloutPanel / renderListPanel retired the same way —
// the container families' view faces (panelOfContainer / the list adapter)
// own the Callout and List slots now, children riding the renderEmbedded
// closure into the widget's BlockChildren hole. The registration is
// module-scope and unconditional: the widget IS the single chrome source
// for these kinds — unregisterPanel would degrade to unknown-node (no
// builtin fallback), the shape Table/Codeblock already have. Details
// registers editor-side (EngineEditor): its marker verb needs the live
// host window's engine.

import { h } from 'vue'
import CodeBlockWidget from '../editor/components/CodeBlockWidget.vue'
import CalloutBlockWidget from '../editor/components/CalloutBlockWidget.vue'
import ListBlockWidget from '../editor/components/ListBlockWidget.vue'
import {
  containerPanelModel,
  listItemsOfPanel,
  panelOf,
  panelOfContainer,
} from './block-widget'
import { registerPanel } from './panel-registry'

registerPanel('Codeblock', panelOf(CodeBlockWidget))
registerPanel('Callout', panelOfContainer(CalloutBlockWidget))
registerPanel('List', (ctx) =>
  h(ListBlockWidget, {
    mode: 'view',
    node: containerPanelModel(ctx.node),
    final: ctx.final ?? true,
    ctx: null,
    items: listItemsOfPanel(ctx),
    version: 0,
  }),
)
