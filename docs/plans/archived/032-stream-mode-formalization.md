# [PLAN-032] stream 模式全量定型——三态审计裁定 + 表格双实现归一 + 渐进契约钉死

---
plan_id: PLAN-032
status: archived
feature_name: 全块类型流式渐进三态（未闭合/开放/闭合）审计裁定 + StreamingTable↔renderTablePanel 归一 + stream 槽机制与样式 parity 测试钉死
author: [zhaopuming]
created_at: 2026-09-01
updated_at: 2026-09-01

# /auto-plan:review 填定（merge 时沉淀）
supersedes_spec_components: []
new_spec_components:
  - ".autoos/specs.json 六节 P032-1..6: stream 模式全量定型——P1 三态审计：fixtures/tri-state.ts 17 kind×未闭合/开放/闭合语料（fence 族开放态/table 列头先行/容器成员 ridesContainer）+ stream-tri-state.test.ts 44 用例（SSR DOM 断言 + 装载契约 + 闭合构造 final=false/true DOM 一致=翻转无跳变根据；断言咬合经破坏-恢复反向验证）；裁定表 D2 冻结：17 kind 全 A 零 stream 槽注册，无 B/C。P2 表格归一：renderTablePanel 退役（builtin-panels 删 Table 项），StreamingTable.vue 单源双面（渐进面=模板（```json 组件段）/终态面=tablePanel 渲染函数逐字节迁移），经 panel registry custom 槽 registerPanel('Table')，触发点=render-node 副作用 import（避开 panel-registry↔builtin-panels 运行时环 TDZ）；unregisterPanel('Table') 语义=降级 unknown-node；临时双跑对拍（新旧逐字节相等）后随退役删除；render.test.ts 零改动通过；streaming_table.at 核定无需补齐、gen:render 两连零 diff。P3 开放态骨架：renderCodeblockPanel 消费 node.loading——开放 fence 容器挂 .autodown-block-placeholder.is-loading + pre[aria-busy=true]（mermaid 开 fence 同形态），闭合态字节不变；等高占位 min-height:5.5rem 入 autodown-editor.css（CSS 常量快照，无动画 v1）。P4 机制+e2e：block-component-stream.test.ts 4 用例（注册覆盖 builtin/传参形状 props 去 type 键/final 随段闭合与 streaming flag 翻转/clearBlockComponents teardown 回落）；demo stream-harness.html 双 pane（streaming/final 同源 ref，scrollSync=false）+ e2e/stream-tri-state.spec.ts 6 用例（fence/mermaid/math/table/callout 三态序列 + computed-style parity 四类六选择器组，语料从引擎 fixtures 同源导入）；e2e 抓出 T6 真 bug——骨架 class 撞 clearPlaceholders 无条件删除致代码面板被摘（Vue VDOM 不知情），修复=选择器收窄 .node-slot > .autodown-block-placeholder（与 applyBlockIds 的 :scope > 守卫对齐）。文档：EDITOR-CONTRACT §1 占位行改注+is-loading 行+新 §6 stream 面契约段；ARCHITECTURE §5 stream 定型段；DEBTS 032 销号行（三态余量+表格双实现清偿，无 B/C 新行）。测试：engine 576（031 基线 528+032 新 48）、demo 46（scroll-sync bottom-scroll 两例环境性 flake 先于本计划存在，master A/B 同败在案）"
touched_goals:
  - ".autoos/specs.json P023-2: BlockComponent 三模式契约目标——stream 槽语义钉死：17 kind 裁定全 A 零注册（注册才是债的负空间裁定）+ 机制契约测试在册（注册覆盖优先级/(node,final) 传参形状/teardown 干净），契约第 2 条 stream 槽位从'缺省沿用 markdown 段路径'升格为'经审计的默认正确'"
  - ".autoos/specs.json P030-2: 扩展块解析通道目标——降级安全从 030 的规则论证 + 031 的 math/mermaid 两 kind 钉死推广到全 17 kind 三态（裁定表 D2 + 单测/e2e 同源语料钉死 + parity 四类），目标块级安全面收口"

