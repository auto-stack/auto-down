---
plan_id: PLAN-079
status: archived
completion_kind: delivered
feature_name: l3-assembly-batch1（L3 收口批次 1：desktop 面板装配 + RC-C 壳面 + L3 门固化）
author: [zhaopuming]
created_at: 2026-09-19
updated_at: 2026-09-20
plan_revision: 2
current_step: 6
total_steps: 6

supersedes_spec_components: []
new_spec_components: []        # 见 §5：SD-01（jade ARCHITECTURE §8.6 L3 批次 1 bullet）；装配模式文档 = 新附件（074-sink-mode 的 L3 对应物）
touched_goals: []

affects: [jade-garden/front]
---

# [PLAN-079] l3-assembly-batch1——L3 收口批次 1（非 graph 族装配 + RC-C 壳面 + L3 门固化）

> 机制依据：design 30 §2 L3 行（parity 单元 = 流程+布局组装+数据流；隔离面
> = jade 本体；门 = vm-smoke 双模 + 全量 playwright + **双端截图基线**；
> DoD = 全绿，剩余差异仅限布局组装级）+ 074-078 四张 desktop 消费登记表
> （074-sink-mode §4/§4.1/§4.2/§4.3——挂载裁定已逐件登记，装配归 L3 =
> **本计划**）。
>
> 前置解锁：RC-D 16 件清零（078），面板逻辑全部 .at 单源（模块 fn + watch
> 编排 + back.api 契约）。**graph 族划出批次 2**（graph_view 真渲染随
> auto-lang PLAN-661 canvas 场景契约——executing 中，其 §10 明确交接
> jade 消费侧；graph_page 装配/graph_sidebar·controls 挂载同批）。
>
> **本计划最大未知数 = 装配机制的机械形态**（Q-1，起草期已实勘三事实，
> 见 §2）：组件挂载（`use jadeauto.front` dep 通道）在 gallery 实测触发
> junction 物化违例 + ext composable VM 侧 no-op stub；而内联消费
> （desktop app.at 直拉契约 + 复用下沉模块 fn——filetree ft_rows 先例）
> 绕开两者但不是"组件挂载"。**T-00 探针定形并产出 L3 装配模式文档**，
> 登记表裁定按定形结果落地或修订。

## 0. 变更摘要

| 面 | 内容 |
| --- | --- |
| 装配机制 | T-00 探针（unlinked = 唯一路径件、desktop 无等价流，作定形探针）→ **装配形态裁定**（组件挂载 / 内联消费模块 fn / 按件混合）+ L3 装配模式文档（判定规则/步骤/坑清单——074-sink-mode 的 L3 对应物） |
| desktop 装配批 A（074 四件） | backlinks/outgoing_links（首选挂载）/unlinked_references/outline（唯一路径）——内联流退役按裁定 |
| desktop 装配批 B（076 三件） | command_palette/quick_switcher（唯一路径；palette 命令清单走 ui_config 重建，076 §4.1 裁定在案）+ search_panel（可选件裁定） |
| desktop 装配批 C（077 五件） | properties/recent_files/create_page_prompt/theme_popover/agenda（唯一路径）+ flashcard_modal（可选件裁定）；workspace_opener 维持内联流（077 §4.2 裁定） |
| RC-C 壳面 | app_shell/main_area/left_sidebar/right_sidebar 四件 gallery 状态占位登记（组装级归 L3 口径，072 台账"L1 挂占位"）+ **ribbon parity 定义裁定**（Q-2）+ graph_page 批次 2 注记 |
| L3 门固化 | app 级双端截图基线（VM 侧形态 Q-4）+ 全量套件收口（vm-smoke 双模 + front e2e 全量 + gallery gate） |

## 1. 目标

1. **装配形态裁定在案**（Q-1）：至少一件（unlinked）全链路实证——编译/
   数据/断言三面绿；L3 装配模式文档落附件（判定规则/步骤/坑清单）。
2. **desktop 非graph 族面板装配落地**：11 件唯一/首选路径件全数消费
   （组件挂载或内联消费，按 Q-1 定形）；3 件可选件（search/flashcard/
   workspace）逐件裁定登记；被替代的内联流退役。
   【rev 2 勘正（复审 Q-5 用户裁定 A，2026-09-20）：11 件 → **10 件装配
   + properties 划批次 2**——P-9 map 迭代 VM 零迭代 + 无整页 frontmatter/
   块列表契约（两条补路均出本计划 affects），不可达证据复审核实；前置
   = 配对列表通道（backend 契约或编译器修复），与 graph 族同批批次 2】
