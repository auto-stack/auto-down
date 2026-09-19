---
plan_id: PLAN-078
status: archived
feature_name: rcf-graph-family-batch4（批次 4：图谱族三件 + RC-F 宿主面首单元）
author: [zhaopuming]
created_at: 2026-09-19
updated_at: 2026-09-19（archived delivered；r2）
plan_revision: 2
current_step: 4
total_steps: 5

supersedes_spec_components: []
new_spec_components: []        # 见 §5：SD-01（jade ARCHITECTURE §8.6 批次 4 bullet）；分类表落 074-sink-mode.md §7 扩节；Q-1/Q-2 设计裁定记录落判定档
touched_goals: []

affects: [jade-garden/front]
---

# [PLAN-078] rcf-graph-family-batch4——图谱族三件（两件 RC-D 下沉 + graph_view RC-F 宿主面首单元）

> 机制依据：072-inventory §3（graph_sidebar/graph_controls = RC-D 最后两件；
> graph_view = RC-F 第三方边界：cytoscape 内核不比，宿主面入 L1，**VM 侧
> 实现形态 native/canvas 单列待办**）+ design 30 §4（第三方边界规则）+
> 074-sink-mode（作业标准，含 077 扩节 §6：P-9 map 键值迭代 VM 零迭代 /
> P-10 try/finally 无 catch 解析红 / typeof 无词位）。
>
> 本批次 = RC-D **清零批**（16 件全闭合：4+3+7+2）+ RC-F **首单元**。两件
> RC-D 为标准下沉形状；graph_view 携**两个登记在案的设计裁定**（用户
> 2026-09-19 路线确认前置）：①VM 实现形态（native/canvas）；②宿主面单元
> 定义。起草期实勘已把裁定事实基础定死（§4），Q-1/Q-2 给默认预案，
> **T-00 产出裁定证据后用户终裁**（设计裁定级，非实现细节）。

## 0. 变更摘要

预分类（起草期精读三件 .at+ext 基型，T-00 定稿入分类表 §7）：

| 件 | .at | ext | 形状 | sink 面（预判） | 必留 ext（预判） |
| --- | --- | --- | --- | --- | --- |
| graph_sidebar | 162 | 47 | 统计卡 + Top 行列表 | graphStats（四 filter/count——P-7 域）/topDegreeNodes（排序下沉——双层 for 选排，spread/slice 无词位改构造）/`label \|\| id` 显式 if（076/077 先例） | store re-exports/Network |
| graph_controls | 216 | ~110（+82L styleblock 伴生） | 9 slider + 4 checkbox + 重置表单 | centerLabel（regex `.ad$` → ASCII 形态算术，077 inferType 同款）/opacityLabel（Math.round → 取整形态）/eventValue 消解（077 先例）/嵌套 settings 写经 **store fn 通道**（graph_store.at 加 set_setting/reset_settings——Q-3） | RangeInput（h 组件：DSL input 映射 shadcn Input 丢 min/max/step 在案）/eventNumber/eventChecked cast 桥/图标 re-exports；styleblock 伴生维持 |
| graph_view | 141 | ~200（cytoscape 全生命周期） | RC-F 宿主面：容器 + watch 编排 + expose 契约 | **过滤派生沉 .at**（buildElements 前段的 showMissing/showOrphans 节点过滤 + 边端点过滤 = 纯逻辑——Q-2 默认）；watch 编排已有 | cytoscape 实例生命周期全家（init/update/fit/relayout/destroy/高亮/hsl/事件——第三方内核，RC-F 不比） |

**两个设计裁定的事实基础（起草期实勘，2026-09-19）**：

1. **VM 无 canvas 词位**——ark generator（VM 轨渲染发射）grep canvas 零命中；
   VM native 形态 = 仅基础件（text/icon/row/col/button/mouse-area…）。
2. **desktop 现状无图谱视图**——app.at:304 LoadGraph = get_graph 计数 +
   行按钮（`graph_edges`/`graph_rows`），无画布、无布局、无交互。
3. web 侧 cytoscape 为 npm 命令式实例（fcose 力导布局），graph_view_ext
   头注明示"第三方命令式 widget 实例留手写 TS"（plan 011 非目标 #3，与
   Tiptap 封装同策略）。

