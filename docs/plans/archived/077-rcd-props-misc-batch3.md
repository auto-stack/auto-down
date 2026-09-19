---
plan_id: PLAN-077
status: archived
completion_kind: delivered
feature_name: rcd-props-misc-batch3（L1 滚动批次 3：属性/文件/主题/闪卡/日程 7 件）
author: [zhaopuming]
created_at: 2026-09-19
updated_at: 2026-09-19
plan_revision: 1
current_step: 3
total_steps: 7

supersedes_spec_components: []
new_spec_components: []        # 见 §5：SD-01（jade ARCHITECTURE §8.6 批次 3 bullet）；分类表落 074-sink-mode.md §6 扩节（作业标准续册）
touched_goals: []

affects: [jade-garden/front]
---

# [PLAN-077] rcd-props-misc-batch3——批次 3 七件（纯逻辑下沉 .at + VM 渲染臂）

> 机制依据：072-inventory §3 RC-D + **074-sink-mode.md（作业标准，含 076 扩节
> §5：P-7 filter 链 CJK 双轨一致 / P-8 模块 fn 自递归 / G-1 参数域增证）**。
> 本批次七件 = RC-D 剩余件减图谱族两件（graph_sidebar/graph_controls 归批次
> 4 独立立项——RC-F 边界设计裁定先行），合计 **1078L**：
>
> | 件 | .at | ext | 形状 |
> | --- | --- | --- | --- |
> | properties_panel | 267 | 192（12 实义 fn，**最大件压轴**） | frontmatter 条目编辑（类型分派/双向写回/debounce 保存） |
> | recent_files_panel | 113 | 37 | 行列表 + 时间戳显示 + store 增删 |
> | create_page_prompt | 92 | 18 | 极薄确认弹窗（props/emits，孤儿组件） |
> | workspace_opener | 133 | 93 | 工作区打开表单（**Q-1 目录选择器 VM 通道裁定点**） |
> | theme_popover | 120 | 51 | 主题弹层（teleport + 静态 accent 列表） |
> | flashcard_modal | 222 | 71 | 闪卡复述（编排 + null 守卫族，desktop 闪卡流等价物） |
> | agenda_panel | 131 | 104 | 日程分组行列表（desktop 无对应流） |
>
> 批次定位（合并口径，2026-09-19 用户裁定）：七件一计划，**小件先行、
> properties 压轴**——批次 1/2 模式已两轮验证（exe v0.4.2-1298 折回版含全部
> 编译器补丁），本批无新增编译器预期。

## 0. 变更摘要

预分类（起草期精读七件 .at+ext 的基型，T-00 定稿入分类表 §6）：

| 件 | sink 面（预判） | 必留 ext（预判） |
| --- | --- | --- |
| properties_panel | normalize/syncEntries（for-in 形态）/setEntryType（split 链 P-7 域）/tryAddProperty（alert 桥）/withPropDisplay（行构造）/tabsActiveTab/eventValue（可消——.at 直写 `e.target.value`，search_panel .QueryInput 先例） | re-exports/useDebounceFn/lucide；**JSON 域桥**（fmJson/propsDirty 的 JSON.stringify——Q-2）；**facade 写桥**（tab.frontmatter/tab.dirty lvalue——Q-2）；inferType 的 regex 日期检查（改 ASCII 形态算术可沉，T-00 定） |
| recent_files_panel | 行构造 map（time 字段经 ext 桥——Q-3 同款） | formatTime（Date/toLocaleTimeString）；removeRecent 一行桥（`.remove(...)` 触发 transpiler remove→splice 误射在案） |
| create_page_prompt | （无实质 sink 面——极薄件，批次价值=VM 渲染臂 + props/emits 契约） | wikiTitleToPath（regex 桥，wikiLink.ts 单源）/CodeTag（code 标签 h 组件） |
| workspace_opener | openWorkspaceFlow 编排沉 handler（双 store await + .finally busy 复位——074 finally 同款）/workspaceErrorText（?? "" 访问器） | WorkspaceLogo（SVG）；chooseWorkspaceDir（showDirectoryPicker+focus/select——**Q-1**）；clearWorkspaceError（facade 写） |
| theme_popover | themeAccents（静态五 accent 列表——Obj 字面量下沉 Q-4 探针）；.Close guard 恒真化登记（emit 直发，guard 保真留档） | useThemeStore/Sun/Moon；isOutsideThemePopover（DOM closest，保真留 ext） |
| flashcard_modal | getDueCardsSafe/reviewCardSafe 编排沉（**契约名直用**：`use back.api: get_due_cards, review_card` 双端在案，无需别名）/cardAt/cardQuestion/cardAnswer（?? null 守卫改显式 if——P618 两步赋值先例）/counterText（f-string 数学内插 P-3 域） | Brain |
| agenda_panel | tabPath（?? "" 访问器）/fetchAgendaSafe 编排沉（catch 返 null 保形——fetchBacklinksSafe 先例）/markerClass（switch 改互斥布尔 if 链，marker ASCII 域）/agendaDisplay 行构造（`title \|\| page_path` 改显式 if——076 布尔域先例） | CalendarClock/formatDate（Date/toLocaleDateString——formatted_date 逐组经 ext 桥，Q-3） |