3. **RC-C 壳面收口（批次 1 范围）**：四件状态占位登记 + ribbon 裁定
   （Q-2：web-only 特有面为默认预案）+ graph_page 划批次 2 注记。
4. **L3 门（批次 1 版）固化**：app 级双端截图基线在库 + 全量套件绿——
   L3 DoD"剩余差异仅限布局组装级"的批次 1 达成面可陈述。
5. 账面：SD-01 + 072-inventory RC-C 行注记 + 消费登记表回填（实际形态）
   + merge 账本 P079-x。

**非目标**：graph 族装配（graph_view 真渲染/graph_page/graph_sidebar·
controls——批次 2，gated on PLAN-661 AC 全绿）；ribbon 的 VM 等价面实现
（若 Q-2 裁 web-only 则无此面）；editor_tab（RC-E lighthouse 流）；web 侧
新功能/重构（装配只动 desktop 消费面 + gallery 登记面）；L3 批次 2 及
全量 DoD 终验（等批次 2）。

## 2. 架构方案

装配形态的两条候选路径与已知约束（T-00 探针裁定）：

```
路径 α 组件挂载：desktop pac.at 声明 dep（jadeauto）→ use jadeauto.front.<W>
  ⚠ 已知约束（gallery T-01/T-02 实测）：dep 声明触发构建层急切 junction
    物化（wt-guard 违例类）+ 全量扫描编译；ext composable（useTabsStore
    等）VM 侧 no-op stub（F-6）→ 面板数据面空。已下沉件 watch 编排走
    back.api 契约（VM 可解析），但 current_title 等仍读 tabsStore facade
    （实勘：backlinks_panel.at computed current_title =>
    tab_file_stem(.tabsStore.activeTab)）——facade 在 VM 的路由/适配是
    α 路径的关键缺口（desktop 自有 tabs_store.at 部署副本在库，072 §1）。

路径 β 内联消费：desktop app.at 直拉契约 + 消费下沉模块 fn/行构造
  （filetree ft_rows 先例：desktop 内联行消费 bps tree_util/tree_icon，
  bp gotchas#1 right 形态）→ 不挂组件本体，无 junction/stub 面。
  ⚠ 约束：模块 fn 在面板 .at 文件内（G-3 无跨文件导入）——desktop 引用
    需 dep 通道或 fn 随件复制（tabs_store.at 部署副本先例）；交互独立面
    （palette/switcher 弹层、theme popover、cpp 确认框）内联形态 =
    desktop 自持 UI 消费 .at 逻辑。
```

- **T-00 以 unlinked 为探针**（唯一路径件 + desktop 无等价流 + 高亮
  regex ext 桥不进 VM——消费面最薄）：α/β 双探针实证，按证据定形
  （允许按件混合：纯展示行族 β、交互独立面 α 或 desktop 自持）。
  裁定记录 + 模式文档（步骤/坑清单，含 F-1 断言走 root 投影、F-5
  watch 播种、G-2 CJK 纪律、P-9/P-11 写形态约束的 L3 版作业标准）。
- **ribbon（Q-2 默认预案）**：ribbon = web 特有壳面家具（左 activity
  bar：lucide 图标轨 + 主题触发 + 今日笔记/全局图谱入口）；desktop 无
  对应面（desktop toolbar ≠ ribbon，同名不同物注记在案）——裁定
  **web-only 特有面**（073 Q-1 daily-note 同款口径），gallery 挂状态
  占位（editor_tab 形态），L3 差异表登记。
- **内联流退役纪律**：desktop 六流内联（搜索/反链/出链/闪卡/图谱/
  导入导出）中，被装配替代的流退役；行为面由既有 vm-smoke 臂 +
  （新增）app 级断言覆盖——退役前后行为等价验证先行。

## 3. 技术栈

- **jade-garden/front**：desktop `src/front/app.at`（装配落点，六流内联
  现状）+ `desktop/src/back/api.at`（契约副本，#[api] 340 改写形态在案）；
  web `auto/src/front/*.at`（消费源——下沉模块 fn 面）；web 侧 ext/部署
  SFC **零改动**（装配只动 desktop + gallery）。
- **component-gallery**：units.mjs 增 RC-C 四件状态占位 + ribbon 占位
  （editor_tab 形态：missing=expected-red 或状态注记——组装级不设 gate）。
