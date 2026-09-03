---
plan_id: PLAN-045
status: executing
feature_name: VM 表格列宽拖拽（View::Table 列宽状态 + 列边界命中/拖拽 + DSL 状态回路）
author: [zhaopuming]
created_at: 2026-09-03
updated_at: 2026-09-03

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 0
total_steps: 8
---

# [PLAN-045] VM 表格列宽拖拽

## 变更摘要

DEBTS 040 三大平台豁免之末：vue 轨表格列宽拖拽经 ext 桥
useTableColumnResize（renderer 容器测量，app_ext.ts:54-55 接线）；
VM 轨无测量通道、表格固定布局、`View::Table` 无列宽字段无交互回调
（view.rs:506-513）。本计划在 VM 侧落地列宽拖拽，验收口径按路线图
原文：**行为对齐非像素对齐**。

1. **View::Table 契约扩展**（沿 043/044 扩字段模式，不新增变体）：
   `col_widths: Option<Vec<f32>>`（列宽应用）+ `on_col_resize:
   Option<M>`（拖拽落定消息，closure 捕获表键——details_onclick
   同款通道）。
2. **renderer 侧命中 + 拖拽**：列边界命中（表头行 x 累积 vs 边界）
   + Drag 态（code_editor 滚动条 Drag enum 模式，core/mod.rs:227-234
   先例）+ PointerArea「事件现场持 layout bounds」先例
   （pointer_area.rs:155-186）。
3. **DSL 状态回路**：autodown element 增 prop `table_col_widths`
   （Map<表键, 列宽数组>，vue 臂忽略注记）；app.at state +
   OnColResize handler 写回——重渲染不丢（会话内保持，比 vue 的
   重渲染即丢更强，口径差异登记不改）。
4. **编号漂移尾单**：DEBTS.md:41 与 demo README:42 表格行旧指向
   PLAN-044 修准为本计划并销号；ext 桥 VM no-op 桩注记核对
   （useTableColumnResize 桩保留给 vue 轨）。

**时序硬前置**：043 折入 master（View 扩字段 + 消息通道 + mcp
action 扩展三个先例）；建议 044 之后串行（aura_view_builder 消费臂/
autodown_render/render_document_with 参数面与 044 重叠）。行号基准：
auto-lang 侧为 worktree auto-down-dev @ 058aa7df5 行号，折入后允许
平移。

**会话裁定（2026-09-03，防止复议）**：
- **拖拽反馈时机 = 拖拽中 widget 内部临时宽实时绘制，松手才发消息
  落 state**——避免 mousemove 级消息洪泛 DSL 层；行为口径与 vue
  （实时写 th.style）观感对齐，状态语义更干净。
- **列宽单位 px、最小宽 40、命中带 10px**——对齐 vue 金标常量
  （useTableColumnResize.ts L69-72 边缘带 right-6~right+4、L134
  `max(40, …)`），行为对齐的锚点即这三常量。
- **表键 = block_key 内容哈希**（autodown_render.rs:80-93，041
  流式复用同键）——列宽状态跨重渲染稳定，表内容变更视为新表
  （宽度重置，与 vue 重渲染即丢同向，不另做迁移）。
- **只做 view/stream 面**：vue 金标只接 StreamingRenderer 容器
  （EngineEditor 不接，app_ext.ts:54-55）；VM 编辑壳表格是只读容器
  块（core.rs:6 头注、:1365 table_to_markdown 序列化）——双轨
  对齐，编辑态列宽不在本计划范围。

## 目标

1. VM demo：预览栏表格表头列边界 hover 可命中（10px 带），拖拽
   实时改宽、松手落定；重渲染（打字/流式）后列宽保持；vm-smoke
   可重复断言。
2. `View::Table` col_widths/on_col_resize 进 View 契约；autodown
   element `table_col_widths` prop 进 schema（vue 臂忽略注记）。
3. vue 轨零回归（engine 表格渲染面零改动；app.at 仅加 VM 消费的
   prop 与 handler）。
4. DEBTS 040 表格行销号；README/头注收口；EDITOR-CONTRACT 增
   VM 表格列宽面。

## 架构方案