→ 由此三事实，VM 实现形态的诚实选项空间（Q-1）：

| 选项 | 内容 | 定价 |
| --- | --- | --- |
| **A（默认预案）** | **宿主面壳单元**：L1 单元 = .at 壳 + watch 编排 + expose 契约 + loading/空态 + **过滤派生面**（buildElements 前段沉 .at，VM twin 断言过滤后节点/边计数投影）；画布本体（坐标/布局/拖拽/tap）= RC-F 内核豁免登记 | 纯执行；与"内核不比"裁定精神一致；desktop 装配图谱页时真渲染形态仍单列待办（登记不销号） |
| B | VM native 渲染器：基础件自算布局（圆环/网格）画节点/边 | ≈另造内核——语义不等 cytoscape，量大，与 RC-F 豁免精神冲突；仅当用户要"desktop 有图可看"才值 |
| C | 上游补 VM canvas 词位后镜像画布 | 编译器新元素依赖，时序不可控；登记为 lighthouse 候选 |

## 1. 目标

1. graph_sidebar/graph_controls 纯逻辑下沉 `.at`（六步流水）；ext 薄化至
   真宿主面（分类表入模式文档 §7）。
2. graph_view RC-F 宿主面首单元落地（Q-1/Q-2 裁定执行）：过滤派生沉 .at +
   壳面 twin + 内核豁免登记（native/canvas 单列待办更新）。
3. 三单元 gallery 双端 gate 绿（基线 3 张新增/旧 18 张零漂移）——gallery
   **21 真件**口径；**RC-D 16 件清零**（inventory §3 全勾）。
4. graph_controls 嵌套写通道裁定落地（Q-3：store fn 深沉 vs ext 桥）+
   VM slider/checkbox 断言域裁定（Q-4）。
5. desktop 消费结论登记（模式文档 §4.3 扩表：graph 族三件——desktop 图谱
   流现状与装配路径）。
6. 账面：SD-01 + 072-inventory 三行勾记 + merge 账本 P078-x。

**非目标**：desktop 图谱视图实现（选项 B/C 的真渲染——desktop 装配归 L3，
渲染形态单列待办维持）；graph_page.at（RC-C 组装级，L3）；cytoscape 内核
任何形式的对拍（RC-F 豁免）；force 布局算法移植；L3 收口其余件（RC-C
6 件/ribbon 裁定）。

## 2. 架构方案

```
                    ┌─ RC-D 标准路径（074/076/077 三轮验证）
graph_sidebar ──────┤  graphStats/topDegreeNodes 沉 .at → gallery 双臂
graph_controls ─────┤  labels/形态算术沉 + 嵌套写经 store fn（graph_store.at 单源）
                    │  RangeInput/styleblock 留 ext（VM slider 断言域 Q-4）
                    │
graph_view（RC-F）──┴  非标准路径：宿主面切分
                      .at 壳（容器/loading/watch 编排/expose 契约）= L1 单元面
                      ├ 过滤派生（nodes×settings 过滤+边端点过滤）沉 .at 模块 fn
                      │  → 双端可断言（VM twin 计数投影 / vue 臂 store fixture）
                      └ cytoscape 生命周期全家留 ext = 内核豁免（RC-F 登记）
```

关键设计点：

- **宿主面切分（Q-2 默认）**：graph_view 的 parity 单元 = "壳 + 数据派生"，
  断言面 = loading 文案/容器在位（vue 臂真件，cytoscape 黑盒渲染出 canvas
  即可）/过滤后节点与边计数投影（双端同 fn 派生）。画布内坐标/布局/交互
  不进断言域。desktop 图谱页装配（L3）时的 VM 渲染形态另裁——本计划仅
  把"壳面可挂载 + 派生单源"做实。
- **嵌套写通道（Q-3 默认）**：graph_controls 的 `graph.settings.<key>=v`
  与 `$patch` 重置无 DSL lvalue——**graph_store.at 侧加 `set_setting(key,
  value)`/`reset_settings()` 两 fn**（store 即 .at 单源，web a2ts 发射/
  VM 原生可达，比 ext 薄桥更彻底）；077 Q-2"备选 store fn 深沉"的首次
  正式采用。saveSettings 持久化随 store fn 内聚。
