---
plan_id: PLAN-070
status: executing              # drafting → executing → execution_done → reviewed → archived
feature_name: jade-autoedit-bp-convergence（auto-edit/jade-garden 源码级组件平台化）
author: [zhaopuming]
created_at: 2026-09-17
updated_at: 2026-09-17
plan_revision: 3

# /auto-plan:review 结束时填写：
supersedes_spec_components: []
new_spec_components: []        # 本仓无 docs/specs/（见 §3 Specs 状况）；账本条目 P070-x 由 merge 落 .autoos/specs.json
touched_goals: []              # 本仓无 goals.md

affects: [jade-garden/front, auto-lang/examples/ui/041-auto-edit]
current_step: 3
total_steps: 7
---

# [PLAN-070] jade-autoedit-bp-convergence——auto-edit/jade-garden 源码级组件平台化

## 0. 变更摘要

jade-garden（web+desktop 双形态）与 auto-edit（`auto-lang/examples/ui/041-auto-edit`
范本）的通用 UI 组装件从"各持副本"收敛为"**一份实现、各自组装**"：共享件升级为
auto-lang **Blueprint 包**（PLAN-639 机制），消费面改跨包 import，删除仓内副本，
以依赖一致性门防再漂移。范围三消费面：jade web、jade desktop、041。

收敛清单（实勘证据见 §3）：

| 共享件 | 现状副本 | 收敛后 |
| --- | --- | --- |
| FileTree 四件（filetree/treeview/tree_icon/tree_util） | 3 份同源异构（jade desktop ≅ widgets-gallery 字节同版；041 已漂移出 `tree_chevron`）+ jade web 生成链一份 | 单一 bp 包，chevron 差异走参数/变体 |
| tabs_store | jade web / jade desktop 人工孪生（README §9.5 diff 登记册） | 单源 + 桌面增量上提（bp 参数或平台 delta），登记册退役 |
| status_bar / ctx_menu / actions 骨架 | jade desktop 与 041 各一份（067 按 041 移植） | 单一 bp 包；jade web 经 639 T-05 a2ts actions 发射接入命令系统 |

**非目标**：jade 特性件（graph/backlinks/srs/slash 等留 jade 仓为特性层，不进
共享包）；auto-edit 宿主产品化与空仓启用（另立项）；插件/动态加载（终态另议）；
auto-os widgets-gallery 与 auto-musk 的副本迁移（DEBTS 登记后续）；`@autodown/engine`
消费关系不动（引擎层本就是 npm 库）。

**依赖**：auto-lang **PLAN-639**（Blueprint 契约 + 跨包双轨解析 + a2ts actions
发射）。T-01/T-02 的 import 消费依赖 639 T-04；T-03 web 命令系统依赖 639 T-05。
639 未落地前本计划仅 T-00 可执行。

## 1. 目标

1. 三消费面共享件单一源化，仓内（及 041 仓内）副本归零，差异表达为 bp
   参数/变体而非分叉。
2. jade web 形态获得命令系统（actions/menubar/toolbar），与 desktop 双轨同语义。
3. 孪生双维护机制（§9.5 登记册）退役，由包依赖 + 一致性门替代。
4. 既有门禁全绿基线上完成收敛，并新增防再漂移门。

## 2. 架构方案

```
auto-lang blueprints/（PLAN-639 包库）
  navigation/filetree    ← canonical=jade desktop 版（≅widgets-gallery）+041 chevron 参数化
  navigation/tabstrip?   ←（T-00 裁定：tab 条 UI 与 tabs_store 的分层归属）
  display/status-bar · overlay/ctx-menu · shell/actions-skeleton
        │ 跨包 import（VM 轨运行时解析 + a2ts 编译期内联；pac.at 依赖声明）
        ├── jade-garden/front/auto（web：a2ts 生成链 → FileTree.vue/facade 不变，源头换 import）
        ├── jade-garden/front/desktop（VM：components 四件副本删除，改 use 包路径）
        └── auto-lang/examples/ui/041-auto-edit（VM：components 五件收敛，chevron 走参数）

仓内保留（各应用"作品"层）：app.at 组装、特性 store（graph/srs/links）、
ext 装配、/api 契约、@autodown/engine 装配（editor_tab_ext.ts / autodown_editor 原生件）。
```

