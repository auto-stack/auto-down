# PLAN-078 判定档：graph_view VM 实现形态 + 宿主面单元定义（Q-1/Q-2）

> 状态：证据齐备，**待用户终裁**（设计裁定级 checkpoint，计划 §8 前置）。
> 产出：PLAN-078 T-00，2026-09-19，worktree down-078。
> 证据基面：auto.exe v0.4.2-1378-g0c6b03fd3（主检出 debug exe 同源）；
> 探针 `jade-garden/front/tmp/p078-probe/`（双轨绿后弃，结论已录
> 074-sink-mode.md §7.0 P-11..P-14）。

## 1. 事实基础（起草期实勘 + T-00 探针双重确认）

| # | 事实 | 证据 |
| --- | --- | --- |
| F1 | VM 轨无 canvas 词位——ark generator grep 零命中；VM native 形态 = 基础件 | crates/auto-lang/src/ui_gen/ark/ 全目录 + 072 台账口径 |
| F2 | VM 快照元素族无 canvas/画布节点；iced 侧 canvas 直绘仅 editor 壳（Plan 563，场景数据契约归 iced::canvas::Program——双端独立绘制，非 DSL 可达面） | renderer.rs:1009-1010/307 注记；snapshot_builder.rs 元素族清单 |
| F3 | slider 词位 VM 轨静默缺席（aura_view_builder 无臂）；checkbox 原生可驱动（P-12/P-13） | 探针③：快照零 slider 节点；toggle → ps_flag=true |
| F4 | desktop 图谱流现状 = get_graph 计数 + 行按钮，无画布/布局/交互 | desktop app.at:304-315 LoadGraph（实勘） |
| F5 | web 侧 cytoscape = npm 命令式实例（fcose 力导布局），graph_view_ext 头注明示第三方封装策略（plan 011 非目标 #3，Tiptap 同款） | graph_view_ext.ts:1-27（实勘） |
| F6 | 过滤派生（buildElements 前段）纯逻辑，双轨可断言——探针⑤ filter 形态绿（默认 2/1，翻转 3/3） | 074-sink-mode §7.0 探针⑤ |

## 2. 选项空间与定价（三选项，维持计划 §0 框架）

| 选项 | 内容 | T-00 后定价更新 |
| --- | --- | --- |
| **A（默认预案）宿主面壳单元** | L1 单元 = .at 壳（容器/loading/watch 编排/expose）+ **filter_domains 过滤派生沉 .at**（双端同 fn：vue 臂真件消费 + VM twin 计数投影 gv_nodes/gv_edges）；画布本体 = RC-F 内核豁免登记 | 探针⑤已证过滤派生双轨绿；checkbox 驱动布尔投影可用（P-13）；零编译器依赖。desktop 装配图谱页时真渲染形态**单列待办维持**（登记不销号） |
| B native 渲染器 | VM 基础件自算布局画节点/边（col/row/text 定位拼图） | 无 canvas 词位下只能 row/col 网格近似——语义不等 cytoscape（fcose 力导/缩放/拖拽/tap 全缺）；量 ≈ 另造内核；与 F5 豁免精神冲突。仅当"desktop 必须有图可看"提前于 L3 才值 |
| C 上游补 VM canvas 词位后镜像画布 | 编译器新元素族（ark 词位 + snapshot + MCP 动作 + vue 对齐） | 依赖 auto-lang 独立立项；时序不可控；登记 lighthouse 候选 |

## 3. Q-2 宿主面单元定义（与 A 联动）

- 单元 = **壳 + 过滤派生**：断言面 = loading 文案 / 容器在位（vue 臂真件
  cytoscape 黑盒出 canvas 即可）/ **filter_domains 过滤后节点与边计数
  投影（双端同 fn 派生）** / expose 契约在位（fit/relayout/open）。
- 画布内坐标/布局/交互不进断言域（RC-F 豁免）。
- VM twin 断言域具体化（探针结论后收窄）：Init 播种 fixture →
  gv_nodes/gv_edges 计数投影 + settings 翻转按钮（**checkbox 通道，P-13**
  ）驱动投影重算；slider 交互不进断言（P-12）；loading 文案投影。

## 4. Q-3/Q-4 裁定证据（随本档一并确认）

