// vm-069-probe.mjs — PLAN-069 T5: VM 轨原生 slash 弹层五臂实机探针
// （demo vm-060/061-probe 模式）。前置：demo/auto 下以 PLAN-069 worktree
// 构建的 auto.exe（autodown×code-editor features 全开）运行：
//   AUTOUI_MCP_PORT=9369 <worktree>/target/debug/auto.exe run -r vm
//   node vm-069-probe.mjs
//
// 观测面：slash 弹层状态走 autoui_editor_state 探针 `.slash` 读数
// （visible/query/selected/count；null=关——VM MCP 快照走渲染后 VTree，
// 编辑壳投影 textarea 输入面，core 状态观测沿 PLAN-057 探针约定）。
//
// 清单：① 触发——块首 'c:/' → visible × 23 项（query 空/selected 0）且
// '/' 不落档；② 过滤——'c:h' → count 7（Heading 1-6 + Divider）、
// selected 复位；③ 执行——enter → 首过滤项 Heading 1 迁移（"# 甲段乙段"）
// + 关层；④ 重开+Esc——迁移后块首仍触发、escape 关层零文档效果；
// ⑤ 视觉证据——弹层开启态截图 vm-069-slash-menu.png。
import { copyFileSync } from 'node:fs'

const base = `http://127.0.0.1:9369/mcp`
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

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      await rpc('initialize', {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'vm-069-probe', version: '0.1.0' },
      })
      await rpc('notifications/initialized', {})
      return
    } catch {
      if (Date.now() > deadline) throw new Error(`AutoUI MCP not reachable on ${base}`)
      await sleep(500)
    }
  }
}

/** 弹层读数（autoui_editor_state .slash；短暂轮询吸收渲染节拍）。 */
async function probeSlash(editorId, timeoutMs = 4000) {
  for (const deadline = Date.now() + timeoutMs; ; ) {
    try {
      const res = JSON.parse(await callTool('autoui_editor_state', { element_id: editorId }))
      return { slash: res.slash ?? null, text: res.text ?? '', focus: res.focus ?? null }
    } catch {
      if (Date.now() > deadline) throw new Error('editor probe not readable')
      await sleep(100)
    }
  }
}

async function pressKey(editorId, keyspec) {
  const out = await callTool('autoui_action', { element_id: editorId, action: 'key_press', value: keyspec })
  if (!/status: ok/.test(out)) throw new Error(`key_press ${keyspec} not ok: ${out}`)
}

async function typeText(editorId, doc) {
  const out = await callTool('autoui_action', { element_id: editorId, action: 'type_text', value: doc })
  if (!/status: ok/.test(out)) throw new Error(`type_text not ok: ${out}`)
}

async function shot(file) {
  for (let i = 1; i <= 5; i++) {
    try {
      const text = await callTool('autoui_screenshot', {})
      const m = text.match(/[A-Za-z]:[^\s"']+\.png|tmp[^\s"']+\.png/)
      if (!m) throw new Error(`no path in "${text.slice(0, 120)}"`)
      copyFileSync(m[0].replace(/\//g, '\\'), file)
      console.log(`  ok saved ${file}`)
      return
    } catch (e) {
      console.log(`  .. screenshot retry ${i}: ${String(e).slice(0, 90)}`)
      await sleep(2000)
    }
  }
  throw new Error(`screenshot failed: ${file}`)
}

async function main() {
  await waitForServer()

  const snap = await callTool('autoui_snapshot', {})
  const idm = snap.match(/textarea #vnode_(\d+)/)
  assert(idm, 'snapshot exposes the editor input face (textarea vnode)')
  const E = `vnode_${idm[1]}`

  // 归一基线文档 + 聚焦（click 建焦点 = group5 __mcp_click 先例）+ 光标回
  // 块首。type_text 的外部回写环（on_change → state → content 重绑）异步
  // 落地，先等一拍再点；焦点核验轮询至 core 报出焦点块（重建清焦点防呆）。
  await typeText(E, '甲段乙段\n')
  await sleep(800)
  let focused = null
  for (let i = 0; i < 10 && focused === null; i++) {
    await callTool('autoui_action', { element_id: E, action: 'click', value: '40,12' })
    await sleep(300)
    focused = (await probeSlash(E)).focus
  }
  assert(focused !== null, 'click established block focus')
  await pressKey(E, 'home')
  await sleep(200)

  // ① 触发：块首 '/' → 弹层全量 23 项；触发字符不落档。
  await pressKey(E, 'c:/')
  await sleep(300)
  let st = await probeSlash(E)
  assert(st.slash && st.slash.visible === true, 'c:/ at block start → slash visible')
  assert(st.slash.query === '' && st.slash.selected === 0 && st.slash.count === 23,
    `empty query → all 23 items, selected 0 (got ${JSON.stringify(st.slash)})`)
  assert(!st.text.includes('/'), `'/' char not landed in doc (got ${JSON.stringify(st.text.slice(0, 30))})`)
  await shot('vm-069-slash-menu.png')

  // ② 过滤：query "h" → 7 项（Heading 1-6 + Divider "Horizontal rule"）。
  await pressKey(E, 'c:h')
  await sleep(200)
  st = await probeSlash(E)
  assert(st.slash && st.slash.query === 'h' && st.slash.count === 7 && st.slash.selected === 0,
    `query "h" → count 7, selected reset (got ${JSON.stringify(st.slash)})`)

  // ③ 执行：enter → 首过滤项 Heading 1 迁移 + 关层。
  await pressKey(E, 'enter')
  await sleep(300)
  st = await probeSlash(E)
  assert(st.slash === null, 'Enter executes → menu closed')
  assert(st.text === '# 甲段乙段', `Heading 1 applied (got ${JSON.stringify(st.text.slice(0, 30))})`)

  // ④ 重开 + Esc：迁移后块首 '/' 仍触发；关层零文档效果。
  await pressKey(E, 'home')
  await sleep(200)
  await pressKey(E, 'c:/')
  await sleep(300)
  st = await probeSlash(E)
  assert(st.slash && st.slash.visible === true, 'reopen on migrated block → visible')
  await pressKey(E, 'escape')
  await sleep(200)
  st = await probeSlash(E)
  assert(st.slash === null, 'Escape → menu closed')
  assert(st.text === '# 甲段乙段', `zero doc effect after Escape (got ${JSON.stringify(st.text)})`)

  console.log('\nvm-069-probe: ALL PASS (5 arms incl. visual evidence)')
}

main().catch((e) => {
  console.error(`vm-069-probe: FAIL — ${e.message}`)
  process.exit(1)
})
