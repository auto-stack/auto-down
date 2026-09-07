---
plan_id: PLAN-060
status: drafting
feature_name: 双轨块键编辑 UX 三项对齐（标题回车降级 + 空块退格合并 + 跨块垂直导航）
author: [zhaopuming]
created_at: 2026-09-07T18:20:00+08:00
updated_at: 2026-09-07T19:40:00+08:00

supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 0
total_steps: 6
---

# [PLAN-060] 双轨块键编辑 UX 三项对齐（标题回车降级 + 空块退格合并 + 跨块垂直导航）

## 变更摘要

用户 2026-09-07 人工复核 demo 页面（网页轨）提出三项块编辑 UX 需求。前两项当日已在
网页轨落地（commit 9c6f3bf：block_model.at splitTailKind/splitTailAttrs + host-controller
prevSiblingId 模型侧前驱解析），本计划把**同一 UX/UI 需求**对齐到 VM（iced 桌面）轨：

1. **标题块内回车**：尾块降级为普通段落（ATX 标题是单行构造，`#` 记号不跨行；
   行中回车时尾巴文本成为新段落的内容；行尾回车得到空段落）。
   —— 网页轨 ✅ 已落地；**VM 轨待对齐**（本计划 T2/T3）。
2. **空块 Backspace**：删除空块并合并回上一块末尾，光标落在 junction
   （上一行文本末尾），不得卡在空行上。
   —— 网页轨 ✅ 已落地；**VM 轨待验证/对齐**（本计划 T3）。
3. **方向键跨块垂直导航**：↑/↓ 在块边界应迁焦到上/下一个块内部（对应水平
   位置落点），而不是被锁死在当前块的文本行内。
   —— **双向各缺一半，本计划前已互补落地**：VM 轨本就有 navigate_vertical
   （navigate_vertical + nav_goal_x 水平落点记忆）；网页轨由本会话补齐端点
   降落版（用户拍板：正上方字形匹配缓行，↑ 落上一块最后一个可编辑位置、
   ↓ 落下一块开头即可），随本计划记录，VM 侧无需改动此项。

VM 编辑壳与 showcase 三模式页共享同一实现，VM 侧修一处双 demo 受益；网页轨的
前两项已入库、第三项随本计划落地。

## 目标

- VM 轨 `enter_split` 的尾块类型语义与网页轨 splitTailKind 不变式一致
  （Heading 尾块 → Paragraph；Fence 不拆、TableSlot 不拆维持现状）。
- VM 轨空块 Backspace 合并行为与网页轨一致（合并回上一块、光标到 junction）。
- 网页轨补齐 ↑/↓ 跨块垂直导航，语义以 VM `navigate_vertical` 为基准
  （块边界迁焦邻块 + 对应水平位置落点 + 连续导航共享目标列）。
- 行为证据：auto-lang 侧 Rust 单测 + AutoUI MCP 合成通道探针（9359，vm-059 先例）
  + 截图；网页轨侧 Playwright 真键盘 e2e。
- demo（`autodown/demo`）与 showcase（`autodown/showcase`）文档内容源码零改动
  （引擎 src 与 auto-lang crates 除外）。

## 架构方案

- VM 编辑壳位于 **auto-lang 仓库** `crates/auto-lang/src/ui/autodown_editor/`
  （core.rs 结构编辑引擎 + widget.rs），与 auto-down 仓库的 TS 引擎**互不依赖**
  （auto-lang Cargo.toml 无 autodown-core 依赖，已核实）——两轨语义各自实现，
  需要手工对齐，这正是本计划存在的理由。
- 对齐基准 = auto-down 侧 block_model.at 的 `splitTailKind/splitTailAttrs`
  不变式（auto/parser/block_model.at，9c6f3bf）与 host-controller 的
  `prevSiblingId`（模型侧前驱 + isEditableLeaf 守卫）。
- 平台差异（PARITY）登记在 `autodown/demo/auto/PARITY.md`。

## 技术栈

- auto-lang：Rust + iced（编辑壳 core.rs 纯逻辑层 headless 可测，先例
  `backspace_block_start_merges_same_host` 等单测直接构造 BlockBuf）。
- 验证通道：AutoUI MCP 端口 9359（`AUTOUI_MCP_PORT=9359 auto.exe run -r vm`，
  demo/auto 目录启动）+ 合成探针脚本（先例 `autodown/demo/auto/vm-059-probe.mjs`、
  `vm-smoke.mjs`）。
- 门禁：`cargo test`（auto-lang crates/auto-lang）+ auto-down 侧 demo e2e
  90/90（零回归确认，demo 源不动应保持全绿）。

## 需求分析与背景调查（spec 台账锚点）