current_step: 9
total_steps: 9
---

## 变更摘要

"完美态"路线图 M1 第一步。现状：流式期间 markdown 段走的**就是**全量 parser
+ panel 管线（`MarkdownRender` → `parseDocument(text, final)` →
`renderNodes`，030/031 已保证未闭合降级安全），唯 Table 有独立渐进通道
（streaming.at 特判 → StreamingTable）；`BlockComponent.stream` 槽自设立
（P023）以来**零注册**。本计划不盲目给 17 类块全挂 stream 槽，而是：

**P1 三态审计与裁定**：程序化收集 17 kind × {未闭合 / 开放 / 闭合成块}
的渲染形态，产出逐块裁定表——**A=默认面板路径（零注册，预期绝大多数）**
/ B=注册同型槽 / C=注册渐进骨架槽——裁定连同断言钉进测试。

**P2 表格双实现归一**：view 终态 `builtin-panels.renderTablePanel`（TS）
与 stream 渐进 `StreamingTable.vue`（+ streaming_table.at 规范化）是两套
实现，样式一致性靠人盯。归一为单通道（建议方向：StreamingTable 吸收终态
模式，renderTablePanel 退役；见待澄清②），thead/th + tbody/td 契约由
render.test.ts 钉死不动。

**P3 开放态骨架契约**：mermaid 开放 fence（codeNode loading）与 math
未闭合（段落字面）的"翻转瞬间"视觉连续——开放态骨架 class 契约统一
（`.autodown-block-placeholder` 家族扩展），v1 只钉 class 契约不做动画。

**P4 机制与测试钉死**：stream 槽注册优先级（注册即覆盖 markdown 段路径）
的机制测试；三态 fixture 全量进 e2e；流式中 vs final 的 computed-style
parity 抽查（Heading/Paragraph/Fence/Table 四类）。

**不做的**：三模式共享 chrome 的结构重构（PLAN-033）；扩展块流式中的
实时预览节流（闭合成块后源码必完整，无重渲染风暴——031 已论证）；
容器块 chrome .at 化（后续计划）；VM 侧。

## 目标

1. **裁定表在册**：17 kind × 三态每格有裁定（A/B/C）与对应自动化断言；
   裁定为 A 的块**不注册** stream 槽（默认路径即正确行为，注册反而是债）。
2. **表格单通道**：终态与流式渐进同一实现，DOM 契约（table-node /
   thead+th / tbody+td / data-node-index）逐字节不变，render.test.ts 与
   demo scroll-sync e2e 零改动通过。
3. **开放态契约**：扩展块开放/未闭合态统一骨架 class，闭合翻转不产生
   布局跳变（等高或占位），class 契约进 EDITOR-CONTRACT。
4. **机制钉死**：stream 槽注册 → 覆盖 markdown 段路径（含 props/final
   传参形状）；clearBlockComponents teardown 干净；三态 e2e 与
   computed-style parity 在册全绿。

## 架构方案

```
P1 审计（测试先行，无产品代码）
src/render/__tests__/stream-tri-state.test.ts（新）
├─ fixture 语料：17 kind 各"未闭合/开放/闭合"三段式 markdown 片段
├─ mount MarkdownRender(content, final=false/true) → DOM 形态断言
│   （kind 识别、降级 kind、骨架/loading class、无异常）
└─ 产出物：裁定表落本计划 §详细设计 D2 + 断言同源钉死

P2 表格归一（建议方向 a，待澄清②）
src/render/StreamingTable.vue
├─ 增 final 模式（props.final=true 走终态渲染路径，对齐现
│   renderTablePanel 的 DOM 字节契约）
├─ builtin-panels.ts：renderTablePanel 退役，Table 面板改经
│   panel-registry custom 槽挂 StreamingTable（026 nodeViewPanel 同模式）
└─ streaming_table.at：终态路径若需 props 规范化差异，同源补齐
P3 开放态骨架
src/render/builtin-panels.ts（codeNode loading 态）+ 031 编辑面横幅段
└─ class 契约：.autodown-block-placeholder 复用/扩展（is-loading 修饰）
P4 机制
src/render/__tests__/block-component-stream.test.ts（新）
└─ 注册 mock stream 槽 → StreamingRenderer 分派断言（slotNodeOf/
   slotFinalOf 传参形状）；teardown
demo/e2e/stream-tri-state.spec.ts（新）
└─ 三态渐进语料喂入（demo 已有 stream 面板或 stream-demo 复用）+
   流式中 vs final computed-style parity（Heading/Paragraph/Fence/Table）
```