共性：五件为"拉取/派生 → 行列表/表单"标准形状（074/076 已两轮验证）；两个
新域需 T-00 定价——**JSON.* 域**（properties 深比较/序列化）与**时间格式化
域**（recent/agenda 的 Date/toLocale*）。

## 1. 目标

1. 七件纯逻辑下沉 `.at`（六步流水）；ext 薄化至真宿主面（逐 fn 分类表
   在案，模式文档 §6 扩节）。
2. 七单元 gallery 双端 gate 绿（vue 真件页 + VM twin + 基线 7 张新增/旧
   11 张零漂移）——gallery 真**18** 单元口径。
3. **workspace_opener VM 通道裁定落地**（Q-1：twin 断言域 + 目录选择器处
   置，inventory §3 登记待办销号）。
4. 两个新域裁定记录：JSON 域（Q-2）与时间格式化域（Q-3）——模式文档坑
   清单/债表续册。
5. desktop 消费结论登记（模式文档 §4.2 扩表：七件挂载裁定）。
6. 账面：SD-01 + 072-inventory 七行勾记 + merge 账本 P077-x。

**非目标**：desktop app.at 挂载组件（装配归 L3/后续）；图谱族两件
（graph_sidebar/graph_controls——批次 4 独立立项，RC-F/graph_view 设计裁定
先行）；RC-C 组装级六件与 L3 收口；热键/picker/焦点/window 事件面的 VM 等
价物（window 级 DOM——F-1 口径，VM twin 不镜像）；075 L2 面回写（jade
存量迁 bp 消费维持按需）。

## 2. 架构方案

074-sink-mode §3 六步流水逐件执行（逐 fn 分类 → 沉 .at → 契约接线 → 再生成
部署 → gallery 双臂 gate → 回归收口），本批次四点专门化：

- **契约通道**：flashcard/agenda 契约名双端直用（`get_due_cards`/
  `review_card`/`get_agenda`，back/api.at:366/382/328 与 desktop 副本
  :370/386/332 实勘）——无 snake 别名需求；workspace 走 store
  facade（workspace.open → open_workspace 契约，desktop OpenWs 流 app.at:128
  同通道）。gen stub 仅在 ext 导入面变化时同步（assert-api-stub-sync 门）。
- **编排沉 .at 的批次先例复用**：flashcard/agenda/workspace 的 try/catch
  编排沉 watch/handler `.then` 单回调（076 searchSafe 同款闭包体形态）；
  `.finally` busy 复位（workspace）与 finally=loading 复位（074）同款。
