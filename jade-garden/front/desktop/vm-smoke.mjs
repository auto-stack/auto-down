#!/usr/bin/env node
// vm-smoke.mjs — PLAN-064 T-03: AutoUI-MCP-driven smoke harness for the
// jade-garden desktop VM track (`auto run -r vm`), rebuilt on master from
// the demo precedent (autodown/demo/auto/vm-smoke.mjs; the plan-022
// probe_driver_*.mjs live only in an archived worktree).
//
// Arms (v1, 六流臂 — P022-6 驱动验收口径的断言语义):
//   open-ws → files → read → save → links → cards → d4 → search
//   (tabs 臂随 T-05 加入；骨架期断言走 MCP 合成通道
//   autoui_state / autoui_snapshot / autoui_action — 物理点击通道不稳,
//   P022 slice 3 登记项②, 验收以 MCP 通道为准)
//
// Protocol: AutoUI MCP over Streamable HTTP — JSON-RPC 2.0 POSTs to
// http://127.0.0.1:<port>/mcp (tools autoui_snapshot / autoui_action /
// autoui_state; jade-garden/front/desktop/README §6).
//
// Hygiene (T-03 fixture 恢复协议):
//   - fixture restored (git scoped checkout+clean) BEFORE and AFTER the
//     run; hash equality asserted (跑前后一致, AC-02)
//   - only the PIDs this script spawned are killed — never a name sweep
//     (PLAN-049: parallel sessions run their own auto.exe windows)
//   - window death mid-run → retry the whole run ONCE (PLAN-049 bar)
//   - port conflict → next port in a small range
//
// Usage (from jade-garden/front/desktop):
//   node scripts/restore-fixture.mjs                 # optional pre-clean
//   node vm-smoke.mjs [--port 9264] [--arms a,b,…]
//
// Env: AUTO_EXE (default D:/autostack/auto-lang/target/debug/auto.exe),
//      JADE_BACKEND_EXE (default main-checkout prebuilt
//      jade-garden/back/server/target/debug/jade-garden-back.exe),
//      JADE_BACKEND_PORT (default 8199), VM_MERGED=1 (merged 模式臂,
//      default split: AUTO_VM_MERGE=0 + AUTO_BACKEND).

import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { assertRestored, hashFixture, restoreFixture } from './scripts/restore-fixture.mjs'

const here = path.dirname(fileURLToPath(import.meta.url)) // front/desktop
const REPO = path.resolve(here, '..', '..', '..', '..') // auto-down checkout (worktree)
const MAIN_REPO = 'D:/autostack/auto-down'
const AUTO_EXE = process.env.AUTO_EXE ?? 'D:/autostack/auto-lang/target/debug/auto.exe'
const BACKEND_EXE =
  process.env.JADE_BACKEND_EXE ??
  path.join(MAIN_REPO, 'jade-garden', 'back', 'server', 'target', 'debug', 'jade-garden-back.exe')
const BACKEND_PORT = Number(process.env.JADE_BACKEND_PORT ?? 8199)
const BACKEND = `http://127.0.0.1:${BACKEND_PORT}`
const FIXTURE = process.env.JADE_FIXTURE ?? path.join(MAIN_REPO, 'tmp', 'wiki-demo')
const MERGED = process.env.VM_MERGED === '1'

const args = process.argv.slice(2)
const argOf = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const BASE_PORT = Number(argOf('--port') ?? process.env.AUTOUI_MCP_PORT ?? 9264)
const ONLY_ARMS = argOf('--arms')?.split(',').map((s) => s.trim()).filter(Boolean)

function logBaseline() {
  let version = '?'
  try {
    version = execFileSync(AUTO_EXE, ['--version'], { encoding: 'utf8' }).trim()
  } catch {}
  let head = '?'
  try {
    head = execFileSync('git', ['-C', 'D:/autostack/auto-lang', 'log', '--oneline', '-1'], {
      encoding: 'utf8',
    }).trim()
  } catch {}
  console.log(`[baseline] auto.exe: ${version}`)
  console.log(`[baseline] auto-lang master HEAD: ${head}`)
  return { version, head }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

let port = BASE_PORT
async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      await rpc('initialize', {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'jade-vm-smoke', version: '0.1.0' },
      })
      await notify('notifications/initialized')
      return
    } catch (err) {
      if (Date.now() > deadline) throw new Error(`AutoUI MCP not reachable on ${mcpBase()}: ${err.message}`)
      await sleep(500)
    }
  }
}

