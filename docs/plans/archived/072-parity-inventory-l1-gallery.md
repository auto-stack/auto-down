---
plan_id: PLAN-072
status: archived               # drafting → executing → execution_done → reviewed → archived
completion_kind: delivered     # PLAN-072:r1 五 checkpoint 全闭环（2026-09-18 merge）
feature_name: parity-inventory-l1-gallery（三桶盘点 + L1 组件 gallery 基建）
author: [zhaopuming]
created_at: 2026-09-18
updated_at: 2026-09-18
plan_revision: 1

supersedes_spec_components: []
new_spec_components: []        # 账本 P072-x 由 merge 落账
touched_goals: []

affects: [jade-garden/front]
current_step: 5
total_steps: 5
---

# [PLAN-072] parity-inventory-l1-gallery——三桶盘点与 L1 组件 gallery 基建

> 机制依据：auto-lang `docs/design/30-autoui-parity-three-layer.md`（三层
> parity 机制）。本计划 = 该机制的 **Step 0（盘点三桶）+ L1 基建（gallery
> 隔离面 + 双端 gate 骨架）**，产出喂给后续的 L1 修复滚动计划。

## 0. 变更摘要

1. **盘点**：枚举 jade-garden front/auto + desktop 全部 .at widget，按三桶
   分类：①双端都有可能有差异（L1 修复对象）②只有 vue 有（VM 缺件待办）
   ③只有 vm 有（反向补 vue）。
2. **L1 gallery 基建**：jade 组件 gallery（隔离面，单组件单页双轨渲染：
   vue 构建 + VM 渲染探针），每单元双端 gate 骨架（结构快照 + 截图基线）。
3. **样板验证**：3 个代表单元（纯展示/交互/数据绑定）走通全流程，
   作为后续修复滚动的作业样板。

## 1. 目标

1. 三桶清单文档在案（每单元：名称/双端状态/分类/预估修复类）。
2. gallery 双轨可跑（vue 构建 + VM 渲染），单元页骨架就位。
3. 双端 gate 骨架就位（每单元：vue 截图基线 + VM MCP 快照断言），3 个样板
   单元全流程走通。

**非目标**：修复本体（L1 修复滚动计划承接）；bp 抽取（L2 计划，依赖
auto-lang PLAN-645）；编辑器单元的引擎对拍（autodown lighthouse 流）。

## 2. 架构方案

- gallery 落点：`jade-garden/front/component-gallery/`（独立小项目，
  pac.at 双形态 `render: vue` + VM 渲染，复用 demo 双轨模式；依赖
  `dep jadeauto { path: "../auto/src" }` + `dep bps` 引组件）。
- 单元页 = 每组件一个最小渲染页（隔离面原则：gallery 不依赖 app 全局态，
  数据用 fixture）。
- 双端 gate = ①vue 截图基线（playwright，08-screenshots 模式）
  ②VM 结构快照断言（MCP autoui_state/snapshot，vm-smoke 模式）。
- 分类依据：桌面 app.at 挂载面 + front/auto 构建产物对照；VM 缺件判定 =
  该 widget 在 desktop 消费面缺席或 VM 渲染臂缺席。

## 3. 需求分析与背景调查

**授权记录**：2026-09-18 用户裁定的 PLAN-070 后续战略组合之一；仅起草。
**既有依据**：PLAN-070 T-00 消费面矩阵（部分单元已有双端状态记载）；
widgets-gallery（跨 app 先例）；vm-smoke/playwright 基建（复用）。
**已知输入**：T-00 矩阵的三桶雏形（filetree 家族/同名不同物清单在案）。

## 4. 详细设计

### 规范增量

| delta_id | add/modify/retire | 目标文档 | before/after | rationale | acceptance |
| --- | --- | --- | --- | --- | --- |
| SD-01 | add | jade-garden/ARCHITECTURE.md §8.6 | 无 → 三桶清单与 gallery 位置指针 | 统一期单元台账 | AC-01 |

## 5. 测试设计

- gallery 双轨自证：vue 构建 + `auto run -r vm` boot + 单元页双端渲染断言。
- 3 个样板单元的双端 gate 样板跑绿（每类一单元：纯展示如 outline 行、
  交互如 tab strip、数据绑定如 backlinks 行）。
- 盘点文档交叉校验：清单与 grep/构建产物对拍（防漏 enumerating）。

## 6. 验收标准