## 3. 需求分析与背景调查

**授权记录**：2026-09-17 用户授权起草本计划（与 auto-lang PLAN-639 同批）；
范围=三消费面共享件收敛；**仅起草，未授权执行**；预算未指定。计划落 auto-down
仓的理由：计划谱系 001–069 均在本仓、jade 主体代码在本仓；auto-edit 仓为空占位
（git 无提交），宿主启用时另立项。

**证据路径**（2026-09-17 实勘，explore 代理 sha256 对拍）：

| 事实 | 位置 |
| --- | --- |
| jade desktop 组件副本（≅ widgets-gallery canonical 字节同版 ba5de834…/28f42744…） | `jade-garden/front/desktop/src/front/components/{filetree,tree_icon,tree_util,package}.at` |
| 041 组件（tree_util/package 与上述字节同版；filetree/tree_icon 已漂移 PLAN-637 chevron） | `auto-lang/examples/ui/041-auto-edit/src/front/components/` |
| jade web 生成链消费 | `jade-garden/front/auto/src/front/{fileTree_store.at,file_tree.at,file_tree_node.at}` → gen FileTree.vue |
| tabs_store 孪生（允许 diff 清单：头注/active_path/守卫×3/索引狩猎/哨兵） | `jade-garden/front/auto/src/front/tabs_store.at` ↔ `front/desktop/src/front/tabs_store.at`；登记册 `jade-garden/front/README.md` §9.5 |
| 067 按 041 模板移植（actions/menubar/toolbar/FileTree/StatusBar） | `docs/plans/archived/067-jade-vm-view-standard-components.md` |
| vue 轨命令系统缺位（依赖 639 T-05） | `jade-garden/front/auto` actions/menubar grep 零命中 |
| 双形态门禁基线 | ARCHITECTURE.md §6：九套 parity+契约 28/28+cargo 40/40+e2e 23/23 双后端；近期净窗全臂 25 检查+playwright 107 |

**Specs 状况**：本仓无 `docs/specs/`；canonical 知识由 `jade-garden/ARCHITECTURE.md`、
`jade-garden/README.md` 与 `.autoos/specs.json` 派生账本承载（账本=派生视图，
P070-x 条目按惯例由 auto-plan-merge 在收口时落账）。规范增量 therefore 以
canonical 文档为目标，见 §4 表。

## 4. 详细设计

### 4.1 filetree bp 化（首个"差异走参数"实例）

底版=jade desktop 副本（与 widgets-gallery canonical 字节同版，历史最干净）；
041 漂移出的 `style tree_chevron` 提取与 PLAN-637 注记**回收为 bp 参数/变体**
（如 `chevron: "chevron|caret"` 或 style token 覆盖），双端渲染断言锁定。
jade web 侧消费不动生成链结构（store/ext 面不变，源头 .at 换 import）。

### 4.2 tabs_store 收敛

单源定为 web 版语义超集；desktop 登记的三守卫/索引狩猎/哨兵增量逐一裁定：
真实 VM 语义 → 以 bp 参数或平台服务 delta 上提单源；历史规避 → 直接消亡。
§9.5 登记册改写为一段历史注记（保留裁定记录，删除维护义务）。

### 4.3 命令系统接入

desktop 与 041 已有 `actions{}`+menubar/toolbar（067/068 交付）；本计划只补
web 轨：依赖 639 T-05 发射后，jade web 在 front/auto 声明 actions 消费（形态
由 T-00 裁定：.at 直声明 vs facade 转接），三源触发（menu/快捷键/command 面）
双轨语义对齐 041 范本。

### 4.4 防再漂移门

