// CodeBlockWidget (plan 033 T2): the fence family's three-mode widget —
// byte-parity vs the faces it absorbs, while both still exist (this is the
// migration scaffold: T6 flips the assembly onto the widget and render.test
// becomes the lasting contract; the builtin-vs-widget comparisons below then
// retire with renderCodeblockPanel).
//
//   view/stream  vs  builtin renderCodeblockPanel   (attr-order-normalized —
//                   the vue backend orders bindings its own way; the frozen
//                   contract is selector/content-level, cf. render.test's
//                   [^>]* regexes)
//   stream       vs  view                            (chrome 单份 invariant)
//   edit         vs  EngineEditor's fenceEditSlot    (CodeEditorBlock core +
//                   the badge host wrapper, absorbed whole)

import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BlockType, Value, attrSet, leafBlock } from '../../parser/block-model'
import { codeNode } from '../../parser/markdown-parser'
import { parse_blocks } from '../../parser/markdown-parser'
import { EditorEngine } from '../engine/editor-engine'
import { builtinPanelRenderers } from '../../render/builtin-panels'
import type { PanelRenderCtx } from '../../render/panel-registry'
import { panelOf } from '../../render/block-widget'
import { resolveBlockComponent } from '../../render/block-component'
import { clearOptionalCapabilities } from '../../render/optional-capabilities'
import EngineEditor from '../components/EngineEditor.vue'
import CodeBlockWidget from '../components/CodeBlockWidget.vue'

async function ssr(vnode: unknown): Promise<string> {
  const app = createSSRApp({ render: () => h({ render: () => vnode } as any) })
  return (await renderToString(app)).replace(/<!--.*?-->/g, '')
}

/** Normalize for comparison: sort every tag's attributes (the vue backend
 *  emits bindings in its own order, the hand-written h() calls another —
 *  the frozen DOM contract is selector/content-level, cf. render.test's
 *  [^>]* tolerances), fold valueless attrs to attr="" (an h('x', {a: ''})
 *  renders valueless, a :a="''" template binding renders =""), and drop
 *  the scoped-CSS data-v-* hashes (per-component build artifacts, not
 *  contract). */
function norm(html: string): string {
  return html.replace(/<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[:\w.-]+(?:="[^"]*")?)*)\s*(\/?)>/g, (_m, tag, attrs: string, self: string) => {
    const list = attrs
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((a) => (a.includes('=') ? a : `${a}=""`))
      .filter((a) => !/^data-v-[0-9a-f]+=""/.test(a))
      .sort()
    return `<${tag}${list.length > 0 ? ' ' + list.join(' ') : ''}${self}>`
  })
}

function ctxOf(w: unknown, final = true): PanelRenderCtx {
  return {
    node: w as any,
    final,
    budget: undefined,
    spec: { kind: 'Codeblock' } as any,
    renderEmbedded: () => h('div'),
    renderInlineChildren: () => [],
  }
}

beforeEach(() => {
  clearOptionalCapabilities()
})

afterEach(() => {
  clearOptionalCapabilities()
})

describe('view face: panelOf(CodeBlockWidget) vs builtin renderCodeblockPanel', () => {
  const CORPUS: { name: string; w: ReturnType<typeof codeNode> }[] = [
    { name: 'closed fence with language', w: codeNode('rust', 'fn a() {}\n', false) },
    { name: 'fence without language', w: codeNode('', 'plain\n', false) },
    { name: 'empty code body', w: codeNode('js', '', false) },
    { name: 'open fence (032 loading skeleton)', w: codeNode('rust', 'fn a() {', true) },
  ]

  for (const { name, w } of CORPUS) {
    it(`byte parity (attr-order normalized): ${name}`, async () => {
      const builtin = await ssr(builtinPanelRenderers.Codeblock(ctxOf(w)))
      const widget = await ssr(panelOf(CodeBlockWidget)(ctxOf(w)))
      expect(norm(widget)).toBe(norm(builtin))
    })
  }

  it('view contract pins: container chain, pre[data-language], aria-busy, skeleton family', async () => {
    const closed = await ssr(panelOf(CodeBlockWidget)(ctxOf(codeNode('rust', 'fn a() {}\n', false))))
    expect(closed).toContain('class="code-block-container rounded-lg border"')
    expect(closed).toContain('class="code-block-header flex justify-between items-center"')
    expect(closed).toContain('class="code-header-title"')
    expect(closed).toMatch(/<pre[^>]*data-language="rust"[^>]*><code[^>]*>fn a\(\) \{\}\n<\/code>/)
    expect(closed).toContain('aria-busy="false"')
    const open = await ssr(panelOf(CodeBlockWidget)(ctxOf(codeNode('rust', 'fn a() {', true))))
    expect(open).toContain('code-block-container rounded-lg border autodown-block-placeholder is-loading')
    expect(open).toContain('aria-busy="true"')
  })
})

