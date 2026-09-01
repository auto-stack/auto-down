# [PLAN-037] Table 家族化——TableWidget 三模式归一与双实现退役

---
plan_id: PLAN-037
status: archived
feature_name: table_block_widget.at 三模式（view=StreamingTable 终态 / stream=渐进行为 / edit=TableEditorBlock 吸收）+ TableEditorBlock/streaming_table.at 双实现退役 + table_menu.at dormant 源处置
author: [zhaopuming]
created_at: 2026-09-01
updated_at: 2026-09-01

# /auto-plan:review 填定（merge 时沉淀）
supersedes_spec_components:
  - "P033-3/P033-4/P033-5（architecture/designs/tests 三节家族机制条目）: 修改——家族机制收官：Table 入列第八 kind（TableBlockWidget），块级家族化全员单 widget；parity 套件扩 Table 四断言组"
  - "P032-3/P032-4/P032-5（architecture/designs/tests 三节流式三态/表格单通道条目）: 修改——表格单通道归一进家族 widget（tablePanel→view 模式、StreamingTable 渐进模板→stream 模式），streaming_table.at 规范化并入 ext 桥，新增五态 DOM 金标对拍通道"
new_spec_components:
  - "goals: P037 Table 家族化收官（TableBlockWidget 三模式单 widget + TableEditorBlock/StreamingTable/streaming_table.at/table_menu.at 四源三产物退役 + 五态金标逐字节对拍 + 块级家族化全员完成）"
  - "architecture: P037 表格三槽装配（edit=EngineEditor 扁平化槽 / view=block-widget-panels registerPanel children_slot 孔 / stream=StreamingRenderer registry 包装）+ table_block_widget_ext 桥（三根 chrome 读数/规范化归并/commitTableCell）"
  - "designs: P037 dyn 根三态模式（view=table.table-node 裸根 / edit=div.autodown-table-editor / stream=div.streaming-table——root_tag/class/attr 存在性单源 ext 读数，undefined 掉 attr 的 Vue 规则）"
  - "tests: P037 streaming-table-gold 五态金标（渐进三态+终态两态经真实管线，norm 剥 data-v）+ table-block-widget 三模式直面 pin + parity 矩阵 Table 族四断言组"
touched_goals:
  - "P033-2: BlockWidget 家族机制——本计划完成块级家族化收官（Fence/Math/Mermaid/容器族/Table 全员单 widget）"
  - "P032-2: 全块类型流式渐进三态——表格单通道自 StreamingTable.vue 单源双面归一进家族 widget 三模式，行为基线五态金标冻结"

current_step: 8
total_steps: 8
---

## 变更摘要

033 家族化的最后一块块级拼图（035 容器族之后）。现状 Table 仍有两套
面：stream/view = `StreamingTable.vue`（手写模板 + `streaming_table.at`
props 规范化，032 归一后单通道服务终态+渐进）；edit =
`TableEditorBlock`（.at，工具栏七动词 + 单元格 contenteditable +
blur→controller.commitCell）。本计划按 033 模式归一为
`table_block_widget.at` 一件三模式 widget：

- **view/stream**：吸收 StreamingTable 全部（终态字节契约 + 渐进列头
  先行/行渐进行为；streaming_table.at 的规范化逻辑并入 widget 的
  model/computed 或其 ext 桥）；
- **edit**：吸收 TableEditorBlock 全部（七动词经 controller、单元格
  contenteditable + blur 提交、readonly 横幅）；
- **退役**：TableEditorBlock.vue/.at、StreamingTable.vue、
  streaming_table.at（及 streaming-table.generated.ts）——gen 清单与
  assert-editor-gen 同步；`table_menu.at`（026 裁定合并回工具栏后
  dormant）顺手处置（退役源文件，销 dormant 挂账）；
- **边界维持**：单元格 v1 文本（嵌套块后置）；TableEditorController
  内核一行不改（semantics 表格动词零改动回归）。

## 目标

1. Table 单 widget 三模式：view/stream/edit 同 chrome（033 parity
   套件扩 Table）；两套旧面物理退役，gen 清单同步冻结。
2. 零漂移：render.test.ts Table 段、demo scroll-sync / extension-blocks
   e2e、032 stream-tri-state 表格三态、container-editing（若有表格
   用例）**零改动**通过。
3. 渐进行为保形：列头先行/行渐进/props 规范化语义对拍（归一前后
   DOM 字节相等，含空表头兜底）。