- **两个新域的处理形态**（T-00 定案）：
  - JSON 域（properties）：fmJson/propsDirty 的 `JSON.stringify` 无 DSL
    词位——默认**留 ext 桥**（两 fn），`.at` 侧 watch/computed 经 `use fn`
    通道调用；facade 写（tab.frontmatter/tab.dirty）默认**ext 薄桥**
    （commitFacadeWrite 形态）。备选：store .at 侧加 fn（深沉单源）——
    T-00 按发射成本裁定。
  - 时间格式化域（recent/agenda）：行构造沉 .at，time/formatted_date 字段
    经 ext 桥逐行预计算（076 snippet_html 先例）或 VM twin 直显 raw 值
    （不镜像格式化）——T-00 裁定。
- **workspace_opener VM 臂（Q-1 默认预案）**：twin 覆盖 path 输入 + Open
  流（open_workspace 契约 + busy 复位 + error 文案投影）；目录选择器按钮
  （showDirectoryPicker = window 级 DOM）不进 VM 断言——F-1 口径同款；
  desktop 装配走自家 menubar action（app.at:103 `ws.open`），不消费该按钮
  通道。裁定落判定/登记档，inventory §3 待办销号。

```
ext TS（JSON 域/时间格式化/DOM/闭包流，TS 不入 VM）
   ↓ 下沉（六步流水；新域两桥按 T-00 裁定形态）
.at 模块 fn + watch/handler 编排（单源双轨）
   ↓
gallery 双臂 ×7（vue 真件 + VM twin）→ 回归收口（gallery 18 单元口径）
```

## 3. 技术栈

- **jade-garden/front**：`auto/src/front/{properties_panel,recent_files_panel,
  create_page_prompt,workspace_opener,theme_popover,flashcard_modal,
  agenda_panel}.at` + `auto/src/front/utils/*_ext.ts`（源）→ `src/components/`
  部署 SFC（再生成 + sed 双表达式，G-8）；component-gallery（units.mjs/
  单元页/twin/基线，现 11 真件 + editor_tab 占位）。
- **auto-lang 编译器**：master ≥ **v0.4.2-1298**（076 折回版：P-7/P-8/
  Closure-Lambda walker 臂全在）——**无新增编译器预期**；若 T-00 探针出新
  缺口（Obj 字面量列表发射/for-in map 迭代等），按 074/076 惯例 auto-lang
  兄弟分支补丁 + merge 折回（执行注记登记，不阻断主线）。
- **门**：gallery `node scripts/gate.mjs`（双臂）；front `pnpm build` +
  `pnpm test:e2e`（**11-properties/12-flashcards 直接相关** + 05-panels/
  01-workspace/08-screenshots）；desktop vm-smoke 双模。

## 4. 需求分析与背景调查

**授权记录**：2026-09-19 用户批准（合并口径裁定：七件一计划，小件先行
properties 压轴）；**执行已授权**（2026-09-19 用户指令"实施它！"——
auto-plan-work 进入 executing）。

**既有依据（2026-09-19 主检出实勘）**：

| 依据 | 实勘落点 |
| --- | --- |
| 072-inventory §3 | 七件行数/ext 数在案；agenda/flashcard 流粒度等价物注记（desktop 闪卡流内联 LoadCards/Grade）；workspace_opener 的 showDirectoryPicker VM 通道裁定待办注记 |
| 074-sink-mode.md 全册 + §5 扩节 | 判定口径/六步/G-1..G-8/§4.1 desktop 登记；076 新增：P-7（trim/to_lower/contains 链 CJK 双轨一致）、P-8（模块 fn 自递归双轨通）、G-1 参数域增证（局部/参数名避 model 字段——qstr 改名实证）、§5.4 计数勘正口径 |
| 七件 .at+ext 精读 | properties 最重（12 实义 fn：JSON 域 ×2 + facade 写 ×2 + 类型分派/行构造/守卫族）；flashcard/agenda 编排+守卫为标准形状；create_page_prompt 极薄（孤儿组件，头注在案）；theme teleport 已原生（f8acfb43） |
| api 契约 | get_agenda:328 / get_due_cards:366 / review_card:382 / open_workspace:94（web）+ desktop 副本 :332/:370/:386/:98——四通道双端齐 |
| desktop 流 | 闪卡流内联（app.at:261 LoadCards/:267 Grade，`use back.api` 同通道）；OpenWs（app.at:128，menubar action `ws.open` Ctrl+O） |
| gallery 现状 | units.mjs：11 真件单元 + editor_tab RC-E 占位（076 转正后负例唯一续任） |
| e2e 面 | 11-properties.spec.ts / 12-flashcards.spec.ts（直接相关）+ 05-panels / 01-workspace / 08-screenshots |
| 075/076 收尾态 | exe v0.4.2-1298 折回实证；§8.6 双 bullet 序接先例（077 增批次 3 bullet，merge 期顺接） |

