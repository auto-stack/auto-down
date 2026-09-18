---
plan_id: PLAN-074
status: reviewed               # drafting → executing → execution_done → reviewed → archived
feature_name: rcd-panels-batch1（面板家族批次 1：纯逻辑下沉 .at + VM 渲染臂）
author: [zhaopuming]
created_at: 2026-09-18
updated_at: 2026-09-18
plan_revision: 1

supersedes_spec_components: []
new_spec_components: []        # 账本 P074-x 由 merge 落账
touched_goals: []

affects: [jade-garden/front]
current_step: 5
total_steps: 5
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
>
> 执行记录（2026-09-18 /auto-plan:work 授权进入）：base = master `b92f7f6`，
> 分支 `plan-074-dev`，worktree `D:/autostack/.wt/down-074/auto-down`；
> 依赖 auto-lang 兄弟 `D:/autostack/.wt/down-074/auto-lang` detached @
> master `411d978b4`（编译器 auto.exe v0.4.2-1140 同源）。主检出残留
> `?? jade-garden/front/tmp/`（他 session scratch，072/073 在案，不并入）。

- **T-00** [x] [调查] 四件 ext 逐 fn 分类表（可沉/必留）+ back.api 通道核对。
  产物：分类表（模式文档 §1）。依赖：无。→ AC-01/03
  - [x] T-00 ✅ 已完成（2026-09-18，down-074 @a22d293）：分类表落
    `docs/plans/attachments/074-sink-mode.md` §1（14 行=7 sink+7 必留，
    15 fn——tabTitle/tabPath 与双 re-export 各自合行；逐件裁定+去向）；back.api 通道核对 + 下沉机制探针实证（P-1..P-6）落
    §2——模块 fn 三通道发射通/find+递归末段形态/f-string 数学内插/
    契约通道双轨 + ext 薄别名方案/撞名坑（R013 类实锤）/VM 字符串字节-
    字符语义分歧（微探针 MCP 断言实证，L3 纪律项）。total_steps 4→5 勘正
    （drafting 期漏计 T-00，任务面 T-00..T-04 共 5）。
- **T-01** [x] [改] outline_panel 正式化：072 样板转正式单元（parse 下沉 .at +
  gate 固化）。依赖：T-00。→ AC-01/02
  - [x] T-01 ✅ 已完成（2026-09-18，down-074 @4e07f74）：outline_headings
    下沉 outline_panel.at 模块 fn（`(level ?? 1)` → 显式 null 守卫，pad
    f-string 数学内插），ext 薄化至 facade 再导出 + dispatch 桥；部署 SFC
    再生成（内联发射实证）；gallery outline 单元双臂绿（vue 臂 playwright
    基线零漂移——真件行渲染已走下沉链路；vm 臂 13 断言）。
    **编译器缺口首件实证**：src/front 兄弟生成臂 bare-regen 丢模块 fn 池
    （探针 app 根通道绿/兄弟通道 TS2304 不对称）→ auto-lang 补丁 40d7488。
- **T-02** [x] [改] backlinks_panel：fetch/编排下沉 + VM twin + gate。
  依赖：T-00。→ AC-01/02
  - [x] T-02 ✅ 已完成（2026-09-18，down-074 @ff09f7c）：tab_file_stem
    模块 fn（find+递归形态，规避 CJK 字节域）+ watch try/catch/finally
    编排（`use back.api: get_backlinks`）；ext 薄化至 facade 再导出 +
    `get_backlinks` 契约别名（read_wiki 先例）；gen stub 补三契约名；
    部署 sed 双表达式。**编译器缺口第二/三件**：watch 块体不入 api 扫描
    + walker 无 Try 臂（on 绿/watch 红 对照实证）→ 补丁 899aa2e9c。
    gallery backlinks 单元双臂绿（vue 臂全下沉链路：seed→tab_file_stem→
    契约别名→shim→行渲染断言）。**Q-1 关闭**。