4. dormant 挂账清理：table_menu.at 退役记录在案（DEBTS 026④ 姊妹项
   ——TableMenu 已销号但源文件尚在）。

## 架构方案

```
auto/editor/table_block_widget.at（新，三模式）
├─ props 扁平：mode/controller/blockId/readonly/final +
│  header_cells/body_rows（033 CodeBlockWidget 适配 idiom）
│  + stream 渐进参数（columns/rows 规范化形状——streaming_table.at
│   现语义）
├─ chrome 单份：.autodown-table-editor 容器 + te-toolbar（edit）+
│  table.table-node（thead/th + tbody/td，cell cls/data-cell-id）
├─ mode 分支：
│   view  → 终态表（StreamingTable final 分支 DOM 契约）
│   stream → 渐进（列头先行/行渐进/final 翻转）
│   edit  → toolbar + contenteditable 单元格 + blur 提交
└─ 动词：七按钮 msg → controller（TableEditorController 不动）

auto/editor/ext/table_block_widget_ext.ts（新桥）
├─ commitTableCell（现 table_editor_block_ext 语义迁入）
├─ normalizeTableProps（streaming_table.at 规范化迁入——.at 纯函数
│   可留 .at 进 widget computed，或随桥走 TS；执行期按 gen 表达力
│   定，倾向 .at computed 保单源）
└─ focus/语言徽章无涉（Table 无 badge 面）

装配与退役
src/render/StreamingTable.vue 删 → StreamingRenderer component 段路径
  与 palette custom 槽改挂 widget（registerBlockWidget('Table', …) +
  panelOf——033 双面同源）
auto/editor/table_editor_block.at + ext 删；gen 部署物清单重冻结
auto/editor/table_menu.at 删（dormant 处置，guard 豁免清单同步）
auto/render/streaming_table.at + src/render/streaming-table.generated.ts
  删（规范化并入 widget；gen:render 清单同步）
```

**为何现在能做而 033 时裁后**：033 时 Table 依赖 032 归一终态（行为
基线）与渐进对拍通道；两件均已就绪，且 034/035 的事件面 idiom
（contenteditable DSL 直发/键序/动词桥）齐备。

## 技术栈

- Auto widget DSL（gen:editor + gen:render 双管线涉及）
- 既有内核：TableEditorController / commands 表链动词（零改动）
- Vitest + Playwright

## 需求分析与背景调查

（来源：.autoos/specs.json 总览、DEBTS.md、engine 源码核查 2026-09-01；
前置 = PLAN-035 merge 硬依赖（gen 清单基线）+ PLAN-032 已归档
（终态单通道行为基线）；PLAN-036 无依赖可并行）

- 双面盘点：StreamingTable.vue（终态+渐进，032 后唯一表格渲染通道，
  经 streaming.at COMPONENT_TYPES 特判 + palette custom 槽两入口）；
  TableEditorBlock（edit 槽 registerBlockComponent('Table') 现存）。
- streaming_table.at：纯 props 规范化（nullish 兜底），.at 单源——
  归一并入 widget 后 gen:render 侧清单减一。
- table_menu.at：026 #1 裁定七动词吸收进 TableEditorBlock 工具栏后
  dormant（源文件在、guard 豁免）——本计划退役销挂账。
- 契约冻结面：render.test.ts Table DOM 段；EDITOR-CONTRACT 表格
  链（table-node/thead/th/data-cell-id）；032 stream-tri-state 表格
  三态断言；scroll-sync 的 [data-node-index] 表行序。
- spec 支点：P033 家族机制（本计划完成块级家族化收官——Fence/
  Math/Mermaid/容器族/Table 全员单 widget）；P032（终态行为基线）。
- DEBTS 对账：020 行"Table 族合流另行立项"销号；026④ 姊妹项
  （table_menu.at dormant 源）清理。

## 详细设计

### D1 widget props 与三态数据面

```
widget TableBlockWidget(mode str, controller Array<str>, blockId str,
  readonly bool, final bool, header_cells Array<str>,
  body_rows Array<str>, columns Array<str>, rows Array<str>) {
  // view/edit：header_cells/body_rows（033 适配器扁平化——现
  // tableEditSlot cellData 形状）
  // stream：columns/rows（streaming.at 段路径 props——规范化后形状）
}
```

