---
plan_id: PLAN-067
status: archived        # drafting → executing → execution_done → reviewed → archived
feature_name: jade-vm-view-standard-components
author: [zhaopuming]
created_at: 2026-09-15
updated_at: 2026-09-15
plan_revision: 1
current_step: 6
total_steps: 6
supersedes_spec_components: []
new_spec_components: [jade/desktop-view-contract]
touched_goals: []

affects: [auto-down/jade-garden]
---

# [PLAN-067] jade-vm-view-standard-components

## 0. 变更摘要

jade-garden 桌面 VM 轨视图重构：以 auto-lang `examples/ui/041-auto-edit` 为
结构模板，把 app.at 视图层从 022 骨架期的裸 button/text 词汇整体换装为
AutoUI 标准组件——`actions {}` 注册表（六流 action 化）+ menubar/toolbar
合成 + FileTree 文件树 + `code_editor` 正文编辑器 + StatusBar；并第一步并入
门面 `active_*` 契约对齐（PLAN-624 merge 收据登记的 jade 侧尾巴：facade WIP
基线落定 + `view_*` 投影字段改名 + tabs_store `active_path` 声明补齐）。
vm-smoke 锁步更新（六条**流**是不变的行为契约，元素绑定随视图更新）。
tabs_store 业务语义保持 web 双轨共享不动。

动机：现视图是 plan-022 骨架期形态（满排裸按钮/文件列表是一列 button/正文
是细 textarea/无菜单无状态栏），而 VM 轨富组件能力（plan 040 双轨真渲染、
NativeWidgetRegistry、Plan 451 actions DSL、Plan 630 menubar 族、Plan 614
FileTree）均已落地并有 041-auto-edit 实机验证。624 merge 门已证 facade 形态
无 VM 缺陷（smoke 双模 PASS），重构时机成熟。

## 1. 目标

- **G1 门面基线落定**：未提交的 facade 形态 WIP（app.at facade 形态 +
  tabs_store `active_path str = ""` 声明修复）提交为基线；App 投影字段
  `view_*` → `active_title/active_body/active_dirty`（改名后与 store 字段
  无撞名——store 仅声明 `tabs`/`active_path`）；现行 vm-smoke 双模绿为
  重构前基线证据。
- **G2 动作三源**：六流 action 化进 `actions {}`（Plan 451 DSL）+
  `menubar{}`（Plan 630 组件族）+ `toolbar` 合成；menubar 点击与 MCP 自动
  化同源派发。
- **G3 文件树**：文件列表换 `FileTree`（fs 形态节点、目录/文件图标、展开
  态），点击文件 → `.OpenFile(path)` 流不变。
- **G4 正文编辑器**：正文 textarea 换 `code_editor`（按 tab path 注册
  key）；`code_editor_set_text` 等内建留在 App 根 handler（041 约束：
  store handler 内产出坏字节码）；编辑 → dirty → save 落盘流不变。
- **G5 状态栏与面板整形**：StatusBar（status/root/计数行）；backlinks/
  outlinks/due cards/search 面板保持信息结构、以标准 col/row/class 整形
  （不引入新组件类型）。
- **G6 验收门**：更新后的 vm-smoke **split + merged 双模全臂绿**；
  tabs_store 的 web 共享面零语义变更（diff 仅 `active_path` 声明行 +
  VM delta 注释）；桌面 README 视图契约节落账。

**非目标**：markdown 预览/渲染与 graph 可视化组件化（后续档）；cards
review 交互重设计（现状保留）；vue 轨 action 配置支持（auto-lang 编译器
特性，另行计划）；tabs_store 业务逻辑变更（仅声明行补齐 + 注释）；
auto-lang 仓任何改动；web 侧视图改动。

## 2. 架构方案

041 模板映射（jade 现状 → 041 模式）：

