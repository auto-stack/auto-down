// PLAN-646: Select Anything overlay —— 任意 AutoUI Vue 页面 Alt+拖拽框选，
// 返回与 VM/MCP 端同一契约的结构化信封（中心包含命中 → 顶层修剪 → 文档序）。
// dev-only：main.ts 在 import.meta.env.DEV 下动态 import，Vite 产物构建
// tree-shake 掉本模块，不进 bundle。

import { AUTO_SOURCES } from '../auto-sources'

const DRAG_THRESHOLD = 4

interface SelectedNode {
  id: string
  kind: string
  span: [number, number] | null
  source: string | null
  structure: unknown
}

function sourceFor(el: Element): string {
  // 子件元素的 span 归各自 .at（data-auto-src=stem）；缺省回落 app/首个。
  const key = el.getAttribute('data-auto-src')
  if (key && AUTO_SOURCES[key] != null) return AUTO_SOURCES[key]
  const keys = Object.keys(AUTO_SOURCES)
  if (keys.length === 0) return ''
  return AUTO_SOURCES['app'] ?? AUTO_SOURCES[keys[0]] ?? ''
}

const UTF8 = new TextEncoder()
const UTF8D = new TextDecoder()

/// .at span 是字节偏移（Rust 侧口径）；JS 字符串按 UTF-16 码元索引，
/// 中文注释会让两种单位错位——统一走 UTF-8 字节切片。
function sliceBytes(src: string, off: number, len: number): string | null {
  const bytes = UTF8.encode(src)
  if (off + len > bytes.length || off < 0 || len < 0) return null
  return UTF8D.decode(bytes.subarray(off, off + len))
}

function appName(): string {
  const keys = Object.keys(AUTO_SOURCES)
  return keys.length > 0 ? keys[0] : 'app'
}

function dedent(text: string): string {
  const lines = text.split('\n')
  const nonEmpty = lines.filter((l) => l.trim().length > 0)
  if (nonEmpty.length === 0) return ''
  const prefix = Math.min(...nonEmpty.map((l) => l.length - l.trimStart().length))
  const first = lines.findIndex((l) => l.trim().length > 0)
  let last = 0
  lines.forEach((l, i) => {
    if (l.trim().length > 0) last = i
  })
  return lines
    .slice(first, last + 1)
    .map((l) => l.slice(prefix))
    .join('\n')
}

function buildStructure(el: Element): unknown {
  // DOM 子树 → {tag, props, children}（剥 data-auto-* 标记；文本子节点为字符串）。
  const props: Record<string, string> = {}
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith('data-auto-')) props[attr.name] = attr.value
  }
  const children: unknown[] = []
  el.childNodes.forEach((n) => {
    if (n.nodeType === Node.ELEMENT_NODE) {
      children.push(buildStructure(n as Element))
    } else if (n.nodeType === Node.TEXT_NODE) {
      const t = (n as Text).textContent?.trim()
      if (t) children.push(t)
    }
  })
  const out: Record<string, unknown> = { tag: el.tagName.toLowerCase() }
  if (Object.keys(props).length > 0) out.props = props
  if (children.length > 0) out.children = children
  return out
}

function collectSelection(rect: { left: number; top: number; right: number; bottom: number }): SelectedNode[] {
  const hits: Element[] = []
  document.querySelectorAll('[data-auto-span]').forEach((el) => {
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    if (rect.left <= cx && cx <= rect.right && rect.top <= cy && cy <= rect.bottom) {
      hits.push(el)
    }
  })
  // 顶层修剪：祖先链上有命中元素 → 被吸收（组织结构语义）。
  const hitSet = new Set<Element>(hits)
  const topmost = hits.filter((el) => {
    let p = el.parentElement
    while (p) {
      if (hitSet.has(p)) return false
      p = p.parentElement
    }
    return true
  })
  return topmost.map((el) => {
    const kind = el.getAttribute('data-auto-tag') ?? el.tagName.toLowerCase()
    const id = el.getAttribute('data-auto-id') ?? ''
    let span: [number, number] | null = null
    let source: string | null = null
    const raw = el.getAttribute('data-auto-span')
    if (raw) {
      const parts = raw.split(':')
      const off = Number(parts[0])
      const len = Number(parts[1])
      const src = sourceFor(el)
      if (Number.isFinite(off) && Number.isFinite(len) && src.length > 0) {
        const sliced = sliceBytes(src, off, len)
        if (sliced !== null) {
          span = [off, len]
          source = dedent(sliced)
        }
      }
    }
    return { id, kind, span, source, structure: buildStructure(el) }
  })
}

function envelopeHeader(rect: { x: number; y: number; w: number; h: number }, n: number): string {
  return `// ── AutoUI Select Anything ── surface=vue app=${appName()} rect=(${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.w)},${Math.round(rect.h)}) nodes=${n}`
}

function renderAuto(rect: { x: number; y: number; w: number; h: number }, nodes: SelectedNode[]): string {
  const n = nodes.length
  let out = envelopeHeader(rect, n) + '\n'
  if (n === 0) {
    out += '// (no nodes selected)\n'
    return out
  }
  nodes.forEach((nd, i) => {
    if (nd.span && nd.source !== null) {
      out += `\n// [${i + 1}/${n}] ${nd.kind}  span=${nd.span[0]}..${nd.span[0] + nd.span[1]}\n`
      out += nd.source + (nd.source.endsWith('\n') ? '' : '\n')
    } else {
      out += `\n// [${i + 1}/${n}] ${nd.kind}  (synthetic, no source span)\n`
      out += JSON.stringify(nd.structure, null, 2) + '\n'
    }
  })
  return out
}