- **VM slider/checkbox（Q-4）**：desktop app.at 仅用过 text input——range/
  checked 形态在 VM 臂的可驱动性 T-00 探（探针：VM twin 项目 input
  type=range/checkbox 播种+读取）。不可驱动则 VM 断言域收敛为投影
  （depth/flags 值经 Init 播种 + 按钮驱动 reset/showGlobal），slider 交互
  不进断言（picker 同款口径）。
- **styleblock 伴生**：graph_controls 的 82L scoped style 维持 regen 追加
  流程（既有部署管线）；style 面不进 VM 断言（style 差异归配方化域——
  073 机制，非本批）。

## 3. 技术栈

- **jade-garden/front**：`auto/src/front/{graph_sidebar,graph_controls,
  graph_view}.at` + `auto/src/front/utils/graph_{sidebar,controls,view}_ext.ts`
  + `auto/src/front/graph_store.at`（嵌套写 fn 增位）+
  `auto/src/front/graph_controls.styleblock`（伴生维持）；component-gallery
  （units.mjs/单元页/twin/基线，现 18 真件 + editor_tab 占位）。
- **auto-lang 编译器**：master ≥ v0.4.2-1378（077 同源实测；≥1298 折回版
  起步）——无新增编译器预期；T-00 探针（排序下沉/取整形态/slider 播种）
  出缺口按 076/077 惯例兄弟分支补丁 + merge 折回。
- **门**：gallery `node scripts/gate.mjs`（双臂）；front `pnpm build` +
  `pnpm test:e2e`（**07-graph.spec.ts 直接相关** + 05-panels/08-screenshots）；
  desktop vm-smoke 双模。

## 4. 需求分析与背景调查

**授权记录**：2026-09-19 用户路线确认（批次 4 独立立项，前置两个设计裁定；
L3 收口待本计划 DoD）；**仅起草，执行未授权；Q-1 为设计裁定级，T-00 证据
产出后用户终裁**。

**既有依据（2026-09-19 主检出实勘）**：

| 依据 | 实勘落点 |
| --- | --- |
| 072-inventory §3 | graph_sidebar 162L ext:3（流粒度等价物=get_graph）；graph_controls 216L ext:4+styleblock 伴生；graph_view 141L RC-F（VM 实现形态单列待办） |
| design 30 §4 | 第三方边界规则：cytoscape 内核不比；图谱视图面（宿主面）入 L1 |
| 三件 .at+ext 精读 | graph_view_ext = cytoscape 全生命周期（init/fcose 布局/tap/高亮/fit/relayout，plan 011 非目标 #3 封装策略在案）；graph_controls 嵌套写/regex/Math.round/RangeInput 在案；graph_sidebar 排序/计数在案 |
| VM 能力面 | ark generator 无 canvas 词位（grep 零命中）；VM native = 基础件（filetree bp/072 台账口径） |
| desktop 图谱流 | app.at:304-315 LoadGraph = get_graph → 计数 + 行按钮；无视图（选项空间事实③） |
| graph_store.at | store 层 8 件之一（072 §5），web/desktop 单源口径——嵌套写 fn 深沉的落点 |
| api 契约 | get_graph 双端在案（web api.at:247 / desktop 副本） |
| 作业标准 | 074-sink-mode §3 六步 + §5（P-7/P-8）+ §6（P-9/P-10/typeof）；077 Q-1（picker 不进断言域）/Q-2（JSON 域桥）先例 |
| e2e 面 | 07-graph.spec.ts（图谱行为面）+ 05-panels/08-screenshots |
| 075-077 收尾态 | gallery 18 真件；exe ≥1378 同源；RC-D 余额 = 本批两件 |

## 5. 详细设计

### 规范增量

| delta_id | add/modify/retire | 目标文档 | before/after | rationale | acceptance |
| --- | --- | --- | --- | --- | --- |
| SD-01 | modify | jade-garden/ARCHITECTURE.md §8.6 | 批次 3 bullet 后 → 增批次 4 bullet（两件下沉 + RC-F 宿主面首单元 + Q-1/Q-2 裁定记录指针 + RC-D 清零 + gallery 21 单元口径 + native/canvas 待办更新） | RC-D/RC-F 台账 | AC-05 |