// ---------------- snapshot tree helpers (demo vm-smoke 先例) ----------------
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

function subtreeText(node) {
  const m = node.head.match(/"((?:[^"\\]|\\.)*)"/)
  const own = m ? m[1] : ''
  return [own, ...node.children.map(subtreeText)].filter(Boolean).join('\n')
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

/** Press the first button whose OWN label equals `label`. */
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

/** Poll autoui_state until `field` matches `want` (string compare; the
 *  state printer appends a type annotation like `true (bool)` / `3 (int)`). */
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

async function stateHas(field, needle, timeoutMs = 6000) {
  for (const deadline = Date.now() + timeoutMs; ;) {
    const st = await callTool('autoui_state', { fields: [field] })
    if (st.includes(needle)) return st.trim()
    if (Date.now() > deadline) throw new Error(`state.${field} never contained "${needle}": ${st.trim().slice(0, 400)}`)
    await sleep(120)
  }
}

async function typeInto(pred, value, what) {
  const tree = await snapshot()
  const node = findFirst(tree, (n) => pred(n) && elementIdOf(n))
  if (!node) throw new Error(`${what} not found in the snapshot`)
  const res = await callTool('autoui_action', {
    element_id: elementIdOf(node),
    action: 'type_text',
    value,
  })
  if (!/status: ok/.test(res)) throw new Error(`type_text on ${what} not ok: ${res}`)
  return elementIdOf(node)
}

// ---------------- process management ----------------
const children = []
function spawnTracked(name, cmd, argv, opts) {
  const child = spawn(cmd, argv, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] })
  children.push({ name, child })
  child.stdout.on('data', (d) => process.env.VM_SMOKE_VERBOSE && process.stdout.write(`[${name}] ${d}`))
  child.stderr.on('data', (d) => process.env.VM_SMOKE_VERBOSE && process.stderr.write(`[${name}!] ${d}`))
  child.on('exit', (code, sig) => {
    if (process.env.VM_SMOKE_VERBOSE) console.error(`[${name}] exit code=${code} sig=${sig}`)
  })
  return child
}

async function killTracked() {
  for (const { name, child } of children.reverse()) {
    if (child.exitCode === null) {
      try {
        execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
      } catch {}
    }
  }
  children.length = 0
  await sleep(400)
}

async function portFree(p) {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.once('error', () => resolve(false))
    srv.once('listening', () => srv.close(() => resolve(true)))
    srv.listen(p, '127.0.0.1')
  })
}

async function ensureBackend() {
  const health = await fetch(`${BACKEND}/api/health`)
    .then((r) => (r.ok ? 'ok' : `HTTP ${r.status}`))
    .catch((e) => `unreachable: ${e.cause?.code ?? e.message}`)
  if (health === 'ok') return 'already-up'
  // occupied by a foreign/stale server (not ours to kill — could belong to a
  // parallel session; PLAN-049 hygiene) → fail with the exact unblock action
  const occupied = await new Promise((resolve) => {
    const s = net.connect(BACKEND_PORT, '127.0.0.1')
    s.once('connect', () => {
      s.end()
      resolve(true)
    })
    s.once('error', () => resolve(false))
  })
  if (occupied) {
    throw new Error(
      `port ${BACKEND_PORT} is occupied but /api/health says "${health}" — a stale/foreign ` +
        `jade backend (pre health-route build). Free the port (netstat -ano | findstr :${BACKEND_PORT}) ` +
        `or set JADE_BACKEND_PORT to a free port.`,
    )
  }
  if (!fs.existsSync(BACKEND_EXE)) throw new Error(`backend exe missing: ${BACKEND_EXE}`)
  spawnTracked('backend', BACKEND_EXE, [], {
    env: { ...process.env, JADE_GARDEN_PORT: String(BACKEND_PORT) },
  })
  for (const deadline = Date.now() + 30000; ;) {
    const ok = await fetch(`${BACKEND}/api/health`)
      .then((r) => r.ok)
      .catch(() => false)
    if (ok) return 'spawned'
    if (Date.now() > deadline) throw new Error('backend did not become healthy in 30s')
    await sleep(300)
  }
}

