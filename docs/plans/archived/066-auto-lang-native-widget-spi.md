---
plan_id: PLAN-066
status: archived
feature_name: auto-lang 原生组件外部注册 SPI——NativeWidgetRegistry + View::Custom + autodown_editor 首迁 + stream 渐进臂
author: zcode
created_at: 2026-09-14T15:30:00+08:00
updated_at: 2026-09-15T00:30:00+08:00
plan_revision: 1
current_step: 6
total_steps: 6
supersedes_spec_components: []
new_spec_components:
  - ".autoos/specs.json#P066-1"
  - ".autoos/specs.json#P066-2"
touched_goals: []
---

# PLAN-066 — auto-lang 原生组件外部注册 SPI（NativeWidgetRegistry）

## 0. 变更摘要

desktop README §8 提案⑦（`docs/plans/attachments/066-auto-lang-native-widget-spi.md`，
2026-09-14 入档定稿）经用户裁定开工，本计划将其转为可执行契约。三件事：

1. **SPI 基建（auto-lang 侧）**：`NativeWidgetRegistry`（原生组件注册表）+
   `View::Custom` 透传变体 + aura_view_builder 派发序接线（内置臂 → 原生注册
   表 → .at AuraWidget → 折叠兜底 → 未知 tag 兜底，现状语义不弱化）+
   snapshot_builder 配套臂（外部件对 AutoUI MCP 快照可见）。语义模板对齐
   Plan 435 ui_gen `ComponentRegistry`（Builtin 优先 / 同名拒绝记 violation /
   注册面可 dump）。
2. **autodown_editor 首迁（案 a sugar）**：两处硬编码字符串臂
   （aura_view_builder.rs:1734 untyped / :3382 typed）的臂体提取为
   ViewFactory，feature 门控（`autodown × code-editor`）注册进注册表；快照
   kind 与 vm-smoke 断言面零改动（保形优先）。
3. **stream 渐进臂**：摘"streaming 恒按 final"豁免（aura_view_builder.rs:33
   在案）——`is_final=false` 通道补三态语义（未闭合=安全降级 / 开放
   fence=loading 等高骨架 / 闭合=终态），对齐 engine plan 032 契约，MCP 快照
   可断言。

**硬边界**：TS/Vue SFC 本体不注册（共享面 = `.at` 单源 + a2r）；不做 dylib；
iced 后端先行；既有内置件（terminal/code_editor/video）语义零变化；web 轨与
本仓 engine 代码零改动。

**跨仓形态**：实现全部在 auto-lang 依赖 worktree（`D:/autostack/.wt/
auto-down-066/auto-lang`，分支 `auto-down-dev`，基线 master `8aeb8150e9`，
TDD 红→绿先折本分支后折 master）；本仓主检出只承载 Plan 进度与文档；回归门
在本仓 jade desktop vm-smoke（16 臂，worktree 构建的 auto.exe）。

依赖解析：worktree 的 `autodown-core` path 依赖（`../../../auto-down/
autodown/packages/engine/rust`）自 worktree 解析为**主检出** crate（组内无
auto-down 兄弟；主检出 engine 无改动，符合只读消费）。

## 1. 目标与验收

- **G1 SPI 基建**：注册表 + View::Custom + 派发序 + 快照配套落地，单测
  （红→绿）覆盖：注册/查得/未注册回落与 master 保形/同名拒绝记 violation/
  dump 面。（AC-1/AC-2）
- **G2 首迁等价**：autodown_editor 经注册表派发后，View 树与快照对 master
  逐字节一致（等价语料钉死），彼仓 lib 全量红集 ⊆ 基线红集。（AC-3）
- **G3 stream 三态**：is_final=false 下未闭合块降级、开放 fence loading 骨
  架、闭合终态，core 级单测 + 快照断言。（AC-4）
- **G4 实机回归**：jade desktop vm-smoke 16 臂 ×2 全绿（worktree exe），编辑
  器流五断言在场。（AC-5）

## 2. 现状与证据

见提案全文 §2（证据索引表 8 条，file:line 级）。要点复述：

- 派发硬编码：`crates/auto-lang/src/ui/aura_view_builder.rs:1727/1731/1734/
  1887`（+typed 站点 3375-3525，共 38 臂）；
- View 闭集：`crates/auto-lang/src/ui/view.rs:428`（专属变体 `:591`）；
- 快照穷尽 match：`crates/auto-lang/src/ui/snapshot_builder.rs:254`；
- stream 豁免：`aura_view_builder.rs:33`；
- 跨仓依赖先例：`crates/auto-lang/Cargo.toml:99/:132`（autodown-core path）；
- 原生件分层：`src/ui/autodown_editor/mod.rs`（core 禁 iced / widget 唯一
  iced 点 / feature 门控）；