（分类表落 `074-sink-mode.md` §7 扩节；Q-1/Q-2 设计裁定记录随 T-00 落
`docs/plans/attachments/` 判定档或计划内勾记——裁定正文进本计划 §10 答案
栏。均非 canonical spec。）

**逐 fn 预分类表**（~30 fn 基型——T-00 定稿后入 §7）：

- **graph_sidebar**（47L ext，5 导出）：graphStats **sink**（四
  filter/length 计数 + stats Obj 构造——计数投影 pp 同款）；topDegreeNodes
  **sink**（选排双层 for——sort/spread/slice 无词位；cap 15；display
  `label || id` 显式 if）；store/icon re-exports 必留。style 块随件维持。
- **graph_controls**（~110L ext，13 导出）：centerLabel **sink**（regex
  `.ad$` → ASCII 后缀形态算术——ends/长度切片，077 inferType 先例）；
  opacityLabel **sink**（Math.round(x*100) → 取整形态——`(x*100)`
  整数化算术，T-00 验词位）；eventValue **消解**（handler 直写，077
  先例）；eventNumber/eventChecked **必留 cast 桥**（Number()/checked
  读——T-00 探 VM 侧形态）；setGraphNumber/setGraphFlag/resetGraphSettings
  **转 store fn 通道**（graph_store.at 增 set_setting/reset_settings——
  saveSettings 内聚；Q-3）；RangeInput **必留**（DSL input→shadcn Input
  丢 min/max/step 在案）；图标 re-exports 必留。
- **graph_view**（~200L ext，8 导出）：buildElements **拆沉**（前段过滤
  = nodes×settings[showMissing/showOrphans] + 边端点过滤 → .at 模块 fn
  `filter_domains(nodes, edges, settings)` 返回 {kept_nodes, kept_edges}；
  后段 cytoscape element Obj 构造留 ext）；initGraph/updateGraphElements/
  applyGraphSettings/applyGraphHighlight/destroyGraph/graphFit/
  graphRelayout **必留**（cytoscape 内核生命周期——RC-F 豁免面）。

**VM twin 断言设计**（三单元）：

| 单元 | vue 臂 | VM 臂 |
| --- | --- | --- |
| graph_sidebar | graph store fixture 播种（nodes/edges）→ 统计四卡数值 needle + Top 行 needle | Init 播种 → gs_total/gs_edges/gs_missing/gs_orphan 投影 + top 行 needle |
| graph_controls | graph store fixture → 中心标签/opacity 标签 needle + slider/checkbox 在位；交互（slider 改值→store 断言）按 e2e 07-graph 归 app 层 | gc_depth/gc_opacity 投影 + Reset/ShowGlobal 按钮驱动投影翻转；slider 直驱按 Q-4 探针定 |
| graph_view | 真件挂载（fixture props）→ loading 文案 + .graph-view 容器 + cytoscape canvas 出现（黑盒在位断言） | 壳 twin：loading 态 + filter_domains 派生计数投影（gv_nodes/gv_edges——双端同 fn）+ handle 占位 |

## 6. 测试设计

- **gallery gate**：三单元双臂绿 + 基线 3 张新增/旧 18 张零漂移；gate 汇总
  21 真件 + editor_tab 占位负例。
- **下沉行为锚**：计数/排序/过滤派生以 gallery 断言覆盖 + vue 轨对拍；
  graph_controls 行为面（slider→store→持久化）以 07-graph e2e 端到端覆盖
  （既有 spec 零变化即证）。
- **T-00 探针**（tmp 一次性，双轨绿后弃）：①排序下沉（选排双层 for
  发射）；②取整/后缀形态算术；③VM input type=range/checkbox 播种+读取
  （Q-4）；④graph_store.at 增 fn 的双轨发射（a2ts store 臂 + VM）；⑤
  filter_domains 拆沉后 vue 臂 cytoscape 行为零漂移（07-graph e2e 抽验）。