| ID | 可观察行为 | 验证方法 |
| --- | --- | --- |
| AC-01 | 三桶清单在案且经交叉校验 | 附件文档 + grep/构建对拍记录 |
| AC-02 | gallery 双轨可跑 | vue 构建绿 + VM boot 净 + 单元页渲染断言 |
| AC-03 | 双端 gate 骨架 + 3 样板单元走通 | 每单元 vue 基线 + VM 快照断言双绿 |
| AC-04 | 账面 | ARCHITECTURE §8.6 落笔（SD-01）+ merge 时账本 P072-x |

## 7. 执行步骤

> worktree：`down-072/{auto-down, auto-lang}`（gallery 的 VM 渲染需
> auto-lang 兄弟）。
>
> 执行记录（2026-09-18 /auto-plan:work 授权进入）：base =
> auto-down master `fae21d9`（plan-071 cleaned 后），分支 `plan-072-dev`，
> worktree `D:/autostack/.wt/down-072/auto-down`；依赖 auto-lang 兄弟
> `D:/autostack/.wt/down-072/auto-lang` detached @ master `fc8264f4a`
> （musk-071 同款 detach 惯例）。主检出残留 `?? jade-garden/front/tmp/`
> （未跟踪他session scratch，不并入本计划）。

- **T-00** [x] [调查] widget 全量枚举 + 三桶分类 + 修复类预估。产物：
  `docs/plans/attachments/072-inventory.md`。依赖：无。→ AC-01
- **T-00** [x] [调查] widget 全量枚举 + 三桶分类 + 修复类预估。产物：
  `docs/plans/attachments/072-inventory.md`。依赖：无。→ AC-01
  [✅ F-R1 修复重勾 2026-09-18 0e2542e：三桶账 29/29 补全——outline_panel
  归 RC-D、ribbon 归 RC-C，桶②=24（RC-D 16/RC-C 6/RC-E 1/RC-F 1），
  程序化对账九项断言全过（review 复核）]
  [✅ 已完成 2026-09-18 a1a81bb] 38 .at（29 widget+8 store+占位 app.at）↔
  29 SFC 一一对拍；桶①5 面/桶②22 件（RC-D 15/RC-C 5/RC-E 1/RC-F 1）/
  桶③空桶（070 矩阵差 3=071 删除+口径）；Q-1/Q-2 默认裁定，Q-3 转 T-02。
- **T-01** [x] [新] gallery 项目骨架（双轨 pac + 目录 + 2 个样板单元页）。
  依赖：T-00。→ AC-02
  [✅ 已完成 2026-09-18 0c6ae37] 双臂架构实测裁定（原"单 pac 双形态+
  dep jadeauto"被证伪：dep 声明即 junction 物化=wt-guard 违例类；真件
  TS-ext 耦合不可 VM 直挂）→ vue 臂=真件 SFC harness（fixture API shim，
  status_bar/outline 双页渲染断言绿）+ VM 臂=自包含 twin 项目（boot 净 +
  MCP 断言 PASS）；F-1..F-5 语言语义发现记 gallery README；Q-3 证据在案
  （F-1 子件子树快照不可见→VM 断言走 root 投影；root 内联行可见）。
- **T-02** [x] [新] 双端 gate 骨架（vue playwright 基线 + VM MCP 快照两臂，
  per 单元配置化）。依赖：T-01。→ AC-03
  [✅ 已完成 2026-09-18 1f2416c] scripts/units.mjs 单元配置 + e2e/units.spec.ts
  （08-screenshots 模式，基线 e2e/baselines/）+ scripts/gate.mjs 编排 +
  vm-probe 配置化；vue 基线 2 张 + vm 断言绿。
- **T-03** [x] [新] 3 样板单元走通（纯展示/交互/数据绑定各一，含 VM 缺件单元
  的"缺件即红"行为验证）。依赖：T-01/T-02。→ AC-03
  [✅ 已完成 2026-09-18 dd7a1e9] status_bar（纯展示）/tab_strip（交互，点击
  切换断言）/backlinks（数据绑定，shim 拉取行）双臂绿 + outline；缺件即红
  F-6 实证（VM 直挂真件 = ext no-op stub 静默降级，红信号 = stub WARN +
  数据投影空；run 不物化 junction）；command_palette 缺件红占位（理由必填）
  gate 可见化。
- **T-04** [x] [改] 清单回填 gate 结果 + ARCHITECTURE §8.6（SD-01）。依赖：T-03。→ AC-01/04
  [✅ F-R1 修复重勾 2026-09-18 0e2542e：§8.6 计数同源刷新（24/16/6/1/1）]
  [✅ 已完成 2026-09-18 627c5e9] ARCHITECTURE §8.6 落笔（清单/gallery/gate
  绿/F-1..F-6 指针）+ §8.5 状态对齐；inventory §7 gate 结果回填 + §8 Q-3
  定稿。