- **auto-lang 编译器**：master ≥ v0.4.2-1378；PLAN-661（executing）落
  地后 ≥ 其交付版（slider/map 写修复利好装配面——P-11 解除后
  graph_controls 类嵌套写可用，但非本批依赖）。探针出编译缺口按惯例
  兄弟分支补丁 + 折回。
- **门**：desktop vm-smoke 双模（split/merged）+ front e2e 全量 +
  gallery gate（20 真件零漂移）+ **新增：app 级双端截图基线**（web =
  08-screenshots 既有；desktop/VM 侧形态 Q-4——MCP autoui_snapshot 断言
  或 VM 截图基建，T-00 顺带定价）。

## 4. 需求分析与背景调查

**授权记录**：2026-09-19 用户批准两计划并行起草（canvas 侧已由 PLAN-661
承载——executing，不重复立项；本计划 = L3 批次 1）；**仅起草，执行未
授权；Q-1/Q-2 为裁定级，T-00 证据后随 review/work 流程确认**。

**既有依据（2026-09-19 主检出实勘）**：

| 依据 | 实勘落点 |
| --- | --- |
| 消费登记表 | 074-sink-mode §4（backlinks/outgoing 首选挂载、unlinked/outline 唯一路径 + 约束注记 F-1/F-5/G-2/P614）/§4.1（palette/switcher 唯一、search 可选、palette 命令清单 ui_config 重建）/§4.2（properties/recent/cpp/theme/agenda 唯一、flashcard 可选、workspace 内联维持）/§4.3（graph 族——批次 2） |
| 装配约束三事实 | ①gallery pac.at 头注实测：dep 声明（jadeauto/bps）触发急切 junction 物化 + 全量扫描编译；②backlinks_panel.at computed 仍读 tabsStore facade（VM 侧 ext stub 域）；③desktop tabs_store.at 部署副本在库（web/desktop 单源，tabs-store-sync 门——072 §1） |
| RC-C 五件精读 | app_shell（99L，九组件装配 + boot/window 监听 ext）/main_area（98L，TabStrip/EditorTab/GraphPage 装配 + v-show keep-alive）/left·right_sidebar（53L×2，面板槽位切换）/ribbon（118L，activity bar + ThemePopover）；graph_page（202L，批次 2） |
| desktop 现状 | app.at 543L 壳 + 六流内联（OpenWs:128/LoadCards:261/Grade:267/DoSearch:275/LoadGraph:304）+ actions/menubar/toolbar ui_config 合成（073）+ ft_rows 内联（bps 消费先例） |
| PLAN-661 交接 | 其 §10：jade 消费侧后续计划（graph_view 真渲染/三表灌入/onhit 打开页/gallery 第三单元转正/desktop 图谱页装配）——上游依赖 661 AC-01/02/05/06 全绿；**批次 2 划出依据** |
| L3 门参照 | vm-smoke 双模/gallery gate（既有）；08-screenshots（web 截图基线既有）；desktop app 级断言/截图形态待定（Q-4） |
| 651 尾事 | auto-lang DEBTS 5 条 651 提案仍未回填（075/077/078 三次确认）——661 交付时顺手补登建议在案（非本计划面） |

## 5. 详细设计

### 规范增量

| delta_id | add/modify/retire | 目标文档 | before/after | rationale | acceptance |
| --- | --- | --- | --- | --- | --- |
| SD-01 | modify | jade-garden/ARCHITECTURE.md §8.6 | 批次 4 bullet 后 → 增 L3 批次 1 bullet（装配形态裁定 + 11 件装配 + RC-C 占位 + ribbon 裁定 + L3 门批次 1 版 + 批次 2 划出注记） | L3 台账 | AC-05 |

（**L3 装配模式文档** = 新附件 `docs/plans/attachments/079-l3-assembly-mode.md`
——形态裁定/判定规则/步骤/坑清单，074-sink-mode 对应物；消费登记表回填
实际形态。均非 canonical spec。）

**装配分批与登记表对齐**：

