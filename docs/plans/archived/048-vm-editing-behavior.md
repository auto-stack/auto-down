---
plan_id: PLAN-048
status: archived
feature_name: VM 编辑行为收尾（跨块选区 + 跨容器合并 + 输入规则补面）+ W4 空态 + W5 裁定
author: [zhaopuming]
created_at: 2026-09-04
updated_at: 2026-09-04

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components:
  - "P048-1: reports——变更摘要（VM 编辑行为收尾：跨块选区/跨容器合并/行首输入规则/undo 定稿/W4 空态/W5 裁定/IME 实机/D1 收口；执行期修复三既有缺陷：渲染栈块 id 序→dfs 文档序、Quote emit 尾行 '>' 非往返安全、overwrite 残留陈旧 undo 栈；执行期三发现登记：⑨ IME 候选窗合成通道限制、⑩ 真实键入不回写 state.content、⑪ mermaid 降级臂标签低对比）"
  - "P048-2: goals——七验收全达成（跨块选区端到端 11 测试+实机 IME 会话留档/跨容器合并 5 测试+fence 口径在册/输入规则=T1 冻结 7 条逐条绿+3 钉死不触发/undo=T1 定稿口径含陈旧栈修复红转绿/空态 placeholder 三守卫+PARITY #7 销行/W5 显式豁免+math chrome 对齐+PARITY #9 闭环+截图/IME commit 形态真窗+D1 三连跑未复现登记收口/对照表 26 组三态映射在册+抽核 7/7 命中）；autodown_editor 66/66 绿+playwright 73/73+vm-smoke exit 0×3"
  - "P048-3: architecture——跨块选区：SelAnchor{block,offset}×2 状态（doc_sel）+dfs 叶序规范化（doc_sel_range）+段表 doc_sel_spans（render 持锁变体/行为自锁变体）+逐叶矩形纯函数 push_byte_range_rects（软换行 run 钳制/空行窄条/内部空叶虚拟 1 字节）；输入通路：DocInput::MouseDragged（widget CursorMoved 映射，同叶原生 cosmic Action::Drag 不变、越叶 Click 定位+doc_sel 推进+焦点随动）+ctrl+a+shift+↑/↓ 跨块扩展（锚端保持）+普通点击折叠；跨容器合并：merge_into_previous 撤 same_host 闸+创建序≠dfs 序重编号补偿+列表项余段防御约束；行首规则：LINE_START_RULES 7 条空格键入后整块精确检定（标题 kind 迁移/骨架 wrap via replace_leaf_seg 工厂闭包）；undo：逐叶 cosmic 历史打字/删除级+overwrite_block_text 整换新 ViEditor 防陈旧栈；空态：View::AutodownEditor 扩 placeholder（043/044 扩字段模式）+render_frame 注入基色 0.55 调光灰 run（空白/只读实例/聚焦三守卫）"
  - "P048-4: designs——契约要点：布局矩形恒按块 id 索引（block_rects/on_focus 面不随渲染序改）；渲染栈恒按 dfs 文档序堆叠；doc_sel 为选区渲染单一事实源（命中段叶的块内 cosmic 选区路径让位）；copy 拼接=\"\\n\\n\" join（容器前缀忠实拼装余量登记）；fence 双侧维持不合并（代码块语义非往返安全）；嵌套列表 VM parser 扁平化不可达（余段移接为防御实现）；重编号补偿=死叶中 id<目标者计数前移；输入规则触发语义对齐 vue input-rules.ts『typed at block start, whole-block』（text === marker 全等）；删除选区时只读 Raw 段保留登记"
  - "P048-5: tests——主门：autodown_editor 37→66（29 新：选区数据/渲染/规范化/空叶窄条/文档序/copy/delete×2/ctrl+a/拖选/shift 跨块/合并×5/规则×7/undo×3/placeholder×3/重编号回归）；三既有缺陷均红转绿钉死；双门：playwright 73/73（vue 零改动证明）+vm-smoke worktree 二进制净窗三连 exit 0×3（含冷窗首跑）；全量基线口径：--lib 失败集 worktree≡master（194 共享既有并行污染失败+3 单侧 osconfig/plan050 计时 flake 隔离复跑全过；worktree 通过 4396 vs master 4374，+22 净增）——本期触碰模块零新增红；scoped：autodown_render 21/21、view 48/48、aura_view_builder 发射 2/2、cargo check 净"
  - "P048-6: reviews——复审记录（七验收逐条复验：1 附登记 pass/2-7 pass；遗漏/延后/workaround 猎查结论=待澄清①②⑥均为计划预授权收窄非擅自缩水；债候选 D1-D5；拖选真窗受控验证因宿主机被用户占用未完成——043 复审 D2 同款签核口径，合成通道证据代证+真实事件活性佐证）"
touched_goals:
  - "P048-2: VM 编辑行为收口——跨块选区/跨容器合并/行首输入规则/undo 定稿四缺口补齐+W4 空态（PARITY #7 销行）+W5 裁定（#9 显式豁免闭环）+#12 对照表底册输入；余项转介在册（shift+←/→、IME 候选窗人工步、⑩ content 回写缺口、⑪ mermaid 标签对比度）"

current_step: 10
total_steps: 10
---

# [PLAN-048] VM 编辑行为收尾 + 编辑器空态 + web-only 裁定

## 变更摘要