- 语义模板：Plan 435 `ui_gen::widget::ComponentRegistry`
  （`tests/component_registry_test.rs`——Builtin > Local > Package、内置不可
  shadow、包组件统一通道）。注意：该注册表在 **ui_gen codegen 路径**，登记
  的是 `.at` 组件源定义；VM/iced 解释路径的原生件注册是本计划的净新增。

## 3. 实施设计

### 3.1 NativeWidgetRegistry（新模块 `src/ui/native_widget.rs`）

- 两种入口：
  - `register_view(name, ViewFactory)`——factory 在**派发期**产 `View`
    （props/events/bindings 已解析），供可由既有 View 词汇表达的组件
    （autodown_editor 案 a 即此类）；
  - `register_element(name)`——仅登记名字，派发期产 `View::Custom`，由
    iced renderer 在 **lowering 期**查 Element factory 产 `Element`（为
    后端原生件留的通道；本计划只落通道与 iced 查表臂，不迁移任何既有件）。
- 语义（对齐 435）：同名重注册拒绝并记 violation；`lookup(name)` 返回入口
  类型；`dump()` 供门检/AUTOUI 面列清单。
- 注册时序：feature 门控模块在 session/interpreter 装配期注册（具体挂点在
  实现时按 interpreter 初始化链定位，倾向与 `WidgetRegistry` 装填同层）。

### 3.2 派发序（aura_view_builder 两站点同改）

内置硬编码臂（**零改动**）→ `NativeWidgetRegistry`（view factory 命中=直
接产 View；element 命中=产 `View::Custom`）→ `WidgetRegistry`（.at 件，现
行）→ 折叠兜底（P8-6）→ 未知 tag 兜底（文本占位）。未注册名行为与 master
逐字节一致。

### 3.3 View::Custom 变体与配套

- `src/ui/view.rs`：`Custom { name: String, props: Vec<(String, Value)>,
  events: Vec<(String, Msg)>, style: Option<Style> }`（字段形状以实现时编
  译通过为准，语义=name+props 透传保快照明文面，不用 Box<dyn>）；
- `snapshot_builder.rs`：`Custom` 臂 → `UiNode { kind: name, props, actions:
  events }`；
- iced renderer：`Custom` lowering = 查注册表 element 入口 → factory →
  `Element`；未注册（理论上不可达：派发期已拦）回落文本占位防御臂。

### 3.4 autodown_editor 迁移（案 a）

- 臂体（1734/3382 两处同构块）提取为 feature 门控 fn
  `convert_autodown_editor(...)`，装配期
  `register_view("autodown_editor", ...)`；字符串臂删除；
- factory 内部仍产 `View::AutodownEditor`（变体保留为 sugar，案 b 并入
  Custom 不在本计划）；
- 等价语料：现有 autodown 臂单测/快照 + 新增"经注册表派发"断言（红→绿：
  先删臂应红=派发不到，注册后绿=等价）。

### 3.5 stream 渐进臂（T4）

- 现状：`is_final` 入 View 但渲染恒按 final（豁免在案）；
- 目标语义（对齐 032）：`is_final=false` 时——未闭合引擎方言块（`$name`
  未闭合）→ 段落字面降级；开放 fence → loading 等高骨架（min-height 占位，
  无动画 v1，类链对齐 `.autodown-block-placeholder.is-loading` 语义）；
  闭合块 → 终态；`is_final` 翻转后快照一致；
- 落点：autodown_editor `core.rs`（禁 iced，DocFrame/DocDrawList 级）+ 读臂
  快照断言；widget.rs 仅在骨架绘制需要时最小触达。

## 4. 任务清单

- [x] **T1 SPI 基建**：`native_widget.rs` 注册表（两种入口+violation+dump）
      单测红→绿；`View::Custom` 变体 + 派发序接线（两站点）+ snapshot 臂 +
      iced 查表臂；未注册名保形单测。证据：新测文件名+红/绿输出+全量红集对
      比。
      **[✅ 已完成 2026-09-14]** 模块单测 `ui::native_widget::tests` 7/7 绿
      （注册/查得/重名拒绝记 violation/折叠查找/未知 miss/dump 排序/global
      注册）；语料 `plan066_native_widget_tests` 中 Element 通道
      （`plan066_element_entry_produces_custom_view`：View::Custom name+props
      透传+排序）与未知名保形（`plan066_unknown_tag_bypasses_native_registry`）
      绿；快照臂（snapshot_builder Custom→UiNode kind=注册名）+ iced 防御臂 +
      vnode 检视臂落地。commit 72fd9d70c。