| 批 | 件 | 登记表裁定 | 本批动作 |
| --- | --- | --- | --- |
| A（右栏族） | backlinks/outgoing_links | 首选挂载 | 装配（α/β 按 T-00）；反链/出链内联流退役 |
| | unlinked_references/outline | 唯一路径 | 装配（unlinked 兼 T-00 探针件） |
| B（检索导航族） | command_palette/quick_switcher | 唯一路径 | 装配；palette 命令清单走 ui_config 重建（desktop 命令面 073 已单源） |
| | search_panel | 可选 | 逐件裁定登记（T-00 形态顺带——搜索内联流已覆盖） |
| C（属性杂项族） | properties/recent_files/create_page_prompt/theme_popover/agenda | 唯一路径 | 装配 |
| | flashcard_modal | 可选 | 逐件裁定登记（闪卡内联流在库） |
| （维持） | workspace_opener | 内联流维持 | 零动作（OpenWs 流已覆盖，077 §4.2） |
| （批次 2） | graph_sidebar/graph_controls/graph_view/graph_page | §4.3 + 661 交接 | 划出——graph_page 占位注记 |

**RC-C 占位登记**：units.mjs 增四行状态占位（app_shell/main_area/
left_sidebar/right_sidebar——组装级归 L3，不设 gate，missingReason 注
L3 口径）+ ribbon 占位（Q-2 裁定后按 web-only 特有面登记）+ graph_page
占位（批次 2 注记）。gallery gate 计数口径 = 20 真件 + 占位族（editor_tab
既有 + 新增）——负例语义仅 editor_tab 续任（占位≠缺件红，登记措辞区分）。

**L3 门（批次 1 版）**：全量套件（vm-smoke 双模 + front e2e 全量 +
gallery gate 零漂移）+ app 级双端截图基线：web 侧 08-screenshots 既有
基线复跑；desktop 侧按 Q-4 形态（MCP autoui_snapshot 断言锚或 VM 截图）
建首批基线（六流装配后态 + 壳面）。

## 6. 测试设计

- **T-00 探针**（tmp 一次性，双态可弃）：unlinked 双路径实证——α：desktop
  pac.at dep 声明 + use 挂载（junction 物化/facade 路由/断言可达三面记录）；
  β：desktop app.at 内联消费模块 fn（fn 引用通道/行渲染/契约直拉）。
  产出：形态裁定 + 模式文档 + Q-4 定价。
- **装配行为锚**：每件装配后 vm-smoke 对应臂绿（行为等价）；退役流的
  断言迁移（内联行断言 → 装配面 root 投影断言，F-1 口径）。
- **回归**：desktop vm-smoke 双模 + front e2e 全量（web 侧零改动面——
  部署 SFC/构建产物不触）+ gallery gate 20 真件零漂移 + 新占位登记可见。
- **截图基线**：web 08-screenshots 复跑零漂移；desktop 首批基线建库
  （--update 同款流程）。

## 7. 验收标准

| ID | 可观察行为 | 验证方法 |
| --- | --- | --- |
| AC-01 | 装配形态裁定 + 模式文档在案（探针证据双路径记录） | `079-l3-assembly-mode.md`（形态/判定规则/步骤/坑清单）+ unlinked 全链路绿实证 |
| AC-02 | 【rev 2】10 件唯一/首选路径件装配落地 + properties 差异登记划批次 2（Q-5 裁定 A）+ 3 可选件裁定登记 + 退役流行为等价 | desktop app.at diff 对应登记表回填；vm-smoke 双模绿（断言迁移在案）；逐件装配记录 |
| AC-03 | RC-C 四件 + ribbon + graph_page 占位登记在案（ribbon Q-2 裁定落地） | units.mjs 新占位行 + gate 汇总可见 + 台账注记 |
| AC-04 | L3 门批次 1 版绿：全量套件 + 双端截图基线在库 | vm-smoke 双模/front e2e 全量/gallery gate 零漂移全绿 + desktop 首批基线文件在库 |
| AC-05 | 账面 | SD-01 §8.6 L3 批次 1 bullet + 072-inventory RC-C 行注记 + 消费登记表回填 + merge 账本 P079-x |

## 8. 执行步骤

> worktree：`down-079/{auto-down, auto-lang}`（auto-lang 兄弟 master
> detached @ exe ≥v0.4.2-1378；若 661 已落地则用其交付版，非依赖）。