- 适配器两形合流：EngineEditor edit 槽适配器与 StreamingRenderer
  component 段适配器各自扁平化（模式不同、props 形状同源对齐——
  cellData {id,text,cls} 与 streaming 规范化 {columns,rows} 的映射
  在装配层完成）。

### D2 渐进语义保形（对拍通道）

- 归一前录制 StreamingTable 三态 DOM 快照（空/列头先行/全量 final）
  作为金标；widget stream 分支逐字节对齐（含 `.table-node` 与
  aria-busy 等属性面）。
- streaming.at 的 COMPONENT_TYPES 特判保留（component 段路径仍是最
  优渐进入口），仅消费组件换 widget。

### D3 动词与单元格

- 七动词 msg → controller（TableEditorController：addRow/DeleteRow/
  addColumn/DeleteColumn/deleteTable 链——现 table_editor_block.at
  on 分支全量迁）。
- 单元格 contenteditable + onblur → commitTableCell（ext 桥，
  diffToOp 语义不动）；readonly 横幅 idiom 同 033。

### D4 退役与清单

- 删四源三产物：table_editor_block.at/ext、StreamingTable.vue、
  streaming_table.at（+ streaming-table.generated.ts）、table_menu.at；
  gen:editor 清单（034 后 17 → 035 后基线上 -2 +1 = 净 -1 widget；
  执行期以 035 冻结数为基）；gen:render 清单 -1。
- assert-editor-gen/assert 相关清单同步；ARCHITECTURE §6 数同步。

## 测试设计

- **零改动回归（硬验收）**：render.test.ts Table 段；demo scroll-sync
  / extension-blocks / stream-tri-state / undo 四 e2e；
  semantics.test.ts 表格动词段。
- **新增**：三态 DOM 对拍金标（D2）；parity 矩阵扩 Table（033 套件）；
  gen 两连跑字节确定。
- **手验**：表格编辑三例（工具栏动词/单元格 blur 提交/undo 单步）
  截图留档（029 T10 口径）。

## 验收标准

1. Table 三模式单 widget；四源三产物物理删除；gen:editor/:render
   清单与 guard 同步冻结。
2. 零改动回归清单全绿；三态对拍金标绿；parity 矩阵含 Table。
3. 渐进语义保形（列头先行/行渐进/空表头兜底）有对拍佐证。
4. 文档三件（EDITOR-CONTRACT Table 段 mode 注记 / ARCHITECTURE §6
   清单收官注记 / DEBTS 020 Table 族销号 + table_menu dormant 清理）
   更新完。

## 执行步骤

- [x] T1 录制 StreamingTable 三态 DOM 金标（空/列头/全量，含属性面）
      `src/render/__tests__/__snapshots__/`；验证：快照生成并复核。
      [✅ 已完成] streaming-table-gold.test.ts + 5 快照（渐进三态 + 终态
      open/closed 经真实管线，norm 剥 data-v）全绿（e2908dd）
- [x] T2 `auto/editor/table_block_widget.at` 新建（D1/D3：view/edit
      分支先行，吸收 TableEditorBlock 全行为）；验证：gen 两连跑 +
      extension-blocks 表格用例零改动绿。
      [✅ 已完成] dyn 根三态（view=table.table-node/edit=div.autodown
      -table-editor）+ BlockChildren 单元格孔；gen 两连跑零 diff；
      host-protocol（表格工具栏）+ extension-blocks 11 e2e 零改动绿 +
      engine 表格段 33 测试绿（b37c071）。注：AddColumnBefore 今日即
      无 handler（controller 有动词、widget 不发）——按"吸收全行为"
      原样保留，T6 手验时复核
- [x] T3 stream 分支（D2 对拍金标）+ 装配切换（StreamingRenderer
      component 段 + palette custom 槽 + registerBlockWidget）；
      验证：三态对拍绿 + stream-tri-state e2e 零改动绿。
      [✅ 已完成] 五快照（渐进三态+终态两态）换 subject 后机器 diff
      逐字节相等；stream-tri-state/scroll-sync/host-protocol 15 e2e
      零改动绿 + engine 734 测试绿 + vue-tsc 0 err（646129b）。装配：
      edit 槽=EngineEditor 扁平化、view=block-widget-panels
      registerPanel（children_slot 孔，list 适配器姊妹件）、stream=
      StreamingRenderer registry 包装组件；StreamingTable 摘除
      registerPanel 防导入顺序竞态（文件 T5 物理删）