- **裁定证据（Q-1）**：三选项事实表落判定档（§0 表 + 实勘三事实为基），
  用户终裁记录入 §10 答案栏。
- **回归**：front `pnpm build` + e2e 全量（07-graph 重点）+ vm-smoke 双模；
  gen stub 门（ext 导入面变化时）。

## 7. 验收标准

| ID | 可观察行为 | 验证方法 |
| --- | --- | --- |
| AC-01 | 三件分类表在案 + T-00 探针结论（排序/形态算术/slider/store fn/过滤拆沉五点）落档；Q-1 用户终裁记录在案 | 模式文档 §7 扩节 + 本计划 §10 答案栏 + ext 导出面 grep=分类表对应 |
| AC-02 | 两件 RC-D 下沉：ext 薄化至真宿主面 + 双单元双端 gate 绿 | 部署 SFC 内联发射实证；gate 双臂绿 + 基线 2 张在库 |
| AC-03' | ~~graph_view 宿主面首单元~~（**终裁撤销**）→ 划出 DEBT 在案：独立计划草案 + 判定档 §5 终裁记录 + DEBTS 078 行 | 三件套落档（plan-draft/ruling §5/DEBTS）；078 内无 graph_view 交付物 |
| AC-04 | 回归零变化 | pnpm build 绿 + front e2e 全量 passed（07-graph 在内）+ vm-smoke 双模 PASS |
| AC-05 | 账面 | SD-01 §8.6 批次 4 bullet（**RC-D 清零 + gallery 20 真件口径 + graph_view 划出注记**）+ 072-inventory **两行勾记**（sidebar/controls）+ graph_view RC-F 行 DEBT 指针 + merge 账本 P078-x |

## 8. 执行步骤

> worktree：`down-078/{auto-down, auto-lang}`（074-077 配对惯例；auto-lang
> 兄弟 master detached @ exe ≥v0.4.2-1378 同源）。
>
> **checkpoint 已过（2026-09-19 用户终裁）**：Q-1 = **C'**（canvas 已在
> ——Plan 563 双轨笔笔画契约；真渲染 = 场景契约扩容（图元+命中）+
> Slider 补全 + graph_view 对位，**划出独立计划**，草案
> attachments/078-canvas-graph-scene-plan-draft.md，立项归 auto-lang）；
> Q-2 = 随 Q-1 划出（**T-03 撤销**，记 DEBT）；Q-3 = VM 实现问题实锤
> （复现包 attachments/078-vm-map-write-repro/ handoff auto-lang），
> 修复前 T-02 走 store fn 深沉；Q-4 = Slider 补全随独立计划，修复前
> VM 断言域收敛（checkbox/按钮投影）。T-01/T-02/T-04 依原授权执行。

- **T-00** [x] [调查+裁定] 三件分类表定稿 + 探针五点 + Q-1 三选项事实表落判定
  档。产物：模式文档 §7 + 判定档。依赖：无。→ AC-01（+用户终裁 checkpoint）
  [✅ 已完成 2026-09-19 c432ff34] 探针五点双轨全绿（P-11..P-14 录
  074-sink-mode §7.0：排序选排/形态算术/嵌套写通道/slider-checkbox 词位/
  过滤拆沉）；P-11 新发现（map 括号写 VM 静默吞 handler——点号写/括号读/
  msg 链/全量重赋四臂绿）、P-12（slider 词位 VM 缺席 + vue 轨无
  type="range"——RangeInput 必留实证）、P-13（checkbox 原生可驱动）、
  P-14（math.round 双轨词位）；分类表 §7.1/7.2/7.3 定稿；判定档
  attachments/078-graph-view-ruling.md 落档（Q-1 事实表 F1-F6 + Q-2 断言
  面具体化 + Q-3 store fn 成立 + Q-4 收敛口径 + 终裁记录栏待回填）；
  **checkpoint：T-01 起执行以用户终裁（Q-1/Q-2）为前置门槛**。
- **T-03** [x→撤销] graph_view 宿主面单元——**2026-09-19 用户终裁撤销**
  （宿主面单元+真渲染划出独立计划，记 DEBTS 078 行；本计划 gallery
  口径 = 20 真件，无 graph_view）。→ 原 AC-03 随撤（AC-03' = DEBT 登记
  在案，见 §7 修订）。