新增轻量对拍门：消费面 import 路径 ↔ blueprints 包存在性 + L2/L3 落地文件
登记行（639 §4.2）核查；发现无登记行副本即红。入既有门禁脚本序列。

### 规范增量

| delta_id | add/modify/retire | 目标文档 | before/after 规则 | rationale | acceptance |
| --- | --- | --- | --- | --- | --- |
| SD-01 | modify | jade-garden/ARCHITECTURE.md（复用机制节） | 组件复用三机制并存（npm/生成部署/手工复制） → bp import 为共享件标准通道，复制仅限登记豁免 | 复制惯例是漂移根因 | AC-04 |
| SD-02 | modify | jade-garden/README.md §9.5 | 孪生 diff 登记册（维护义务） → 历史注记（无维护义务），单源+门禁替代 | 双维护成本实证 | AC-02 |

## 5. 测试设计

- 既有基线全量复跑：九套 node parity 门 + 契约门（28/28+副本漂移）+ back cargo
  40/40 + rust e2e 23/23 双后端 + vue-tsc/vite build + playwright（107）+
  vm-smoke（desktop 067/068 既有组）。
- 新增断言：①副本归零 grep/sha256 门（manifest 豁免清单外）；②filetree
  chevron 参数化双端渲染快照；③web menubar DOM 断言（playwright）；④§4.4
  依赖一致性门。

## 6. 验收标准

| ID | 可观察行为 | 验证方法 |
| --- | --- | --- |
| AC-01 | **（rev2 修订，Q-7 裁定 A）** filetree 家族单源：活消费面（desktop/041）经 bps 导入共享支撑件，三方仓内副本归零（041 死副本删除；web 谱系裁定为独立组件不属副本——DEBTS 070 行）；chevron 参数化注销（无活消费方） | grep/sha256 副本归零门 + desktop vm-smoke 全臂（files 臂=bp flatten_tree 端到端） |
| AC-02 | tabs_store 单源：desktop 副本删除、增量上提有裁定记录、§9.5 退役 | 文件缺席断言 + 裁定工件 + 双形态 tabs parity 门绿 |
| AC-03 | jade web 命令系统生效，与 desktop 同语义 | playwright menubar DOM 断言 + vm-smoke 无回归 |
| AC-04 | 门禁全绿 + 防再漂移门入列 | §5 全量基线绿 + 新门在门禁脚本序列中可触发（注入假副本变红实测） |
| AC-05 | 账面收口 | DEBTS 两行（widgets-gallery/musk 迁移后续）+ SD-01/02 文档落笔 + merge 时账本 P070-x |

## 7. 执行步骤

> 执行布局：跨仓消费 auto-lang blueprints，按 Plan 529 组目录约定
> `D:/autostack/.wt/down-070/{auto-down, auto-lang}` 双兄弟 worktree
> （041 文件改动在 auto-lang 仓内进行，遵该仓流程）；移除前过 wt-guard.sh。

- **T-00** [x] [调查/裁定] ①三消费面×共享件矩阵清单化（含 tab 条 UI 与 tabs_store
  分层归属、jade web actions 接入形态两裁定）；②共享 bp 宿主落点裁定（默认
  auto-lang `blueprints/`；widgets-gallery 保持 widget 层身份不变）。
  产物：`docs/plans/attachments/070-consumption-matrix.md`。依赖：无。→ 全体
  [✅ 已完成 2026-09-18] 矩阵+五裁定（R-1..R-5）落附件；sha256 实勘修正起草
  假设（filetree=三谱系、gallery package.at 已漂移 93543315、041 独有
  treeview）；tabs_store 三 delta 定性=双轨公共子集问题（无需变体机制）；
  R-1/R-2 provisional 待 639 merge 收口复核，R-3 转正（blueprints/ 已见
  master）。blueprints/ master 观察：README+四 kind+pac.at 在案。