```
View::Table（view.rs:506-513 扩字段）
  { headers, rows, spacing, col_spacing, style,
    col_widths: Option<Vec<f32>>,        ← 新：应用（Some=固定列宽）
    on_col_resize: Option<M> }           ← 新：(表键, col, width) 落定消息
        │
renderer.rs 表格 lowering（实施时核 build_table 现状）
  布局：col_widths Some → 列按固定宽；None → 自然宽（现状）
  交互：表头行 PointerArea（bounds 现场先例）→ 列边界命中
  （x 累积 vs 边界±5px）→ Drag 态（临时宽实时绘制，code_editor
  Drag enum 模式）→ 松手发 on_col_resize 消息
        │
autodown_render.rs Table 臂（:431-453）
  render 入参携 table_widths: Map<表键, Vec<f32>>
  （沿 044 定稿的参数形态：_with 加参或 RenderExtras struct）
  表键 = block_key(表块)  →  View::Table { col_widths: map[键],
    on_col_resize: closure 捕获键 }
        │
aura_view_builder.rs 两臂（:1454-1461 / :2557-2562 邻区）
  autodown element 新 prop table_col_widths 绑定求值 → render 入参
        │
demo app.at（DSL 状态回路）
  state: table_widths = Map<str, List<f32>>
  handler_OnColResize($event): table_widths[$event.table] =
    set($event.col, $event.width)      ← 消息 payload 写 map
  autodown element: table_col_widths: .table_widths   ← 绑定回传
```

**vue 轨不回归保证**：engine 的 tableStreamFace/TableBlockWidget/
useTableColumnResize 零改动；app.at 新增 prop 在 vue 生成臂无消费方
（StreamingRenderer props 无此项，schema 描述注记 vue arm ignores）；
demo e2e 全套过即证明。

## 技术栈

- auto-lang（Rust，043 折入后的 master）：`crates/auto-lang/src/ui/
  view.rs`（View::Table 扩字段）、`ui/iced/renderer.rs`（表格
  lowering 消费 + 命中/拖拽）、`ui/iced/pointer_area.rs`（bounds
  先例参照）、`ui/autodown_render.rs`（Table 臂 :431-453 + render
  入参扩展）、`ui/aura_view_builder.rs`（两臂新 prop 消费）、
  `ui/render_support.rs`（props 认知清单）、`schema/aura.at`
  （autodown element 增 prop）、`ui/snapshot_builder.rs:394-420`
  （Table 节点 props 增 col_widths）、`ui/mcp_server.rs`（action
  扩展沿 043 模式）、DEBTS.md
- auto-down：`demo/auto/src/front/app.at`（state + handler + prop
  绑定 + regen）、`demo/auto/vm-smoke.mjs`（断言组）、
  `demo/auto/README.md`（:42 豁免行）、`DEBTS.md`（:41）、
  `packages/engine/EDITOR-CONTRACT.md`（VM 表格列宽面注记）
- 无新依赖

## 需求分析与背景调查

（spec store 离线，以 2026-09-03 双仓实勘为据，worktree
auto-down-dev @ 058aa7df5；spec 台账 goals 沉淀至 P040。）

- **vue 金标**（useTableColumnResize.ts，173 行全量）：零响应式
  状态全闭包（L4-9）；命中 = 任意 cell 右边缘 right-6~right+4 的
  10px 带（L69-72 isNearEdge）；悬浮指示线 = body 挂 fixed 2px 竖线
  div（L11-26）；freezeTableLayout（L74-88）——把每列自然宽快照进
  th.style.width/minWidth 再切 tableLayout fixed；onDrag 写
  th.style.width+minWidth（L132-141，`max(40, startWidth+dx)`，
  无 colgroup 全仓零使用）；不持久化重渲染即丢；接线在
  StreamingRenderer containerRef（app_ext.ts:54-55）；
  TableBlockWidget 的 resize-handle button 纯装饰无事件
  （TableBlockWidget.vue:153）。
- **engine 表格面**：tableStreamFace 纯 table+v-html（block-widget-
  panels.ts:49-61，props 仅 columns/rows 文本）；view 面
  registerPanel('Table')（:75-90，cell cls 按 align）;TableBlockWidget
  无列宽 props（:8-18）；CSS 无 table-layout（=auto，width:100%，
  autodown-editor.css:173-195）；e2e 无拖拽用例（stream-tri-state.
  spec.ts:66-81 只断言手柄存在）。
- **VM Table 臂**：autodown_render.rs:431-453——首行作 headers、
  cell 走 render_inlines，产出 View::Table{spacing:0,col_spacing:8,
  style:家族 chrome.outer}；不消费 cell attrs（align 也不消费）；
  family chrome FAMILY_TABLE（autodown_blocks.rs:242-254）。
- **块 attrs 通道**：parse_blocks 的 cell align 有
  （markdown_parser.rs:1683-1710 → WNode.align → attrs "align"
  :2874）、IAL colspan/rowspan 有（:2995-3018）——**无任何宽度
  attr**（列宽状态不进块模型，与 vue 同向：不回写文档）。