- [x] T4 `auto/editor/ext/table_block_widget_ext.ts`（commitTableCell
      迁入）+ 规范化归并（D1 末段裁定落档）；验证：engine vitest
      表格段绿。
      [✅ 已完成] commitTableCell T2 已迁（ext 原样）；规范化归并落
      ext（streamHeader/streamBody/streamColspan，待澄清#1 注记在
      案）；table-block-widget.test.ts 三模式直面 pin + nullish/穿透/
      转义/colspan 单测，表格段 4 文件 50 测试绿（1f354b5）
- [x] T5 退役清理：TableEditorBlock/StreamingTable/streaming_table.at
      /table_menu.at 及产物 + gen:render 再生 + guard 双清单同步；
      验证：`node scripts/assert-editor-gen.mjs` + `pnpm --filter
      @autodown/engine gen:render` 两连跑均零退出/字节确定。
      [✅ 已完成] 删 12 文件（四源三产物 + table_menu.ext/
      table_editor_block.ext 双桥 + streaming_table.raw）；gen:editor
      19 源/17 部署物、guard 17 产品/13 桥同步；auto_down_editor_ext
      TableMenu re-export 残留修复；engine 738 + 4 e2e spec 23 全绿 +
      vue-tsc 0 err（5f00d22）
- [x] T6 parity 矩阵扩 Table + 手验三例截图；验证：vitest 绿 +
      截图留档。
      [✅ 已完成] block-widget-parity 23 测试绿（+4：table-node 单链/
      cell chrome 共享+白名单/stream loading 族/readonly 门）；
      table-edit-faces.png 三例合成图留档，undo 单步程序断言（提交
      文本消失、行保留）（f9bf732）
- [x] T7 文档三件（D4 收官注记）；验证：文档 diff 复核。
      [✅ 已完成] EDITOR-CONTRACT §6 Table 单通道 037 化；ARCHITECTURE
      §5 表格通道归一段 + §6 17 部署物/19 源/13 桥 + parity 扩容注记；
      DEBTS 020 Table 族销号 + 026④ dormant 源处置（含已删路径出处
      修正）（9581100）
- [x] T8 全量回归：engine test + build + demo playwright 全量 +
      413 IME 三例复跑（contenteditable 面重构必检）；验证：全绿。
      [✅ 已完成] engine 742 测试 + build（vue-tsc/vite/三 assert/dist
      stamp）+ demo e2e 51/51 全绿；IME 三例双面绿（表格格 contenteditable
      重构面 + RichTextHost 034 基线面，034 不-blur 口径）。两项执行期
      发现：① scroll-sync 底部同步一度红——坐实为长驻 dev server 跨
      T3 装配切换的 HMR 陈旧态（静态几何与 master 逐字节同、master 绿、
      全新 server 绿），非代码回归；② blur-在-preedit-期间 Chrome 提交
      组合文本→blur 提交落模型（两面共享既有语义，037 逐字保留
      handler，见待澄清 #4）

## 复审记录

**reviewer**: zhaopuming（/auto-plan:review，2026-09-01）
**对象**: worktree `.worktrees/plan-037-dev`（branch plan-037-dev，7 提交，
master..HEAD 40 文件 +1577/−1328）

**逐项验收（全部复跑取证）**

1. **Table 三模式单 widget；四源三产物物理删除；gen 清单/guard 同步冻结
   —— PASS**。`auto/editor/table_block_widget.at`（400 行，dyn 根三态）；
   12 个退役文件 `ls` 实证不存在；复审门复跑 gen:editor + gen:render 各
   两连跑后 `git status` 零 diff（字节确定）；assert-editor-gen 绿
   （17 部署物/13 桥）。
2. **零改动回归全绿；金标绿；parity 含 Table —— PASS**。全仓
   `pnpm -r test`：engine 742/742（core/vue/editor 无测试面）；
   render.test.ts 与 semantics.test.ts（表格动词段 15 例）`git diff
   master..HEAD` 零行（零改动实证）；四 e2e spec（scroll-sync/
   extension-blocks/stream-tri-state/undo）diff 零触碰；demo 全量
   51/51；金标 5/5；parity 23 含 Table 四断言组。engine build（vue-tsc/
   vite/三 assert/dist stamp）绿。
3. **渐进语义保形有对拍佐证 —— PASS**。五态金标（空/nullish 兜底、列头
   先行、全量 final、终态 open/closed 经真实管线）换 subject 后机器
   diff 逐字节相等（T3 执行记录），快照已入册。