- **T-01** [x] [改] graph_sidebar 下沉（graphStats/topDegreeNodes/display）
  + gallery 单元。依赖：T-00 终裁。→ AC-02
  [✅ 已完成 2026-09-19] graph_stats/top_degree_nodes 双 fn 沉模块池
  （选排 cap15+display 显式 if）；ext 薄化至 store/Network 再导出（G-5）；
  部署 SFC 内联发射实证（G-8 sed 双表达式）；gallery 第 19 真件单元
  （vue facade 播种四节点三边；VM twin gs_graph_stats/gs_top_degree
  derived 真跑+四卡投影 4/1/1/3+gs_id_fallback=b 回落面+gs_open 行钮）；
  基线在库旧 18 零漂移 19 passed；gate 双臂绿+front build 绿；vm-probe
  boot 后 settle 1500ms（冷 boot 快照窗口实录）。commit 见 git log T-01。
- **T-02** [x] [改] graph_controls 下沉（labels/形态算术/eventValue 消解/
  嵌套写通道 fn 化；RangeInput/styleblock 留 ext）+ gallery 单元
  （VM 断言域按 Q-4）。依赖：T-00 终裁。→ AC-02
  [✅ 已完成 2026-09-19] 四 fn 沉模块池（gc_center_label strip_ext 形/
  gc_opacity_label math.round/gc_set_setting bracket 写/gc_reset_settings
  逐字段点号写 P-11 安全形替 $patch——可观察等价）+ eventValue 消解；
  G-3 勘注：store .at 模块 fn 不导出（composable 内私有），写通道 fn 落
  widget 文件池（077 sync_entries 同款），终裁"store fn 深沉"语义=写经
  .at fn 通道不落 ext，已满足；ext 薄化 13→7 导出（删 centerLabel/
  opacityLabel/eventValue/setGraphNumber/setGraphFlag/resetGraphSettings）；
  gen-support cp -r 陈旧镜像坑实录（build 污染 src/src TS2300——rm 重铺）；
  gallery 第 20 真件单元（vue 40%→重置→85% click 门+中心 CJK 剥除
  needle；VM twin ASCII 域 gc_center wiki/Intro+gc_reset 85%+旗标翻转+
  checkbox P-13 在位）；基线在库旧 19 零漂移 20 passed。
- **T-03** [x→撤销] graph_view 宿主面单元——**2026-09-19 用户终裁撤销**
  （宿主面单元+真渲染划出独立计划，记 DEBTS 078 行；本计划 gallery
  口径 = 20 真件，无 graph_view）。→ 原 AC-03 随撤（AC-03' = DEBT 登记
  在案，见 §7 修订）。
- **T-04** [x] [改] desktop 消费登记（§4.3：三件——desktop 图谱流现状计数行
  按钮与装配路径；native/canvas 待办更新）+ 回归收口（pnpm build / e2e
  全量 / vm-smoke 双模 / gallery gate 全绿）+ 账面（SD-01 +
  inventory 勾记 + RC-D 清零口径）。依赖：T-01/T-02。→ AC-04/AC-05
  [✅ 已完成 2026-09-19] 074-sink-mode §4.3 扩节 + 072-inventory 两行
  勾记 + graph_view 行终裁指针 + ARCHITECTURE §8.6 批次 4 bullet +
  gallery README 债表 D-8/D-9；回归全绿：front pnpm build / e2e 全量
  24 passed（端口 13100 WinNAT EACCES——临时 13210 已还原）/vm-smoke
  双模 PASS（split 9266+merged 9267）/assert-api-stub-sync 绿/gallery
  gate 双臂 20 真件。commit 386fc74。

## 9. 复审记录

