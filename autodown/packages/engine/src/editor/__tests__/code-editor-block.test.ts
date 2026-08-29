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
import { BlockType, Value, attrSet, block, blockText, findBlock, leafBlock, withChildren } from '../../parser/block-model'
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

describe('stream→edit readonly gate v1 (P2T2)', () => {
  // EngineEditor wiring: streaming=true flows into BlockEditCtx.readonly and
  // the focused editing face renders the banner + disabled state; the stream
  // landing (streaming=false/absent) unlocks it. Pinned at the assembly
  // level because the ctx handoff is the contract seam.

  async function renderEditor(md: string, streaming: boolean | undefined): Promise<string> {
    const app = createSSRApp({
      render: () => h(EngineEditor as any, { modelValue: md, streaming }),
    })
    return renderToString(app)
  }

  it('streaming=true renders the code edit face read-only with the banner', async () => {
    const html = (await renderEditor('```js\nconst a = 1\n```', true)).replace(/<!--.*?-->/g, '')
    // focused first block = the fence → CodeEditorBlock mounts
    expect(html).toContain('autodown-code-editor')
    expect(html).toContain('autodown-stream-banner')
    expect(html).toContain('流式生成中')
    expect(html).toContain('disabled')
  })

  it('streaming absent/ false leaves the face editable (unlocked)', async () => {
    const html = (await renderEditor('```js\nconst a = 1\n```', false)).replace(/<!--.*?-->/g, '')
    expect(html).toContain('autodown-code-editor')
    expect(html).not.toContain('autodown-stream-banner')
  })
})

describe('CodeEditorBlock.vue SSR contract (generated product, P1T7)', () => {
  // Since P1T7 the component at components/CodeEditorBlock.vue is the
  // .at-generated widget (flat chrome props; the headless controller is
  // passed in). Its textarea fills via v-model + onMounted Init, so SSR
  // renders it empty — the code write-back semantics are pinned by the
  // controller tests above.
  async function ssr(readonly: boolean): Promise<string> {
    const app = createSSRApp({
      render: () =>
        h(CodeEditorBlock as any, {
          controller: { commit: () => false },
          blockId: 'f-gen',
          language: 'js',
          code: 'const a = 1',
          readonly,
        }),
    })
    return renderToString(app)
  }

  it('renders the code-block-header title bar + multiline textarea', async () => {
    const html = (await ssr(false)).replace(/<!--.*?-->/g, '')
    expect(html).toContain('code-block-header')
    expect(html).toContain('code-header-title')
    expect(html).toContain('>js<')
    expect(html).toContain('<textarea')
    expect(html).toContain('data-block-id="f-gen"')
    expect(html).not.toContain('autodown-stream-banner')
  })

  it('readonly (streaming) renders the banner and disables the textarea', async () => {
    const html = (await ssr(true)).replace(/<!--.*?-->/g, '')
    expect(html).toContain('autodown-stream-banner')
    expect(html).toContain('流式生成中')
    expect(html).toContain('disabled')
  })
})