## 5. 详细设计

### 规范增量

| delta_id | add/modify/retire | 目标文档 | before/after | rationale | acceptance |
| --- | --- | --- | --- | --- | --- |
| SD-01 | modify | jade-garden/ARCHITECTURE.md §8.6 | 批次 2 bullet 后 → 增批次 3 bullet（七件下沉 + gallery 18 单元口径 + workspace_opener VM 通道裁定销号 + 新域两桥结论指针） | RC-D 滚动台账 | AC-05 |

（七件分类表落 `074-sink-mode.md` §6 扩节（作业标准续册）；Q-1..Q-4 裁定
结论与债表 D 系列续册。均非 canonical spec。）

**逐 fn 预分类表**（约 40 fn 基型——T-00 定稿校正后入模式文档 §6）：

- **properties_panel**（192L ext，14 导出）：normalize **sink**（undefined/
  null 守卫）；syncEntries **sink**（frontmatter map for-in 迭代 + 行构造
  ——P-3 for-in 参数列表先例，T-00 验 map 键迭代发射）；inferType **拆沉**
  （typeof/is_array 分派沉；regex 日期检查改 ASCII 形态算术——长度+连字符
  位检查，G-2 域外，T-00 定）；fmJson/propsDirty **必留（JSON 桥，Q-2）**；
  commitFrontmatter **部分沉**（fm 重建循环+split 链沉；facade 写
  tab.frontmatter/tab.dirty 经 ext 薄桥或 store fn——Q-2）；setEntryType
  **sink**（Boolean() 改 `== "true"`；split(',').map.trim.filter 链 P-7
  域）；tryAddProperty **sink**（dup 分支返 bool；alert 桥留 ext 或裁定
  VM 不弹——T-00）；withPropDisplay **sink**（行构造，076 filterPalette
  同款）；eventValue **消解**（handler 直写 `evt.target.value`——
  search_panel .QueryInput 先例）；tabsActiveTab **sink**（?? null 访问器）。
- **recent_files_panel**（37L ext，5 导出）：recentFilesWithTime **sink（行
  构造）**——time 字段经 ext formatTime 桥逐行预计算（Q-3）；formatTime
  **必留**（Date/toLocaleTimeString）；removeRecent **必留一行桥**（DSL
  `.remove(...)` → `.splice` 误射在案，ext 头注）；store/icon re-exports
  必留。
- **create_page_prompt**（18L ext，2 导出）：无 sink 面；wikiTitleToPath/
  CodeTag 必留（regex 桥 / code 标签 h 组件）。VM twin = props 播种 +
  page_path 投影 + 双按钮（Create/Cancel emit 断言）。
- **workspace_opener**（93L ext，7 导出）：openWorkspaceFlow **sink（编排）**
  ——双 store await + rejection 传播 + .finally busy 复位沉 handler；
  workspaceErrorText **sink**（?? ""）；clearWorkspaceError **必留（facade
  写）**——或 store fn 通道（T-00）；WorkspaceLogo/chooseWorkspaceDir 必留
  （SVG / showDirectoryPicker+focus/select——Q-1 VM 臂不覆盖）。
- **theme_popover**（51L ext，4 导出）：themeAccents **sink**（静态五
  accent Obj 字面量列表——VM Obj 字面量全键形状锁定 gotchas#3 域，Q-4
  探针）；isOutsideThemePopover 必留（DOM closest；.Close 恒真化注记）；
  re-exports 必留。
