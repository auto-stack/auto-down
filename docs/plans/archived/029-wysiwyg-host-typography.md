---
plan_id: PLAN-029
status: archived
feature_name: WYSIWYG 块级排版——BlockHost 语义化宿主标签（Heading→h1..h6 / Paragraph→p）
author: [zhaopuming]
created_at: 2026-08-31
updated_at: 2026-08-31

# /auto-plan:review 填定（merge 时沉淀）
supersedes_spec_components: []
new_spec_components:
  - ".autoos/specs.json 六节 P029-1..6: WYSIWYG 块级排版——BlockHost 语义化宿主（Heading→h1..h6.heading-node heading-N / Paragraph→p.paragraph-node / 其余 div 不变；host-face.ts 纯函数（level 1-6 钳制）+ BlockHost <component :is> 参数化根 + EngineEditor.assembleView 传 level；**v-html 须改 :innerHTML prop**——Vue 3.5.35 compiler-ssr 对 <component :is> 上 v-html 静默丢弃（编译产物验证：无 innerHTML prop 无 directive，SSR 渲染空元素），innerHTML prop 在 CSR patchProp / SSR ssrRenderElement 双路径命中；**kind/level 入宿主 vnode key**——<component :is> 原地换元素不重跑 onMounted，输入规则翻转（# ）后焦点丢失键入全吞（旧 div 宿主 tag 不变故无此问题），翻转走 historyEpoch 同机制重挂载+末位重聚焦（输入规则整块精确匹配 text===marker 保证翻转时光标必在块尾）；CSS 卫生一条 .autodown-editor-content .autodown-block-host{outline:none}；e2e wysiwyg-typography 5 用例——**parity 基准修正**：聚焦宿主是 content 根直接子元素（无 node-slot），滚动同步注入的 [data-block-id] margin 规则宿主直接命中、预览态由 slot 承载，故 margin 断言为宿主↔预览 slot（同一节奏位）、字体三指标（size/weight/line-height）对同栏预览元素+右栏流式元素双比；执行期两潜伏 bug 修复：① 输入规则翻转丢焦点（engine，见 key 条）；② useSyncedScroll 首块对齐视口坐标竞态（demo——measure() 落在两栏滚动位不同瞬间会把瞬态差烤进注入 margin（实测 -951px 右栏拉飞），master 侥幸存活靠 div 宿主与预览 16px 高度差触发纠正性 ResizeObserver 二次测量，029 令宿主与预览逐像素一致后暴露；修复=容器相对坐标 rect.top−containerRect.top+scrollTop 滚动不变量）；jade editor-index 截图基线更新（旧'首页'带黑框基础字号 div 宿主→新无框大号粗体 h1，actual/expected 双图视觉确认）；jade 回归 21/23：挂的 flashcards 两例经主检出独立复跑（含复审时刻二次复核，签名一致）确认 master 既有问题非本计划回归"
touched_goals:
  - ".autoos/specs.json P024-2: 行内 WYSIWYG 目标——029 落地块级排版层（聚焦宿主语义化 h1-h6/p，与 view 同 tag 同 class 同 CSS 命中，切换零跳动），WYSIWYG 由行内补齐到块级，复刻旧 tiptap 版无边框同字号体验"

current_step: 10
total_steps: 10
---

# [PLAN-029] WYSIWYG 块级排版——BlockHost 语义化宿主标签

## 变更摘要

聚焦文本块（H1-H6、Paragraph）的编辑宿主从零样式裸 `div.autodown-block-host`
换成**语义化真实标签**：Heading 按 `level` attr 渲染 `h1`-`h6` 并携带 view 同款
class（`heading-node heading-N`），Paragraph 渲染 `p.paragraph-node`，均带
`dir="auto"`。现有 CSS（`.autodown-editor-content h1 { 1.58rem }` /
`p { margin: .5rem 0 }` 等，值与旧 tiptap 版逐字一致）直接命中宿主，实现
view↔edit 切换**零布局跳动**的 WYSIWYG 就地编辑——复刻旧
auto-forge（纯 Vue + tiptap）版的无边框同字号体验。

