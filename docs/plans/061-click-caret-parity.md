---
plan_id: PLAN-061
status: execution_done
feature_name: 双轨点击落点对齐（块首点光标交接 + 容器点击归属 + 表格单元格聚焦）
author: [zhaopuming]
created_at: 2026-09-09T17:45:00+08:00
updated_at: 2026-09-09T22:10:00+08:00
plan_revision: 1
current_step: 6
total_steps: 6
supersedes_spec_components: []
new_spec_components: []
touched_goals:
  - "P034-1: RichTextHost 基础 widget（语义化宿主 chrome .at 单源 + IME/选区接线归 ext 桥）+ 文本叶子块编辑面切换 + VM 端宿主契约冻结——文本叶块编辑面的挂载落点（网页轨 click-caret 交接的宿主面）"
  - "P025-2: 容器块编辑（聚焦路径下沉装配 + 列表/引用结构命令 + 输入规则容器化修复）——深选规则（点击容器 → 第一个可聚焦后代）被本次「点击归属」解析覆盖"
  - "P037-2: Table 家族化收官（table_block_widget.at 三模式）——表格编辑面挂载聚焦（本次新增 cellId 交接 + .Init 消费）"
  - "P060-2: 双轨块键编辑 UX 三项对齐（标题回车降级 + 空块退格合并 + 跨块垂直导航）——姊妹计划（块键维度），本计划为点击落点维度的续对齐"
  - "P057-2: VM 编辑链路——真实键盘回写（048）+ doc editor MCP 逐键/拖拽合成通道（055 D2）——本计划 VM 核对的实机通道"
  - "P046-2: VM demo 对齐 vue 版（两栏布局收编 + 平台差异清册）——PARITY 登记纪律"
---

# [PLAN-061] 双轨点击落点对齐（块首点光标交接 + 容器点击归属 + 表格单元格聚焦）

## 变更摘要

用户 2026-09-09 在运行中的 demo（网页轨，`localhost:5173`）人工复核块编辑交互，
报告：**任何未聚焦块的首点都把光标扔到块末尾**；容器类（列表 / Callout /
Details）与表格另有「点错对象 / 编辑面完全不聚焦」的加码缺陷。本次已在
**网页轨**全部落地并留证（工作区未提交）；本计划把同一语义对齐到 **VM/Rust 轨**
（auto-lang iced 编辑壳 `crates/auto-lang/src/ui/autodown_editor/`）。

三项语义（网页轨已落地 = 本计划 VM 轨的验收基准）：

1. **文本叶块首点**：Heading / Paragraph（含行内标记）第一次点击 → 光标落在
   **点击处字形**，不再是块末尾。根因：点击只做「选中块」（`selectBlock`，块粒度），
   随后预览面被编辑面整体替换（DOM replacement），浏览器无法把光标带过去，各编辑面
   只能退回自己的挂载默认值（文本宿主 `caretToEnd`、代码/数学 textarea 的
   `setSelectionRange(end, end)`）。
2. **容器点击归属**：折叠的列表（无序 / 有序 / 任务）、Blockquote、Callout、
   Details 首次点击 → 焦点落在**被点中的那一项**（不再是最深选规则的第一个子叶），
   光标落在点击处。修复前实测：点列表第 2 项文字 → 聚焦第 1 项且光标在其末尾。
3. **表格单元格聚焦**：表格预览里点击单元格 → 编辑面聚焦**该单元格**并把光标落在
   点击处。修复前：表格编辑面（`contenteditable` 单元格网格）挂载后不聚焦任何元素，
   首点后连光标都没有。

边界（两轨一致，不作为缺陷）：数学 / Mermaid 预览显示渲染结果、无源文本坐标可映射，
光标仍落末尾；Callout 标题栏与 Details 摘要行属于各自的就地编辑面（AttrHost）或
非编辑 chrome，不走此交接。

