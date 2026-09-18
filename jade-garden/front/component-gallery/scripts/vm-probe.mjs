#!/usr/bin/env node
// vm-probe.mjs — PLAN-072 T-01: gallery VM 臂 boot + 单元页渲染断言。
//
// 模式与协议沿 jade-garden/front/desktop/vm-smoke.mjs（AutoUI MCP over
// Streamable HTTP；autoui_state / autoui_snapshot / autoui_action）。
// 断言对象（app.at root 投影——隔离面 fixture 的可断言面）：
//   - boot 态：unit=status_bar + sb_* fixture 字段
//   - snapshot 根文本：status_bar 面标记（子件子树快照不可见约束下，
//     root marker 是 VM 侧结构锚）
//   - 交互：outline 按钮 → unit 切换 + outline 内联行文本（Q-3 探针：
//     root 内联行对快照的可见性实测）→ 切回
//
// 卫生（vm-smoke 纪律）：只杀本脚本 spawn 的 PID，绝无名称扫杀；
// 退出路径保证 kill。
//
// 用法：node scripts/vm-probe.mjs [--port 9321]

import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const VM_DIR = path.resolve(here, '..', 'vm')
const AUTO_EXE = process.env.AUTO_EXE ?? 'D:/autostack/auto-lang/target/debug/auto.exe'

const args = process.argv.slice(2)
const argOf = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const BASE_PORT = Number(argOf('--port') ?? process.env.AUTOUI_MCP_PORT ?? 9321)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const freePort = (port) =>
  new Promise((resolve) => {
    const srv = net.createServer()
    srv.once('error', () => resolve(false))
    srv.once('listening', () => srv.close(() => resolve(true)))
    srv.listen(port, '127.0.0.1')
  })

let port = BASE_PORT
for (let i = 0; i < 10 && !(await freePort(port)); i++) port++

// ---------------- MCP client ----------------
let nextId = 1
const mcpBase = () => `http://127.0.0.1:${port}/mcp`

async function rpc(method, params) {
  const res = await fetch(mcpBase(), {
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
  const res = await fetch(mcpBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method }),
  })
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
      await rpc('initialize', {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'gallery-vm-probe', version: '0.1.0' },
      })
      await notify('notifications/initialized')
      return
    } catch (err) {
      if (Date.now() > deadline) throw new Error(`AutoUI MCP not reachable on ${mcpBase()}: ${err.message}`)
      await sleep(500)
    }
  }
}

// ---------------- snapshot tree helpers（vm-smoke 先例） ----------------
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

function findAll(node, pred, out = []) {
  if (pred(node)) out.push(node)
  for (const child of node.children) findAll(child, pred, out)
  return out
}

function elementIdOf(node) {
  const m = node.head.match(/#(vnode_\d+)/)
  return m ? m[1] : null
}

function ownText(node) {
  const m = node.head.match(/"((?:[^"\\]|\\.)*)"/)
  return m ? m[1] : ''
}

async function snapshot() {
  return parseAura(await callTool('autoui_snapshot', {}))
}

async function pressButton(label) {
  const tree = await snapshot()
  const btn = findFirst(
    tree,
    (n) => n.head.startsWith('button ') && ownText(n) === label && elementIdOf(n),
  )
  if (!btn) throw new Error(`button "${label}" not found in the snapshot`)
  const res = await callTool('autoui_action', { element_id: elementIdOf(btn), action: 'press' })
  if (!/status: ok/.test(res)) throw new Error(`press "${label}" not ok: ${res}`)
  return elementIdOf(btn)
}

async function stateIs(field, want, timeoutMs = 6000) {
  for (const deadline = Date.now() + timeoutMs; ;) {
    const st = await callTool('autoui_state', { fields: [field] })
    const raw = st.match(new RegExp(`${field}:\\s*(.*)`))?.[1]?.trim() ?? ''
    const got = raw
      .replace(/\s*\((?:str|int|bool|float|map|list)\)\s*$/, '')
      .replace(/^"((?:[^"\\]|\\.)*)"$/, '$1')
      .trim()
    if (got === want) return st.trim()
    if (Date.now() > deadline) throw new Error(`state.${field} never became "${want}" (got: ${raw || st.trim()})`)
    await sleep(120)
  }
}

// ---------------- run ----------------
const env = { ...process.env, AUTOUI_MCP_PORT: String(port) }
const child = spawn(AUTO_EXE, ['run', '-r', 'vm'], { cwd: VM_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] })
const kill = () => {
  try {
    if (child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'])
  } catch {}
}
process.on('exit', kill)
process.on('SIGINT', () => {
  kill()
  process.exit(1)
})
child.stderr.on('data', (d) => process.stderr.write(`[vm] ${d}`))

const checks = []
try {
  await waitForServer(30_000)
  checks.push(`vm boot: auto.exe run -r vm (cwd=vm, MCP :${port})`)

  // boot 态：root fixture 投影（隔离面数据面）
  await stateIs('unit', 'status_bar')
  await stateIs('sb_status', 'ready')
  await stateIs('sb_bl', '12')
  await stateIs('sb_ol', '7')
  await stateIs('ol_count', '3')
  checks.push('state: unit/status_bar fixture 字段（sb_status/sb_bl/sb_ol/ol_count）')

  // snapshot 根文本：status_bar 面标记（root marker = VM 结构锚）
  let tree = await snapshot()
  const sbMarker = findFirst(tree, (n) => ownText(n).startsWith('unit=status_bar'))
  if (!sbMarker) {
    console.log('[probe] snapshot（Q-3 证据：root/子件可见性）:\n' + JSON.stringify(tree, null, 1).slice(0, 3000))
    throw new Error('snapshot 无 root marker "unit=status_bar"')
  }
  checks.push('snapshot: root marker unit=status_bar 可见')

  // 交互：切 outline → unit + 内联行可见性（Q-3 探针）→ 切回
  await pressButton('outline')
  await stateIs('unit', 'outline')
  tree = await snapshot()
  const olMarker = findFirst(tree, (n) => ownText(n).startsWith('unit=outline'))
  const olRow = findFirst(tree, (n) => ownText(n) === '引言')
  checks.push(`outline: marker ${olMarker ? '可见' : '不可见'}；内联行文本 ${olRow ? '可见' : '不可见'}（Q-3 实测）`)
  if (!olMarker) throw new Error('outline root marker 不可见')
  if (!olRow) throw new Error('outline 内联行文本（引言）不可见——root 内联结构对快照不可达')

  await pressButton('status_bar')
  await stateIs('unit', 'status_bar')
  checks.push('交互: outline→status_bar 往返')

  console.log('=== gallery VM probe PASS ===')
  for (const c of checks) console.log('  ✓ ' + c)
  process.exit(0)
} catch (err) {
  console.error('=== gallery VM probe FAIL ===')
  console.error(err.message)
  process.exit(1)
} finally {
  kill()
}