**不做的**：view/stream 渲染管线（renderNodes/builtin-panels/StreamingRenderer）
零改动；行内 marks 的 WYSIWYG 已由 plan 024/028 完成（`spansToHtml` 挂载 +
blur walk 回写），本计划不触碰。

## 目标

1. **宿主语义化**：BlockHost 单组件（不按类型分拆）按 `(blockKind, level)`
   解析渲染标签——Heading→`h${clamp(level,1,6)}`、Paragraph→`p`、其余可编辑叶
   （WikilinkBlock/Math/Mermaid 源宿主）v1 维持 `div`。
2. **排版 parity（可断言）**：聚焦宿主的 computed font-size / font-weight /
   margin / line-height 与 view/stream 侧同型元素完全一致；聚焦切换零布局跳动
   （相邻块几何不动）。
3. **契约不动**：EDITOR-CONTRACT 冻结面（根类名、`data-block-id`、
   `[contenteditable]` 宿主存在性、`getBlockMap`）零变化；`.autodown-block-host`
   class 与 `data-node-type` 保留，既有 e2e 选择器全部有效。

## 架构方案

```
EngineEditor.assembleView（isEditableLeaf 分支）
└─ BlockHost props 增 level?: number（仅 Heading：attrGetInt(node.attrs,'level',1)）
BlockHost.vue（手写 SFC，非 gen 部署件）
└─ 根节点 <div> → <component :is="hostTag">
   ├─ hostFaceFor(kind, level)（新纯函数，src/editor/engine/host-face.ts）
   │    Heading  → { tag:'h1..h6', cls:'heading-node heading-N' }
   │    Paragraph→ { tag:'p',      cls:'paragraph-node' }
   │    其他     → { tag:'div',    cls:'' }（现状）
   ├─ :class="['autodown-block-host', face.cls]"、dir="auto"
   └─ contenteditable / v-html / 全部 DOM 事件 / data-* 原样
CSS：零新增预期——宿主落在 .autodown-editor-content 下同 DOM 路径，
   既有 `.autodown-editor-content h1..h3 / p` 规则自动命中（唯一可选微调：
   .autodown-block-host { outline:none } 聚焦卫生）
```

**为什么是"共享单组件 + 参数化标签"而不是每类型独立组件**：模型侧 heading 是
同一个 `BlockType.Heading`（level 仅是 attr），旧 tiptap 版同样是单一 Heading
扩展（`levels:[1,2,3]`）按 level 属性渲染 `h{level}`——复刻保持同构，避免六份
拷贝。

**兼容性论证（关键链路已逐一核对）**：

- **blur walk**：`domRootToSpans` 会把根元素转成 `{tag:'H1'}` 走
  `markForTag`——H1/P 不在 mark 表返回 null（rich-html.ts:55-62 已核对），
  结构回写不受根标签影响。
- **光标/选区**：`caretOffset`、`selection-map`（blockRangeToDomRange）、
  `coordsAtPos`、`previousElementSibling.dataset.blockId` 均与宿主标签无关。
- **容器内路径**：编辑装配为 `li > div.markdown-renderer > host`，与 view 的
  `li > div.markdown-renderer > p.paragraph-node` 同路径——CSS 命中一致。
- **content model**：`h1`-`h6`/`p` 仅允许 phrasing content，`spansToHtml` 产出
  的 strong/em/u/del/code/a 全部合规。
- **UA 样式覆盖完备**：`.autodown-editor-content h1..h3 / p` 对 font-size/
  font-weight/margin/line-height/color 全量覆盖，无残缺；demo 与 jade 的 CSS
  两份均如此（jade fork 87-103 行已核对）。
- **historyEpoch 重挂载**：undo 改变块 kind/level 后宿主按新 attrs 重新解析
  标签（key 含 epoch，机制既有）。

## 技术栈

Vue 3 SFC（BlockHost.vue / EngineEditor.vue 为手写源——gen.mjs 的
DEPLOY_COMPONENTS 不含二者，已核实）、Vitest（engine 单测）、Playwright
（demo e2e / jade e2e）。无新依赖。

## 需求分析与背景调查

