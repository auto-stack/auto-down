---
plan_id: PLAN-063
status: reviewed
feature_name: VM 轨滚动同步改造——命令/显示状态分离消振 + 单向块锚定同步（撤销双向实时比例联动）
author: zcode
created_at: 2026-09-11T18:15:00+08:00
updated_at: 2026-09-13T21:30:00+08:00
plan_revision: 1
current_step: 7
total_steps: 7
supersedes_spec_components: []
new_spec_components:
  - ".autoos/specs.json#P063-1"
  - ".autoos/specs.json#P063-2"
  - ".autoos/specs.json#P063-3"
  - ".autoos/specs.json#P063-4"
  - ".autoos/specs.json#P063-5"
  - ".autoos/specs.json#P063-6"
touched_goals: []
---

# PLAN-063 — VM 轨滚动同步改造（命令/显示状态分离消振 + 单向块锚定同步）

## 0. 变更摘要

VM 轨双栏滚动同步的现行实现（PLAN-043 契约：双向比例联动）在实机滚动中出现
**左栏自激振荡**——拖动滚动条后左栏在相邻两个滚动位之间以帧率无限乒乓（实测
日志 761 次 `OnLeftScroll` 交替，见 §4.2）。根因是 043 的 `scroll_top` 绑定
**写臂**与 `onscroll` **读臂**经同一状态变量闭环：`on_scroll → handler 写
.left_top → 绑定 note_scroll_offset → scroll_to → on_scroll(echo)`，rust 侧
0.5px 去抖按"与上次**请求**值"比较，压不住"echo 回报上一代位置"的自激。

本计划：
1. **命令/显示状态分离**（T-01，零引擎改动）：滚动 offset 拆成 `*_top_cmd`
   （唯一绑 `scroll_top` 写臂，只由用户拖拽/同步跳转写入）与 `*_top_view`
   （只由 `onscroll` echo 写入，供 thumb 显示与同步计算）。回环必需的
   "echo→写臂"边被结构性删除，任意引擎行为下振荡不可能发生；CustomScrollbar
   拖拽（043 T10，PARITY #8）不回退。
2. **撤销双向实时同步，改为单向块锚定命令式同步**：左栏驱动、右栏只被动落位
   一次。v1 比例近似落点（受 T-02 门控——现构建 handler 内该算式实算为 0，
   见 §4.2/§10）；v2（转介 auto-lang）rust 侧按 `core.block_rects()` 找"首个
   完整可见块"并直写右栏目标 offset，像素级顶对齐。
3. 可选"停稳再同步"去抖（T-05，视 .at tick 原语可用性，默认非必需——单向
   无写回下每次 `OnLeftScroll` 同步一次即安全）。
4. 测试与契约面：vm-smoke 第 4 组按新契约重写（含反振荡计数器断言）、
   PARITY #2 改写、README 滚动同步节改写、DEBTS 新行、specs.json P063 六节。

vue 轨**零改动**：其同步由手写 `useSyncedScroll.ts` 承担（DOM 块级映射 +
per-pair spacer 顶对齐，`app.at` 两个 scroll handler 在 vue 轨本就不触发），
`docs/designs/sync-and-block-alignment.md` 的契约继续成立，e2e 基线不动。

## 1. 目标

- **G1 零振荡**：VM 窗口左栏以任意方式滚动（滚轮 / 原生滚动条拖拽 / 自绘
  CustomScrollbar thumb 拖拽）停手后，滚动事件在有限次内停止，无乒乓。
- **G2 单向同步**：左栏滚动后右栏一次性落到对应位置——v1 比例近似、v2 块
  锚定顶对齐；映射幂等（同锚不重写）。
- **G3 右栏自由**：右栏原生滚动不回写左栏（单向）；未来若要反向必须带
  "程序性滚动"源标记（本计划不做）。
- **G4 不回退**：CustomScrollbar 拖拽发射面与 thumb 显示（PARITY #8、
  DEBTS 043 销号面）行为保持。
- **G5 契约沉淀**：新同步契约入 PARITY #2 / README / DEBTS / specs.json
  P063 六节；vm-smoke 第 4 组与新契约一致。

非目标：
- 不改 vue 轨 `useSyncedScroll` 及其 e2e。
- 不修 auto-lang `note_scroll_offset` 去抖机制本身（引擎写臂 echo 环的修复
  属彼仓，本计划仅登记债/转介）。
- 不做右→左反向同步、不做 hover 同步图标（用户提案演进为自动单向，图标撤销）。
- 不改 `.at` DSL 的 timer 原语缺位现状（DEBTS 059 同族，T-05 只做可用性调查）。

受影响仓库/模块：`auto-down`：`autodown/demo/auto/src/front/app.at`、
`autodown/demo/auto/vm-smoke.mjs`、`autodown/demo/auto/PARITY.md`、
`autodown/demo/auto/README.md`、`DEBTS.md`、`autodown/demo/src/App.vue`
（gen 再生）、`.autoos/specs.json`（merge 时落账）。`auto-lang`（T-04 转介，
需单独授权）：`crates/auto-lang/src/ui/iced/renderer.rs`、
`crates/auto-lang/src/ui/aura_view_builder.rs`。

成功判据（用户场景）：拖动左栏滚动条 → 不再摆动，右栏跟随落位一次；拖动右栏
→ 左栏不动；vm-smoke 重写后退出码 0；vue e2e 全量绿。

## 2. 架构方案

### 2.1 状态分离（核心，消振的结构性依据）