| jade 现状（facade WIP） | 041-auto-edit 模式 | 落点 |
| --- | --- | --- |
| 满排裸按钮（open-ws/save/cards/graph/export/import/close） | `actions {}` 注册表 + `toolbar`/`menubar{}` 配置合成 | app.at actions 块 |
| 文件列表 = 一列 `button (text: f.name)` | `FileTree`（fs 节点、图标、展开态） | components/filetree.at（自 041 移植适配） |
| 正文细 `textarea` | `code_editor (key: …)`（CodeMirror6） | app.at 根视图编辑区 |
| `view_title/view_body/view_dirty` 投影 | 派生标量镜像（041 `title_active` 同款），**落 App widget 侧**（非 store——tabs_store web 共享，见 §5 撞名裁定） | app.at model |
| `text .status` 裸行 | StatusBar 组件（status/root/计数） | status_bar.at（013 形态） |
| smoke `elementIdOf(btn)` 按 text 定位 | 锁步更新：toolbar item title/menubar 结构即为定位锚 | vm-smoke.mjs |

VM 约束继承（041 README 实测清单，重构全程有效）：①回调 props 使组件 vm
模式退化为空 fallback——交互组件不靠回调 props；②组件子树对 MCP 快照不可
见（`autoui_snapshot` 只走根模板）——smoke 断言/定位的交互留根视图；③
view fn 片段参数化条件不求值；④`code_editor_*` 内建留在根 handler；⑤
action 配置 vue 发射器不消费（本计划 VM 轨为主，vue 面仅要求 tabs_store
共享面不回归）。

## 3. 技术栈

- AutoUI DSL（.at）：`actions{}`/`menubar` 族/`FileTree`/`code_editor`/
  `col/row/style`（VM 轨 iced 渲染）。
- 运行/验收：`auto.exe`（auto-lang master 构建，`D:/autostack/auto-lang/
  target/debug/auto.exe`）；`jade-garden/front/desktop/vm-smoke.mjs`
  （node，AutoUI MCP 驱动，fixture 前后哈希守卫）。
- 双轨约束：`tabs_store.at` 与 web（front/auto/src/front/tabs_store.at）
  共享——本计划仅在桌面副本补 `active_path` 声明行与 VM delta 注释。

## 4. 需求分析与背景调查

**授权记录（2026-09-15，用户会话）**：用户确认"用 041-auto-edit 作框架重
构 jade，立 auto-down 侧（jade 归它管）"。范围 = 本计划 §1；自动续作预算
未特别设定（按技能默认上限）。

**证据链**：

| 证据 | 位置 |
| --- | --- |
| 624 merge 收据 AC-6 排障：facade WIP 红真因 = tabs_store 缺 `active_path` 声明（622 转写遗失）；smoke split+merged 双模 PASS（workaround 形态，plan 构建） | auto-lang docs/plans/archive/624-…md §9 PLAN-624:r2 |
| facade WIP（未提交）：app.at facade 形态 + tabs_store.at（含声明修复） | 本仓主检出工作区（T-01 落定） |
| 041 模板：actions DSL/menubar 族/FileTree/code_editor + VM 约束清单 + MCP 测试矩阵 | auto-lang examples/ui/041-auto-edit（README + src/front） |
| smoke 契约基线：16 臂（open-ws/files/read/save/links/cards/d4/search/tabs①-⑤）、fixture 恢复协议、MCP 定位法 | jade-garden/front/desktop/vm-smoke.mjs |

**本仓代码锚点（实勘 2026-09-15）**：

| 锚点 | 位置 | 关联 |
| --- | --- | --- |
| 视图层（六流面板 + tabs facade） | `jade-garden/front/desktop/src/front/app.at`（WIP 形态 ~200 行） | G1..G5 |
| store（tabs + active_path + computed active_tab） | `src/front/tabs_store.at`（缺声明的模型 + 模块级 fns strip_ext/adopt_save_result） | G1/G6 |
| smoke | `jade-garden/front/desktop/vm-smoke.mjs`（arms 注册 + `elementIdOf` 文本定位 + `stateIs/stateHas`） | G6 |
| 桌面契约/提案面 | `jade-garden/front/desktop/README.md` §6（MCP）/§8（提案清单 ⑥ 行残余接缝——624 已清偿待闭合注记） | G6 落账 |

## 5. 详细设计

### 5.1 门面契约（G1）

