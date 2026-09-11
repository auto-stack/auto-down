# PLAN-063 auto-lang 转介单（T-04 引擎面）

状态：执行中（T-04b/c 已落地并验证；T-04d/e 设计要点在案）
分支：auto-lang `auto-down-dev`（worktree `D:/autostack/.wt/auto-down-063/auto-lang`，基线 master a3d53cbfc）
关联：auto-down PLAN-063（docs/plans/063-vm-scroll-sync-oneway-anchor.md）、DEBTS 063 行（已销号）、PARITY #2/#8

## 1. 已落地修复（已验证）

### ① f64 参数算术/比较坍缩（abd6aeca8）

- 根因：`_D` 族 opcode（ADD/SUB/MUL/DIV_D + EQ/NE/LT/GT/LE/GE_D）用严格
  `decode_f64` 的 `ram.pop_f64`；demo/iced 派发路（`call_handler_for` →
  `push_value`）对 `Value::Float` 推 **f32 编码槽**（`push_f32`）。msg 声明
  `f64`（Type::Double）的参数参与任何二元运算/比较 → 解码失败 → 全零位型
  （恰为 int 0）/恒假。
- 修复：`pop_f64_operand(task)` 标签驱动弹栈（Plan 437 `pop_f32_operand`
  同款口径），十臂替换（engine.rs）。
- 回归锁：`plan063_handler_float_tests.rs` 三例（参数减法 / f64 拼写全级联 /
  参数 float 比较），红→绿。
- 全量：lib 200 红 ⊆ master 基线 210（名集差集 = osconfig_daemon 环境抖动族，
  两侧皆红，master 更红）。

### ② 空体引号 handler 的 emit 路由（1a828a2cf）

- 根因（两层）：
  a. 空体引号 handler（`."update:scrollTop"(v) -> {}`，vue 生成器在其后追加
     `$emit` 的声明式空体）在 VM 合成期保持字面空体 → Plan 398 sibling 直调
     调用它 = 静默无操作（576-G3 重写臂被 `is_handler` 条件让位）。
  b. 合成的 msg 名保留 pattern 的**前导点**（`.update:scrollTop`）→ 清算键
     `on.update:scrollTop` ≠ 注册键 `onupdate:scrollTop` → `lookup_route`
     None（实机 `[VM-EMIT-DRAIN] NO ROUTE` 现行）。
- 修复（handler_codegen.rs 两处合成点）：空体 + 引号/冒号 pattern → 注入
  `__emit_msg/__emit_payload` 桥写对（vue 生成器 `$emit` 的 VM 等价物）；
  msg 名剥前导点。`on_with_input_for` 尾部清算（既有）经 child_emit ROUTES
  路由到父级绑定。
- 回归锁：语料 `test/ui/plan063_child_scrollbar` +
  `child_move_emits_to_parent_scroll_top`（子 Move → 引号 emit → 父
  SetScrollTop，值保真断言）。
- 实机：vm-smoke 组 4 全量臂绿（同步 offset_y=240.9 跟随 + 拖拽 968.7 跳变
  + 零振荡），demo 自绘滚动条拖拽复归。

## 2. 余项设计要点（T-04d/e）

### T-04d 块锚定直写

- 锚块判定（左栏）：`code_editor::core.block_rects()` + 当前 offset，首个
  满足 `rect.y - offset ≥ -2 ∧ rect.y + rect.h - offset ≤ client` 的块
  （tol=2px）；空态回退"与视口顶相交块"。idempotent：对齐后锚块 top=0 仍
  命中（≥ 判据）。
- 右栏目标 y（三选一裁定）：
  (a) view 臂块容器 iced bounds——需新增 per-block bounds 注册（见下）；
  (b) view 臂块高累计——`render_document_streamed_with` 的面板树有块序，
      若布局期可测每块高则求和；
  (c) 块序占比 `i/N × (rh-rc)` 兜底（零新机制）。
- 建议机制：(a) 的最小实现 = view 臂渲染块容器时以稳定 key 注册
  `block_i → iced bounds.y`（布局回调写共享注册表，仿 scrollable 的
  vnode id bounds 思路）；滚动消费侧（编辑壳 on_scroll）查表得目标并
  `write_*_state` 直写 `right_top_cmd` + `sync_anchor_block`。
- 消费点：`on_with_input_for` 尾部清算位（本转介单②的消费侧同址），
  仅 VM 轨 + `scroll_sync` 臂；跨件取编辑壳 core 需经组件级共享句柄
  （两 panes 同一 DynamicComponent）。

### T-04e 停稳去抖

- .at 面：app.at 声明 `timer { SettleSync (every_ms: 100) }`（parser.rs:14727
  语法族；051 C7 动态 timer 面 dynamic.rs:407 + renderer.rs:15416 订阅；
  062 F1 空转拍置脏已修）。
- 语义：OnLeftScroll 置 `left_settle_due = 1`；SettleSync handler
  （rust 拦截，同 OnEditorFocus 直写先例）due 时执行锚定+直写并清 due。
  vue 轨 handler 永不触发（is_vue 惰性），零影响。
- 与 T-04d 合并落地：直写 + 去抖同属 rust 消费侧改造。

## 3. 回折与收口

- auto-down-dev 分支经验证后由 auto-plan-merge 折回 auto-lang master
  （先例：058/051 面B 折回），折回后 auto-down 侧 rebuilt exe 复跑
  vm-smoke + e2e 全量。
- auto-down 侧（worktree plan-063-dev）：app.at（timer + 直写消费声明）、
  vm-smoke 组 4 AC-06 断言、PARITY #2 复归注记。