```
编辑壳（左）                                    渲染栏（右）
──────────────────────────                    ──────────────────────────
scroll_top: .left_top_cmd   ←写臂             scroll_top: .right_top_cmd  ←写臂
onscroll:   .OnLeftScroll   →读臂             onscroll:   .OnRightScroll  →读臂

写者矩阵（不变式：echo 永不写 cmd）：
  left_top_cmd   ← SetScrollTop（自绘 thumb 拖拽 .Move 绝对映射）
  left_top_view  ← OnLeftScroll（h,c,sy）
  right_top_cmd  ← 同步计算（v1 handler 比例式 / v2 rust 直写）
  right_top_view ← OnRightScroll（h,c,sy）
  *_height/*_client ← 对应 OnXxxScroll（测量，供钳制与 thumb 数据）
  left_scroll_events ← OnLeftScroll 计数（smoke 反振荡可观测面）
```

**消振论证**：rust 写臂 `note_scroll_offset`（renderer.rs:2274）仅当绑定值
与该 id 上次请求值差 >0.5px 时发 `scroll_to`。本设计下绑定值 = `*_top_cmd`，
而 cmd 只由"用户意图/一次性同步"写入；`onscroll` echo 落 `*_top_view`，
不进 pending 队列。回环需要"echo→cmd"这条边，状态分离把它删掉，故任意
echo 语义（fresh/stale/钳制）下都不可能自激。每次用户手势至多触发 1 次左栏
`scroll_to`（拖拽）与每事件至多 1 次右栏 `scroll_to`（同步），有向图无环。

自绘 thumb 显示切到 `left_top_view`（`csb_top`，app.at:176），拖拽路径不变
（`custom_scrollbar.at` `Move` 为指针绝对位置映射，首帧记 `grab_offset`，
不受显示值回写影响）。

### 2.2 单向同步（左→右）

- **v1（比例近似，T-02 门控）**：`OnLeftScroll` 内
  `if h > c && .right_height > .right_client { .right_top_cmd = clamp(sy / (h - c) * (.right_height - .right_client), 0, .right_height - .right_client) }`。
  幂等性：同值重写被 0.5px 去抖吸收，不重复 scroll_to。
  **门控**：现构建（lang-602 @6ed8b1e33）该算式在 handler 上下文实算为 0
  （§4.2 实测；普通脚本同一算式得 738.6273，tmp/scroll-arith.at），T-02 裁定
  前不假设可用；若为引擎缺陷且短期不修，v1 同步并入 T-04 rust 直写先行。
- **v2（块锚定，转介 auto-lang）**：左栏 on_scroll 消费处（rust）以
  `core.block_rects()` + 当前 offset 求**首个完整可见块**（`rect.y - offset ≥ -tol`
  且 `rect.y + rect.h - offset ≤ client`，tol=2px；无完整块时回退"与视口顶
  相交的块"），取右栏同序块顶 y 为目标，`write_*_state` 直写
  （`write_ghost_state` renderer.rs:11822 同款先例）`right_top_cmd` 与
  `sync_anchor_block`。锚规则对"对齐后锚块 top=0"幂等（≥ 判据 + 容差）。
  块索引两栏同源（同一 `content` 顶层序列，044 ghost 的 `block-N` 契约）。
- **双向豁免**：`OnRightScroll` 不写任何 cmd（单向）；右栏原生滚动仅更新
  view/测量。

### 2.3 停稳去抖（可选，T-05）

引擎有 tick 订阅面（renderer.rs:20365 `tick_interval_ms`/`tick_msg`，Plan
407），但对 demo `.at` 是否开放未核实（DEBTS 059：DSL 无 timer 原语）。
单向无写回下"每事件同步一次"已安全，去抖仅是观感优化（右栏少跳几次）。
T-05 产出可用性结论；可用则在 `OnLeftScroll` 置 settle 计数、tick 递增达阈值
（建议 150ms）才写 `right_top_cmd`；不可用则维持每事件同步并登记 059 同族。

### 2.4 双轨与再生

`is_vue()` 门控保持：vue 轨 props 惰性（scroll 两 handler 不触发）、bridge 与
`useSyncedScroll` 零改动。`app.at` 状态更名后跑 `bash gen/regen.sh` 再生
`App.vue`（gen/regen.sh，gitignored，门禁：编译告警即中止），diff 审阅仅状态
名/handler 体差异，e2e 全量回归。

## 3. 技术栈

Auto .at DSL（widget state/handler、is_vue 分轨）；auto-lang iced renderer
（aura_view_builder `autodown_scroll_binding`、renderer `note_scroll_offset`
/`write_ghost_state`）；AutoUI MCP（`autoui_action`/`autoui_state`/
`autoui_snapshot`，vm-smoke 与探针）；node 18+ 探针脚本；Playwright（vue e2e，
仅回归）。

## 4. 需求分析与背景调查

### 4.1 授权记录

- 用户已批准（2026-09-11 会话）：撤销 VM 轨双向实时滚动同步；改为"滚动结束时
  以左侧首个完整可见块为锚、右栏一次落位"的单向块锚定同步（用户提案，含无
  hover 图标、一次手势一次同步两点）；确认"单向 + 无写回"两守则后"立项"。
- 执行授权（2026-09-11 18:30，用户 `/auto-plan-work 063`）：auto-down 仓内
  任务 T-01/T-02/T-03/T-05/T-06/T-07 授权执行；T-04（auto-lang 侧改动）仍需
  用户对跨仓范围单独授权（§10.1），本轮不动 auto-lang 任何 worktree。
- 实现 worktree：`D:/autostack/.wt/auto-down-063/auto-down`，分支
  `plan-063-dev`，基线 master `1557a39`。运行时依赖：VM 验证使用
  `D:/autostack/.wt/lang-602/auto-lang/target/debug/auto.exe`（auto-lang
  @6ed8b1e33，只读借用——本计划不修改该 worktree）。
- 预算/自动续跑限制：未指定（按技能默认：自动修复循环上限 3）。

### 4.2 根因实证（2026-09-11 会话实测）

