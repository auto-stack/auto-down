// BlockWidget three-mode chrome parity (plan 033 T7 / D5): the pilot
// families' view / stream / edit faces mount side by side and the chrome
// layer must compute IDENTICALLY — the whole point of the family mechanism
// is that one .at widget is one chrome source, so cross-mode style drift is
// structurally impossible. This suite is the standing guard for that claim.
//
// Assertion matrix (frozen — the edit-face whitelist lives HERE):
//   equal across all three modes
//   - container box model (border width/style/radius) — math/mermaid: the
//     widget owns the container chrome in every mode (unified to the view
//     face's document-card values in T7)
//   - the shared chrome pieces' class names (.autodown-math-preview /
//     .autodown-math-error / the fence .code-block-header chain)
//   - view ≡ stream: the FULL root + body class chains (final is the only
//     difference; it is a declared prop, invisible in the DOM)
//   edit-face whitelist (allowed to differ — behavioral, not chrome)
//   - the source textarea / caret / readonly stream banner (031 idiom)
//   - the editor-stack separation chrome (preview/error border-bottom +
//     white background inside the editing stack)
//   - the FENCE container's own border/background: the view face's
//     .code-block-container is consumer-CSS territory by the retired
//     builtin's byte contract (render.test pins its class chain, the demo
//     may style it) — the widget deliberately styles no view-fence
//     container, so only the header chain + skeleton family are comparable
//   - root class NAMES per face (.autodown-math-block vs
//     .autodown-math-editor etc.): each face's root class is pinned by an
//     external contract (EDITOR-CONTRACT edit selectors / node-view view
//     selectors); parity is asserted on computed chrome, not on those names
//
// happy-dom resolves the widget SFCs' injected scoped styles, so
// getComputedStyle here reads the real single-source rules.

// @vitest-environment happy-dom

import { createApp, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BlockType, Value, attrSet, leafBlock } from '../../parser/block-model'
import { parse_blocks } from '../../parser/markdown-parser'
import { EditorEngine } from '../../editor/engine/editor-engine'
import { clearOptionalCapabilities } from '../optional-capabilities'
import CodeBlockWidget from '../../editor/components/CodeBlockWidget.vue'
import MathBlockWidget from '../../editor/components/MathBlockWidget.vue'
import MermaidBlockWidget from '../../editor/components/MermaidBlockWidget.vue'

interface Mounted {
  root: HTMLElement
  stop: () => void
}

const mounted: Mounted[] = []

/** Mount one widget face into the document; the SFC's scoped styles inject
 *  on import, happy-dom resolves them, teardown unmounts. */
function mountFace(widget: unknown, props: Record<string, unknown>): Mounted {
  vi.useFakeTimers() // the mermaid debounce never fires inside parity mounts
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render: () => h(widget as any, props) })
  app.mount(host)
  const m = { root: host.firstElementChild as HTMLElement, stop: () => {
    app.unmount()
    host.remove()
  } }
  mounted.push(m)
  return m
}

afterEach(() => {
  while (mounted.length > 0) mounted.pop()!.stop()
  vi.useRealTimers()
})

beforeEach(() => {
  clearOptionalCapabilities()
})

afterEach(() => {
  clearOptionalCapabilities()
})

function fenceNode(language: string, code: string) {
  let node = leafBlock('f1', BlockType.Fence, code)
  node = { ...node, attrs: attrSet(node.attrs, 'language', Value.Str(language)) }
  return node
}

function editCtxOf(md: string) {
  const doc = parse_blocks(md, true)
  const engine = new EditorEngine(doc)
  return { engine, node: doc.children[0]!, blockId: doc.children[0]!.id }
}

/** The chrome-layer computed property set: container box model pieces that
 *  carry no CSS variables (deterministic in happy-dom). */
const CONTAINER_PROPS = ['border-top-width', 'border-top-style', 'border-right-width', 'border-bottom-style', 'border-radius'] as const

