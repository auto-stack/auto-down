#!/usr/bin/env node
// probe-051-view-theme.mjs — PLAN-052 T10: 051-候选（DEBTS 051-候选行）VM
// 浅色档 view 臂深色 chrome 的读数探针。复用 vm-smoke/vm-051-settings 的
// MCP 通道（snapshot/state/action/find/screenshot），自带最小 PNG 解码
// （zlib + 逐行反滤波，colortype 6 / 8bit / 非隔行），输出判读行：
//
//   - pane 暗盘占比（左半=editor 臂 / 右半=renderer 臂，两栏布局 046 收编）
//   - 特征色计数：zinc-950 (9,9,11)=fence 深盘基色 vs #f9fafb (249,250,251)
//     =FENCE_CHROME_LIGHT 容器实值（PARITY #13 浅色档对齐值）
//   - 32x20 网格暗区形态图（暗盘边界定位）
//   - verdict: FORK（浅档 view 臂深盘）/ CONSISTENT（两臂同档）
//
// 用法（窗口另起）：
//   AUTOUI_MCP_PORT=9263 <auto.exe> run -r vm
//   node probe-051-view-theme.mjs [--port 9263] [--save prefix] [--flip] [--edit-fence]
//
//   --flip      追加 A2 轴：settings 翻转 light→dark→light 后复读（D-GAP
//               标脏重建路径 vs 首帧）
//   --edit-fence 追加 A3 轴：type_text 带随机 nonce 的 fence 文档，复读
//               （新建块的重建取档 vs 存量块缓存）
// 探针只产读数不做门（门=T12 vm-smoke 第八组）；读数矩阵落 PLAN-052 复审记录。

import { copyFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const args = process.argv.slice(2)
const portIdx = args.indexOf('--port')
const port = Number(portIdx >= 0 ? args[portIdx + 1] : process.env.AUTOUI_MCP_PORT || 9247)
const SAVE = args.includes('--save') ? args[args.indexOf('--save') + 1] : null
const DO_FLIP = args.includes('--flip')
const DO_EDIT = args.includes('--edit-fence')
const base = `http://127.0.0.1:${port}/mcp`
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

// --- minimal PNG decoder (colortype 6 RGBA8, non-interlaced) ---
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG')
  let pos = 8
  let w = 0, h = 0, colorType = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const typ = buf.toString('ascii', pos + 4, pos + 8)
    const body = buf.subarray(pos + 8, pos + 8 + len)
    if (typ === 'IHDR') {
      w = body.readUInt32BE(0)
      h = body.readUInt32BE(4)
      colorType = body[9]
      if (body[8] !== 8 || (colorType !== 6 && colorType !== 2) || body[12] !== 0) {
        throw new Error(`unsupported PNG: depth=${body[8]} colortype=${colorType} interlace=${body[12]}`)
      }
    } else if (typ === 'IDAT') idat.push(body)
    pos += 12 + len
  }
  const bpp = colorType === 6 ? 4 : 3
  const stride = w * bpp
  const raw = inflateSync(Buffer.concat(idat))
  const out = Buffer.alloc(w * h * 3)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < h; y++) {
    const ftype = raw[y * (stride + 1)]
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)))
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0
      const b = prev[i]
      const c = i >= bpp ? prev[i - bpp] : 0
      let v = line[i]
      if (ftype === 1) v += a
      else if (ftype === 2) v += b
      else if (ftype === 3) v += (a + b) >> 1
      else if (ftype === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      } else if (ftype !== 0) throw new Error(`bad filter ${ftype}`)
      line[i] = v & 0xff
    }
    for (let x = 0; x < w; x++) {
      const si = x * bpp
      const di = (y * w + x) * 3
      out[di] = line[si]; out[di + 1] = line[si + 1]; out[di + 2] = line[si + 2]
    }
    prev = line
  }
  return { w, h, rgb: out }
}

// --- exports for vm-smoke 第八组（T12）复用：解码 + 帧分析单源 ---
export { decodePng, analyzeFrame }
// analyzeFrame(img) -> { left, right, firstDarkRow, map, w, h }（pane 半分统计：
// dark/zinc950/fenceLight 计数与 total；FORK 判定 = right.zinc 占比 > 0.15 且
// left.dark 占比 < 0.05）