- **T-03** [x] [改] outgoing_links_panel + unlinked_references_panel：同 T-02
  模式。依赖：T-00。→ AC-01/02
  - [x] T-03 ✅ 已完成（2026-09-18，down-074 @25f269e）：两件同模式下沉
    （outgoing：宿主桥 openOutlinkTarget[confirm 流] 留 ext；unlinked：
    高亮 regex 留 ext 桥 + 行构造循环沉 watch，行 {page_path, html}）；
    gallery 双单元上线（vue 真件页 ×2 + shim 路由 ×2 + VM twin 行 ×2 +
    units.mjs 登记），基线 2 张新增/旧 4 张零漂移，gate 双臂全绿 6 单元
    （command_palette 预期红占位不变）。
- **T-04** [x] [改] 模式文档定稿（判定规则/步骤/坑清单）+ desktop 消费结论登记
  + 回归收口（pnpm build/05-panels 抽验/双模 smoke 快验）+ §8.6 勾记。
  依赖：T-01..T-03。→ AC-03/04
  - [x] T-04 ✅ F-R1 修复重勾（2026-09-18，down-074 @a4bd622）：§8.6 bullet
    基线 8→6（分支态 git ls-files 实测；073 合并后并集 8 张括注）+ 计划
    账面两处同源行（T-00 14 行=7+7、§8 记录 6 张）——仅触 ARCHITECTURE
    一 bullet 与计划记录，代码面零变化；AC-04 重审随 review#2。
  - [x] T-04 ✅ 已完成（2026-09-18，down-074 @80fef4a）：模式文档定稿
    （步骤六步 + 坑清单 G-1..G-8 + desktop 消费裁定登记表 §4——backlinks/
    outgoing 组件挂载首选、unlinked/outline 组件唯一路径，装配归 L3）；
    §8.6 勾记 SD-01 + 072-inventory 四行勾记。回归收口全绿：front
    `pnpm build` 绿（vue-tsc 全量）；front e2e **24/24 passed**
    （28.1s 复跑净记录；首跑 03-tabs 1 败 + 05-panels 1 flaky 为冷启/
    fixture 索引竞态，单跑与复跑均绿——073 首跑伪影同类）；desktop
    vm-smoke 双模 PASS（merged 16 项 + split 全臂，fixture 恢复协议生效；
    bps 依赖经组内兄弟 down-074/auto-lang 解析）。

## 8. 复审记录

