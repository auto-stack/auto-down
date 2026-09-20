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

/** Press the first button whose subtree binds `onclick: <handler>` — the
 *  actions-DSL channel (PLAN-067 T-02: six-flow actions synthesized into
 *  the toolbar; auto-lang Plan 418 §8.4① — synthesized buttons carry their
 *  onclick in snapshots, so the handler IS the stable locator, not text). */
async function pressAction(handler, timeoutMs = 6000) {
  const needle = `onclick: ${handler}`
  for (const deadline = Date.now() + timeoutMs; ;) {
    const tree = await snapshot()
    const btn = findFirst(
      tree,
      (n) =>
        n.head.startsWith('button ') &&
        elementIdOf(n) &&
        findFirst(n, (c) => c !== n && c.head.trim() === needle),
    )
    if (btn) {
      const res = await callTool('autoui_action', { element_id: elementIdOf(btn), action: 'press' })
      if (!/status: ok/.test(res)) throw new Error(`press ${handler} not ok: ${res}`)
      return elementIdOf(btn)
    }
    if (Date.now() > deadline) throw new Error(`button with "${needle}" not found in the snapshot`)
    await sleep(150)
  }
}

/** Open the menubar menu `trigger` (文件/视图/卡片) then press the item
 *  whose own label equals `item` (PLAN-067 T-02: cards/graph/export/import
 *  live in the 卡片 menu; menus auto-close after item activation — 041
 *  desktop_mcp.py open_menu 先例). */
