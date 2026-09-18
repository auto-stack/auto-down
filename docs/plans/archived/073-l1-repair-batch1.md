---
plan_id: PLAN-073
status: archived              # drafting → executing → execution_done → reviewed → archived（终态；merge 收据 PLAN-073:r1 见 §10）
completion_kind: delivered     # PLAN-073:r1 五 checkpoint 全闭环（2026-09-18 merge）
feature_name: l1-repair-batch1（桶① 5 面配方化与双端对齐）
author: [zhaopuming]
created_at: 2026-09-18
updated_at: 2026-09-18
plan_revision: 1

supersedes_spec_components: []
new_spec_components: []        # 账本已落账：P072-1 更新（architecture）+ P073-1 新增（reviews），merge 收据 PLAN-073:r1
touched_goals: []

affects: [jade-garden/front]
current_step: 5
total_steps: 5
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
  - [x] T-00 ✅ 已完成 [✅]（2026-09-18，down-073 @6dd8bfb）：toolbar 落点
    =MenuBar.vue L108-118（menu_bar.at 第二 view 块，ui_config 合成，**无缺件
    无需补发射**，不触发回 new）；5 单元字面清单 + recipe 机制实证（P-1..P-5，
    `class:`/`style:` 双属性位脱糖双轨可用）落
    `docs/plans/attachments/073-literal-style-inventory.md` §1-§3；
    gen 路径勘误（部署件在 front/src/components/）。证据：探针项目
    tmp/p073-styleprobe build+VM run 双绿。
- **T-01** [改] ①-1 status_bar：配方化 + 双端对照修复 + gate 锁。依赖：T-00。→ AC-01/02
  - [x] T-01 ✅ 已完成（2026-09-18，down-073 @030fe7b）：web `sb_footer`
    recipe + text-xs（部署 SFC 再生成，recipe 脱糖零漂移）；desktop zinc→
    text-foreground/text-muted-foreground + sb_meta/sb_dim 双配方；twin 镜像
    同步。AC-02 达成：status_bar 三面（web .at/部署 SFC/desktop .at）grep
    `11px|zinc` 零命中。gate 双臂绿 @030fe7b（--update-snapshots 后基线
    字节零变化——maxDiffPixelRatio 0.02 容差内，锁原版即有效，无需重刷）。
    amber-500/400 差异记债（主题 warning token 缺，清单 §4.3）。
- **T-02** [改] ①-2 tab 条 + ①-3 menubar：结构对照修复 + gate 锁（含 VM
  语言语义复核结论落档）。依赖：T-00。→ AC-01
  - [x] T-02 ✅ 已完成（2026-09-18，down-073 @bf47c2f）：menubar+toolbar
    双面单元上线（vue 真件 ui_config 合成面挂载 + VM root 内联结构镜像
    twin——菜单 web 子集 + toolbar 3 按钮；命令面交互归 24-menubar e2e，
    gallery 无点击断言）。Q-1 实测裁定：daily-note ext（lucide dyn）属
    web 特有面（desktop 无 daily 导航流），VM twin 无需等价物（070 R-1
    各持口径）。VM 语义复核结论落 README 债表 D-1（P622/P624 在 master
    v0.4.2-1140 成立：find 闭包/splice/?: 形态在案，运行时收据=vm-smoke
    tabs 臂双模绿见 T-04）+ D-2 tab 条各持/D-3 amber 主题债/D-4 编译器
    模板 zinc L2。5 基线全量重刷（harness 头部随新单元页演进）。gate 双绿。
- **T-03** [改] ①-5 filetree 行家族：行形态/icon/展开交互对照修复 + gate 锁。
  依赖：T-00。→ AC-01
  - [x] T-03 ✅ 已完成（2026-09-18，down-073 @ca42eb4）：filetree 单元
    上线——vue 真件 FileTree 挂载（store 直播种 wiki fixture 树，点击展开
    走真件 toggle 路径）+ VM 行解剖 twin（guides/chevron/icon/label 镜像
    desktop ft_rows；label 钮驱动展开 rows:3→4，子行条件分支=desktop
    双分支同款，规避 splice 面）。对照结论=README 债表 D-5（行解剖两端
    对齐，缩进 margin vs guides 各持合法；bps gotcha#2 消费侧 gate 归本
    twin，包级归 L2）。bp spec gotcha#2 未触发（无 bp 改动）。gate 双绿
    +6 基线在库。