- **旧实现定位**：`D:\autostack\auto-forge\frontend\src\components\editors\autodown\`
  （纯 Vue + tiptap）。`extensions/index.ts:28`
  `StarterKit.configure({ heading:{ levels:[1,2,3] } })`——heading 是
  contenteditable 里的真实 `<h1>` 元素，**WYSIWYG 是模型天然属性**，无 per-block
  编辑组件、无模式切换；CSS 单通道
  `.autodown-editor-content h1 { font-size:1.58rem }`（autodown-editor.css:87-105）。
- **现状差距**：`EngineEditor.vue:414-420` 聚焦叶块挂 `BlockHost`（裸
  `div.autodown-block-host[contenteditable]`），该 class 在引擎 CSS 中**零样式**
  （无任何选择符），聚焦 H1 时大 `<h1>` 预览被换成基础字号 0.95rem 的无样式
  div——即用户观察到的"单行 input"。引擎 CSS 106-125 行的 h1/h2/h3 排版值与
  旧版逐字一致（1.58/1.33/1.18rem），view 侧已复刻，只差宿主接上。
- **行内 WYSIWYG 已完成**（spec P024-2/P028-2）：挂载 `spansToHtml` 渲染
  strong/em/u/del/code/a 真实元素，blur walk 回写 spans——heading 与 paragraph
  一视同仁，本计划零触碰。
- **spec 关联**：P024-3（富宿主架构）为直接前置，本计划补其块级排版层；
  P023-3（BlockComponent 三模式）的 view/stream 契约不受影响。加性变更，
  预计不 supersede 任何 spec 组件。
- **测试现状**：`demo/e2e/check-heading.spec.ts` 是 always-pass 诊断脚本
  （量左右两侧 H1 几何仅 console.log）——本计划将其断言职责收入新 e2e；
  `screenshot.spec.ts` 同为落盘无基线对比；既有 e2e 全部以
  `.autodown-block-host` class 定位（tag 无关）。

## 详细设计

### 1. `src/editor/engine/host-face.ts`（新）

```ts
export interface HostFace { tag: string; cls: string }
/** 聚焦编辑宿主的语义化外观：与 builtin-panels 的 view 渲染
 *  （h${level} + heading-node heading-${level} / p + paragraph-node）
 *  保持同 tag 同 class——parity 由 e2e computed-style 断言钉死。 */
export function hostFaceFor(kind: string, level?: number): HostFace {
  if (kind === 'Heading') {
    const l = Math.min(6, Math.max(1, level ?? 1))
    return { tag: `h${l}`, cls: `heading-node heading-${l}` }
  }
  if (kind === 'Paragraph') return { tag: 'p', cls: 'paragraph-node' }
  return { tag: 'div', cls: '' }
}
```

单测：Heading level 1/3/6/越界钳制、Paragraph、其他 kind 回退 div。

### 2. `BlockHost.vue` 模板根节点

```vue
<component
  :is="hostTag"
  ref="el"
  :class="['autodown-block-host', face.cls]"
  :data-block-id="controller.id"
  :data-node-type="blockKind"
  dir="auto"
  contenteditable="true"
  spellcheck="false"
  ... （事件与 v-html 原样）
