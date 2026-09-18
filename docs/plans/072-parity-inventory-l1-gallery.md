---
plan_id: PLAN-072
status: drafting               # drafting → executing → execution_done → reviewed → archived
feature_name: parity-inventory-l1-gallery（三桶盘点 + L1 组件 gallery 基建）
author: [zhaopuming]
created_at: 2026-09-18
updated_at: 2026-09-18
plan_revision: 1

supersedes_spec_components: []
new_spec_components: []        # 账本 P072-x 由 merge 落账
touched_goals: []

affects: [jade-garden/front]
current_step: 0
total_steps: 4
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

- **T-00** [调查] widget 全量枚举 + 三桶分类 + 修复类预估。产物：
  `docs/plans/attachments/072-inventory.md`。依赖：无。→ AC-01
- **T-01** [新] gallery 项目骨架（双轨 pac + 目录 + 2 个样板单元页）。
  依赖：T-00。→ AC-02
- **T-02** [新] 双端 gate 骨架（vue playwright 基线 + VM MCP 快照两臂，
  per 单元配置化）。依赖：T-01。→ AC-03
- **T-03** [新] 3 样板单元走通（纯展示/交互/数据绑定各一，含 VM 缺件单元
  的"缺件即红"行为验证）。依赖：T-01/T-02。→ AC-03
- **T-04** [改] 清单回填 gate 结果 + ARCHITECTURE §8.6（SD-01）。依赖：T-03。→ AC-01/04

## 8. 复审记录

- 2026-09-18 draft handoff：`stage: new | plan_id: PLAN-072 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权） | next: review → work`。

## 9. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | gallery 放 jade 仓（本计划）还是 widgets-gallery（auto-os）——jade 特有件 vs 跨 app 件分流 | T-01 位置 | T-00 裁定（默认：jade 特有件在 jade 仓） |
| Q-2 | 编辑器（autodown_editor）单元的 gate 归属（本计划 vs autodown lighthouse 流） | 清单边界 | T-00 裁定（默认：引擎对拍归 lighthouse，gallery 只挂状态占位） |
| Q-3 | VM 渲染探针的单元粒度（整页 vs 按组件挂载） | T-02 | T-02 实测定 |