- **T-04** [改] ①-4 toolbar 落点结论落地 + 回写面回归收口（pnpm build/
  受影响 e2e/双模 smoke）+ §8.6 勾记。依赖：T-01..T-03。→ AC-03/04/05
  - [x] T-04 ✅ 已完成（2026-09-18，down-073 @504d0a5）：toolbar 结论落
    台账（073 附件 §1 + 072-inventory ①-4 行勾记"无缺件，非反向差"）。
    回归收据：pnpm build 绿（worktree engine dist 缺件=环境项，按预构建
    工件惯例自主检出复制后过）；受影响 e2e 6 passed（03-tabs/24-menubar/
    08-screenshots；首跑 right-sidebar 反链 3→6 为 fixture 嵌套 wiki 环境
    伪影——runtime 重建后排除，非本计划回归）；vm-smoke 双模绿（merged
    16 项 + split tabs 臂，P622/P624 运行时证据同批固化；组内依赖兄弟
    down-073/auto-lang @520a96958 就位——dep bps 相对路径解析前提）；
    §8.6 勾记桶① 5 面基线已锁（SD-01，merge 时随分支发布+账本 P073-x
    落账）。

## 8. 复审记录

- 2026-09-18 draft handoff：`stage: new | plan_id: PLAN-073 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权） | next: review → work`。
- 2026-09-18 work：`stage: work | plan_id: PLAN-073 | plan_revision: 1 |
  outcome: pass | code_commit: 504d0a5（plan-073-dev @down-073/auto-down，
  base 6dd8bfb；依赖兄弟 down-073/auto-lang @520a96958 detached） |
  task_ids: T-00..T-04 | evidence: gallery gate 双臂绿（6 单元 @504d0a5
  复跑，基线 6 张在库）；AC-02 三面 grep 零命中；pnpm build 绿；受影响
  e2e 6 passed（03-tabs/24-menubar/08-screenshots）；vm-smoke 双模绿
  （merged 16 项+split tabs 臂）；SD-01 §8.6 勾记在分支 | blockers: 无 |
  next: review`。
- 2026-09-18 review（实现会话内复审，独立性受限声明在案；验收全部自工件
  与命令重放重构，未采信执行期摘要）：`stage: review | plan_id: PLAN-073 |
  plan_revision: 1 | outcome: pass | reviewed_commit: 504d0a5397ed573bac660
  ed7eec14f6af0d742f0（plan-073-dev @down-073/auto-down，worktree 零脏）
  | base_commit: 6dd8bfb8f4c714114f84778f26c34833f55dd01a（master） |
  dependency_revisions: down-073/auto-lang @520a96958af831205b887a7331387
  ba225ba2444（detached pinned；auto.exe v0.4.2-1140 同源） | spec_inputs:
  jade-garden/ARCHITECTURE.md §8.6（SD-01，diff 冻结于 reviewed commit）+
  072-inventory §2 + 073-literal-style-inventory.md | acceptance_results:
  AC-01 pass（gate 全新复跑双臂绿 6 单元+基线 6 张 git ls-files 在册）/
  AC-02 pass（三面 grep 11px|zinc 全 0 重放）/AC-03 pass（073 附件 §1 落点
  结论+072-inventory ①-4 勾记双工件在库）/AC-04 pass（pnpm build 绿+**全量
  front e2e 24/24**+vm-smoke 双模各 16 项绿——复审口径严于执行期 3 spec）/
  AC-05 pass（§8.6 勾记在 reviewed commit；账本 P073-x 未发布 ✓ 归 merge）
  | findings: 无阻断项；F-R1(info) §8.6 引用的 073 附件在 master 账面
  （bookkeeping），merge 后自然统一；F-R2(info) e2e 前端端口 13100 落本机
  排除段为宿主瞬态，复跑需本地端口便利（已记 §8 偏差） | evidence: 本记录
  命令结果+gallery gate 输出（6 单元断言+缺件红占位可见）+e2e 24 passed
  截行+vm-smoke 双模 ✓ 计数；断言非空性旁证=执行期 vue 臂曾在 dist 损坏时
  变红并恢复 | next: merge`。