041 路线图「编辑行为补齐 + 语料跨轨」项的**收尾立项**（非从零）：
2026-09-04 实勘发现路线图起草（041 时期）后的并行工作已消化大半——
「批次十」结构编辑引擎已在册（core.rs:1484 起：Enter 输入规则主
入口 :1668【段落/引用内拆块、列表续项、空项退列】+ 同宿主块首
Backspace 合并 :1853 + 套件测试 :2155-2230）。剩余真缺口与搭车项：

1. **选区不跨块**（核心增量，core.rs:20 头注自陈 + Phase 3 v1
   边界 mod.rs 登记）：选中范围限单叶 cosmic-text buffer；本计划
   落跨叶选区模型（锚点块+偏移 ↔ 焦点块+偏移）+ 跨块高亮渲染 +
   跨块 copy 拼接 + 跨块删除/退格剪接。
2. **跨容器边界合并**：merge_into_previous 现仅同宿主相邻两叶
   （:1853 「fence 与跨容器边界登记余量不做」）——扩 quote 尾段 ↔
   后续外段等跨容器合并；fence 边界维持不做（口径确认入待澄清）。
3. **markdown 输入规则补面**：头注「输入规则未接线」已滞后（Enter
   规则已接）；补面 = 行首标记转换（`# `→标题、`- `/`1. `→列表、
   `> `→引用——覆盖面 T1 勘测后定稿）。
4. **undo/redo 现状勘测后补面**：:400 「输入不路由（不建 undo…）」
   与 :619 「剪贴板/undo 组合键（对齐 413 最小集）」并 存，prose
   块 undo 实际覆盖面 T1 勘测定稿，缺则补最小集。
5. **W4 编辑器空态**（PARITY #7）：aura_view_builder.rs:1529-1531
   `placeholder` 读取后忽略 → 编辑壳空态渲染（content 空时浅灰
   提示文案）+ prop 消费摘行。
6. **W5 web-only 块裁定**（PARITY #9）：mermaid/math/query 三降级臂
   （autodown_render.rs:704-709/:751/:766-771）按成本裁定——倾向
   豁免登记 + chrome 观感对齐微调，实施定稿记复审。
7. **IME 实机验证**：:514 「IME/鼠标全放行」已实现放行，实机中文
   输入过一遍作为验收口径（原路线图「IME 实机」项的收口形态）。
8. **D1 flake 搭车排查**（046 复审债候选）：vm-smoke warm-up 滚动
   收敛 flake——auto-lang 滚动测量首帧 settling 定位，可修则修、
   不可修则登记。

**验收锚更替（原锚消散）**：路线图原文「vue `semantics.test.ts`
语料移植 VM」——该文件已不存在（随 042 编辑器壳退役/重组消散，
全仓 find 零命中）；活语料改为
`autodown/packages/engine/src/editor/__tests__/` 套件
（commands/editor-engine/blockhost-rich 等），T1 提炼编辑语义用例
对照表作为移植底本。更替本身记复审。

**时序前置**：PLAN-047 折入 master（DEBTS/README/PARITY 收口同
区）；auto-lang 侧开工前 re-scan 并行会话（532-535 活跃）对
autodown_editor 模块的占用——引用一律函数锚点（D3 教训）。

## 目标

1. VM 编辑壳跨块选区：鼠标拖选跨块高亮、copy 拼接、跨块删除/
   退格剪接，焦点语义与 vue 轨行为对齐（行为对齐非像素对齐口径）。
2. 跨容器块首合并（quote 尾 ↔ 外段等）；fence 边界口径明确。
3. markdown 行首输入规则覆盖面定稿并落地（标题/列表/引用转换）。
4. undo/redo prose 块覆盖面与 413 最小集对齐（按 T1 勘测结果）。
5. 编辑壳空态 placeholder 可见（PARITY #7 销行）；W5 裁定落档
   （PARITY #9 销行或转登记）。
6. IME 实机中文输入验证通过；D1 flake 定位（修或登记）。
7. 编辑语义用例对照表在册（vue __tests__ 提炼 → rust 套件映射）；
   `cargo test autodown_editor` 全绿、demo 双门零回归。

## 架构方案

```
autodown_editor/core.rs（2556 行，cosmic-text 每叶一 buffer）
  现状：块粒度编辑——focus: Mutex<Option<usize>>（点击 hit_test 写入）
        Enter→输入规则引擎(:1668)/Backspace→merge_into_previous(:1853)
        剪贴板/undo 组合键入口(:619, 对齐 413 最小集)
        ── 缺口：选区 Vec<(Rect,Rgba)>(:320) 每叶独立；合并同宿主限
        │
T2/T3 跨块选区（核心增量）
  选区模型：SelAnchor{block_idx, offset} × 2（锚/焦点）
    → 叶序 dfs_leaf_order(:1858 既有) 求跨叶范围
    渲染：逐叶 buffer 切高亮段（既有 selection 矩形折算扩展到范围叶）
    行为：copy=范围叶文本按 emit_document 骨架拼接；delete/backspace=
        首叶尾段+尾叶首段剪接（merge 原语复用）；焦点落接缝
        │
T4 跨容器合并：merge_into_previous 撤 same_host 闸（:1868 附近）
    → 跨容器 = 摘容器尾叶 + 并入前宿主末叶（emit_document 骨架重生成
    既有原语复用）；fence 边界维持不做
        │
T5 输入规则补面：input_rule 引擎(:1668 主入口)扩行首标记转换
    （前缀命中 → 块 kind 迁移，块骨架重生成原语复用）
        │
W4 空态：aura_view_builder autodown_editor 臂 placeholder 绑定求值
    → View::AutodownEditor 扩 placeholder 字段（043/044 扩字段模式）
    → 编辑壳 content 空 && 非聚焦 时浅灰文案渲染
        │
W5 裁定：autodown_render 三降级臂 chrome 对齐 / 豁免登记（二选一）
        │
语料：engine __tests__ 用例表 → core.rs tests 模块扩展（批次十
  测试模式 :2155-2230 沿用）
```

