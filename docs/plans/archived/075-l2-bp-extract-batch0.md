---
plan_id: PLAN-075
status: archived
completion_kind: delivered
feature_name: l2-bp-extract-batch0（L2 蓝图抽取 + 蓝图级双端 gate 首证）
author: [zhaopuming]
created_at: 2026-09-19
updated_at: 2026-09-19
plan_revision: 1
current_step: 5
total_steps: 5

supersedes_spec_components: []
new_spec_components: []        # 见 §5：SD-01（jade ARCHITECTURE §8.6）+ SD-02（auto-lang DEBTS 070 第二行销账）；bp 包为实例级新增，契约面零变化
touched_goals: []

affects: [jade-garden/front, auto-lang（兄弟仓配对 worktree）]
---

# [PLAN-075] l2-bp-extract-batch0——L2 蓝图抽取 + 蓝图级双端 gate 首证

> 机制依据：auto-lang `docs/design/30-autoui-parity-three-layer.md` §2（L2 行：
> 隔离面=blueprints 包库+bps-gallery，门=每单元双端 gate，DoD=gallery 全单元
> 绿+抽取判定规则执行完毕并有记录）+ §6（判定规则与 L2 第零任务）。判定对象
> = **073 已锁基线 5 面 + 074 面板行族 4 件**（首批 L1 基线存量）。
>
> **诚实预期（起草时点在案）**：jade 的抽取产量小——tab 条有 070 R-1 裁定
> （各应用自持不 bp 化）、filetree web 谱系 Q-7=A 独立（bp gotchas#2 维持），
> 明确可抽的以**骨架类**为主（status_bar 骨架+内容 slot、面板行族的"数据行
> 列表"骨架）。本计划的真实交付 = **蓝图级双端 gate 机制首证**（design 30
> §2 L2 门列的第一次落地），为未来 app 的 bp 复用铺路。

## 0. 变更摘要

