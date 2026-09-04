import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// PLAN-051 T3：--ad-accent* 三件套定义单源（Design 22 §7.2 规约行的
// 唯一 vue 投影）——autodown-editor.css 一条双根规则喂
// .autodown-editor 与 .streaming-document，StreamingRenderer scoped
// 段不得再留副本（双定义曾是漂移温床，plan 039 注记的残留结构）。
const stylesDir = dirname(fileURLToPath(import.meta.url))
const editorCss = readFileSync(join(stylesDir, '../autodown-editor.css'), 'utf8')
const rendererVue = readFileSync(
  join(stylesDir, '../../..', 'render/StreamingRenderer.vue'),
  'utf8',
)

const declRe = /--ad-accent[a-z-]*\s*:/g

function count(s: string): number {
  return (s.match(declRe) ?? []).length
}

describe('accent token single source (PLAN-051 T3)', () => {
  it('StreamingRenderer.vue declares no --ad-accent* of its own', () => {
    expect(count(rendererVue)).toBe(0)
  })

  it('autodown-editor.css declares exactly the 3-token set, once', () => {
    expect(count(editorCss)).toBe(3)
  })

  it('the single definition rule covers both pane roots', () => {
    const m = editorCss.match(/([^{}]+)\{[^{}]*--ad-accent[^{}]*\}/)
    expect(m).not.toBeNull()
    const sel = m![1]
    expect(sel).toContain('.autodown-editor')
    expect(sel).toContain('.streaming-document')
  })
})