- **flashcard_modal**（71L ext，7 导出）：getDueCardsSafe/reviewCardSafe
  **sink（编排）**——watch/.Init/.Rate 的 `.then` 单回调闭包体沉（076
  searchSafe 同款），契约名直用 `use back.api: get_due_cards, review_card`；
  cardAt/cardQuestion/cardAnswer **sink**（`?? null`/`|| raw` 改显式 if
  两步赋值——P618 先例）；counterText **sink**（f-string `${index + 1} /
  ${count}`——P-3 数学内插域）；Brain 必留。
- **agenda_panel**（104L ext，5 导出）：tabPath **sink**（?? "" 访问器，
  074 tabTitle/tabPath 先例）；fetchAgendaSafe **sink（编排）**——catch 返
  null 保形（"keep previous groups"语义）+ get_agenda 契约；formatDate
  **必留**（Date/toLocaleDateString——formatted_date 逐组经 ext 桥，Q-3）；
  markerClass **sink**（switch 改互斥布尔 if 链，marker ASCII 域
  TODO/DOING/DONE/NOW/LATER——to_upper 对称词位 T-00 验）；agendaDisplay
  **sink（行构造）**——`title || page_path` 改显式 if（076 join→双布尔
  同款）；CalendarClock 必留。

**VM twin 断言设计**（七单元，072 Q-3 口径）：

| 单元 | 投影/断言面 |
| --- | --- |
| properties | Init 播种 frontmatter fixture → entries 行数/类型分派投影（pp_count/pp_bool）；ToggleBool/AddProperty 可驱动（按钮序列） |
| recent_files | store 播种 → rf_count + 行 needle；Remove/ClearAll 按钮驱动计数变化 |
| create_page_prompt | open=true 播种 → cpp_path 投影（wikiTitleToPath 经 shim）；双按钮在位 |
| workspace_opener | path 播种 + Open 流（契约 shim 应答 busy→false）→ wo_busy/wo_error 投影；picker 按钮不在断言域（Q-1） |
| theme_popover | open 播种 → accents 数（5）+ mode 切换投影（SetLight/SetDark 按钮驱动 theme store） |
| flashcard_modal | Init 播种 due cards（契约 shim）→ fm_counter/fm_question 投影；Reveal/Rate(grade) 按钮驱动 index 前移 |
| agenda | current_path watch 触发 → ag_groups/ag_rows 投影 + 行 needle（marker/日期 raw） |

## 6. 测试设计

- **gallery gate**：七单元双臂绿 + 基线 7 张新增（--update-snapshots 建）/
  旧 11 张零漂移；gate 汇总 18 真件单元 + editor_tab 占位负例。
- **下沉行为锚**：编排/守卫/行构造以 gallery 断言覆盖 + vue 轨对拍（074
  口径）；properties 的 facade 写回（frontmatter 持久化）以 11-properties
  e2e 端到端覆盖（既有 spec——行为面零变化即证）。
- **T-00 探针**（tmp 一次性工件，build 双轨绿后弃——074 探针惯例）：
  ①JSON 域/facade 写通道形态定价；②时间格式化桥 vs raw 直显；③theme
  accents Obj 字面量列表发射；④syncEntries 的 map for-in 迭代 + inferType
  ASCII 形态算术；⑤marker to_upper 词位。探针结论入 §6.0。
- **回归**：front `pnpm build` + `pnpm test:e2e` 全量（11-properties/
  12-flashcards 重点面）+ desktop vm-smoke 双模；gen stub 门
  （assert-api-stub-sync，仅 ext 导入面变化时）。
- **编译器**：无新增预期；探针出缺口 → auto-lang 兄弟补丁 + 折回（076
  惯例：58f2af2 → ea3268d1e 先例）。

## 7. 验收标准