const near = (r, g, b, t, tol) => Math.abs(r - t[0]) <= tol && Math.abs(g - t[1]) <= tol && Math.abs(b - t[2]) <= tol
const ZINC950 = [9, 9, 11] // fence 深盘基色（dark 档 chrome）
const FENCE_LIGHT = [249, 250, 251] // #f9fafb FENCE_CHROME_LIGHT 容器实值

/** 分析一帧：两半 pane 的暗盘/特征色占比 + 网格图 + 首暗行。 */
function analyzeFrame(img) {
  const { w, h, rgb } = img
  const lum = (i) => 0.299 * rgb[i] + 0.587 * rgb[i + 1] + 0.114 * rgb[i + 2]
  const half = [0, 1].map(() => ({ dark: 0, zinc: 0, light: 0, total: 0 }))
  const GX = 32, GY = 20
  const grid = Array.from({ length: GY }, () => Array(GX).fill(0))
  const gridN = Array.from({ length: GY }, () => Array(GX).fill(0))
  let firstDarkRow = -1
  for (let y = 0; y < h; y += 4) {
    let rowDark = 0
    for (let x = 0; x < w; x += 4) {
      const i = (y * w + x) * 3
      const pane = x < w / 2 ? 0 : 1
      const L = lum(i)
      const isDark = L < 45
      const st = half[pane]
      st.total++
      if (isDark) { st.dark++; rowDark++ }
      if (near(rgb[i], rgb[i + 1], rgb[i + 2], ZINC950, 6)) st.zinc++
      if (near(rgb[i], rgb[i + 1], rgb[i + 2], FENCE_LIGHT, 4)) st.light++
      const gx = Math.min(GX - 1, Math.floor((x / w) * GX))
      const gy = Math.min(GY - 1, Math.floor((y / h) * GY))
      gridN[gy][gx]++
      if (isDark) grid[gy][gx]++
    }
    if (firstDarkRow < 0 && rowDark > (w / 4) * 0.5) firstDarkRow = y
  }
  const pct = (n, t) => (100 * n / Math.max(1, t)).toFixed(1) + '%'
  const map = grid.map((row, gy) =>
    row.map((d, gx) => {
      const share = d / Math.max(1, gridN[gy][gx])
      return share > 0.7 ? '#' : share > 0.3 ? '+' : share > 0.05 ? '-' : '.'
    }).join('')
  )
  return {
    left: half[0], right: half[1], pct, map, firstDarkRow,
    w, h,
  }
}

function report(tag, a) {
  console.log(`\n[probe-051] === ${tag} (${a.w}x${a.h}) ===`)
  console.log('[probe-051] grid (32x20, #=dark plate, .=light):')
  a.map.forEach((r) => console.log('  ' + r))
  console.log(
    `[probe-051] panes  editor(left): dark=${a.pct(a.left.dark, a.left.total)} zinc950=${a.pct(a.left.zinc, a.left.total)} fenceLight=${a.pct(a.left.light, a.left.total)}` +
    ` | renderer(right): dark=${a.pct(a.right.dark, a.right.total)} zinc950=${a.pct(a.right.zinc, a.right.total)} fenceLight=${a.pct(a.right.light, a.right.total)}`
  )
  console.log(`[probe-051] first dark row y=${a.firstDarkRow}/${a.h}`)
  const fork =
    a.right.zinc / Math.max(1, a.right.total) > 0.15 &&
    a.left.dark / Math.max(1, a.left.total) < 0.05
  console.log(`[probe-051] verdict[${tag}]: ${fork ? 'FORK — renderer 臂浅档下出现 zinc-950 深盘（051-候选复现）' : 'CONSISTENT — 两臂同档（无深盘分叉）'}`)
  return fork
}

