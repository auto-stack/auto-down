#!/usr/bin/env node
// vm-smoke.mjs — plan 042 T8: AutoUI-MCP-driven smoke for the demo's VM
// desktop track (`auto run -r vm`). Replaces 040 T11's pure manual check
// with a repeatable scripted assertion set:
//
//   1. the left editor panel exposes a focusable input face (the block
//      editor shell's textarea in the AURA snapshot)
//   2. typing into it flows through the app model (handler .App.Edit →
//      state.content, asserted via autoui_state)
//   3. the right preview panel renders the typed document — the `# ` marker
//      is consumed by the heading renderer (the snapshot shows the heading
//      TEXT without the marker) and the paragraph text appears in the
//      renderer container that is the textarea container's SIBLING panel
//   4. (plan 043 T6) scroll sync: scrolling the LEFT pane (MCP scroll on
//      the editor's Scrollable) drives the RIGHT pane's offset binding
//      (snapshot Scrollable offset_y) + the state three-measurements
//      (left_top/height/client) update + the CustomScrollbar data is
//      non-zero (height > client ⇒ thumb has range); scrolling the RIGHT
//      pane drives the left pane back (bidirectional proportional sync)
//   5. (plan 044 T6) ghost placeholder: MCP click at block coordinates in
//      the editor (synthetic __mcp_click → core hit_test focus →
//      block_rects height → ghost state direct write) → ghost_id/
//      ghost_height state pair asserted + the renderer pane snapshot
//      grows a fixed-height container node
//   6. (plan 045 T7) table column resize: type a table doc → the Table
//      vnode carries table_key (snapshot prop) → MCP resize_col on it
//      (synthetic __mcp_resize_col → write_table_width_state, the SAME
//      fast-path the OnColResize intercept uses; coordinate hit layer is
//      covered by the rust headless suite) → state.table_widths gains the
//      table key + the snapshot col_widths reflects the new width
//
// Protocol (same channel the jade desktop flows ride, see
// jade-garden/front/desktop/README.md:114-132): AutoUI MCP over Streamable
// HTTP — JSON-RPC 2.0 POSTs to http://127.0.0.1:<port>/mcp with the tools
// autoui_snapshot / autoui_action / autoui_state.
//
// Known pitfall (jade README:127): under PHYSICAL synthetic clicks the
// probed process occasionally exits silently with code 1 (no stack, no
// log) — this script stays on the MCP logical channel (no physical clicks)
// and retries the whole run ONCE on failure, which is the established
// workaround bar.
//
// Usage (from autodown/demo/auto, in two terminals):
//
//   D:/autostack/auto-lang/target/debug/auto.exe run -r vm
//   node vm-smoke.mjs [--port 9247]
//
// Port conflicts: start the window with AUTOUI_MCP_PORT=<port> and pass the
// same --port here.

const args = process.argv.slice(2)
const portIdx = args.indexOf('--port')
const port = Number(portIdx >= 0 ? args[portIdx + 1] : process.env.AUTOUI_MCP_PORT || 9247)
const base = `http://127.0.0.1:${port}/mcp`

// per-attempt nonce: the script is repeatable against a LIVE window without
// a restart, and the in-process retry gets a fresh one (the baseline check
// looks for THIS attempt's nonce; earlier texts carry different nonces)
function smokeTexts() {
  const nonce = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  return {
    doc: `# vm smoke heading ${nonce}\n\nsmoke paragraph for linkage ${nonce}`,
    heading: `vm smoke heading ${nonce}`,
    paragraph: `smoke paragraph for linkage ${nonce}`,
  }
}

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
  const res = await fetch(base, {
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
        clientInfo: { name: 'vm-smoke', version: '0.1.0' },
      })
      await notify('notifications/initialized')
      return
    } catch (err) {
      if (Date.now() > deadline) throw new Error(`AutoUI MCP not reachable on ${base}: ${err.message}`)
      await new Promise((r) => setTimeout(r, 500))
    }
  }
}

/** Parse the AURA snapshot text into a lightweight tree:
 *  `{ head: 'textarea #vnode_123', text?: '"..."' , children: [] }`,
 *  keyed by indentation (2 spaces per level). */
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