- WIP 落定：`git` 提交 facade 形态 app.at + tabs_store.at（含
  `var active_path str = ""` 声明修复）为基线提交（facade 正式落地前半——
  后半 active_* 对齐即本计划）。
- 字段改名：App model `view_title/view_body/view_dirty` →
  `active_title/active_body/active_dirty`。**撞名裁定**：622 时代改名
  view_* 因"跨状态同名按位对齐错读"（README §8 注记）；彼次实证的撞名
  对象是 store 侧同名声明——现 store 仅声明 `tabs`/`active_path`，
  `active_title/active_body/active_dirty` 三名 store 无声明、无撞名；
  `active_path` 保持 store 独有（App 不声明，跨状态读）。重构后以 smoke
  全臂回归验证该裁定。
- 各 store 派发（Open/SetBody/Save/Close/SwitchTab）后的镜像重同步点
  逐一对位改名（handler 内 `.view_x` → `.active_x`）。

### 5.2 actions 与菜单（G2）

`actions {}`（app.at widget 内，Plan 451 DSL）——六流映射：

| action id | handler | 来源流 |
| --- | --- | --- |
| `ws.open` | .OpenWs | open-ws 臂 |
| `files.reload` | .LoadFiles | files 臂 |
| `file.save` | .Save | save 臂（`enabled_if: ".active_title != ''"`） |
| `tab.close` | .CloseTab | close-tab/tabs③ |
| `cards.load` | .LoadCards | cards 臂 |
| `graph.load` | .LoadGraph | graph 臂 |
| `ws.export` | .ExportWs | d4 臂 |
| `ws.import` | .ImportZip | d4 臂 |

`toolbar` 收编高频件（open/save/close/reload）；`menubar` 三菜单
（文件：open/save/close；视图：reload/console 位预留；卡片：cards/graph/
export/import）。`OpenFile(path)`/`Edit`/`QChanged` 等带参/输入事件不走
action（FileTree 点击与 code_editor oninput 直连根事件）。

### 5.3 FileTree（G3）

自 041 `components/{filetree,tree_util,tree_icon,package}.at` 移植到
`src/front/components/`（桌面自包含副本，不跨仓引用）；节点 schema 适配
`list_files` 结果（name/path → fs 形态 id=path）；选中事件 →
`.OpenFile(f.path)`。注意 041 注记：v1 直接渲染行（P320 单态同名组件
播种共享，TreeView 全画廊单实例约束），FileTree 自包含。

### 5.4 code_editor（G4）

`code_editor (key: t.path, lang: "markdown")` 按 tab path 注册；
打开/切换 tab 时根 handler `code_editor_set_text(key, body)`（**根
handler 内**，041 坏字节码约束）；`oninput` → `.Edit`（SetBody 派发）
照旧；dirty 显示走 `active_dirty`。空态（无 tab）保留空态文本定位锚
（smoke 用）。

### 5.5 StatusBar 与面板（G5）

`status_bar.at`（013 形态组件：读根态标量，无回调 props——状态行
status/root/bl_count/ol_count）。backlinks/outlinks/due cards/search
面板保持现有信息结构与 handler，仅以标准 col/row/style 整形 + 计数
徽标文本（不新增组件类型）。

### 5.6 vm-smoke 锁步（G6）

`vm-smoke.mjs` 更新点：①按钮定位 `elementIdOf` 文本改为 toolbar item
title/menubar 结构对应锚；②`autoui_state` 断言字段照旧（active_* 合并
根态可读——041 快照约束下这些字段在根 state，可读性不变）；③臂结构/
流语义/fixture 协议**不动**。

### 规范增量

| delta | add/modify | 目标 | before/after | rationale | AC |
| --- | --- | --- | --- | --- | --- |
| SD-01 | add | jade-garden/front/desktop/README.md 新「桌面视图标准组件契约」节 | before：视图形态散落 §5/§7 注记（裸 button 列表 + view_* 投影，无持久契约）；after：actions 注册表（六流 action id 表）+ active_* 派生标量口径（widget 侧、撞名裁定）+ smoke 元素绑定契约 + 041 VM 约束清单引用 | 重构后的持久行为契约，防再漂移 | AC-02..05 |
| SD-02 | modify | jade-garden/front/desktop/README.md §8 提案清单 ⑥ 行 | before：残余接缝四面开放登记（facade 实机 Field not found 等）；after：闭合注记——auto-lang PLAN-624 清偿（帧协议/值语义/find_index 2072；smoke 双模 PASS 实证）+ active_path 声明缺失真相（622 转写遗失，非 VM 缺陷） | 知识保鲜：彼仓缺陷证据闭合 | AC-07 |