VM 轨现状（初勘，待 T-04 实证）：iced 编辑壳的点击是**单趟字形命中**——
`handle_mouse_press`（core.rs:1162）先 `hit_test`（core.rs:2047）定块，再以
`Action::Click { x, y }`（core.rs:1219）走 cosmic-text 命中定字节 →
`locate_leaf`（core.rs:2703）解析叶槽（引用内叶 / 列表项 / 表格 cell 各为独立叶
buffer，PLAN-055 起 cell 一等可编辑）。**结构上不存在「预览面 → 编辑面替换」这一步，
故三项语义疑已天然达标**——本计划以探针实证 + 差异收口为主，不做无证据的改动。

## 目标

- VM/Rust 轨三项点击语义与网页轨逐项对齐，验收基准 = 本计划 AC-01..AC-03
  （网页轨 e2e 即行为说明书）。
- 差异（若有）以最小改动收口，Rust 单测 + MCP 9359 合成探针（`__mcp_click`，
  `vm-060-probe.mjs` 先例）+ 截图留证。
- 网页轨本次改动（工作区）随本计划入库；`PARITY.md` 清册增第 19 行，随 VM 侧
  收口销行。
- 非目标：不改两轨的编辑语义本身（不引入字形级正上方匹配、不动深选规则的键盘
  路径消费方）；不动 demo / showcase 文档内容源码；不触碰 web-only 块（数学 /
  Mermaid）的降级 chrome 裁定（PARITY #9）。

## 架构方案

- **两轨互不依赖**（auto-lang Cargo.toml 无 autodown-core 依赖，PLAN-060 已核实）→
  语义对齐只能手工，这正是本计划存在的理由；基准取网页轨本次落地的语义。
- **网页轨机制（本次已落地，参考实现）**：
  - 通道模块 `src/editor/engine/click-caret.ts`：单槽 pending store，键 = 将要挂载
    的编辑面的块 id；载荷三类——`{ dx, dy }` 点（相对该块渲染元素）、`offset`
    （代码块 textarea 的明文偏移）、`cellId`（表格单元格）。
  - **捕获**：`slotChrome.onClick`（EngineEditor.vue:617-635）先 `resolveClickHit`
    解析点击归属，再 `captureClickCaret`；**只对可消费的命中记录**（`if (hit.anchor)`，
    :633）——否则会清掉代码块在 pre 上自记的偏移（本轮实测回归过一次，
    `codeblock-click-caret` 两用例即该守卫的钉死）。
  - **解析**：`resolveClickHit`（click-caret.ts:224）——叶块 → 自身；表格 →
    `caretRangeFromPoint` 命中 `th/td` + 行列定位（`tableCellIdOf`:212）；折叠容器 →
    把渲染管线的**叶包装**（`.node-slot` 且无嵌套者，`leafWrappersOf`:181）与模型的
    **原子子叶**（递归展开容器、跳过透明 ListItem，`atomicDescendantsOf`:168）按
    文档序一一配对，取点击点所在包装，得到被点中的子叶；包装数 ≠ 子叶数则回退深选
    （保守：不猜）。
  - **聚焦**：`selectBlock(id, deepTargetId?)`（EngineEditor.vue:828）——解析出的
    子叶优先于深选默认（「容器从不直接宿主」规则不变）。
  - **消费**：文本宿主 `mountHost(html, blockId)`（rich_text_host_ext.ts:84）挂载后
    以 `placeCaretAtPoint`（click-caret.ts:101）用**同一 caret API** 在宿主自己的
    字形上重解点（两面布局等价 → 落同一字形，行内数学 / 维基链接的 DOM 展开不会
    干扰）；表格 `focusPendingCell`（table_block_widget_ext.ts:48）聚焦
    `[data-cell-id]` 单元格并落点；代码块沿用其明文偏移载荷（已归并进同一 store）。