- **T-01** [改+新] filetree bp 包（auto-lang 仓）+ 三消费面切换 import + 删副本
  + chevron 参数化双端断言。依赖：T-00；639 T-04。→ AC-01
  [x] [🔶 VM 轨切片完成 2026-09-18；web 切片经 Q-7 裁定 A 于 rev2 关闭——不收敛，DEBTS 070 登记] 实勘修正前提：filetree
  家族的活消费只有 tree_util+TreeIcon（desktop app.at 内联树行——067 VM 组件
  边界裁定；041 全家死代码、左栏实为 TreeView）；web 谱系=同名不同物（store
  驱动 vue 专属），无副本可删。已交付：bp 包 navigation/filetree（reference/
  default=FileTree 组合形态 + 包根支撑件 tree_util/tree_icon——包格式扩展：
  支撑件不占 variant 位，单文件单 widget 纪律所需）+ desktop 消费切换
  （pac.at dep bps + app.at use bps...{tree_util,tree_icon}，四副本删除）+
  041 消费切换（treeview/editor_store 导入 bps，死副本三件删除）。chevron
  参数化注销（无活消费方）。验证：负测（flatten_tree_MISSING → ft_rows
  computed 断裂）证明 bps 导入承载；vm-smoke split+merged 全臂 PASS（files
  臂 6 docs=bp flatten_tree 端到端）；041 boot 零解析错误。提交：auto-lang
  af8c72a84 / auto-down 9ace132。发现登记：BlueprintRegistry::with_defaults
  用编译期 CARGO_MANIFEST_DIR 定扫描根——`auto bp list` 看不到非构建期路径的
  包（worktree/外部检出），消费方 dep 解析不受影响；待登记 auto-lang DEBTS。
- **T-02** [x] [改] tabs_store 收敛：desktop 副本删除、增量裁定上提、§9.5 退役改写
  （SD-02）。依赖：T-00；639 T-04。→ AC-02
  [✅ 已完成 2026-09-18] 形态裁定变更（证据驱动，rev2 内记录）：跨包导入
  实测否决——store 内 `use back.api:` 按文件位置解析（位置即绑定），desktop
  副本移出即 read_wiki 等符号调用期失联（status 停 files-reloaded 复现）。
  单源形态 = 唯一源 front/auto/src/front/tabs_store.at + desktop 字节部署
  产物（scripts/tabs-store-sync.mjs 部署/--check 门；产物非资产纪律）。
  三 delta 终裁：①显式守卫 ×3 入单源（web 语义等价）；②str+"" 哨兵
  （VM 已证形态，web falsy/等值兼容）；③**显式索引狩猎**——findIndex 于
  VM 轨静默失效实机复现（tabs(3) idx 恒 -1 → 重开见脏文），§9.5 表⑥
  "624 已修 find_index"以实证推翻/修正（覆盖面不含 lambda findIndex 于
  store 状态路径）。§9.5 退役改写落笔。验证：desktop vm-smoke split+
  merged 全臂 PASS；web useTabsStore.ts 重部署（sed 同形改写）+ pnpm
  build（vue-tsc+vite）门绿。提交：auto-down 69f69d2。方法论注：--arms
  tabs 单臂模式存在既有 flake（tabs② stateIs 对非迁移值即时匹配旧值，
  对照实验旧副本同失败），全量跑为有效验证面。
