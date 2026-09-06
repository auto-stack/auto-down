---
plan_id: PLAN-055
status: drafting
feature_name: VM 编辑臂表格编辑器（表格形式对齐只读臂 + cell 可编辑 + 列宽拖拽）
author: [zhaopuming, ZCode]
created_at: 2026-09-06
updated_at: 2026-09-06

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 0
total_steps: 8
---

# [PLAN-055] VM 编辑臂表格编辑器

## 变更摘要

PLAN-054 将 VM 编辑臂表格以**只读管道文本行**呈现（Seg::Raw，无布局槽、不可
编辑），并在待澄清③预留"若验收期望可编辑，需另行立项"。用户实机验收后裁定
期望升级：**编辑臂表格应形式上与只读臂基本一致（真表格外观），且 cell 可编辑、
列宽可拖拽**——参考既有详细实现：vue 轨 P037-2 `TableBlockWidget` 三模式
（edit 面 = contenteditable 单元格 + blur 提交 + 行列结构动词工具栏；view 面 =
表格 + 列宽拖拽把手）与 VM 只读臂 P045-2（`View::Table` 列宽状态 + 列边界
命中拖拽 + DSL 状态回路）。本计划把表格从"只读固化段"升级为 VM 编辑壳内的
**一等可编辑表格**。

## 目标

- **G1** 表格形式对齐：编辑臂表格与只读臂基本一致——表头行样式（muted 底/
  加粗）、行分隔线、列分隔线、单元格 padding；不再是管道文本行。
- **G2** 单元格可编辑：点击 cell 聚焦、caret/选区/键入正常；编辑后内容经
  emit 往返回写 markdown 表格。
- **G3** 列宽可拖拽：列边界命中带拖拽实时重排，落定保留（对齐 P045-2 的
  只读臂拖拽手感）。
- **G4** 往返安全：表格编辑后 emit 的 markdown 重解析结构不变（含 `\|`
  转义）；结构操作（Enter/Backspace 合并）在表格内安全降级。

## 架构方案

延续 PLAN-054 已落地的"骨架归因 + 逐叶 chrome"三件套（walk_skeleton_attribution
/ LeafAttrib / DrawItem），不引入新机制族：

- **Seg::Table 结构化**：`Seg::Raw(table_to_markdown)` → `Seg::Table { rows }`，
  rows[r][c] = cell 内 segs（首行=表头，各 cell 为独立 Paragraph 叶 buffer，
  可聚焦可编辑）。数据源 = build_walk 的 Table 臂（row/cell 两级展开）。
- **网格几何归因**：LeafAttrib 增 cell 槽 (table_key, row, col, x, w)。
  列宽状态 = core 内 `table_widths: Mutex<HashMap<u64, Vec<f32>>>`
  （table_key = 结构位置哈希），默认等分；cell 内文字按列宽 wrap。
  行高 = 行内最高叶。
- **表格 chrome 绘制**：fills 画表头底色/行分隔线/列分隔线（对齐只读臂
  table-panel 词汇：行线 1px border 色、表头 muted 底），cell padding
  ≈ px-3 py-2（12/8），文字 x/w 缩进由归因给足。
- **列宽拖拽**（P045-2 手感移植）：MousePressed 命中列边界 ±4px 带
  （优先于文本 caret 放置）→ 列拖拽态；MouseDragged 实时改宽 relayout；
  MouseReleased 落定写 `table_widths`。v1 widget+core 本地态，宿主回路
  （045 fast-path 对齐）列待澄清。
- **编辑接线**：locate_leaf 增 `TableSlot { table_pos, row, col }`；Enter/
  Backspace-merge 在表格叶内降级（同 callout/details 策略——soft 换行/
  禁合并）。表格为**固定结构**：无增删行列/删表操作（用户裁定
  待澄清①，2026-09-06——结构动词与表格结构操作协议后续单独讨论）。
- **emit 往返**：emit_seg(Table) 逐 cell 取 live text → 管道行 + 分隔行
  （`\|` 转义沿用 spans_flat 口径），编辑后往返保留结构。

## 技术栈

- 实现面：auto-lang `crates/auto-lang/src/ui/autodown_editor/{core.rs,
  widget.rs}`（Seg/attribution/render_frame/输入）+ `autodown_blocks.rs`
  （表格 chrome 常量单源）；dep worktree 模式（同 053/054）。