async function pressMenuItem(trigger, item) {
  await pressButton(trigger)
  for (const deadline = Date.now() + 6000; ;) {
    const tree = await snapshot()
    const it = findFirst(tree, (n) => n.head.startsWith('button ') && ownText(n) === item && elementIdOf(n))
    if (it) {
      const res = await callTool('autoui_action', { element_id: elementIdOf(it), action: 'press' })
      if (!/status: ok/.test(res)) throw new Error(`menu item "${item}" not ok: ${res}`)
      return elementIdOf(it)
    }
    if (Date.now() > deadline) throw new Error(`menu "${trigger}" lacks item "${item}"`)
    await sleep(150)
  }
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
let saveMarker = '' // run-scoped: the save arm's disk marker (Hello's tab body afterwards)
const arm = (name, fn) => (arms[name] = fn)

const nonce = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

arm('open-ws', async (checks) => {
  await pressAction('.OpenWs')
  const st = await stateIs('status', 'ws-open')
  const root = await callTool('autoui_state', { fields: ['root'] })
  if (!/wiki-demo/.test(root)) throw new Error(`open-ws: root not backfilled: ${root.trim()}`)
  checks.push(`open-ws: POST {root} → status=ws-open, root backfilled (${root.trim().slice(0, 60)})`)
})

arm('files', async (checks) => {
  await pressAction('.LoadFiles')
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
  // PLAN-079 T-01 批 A 装配锚：outline 行（4 标题——Hello World/列表/任务
  // 列表/代码块，锚点后缀剥除）+ unlinked（1 自引行）。outline_count 独立
  // 字段（ol_count = outlinks 既有锚，不复用）。
  await stateIs('outline_count', '4')
  await stateIs('ul_count', '1')
  const olTree = await snapshot()
  const olRow = findFirst(olTree, (n) => ownText(n) === '代码块')
  if (!olRow) throw new Error('read: outline row "代码块" not rendered')
  checks.push('read: open Hello World.ad → active_title + head/tail body markers + outline 4 rows (代码块 rendered) + unlinked 1 (PLAN-079 批 A)')
})

arm('save', async (checks) => {
  const marker = `vm-smoke save ${nonce()}`
  await typeInto(isEditorNode, marker, 'editor')
  await stateIs('active_dirty', 'true')
  await pressAction('.Save')
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
  saveMarker = marker
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
  // PLAN-079 T-01 批 A 装配锚：outline 6 行（CAP 一级 + 二级若干——锚点/
  // 块 id 后缀剥除后的标题面）+ unlinked 1 自引；标题派生走 tab_file_stem
  // 部署副本（装配后 fetch key 与 web 面板同源）。
  await stateIs('outline_count', '6')
  await stateIs('ul_count', '1')
  const capOl = await snapshot()
  const headingRow = findFirst(capOl, (n) => ownText(n) === '一致性（Consistency）')
  if (!headingRow) throw new Error('links: outline row "一致性（Consistency）" not rendered (^anchor/{#id} strip broken?)')
  // 反链点击跳转：backlinks 列含 Hello World（button 由 .backlinks 渲染）
  const blBtn = findFirst(await snapshot(), (n) => n.head.startsWith('button ') && ownText(n) === 'Hello World')
  if (!blBtn) throw new Error('links: backlink button "Hello World" not rendered')
  await callTool('autoui_action', { element_id: elementIdOf(blBtn), action: 'press' })
  await stateIs('active_title', 'Hello World')
  checks.push('links: CAP 定理 → bl=2/ol=2（engine 页级反链口径）+ outline 6/unlinked 1 装配锚 + 反链按钮跳转 Hello World ✓')
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
  await pressMenuItem('卡片', '加载卡片')
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
  await pressMenuItem('卡片', '导出工作区')
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
  await pressMenuItem('卡片', '导入归档')
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

// PLAN-079 T-02 批 B：命令面板（ui_config 重建清单 × pal_match 过滤门 ×
// 静态行绑定派发）+ 快速切换器（sw_collect×sw_filter 下沉 fn 真消费 + 行
// 点击开页 + 面板随开页自闭）。
arm('palette', async (checks) => {
  await pressMenuItem('视图', '命令面板')
  await stateIs('status', 'palette')
  // CJK 过滤（P-7 域）："重" → 重载文件列表在场、保存缺席（过滤门真效）
  await typeInto((n) => n.head.startsWith('input '), '重', 'palette input')
  await stateIs('status', 'palette-typing')
  let tree = await snapshot()
  if (!findFirst(tree, (n) => n.head.startsWith('button ') && ownText(n) === '重载文件列表'))
    throw new Error('palette: filtered row 重载文件列表 missing')
  if (findFirst(tree, (n) => n.head.startsWith('button ') && ownText(n) === '保存'))
    throw new Error('palette: 保存 should be filtered out by query 重')
  // 静态行绑定派发：press 重载文件列表 → files-reloaded
  await pressButton('重载文件列表')
  await stateIs('status', 'files-reloaded')
  // 重开面板 = 空查询全量直下（OpenPalette 重置 palette_q；pal_match 空
  // 查询语义）
  await pressButton('关闭')
  await stateIs('status', 'palette-closed')
  await pressMenuItem('视图', '命令面板')
  await stateIs('status', 'palette')
  const tree2 = await snapshot()
  if (!findFirst(tree2, (n) => n.head.startsWith('button ') && ownText(n) === '导入归档'))
    throw new Error('palette: empty-query full list missing 导入归档')
  await pressButton('关闭')
  await stateIs('status', 'palette-closed')
  checks.push('palette: 视图菜单开面板 → "重" 过滤（重载在场/保存缺席）→ press 行派发 files-reloaded → 重开空查询全量 → 关闭 ✓')
})

arm('switcher', async (checks) => {
  await pressMenuItem('视图', '快速切换')
  await stateIs('status', 'switcher')
  await typeInto((n) => n.head.startsWith('input '), '定', 'switcher input')
  await stateIs('status', 'switcher-typing')
  // CJK 过滤走下沉 fn 部署副本（sw_collect×sw_filter computed 纯派生）。
  // 行按钮与文件树同名（CAP 定理.ad）——DFS 序文件树在前，取 last =
  // 切换器面板行（main col 在 filetree col 之后）。
  const treeS = await snapshot()
  const rowBtns = findAll(treeS, (n) => n.head.startsWith('button ') && ownText(n) === 'CAP 定理.ad' && elementIdOf(n))
  if (!rowBtns.length) throw new Error('switcher: no CAP 定理.ad buttons rendered')
  await callTool('autoui_action', { element_id: elementIdOf(rowBtns[rowBtns.length - 1]), action: 'press' })
  await stateIs('status', 'opened')
  await stateIs('active_title', 'CAP 定理')
  // 面板随开页自闭（自持弹层面板语义）
  const tree = await snapshot()
  if (findFirst(tree, (n) => n.head.startsWith('input ') && ownText(n) === '切换到文件…'))
    throw new Error('switcher: panel should auto-close on file open')
  const inputCount = findAll(tree, (n) => n.head.startsWith('input ')).length
  if (inputCount !== 1) throw new Error(`switcher: expected 1 input (search) after close, saw ${inputCount}`)
  checks.push('switcher: 视图菜单开切换器 → "定" 过滤 → press CAP 定理.ad 开页 + 面板自闭 ✓')
})

// PLAN-079 T-03 批 C 臂：agenda（get_agenda 契约 + ag_display 副本行构造，
// SCHEDULED 子行播种）/ recent（会话记账 + rf_rows 副本）/ cpp（缺失出链
// 点击 → 确认面板 → create_file 建页真流）/ theme（theme_accents 副本 +
// 模式/accent 状态面）。
arm('agenda', async (checks) => {
  // 播种带日程任务（语法 = tasks-fixtures.json 实证：`- TODO` 关键字形态
  // 标记 + 2 空格缩进 SCHEDULED 子行 + 角括号日期；`- [ ]` 复选框在
  // tasks_gen 语法里不是任务标记——实勘 fixture 第 2 页 expected=[]）。
  // 明日 = 14 天窗口内；fixture 恢复协议兜底回滚。
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const q = `议程探针 ${nonce()}`
  const post = (p, payload) =>
    fetch(`${BACKEND}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const doc = await fetch(`${BACKEND}/api/wiki/${encodeURIComponent('Tasks.ad')}`).then((r) => r.json())
  const seed = `- TODO ${q}\n  SCHEDULED: <${tomorrow}>\n`
  const put = await post(`/api/wiki/${encodeURIComponent('Tasks.ad')}`, { frontmatter: doc.frontmatter, body: doc.body + '\n' + seed })
  if (!put.ok) throw new Error(`agenda: seed write failed: ${put.status}`)
  await pressMenuItem('视图', '日程')
  await stateIs('status', 'agenda-loaded')
  await stateIs('agenda_count', '1')
  // 行渲染面 = marker/line/date（line = title 回落页题——web agenda_display
  // 同形；content 字段行模型在场但视图不显，与 web 面板一致）
  const tree = await snapshot()
  const flat = subtreeText(tree)
  if (!flat.includes('TODO')) throw new Error('agenda: marker TODO not rendered')
  if (!flat.includes(tomorrow)) throw new Error(`agenda: date raw ${tomorrow} not rendered`)
  checks.push(`agenda: SCHEDULED 播种（- TODO 关键字 + 角括号日期）→ 装载 → agenda_count=1 + 行渲染（marker/date raw 直下）`)
})

arm('recent', async (checks) => {
  // 会话记账：显式双开（Projects + Tasks）→ recent_count 增 2 + 行在场。
  // 同步纪律：status "opened" 是同值断言（第二次 press 会立即命中第一次
  // 的残留值，不等待 handler 完成——本轮实录竞态），故以 recent_count
  // 轮询为同步点。
  const readCount = async () => {
    const st = await callTool('autoui_state', { fields: ['recent_count'] })
    return parseInt(st.match(/recent_count:\s*(\d+)/)?.[1] ?? '0', 10)
  }
  const base = await readCount()
  for (const [i, name] of ['Projects.ad', 'Tasks.ad'].entries()) {
    const tree = await snapshot()
    const btn = findFirst(tree, (n) => n.head.startsWith('button ') && ownText(n) === name)
    if (!btn) throw new Error(`recent: file button ${name} not found`)
    await callTool('autoui_action', { element_id: elementIdOf(btn), action: 'press' })
    for (const deadline = Date.now() + 6000; ; ) {
      if ((await readCount()) >= base + i + 1) break
      if (Date.now() > deadline) throw new Error(`recent: count never advanced past ${base + i + 1} after opening ${name}`)
      await sleep(120)
    }
  }
  const n = await readCount()
  const tree2 = await snapshot()
  const labels = findAll(tree2, (n) => n.head.startsWith('button ')).map(ownText)
  for (const want of ['Projects', 'Tasks']) {
    if (!labels.includes(want)) throw new Error(`recent: row label ${want} missing`)
  }
  checks.push(`recent: 双开记账 → recent_count=${n}（去重前插 cap10）+ 行在场（rf_rows 副本，时间列 TS 域差异）`)
})

arm('cpp', async (checks) => {
  // cpp 建页面板（自持入口）：文件菜单「新建页面」→ 标题输入 → Create →
  // create_file 真建页 + 文件树刷新 + 新页打开。（缺失出链触发 = 死路：
  // 后端 outlinks exists 恒真——linkgraph targetPage 裸标题实勘，web 同款
  // 孤儿面；批 C 装配裁定见 .OpenCpp 注记。）
  const missing = `缺失页七九${nonce().slice(0, 5)}`
  await pressMenuItem('文件', '新建页面')
  await stateIs('status', 'cpp-open')
  await typeInto((n) => n.head.startsWith('input '), missing, 'cpp title input')
  await stateIs('status', 'cpp-typing')
  await pressButton('Create')
  await stateIs('status', 'cpp-created')
  // 建页实证：文件树出现新 .ad 按钮（CppCreate 内 ft_nodes 刷新）+ 面板自闭
  for (const deadline = Date.now() + 6000; ; ) {
    const tree = await snapshot()
    if (findFirst(tree, (n) => n.head.startsWith('button ') && ownText(n) === `${missing}.ad`)) break
    if (Date.now() > deadline) throw new Error(`cpp: created file ${missing}.ad not in the file tree`)
    await sleep(150)
  }
  checks.push(`cpp: 文件菜单新建页面 → 标题输入 → Create → ${missing}.ad 建页 + 树刷新 + 打开 ✓`)
})

arm('theme', async (checks) => {
  await pressMenuItem('视图', '主题')
  await stateIs('status', 'theme-open')
  const tree = await snapshot()
  for (const label of ['Light', 'Dark', 'Indigo', 'Emerald', 'Rose', 'Amber', 'Slate']) {
    if (!findFirst(tree, (n) => n.head.startsWith('button ') && ownText(n) === label))
      throw new Error(`theme: button ${label} missing`)
  }
  await pressButton('Dark')
  await stateIs('status', 'theme-dark')
  await stateIs('theme_mode', 'dark')
  await pressButton('Rose')
  await stateIs('status', 'accent-rose')
  await stateIs('theme_accent', 'rose')
  await pressButton('关闭')
  await stateIs('status', 'theme-closed')
  checks.push('theme: 面板五 accent（theme_accents 副本）+ Light/Dark + 模式/accent 状态投影（运行时应用 env 域差异登记）✓')
})

// PLAN-080 T-01 批 D 臂：properties 配对通道端到端（backend
// frontmatter_pairs 加法契约[back 单测判别 YAML 序] → web tabs_store 单源
// 存字段 → desktop props_rows 副本行构造，只读 v1）。断言锚 = 行计数真值
// + 键名 + 标量值文本（summary/updated_at 双唯一锚）+ SwitchTab 刷新。
arm('properties', async (checks) => {
  const tree0 = await snapshot()
  const cap = findFirst(tree0, (n) => n.head.startsWith('button ') && ownText(n) === 'CAP 定理.ad')
  if (!cap) throw new Error('properties: "CAP 定理.ad" file button not found')
  await callTool('autoui_action', { element_id: elementIdOf(cap), action: 'press' })
  await stateIs('status', 'opened')
  await stateIs('prop_count', '5')
  // 键真值（fixture YAML 序 status/summary/tags/title/updated_at——与本
  // fixture 字母序重合，序判别在 back wiki 单测 zebra/alpha/mike/kilo）
  const keys = ['status', 'summary', 'tags', 'title', 'updated_at']
  const tree = await snapshot()
  for (const k of keys) {
    if (!findFirst(tree, (n) => ownText(n) === k)) throw new Error(`properties: key row ${k} missing`)
  }
  // 标量值端到端（summary/updated_at = 全 UI 唯一文本锚；tags 的 list 串化
  // 形态 = 显示级差异不押——panels_d_fns.at 头注）
  const flat = subtreeText(tree)
  if (!flat.includes('分布式系统中的 CAP 定理简介')) throw new Error('properties: summary value missing')
  if (!flat.includes('2026-08-27T03:50:52')) throw new Error('properties: updated_at value missing')
  // 切换刷新：开 Hello World（文件树按钮——scoped 跑时 strip 钮可能不在
  // 场；OpenFile 激活臂同一刷新块）→ 计数不变、summary 值随页切换。
  // prop_count 双页同为 5 无判别力——以 Hello summary 值轮询为同步点
  //（渲染竞态实录：全量序下单拍快照可能先于重渲染）。
  const hw = findFirst(await snapshot(), (n) => n.head.startsWith('button ') && ownText(n) === 'Hello World.ad')
  if (!hw) throw new Error('properties: "Hello World.ad" file button not found')
  await callTool('autoui_action', { element_id: elementIdOf(hw), action: 'press' })
  await stateIs('status', 'opened')
  for (const deadline = Date.now() + 6000; ;) {
    const flat2 = subtreeText(await snapshot())
    if (flat2.includes('最基础的 AutoDown 文档示例')) break
    if (Date.now() > deadline) throw new Error('properties: switch did not refresh pair rows (Hello summary never rendered)')
    await sleep(150)
  }
  await stateIs('prop_count', '5')
  checks.push('properties: CAP 定理 → prop_count=5 + 五键行 + summary/updated_at 标量值 + 切换刷新（配对通道 P-9 绕开，只读 v1）✓')
})

// PLAN-080 T-02/T-03 批 E 臂：graph_view 真渲染（canvas 场景契约 v2——049 样板
// 断言通道：state 直读三表 + canvas 在场 + press(value=id) onhit 直达 +
// 开页自闭回编辑区）+ graph_sidebar/controls 挂载（stats/top 行 + slider
// set_value 投影 + flags 过滤重表 + reset）。P661-D4 消费侧交接的 desktop
// 面承接。
arm('graph', async (checks) => {
  // T-03：图谱页入口 = 视图菜单「图谱页」（全局 v1；局部 BFS 划出 Q-3）
  await pressMenuItem('视图', '图谱页')
  await stateIs('status', 'graph-loaded')
  // fixture 域断言：真实 5 页为下限（cpp 臂历史泄漏的缺失页*.ad 会入图
  // ——fixture 恢复协议只回滚 tracked 文件，untracked 泄漏累积在案）
  const cntSt = await callTool('autoui_state', { fields: ['graph_node_count'] })
  const cnt = parseInt(cntSt.match(/graph_node_count:\s*(\d+)/)?.[1] ?? '0', 10)
  if (cnt < 5) throw new Error(`graph: expected ≥5 graph nodes, got ${cnt}`)
  // 三表真值（state 直读——graph_ring_tables 副本产物）：节点行 id=path
  //（"CAP 定理.ad,…" 前缀）+ 标签行 label 在场 + 边表非空
  const st = await callTool('autoui_state', { fields: ['graph_nodes', 'graph_labels', 'graph_edges'] })
  if (!/CAP 定理\.ad,/.test(st)) throw new Error(`graph: node table lacks path-id row: ${st.slice(0, 300)}`)
  if (!/CAP 定理/.test(st.match(/graph_labels: (\[[^\]]*\])/)?.[1] ?? '')) {
    throw new Error(`graph: label table lacks CJK label: ${st.slice(0, 300)}`)
  }
  if (!/graph_edges: \[.+\]/.test(st) || /graph_edges: \[\]/.test(st)) {
    throw new Error(`graph: edge table empty: ${st.slice(0, 300)}`)
  }
  // 图谱页视图切换：canvas 在场、编辑器缺席
  const tree = await snapshot()
  const cnv = findFirst(tree, (n) => n.head.startsWith('canvas ') && elementIdOf(n))
  if (!cnv) throw new Error('graph: canvas not rendered in graph page view')
  if (findFirst(tree, isEditorNode)) throw new Error('graph: editor should be hidden in graph page view')
  // T-03 sidebar（graph_stats/top_degree_nodes 副本）：stats 段标签在场 +
  // top 行按钮在场（度降序 top15 display）。orphan 真值自 API 推导（state
  // 打印器对 map 呈 <vmref> 不透明——过滤效果以 API 事实断言）
  const gres = await fetch(`${BACKEND}/api/graph`).then((r) => r.json())
  const orphan = gres.nodes.filter((n) => n.degree === 0).length
  const treeSb = await snapshot()
  for (const lbl of ['链接', '孤立']) {
    if (!findFirst(treeSb, (n) => ownText(n) === lbl)) throw new Error(`graph: sidebar stats label ${lbl} missing`)
  }
  const topBtns = findAll(treeSb, (n) => n.head.startsWith('button ') && elementIdOf(n))
  if (!topBtns.some((b) => ['index', '首页', 'CAP 定理', 'Hello World'].includes(ownText(b)))) {
    throw new Error('graph: no top-degree row button rendered (expected a real page label)')
  }
  // T-03 controls：slider 词位 set_value → gc_set_setting 写通道 + 三表
  // 重灌投影（nodeSize 24 → 节点行 r=24；661 set_value 闭环消费）
  const slider = findFirst(treeSb, (n) => n.head.startsWith('slider ') && elementIdOf(n))
  if (!slider) throw new Error('graph: nodeSize slider not rendered')
  await callTool('autoui_action', { element_id: elementIdOf(slider), action: 'set_value', value: 24 })
  await stateIs('status', 'gc-nodesize')
  await stateHas('graph_nodes', ',circle,#3b82f6,24')
  // flags 过滤重表：孤立 off → 度 0 节点出表（orphan>0 时计数下降）
  if (orphan > 0) {
    await pressButton('孤立:开→关')
    await stateIs('status', 'gc-orphans')
    const st2 = await callTool('autoui_state', { fields: ['graph_node_count'] })
    const cnt2 = parseInt(st2.match(/graph_node_count:\s*(\d+)/)?.[1] ?? '0', 10)
    if (cnt2 !== cnt - orphan) throw new Error(`graph: showOrphans filter expected ${cnt - orphan} nodes, got ${cnt2}`)
  }
  // reset 回默认（nodeSize 12 回表）
  await pressButton('重置设置')
  await stateIs('status', 'gc-reset')
  await stateHas('graph_nodes', ',circle,#3b82f6,12')
  // onhit（R-1）：press(value=id) 直达 → .GraphNodeTap(id) → .OpenFile 开页
  //（active_title 跟随 + graph_page 自闭——编辑区回来）
  const cnv2 = findFirst(await snapshot(), (n) => n.head.startsWith('canvas ') && elementIdOf(n))
  await callTool('autoui_action', { element_id: elementIdOf(cnv2), action: 'press', value: 'CAP 定理.ad' })
  await stateIs('active_title', 'CAP 定理')
  await stateIs('graph_page', 'false')
  const tree2 = await snapshot()
  if (findFirst(tree2, (n) => n.head.startsWith('canvas '))) throw new Error('graph: graph_page should auto-close on node open')
  if (!findFirst(tree2, isEditorNode)) throw new Error('graph: editor not restored after node open')
  checks.push(`graph: 视图→图谱页 → 环形三表（${cnt} 节点 path-id + CJK 标签 + 边表）+ sidebar stats/top 行 + slider set_value→r=24 投影${orphan > 0 ? ` + 孤立过滤 ${cnt}→${cnt - orphan}` : ''} + reset + press(id) 开页 + 自闭回编辑区 ✓`)
})

// tabs 臂（PLAN-064 T-05，§5.4 五断言，tabs_store 驱动的多 tab 编辑器流）：
//   ① 双 tab 打开且 tab 条在场
//   ② 切换回读正文不串页
//   ③ 脏态关闭（confirmClose deviation：VM 默认确认即弃）+ 状态行登记
//   ④ Save 清脏 + 磁盘落盘（经 store Save msg）
//   ⑤ 同路径重复 Open 不覆盖已 loaded tab（双读竞争防护，022 Phase 3 e2e
//      11-properties 同款断言语义）
/** Editor node predicate — PLAN-067 T-04: the body editor is a `code_editor`
 *  (CodeMirror6); rendered snapshots name it `textarea` (041 desktop_mcp.py
 *  T1 先例) or `code_editor` depending on build path — accept both.
 *  PLAN-068 T-02: body = `autodown_editor`（PLAN-066 原生外部件）；本机 exe
 *  投影同为 `textarea`（demo 同 exe 实证同形态，Q1 冻结）——autodown_editor/
 *  AutodownEditor 拼写为真块编辑壳 exe 的未来面预留。 */
const isEditorNode = (n) =>
  n.head.startsWith('textarea ') ||
  n.head.startsWith('code_editor ') ||
  n.head.startsWith('autodown_editor ') ||
  n.head.startsWith('AutodownEditor ')

/** Read the editor textarea's bound value from the snapshot (the value
 *  prop rides the AURA tree like offset_y/col_widths do). Poll until the
 *  predicate holds; returns the last seen value. */
async function textareaValue(until = null, timeoutMs = 6000) {
  let last = null
  for (const deadline = Date.now() + timeoutMs; ;) {
    const tree = await snapshot()
    const ta = findFirst(tree, isEditorNode)
    if (ta) {
      const prop = findFirst(ta, (n) => n !== ta && (n.head.startsWith('value:') || n.head.startsWith('content:')))
      const child = prop ? subtreeText(prop) : ''
      const own = ownText(prop ?? { head: '' })
      last = own || child
      if (until === null || (last && last.includes(until))) return last ?? ''
    }
    if (Date.now() > deadline) return last ?? ''
    await sleep(150)
  }
}

arm('tabs', async (checks) => {
  // ① 打开 CAP 定理为第二 tab（Hello World 已由 read/save 臂打开——臂间
  //    状态延续正是多 tab 流）；strip 两个 tab 按钮在场
  const tree0 = await snapshot()
  const capBtn = findFirst(tree0, (n) => n.head.startsWith('button ') && ownText(n) === 'CAP 定理.ad')
  if (!capBtn) throw new Error('tabs: "CAP 定理.ad" file button not found')
  await callTool('autoui_action', { element_id: elementIdOf(capBtn), action: 'press' })
  await stateIs('status', 'opened')
  // Hello World 已由 read/links 臂打开（全量跑）——此处只验 strip 双 tab 在场
  const strip1 = findFirst(await snapshot(), (n) => n.head.startsWith('button ') && ownText(n) === 'CAP 定理')
  const strip2 = findFirst(await snapshot(), (n) => n.head.startsWith('button ') && ownText(n) === 'Hello World')
  if (!strip1 || !strip2) throw new Error('tabs①: tab strip lacks both titles')
  checks.push('tabs①: 双 tab 打开且 tab 条在场（strip: Hello World + CAP 定理）')

  // ② 切换回读正文不串页：strip 切 CAP → 正文 CAP 标记；切回 Hello → 正文
  //    Hello 标记（正文经 SwitchTab 从 tab 状态回读，不重读磁盘）。第二次
  //    切换的 status 同值（switched）无判别力——以 active_title 轮询为同步
  //    点（080 实录：同值竞态使断言先于 handler 完成读到旧 tab 正文）。
  await pressButton('CAP 定理')
  await stateIs('status', 'switched')
  await stateHas('active_body', '分布式系统')
  await pressButton('Hello World')
  await stateIs('active_title', 'Hello World')
  // 全量跑时 Hello 的 tab 正文 = save 臂写入的 marker（整文替换语义）；
  // 单臂跑（--arms tabs）经 ③ 重开后的磁盘正文断言兜底。
  const hwNeedle = saveMarker || 'Hello, Jade Garden!'
  const hwBody = await stateText('active_body')
  if (!hwBody.includes(hwNeedle)) {
    const more = await callTool('autoui_state', { fields: ['active_title', 'active_path', 'active_dirty', 'status'] })
    const flat = more.trim().split('\n').join(' | ')
    throw new Error('tabs(2): Hello body missing after switch: needle=' + hwNeedle + ' body=' + hwBody.slice(0, 160) + '; more=' + flat)
  }
  if (hwBody.includes('分布式系统')) throw new Error('tabs②: body 串页 (CAP content under Hello tab)')
  checks.push('tabs②: 切换回读正文不串页（CAP/Hello 正文各归其 tab）')

  // ③ 脏态关闭（confirmClose deviation：VM 默认确认即弃）+ 状态行登记：
  //    键入置脏 → close-tab → status discarded-dirty:Hello World → 重开回
  //    到磁盘原貌
  const marker2 = `tabs-dirty ${nonce()}`
  await typeInto(isEditorNode, marker2, 'editor')
  await stateIs('active_dirty', 'true')
  // PLAN-068 T-01: 激活 tab x 钮接线断言——icon 在快照中渲染为 "[Image]"
  // 文本节点（name prop 不可见，T-01 实机），定位锚 = 空文本 button
  // （`button #id ""`，全视图唯一：toolbar/menubar/FileTree 按钮均带标签）。
  // press 其 element_id 与零参 .CloseTab（活动 tab 语义）等价。
  const xBtns = findAll(
    await snapshot(),
    (n) => n.head.startsWith('button ') && elementIdOf(n) && ownText(n) === '',
  )
  if (xBtns.length !== 1) {
    throw new Error(`tabs③a: expected exactly 1 textless (x) button, saw ${xBtns.length}`)
  }
  await callTool('autoui_action', { element_id: elementIdOf(xBtns[0]), action: 'press' })
  await stateIs('status', 'discarded-dirty:Hello World')
  const hwFile = findFirst(await snapshot(), (n) => n.head.startsWith('button ') && ownText(n) === 'Hello World.ad')
  await callTool('autoui_action', { element_id: elementIdOf(hwFile), action: 'press' })
  await stateIs('status', 'opened')
  // 重开正文 = 磁盘现内容（全量跑时 = save 臂写过的正文，故与后端读回的
  // body 比对而非固定串）；负向断言：弃置的键入不在场
  const diskDoc = await fetch(`${BACKEND}/api/wiki/${encodeURIComponent('Hello World.ad')}`).then((r) => r.json())
  const diskBody = String(diskDoc.body ?? '')
  const restored = await stateText('active_body')
  if (!restored.includes(diskBody.trim().slice(0, 40))) {
    throw new Error('tabs(3): reopened body does not match disk content: ' + restored.slice(0, 120))
  }
  if (restored.includes(marker2)) throw new Error('tabs③: dirty edits survived a discarded close')
  checks.push('tabs③: 脏态关闭降级语义（关闭即弃）+ 状态行 discarded-dirty:Hello World 登记')

  // ⑤ 同路径重复 Open 不覆盖已 loaded tab：键入置脏（未保存）→ 再按文件
  //    按钮（重复 Open）→ 在途编辑仍在正文里；随后保存落盘实证
  const marker3 = `tabs-race ${nonce()}`
  await typeInto(isEditorNode, marker3, 'editor')
  await stateIs('active_dirty', 'true')
  const hwFile2 = findFirst(await snapshot(), (n) => n.head.startsWith('button ') && ownText(n) === 'Hello World.ad')
  await callTool('autoui_action', { element_id: elementIdOf(hwFile2), action: 'press' })
  await stateIs('status', 'opened')
  await stateHas('active_body', marker3)
  await pressAction('.Save')
  await stateIs('active_dirty', 'false')
  for (const deadline = Date.now() + 8000; ;) {
    const body = fs.readFileSync(path.join(FIXTURE, 'wiki', 'Hello World.ad'), 'utf8')
    if (body.includes(marker3)) break
    if (Date.now() > deadline) throw new Error(`tabs⑤: in-flight edit lost after repeat Open (marker ${marker3} never saved)`)
    await sleep(150)
  }
  checks.push('tabs⑤: 同路径重复 Open → 已 loaded tab 在途编辑存活（落盘实证，双读竞争防护）')

  // ④ 保存：清脏 + 磁盘落盘
  const marker4 = `tabs-save ${nonce()}`
  await typeInto(isEditorNode, marker4, 'editor')
  await pressAction('.Save')
  await stateIs('status', 'saved')
  await stateIs('active_dirty', 'false')
  for (const deadline = Date.now() + 8000; ;) {
    const body = fs.readFileSync(path.join(FIXTURE, 'wiki', 'Hello World.ad'), 'utf8')
    if (body.includes(marker4)) break
    if (Date.now() > deadline) throw new Error(`tabs④: marker never hit the disk: ${marker4}`)
    await sleep(150)
  }
  checks.push(`tabs④: 保存 → 清脏 + 磁盘落盘 (${marker4})`)
})

/** Raw state read (no waiting) — for negative assertions. */
async function stateText(field) {
  return callTool('autoui_state', { fields: [field] })
}

// ---------------- run ----------------
function parseArgsForRun(argv) {
  const runArgs = ['run', '-r', 'vm']
  return runArgs
}

// arm dependency graph — --arms selections are expanded with their
// prerequisites (tabs reads the file tree, which open-ws/files populate)
const ARM_DEPS = {
  tabs: ['open-ws', 'files'],
  read: ['open-ws', 'files'],
  save: ['open-ws', 'files'],
  links: ['open-ws', 'files'],
  search: ['open-ws'],
  palette: ['open-ws'],
  switcher: ['open-ws'],
  agenda: ['open-ws'],
  recent: ['open-ws'],
  cpp: ['open-ws'],
  theme: ['open-ws'],
  properties: ['open-ws', 'files'],
  graph: ['open-ws'],
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

  const wanted = ONLY_ARMS ?? Object.keys(arms)
  const names = []
  for (const n of wanted) {
    for (const dep of ARM_DEPS[n] ?? []) {
      if (!names.includes(dep) && (ONLY_ARMS ? !ONLY_ARMS.includes(dep) : false)) names.push(dep)
    }
    if (!names.includes(n)) names.push(n)
  }
  for (const name of names) {
    await arms[name](checks)
  }

  restoreFixture()
  const hashAfter = hashFixture()
  assertRestored(hashBefore, hashAfter)
  checks.push('fixture: restored — hash(before) == hash(after) (恢复协议生效)')

  return checks
}

// --save-baseline <file>: drive a deterministic full state (workspace +
// Hello World + CAP 定理 tabs + due cards + graph + page search "CAP"),
// dump state + AURA snapshot to <file> (PLAN-064 AC-06 结构基线).
async function saveBaseline(outFile) {
  const baseline = logBaseline()
  await restoreFixture()
  await ensureBackend()
  port = 0
  for (let p2 = BASE_PORT; p2 < BASE_PORT + 16; p2++) {
    if (await portFree(p2)) {
      port = p2
      break
    }
  }
  if (!port) throw new Error('no free MCP port')
  const env = { ...process.env, AUTOUI_MCP_PORT: String(port), AUTO_BACKEND: BACKEND, AUTO_VM_MERGE: '0' }
  spawnTracked('vm-window', AUTO_EXE, ['run', '-r', 'vm'], { cwd: here, env })
  await waitForServer(45000)
  for (const deadline = Date.now() + 30000; ;) {
    try {
      const snap = await callTool('autoui_snapshot', {})
      if (snap.includes('button')) break
    } catch {}
    if (Date.now() > deadline) throw new Error('vm window rendered no UI within 30s')
    await sleep(500)
  }
  await pressAction('.OpenWs')
  await stateIs('status', 'ws-open')
  for (const name of ['Hello World.ad', 'CAP 定理.ad']) {
    const tree = await snapshot()
    const btn = findFirst(tree, (n) => n.head.startsWith('button ') && ownText(n) === name)
    if (!btn) throw new Error(`baseline: file button ${name} missing`)
    await callTool('autoui_action', { element_id: elementIdOf(btn), action: 'press' })
    await stateIs('status', 'opened')
  }
  await pressMenuItem('卡片', '加载卡片')
  await stateIs('status', 'cards-loaded')
  await pressMenuItem('卡片', '加载图谱')
  await stateIs('status', 'graph-loaded')
  await typeInto((n) => n.head.startsWith('input '), 'CAP', 'search input')
  await pressButton('search')
  await stateIs('status', 'searched')
  const state = await callTool('autoui_state', {})
  const snapTree = await callTool('autoui_snapshot', {})
  const NL = String.fromCharCode(10)
  const header =
    '// iced 结构基线（PLAN-064 T-05）—— AutoUI @ 满状态：工作区已开 + ' +
    'Hello World / CAP 定理 双 tab + due 卡 + 图谱 + 页搜索 "CAP"。' + NL +
    '// 再生成：node vm-smoke.mjs --save-baseline baseline/iced-tabs-structure.txt' + NL +
    '// slice 5 基线（baseline/iced-slice5-structure.txt）为单活动文档期前身。' + NL
  fs.writeFileSync(outFile, header + '## state' + NL + state.trim() + NL + NL + '## snapshot' + NL + snapTree.trim() + NL)
  console.log(`jade vm-smoke: baseline written → ${outFile}`)
  await killTracked()
  restoreFixture()
}

async function main() {
  const outFile = argOf('--save-baseline')
  if (outFile) {
    await saveBaseline(outFile)
    process.exitCode = 0
    return
  }
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
