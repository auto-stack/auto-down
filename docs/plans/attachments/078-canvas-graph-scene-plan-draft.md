# 独立计划草案：canvas 场景契约升格 + AutoUI Slider 补全 + graph_view 真渲染

> 来源：PLAN-078 T-00 终裁（2026-09-19 用户裁定：Q-1 选项 C'——canvas
> 已存在于 AutoUI，**升格/扩契约**值得独立计划；graph_view 宿主面单元
> 与真渲染自 078 划出，随本计划跟踪）。
> 状态：**草案**——正式立项应在 auto-lang 侧走 auto-plan:new 实勘流程
> （本仓 078 仅承载调查证据与范围记录），编号、任务切分、AC 以立项稿为
> 准。登记位置建议：auto-lang docs/plans（编译器/AutoUI 主体）+
> jade-garden 消费阶段回挂。

## 1. 目标（草案）

1. **canvas 场景契约扩容**：CanvasScene 从"笔笔画"（strokes: points/
   color/width/eraser，Plan 563）扩至**图元场景**——节点形状（圆/矩形）、
   边（线段）、文本标签、命中测试（tap → 元素 id 上报）。双端渲染保持
   "场景数据契约的纯函数"（view.rs:1009 既有裁定）：VM = iced
   canvas::Program 直绘；vue = `<canvas>` 2D 同契约绘制。
2. **AutoUI Slider 补全**：DSL `slider` 词位三轨对齐——VM/aura 轨补
   aura_view_builder slider 臂（drag 机制可借 PLAN-617 progress+onseek
   拖拽 machinery）；vue 轨补 `type="range"` 注入（或正式裁 RangeInput
   组件化）；a2r 轨已完整（PLAN-025 T-03，fixture 025-native-input/
   slider.at）为语义基准。MCP `set_value` 已声明 slider 支持
   （mcp_server.rs:696），补通快照/动作闭环。
3. **graph_view 真渲染（消费阶段）**：PLAN-078 DEBT 划转本计划——
   cytoscape 的 VM 侧对位（力导布局可先简化为环形/网格 + 后续 fcose
   近似）、tap 打开页（onOpen 契约）、graph_view 宿主面单元从"壳+过滤
   派生"扩至真渲染断言。

## 2. 证据基础（078 T-00 调查，2026-09-19）

| 面 | 现状 | 落点 |
| --- | --- | --- |
| canvas 元素 | **双轨已在**（078 起草期"VM 无 canvas 词位"结论**作废**——仅 ark 轨零命中） | aura_view_builder.rs:1976 convert_canvas；schema.rs:2405 ElementDef；vue.rs:6625 Plan 563 臂；iced View::Canvas（view.rs:1016） |
| 场景契约 | 仅笔笔画：CanvasScene{strokes[points,color,width,eraser]}，`scene:` prop 读 `<name>_pts`/`<name>_meta` 双表；pen 事件三件（onpenstart/move/end）+ coords extent | view.rs:1031-1046；convert_canvas/extract_canvas_scene（aura_view_builder.rs:11800+） |
| svg | aura 轨 convert_svg_image/serialize_svg_element 在案 | aura_view_builder.rs:1967/11998 |
| charts | 官方 chart 包组件（with_charts 动态装载，VM 轨 build_dynamic_component 渲染；vue 轨 shadcn chart family 已 retired） | plan643_chart_tag_tests.rs |
| slider·a2r | 完整：View::slider(min..=max,value,fn 指针) 载荷 msg + step | rust.rs:3706（PLAN-025 T-03）；tests/fixtures/025-native-input/slider.at |
| slider·VM/aura | **缺臂**：aura_view_builder 无 slider——DSL slider 静默丢弃（078 P-12）；快照 builder 有 Slider kind 但视图树造不出来 | snapshot_builder.rs:348（空转）；P-12 探针实录 |
| slider·vue | slider→input 映射**无 type="range"**（vue.rs:9035）→ DOM 形态缺口 | 078 P-12 探针 SFC 实文 |
| 拖拽机制 | progress+onseek 可拖进度条（PLAN-617，vue 轨）；MCP set_value/pen 动作在案 | vue.rs:6645+；mcp_server.rs:696/1507 |
| map 括号写 bug（关联修复项） | slider 载荷回写若走 map/嵌套写会撞 P-11——**建议随本计划一并修**（复现包 078-vm-map-write-repro/） | SET_ELEM 数组专用，engine.rs:5475 |

## 3. 范围草图（草案，立项时重切）

- T-0（auto-lang 实勘）：CanvasScene 消费方盘点（charts/白板/编辑器 pen
  面）、进度条拖拽 machinery 复用面、graph 场景需求清单（对照 cytoscape
  能力子集：节点/边/标签/tap/缩放平移取舍）。
- T-1：场景契约 v2（图元 + 命中）设计 + 双端渲染臂 + 快照投影。
- T-2：slider aura 臂 + vue type=range + MCP set_value 闭环 + 025 fixture
  双轨回归。
- T-3：map 括号写修复（078 复现包作回归用例）——若 auto-lang 侧未先行。
- T-4：jade-garden graph_view 真渲染消费（gallery 第三单元转正 + desktop
  图谱页装配预研）。

## 4. 开放问题（立项时裁）

- 命中测试事件面：tap 上报走元素 id（autoui_action press 可达）还是
  新 onnodeclick 契约？
- 缩放/平移：场景契约带 viewport 字段 vs 交互事件回路？
- fcose 力导：VM 侧自算（简化布局起步）还是场景坐标由上游（web/graph
  store）下发？
- slider 载荷 msg 在 aura 轨的事件模型（a2r 是 fn 指针；aura 走
  events map + DynamicMessage）。