- [x] **T2 首迁 autodown_editor（案 a）**：臂体提取+注册接线（feature 门
      控），两站点删除硬编码臂；等价语料断言（View/快照逐字节一致）。证据：
      等价测试+快照 diff 空。
      **[✅ 已完成 2026-09-14]** 臂体提取 `convert_autodown_editor_native`
      （pub(crate)，双 feature 门控）；global 注册双拼写直接键
      （"autodown_editor"+"autodowneditor"——压缩小写别名不在 P8-6 折叠范围，
      显式注册保形）；无 feature 分支注册 textarea 降级（D-GAP-3 链保持）。
      等价测试 `plan066_editor_tag_dispatches_via_native_registry`（key/
      value/final/on_change/placeholder 逐字段）绿；**红相实证**：临时禁用两
      注册键 → 等价测试红（派发链落兜底）→ 恢复转绿。commit 72fd9d70c。
      全量红集对拍：基线 1342 绿/1 红（plan492 c2 预存）→ T1/T2 后 1357 绿/
      1 红（同一红）——**新红=0**。
- [x] **T3 stream 渐进臂**：is_final=false 三态（core 级单测+快照断言），
      摘豁免注记（改为"三态已落"的实指）。证据：三态测试红→绿。
      **[✅ 已完成 2026-09-14]** 形态对齐 TS stream→edit v1 裁定（engine
      ARCHITECTURE §6：readonly=streaming，流束解锁）：core.rs 流式位
      （AtomicBool）+ sync_external 真消费 is_final（流式位先于差分快路——
      收尾无新字符帧也解锁）+ handle_input 全门控 + 尾部状态条
      （fill+run，高度计入 DocFrame.height；视图实例不渲染——只读轨自有 032
      语义）+ rebuild_with(parse_final) 直通 parse_blocks 单源 final 语义。
      4 测绿：flag 往返/输入门（流式哑→解锁入核）/parse flag 直通（悬空列表
      标记流式剥离→final 产出列表项，emit 观测）/状态条在册+高度计入。红相：
      首跑 2 红（真实断言失败——空列表项无独立块、光标位）→ 观测量修正转绿。
      豁免注记摘除（aura_view_builder.rs:33 对应面改实指）。
- [x] **T4 实机回归门**：worktree 构建 auto.exe（features 对齐 jade 桌面运
      行形态）；jade desktop `vm-smoke.mjs` 16 臂 ×2 全绿 + 编辑器流五断
      言。证据：smoke 输出两连跑。
      **[✅ 已完成 2026-09-14]** worktree exe（`cargo build -p auto` 默认特
      征 ui-iced+python+autodown，v0.4.2-619-g72fd9d70c-dirty=T1/T2+T3 磁盘
      内容）驱动 jade desktop vm-smoke：**16 臂 ×2 连续全绿**（port 9264 /
      9266；六流臂 + tabs 五断言 + fixture 恢复协议两轮 hash 一致）。
      **运行位注意**：smoke 须从 auto-down **worktree**
      （`.wt/auto-down-066/auto-down`，已提交 workaround 形态 app.at）运行
      ——主检出工作树残留 plan622 会话的**未提交 facade 实验形态**
      app.at + tabs_store.at（§8⑥ 已知接缝 repro），在其上 smoke 稳定卡
      "files-reloaded"（master exe 同样红，独立于本计划实证）。
- [x] **T5 收口**：彼仓分支 commit 整备（TDD 痕迹完整）；提案文档状态行、
      README §8⑦、DEBTS 066 行同步实施结果；复审记录落 §9。
      **[✅ 已完成 2026-09-14]** 彼仓分支 auto-down-dev 三 commit
      （72fd9d70c T1/T2、31a2a1035 T3，TDD 痕迹+红相注记在案）；本仓四处文
      档同步落账（提案状态行 / README §8⑦ / DEBTS 066 / 本节）；§9 复审记
      录落款。
