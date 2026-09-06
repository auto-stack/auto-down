#!/usr/bin/env node
// vm-table-055.mjs — PLAN-055 T7: 编辑臂表格一等化净窗录证（MCP 通道，
// vm-smoke 同款 JSON-RPC over HTTP）。断言组：
//
//   A. 两臂表格形式对照——type_text 表格文档（heading + 2×3 表）→
//      state.content 往返（emit_document 自回显快路径同源：emit ≠ 输入
//      即触发重建/回写，content 稳定即 parse→emit 结构一致）→ 截图入册
//      （demo/e2e/screenshots/plan055-table-two-arms.png）+ 像素断言：
//      编辑臂（左）表头 muted 底色带（zinc-100 (244,244,245)）在册、
//      两臂行分隔线在册、编辑臂列分隔线在册（只读臂无列线——411 P2-A④
//      词汇差异，G1「基本一致」的登记面）。
//   B. cell 聚焦——MCP click 表格 cell 坐标 → ghost_id="block-1"
//      （heading 后首 cell 块）+ ghost_height>0（write_ghost_state 快道）。
//   C. px-crop 两臂表格区（按特征色包围盒）→
//      plan055-edit-arm-table.png / plan055-readonly-arm-table.png 入册。
//
// 登记面：编辑臂列宽拖拽/逐键键入无 MCP 通道（doc editor 仅 click 合成
// 事件），坐标拖拽序列由 rust 单测 table_column_drag_resizes 覆盖
// （045 T7「坐标命中层 rust headless 覆盖」同例）。
//
// 用法（两个终端）：
//   AUTOUI_MCP_PORT=9561 <worktree>/target/debug/auto.exe run -r vm
//   node vm-table-055.mjs [--port 9561]

import { readFileSync, copyFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { decodePng } from './probe-051-view-theme.mjs'

const args = process.argv.slice(2)
const portIdx = args.indexOf('--port')
const port = Number(portIdx >= 0 ? args[portIdx + 1] : process.env.AUTOUI_MCP_PORT || 9561)
const base = `http://127.0.0.1:${port}/mcp`
const OUT_DIR = new URL('../e2e/screenshots/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

let nextId = 1
async function rpc(method, params) {
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  })
  if (!res.ok) throw new Error(`MCP ${method} -> HTTP ${res.status}`)
  const body = await res.json()
  if (body.error) throw new Error(`MCP ${method} error: ${JSON.stringify(body.error)}`)
  return body.result
}
async function notify(method) {
  const res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method }) })
  if (!res.ok) throw new Error(`MCP ${method} notify -> HTTP ${res.status}`)
}
async function callTool(name, toolArgs) {
  const result = await rpc('tools/call', { name, arguments: toolArgs })
  if (result.isError) throw new Error(`tool ${name} failed: ${JSON.stringify(result.content)}`)
  return result.content.map((c) => c.text ?? '').join('\n')
}
async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'vm-table-055', version: '0.1.0' } })
      await notify('notifications/initialized')
      return
    } catch (err) {
      if (Date.now() > deadline) throw new Error(`AutoUI MCP not reachable on ${base}: ${err.message}`)
      await new Promise((r) => setTimeout(r, 400))
    }
  }
}