- **iced 交互先例**：View::MouseArea + 自定义 PointerArea
  （view.rs:627-647；pointer_area.rs:155-186 事件现场 layout
  bounds + 33ms 限频）；code_editor 滚动条自绘拖拽全链（Drag enum
  core/mod.rs:227-234、thumb 命中 :1219-1231、矩形计算 core/
  render.rs:355-398、绘制 iced/widget.rs:490-493）；LayoutCollector
  运行期子元素边界可查（layout_collector.rs:14-24，renderer.rs:
  12409-12413 消费）；文档滚动 = 原生 iced scrollable+样式
  （renderer.rs:2328-2348，无自绘拖拽）。
- **mcp/snapshot**：action 枚举无 drag（mcp_types.rs:96-113，
  mcp_server.rs:609——043 已加/将加 scroll，本计划再扩沿同模式）；
  snapshot View::Table → 节点 kind "Table"、props[rows,cols,
  spacing,col_spacing]、actions 空（snapshot_builder.rs:394-420）。
- **编辑态**：VM 编辑壳表格=只读容器块（core.rs:6、:1365
  table_to_markdown）；vue TableEditorController 无列宽状态
  （table-editor-controller.ts 全文）——双轨编辑态都无列宽概念。

## 详细设计

1. **T1 View::Table 扩字段**：`col_widths: Option<Vec<f32>>` +
   `on_col_resize: Option<M>`，构造点与 builder（view.rs:1253/:2218）
   补默认；命中几何纯函数 `col_boundary_hit(x, widths, band) ->
   Option<col_index>` 同文件或 render 侧工具位。单测：构造/默认/
   命中函数（带内/带外/末列）。
2. **T2 renderer 列宽应用**：表格 lowering 的列布局改分派——
   col_widths Some 按固定 px 分列（长度不齐截断/不足补自然宽），
   None 走现状自然宽；表头与体列同源。单测：两态 lowering 结构
   断言（沿 renderer 既有表格测试模式）。
3. **T3 命中 + Drag 态 + 消息**：表头行包 PointerArea（或等价
   bounds 现场）→ col_boundary_hit（10px 带）→ Drag 态存
   {col, start_x, start_w}（code_editor Drag 模式）→ 拖拽中临时宽
   直接进绘制（不进 state）→ 松手 clamp（min 40）发
   on_col_resize(closure 捕获表键 payload (表键, col, width))。
   单测：命中→Drag→松手消息可达（headless 模拟坐标序列）。
4. **T4 render 入参 + Table 臂发射**：render_document_with 沿 044
   定稿形态增 table_widths 入参（044 收敛 RenderExtras 则挂 extras，
   否则加参——以 044 复审记录为准）；Table 臂 :431-453 发射
   col_widths=map 取值 + on_col_resize closure 捕获 block_key。
   结构测试：renders_table_with_widths（有/无 map 两态 + 消息
   closure 发射断言）。
5. **T5 契约 prop + 消费臂**：schema/aura.at autodown element 增
   `table_col_widths`（类型 Map<str,List<f32>>，描述注记 vue arm
   ignores — VM v1）；aura_view_builder 两臂绑定求值传 render；
   render_support.rs props 认知清单同步；发射测试（含 vue 臂忽略
   断言）。
6. **T6 DSL 状态回路**：app.at state `table_widths: Map` +
   OnColResize handler（payload 写 map：`table_widths[$event.table]
   = set($event.col, $event.width)`）+ autodown element
   `table_col_widths: .table_widths` 绑定；regen。验证：demo e2e
   全套零回归（vue 臂无消费方）。
7. **T7 snapshot/mcp + vm-smoke**：snapshot_builder.rs Table 节点
   props 增 col_widths（Some 时）；mcp action 增 `drag`（press→
   move 序列→release，或专用 `resize_col`，沿 043 scroll 动作
   模式——实施时按 PointerArea 事件面定形态）；vm-smoke.mjs 增
   断言组：拖表头边界 → state.table_widths 非空 + snapshot
   col_widths 变化。
8. **T8 文档收口 + 全量回归**：DEBTS.md:41 表格行销号、README:42
   豁免行更新、EDITOR-CONTRACT 增 VM 表格列宽面（常量口径 10px/
   min40/px 单位/松手落定语义/编辑态不含）；`cargo test -p
   auto-lang --features autodown,code-editor` 全绿 + demo e2e
   全套 + vm-smoke 净窗三连。