### 环境与偏差记录（work 执行期）

- worktree 前置：gallery/front 依赖安装（pnpm 独立工作区）+ engine dist
  自主检出复制（相对路径 guard 锚定本 checkout 的环境项，非仓库缺陷）；
  front/node_modules `@autodown/engine` link 重指主检出已构建 dist
  （mklink /J，072 README 在案惯例）。
- e2e 端口：FRONTEND_PORT 13100 落 Windows 排除段（13086-13185，主机
  瞬态），worktree 本地 sed 14100 跑测后还原，未入库。
- fixture 伪影：首跑 08-screenshots 反链 3→6 为 .runtime 嵌套 wiki 索引
  双计，runtime 重建排除；主检出 .runtime 有他session 残留（Cards Probe.ad
  等）与 tmp fixture 漂移（jade-walk 走查/SRS 会话），不影响本仓 tracked
  面，留主检出 owner 自理。

## 9. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | ①-2 的 daily-note ext（lucide dyn）在 VM 臂的等价形态 | T-02 修复面 | **已答（T-02 实测）**：daily-note 面为 web 特有（desktop 无该流），VM twin 无需等价物——结论落 README 债表 D-2 |
| ~~Q-2~~ | ~~配方化的 recipe 落点~~ **已答（T-00 裁定）**：各单元 .at 文件内顶层 `style` 声明（app 内单源）；`class:`/`style:` 双属性位 bare-ident 消费均实证脱糖双轨可用（附件 §3 P-1..P-4）；字面任意值→标准 token（text-[11px]→text-xs）、zinc→语义 token；amber/编译器模板 zinc 记债不改 | T-01/T-02/T-03 | 已关闭，见附件 §4 |

## 10. merge 收据（PLAN-073:r1）

- **prepared ✅**：reviewed 基线 504d0a5397ed（master 6dd8bfb 未漂移实证；
  依赖兄弟 down-073/auto-lang @520a96958 detached）；SD-01 规范增量已随分支
  落 ARCHITECTURE §8.6（冻结于 reviewed commit）；账本投影 delivery commit
  `8000013`——P072-1 原地更新（同目标同节复用规则：§8.6 当前知识=桶① 5 面
  基线已锁/6 单元/配方化/债表 D-1..D-5/toolbar 落点，related +PLAN-073）+
  新增 reviews P073-1（验收复审收据+归档路径），241→242 条目，JSON 校验过，
  最小 diff（16+/3-），实现/依赖零变动（纯投影后代=合法 delivery_commit）。
- **landed ✅**：master merge commit `1aa7efd`（--no-ff，merge-base 实证
  6dd8bfb 未漂移）；ancestry 断言 504d0a5 ∈ master；18 files/346 insertions
  与 reviewed delta + 账本一致；`git diff plan-073-dev..master -- jade-garden/`
  零差异=master 的 jade-garden 树与全量验证过的分支逐字节同一（known-good
  内容同一性论证，替代冗余套件重跑）。
- **ledger_refreshed ✅**：主检出 `.autoos/specs.json`（tracked，经 worktree
  提交随 merge 落地）回读：242 条目零重复；P072-1 architecture/related
  [PLAN-072,PLAN-073]/content 含"基线已锁"；P073-1 reviews/stable/file 指
  归档路径。
- **archived ✅**：本文件 `git mv` → `docs/plans/archived/073-l1-repair-batch1.md`
  + status: archived + completion_kind: delivered。
- **cleaned ✅**：worktree git 零脏 → node_modules 三处（front/gallery/
  auto gen vue）摘除——front/gallery 整目录 rm（MSYS rm 对 junction 仅
  unlink 不穿透，主检出 engine dist/src 摘后完好性实证）、gen vue 391 链接
  同法 → wt-guard clean（auto-down）→ 双 worktree 移除（auto-down +
  auto-lang 兄弟 @520a96958 detached，注册归零）→ 分支 plan-073-dev 删除
  （was 8000013，master 含其祖先）→ 组目录 D:/autostack/.wt/down-073 移除。