## 6. 测试设计

- **主门**：`node vm-smoke.mjs`（split）+ `VM_MERGED=1 node vm-smoke.mjs`
  （merged）——更新后全臂绿，fixture 前后哈希一致；重构前先跑一轮现行
  smoke 留基线证据。
- **流等价**：read（打开→active_title/active_body 标记）、save（编辑→
  dirty→cleared+落盘）、tabs①-⑤ 逐臂对位。
- **web 共享面**：`tabs_store.at` diff 审查（仅声明行+注释）；web 侧
  `autodown/demo/auto` 若引用同一文件需同步核对（该副本为独立文件，无
  构建耦合——diff 审查即可）。
- **编译门**：`auto run -r vm` 启动无编译诊断；`cargo build -p auto`
  （如触及发射器则不属于本计划——预期不触及）。

## 7. 验收标准

| ID | 标准 | 验证方法 | 期望 |
| --- | --- | --- | --- |
| AC-1 | 门面基线落定且撞名裁定成立 | 基线提交在案 + 现行 smoke 双模绿基线记录 | 基线 commit + smoke PASS×2 |
| AC-2 | 六流 action 化 + menubar/toolbar 合成 | smoke 经新定位锚驱动 + menubar 渲染在案 | read/save 臂经 action 通道绿 |
| AC-3 | FileTree 文件导航 | smoke files/read 臂 | 树渲染 6 docs + 点击打开流绿 |
| AC-4 | code_editor 正文编辑流 | smoke save 臂 | dirty→cleared + 磁盘落盘验证绿 |
| AC-5 | vm-smoke 双模全臂绿 | split + merged 全量跑 | 全臂 PASS + fixture 哈希一致 |
| AC-6 | tabs_store web 共享零语义变更 | diff 审查 | 仅 active_path 声明行 + VM delta 注释 |
| AC-7 | 契约落账 | README「视图契约」节 + §8 ⑥ 闭合注记 | 两处在库 |

## 8. 执行步骤

| 步骤 | 任务 | 文件/操作 | 验证 | AC |
| --- | --- | --- | --- | --- |
| T-01 | 门面基线落定：提交 facade WIP + `view_*`→`active_*` 改名（去 `active_path` 撞名）+ 现行 smoke 双模基线 | app.at、tabs_store.at；vm-smoke.mjs（现行） | smoke PASS×2（基线） | 1 |
| T-02 | `actions {}` + menubar/toolbar：六流 action 化 + 锁步 smoke 定位锚 | app.at；vm-smoke.mjs | smoke 相关臂绿 | 2 |
| T-03 | FileTree 移植接入（components 四件 + 节点适配 + 点击流） | components/filetree.at 等；app.at；vm-smoke.mjs | files/read 臂绿 | 3 |
| T-04 | code_editor 正文（key 注册 + set_text 根 handler + 空态锚） | app.at | save 臂绿 | 4 |
| T-05 | StatusBar + 面板整形 + smoke 全臂更新 + 双模全量 | status_bar.at、app.at、vm-smoke.mjs | smoke PASS×2 全臂 | 5 |
| T-06 | tabs_store 共享面核对 + README 契约节 + §8 ⑥ 闭合 + 收据 | tabs_store.at diff、README.md | diff 审查 + 文档在库 | 6,7 |

每步完成后在本节追加 `[✅ 已完成]` 一行证据。