- 现场：`autodown/demo/auto/vm-demo-live.log`（会话产物，未入库）770 次
  handler 调用 = 761 `OnLeftScroll` + 9 `OnRightScroll`（0 `SetScrollTop`
  ——用户拖的是 iced 原生滚动条）；尾段 300+ 次 `OnLeftScroll` 在 sy=120↔0
  完美交替，间隔行是 iced WARN "More than 3 consecutive RedrawRequested
  events produced layout invalidation"（帧率自激）。用户滚动轨迹
  600→660→720 后立即进入 660↔720 乒乓，随后每个手势步长都成为新的一对
  振荡端点（660↔720、780↔840、540↔360、480↔660…）。
- 交叉证据：MCP 探针（tmp/vm-scroll-osc-probe.mjs）左栏 scroll 至 600 → 仅
  1 次 `OnLeftScroll(2653.36, 772, 600)`，`left_top=600` 而 `right_top` 恒 0
  ——**比例级联算式在 handler 内实算为 0**（按式应 738.6）；同一算式在普通
  脚本 `tmp/scroll-arith.at` 得 738.6273、条件 `both=true` → 差异在 handler
  上下文（state 读取或复合算式求值），非 .at 逻辑错误；auto-lang PLAN-058 曾
  登记同族引擎缺口（复合算式 RHS/int 宽化，彼仓 plan 576 清偿过一批）。
- 静态机制：renderer.rs:2255-2293 `note_scroll_offset`（0.5px vs
  `last_requested`）/`drain_pending_scroll_offsets`；
  aura_view_builder.rs:2755-2810 `autodown_scroll_binding`（写臂仅来自
  `scroll_top` prop；缺省 → `offset=None` → 无写臂；读臂 `(height, client,
  top)` 实参序）。app.at:334-351 两 handler 互相写对方 `*_top` 无环路守卫
  （注释自称依赖"rust 侧 pending 队列 0.5px 去抖几何收敛终结"——实测不成立）。
- 会话补充裁定：本窗口消失三次（16:57/17:02/17:19）均为用户手动关闭（看门狗
  无 taskkill 痕迹），与 PLAN-049 外部击杀定性不冲突，不立案。

### 4.3 现状调查（关键符号，2026-09-11 快照；auto-lang 基准 = lang-602 worktree @ 6ed8b1e33，主仓晚一个 docs 提交）

- `autodown/demo/auto/src/front/app.at`：msg 声明 :103-104
  （`OnLeftScroll(f64,f64,f64)`/`OnRightScroll`）；model :136-141
  （`left_top/left_height/left_client/right_top/right_height/right_client`，
  全 f64）；左编辑臂 props :244-246（`scroll_sync: true, scroll_top:
  .left_top, onscroll: .OnLeftScroll`）；右渲染臂 :267-269（同构）；CustomScrollbar
  数据 computed :176-177（`csb_top => … .left_top`）；handlers
  `.SetScrollTop` :319-327（VM 分支直写 `.left_top`）、`.OnLeftScroll`
  :334-343、`.OnRightScroll` :344-351（双向比例级联）。
- `autodown/demo/auto/src/front/custom_scrollbar.at`：`.Move` :146-171
  （指针绝对映射 `(y-grab_offset)/track_avail*max_scroll`，emit
  `update:scrollTop`）；`.ThumbUp` :173-175。
- `autodown/demo/auto/vm-smoke.mjs` 第 4 组 :343-470：左滚 240 收敛断言
  （`left_top>100 ∧ right_top>0`）、thumb 数据非零、右栏 offset_y 跟随、
  右滚 600 双向回随、043 T10 拖拽子组（MCP drag → 左跳 + 双栏 offset_y 跟随）
  ——全组按 §5.7 新契约重写。
- `autodown/demo/auto/PARITY.md`：#2 滚动同步（:15，043 双向比例联动口径）、
  #8 CustomScrollbar（:21）。`README.md` :45-49 scroll sync 节。
  `DEBTS.md`：043 三行（销号）、049（外部击杀）、059（tick 缺位）。
- 归档契约：`docs/plans/archived/043-vm-scroll-sync-contract.md`（双向比例
  联动契约，本计划 supersede 其 VM 轨口径；043 早于账本，specs.json 无
  P043 条目，契约面在 PARITY/README）。
- vue 轨参照：`docs/designs/sync-and-block-alignment.md`（块级映射 +
  spacer 顶对齐契约）；`packages/vue/src/StreamingRenderer.vue`
  `applyBlockIdsAndPlaceholder`；`demo/src/composables/useSyncedScroll.ts`。
- 引擎（auto-lang）：aura_view_builder.rs:1765-1780 编辑壳 Scrollable 包装、
  :3365+ 渲染臂同构；renderer.rs:4225-4238 Scrollable 构造（无 id 的 offset
  静默不写入）、:11810-11830 `write_ghost_state`（`core.block_rects()` + 直写
  state 先例）、:20365 tick 面。

### 4.4 依赖与假设

- **A1**（T-01 验证）：`scroll_top` prop 缺省 → `offset=None` → 不入
  pending 队列（aura_view_builder.rs:2785-2800 + renderer.rs:4231 注释）。
- **A2**（T-02 裁定）：handler 内比例算式为 0 属引擎上下文问题；在裁定前 v1
  同步不承诺可用（AC-02 相应门控）。
- **A3**：auto-lang 侧改动需独立 worktree/分支；lang-602 worktree 正被另一
  会话使用，禁止就地改动（§10.1）。
- **A4**（T-05 调查）：Plan 407 tick 面对应用 `.at` 的开放度未知。
- **A5**：两栏块序同源同序（044 ghost `block-N` 契约先例）；右栏块几何来源
  三选一在 T-04 决策件裁定（§10.2）。

## 5. 详细设计

### 5.1 状态与绑定（app.at）

model（:136-141 处替换为）：