**为何预期绝大多数裁定为 A**：闭合成块后源码必完整（030 fence 式状态机
保证），面板路径与 view 同型即所需；注册 stream 槽只在"面板路径不适配
渐进"时才有价值（表格是历史反例——渐进表格渲染需列先知）。裁定 B/C
的预期候选：仅 Table（已由 P2 单通道吸收）。

## 技术栈

- Vitest（engine 单测：三态 fixture + 机制测试）
- Playwright（demo e2e：三态 + computed-style parity）
- 既有 gen:render 通道（streaming_table.at 若动）

## 需求分析与背景调查

（来源：.autoos/specs.json 总览、DEBTS.md、engine 源码核查 2026-09-01；
前置 = PLAN-031 execution_done——worktree plan-031-dev 39 文件 +2337 行，
math/mermaid 编辑面与工件契约在支，**merge 后本计划启动**）

- 流式渲染链路核实：StreamingRenderer.vue 分段（streaming.at 单源，
  COMPONENT_TYPES=["table"] 特判）→ markdown 段走 MarkdownRender →
  **同一个 .at 生成 parser**（final flag）→ renderNodes → palette map
  → panel-registry（custom → builtin → degrade）。即"stream 与 view
  同管线"，差异只在 final flag 与表格特判——这是 A 类裁定的机制根据。
- stream 槽消费者核实：StreamingRenderer.vue:161
  `resolveBlockComponent(kind).stream`，注册即覆盖；现状零注册。
- 表格双实现核实：builtin-panels.ts:124 renderTablePanel（TS 终态）vs
  StreamingTable.vue（手写模板 + streaming_table.at props 规范化，.at
  单源）；两者 thead/th DOM 同型但无共享断言。
- 测试基线核实：render.test.ts（168 行：MarkdownRender DOM contract /
  extension block panels / optional capabilities）是归一的安全网；
  demo scroll-sync e2e 依赖 `.streaming-document` / `[data-node-index]`。
- 契约冻结面：EDITOR-CONTRACT DOM 选择器清单（e2e 依赖）逐项保形，
  归一不允许静默缩水。
- spec 支点：P023-2（三模式契约，stream 槽语义）、P030-1..6（降级安全）、
  P031（math/mermaid 三态钉死先例——本计划把它推广到全块类型）。

## 详细设计

### D1 三态 fixture 语料（P1）

17 kind × 三态的最小语料，集中放
`src/render/__tests__/fixtures/tri-state.ts`（kind → {unclosed, open,
closed} 三段 markdown 字符串）。开放态仅对 fence 族有意义（```mermaid
开 fence → codeNode loading；普通 ``` fence → codeNode）；math `%{`
未闭合 → 段落字面；`$callout(` 未闭合 → 段落字面（030 规则）。闭合态
直接复用 demo content.ts 方言语料。rust 对拍不涉及（本计划纯装配层）。

### D2 裁定表（P1 产出；2026-09-01 执行期实测冻结，stream-tri-state.test.ts 同源钉死）