- **Q-3 嵌套写通道**：默认预案 store fn 深沉**成立**——vue 轨括号写形态
  可行（探针④ SFC 实文 `settings.value[args.key] = args.value`）但 VM
  轨 P-11 静默吞 handler；store fn（graph_store.at 增
  `set_setting`/`reset_settings`）= vue 轨执行面 + saveSettings 内聚 +
  VM twin 不镜像（F-1 播种投影），ext 三 fn（setGraphNumber/
  setGraphFlag/resetGraphSettings）删。发射成本零新增（store msg handler
  同域，探针④全量重赋/点号写臂双轨绿）。
- **Q-4 VM slider/checkbox**：**收敛断言域**——slider 词位 VM 缺席
  （P-12）+ vue 轨无 type="range"（生产件 RangeInput ext 维持）→ slider
  交互双轨均不进断言；checkbox 原生可驱动（P-13）→ twin 布尔投影以
  checkbox 通道驱动；depth/flags 值经 Init 播种 + Reset/ShowGlobal 按钮
  驱动投影翻转（077 picker 同款口径）。

## 5. 终裁记录（2026-09-19 用户裁定，回填）

- **Q-1 裁定：C'（用户方案）**——canvas **并非不存在**（起草期 F1/F2
  结论**作废**，见 §6 勘误）：desktop 底层 iced 有 canvas，Plan 563 已把
  `canvas` 元素升为 AutoUI 双轨组件（场景契约=笔笔画），charts/svg 组件
  借助它在案。graph_view 真渲染的路径 = **场景契约扩容（图元+命中）**，
  值得独立计划——划出 078，草案落
  `attachments/078-canvas-graph-scene-plan-draft.md`，正式立项归
  auto-lang 侧 auto-plan:new。
- **Q-2 裁定：随 Q-1 划出**——graph_view 宿主面单元（壳+filter_domains）
  本计划（078）**不做**，记 DEBT 随独立计划跟踪；078 的 T-03 撤销，
  gallery 20 真件口径（18+2，无 graph_view）。
- **Q-3 裁定**：settings 桌面数据结构 = VM 堆 map（hashmap 族）；
  括号写静默吞 handler 确认为 **VM 实现问题**（根因：codegen index-assign
  无 map 路由 + engine SET_ELEM 数组专用，读侧 auto.hashmap.get 有路由——
  双臂不对称）。最小复现包落
  `attachments/078-vm-map-write-repro/`（实录 RuntimeError "Invalid array
  ID"），**handoff auto-lang VM 侧修复**。修复前 T-02 写通道按 store fn
  深沉执行（vue 轨执行面，不受 bug 影响）。
- **Q-4 裁定**：AutoUI 底层有 View::Slider（a2r 轨 PLAN-025 完整）+
  snapshot Slider kind，唯 VM/aura 视图树臂缺失 + vue 缺 type="range"——
  **补全**（不新增组件），随 Q-1 独立计划；修复前 078 的 VM 断言域收敛
  维持（checkbox/按钮驱动投影，P-13 通道）。
- 裁定日期：2026-09-19
- 影响：078 范围修订（T-03 撤销→DEBT；T-01/T-02/T-04 依原授权执行）；
  077 gallery 21 真件口径改为 20（graph_view 单元随独立计划补位）。

## 6. 事实勘误（终裁调查修正）

| 原记录 | 勘正 | 证据 |
| --- | --- | --- |
| F1/F2"VM 无 canvas 词位/快照无画布节点" | **作废**——canvas 元素 Plan 563 双轨已在（场景=笔笔画契约）；起草期仅 grep 了 ark 轨 | aura_view_builder.rs:1976/11800、schema.rs:2405、vue.rs:6625、view.rs:1016-1046 |
| "Q-1 选项 C = 上游补 canvas 词位（时序不可控）" | 改判为**用户选定路径 C'**：契约已存在，缺的是图元场景扩容（形状/标签/命中）——工作量有界、可立项 | CanvasScene{strokes} 契约 + charts/svg 先例 |
| P-12"slider 词位 VM 缺席 = 组件不存在" | 精确化：a2r 轨完整（PLAN-025）、snapshot kind 在案，缺 = aura_view_builder 臂 + vue type="range" 注入——**补全**而非新造 | rust.rs:3706、snapshot_builder.rs:348、vue.rs:9035 |