```
// PLAN-063: 命令/显示分离——写臂只绑 *_top_cmd（写者=用户意图/同步跳转），
// onscroll echo 只写 *_top_view（thumb 显示 + 同步输入）。回环结构性消除。
var left_top_cmd f64 = 0
var left_top_view f64 = 0
var right_top_cmd f64 = 0
var right_top_view f64 = 0
var left_height f64 = 0
var left_client f64 = 0
var right_height f64 = 0
var right_client f64 = 0
var sync_anchor_block int = -1      // v2：当前锚块索引（rust 直写）
var left_scroll_events int = 0      // 遥测：smoke 反振荡断言面
```

绑定与 handler（行号为现快照）：

- :245 左臂 `scroll_top: .left_top_cmd`；:268 右臂 `scroll_top: .right_top_cmd`。
- :176 `csb_top => is_vue() != None ? .demoAppBridge.scrollTop : .left_top_view`。
- `.SetScrollTop(v)`（:319-327）：vue 分支不变；VM 分支 `.left_top_cmd = v`。
- `.OnLeftScroll(h, c, sy)`（:334-343）：

  ```
  .left_top_view = sy
  .left_height = h
  .left_client = c
  .left_scroll_events = .left_scroll_events + 1
  // v1 同步臂（T-02 门控）：
  if h > c && .right_height > .right_client {
      let target = sy / (h - c) * (.right_height - .right_client)
      let max_r = .right_height - .right_client
      if target < 0 { .right_top_cmd = 0 }
      else if target > max_r { .right_top_cmd = max_r }
      else { .right_top_cmd = target }
  }
  ```

- `.OnRightScroll(h, c, sy)`（:344-351）：仅
  `.right_top_view = sy; .right_height = h; .right_client = c`。
  **删除对 `.left_top*` 的一切写入（单向）**。
- v2（T-04）：`OnLeftScroll` 同步臂由 rust 直写替代/增强——rust 侧算出
  `sync_anchor_block` 与 `right_top_cmd` 目标后 `write_*_state` 直写
  （`write_ghost_state` 同款），handler 保留 vue 契约面。

### 5.2 消振不变式（复审检查点）

> **cmd 写者封闭律**：`*_top_cmd` 的赋值语句只允许出现在
> `.SetScrollTop`（用户拖拽）、v1 同步臂 / v2 rust 直写（单向、幂等）。
> `OnXxxScroll`（echo）禁止写任何 cmd。

复审以 grep 断言：`grep -nE "\.left_top_cmd|\.right_top_cmd" app.at` 的每处
赋值落在上述白名单 handler 内。

### 5.3 单向同步 v1（比例近似）

见 §5.1 同步臂。两栏内容高度本不一致（实测左 2653 vs 右 3088），比例为近似；
优点是零引擎依赖（除 T-02 算式问题）。钳制保证目标 ∈ [0, max_r]，echo 后
`OnRightScroll` 不回写，单次落位。

### 5.4 块锚定 v2（引擎胶水，转介）

决策件 = `docs/plans/attachments/063-auto-lang-transfer.md`（052 转介单同
款格式），内容：
1. 锚块判定：`core.block_rects()`（editor core，renderer.rs:11822 先例）+
   offset/client，首块判据 `rect.y - offset ≥ -2 ∧ rect.y + rect.h - offset ≤ client`，
   空态回退"与视口顶相交块"。
2. 右栏目标 y 三选一（T-04 调查后定）：(a) 渲染臂块容器 iced bounds（aura id
   bounds 收集，Scrollable 构造注释提及的机制）→ `y_i - pane_y + 0`；
   (b) 渲染臂块高累计（若 parse_blocks 布局面可得每块高）；(c) 块序占比
   `i/N × (rh-rc)` 兜底。
3. 落点：aura_view_builder `autodown_scroll_binding` 读臂回调或 renderer
   update 层（`OnEditorFocus` 拦截先例）。
4. auto-lang 侧测试：单测锚判定纯函数 + vm-smoke AC-06 断言。

### 5.5 停稳去抖（可选）

T-05 调查 Plan 407 tick（`tick_interval_ms`/`tick_msg`，renderer.rs:20365、
:19578）对 demo `.at` 的声明语法与可达性；可用则 §2.3 方案，阈值 150ms；
不可用维持每事件同步（正确性不受影响），DEBTS 059 同族补记。

### 5.6 双轨与再生

`is_vue()` 门控全部保持；vue 惰性 props 不新增读取。T-06：`bash
gen/regen.sh` → `git diff autodown/demo/src/App.vue` 审阅（预期仅状态更名与
handler 体）→ e2e 全量。`useSyncedScroll.ts` 零改动。

### 5.7 测试契约（vm-smoke 第 4 组重写口径）

| # | 断言 | 判据 |
|---|------|------|
| a | 左滚 240 → 状态收敛 | `left_top_view>100 ∧ left_height>left_client ∧ right_top_cmd>0`（v1 门控：T-02 通过前降级为"右栏 offset_y>0 或跳过并记录"）|
| b | 反振荡 | 收敛后 1.5s 采样 `left_scroll_events` 增量 = 0 且 `left_top_view` 恒定（±0.5）|
| c | 单向性 | MCP 右滚 600 → `right_top_view≈600(±5)` 且 1.5s 内 `left_top_view` 变化 <1 |
| d | 拖拽不回退（043 T10 面） | MCP drag → `left_top_cmd` 跳变、左 offset_y 跟随、右 offset_y 跟随，随后 b 判据过 |
| e | 幂等 | 重复左滚 240 → `right_top_cmd` 不变，无新增 scroll_to 引起的事件洪峰 |

### 规范增量

