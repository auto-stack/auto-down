---
plan_id: PLAN-074
status: drafting               # drafting → executing → execution_done → reviewed → archived
feature_name: rcd-panels-batch1（面板家族批次 1：纯逻辑下沉 .at + VM 渲染臂）
author: [zhaopuming]
created_at: 2026-09-18
updated_at: 2026-09-18
plan_revision: 1

supersedes_spec_components: []
new_spec_components: []        # 账本 P074-x 由 merge 落账
touched_goals: []

affects: [jade-garden/front]
current_step: 0
total_steps: 4
---

# [PLAN-074] rcd-panels-batch1——面板家族批次 1（纯逻辑下沉 .at + VM 渲染臂）

> 机制依据：design 30 §3 桶② RC-D（VM 缺件：渲染臂待实现）。本批次 = 面板
> 家族 4 件（backlinks 117L/outgoing 102L/outline 71L/unlinked 97L，形状
> 高度相似，合计 387L）。**本批次的核心交付是"纯逻辑下沉 .at"作业模式**——
> 072 盘点的关键洞察：ext 通道 TS 不入 VM（37 个 ext 全量 no-op stub 静默
> 降级，F-6 实证），16 件 RC-D 的统一修法就是把逻辑沉回 `.at`。模式立住，
> 其余 12 件即批量推进（RC-D 批次 2/3 另立）。
>
> outline_panel 为 072 样板已双绿（显式 parse 播种 F-5 列表路径解锁）——
> 本批次将其正式化并以其为下沉模式参照。

## 0. 变更摘要

| # | 单元 | 行数 | ext 耦合 | 工作点 |
| --- | --- | --- | --- | --- |
| 1 | backlinks_panel | 117 | ext:4（useTabsStore + fetchBacklinksSafe） | fetch 逻辑下沉 .at（back.api 通道已有）；行渲染 VM 臂 |
| 2 | outgoing_links_panel | 102 | ext:3 | 同上（get_outlinks） |
| 3 | outline_panel | 71 | ext:3（useBlocksStore/useTabsStore） | 072 样板正式化：parse 下沉 .at，列表路径 .at 化 |
| 4 | unlinked_references_panel | 97 | ext:3 | 同 backlinks（unlinked 扫描通道） |

共性：四件均为"数据拉取 → 行列表渲染"形状；数据通道在 back.api 契约双端
已有（get_backlinks/get_outlinks/unlinked 扫描/outline parse）——**下沉目标
明确定义为：把 ext 内的数据编排与行构造逻辑迁入 .at store/fn（单源），
ext 仅保留真宿主面**；VM 渲染臂 = gallery twin 行（072 实测：root 投影 +
root 内联行；子件子树对 MCP 快照不可见，F-1）。

## 1. 目标

1. 四件的纯逻辑（数据编排/行构造/排序过滤）下沉 `.at`（store fn/computed
   或模块 fn），ext 薄化至真宿主面（如确有 DOM 依赖）或清空。
2. gallery 四单元 VM 渲染臂可用（twin 行），双端 gate 绿。
3. **下沉模式文档化**：`ext → .at` 的判定规则（什么可沉/什么必须留）、
   步骤、坑清单——作为 RC-D 批次 2/3 的作业标准。
4. desktop 消费结论在案：四面板的 app 挂载（内联 vs 组件）按 P614/P618
   约束逐个裁定登记（装配归 L3/后续，不在本批次）。

**非目标**：desktop app.at 挂载面板（装配归后续）；其余 12 件 RC-D
（批次 2/3）；编辑器单元（lighthouse）。

## 2. 架构方案

```
ext TS（数据编排+行构造，TS 不入 VM）
   ↓ 下沉（判定：纯逻辑/无 DOM 依赖 → .at store fn 或模块 fn；back.api 通道不变）
.at store/模块 fn（单源：vue 轨经 a2ts 进 composable，VM 轨原生可达）
   ↓
gallery twin（VM root 内联行 + vue 真件）× 双端 gate（结构快照+截图基线）
```

- 下沉判定规则（写入模式文档）：**可沉** = 数据变换/排序/过滤/字符串处理
  （VM fn 能力域，tree_util 先例）；**必留 ext** = DOM/window 交互
  （prompt/open）、第三方库调用、Pinia 响应式细节。逐 fn 过一遍分类。