function renderJson(rect: { x: number; y: number; w: number; h: number }, nodes: SelectedNode[]): string {
  return JSON.stringify(
    { surface: 'vue', app: appName(), rect: [rect.x, rect.y, rect.w, rect.h], nodes },
    null,
    2,
  )
}

function showPanel(autoText: string, jsonText: string): void {
  const old = document.getElementById('__auto-select-panel')
  if (old) old.remove()

  const panel = document.createElement('div')
  panel.id = '__auto-select-panel'
  panel.style.cssText =
    'position:fixed;right:16px;bottom:16px;width:460px;max-height:60vh;z-index:2147483647;' +
    'background:#fafafa;border:1px solid #d4d4d4;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);' +
    'display:flex;flex-direction:column;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#222'

  const bar = document.createElement('div')
  bar.style.cssText = 'display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid #e5e5e5'
  let view: 'auto' | 'json' = 'auto'
  const body = document.createElement('pre')
  body.style.cssText = 'margin:0;padding:8px;overflow:auto;flex:1;white-space:pre-wrap;word-break:break-all'
  const show = (): void => {
    body.textContent = view === 'auto' ? autoText : jsonText
    tabAuto.style.background = view === 'auto' ? '#fff' : '#ececec'
    tabJson.style.background = view === 'json' ? '#fff' : '#ececec'
  }
  const mkChip = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement('button')
    b.textContent = label
    b.style.cssText = 'border:1px solid #d4d4d4;border-radius:4px;padding:2px 8px;cursor:pointer;font:inherit'
    b.addEventListener('click', onClick)
    return b
  }
  const tabAuto = mkChip('Auto', () => {
    view = 'auto'
    show()
  })
  const tabJson = mkChip('JSON', () => {
    view = 'json'
    show()
  })
  const copyBtn = mkChip('复制', () => {
    const text = view === 'auto' ? autoText : jsonText
    navigator.clipboard
      .writeText(text)
      .then(() => {
        copyBtn.textContent = '已复制 ✓'
        setTimeout(() => (copyBtn.textContent = '复制'), 1500)
      })
      .catch(() => {
        copyBtn.textContent = '复制失败 ✕'
        setTimeout(() => (copyBtn.textContent = '复制'), 1500)
      })
  })
  const closeBtn = mkChip('✕', () => panel.remove())
  bar.append(tabAuto, tabJson, copyBtn, closeBtn)
  panel.append(bar, body)
  document.body.appendChild(panel)
  show()
}

let marqueeEl: HTMLDivElement | null = null
let anchor: { x: number; y: number } | null = null

function ensureMarqueeEl(): HTMLDivElement {
  if (!marqueeEl) {
    marqueeEl = document.createElement('div')
    marqueeEl.id = '__auto-select-marquee'
    marqueeEl.style.cssText =
      'position:fixed;z-index:2147483646;pointer-events:none;background:rgba(76,128,230,.12);border:1.5px solid rgba(76,128,230,.9)'
    document.body.appendChild(marqueeEl)
  }
  return marqueeEl
}

function onMove(e: MouseEvent): void {
  if (!anchor) return
  const el = ensureMarqueeEl()
  const x = Math.min(anchor.x, e.clientX)
  const y = Math.min(anchor.y, e.clientY)
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  el.style.width = `${Math.abs(e.clientX - anchor.x)}px`
  el.style.height = `${Math.abs(e.clientY - anchor.y)}px`
  // 框选期间抑制原生文本选择。
  e.preventDefault()
}

function onUp(e: MouseEvent): void {
  if (!anchor) return
  const a = anchor
  anchor = null
  document.removeEventListener('mousemove', onMove, true)
  document.removeEventListener('mouseup', onUp, true)
  marqueeEl?.remove()
  marqueeEl = null

  const dx = Math.abs(e.clientX - a.x)
  const dy = Math.abs(e.clientY - a.y)
  if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return // 死区内 = 点击

  const rect = {
    left: Math.min(a.x, e.clientX),
    top: Math.min(a.y, e.clientY),
    right: Math.max(a.x, e.clientX),
    bottom: Math.max(a.y, e.clientY),
  }
  const nodes = collectSelection(rect)
  const size = { x: rect.left, y: rect.top, w: rect.right - rect.left, h: rect.bottom - rect.top }
  showPanel(renderAuto(size, nodes), renderJson(size, nodes))
}

function onDown(e: MouseEvent): void {
  // Alt+左键 = 框选起笔；capture 阶段拦截，抑制原生点击/拖拽。
  if (!e.altKey || e.button !== 0) return
  anchor = { x: e.clientX, y: e.clientY }
  const el = ensureMarqueeEl()
  el.style.left = `${e.clientX}px`
  el.style.top = `${e.clientY}px`
  el.style.width = '0px'
  el.style.height = '0px'
  document.addEventListener('mousemove', onMove, true)
  document.addEventListener('mouseup', onUp, true)
  e.preventDefault()
  e.stopPropagation()
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    document.getElementById('__auto-select-panel')?.remove()
    anchor = null
    marqueeEl?.remove()
    marqueeEl = null
  }
}

document.addEventListener('mousedown', onDown, true)
document.addEventListener('keydown', onKey, true)

export const __selectAnythingActive = true