| delta_id | add/modify/retire | 目标 | before/after 规则 | rationale | acceptance IDs |
|---|---|---|---|---|---|
| SD-01 | add | `.autoos/specs.json#P063-1`（goals） | 无 → VM 轨滚动同步目标改写：零振荡（cmd/view 分离）、单向左→右、块锚定顶对齐（v1 比例近似）、右栏自由滚动 | 双向实时联动实测自激，结构性退役 | AC-01..03 |
| SD-02 | add | `.autoos/specs.json#P063-2..6`（architecture/designs/tests/reports/reviews） | 无 → §2/§5/§6/§7 对应沉淀（merge 时落账，file 溯源指本文件） | 账本六节惯例 | AC-01..08 |
| SD-03 | modify | `autodown/demo/auto/PARITY.md` #2 | "写臂/读出双臂 + 双向比例联动" → "cmd/view 状态分离；单向块锚定命令式（v1 比例近似，v2 像素锚定）；vue 轨 useSyncedScroll 不变" | 契约面换轨，双轨差异显式 | AC-07 |
| SD-04 | modify | `autodown/demo/auto/README.md` :45-49 | 双向比例同步描述 → 单向命令式同步 + 状态分离说明 + PARITY 指针 | VM track 契约文档对齐 | AC-07 |
| SD-05 | add | `DEBTS.md` 新行 ×2 | 无 → ①引擎写臂 echo 自激环（note_scroll_offset 语义）+ handler 复合算式为 0（T-02 裁定后定性转介）；②tick 原语缺位（059 同族，若 T-05 判不可用） | 引擎侧问题登记不静默 | AC-05, AC-08 |

## 6. 测试设计

- **VM 轨**：vm-smoke 第 4 组按 §5.7 重写（a–e），`node vm-smoke.mjs --port
  9359` 退出码 0；开发期用 tmp/vm-scroll-osc-probe.mjs（60×100ms 采样）作
  快速反振荡探针。049 重试惯例保留（击杀波间歇重跑一次）。
- **vue 轨回归**：`bash gen/regen.sh` 后 `pnpm -C autodown/demo exec
  playwright test`（基线 108/108，含 scroll-sync.spec.ts——vue 机制未动，
  应零改动通过）。
- **引擎侧（T-04，授权后）**：`cargo test -p auto-lang`（锚判定纯函数 +
  直写面）；换装新 exe 复跑 vm-smoke AC-06 断言。
- **T-02 调查法**：最小 .at widget（两个 f64 状态 + 一条含 state 读取的复合
  算式 handler）+ MCP `autoui_state` 对照；同构建跑普通脚本版（已证 738.6）
  与 handler 版（0）二分定位；对照 auto-lang master 构建判定是否 lang-602
  worktree 特有回归。

## 7. 验收标准

| ID | 可观察行为 | 验证方法与预期 |
|----|------------|----------------|
| AC-01 | 左栏任意方式滚动（滚轮/原生条/自绘 thumb）停手后 1.5s 内滚动事件停增、位置恒定，无乒乓 | vm-smoke b 判据（`left_scroll_events` 增量=0）+ 会话日志无 120↔0 型交替 |
| AC-02 | 左滚后右栏一次落位（v1 比例近似） | vm-smoke a 判据；**T-02 裁定算式为 0 且未清偿时，本 AC 降级为"右栏不动且无回写"，同步能力随 T-04 达成** |
| AC-03 | 右栏自由滚动不回写左栏；CustomScrollbar 拖拽与 thumb 显示不回退 | vm-smoke c/d 判据；thumb_t 随原生滚动更新（`left_top_view`） |
| AC-04 | vue 轨零回归 | regen diff 审阅 + demo e2e 全量 108/108（scroll-sync.spec.ts 原样通过） |
| AC-05 | handler 算式为 0 的根因裁定成文 | T-02 决策件（最小复现 + 二分结论）；若引擎缺陷 → DEBTS 转介行在册（SD-05①） |
| AC-06 | 块锚定顶对齐（v2，转介后） | ✅ 已达标（2026-09-13）：滚左 700 → 锚块 9 → content_y=846.79 → right_top_cmd 写入 → 右栏 echo 跟随 846.79（顶差≈0）；smoke (f) 腿 `sync_anchor_block == 0` 精确断言 + (a) 腿 ≥1 断言；锚块琥珀描边与右栏顶对齐截图在案 |
| AC-07 | 契约面对齐 | PARITY #2 / README :45-49 改写 diff + specs.json P063 六节（merge 时）；§5.2 grep 白名单断言零违例 |
| AC-08 | 停稳去抖有结论 | T-05 决策件：可用→实装 + smoke 时序断言；不可用→DEBTS 059 同族补记 |

## 8. 执行步骤