// ---------------- arms ----------------
const arms = {}
const arm = (name, fn) => (arms[name] = fn)

const nonce = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

arm('open-ws', async (checks) => {
  await pressButton('open-ws')
  const st = await stateIs('status', 'ws-open')
  const root = await callTool('autoui_state', { fields: ['root'] })
  if (!/wiki-demo/.test(root)) throw new Error(`open-ws: root not backfilled: ${root.trim()}`)
  checks.push(`open-ws: POST {root} → status=ws-open, root backfilled (${root.trim().slice(0, 60)})`)
})

arm('files', async (checks) => {
  await pressButton('reload-files')
  await stateIs('status', 'files-reloaded')
  // 文件树按钮计数（.ad 后缀标签）——fixture 5 文档全数呈现
  for (const deadline = Date.now() + 6000; ;) {
    const tree = await snapshot()
    const fileBtns = findAll(tree, (n) => n.head.startsWith('button ') && /\.ad"?\s*$/.test(n.head.replace(/#vnode_\d+/, '')))
    const labels = fileBtns.map(ownText)
    if (labels.filter((l) => l && l.endsWith('.ad')).length >= 5) {
      checks.push(`files: list_files → ${labels.length} docs rendered (${labels.slice(0, 5).join(' / ')}…)`)
      return
    }
    if (Date.now() > deadline) throw new Error(`files: expected ≥5 .ad buttons, saw: ${JSON.stringify(labels)}`)
    await sleep(150)
  }
})

arm('read', async (checks) => {
  const tree = await snapshot()
  const btn = findFirst(tree, (n) => n.head.startsWith('button ') && ownText(n) === 'Hello World.ad')
  if (!btn) throw new Error('read: "Hello World.ad" file button not found')
  await callTool('autoui_action', { element_id: elementIdOf(btn), action: 'press' })
  await stateIs('status', 'opened')
  await stateIs('active_title', 'Hello World')
  // 全文断言：文首（frontmatter title）+ 文末（`返回 [[首页]]。`）双标记 —
  // 空格标题通配回环（/api/wiki/Hello%20World.ad）全文可达
  await stateHas('active_body', 'Hello, Jade Garden!')
  await stateHas('active_body', '返回 [[首页]]。')
  checks.push('read: open Hello World.ad → active_title + head/tail body markers present (full markdown, space-in-title round trip)')
})

arm('save', async (checks) => {
  const marker = `vm-smoke save ${nonce()}`
  await typeInto((n) => n.head.startsWith('textarea '), marker, 'editor textarea')
  await stateIs('active_dirty', 'true')
  await pressButton('save')
  await stateIs('status', 'saved')
  await stateIs('active_dirty', 'false')
  await stateIs('save_note', 'saved')
  // 磁盘落盘验证（fixture 由恢复协议兜底回滚）
  for (const deadline = Date.now() + 6000; ;) {
    const body = fs.readFileSync(path.join(FIXTURE, 'wiki', 'Hello World.ad'), 'utf8')
    if (body.includes(marker)) break
    if (Date.now() > deadline) throw new Error(`save: marker never hit the disk: ${marker}`)
    await sleep(150)
  }
  checks.push(`save: type_text → dirty=● → save → dirty cleared + disk write verified (${marker})`)
})

arm('links', async (checks) => {
  const tree = await snapshot()
  const btn = findFirst(tree, (n) => n.head.startsWith('button ') && ownText(n) === 'CAP 定理.ad')
  if (!btn) throw new Error('links: "CAP 定理.ad" file button not found')
  await callTool('autoui_action', { element_id: elementIdOf(btn), action: 'press' })
  await stateIs('active_title', 'CAP 定理')
  // 当前真值 bl=2（index/首页 + Hello World 页级反链；Tasks 的
  // [[CAP 定理#block-consistency]] 是块引用，不并入页级反链计数——
  // engine linkgraph 化后的语义，P022 slice 5 时点的 3/2 为旧口径）。
  await stateIs('bl_count', '2')
  await stateIs('ol_count', '2')
  // 反链点击跳转：backlinks 列含 Hello World（button 由 .backlinks 渲染）
  const blBtn = findFirst(await snapshot(), (n) => n.head.startsWith('button ') && ownText(n) === 'Hello World')
  if (!blBtn) throw new Error('links: backlink button "Hello World" not rendered')
  await callTool('autoui_action', { element_id: elementIdOf(blBtn), action: 'press' })
  await stateIs('active_title', 'Hello World')
  checks.push('links: CAP 定理 → bl=2/ol=2（engine 页级反链口径）+ 反链按钮跳转 Hello World ✓')
})

arm('cards', async (checks) => {
  // 预置卡文档（P022 slice 4 口径：API 写入，fixture 恢复协议兜底回滚）
  const q = `探针问题：${nonce()}=?`
  const seedBody = `- ${q} #card ^vm-smoke-c1\n`
  const post = (p, payload) =>
    fetch(`${BACKEND}${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  const doc = await fetch(`${BACKEND}/api/wiki/${encodeURIComponent('Tasks.ad')}`).then((r) => r.json())
  const put = await post(`/api/wiki/${encodeURIComponent('Tasks.ad')}`, {
    frontmatter: doc.frontmatter,
    body: doc.body + '\n' + seedBody,
  })
  if (!put.ok) throw new Error(`cards: seed write failed: ${put.status}`)
  await pressButton('cards')
  await stateIs('status', 'cards-loaded')
  // due 列表呈现（问题文本进右栏快照）
  for (const deadline = Date.now() + 6000; ;) {
    const tree = await snapshot()
    if (subtreeText(tree).includes(q)) break
    if (Date.now() > deadline) throw new Error(`cards: due list lacks the seeded question: ${q}`)
    await sleep(150)
  }
  await pressButton('good')
  const note = await stateHas('review_note', 'graded:')
  // 评分落盘：排程属性写回文档（SRS 排程链路有秒级延迟，给 12s 收敛窗）
  for (const deadline = Date.now() + 12000; ;) {
    const body = fs.readFileSync(path.join(FIXTURE, 'wiki', 'Tasks.ad'), 'utf8')
    if (/card-next-schedule::/.test(body)) break
    if (Date.now() > deadline) throw new Error('cards: card-next-schedule never hit the disk')
    await sleep(150)
  }
  checks.push(`cards: seed → due 呈现 → good 评分 ${note.match(/graded:[^\s"]*/)?.[0] ?? 'ok'} + card-next-schedule 落盘`)
})

arm('d4', async (checks) => {
  await pressButton('export-ws')
  await stateIs('status', 'exported')
  const zip = 'D:/autostack/auto-down/tmp/jade-probe/desktop-export.zip'
  for (const deadline = Date.now() + 6000; ;) {
    if (fs.existsSync(zip)) {
      const fd = fs.openSync(zip, 'r')
      const buf = Buffer.alloc(2)
      fs.readSync(fd, buf, 0, 2, 0)
      fs.closeSync(fd)
      if (buf.toString('latin1') === 'PK') break
    }
    if (Date.now() > deadline) throw new Error('d4: export zip never landed with PK magic')
    await sleep(150)
  }
  await pressButton('import-zip')
  await stateIs('status', 'imported')
  const io = await callTool('autoui_state', { fields: ['io_note'] })
  if (!/imported/i.test(io)) throw new Error(`d4: import io_note: ${io.trim().slice(0, 200)}`)
  checks.push(`d4: export zip PK 落盘 + import round trip (${io.trim().match(/"imported":\s*\d+|\bimported\b/i)?.[0]})`)
})

arm('search', async (checks) => {
  await typeInto((n) => n.head.startsWith('input '), 'CAP', 'search input')
  await pressButton('search')
  await stateIs('status', 'searched')
  await stateIs('hit_count', '1')
  const tree = await snapshot()
  const hitBtn = findFirst(tree, (n) => n.head.startsWith('button ') && ownText(n) === 'CAP 定理')
  if (!hitBtn) throw new Error('search: hit button "CAP 定理" not rendered')
  checks.push('search: search_pages("CAP") → hit_count=1 + 命中按钮呈现')
})

// ---------------- run ----------------
function parseArgsForRun(argv) {
  const runArgs = ['run', '-r', 'vm']
  return runArgs
}

async function runOnce(attempt) {
  const checks = []
  await restoreFixture()
  const hashBefore = hashFixture()
  const backendState = await ensureBackend()
  checks.push(`backend: ${backendState} on :${BACKEND_PORT} (${MERGED ? 'merged 臂消费 AUTO_BACKEND' : 'split 臂 loopback HTTP'})`)

  // pick a free MCP port
  port = 0
  for (let p = BASE_PORT; p < BASE_PORT + 16; p++) {
    if (await portFree(p)) {
      port = p
      break
    }
  }
  if (!port) throw new Error(`no free MCP port in ${BASE_PORT}..${BASE_PORT + 15}`)

  const env = {
    ...process.env,
    AUTOUI_MCP_PORT: String(port),
    AUTO_BACKEND: BACKEND,
  }
  if (!MERGED) env.AUTO_VM_MERGE = '0'
  spawnTracked('vm-window', AUTO_EXE, ['run', '-r', 'vm'], { cwd: here, env })
  await waitForServer(45000)
  // MCP is up ≠ UI rendered — poll until the first real snapshot (the
  // pre-frame probe answered "No UI available yet", 064 T-3 实测)
  for (const deadline = Date.now() + 30000; ;) {
    try {
      const snap = await callTool('autoui_snapshot', {})
      if (snap.includes('button')) break
    } catch {}
    if (Date.now() > deadline) throw new Error('vm window rendered no UI within 30s')
    await sleep(500)
  }
  checks.push(`vm window: auto.exe run -r vm (cwd=desktop, ${MERGED ? 'merged' : 'split'}, MCP :${port})`)

  const names = Object.keys(arms).filter((n) => !ONLY_ARMS || ONLY_ARMS.includes(n))
  for (const name of names) {
    await arms[name](checks)
  }

  // tabs 臂占位：T-05 落地后启用（§5.4 五断言）
  if (!ONLY_ARMS || ONLY_ARMS.includes('tabs')) {
    const tree = await snapshot()
    if (subtreeText(tree).includes('tab:')) {
      throw new Error('tabs arm not implemented yet — T-05')
    }
    if (ONLY_ARMS?.includes('tabs')) throw new Error('tabs arm not implemented yet — T-05')
  }

  restoreFixture()
  const hashAfter = hashFixture()
  assertRestored(hashBefore, hashAfter)
  checks.push('fixture: restored — hash(before) == hash(after) (恢复协议生效)')

  return checks
}

async function main() {
  const baseline = logBaseline()
  if (!fs.existsSync(BACKEND_EXE)) throw new Error(`backend exe missing: ${BACKEND_EXE}`)
  let lastErr
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const checks = await runOnce(attempt)
      console.log(`jade vm-smoke: PASS (port ${port}, ${MERGED ? 'merged' : 'split'})`)
      console.log(`[baseline] ${JSON.stringify(baseline)}`)
      for (const c of checks) console.log(`  ✓ ${c}`)
      await killTracked()
      restoreFixture()
      process.exitCode = 0
      return
    } catch (err) {
      lastErr = err
      console.error(`jade vm-smoke: attempt ${attempt} failed — ${err.message}`)
      await killTracked()
      try {
        restoreFixture()
      } catch {}
      if (attempt === 1) console.error('jade vm-smoke: retrying once (PLAN-049 external-kill bar)')
    }
  }
  console.error(`jade vm-smoke: FAIL — ${lastErr.message}`)
  process.exitCode = 1
}

main().catch(async (err) => {
  console.error(`jade vm-smoke: FAIL — ${err.message}`)
  await killTracked()
  try {
    restoreFixture()
  } catch {}
  process.exitCode = 1
})