**vue 轨零改动保证**：本计划全部落 auto-lang VM 侧（engine/engine
vue 包不碰）；auto-down 侧无 DSL 改动（placeholder prop 已在
app.at 挂载）——e2e 73 全过即零回归证明。

## 技术栈

- auto-lang：`crates/auto-lang/src/ui/autodown_editor/{core.rs,
  widget.rs,mod.rs}`（选区模型/合并扩展/输入规则/undo 勘测补面/
  mod.rs 余量登记更新）、`ui/aura_view_builder.rs`（:1529-1531
  placeholder 消费 + View::AutodownEditor 扩字段——若 044 已扩
  on_focus 同模式）、`ui/view.rs`（AutodownEditor 扩 placeholder）、
  `ui/autodown_render.rs`（W5 三降级臂）、`ui/iced/renderer.rs`
  （build_autodown_editor_generic placeholder lowering）、D1→
  滚动测量（renderer 滚动臂）
- auto-down：无 DSL 改动；`demo/auto/vm-smoke.mjs`（新断言组候选：
  跨块选区经 MCP 动作面——若 action 面不支持选区则以 rust 单测+
  手验为口径，实施定）、PARITY.md（#7/#9/#12 行刷新）、DEBTS.md
- 验证链：`cargo test -p auto-lang --features autodown,code-editor
  autodown_editor`、净窗 vm 双门、playwright 73

## 需求分析与背景调查

（spec 台账离线：P04x 系 044/045/046 已沉淀、039-043 未沉淀；
本计划以 2026-09-04 双仓实勘为据。）

- **路线图原文**（041 §后续路线图）：「编辑行为补齐 + 语料跨轨：
  VM 编辑壳在册缺口（Enter 拆块/退格跨块合并/跨块选区/IME 实机）；
  验收 = vue semantics.test.ts 语料移植 VM」。
- **批次十现状**（core.rs 实勘）：结构编辑引擎（:1484 注记）——
  Enter 输入规则主入口（:1668「true = 已做结构拆分」：段落/引用内
  拆块、列表续项、空项退列 :1800）；Backspace 同宿主块首合并
  （:1853-1870，dfs_leaf_order 定序 + same_host 闸；「fence 与跨
  容器边界登记余量不做」）；套件测试在册（:2155 Enter 拆块焦点
  落新块首 / :2202 块首合并 / :2222 段中拆块）。
- **残余缺口自陈**（core.rs:20 头注，部分滞后）：「块内软换行不
  拆块【设计如此，Shift+Enter 语义，非缺口】、块首退格不跨块合并
  【同宿主已解，余跨容器】、选区不跨块【真缺口】、markdown 输入
  规则未接线【部分滞后，行首标记转换未接】」；mod.rs 有 Phase 3
  v1 余量登记（T10 更新）。
- **undo/剪贴板双注记**：:400「输入不路由（不建 undo、无光标
  状态）」vs :619「剪贴板/undo 组合键（对齐 413 最小集）」+
  edit_copy（:621）——prose 块 undo 覆盖面 T1 勘测定稿。
- **IME**：:514「IME/鼠标全放行（不捕获、不建 undo、无光标状态；
  编辑机器零活动）」——放行已实现，实机验证收口。
- **W4 现状**：aura_view_builder.rs:1529-1531「Plan 040: placeholder
  （空态提示文案）——VM v1 编辑壳无空态概念」`let _ = props.get(
  "placeholder")`；PARITY #7 归宿 W4。
- **W5 现状**：autodown_render.rs 三降级臂——mermaid fence chrome +
  「mermaid · web-only」标签（:704-709/:1269）、math mono 文本 +
  `$$` 标记（:751，KaTeX web-only）、query 文本面板 +「未求值」
  （:766-771）；PARITY #9 归宿 W5 裁定。
- **语料锚现状**：`semantics.test.ts` 全仓零命中（消散）；活套件
  `autodown/packages/engine/src/editor/__tests__/`（commands/
  editor-engine/blockhost-rich/blockquote-list-widget 等 12+ 文件，
  mark/结构命令语义在册）。
- **D1**（046 复审债候选）：vm-smoke warm-up 滚动收敛 flake，净窗
  首 attempt 三回合必现（重试 bar 内）——auto-lang 滚动测量首帧
  settling 排查候选。

## 详细设计

1. **T1 勘测定稿**：core.rs 选区/undo/输入规则覆盖面全量实勘
   （选区数据流 :319-320/:585-591、undo 组合键消费链 :619-642、
   输入规则已接清单 :1668-1850）；vue `__tests__` 提炼编辑语义
   用例对照表（commands/editor-engine/blockhost-rich → 逐条映射
   「rust 已覆盖/本计划补/不适用 VM」三态）——对照表落计划复审
   记录，T5/T6 范围随之冻结。验证：对照表在册（计划文件内）。
2. **T2 选区跨块·数据与渲染**：SelAnchor{block_idx, offset} 模型
   + dfs_leaf_order 跨叶范围求交 + 逐叶高亮渲染（既有 selection
   矩形折算扩展）。单测：三叶文档拖选中叶→邻叶边界，高亮矩形
   逐叶断言。