| ID | 任务 | 依赖 | 文件/符号（已核对） | 产出 | 验收 | 验证命令与预期 |
|----|------|------|--------------------|------|------|----------------|
| T-01 | ✅ 已完成——commit 17de027（worktree plan-063-dev）。实证：原生滚轮 A/B（Win32 SendInput 真实滚轮路径）——旧 app.at 5 格 → 5 秒 340 次 OnLeftScroll 帧率乒乓 L120↔L240；新 app.at 同输入 6 事件即停稳（left_top_view=300，left_top_cmd=0，计数冻结）；regen 门禁 REGEN OK | — | app.at :136-141/:176/:244-246/:267-269/:319-351；gen/regen.sh | 抖动消失的 VM 窗口；再生 App.vue | AC-01 前提、AC-04 前提 | `node tmp/vm-scroll-osc-probe.mjs 9359 600`：60 采样 left_top_view 恒定、事件 ≤3；gen 门禁零告警 |
| T-02 | ✅ 已完成——裁定=**引擎缺陷**：handler 内 f64 二元算术/比较坍缩 int 0/恒假（dbg 二分：参数/state 读取完好，`h-c`→0(int)、`if h>c&&…`→false；普通脚本同式 738.6273 正常）；殃及拖拽 Move 守卫（旧 app.at 现引擎同证，回归非 063 引入）。DEBTS 063 转介行在册。偏差记录：auto-lang 对照构建未做（lang-602 worktree 会话中期被清；回退窗口改以 09-04 vm-smoke 组 4 全绿为锚） | T-01 | 新建最小 .at probe；auto-lang 对照构建 | §10.2/DEBTS 决策记录 | AC-05 | 决策件含可复现命令与两构建读数 |
| T-03 | ✅ 已完成——commit 57c7f60。vm-smoke 全量 **PASS 20/20**（首次尝试，未动用 049 重试）：组 4 新契约 a–e 全绿（(a)(d) 按 syncFired 引擎健康信号门控降级；反振荡计数冻结 3→3；单向性右滚左不动；幂等复滚无事件风暴）；PARITY #2/#8、README、DEBTS 063 行落稿 | T-01, T-02 | vm-smoke.mjs :343-470；PARITY.md :15/:21；README.md :45-49；DEBTS.md | 新契约 smoke | AC-01..03, AC-07 | `node vm-smoke.mjs --port 9359` 退出码 0 |
| T-04 | ▶ 进行中（2026-09-11 用户授权 auto-lang 范围）。已完成：**T-04b f64 缺陷根因修复**（auto-lang auto-down-dev abd6aeca8——_D 族 pop_f64_operand 标签驱动弹栈，plan063_handler_float_tests 3 红转绿，全量 lib 200 红 ⊆ master 基线 210）+ **T-04c 引号 emit 路由修复**（1a828a2cf——空体引号 handler 合成 __emit 桥写对 + msg 名剥前导点；语料 test/ui/plan063_child_scrollbar；全量 lib 名集差集仅 osconfig_daemon 环境抖动族）。实机复归：vm-smoke 20/20 全量臂（同步 offset_y=240.9 + 拖拽 968.7 + 零振荡），DEBTS 063 销号。T-04e 实装尝试后撤除（a6bc7a4 → 1258624：App 级 timer 实测 fire_timer=0 不触发，SettleSync 死代码移除；去抖按 §0.3 预授权退役——单向逐事件同步安全，App 级 timer 缺口入 DEBTS 065）。T-04d-2 ✅ 已落地（2026-09-13，auto-lang 334d44e53/6d3cd294e/57d3ae105 + auto-down d85056a）：树委托根因修复（update/mouse_interaction 须传 tree.children[0]——iced 0.14 透明 container 链实证）+ VNode 检视层透传 + sink 注册与 sync_anchor 解耦 + ANCHOR_SLOTS_ENABLED 启用 + 组 4 AC-06 四腿断言；vm-smoke 21/21 两连绿 + e2e 108/108 | T-01；§10.1 授权 | auto-lang renderer.rs/aura_view_builder.rs（独立 worktree）；转介单；smoke AC-06 断言 | 像素级锚定 | AC-06 | `cargo test -p auto-lang` 相关模块绿；vm-smoke 全组含 AC-06 |
| T-05 | ✅ 已完成——裁定=**可用**：051 C7 已落 VM 轨 `timer {every_ms, when}` 动态 timer 面（parser.rs:14727、dynamic.rs:407、renderer.rs:15416/13229，062 F1 修空转拍置脏）；DEBTS 059 前提部分过时（注记入 063 行）。停稳去抖实装折叠进 T-04（同步写本身受 T-02 门控，先去抖无对象） | T-01 | renderer.rs:20365/:19578 对照；app.at | 决策件（+可选实装） | AC-08 | 决策件 + （若实装）smoke 时序断言 |
| T-06 | ✅ 已完成——worktree e2e 全量 **108/108**（E2E_PORT=5199，1.8m），含 scroll-sync.spec.ts 原样通过与生成器 PLAN-601 主题漂移验证（App.vue 再生随行折入，e2e 判绿）；engine build 三 assert + gen 树 vue-tsc 门禁随 regen 通过 | T-01 | autodown/demo/src/App.vue；e2e | 回归报告 | AC-04 | `pnpm -C autodown/demo exec playwright test` 108/108 |
| T-07 | ✅ 已完成——§5.2 白名单 grep 零违例（cmd 写者仅 :343 SetScrollTop / :367 同步臂）；specs 六节=§5 规范增量表（SD-01..05，merge 时落账）；work 交接记录见 §9 | T-01..T-03, T-05, T-06 | .autoos/specs.json；app.at | 交接记录 | AC-07 | grep 断言零违例；review 交接 |

执行顺序：T-01 →（T-02 ∥ T-05 ∥ T-06）→ T-03 → T-07；T-04 授权后插入
（T-03 之后即可独立进行）。每步随行跑目标 smoke/探针；收口跑 vue e2e 全量。

## 9. 复审记录

### re-review（2026-09-13，四发现修复后终审）

- `stage: review` | plan_id: PLAN-063 | plan_revision: 1 | **outcome: pass** |
  reviewed_commit: auto-lang auto-down-dev 57d3ae105（行为面未变，test-only
  尾 commit）+ auto-down plan-063-dev 049657e（修复轮）| base_commit: 同
  前记录 | spec_inputs: 同前记录
- 四发现闭环核验：
  - F1 ✅ 049657e——PARITY #2 改「v2 rust 直写唯一同步源（v1 比例臂已随
    T-04d-2 摘除）」+ 证据列补 T-04d-2 收口句；README 同步段改 landed。
  - F2 ✅ e449070（计划 T-04 行 T-04e 改写实装尝试后撤除）+ 049657e
    （DEBTS 065 新行：App 级 timer 派发未接通，059 同族，🟡 延期）。
  - F3 ✅ 049657e——gen/regen.sh REGEN OK，App.vue SettleSync 残留清零
    （9→0），gen/front 两中间产物随行；regen 后 e2e 全量 **108/108 复绿**
    （2.0m，实跑）。
  - F4 ✅ 049657e——container-edit-faces.png 取证截图随修复轮入库；worktree
    status 干净（仅余会话性未追踪 PNG）。
- **证据复用声明**：修复轮零 VM 轨代码改动（仅 .md/DEBTS/生成 App.vue/
  截图）——vm-smoke 21/21 两连净窗与 cargo tf 3516/3516 证据按前记录
  引用；vue 轨证据以 regen 后实跑 e2e 108/108 为准（新鲜）。