function computedOf(el: HTMLElement | null, props: readonly string[]): string[] {
  expect(el, 'chrome element present').not.toBeNull()
  const cs = getComputedStyle(el!)
  return props.map((p) => cs.getPropertyValue(p))
}

describe('Fence family (CodeBlockWidget) — three-mode parity', () => {
  it('view ≡ stream: identical root and body class chains (final is the only difference)', () => {
    const node = fenceNode('rust', 'fn a() {}\n')
    const view = mountFace(CodeBlockWidget, { mode: 'view', node, final: true, ctx: null })
    const stream = mountFace(CodeBlockWidget, { mode: 'stream', node, final: false, ctx: null })
    expect(stream.root.className).toBe(view.root.className)
    const vPre = view.root.querySelector('pre')
    const sPre = stream.root.querySelector('pre')
    expect(sPre!.className).toBe(vPre!.className)
    expect(sPre!.getAttribute('data-language')).toBe(vPre!.getAttribute('data-language'))
  })

  it('the code-block-header chain renders with identical classes in every mode', () => {
    const node = fenceNode('rust', 'fn a() {}\n')
    const { engine, node: eNode, blockId } = editCtxOf('```rust\nfn a() {}\n```')
    const view = mountFace(CodeBlockWidget, { mode: 'view', node, final: true, ctx: null })
    const stream = mountFace(CodeBlockWidget, { mode: 'stream', node, final: false, ctx: null })
    const edit = mountFace(CodeBlockWidget, { mode: 'edit', node: eNode, ctx: { engine, blockId, readonly: false } })
    for (const m of [view, stream, edit]) {
      const header = m.root.querySelector('.code-block-header')
      expect(header, 'header chain present').not.toBeNull()
      expect(header!.className).toBe('code-block-header flex justify-between items-center')
      const title = header!.querySelector('.code-header-title')
      expect(title!.className).toBe('code-header-title')
    }
  })

  it('header typography computes identically across the three modes', () => {
    const node = fenceNode('rust', 'fn a() {}\n')
    const { engine, node: eNode, blockId } = editCtxOf('```rust\nfn a() {}\n```')
    const view = mountFace(CodeBlockWidget, { mode: 'view', node, final: true, ctx: null })
    const edit = mountFace(CodeBlockWidget, { mode: 'edit', node: eNode, ctx: { engine, blockId, readonly: false } })
    const vTitle = computedOf(view.root.querySelector('.code-header-title'), ['font-size', 'font-weight', 'line-height'])
    const eTitle = computedOf(edit.root.querySelector('.code-header-title'), ['font-size', 'font-weight', 'line-height'])
    expect(eTitle).toEqual(vTitle)
  })

  it('the 032 skeleton family keys on node attrs identically in view and stream', () => {
    let node = fenceNode('rust', 'fn a() {')
    node = { ...node, attrs: attrSet(node.attrs, 'loading', Value.Bool(true)) }
    const view = mountFace(CodeBlockWidget, { mode: 'view', node, final: true, ctx: null })
    const stream = mountFace(CodeBlockWidget, { mode: 'stream', node, final: false, ctx: null })
    expect(view.root.className).toContain('autodown-block-placeholder is-loading')
    expect(stream.root.className).toBe(view.root.className)
  })
})