3. **T3 选区跨块·行为**：copy=范围叶按 emit_document 骨架拼接；
   delete/backspace=首尾叶剪接（merge 原语复用）+ 焦点落接缝；
   ctrl+a 全文选（覆盖面 T1 定稿）。单测：跨块 copy 文本断言、
   跨块删除后 emit_document 往返断言。
4. **T4 跨容器合并**：merge_into_previous 撤 same_host 闸——quote
   尾段↔外段、列表尾项↔外段；fence 边界维持不做（登记）。单测：
   quote 尾+后段退格合并（骨架重生成往返断言）、fence 边界不合并。
5. **T5 输入规则补面**：行首标记转换按 T1 冻结面落地（候选：
   `# `/`## `/`### `→标题、`- `/`* `/`1. `→列表、`> `→引用）。
   单测：逐规则转换+往返。
6. **T6 undo/redo 补面**：按 T1 勘测——若 prose 块无 undo，补
   413 最小集对齐（undo 栈挂块级操作批次十原语）；已有则仅测试
   钉死。单测：编辑→undo→emit_document 回退断言。
7. **T7 W4 空态**：View::AutodownEditor 扩 placeholder 字段
   （构造点补 None 编译器驱动）+ renderer lowering + 编辑壳
   content 空&&非聚焦渲染浅灰文案 + aura_view_builder 消费臂
   摘行（:1529-1531）+ 发射测试。单测：空文档 placeholder 渲染、
   非空不渲染。
8. **T8 W5 裁定实施**：按裁定执行——默认案：三降级臂 chrome 观感
   对齐（标题栏形态贴 vue 面板族）+ PARITY #9 转「显式豁免」登记；
   若裁补渲染则另立计划（本计划只落裁定与登记）。验证：PARITY
   行刷新 + 截图。
9. **T9 IME 实机 + D1 搭车**：VM 实机中文输入全流程（候选窗上
  屏/组合/删除）验证留档截图；D1 滚动测量首帧 settling 定位——
   可修则修（附回归断言），不可修登记 KNOWN-DEBT/DEBTS。验证：
   IME 截图 + vm-smoke 净窗三连跑读数。
10. **T10 语料收口 + 全量回归 + 文档**：mod.rs Phase 3 v1 余量
    登记更新（已解项销、余项改口径）、PARITY #7/#9/#12 刷新、
    DEBTS（D1 处置行）；`cargo test -p auto-lang --features
    autodown,code-editor` 全绿（基线对齐）+ playwright 73 +
    vm-smoke 净窗。验证：三命令退出码 0/基线一致，记复审记录。

## 测试设计

- rust 主门：`autodown_editor` 套件扩展（批次十测试模式沿用）——
  跨块选区数据/渲染/行为、跨容器合并、输入规则逐条、undo、
  placeholder、emit_document 往返贯穿。
- 对照表驱动：T1 产出的 vue↔rust 用例映射表为测试完备性依据，
  review 逐条核对。
- demo 双门：playwright 73（vue 零改动证明）+ vm-smoke 净窗
  （D1 处置后三连跑读数）。
- 手验：IME 实机、跨块拖选/拷贝、空态文案、W5 chrome——截图留档。

## 验收标准

1. 跨块选区端到端（高亮/copy 拼接/删除剪接/焦点接缝）rust 套件
   绿 + 实机手验留档。
2. 跨容器合并生效、fence 边界口径在册；输入规则覆盖面 = T1
   冻结面，逐条测试绿。
3. undo/redo 覆盖面 = T1 定稿口径（补面或钉死）。
4. 编辑壳空态 placeholder 可见（空文档浅灰、非空/聚焦不显示）；
   PARITY #7 销行。
5. W5 裁定落档：chrome 对齐或豁免登记，PARITY #9 闭环。
6. IME 实机验证过；D1 定位有归宿（修复或登记）。
7. 编辑语义用例对照表在册且测试完备性经 review 核对；
   `cargo test autodown_editor` 全绿 + demo 双门零回归。

## 执行步骤

- T1 勘测定稿：缺口/undo/输入规则覆盖面实勘 + vue `__tests__`
  用例对照表（三态映射）落复审记录。验证：对照表在册。
  [✅ 已完成] 2556 行全读实勘（拖选无输入通路/undo 陈旧栈隐患/same_host
  闸漏 ListItem）+ 对照表 26 组三态映射落复审记录（T5=7 条规则、T6=钉死
  +清栈修复、待澄清①③④⑧ 冻结）；前置两项过（047 已折 32929c2、
  532-535 re-scan 零交叠）；semantics.test.ts 实存勘误在册。
  [前置：PLAN-047 折入 master；auto-lang autodown_editor 模块
  并行占用 re-scan（532-535 活跃会话）]
- T2 选区跨块数据面+渲染 + 单测。验证：`cargo test -p auto-lang
  --features autodown,code-editor autodown_editor`。
  [✅ 已完成] SelAnchor×2+doc_sel 状态+dfs 规范化范围+push_byte_range_rects
  纯函数+段渲染独立于焦点；执行期发现并修复渲染栈文档序（块 id 序拆块
  新叶视觉落尾，计划架构节 dfs 序口径落实）；5 新测试 37→42 绿
  （commit 5bf95d54c auto-down-dev）。
- T3 选区跨块行为面（copy/delete/焦点接缝）+ 单测。验证：同上。
  [✅ 已完成] doc_sel_spans/doc_copy/delete_doc_selection（剪接+重编号
  补偿+接缝焦点）+ MouseDragged 通路（widget CursorMoved 映射，同叶原生
  Drag 不变）+ ctrl+a + 组合键选区感知 + shift+↑/↓ 跨块扩展 + 编辑动作
  前剪接；语义澄清两点在册（拖入叶首字节零宽无高亮=正常；shift 收拢
  落位随 nav 末行尾惯例）；6 新测试 42→48 绿（commit 022f40d46）。