- **VM 轨落点（待核对）**：`handle_mouse_press` 已一趟完成「定块 + 定字节」；
  表格 cell 自 PLAN-055 起是独立叶 buffer 且布局矩形即命中域（core.rs:1517）；
  列表项 / 引用内叶由 `locate_leaf` 解析。核对口径 = `__mcp_click` 合成点击三类
  目标，断言焦点块 / 叶槽与 caret 字节偏移。
- 平台差异登记：`autodown/demo/auto/PARITY.md` 第 19 行。

## 技术栈

- 网页轨：Vue 3 + TS（`@autodown/engine`，src 直连）；Playwright e2e（`demo/e2e`）；
  vitest + happy-dom 单测。
- VM/Rust 轨：Rust + iced + cosmic-text（auto-lang `crates/auto-lang/src/ui/autodown_editor/`
  core.rs / widget.rs）；headless 单测（core.rs tests 模块，构造 BlockBuf + 合成
  `DocInput::MousePressed`）；MCP 9359 合成通道（`AUTOUI_MCP_PORT=9359 auto.exe run -r vm`，
  `__mcp_click` 经 mcp_server.rs:1301/1566 → renderer.rs:11633）。
- 门禁：auto-down 侧 engine 单测 + demo e2e 全量 + `vue-tsc -b` + `vite build` +
  `assert-editor-gen`；auto-lang 侧 `cargo test -p auto-lang --features autodown --lib`
  （触达模块 + 与 master 基线的逐名差集口径）。

## 需求分析与背景调查（spec 台账锚点）

- P034-1 / P025-2 / P037-2：网页轨三处既有契约（文本宿主挂载落点、容器深选规则、
  表格编辑面）——本次在其上补「点击位置」维度。
- P060-2：块键维度双轨对齐的姊妹计划（方法论沿用：网页轨先落地留证 → VM 轨核对 /
  对齐 → PARITY 登记）。
- P057-2：VM 编辑链路 MCP 合成通道——本计划 VM 核对的唯一实机通道。
- P046-2：平台差异清册纪律（立案登记 / 收口销行）。
- **网页轨现状证据（2026-09-09 本次实测，live demo 逐点）**：
  - 修复前：H2 "Heading Two" 点 `i`（明文 offset 4）→ caret 11（末尾）；段落点
    offset 33 → 63；列表点第 2 项 → 焦点落第 1 项 + caret 15；引用 → 60；
    Callout → 85；表格单元格点击后无任何聚焦。
  - 修复后：同点位逐项复核 caret = 点击位（heading 4 / 段落 33 / 列表第 2 项 3 /
    Callout 12 / 表格 "Bar" 单元格 `block-14-r1-c0` caret 1 / 代码块对照 selStart 1）。
  - 代码锚点：click-caret.ts:64/76/90/101/160/168/181/212/224；EngineEditor.vue:301/
    617/628/633/828；rich_text_host_ext.ts:84；code_block_widget_ext.ts:167/180；
    table_block_widget_ext.ts:48；focus-path.ts 导出 `COMPOSITE_CONTAINER_KINDS`。
  - 用例：单测 `src/editor/__tests__/click-caret.test.ts`（14 例）；e2e
    `demo/e2e/block-click-caret.spec.ts`（8 例）+ `demo/e2e/codeblock-click-caret.spec.ts`
    （2 例）；红→绿证据：临时关解析 → 容器 / 表格 6 例红；临时关捕获 → 叶块 3 例红。
- **VM 轨现状初勘（2026-09-09，auto-lang HEAD 18ab5d642）**：
  - `handle_mouse_press`（core.rs:1162-1240）：左键 → `table_boundary_hit` 列宽拖拽
    优先 → `hit_test` 定块 → 焦点 / caret 同趟写入 → `Action::Click{ x, y }`（:1219）
    以块内坐标走 cosmic-text 命中；**无预览面替换环节**。
  - `hit_test`（core.rs:2047）：矩形包含优先，未命中回落「最近块中心 y」。
  - 叶槽：`locate_leaf`（core.rs:2703）解析 TopLevel / QuoteInner / ListItem /
    表格 cell；表格 cell 自 PLAN-055 T1（core.rs:181）为独立 Paragraph 叶 buffer，
    布局 rect = 全格命中域（core.rs:1517）。
  - 合成点击通道：`__mcp_click`（mcp_server.rs:1301/1566；renderer.rs:11633），
    探针先例 `autodown/demo/auto/vm-060-probe.mjs`（含 focus=null 需先 click 聚焦
    等五条执行期发现，见 PLAN-060 复审记录）。