- 2026-09-19 review：`stage: review | plan_id: PLAN-078 | plan_revision: 2 |
  outcome: pass（→ reviewed，next: merge） | reviewed_commit: 386fc74154dd
  f8bd9734fcf0eaf3f7568e7e7b63（worktree down-078/auto-down，plan-078-dev，
  tracked 零未提交） | base_commit: master 84c9897 | dependency_revisions:
  auto-lang master b69c7344c detached（exe v0.4.2-1378 同源） | spec_inputs:
  SD-01=jade-garden/ARCHITECTURE.md §8.6 批次 4 bullet（@386fc74 冻结）+
  074-sink-mode §7/§4.3 + 072-inventory 勾记/RC-F 指针 + 判定档 §5/§6 +
  canvas-graph-scene 计划草案 + DEBTS 078 两行——均非 canonical spec
  （074-077 惯例，frontmatter supersedes/new 空有 §5 说明） |
  acceptance_results: AC-01 pass（§7 四节+判定档 C' 回填+ext 导出面
  grep=分类表必留行精确对应，G-5 删净）；AC-02 pass（部署 SFC 内联
  graph_stats/top_degree_nodes ×2 + gc_* ×4，旧导出零残留，styleblock
  伴生尾部在位，gate 双臂绿，基线 18+2 张）；AC-03' pass（plan-draft/
  ruling §5/§6/DEBTS 078 两行三件套）；AC-04 pass（复审复跑：pnpm build
  绿 9.83s + gallery gate 双臂 ✓ + e2e 全量 24 passed 41.6s[端口 13210
  临时已还原 13100] + vm-smoke split 9271/merged 9272 双 PASS +
  assert-api-stub-sync ok——同基线零改动下全量重演）；AC-05 pass（SD-01
  bullet ×1+inventory 勾记 ×2+RC-F 指针 ×1+§4.3 ×1+D-8/D-9 ×2；账本
  P078-x 归 merge 阶段非缺项） | findings: F-R1 🟢info（Q-3 写通道落
  widget 文件池非字面 graph_store.at——G-3 机械约束[store .at 模块 fn
  编译为 composable 内私有]，终裁语义"写经 .at fn 通道不落 ext"已满足，
  T-02 证据在案）；F-R2 🟢info（vm-smoke merged 口径=VM_MERGED=1，
  --arms 是测试臂选择——T-04 提交实录）；F-R3 🟢info（vm-probe boot 后
  settle 1500ms 测试基建随 T-01 入库） | evidence: 本记录复跑命令+日志
  /tmp/p078-review-*.log（临时）+ 静态 grep 实录（评审会话内重构，非采信
  执行摘要——实现会话内 review 的独立性局限在此声明） | next: merge`。

- 2026-09-19 work execution_done：`stage: work | plan_id: PLAN-078 |
  plan_revision: 2 | outcome: pass（T-00/T-01/T-02/T-04 全闭环，T-03 终裁
  撤销；执行完成待 review） | code_commit: 432ff34（T-00）+ T-01/T-02/
  386fc74（plan-078-dev，worktree down-078/{auto-down,auto-lang}） |
  task_ids: T-00,T-01,T-02,T-03(撤销),T-04 | evidence: AC-01 判定档+模式
  文档 §7；AC-02 两件下沉 SFC 内联发射+gallery 19/20 真件双臂绿+基线
  2 张旧 18 零漂移；AC-03' 三件套（plan-draft/ruling §5/DEBTS 078）；
  AC-04 pnpm build 绿+e2e 24 passed+vm-smoke 双模 PASS；AC-05 SD-01
  bullet+inventory 勾记+债表 D-8/D-9 | blockers: 无 | next: review`。

- 2026-09-19 draft handoff：`stage: new | plan_id: PLAN-078 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权——Q-1/Q-2 设计裁定携默认预案，
  T-00 证据后用户终裁） | next: review → work（T-00 后终裁 checkpoint）`。
- 2026-09-19 work T-00：`stage: work | plan_id: PLAN-078 | plan_revision: 1 |
  outcome: blocked（T-00 完成、证据齐备——**用户终裁 checkpoint 前置**：
  Q-1/Q-2 设计裁定级 + Q-3/Q-4 随裁确认；默认预案 A/store fn/收敛口径，
  裁 A 则 T-01 依序执行，裁 B/C 则 T-03 与工作量重估） | code_commit:
  432ff34（plan-078-dev，worktree down-078/{auto-down,auto-lang}） |
  task_ids: T-00 | evidence: 074-sink-mode §7（P-11..P-14 + 三表）+
  attachments/078-graph-view-ruling.md + 探针双轨绿（vue build 绿/VM MCP
  断言绿，auto.exe 1378 同源；工件已弃置） | blockers: Q-1/Q-2 用户终裁
  （078-graph-view-ruling.md §5 回填） | next: 终裁后 T-01 → T-04 →
  review`。