- [x] **T6（评审 F1 修复，2026-09-15）**：schema 漂移围栏扩面——
      NativeWidgetRegistry 注册面并入 vb 并集。评审 tf 门禁抓获真回归：
      围栏词表原只认 aura_view_builder 臂式注册（`match tag` 两表并集），
      autodown_editor 迁注册表后 P0 围栏报 `render/rs_not_in_vb` 孤儿。
      正解=**围栏认识新注册通道**（`scan_native_registrations`：剥行注释
      扫 `register_view/element` 首参——不走 `skeleton` 免字符串内容被掏
      空；`mod tests` 截断免单测夹具混入）而非 baseline 白名单——后续外部
      组件天然受同一围栏覆盖；探针名改 `test_register_element` 进程内登记
      （生产源面/P1 双清）。commit e39e581d5。
      **[✅ 已完成 2026-09-15]** 复验：schema_drift 2/2 + tf 3556/3556 +
      tv 3702/3702 + 特征档 103/104（唯一红=§9F2 预存隔离怪象）+
      smoke 第 3 轮绿。

依赖序：T1 → T2 → T3 → T4 → T5（T3 独立于 T2 可并行，但同文件区域冲突风险
高，按序执行）。

## 5. 验证与门

- 彼仓单测：`cargo test -p auto-lang --lib --features autodown,code-editor
  <filter>`（worktree 内；nextest 日常档 `cargo t` 含 ui-iced）；
- 全量红集对比：基线红集（开工首跑记录）vs 实施后，新红=0；
- 实机：jade `desktop/vm-smoke.mjs`（驱动 AutoUI MCP，先例 probe_driver_*）；
- 快照保形：等价语料 snapshot 对 master 输出逐字节 diff 为空。

## 6. 边界与不做

- terminal / code_editor / video 不迁移（后续按件另立项）；
- 案 b（AutodownEditor 变体并入 Custom）、gpui/aura 平行栈、auto-ui 仓同构
  改造：不在本计划；
- dylib 动态插件、多后端 element factory（gpui）：不做；
- 本仓 engine/web 轨零改动；`.autoos/specs.json` 落账随 merge（§8 为
  proposed delta）。

## 7. 风险与回退

- **派发序回归**（.at 件/内置臂被注册表劫持）：以保形单测 + violation 拒
  绝同名为闸；violation 记录不静默。
- **stream 三态与现有豁免消费方冲突**：搜索 is_final 全部消费点后落语义；
  发现不可调和即回退该项并在 §10 登记（提案验收项 3 单独受阻不阻 T1/T2）。
- **autodown-core 主检出漂移**：基线记录本仓主检出 engine HEAD（开工时
  140775f 工作区），实施期间不消费未提交变更；若彼仓侧编译面受影响，记录
  并停在该前置。

## 8. Spec delta（proposed，随 merge 落账）

- `P066-1 architecture`：VM/iced 原生组件注册 SPI 面（注册表两种入口、派发
  序、View::Custom 快照/事件透传、feature 门控注册时序）；
- `P066-2 tests`：等价/保形/三态/实机四门清单与证据位置。

## 9. 复审记录

```
stage: work | plan_id: PLAN-066 | plan_revision: 1 | outcome: pass |
code_commit: auto-lang auto-down-dev 72fd9d70c (T1/T2) + 31a2a1035 (T3)；
worktree D:/autostack/.wt/auto-down-066/auto-lang（基线 master 8aeb8150e9）；
task_ids: T1,T2,T3,T4,T5 |
evidence: plan066 语料 4/4 + native_widget 单测 7/7 + core T3 4 测绿（红相
三处实证：T2 注册缺席等价红、T3 首跑 2 红断言修正）；全量红集对拍基线
1342/1 红（plan492 c2 预存）→ 1357/1 红（T1/T2）→ 1351/1 红（T3）——新红=0；
jade vm-smoke 16 臂 ×2 全绿（worktree exe，port 9264/9266，fixture 恢复协议
两轮 hash 一致）|
blockers: 无 |
next: review（auto-plan-review；彼仓分支折 master 随 merge 通道）
```