function parseAura(text) {
  const root = { head: '<root>', children: [] }
  const stack = [{ node: root, depth: -1 }]
  for (const raw of text.split('\n')) {
    const trimmed = raw.trim()
    if (!trimmed || trimmed === '}' || raw.startsWith('AURA') || raw.startsWith('widget:') || raw.startsWith('tree:')) continue
    const depth = Math.floor((raw.length - raw.replace(/^ */, '').length) / 2)
    const line = raw.trim().replace(/\{$/, '')
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop()
    const node = { head: line, children: [] }
    stack[stack.length - 1].node.children.push(node)
    stack.push({ node, depth })
  }
  return root
}
function findFirst(node, pred) {
  if (pred(node)) return node
  for (const child of node.children) {
    const hit = findFirst(child, pred)
    if (hit) return hit
  }
  return null
}
function elementIdOf(node) {
  const m = node.head.match(/#(vnode_\d+)/)
  return m ? m[1] : null
}

async function screenshotImg() {
  const shot = await callTool('autoui_screenshot', {})
  const pngPath = shot.match(/[A-Za-z]:[^\s"']+\.png/)?.[0]
  if (!pngPath) throw new Error(`no screenshot path in "${shot.slice(0, 120)}"`)
  return { path: pngPath, img: decodePng(readFileSync(pngPath.replace(/\//g, '\\').replace(/^\\\\\?\\/, ''))) }
}

const near = (v, t, tol = 3) => Math.abs(v - t) <= tol
const HEADER_BG = [244, 244, 245] // zinc-100（autodown_blocks::TABLE_HEADER_BG）
const px = (img, x, y) => {
  const i = (y * img.w + x) * 3
  return [img.rgb[i], img.rgb[i + 1], img.rgb[i + 2]]
}

/** 半幅内统计：表头底色像素数、水平行线行数（连续 ≥60% 幅宽的线色行：
 *  线色 resolve_border_rgb light=(227,221,209)，以 max 通道 <240 判定——
 *  页底白 255 与表头底 245 均不落入）、垂直列线列数。 */
function tableStats(img, x0, x1) {
  let headerPx = 0
  const rowLines = []
  for (let y = 0; y < img.h; y++) {
    let dark = 0
    for (let x = x0; x < x1; x++) {
      const [r, g, b] = px(img, x, y)
      if (near(r, HEADER_BG[0], 2) && near(g, HEADER_BG[1], 2) && near(b, HEADER_BG[2], 2)) headerPx++
      if (Math.max(r, g, b) < 240) dark++
    }
    if (dark > (x1 - x0) * 0.4) rowLines.push(y)
  }
  const colLines = []
  for (let x = x0; x < x1; x++) {
    let dark = 0
    for (let y = 0; y < img.h; y++) {
      const [r, g, b] = px(img, x, y)
      if (Math.max(r, g, b) < 240) dark++
    }
    if (dark > 20) colLines.push(x)
  }
  return { headerPx, rowLines, colLines }
}

/** 最小 PNG 编码（colortype 2 RGB8）——px-crop 落盘。 */
function encodePng(img, cx0, cy0, cw, ch) {
  const stride = cw * 3
  const raw = Buffer.alloc((stride + 1) * ch)
  for (let y = 0; y < ch; y++) {
    raw[y * (stride + 1)] = 0
    for (let x = 0; x < cw; x++) {
      const [r, g, b] = px(img, cx0 + x, cy0 + y)
      const o = y * (stride + 1) + 1 + x * 3
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b
    }
  }
  const crcTable = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c >>> 0
  }
  const crc32 = (buf) => {
    let c = 0xffffffff
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (typ, body) => {
    const t = Buffer.from(typ, 'ascii')
    const len = Buffer.alloc(4)
    len.writeUInt32BE(body.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([t, body])))
    return Buffer.concat([len, t, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(cw, 0); ihdr.writeUInt32BE(ch, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

async function runOnce() {
  const checks = []
  const nonce = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const TBL_DOC = `# 表格对照 ${nonce}\n\n| 名称 | 数值 | 备注 |\n| --- | --- | --- |\n| 甲 | 1 | 备注 ${nonce} |\n| 乙 | 2 | B |`

  // A1. 键入表格文档 → state.content 往返（emit 自回显快路径同源）。
  const snap0 = parseAura(await callTool('autoui_snapshot', {}))
  const ta = findFirst(snap0, (n) => n.head.startsWith('textarea '))
  if (!ta) throw new Error('no textarea — editor face missing')
  const editorId = elementIdOf(ta)
  const typed = await callTool('autoui_action', { element_id: editorId, action: 'type_text', value: TBL_DOC })
  if (!/status: ok/.test(typed)) throw new Error(`table-doc type_text not ok: ${typed}`)
  const expected = TBL_DOC.replace(/\n/g, '\\n')
  for (const deadline = Date.now() + 3000; ; ) {
    const st = await callTool('autoui_state', { fields: ['content'] })
    const captured = st.match(/content:\s*"((?:[^"\\]|\\.)*)"/)?.[1]
    if (captured === expected) break
    if (Date.now() > deadline) throw new Error(`state.content roundtrip mismatch (emit ≠ parse? or lag): ${st.trim().slice(0, 300)}`)
    await new Promise((r) => setTimeout(r, 100))
  }
  checks.push('A1 表格文档键入 → state.content 往返一致（parse→emit 结构稳定）')

  // A2. 渲染确认：编辑臂表格 grid 化（只读臂 Table vnode + table_key 在册）。
  let editorNode = null
  let tableNode = null
  for (const deadline = Date.now() + 3000; ; ) {
    const snap1 = parseAura(await callTool('autoui_snapshot', {}))
    tableNode = findFirst(snap1, (n) => n.head.startsWith('table ') && n.children.some((c) => c.head.startsWith('table_key:')))
    editorNode = findFirst(snap1, (n) => n.head.startsWith('textarea '))
    if (tableNode && editorNode) break
    if (Date.now() > deadline) throw new Error('read-only arm Table vnode (table_key) not in snapshot — render lag?')
    await new Promise((r) => setTimeout(r, 100))
  }
  checks.push('A2 只读臂 Table vnode 在册（table_key 属性行）')

  // A3. 像素断言 + 截图入册。
  await new Promise((r) => setTimeout(r, 400))
  const { path: shotPath, img } = await screenshotImg()
  const mid = Math.floor(img.w / 2)
  const L = tableStats(img, 0, mid)
  const R = tableStats(img, mid, img.w)
  if (L.headerPx < 500) throw new Error(`edit-arm header muted band missing (headerPx=${L.headerPx})`)
  if (L.rowLines.length < 2) throw new Error(`edit-arm row rules missing (${L.rowLines.length})`)
  if (R.rowLines.length < 2) throw new Error(`read-only-arm row rules missing (${R.rowLines.length})`)
  if (L.colLines.length < 2) throw new Error(`edit-arm column rules missing (${L.colLines.length})`)
  copyFileSync(shotPath.replace(/\//g, '\\').replace(/^\\\\\?\\/, ''), `${OUT_DIR}plan055-table-two-arms.png`.replace(/\//g, '\\'))
  checks.push(`A3 像素断言过：编辑臂表头底 ${L.headerPx}px·行线${L.rowLines.length}·列线${L.colLines.length}｜只读臂行线${R.rowLines.length}；全窗截图入册 plan055-table-two-arms.png`)

  // B. cell 聚焦——widget 空间 Y 自上而下步进点击（heading 块 0 校准后），
  //    ghost 离开 block-0 即进入表格区；x=40 恒在列 0 → 命中表头 cell
  //    块（block-1..6 任一即可，表头可编辑 = 待澄清③裁定面）。
  for (let y = 60; y <= 260; y += 10) {
    await callTool('autoui_action', { element_id: editorId, action: 'click', value: `40,${y}` })
    await new Promise((r) => setTimeout(r, 80))
    const st = await callTool('autoui_state', { fields: ['ghost_id', 'ghost_height'] })
    const gid = st.match(/ghost_id:\s*"([^"]*)"/)?.[1] ?? ''
    const gh = Number(st.match(/ghost_height:\s*([\d.]+)/)?.[1] ?? NaN)
    const idx = gid.match(/^block-(\d+)$/)?.[1]
    if (idx && Number(idx) >= 1 && Number(idx) <= 6 && gh > 0) {
      checks.push(`B cell 聚焦：click y=${y} → ghost_id="${gid}" + ghost_height=${gh.toFixed(1)}（表格 cell 命中）`)
      break
    }
    if (y + 10 > 260) throw new Error(`cell focus scan never left block-0: ${st.trim()}`)
  }

  // C. px-crop 两臂表格区（表头底色带为锚，取其上下各 ~140px 横幅）入册。
  const { img: img2 } = await screenshotImg()
  const mid2 = Math.floor(img2.w / 2)
  const L2 = tableStats(img2, 0, mid2)
  const anchorY = L2.rowLines.length ? L2.rowLines[0] : Math.floor(img2.h * 0.25)
  const cy0 = Math.max(0, anchorY - 120)
  const ch = Math.min(240, img2.h - cy0)
  writeFileSync(`${OUT_DIR}plan055-edit-arm-table.png`.replace(/\//g, '\\'), encodePng(img2, 0, cy0, mid2, ch))
  writeFileSync(`${OUT_DIR}plan055-readonly-arm-table.png`.replace(/\//g, '\\'), encodePng(img2, mid2, cy0, img2.w - mid2, ch))
  checks.push('C px-crop 两臂表格横幅入册（plan055-edit-arm-table.png / plan055-readonly-arm-table.png）')

  return checks
}

await waitForServer(20000)
let checks
for (let attempt = 1; attempt <= 2; attempt++) {
  try {
    checks = await runOnce()
    break
  } catch (err) {
    if (attempt === 2) throw err
    console.error(`[attempt ${attempt}] failed: ${err.message} — retrying once`)
    await new Promise((r) => setTimeout(r, 1200))
  }
}
console.log('plan055 T7 净窗录证 PASS')
for (const c of checks) console.log(`  ✔ ${c}`)
