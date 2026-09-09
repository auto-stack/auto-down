// vm-061-probe.mjs — PLAN-061 T-04: VM 轨点击落点三语义核对（MCP 9359，
// vm-060-probe.mjs 模式）。断言组：
//   A. 文本叶块（Heading/段落含行内标记）首点 caret = 点击处字形：
//      y 地图自动发现行带 → x 两点位单调且中线非末尾（A1/A2）。
//   B. 容器子叶归属：无序/有序列表第 2 项、引用、Callout 正文、Details
//      正文各有可点击带使命中行获得哨兵（A3..A7；Details 编辑臂恒展开）。
//   C. 表格 cell：geometry 快照定位非首行 cell → 哨兵落该行 + focus=表格块
//      （B1）；fence 代码行首点字形级（B2）+ 行尾 Down 无幻影新行（B3）。
// 方法：MCP 无 caret 直读口 → 每采样点 type_text 归一基线 → __mcp_click
// 首击 → 独占大写哨兵（正文无该大写）→ diff state.content 定位落点行/偏移。
// 前置：VM 以可见窗口运行（最小化窗口布局失效，实测教训——截图工具
// "window size is zero" 即此态）；本探针启动时先验截图可用。
// 用法（两个终端）：
//   AUTOUI_MCP_PORT=9359 <auto-lang>/target/debug/auto.exe run -r vm  （demo/auto 下）
//   node vm-061-probe.mjs
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT: ${msg}`)
  console.log(`  ok ${msg}`)
}

let EDITOR_ID = null
async function typeText(doc) {
  const out = await callTool('autoui_action', { element_id: EDITOR_ID, action: 'type_text', value: doc })
  if (!/status: ok/.test(out)) throw new Error(`type_text not ok: ${out}`)
}
async function clickAt(x, y) {
  const out = await callTool('autoui_action', { element_id: EDITOR_ID, action: 'click', value: `${x},${y}` })
  if (!/status: ok/.test(out)) throw new Error(`click not ok: ${out}`)
}
async function pressKey(k) {
  const out = await callTool('autoui_action', { element_id: EDITOR_ID, action: 'key_press', value: k })
  if (!/status: ok/.test(out)) throw new Error(`key_press ${k} not ok: ${out}`)
}
async function editorState() {
  return JSON.parse(await callTool('autoui_editor_state', { element_id: EDITOR_ID }))
}
async function contentRaw() {
  const st = await callTool('autoui_state', { fields: ['content'] })
  const raw = st.match(/content:\s*"((?:[^"\\]|\\.)*)"/)?.[1]
  return raw != null ? raw.replace(/\\n/g, '\n') : null
}
async function screenshotPath() {
  const s = await callTool('autoui_screenshot', {})
  return s.match(/[A-Za-z]:[^\s"']+\.png/)?.[0]?.replace(/^\\\\\?\\/, '') ?? null
}
async function saveShot(file) {
  const p = await screenshotPath()
  if (!p) throw new Error('screenshot unavailable — VM 窗口须可见（非最小化）')
  copyFileSync(p, file)
}

let BASE = null
let BASELINES = []
async function establishBaseline(doc) {
  const before = await contentRaw()
  await typeText(doc)
  // 先等内容离开旧值（防陈旧 state 桥"连续相等"误判稳定），再等稳定。
  let prev = null
  for (const deadline = Date.now() + 5000; ;) {
    const c = await contentRaw()
    if (c != null && c !== before && c === prev) { BASE = c; break }
    if (Date.now() > deadline) throw new Error(`baseline never settled: ${JSON.stringify(c?.slice(0, 160))}`)
    prev = c
    await sleep(150)
  }
  if (!BASE.startsWith(doc.split('\n')[0])) throw new Error(`baseline sanity fail: ${JSON.stringify(BASE.slice(0, 80))}`)
  BASELINES = BASE.split('\n')
}
async function normalize(doc) {
  await typeText(doc)
  for (const deadline = Date.now() + 3000; ;) {
    if ((await contentRaw()) === BASE) return
    if (Date.now() > deadline) throw new Error('normalize fail（emit 形态漂移？）')
    await sleep(80)
  }
}
/** 首击采样：归一 → click(x,y) → 哨兵 ch → {lineIdx, line(无哨兵), off}。 */
async function sample(doc, x, y, ch, { shotBeforeSentinel = null } = {}) {
  await normalize(doc)
  await clickAt(x, y)
  await sleep(260)
  if (shotBeforeSentinel) {
    await saveShot(shotBeforeSentinel)
    console.log(`  ok shot ${shotBeforeSentinel}`)
  }
  await pressKey('c:' + ch)
  await sleep(320)
  const c = await contentRaw()
  if (!c || !c.includes(ch)) return null
  const lines = c.split('\n')
  // 聚焦块编辑面会使 emit 增行（ghost 移位）——按行内容对齐，不按行号。
  for (let i = 0; i < lines.length; i++) {
    const k = lines[i].indexOf(ch)
    if (k >= 0 && !(BASELINES[i] ?? '').includes(ch)) {
      return { lineIdx: i, line: lines[i].replace(ch, ''), off: k }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
await rpc('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'vm-061-probe', version: '1.0' },
})
await rpc('notifications/initialized', {})
await sleep(500)

// --- 0. 前置：窗口可见（截图可用）+ 编辑器定位 ---
const snap0 = await callTool('autoui_snapshot', {})
assert(/Heading One|heading/i.test(snap0), 'startup snapshot has the seed heading')
const taLine = snap0.split('\n').find((l) => l.includes('textarea '))
assert(!!taLine, 'editor textarea face present')
EDITOR_ID = taLine.match(/#(vnode_\d+)/)?.[1]
assert(!!EDITOR_ID, `editor element id resolved (${EDITOR_ID})`)
assert(!!(await screenshotPath()), 'window visible: screenshot available（非最小化布局有效）')

const DOC1 = [
  '# Heading One', '',
  'Paragraph alpha with several words here', '',
  '- Bullet item one', '- Bullet item two', '',
  '1. Ordered item one', '2. Ordered item two', '',
  '> Quote line alpha', '',
  '$callout(type: "info", title: "Info") {', 'Callout body line', '}', '',
  '$details(summary: "Click to expand") {', 'Details body line', '}',
].join('\n')

// --- 1. DOC1 y 地图（x=80，步 6；哨兵 D）——行带自动发现 ---
console.log('\n== A. 叶块 + 容器（y 地图 → 行带）==')
await establishBaseline(DOC1)
const bands = new Map() // 行内容(无哨兵) → {y0,y1,offs:[{x,y,off}]}
for (let y = 36; y <= 366; y += 6) {
  const s = await sample(DOC1, 80, y, 'W')
  if (!s) continue
  if (!bands.has(s.line)) bands.set(s.line, { y0: y, y1: y, offs: [] })
  const b = bands.get(s.line)
  b.y1 = y
  b.offs.push({ x: 80, y, off: s.off })
}
for (const [k, v] of bands) console.log(`  band "${k.slice(0, 40)}" y=${v.y0}..${v.y1} offs=[${v.offs.map((o) => o.off).join(',')}]`)

const bandOf = (sub) => [...bands.entries()].find(([k]) => k.includes(sub))?.[1]

// A1 标题：带存在且 x=80 落点非行尾（"# Heading One" 13 字，行尾=13）
{
  const b = bandOf('Heading One')
  assert(!!b, 'A1 heading band found')
  assert(b.offs.some((o) => o.off > 0 && o.off < 13), `A1 heading mid-line hit (offs=[${b.offs.map((o) => o.off).join(',')}], 行尾=13)`)
}
// A2 段落 x 精度：x=40 与 x=120 两点，off 单调且均中线
{
  const b = bandOf('Paragraph alpha')
  assert(!!b, 'A2 paragraph band found')
  const midY = Math.round((b.y0 + b.y1) / 2)
  const s1 = await sample(DOC1, 40, midY, 'Z')
  const s2 = await sample(DOC1, 120, midY, 'X')
  assert(!!s1 && !!s2, `A2 x=40→off${s1?.off} / x=120→off${s2?.off}（行 "${s1?.line.slice(0, 24)}…" 行长 ${s1?.line.length}）`)
  assert(s1.off > 0 && s1.off < s1.line.length - 4, 'A2 x=40 落行首区（非末尾钳制）')
  assert(s2.off > s1.off && s2.off < s2.line.length - 4, 'A2 x=120 单调右移且仍中线')
  await normalize(DOC1)
  await clickAt(120, midY)
  await sleep(300)
  await saveShot('vm-061-para-caret.png')
  console.log('  ok shot vm-061-para-caret.png（caret 可视于点击处字形）')
}
// A3..A7 容器子叶归属
for (const [id, sub] of [
  ['A3 无序列表第2项', 'Bullet item two'],
  ['A4 有序列表第2项', 'Ordered item two'],
  ['A5 引用行（中线）', 'Quote line alpha'],
  ['A6 Callout 正文', 'Callout body line'],
  ['A7 Details 正文（编辑臂恒展开）', 'Details body line'],
]) {
  const b = bandOf(sub)
  assert(!!b, `${id} band found y=${b?.y0}..${b?.y1}`)
  if (id.startsWith('A5')) assert(b.offs.some((o) => o.off < 15), `A5 引用中线命中 offs=[${b.offs.map((o) => o.off).join(',')}]（行尾=17）`)
}

// --- 2. DOC2 表格 + fence ---
console.log('\n== C. 表格 cell + fence ==')
const DOC2 = [
  '# Anchor Heading', '',
  '| Name | Value |', '| --- | --- |', '| Foo | 1 |', '| Barbaz | 2 |', '',
  '```javascript', "const foo = 'bar'", 'console.log(foo)', '```',
].join('\n')
await establishBaseline(DOC2)
const bands2 = new Map()
for (let y = 36; y <= 300; y += 6) {
  const s = await sample(DOC2, 80, y, 'W')
  if (!s) continue
  if (!bands2.has(s.line)) bands2.set(s.line, { y0: y, y1: y, offs: [] })
  const b = bands2.get(s.line)
  b.y1 = y
  b.offs.push({ x: 80, y, off: s.off })
}
for (const [k, v] of bands2) console.log(`  band "${k.slice(0, 40)}" y=${v.y0}..${v.y1} offs=[${v.offs.map((o) => o.off).join(',')}]`)
const band2Of = (sub) => [...bands2.entries()].find(([k]) => k.includes(sub))?.[1]

// B1 表格 cell（geometry 快照同点击空间）
{
  const tb = (await editorState()).tables?.[0]
  assert(!!tb, `table geometry snapshot present（y0=${tb?.y0?.toFixed(0)} y1=${tb?.y1?.toFixed(0)}）`)
  const rowH = (tb.y1 - tb.y0) / 3
  const barY = Math.round(tb.y0 + rowH * 2.5) // 第 3 行（header/Foo/Barbaz）中点
  const s1 = await sample(DOC2, Math.round(tb.x0 + 12), barY, 'S')
  const s2 = await sample(DOC2, Math.round(tb.x0 + tb.widths[0] * 0.45), barY, 'T')
  assert(!!s1 && /Barbaz/.test(s1.line), `B1 cell(+12px) → "${s1?.line}" off=${s1?.off}（focus=表格块，cell 文本首区）`)
  assert(!!s2 && /Barbaz/.test(s2.line) && s2.off >= s1.off, `B1 cell(+45%宽) → off=${s2?.off} 单调不左移`)
  await normalize(DOC2)
  await clickAt(Math.round(tb.x0 + 12), barY)
  await sleep(300)
  await saveShot('vm-061-table-cell.png')
  console.log('  ok shot vm-061-table-cell.png')
}
// B2 fence 代码行字形级 + B3 幻影尾行
{
  const b = band2Of('console.log')
  assert(!!b, `B2 fence console.log band found y=${b?.y0}..${b?.y1}`)
  assert(b.offs.some((o) => o.off > 2 && o.off < 14), `B2 fence 首点中线命中 offs=[${b.offs.map((o) => o.off).join(',')}]（行尾=16）`)
  // B3: 钳行尾 → Down → 哨兵 J 并入行尾 = 无幻影尾行
  const midY = Math.round((b.y0 + b.y1) / 2)
  await normalize(DOC2)
  await clickAt(260, midY)
  await sleep(260)
  await pressKey('down')
  await sleep(140)
  await pressKey('c:J')
  await sleep(320)
  const c = await contentRaw()
  assert(!/console\.log\(foo\)\nJ/.test(c ?? ''), `B3 无幻影尾行（行尾 Down 后哨兵并入 "console.log(foo)J"）`)
  assert(/console\.log\(foo\)J/.test(c ?? ''), 'B3 哨兵确实落在行尾（判别有效）')
  await normalize(DOC2)
  await clickAt(110, midY)
  await sleep(300)
  await saveShot('vm-061-fence-caret.png')
  console.log('  ok shot vm-061-fence-caret.png')
}

console.log('\nvm-061-probe: ALL PASS（A1..A7 + B1..B3）')