describe('stream face: same chrome as view (chrome 单份)', () => {
  it('mode stream renders byte-identical to mode view (final only differs)', async () => {
    let node = leafBlock('f1', BlockType.Fence, 'fn a() {}\n')
    node = { ...node, attrs: attrSet(node.attrs, 'language', Value.Str('rust')) }
    const view = await ssr(h(CodeBlockWidget as any, { mode: 'view', node, final: true }))
    const stream = await ssr(h(CodeBlockWidget as any, { mode: 'stream', node, final: false }))
    expect(norm(stream)).toBe(norm(view))
  })

  it('stream open-fence skeleton: the 032 is-loading family via node attrs', async () => {
    let node = leafBlock('f1', BlockType.Fence, 'fn a() {')
    node = { ...node, attrs: attrSet(attrSet(node.attrs, 'language', Value.Str('rust')), 'loading', Value.Bool(true)) }
    const stream = await ssr(h(CodeBlockWidget as any, { mode: 'stream', node, final: false }))
    expect(stream).toContain('autodown-block-placeholder is-loading')
    expect(stream).toContain('aria-busy="true"')
  })
})

describe('edit face: absorbs fenceEditSlot (CodeEditorBlock + badge wrapper)', () => {
  function docOf(md: string) {
    const doc = parse_blocks(md, true)
    const engine = new EditorEngine(doc)
    const node = doc.children[0]!
    return { engine, node, blockId: node.id }
  }

  it('byte parity (attr-order normalized) with the live fenceEditSlot output', async () => {
    void EngineEditor // module-scope edit registration (the old face)
    const { engine, node, blockId } = docOf('```rust\nfn a() {}\n```')
    const old = await ssr(resolveBlockComponent('Fence').edit!(node, { engine, blockId, readonly: false }))
    const widget = await ssr(h(CodeBlockWidget as any, { mode: 'edit', node, ctx: { engine, blockId, readonly: false } }))
    expect(norm(widget)).toBe(norm(old))
  })

  it('carries the CodeBlockMenu host contract: wrapper + badge + textarea + blur wiring', async () => {
    const { engine, node, blockId } = docOf('```rust\nfn a() {}\n```')
    const html = await ssr(h(CodeBlockWidget as any, { mode: 'edit', node, ctx: { engine, blockId, readonly: false } }))
    expect(html).toContain('class="autodown-codeblock-node"')
    expect(html).toContain('data-language="rust"')
    expect(html).toContain('data-codeblock-language-badge')
    expect(html).toContain('title="切换语言"')
    expect(html).toContain('>rust</button>')
    expect(html).toContain('class="autodown-code-editor"')
    expect(html).toContain('data-node-type="Fence"')
    expect(html).toContain('code-editor-highlight')
    expect(html).toContain('<textarea')
    expect(html).toContain('fn a() {}')
  })

  it('readonly: stream banner + disabled textarea (031 idiom carried over)', async () => {
    const { engine, node, blockId } = docOf('```rust\nx\n```')
    const html = await ssr(h(CodeBlockWidget as any, { mode: 'edit', node, ctx: { engine, blockId, readonly: true } }))
    expect(html).toContain('autodown-stream-banner')
    expect(html).toContain('disabled')
    expect(html).toContain('is-readonly')
  })
})