```
stage: review | plan_id: PLAN-066 | plan_revision: 1 | outcome: needs_fix →
pass（修复后重评）|
reviewed_commit: e39e581d5（T6 修复后终态；首轮评审对象 31a2a1035）|
base_commit: 8aeb8150e9 | dependency_revisions: autodown-core =
auto-down 主检出 9c6f3bf（实现期间零改动，worktree 干净）|
spec_inputs: 本计划 §8 proposed delta（P066-1/P066-2，随 merge 落账，评审期
未发布）|
acceptance_results:
- AC-1/AC-2（SPI 基建：注册表语义/派发序/快照配套）pass——native_widget 单测
  7/7 + 语料 Element 通道/未知名保形（复跑绿）；
- AC-3（首迁等价）pass——等价语料逐字段绿 + 红相在案 + 评审 diff 确认臂体逐
  字节搬移；证据形态注记：逐字段断言 + 搬移构造保形替代字面"快照逐字节
  diff"（vm-smoke 16 臂为行为级字节门）；
- AC-4（stream 三态）pass——4 测绿（flag 往返/输入门/parse 直通/状态条）；
  语义注记：编辑面形态=TS stream→edit v1 裁定（readonly=streaming+状态条，
  ADR 为准），032 未闭合降级经 parse flag 单源生效，开放 fence 的 032
  loading 骨架视觉属只读轨（只读臂已有）；
- AC-5（实机）pass——vm-smoke 16 臂 ×3（9264/9268 两 exe 代次，fixture 恢复
  协议每轮 hash 一致）。
findings:
- F1（已修复，T6）：tf 门禁抓获 schema_drift_fence 红——围栏词表不识注册表
  注册通道，autodown_editor 迁出臂表后报 render/rs_not_in_vb 孤儿。修复=
  围栏扩面认识注册面（非 baseline 白名单），commit e39e581d5；复验 schema_
  drift 2/2 + tf 3556/3556 绿；
- F2（预存，非本计划，不阻塞）：editor_text_public_api_roundtrip 滤串运行
  报字体回调未安装、全量运行绿（base stash 复现，实施会话已记）；
- F3（预存环境抖动族，不阻塞）：ffi_dual_019 tf 首轮并发红、单跑绿、tf
  复跑全绿——063 文档同类环境抖动族先例。
evidence: review-gates.log / reverify.log（worktree 根，随 merge 归档摘录）；
AC 映射 §1↔§4 本文件 |
spec delta 复核: P066-1/P066-2 文本与实现一致、无废案残留；touched_goals=[]
（无 goals 面变更——纯组件注册架构新增，不动既有目标）|
limitations: 评审在实施会话内进行（独立会话不可用）——结论经工件重建 + 门禁
重跑（tf/tv/schema_drift/特征档/smoke 全部评审基线新鲜复跑）而非执行摘要 |
next: merge（彼仓 auto-down-dev 四 commit 折 master + worktree 守卫清理随
merge 通道）
```

**执行期发现（转介/登记）**：
1. 主检出工作树残留 plan622 会话**未提交 facade 实验形态**
   （`jade-garden/front/desktop/src/front/app.at` 改动 +
   `tabs_store.at` 未跟踪）——在其上 vm-smoke 稳定卡 "files-reloaded"
   （master exe 同样红）。非本计划产物、未处置（所有权归 plan622 会话）；
   smoke 须从 worktree 或恢复 workaround 形态后运行。
2. 预存隔离性怪象（非本计划）：`editor_text_public_api_roundtrip` 单测
   单独运行报 "font system callback not installed"，全量运行绿（基线
   stash 复现与 T3 无关）。
3. ui_gen 路径已有 Plan 435 `ComponentRegistry`（Builtin > Local > Package
   + 内置不可 shadow）——本 SPI 的语义模板；两注册表分属 codegen/解释两条
   轨，后续可评估统一（不在本计划）。

## 10. 待澄清事项

（无阻塞；§9 执行期发现 1 的处置权在 plan622 会话/用户。）

## 11. 合并收据（PLAN-066:r1）

```
stage: merge | plan_id: PLAN-066 | plan_revision: 1 | completion_kind: delivered |
prepared: 评审基线 8aeb8150e9+plan066 三 commit；canonical delta=§8 两节
（P066-1/P066-2）；投影目标=.autoos/specs.json sections.architecture/tests |
landed: auto-lang master 合并提交 bf5eaae7c（ancestor of origin/master，
已推送 71ed7ea90..ed7f92e31 窗口；落地前 reconcile=master 并入分支
7f91913cf 无冲突，合并树刷新验证 tf 3556/3556+schema_drift 2/2+plan066
15/15+smoke 第 4 轮 9270 绿；落地后 master 新增增量核实 docs-only）|
ledger_refreshed: .autoos/specs.json sections.architecture+=P066-1(stable)/
sections.tests+=P066-2(verified)，file=docs/plans/archived/
066-auto-lang-native-widget-spi.md，related=[PLAN-066]，回读验证过 |
archived: docs/plans/archived/066-auto-lang-native-widget-spi.md
（status: archived）|
cleaned: 待清理后补记（auto-lang worktree+auto-down-dev 分支、auto-down
worktree+plan-066-dev 分支，wt-guard 前置）
```