| kind | 未闭合 | 开放 | 闭合 | 裁定 |
|---|---|---|---|---|
| Heading/Paragraph/Quote/List 族/ThematicBreak | — | — | 即刻完整 | A（零注册） |
| Fence | — | codeNode（loading class） | Codeblock 面板 | A |
| Table | 段落字面 | 列头先行 | Table 面板 | 归一后 A（P2） |
| MathBlock | 段落字面 | — | katex 面板 | A（031 已钉） |
| Mermaid | — | codeNode loading | mermaid 面板 | A（031 已钉） |
| Callout/Details | 段落字面 | — | 卡片面板 | A |
| Query/Embed | 段落字面 | — | 占位面板 | A |
| WikilinkBlock/TableRow/TableCell | 随容器 | 随容器 | 随容器 | A（容器成员） |

**冻结记录（T2 实测）**：17 kind 全 A，零 B/C——与"闭合 fence 式状态机保证源码
完整后面板路径与 view 同型"的预期一致；无任何 stream 槽注册需求。实测细节：
① Mermaid 未闭合（语言尚在流式，如 `` ```m ``）本身就是泛化 loading code
block，kind 不可辨识即正确行为；② Table 开放（列头先行）走 markdown 面板
路径，DOM 即 render.test.ts 契约，P2 归一前后必须同形（断言已同源钉死）；
③ 闭合构造在流式中（final=false）与终态（final=true）DOM 逐标记一致——
"闭合翻转无 DOM 跳变"的机制根据。断言咬合经反向检查验证（临时破坏期望
2 红→恢复 44 绿）。

### D3 表格归一（P2，方向 a 为建议）

- StreamingTable 增 `final` 终态模式：渲染分支对齐 renderTablePanel
  现行 DOM（含 `table-node` class、align class、`.node-slot`/
  `.node-content` 包裹层）；流式行为（列头先行、行渐进）不动。
- builtin-panels 的 Table 项退役 → panel-registry custom 槽挂
  StreamingTable（`registerPanel('Table', ...)`，nodeViewPanel 同模式）；
  render.test.ts 的 Table 用例**零改动**必须通过（DOM 契约守卫）。
- streaming_table.at 若需终态规范化差异（如空表头兜底）同源补齐，
  `pnpm gen:render` 再生。

### D4 开放态骨架契约（P3）

- codeNode 开放态的 loading 呈现统一 class：`.autodown-block-placeholder`
  加 `is-loading` 修饰（既有占位家族，scroll-sync 契约面已含
  placeholder）；mermaid 开放 fence 与普通 fence 同形态。
- 翻转连续性 v1 只做"等高占位"（CSS min-height 对齐闭合面板首屏高），
  不做过渡动画；class 契约进 EDITOR-CONTRACT 表。

### D5 stream 槽机制测试（P4）

- 注册 mock stream 槽（vitest）→ 断言：该 kind 的段不再走
  MarkdownRender 分支、槽收到 `(node, final)` 形状、final 随
  streaming flag 翻转；
- `clearBlockComponents()` 后回落默认路径。

## 测试设计

- 单测：tri-state 三态断言（D1 语料 × D2 表）；表格归一后 render.test.ts
  零改动通过；stream 槽机制测试。
- e2e（demo）：`stream-tri-state.spec.ts`——渐进语料分帧喂入（复用
  demo 流式通道），断言三态序列 DOM + 最终面板；computed-style parity
  抽查四类（流式中 vs final 的 font-size/margin/border 等关键属性）。
- 回归：engine vitest 全量 + demo e2e 既有 12+ spec（scroll-sync 重点）。

## 验收标准

1. 裁定表 17 kind 全格有测试背书；A 类零 stream 槽注册（grep 佐证：
   registerBlockComponent 无 stream 键新增，表格除外如走注册）。
2. renderTablePanel 退役后 Table 渲染单通道；render.test.ts 与 demo
   scroll-sync e2e 零改动通过。
3. 开放态/未闭合态骨架 class 契约在 EDITOR-CONTRACT 在册；三态 e2e 绿。
4. stream 槽机制测试（覆盖优先级/传参/teardown）在册。
5. computed-style parity 抽查四类绿；无既有测试改动（除 builtin-panels
   Table 退役的显式删改）。

## 执行步骤

- [x] T1 `src/render/__tests__/fixtures/tri-state.ts` 新建 17 kind ×
      三态语料；验证：`pnpm --filter @autodown/engine test -- tri-state`
      语料装载用例绿。
  [✅ 已完成] worktree a9ba221——语料 17 kind（fence 族开放态/table 列头先行/
      容器成员 ridesContainer 标记）+ stream-tri-state.test.ts 装载契约 4 用例
      绿（closed 全部解析到声明 kind；unclosed/open 前缀 final=false 零异常）。
- [x] T2 `src/render/__tests__/stream-tri-state.test.ts` 新建三态 DOM
      断言（先红后绿记录现状），执行期修正并冻结 D2 裁定表；验证：
      vitest 全绿 + 裁定表回填本文件。
  [✅ 已完成] worktree 77ba325——数据驱动同源语料 44 用例绿（含闭合构造
      final=false/true DOM 一致性=翻转无跳变根据）；D2 已冻结：17 kind 全 A
      零注册，无 B/C；断言咬合反向检查（破坏期望 2 红→恢复 44 绿）。
- [x] T3 `src/render/StreamingTable.vue` 增 final 终态模式（对齐
      renderTablePanel DOM 字节契约）；验证：临时双跑对拍测试（新旧
      DOM 逐字节相等）绿。
  [✅ 已完成] worktree 53dfd00——StreamingTable 双面单通道：渐进面=模板
      （```json 组件段），终态面=tablePanel 渲染函数（renderTablePanel
      逐字节迁移）；table-unify-parity.test.ts 双跑对拍 2 用例绿（plain +
      三向 align/多行）。对拍测试标记 temporary，T4 随退役删除。