| # | 面 | 内容 |
| --- | --- | --- |
| 1 | 判定 | 9 单元（073 五面 + 074 四件）逐个跑 §6 判定（≥2 使用位 / 具名跨 app 预期 / 同名不同物→骨架+slot / 不收敛登记），产物=判定记录附件 |
| 2 | L2 第零任务 | bps 通道 fn 转译债偿还（auto-lang DEBTS 070 第二行 🟡 + 074-sink-mode G-6 未修面[components//bps 通道同文件模块 fn]）——filetree 组合形态 vue 轨解锁 |
| 3 | 抽取 | 两件骨架 bp 入库：status_bar 骨架（layout，骨架+内容 slot，三版同名不同物按 §6 通道处置）+ 数据行列表骨架（data-display，行列表+行 slot） |
| 4 | gate 首证 | bp reference 双端 gate（vue 臂构建渲染+截图基线 / VM 臂 boot+断言）对 ≥3 bp 跑绿（两骨架 + filetree 组合形态） |

## 1. 目标

1. **判定记录在案**：9 单元逐个裁定（抽 bp / 骨架 bp+slot / 已有 bp 家族归位 /
   不收敛登记）+ 使用位证据，落附件。
2. **L2 第零任务闭合**：bps 扫描发射臂补 plan522 式 fn 转译（跨文件
   `use <mod>: fn` + 同文件模块 fn）——filetree 组合形态（reference/default.at
   含 `use tree_util/tree_icon`）vue 轨构建绿；DEBTS 070 第二行销账。
3. **两件骨架 bp 包在库**：spec（TOML frontmatter+NL）/reference/gotchas
   齐备，`auto bp list` 可见。
4. **蓝图级双端 gate 机制首证**：gate 脚本入库可复跑，首批 bp（≥3）双端绿，
   基线在库。
5. 账面：SD-01/SD-02 落地 + merge 时账本 P075-x。

**非目标**：bps-gallery 浏览 UI live-render（README scope note 维持 deferred
——gate 是自动化双臂，不是浏览面）；L2 全量 DoD（全部 bp gate 绿——本批仅
首证）；filetree web 谱系收编为 variant（gotchas#2 维持）；tab 条 bp 化
（R-1）；menubar/toolbar 命令面 bp 化（ui_config 单源 app 特有，预判不收敛
——T-00 定案）；jade 存量单元迁移为 bp 消费（回写归后续按需）；jade gallery
已锁 8 单元基线的任何漂移。

## 2. 架构方案

```
073/074 已锁基线存量（9 单元）
   ↓ §6 判定规则（≥2 使用位 / 具名跨 app 预期 / 同名不同物→骨架+slot / 不收敛登记）
判定记录（附件）──┬─ 抽取 → 骨架 bp ×2（auto-lang blueprints/ 新包）
                 ├─ 归位 → filetree bp 包级 gate（072 Q-1：jade gallery 只 gate 消费侧）
                 └─ 登记 → 不收敛注记（R-1/Q-7/ui_config 单源）
   ↓
L2 第零任务（编译器 fn 转译臂）→ 解锁 filetree 组合形态 vue 轨
   ↓
bp 双端 gate 首证（vue 臂：构建+渲染+截图基线；VM 臂：boot+断言）
```

关键设计点（T-00 固化为裁定记录）：

- **gate harness 落点**：auto-lang 侧（Q-1 裁定跨 app 通用件 canonical 家）。
  默认形态 = **独立最小 bp-gate harness**（复刻 jade component-gallery
  gate.mjs 双臂模式：vue 臂 host 页编译渲染+playwright 截图基线；VM 臂
  pac.at dep 消费 boot + MCP autoui_state/snapshot 断言），bps-gallery 浏览
  UI 不动。理由：gate 需要的是自动化构建渲染断言，不是 dev-time live-render
  接线（后者是 UI 增强另议）。
- **骨架 bp fn-free 优先**：两件骨架为纯布局+slot（无模块 fn、无 use fn），
  vue 臂不依赖第零任务即可构建；filetree 组合形态作为 **fn 携带件**的首证
  对象（第零任务解锁后入 gate）——机制证明覆盖 fn-free 与 fn 携带两形态。
- **filetree 组合形态 VM 臂断言形态**：组合件直挂 = 子件子树对 MCP 快照不可
  见（F-1 / bp gotchas#1）——VM 臂按"消费方内联 twin"形态（root 内联行经
  tree_util 派生，gotchas#1 right 形态）或 root 投影断言，T-00 裁定。

## 3. 技术栈

- **auto-lang（兄弟仓）**：`crates/auto-lang/src/ui_gen/vue.rs` bps 扫描臂
  （第零任务修点，DEBTS 070 第二行指位）；`blueprints/<kind>/<name>/` 包格式
  （docs/design/blueprints/blueprint-package-format.md）；gate harness 新落
  `examples/` 或 `blueprints` 邻位（T-00 定）。
- **jade-garden/front**：仅账面（ARCHITECTURE §8.6）与判定记录引用；代码零
  改动。
- **工具**：auto.exe **worktree 构建**（070 registry 扫描根债约束：
  `BlueprintRegistry::with_defaults` 锚编译期 CARGO_MANIFEST_DIR——worktree
  内构建的 exe 扫 worktree blueprints，`auto bp list` 验证须用 worktree exe，
  DEBTS 070 第一行 🟡 维持在案不改）；playwright（vue 臂截图基线）；MCP
  autoui_state/snapshot（VM 臂断言，jade gallery 同款）。

## 4. 需求分析与背景调查

**授权记录**：2026-09-19 用户批准 Phase 2 第二波组合（075 L2 + 076 检索/导航
族并行起草，互不依赖）；起草期仅授权起草。**2026-09-19 执行授权：用户显式
调用 `/auto-plan:work 计划075`，状态 drafting → executing。**

**既有依据（2026-09-19 主检出实勘）**：

| 依据 | 实勘落点 |
| --- | --- |
| design 30 §2/§6/§8 | L2 门定义；判定规则四通道；第零任务=vue 轨 bps 扫描不转译跨文件 fn 导入，"L2 开工前须偿还，否则 bp gallery 的 vue 侧无法成立" |
| DEBTS 070 第二行 🟡 | `crates/auto-lang/src/ui_gen/vue.rs` bps 扫描；修向=发射器补 plan522 式 fn 转译（按 base_dir/parent 解析模块源内联）；046-bp-import 构建断裂复现在案 |
| 074-sink-mode G-6 未修面 | components//bps 通道同文件模块 fn 同病（无消费方，待编译器收口）——本计划造首个消费方 |
| filetree bp 包 | `blueprints/navigation/filetree/`（spec/gotchas/reference/default.at/tree_util.at/tree_icon.at）；reference 含 `use tree_util: flatten_tree, toggle_id` + `use tree_icon: TreeIcon`——组合形态 vue 轨断裂件；gotchas#1（VM 消费方内联 right 形态）/#2（web 谱系同名不同物不收编）/#3（node schema 缺键=VM 硬错）直接复用 |
| bps-gallery | vue-only source 浏览（live render deferred，PLAN-640 glob 发现）；CI 门=build（.github/workflows/build-bps-gallery.yml） |
| 073 五面基线 | 072-inventory §2（status_bar/tab 条/menubar+toolbar/filetree 行家族，§8.6 已锁） |
| 074 面板行族 | 074-sink-mode §1 四件（backlinks/outgoing/outline/unlinked——"数据拉取→行列表渲染"形状）+ 076 三件同形（检索/导航族）——"数据行列表骨架"的使用位证据 |
| 072 Q-1 裁定 | jade 特有件在 jade gallery；跨 app 通用件 canonical 家=auto-lang blueprints/bps-gallery；bp 已收敛件在 jade 只 gate 消费侧，**包级 gate 归 L2**（= 本计划） |
| jade gallery gate 模式 | component-gallery/scripts/gate.mjs 双臂编排 + units.mjs 配置化——harness 复刻蓝本 |

## 5. 详细设计

### 规范增量

| delta_id | add/modify/retire | 目标文档 | before/after | rationale | acceptance |
| --- | --- | --- | --- | --- | --- |
| SD-01 | add | jade-garden/ARCHITECTURE.md §8.6 | 无 → L2 bullet（首批骨架 bp ×2 + 判定记录指针 + bp gate 首证 + DEBTS 070-2 闭合注记） | L2 台账首条 | AC-05 |
| SD-02 | modify | auto-lang DEBTS.md 070 第二行 | 🟡 在案 → ✅已销账（PLAN-075 fn 转译臂，filetree 组合形态 vue 构建绿） | 第零任务闭合回执 | AC-02 |

（骨架 bp 为**实例级**包新增——不改 `docs/specs/blueprint/contract.md` 契约
与包格式；bp gate 机制是 design 30 §2 既有规定（"每单元双端 gate"）的首次
实现，不产生新契约。故 Spec 增量仅账面两条。）

**骨架 bp 形态设计**（命名/kind 归属 T-00 对照 contract.md Q5 kind 表定案，
以下为暂名默认）：

1. `layout/status-bar`：底栏骨架——高度/分隔/padding 布局 + **内容 slot**
   （左右区/中间区）；变体注记三版同名不同物（jade web ext-composable /
   desktop 值 props / 041 形态适配——§6"同名不同物"通道：骨架收敛，内容
   slot 各持）。使用位证据：jade 双端 + 041（3 使用位）。
2. `data-display/row-list`：行列表骨架——列表容器+行布局+分隔线+**行
   slot**；消费形态=jade 面板行族（074 四件+076 三件共 7 使用位，"数据
   拉取/过滤 → 行列表渲染"公共形状）。gotchas 首批条目直接从 074 模式文档
   迁移：G-2 CJK 索引算术禁令、G-3 无跨文件导入（slot 消费侧自备行 fn）、
   F-1 子件子树不可见（VM 消费方内联行）。

**第零任务修点设计**：vue.rs bps 扫描臂挂 plan522 式 fn 转译（跨文件
`use <mod>: fn` 按 base_dir/parent 解析模块源内联发射）+ components//bps
通道同文件模块 fn 池（074 补丁 40d7488 src/front 臂同款逻辑移植）；行为锚
=046-bp-import 断裂复现用例转绿（filetree 组合形态 vue 构建）。

## 6. 测试设计

- **第零任务**：046-bp-import 复现用例红→绿；filetree 组合形态
  reference/default.at 经 vue 轨构建（vite/vue-tsc）绿；worktree exe
  `auto bp list` 可见新包（070 registry 债约束下的验证口径，主检出 exe 恒
  扫主检出——判定记录注记）。
- **bp gate**：vue 臂（构建+渲染+playwright 截图基线，--update-snapshots
  建基线）× VM 臂（boot+state/snapshot 断言）× 首批 ≥3 bp 全绿；fn 携带件
  （filetree 组合）修复前红/修复后绿=第零任务行为锚双态证据。
- **回归**：auto-lang 侧 cargo test 相关臂（ui_gen/vue 转译）+ bps-gallery
  `pnpm build`；jade 侧零代码改动——gallery gate 8 单元复跑全绿（零漂移
  证明）。
- **包格式门**：palette-drift guard（新包 palette 条目过 WidgetRegistry）；
  `auto bp show` 输出齐备。

## 7. 验收标准

| ID | 可观察行为 | 验证方法 |
| --- | --- | --- |
| AC-01 | 9 单元判定记录在案（逐个裁定+使用位证据） | 附件 `docs/plans/attachments/075-bp-extraction-record.md` 在库，裁定四通道之一逐单元可溯 |
| AC-02 | L2 第零任务闭合 | 046-bp-import 复现用例转绿 + filetree 组合形态 vue 构建绿 + DEBTS 070 第二行销账（SD-02） |
| AC-03 | 两件骨架 bp 包在库 | worktree exe `auto bp list` 可见两包；spec frontmatter/reference/gotchas 齐备（包格式三件套） |
| AC-04 | 蓝图级双端 gate 机制首证 | gate 脚本入库；≥3 bp（两骨架+filetree 组合）双端 gate 绿；基线文件在库；复跑 exit 0 |
| AC-05 | 账面 | SD-01 §8.6 bullet + SD-02 DEBTS 销账 + 072-inventory L2 相关注记 + merge 账本 P075-x |

## 8. 执行步骤

> worktree：`down-075/{auto-down, auto-lang}`（073/074 配对惯例）。auto-lang
> 侧分支 `plan-075-dev`——编译器改动（第零任务）随 merge 折回（074 补丁
> 折回先例 ffe2dac6d）。

- **T-00** [x] [调查] 判定记录 + 三项裁定（harness 落点/骨架 bp kind 与命名/
  filetree VM 臂断言形态）。产物：`075-bp-extraction-record.md`（9 单元
  判定表 + 裁定记录）。依赖：无。→ AC-01
  [✅ 2026-09-19] 附件 `docs/plans/attachments/075-bp-extraction-record.md`
  在库：9 单元判定表（U-1 骨架+slot / U-2..U-4 不收敛登记 / U-5 bp 家族
  归位 / U-6..U-9 row-list 使用位，7 位计数含 076 三件形状登记）+ 四裁定
  R-A（kind=暂名定案，词表内存量）/R-B（harness=examples/bp-gate 沙箱
  形态——`auto build` 物化 deps/bps junction 探针实锤，worktree 红线规避）
  /R-C（VM 臂=消费方内联 twin，gotchas#1 right）/R-D（**T-01 重定范围**：
  645 已落地跨文件 fn 转译+扫描根两债，DEBTS.md 漏划销致起草证据陈旧；
  075 收口面=G-6 同文件模块 fn 两臂+048 夹具+DEBTS 划销补记）。
- **T-01** [x] [改] L2 第零任务：vue.rs bps 扫描 fn 转译臂 + components//bps
  通道同文件模块 fn（G-6 未修面收口）。依赖：T-00。→ AC-02
  [✅ 2026-09-19 **按 R-D 重定执行**] worktree `down-075/auto-lang` commit
  `9bb7799e8`：①645 已落地面验证——plan645_bp_tests 3/3 绿 +
  沙箱 047 `auto build --gen-only` 22 组件 EXIT=0、FileTree.vue 含
  `function flatten_tree`（组合形态 vue 轨绿）；②G-6 收口——auto-man
  vue.rs 两臂（components//bps + dep）`.with_module_fns(same_file_module_fns)`
  重挂 + 048-bp-module-fn 夹具（fixture 本地 mini bp 库+库 pac.at 清单，
  G-6 首个真实消费方）；③plan075_bp_tests 定向测红→绿实证（无补丁 0/2
  红→有补丁 2/2 绿）+ 048 沙箱 ModuleFnDemo.vue 含 `function count_badge`
  + vue-tsc EXIT=0（G-7 环境件补两文件后，TS2307/TS2339 为 074 在案环境
  缺口非 G-6 面）+ vite build 绿；④回归——auto-man 全套 302/302 绿
  （rust-workspace 测试再生成漂移已还原，非本计划工作）。
- **T-02** [x] [改] 两件骨架 bp 抽取（spec/reference/gotchas 三件套 + palette
  声明过 guard）。依赖：T-00。→ AC-03
  [✅ 2026-09-19] `blueprints/layout/status-bar/` + `blueprints/data-display/
  row-list/` 三件套入库（fn-free：纯布局+slot，无模块 fn/无 use fn）；
  registry 测试 150/150 绿（palette 零 drift）；worktree exe `auto bp list`
  可见两包（layout kind 首包，bps-gallery kindOrder 已含 layout）；
  `auto bp show` 输出齐备。构建级验证并入 T-03 宿主（两骨架均入 gate
  单元）。commit `00c182a2b`。
- **T-03** [x] [改] bp 双端 gate harness + 首证跑绿（两骨架 + filetree 组合；
  基线建库）。依赖：T-01/T-02。→ AC-04
  [✅ 2026-09-19] `examples/bp-gate/` 独立最小双端 harness 入库（host 工程
  + gate/units/vm-probe/serve 脚本 + playwright 配置 + README 裁定记录）。
  vue 臂：沙箱 gen→G-7 补件→vue-tsc→vite→playwright 4/4 绿（三单元
  needle + clip 截图，基线 3 张入库）；VM 臂：沙箱 `auto run -r vm` 单
  boot——三单元 root 投影 state + 标记行 snapshot 全绿（组合件 FileTree
  在 VM 轨真实挂载，VM_EXEC handler_FileTree_Init 在案）；全量复跑
  exit 0。R-B 沙箱裁定落实（junction 只落仓库外临时目录+退出摘链）。
  commit `00c182a2b`。
- **T-04** [x] [改] 不收敛登记入判定记录（tab 条 R-1/menubar 命令面/filetree
  web 谱系）+ 回归收口（auto-lang cargo test+bps-gallery build / jade
  gallery 零漂移复跑）+ 账面（SD-01/SD-02/inventory 注记）。依赖：
  T-01..T-03。→ AC-05
  [✅ 2026-09-19] ①不收敛登记：判定记录 §1 U-2/U-3/U-4（tab 条 R-1 /
  menubar+toolbar ui_config 单源 / filetree web 谱系 Q-7）在案；②回归：
  auto-lang 日常档 5177/5211 passed、34 failed——**基线 A/B 定责**（基点
  3d0d633 干净 worktree 同套跑，失败集逐名 diff=双向空，零新增红；musk
  p053 家族=P028-D4 在册预存）；auto-man 全套 302/302；bps-gallery
  `pnpm build` 绿（新包不破 CI 门）；**jade 零漂移双证**——gallery gate
  双臂 exit 0（8 单元，VM 臂跑本计划 worktree exe；环境预备=front
  workspace 安装+engine dist 补建，gitignored 产物）+ 双二进制 gen 对拍
  （front/auto diff=0 行逐字节一致；desktop 双臂同败同族=沙箱环境非
  诊断差异，base 自跑 78 行抖动实证诊断非确定性）+ auto-down worktree
  diff 仅 ARCHITECTURE.md（代码零改动）；③账面：SD-01（auto-down
  `6746830`）+ SD-02/KNOWN-DEBT P075-D1（auto-lang `a8d40f4da`）+
  072-inventory L2 注记（本检出计划簿记）。merge 账本 P075-x 归 merge。

## 9. 复审记录

- 2026-09-19 draft handoff：`stage: new | plan_id: PLAN-075 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权） | next: review → work`。
- 2026-09-19 work handoff：`stage: work | plan_id: PLAN-075 | plan_revision: 1 |
  outcome: pass | code_commit: auto-lang plan-075-dev 9bb7799e8（T-01 编译器
  G-6 两臂+048 夹具+plan075 测试）→ 00c182a2b（T-02 两骨架 bp+T-03 bp-gate
  harness+基线 3 张）→ a8d40f4da（T-04 账面 DEBTS/KNOWN-DEBT）；auto-down
  plan-075-dev 6746830（SD-01 ARCHITECTURE §8.6/§8.5） | base_commit:
  auto-lang 3d0d633 / auto-down a615d69 | worktree: D:/autostack/.wt/down-075/
  {auto-down, auto-lang}（保留供 review/merge） | task_ids: T-00..T-04 全勾
  | evidence: AC-01 判定记录附件（9 单元四通道+四裁定 R-A..R-D）；AC-02
  plan075_bp_tests 红→绿（0/2→2/2）+048 沙箱构建/vue-tsc/vite 绿+plan645
  3/3+047 沙箱 22 组件；AC-03 registry 150/150+bp list/show 可见；AC-04
  bp-gate 双臂全绿 exit 0（vue 4/4+基线 3 张/VM 三单元 state+snapshot，
  组合件 VM 真实挂载）；AC-05 SD-01/SD-02/inventory 注记在库+回归四件
  （日常档 A/B 零新增红/auto-man 302/bps-gallery build/jade gallery 双臂
  exit 0+gen 对拍逐字节一致） | blockers: 无 | 范围调整记录: R-D（T-01
  重定——645 已落地跨文件转译与扫描根，本计划收口 G-6 同文件面；证据
  075-bp-extraction-record.md §5） | next: review`。
- 2026-09-19 review r1（实现会话内复审——独立性受限已声明；结论自工件
  重建：逐行 diff、提交态测试/gate 复跑，不采信执行摘要）：
  `stage: review | plan_id: PLAN-075 | plan_revision: 1 | outcome: pass |
  reviewed_commit: auto-lang a8d40f4da00e5dd90b5ecbcd776499a7574b882f
  （9bb7799e8→00c182a2b→a8d40f4da）+ auto-down
  6746830efb419559057fcd2831c2f7f88835f8d3 | base_commit: auto-lang
  3d0d63345 / auto-down a615d693 | dependency_revisions: 双 worktree
  D:/autostack/.wt/down-075/{auto-down,auto-lang} 干净（零未提交实现）；
  执行期主检出 auto-lang master 前移至 b4b04c5cd（657 起草中）——merge
  需对齐 | spec_inputs: docs/specs/blueprint/contract.md @3d0d633（Q5 kind
  词表/layout 在册——diff 未触及契约文档，"实例级新增、契约面零变化"成立）
  + jade-garden/ARCHITECTURE.md §8.5/§8.6 @6746830 + auto-lang DEBTS.md
  070 两行 @a8d40f4da | acceptance_results: AC-01 pass（判定记录附件在库，
  9 单元四通道逐行可溯+四裁定）；AC-02 pass（plan075_bp_tests 2/2 复跑+
  红→绿史证、048 沙箱构建、plan645 3/3、DEBTS 070-2 划销；R-D 重定范围
  在案成文非静默缩削——645 已落地的跨文件面以验证收货，G-6 尾面本计划
  实现）；AC-03 pass（bp list 双包可见、三件套文件实勘、palette 零 drift
  随 tf 过）；AC-04 pass（HEAD 复跑 gate exit 0：vue 4/4+基线 3 张、VM
  三单元 state+snapshot，组合件 VM 真实挂载）；AC-05 pass（SD-01/SD-02/
  inventory 注记在库；merge 账本 P075-x 按流程归 merge 阶段，非延期）|
  findings: 无阻断项。非阻断登记：F-NB1 plan075_bp_tests 断言失败路径
  泄漏临时沙箱（无 Drop guard，temp 卫生改进候选）；F-NB4 ARCHITECTURE
  §8.5 PLAN-075 行状态词 executing 滞后（072 行同惯例，merge 时随归档
  刷新）| evidence: cargo tf 3643 跑 3639 passed/4 failed——4 红定责：
  mouse_area+kitchen_sink=日常档基点 A/B 同名红（失败集双向空）；display_
  family+ffi_dual_019=feature 配置差家族（ui-iced 档双臂绿、裸档红，
  当前主检出 b4b04c5cd 裸档同红；本计划 auto-lang 源码零改动）；auto-man
  302/302；bps-gallery build 绿；jade gallery gate 双臂 exit 0+双二进制
  gen 对拍 front/auto 逐字节一致 | next: merge`。

### PLAN-075:r1 merge 收据

- **prepared（2026-09-19）**：reviewed 基线 r1 pass @auto-lang a8d40f4da /
  auto-down 6746830（base 3d0d633/a615d69）；canonical 沉淀 = auto-lang
  `docs/specs/blueprint/project.md`（L2 gate/骨架 bp bullet + 640 第 4 条
  骨架例外和解注记）+ DEBTS 070 两行划销 + auto-down ARCHITECTURE §8.6/
  §8.5；投影目标 = 双仓 `.autoos/specs.json`（auto-lang P075-1 / auto-down
  P075-1+P075-2，回读验证 246 条/P075×3 无重复 id）；delivery 候选 =
  auto-lang eef2b8b64（reviewed 的纯文档后代）。master 前移和解：auto-lang
  3d0d633→da3bf60ed（15+ 提交，vue.rs 画廊区与两臂零重叠自动合并；
  KNOWN-DEBT 尾部同位追加重编号增补五）；**期间发现并恢复 PLAN-642 账本
  末笔**（主检出 specs.json 脏态=642 已验证写盘未提交，P642-1 终稿+
  P642-R2 与 76bddf0f9 收据一致，按恢复规则补记提交）；auto-down
  a615d69→d65c2ad（**PLAN-076 并行合并归档**——§8.6 双 bullet 序接/账本
  244→246 共存/R072-1 单元数 8→11 注记入 P075-1）。合并态验证刷新：
  plan075 2/2+plan645 3/3+auto-man 304/304+bp-gate 双臂 exit 0。
- **landed**：auto-lang master `97a7ba755`（merge plan-075-dev；ancestry
  验证+主检出冒烟：plan075 2/2/plan645 3/3/bp list 双包/exe v0.4.2-1305
  构建）；auto-down master `4ab68de`（merge plan-075-dev；§8.6 L2 bullet
  在场+账本 246 条回读）。
- **ledger_refreshed**：auto-lang `.autoos/specs.json` P075-1（architecture，
  file=docs/specs/blueprint/project.md，与 P642-R2 恢复笔共存回读）；
  auto-down `.autoos/specs.json` P075-1（architecture）+P075-2（reviews）
  与 P072-1（076 终稿）/P076-1 共存回读（246 条）；INDEX 再生无净变化
  （无新模块/项目）。
- **archived**：`docs/plans/archived/075-l2-bp-extract-batch0.md`（untracked
  计划平移入册，076 同款）；status=archived/completion_kind=delivered。

## 10. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | 骨架 bp 的 kind 归属与命名（暂名 layout/status-bar、data-display/row-list） | T-02 包路径 | T-00 对照 contract.md Q5 kind 表定案（默认=暂名） |
| Q-2 | gate harness 落点（独立最小 harness vs bps-gallery 内嵌） | T-03 形态 | T-00 裁定（默认=独立最小 harness，bps-gallery UI 不动） |
| Q-3 | filetree 组合形态 VM 臂断言形态（组合件 root 投影 vs 消费方内联 twin——F-1/gotchas#1 约束） | T-03 断言面 | T-00 裁定（默认=消费方内联 twin，gotchas#1 right 形态） |
| Q-4 | 076 三件（检索/导航族）是否作为 row-list 骨架的追加使用位证据入判定记录（076 并行执行期时间线交错） | AC-01 完整性 | T-00 以 074 四件+设计形状登记 7 使用位（076 落地后自然补强，不构成本计划依赖） |