- 2026-09-19 work 终裁+范围修订：`stage: work | plan_id: PLAN-078 |
  plan_revision: 2（终裁修订：T-03 撤销→DEBT，AC-03→AC-03'，gallery 20
  真件口径） | outcome: executing（checkpoint 已过——用户终裁 Q-1=C'
  canvas 场景契约升格独立计划/Q-2=随划出/Q-3=VM bug 复现包 handoff/
  Q-4=Slider 补全随独立计划；终裁调查勘误：canvas 元素双轨已在 Plan 563，
  起草期 F1/F2 作废） | task_ids: T-03 撤销；T-01/T-02/T-04 继续 |
  evidence: attachments/078-graph-view-ruling.md §5/§6 +
  attachments/078-canvas-graph-scene-plan-draft.md +
  attachments/078-vm-map-write-repro/（RuntimeError "Invalid array ID"
  实录）+ DEBTS 078 两行 | blockers: 无 | next: T-01 → T-02 → T-04 →
  review`。

## 10. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | **graph_view VM 实现形态**（设计裁定级，登记在案单列待办） | T-03 单元形态；L3 desktop 图谱页装配路径 | **✅ 已终裁（2026-09-19）：C'**——canvas 元素 Plan 563 双轨已在（笔笔画契约），真渲染 = 场景契约扩容（图元/标签/命中）+ Slider 补全 + graph_view 对位，**独立计划**（草案 attachments/078-canvas-graph-scene-plan-draft.md，立项归 auto-lang）；T-03 撤销记 DEBT |
| Q-2 | **宿主面单元定义**（与 Q-1 联动） | T-03 断言面 | **✅ 已终裁：随 Q-1 划出**——078 不做 graph_view，DEBTS 078 行登记 |
| Q-3 | graph_controls 嵌套 settings 写通道 | T-02 | **✅ 已终裁：VM 实现问题实锤**（SET_ELEM 数组专用 × codegen 无 map 路由；复现包 attachments/078-vm-map-write-repro/ handoff auto-lang）——修复前 T-02 走 store fn 深沉（P-11 证据） |
| Q-4 | VM input type=range/checkbox 可驱动性 | T-02 VM 断言域 | **✅ 已终裁：Slider 补全随独立计划**（a2r 完整/aura 臂缺/vue 缺 type=range）；修复前 VM 断言域收敛 = checkbox/按钮驱动投影（P-13/P-12） |

- 2026-09-19 merge：`stage: merge | plan_id: PLAN-078 | plan_revision: 2 |
  outcome: pass（五 checkpoint：prepared/landed/ledger_refreshed/archived/
  cleaned） | delivery_commit: d62124c73582dfde04fe6ee70d39ae14168f6f49
  （plan-078-dev ff-only 落 master——reviewed 386fc741 之唯一增量 =
  .autoos/specs.json 账本投影 +17/-4，实现/依赖零变化；rebase no-op，
  master 无漂移 =base 84c9897；range-diff 全等） | canonical: jade-garden/
  ARCHITECTURE.md §8.6 批次 4 bullet（SD-01 冻结于 386fc74）+
  docs/plans/attachments/{074-sink-mode.md §7/§4.3, 072-inventory.md 两行
  勾记+RC-F 指针, 078-graph-view-ruling.md, 078-canvas-graph-scene-plan-
  draft.md, 078-vm-map-write-repro/, DEBTS.md 078 两行} | ledger:
  .autoos/specs.json P072-1 原地更新（title/related/content 批次 4 段）+
  P078-1 新增 reviews 收据，247→248 条，回读验证 ✓ | archive:
  docs/plans/archived/078-rcf-graph-family-batch4.md（status: archived，
  completion_kind: delivered） | cleaned: 见下方补记`。
