---
plan_id: PLAN-071
status: drafting               # drafting → executing → execution_done → reviewed → archived
feature_name: jade-garden-slim-down（瘦身：六项过剩处置）
author: [zhaopuming]
created_at: 2026-09-18
updated_at: 2026-09-18
plan_revision: 1

supersedes_spec_components: []
new_spec_components: []        # 本仓无 docs/specs/；账本 P071-x 由 merge 落账
touched_goals: []

affects: [jade-garden/front]
current_step: 0
total_steps: 4
---

# [PLAN-071] jade-garden-slim-down——六项过剩处置

> 依据：ARCHITECTURE.md §8.3 瘦身裁定（PLAN-070 后续战略）。统一期（三层
> parity）前置——每删一个过剩面，双形态少维护一个。web 侧为主；desktop 六流
> 无对应面，vm-smoke 仅作无回归佐证。

## 0. 变更摘要

| # | 处置对象 | 处置 | 理由 |
| --- | --- | --- | --- |
| 1 | legacy-autoui/（plan-011 归档残留） | 目录删除 | 零引用死树 |
| 2 | plugins_store + 插件面 | UI 面移除，store 与引用一并删 | 早期插件框架=过度设计；git 历史可取回 |
| 3 | whiteboard（whiteboard_page.at + 导航入口） | 移除，标注实验性可回归 | 155 行雏形不可用占维护面 |
| 4 | SRS 入口收敛 | cards probe/E2E Cards 页归测试资产；flashcard modal=唯一复习流；agenda 面板保留 | 功能留、入口收敛 |
| 5 | zip 导入导出 | 菜单栏降级进命令面板 | 备份操作不占壳顶 |
| 6 | query.at 后端引擎 | **保留**，文档标注"引擎就绪、无前端" | 引擎资产零维护成本 |

## 1. 目标

1. 六项处置全部落地，front/auto 无死引用（vue-tsc/build 绿）。
2. 双模 vm-smoke 无回归（desktop 面不受影响佐证）。
3. playwright 全量：删除面的既有 spec 同步修/删，基线按需更新，全套绿。

## 2. 架构方案

纯减法重构，零新增面。删除顺序：先摘消费点（导航入口/路由/组件引用），再删
store 与页面文件，每步构建绿。cards probe/E2E Cards 页面文件移入
`e2e/fixtures-pages/`（或按既有测试资产惯例处置，T-04 内定）。

## 3. 需求分析与背景调查

**授权记录**：2026-09-18 用户裁定的 PLAN-070 后续战略组合之一；仅起草。
**证据**：ARCHITECTURE §8.3 裁定表；plugins_store 消费点需 T-01 清点
（left_sidebar/command_palette 疑似引用）。

## 4. 详细设计

删除面与既有 e2e spec 的关联在 T-01 一并清点：凡 spec 断言涉及被删面者，
spec 同步删改（08-screenshots 基线预期受 §0-2/3/5 影响）。

### 规范增量

| delta_id | add/modify/retire | 目标文档 | before/after | rationale | acceptance |
| --- | --- | --- | --- | --- | --- |
| SD-01 | modify | jade-garden/README.md（功能面描述） | 功能清单含 plugins/whiteboard/zip 菜单 → 移除后口径 | 瘦身裁定 | AC-01 |
| SD-02 | modify | jade-garden/ARCHITECTURE.md §8.3 | 裁定表 → 处置完成状态勾记 | 账实同步 | AC-01 |

## 5. 测试设计

- front：pnpm build（vue-tsc+vite）绿。
- playwright：全量复跑；删除面对应 spec 删改；基线更新（--update-snapshots）
  后复跑绿。
- desktop：vm-smoke 双模快验（desktop 面未被触及，作无回归佐证）。

## 6. 验收标准

| ID | 可观察行为 | 验证方法 |
| --- | --- | --- |
| AC-01 | 六项处置落地 + 文档口径同步 | 逐项文件缺席/存在断言 + README/ARCHITECTURE 勾记 |
| AC-02 | 构建与测试面全绿 | pnpm build + playwright 全量（基线更新后）+ vm-smoke 双模 |

## 7. 执行步骤

- **T-00** [调查] 插件面/whiteboard/SRS 页/zip 的全部引用点清点（含 e2e
  spec 关联矩阵）。产物：引用清点表（计划附件）。依赖：无。→ 全体
- **T-01** [删] legacy-autoui/ 目录删除。依赖：T-00。→ AC-01
- **T-02** [删] plugins 面移除（入口+组件+store+ext，按清点表）。依赖：T-00。→ AC-01
- **T-03** [删] whiteboard 移除（入口+页面）。依赖：T-00。→ AC-01
- **T-04** [改] SRS 入口收敛（cards probe/E2E Cards 归测试资产；复习流收敛
  flashcard modal）。依赖：T-00。→ AC-01
- **T-05** [改] zip 导入导出降级命令面板（菜单栏动作移除）。依赖：T-00。→ AC-01
- **T-06** [改] 回归收口：spec 删改/基线更新/双模 smoke/文档勾记（SD-01/02）。
  依赖：T-01..T-05。→ AC-02

## 8. 复审记录

- 2026-09-18 draft handoff：`stage: new | plan_id: PLAN-071 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权） | next: review → work`。

## 9. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | cards probe/E2E Cards 页的"测试资产"落点（front/e2e/fixtures-pages 或 tests/） | T-04 | T-00 内定 |
| Q-2 | plugins_store 删除是否波及 desktop（desktop 无此 store，预计无） | T-02 | T-00 清点确认 |