## 详细设计

### 网页轨（本次已完成，作为参考实现归档）

- 四段机制（通道 / 捕获 / 解析 / 消费）见「架构方案」；三条语义要点：
  1. 捕获只对「会挂载可消费编辑面」的命中记录（`if (hit.anchor)`）；
  2. 容器配对要求「DOM 叶包装数 == 模型原子子叶数」，不等即回退深选（不猜）；
  3. 数学 / Mermaid 无源坐标映射，显式不参与（`mountsRichTextHost` 判定，
     `isEditableLeaf && editSlotFor(kind) == null`）。
- 附带修正：`demo/e2e/undo.spec.ts` 与 `demo/e2e/container-editing.spec.ts` 原先
  「点击后直接打字」隐式依赖末尾落点，改为显式点到文本末尾（原意不变）；
  e2e 探针改为「Playwright 滚动 + 反复测量直至点解析进目标元素」（demo 的滚动
  同步接管 scrollTop，raw `scrollIntoView` 会被回滚导致点击落到别的块——本轮
  实测的偶发失败根因）。

### VM 轨（待执行）

- **T-04 核对**：`vm-061-probe.mjs` 用 `__mcp_click` 对三类目标各点一次：
  1. 文本叶块（Heading / 段落，含行内标记）；
  2. 容器子叶（列表第 2 项、Callout 正文、Details 正文）；
  3. 表格单元格（非首个 cell）。
  断言：焦点块 / 叶槽 = 被点中者（非首个叶）；caret 字节偏移 ≈ 点击处字形
  （容差 ≤ 1 字形）。产出「网页轨语义 × VM 现状」对照表入复审记录。
- **T-05 差异收口**（按 T-04 结果二选一）：
  - 达标 → 补 Rust 单测钉死（headless 构造 BlockBuf + 合成 `DocInput::MousePressed`，
    断言 `focused_block()` 与 caret 偏移），零逻辑改动；
  - 存在差异 → 最小改动修复。候选风险点（初勘）：
    a. `hit_test` 的「最近块回落」（core.rs:2052-2061）让空白处点击落到邻块；
    b. 表格 cell 命中域（整格）与文字区的边界（点格内空白处 caret 落点）；
    c. `Action::Click` 的块内坐标在表格 cell 路径上的换算（坐标换 cell 局部，
    core.rs:1603-1605 注）。
- **T-06 证据与清册**：探针脚本 `autodown/demo/auto/vm-061-probe.mjs` + 截图
  `vm-061-*.png`；PARITY 第 19 行销行（VM 列改 ✅ + 证据指针）；网页轨改动提交。

### 规范增量

| delta_id | add/modify/retire | target | before/after | rationale | acceptance |
|---|---|---|---|---|---|
| SD-01 | add | 引擎编辑器模块（本仓 `.autoos/specs.json` 派生台账，无 `docs/specs/` 实体目录；入账路径以归档流程为准） | 新增「点击落点交接」规则：任何非聚焦块的首次点击必须把光标落在点击处字形；折叠容器解析到被点中的子叶；表格聚焦被点中的单元格 | 三处行为此前无规格条目、仅由实现与 e2e 表达；跨轨对齐需要可引用的规则 | AC-01..AC-03 |
| SD-02 | add | 同上 | 边界条款：数学 / Mermaid 无源坐标映射（光标落末尾）；容器 chrome（Callout 标题 / Details 摘要）不参与交接 | 防止后续把「显式不参与」误判为缺陷 | AC-04 |