- P048-2/3/4/5/6：VM 编辑行为收尾（跨块选区 + 跨容器合并 + 输入规则补面）——
  VM 侧 Enter/Backspace 结构命令的既有家底（`enter_split`/`merge_into_previous`
  即批次十②③产物）。
- P057-2：VM 编辑链路——真实键盘回写（048）+ doc editor MCP 逐键/拖拽合成通道
  （055 D2）——本计划的验证通道即此链路。
- P034-1：RichTextHost + VM 端宿主契约冻结——两轨 UX 对齐的契约面先例。
- P046-3：VM demo 对齐 vue 版（两栏布局收编 + 平台差异清册）——PARITY 纪律。
- **现状证据（2026-09-07 复核）**：
  - `enter_split`（core.rs:3452）在 ② 右半新建缓冲处 `let kind =
    self.block_kind_of(bi)` 直接继承当前块类型，注释「标题续行为登记余量：
    保持同级」——**与网页轨修复前同款缺陷**（行高倒是已用 LINE_H_PARA）。
  - `merge_into_previous`（core.rs:3652）已存在，单测
    `backspace_block_start_merges_same_host`（core.rs:4083）覆盖块首合并；
    **空尾块场景（回车后立即退格）需验证**，不确定现状是否已达标。
  - 键盘路由：core.rs:964-985（EditorKey::Enter → enter_split，失败落
    Action::Enter；EditorKey::Backspace → offset 0 时 merge_into_previous，
    失败落 Action::Backspace）。
  - **需求③（方向键跨块）**：VM 轨**已实现**——core.rs:814-815
    `EditorKey::Up/Down → navigate_vertical`，块边界迁焦邻块；core.rs:1105-1130
    「批次十④：水平落点记忆」（nav_goal_x 记当前光标 x，邻块内以同 x 的
    Click 落最近字形，y 取 ±∞ 语义：上→末行、下→首行；连续 ↑/↓ 共享同一
    目标列，横向移动/Home/End/点击重置）；单测先例 core.rs:4064-4077。
    **网页轨完全缺失**：全引擎 grep ArrowUp/ArrowDown 仅斜杠菜单
    （SlashMenu.vue 菜单项导航）消费；hostKeydown 与 EngineEditor
    onContentKeydown 均无方向键分支。且网页轨每块独立 contenteditable
    （仅聚焦块挂实时宿主），浏览器原生 ↑↓ 永远出不了当前块——用户观察
    「只能在 block 内部的文本里上下左右」即此结构性原因。

## 详细设计

- **T2 尾块降级**：`enter_split` 内 ② 新建缓冲处，新块 kind 由
  `block_kind_of(bi)` 改为经降级映射：`LeafKind::Heading → LeafKind::Paragraph`
  （若 LeafKind 无 Paragraph 命名，用现状非 Fence 非表格文本叶的对应变体；
  以实际枚举为准）。`new_item_continuation`（列表续项）判定先于新块构造，
  不受影响；Fence/TableSlot 早退分支维持现状。行高参数已是 PARA 分支，降级后
  语义自洽。
- **T3 空块合并**：核对 core.rs:974-985 的 Backspace 路由条件（光标 offset 0）
  与 `merge_into_previous` 对空尾块的行为；若现状已合并且光标落 junction 则只补
  单测钉死，不改逻辑。
- **T4 网页轨跨块垂直导航**：已于本计划立项当日随复审热修落地（未随 VM 任务
  执行），实现要点存档——`hostKeydown` 增 ArrowUp/Down 分支（auto/editor/ext/
  rich_text_host_ext.ts，已逐字节部署 src/）；行边界探测 `caretOnFirstLine/
  caretOnLastLine` 用「光标前后文本的行盒」判定，不依赖光标自身 rect
  （节点边界处塌缩 Range 无盒）；亲和性取保守方向（↑ 用后文首盒、↓ 用前文
  末盒为光标行，保原生块内移动优先）；落位 = controller.navigateUp/navigateDown
  （host-controller.ts，模型侧邻块 + isEditableLeaf 守卫）→ engine.select →
  响应式重挂载聚焦（mountHost 端点落位），↓ 另以宏任务把光标归到块首。
  字形级正上方匹配（VM nav_goal_x 语义）网页轨暂缓，留作后续精化。
- 两处语义对齐均以网页轨行为为验收基准（网页轨 e2e
  `demo/e2e/heading-enter-backspace.spec.ts` 两用例即行为说明书）。

## 测试设计