- [x] T-01 [✅ 已完成] worktree `.wt/auto-down-067/auto-down`（分支 plan-067-dev，基线 0246ba4）；主检出 WIP 逐字节携入（sha256 双侧一致留痕）提交 230dc57（app.at facade 形态 + tabs_store.at 首次入库含 `active_path str` 声明修复）；改名 fc0ed9f（view_title/body/dirty→active_*，view_note→save_note 对齐 smoke 契约字段；撞名裁定落注 app.at 头注）；现行 smoke split+merged 双模全臂 PASS（auto.exe v0.4.2-729，16 臂全绿 + fixture 哈希一致）。
- [x] T-02 [✅ 已完成] 4930a81：`actions{}` 8 action（含 `file.save` enabled_if `.active_title != ''`）+ toolbar 4 项合成 + menubar 三菜单（文件/视图[console 位预留]/卡片=cards+graph+export+import）；smoke 增 `pressAction(onclick 锚)`+`pressMenuItem(菜单两步)` 驱动，open-ws/files/save/close 臂经 toolbar action 通道、cards/d4 臂经卡片菜单通道，双模全臂 PASS——AC-2 达成（menubar 渲染+驱动在案）。
- [x] T-03 [✅ 已完成] aae5d86：041 tree 四件移植（components/{filetree,tree_util,tree_icon,package}.at）+ `to_fs_nodes`（list_files("", true) 递归→fs 形态 id=path，while+索引纪律）+ `computed ft_rows => flatten_tree(...)` + `.FtToggle`/toggle_id 受控展开态 + `.ft_sel` 选中；**树行根视图渲染裁定**（P614-C1 MCP press 组件行崩溃在册 + 约束②快照不可见→smoke 驱动行留根，041 行结构 TreeIcon+行按钮，点击 .OpenFile 流不变）——files 臂 6 docs 渲染、read/links/tabs 点击流绿（split 全臂 PASS）。AC-3 达成。
- [x] T-04 [✅ 已完成] 52f94dc：`code_editor (key: .active_path, lang: "markdown")` + `.Edit(str)` 单参通道（真实键盘=PLAN-057 全文发布 / MCP type_text=INPUT_TEXT 注入，渲染器源码双通道实证）+ 空态锚文本；**播种裁定**（content: 每帧外部 diff 回写+键变重挂载=播种通道；显式 set_text 需编辑器已注册——首开 RuntimeError "no editor registered" 实机复现，故打开/切换不调用；041 store-handler 坏字节码约束不受影响，调用位留根）——save 臂 type→dirty→save→清脏+磁盘落盘绿，tabs①-⑤ 全绿（split 全臂 PASS）。AC-4 达成。
- [x] T-05 [✅ 已完成] f5c8f36：`status_bar.at` StatusBar 组件（值 props：status_text/root_path/bl/ol；prop 名与模型字段错开防 P320 撞名面；状态行自顶排移至底栏）+ backlinks/outlinks/due cards 面板整形（11px tracking-wider 头 + 计数徽标，结构/handler 不动，search/graph_rows 面保留）——**split+merged 双模全臂 PASS**（AC-5 达成）。
- [x] T-06 [✅ 已完成] 874eb22：tabs_store 共享面 diff 审查（桌面副本 vs web 孪生 jade-garden/front/auto/src/front/tabs_store.at：仅头注 + `active_path str` 声明行[624 修复] + `&&/||` 显式守卫×3 + Close 索引狩猎 + `""` 哨兵——均头注登记的 VM delta，业务语义零变更；本计划对 tabs_store.at 零改动）；README 新增 §9「桌面视图标准组件契约」节（SD-01：actions 注册表/active_* 口径/code_editor 播种口径/FileTree 根渲染裁定/smoke 元素绑定契约/041 约束清单引用/§9.5 共享面口径）+ §8 提案⑥ ✅ 闭合注记（SD-02）。AC-6/AC-7 达成。
- [x] 终门 [✅ 已完成] HEAD 874eb22 上双模复跑：split PASS + merged PASS（全臂 + fixture 哈希一致）。

## 9. 复审记录