## 测试设计

- rust 单测：命中纯函数（带内/外/末列/clamp）、col_widths 两态
  lowering、Drag 全链消息可达（headless 坐标模拟）、Table 臂发射
  两态、消费臂发射断言（新 prop consumed + vue 臂忽略注记一致）。
- demo e2e：全套回归（vue 轨零改动证明）；不新增 vue 用例（功能
  VM-only）。
- vm-smoke：新断言组（拖→state→snapshot 三点）。
- 手验：拖拽实时反馈 + 重渲染保持截图留档。

## 验收标准

1. VM demo 表头列边界 10px 带可命中，拖拽实时改宽（min 40px），
   松手落定，打字/流式重渲染后列宽保持；vm-smoke 断言过。
2. View::Table col_widths/on_col_resize 与 autodown element
   table_col_widths prop 在 schema/契约文档在册（vue 臂忽略注记）。
3. vue 轨 engine 零改动、demo e2e 全套绿。
4. `cargo test -p auto-lang --features autodown,code-editor` 全绿。
5. DEBTS 040 表格行销号；README/头注无「表格列宽 ignored」残留。
6. 验收口径 = 行为对齐非像素对齐（三常量 10px/40px/px + 交互
   语义对齐；列宽具体像素值与浏览器 auto 布局不要求一致）。

## 执行步骤

- T1 view.rs View::Table 扩两字段 + builder 补默认 + 命中纯函数
  + 单测。验证：`cargo test -p auto-lang --features
  autodown,code-editor view`。
- T2 renderer.rs 表格 lowering col_widths 两态分派 + 结构单测。
  验证：`cargo test -p auto-lang --features autodown,code-editor
  renderer`（新测 + 既有表格测全绿）。
- T3 表头 PointerArea 命中 + Drag 态 + 松手消息 + headless 全链
  单测。验证：`cargo test -p auto-lang --features autodown,
  code-editor table_resize`（命名过滤新套件）。
- T4 autodown_render.rs 入参扩展 + Table 臂发射两态 + 结构测试。
  验证：`cargo test -p auto-lang --features autodown,code-editor
  autodown_render`。
- T5 schema/aura.at 新 prop + aura_view_builder 两臂消费 +
  render_support 清单 + 发射测试。验证：`cargo test -p auto-lang
  --features autodown,code-editor aura`。
- T6 app.at 状态回路 + regen。验证：`cd autodown/demo && npx
  playwright test`（全套零回归）。
- T7 snapshot col_widths + mcp action 扩展 + vm-smoke 断言组。
  验证：净窗 `auto run -r vm` + `node demo/auto/vm-smoke.mjs`
  退出码 0。
- T8 文档收口（DEBTS:41/README:42/EDITOR-CONTRACT）+ 三连全量
  回归。验证：grep 旧注记零命中 + 三命令退出码 0，记复审记录。

## 复审记录

（待执行后填写；/auto-plan:review 补 spec-impact。）

## 待澄清事项

- **[2026-09-03 执行前记] auto-lang 依赖基座裁定**：044 reviewed 未 merge，其 auto-lang 侧 7 commit 仍在 `auto-down-dev`（@129d767fb）未折入 master；`auto-down-dev` 分支名被 044 存活 worktree 占用（git 禁双检出）。045 的 auto-lang worktree 基于该分支尖建新分支 `auto-down-045-dev`（组目录 `.wt/auto-045/auto-lang`），后续折入时 044+045 commit 一同入 auto-lang master（两者届时均已过复审门）。044 定稿形态确认：`render_document_with` 未收敛 RenderExtras、直加参 → 045 T4 加第 5 参 `table_widths`。
- ① renderer 表格 lowering 的现状内部结构（View::Table 在
  renderer.rs 的具体 build 函数与列组织方式）实勘未及——T2 实施
  时先读该函数再定分派点；若表格以逐行 Row 拼装，col_widths 需
  在行级统一消费（列宽表贯穿每行），不影响契约面。
- ② mcp 动作形态（通用 drag 序列 vs 专用 resize_col）按 PointerArea
  事件面实施时定夺，以 vm-smoke 可重复断言为准；若 PointerArea
  不在 snapshot 暴露 target，允许对 Table 节点直发 resize_col
  （跳过坐标命中层，命中层由 rust 单测覆盖）。
- ③ 列宽 map 键用 block_key 内容哈希在表内容微变（如改一个字）时
  重置列宽——若实机体验认为应保持，允许降级为「表位置索引键」
  （重排才重置），两案都不动契约，实施时在本节记录所选案。