- **T-00** [x] [调查+裁定] 装配形态探针（unlinked 双路径）+ L3 装配模式文档
  + Q-4 定价 + ribbon 裁定证据整理。产物：`079-l3-assembly-mode.md`。
  依赖：无。→ AC-01
  - [✅ 已完成 2026-09-19] 探针 p079-probe（worktree 一次性，已弃）：α 三面
    = E-1 run 轨零 junction/E-2 编译 boot 绿但面板零运行时痕迹（比 F-6
    更死：无 stub WARN）/E-3+4 数据面（facade stub 短路）与断言面（F-1
    黑盒）双死；β 全链绿 = E-5 契约直拉 ul_count=3（API 真值：Projects.ad
    块引用 ×2 + 自页标题 ×1）/E-6 根视图行可见/E-7 press 开页；通道隔离
    = E-8 **跨项目 fn 导入静默死面（新坑 P-15）**·E-9 同项目 fn 导入绿
    （use <stem>: <fn> 真调用断言过）。**裁定：β 内联消费 = 装配形态
    （fn 随件部署副本落 desktop/src/front/<panel>_fns.at + 契约直拉 +
    根视图行渲染）；α 不采用（数据/断言两面死）；交互独立面 = β 变体
    desktop 自持**。Q-2 ribbon = web-only 特有面（默认预案落地，证据
    模式文档 §6）；Q-3 search/flashcard = 内联流维持、装配延后批次 2；
    Q-4 = snapshot 断言锚 + 结构基线文件起步（像素基建不建，§5）。
    产物：docs/plans/attachments/079-l3-assembly-mode.md（worktree，
    随本 commit）。
- **T-01** [x] [改] 装配批 A（右栏四件）+ 内联流退役（反链/出链）。依赖：
  T-00。→ AC-02
  - [✅ 已完成 2026-09-19] worktree commit 1f3898b：panels_a_fns.at 部署副本
    （tab_file_stem 双登记/tab_title·tab_path/ol_headings 行扫描等价推导
    ——blocks 源不可达差异登记）+ app.at 装配（doc_title 收敛 + SwitchTab
    刷新语义 + 右栏 outline/unlinked 段）+ vm-smoke read/links 臂扩展。
    **scoped 验证：vm-smoke split+merged 双模全臂 PASS**（既有 bl/ol 锚
    不变绿 = 反链/出链行为等价；内联流退役 = 形状收敛单流，登记表回填
    归 T-05）。既有观察：ext-registry-gate 死账红为主检出同款（074/077
    遗留，非本批引入）。
- **T-02** [x] [改] 装配批 B（palette/switcher + search 裁定登记）。依赖：
  T-00。→ AC-02
  - [✅ 已完成 2026-09-19] worktree commit 77982de：panels_b_fns.at（sw_
    collect/sw_filter 形状适配 ft_nodes + pal_match）+ palette 自持面板
    （ui_config/actions 单源重建清单 × 静态行绑定——DSL 无按名派发通道
    注记 + Ctrl+P 入口）+ switcher 自持面板（下沉 fn 真消费 + Ctrl+K）+
    smoke palette/switcher 两臂。**scoped 验证：双模全臂 PASS**。
    search_panel 裁定 = 内联流维持（Q-3 默认预案落地）。
- **T-03** [x] [改] 装配批 C（五件唯一路径 + flashcard 裁定登记）【rev 2
  口径：四件装配 + properties 差异登记划批次 2（Q-5 裁定 A）】。依赖：
  T-00。→ AC-02
  - [✅ 已完成 2026-09-19] worktree commit 8044dff：**四件装配 + 一件差异
    登记划出**。agenda（ag_display 副本 + 视图菜单日程入口）/recent
    （会话记账 + rf_rows 副本）/cpp（**改道裁定**：文件菜单「新建
    页面」自持入口——后端 outlinks exists 恒真实勘[linkgraph targetPage
    裸标题→is_some 恒 true] + web cpp 孤儿无消费者 077 在案，缺失分支
    双端死路）/theme（theme_accents 逐字副本 + Light/Dark/accent 面板）
    落地；**properties 划批次 2**（P-9 map 键值迭代 VM 零迭代——登记表
    预判复证；配对列表通道需 backend/编译器面，出本计划 affects）；flashcard
    = 内联流维持。执行期三坑实录（裸 var x=[] VM 静默坏列表·typed List
    纪律 / 同值 status 断言竞态·recent_count 轮询同步 / SCHEDULED 语法
    = -TODO 关键字+角括号日期·tasks-fixtures 实证）。**scoped 验证：
    双模全臂 PASS（22 检查项）**。→ **AC-02 口径勘正提请复审：11 件
    装配落地 = 10 件 + properties 差异登记划批次 2**（同 graph 族
    gated 口径）。
  - **[复审回开 2026-09-20]** 复审 F-R1：properties 子项不可达证据
    （P-9 + 无整页 frontmatter/块列表契约）核实成立，但其"11 件→10 件"
    口径变化属验收裁减，**须用户终裁后销号**（见 §9 复审记录 +
    §10 Q-5）；四件已完成装配的证据保留有效。
  - **[✅ rev 2 销号 2026-09-20]** Q-5 用户裁定 **A**：接受 10 件装配 +
    properties 划批次 2——T-03 按 rev 2 口径闭合（四件装配 + 差异登记，
    §4.4 回填已含 properties 行）。