- T4 跨容器合并（fence 口径登记）+ 单测。验证：同上。
  [✅ 已完成] same_host 闸撤除（顶/同 Quote/同项/同列表相邻项/跨容器
  双向含提升向）；fence 双侧维持不做（④口径落实）；重编号修复；
  执行期发现并修复 Quote emit 尾行 `>` 缺陷（往返不安全，旧 contains
  断言掩盖）；嵌套列表余段防御约束登记（parser 扁平化不可达）；
  5 新测试 48→53 绿（commit af29b7601）。
- T5 输入规则补面（T1 冻结面）+ 单测。验证：同上。
  [✅ 已完成] LINE_START_RULES 7 条落地（标题 kind 迁移/列表与引用
  骨架 wrap，整块精确检定对齐 vue）；钉死测试 3 条（`1. ` 不接线/
  fence 不触发/非整块不触发）；core_empty 助手补空文档建块表路径；
  7 新测试 53→60 绿（commit c87108f91）。
- T5 输入规则补面（T1 冻结面）+ 单测。验证：同上。
- T6 undo/redo 补面或钉死。验证：同上。
  [✅ 已完成] T1 冻结口径落地：键面已对齐 413（在册）+ 打字/删除 undo
  钉死（含 Ctrl+Shift+Z 重做）+ overwrite 陈旧栈修复（整换新 ViEditor，
  红→绿钉死）；粘贴/IME/结构操作不入 undo 按 413 同口径登记；
  3 新测试 60→63 绿（commit 0b53db94e）。
- T7 W4 空态（View 扩字段 + lowering + 壳渲染 + 消费臂摘行 +
  发射测试）。验证：`cargo test … aura` + `autodown_editor`。
  [✅ 已完成] View::AutodownEditor 扩 placeholder（编译器驱动全构造点，
  双路径消费臂摘 Plan 040 忽略豁免）+ iced 双 lowering + render_frame
  空态注入（空&&非聚焦→0.55 调光灰，空白/只读实例/聚焦三守卫）；
  发射测试翻转 + core 3 测试 63→66 绿、aura_view_builder 82/83（1 红
  = master 既有 strip_html 空白差异，主检出复现非本期）、view 48/48
  （commit c81b449f5）。
- T8 W5 裁定实施 + PARITY 行刷新。验证：截图 + PARITY diff。
  [✅ 已完成（截图随 T9 实机门补档）] MathBlock 降级臂补「math ·
  web-only」header 对齐 mermaid 面板族 + 降级单测翻转（autodown_render
  21 绿，auto-lang commit）；PARITY #9 转显式豁免登记 + W5 索引行收口
  （auto-down worktree commit）。
- T9 IME 实机验证 + D1 排查搭车。验证：截图 + vm-smoke 三连。
  [✅ 已完成] worktree 二进制（默认 features 含 code-editor 经 ui-iced）
  + 独立端口 9249 净窗；**vm-smoke 三连跑 exit 0 ×3（含冷窗首跑）**，
  11 断言组全绿——D1 flake 未复现（暖场+800ms 重发 workaround 兜住，
  根因定位：首帧内容高未定型 → scroll_to 钳 0，处置=登记）；IME 实机：
  中文上屏/编辑壳 CJK 渲染/退格删除全流程真窗验证 + 截图
  vm-ime-chinese.png；W5 chrome 截图 vm-webonly-chrome.png（math ·
  web-only header 实机可见）；候选窗组合受合成键通道限制→登记（见
  待澄清⑨），真实键入不更新 state.content 缺口→登记（见待澄清⑩）。
- T10 语料收口 + mod.rs/DEBTS/PARITY 文档 + 双仓全量回归。
  验证：`cargo test -p auto-lang --features autodown,code-editor`
  基线一致 + `npx playwright test` 73 + vm-smoke 退出码 0。
  [✅ 已完成] mod.rs 余量台账改口径+core.rs 头注同步（auto-lang
  commit）；PARITY #7 销行/#9 实档/#12 对照表注记+W4/W5 索引收口+
  DEBTS 三行（D1 收口登记+⑩⑪ 转介）（auto-down worktree commits）；
  回归读数：autodown_editor 66/66 绿、autodown_render 21/21、view
  48/48、aura_view_builder 82/83（1 红=master 既有 strip_html）、
  **playwright 73/73**、vm-smoke exit 0 ×3；auto-lang --lib 全套
  基线对比 master：失败集等同（194 共享既有污染失败+3 单侧计时
  flake 隔离全过；worktree 通过 4396 vs master 4374，+22=本期净增），
  本期触碰模块零新增红。

## 复审记录

### T1 勘测定稿（2026-09-04，执行期落档）

**前置确认**：PLAN-047 已折入 master（32929c2，merge(047) 在册）；auto-lang
532-535 并行会话 re-scan——532（tower-selfhost）/535（desktop-ux）零占用；
533（executing）/534（drafting）仅碰 `aura_view_builder.rs` 的
alert-dialog/popover convert 臂区段，与本计划 `autodown_editor` 模块零交叠、
T7 placeholder 消费臂在文件不同区段（引用一律函数锚点），无需调波次。