- [x] T4 `src/render/builtin-panels.ts` renderTablePanel 退役 +
      `registerPanel('Table', ...)` 挂 StreamingTable；验证：render.test.ts
      零改动通过。
  [✅ 已完成] worktree 32824dc——builtin-panels 删 renderTablePanel/alignClass/
      Table 项；StreamingTable 模块级 registerPanel('Table', tablePanel)，
      触发点=render-node 副作用 import（避开 panel-registry↔builtin-panels
      运行时环 TDZ）；unregisterPanel('Table') 语义=降级 unknown-node（注释
      在册）。render.test.ts 14 用例零改动绿；palette-map/tri-state/
      streaming-component-slot/parity 共 91 绿；vue-tsc -b 零错；临时对拍
      测试随退役删除。
- [x] T5 `auto/render/streaming_table.at` 终态规范化补齐（如需）+
      `pnpm --filter @autodown/engine gen:render` 两连跑字节确定；验证：
      gen 产物 diff 仅预期文件。
  [✅ 已完成] 裁定"如需"=不需：终态面直消费 WNode header/rows（无
      columns/rows props），normalizeTableProps 仅服务渐进面，.at 零改动。
      gen:render 两连跑工作树零 diff（字节确定，产物含 core/rust
      artifact_hash 双发射无漂移）。
- [x] T6 开放态骨架 class（`.autodown-block-placeholder.is-loading` 家族）
      + 等高占位 CSS；验证：tri-state 测试断言 loading class。
  [✅ 已完成] worktree 98ec3dd——renderCodeblockPanel 消费 node.loading：开放
      fence 容器挂 `autodown-block-placeholder is-loading` + aria-busy="true"
      （mermaid 开放 fence 同形态）；闭合态 class/aria 字节不变（render.test.ts
      零改动绿）。CSS 等高占位 min-height:5.5rem 进 autodown-editor.css（待澄清
      ③ 裁定采纳：CSS 常量快照，不做动画）。tri-state 44 绿含 loading class
      断言（开放含/闭合不含）。