- 2026-09-18 draft handoff：`stage: new | plan_id: PLAN-074 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权） | next: review → work`。
- 2026-09-18 review #2（F-R1 重审）：`stage: review | plan_id: PLAN-074 |
  plan_revision: 1 | outcome: pass | reviewed_commit: a4bd6228f08441beb784f49d18840ab9455e71dc
  （plan-074-dev @down-074/auto-down，6 commits，树净） | base_commit: b92f7f6 |
  dependency_revisions: down-074/auto-lang @899aa2e9c（不变） |
  acceptance_results: AC-04 **pass**（§8.6 bullet 计数已正：基线 6 张分支态
  +073 并集 8 张括注，git show 实证；账本 P074=0 未发布 ✓）；AC-01/02/03
  **pass 沿用 review#1**——复用理由：a4bd622 相对 80fef4a 的 diff 仅
  ARCHITECTURE.md 一文件（+2/-1，git diff --stat 实证），代码/测试/依赖
  零变化，已验证面不受影响 | findings: F-R1 closed；无新增 |
  evidence: 本记录命令输出（diff --stat/§8.6 行/ledger grep）+ review#1
  全套件重放记录 | next: merge`。
- 2026-09-18 review：`stage: review | plan_id: PLAN-074 | plan_revision: 1 |
  outcome: needs_fix | reviewed_commit: 80fef4a2a89a3431fa83af6c80c35cffd4a0f049
  （plan-074-dev @down-074/auto-down，5 commits，树净） | base_commit: b92f7f6
  （master 已前移至 ed100dd——执行期并发，漂移注记在案） |
  dependency_revisions: down-074/auto-lang @899aa2e9c（分支 plan-074-dev，
  编译器补丁 ×2，built exe v0.4.2-1173；仍 detached 无） |
  spec_inputs: jade-garden/ARCHITECTURE.md §8.6（SD-01 bullet，HEAD:191）+
  072-inventory 四行勾记 + 074-sink-mode.md（全 delta 冻结于 reviewed commit）；
  本仓无 docs/specs/（072 实证沿用），账本 P074=0 未发布 ✓ 归 merge |
  acceptance_results: AC-01 **pass**（ext 导出面 grep 重放=分类表逐一对应：
  outline 2 项/backlinks 2/outgoing 3/unlinked 3，零 sink 残留；.at 模块 fn
  3+3+2+1 在位；部署 SFC 内联发射实证） | AC-02 **pass**（gate 双臂 fresh
  复跑绿：vue build+playwright 6 单元 + vm boot 19 断言，四单元 state/
  snapshot 投影在案，command_palette 预期红占位=负例证据；基线 6 张
  git ls-files 在库） | AC-03 **pass**（模式文档四节齐备：分类表/P-1..P-6
  实测/步骤+G-1..G-8/desktop 登记表） | AC-04 **fail**（F-R1 计数错） |
  findings: F-R1（AC-04/T-04，severity=L）——账面计数错：§8.6 bullet
  "基线 8 张"（分支态实测 6=4 旧+2 新；8 系误并入 073 分支的 6 张口径，
  073 于本 base 之后才落地）；计划 T-00 记录 "13 fn：7 sink/6 必留"
  （模式文档实为 14 行=7 sink+7 必留，tabTitle/tabPath 合行、再导出合行）；
  §8 work 记录同源 "8 张"。代码零影响，纯文档准确性 |
  evidence: 全套件重放——pnpm build 绿（9.58s）；e2e 24/24（25.8s，端口
  sed 已还原）；vm-smoke 双模 PASS（split+merged）；gate 双臂绿输出在案；
  独立性声明：实现会话内复审，全部证据自工件与命令重放重构，未采信
  执行期摘要 | next: work（F-R1 文档级修复：§8.6 bullet 8→6 + 计划记录
  两处同源行；完成后重审 AC-04）`。
- 2026-09-18 work：`stage: work | plan_id: PLAN-074 | plan_revision: 1 |
  outcome: pass | code_commit: 80fef4a（plan-074-dev @down-074/auto-down，
  base b92f7f6；T-00 a22d293→T-01 4e07f74→T-02 ff09f7c→T-03 25f269e→T-04
  80fef4a；依赖兄弟 down-074/auto-lang @899aa2e9c[分支 plan-074-dev，
  编译器补丁 ×2，built exe v0.4.2-1173]） |
  task_ids: T-00..T-04 全勾（current_step 5/5） |
  evidence: gallery gate 双臂绿（6 单元，基线 6 张在库[分支态]、旧 4 张零漂移）；
  AC-01 四件 ext 薄化在案（逐 fn 分类+裁定=模式文档 §1：7 sink/6 必留）；
  AC-02 四单元 twin 双绿；AC-03 模式文档定稿（G-1..G-8）；AC-04 §8.6+inventory
  勾记（账本 P074-x 归 merge）。回归：front pnpm build 绿 + front e2e
  24/24 + vm-smoke 双模 PASS（merged/split） |
  blockers: 无 | next: review`。
  执行注记：①**编译器三缺口补丁（auto-lang plan-074-dev 40d7488/899aa2e9c，
  待其自身 review 后 fold-back）**：src/front 兄弟臂 fn 池重挂、watch 块体
  入 api 扫描、walker 补 Try 臂——Q-1 发射完备性的三件实证；旧编译器
  （≤1140）跑本批次 .at 必现 TS2304，review 复跑须用补丁版 exe；②**Q-2
  关闭**：fixture 形态沿 outline 样板（vue 臂 shim 应答+facade 播种，VM 臂
  Init 播种），未走静态 JSON；③**Q-3 关闭**：登记表落模式文档 §4（内联
  vs 组件逐件裁定），装配归 L3；④环境偏差记录见下。

### 环境与偏差记录（work 执行期）

- worktree 前置（073 同款）：gallery/front pnpm 独立安装；engine dist 自主
  检出复制（worktree autodown 无 dist）+ front node_modules engine link
  重指主检出 dist（mklink /J）；back exe 自主检出复制（e2e）；fixture
  自主检出复制（tmp/wiki-demo，主检出侧漂移风险在案）。
- e2e 端口：FRONTEND_PORT 13100 落 Windows 排除段（13086-13185，073 同款
  宿主瞬态），worktree 本地 sed 14200 跑测后已还原，未入库。
- PLAN-646 gen 支持件：补丁版编译器 `auto build` 在 gen main.ts 追加
  overlay 动态 import 但不落 overlay.ts/vite-env.d.ts（auto-lang master
  半接线）——worktree 内手工补两 gitignored 支持件（模式文档 G-7）；
  升级建议随 fold-back 一并提交。
- gen `src/src` 镜像时序：build 前的镜像在 build 后过期（README gap 32
  流程）——再生成时 build→刷镜像→复跑即绿，非编译器问题。
- ext-registry.json（PLAN-064 台账）四文件行数/条目随本批次漂移——批次
  裁定记录以模式文档 §1 为准，registry counts 刷新归下次 registry 梳理
  （info 级，不阻断）。
- 主检出 `?? jade-garden/front/tmp/`（他 session scratch）维持不并入；
  本批次自身探针（front/tmp/p074-sinkprobe）已清，worktree 树净。
- **master 漂移注记（执行期并发）**：本批次执行期间 master 由 `b92f7f6`
  前移至 `ed100dd`（PLAN-073 落地合并 + auto-musk-dev 并入，他 session）。
  plan-074-dev 五提交基于 b92f7f6 未重写；review/merge 时预期冲突面：
  `component-gallery/scripts/units.mjs`（073 加 2 单元/本批次加 2 单元，
  数组并集即解）与 `ARCHITECTURE.md §8.6`（073 勾记 vs 本批次新 bullet）；
  合并后 gallery 单元数=8（本档 §8.6 的"6 单元/8 基线"为分支态计数，
  合并态按 8 单元刷新）；README 债表 D 系列为本批次刻意未触面（P-6 建议
  合并后转录为 D-6）。

## 9. 待澄清事项

| Q | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | 下沉后的 .at store fn 在 vue 轨经 a2ts 的发射完备性（复杂 map/filter 链） | T-02/T-03 | **已答（T-02 实测）**：发射完备但依赖三枚编译器补丁（兄弟臂 fn 池重挂/watch api 扫描/Try 臂，auto-lang plan-074-dev 40d7488/899aa2e9c）——坑全数落模式文档 G-1..G-8 |
| Q-2 | 四件的 gallery 数据 fixture 形态（静态 JSON vs .at 播种） | T-01..T-03 | **已答（T-01..T-03 落地）**：沿 outline 样板——vue 臂 shim 应答+真件自身 watch 拉取/facade 播种，VM 臂 Init 播种；未走静态 JSON |
| Q-3 | desktop 挂载裁定（内联行 vs 组件挂载）逐件登记的归属 | 批次边界 | **已答（T-04 落档）**：登记表=模式文档 §4（backlinks/outgoing 组件首选、unlinked/outline 组件唯一路径、P614/F-1/F-5 约束注记）；装配归 L3/后续计划 |