## 8. 复审记录

- 2026-09-18 draft handoff：`stage: new | plan_id: PLAN-072 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权） | next: review → work`。
- 2026-09-18 work handoff：`stage: work | plan_id: PLAN-072 | plan_revision: 1 |
  outcome: pass | code_commit: 627c5e9（plan-072-dev，base fae21d9；T-00 a1a81bb
  →T-01 0c6ae37→T-02 1f2416c→T-03 dd7a1e9→T-04 627c5e9） |
  task_ids: T-00..T-04 全勾 | evidence: 全 gate 双臂绿（`node
  scripts/gate.mjs`：vue build+playwright 基线 4 张；VM boot+MCP 13 断言）
  在提交态复跑绿；AC-01 清单+对拍在案、AC-02 双轨可跑、AC-03 gate 骨架+
  样板四单元+缺件红、AC-04 ARCHITECTURE §8.6 落笔（账本 P072-x 归 merge）|
  blockers: 无（Q-1/Q-2/Q-3 全闭环） | next: review。
  执行注记：①架构偏差——原案"单 pac 双形态+dep jadeauto"被实测证伪
  （dep 声明即 junction 物化=wt-guard 违例类；真件 TS-ext 耦合不可 VM 直挂），
  改双臂（vue 真件 harness + VM twin 自包含项目），零副本经 vite alias 保住；
  ②VM 语言语义发现 F-1..F-6 记 gallery README（F-5 blocks watch 失活为
  DEBTS 候选，归 app 层/修复循环处置）；③worktree 收尾注意：vm/gen 与
  gallery node_modules 含 pnpm link 符号链接（gitignored 生成物类），
  merge 清理时先摘链再 wt-guard；④本计划零触达 front/src 生产代码，
  app 层全量套件无回归面（review 按需复跑）。
- 2026-09-18 review：`stage: review | plan_id: PLAN-072 | plan_revision: 1 |
  outcome: needs_fix | reviewed_commit: 627c5e969e4ffcbe38c5df1fdf95a6b78b8f243d
  （plan-072-dev，5 commits，树净） | base_commit: master fae21d9 |
  dependency_revisions: auto-lang fc8264f4a（worktree 兄弟 detached） |
  spec_inputs: 本仓无 docs/specs/（实证）——SD-01 落 ARCHITECTURE §8.6，
  账本 P072-x 归 merge；reviewed delta=§8.6 文本（随 F-R1 需刷新计数） |
  acceptance_results: AC-01 **fail**（F-R1 覆盖缺 2 件）；AC-02 pass（gate
  双臂 fresh 复跑绿：vue build+playwright 真件渲染断言+基线 4 张；VM boot+MCP
  state/snapshot）；AC-03 pass（配置化 gate 骨架 + status_bar/tab_strip/
  backlinks/outline 双绿 + command_palette 预期红在册；断言灵敏度有 F-2/F-3
  迭代期真实失败史 + missing 路径复验）；AC-04 pass（§8.6 落笔，计数随 F-R1
  刷新；账本归 merge） |
  findings: F-R1（AC-01/T-00/T-04，severity=M）——三桶账 27/29：outline_panel.at
  与 ribbon.at 未归任何桶（桶②计数实为 24=RC-D 16+RC-C 6+RC-E 1+RC-F 1；
  ribbon=壳面家具归 RC-C，outline_panel=RC-D 且系样板/缺件实证单元）；§8.6
  计数同源待刷。F-R2（informational，非阻塞）——gallery package.json 内嵌
  主检出 engine 绝对路径 link（vm-smoke MAIN_REPO 同款先例，可移植性留档）。
  F-R3（informational）——worktree 清理清单：vm/gen 与 gallery node_modules
  pnpm 链接、review 期自主检出复制的 engine dist/back exe/tmp fixture
  （均 gitignored），merge 时先摘链再 wt-guard |
  evidence: 全 gate 复跑绿（提交态）；front e2e 全量 24/24 passed（50.5s，
  worktree 内跑；环境准备=自主检出复制 gitignored 产物 engine dist/back exe/
  tmp fixture——分支零触达 autodown//back//tmp/，diff 实证）；diff 范围=
  component-gallery/** + 072-inventory.md + ARCHITECTURE.md（34 files，零
  front/src 触达）；负测=vm-probe --unit command_palette 预期红路径 exit 0 |
  next: work（F-R1 文档级修复：inventory §2/§3 归桶补全 + §6/§8 计数 +
  ARCHITECTURE §8.6 计数刷新；完成后重审 AC-01）`。
- 2026-09-18 work handoff #2（repair cycle 1）：`stage: work | plan_id: PLAN-072 |
  plan_revision: 1 | outcome: pass | code_commit: 0e2542e（plan-072-dev，
  树净） | task_ids: T-00/T-04（F-R1 受影响面重勾，current_step 5/5） |
  evidence: 程序化对账——29 widget 逐一在册（missing=NONE）、桶②24=
  RC-D 16+RC-C 6+RC-E 1+RC-F 1、九项计数断言全过（inventory §1/§3/§6 +
  ARCHITECTURE §8.6 同源）；修复仅触两份文档，gate 代码面零变化 |
  blockers: 无 | next: review（重审 AC-01）`。
- 2026-09-18 review #2（AC-01 重审）：`stage: review | plan_id: PLAN-072 |
  plan_revision: 1 | outcome: pass | reviewed_commit: 0e2542e
  （plan-072-dev，6 commits，树净） | base_commit: master fae21d9 |
  dependency_revisions: auto-lang fc8264f4a | spec_inputs: 同 review#1
  （无 docs/specs；SD-01=ARCHITECTURE §8.6，计数已随 F-R1 同源刷新） |
  acceptance_results: AC-01 pass（程序化对账：29 widget 逐一在册
  missing=NONE、桶①5 面/桶②24=RC-D 16+RC-C 6+RC-E 1+RC-F 1/桶③空桶，
  九项计数断言全过，inventory 与 §8.6 同源一致）；AC-02/03/04 pass 沿用
  review#1 证据——复用理由：0e2542e 相对 627c5e9 的 diff 仅两份文档
  （git diff --name-only 实证），gate/套件代码面零变化 |
  findings: F-R1 closed；F-R2/F-R3 informational 留档（非阻塞，随 merge
  清理注记执行） | evidence: 本次对账脚本输出（九项 PASS）+ diff 范围
  实证 + review#1 全套件记录（front e2e 24/24、gate 双臂绿） | next: merge
  （账本 P072-x 落账；清理时执行 F-R3 摘链清单）`。

## 9. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | ~~gallery 落点~~ **已闭环**：jade 特有件在 jade 仓 `component-gallery/`（T-00 裁定，T-01 落地）；bp/跨 app 件归 blueprints/widgets-gallery（L2） | — | 已闭环 |
| Q-2 | ~~editor gate 归属~~ **已闭环**：引擎对拍归 autodown lighthouse 流，gallery 挂 RC-E 状态占位（T-00 裁定） | — | 已闭环 |
| Q-3 | ~~VM 渲染探针单元粒度~~ **已闭环（T-01/T-02 实测）**：root 投影 + root 内联/twin 行（F-1 子件子树快照不可见）；整页单 boot + 配置化按钮序列 | — | 已闭环（README F-1..F-6） |

## 10. merge 收据（PLAN-072:r1）

- **prepared ✅**：reviewed 基线 0e2542e（master fae21d9 未漂移，实证）；SD-01
  规范增量已随分支落 ARCHITECTURE §8.6；投影条目 P072-1（architecture→§8.6）/P072-2
  （reviews→验收复审收据+归档路径）依冻结增量派生，worktree 提交 `1b56678`
  （P071 同款 8 字段 schema，JSON 校验过，纯追加 25 行）。
- **landed ✅**：master merge commit `734bdbc`（--no-ff，merge-base 实证
  fae21d9 未漂移）；ancestry 断言 0e2542e ∈ master；35 files/2917 insertions
  与 reviewed delta 一致（component-gallery/** + 两份文档 + 账本）。
- **ledger_refreshed ✅**：主检出 `.autoos/specs.json` 回读 P072-1/P072-2
  双条目在册（status=stable、file 指针 canonical、related=PLAN-072、无重复），
  全账 241 条目零重复；§8.6 与 inventory 主检出文件存在性验证。
- **archived ✅**：本文件 `git mv` → `docs/plans/archived/072-parity-inventory-l1-gallery.md`
  + status: archived + completion_kind: delivered。
- **cleaned ⏳**：待执行（摘 pnpm 链接 → wt-guard clean → worktree/分支/
  组目录移除）后补记。
