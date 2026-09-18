---
plan_id: PLAN-073
status: drafting               # drafting → executing → execution_done → reviewed → archived
feature_name: l1-repair-batch1（桶① 5 面配方化与双端对齐）
author: [zhaopuming]
created_at: 2026-09-18
updated_at: 2026-09-18
plan_revision: 1

supersedes_spec_components: []
new_spec_components: []        # 账本 P073-x 由 merge 落账
touched_goals: []

affects: [jade-garden/front]
current_step: 0
total_steps: 4
---

# [PLAN-073] l1-repair-batch1——桶① 5 面配方化与双端对齐

> 机制依据：auto-lang `docs/design/30-autoui-parity-three-layer.md` §5
> （配方先行 → 双端 gate → 修复 → 锁基线）。单元台账：
> `docs/plans/attachments/072-inventory.md` §2（桶① 5 面）。
> 工作面 = component-gallery 隔离面（PLAN-072 基建），修复回写 app 仅在
> gate 绿之后（隔离面原则）。

## 0. 变更摘要

桶① 5 面逐单元走 L1 流水，锁双端基线：

| # | 单元 | 修复类 | 已知差异/工作点 |
| --- | --- | --- | --- |
| ①-1 | status_bar | RC-A 配方先行 + RC-B | 11px/zinc token 密集；web ext-composable 耦合 vs VM 值 props |
| ①-2 | tab 条 | RC-B + VM 语言语义复核 | web TabStrip.vue（lucide dyn、daily-note ext）vs desktop 内联投影；P622/P624 语义债复核 |
| ①-3 | menubar | RC-B | ui_config 单源已成立（070 T-06/24-menubar e2e）；对照点=渲染结构 |
| ①-4 | toolbar | RC-B 落点复核 | web `toolbar{}` 声明在案、独立 Toolbar.vue 缺席——先复核渲染落点（疑随 MenuBar.vue 合成），再对照 |
| ①-5 | filetree 行家族 | RC-B | 谱系 C（web）vs desktop 内联 ft_rows（bps 支撑件）；行形态/icon/展开交互对照；bp spec gotcha#2 在案 |

## 1. 目标

1. 5 单元各自在 gallery 内达成双端 gate 绿（结构快照 + 截图基线双份）。
2. 涉及 app 回写的修复（配方化/token 替换、toolbar 落点结论落地）在 app
   侧同步，pnpm build + 受影响 e2e 绿。
3. 5 单元基线锁死（gallery gate 纳入常规门序列）。

**非目标**：bp 抽取（L2，待本计划基线锁死后另立）；desktop 新增面板挂载
（RC-D 域，PLAN-074）；编辑器单元（RC-E，lighthouse 流）。

## 2. 架构方案

每单元独立流水（可并行）：

```
gallery 单元页（072 基建）→ 配方化（字面 style → recipe/token）
  → 双端 gate（vue 截图基线 + VM root 投影/内联行断言）
  → 差异修复（优先单源侧：.at/recipe；ext 仅宿主面）
  → 回写 app（若修复触及 app 文件）→ 锁基线
```

- ①-4 toolbar 复核路径：检查 gen/front/vue/src/components/MenuBar.vue 是否
  已含 toolbar 合成面（070 T-06 生成物）；若已含 → 结论"落点=MenuBar.vue
  内"，无独立 SFC，登记后对照；若缺 → 按 046 形态补发射（需 auto-lang 侧
  确认，触发则回 new 评估）。
- ①-2 tab 条遵守 070 R-1（各应用自持，不 bp 化）；VM 语言语义债复核 =
  P622/P624 修复后的 findIndex/?: 形态在当前 master 复测（T-02 已预验
  一次，本轮以 gate 形式固化）。

## 3. 需求分析与背景调查

**授权记录**：2026-09-18 用户批准的 Phase 2 组合（L1 滚动第一批）；仅起草。
**既有依据**：072-inventory §2（5 面耦合事实：行数/ext 数/已知债）；
gallery 基建（units.mjs/gate.mjs/e2e baselines，5 样板含 status_bar/tabs
已双绿——本计划将其余 3 面补齐并全面配方化）；070 R-1/tab 条裁定。

## 4. 详细设计

### 规范增量

| delta_id | add/modify/retire | 目标文档 | before/after | rationale | acceptance |
| --- | --- | --- | --- | --- | --- |
| SD-01 | modify | jade-garden/ARCHITECTURE.md §8.6 | 桶① 5 面状态"待修复" → "基线已锁（073）" | 单元台账勾记 | AC-01 |

（单元级修复不产生新契约；样式面走 recipe/token 既有机制。）

## 5. 测试设计

- gallery gate：5 单元 × 双端（结构快照 + 截图基线）全绿；配方化后基线
  重刷（--update-snapshots）并复跑。
- app 回写面：pnpm build；受影响 e2e（03-tabs/24-menubar/08-screenshots
  基线）复跑；vm-smoke 双模快验。
- ①-2 的 VM 语言语义复核结论落 gallery README 债表。

## 6. 验收标准

| ID | 可观察行为 | 验证方法 |
| --- | --- | --- |
| AC-01 | 5 单元双端基线锁死 | gallery gate 全绿记录 + 基线文件在库 |
| AC-02 | ①-1 status_bar 配方化完成（字面 token 清零） | grep 字面 11px/zinc 于 status_bar 面零命中（recipe 引用替代） |
| AC-03 | ①-4 toolbar 落点结论在案 | 复核结论写入单元台账（附件更新） |
| AC-04 | app 回写面零回归 | pnpm build + 受影响 e2e + vm-smoke 双模快验绿 |
| AC-05 | 账面 | ARCHITECTURE §8.6 勾记（SD-01）+ merge 时账本 P073-x |

## 7. 执行步骤

> worktree：`down-073/{auto-down, auto-lang}`。

- **T-00** [调查] ①-4 toolbar 渲染落点复核 + 5 单元字面 style 清单（配方化
  范围定价）。产物：清单附件更新。依赖：无。→ AC-03
- **T-01** [改] ①-1 status_bar：配方化 + 双端对照修复 + gate 锁。依赖：T-00。→ AC-01/02
- **T-02** [改] ①-2 tab 条 + ①-3 menubar：结构对照修复 + gate 锁（含 VM
  语言语义复核结论落档）。依赖：T-00。→ AC-01
- **T-03** [改] ①-5 filetree 行家族：行形态/icon/展开交互对照修复 + gate 锁。
  依赖：T-00。→ AC-01
- **T-04** [改] ①-4 toolbar 落点结论落地 + 回写面回归收口（pnpm build/
  受影响 e2e/双模 smoke）+ §8.6 勾记。依赖：T-01..T-03。→ AC-03/04/05

## 8. 复审记录

- 2026-09-18 draft handoff：`stage: new | plan_id: PLAN-073 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权） | next: review → work`。

## 9. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | ①-2 的 daily-note ext（lucide dyn）在 VM 臂的等价形态 | T-02 修复面 | T-02 实测裁定 |
| Q-2 | 配方化的 recipe 落点（app 内 style 块 vs blueprints 共享 recipe） | T-01 | T-00 定价后裁（默认 app 内，共享化留给 L2） |