4. **文档三件 —— PASS**。EDITOR-CONTRACT §6 Table 单通道 037 化；
   ARCHITECTURE §5 表格通道段 + §6 清单收官注记（17/19/13）；DEBTS
   020 Table 族销号 + 026④ 处置（含已删路径出处修正）。diff 复核通过。

**遗漏 / 延后 / workaround 猎查**

- 遗漏：无——8 步全有提交+证据；diff 范围与计划吻合（40 文件全数对账）。
- 延后：嵌套块单元格（待澄清 #3，计划内明文裁定维持 v1 边界，非私自
  缩面）；IME blur-期间提交（待澄清 #4，执行期新发现，在案待用户裁定）。
- Workaround：未引入（diff 中 TODO/FIXME/HACK 零新增）；"填充 props 满足
  生成物必填检查"为 033 ctx:null 既有 idiom，代码注释在案。

**债务候选（均为既有问题，非本计划引入——不改判验收）**

1. **AddColumnBefore 死动词（既有）**：工具栏"列←"按钮存在、controller
   有 addColumnBefore，但 widget 不派发（on 块无 handler，仅 emit）——
   037 前的 TableEditorBlock 完全相同，按"吸收全行为"原样保留。修法
   一行（补 on handler），待用户裁定是否独立小项。
2. **IME blur-在-preedit-期间提交组合文本（既有，待澄清 #4）**：Chrome
   在组合活跃时 blur 把 preedit 提交进 DOM，blur 协议随之落模型——两面
   （表格格/RichTextHost）共享语义，034 原验证口径（不-blur）未触此
   路径。需裁定：composition-active 守卫 vs 接受为平台语义。
3. **scroll-sync e2e 异步沉降抖动窗（既有）**：scroll-sync 断言仅等
   200ms，而右/左栏 katex/mermaid 异步渲染三级沉降（3174/2895→3603→
   3686/3703，worktree 与 master 曲线实测一致）；复审全量曾单红一次
   （line 109），隔离复跑 11 次全绿 + master 6 次全绿 + 037 未触滚动/
   工件路径 + 静态几何逐字节同——判定为既有环境抖动，非回归。候选
   修法：断言前等待工件 settle。

**执行偏差（非债务）**：T4 名义上的"commitTableCell 迁入"实际随 T2
落地（gen 需 ext 文件存在），T4 marker 已注明，语义完整无缺。

**结论**：四项验收全 PASS，无阻断债务 → `status: reviewed`，可接
`/auto-plan:merge`。

## 待澄清事项

1. **规范化逻辑归属**（建议留 .at）：streaming_table.at 的纯函数并
   入 widget 的 computed（保单源、VM 可编译）；若 computed 表达力
   不足（List 归一）则随 ext 桥走 TS 并记契约注记。
   **✅ 已裁定（T3/T4 执行期）**：走 ext 桥（streamHeader/streamBody/
   streamColspan，`?? []` 语义零改动）——computed 表达式不支持 `??`
   也无数组字面量（probe 见 table_menu.at 先例）；契约注记落
   table_block_widget_ext.ts 头部，nullish/穿透/转义断言在
   table-block-widget.test.ts。
2. **streaming.at COMPONENT_TYPES 特判去留**（建议保留）：表格渐进
   走 component 段仍优于 markdown 段（032 裁定不变）；特判是段路径
   优化而非双实现，不在本计划退役范围。
   **✅ 已裁定（T3 执行期）**：保留——装配切换仅换消费组件
   （StreamingRenderer registry 指向 widget stream 面），streaming.at
   本体零改动。
3. **嵌套块单元格**（维持 v1 边界）：文本单元格；嵌套块等
   BlockChildren 孔（035 产物）在表格场景的复用验证后置独立小计划。
4. **（T8 新增）blur-在-preedit-期间提交组合文本**：IME 复跑发现
   Chrome 在组合活跃时 blur 会把 preedit 文本提交进 contenteditable
   DOM，blur 提交协议（表格格 commitTableCell / RichTextHost blur）
   随之把它落模型——两面共享的**既有**语义（037 对 handler 逐字保留，
   非本计划回归；034 T8 原验证口径为不-blur 只查模型，未触此路径）。
   处置选项：blur 处理器加 composition-active 守卫（丢弃或显式提交）、
   或接受为平台语义并登记——需用户裁定，建议独立小项（涉及两面协议
   一致性）。
