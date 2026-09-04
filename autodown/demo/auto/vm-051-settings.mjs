// vm-051-settings.mjs — PLAN-051 T11: VM 轨 settings 实机驱动 + 证据 PNG
// 采集（机械采集，判读在 Phase 2）。前置：worktree auto.exe 窗口以
// AUTOUI_MCP_PORT=9351 运行（relaunch-auto.ps1）。
//   node vm-051-settings.mjs
// 程序门断言：⚙ 钮在场 → popover 渲染 → 🌙 Dark 点击 → state.dark_mode
// =true → ✕ 关闭；浅/深两张 PNG（fence 深色档重着色[T10]在 dark 图判读）。
import { copyFileSync, readFileSync } from 'node:fs'

const base = `http://127.0.0.1:9351/mcp`
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
  console.log(`  ✓ ${msg}`)
}

async function pressLabel(label) {
  const found = await callTool('autoui_find', { label, limit: 5 })
  // 原子树：匹配节点可在任意层（label 命中内层 text 或 button 本体）——
  // 优先取最深的 button vnode；无 button 行则回落最内层 vnode。
  const btnIds = [...found.matchAll(/button (vnode_\d+)/g)]
  const allIds = [...found.matchAll(/vnode_\d+/g)]
  const m = btnIds.length ? btnIds[btnIds.length - 1] : allIds[allIds.length - 1]
  assert(m, `element found by label ${JSON.stringify(label)}`)
  await callTool('autoui_action', { element_id: m[1], action: 'press' })
  return m[0]
}

function grabScreenshot(file) {
  // default 模式：存 tmp/<timestamp>.png 并返回路径（VM 进程同机）。
  return callTool('autoui_screenshot', {}).then((text) => {
    const m = text.match(/[A-Za-z]:[^\s"']+\.png|tmp[^\s"']+\.png/)
    assert(m, `screenshot path in "${text.slice(0, 120)}"`)
    copyFileSync(m[0].replace(/\//g, '\\'), file)
    console.log(`  ✓ saved ${file} (from ${m[0]})`)
  })
}

// --- 0. server up ---
await rpc('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'vm-051-settings', version: '1.0' },
})
await rpc('notifications/initialized', {})

// --- 1. 默认浅色态（autoui_state 返回 "State:" 文本格式）---
async function darkMode() {
  const t = await callTool('autoui_state', { fields: ['dark_mode'] })
  const m = t.match(/dark_mode:?\s*(true|false)/)
  if (!m) throw new Error(`no dark_mode in state text: ${t.slice(0, 200)}`)
  return m[1] === 'true'
}
assert((await darkMode()) === false, 'initial dark_mode=false')
await grabScreenshot('vm-051-light.png')

// --- 2. 开 popover ---
await pressLabel('⚙')
await new Promise((r) => setTimeout(r, 500))
let snap = await callTool('autoui_snapshot', {})
assert(snap.includes('Settings'), 'popover renders (Settings caption)')
assert(snap.includes('Dark'), 'popover Dark button renders')
assert(snap.includes('Accent'), 'popover Accent group renders')

// --- 3. 切深色 ---
await pressLabel('🌙 Dark')
await new Promise((r) => setTimeout(r, 800))
assert((await darkMode()) === true, 'dark_mode=true after Dark press')

// --- 4. 关 popover → 深色证据 PNG ---
await pressLabel('✕')
await new Promise((r) => setTimeout(r, 500))
snap = await callTool('autoui_snapshot', {})
assert(!snap.includes('Accent'), 'popover closed')
await grabScreenshot('vm-051-dark.png')

// --- 5. 回浅色收尾 ---
await pressLabel('⚙')
await new Promise((r) => setTimeout(r, 500))
await pressLabel('Light')
await new Promise((r) => setTimeout(r, 800))
assert((await darkMode()) === false, 'dark_mode back to false (Light)')

console.log('VM settings drive PASS — vm-051-light.png / vm-051-dark.png captured')