- 验证面：本仓 `autodown/demo` 净窗 vtree/截图 + px-measure/px-crop 探针；
  auto-lang `cargo test -p auto-lang --lib --features autodown`（新增单测）
  + `cargo tf`。

## 需求分析与背景调查

- **来源**：用户 2026-09-06 实机反馈（附截图）——054 只读管道行方案验收
  不满足，裁定"编辑臂表格形式上应与只读臂基本一致，cell 可编辑、列宽可
  拖拽"，并指认既有详细实现为参考。
- **参考实现 A（vue 轨，P037-2）**：`packages/engine/auto/editor/
  table_block_widget.at` 三模式家族 widget——edit 面 = contenteditable
  cells + `TableEditorController`（七动词：AddRowAbove/AddRow/DeleteRow/
  AddColumnBefore/AddColumn/DeleteColumn/DeleteTable/CellBlur，blur 提交）；
  view 面 = tablePanel（thead/th resize 把手 + tbody/td + BlockChildren
  挂载）。
- **参考实现 B（VM 只读臂，P045-2）**：`View::Table` 列宽状态
  （`table_col_widths` 按表键）+ 列边界 10px 命中带拖拽（widget-local
  临时宽 + 落定消息 fast-path 写宿主状态）+ `table_key` 内容哈希单源。
- **本计划承接**：P053-2/PARITY（编辑壳家族对齐线）续进；PLAN-054 W2 的
  骨架归因/DrawItem 基座直接复用；PARITY #12（编辑面能力差——长期线）的
  表格子项自此立项清偿。
- **边界**：054 澄清③"只读呈现"被用户裁定升级为可编辑，本计划即该
  "另行立项"；行列结构动词（增删）v1 不做（待澄清①）。

## 详细设计

### D1 Seg::Table 结构化（G2 基座）

build_walk Table 臂：`rows[r][c] = Vec<Seg>`（cell 内段，当前 parser cell
= 单段落 inlines → 单 Leaf）；BlockBuf 逐 cell 建入（Paragraph kind）。
emit_seg(Table)：cells live text → `| c1 | c2 |` 行 + 首行后 `| --- |`
分隔行；cell 内 `|` → `\|`（spans_flat 口径）。往返单测：编辑 cell 文本
→ emit → 重解析结构一致。

### D2 网格几何归因（G1/G3 基座）

walk_seg 增 Table 臂：`table_widths` 取列宽（缺省 = 可用宽/列数 等分），
逐 cell 递归 walk（x_base += 列累计宽 + cell pad）。LeafAttrib 增
`cell: Option<(key, row, col, w)>`；行高 = 行内叶 max(total_h)（实现：
按行分组两遍布局——先量后摆，或同 y 布局 + 行末对齐推进；执行期按对
render_frame 扰动最小裁定）。locate_leaf 增 TableSlot；Enter/Backspace
表格内降级（禁拆/禁合并）。

### D3 表格 chrome（G1）

fills：表头行底色（muted 档，随主题）、行底 1px 分隔线、列间 1px 分隔
线、cell padding 由归因 x/w 直接给足（文字 x = cell.x + 12，wrap 宽 =
cell.w − 24）。chrome 常量（pad/线色/表头底色）入 autodown_blocks 单源，
只读臂 table 词汇对齐。

### D4 列宽拖拽（G3）

widget MousePressed：先于 caret 命中做列边界判定（命中带 ±4 逻辑 px，
y ∈ 表格行区）→ 进入拖拽（记录 table_key + col）；MouseDragged 更新
core 拖拽列宽（min 宽 48px 钳制）实时 relayout；MouseReleased 落定写入
`table_widths`（持久于 core，表结构变更时按列数重置/裁剪）。宿主回路
（045 fast-path 写 `table_col_widths` 状态）列待澄清②。

## 测试设计

| 门 | 内容 | 命令（cwd=auto-lang 除注明） |
|---|---|---|
| 单测 | Seg::Table build/emit 往返（cell 编辑后结构一致、`\|` 转义） | `cargo test -p auto-lang --lib --features autodown autodown_editor` |
| 单测 | 网格几何：cell x/w 归因、列宽默认等分、拖拽改宽后 relayout | 同上（新增单测） |
| 单测 | 定位/降级：TableSlot 命中、Enter/Backspace 表格内降级 | 同上 |
| 集成 | VM 净窗截图：两臂表格形式同构（表头/行线/列线）；cell 键入；列拖拽前后对比 | 本仓 demo：MCP type/scroll + px-crop |
| 回归 | auto-lang 全量 tf（唯一红=charts 既有+kitchen_sink master 继承） | `cargo tf --no-fail-fast` |
| 回归 | 本仓 playwright 全量 + autodown 单测 | `npx playwright test`（demo） |