- **T-04** [x] [改] RC-C 壳面：四件 + ribbon + graph_page 占位登记（Q-2 落地）
  + 台账注记。依赖：T-00（可与 T-01..T-03 并行）。→ AC-03
  - [✅ 已完成 2026-09-19] worktree commit 556db44：units.mjs 六状态占位
    （placeholder 形态 ≠ 缺件红——负例语义仅 editor_tab 续任；vm-probe
    ⓘ 分支 + gate 汇总单列）+ 072-inventory RC-C 六行注记。Q-2 裁定
    落地（web-only 特有面 + 模式文档 §6 证据）。**scoped 验证：gallery
    VM 臂全绿 + 六占位可见**。
- **T-05** [x] [改] L3 门固化：desktop 首批截图基线（Q-4 形态）+ 全量套件
  收口 + 消费登记表回填 + 账面（SD-01）。依赖：T-01..T-04。→ AC-04/05
  - [✅ 已完成 2026-09-19] worktree commit c4c8366：结构基线
    iced-l3-batch1-structure.txt 入库（Q-4 裁定形态）+ SD-01 §8.6 L3
    批次 1 bullet + 074-sink-mode §4.4 消费登记表回填（13 行实际形态）+
    units.spec.ts placeholder 跳过补丁（vue 臂与 vm-probe 同口径）。
    **全量门全绿**：front pnpm build + assert-api-stub-sync ok + e2e
    24 passed（web 基线零漂移·端口 13100→13210 临时改跑完还原）+
    gallery gate 双臂（20 真件零漂移 + 占位族可见）+ vm-smoke 双模
    22 检查项终验。环境注记：engine dist worktree 重建 + back
    exe 主检出拷贝 + front/gallery pnpm install。
  - **[复审回开 2026-09-20]** 复审 F-R2：SD-01 bullet 内"13 臂"为事实
    错误（实为 **15 臂**——vm-smoke.mjs 15 个 arm() 注册，9 基线 +
    新六臂），canonical 勘误待修（同错亦见 T-02/T-03/T-05 提交信息——
    history 不改，以 canonical 文件为准）；F-R1 裁定落地后随本任务
    收口。门与基线证据全部复现有效（见 §9）。
  - **[✅ rev 2 销号 2026-09-20]** F-R2/F-R3 修正随复审修正 commit 落
    worktree（ARCHITECTURE "13 臂"→"15 臂" + app.at 残留空行清理），
    快复审核证后闭合（见 §9 re-review 记录）。

## 9. 复审记录

- 2026-09-19 draft handoff：`stage: new | plan_id: PLAN-079 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权——Q-1 装配形态/Q-2 ribbon 为裁定级，
  T-00 探针证据后随流程确认） | next: review → work`。
- 2026-09-19 work 启动：`stage: work | plan_id: PLAN-079 | plan_revision: 1 |
  outcome: 进入 executing | 授权：用户明示「实施它」（auto-plan-work 直入，
  078 先例口径）；review 步用户跳过，T-00 证据后 Q-1/Q-2 裁定随本档与
  模式文档留证 | worktree: down-079/{auto-down @ plan-079-dev a86cb34,
  auto-lang 兄弟 master detached e1806671（占位——运行用主检出 debug exe
  v0.4.2-1414 ≥ 1378）} | next: T-00`。