function elementIdOf(node) {
  const m = node.head.match(/#(vnode_\d+)/)
  return m ? m[1] : null
}

async function runOnce() {
  const checks = []
  const { doc: SMOKE_DOC, heading: HEADING_TEXT, paragraph: PARAGRAPH_TEXT } = smokeTexts()

  // 1. the left editor's input face (the block-editor shell's textarea)
  const before = parseAura(await callTool('autoui_snapshot', {}))
  const textarea = findFirst(before, (n) => n.head.startsWith('textarea '))
  if (!textarea) throw new Error('no textarea in the snapshot — the editor input face is missing')
  const editorId = elementIdOf(textarea)
  if (!editorId) throw new Error(`textarea without an element id: ${textarea.head}`)

  // the baseline renderer (the pane rendering the document — plan 043 T3:
  // both panes are scroll_sync Scrollables; the RENDERER is the scrollable
  // whose subtree carries the rendered text; the editor pane's scrollable
  // owns the textarea and shows no doc text) must not carry this run's
  // smoke text yet
  const rendererOf = (tree) =>
    findFirst(tree, (n) => n.head.startsWith('scrollable ') && subtreeText(n).includes(PARAGRAPH_TEXT)) ??
    findFirst(tree, (n) => n.head.startsWith('container ') && subtreeText(n).includes(PARAGRAPH_TEXT))
  const rendererBefore = rendererOf(before)
  if (rendererBefore && subtreeText(rendererBefore).includes(PARAGRAPH_TEXT)) {
    throw new Error("this run's smoke text already rendered before typing — nonce collision?")
  }

  // 2. typing flows through the app model (.App.Edit -> state.content)
  const action = await callTool('autoui_action', {
    element_id: editorId,
    action: 'type_text',
    value: SMOKE_DOC,
  })
  if (!/status: ok/.test(action)) throw new Error(`type_text not ok: ${action}`)

  // autoui_state can lag one beat behind the write (the MCP state bridge
  // syncs on view rebuilds — caught by the plan-042 review gate as a
  // back-to-back-run flake), so POLL for the expected content instead of
  // trusting the first query
  const expected = SMOKE_DOC.replace(/\n/g, '\\n')
  let stateText = ''
  for (const deadline = Date.now() + 2000; ; ) {
    stateText = await callTool('autoui_state', { fields: ['content'] })
    const captured = stateText.match(/content:\s*"((?:[^"\\]|\\.)*)"/)?.[1]
    if (captured === expected) break
    if (Date.now() > deadline) {
      throw new Error(`state.content did not take the typed text: ${stateText.trim()}`)
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  checks.push('edit linkage: type_text -> .App.Edit -> state.content === typed doc')

  // 3. the right preview panel renders it — the renderer is the EDITOR
  //    PANEL's sibling (the panels stack vertically on VM v1); the `# `
  //    marker must be consumed (heading TEXT, not the raw source echo).
  //    POLLED for the same sync-lag reason as the state check above.
  //    (plan 043 T6: renderer located by CONTENT — the scrollable whose
  //    subtree carries the rendered text, not by sibling geometry.)
  let rendered = ''
  for (const deadline = Date.now() + 2000; ; ) {
    const after = parseAura(await callTool('autoui_snapshot', {}))
    const renderer = rendererOf(after)
    if (!renderer) {
      if (Date.now() > deadline) throw new Error('no renderer pane found (scrollable/container with rendered text)')
      await new Promise((r) => setTimeout(r, 100))
      continue
    }
    rendered = subtreeText(renderer)
    if (rendered.includes(HEADING_TEXT) && rendered.includes(PARAGRAPH_TEXT)) break
    if (Date.now() > deadline) {
      throw new Error(`renderer panel lacks the typed text after 2s; got: ${rendered}`)
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  if (rendered.includes(`# ${HEADING_TEXT}`)) throw new Error('renderer echoes the raw `# ` marker — not a real render')
  checks.push('preview panel renders the typed doc (heading marker consumed, paragraph present)')

  // 4. (plan 043 T6) scroll sync — a long doc overflows both panes; the
  //    scroll_sync Scrollables wrap them (offset binding + onscroll
  //    message). Scroll LEFT via MCP, expect: state three-measurements
  //    update, right pane offset binding follows, CustomScrollbar data
  //    non-zero; then scroll RIGHT and expect the left to follow back
  //    (bidirectional proportional sync).
  const nonce2 = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const LONG_DOC = Array.from({ length: 30 }, (_, i) => `# scroll probe ${nonce2} h${i}\n\npara ${i} ${nonce2}`).join('\n\n')
  const typeLong = await callTool('autoui_action', { element_id: editorId, action: 'type_text', value: LONG_DOC })
  if (!/status: ok/.test(typeLong)) throw new Error(`long-doc type_text not ok: ${typeLong}`)

  // locate the two scrollables: the left one's subtree contains the
  // textarea; the other is the render pane.
  const scrollablesOf = (tree) => {
    const found = []
    const walk = (n) => {
      if (n.head.startsWith('scrollable ')) found.push(n)
      n.children.forEach(walk)
    }
    walk(tree)
    // 编辑栏 scrollable 的子树含 textarea（typed 文本不进 AURA 文本——
    // textarea value 非展示 prop，不能用内容判定）
    const left = found.find((n) => findFirst(n, (c) => c.head.startsWith('textarea '))) ?? null
    const right = found.find((n) => n !== left) ?? null
    return { left, right }
  }
  let snapS = parseAura(await callTool('autoui_snapshot', {}))
  let taS = findFirst(snapS, (n) => n.head.startsWith('textarea '))
  let { left: leftSc, right: rightSc } = scrollablesOf(snapS)
  if (!leftSc || !rightSc) throw new Error(`expected two scroll_sync scrollables (got ${leftSc ? 1 : 0}+${rightSc ? 1 : 0})`)
  const leftScId = leftSc.head.match(/#(vnode_\d+)/)[1]
  const rightScId = rightSc.head.match(/#(vnode_\d+)/)[1]

  // 冷窗暖场：iced scrollable 对窗口创建后的首次 scroll_to 恒 no-op
  //（净窗实测：首动必失、后续皆成——bounds 首操作才定型）——先发一次
  // 0 位暖场再进入断言阶段。
  await callTool('autoui_action', { element_id: leftScId, action: 'scroll', value: 0 })
  await new Promise((r) => setTimeout(r, 300))

  // 复跑复位：两栏滚回顶——活窗重复跑时上轮残留滚动位会让后续收敛断言
  // 直通（首跑即栽在 bidirectional 的 prevLeftTop 残留 600）。
  {
    const reset = await callTool('autoui_action', { element_id: leftScId, action: 'scroll', value: 0 })
    if (!/status: ok/.test(reset)) throw new Error(`reset scroll not ok: ${reset}`)
    for (const deadline = Date.now() + 3000; ; ) {
      const st = await callTool('autoui_state', { fields: ['left_top', 'right_top'] })
      const lt = Number(st.match(/left_top:\s*([\d.]+)/)?.[1] ?? NaN)
      const rt = Number(st.match(/right_top:\s*([\d.]+)/)?.[1] ?? NaN)
      if (lt < 5 && rt < 5) break
      if (Date.now() > deadline) throw new Error(`scroll reset did not settle: ${st.trim()}`)
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  // scroll LEFT to y=240 → poll: state three-measurements + right binding.
  // 冷窗补发：编辑器 cosmic-text 布局异步就绪前 scroll_to 会被钳 0 且无
  // 事件（净窗首跑实测）——收敛轮询里每 800ms 重发一次 scroll 动作。
  const scrollLeft = await callTool('autoui_action', { element_id: leftScId, action: 'scroll', value: 240 })
  if (!/status: ok/.test(scrollLeft)) throw new Error(`scroll action not ok: ${scrollLeft}`)
  let stateScroll = ''
  let lastReissue = Date.now()
  for (const deadline = Date.now() + 5000; ; ) {
    stateScroll = await callTool('autoui_state', { fields: ['left_top', 'left_height', 'left_client', 'right_top'] })
    const num = (f) => Number(stateScroll.match(new RegExp(`${f}:\\s*([\\d.]+)`))?.[1] ?? NaN)
    if (num('left_top') > 100 && num('left_height') > num('left_client') && num('right_top') > 0) break
    if (Date.now() > deadline) throw new Error(`scroll-sync state did not converge: ${stateScroll.trim()}`)
    if (Date.now() - lastReissue > 800) {
      lastReissue = Date.now()
      await callTool('autoui_action', { element_id: leftScId, action: 'scroll', value: 240 })
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  checks.push('scroll left → state three-measurements update (left_top≈240, height>client, right_top>0)')
  // CustomScrollbar data non-zero: left_height > left_client (thumb range)
  {
    const num = (f) => Number(stateScroll.match(new RegExp(`${f}:\\s*([\\d.]+)`))?.[1] ?? NaN)
    if (!(num('left_height') > num('left_client') && num('left_client') > 0)) {
      throw new Error(`CustomScrollbar data zero-range: ${stateScroll.trim()}`)
    }
  }
  checks.push('CustomScrollbar data non-zero (left_height > left_client > 0)')

  // right pane offset binding follows (snapshot Scrollable offset_y > 0)
  let rightOffsetY = 0
  for (const deadline = Date.now() + 3000; ; ) {
    const snapR = parseAura(await callTool('autoui_snapshot', {}))
    const rs = findFirst(snapR, (n) => n.head.includes(rightScId))
    // offset_y 是 scrollable 节点下的属性行（parseAura 解析为子节点）
    const propNode = rs ? findFirst(rs, (n) => n.head.startsWith('offset_y:')) : null
    const m = propNode?.head.match(/offset_y:\s*([\d.]+)/) ?? null
    rightOffsetY = m ? Number(m[1]) : 0
    if (rightOffsetY > 0) break
    if (Date.now() > deadline) throw new Error('right pane offset binding did not follow (offset_y stayed 0)')
    await new Promise((r) => setTimeout(r, 100))
  }
  checks.push(`scroll left → right pane offset binding follows (offset_y=${rightOffsetY.toFixed(1)})`)

  // scroll RIGHT to y=600 → left follows back (bidirectional)
  const prevLeftTop = Number(stateScroll.match(/left_top:\s*([\d.]+)/)?.[1] ?? 0)
  const scrollRight = await callTool('autoui_action', { element_id: rightScId, action: 'scroll', value: 600 })
  if (!/status: ok/.test(scrollRight)) throw new Error(`scroll-right action not ok: ${scrollRight}`)
  for (const deadline = Date.now() + 3000; ; ) {
    stateScroll = await callTool('autoui_state', { fields: ['left_top', 'right_top'] })
    const leftTop = Number(stateScroll.match(/left_top:\s*([\d.]+)/)?.[1] ?? NaN)
    if (leftTop > prevLeftTop + 50) break
    if (Date.now() > deadline) throw new Error(`bidirectional sync failed: left_top ${prevLeftTop} → ${leftTop}`)
    await new Promise((r) => setTimeout(r, 100))
  }
  checks.push('scroll right → left pane follows back (bidirectional proportional sync)')

  // (plan 043 T10) drag emission surface: MCP drag on CustomScrollbar's
  // mouse-area handlers (TrackDown → Move×n → ThumbUp, same message shape
  // the iced PointerArea closures produce) drives the panes — .at drag math
  // → root-state write (dual-declared fields) → write-arm scroll_to →
  // on_scroll re-report → peer ratio sync. Asserts left_top jumps and both
  // scrollables' offset_y follow.
  {
    const SEP = String.fromCharCode(31)
    const spec = ['CustomScrollbar', 'TrackDown', 'Move', 'ThumbUp', '5,60;5,160;5,260'].join(SEP)
    const dragRes = await callTool('autoui_action', { element_id: 'aura_0', action: 'drag', value: spec })
    if (!/status: ok/.test(dragRes)) throw new Error(`drag action not ok: ${dragRes}`)
    let dragState = ''
    let dragOffsets = [0, 0]
    for (const deadline = Date.now() + 4000; ; ) {
      dragState = await callTool('autoui_state', { fields: ['left_top', 'right_top'] })
      const lt = Number(dragState.match(/left_top:\s*([\d.]+)/)?.[1] ?? NaN)
      const rt = Number(dragState.match(/right_top:\s*([\d.]+)/)?.[1] ?? NaN)
      if (lt > 300 && rt > 300) {
        const snapD = parseAura(await callTool('autoui_snapshot', {}))
        dragOffsets = [leftScId, rightScId].map((id) => {
          const node = findFirst(snapD, (n) => n.head.includes(id))
          const prop = node ? findFirst(node, (n) => n.head.startsWith('offset_y:')) : null
          return Number(prop?.head.match(/offset_y:\s*([\d.]+)/)?.[1] ?? 0)
        })
        if (dragOffsets[0] > 300 && dragOffsets[1] > 300) break
      }
      if (Date.now() > deadline) {
        throw new Error(`drag emission surface did not move panes: ${dragState.trim()} offsets=${dragOffsets}`)
      }
      await new Promise((r) => setTimeout(r, 100))
    }
    checks.push('drag CustomScrollbar → left_top/right_top jump + both offset_y follow (emission surface)')
  }

  // 5. (plan 044 T6) ghost placeholder — MCP click at block coordinates inside
  //    the editor (synthetic __mcp_click: core hit_test writes focus →
  //    block_rects measures the height → ghost state direct write, same
  //    write_ghost_state as the OnEditorFocus fast-path). Asserts: the state
  //    pair (primary) + the renderer pane snapshot grows a fixed-height
  //    container node (the ghost box — height rides as a prop child in the
  //    AURA text, cf. offset_y in group 4).
  {
    // re-find the editor textarea (ids may rotate across rebuilds)
    const snapE = parseAura(await callTool('autoui_snapshot', {}))
    const taNow = findFirst(snapE, (n) => n.head.startsWith('textarea '))
    if (!taNow) throw new Error('no textarea before click — editor face missing')
    const editorIdNow = elementIdOf(taNow)

    // content-space coordinates: (40, 12) lands inside block 0 (heading)
    const click = await callTool('autoui_action', {
      element_id: editorIdNow,
      action: 'click',
      value: '40,12',
    })
    if (!/status: ok/.test(click)) throw new Error(`click action not ok: ${click}`)

    let ghostState = ''
    for (const deadline = Date.now() + 3000; ; ) {
      ghostState = await callTool('autoui_state', { fields: ['ghost_id', 'ghost_height'] })
      const gid = ghostState.match(/ghost_id:\s*"([^"]*)"/)?.[1] ?? ''
      const gh = Number(ghostState.match(/ghost_height:\s*([\d.]+)/)?.[1] ?? NaN)
      if (gid === 'block-0' && gh > 0) break
      if (Date.now() > deadline) throw new Error(`ghost state did not take the click focus: ${ghostState.trim()}`)
      await new Promise((r) => setTimeout(r, 100))
    }
    checks.push('ghost: click block coords → ghost_id="block-0" + ghost_height>0 (focus → state fast-path)')

    // snapshot: the renderer pane's hit block grows the ghost wrap — a col
    // whose FIRST child is an EMPTY container (the ghost box; this snapshot
    // format does not emit the container height prop — shape match, state
    // assertions above stay primary per the plan's T6 note). The doc at this
    // point is the group-4 LONG_DOC (rendererOf keys on the group-2 smoke
    // text), and the ghost wrap only ever appears in the renderer pane —
    // search the WHOLE tree.
    let ghostNodeSeen = false
    for (const deadline = Date.now() + 3000; ; ) {
      const snapG = parseAura(await callTool('autoui_snapshot', {}))
      const ghostNode = findFirst(
        snapG,
        (n) =>
          n.head.startsWith('col ') &&
          n.children.length === 2 &&
          n.children[0].head.startsWith('container ') &&
          n.children[0].children.length === 0 &&
          n.children[1].head.startsWith('text '),
      )
      if (ghostNode) {
        ghostNodeSeen = true
        break
      }
      if (Date.now() > deadline) break
      await new Promise((r) => setTimeout(r, 100))
    }
    if (!ghostNodeSeen) throw new Error('renderer pane lacks the ghost wrap (col[empty container, block]) in the snapshot')
    checks.push('ghost: renderer pane snapshot shows the ghost wrap (col[empty container, block])')
  }

  // 6. (plan 045 T7) table column resize — type a table doc, locate the
  //    Table vnode (its table_key prop line rides the AURA snapshot), then
  //    MCP resize_col directly on the node (synthetic __mcp_resize_col →
  //    the OnColResize intercept's write_table_width_state; the drag's
  //    coordinate hit layer is rust-unit-covered, node-direct per 待澄清②).
  //    Asserts: state.table_widths gains the table key (primary) + the
  //    snapshot's col_widths reflects the new width (state → binding →
  //    re-render round trip — column widths persist across renders).
  {
    const nonce3 = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    const TBL_DOC = `# tbl probe ${nonce3}

| A | B | C |
| --- | --- | --- |
| 1 | 2 | 3 |`
    const snapE2 = parseAura(await callTool('autoui_snapshot', {}))
    const taTbl = findFirst(snapE2, (n) => n.head.startsWith('textarea '))
    if (!taTbl) throw new Error('no textarea before table typing — editor face missing')
    const typeTbl = await callTool('autoui_action', {
      element_id: elementIdOf(taTbl),
      action: 'type_text',
      value: TBL_DOC,
    })
    if (!/status: ok/.test(typeTbl)) throw new Error(`table-doc type_text not ok: ${typeTbl}`)

    // the Table vnode (with its table_key prop line as a child node)
    let tableNode = null
    for (const deadline = Date.now() + 3000; ; ) {
      const snapT = parseAura(await callTool('autoui_snapshot', {}))
      tableNode = findFirst(
        snapT,
        (n) => n.head.startsWith('table ') && n.children.some((c) => c.head.startsWith('table_key:')),
      )
      if (tableNode) break
      if (Date.now() > deadline) throw new Error('no Table node with a table_key in the snapshot — render lag?')
      await new Promise((r) => setTimeout(r, 100))
    }
    const tableId = elementIdOf(tableNode)
    const tableKey = tableNode.children
      .find((c) => c.head.startsWith('table_key:'))
      .head.match(/table_key:\s*"([^"]+)"/)?.[1]
    if (!tableId || !tableKey) throw new Error(`table node without id/key: ${tableNode.head}`)

    const resize = await callTool('autoui_action', {
      element_id: tableId,
      action: 'resize_col',
      value: '0,180',
    })
    if (!/status: ok/.test(resize)) throw new Error(`resize_col not ok: ${resize}`)

    // primary: the state map gains this run's table key
    for (const deadline = Date.now() + 3000; ; ) {
      const st = await callTool('autoui_state', { fields: ['table_widths'] })
      if (st.includes(tableKey)) break
      if (Date.now() > deadline) throw new Error(`state.table_widths did not gain the table key: ${st.trim()}`)
      await new Promise((r) => setTimeout(r, 100))
    }
    checks.push('table resize: resize_col → state.table_widths gains the table key (fast-path write)')

    // round trip: the re-rendered table carries the new width (binding re-applies)
    let widthSeen = false
    for (const deadline = Date.now() + 3000; ; ) {
      const snapW = parseAura(await callTool('autoui_snapshot', {}))
      const tn = findFirst(
        snapW,
        (n) => n.head.startsWith('table ') && n.children.some((c) => c.head.startsWith('col_widths:')),
      )
      const propLine = tn?.children.find((c) => c.head.startsWith('col_widths:'))?.head ?? ''
      const first = Number(propLine.match(/col_widths:\s*\[([\d.,\s]*)\]/)?.[1]?.split(',')[0] ?? NaN)
      if (first >= 179.5 && first <= 180.5) {
        widthSeen = true
        break
      }
      if (Date.now() > deadline) break
      await new Promise((r) => setTimeout(r, 100))
    }
    if (!widthSeen) throw new Error('snapshot col_widths did not reflect the resized width (state → binding round trip broken?)')
    checks.push('table resize: snapshot col_widths reflects the new width (state → binding round trip)')
  }

  return checks
}

async function main() {
  await waitForServer(30000)
  // the jade README:127 silent-exit pitfall bar: retry the whole run once
  let lastErr
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const checks = await runOnce()
      console.log(`vm-smoke: PASS (port ${port})`)
      for (const c of checks) console.log(`  ✓ ${c}`)
      process.exitCode = 0
      return
    } catch (err) {
      lastErr = err
      if (attempt === 1) console.error(`vm-smoke: first attempt failed (${err.message}) — retrying once (jade README:127 bar)`)
    }
  }
  console.error(`vm-smoke: FAIL — ${lastErr.message}`)
  process.exitCode = 1
}

main().catch((err) => {
  console.error(`vm-smoke: FAIL — ${err.message}`)
  process.exitCode = 1
})
