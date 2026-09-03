// PLAN-041 T12 对拍台 —— 两栏（左：StreamingRenderer 一次性全量 view 态
// / 右：feed 驱动流式落定 stream 态）结构 + 计算样式快照 diff。
//
// 零依赖：TreeWalker 文档序枚举 + getComputedStyle 固定键快照。差异节点
// 双栏红色高亮（.pane-diff，样式在 app.css）。不变式：右栏播完落定后
// 两栏像素一致 ⇒ 文档序节点序列 + 计算样式零差异。

/** 计算样式快照键（观感相关的固定子集；宽高含布局结果）。 */
const STYLE_KEYS = [
  'display',
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'white-space',
  'text-decoration-line',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'border-top-width',
  'border-top-color',
  'text-align',
  'opacity',
] as const

interface SnapNode {
  el: HTMLElement
  path: string
  tag: string
  classes: string
  /** 本元素直属文本（子元素文本由各自节点携带）。 */
  text: string
  styles: Record<string, string>
}

export interface PaneDiff {
  index: number
  path: string
  reason: string
}

function snapNode(el: HTMLElement, path: string): SnapNode {
  const cs = getComputedStyle(el)
  const styles: Record<string, string> = {}
  for (const k of STYLE_KEYS) styles[k] = cs.getPropertyValue(k)
  let text = ''
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === Node.TEXT_NODE) text += n.textContent ?? ''
  }
  return {
    el,
    path,
    tag: el.tagName,
    classes: Array.from(el.classList).filter((c) => c !== 'pane-diff').sort().join(' '),
    text: text.trim(),
    styles,
  }
}

/** 文档序收集元素节点（跳过隐藏的 style/script 与 skip 命中的节点
 * （如设计内不同文的栏标签——不参与对拍）。 */
function collect(root: HTMLElement, skip?: (el: HTMLElement) => boolean): SnapNode[] {
  const out: SnapNode[] = []
  const walk = (el: HTMLElement, path: string) => {
    let idx = 0
    for (const child of Array.from(el.children)) {
      if (child.tagName === 'STYLE' || child.tagName === 'SCRIPT') continue
      const c = child as HTMLElement
      if (skip?.(c)) {
        idx++
        continue
      }
      const p = `${path}>${c.tagName}:${idx}`
      out.push(snapNode(c, p))
      walk(c, p)
      idx++
    }
  }
  walk(root, root.tagName)
  return out
}

/** 清除上一轮对拍高亮（class 会进快照，比较前必须清）。 */
export function clearPaneDiffs(...roots: HTMLElement[]): void {
  for (const root of roots) {
    root.querySelectorAll('.pane-diff').forEach((el) => el.classList.remove('pane-diff'))
  }
}

/**
 * 两栏对拍。`skip` 排除设计内不参与对拍的节点（栏标签）。返回差异清单
 * （空数组 = 零差异，验收 5 通过）；同时给两侧差异节点挂 .pane-diff
 * 红色高亮。
 */
export function comparePanes(
  left: HTMLElement,
  right: HTMLElement,
  skip?: (el: HTMLElement) => boolean,
): PaneDiff[] {
  const l = collect(left, skip)
  const r = collect(right, skip)
  const diffs: PaneDiff[] = []
  const n = Math.max(l.length, r.length)
  for (let i = 0; i < n && diffs.length < 50; i++) {
    const a = l[i]
    const b = r[i]
    if (!a || !b) {
      diffs.push({
        index: i,
        path: (a ?? b).path,
        reason: `节点数不等（view ${l.length} vs stream ${r.length}，首个失配 @${i}）`,
      })
      a?.el.classList.add('pane-diff')
      b?.el.classList.add('pane-diff')
      break
    }
    const reasons: string[] = []
    if (a.tag !== b.tag) reasons.push(`tag ${a.tag}≠${b.tag}`)
    if (a.classes !== b.classes) reasons.push(`class [${a.classes}]≠[${b.classes}]`)
    if (a.text !== b.text)
      reasons.push(`text ${JSON.stringify(a.text.slice(0, 24))}≠${JSON.stringify(b.text.slice(0, 24))}`)
    for (const k of STYLE_KEYS) {
      if (a.styles[k] !== b.styles[k]) {
        reasons.push(`${k}: ${a.styles[k]}≠${b.styles[k]}`)
        break
      }
    }
    if (reasons.length) {
      diffs.push({ index: i, path: a.path, reason: reasons.join('; ') })
      a.el.classList.add('pane-diff')
      b.el.classList.add('pane-diff')
    }
  }
  return diffs
}