**锚更替修正**：`semantics.test.ts` **实存**于
`autodown/packages/engine/src/editor/__tests__/`（计划起草时「全仓零命中」
的勘测已滞后，并行会话恢复/重组所致）——锚更替照旧成立（活语料 = 整个
`__tests__` 目录），但对照表正锚直接用回 semantics.test.ts。

**core.rs 实勘要点**（2556 行全读）：
- 选区：`shift_anchor: Mutex<Option<(usize, Cursor)>>`（:362，块内 shift 面）；
  渲染仅焦点块 `ed.selection_bounds()`（:1030-1050）；`DocInput` 无
  MouseMoved——**拖选无输入通路**（T2 须新增 `MouseDragged` 变体 +
  widget.rs CursorMoved 映射）；ctrl+a 未接；`Selection` 每叶独立。
- undo：组合键面已齐（:619-659 C/X/V/Z/Shift+Z/Y）；打字级 undo 走
  cosmic 每叶缓冲历史（`Action::Insert` 经 `ed.action()` 记账，
  `undo_restores_typing` :2331 已绿）；**粘贴/IME 走 `insert_string`
  直改缓冲不入账**（413 蓝本同口径，code_editor/core.rs:940/:992/:1500
  同路径）；结构操作（拆块/合并/退列）经 `overwrite_block_text`=
  `set_text` 不入账，且**旧 undo 栈残留陈旧 Change——回退会错乱**
  （cosmic-text 0.15 无清历史 API，`save_point()` 只设脏 pivot）。
- 输入规则：Enter 主入口 `enter_split`（:1669）已接拆块/续项/退列；
  行首标记转换未接（T5 面）。
- 合并：`merge_into_previous`（:1855）same_host 闸（:1869-1880）只认
  TopLevel×TopLevel 与同 Quote——**ListItem×ListItem（同列表相邻项）与
  跨容器均不合并**（vue `backspaceAtItemStart` 的项间合并在册，T4 须扩）。

**vue 输入规则冻结面**（T5 定稿；vue `engine/input-rules.ts` INPUT_RULES
全表 10 条，逐条裁定）：