```

`props` 增 `level?: number`；`hostTag`/`face` 为 computed（非响应式模型下仅
挂载期求值一次，与 initialHtml 同语义）。`v-html` 在 `<component :is="'h1'">`
上合法（渲染为原生元素）。

### 3. `EngineEditor.vue` 装配传参

`assembleView` 的 `isEditableLeaf` 分支：

```ts
props: {
  controller, blockKind: BlockType[node.kind],
  level: node.kind === BlockType.Heading ? attrGetInt(node.attrs, 'level', 1) : undefined,
  key: `host:${node.id}:${historyEpoch.value}`,
}
```

（`attrGetInt` 已在 import 列表中。）

### 4. CSS（预期零新增，允许一条卫生规则）

`packages/engine/src/editor/styles/autodown-editor.css` 追加：

```css
.autodown-block-host { outline: none; }
```

其余排版全部依赖既有 `.autodown-editor-content h1..h3 / p` 规则命中。**不**给
空宿主加 `:empty::before`/min-height——会污染 `hostText()` 采集（零宽字符/
几何补偿均破坏 parity），空块光标可见性与现状（空 div 宿主）等价，由 e2e 钉。

### 5. 范围外（明确不做）

- WikilinkBlock / Math / Mermaid 源宿主的语义化（其 view 是 node-view 面板，
  WYSIWYG 语义不同，单列）。
- H4-H6 的 CSS 补齐：宿主照 `h{level}` 渲染，样式继承现状（view 同样只到
  h3——与 view 一致即达标）。
- 列表/引用内宿主：机制自动覆盖（同一 BlockHost、同 DOM 路径），仅回归不新做。

## 测试设计

1. **单测（engine vitest）**：`src/editor/__tests__/host-face.test.ts`——
   纯函数全分支；`blockhost-rich.test.ts` 既有 SSR 用例回归（根标签变化不影响
   其 strong/em/a 断言）。
2. **新 e2e（demo）`e2e/wysiwyg-typography.spec.ts`**：
   - 聚焦 H1：宿主 `tagName==='H1'`、class 含 `heading-node heading-1`、
     computed font-size/font-weight/margin/line-height 与右栏流式
     `h1.heading-node` **逐一相等**（parity 断言）；
   - 聚焦段落：`tagName==='P'`、class 含 `paragraph-node`、margin parity；
   - **零跳动**：聚焦前后下一兄弟块 `getBoundingClientRect().top` 不变
     （容差 1px）；
   - heading 内行内 mark：H1 中加粗段落在宿主内为 `<strong>`，blur 后序列化
     `# ... **...**` roundtrip；
   - 输入规则联动：空段落键入 `# ` 转 heading 后继续键入生效（光标可见性
     行为钉死）。
3. **回归门**：engine vitest 全量 + `vue-tsc -b` + build（含
   assert-editor-gen 等三断言）；demo e2e 全套（inline-marks /
   container-editing / host-protocol / undo / slash-position / check-padding /
   scroll-sync）；jade e2e（jade CSS fork 已有同值 h1/h2 段，dev 直连 src）。

## 验收标准

1. 聚焦 H1/H2/H3/段落：无边框、无 input，字号/字重/边距与 view 模式 computed
   style 完全一致（e2e parity 断言绿）。
2. 聚焦切换零布局跳动（相邻块几何不变断言绿）。
3. view/stream/preview 的 DOM 与序列化行为零变化（既有单测+e2e 全绿）。
4. EDITOR-CONTRACT 冻结面零变化（`[contenteditable]` 宿主、`data-block-id`、
   根类名、`getBlockMap`）。
5. 全量门：engine vitest、vue-tsc、engine build、demo e2e 全套、jade e2e 全绿。

## 执行步骤

- [x] **T1** 新建 `packages/engine/src/editor/engine/host-face.ts`（上述纯函数）
  + `packages/engine/src/editor/__tests__/host-face.test.ts`（全分支）。
  验证：`pnpm --filter @autodown/engine test -- host-face`。
  [✅ 已完成] 先红（模块不存在导入失败）后绿：host-face 4/4 passed（Heading 1/3/6 映射、越界/缺省钳制、Paragraph、其他 kind 回退 div）。
- [x] **T2** `packages/engine/src/editor/components/BlockHost.vue`：props 增
  `level?: number`，根节点改 `<component :is>` + `:class` 合并 + `dir="auto"`，
  import `hostFaceFor`。验证：`pnpm --filter @autodown/engine test`（blockhost-rich
  SSR 用例回归）。
  [✅ 已完成] 根节点 `<component :is="hostTag">` + `:class="['autodown-block-host', face.cls]"` + `dir="auto"` + props `level?`；**偏差**：`v-html` 改用 `:innerHTML` prop——Vue 3.5.35 compiler-ssr 在 `<component :is>` 上静默丢弃 v-html 指令（编译产物验证：无 innerHTML prop、无 directive，SSR 渲染空元素，3 用例红），`:innerHTML` prop 在 CSR patchProp / SSR ssrRenderElement 两路径均命中（语义等价），改后 engine vitest 455/455 全绿。
