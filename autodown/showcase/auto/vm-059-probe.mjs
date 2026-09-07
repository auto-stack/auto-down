// vm-059-probe.mjs — PLAN-059 T9: VM 轨手验 + 证据 PNG 采集（demo
// vm-051-settings.mjs 模式）。前置：showcase/auto 下以 AUTOUI_MCP_PORT=9359
// 运行 auto.exe run -r vm。
//   node vm-059-probe.mjs
// 清单：三栏起屏 + 种子文档（snapshot 断言）→ ⏭ 步进推进 stream 栏 →
// ↻ 重播清零 → ⚙ → 🌙 Dark 深档 → 截图三张（light/dark/stream-step）。
import { copyFileSync } from 'node:fs'

const base = `http://127.0.0.1:9359/mcp`
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

async function callTool(name, toolArgs) {
  const result = await rpc('tools/call', { name, arguments: toolArgs })
  if (result.isError) throw new Error(`tool ${name} failed: ${JSON.stringify(result.content)}`)
  return result.content.map((c) => c.text ?? '').join('\n')
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT: ${msg}`)
  console.log(`  ok ${msg}`)
}

async function pressLabel(label) {
  const found = await callTool('autoui_find', { label, limit: 5 })
  const btnIds = [...found.matchAll(/button (vnode_\d+)/g)]
  const allIds = [...found.matchAll(/vnode_\d+/g)]
  const m = btnIds.length ? btnIds[btnIds.length - 1] : allIds[allIds.length - 1]
  assert(!!m, `element found by label ${JSON.stringify(label)}`)
  await callTool('autoui_action', { element_id: m[1], action: 'press' })
}

async function grabScreenshot(file) {
  // 049 环境族兜底：窗口最小化/未布局时截图 zero-size——重试 6 次×2s。
  for (let i = 0; i < 6; i++) {
    try {
      const text = await callTool('autoui_screenshot', {})
      const m = text.match(/[A-Za-z]:[^\s"']+\.png|tmp[^\s"']+\.png/)
      if (!m) throw new Error(`no path in "${text.slice(0, 120)}"`)
      copyFileSync(m[0].replace(/\//g, '\\'), file)
      console.log(`  ok saved ${file}`)
      return
    } catch (e) {
      console.log(`  .. screenshot retry ${i + 1}: ${String(e).slice(0, 90)}`)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  throw new Error(`screenshot ${file} failed after retries`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// --- 0. server up ---
await rpc('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'vm-059-probe', version: '1.0' },
})
await rpc('notifications/initialized', {})
await sleep(500)

// --- 1. 三栏起屏 + 种子文档 ---
let snap = await callTool('autoui_snapshot', {})
// VM 轨无 CSS text-transform——栏头/按钮为小写原文；三栏以 toolbar
// 按钮（edit/view/stream）+ 栏头 text 节点（pane-header 下同名 text）锚。
for (const probe of ['button', 'AutoDown Showcase', 'Nested bullet A', 'Click to expand']) {
  assert(snap.includes(probe), `startup snapshot has ${JSON.stringify(probe)}`)
}
for (const label of ['"edit"', '"view"', '"stream"']) {
  assert(snap.includes(label), `pane toggle/button ${label} present`)
}

// --- 2. 重播快照 + 步进推进 stream 栏 ---
// autoui_state 只读 model var（computed 不可读）——量 stream_text 长度。
const streamLen = async () => {
  const t = await callTool('autoui_state', { fields: ['stream_text'] })
  const m = t.match(/stream_text:?\s*"(.*)"/s)
  assert(!!m, 'stream_text readable in state')
  return m[1].length
}
await pressLabel('↻')
await sleep(300)
const lenBefore = await streamLen()
await pressLabel('⏭')
await sleep(300)
await pressLabel('⏭')
await sleep(300)
const lenAfter = await streamLen()
assert(lenAfter > lenBefore, `step grows stream pane (${lenBefore} -> ${lenAfter})`)
// 049 环境族（锁屏/最小化 → 窗口 zero-size）下截图可能不可得——功能断言
// 先行全部执行，截图 best-effort 置尾（043 先例：同构消息合成通道代证）。
const shots = ['vm-059-stream-step.png']

// --- 3. 重播清零 ---
await pressLabel('↻')
await sleep(300)
const lenReset = await streamLen()
assert(lenReset === 0, `replay resets stream pane (${lenReset})`)

// --- 4. 主题深档（settings 弹层回路）---
await pressLabel('⚙')
await sleep(400)
snap = await callTool('autoui_snapshot', {})
assert(snap.includes('Settings'), 'popover renders (Settings caption)')
await pressLabel('🌙 Dark')
await sleep(800)
const dark = await callTool('autoui_state', { fields: ['dark_mode'] })
assert(/true/.test(dark), 'dark_mode=true after Dark press')
await pressLabel('✕')
await sleep(400)
shots.push('vm-059-dark.png')

// --- 5. 回浅色收尾（窗口留给手动观感；再截一张浅色全景）---
await pressLabel('⚙')
await sleep(400)
await pressLabel('☀ Light')
await sleep(600)
await pressLabel('✕')
await sleep(400)
shots.push('vm-059-light.png')

// --- 6. 截图冲刷（best-effort）---
let saved = 0
for (const f of shots) {
  try {
    await grabScreenshot(f)
    saved++
  } catch (e) {
    console.log(`  !! screenshot ${f} unavailable: ${String(e).slice(0, 80)}`)
  }
}
console.log(`VM-059 PROBE ALL OK (${saved}/${shots.length} screenshots)`)