- [x] T7 `src/render/__tests__/block-component-stream.test.ts` 机制测试
      （注册覆盖/传参/teardown）；验证：vitest 绿。
  [✅ 已完成] worktree c40dc7e——4 用例绿：①组件段槽覆盖 builtin registry +
      传参形状（props 去 type 键）+ 闭合 final=true；②json 未闭合 final=false；
      ③details 段 final 随 streaming flag 翻转（true→false/false→true）；
      ④clearBlockComponents teardown 后 builtin 路径（streaming-table/原生
      <details>）回落。与 023 routing 测试互补不重复。
- [x] T8 `demo/e2e/stream-tri-state.spec.ts` 新建（分帧喂入 + 三态序列 +
      computed-style parity 四类）；验证：`pnpm --filter demo exec
      playwright test e2e/stream-tri-state.spec.ts` 绿。
  [✅ 已完成] worktree d074772——6 用例绿（E2E_PORT=5199）：fence/mermaid/math/
      table/callout 三态序列 + parity 四类（h2/p/pre/table×2 共 6 选择器组）。
      载体=stream-harness.html 双 pane（streaming/final 同源 ref，语料从引擎
      fixtures 同源导入）。**e2e 抓出 T6 真 bug**：骨架 class 复用撞上
      clearPlaceholders 无条件删除——代码面板被整块摘除（Vue VDOM 不知情）；
      修复=选择器收窄 `.node-slot > .autodown-block-placeholder`（编辑占位
      只出现在 slot 直接子级，与 applyBlockIds 的 :scope > 守卫对齐）。
      scroll-sync 回归：4 过 2 挂与主检出（master 无 032）完全一致——存量
      失败（bottom-scroll 两例），非本计划引入，已记待澄清⑤。
- [x] T9 `EDITOR-CONTRACT.md`（stream 面契约段 + 骨架 class）+
      `packages/engine/ARCHITECTURE.md` §5（stream 段改写）+ `DEBTS.md`
      （030 三态余量并入本表销号/新行登记 B/C 类若出现）；验证：文档
      diff 复核 + 全量回归（engine test + demo playwright）。
  [✅ 已完成] worktree d54698d——EDITOR-CONTRACT：§1 占位行改注（slot 直接
      子级限定）+ is-loading 骨架行 + 新 §6 stream 面契约段（三态语义/Table
      单通道/槽机制/e2e 面签）；ARCHITECTURE §5 首条 stream 定型段；DEBTS
      032 销号行（三态余量+表格双实现清偿，无 B/C 类新行）。全量回归：
      engine vitest 576/576 绿；demo playwright 45/46 绿——唯一失败为存量
      bottom-scroll（master 同挂，见待澄清⑤）。

## 复审记录

**复审**：/auto-plan:review，2026-09-01，复审人 zhaopuming（会话内独立重验，非采信执行期勾选）。

**全量门（本计划唯一全量套件跑点）**：engine vitest 576/576 绿（031 基线
528 + 032 新 48）；demo playwright 45/46——唯一失败为 scroll-sync
bottom-scroll 族环境性抖动，**master 新鲜 A/B 同败**（master 5/6 挂 1 例、
worktree 全量挂同族另 1 例，两次运行挂例不同=典型 flake），非本计划引入。

**逐条验收**：

1. ✅ 裁定表全格背书 + 零注册——stream-tri-state.test.ts 44 用例（13 kind
   fixture 断言 + 4 容器成员 ridesContainer 显式断言）绿；grep 佐证：产品码
   registerBlockComponent 仅 EngineEditor 4 处 edit-only，零 stream 键
   （block-component.ts:85 为解析管道非注册）。
2. ✅（附存量记录）Table 单通道——builtin-panels Table 项已删（diff 证据），
   tablePanel 经 custom 槽挂载，T3 双跑对拍逐字节相等（临时测试按计划随退役
   删）；render.test.ts **git diff 零改动** + 14/14 绿；scroll-sync.spec.ts
   零改动，套件存量 flake 见全量门记录。
3. ✅ 骨架契约在册——EDITOR-CONTRACT §1 is-loading 选择器行 + §6 stream 面
   契约段；三态 e2e 6/6 绿（全量套件内复跑）。