| ID | 可观察行为 | 验证方法 |
| --- | --- | --- |
| AC-01 | 七件逐 fn 分类表在案 + T-00 探针结论（JSON 域/时间域/字面量/for-in/to_upper 五点）落档 | 074-sink-mode.md §6 扩节；ext 导出面 grep=分类表对应（零 sink 残留） |
| AC-02 | 七件纯逻辑下沉：ext 薄化至真宿主面 + 七单元双端 gate 绿 | 部署 SFC 内联发射实证；gate 双臂绿 + 基线 7 张在库/旧 11 张零漂移 |
| AC-03 | workspace_opener VM 通道裁定落地（Q-1 销号） | 裁定记录在档（twin 断言域 + picker 不覆盖口径）+ inventory §3 待办注记勾销 |
| AC-04 | 回归零变化 | pnpm build 绿 + front e2e 全量 passed（11-properties/12-flashcards 在内）+ vm-smoke 双模 PASS |
| AC-05 | 账面 | SD-01 §8.6 批次 3 bullet + 072-inventory 七行勾记 + merge 账本 P077-x |

## 8. 执行步骤

> worktree：`down-077/{auto-down, auto-lang}`（074/076 配对惯例；auto-lang
> 兄弟 master detached @ exe v0.4.2-1298 同源）。

- **T-00** [x] [调查] 七件逐 fn 分类表定稿（~40 fn 基型校正）+ 探针五点
  （JSON 域/facade 写/时间桥/字面量/for-in+to_upper）。产物：模式文档 §6
  扩节。依赖：无。→ AC-01
  [✅ 已完成] [✅] 探针 p077-probe 双轨绿（vue=auto build 内 vue-tsc+vite；
  vm=MCP state/snapshot 断言）——五点裁定+P-9（map 键值迭代 VM 零迭代，
  P614 同族纪律不补编译器）+P-10（try/finally 无 catch 解析红→空 catch
  形态）落 074-sink-mode.md §6.0；逐 fn 分类表 §6.1-6.7（34 实义 fn：
  sink 17+消解 2+拆沉 1+必留 13+增设 1+契约别名 3；typeof 无词位校正
  properties 预分类 sink 6→4）；Q-2/Q-3 默认成立、Q-4 关闭（字面量双轨绿）。
  证据：worktree down-077/auto-down @ plan-077-dev（base 7c0b774）+
  auto-lang 兄弟 detached a38461ba3（exe v0.4.2-1305 ≥ 1298 同源）
- **T-01** [x] [改] create_page_prompt + theme_popover（最薄两件首验：92+120；
  theme 含 Q-4 字面量探针落地）。gallery 两单元。依赖：T-00。→ AC-02
  [✅ 已完成] [✅] theme_accents 静态字面量列表沉 .at（Q-4 同形落地，ext 薄化
  AccentSwatch 删）；gallery 双单元双臂绿（基线 2 新增/旧 11 零漂移——
  git status 仅 2 untracked 实证）；front pnpm build 绿 + gen-support 门绿。
  证据：b58e14c（plan-077-dev）
- **T-02** [x] [改] recent_files_panel + agenda_panel（行构造+编排标准件：
  113+131；Q-3 时间桥落地）。gallery 两单元。依赖：T-00。→ AC-02
  [✅ 已完成] [✅] recent_files_with_time 行构造+agenda tab_path/
  agenda_display/watch 编排（get_agenda 契约直用）沉 .at；ext get_agenda
  别名+gen stub 门绿；gallery 双单元双臂绿（基线 2 新增/旧 13 零漂移）；
  front pnpm build 绿。增证：use 块纪律——模块 fn 裸名解析不入 use 块
  （首编误列 TS2305 纠正，G-1/G-5 同族注记）。证据：1f2681e
- **T-03** [改] flashcard_modal（编排+守卫族：222；契约名直用通道）。
  gallery 单元。依赖：T-00。→ AC-02