- .at 侧 VM 能力边界复核：`.lower()/contains 深帧` 等 P618 登记项如遇
  （unlinked 的匹配逻辑），按 tree_util 纪律（while+索引/两步赋值）规避，
  坑清单入模式文档。

## 3. 需求分析与背景调查

**授权记录**：2026-09-18 用户批准的 Phase 2 组合；仅起草。
**既有依据**：072-inventory §3（四件耦合事实）+ §7（outline 样板双绿，
F-5 显式 parse 播种/F-6 缺件即红实证）；tree_util.at（VM fn 纪律先例）；
status_bar_ext/tabs_store_ext（ext 薄化先例）。

## 4. 详细设计

### 规范增量

| delta_id | add/modify/retire | 目标文档 | before/after | rationale | acceptance |
| --- | --- | --- | --- | --- | --- |
| SD-01 | add | jade-garden/ARCHITECTURE.md §8.6 | 无 → 三桶清单状态更新（四件转"VM 臂已建"）+ 下沉模式文档指针 | RC-D 批次台账 | AC-04 |

（ext 下沉判定规则落在 gallery 模式文档，非 canonical spec——作业标准，
随批次演进。）

## 5. 测试设计

- gallery gate：四单元双端（结构快照 + 截图基线）绿；fixture 注入数据
  （不 boot 后端，072 惯例）。
- 下沉逻辑单元测试：.at fn 的行为锚（如 backlinks 排序/过滤、outline 层级
  构造）以 gallery 断言覆盖 + vue 轨对拍。
- 回归：pnpm build；front 既有 e2e 抽验（05-panels spec 仍绿——web 侧行为
  不变）；vm-smoke 双模快验。

## 6. 验收标准

| ID | 可观察行为 | 验证方法 |
| --- | --- | --- |
| AC-01 | 四件纯逻辑下沉 .at：ext 薄化至真宿主面或清空 | ext 文件逐 fn 分类表 + 删除/保留裁定记录 |
| AC-02 | 四单元 gallery twin 双端 gate 绿 | gate 记录 + 基线文件在库 |
| AC-03 | 下沉模式文档在案（判定规则/步骤/坑清单） | gallery 模式文档 + 批次 2/3 可直接引用 |
| AC-04 | 账面 | ARCHITECTURE §8.6 勾记（SD-01）+ merge 时账本 P074-x |

## 7. 执行步骤

> worktree：`down-074/{auto-down, auto-lang}`。

- **T-00** [调查] 四件 ext 逐 fn 分类表（可沉/必留）+ back.api 通道核对。
  产物：分类表（模式文档 §1）。依赖：无。→ AC-01/03
- **T-01** [改] outline_panel 正式化：072 样板转正式单元（parse 下沉 .at +
  gate 固化）。依赖：T-00。→ AC-01/02
- **T-02** [改] backlinks_panel：fetch/编排下沉 + VM twin + gate。
  依赖：T-00。→ AC-01/02
- **T-03** [改] outgoing_links_panel + unlinked_references_panel：同 T-02
  模式。依赖：T-00。→ AC-01/02
- **T-04** [改] 模式文档定稿（判定规则/步骤/坑清单）+ desktop 消费结论登记
  + 回归收口（pnpm build/05-panels 抽验/双模 smoke 快验）+ §8.6 勾记。
  依赖：T-01..T-03。→ AC-03/04

## 8. 复审记录

- 2026-09-18 draft handoff：`stage: new | plan_id: PLAN-074 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权） | next: review → work`。

## 9. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | 下沉后的 .at store fn 在 vue 轨经 a2ts 的发射完备性（复杂 map/filter 链） | T-02/T-03 | T-02 首件实测，坑入模式文档 |
| Q-2 | 四件的 gallery 数据 fixture 形态（静态 JSON vs .at 播种） | T-01..T-03 | T-01 以 outline 样板为准 |
| Q-3 | desktop 挂载裁定（内联行 vs 组件挂载）逐件登记的归属 | 批次边界 | 本批次仅登记；装配归 L3/后续计划 |
