// drive.mjs — 复现工程驱动：按 DoIt → 断言 count/readback（VM 轨实录）。
import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
const AUTO_EXE = 'D:/autostack/auto-lang/target/debug/auto.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const freePort = (port) => new Promise((resolve) => { const s = net.createServer(); s.once('error', () => resolve(false)); s.once('listening', () => s.close(() => resolve(true))); s.listen(port, '127.0.0.1') })
let port = 9531
for (let i = 0; i < 10 && !(await freePort(port)); i++) port++
let nextId = 1
async function rpc(method, params) {
  const res = await fetch(`http://127.0.0.1:${port}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }) })
  const body = await res.json(); if (body.error) throw new Error(JSON.stringify(body.error)); return body.result
}
async function callTool(name, toolArgs) {
  const result = await rpc('tools/call', { name, arguments: toolArgs })
  if (result.isError) throw new Error(`tool fail: ${JSON.stringify(result.content)}`)
  return result.content.map((c) => c.text ?? '').join('\n')
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
function findFirst(node, pred) { if (pred(node)) return node; for (const c of node.children) { const h = findFirst(c, pred); if (h) return h } return null }
function elementIdOf(node) { const m = node.head.match(/#(vnode_\d+)/); return m ? m[1] : null }
function ownText(node) { const m = node.head.match(/"((?:[^"\\]|\\.)*)"/); return m ? m[1] : '' }
const child = spawn(AUTO_EXE, ['run', '-r', 'vm'], { cwd: here, env: { ...process.env, AUTOUI_MCP_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] })
const kill2 = () => { try { if (child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']) } catch {} }
process.on('exit', kill2)
child.stderr.on('data', (d) => process.stderr.write(`[vm] ${d}`))
const deadline0 = Date.now() + 30000
for (;;) { try { await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'repro', version: '0' } }); break } catch (e) { if (Date.now() > deadline0) throw e; await sleep(500) } }
await sleep(2500)
try {
  const tree = parseAura(await callTool('autoui_snapshot', {}))
  const btn = findFirst(tree, (n) => n.head.startsWith('button ') && ownText(n) === 'DoIt' && elementIdOf(n))
  console.log('PRESS DoIt ->', await callTool('autoui_action', { element_id: elementIdOf(btn), action: 'press' }))
  await sleep(800)
  console.log('count ->', (await callTool('autoui_state', { fields: ['count'] })).trim())
  console.log('readback ->', (await callTool('autoui_state', { fields: ['readback'] })).trim())
  process.exit(0)
} catch (e) { console.error('REPRO FAIL:', e.message); process.exit(1) } finally { kill2() }
