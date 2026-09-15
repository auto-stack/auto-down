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
  checks.push('read: open Hello World.ad → active_title + head/tail body markers present (full markdown, space-in-title round trip)')
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
  //    Hello 标记（正文经 SwitchTab 从 tab 状态回读，不重读磁盘）
  await pressButton('CAP 定理')
  await stateIs('status', 'switched')
  await stateHas('active_body', '分布式系统')
  await pressButton('Hello World')
  await stateIs('status', 'switched')
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
