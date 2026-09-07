// vm-060-probe.mjs — PLAN-060 T4: VM 轨块键 UX 对齐手验 + 证据 PNG 采集
// （demo vm-059-probe.mjs 模式）。前置：demo/auto 下以 PLAN-060 worktree
// 构建的 auto.exe 运行：
//   AUTOUI_MCP_PORT=9359 <worktree>/target/debug/auto.exe run -r vm
//   node vm-060-probe.mjs
// 清单：type_text 归一基线文档（同时建立编辑器焦点）→ 标题行尾 Enter →
// 断言 state.content 出现空段落且无空标题行（尾块降级 = 网页轨
// splitTailKind 语义）→ 截图 vm-060-enter.png → Backspace 合并 → 断言
// content 字节还原基线 → 截图 vm-060-backspace.png → 标题行中 Enter →
// 断言尾巴文本以段落身份落在下一行（"# Heading\n\n One"）。
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function pressKey(keyspec) {
  const out = await callTool('autoui_action', { element_id: EDITOR_ID, action: 'key_press', value: keyspec })
  if (!/status: ok/.test(out)) throw new Error(`key_press ${keyspec} not ok: ${out}`)
}

async function typeText(doc) {
  const out = await callTool('autoui_action', { element_id: EDITOR_ID, action: 'type_text', value: doc })
  if (!/status: ok/.test(out)) throw new Error(`type_text not ok: ${out}`)
}

/** state.content —— autoui_state 会滞后一个节拍（042 复审门在案的同步
 *  滞后），轮询至等于期望或超时。 */
async function pollContent(expected, timeoutMs = 5000) {
  for (const deadline = Date.now() + timeoutMs; ; ) {
    const st = await callTool('autoui_state', { fields: ['content'] })
    const raw = st.match(/content:\s*"((?:[^"\\]|\\.)*)"/)?.[1]
    // 状态桥以字面 \n 转义输出换行——解码后与真实文档比较。
    const captured = raw?.replace(/\\n/g, '\n')
    if (captured != null && captured === expected) return captured
    if (Date.now() > deadline) {
      throw new Error(`state.content mismatch:\n  got:  ${JSON.stringify(captured)}\n  want: ${JSON.stringify(expected)}`)
    }
    await sleep(100)
  }
}

function hasEmptyHeadingLine(doc) {
  return doc.split('\n').some((line) => /^#{1,6}\s*$/.test(line))
}

async function grabScreenshot(file) {
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
      await sleep(2000)
    }
  }
  throw new Error(`screenshot ${file} failed after retries`)
}

/** Parse the AURA snapshot text into a lightweight tree (vm-smoke idiom). */
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

let EDITOR_ID = null

// --- 0. server up ---
await rpc('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'vm-060-probe', version: '1.0' },
})
await rpc('notifications/initialized', {})
await sleep(500)

// --- 1. 种子起屏 + 编辑器定位 ---
const snap0 = await callTool('autoui_snapshot', {})
assert(snap0.includes('Heading One'), 'startup snapshot has the seed heading')
const ta0 = findFirst(parseAura(snap0), (n) => n.head.startsWith('textarea '))
assert(!!ta0, 'editor textarea face present')
EDITOR_ID = elementIdOf(ta0)
assert(!!EDITOR_ID, `editor element id resolved (${EDITOR_ID})`)

// --- 2. 归一基线文档（type_text 建立已知 content 起点；focus 仍为 null）---
const DOC0 = '# Heading One\n\nParagraph A\n\nParagraph B\n'
await typeText(DOC0)
await pollContent(DOC0)
assert(true, 'baseline content normalized')

// --- 2b. 聚焦块 0：click 是 __mcp_click 焦点路径（vm-smoke group9 先例
//        "40,12"），KeyPressed 只路由到聚焦块。---
const focusClick = await callTool('autoui_action', { element_id: EDITOR_ID, action: 'click', value: '40,12' })
if (!/status: ok/.test(focusClick)) throw new Error(`focus click not ok: ${focusClick}`)
await sleep(200)
const stFocus = JSON.parse(await callTool('autoui_editor_state', { element_id: EDITOR_ID }))
assert(stFocus.focus === 0, `block 0 focused after click (got ${JSON.stringify(stFocus.focus)})`)

// --- 3. 标题行尾 Enter → 空尾块降级为空段落 ---
await pressKey('end')
await pressKey('enter')
await sleep(300)
// 空段两侧 \n\n 分隔共 4 个 \n；编辑器重发的文档无尾随换行。
const DOC1 = '# Heading One\n\n\n\nParagraph A\n\nParagraph B'
const c1 = await pollContent(DOC1)
assert(!hasEmptyHeadingLine(c1), 'no empty heading line after Enter (tail demoted, pre-fix tell absent)')
console.log('  ok tail demotion: empty paragraph inserted (splitTailKind parity)')

// --- 4. 截图：降级后的空段落态 ---
await grabScreenshot('vm-060-enter.png')

// --- 5. 空尾块 Backspace → 合并还原基线（光标落 junction 由单测钉死，
//        探针以 content 字节还原为准）---
await pressKey('backspace')
await sleep(300)
const DOC0E = '# Heading One\n\nParagraph A\n\nParagraph B'
await pollContent(DOC0E)
assert(true, 'backspace merged the empty tail: content byte-restored to baseline')

// --- 6. 截图：合并还原态 ---
await grabScreenshot('vm-060-backspace.png')

// --- 7. 标题行中 Enter → 尾巴文本以段落身份落下 ---
await pressKey('home')
for (let i = 0; i < 7; i++) await pressKey('right') // 光标在 "Heading| One"
await pressKey('enter')
await sleep(300)
const DOC2 = '# Heading\n\n One\n\nParagraph A\n\nParagraph B'
await pollContent(DOC2)
assert(true, 'mid-heading Enter: tail text lands as a paragraph line (not "#  One")')

console.log('\nvm-060-probe: ALL PASS')