| marker | vue 语义 | VM 裁定 |
|---|---|---|
| `# ` `## ` `### ` | Heading 1/2/3 | **本计划补**（kind 迁移 + 前缀消费） |
| `- ` `* ` `+ ` | ListItem wrap ListBlock | **本计划补**（骨架 wrap） |
| `> ` | Blockquote wrap | **本计划补**（骨架 wrap） |
| `1. ` 有序 | vue 无此规则 | 不补（对齐 vue；登记余量） |
| ``` ``` ``` | Fence | 不补（代码块语义，宁小勿泛；登记） |
| `---` `***` | ThematicBreak | 不补（VM Raw 只读固化，转换面复杂；登记） |
| 任务列表 `- [ ] ` | vue 无 | 不补（登记） |

触发语义对齐 vue：**整块文本精确等于 marker**（`text === rule.marker`，
「typed at block start, whole-block」），空格键入后检定。

**待澄清① 冻结**（选区交互面 v1）：鼠标拖选跨块=必选（T2/T3）；
ctrl+a 全文选=**补**（成本低）；shift+↑/↓ 跨块扩展=**补**
（`navigate_vertical` 边界迁焦点处接 SelAnchor 扩展）；shift+←/→ 跨块
水平扩展=**不做**（块内 motion 不越界，登记余量）。

**待澄清③ 冻结**（undo 最小集）：键面已对齐 413（C/X/V/Z/Shift+Z/Y 在册）；
覆盖面=块内打字/删除级（cosmic 逐叶历史）；粘贴/IME `insert_string` 不入
undo（413 同口径，登记）；结构操作不入 undo（登记）；T6 落
**overwrite 后换新缓冲清陈旧栈**（防回退错乱修复）+ 打字/删除 undo/redo
测试钉死。

**编辑语义用例对照表**（vue `__tests__` → rust 套件三态映射；
T5/T6 范围随之冻结。三态：✅rust 已覆盖 / 🔧本计划补 / ⛔不适用 VM）：

| vue 用例组（文件 · it 语义） | VM 对照 | 态 |
|---|---|---|
| semantics · keystrokes concatenate/caret tracks；mid-text insertion | `typing_updates_emit_roundtrip`/`typing_then_backspace_roundtrip_in_block` | ✅ |
| semantics · split moves tail + focuses | `enter_splits_paragraph_at_caret`/`enter_split_carries_tail_to_new_block` | ✅ |
| semantics · backspace at block start merges | `backspace_block_start_merges_same_host`（同宿主）；跨容器/列表项间 | 🔧T4 |
| semantics · Enter in list item 续行 | `enter_at_item_end_creates_new_item` | ✅ |
| semantics · empty item Enter lifts out | `enter_on_empty_item_exits_list` | ✅ |
| semantics · table row add/remove | VM 表格只读固化（`Seg::Raw`） | ⛔ |
| semantics · undoing sequence restores doc+caret | `undo_restores_typing`（打字级）；结构操作无 undo | 🔧T6（钉死+登记） |
| semantics · insertTemplate（slash 模板） | VM 无命令层/模板面 | ⛔ |
| semantics · `"# "`→heading 消费标记 | 行首规则 | 🔧T5 |
| semantics · `"- "`→list wrap | 行首规则 | 🔧T5 |
| semantics · preedit 不入 op 栈；commit 一次插入 | `ime_commit_inserts_at_focused_caret` | ✅ |
| semantics · undo after commit 整段回退 | insert_string 不入 undo（413 同口径） | ⛔（登记） |
| semantics · serialize(parse) roundtrip | `emit_document` 往返测试群 | ✅ |
| editor-engine · input rule table（见上冻结面表） | — | 🔧T5 |
| editor-engine · diffToOp/applyTree/onChange 通知 | VM on_change 回环（`external_echo_after_edit_preserves_focus`） | ✅ |
| editor-engine · streaming append 追加分流 | 流式属只读轨 | ⛔ |
| list-commands · enterInItem 六例 | `enter_at_item_end…`/`enter_on_empty_item_exits_list` | ✅（undo step ⛔ 登记） |
| list-commands · backspaceAtItemStart（项间合并/嵌套列表保留/首项顶出/单项溶解） | T4 已并（同列表相邻项合并落地；项间余段移接为防御实现——嵌套列表 VM parser 扁平化不可达） | 🔧T4 已落（嵌套列表保留子句不可达登记） |
| list-commands · indent/outdent 八例 | Tab 归页面焦点链（:612 登记） | ⛔（登记） |
| list-commands · enterInQuote/exitQuote（空段退出/溶解/单 undo） | 拆分已覆盖（`enter_splits_inside_quote`）；空段退出 quote | ⛔（Enter 规则余量，登记；不在本计划面） |
| list-commands · guards（unknown ids no-op） | fence 不拆 `enter_inside_fence_softwraps` | ✅ |
| marks · toggle/setLink/marksAtRange | VM marks=解析快照区间，无命令面 | ⛔（#12 长期线） |
| selection-adapter · getSelection flat-text offsets+host | 跨块选区模型 | 🔧T2/T3（SelAnchor×2 对齐双端+偏移契约） |
| selection-adapter · applyMark/removeMark 跨界包裹 | 同 marks | ⛔（#12 长期线） |
| undo-wiring · historyActionOf/runHistory re-sync | 每叶 cosmic undo+on_change 回环 | ✅（结构操作无 undo 登记） |
| commands/table/moveBlock/setBlockAttrs 命令层 | VM 无命令层（core 直驱） | ⛔ |
| widget 群（blockquote-list/math-mermaid-edit 等） | 只读轨 autodown_render 对应（PARITY 线） | ⛔（编辑行为口径外） |

**待澄清⑧ 处置**：re-scan 已做（见前置确认），无波次调整。

**待澄清④ 预裁定**（T4 实施时终确认）：fence 边界维持不合并——fence 文本
并入段落叶会产生围栏内容泄漏（emit 语义非往返安全），口径登记。

### 复审记录（/auto-plan:review，2026-09-04）

**复审人**：ZCode（auto-plan-review gate）。**对象**：auto-lang worktree
`auto-down-dev` 8 commits（5bf95d54c..8f22f8e27，7 文件 +1399/−130，全部在
计划技术栈范围内、无越界改动——diff --stat 核对）+ auto-down worktree
`plan-048-dev` 3 commits（PARITY/DEBTS/两证档 PNG）。

**七验收逐条复验**（信任代码，重跑不信任勾选）：

| # | 验收 | 判定 | 证据 |
|---|---|---|---|
| 1 | 跨块选区端到端（高亮/copy/删除剪接/焦点接缝）rust 绿 + 实机手验留档 | **pass（附登记）** | 11 测试（三叶逐带/倒锚/空叶/copy join/delete 剪接+接缝 byte 3/ctrl+a 替换/拖选/shift 扩展，66/66 内）；实机：IME 真窗会话（上屏/CJK 渲染/删除，vm-ime-chinese.png）；**拖选真窗受控验证未完成**——CUA 帧绑定对无 a11y 树 iced 窗失配、MCP drag 为 mouse_area handler 契约不通 DocEditor（待澄清⑥预判成立）、SendInput 真实拖选因宿主机被用户实机占用遭干扰（光标事中位移实证），**043 复审 D2 同款签核口径**：合成通道测试代证 + 真实事件活性佐证（真实鼠标事件确实到达编辑器并产生结构变更） |
| 2 | 跨容器合并生效、fence 口径在册；输入规则=T1 冻结面逐条绿 | **pass** | 5 合并测试（quote 尾/提升向/列表尾项/相邻项/fence 双侧 noop）+ 7 规则测试（3 钉死不触发：`1. `/fence/非整块）；fence 口径=待澄清④落实在册 |
| 3 | undo/redo = T1 定稿口径 | **pass** | 3 测试（打字 undo/redo 含 Ctrl+Shift+Z/删除回退/合并后 undo no-op 红转绿）；413 同口径登记（粘贴/IME/结构操作不入栈） |
| 4 | 空态 placeholder 可见；PARITY #7 销行 | **pass** | 3 core 测试（空态注入 0.55 调光/聚焦隐/空白与只读实例守卫）+ 发射测试翻转（prop→字段→None）+ 渲染链三段钉死；`placeholder: "Start typing..."` 实存 demo app.at:193（VM 轨 048 起真消费）；PARITY #7 销行+#12 注记 commit 0f559cf。观察：空态实机截图未单独留档（链路三段测试钉死，登记不阻塞） |
| 5 | W5 裁定落档、PARITY #9 闭环 | **pass** | math 臂 header 对齐（autodown_render 21/21 含翻转断言）+ 显式豁免登记（PARITY #9/W5 索引收口）+ vm-webonly-chrome.png 实机 |
| 6 | IME 实机过；D1 有归宿 | **pass（附登记）** | IME commit 形态真窗全流程（候选窗组合受合成通道限制→⑨登记，preedit 路径单测+iced 接线在册）；D1=三连跑 exit 0×3 未复现+根因定位（首帧内容高未定型→scroll_to 钳 0）→DEBTS 046 行登记收口 |
| 7 | 对照表在册且经核对；66 绿 + 双门零回归 | **pass** | 对照表 26 组三态映射在册；**抽核 7/7 命中**（7 个被引测试函数实存+Tab 焦点链臂 core.rs:654 实证+math 降级断言实存）；autodown_editor 66/66；playwright 73/73（1.3m）；vm-smoke ×3 |

**全量门（本复审重跑）**：`--lib` 双侧对比（worktree 4396 通过/195 失败 vs
master 4374/196）：失败集**等同**——194 共享既有并行污染失败（master 同
红，与本期无关）+ 3 单侧差异（osconfig_daemon ×2、plan050 void_stub）隔离
复跑**全过=计时 flake**；净通过 +22=本期新增测试。scoped 复跑全绿（66/21/
48/2）+ `cargo check` 净。spec-impact 元数据已填（P048-1..6 六节）。

**遗漏/延后/workaround 猎查**：
- 待澄清①（shift+←/→ 不做）、②（规则 7 条宁小勿泛）、⑥（选区断言面
  rust 单测+手验口径）均为**计划预授权收窄**，非擅自缩水——逐项比对计划
  原文核实。
- 无未授权延后；T4「嵌套列表保留」不可达（parser 扁平化）为事实约束登记
  非回避（对照表已改注）。
- workaround 两处均已显式登记非静默：copy 容器前缀收窄（见 D1）、范围
  删除跨 Raw 段保留（mod.rs 余量台账）。

**债候选**：
- D1 跨块 copy 拼接无容器前缀（"> "/列表标记），纯段落 join——v1 收窄，
  架构措辞的忠实实现留后续（autodown_editor/core.rs doc_copy 注）。
- D2 真实键盘编辑不回写 state.content（demo 绑定消费链缺口）——已登记
  DEBTS 048 行，转介后续立项（非本计划编辑行为面）。
- D3 mermaid 降级臂 header 标签低对比（041 期既有）——已登记 DEBTS 048
  行，转介 chrome 观感清册。
- D4 IME 候选窗组合人工步（⑨）+ 拖选真窗受控验证（宿主机占用）——留
  人工执行清单，合成通道证据已代证。
- D5 shift+←/→ 跨块水平扩展不做 + 范围删除跨只读 Raw 段保留——mod.rs
  余量台账在册。

**路由**：七验收全过、无阻塞债 → `status: reviewed`，交 `/auto-plan:merge`。

（待执行后填写；/auto-plan:review 补 spec-impact。）

## 待澄清事项

- ① 选区交互面 v1 范围：鼠标拖选跨块为必选；shift+方向键跨块与
  ctrl+a 全文选按 T1 勘测的既有光标面成本定夺，范围记复审。
- ② 输入规则补面清单（标题/列表/引用之外是否含 ```` ``` ````fence
  转换、任务列表 `- [ ] `）——T1 冻结面定，宁小勿泛。