- **T-03** [🔶 部分：两项不收敛注记 + web 切片 blocked（工具链前置）] 
  status_bar/ctx_menu/actions 骨架 bp 化 + jade web 命令系统接入。
  依赖：T-00；639 T-05。→ AC-03
  [🔶 处置注记 2026-09-18] ①status_bar **不收敛**（Q-7 同款实证：三版同名
  不同物——desktop=值 props 纯展示反链/出链、041=store 直读 line:col+terminal
  按钮、web=ext/composable 字数+watch 反链抓取；内容零重叠仅视觉骨架同，
  并集 bp=过度设计）；②ctx_menu **不迁移**（唯一消费方 041，搬家非复用，
  留 041 侧）；③web 命令系统 **blocked**：639 的 ui_config→ActionsBlock
  合成为 app.at 壳专属（crates/auto-lang/src/ui_gen/api.rs:390 "App-level
  config: only the app shell (app.at) inherits"，设计如此防动作泄漏；
  046 生成 App.vue 实证 menubar=shadcn 族+handler refs+快捷键 keymap），
  而 jade web 无 app 根（app.at 永不部署的占位、组件级部署+手写壳）。
  解阻选项：**(a)** auto-lang 扩 ui_config 合成面至非 app 组件（新计划）；
  **(b)** jade web 采用 app 根部署（架构大改）；**(c)** AC-03 web 切片
  修订——web 命令面以既有 ribbon/command_palette 手写面为准，DSL 命令
  系统 web 接入挂前置。→ Q-8 已裁定（rev3）：c 修订 + T-05/T-06 新 phase
  真正解决。零代码改动（纯调查/裁定切片）。
- **T-05** [新 phase，auto-lang 侧] ui_config 合成面扩展至非 app 组件：
  现状=合成仅 app.at 壳继承（api.rs:390 防动作泄漏设计）。扩展为**选择性
  继承**——组件 AST 含 menubar/toolbar widget 时才注入 pac.at ui_config 的
  ActionsBlock（无 menubar/toolbar 的组件零注入，保住泄漏防线）。
  产物：crates/auto-lang/src/ui_gen/api.rs 扩展 + 组件级测试（含泄漏负
  断言）；验证：新测试绿 + 046 build 不回归 + 既有 cargo 测试面。
  依赖：无（639 T-05 已交付 app 壳合成，本 phase 扩其适用面）。→ AC-03
- **T-06** [新 phase，jade 侧] jade web 命令系统落地：front/auto 增
  ui_config（app-config.at，动作集镜像 desktop 067 六流）+ menu_bar.at
  组件（menubar/toolbar 视图 + ext 委托 facade store 的 handler）+
  MenuBar.vue 部署 + AppShell 接线；验证：pnpm build + playwright menubar
  DOM 断言（新 e2e spec）。依赖：T-05。→ AC-03
- **T-04** [改] 门禁收口：§5 全量基线复跑 + §4.4 新门落地 + DEBTS/ARCHITECTURE
  落笔（SD-01）。依赖：T-01..T-03、T-05、T-06（居末执行）。→ AC-04/05

## 8. 复审记录

- 2026-09-17 draft handoff：`stage: new`，PLAN-070 rev1。`outcome: blocked`
  （blocked on：依赖 PLAN-639 T-04/T-05 未落地；639 与本计划 review 未跑）。
  `next: 639 先行 review+work；本计划 review 可先跑，T-00 即可开工（不依赖 639），
  T-01+ 等 639 双轨解析就绪`。
- 2026-09-18 work handoff：`stage: work | plan_id: PLAN-070 | plan_revision: 3 |
  outcome: pass(T-00)/blocked(T-01+) | code_commit: 无（T-00 零代码改动，簿记
  3a05255 线上） | task_ids: T-00 | evidence: attachments/070-consumption-matrix.md |
  blockers: T-01+ 待 PLAN-639 merge 收口（当前 reviewed、合并中；blueprints/
  包库结构已见 master） | next: 639 收口后 T-01 开工；开工时先建组内 auto-lang
  兄弟 worktree（分支基须含 639 落地提交）`。worktree：
  `D:/autostack/.wt/down-070/auto-down`（plan-070-dev，基 3a05255）。