- **T-04** [x] [改] workspace_opener（133；**Q-1 裁定落地**：编排沉 + twin
  断言域 + picker 口径 + inventory 注记销号）。gallery 单元。依赖：T-00。
  → AC-02/03
  [✅ 已完成] [✅] openWorkspaceFlow 消解（.Open 显式 promise 链——P-10 空
  catch 吞 rejection 故取链式保真）+ workspace_error_text 沉 + 无契约导入
  （store facade 通道）；gallery 双臂绿（vue 编排链端到端 root 投影实证；
  基线 1 新增/旧 16 零漂移）；inventory §3 Q-1 销号注记；front build 绿。
  证据：714a2e7
- **T-05** [x] [改] properties_panel（267 压轴：JSON 桥 + facade 写通道 +
  类型分派/行构造/守卫族下沉；Q-2 落地）。gallery 单元。依赖：T-00（建议
  T-01..T-04 后执行——模式全热）。→ AC-02
  [✅ 已完成] [✅] sync_entries/try_add_property/with_prop_display/
  tabs_active_tab 沉 + eventValue 消解；ext 薄化（inferType 改导出桥
  param 放宽 any——TS5 unknown 推断增证）；gallery 双臂绿（五型
  frontmatter fixture；基线 1 新增/旧 17 零漂移）；front build 绿。
  证据：09290cc
- **T-06** [x] [改] desktop 消费登记（§4.2 扩表：七件裁定）+ 回归收口
  （pnpm build / e2e 全量 / vm-smoke 双模 / gallery gate 18 单元全绿）+
  账面（SD-01 + inventory 七行勾记）。依赖：T-01..T-05。→ AC-04/05
  [✅ 已完成] [✅] SD-01 §8.6 批次 3 bullet + 074-sink-mode §4.2 七件挂载
  裁定扩表 + inventory 七行全勾；回归全绿：front build / e2e 全量 24
  passed（11-properties/12-flashcards 在内；e2e 端口 13100 本 boot 落
  WinNAT 保留段——runtime.ts 临时 13210 跑完已还原 tracked 零漂移）/
  vm-smoke 双模 PASS（exe v0.4.2-1378-dirty 同源 ≥1298——主检出期间被他
  session 推进注记）/ gallery gate 双臂 18 真件单元全绿；探针工件弃置。
  证据：c7cb25d

## 9. 复审记录

- 2026-09-19 draft handoff：`stage: new | plan_id: PLAN-077 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权） | next: review → work`。
- 2026-09-19 work entry：`stage: work | plan_id: PLAN-077 | plan_revision: 1 |
  outcome: executing | code_commit: plan-077-dev@7c0b774(base) |
  task_ids: T-00(done),T-01..T-06(pending) | evidence: 探针双轨绿+§6 扩节在档 |
  blockers: 无 | next: T-01`（用户"实施它！"授权进入；worktree
  down-077/{auto-down plan-077-dev, auto-lang detached a38461ba3}）。
- 2026-09-19 work handoff：`stage: work | plan_id: PLAN-077 |
  plan_revision: 1 | outcome: pass | code_commit: c7cb25d（plan-077-dev，
  base 7c0b774，T-01..T-06 六提交 b58e14c/1f2681e/80f68c6/714a2e7/09290cc/
  c7cb25d）| task_ids: T-00..T-06 全 done（7/7）| evidence: AC-01 §6 扩节+
  探针五点双轨实证；AC-02 七件下沉+gallery 双臂 18 单元+基线 18 张（旧 11
  零漂移）；AC-03 Q-1 销号在档；AC-04 build/e2e 24/vm-smoke 双模全绿；
  AC-05 SD-01+inventory 勾记（账本 P077-x 归 merge）| blockers: 无 |
  next: review`。工作树留评审/合并；编译器 1378-dirty 同源注记在案。

