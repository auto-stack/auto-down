---
plan_id: PLAN-070
status: drafting               # drafting → executing → execution_done → reviewed → archived
feature_name: jade-autoedit-bp-convergence（auto-edit/jade-garden 源码级组件平台化）
author: [zhaopuming]
created_at: 2026-09-17
updated_at: 2026-09-17
plan_revision: 1

# /auto-plan:review 结束时填写：
supersedes_spec_components: []
new_spec_components: []        # 本仓无 docs/specs/（见 §3 Specs 状况）；账本条目 P070-x 由 merge 落 .autoos/specs.json
touched_goals: []              # 本仓无 goals.md

affects: [jade-garden/front, auto-lang/examples/ui/041-auto-edit]
current_step: 0
total_steps: 5
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
| AC-01 | filetree 单源：三消费面 import 同一 bp，仓内副本归零，chevron 走参数 | grep/sha256 门 + 双端渲染断言 |
| AC-02 | tabs_store 单源：desktop 副本删除、增量上提有裁定记录、§9.5 退役 | 文件缺席断言 + 裁定工件 + 双形态 tabs parity 门绿 |
| AC-03 | jade web 命令系统生效，与 desktop 同语义 | playwright menubar DOM 断言 + vm-smoke 无回归 |
| AC-04 | 门禁全绿 + 防再漂移门入列 | §5 全量基线绿 + 新门在门禁脚本序列中可触发（注入假副本变红实测） |
| AC-05 | 账面收口 | DEBTS 两行（widgets-gallery/musk 迁移后续）+ SD-01/02 文档落笔 + merge 时账本 P070-x |

## 7. 执行步骤

> 执行布局：跨仓消费 auto-lang blueprints，按 Plan 529 组目录约定
> `D:/autostack/.wt/down-070/{auto-down, auto-lang}` 双兄弟 worktree
> （041 文件改动在 auto-lang 仓内进行，遵该仓流程）；移除前过 wt-guard.sh。

- **T-00** [调查/裁定] ①三消费面×共享件矩阵清单化（含 tab 条 UI 与 tabs_store
  分层归属、jade web actions 接入形态两裁定）；②共享 bp 宿主落点裁定（默认
  auto-lang `blueprints/`；widgets-gallery 保持 widget 层身份不变）。
  产物：`docs/plans/attachments/070-consumption-matrix.md`。依赖：无。→ 全体
- **T-01** [改+新] filetree bp 包（auto-lang 仓）+ 三消费面切换 import + 删副本
  + chevron 参数化双端断言。依赖：T-00；639 T-04。→ AC-01
- **T-02** [改] tabs_store 收敛：desktop 副本删除、增量裁定上提、§9.5 退役改写
  （SD-02）。依赖：T-00；639 T-04。→ AC-02
- **T-03** [改] status_bar/ctx_menu/actions 骨架 bp 化 + jade web 命令系统接入。
  依赖：T-00；639 T-05。→ AC-03
- **T-04** [改] 门禁收口：§5 全量基线复跑 + §4.4 新门落地 + DEBTS/ARCHITECTURE
  落笔（SD-01）。依赖：T-01..T-03。→ AC-04/05

## 8. 复审记录

- 2026-09-17 draft handoff：`stage: new`，PLAN-070 rev1。`outcome: blocked`
  （blocked on：依赖 PLAN-639 T-04/T-05 未落地；639 与本计划 review 未跑）。
  `next: 639 先行 review+work；本计划 review 可先跑，T-00 即可开工（不依赖 639），
  T-01+ 等 639 双轨解析就绪`。

## 9. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | 共享 bp 宿主最终落点（默认 auto-lang blueprints/） | T-01 包位置 | T-00 裁定工件 + review |
| Q-2 | jade web actions 接入形态（.at 直声明 vs facade 转接） | T-03 | T-00 裁定 |
| Q-3 | 041 改动的仓归属流程（auto-lang examples 内文件，是否随 639 组 worktree 顺带） | T-01/T-03 执行布局 | work 启动时与 639 对齐 |
| Q-4 | auto-edit 空仓启用（宿主产品化）时机与立项拆分 | 本计划范围边界 | 用户裁定（本计划不含） |