- [x] **T3** `packages/engine/src/editor/components/EngineEditor.vue`：
  `assembleView` isEditableLeaf 分支传 `level`。验证：`pnpm --filter
  @autodown/engine test`（focus-path 等装配用例回归）。
  [✅ 已完成] isEditableLeaf 分支 props 增 `level: node.kind === BlockType.Heading ? attrGetInt(node.attrs, 'level', 1) : undefined`（attrGetInt 原已在 import 列表）；engine vitest 455/455 全绿。
- [x] **T4** CSS 卫生规则一条（`.autodown-block-host { outline: none }`）加到
  `packages/engine/src/editor/styles/autodown-editor.css`。验证：目视 demo
  dev（localhost:5173）聚焦无 outline。
  [✅ 已完成] 追加 `.autodown-editor-content .autodown-block-host { outline: none }`（带聚焦卫生注释）；程序化验证已并入 T5 e2e（computed outlineStyle === 'none' 断言绿），目视并入 T10。
- [x] **T5** 新建 `autodown/demo/e2e/wysiwyg-typography.spec.ts`（测试设计 §2
  全部断言，先红后绿：T2/T3 落地前 tagName 断言应失败）。验证：
  `cd autodown/demo && npx playwright test wysiwyg-typography`。
  [✅ 已完成] 5 用例全绿（E2E_PORT=5199）：H1 语义 tag+class+dir+outline+字体三指标同栏/右栏 parity+零跳动；段落 p.paragraph-node+margin 对 slot parity+零跳动；H2/H3 level face；H1 内 strong roundtrip（`# ... **...**`）；`# ` 输入规则翻转+续打+refocus 为 H1。**执行中发现并修复两点**：(a) parity 基准修正——聚焦宿主是 content 根直接子元素（无 node-slot），滚动同步注入的逐块 `[data-block-id]` margin 规则宿主直接命中、预览态由 slot 承载，故 margin 断言为 宿主↔预览 slot（同一节奏位），字体三指标对同栏预览元素与右栏流式元素双比；(b) **kind/level 翻转重挂载 bug**——`<component :is>` 原地换元素不重跑 onMounted，输入规则翻转（`# `）后焦点丢失、后续键入全吞（旧 div 宿主无此问题）；修复：宿主 vnode key 纳入 kind+level（与 historyEpoch 同机制，翻转走重挂载+末位重聚焦；输入规则为整块精确匹配，翻转时光标必在块尾）。e2e 运行注意：5173 若被既有 dev server 占用须 E2E_PORT 起独立服务。
- [x] **T6** demo e2e 全量回归。验证：`cd autodown/demo && npx playwright test`。
  [✅ 已完成] **31/31 全绿**（既有 26 + 新增 5；E2E_PORT=5199 独立服务）。过程中揪出并修复 demo 潜伏竞态：useSyncedScroll.applyBlockSpacers 首块对齐用视口坐标，measure 落在两栏滚动位不同瞬间（focus 挂宿主紧跟 scrollIntoViewIfNeeded）时注入垃圾 margin（实测 -951px）；主检侥幸存活是因 div 宿主与预览 p 高度差 ~16px 触发 ResizeObserver 纠正性二次测量，而本计划令宿主与预览几何完全一致后该二次测量不再触发。修复：首块 offset 改为容器相对坐标（rect.top − containerRect.top + scrollTop，滚动不变量），修复后注入值 0.8125px 与主检健康值一致。
- [x] **T7** engine 全量门：`pnpm --filter @autodown/engine test && pnpm
  --filter @autodown/engine build`（含 vue-tsc + 三断言脚本）。
  [✅ 已完成] vitest 455/455；build 全绿（vue-tsc -b + vite build + assert-parser-pure / assert-no-tiptap / assert-editor-gen 三断言 ok + dist stamp）。