- 2026-09-19 work 完成：`stage: work | plan_id: PLAN-079 | plan_revision: 1 |
  outcome: pass（execution_done） | code_commit: plan-079-dev
  805db28(T-00)→1f3898b(T-01)→77982de(T-02)→8044dff(T-03)→556db44(T-04)
  →c4c8366(T-05)，worktree D:/autostack/.wt/down-079/auto-down，base
  a86cb34 | task_ids: T-00..T-05 全勾（6/6） | evidence: 模式文档
  079-l3-assembly-mode.md（E-1..E-10 探针矩阵 + 裁定 + 坑清单）；全量门
  = vm-smoke 双模 22 项 13 臂 + e2e 24 passed + gallery gate 双臂 +
  build/stub-sync 绿 + 结构基线入库；执行期裁定（复审裁决点）：
  ①Q-1 = β 内联消费定形（α 双面死）②Q-2 = ribbon web-only ③Q-3 =
  search/flashcard 内联维持 ④Q-4 = snapshot 断言锚 ⑤**cpp 改道**
  （exists 恒真死路面→文件菜单自持入口）⑥**properties 划批次 2**
  （P-9 前置——AC-02 口径勘正：10 件装配 + 1 件差异登记）⑦palette
  静态行绑定（DSL 无按名派发）| blockers: 无阻断项；⑤⑥⑦与 AC-02
  口径差异请复审裁决 | next: review`。
- 2026-09-20 复审（独立重验，与执行同会话——已声明局限，全部证据从
  worktree 工件与门复跑重构）：`stage: review | plan_id: PLAN-079 |
  plan_revision: 1 | outcome: blocked | reviewed_commit: c4c8366 |
  base_commit: a86cb34 | dependency_revisions: auto-lang exe
  v0.4.2-1414（主检出 debug；auto-lang worktree e1806671 占位未动）|
  spec_inputs: 074-sink-mode §4/§4.1/§4.2/§4.3（登记表）+ 072-inventory
  + ARCHITECTURE §8.6（078 bullet 前版）| acceptance_results:
  AC-01 pass（模式文档在案 + unlinked 全链路绿——探针矩阵 E-1..E-10
  留档 + 生产 read/links 臂 ul/outline 锚）/ **AC-02 partial（10/11
  装配；3 可选件裁定 ✓；退役流行为等价 ✓——bl/ol 既有锚不变绿）**/
  AC-03 pass（六占位 + gate 单列 + 台账注记，gallery gate ⓘ 行实证）/
  AC-04 pass（全量门独立复跑全绿：vm-smoke split+merged PASS + gallery
  vue/vm ✓ + e2e 24 passed + build/stub-sync ok + web 基线零漂移 +
  结构基线文件在库 265 行）/ AC-05 pass-with-finding（F-R2 canonical
  数字错）| findings: **F-R1[P1·AC-02/T-03]** properties 装配不可达
  证据成立（P-9 map 迭代 + 无整页 frontmatter/块列表契约——api.at 仅
  get_block 按 id），但 11→10 属验收裁减须用户终裁（选项：A 接受
  10+1 划批次 2[有界修订] / B 授权扩面补齐[backend 契约，出 affects]）；
  **F-R2[P2·AC-05/T-05]** ARCHITECTURE:279 "13 臂"实为 **15 臂**
  （vm-smoke 15 个 arm() 注册：9 基线 + 新六臂）——canonical 勘误；
  F-R3[P3] app.at model 区残留空行（删 cpp_title 遗留）——顺手清理级；
  F-R4[info] ext-registry-gate 死账红主检出同款（074/077 遗留，非本批
  引入，079 门不含）| evidence: 门复跑收据（本轮）：vm-smoke 双模 PASS
  ×2/gallery 双臂 ✓/e2e 24/build ✓/stub-sync ok（worktree
  D:/autostack/.wt/down-079/auto-down @ c4c8366，基线复现零漂移）；
  web 侧零改动经 git diff --name-only 核对（front/src、front/auto、
  back 三域空）| blockers: F-R1 用户终裁（Q-5）——AskUserQuestion 无人
  应答，按 078 先例停 checkpoint | next: 用户裁 F-R1 → A 路径 = 有界
  修订（AC-02 勘正 + F-R2/R3 修 + 快复审）→ pass → merge；B 路径 =
  扩面授权 → work 补齐 properties`。
- 2026-09-20 复审 pass（re-review on rev 2）：`stage: review | plan_id:
  PLAN-079 | plan_revision: 2 | outcome: pass | reviewed_commit: 5fe7f6d
  （= c4c8366 + 复审修正——F-R2 ARCHITECTURE 臂数 13→15 + F-R3 app.at
  空行；split 全臂复跑 PASS 背书零语义变更）| 裁定输入: Q-5 用户裁定 A
  （2026-09-20）——AC-02 rev 2 = 10 件装配 + properties 差异登记划批次 2
  + 3 可选件裁定 + 退役流行为等价（全部核证：§4.4 回填/vm-smoke 双模
  绿/逐件记录）| acceptance_results: AC-01 pass / AC-02 pass@rev2 /
  AC-03 pass / AC-04 pass / AC-05 pass（F-R2 已修·F-R3 已修）|
  findings: F-R1 销号（裁定 A）；F-R2/R3 已修核证；F-R4 仍为 info 债
  观察（074/077 遗留，随批次 2 或独立尾事）| evidence: 5fe7f6d diff
  核验（2 文件 +1/-2）+ vm-smoke split PASS 复跑 + 前轮全量门复现收据
  （同 worktree，依赖与测试配置未变——复用有据）| next: merge`。