## 10. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | workspace_opener 目录选择器 VM 通道（showDirectoryPicker = window 级 API，VM 轨无对应物）——inventory §3 登记在案裁定待办 | T-04 twin 断言域；desktop 装配口径 | **默认预案（本计划采纳，T-04 落地即销号）**：VM 臂覆盖 path 输入+Open 流（open_workspace 契约），picker 按钮不进 VM 断言（F-1 口径同款）；desktop 装配走自家 menubar action（app.at:103）不消费 picker 通道。若用户另裁（如 VM 侧原生目录对话框单列待办），T-04 前提出 |
| Q-2 | properties 的 JSON 域（fmJson/propsDirty 深比较代理）与 facade 写（tab.frontmatter/tab.dirty lvalue）通道形态 | T-05 | T-00 定（默认：JSON 桥留 ext 两 fn + facade 写 ext 薄桥；备选 store .at 加 fn 深沉单源） |
| Q-3 | 时间格式化域（recent formatTime/agenda formatDate——Date/toLocale* 无 DSL 词位） | T-02 | T-00 定（默认：行构造沉 + 格式化字段经 ext 桥逐行预计算——snippet_html 先例；备选 VM twin 直显 raw） |
| Q-4 | theme accents 静态 Obj 字面量列表的 .at 下沉发射（VM Obj 字面量全键形状锁定——bp gotchas#3 域） | T-01 | T-00 探针定（若发射缺口→留 ext + 注记，或字面改构造 fn 形态） |

## 11. merge 收据（PLAN-077:r1）

- **prepared ✅**：reviewed 基线 c7cb25dd（review pass r1——实现会话内按工件
  复跑四门重建证据，独立性受限声明在案）；账本投影落 worktree 交付提交
  33e1c8a（P072-1 原地更新：title 批次 1/2/3 下沉 074/076/077、related
  +PLAN-077、content 增批次 3 段；P077-1 新增 reviews 收据；246→247 条，
  JSON round-trip 校验，原格式 indent=1 最小 diff +16/-3——076 全文件重排
  教训规避）。master 无漂移（=base 7c0b774）无需 reconcile。
- **landed ✅**：master merge commit `a778c27`（--no-ff）；ancestry 断言
  33e1c8a ∈ master；主检出 untracked 计划簿记不受 merge 影响（076 stash
  保全步骤本次无需——工作树仅 untracked 计划+tmp scratch）。落地态集成
  验证：主检出 gallery gate 双臂绿（missing 仅 editor_tab）。
- **ledger_refreshed ✅**：主检出 `.autoos/specs.json` 回读——total 247、
  P077-1 单条在 reviews（file=archived 路径、related=[PLAN-077]）、
  P072-1 related=[072,073,074,076,077] 且批次 3 内容在案、id 无重复
  （247==247 set）。
- **fold-back ✅（auto-lang，零变更）**：本计划编译器零新增补丁（P-9 缺口
  按 P614 惯例走纪律登记）；auto-lang 兄弟 worktree（detached a38461ba3）
  全程未动，直接随清理移除。
- **archived ✅**：本文件移入
  `docs/plans/archived/077-rcd-props-misc-batch3.md`
  + status: archived + completion_kind: delivered。
- **cleaned ✅**：摘链 auto-down worktree **2137** junction（pnpm
  node_modules 类——python os.lstat reparse point 自枚举 os.rmdir 逐链
  拆除 0 败）→ auto-lang 兄弟 pass 1 即净（guard 双净实证）→ worktree
  双移除 → 分支 plan-077-dev 删除（auto-down was 33e1c8a/master a778c27
  含其祖先；auto-lang 兄弟 detached 无分支）→ 组目录 down-077/ 移除。
  **补记（清理后实证）**：落地上先摘链后 merge（wt-guard 双净 @ merge 前
  复跑 clean——guard 纪律在落地检查点即满足）；`git worktree remove
  --force` 双侧（残留仅 tmp scratch 补丁脚本，证据已录本档与归档件）；
  auto-lang 目录盘上残留（git 注销先于盘删）经内容核查（8974 文件纯
  checkout 无 reparse point）后 rm -rf；双侧 `worktree prune` 后注册零
  残留（auto-down list grep down-077=0、auto-lang 侧=0）；plan-077-dev
  分支双侧零残（auto-lang 无此分支）；组目录 down-077/ 移除后 .wt 下
  grep 零命中。PLAN-077:r1 五 checkpoint 全闭环。