## 验收标准

1. 编辑臂表格形式与只读臂基本一致：表头样式、行/列分隔线、cell padding
   （净窗截图并排对照）。
2. cell 可编辑：点击聚焦 caret、键入即时生效、选区可用；编辑后 emit 往返
   保留（autoui_state + 重解析单测）。
3. 列宽可拖拽：列边界命中带拖拽实时重排、松手落定保留；两臂各自独立
   拖拽互不串扰（净窗操作录证/前后截图）。
4. 表格内结构操作安全：Enter/Backspace 不破坏表格结构（单测）。
5. 回归绿：tf（唯一红=charts 既有 + kitchen_sink master 继承红）、
   playwright 全量、autodown 单测全绿。

## 执行步骤

### W1 结构与几何

- [ ] **T1** Seg::Table 结构化：build_walk Table 臂逐 cell 建 Paragraph
  叶（首行表头标记），替换 Seg::Raw 臂；ThematicBreak 维持 Raw。
  文件：`crates/auto-lang/src/ui/autodown_editor/core.rs`。
  验证：`cargo test -p auto-lang --lib --features autodown autodown_editor`
  （既有管道行测试 T7 按新形态改写：`table_pipe_lines_visible_in_edit_arm`
  → 表格 chrome 断言）。
- [ ] **T2** emit 往返：emit_seg(Table) 管道行发射（cell live text、`\|`
  转义、分隔行）；单测：cell 编辑后 emit 结构一致。
  验证：同上 + 新增 `table_emit_roundtrip_after_cell_edit`。
- [ ] **T3** 网格几何归因：table_widths 状态（等分缺省）+ LeafAttrib.cell
  （x/w/row/col）+ 行高对齐；render_frame 按 cell x/w 布局（wrap 生效）。
  验证：新增 `table_grid_geometry_attributed` 单测（cell x/w 断言）。
- [ ] **T4** 表格 chrome 绘制：表头底色/行线/列线/padding 常量入
  autodown_blocks + fills 落地。验证：新增 `table_chrome_drawn` 单测
  （fills 断言）+ 净窗截图对照只读臂。

### W2 编辑与拖拽

- [ ] **T5** cell 编辑接线：locate_leaf 增 TableSlot；Enter/Backspace
  表格内降级（软换行/禁合并）；点击 cell 聚焦 caret。验证：新增
  `table_cell_editing_and_degraded_structure` 单测。
- [ ] **T6** 列宽拖拽：列边界命中带（±4px）+ 拖拽 relayout + 落定写
  table_widths（min 48px）。验证：新增 `table_column_drag_resizes` 单测
  （模拟 MousePressed/Dragged/Released 序列）。
- [ ] **T7** 净窗集成验证：两臂表格形式对照截图；cell 键入 + 列拖拽操作
  录证（MCP type + 前后 px-crop）；往返 state 断言。
  验证：净窗截图入册 + autoui_state 断言。
- [ ] **T8** 回归与折回：`cargo tf --no-fail-fast` + 本仓 playwright 全量
  + autodown 单测；折回 auto-lang master + 簿记（提交带 PLAN-055）。
  验证：计数落复审记录。

## 复审记录

（待 /auto-plan:review 填写）

## 待澄清事项

1. **行列结构动词**（vue 编辑面的七动词：加删行列/删表）：**【已裁定
   2026-09-06（用户）】本轮不做**——编辑臂表格按固定结构处理（行列数
   不变、无增删行列/删表操作）；结构与表格结构操作协议后续单独讨论
   （另立计划或并入 PARITY #12 对应轮次）。
2. **列宽落定通道**：编辑臂 core 本地态（v1 默认）vs 对齐 045 fast-path
   写宿主 `table_col_widths`（两臂列宽共享一份状态）？（建议 v1 本地态，
   两臂独立拖拽；宿主回路随状态同步契约计划）
3. **表头行可编辑性**：vue 编辑面 thead 单元格同样可编辑——VM 侧建议
   一致（表头=普通可编辑叶 + 表头样式）；若需"表头只读"另行裁定。
4. **列宽默认策略**：等分（v1 默认）vs 内容优先测量（cosmic 量宽取
   max+padding，列多时挤溢出需钳制）？（建议 v1 等分 + 拖拽后记忆）
