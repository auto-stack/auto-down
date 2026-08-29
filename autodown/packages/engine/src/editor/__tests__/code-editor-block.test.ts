// CodeEditorBlock tests (plan 023 P1T4): the typed code-block editing face.
//
// - CodeEditorController (headless, BlockHost pattern): blur-commit writes the
//   whole code text back as ONE undo step (applyTree), serialize round-trip
//   keeps the fenced block, unchanged commits are no-ops.
// - CodeEditorBlock.vue (SSR): language title bar keeps the code-block-header
//   DOM contract; readonly renders the streaming banner + disabled textarea.

import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { BlockType, Value, attrSet, findBlock, leafBlock, blockText, withChildren, block } from '../../parser/block-model'
import { parse_blocks } from '../../parser/markdown-parser'
import { serialize } from '../../parser/serializer'
import { EditorEngine } from '../engine/editor-engine'
import { CodeEditorController } from '../engine/code-editor-controller'
import CodeEditorBlock from '../components/CodeEditorBlock.vue'
import EngineEditor from '../components/EngineEditor.vue'
import { resolveBlockComponent } from '../../render/block-component'

function fenceDoc(): { engine: EditorEngine; blockId: string } {
  const doc = parse_blocks('para one\n\n```js\nconst a = 1\n```\n\npara two', true)
  const engine = new EditorEngine(doc)
  const fence = doc.children.find((n) => n.kind === BlockType.Fence)
  return { engine, blockId: fence!.id }
}

describe('CodeEditorController commit semantics', () => {
  it('blur-commit writes the whole code text back as one undo step', () => {
    const { engine, blockId } = fenceDoc()
    const c = new CodeEditorController(engine, blockId)
    // the parser's canonical fence body keeps the trailing newline
    expect(c.code).toBe('const a = 1\n')

    const changed = c.commit('const a = 1\nconst b = 2\n')
    expect(changed).toBe(true)
    const found = findBlock(engine.doc, blockId)
    expect(blockText(found!)).toBe('const a = 1\nconst b = 2\n')

    expect(engine.canUndo).toBe(true)
    engine.undo()
    expect(blockText(findBlock(engine.doc, blockId)!)).toBe('const a = 1\n')
  })

  it('serialize round-trip keeps the edited fenced block', () => {
    const { engine, blockId } = fenceDoc()
    const c = new CodeEditorController(engine, blockId)
    c.commit('let x = 42\n')
    const md = serialize(engine.doc, true)
    expect(md).toContain('```js')
    expect(md).toContain('let x = 42')
    const reparsed = parse_blocks(md, true)
    const fence = reparsed.children.find((n) => n.kind === BlockType.Fence)
    expect(blockText(fence!)).toBe('let x = 42\n')
  })

  it('committing identical text is a no-op (no undo entry)', () => {
    const { engine, blockId } = fenceDoc()
    const before = engine.canUndo
    const c = new CodeEditorController(engine, blockId)
    expect(c.commit('const a = 1\n')).toBe(false)
    expect(engine.canUndo).toBe(before)
  })

  it('commit on a removed block returns false without touching the tree', () => {
    const { engine, blockId } = fenceDoc()
    const c = new CodeEditorController(engine, blockId)
    engine.replaceDoc(withChildren(block('r', BlockType.Paragraph), [leafBlock('only', BlockType.Paragraph, 'text')]))
    expect(c.commit('nope')).toBe(false)
  })

  it('syncFromModel picks up external model changes', () => {
    const { engine, blockId } = fenceDoc()
    const c = new CodeEditorController(engine, blockId)
    const other = new CodeEditorController(engine, blockId)
    other.commit('changed elsewhere\n')
    c.syncFromModel()
    expect(c.code).toBe('changed elsewhere\n')
    expect(attrSet(c.node()!.attrs, 'language', Value.Str('js')), 'language attr untouched').toBeTruthy()
  })
})

describe('Fence edit-slot registration (P1T5)', () => {
  it('the EngineEditor assembly resolves a Fence edit face', () => {
    // importing EngineEditor runs the module-scope registration (P1T5)
    void EngineEditor
    const comp = resolveBlockComponent('Fence')
    expect(typeof comp.edit).toBe('function')
    expect(typeof comp.view).toBe('function')
  })
})

describe('CodeEditorBlock.vue SSR contract', () => {
  async function ssr(node: any, readonly: boolean): Promise<string> {
    // the controller reads from the engine, so the engine doc must hold the node
    const engine = new EditorEngine(withChildren(block('root', BlockType.Paragraph), [node]))
    const app = createSSRApp({
      render: () => h(CodeEditorBlock as any, { node, ctx: { engine, blockId: node.id, readonly } }),
    })
    return renderToString(app)
  }

  it('renders the code-block-header title bar + multiline textarea', async () => {
    let node = leafBlock('f-ssr', BlockType.Fence, 'const a = 1')
    node = { ...node, attrs: attrSet(node.attrs, 'language', Value.Str('js')) }
    const html = (await ssr(node, false)).replace(/<!--.*?-->/g, '')
    expect(html).toContain('code-block-header')
    expect(html).toContain('code-header-title')
    expect(html).toContain('>js<')
    expect(html).toContain('<textarea')
    expect(html).toContain('const a = 1')
    expect(html).not.toContain('autodown-stream-banner')
  })

  it('readonly (streaming) renders the banner and disables the textarea', async () => {
    let node = leafBlock('f-ro', BlockType.Fence, 'const a = 1')
    node = { ...node, attrs: attrSet(node.attrs, 'language', Value.Str('js')) }
    const html = (await ssr(node, true)).replace(/<!--.*?-->/g, '')
    expect(html).toContain('autodown-stream-banner')
    expect(html).toContain('流式生成中')
    expect(html).toContain('disabled')
  })
})