- **acceptance_results**: AC-01..08 全部 pass（AC-07/AC-08 由 partial
  转正）。
- **next**：merge（auto-plan-merge；含 auto-lang auto-down-dev 回折与
  worktree 清理；specs P063 六节落账）。

### review（2026-09-13，T-04 全段收口后复审）

- `stage: review` | plan_id: PLAN-063 | plan_revision: 1 | **outcome: needs_fix** |
  reviewed_commit: auto-lang auto-down-dev 57d3ae105 + auto-down plan-063-dev
  d85056a（主检出文档 650d404）| base_commit: auto-lang a3d53cbfc；
  auto-down worktree 分支基 77e8fde 系 | dependency_revisions: autodown-core
  路径依赖解析至同组 auto-down worktree（plan-063-dev），exe 由两 worktree
  联合构建 | spec_inputs: .autoos/specs.json P063 六节（SD-01..05，merge 时
  落账）；docs/specs 既有滚动/编辑器契约无冲突
- 复核限制声明：本复核在实现会话内进行，结论由工件重建（git 链、err.log
  复核、四轮实测门禁），不依赖执行摘要。
- **达标面（证据充分）**：
  - AC-01 pass——smoke (b) 反振荡计数冻结（3→3，两连净窗）+ T-01 原生滚轮
    A/B（340 事件→6 事件）。
  - AC-02 pass（v2 达成，超额于降级口径）——smoke (a) sync 臂必燃
    offset_y=247.3 跟随；(f) sync_anchor_block==0 精确断言；数字链
    700→锚块 9→y=846.79→右栏 echo 846.79（顶差≈0）。
  - AC-03 pass——smoke (c) 右滚左不动 + 锚保持 + cmd 不被右滚写；(d) 拖拽
    left_top_cmd 跳变 968.7 + offset_y 跟随。
  - AC-04 pass——vue e2e 108/108（本会话实跑 1.7m）。
  - AC-05 pass——T-02 决策件 + DEBTS 063 已销号（abd6aeca8/1a828a2cf）。
  - AC-06 pass——见阶段记录 3 数字链 + 锚块描边/右栏顶对齐截图（worktree
    demo/auto/src/front/tmp/，merge 清理后以本记录文字为准）。
- **证据新鲜度**：行为门禁（smoke 21/21 两连净窗、e2e 108/108）运行于
  6d3cd294e 构建；57d3ae105 仅动 #[cfg(test)]，二进制行为不变——复用该
  证据的理由成立。cargo tf 3516/3516（57d3ae105 树实跑 34.5s）；lib
  default 3505/0；--features autodown 残差 203-206 名经三运行交叉核对
  全为环境抖动/既有族（osconfig resolve 翻转、plan370 既有失败、ffi_dual
  抖动；master 208 名同规模），零新增失败。
- **findings（全部文档/生成物层，核心实现面零缺陷）**：
  - **F1（AC-07，low）**：PARITY.md #2 行（:15）与 README :45-52 契约措辞
    过时——仍写「v1 比例臂」「v2 走 rust 直写转介」「T-04 in progress」；
    实际 v1 比例臂已摘除、v2 rust 直写已落地（d85056a）。证据列止于
    abd6aeca8/1a828a2cf 时代。改法：两处补 T-04d-2 收口句（v2-only 直写）。
  - **F2（AC-08 + 计划真实性，medium）**：T-04 行「T-04e ✅ 已落地
    （a6bc7a4）」与 1258624（SettleSync/timer 死代码移除，实测
    fire_timer=0——App 级接线未通）矛盾；AC-08 结论未连贯成文，「timer 面
    App 级不触发」未按裁定路由做 DEBTS 059 同族补记。改法：T-04 行改写
    T-04e 为「实装尝试后撤除（App 级 timer 不触发）」+ 去抖结论（单向
    逐事件同步已安全，§0.3 预授权非必需）+ DEBTS 补行。
  - **F3（AC-04 卫生面，medium）**：生成物 App.vue 陈旧——仍含
    SettleSync/left_settle_due 死代码 9 处（app.at 已于 1258624+d85056a
    两度变更，regen 未随行）。改法：`autodown/demo/auto/gen/regen.sh`
    再生 + 提交 + e2e 复绿确认（死代码摘除应零行为变化）。
  - **F4（housekeeping，low）**：被跟踪 e2e 基线截图
    container-edit-faces.png 有 4 字节像素噪声脏改动（本会话 e2e 重跑
    副作用）——还原或裁定更新，reviewed 树须干净。
- **acceptance_results**: AC-01 pass / AC-02 pass / AC-03 pass / AC-04
  pass / AC-05 pass / AC-06 pass / AC-07 **partial（F1）** / AC-08
  **partial（F2）**。
- **evidence**：本记录 + 阶段记录 3（数字链在案）；worktree
  auto-down/autodown/demo/auto/vm-demo-live.{log,err.log}（会话产物，
  merge 清理后以记录摘录为准）；tmp/t04d2-verify.mjs（复跑探针）。
- **next**：回 work 修 F1..F4（预计纯文档/regen 面，半小时级）→
  复审（re-review 仅核四发现 + 树干净，行为门禁可引用本记录证据——
  代码不变前提）→ pass 后 merge。
### 立项 handoff（2026-09-11，draft）

- `stage: new`，PLAN-063 rev 1。
- `outcome: pass`——T-01/T-02/T-03/T-05/T-06/T-07 在 auto-down 授权范围内
  可开工；**T-04 `blocked`**：auto-lang 侧改动需用户单独授权 + 与 lang-602
  在用会话协调（§10.1），授权前 AC-06 保持 pending。