- Rust 单测（core.rs 现有测试模块内，headless 构造 BlockBuf）：
  - `enter_split_heading_tail_demotes_to_paragraph`：Heading 块行中回车，
    断言新块 kind 为段落变体且携带尾巴文本、左半截保持 Heading。
  - `enter_split_heading_at_end_yields_empty_paragraph`：行尾回车得空段落。
  - `backspace_empty_tail_merges_to_prev_end`：回车后立即退格，断言块数还原、
    文本并回、光标落 junction（若 T3 核发现现状缺失则先修后测）。
- MCP 探针：`autodown/demo/auto/vm-060-probe.mjs`（vm-059-probe.mjs 先例）——
  9359 通道逐键合成：进 H1 → End → Enter → 断言新块段落；Backspace → 断言合并；
  截图证据 `vm-060-*.png`。
- 网页轨 e2e（已随热修落地）：`demo/e2e/cross-block-arrow-nav.spec.ts` 真键盘
  3 用例——↓ 进下一块开头 / ↑ 回上一块末尾；行中首线 ↑ 也跨块（行粒度非
  offset-0 粒度）；换行块内 ↑↓ 保持原生、仅边界跨块。
- 门禁：auto-lang `cargo test` 全绿；auto-down demo e2e 全量零回归
  （demo/showcase 源不动应保持全绿）。

## 验收标准

1. VM demo（iced 桌面）内："Heading One" 行尾回车 → 新块为空段落（非 H1）；
   行中回车 → 尾巴文本成为段落内容，左半截保持 H1。
2. 回车产生的空块上 Backspace → 空块消失、文本并回上一块、光标在上一块末尾。
3. 网页轨：多行段落实首行按 ↑ 迁入上一块（对应水平位置就近落位），末行按 ↓
   迁入下一块；连续 ↑/↓ 跨多块共享目标列；块内行间导航仍为原生行为。
4. auto-lang cargo test 全绿（新增 3 单测在内）；demo e2e 全量零回归。
5. PARITY.md 增补对齐记录（三项：两项 VM 侧对齐 + 一项 web 侧补齐）；
   探针脚本 + 截图入库。

## 执行步骤

- [ ] T1 现状核对落档：精读 core.rs:964-985（键盘路由）、3452-3560（enter_split）、
      3652 起（merge_into_previous），把「空尾块 Backspace 现状是否已合并、
      光标是否落 junction」的结论写进本计划复审记录节。
      验证：结论有 core.rs 行号引用。
- [ ] T2 尾块降级：按详细设计改 `enter_split`（crates/auto-lang/src/ui/autodown_editor/core.rs，
      ② 新建缓冲处 kind 映射）。验证：`cargo test -p auto-lang
      enter_split_heading`（新单测先行红→绿）。
- [ ] T3 空块合并验证/修复：按 T1 结论补 `backspace_empty_tail_merges_to_prev_end`
      单测；若现状不达标则修 `merge_into_previous`/路由条件。
      验证：`cargo test -p auto-lang backspace_empty_tail`。
- [ ] T4 VM 探针 + 手验：写 `autodown/demo/auto/vm-060-probe.mjs`（9359 合成通道，
      vm-059-probe.mjs 结构先例），跑通两行为断言，截图 vm-060-enter.png /
      vm-060-backspace.png 入库。验证：node 探针退出码 0 + 截图在库。
- [ ] T5 PARITY 登记：`autodown/demo/auto/PARITY.md` 增补三项对齐记录
      （标题回车降级、空块退格合并、跨块垂直导航的方向与生效面；③注明
      VM 的 nav_goal_x 字形落位为超集、网页轨端点落位为已裁定子集）。
      验证：文件 diff 可读。
- [ ] T6 收尾门禁：auto-lang `cargo test` 全绿；auto-down 侧
      `git diff master -- autodown/demo autodown/showcase` 为空 + demo e2e
      全量绿（零回归确认）。验证：两条命令输出贴复审记录。

## 复审记录

（drafting——T1 结论与执行期发现随执行填入）

## 待澄清事项

1. VM 行中回车语义确认：本计划按「与网页轨一致：尾巴文本随降级块走」执行
   （用户 2026-09-07 已拍板同一语义），如 VM 侧有特殊诉求需在 T2 前提出。
2. ~~需求③落位粒度~~ 已裁定（2026-09-07）：网页轨 ↑ 落上一块最后一个可编辑
   位置、↓ 落下一块开头（用户明示「最理想是正上方，不好确定就落末位」）；
   VM 的 nav_goal_x 字形落位保留为超集行为，网页轨若后续要精化再立项。
3. 同会话复审另发现网页轨起屏右栏透出深色画布（html/body 无声明底色 +
   渲染器根 `.streaming-document` 背景透明，仅系统深色偏好环境可见）——
   是否纳入本计划或另立，待用户拍板。
4. LeafKind 枚举的段落变体命名以 auto-lang 实际代码为准（T2 落笔时核对）。