- [x] **T8** jade 侧回归：`cd jade-garden/front && pnpm test:e2e`（CSS fork 的
  h1/h2 段命中确认；失败则对照 engine CSS 补 jade fork 对应段）。
  [✅ 已完成] 21/23 过。CSS fork 确认：`src/assets/autodown-editor.css` 的 h1-h3 段（1.58/1.33/1.18rem、margin 1.25/0.5rem）与引擎同值，宿主自动命中，无需补段。`08-screenshots editor area` 基线差异经 actual/expected 双图视觉比对确认为**本计划预期视觉改进**：旧基线"首页"是带黑框的基础字号 div 宿主（计划要修的"单行 input"问题），新图为无框大号粗体 h1——基线已更新。**挂掉的 2 例（06-palette/12-flashcards）在主检出 master 上同样挂（自带 exe+fixture 独立复跑验证），属既有问题、与本计划无关**，已记入待澄清。另记：jade e2e 在纯新检出不可跑——`tmp/wiki-demo` 的 journals/、Cards Probe.ad、srs-matrix.edn 未入库（主检出本地未跟踪文件），执行时已从主检出补齐至工作树。
- [x] **T9** 文档落账：`packages/engine/EDITOR-CONTRACT.md` 宿主行补注
  "聚焦宿主为语义化标签（h1-h6/p/div），class 与 data 面不变"（非冻结面变更，
  说明性）。
  [✅ 已完成] `[contenteditable]` 行用途列更新为"编辑宿主（聚焦宿主为语义化标签——Heading→h1-h6、Paragraph→p、其余 div；class 与 data 面不变，plan 029）"，并顺带修正了该行陈旧的"现 ProseMirror"表述。
- [x] **T10** demo 双形态手检：view→聚焦→编辑→失焦→undo/redo 全链在
  localhost:5173 走一遍（H1/H2/H3/段落/列表项内段落各一），确认体验与旧
  tiptap 版一致（截图留档 `demo/e2e/screenshots/wysiwyg-host.png` 可选）。
  [✅ 已完成] 全链驱动验证（worktree dev server 5199）：H1 聚焦宿主=H1、键入 " EDITED"、失焦右栏序列化 "Heading One EDITED"、Ctrl+Z 撤销回 "Heading One"、Ctrl+Y 重做到 "EDITED"；H2/H3 宿主=H2/H3（编辑+撤销）；段落宿主=P；列表项内段落宿主=P、右栏 "Bullet item one ok"。截图三张留档：`e2e/screenshots/wysiwyg-host-view.png`（view 态）、`wysiwyg-host-h1-editing.png`（H1 编辑中，视觉确认：大号粗体无框、与右栏同排版）、`wysiwyg-host.png`（列表项编辑中）。体验与旧 tiptap 版一致（无边框同字号就地编辑）。

## 复审记录

**复审人**：zcode（/auto-plan:review）· **时间**：2026-08-31 · **结论**：✅ **通过 → reviewed**

**复审方法**：工作树 `.worktrees/plan-029-dev`（分支 7 提交，`git diff master..HEAD --stat` 13 文件）逐文件核对 + 全量门重跑 + 遗漏/延后/workaround 显式狩猎。代码差异与计划陈述完全一致；冻结面 grep（`data-block-id`/`contenteditable`/根类名/`getBlockMap` 的删除行）为空。

**验收标准逐条**：