- 2026-09-20 merge 收据 `PLAN-079:r2`（五 checkpoint）：
  - **prepared** ✓：reviewed 基线 5fe7f6d + 账本投影落 worktree
    （.autoos/specs.json：P072-1 原地更新——title/related/content L3 批次 1
    段；P079-1 reviews 收据新增；248→249 条 JSON round-trip 校验 indent=1
    最小 diff）= delivery commit **5bc4cc9**（projection-only 后裔，实现/
    依赖零变更，复核差异有据）。
  - **landed** ✓：master 未漂移（merge-base = master tip a86cb34，零
    rebase）→ `git merge --ff-only plan-079-dev` → master tip = 5bc4cc9 =
    dev tip（单哈希核验，无 merge commit）。
  - **ledger_refreshed** ✓：主检出 .autoos/specs.json 回读 249 条，
    P079-1 在库（sections.reviews[-1]）；canonical（ARCHITECTURE §8.6
    bullet + 079-l3-assembly-mode.md + 074-sink-mode §4.4 +
    072-inventory 注记）随 delivery 落 master。
  - **archived** ✓：本档平移 docs/plans/archived/079-l3-assembly-batch1.md
    （untracked 计划文件移动入册），status: archived + completion_kind:
    delivered。
  - **cleaned**：见归档后补记（worktree 摘链[engine pnpm install reparse
    point 残留——078 同款类，MSYS_NO_PATHCONV=1 cmd /c rmdir 只删链接
    本身] → wt-guard 双净 → 双 worktree 移除 + plan-079-dev 分支删除 +
    组目录 down-079 移除 + 双仓 prune）。

## 10. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | **装配形态**（组件挂载 α / 内联消费 β / 按件混合）——登记表裁定"组件挂载"以 `use` 通道为预设，但 gallery 实测 junction 物化违例 + facade stub 缺口是 α 的两道实证障碍；β 有 ft_rows 先例但非"组件"语义 | T-00 定形 + 全部装配任务的形态 | **✅ 复审确认（2026-09-20）**：T-00 探针矩阵（E-1..E-10）证据充分——α 数据面（facade stub）/断言面（F-1 黑盒）双死；β 全链绿；新坑 P-15（跨项目 fn 导入静默死面）隔离定谳。β 内联消费定形，模式文档 §2 在案 |
| Q-2 | **ribbon parity 单元定义**（desktop 无对应面，同名不同物在案） | T-04 | **✅ 复审确认（2026-09-20）**：web-only 特有面（默认预案）落地——三 facade 驱动 + 今日笔记/图谱入口均 web 特有流（模式文档 §6）；gallery 占位 + 台账注记在库。若用户日后裁 VM 侧补对应面 → 回 new |
| Q-3 | search_panel/flashcard_modal 两可选件处置（内联流已覆盖两面对应功能） | T-02/T-03 | **✅ 复审确认（2026-09-20）**：内联流维持 + 装配延后批次 2（默认预案），§4.4 回填在案 |
| Q-4 | app 级双端截图基线的 VM 侧形态（MCP autoui_snapshot 断言锚 vs VM 截图基建） | T-05 门形态 | **✅ 复审确认（2026-09-20）**：snapshot 断言锚 + 结构基线文件起步（iced-l3-batch1-structure.txt 入库 265 行）；像素基建不建（slice 5 工具链债在案） |
| Q-5 | **【复审新增·已裁定】properties 装配处置（F-R1）**：P-9 map 迭代 + 无整页 frontmatter/块列表契约 → 批次 1 内不可达（两条补路都出 affects）；AC-02 承诺 11 件实落 10 件 | AC-02 口径 + T-03/T-05 销号 + merge 前置 | **✅ 裁定 A（用户 2026-09-20）**：接受 10 件装配 + properties 划批次 2——rev 2 勘正 AC-02（批次 2 前置 = 配对列表通道，与 graph 族同批）；F-R2/F-R3 修 → 快复审 → merge |