async function grabFrame() {
  const text = await callTool('autoui_screenshot', {})
  const m = text.match(/[A-Za-z]:[^\s"']+\.png/)
  if (!m) throw new Error(`no screenshot path in "${text.slice(0, 120)}"`)
  const pngPath = m[0].replace(/\//g, '\\').replace(/^\\\\\?\\/, '')
  return { pngPath, img: decodePng(await (await import('node:fs')).readFileSync(pngPath)) }
}

async function darkMode() {
  const t = await callTool('autoui_state', { fields: ['dark_mode'] })
  const m = t.match(/dark_mode:?\s*(true|false)/)
  if (!m) throw new Error(`no dark_mode in state: ${t.slice(0, 160)}`)
  return m[1] === 'true'
}

async function pressLabel(label) {
  const found = await callTool('autoui_find', { label, limit: 5 })
  const btnIds = [...found.matchAll(/button (vnode_\d+)/g)]
  const allIds = [...found.matchAll(/vnode_\d+/g)]
  const m = btnIds.length ? btnIds[btnIds.length - 1] : allIds[allIds.length - 1]
  if (!m) throw new Error(`element not found by label ${label}`)
  await callTool('autoui_action', { element_id: m[1], action: 'press' })
}

async function main() {
  await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'probe-051', version: '0.1.0' } })
  await notify('notifications/initialized')

  // A1: 首帧（干净启动浅档）
  const dm1 = await darkMode()
  console.log(`[probe-051] A1 first-frame: dark_mode=${dm1}`)
  let frame = await grabFrame()
  if (SAVE) copyFileSync(frame.pngPath, `${SAVE}-a1-firstframe.png`)
  const forkA1 = report('A1 first-frame (light)', analyzeFrame(frame.img))

  if (DO_FLIP) {
    // A2: settings 翻转 light→dark→light 后复读（D-GAP 标脏重建路径）
    await pressLabel('⚙'); await new Promise((r) => setTimeout(r, 500))
    await pressLabel('🌙 Dark'); await new Promise((r) => setTimeout(r, 900))
    const dmDark = await darkMode()
    await pressLabel('✕'); await new Promise((r) => setTimeout(r, 500))
    frame = await grabFrame()
    if (SAVE) copyFileSync(frame.pngPath, `${SAVE}-a2-dark.png`)
    report('A2a dark (control — 两臂均应为深)', analyzeFrame(frame.img))
    await pressLabel('⚙'); await new Promise((r) => setTimeout(r, 500))
    await pressLabel('Light'); await new Promise((r) => setTimeout(r, 900))
    const dmBack = await darkMode()
    await pressLabel('✕'); await new Promise((r) => setTimeout(r, 500))
    frame = await grabFrame()
    if (SAVE) copyFileSync(frame.pngPath, `${SAVE}-a2-backlight.png`)
    const forkA2 = report('A2b back-to-light (D-GAP rebuild)', analyzeFrame(frame.img))
    console.log(`[probe-051] A2 states: dark=${dmDark} back-light=${dmBack}`)
    if (forkA1 && !forkA2) console.log('[probe-051] pinpoint: D-GAP 翻转重建取档正确 → 缺陷在首帧构建路径（build 期取档/Element 缓存陈旧）')
    if (forkA1 && forkA2) console.log('[probe-051] pinpoint: 翻转后仍深 → 缓存/statics 保留（StreamCache/Element 缓存不随 D-GAP 重建）')
    if (!forkA1 && forkA2) console.log('[probe-051] pinpoint: 翻转引入（首帧正确、回浅失败）→ D-GAP 回浅重建臂')
  }

  if (DO_EDIT) {
    // A3: 编辑触发重建——type_text 带新 fence 的 nonce 文档，复读新建块取档
    const nonce = Date.now().toString(36)
    const snap = await callTool('autoui_snapshot', {})
    const tm = snap.match(/textarea #?(vnode_\d+)/)
    if (!tm) throw new Error('no textarea for edit arm')
    const doc = `# probe ${nonce}\n\nprobe para ${nonce}\n\n\`\`\`js\nconst x = "${nonce}"\n\`\`\`\n`
    const act = await callTool('autoui_action', { element_id: tm[1], action: 'type_text', value: doc })
    if (!/status: ok/.test(act)) throw new Error(`type_text not ok: ${act}`)
    await new Promise((r) => setTimeout(r, 900))
    frame = await grabFrame()
    if (SAVE) copyFileSync(frame.pngPath, `${SAVE}-a3-editfence.png`)
    const forkA3 = report('A3 edit-added fence (fresh build)', analyzeFrame(frame.img))
    if (forkA1 && !forkA3) console.log('[probe-051] pinpoint: 新建块取档正确 → 存量块缓存保留（StreamCache 命中旧 statics），增量构建无恙')
    if (forkA1 && forkA3) console.log('[probe-051] pinpoint: 新建块也深 → 构建期取档本身错（family_of/aura_view_builder 读档时机），非缓存')
  }

  console.log('\n[probe-051] done.')
}

const isDirect = import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1] || '').href
if (isDirect) main().catch((err) => {
  console.error('[probe-051] FAIL:', err.message)
  process.exit(1)
})