- 2026-09-15 stage:new handoff（/auto-plan:new，rev 1）：PLAN-067 起草。
  动机与模板实证充分（624 merge 收据 + 041 README 约束清单 + smoke 契约
  基线均为当轮实勘）；T-01..T-06 覆盖 AC-1..7 与 SD-01/02。设计裁定两枚
  已内嵌：①active_* 派生标量落 App widget 侧（web 共享约束优先于 041 的
  store 侧形态，撞名裁定以 smoke 全臂回归验证）；②facade WIP 以 T-01
  基线提交方式落定（= facade 正式落地前半，用户已定向"jade 归它管"）。
  `outcome: pass`，`next: work`（worktree `.wt/auto-down-067/auto-down`，
  分支 `plan-067-dev`，基线 = master 当前 tip）。

- 2026-09-15 stage: work | PLAN-067 | rev 1 | outcome: pass |
  code_commit: 874eb22（plan-067-dev；基线链 230dc57→fc0ed9f→4930a81→
  aae5d86→52f94dc→f5c8f36→874eb22） | task_ids: T-01..T-06 全完成
  （current_step 6/6） | evidence: ①AC-1 基线 230dc57+fc0ed9f + 现行
  smoke 双模 PASS×2（改名后撞名裁定成立）；②AC-2 4930a81 六流
  action 通道（toolbar onclick 锚 + 卡片菜单两步）双模全臂绿；③AC-3
  aae5d86 FileTree 6 docs 渲染 + 点击流绿；④AC-4 52f94dc code_editor
  type→dirty→save→磁盘落盘绿 + tabs①-⑤ 绿；⑤AC-5 f5c8f36 与终门
  874eb22 各跑 split+merged 双模全臂 PASS + fixture 哈希一致；
  ⑥AC-6 tabs_store diff 审查（仅登记 VM delta，零业务语义）；⑦AC-7
  README §9 契约节 + §8 ⑥ 闭合在库。执行期裁定三枚（证据均在案）：
  FileTree 行根视图渲染（P614-C1 崩溃在册 + 约束②）；code_editor 播种
  走 content: 外部 diff 回写（显式 set_text 首开未注册实机崩，
  RuntimeError "no editor registered"）；.Edit(str) 单参通道（真实键盘
  PLAN-057 全文发布 / MCP INPUT_TEXT 注入双实证）。SM-注：主检出工作区
  WIP 已按 T-01 携入并清理（sha256 验证留痕），主检出恢复干净。
  blockers: 无 | next: review（/auto-plan:review；worktree 留存待复审
  与 merge）。