- ③ undo 最小集口径（对齐 413 的具体键集与粒度：按键级 vs 批次
  级）——T1/T6 定。
- ④ fence 边界合并「维持不做」的口径确认（与 quote/list 不同，
  fence 是代码块语义，合并行为存疑）——T4 实施时定并登记。
- ⑤ W5 预登记倾向「豁免 + chrome 观感对齐」；若 review 侧认为
  mermaid 补渲染（图引擎引入）值得立项，另立不混本计划。
- ⑥ vm-smoke 选区断言面：MCP action 若不支持选区坐标序列，则
  rust 单测+手验为验收口径（不强扩 action 面）。
- ⑦ vue 锚更替（semantics.test.ts → __tests__ 目录提炼）作为
  路线图偏差记复审；对照表同时是 #12 长期线（WYSIWYG 全量对齐）
  的底册输入。
- ⑧ auto-lang 并行会话协调：执行开工前 re-scan 532-535 对
  autodown_editor/ui 侧的占用，必要时调整波次顺序。
  [✅ 已处置·T1] re-scan 完成：532/535 零占用；533/534 仅碰
  aura_view_builder convert 臂区段（与本计划 placeholder 消费臂不同
  区段），无需调波次。
- ⑨ 【T9 执行期发现】IME 候选窗组合的自动化通道限制：computer-use
  合成键直插字符（绕过 OS IME 组合，Shift 切换亦不触发候选窗）——
  preedit 组合路径的实机验证需人工物理键盘执行；编辑器侧 ImePreedit
  显示/ImeCommit 一次性插入已由 iced 事件接线 + core 单测
  （ime_commit_inserts_at_focused_caret）钉住。上屏（commit 形态）/
  删除已真窗验证（vm-ime-chinese.png）。转介 review 裁定验收口径。
- ⑩ 【T9 执行期发现】真实键盘编辑不更新 state.content：合成键插入在
  编辑壳生效（文本/光标/渲染正确）但 .at content 绑定不回写（右栏不
  重渲染）；MCP type_text 专用通道（INPUT_TEXT+typed msg）正常。疑
  widget on_change publish → 解释器消费链在真实事件路径的接线缺口，
  046/047 验证均走 type_text 未暴露。转介后续立项/清册，不属本计划
  编辑行为面。
- ⑪ 【T9 执行期发现】mermaid 降级臂 header 标签实机不可见（暗底暗字
  低对比，vm-webonly-chrome.png 左上区）——041 期既有观感项，math
  （048 对齐后）/query 标签正常。转介 chrome 观感清册（与 PARITY #8
  thumb 残段同族），不扩本计划面。