- 2026-09-18 work handoff #3（rev2）：`stage: work | plan_id: PLAN-070 |
  plan_revision: 3 | outcome: pass(T-01/T-02) | code_commit: auto-lang
  af8c72a84+2cf3b4a74（auto-down-dev）/ auto-down 9ace132+69f69d2
  （plan-070-dev） | task_ids: T-01,T-02 | evidence: 各任务勾记注记 +
  vm-smoke 双模全臂 ×2（T-01/T-02 各一轮）+ pnpm build 绿 + 负测 |
  blockers: 无（Q-7 用户已裁 A） | next: T-03（status_bar/ctx_menu bp 化 +
  jade web 命令系统接入）`。契约变更：plan_revision 2（AC-01 措辞修订 +
  T-01/T-02 形态裁定变更，证据在案；授权范围未扩）。
- 2026-09-18 work handoff #4：`stage: work | plan_id: PLAN-070 |
  plan_revision: 3 | outcome: pass(T-01 前置修正 f3d79c18f)/blocked(T-03
  web 切片——Q-8) | code_commit: auto-lang f3d79c18f | task_ids: T-03（处置
  注记） | evidence: 三版 status_bar 对读 + api.rs:390 + 046 gen App.vue |
  blockers: Q-8 用户裁定 | next: 裁定后——c 则 AC-03 rev3 修订+T-03 勾记
  进 T-04；a 则拆 auto-lang 新计划后回本计划`。附带修正：filetree bp 收缩
  support-files-only（vue bps 扫描 fn 转译缺口实证，046 断裂解除——该缺口
  若不修会炸任何声明 dep bps 的 vue 构建，T-01 引入 T-03 前置解除）。
- 2026-09-18 work handoff #2：`stage: work | plan_id: PLAN-070 | plan_revision: 3 |
  outcome: pass(T-01 VM 轨切片)/blocked(T-01 web 切片——Q-7 用户裁定) |
  code_commit: auto-lang af8c72a84（auto-down-dev）+ auto-down 9ace132
  （plan-070-dev） | task_ids: T-01（部分） | evidence: 本计划 T-01 证据注记 +
  vm-smoke split+merged 双模全臂 PASS + 负测 ft_rows 断裂实证 | blockers:
  Q-7（web 谱系：方案 A 不收敛登记 DEBTS【推荐】/方案 B bp v2 收敛设计） |
  next: Q-7 裁定后——A 则 T-01 勾记+AC-01 措辞修订（plan_revision 2）进 T-02；
  B 则 T-01 续做 bp v2 设计切片`。

## 9. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | ~~共享 bp 宿主最终落点~~ **已裁定（R-3 转正）**：auto-lang blueprints/ | T-01 包位置 | 已闭环 |
| Q-2 | jade web actions 接入形态：R-2 provisional（.at 直声明优先） | T-03 | 639 merge 收口后按实际发射面定稿 |
| Q-3 | 041 改动的仓归属流程（auto-lang examples 内文件，是否随 639 组 worktree 顺带） | T-01/T-03 执行布局 | T-01 开工时与 639 组对齐 |
| Q-4 | auto-edit 空仓启用（宿主产品化）时机与立项拆分 | 本计划范围边界 | 用户裁定（本计划不含） |
| Q-5 | ~~package.at/treeview 归属~~ **已闭环（T-01 实勘）**：package.at=目录清单文件（两版仅头注/description 异），bp 包自带清单；treeview=041 活组件（非 filetree 家族），留 041 侧 | 已闭环 |
| Q-6 | **T-00 新增**：filetree web 谱系 C 的数据注入面改造量（fileTree_store fs 读取按 639 datasource 契约） | T-01 工作量 | T-01 设计细分 |
| Q-7 | ~~web FileTree 谱系裁定~~ **已裁定（2026-09-18 用户：方案 A 不收敛）**：web 谱系=独立组件，DEBTS 070 登记 + bp spec gotcha#2 在案；AC-01 rev2 修订 | 已闭环（rev2） |
| Q-8 | ~~web 命令系统处置~~ **已裁定（2026-09-18 用户）**：(c) 修订 + **在本计划内加 phase 真正解决**——ui_config 合成面扩展（auto-lang 侧，本计划 T-05，在既有 down-070/auto-lang worktree 执行）+ jade web 命令系统落地（T-06），不另立 auto-lang 计划 | 已闭环（rev3） |
