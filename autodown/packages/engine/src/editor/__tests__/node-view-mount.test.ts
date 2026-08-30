// Node-view preview mount tests (plan 026 P1T2/P1T3): the panel-registry
// registrations the EngineEditor assembly performs mount the generated
// NodeView widgets on the preview side — SSR asserts the data-node-view DOM
// markers and attrs-driven rendering; the writeback assertion drives the
// mounted widget's updateAttributes (the Details toggle channel) into the
// model and the serializer.

import { createSSRApp, h, type VNode } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import {
  BlockNode,
  BlockType,
  Value,
  attrSet,
  block,
  findBlock,
  leafBlock,
  withChildren,
  collapsedSel,
} from '../../parser/block-model'
import { serialize } from '../../parser/serializer'
import { renderNodes } from '../../render/render-node'
import { blockNodesToWNodes, blockOfWNode } from '../../render/block-wnode'
import { EditorEngine } from '../engine/editor-engine'
import { pushNodeViewHost, popNodeViewHost } from '../engine/node-view-host'
import DetailsNodeView from '../node-views/DetailsNodeView.vue'
// importing the assembly performs the module-scope panel registrations
import '../components/EngineEditor.vue'

function doc(...kids: BlockNode[]): BlockNode {
  return withChildren(block('doc', BlockType.Paragraph), kids)
}

function detailsNode(open = false): BlockNode {
  const n = block('d1', BlockType.Details)
  n.attrs = attrSet(n.attrs, 'summary', Value.Str('Hint'))
  n.attrs = attrSet(n.attrs, 'open', Value.Bool(open))
  return withChildren(n, [leafBlock('d1-p', BlockType.Paragraph, 'hidden body')])
}

/** SSR-render one model block through the preview pipeline (the same
 *  blockNodesToWNodes -> renderNodes leg EngineEditor.previewVNodeOf uses). */
async function ssrPreview(node: BlockNode, engine?: EditorEngine): Promise<string> {
  let vnode: VNode
  if (engine) {
    pushNodeViewHost({ engine })
    try {
      vnode = renderNodes(blockNodesToWNodes([node]), true)[0]!
    } finally {
      popNodeViewHost()
    }
  } else {
    vnode = renderNodes(blockNodesToWNodes([node]), true)[0]!
  }
  const app = createSSRApp({ render: () => h('div', [vnode]) })
  return (await renderToString(app)).replace(/<!--.*?-->/g, '')
}

/** Walk a vnode tree for the component vnode of `type`. */
function findComponentVNode(vnode: any, type: unknown): VNode | null {
  if (!vnode || typeof vnode !== 'object') return null
  if (vnode.type === type) return vnode
  const kids = vnode.component ? null : vnode.children
  if (Array.isArray(kids)) {
    for (const k of kids) {
      const found = findComponentVNode(k, type)
      if (found) return found
    }
  } else if (kids && typeof kids === 'object') {
    // slot object (pre-mount component vnode): search the default slot's
    // return — a vnode, a fragment, or an array
    const d = (kids as any).default
    if (typeof d === 'function') return findComponentVNode(d(), type)
  }
  return null
}

describe('Details preview mount (plan 026 P1T2)', () => {
  it('renders the DetailsNodeView with data-node-view markers and attrs', async () => {
    const html = await ssrPreview(detailsNode(false))
    expect(html).toContain('data-node-view-wrapper')
    expect(html).toContain('autodown-details')
    expect(html).toContain('data-open="false"')
    expect(html).toContain('Hint')
    // NodeViewContent hole renders the body
    expect(html).toContain('data-node-view-content')
    expect(html).toContain('hidden body')
  })

  it('open=true renders expanded (data-open="true")', async () => {
    const html = await ssrPreview(detailsNode(true))
    expect(html).toContain('data-open="true"')
  })

  it('the mounted widget toggle writes back through the model and serializes', async () => {
    const e = new EditorEngine(doc(detailsNode(false)), collapsedSel('d1-p', 0))
    let vnode: VNode
    pushNodeViewHost({ engine: e })
    try {
      vnode = renderNodes(blockNodesToWNodes([findBlock(e.doc, 'd1')!]), true)[0]!
    } finally {
      popNodeViewHost()
    }
    // mountNodeView wraps the widget in NodeViewContentProvider — the walker
    // descends the provider's default slot to the widget vnode
    const widget = findComponentVNode(vnode, DetailsNodeView)
    expect(widget).toBeTruthy()
    // the widget's ToggleOpen channel: updateAttributes({ open: !is_open })
    const update = (widget!.props as any).updateAttributes as (patch: Record<string, unknown>) => void
    update({ open: true })
    expect(serialize(e.doc, false)).toContain('$details(summary: "Hint", open: true)')
  })

  it('the WNode bridge carries the model block for the panel props', () => {
    const node = detailsNode(true)
    const [w] = blockNodesToWNodes([node])
    expect(w!.type).toBe('details')
    expect(blockOfWNode(w!)!).toBe(node)
  })

  it('renders statically without a host engine (MarkdownRender path)', async () => {
    const html = await ssrPreview(detailsNode(false))
    expect(html).toContain('autodown-details')
    expect(html).toContain('data-open="false"')
  })
})