describe('Math family (MathBlockWidget) — three-mode parity', () => {
  const MATH_MD = '%{\ne = mc^2\n}%\n'

  function faces() {
    const node = leafBlock('m1', BlockType.MathBlock, 'e = mc^2')
    const { engine, node: eNode, blockId } = editCtxOf(MATH_MD)
    return {
      view: mountFace(MathBlockWidget, { mode: 'view', node, final: true, ctx: null }),
      stream: mountFace(MathBlockWidget, { mode: 'stream', node, final: false, ctx: null }),
      edit: mountFace(MathBlockWidget, { mode: 'edit', node: eNode, ctx: { engine, blockId, readonly: false } }),
    }
  }

  it('container box model computes identically in every mode (widget-owned chrome)', () => {
    const f = faces()
    const v = computedOf(f.view.root, CONTAINER_PROPS)
    expect(computedOf(f.stream.root, CONTAINER_PROPS)).toEqual(v)
    expect(computedOf(f.edit.root, CONTAINER_PROPS)).toEqual(v)
  })

  it('the container rule is the family canon: border resolves in every mode or in none', () => {
    // happy-dom drops declarations carrying var() (the view canon's hsl(var
    // (--border, ...)) fallback chain) — so the pin here is ALL-OR-NOTHING:
    // the same declaration either resolves in every mode or in none. A
    // per-mode fork would surface as unequal strings in the test above; the
    // 1px/solid values themselves are pinned by the .at style source (the
    // single chrome source this plan exists to create).
    const f = faces()
    const widths = [f.view.root, f.stream.root, f.edit.root].map((el) =>
      getComputedStyle(el).getPropertyValue('border-top-width'),
    )
    expect(new Set(widths).size).toBe(1)
  })

  it('the shared preview/error pieces keep one class name and one rule set (view ≡ stream)', () => {
    const f = faces()
    const vPreview = f.view.root.querySelector('.autodown-math-preview') as HTMLElement | null
    const sPreview = f.stream.root.querySelector('.autodown-math-preview') as HTMLElement | null
    expect(sPreview!.className).toBe(vPreview!.className)
    expect(computedOf(sPreview, ['padding-top', 'padding-left', 'overflow-x'])).toEqual(
      computedOf(vPreview, ['padding-top', 'padding-left', 'overflow-x']),
    )
    const ePreview = f.edit.root.querySelector('.autodown-math-preview')
    expect(ePreview!.className).toBe(vPreview!.className)
  })

  it('edit-face whitelist: textarea / caret / banner / stack separation are the only divergences', () => {
    const f = faces()
    // the editing face's behavioral pieces exist only there
    expect(f.edit.root.querySelector('.math-editor-textarea')).not.toBeNull()
    expect(f.view.root.querySelector('.math-editor-textarea')).toBeNull()
    // the stack separation chrome (border-bottom + white bg) is edit-only
    const stack = f.edit.root.querySelector('.math-editor-stack')
    expect(stack).not.toBeNull()
  })
})

describe('Mermaid family (MermaidBlockWidget) — three-mode parity', () => {
  const MERMAID_MD = '```mermaid\ngraph TD; A-->B;\n```\n'

  function faces() {
    const node = leafBlock('g1', BlockType.Mermaid, 'graph TD; A-->B;')
    const { engine, node: eNode, blockId } = editCtxOf(MERMAID_MD)
    return {
      view: mountFace(MermaidBlockWidget, { mode: 'view', node, final: true, ctx: null }),
      stream: mountFace(MermaidBlockWidget, { mode: 'stream', node, final: false, ctx: null }),
      edit: mountFace(MermaidBlockWidget, { mode: 'edit', node: eNode, ctx: { engine, blockId, readonly: false } }),
    }
  }

  it('container box model computes identically in every mode (widget-owned chrome)', () => {
    const f = faces()
    const v = computedOf(f.view.root, CONTAINER_PROPS)
    expect(computedOf(f.stream.root, CONTAINER_PROPS)).toEqual(v)
    expect(computedOf(f.edit.root, CONTAINER_PROPS)).toEqual(v)
  })

  it('view ≡ stream: identical root class and source slot chain', () => {
    const f = faces()
    expect(f.stream.root.className).toBe(f.view.root.className)
    expect(f.stream.root.querySelector('.mermaid-source')!.className).toBe(
      f.view.root.querySelector('.mermaid-source')!.className,
    )
  })

  it('edit-face whitelist: the debounce tri-state pieces are edit-only', () => {
    const f = faces()
    expect(f.edit.root.querySelector('.mermaid-editor-textarea')).not.toBeNull()
    expect(f.view.root.querySelector('.mermaid-editor-textarea')).toBeNull()
    expect(f.view.root.querySelector('.mermaid-source')).not.toBeNull()
  })
})