1. **聚焦排版 parity — PASS**。wysiwyg-typography e2e #1-3（31/31 套件内）绿：宿主 tagName=H1/H2/H3/P、class 含 heading-node heading-N / paragraph-node、dir=auto、computed outlineStyle=none（无边框无 input）；font-size/font-weight/line-height 与同栏预览元素及右栏流式元素逐一相等。**偏差（已记录于 T5 证据）**：margin parity 断言基准由计划原文"右栏流式"修正为"预览 slot"——实测证据（CSSOM 命中规则枚举）：聚焦宿主是 `.autodown-editor-content` 直接子元素直接命中滚动同步注入的 `[data-block-id]` margin 规则，预览态由 node-slot 承载同一批规则，跨栏 computed margin 相等在滚动同步机制下本就不成立；字体三指标跨栏双比保留。断言目标修正非缩水，几何不跳动由 #2 钉死。
2. **零布局跳动 — PASS**。聚焦前后次兄弟块 `getBoundingClientRect().top` 差 ≤1px 断言 ×2 用例（H1、段落）绿。
3. **view/stream/preview 零变化 — PASS**。diff 零触碰 `src/render/` 管线（diff stat 佐证）；engine vitest 455/455（含 render/parity/semantics 套件）；demo e2e 31/31。
4. **EDITOR-CONTRACT 冻结面零变化 — PASS**。BlockHost 模板保留 `contenteditable="true"`/`data-block-id`/`data-node-type`；根类名与 `getBlockMap` 不在 diff；契约表变更仅为 `[contenteditable]` 行说明性补注（顺带修正"现 ProseMirror"陈旧表述）。
5. **全量门 — PASS（带已归属例外）**。engine vitest 455/455 + build（vue-tsc -b + vite + assert-parser-pure/assert-no-tiptap/assert-editor-gen 三断言 ok）；demo e2e 31/31；jade e2e 21/23——挂的 2 例（06-palette "Review flashcards" / 12-flashcards 卡面渲染）**复审时刻于主检出（master，无本计划改动）复跑同样失败且签名一致**（toBeVisible 超时），归属为既有问题非本计划回归，已记待澄清 #4；其余 21 例含截图基线更新后全绿。

**遗漏/延后/workaround 狩猎**：

- **遗漏：无**。T1-T10 每步在 diff 有对应产物（host-face.ts+test / BlockHost / EngineEditor / CSS / e2e spec / useSyncedScroll / EDITOR-CONTRACT / 截图四张）。`initial-viewport.png` 为 e2e 运行刷新的跟踪诊断截图，反映新视觉，属预期。
- **延后：无未批准拆分**。范围外三项（WikilinkBlock/Math/Mermaid 宿主语义化、H4-H6 CSS、check-heading.spec.ts 处置）均为计划正文详细设计 §5 预先声明的非目标 / 待澄清默认裁定，非执行期擅自砍。
- **Workaround：一处已记录的上游限制等价替代**。`:innerHTML` prop 替代 `v-html`（Vue 3.5.35 compiler-ssr 对 `<component :is>` 上 v-html 静默丢弃，编译产物级验证）——CSR/SSR 双路径测试覆盖，语义等价，非脏实现，T2 证据在档。
- **计划文本↔实现偏差（两处，均已记录）**：margin parity 断言基准修正（T5）；jade editor-index 基线更新（T8，actual/expected 双图视觉确认）。

**非阻塞观察**：

1. P028-3 非目标段建议"Dependabot 依赖清偿与发包前置（DEBTS 008/027）"单列 029——本 029 号位已被排版计划占用，该债务仍在 DEBTS 在册，后续需另取号。
2. 待澄清 #5：`tmp/wiki-demo` 的 journals/ 等未入库内容使纯新检出无法直跑 jade e2e（执行时从主检出补齐），建议补入库或入 prepare 脚本生成。

## 待澄清事项

1. **H4-H6 CSS**：view 现状只样式化到 h3；宿主照渲染即与 view 一致。若需要
   h4-h6 排版，属独立 CSS 任务（默认不做）。
2. **WikilinkBlock/Math/Mermaid 宿主语义化**：v1 不做（view 形态是 node-view
   面板，"就地编辑"语义不同），如需单列后续计划。
3. **check-heading.spec.ts 处置**：保持诊断脚本原样（断言职责已收编进新
   e2e）；如复审认为应删可另行处理。
4. **（T8 执行发现，既有问题非本计划引入）jade flashcards 两例 e2e 在
   master 上同样失败**（06-palette "Review flashcards" / 12-flashcards 卡面
   渲染），与 plan 029 改动无关，需另行排查（疑与 SRS/卡渲染链路相关）。
5. **（T8 执行发现）jade e2e fixture 不完整入库**：`tmp/wiki-demo/wiki` 的
   `journals/`、`Cards Probe.ad`、`jade-garden-srs-of-matrix.edn` 仅存在于
   主检出本地（未跟踪），纯新检出跑 `pnpm test:e2e` 会因 01-workspace 缺
   `journals` 而挂；建议补入库或入 prepare 脚本生成。