- 2026-09-15 stage: review | PLAN-067 | rev 1 | outcome: pass |
  reviewed_commit: 874eb221e48bb7f1d355aa91c70d96ab70ebcfcd
  （plan-067-dev @ worktree `.wt/auto-down-067/auto-down`，tree clean） |
  base_commit: 0246ba48e8b56ae5ad8f99e0351e4c33e5049e82（master tip，
  分支切出点；diff 范围仅 jade-garden/front/desktop/** 9 文件，web 与
  auto-lang 零触碰） | dependency_revisions: auto.exe
  v0.4.2-731-g293344717-dirty（auto-lang master 于复审时点已前进至
  c65b176a5——含 PLAN-545 use 语义落地，见 R-067-1）；jade 后端
  jade-garden-back.exe 主检出预构建 | spec_inputs: README.md@874eb22
  sha256 ba056aee48ad59d1f6d70e66dc6e0af6c1a07fd2c8f791de66fabb4c000b1b00
  （SD-01/SD-02 冻结文本；app.at@874eb22 sha256
  3cc3c55f3eb9ed30255b3bc4e3ff3244a5a8a6902bf1220e01f37d351014d180）；
  账本 .autoos/specs.json（architecture 无 jade 条目——merge 时由
  README §9 派生 jade/desktop-view-contract 新条目） |
  acceptance_results: AC-1 pass（基线提交 230dc57+fc0ed9f 在祖先链；
  改名后双模基线绿在案）；AC-2 pass（8 action 注册与 msg 块逐一对位；
  toolbar 4 项/menubar 3 菜单；复审复现：open-ws/files/save/close 经
  toolbar onclick 锚、cards/d4 经卡片菜单两步，双模绿）；AC-3 pass
  （files 臂 6 docs 树行渲染 + read/links/tabs 点击流绿；组件四件与
  041 源 sha256 逐字节一致）；AC-4 pass（save 臂 type→dirty→清脏+磁盘
  marker 双模绿；tabs①-⑤ 全绿）；AC-5 pass（**复审复现** on 874eb22：
  split PASS + merged PASS 各 16 检查项 + fixture 哈希前后一致）；
  AC-6 pass（桌面副本 vs web 孪生 diff = 头注+active_path 声明行+空值
  守卫×3+索引狩猎+哨兵，零业务语义；web 孪生在 diff 范围外零改动；
  autodown/demo 无 tabs_store 引用）；AC-7 pass（README §9 五小节 +
  §8 ⑥ 闭合在被审树，内容与代码交叉核对——actions 表↔注册表、锚表↔
  smoke、set_text "无调用位"↔源码仅注释 165 行） | findings:
  R-067-1（observation，非阻断）= auto-lang 工具链漂移：本计划执行期
  master 三度前进（15654a7f8→293344717→4ac9cff03→c65b176a5，含
  PLAN-545 use 命名空间语义落地——app.at 的 `use` 导入面正属该域），
  复审证据绑定 exe v0.4.2-731-dirty 构建；处置：merge 前后若工具链
  重建，重跑 vm-smoke 双模作消费方核验（约 3 分钟，非门禁重开）。
  R-067-2（observation，非阻断）= `--save-baseline` 工具路径已锁步
  更新但复审未驱动（非臂、非验收项）。复审独立性声明：复审在实现
  会话内进行，裁定自工件重建（diff 重读/组件字节级对拍/双模重跑/
  文档-代码交叉核对），未采信执行摘要 | evidence: 双模 PASS 输出
  （本轮复审复现，命令 `node vm-smoke.mjs` / `VM_MERGED=1 node
  vm-smoke.mjs`，cwd jade-garden/front/desktop@874eb22）；组件对拍
  `sha256sum components/*.at` vs auto-lang examples/ui/041-auto-edit
  同名文件全 IDENTICAL；README §9/§8⑥ 在被审提交可解析可复读 |
  next: merge（/auto-plan:merge；worktree 留存）。

## 10. 待澄清事项

无阻断项。两个执行期裁定点已内嵌任务：①vue 轨是否要求同步视图（本计划
VM 轨为主，web 面仅保 tabs_store 共享——若需 web 视图同步另行计划）；
②markdown 预览/graph 组件化的第二档范围（后续档，不在本计划）。

- 2026-09-15 stage: merge | PLAN-067:r1 | outcome: pass | delivery_commit:
  ee0b63f（master merge commit，双亲 a382e57 + 948496d；874eb22 祖先链
  `git merge-base --is-ancestor` 通过） | prepared: 948496d（worktree
  内 delivery commit——reviewed_commit 874eb22 的 docs/projection-only
  后代，delta 逐项核对：实现/依赖零变化，仅 .autoos/specs.json 纯增量
  +25/-1[唯一删除行=重定位收尾括号]） | landed: ee0b63f on master，
  main known-good=落地树双模 smoke PASS（split+merged 全臂+fixture
  哈希一致，主检出复跑）；canonical 内容核验：README §9 在 master 在
  库（sha256 ba056aee 与冻结哈希一致） | ledger_refreshed:
  .autoos/specs.json（tracked，经 worktree+Git 落地）——P067-1
  architecture（jade/desktop-view-contract 桌面视图标准组件契约，
  canonical file=jade-garden/front/desktop/README.md §9，related
  PLAN-067，status stable）+ P067-2 reviews（验收/复审记录，file=
  docs/plans/archived/067-jade-vm-view-standard-components.md）；
  回读验证通过（JSON 解析 + id/file/related 逐项在案；architecture
  40 条/reviews 39 条，既有条目零触碰——diff 仅追加） | archived:
  docs/plans/archived/067-jade-vm-view-standard-components.md，
  status: archived，completion_kind: delivered | cleaned: 待清理后
  补记（worktree D:/autostack/.wt/auto-down-067/auto-down @948496d
  clean；分支 plan-067-dev 待删）。无阻塞项。