## 测试设计

- 网页轨（已落地）：单测 14（store 语义 10 + 解析 4）；e2e 10（叶块 2 + 容器 / 表格
  6 + 代码块 2），红→绿证据在案。
- VM 轨（待落地）：Rust 单测 2-3（文本叶块点击落点 / 容器叶槽归属 / 表格 cell
  聚焦）；MCP 探针 `vm-061-probe.mjs` 三组断言 + 截图。
- 门禁：auto-down 侧 engine 单测 820/820 + demo e2e 103/103 + `vue-tsc -b` +
  `vite build` + `assert-editor-gen`（本次全绿实测值）；auto-lang 侧
  `cargo test --lib` 与 master 基线逐名差集为空（PLAN-060 口径）。

## 验收标准

- AC-01 网页轨：任何未聚焦文本叶块（Heading / Paragraph，含行内标记）首次点击，
  光标落点击处字形（e2e 断言 offset 相等）。
- AC-02 网页轨：折叠列表（无序 / 有序 / 任务）/ Blockquote / Callout / Details
  首次点击聚焦被点中的子叶且光标落点击处（e2e 断言焦点文本 + offset）。
- AC-03 网页轨：表格预览单元格点击后编辑面聚焦该单元格（`data-cell-id`）且光标
  落点击处（e2e）。
- AC-04 网页轨：代码块交接零回归；数学 / Mermaid 与容器 chrome 的既有行为显式保留。
- AC-05 VM 轨：`__mcp_click` 三组断言 PASS（焦点对象 + caret 字节），Rust 单测钉死；
  与网页轨语义逐项对照表入复审记录。
- AC-06 门禁：两仓门禁全绿；PARITY 第 19 行登记 / 销行；探针与截图入库。

## 执行步骤

- [✅ 已完成] T-01 网页轨通道与叶块落点：`click-caret.ts` 新建（点 / 偏移 / cellId
      三类载荷）+ RichTextHost 消费（`mountHost(html, blockId)` + `placeCaretAtPoint`）
      + 代码块偏移通道归并同一 store；e2e 3 例红→绿；实机复核。
- [✅ 已完成] T-02 网页轨容器点击归属：`resolveClickHit` 叶包装 ↔ 原子子叶配对 +
      `selectBlock` 深选覆盖；e2e 3 例（无序 / 有序 / 任务）红→绿；实机复核
      （焦点落第 2 项、caret = 点击位）。
- [✅ 已完成] T-03 网页轨表格单元格聚焦：cellId 载荷 + `focusPendingCell` +
      表格 widget `.Init`（`table_block_widget.at` / `.vue` 同步，gen 逐字节复现）；
      Callout / Details 用例同批；e2e 8 例全绿 + 单测 14。
- [✅ 已完成] T-04 VM 轨核对：`vm-061-probe.mjs` 三组 `__mcp_click` 合成点击 +
      断言；产出「网页轨语义 × VM 现状」对照表。
      （2026-09-09 ALL PASS A1..A7/B1..B3：叶块首点=点击处字形 x=40→off5、
      x=120→off16 字形单调含行内标记；列表第 2 项/引用/Callout/Details 正文
      各有独立点击带归属被点中项；表格 cell geometry 快照命中 off2→8；fence
      代码行字形级 + 行尾 Down 无幻影尾行。证据 vm-061-para-caret/
      -table-cell/-fence-caret.png，提交 b6fcae6。对照表结论：三语义 VM 天然
      达标，零逻辑改动。）
- [✅ 已完成] T-05 VM 轨差异收口：按 T-04 结果补单测钉死或最小改动修复（含表格
      cell 命中边界复核）。
      （达标 → 单测钉死路径：core.rs 三 headless 单测 mouse_click_leaf_lands_
      caret_at_clicked_glyph / mouse_click_list_lands_on_clicked_item /
      mouse_click_table_lands_on_clicked_cell，scoped 3/3 绿，提交 c944f1028
      （auto-lang auto-down-dev）。）