4. ✅ 机制测试在册——block-component-stream.test.ts 4 用例（优先级/传参
   形状/final 翻转/teardown 回落）绿。
5. ✅ parity 四类绿 + 零既有测试改动——parity e2e（6 选择器组 computed-style
   流式 vs final）绿；git diff：仅 3 个新增测试文件，既有测试零修改
   （builtin-panels Table 删除为产品码显式删改，计划许可）。

**遗漏/延后/workaround 猎查**：

- 遗漏：无——T5"如需"为零改动负结果在案（终态直消费 WNode，gen 两连零
  diff）；临时对拍测试删除属计划行为；9 任务均有 diff 或负结果记录。
  架构草图 P3 行"+ 031 编辑面横幅段"歧义裁定：D4 规范文本（class 契约 +
  等高占位 + 契约入册）无横幅改动任务，T6 步骤文本一致，判不缺项。
- 延后：扩展块 parity → 033（计划文本自带边界，待澄清②）；scroll-sync
  flake → 待澄清⑤（存量非本计划范围）。两者均明示在册，无执行者私裁缩水。
- Workaround：无强凑——render-node 副作用 import（环规避）为带注释的显式
  设计决策；clearPlaceholders 作用域收窄与既有 :scope > 守卫对齐（真修复，
  e2e 抓出后根治）；stream-harness.html 为 dev-only 测试基建（不入构建
  inputs，注释在案）。

**债务候选（登记不阻塞）**：

1. scroll-sync bottom-scroll 两例环境性 flake（存量，master 同败）——待澄清
   ⑤在案，建议单列排查（viewport 高度/滚动时序敏感）。
2. （轻微，非 032 引入）StreamingRenderer 向 MarkdownRender 传
   code-block-props，后者未声明该 prop，落为根元素 fallthrough 属性
   `code-block-props="[object Object]"`（harness 探针中观察到）——不影响
   功能，顺手可清。

**裁定**：五条验收全过（第 2 条附存量 flake 记录与 master A/B 证据），无
阻塞债务 → `status: reviewed`，可入 `/auto-plan:merge`。

## 待澄清事项

1. **表格归一方向**（建议 a）：a) StreamingTable 吸收终态，renderTablePanel
   退役——单通道且渐进行为已在此侧；b) 反向（renderTablePanel 吸收渐进）
   ——TS 侧改动小但丢 .at 单源。倾向 a。
2. **parity 抽查范围**（建议四类起步）：Heading/Paragraph/Fence/Table；
   扩展块 parity 待 PLAN-033 共享 chrome 后才有结构意义（两套 chrome 对拍
   属于 033 的交付物）。
3. **等高占位的度量口径**（建议 min-height 快照）：开放态骨架高度取
   "闭合面板首屏高"的经验值（CSS 常量）还是测量值（JS resize 观测）？
   倾向前者（v1 简单，动画本就不做）。
4. **[2026-09-01 执行阻塞→已解除]** 前置门未过：需求分析钉死"PLAN-031 merge 后
   本计划启动"，但 plan-031-dev 尚有 11 个提交（39 文件 +2337 行，含
   031-T9 流式三态 fixture）未折入 master，031 状态仍为 execution_done
   （待 /auto-plan:review）。本计划 T1/T2 依赖 031 的三态 fixture 与
   mermaid loading 先例。请先走完 031 的 review + merge，再重启本计划；
   不采用"032 基于 plan-031-dev 开分支"的变通（两计划提交纠缠）。
   → **已解除**：031 已 merge（master f1e90b2），2026-09-01 重启执行。
5. **[2026-09-01 T8 发现·存量]** demo scroll-sync e2e 底部滚动两例
   （`bottom toolbar does not cover the last block` / `both panels reach
   their max scroll`）在 master（无 032）与 032 worktree 同样失败——存量
   问题（疑似 headless 视口/布局时序），非本计划引入；本计划不越界修复，
   留待单独排查。