- `next: work`（自 T-01 起）；变更任务/验收 ID：无（首版）。
- 设计沿革：用户原始提案（hover 图标手动同步）→ 会话中演进为"滚动停稳自动
  单向锚定"（本计划采纳），两守则（单向、左栏无 echo→写臂边）经用户确认；
  "摘写臂"细化为"cmd/view 状态分离"以保住 043 T10 拖拽面（PARITY #8），
  属同授权范围内的实现精化。

### work 交接（2026-09-11，T-01..T-03/T-05..T-07）

- `stage: work | plan_id: PLAN-063 | plan_revision: 1 | outcome: blocked（仅 T-04）`
- code_commit：worktree plan-063-dev = 17de027（T-01）→ 57c7f60（T-02/T-03/T-05 文档与 smoke）；主检出立项 634f608。
- task_ids：T-01 ✅ T-02 ✅ T-03 ✅ T-05 ✅ T-06 ✅ T-07 ✅；T-04 ⏸ blocked（§10.1）。
- evidence：滚轮 A/B（§8 T-01 行）；vm-smoke 20/20 PASS（组 4 新契约，含两处预授权降级臂）；e2e 108/108；DEBTS 063 引擎转介行 + PARITY #2/#8 + README 改写。
- 运行时说明（复审须知）：VM 验证 exe = auto-lang 主检出 16:51 构建（master ≈29aa7a9ab 前后，autodown-core 路径依赖指 auto-down 主检出）；lang-602 worktree 于会话中期被并行会话清理，fresh 复审需以彼时 master 重建 exe 复跑。
- blockers：T-04 需用户二选一——(i) 授权 auto-lang 范围（独立 worktree，含引擎 f64 缺陷修复 + 块锚定直写 + 停稳去抖实装，AC-02/03/06 全量复归）；(ii) 将 T-04 剥离为彼仓独立计划/转介单，本计划以现行降级口径收口复审。
- next：用户裁定 → work 续 T-04 或 review（现行降级口径）。

### work 阶段记录 2（T-04d-2 部分落地 + 挂起，2026-09-11 深夜）

- auto-lang auto-down-dev 新增 7872023ad：AnchorSlot 变体 + 布局期块高注册表 +
  SettleSync 消费 + table_resize 树守卫——**机制全部落地**。
- **挂起**：AnchorSlot 委托层在 iced 0.14 树上触发 mouse_area 无状态
  downcast panic（RUST_BACKTRACE 实证：anchor_slot::update → container →
  column → mouse_area → tree.rs:254）。wrap 以 ANCHOR_SLOTS_ENABLED=false
  挂起（autodown_render.rs），右栏恢复渲染。疑点：children()/diff() 已按
  hover_area 规范实现仍触发——需 iced 0.14 树 diff 语义的专项调试。
- 现行可用态：v1 比例同步臂（f64 修复后正确计算，实机 861.73 跟随）+
  锚块高亮 + 零振荡 + 拖拽。偏差（比例近似）待 T-04d-2 启用后归零。
- vm-smoke 20/20（re-run 群组 7 需新窗，属操作项非缺陷）。

### work 阶段记录 3（T-04d-2 调通收口，2026-09-13）

- **panic 根因定位并修复**（auto-lang 334d44e53）：iced 0.14 的 container 是
  树透明委托（tag/state/children/diff 全转发 content，update 原树透传）——
  AnchorSlot::update/mouse_interaction 误传自身 tree 而非 tree.children[0]，
  经透明 container 链把无状态树错配给 column 首个孙件（mouse_area downcast
  崩）。此前"layout 未调用"的结论是 slots 关闭态+陈旧 exe 的观察假象（上会
  话 err.log 复核：无 SLOT 打印但也无 panic，slots 实际未启用）。补齐
  operate/overlay/size_hint 委托（hover_area 范式全对齐）。
- **两个次生修复**（6d3cd294e）：VNode 检视层对 AnchorSlot 透传（曾降级空
  Text → MCP 快照块内容消失，smoke 面板寻址断）；sink 注册与 sync_anchor
  解耦（target prop 属右栏自身）。测试面 57d3ae105：doc_children 剥层辅助
  适配 21 个结构断言。
- **auto-down 侧**（d85056a）：app.at 声明 sync_anchor_target + 摘除 v1
  比例臂（块锚定 rust 直写为唯一同步源）；vm-smoke 组 4 四腿扩断言（(a)
  sync 臂必燃+锚索引、(c) 右滚不动锚、(d) 拖拽右栏跟随收敛、(f) AC-06
  确定性 ==0）+ 053 漂移族 reissue 补强。
- **门禁**：vm-smoke 21/21 净窗两连绿；vue e2e 108/108；auto-lang lib
  default 3505/0 全绿、--features autodown 残差 203-206 全为既有环境抖动
  族（osconfig_daemon resolve 等，run-to-run ±3 翻转，与 slots-off 基线
  差集仅 6 名同族翻转）。
- 余项：无执行面余项；进入 review → merge（auto-lang auto-down-dev 回折
  由 merge 收口）。

## 10. 待澄清事项

1. ✅ 已裁定：独立 worktree（.wt/auto-down-063/auto-lang，分支 auto-down-dev）
   授权执行，T-04b/c/d/e 全部落地（见 work 阶段记录 1-3）。
2. ✅ 已裁定（T-04d-2）：**块高累计**方案——AnchorSlot layout 期记录块高，
   消费侧 content_y = 前块高累计 + 列间距 8（屏内外均有效，零注册表坐标
   依赖）。
3. **反向同步需求确认**：默认永不做右→左；若未来需要，必须带"程序性滚动源"
   标记并重新过振荡审查。**决定人：用户（默认否）。**
4. ✅ 已裁定（T-03 执行）：旧名无外部消费者，vm-smoke 已随组 4 重写消费新名；
   归档计划/历史探针不回改（历史件）。
5. **停稳阈值**：若 T-05 实装，默认 150ms；是否需要可配置入口待定（默认不配）。