- [✅ 已完成] T-06 门禁与清册：两仓门禁；PARITY 第 19 行销行；探针 / 截图入库；
      网页轨改动提交。
      （auto-lang worktree 全量 lib 4623 passed/201 failed，失败名集 ⊆ master
      基线逐名差集为空（master 同轮 202 红，多出的 ffi_dual_013_dep_method 为
      并行漂移且本 worktree 通过）；auto-down 主检出 engine vitest 820/820 +
      pnpm build 三 assert + demo e2e 103/103。PARITY #19 双侧 ✅（提交
      d2d6d28）；网页轨 35 文件提交 2b5c3da。观察两项登记 PARITY：空白点击
      最近块回落（VM 特有）、Details 编辑臂恒展开。）

## 复审记录

（本计划为 `/auto-plan:new` 立案稿；T-01..T-03 为立项前已落地的事实记录，随本稿
一并入档。）

- stage: new, PLAN-061 revision 1.
- outcome: pass（网页轨部分已在工作区完成并留证；VM 轨 T-04..T-06 待执行，
  无待澄清阻塞项）。
- next: work（从 T-04 起）。
- stage: work, PLAN-061 revision 1（2026-09-09 用户授权执行 T-04..T-06）。
  前置事实：同日会话已对 VM 轨完成 MCP 9359 实机核对（tmp/ 探针 + 截图，
  三项点击语义 + F1/F2 全部达标，空白回落与 Details 编辑臂恒展开两项观察
  在案）；姊妹计划撞号已解编（行内 input rules 改编号 PLAN-062）。
  next: work 继续（T-04 正式探针入库 → T-05 单测 → T-06 门禁清册）。
- stage: work | PLAN-061 | r1 | outcome: **pass** | 2026-09-09。
  code_commit：auto-down plan-061-dev 2b5c3da（T-01..T-03 网页轨 35 文件）→
  b6fcae6（T-04 探针+截图）→ d2d6d28（T-06 PARITY #19 销行）；auto-lang
  auto-down-dev c944f1028（T-05 三单测，基线 3f42de7e5）。
  task_ids：T-04/T-05/T-06（T-01..T-03 立项前已落地随 2b5c3da 入库）。
  evidence：vm-061-probe.mjs ALL PASS（A1..A7/B1..B3）+ 三截图；core.rs
  scoped 3/3；auto-lang 全量 lib 失败名集逐名差集为空（wt 201 红 ⊆ master
  基线）；auto-down vitest 820/820 + build 三 assert + e2e 103/103。
  执行期发现：①探针哨兵不得与文档既有大写撞字（D×Details → 行内容重建错位）
  ②state 桥冷启动"连续相等"误判稳定（type_text 后先等内容变化再等稳定）
  ③VM 最小化窗口布局失效——探针前置必须 screenshot 可用门 ④聚焦块编辑面
  emit 增行（ghost 移位）→ 行带按内容对齐而非行号 ⑤行带底部为行尾钳制区
  （块 padding 域点击钳行尾，非缺陷）。
  blockers：无。
  next: review（execution_done；两 worktree 留存待复审/合并折回）。

## 待澄清事项

1. **VM 轨「最近块回落」语义**：`hit_test` 在矩形外回落最近块（core.rs:2052-2061），
   点空白处会聚焦邻块；网页轨无此路径（槽外点击无效果）。是否对齐？倾向：不视为
   本次缺陷，若 T-04 探针显示可感知差异再裁定。
2. **网页轨深选规则的其余消费方**：本次只覆盖「点击」路径（`selectBlock` 带
   `deepTargetId`）；键盘路径（Ctrl+End 等）仍走首 / 末叶规则，未改。
3. **SD 条目落账格式**：本仓 specs 为 `.autoos/specs.json` 派生台账、无 `docs/specs/`
   实体目录；SD-01/02 的实际入账形态随 T-06 归档流程确定。
