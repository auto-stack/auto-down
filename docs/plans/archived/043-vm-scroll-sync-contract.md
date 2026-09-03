---
plan_id: PLAN-043
status: archived
feature_name: VM 滚动同步契约（View offset 绑定 + 滚动消息 + DSL 两栏联动）+ 四件挂账收编
author: [zhaopuming]
created_at: 2026-09-03
updated_at: 2026-09-03

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components:
  - "P040-4（demo 单源化+双轨契约扩展·详细设计）: 修改——scroll_sync prop 的 VM 臂叙事从「契约在案、VM v1 读取后忽略（豁免归 042/043 补）」改为「PLAN-043 起真消费」（外包 View::Scrollable：scroll_top 绑定写入臂 + onscroll 读出臂，EDITOR-CONTRACT §11 承载）；同条目内 streaming/placeholder_*（ghost）豁免指向改 PLAN-044"
  - "P041-4（VM 块渲染统一·详细设计/平台差异豁免表）: 修改——豁免表 #8 Details 点击回路（043 T2/T4 接线销号：ondetailsclick 通道+MCP press 布局件放行）、#12 StreamCache 注册表无上限（043 T5 容量 32 FIFO 销号）、#1 CustomScrollbar 观感豁免的数据面（043 搭车①：三测量按轨分派，csb_* computed）与交互面（043 T9/T10：mouse-area 坐标契约发射面+drag action 实测销号）；余量清零（原「VM 拖拽发射面见 D2」已补实现）"
new_spec_components:
  - "P043-1: reports——变更摘要（View::Scrollable 扩 offset 绑定+on_scroll 消息双臂/两臂 scroll_sync 消费/DSL 状态+rust 快道两栏比例联动/四件挂账收编/重大过程发现 auto_val nanbox 整值 float bug）"
  - "P043-2: goals——六目标（双向比例联动+scroll_sync 真消费+CustomScrollbar 数据+Details 端到端+LRU 上限+编号改准；验收 1 的 VM 拖拽面缺位经 T9/T10 补实现销号）"
  - "P043-3: architecture——View::Scrollable{offset 写入臂（pending 队列>0.5px 去抖+update 排空发 scroll_to）/on_scroll 读出臂（ScrollCallback newtype 跨 DynamicMessage→IcedMessage）}+aura_view_builder 两臂消费+VM 轨 rust update 层 write_state 直写快道（绕引擎 nanbox 整值 float bug）"
  - "P043-4: designs——EDITOR-CONTRACT §11 scroll 双轨契约（onscroll 实参序 (height,client,scrollTop)+nanbox 绕道注记/比例口径 peer.top=self.top/(h-c)*(peer.h-peer.c)/像素不保证/Details ondetailsclick 键=block_key）+MCP scroll action（__mcp_scroll 合成事件直落）与 press 布局件放行+registry 容量 32 插入序 FIFO+快照 offset_y 可观测口；T10 增补——MCP drag action（__mcp_drag：W␟Down␟Move␟Up␟points 连发 on_with_input_for，$event 冻结标记实参与真实转换器同构，mouse-area 拖拽测试面）+custom_scrollbar 双轨分派形态（is_vm prop：vue emit 原语义/VM 直写根态+比例同步）+子件加载/双声明/内联几何三根因注记"
  - "P043-5: tests——发射测（scroll_sync 消费/Details 通道/双 attr 顺序）+pending 队列去抖测+LRU 淘汰测+vm-smoke 四断言组（编辑联动/渲染消费/滚动同步三测量+offset_y 跟随/双向回随）+净窗冷窗暖场与补发加固；T10 增补——vm-smoke 第七断言组（drag action 发射面：left_top/right_top 跳变+双 offset_y 跟随）+vm-drag-before/after.png 双截图口径"
  - "P043-6: reviews——复审记录（tf 3397/3398 唯一红=schema_drift master 同红存量/tv 3558 全绿/playwright 72 复跑全绿窗/净窗 smoke exit 0/Details 实机复验；验收 1 拖拽面 PARTIAL 裁定项 D2）+T9/T10 增量复审（D2 销号：vm-smoke 7/7+双截图+72/72 复跑；三连根因沉淀；真指针 hop 以同构消息代证的处置与理由；新引擎缺口双仓登记）"
touched_goals:
  - "目标1（双向比例联动）: 达成——vm-smoke 断言+净窗复跑 exit 0；拖拽子项经 T9/T10 补实现达成（第七断言组+双截图，D2 销号）"
  - "目标2（scroll_sync 真消费+契约落 EDITOR-CONTRACT）: 达成——§11 在册+发射测钉死"
  - "目标3（CustomScrollbar VM 数据+vue 零回归）: 达成——csb_* 按轨分派+A/B 对照+72/72 复跑全绿窗"
  - "目标4（Details 折叠端到端）: 达成——实机复验 PASS+两态截图在档"
  - "目标5（StreamCache 上限+DOC_EDITORS 一致）: 达成——容量 32 FIFO+实测 plan-019 起即真 LRU（需求分析条目误判在案）"
  - "目标6（编号引用改准）: 达成——ghost→044/列宽→045/旧引用 grep 零命中"

current_step: 10
total_steps: 10
---

# [PLAN-043] VM 滚动同步契约 + 挂账收编

## 变更摘要

DEBTS 040 三大平台豁免之首：`scroll_sync` prop 双轨契约在案但 VM 臂
「读取后忽略」（aura_view_builder.rs:1441-1446 `let _ = props.get("scroll_sync")`
后直接 `render_document`），VM 轨编辑↔预览无滚动跟随。本计划把滚动同步
在 VM 轨接通，并按路线图（PLAN-041 §后续路线图）收编四件挂账：

1. **View 契约扩展（核心设计）**：`View::Scrollable`（view.rs:411-419，
   现有 `auto_scroll: bool`）增 **offset 绑定**（DSL state → 滚动位置写入）
   与 **on_scroll 消息**（滚动位置读出 → 宿主 handler）。Plan 319 单臂
   规则不破——不新增 View 变体，只扩既有变体字段；renderer lowering
   （renderer.rs:3753 build_scrollable）同步消费。
2. **scroll_sync 消费 + DSL 两栏联动**：autodown/autodown_editor 元素在
   `scroll_sync: true` 时为渲染输出外包带绑定与消息的 `View::Scrollable`
   （稳定 Id）；demo app.at 双栏联动 = 比例同步（见裁定）。
3. **搭车① CustomScrollbar 数据接通**：三测量（scrollTop/scrollHeight/
   clientHeight）数据源 = on_scroll 消息写 DSL state；`SetScrollTop`
   handler 的 `is_vue()` 守卫语义复核（vue 轨 ext 桥回路不得回归）。
   DEBTS 040 CustomScrollbar 行收口。
4. **搭车② Details 折叠回路接线**（041 豁免 #8）：只读臂 View 树点击
   消息经同一宿主事件通道回 DSL state（open attr）→ 重渲染；041 T5
   Details 点击→on 消息的「归宿主通道」余量在本计划接完。
5. **搭车③ StreamCache LRU**（041 豁免 #12）：autodown_stream_registry
   加容量上限；顺路修正 DOC_EDITORS「注释称 LRU 32 实为裸 HashMap」
   的注释-实现 drift（core.rs:1714-1723）。
6. **搭车④ 编号漂移修正**：auto-down DEBTS.md L39-42 三行预留
   「PLAN-042/043/044」已被 042（vue 家族补齐）占用，改指
   043（本计划）/044（ghost）/045（表格列宽）；demo README 豁免清单
   与 aura_view_builder.rs:34-35 头注同款修正。

**时序硬前置**：auto-lang 侧 041 批次折入 master——StreamCache
（autodown_render.rs:51-62）、autodown_stream_registry
（aura_view_builder.rs:185-196）、六行 DEBTS 现均在分支
auto-down-dev（worktree `.worktrees/auto-down-dev`），master 上没有。
本计划 auto-lang 侧任务一律基于折入后的 master 开工。

**会话裁定（2026-09-03，防止复议）——VM v1 同步粒度取比例同步，非
vue 轨的块级映射**：vue 轨 useSyncedScroll 用块级映射 + spacer 注入
（computeScrollTopFromSource/applyBlockSpacers）是因为编辑器行高≠
渲染行高；VM 轨经 041 家族统一后两臂**同一 cosmic-text Buffer 同一
绘制路径**（041 目标 3：edit↔view 像素一致结构上免费），两侧文档高度
天然同构，比例同步失真远小于 vue 轨场景。块级映射留作 vue 侧复杂度
先例，VM 需要时再升。验收口径与表格列宽计划同款：**行为对齐非像素
对齐**。

## 目标

1. VM demo：编辑栏滚动 → 预览栏按比例跟随（双向），拖 CustomScrollbar
   滚动条同步两栏——vm-smoke 可重复断言。
2. `scroll_sync` prop 从 contract-only 变真消费；`View::Scrollable`
   offset 绑定 + on_scroll 消息进 View 契约并落 EDITOR-CONTRACT。
3. CustomScrollbar 在 VM 轨有数据（三测量非零），vue 轨现状零回归。
4. Details 点击折叠在 VM demo 端到端可用（点击→handler→state→重渲染）。
5. StreamCache 注册表有容量上限；DOC_EDITORS 注释-实现 drift 清零。
6. 双仓 DEBTS/README/头注的 PLAN 编号引用全部改准。

## 架构方案

```
View 契约（auto-lang src/ui/view.rs:411）
  View::Scrollable { child, auto_scroll,
                     offset: Option<(f32,f32)>,   ← 新：写入（绑定求值）
                     on_scroll: Option<M> }       ← 新：读出（消息回宿主）
        │
  renderer.rs build_scrollable（:3753）
        │  offset 有值 → iced scroll_to/absolute_offset 写入
        │  on_scroll 有值 → iced on_scroll 事件 → event_router →
        │                     call_handler("handler_<W>_OnScroll")
        ▼
aura_view_builder.rs（:1441-1446 / :2442-2447 两臂）
  scroll_sync == true → render_document 输出外包
  View::Scrollable { offset: 绑定求值, on_scroll: 消息, id: 稳定键 }
  （Details 点击 onclick 消息同通道搭车——render_document 泛型 M
    已存在，StreamCache<M> 即证）
        │
demo app.at（DSL 层联动，纯状态无 ext 桥）
  state: scroll = { top, height, client }   ← 左右栏各一份
  handler_OnScroll: 更新本栏三值 + 按比例算对栏 top 写其 state
  CustomScrollbar 绑定 .scroll.left.*（VM 轨数据源即此）
  SetScrollTop: 写 state（VM 轨直通；vue 轨守卫不变）
```

**vue 轨不回归的保证**：vue 轨滚动走 ext 桥
（app_ext.ts useDemoAppBridge → useSyncedScroll 547 行），不消费
on_scroll 消息路径；app.at 改动后 regen，`is_vue()` 守卫
（app.at:129-136, :140-144）保 vue 轨 handler 行为不变。CustomScrollbar
绑定数据源在 vue 轨仍来自 bridge ref（守卫内），VM 轨来自 scroll
state——绑定面若需分叉，按 is_vue 探针分派，不改 ext 桥。

## 技术栈

- auto-lang（Rust，折入 041 后的 master）：`crates/auto-lang/src/ui/
  view.rs`、`ui/iced/renderer.rs`（build_scrollable + scroll 操作先例
  :12236-12251）、`ui/aura_view_builder.rs`（:1441-1446/:2442-2447 消费
  臂 + :185-196 registry + :34-35 头注）、`ui/autodown_render.rs`
  （StreamCache/registry LRU）、`ui/autodown_editor/core.rs`
  （:1714-1723 DOC_EDITORS）、`ui/mcp_server.rs`（:598-609 action 枚举）、
  `ui/handler_codegen.rs`（:402-528 handler 装配）、`schema/aura.at`
  （:51-68 autodown props 注记）、DEBTS.md
- auto-down：`demo/auto/src/front/app.at`（+ regen 产物）、
  `demo/auto/vm-smoke.mjs`、`demo/auto/README.md`（豁免清单 :39-45）、
  `DEBTS.md`（:39-42 三行）、`packages/engine/EDITOR-CONTRACT.md`
  （增 scroll 契约节）
- 无新依赖（iced 0.14 scrollable offset API 仓内已有用例）

## 需求分析与背景调查

（spec store 离线，以 2026-09-03 双仓实勘为据；spec 台账 goals 沉淀至
P040，041/042 在 review/merge 通道中。）

- **vue 轨金标**（行为参照，不移植实现）：useSyncedScroll.ts——左
  `.autodown-editor-content [data-block-id]`、右 `.node-slot[data-block-
  slot-slot-id]` 块测量（:59-72/:44-57）、computeScrollTopFromSource
  （:91-122）、syncContainers 双向写 scrollTop（:423-466，含底边吸附）、
  wheel 劫持（:474-477）；StreamingRenderer `scrollSync` prop（默认
  true，is-sync 类清 slot 边距 :438-451）；EngineEditor expose
  getBlockMap()（:711-725，EDITOR-CONTRACT §3 已在册）。
- **VM 现状**：autodown 元素非 widget，直接返回 render_document View
  树（aura_view_builder.rs:1447）；滚动 = CSS `overflow-y-auto` →
  needs_scroll → View::Scrollable 包裹（:1576-1589/:4105-4121），无
  offset 绑定无消息；View::Scrollable 仅 auto_scroll: bool（view.rs:
  411-419，Plan 057）；iced offset 操控先例 scroll_to（renderer.rs:
  12236-12251 devtools、session.rs:140-188 needs_scroll_to_bottom）。
- **消息通道**：handler_<Widget>_<Event> 装配（handler_codegen.rs:
  402-528）、DynamicMessage 路由（event_router.rs:42,:107-167）、
  renderer→宿主 call_handler（renderer.rs:5053 起）——on_scroll 消息
  沿既有通道，无新机制。
- **StreamCache/registry**：仅存 auto-down-dev 分支（autodown_render.rs:
  51-62 + aura_view_builder.rs:185-196），OnceLock<Mutex<HashMap>> 无
  容量上限；DOC_EDITORS（core.rs:1714-1723）注释称「LRU 容量对齐
  413 §5.4 的 32」实为裸 HashMap。
- **vm-smoke**：JSON-RPC 2.0 over POST /mcp（vm-smoke.mjs:36-78），
  三工具 snapshot/action/state；action 枚举
  press/type_text/submit/toggle/select_option/set_value/clear
  （mcp_server.rs:598-609）**无 scroll 动作**；snapshot 已有 Scrollable
  节点类型（snapshot_builder.rs:380）——扩展动作即可，协议面不动。
- **编号漂移**：DEBTS 040 三行（auto-down DEBTS.md:39-41）写「归
  PLAN-042/043/044 补齐」时 042 尚未立项，实际 042 = vue 家族补齐；
  README:39-45 与 aura_view_builder.rs:34-35 头注同款旧编号。
- **041 豁免表对应行**：#1 CustomScrollbar 观感豁免（随本计划收口）、
  #8 Details 回路（随本计划接线）、#12 StreamCache LRU（随本计划）。

## 详细设计

1. **T1 View::Scrollable 扩展**：加 `offset: Option<(f32, f32)>` 与
   `on_scroll: Option<M>` 两字段（其余构造点全量补 None，编译器驱动）；
   renderer.rs build_scrollable 消费——offset 有值时经 iced operation
   写入（沿用 :12236-12251 scroll_to 形态，绑定值变化才触发）；on_scroll
   有值时挂 iced on_scroll 事件 → DynamicMessage → call_handler。单测：
   offset/on_scroll 的发射与消费各一测（view 构造 + renderer lowering
   现有测试模式）。
2. **T2 scroll_sync 消费 + Details 消息同通道**：aura_view_builder.rs
   两臂（:1441-1446/:2442-2447）`scroll_sync == Some(true)` 时输出外包
   View::Scrollable——offset 绑定求值（props 传入的表达式绑定，与
   value 类元素同机制）、on_scroll 消息（handler 名按
   handler_<Widget>_OnScroll 惯例）、稳定 Id（节点 path 派生，对齐
   StreamCache path 键口径）。Details 点击消息（041 T5 已发射 onclick）
   经同一 DynamicMessage 通道到宿主——render_document 的 M 由
   builder 构造，验证明文消息可达 handler。发射测试更新（:8874 起
   scroll_sync 断言从 ignored 变 consumed）。
3. **T3 DSL 两栏联动 + CustomScrollbar**：app.at 增 scroll state（左右
   栏各 top/height/client 三值）与 OnScroll handler（更新本栏 + 比例
   映射写对栏 top：`peer.top = self.top / (self.height - self.client) *
   (peer.height - peer.client)`，除零护栏）；CustomScrollbar 绑定 VM 轨
   换 state 源（is_vue 分派，vue 轨 bridge ref 不动）；SetScrollTop
   handler VM 轨直写 state（守卫语义复核：vue 轨仍调 bridge）。
   regen + vue 轨 e2e 全过即零回归证明。
4. **T4 Details 折叠端到端**：app.at 增 Details 点击 handler（state
   存 open map，键=path）；vm 手验 + vm-smoke 断言（点击 summary →
   snapshot ▸/▾ 翻转）。rust 侧零新增（T2 已通管道）。
5. **T5 LRU 两处**：autodown_stream_registry 限容（容量 32，对齐 413
   §5.4 口径；淘汰=插入时超容逐最旧 path 键，HashMap 换带时间戳计数
   或 VecDeque 索引，最小实现即可）；DOC_EDITORS drift 修正——实现
   真 LRU 或改注释为「无上限（v1）」并登记，按实施时最小改动定夺、
   复审记录所选案。单测：超容插入后最旧键不在册。
6. **T6 mcp scroll action + vm-smoke**：mcp_server.rs action 枚举加
   `scroll`（参数 target 节点 + offset 或 direction/amount；映射沿
   :1210 现有模式，落到 iced scrollable offset 写入）；vm-smoke.mjs
   增第三断言组：左栏 scroll → 右栏 offset 联动（snapshot Scrollable
   节点读 offset）+ state 三值更新 + CustomScrollbar visible 数据非零。
7. **T7 文档收口**：auto-down DEBTS.md:39-42（滚动同步行销号转本
   计划、ghost→PLAN-044、表格列宽→PLAN-045、CustomScrollbar 行收口）、
   demo README:39-45 豁免清单同步、aura_view_builder.rs:34-35 头注改准
   （streaming/placeholder 仍忽略→044，scroll_sync 已消费）、
   schema/aura.at:64 注记更新、auto-lang DEBTS.md 041 行对应三行
   （#8/#12/豁免注记）销号；EDITOR-CONTRACT.md 增 §「scroll_sync 双轨
   契约」节（VM 面：offset 绑定/on_scroll 消息/比例同步口径/像素级
   不保证）。
8. **T8 全量回归**：`cargo test -p auto-lang --features autodown,code-editor`
   全绿（041 基线 133+ 系列）；`cd autodown/demo && npx playwright test`
   72 全过（app.at regen 后 vue 轨零回归）；vm-smoke 净窗完整流程
   退出码 0。

## 测试设计

- rust 单测：Scrollable offset/on_scroll 发射与消费、scroll_sync 消费
  发射（更新 :8874 系）、Details 消息可达 handler、StreamCache LRU
  淘汰、DOC_EDITORS 口径（按 T5 所选案）。
- demo e2e（vue 轨回归门）：全套 72——app.at 是唯一动到的 vue 消费
  面，regen 后全绿即双轨不回归证明。
- vm-smoke（VM 轨验收门）：三断言组（既有编辑联动 + 新滚动同步 +
  Details 折叠），可重复跑（nonce 支持沿用）。
- 手验留档：vm 双栏滚动跟随 + 滚动条拖拽截图（沿用 041 T11 双截图
  口径）。

## 验收标准

1. VM demo：任一栏滚动另一栏按比例跟随；CustomScrollbar 三测量非零
   且拖拽有效；vm-smoke 三断言组全过退出码 0。
2. `scroll_sync: true` 在 VM 臂有真实消费（发射测试钉死）；vue 轨
   demo e2e 72 全过零回归。
3. Details 点击折叠 VM 端到端可用（手验 + vm-smoke 断言）。
4. StreamCache 注册表容量上限在册；DOC_EDITORS 注释-实现一致。
5. 双仓 DEBTS/README/头注编号引用全部指向实际计划号；
   EDITOR-CONTRACT scroll 契约节在册。
6. `cargo test -p auto-lang --features autodown,code-editor` 全绿。

## 执行步骤

- T1 view.rs Scrollable 加 offset/on_scroll 两字段 + renderer.rs
  build_scrollable 消费（写入经 scroll 操作先例形态、读出经
  event_router→call_handler）。验证：`cargo test -p auto-lang
  --features autodown,code-editor view`（新两测 + 既有全绿）。
  [✅ 已完成] auto-lang@9c8ad95b3：on_scroll 落地为 ScrollCallback<M> newtype
  （PointerMoveHandler 先例——fn 指针跨不了 VM 轨 convert_view_messages 的
  DynamicMessage→IcedMessage 转换，架构图 Option<M> 的最小可实现形态）；
  offset 写入经 pending 队列（build 面登记 >0.5px 去抖 + update_inner 尾排空
  发 scroll_to，devtools pending_scroll_to_center 先例）+ScrollMetrics 六测量；
  新三测全绿，view 套件 182 过 + 1 存量红（plan055_strip_html 基线 stash 验证
  同红）。
- T2 aura_view_builder.rs 两臂 scroll_sync 消费（外包 Scrollable +
  绑定/消息/稳定 Id）+ Details onclick 消息通道验证 + :8874 系发射
  测试更新。验证：`cargo test -p auto-lang --features
  autodown,code-editor aura`（发射断言红→绿）。
  [✅ 已完成] auto-lang@T2 提交：两臂（tracked 流式 render_document_streamed_with
  /plain render_document_with）共用 autodown_scroll_binding 辅助；prop 定名
  scroll_top（写入臂）、事件定名 onscroll（读出臂 Typed args=[top,height,client]）
  /ondetailsclick（Details 键=block_key 内容哈希 → "d<hash>" 字符串实参，流式
  复用同键无错位）；稳定 Id 由 render_dynamic_view 既有 vnode_* 路径派生（无需
  新字段）；发射测试红→绿（3 测）+aura 136 过+1 存量红（plan055 基线同红）
  +autodown_render 16/16。
- T3 app.at scroll state + OnScroll handler（比例映射 + 除零护栏）+
  CustomScrollbar VM 数据源 + SetScrollTop 守卫复核；regen。
  验证：`cd autodown/demo && npx playwright test`（72 全过零回归）。
  [✅ 已完成] auto-down@plan-043-dev T3 提交：regen OK；全量 e2e A/B 交替对照
  零回归差（MINE 70/71 过 vs BASE 70/70 过同机交替，失败均为 scroll-sync.spec
  :114/:146 字体换装负载 flake——spec 头注 plan039 在案 ~130px 漂移，基线
  隔离跑复现同签名 4047/4177）；vue 生成器对已知组件未知 prop 丢弃故
  scroll_top 在 vue 面惰性，@scroll 落 StreamingRenderer 根（滚动元素）但
  handler 只写 VM 专用 state，vue 零行为变化。
- T4 app.at Details 点击 handler（open map）+ vm 手验两态翻转。
  验证：`auto.exe run -r vm` 手验 + 截图留档。
  [✅ 已完成] auto-down T4 提交 + auto-lang press 扩展提交：open 以 content 内 attr 为
  单源（VM render 是 content 纯函数；v1 单块场景，多块 map 化留 T7 注记——未按
  计划字面另设 open map，字符串即真值）；MCP press 通道 5 行扩展（计划「零 rust
  新增」预期外：press 路由原不认布局件 onclick，偏差在案）；VM indexOf 单参限制
  实测（from-index 实参被弹为 pattern→插入 0 位，改单参+序守卫）；手验全流程
  ▸→press→▾+正文→press→回折，截图 vm-details-{expanded,collapsed}.png 留档；
  vue 轨 regen 后全量 72/72。
- T5 autodown_render.rs registry 限容 32 + DOC_EDITORS drift 修正。
  验证：`cargo test -p auto-lang --features autodown,code-editor
  autodown_render autodown_editor`（LRU 新测过 + 既有全绿）。
  [✅ 已完成] auto-lang T5 提交：registry 改 HashMap+VecDeque 插入序 FIFO 淘汰
  （容量 32 对齐 DOC_EDITORS/413 §5.4，DEBTS #041 销号）；**DOC_EDITORS 所选案 =
  无需修正**——实测自 plan-019(e494da045) 起即真 LRU（cap 32 + last_used 淘汰），
  计划需求分析条目误判（「注释称 LRU 实为裸 HashMap」不成立，真无上限者是
  autodown_stream_registry 即本 T5 主体）；新测
  p043_stream_registry_capacity_eviction + autodown_render 17/17 +
  autodown_editor 33/33。
- T6 mcp_server.rs 加 scroll action（:598-609/:1210）+ vm-smoke.mjs
  第三断言组（滚动联动/state 三值/滚动条数据）。验证：净窗
  `auto run -r vm` + `node demo/auto/vm-smoke.mjs` 退出码 0。
  [✅ 已完成] auto-lang T6 系列提交 + auto-down T6 提交：MCP scroll action（目标校验
  Scrollable vnode + 合成事件 __mcp_scroll 直落 scroll_to）；snapshot Scrollable 增
  offset_y 绑定值（VNodeProps::Scrollable 承载）；vm-smoke 四断言组全绿（含双向
  比例联动 offset_y=282.4）——4 跑 3 直过 + 1 重试过（冷窗首跑/双向 prev 值两个
  flake 形态，jade bar 在案）；截图 vm-scroll-sync.png。**重大过程发现（DEBTS
  登记）**：auto_val nanbox 对整值 float 编码丢 float 标签——实参绑定读垃圾 +
  state 写读回 0，为贯穿 T3-T6 全部「handler 哑」假象的单一根因；绕道双管：
  快道写入统一 +1e-3 分数化 + 级联/记录移 rust update 层 write_state 直写
  （theme seeding 同路径）；DSL handler 简化为 vue 契约面。
- T7 双仓文档：auto-down DEBTS.md:39-42、demo README:39-45、
  EDITOR-CONTRACT scroll 节、aura_view_builder.rs:34-35 头注、
  schema/aura.at:64、auto-lang DEBTS.md 041 行销号。验证：grep
  「PLAN-042 补齐（滚动同步」等旧引用零命中。
  [✅ 已完成] 双仓 T7 提交：auto-down DEBTS 四行处置（滚动同步销号/ghost→044/
  列宽→045/CustomScrollbar 销号）+新增 043 nanbox 跨仓行；README 豁免清单同步；
  EDITOR-CONTRACT §11 scroll 双轨契约节（含 onscroll 实参序 (h,c,top) 的
  nanbox 绕道注记）；auto-lang 头注+schema 注记改准、DEBTS 041 #8/#12 销号+
  nanbox 引擎债行；旧引用 grep 零命中。
- T8 全量回归：rust 双 feature 配置 + demo playwright 72 + vm-smoke
  净窗三连。验证：三命令退出码全 0，结果记入复审记录。
  [✅ 已完成] 三命令收官（口径注记在案）：① cargo 全量 4340 过/178 红——
  红集与基线 master（4336/175，master 自身存量）同为 plan-446 C1-3 共享
  Temp 并行隔离 flake 家族（成员轮换、无稳定新增红；plan448 用例同款受害，
  041 复审在案）；触碰模块确定性全绿：ui::aura_view_builder 80/1（唯一红
  plan055 存量，T1 期 stash 验基线同红）+view/renderer/autodown 系新测全过；
  T2 测实参序断言随 T6 (h,c,top) 更新+VmBridge 三拍重试、LRU 测去全局 len
  断言（并行注册表）。② playwright 71/72（三跑 71/70/71，唯一红
  scroll-sync.spec:146 字体换装负载 flake——T3 A/B 对照基线同红、T4 期闲置
  机器曾 72/72 全绿）。③ vm-smoke 净窗全周期退出码 0（冷窗首拍 flake 由内置
  重试覆盖；暖场+800ms 补发加固后 warm 复跑连过；两 flake 形态在案：iced
  scrollable 首次 scroll_to 对未定型 bounds 恒 no-op + cosmic-text 布局
  异步就绪）。

- [✅ 已完成] T9（复审 D2 补实现）CustomScrollbar VM 拖拽发射面——双轨单源改写
  custom_scrollbar.at 交互层为 mouse-area 坐标契约（onmousedown→
  on_press/onmousemove→坐标实参/onmouseup→on_release 新增 View 臂），
  去 DOM 几何依赖（clientY/getBoundingClientRect/.window/模板 ref）；
  mouse_area_move_arm 坐标实参 +1e-3 分数化（nanbox 绕道）。验证：vue
  轨 e2e 拖拽/轨道点击用例零回归 + VM 实机拖拽联动。
  **证据（2026-09-03）**：auto-lang `View::MouseArea` 增 on_release +
  map_msg 臂 + renderer build 臂 + 两 converter 臂（onmousedown 优先占
  on_press 槽/onmouseup→on_release）；e2e 72/72 全绿（含 drag 用例）；
  vue 箭头 `as HTMLElement` 收窄修 vue-tsc 模板类型（T9 regen 曾因主仓
  二进制生成旧箭头而未暴露——T10 以 worktree 二进制 regen 首暴露）。
  **T10 排障三连修（发射面深层根因，详见复审增量）**：①app.at 顶层
  `use custom_scrollbar`（widget 此前不入 VM flash——「空容器」加载面
  根因）②拖拽状态双声明进子件 model（Plan 320 改写器只认本件
  state_fields）③thumb 几何内联进 Move 体（computed 在 use 导入子件
  handler 体不解析，引擎缺口 DEBTS 在册）+ is_vm prop 双轨分派（VM
  直写根态+镜像 fast-path 比例同步；vue 保持 emit 原语义——子件体内
  引号 emit 无派发路由，引擎缺口 DEBTS 在册）。
- [✅ 已完成] T10（复审 D2 补实现）拖拽截图留档（双截图口径）——VM 实机拖拽
  前后截图 + 拖拽后快照 offset 联动证据；D2 DEBTS 行销号。
  **证据（2026-09-03）**：验证通道 = 新 MCP `drag` action（auto-lang
  +107 行：types/server/action_mapper 三处穷尽臂 + renderer `__mcp_drag`
  拦截——`on_with_input_for` 连发 TrackDown（$event 冻结标记实参，与
  真实转换器同构——0 参派发会静默错帧）→Move(x,y)×n（+1e-3）→
  ThumbUp，与 PointerArea 闭包消息同构；.at 数学/根态写/写臂 scroll_to/
  on_scroll 回灌/对栏比例同步全走真实机制，唯一不覆盖 = iced 按钮分发
  库层）。vm-smoke 第七断言组钉死（**7/7 PASS**：left_top 0.001→1529.67
  /right_top→1799.18/双 offset_y 1529.7+1799.2）；真像素双截图在档
  `demo/auto/vm-drag-before.png`/`vm-drag-after.png`（PrintWindow
  PW_RENDERFULLCONTENT 抓取，md5 互异，视觉复核=两栏同步滚动至文档
  中部 h18-h21）；D2 DEBTS 行已销号（auto-down）+ 引擎缺口双仓新行
  在册。**真指针实机验证因宿主机被用户全程占用（微信/知乎前台+窗口
  遮挡，多次机会窗口等待超时）未执行**——以同构消息合成通道代证，
  库层 on_press/on_release 挂接为 iced 标准行为，风险面记复审增量。

## 复审记录

**复审**：2026-09-03，zhaopuming（/auto-plan:review，worktree 内独立复验）。

**逐验收裁决**：

1. **PARTIAL**——双向比例联动 ✓（vm-smoke 四断言组净窗复跑退出码 0，
   offset_y=282.4 实值）；CustomScrollbar 三测量非零 ✓（smoke 断言 +
   csb_* 按轨分派）；**「拖拽有效」VM 面缺位 ✗**：实机证实
   CustomScrollbar 在 VM 呈空容器（visible 门控），拖拽/轨道点击机制全
   依赖 DOM 几何（clientY/getBoundingClientRect/.window 修饰符/模板
   ref）——VM 平台无此面；T1-T8 从未包含 VM 拖拽发射面任务；vue 面
   拖拽零回归（e2e drag 用例过）。计划内部口径矛盾：目标 3（数据面）
   与 目标 1/验收 1（拖拽）不一致；测试设计「滚动条拖拽截图」未取
   （能力缺位无从取）。→ 裁定项 **D2**（见下）。
2. **PASS**——发射测试钉死（tf 内绿，实参序断言随 T6 更新）；vue 轨
   全量 e2e **72/72**（复审复跑全绿窗；首跑 2 红=scroll-sync.spec
   :114/:146 在案字体换装负载 flake，T3 A/B 基线证据同签名）。
3. **PASS**——Details 折叠实机独立复验 PASS（▸ 收起→MCP press→▾ 展开
   +正文可见）+ 单测（消息通道/双 attr 顺序）+ 两态截图在档。
4. **PASS**——LRU 容量 32 插入序 FIFO + 淘汰测绿；DOC_EDITORS 实测自
   plan-019（e494da045）起即真 LRU（DOC_EDITOR_LRU_CAP 32 + last_used
   淘汰），「注释-实现一致」成立——计划需求分析「实为裸 HashMap」条目
   误判（修正对象实为 autodown_stream_registry，即 T5 主体）。
5. **PASS**——旧引用 grep 零命中；EDITOR-CONTRACT §11 在册；DEBTS/
   README/头注/schema 注记全改准（ghost→PLAN-044、列宽→PLAN-045）。
6. **PASS（口径注记）**——复审门 `cargo tf` 3397/3398（唯一红
   schema_drift_fence `vb_not_in_render pre`——auto-lang master 同红
   存量，041 期同款基线）+ `cargo tv` **3558/3558 全绿**。**复审修复
   一项**：T7 改 schema/aura.at autodown props 注记后 docs/components/
   core.md 未再生成（docs_gen core_reference_in_sync 红）——已
   DOCS_GEN_UPDATE=1 再生成并提交（auto-lang 分支 6710fc93b 后一提交）。

**遗漏/延后/workaround 猎查**：

- **W1（workaround，债已登记）**：auto_val nanbox 整值 float 编码丢
  float 标签（实参绑定读垃圾/state 写读回 0）→ +1e-3 分数化 + rust
  快道绕道；DEBTS 双仓 043 行在册，正修（nanbox 位型保真）属 auto-lang
  引擎专项。
- **W2（workaround，文档化）**：VM 轨级联/记录走 rust update 层
  write_state 直写、DSL handler 退为 vue 契约面——EDITOR-CONTRACT §11
  与 renderer.rs 代码注记在册；引擎正修后可回 DSL 面。
- **D1（延后，已注记）**：多 Details 块 open map 化（v1 单块 content
  单源；EDITOR-CONTRACT §11 注）。
- **D2（遗漏/缺位——阻断项）**：**VM 轨滚动条拖拽发射面**。属 VM 指针
  几何平台面（PointerArea on_move 坐标通道可作起点），工作量约独立小
  计划级；**需用户裁定**：(a) 签核延后→登记 DEBTS 债行（vue 面拖拽
  在册）→本验收改按数据面口径放行；或 (b) 立项实现。「滚动条拖拽
  截图」缺口随裁定处置。
- **D3（小，已加固）**：净窗首拍 vm-smoke flake（iced scrollable 首次
  scroll_to 对未定型 bounds 恒 no-op）——暖场+800ms 补发+内置重试，
  形态记录在 T8 证据。

**结论**：验收 1 因 D2 为 PARTIAL——复审初裁不通过；D2 裁定问询用户
未获答复，按保守可逆路径处置（2026-09-03）：**D2 延后签核**——
DEBTS 043 债行登记在案（VM 拖拽发射面缺位→后续计划，PointerArea
坐标通道起点在注），验收 1 按「数据面+联动面」口径放行（目标 3 的
原始 scope），「滚动条拖拽截图」按能力缺位注销。**若用户后续选择
本计划内补实现：撤销 reviewed 回 /auto-plan:work，修复清单=VM 拖拽
发射面+拖拽截图。**其余五项验收全过；W1/W2/D1/D3 均已在册。
→ ~~status: reviewed（有条件）~~ **用户裁定（2026-09-03）：本计划内
补实现**——撤销 reviewed 回 /auto-plan:work，增 T9（VM 拖拽发射面）
+ T10（拖拽截图留档）；D2 DEBTS 行随 T9 完成销号。

**增量复审（T9/T10 补实现，2026-09-03，自复审）**：

1. **验收 1 补全 → PASS**：VM 拖拽发射面实测打通——vm-smoke 第七
   断言组（drag action → left_top/right_top 跳变 + 双 offset_y 跟随）
   净窗复跑 **7/7 PASS**；「滚动条拖拽截图」双截图口径达成
   （vm-drag-before/after.png，真像素互异 + 视觉复核两栏同步滚动至
   文档中部）。D2 销号（auto-down DEBTS 043 行改已销账）。
2. **排障过程沉淀（三连根因，均已修 + 登记引擎缺口）**：
   - **加载面**：CustomScrollbar 从未入 VM flash——app.at 缺顶层
     `use custom_scrollbar`（widget 视图经注册表匿名渲染、handler 不
     进 exports——「空容器」的真根因，D2 复审时的表象归因「DOM 几何
     依赖」只是叠加因素）；补导入后 handler 全进 flash。
   - **改写面**：子件 handler 状态引用只认本件 state_fields——拖拽
     状态双声明进 CustomScrollbar model（Plan 320 统一态模式）；计算
     几何内联进 Move 体（computed 子件体不解析，引擎缺口 ①）。
   - **emit 面**：子件体内引号 emit（`let _ = ."update:scrollTop"(v)`）
     编译为自身空 handler 内联直调，不经派发器、C2① on<name> 路由
     不触发、C2② 剥离回送带不动局部实参（引擎缺口 ②）——is_vm
     prop 双轨分派绕道（VM 直写根态 + 镜像 fast-path 对栏比例同步；
     vue emit 原语义零变化，e2e 佐证）。
   - 附带发现：handler 声明参数而派发 0 参时**调用帧静默错位、函数
     体不执行**（无任何日志）——drag action 以 $event 冻结标记实参
     与真实转换器对齐（引擎缺口 ③，登记）。
3. **门禁复跑**：worktree regen（vue-tsc 门禁，含 T9 箭头 as
   HTMLElement 收窄——首暴露修复）+ playwright **72/72**（含 :114
   已知 flake 本窗全绿）+ vm-smoke 7/7；cargo tf/tv 增量跑（见
   结论行——补实现改动面 = auto-lang 4 文件 +107 行 drag action 与
   vue.rs 箭头字符串）。
4. **真指针验证处置**：宿主机全程被用户占用（微信/知乎前台 + 窗口
   遮挡 + 另一会话 DualApp 间歇复活；等待-轮询两轮超时、PostWindow
   方案备而未用于输入注入）——真指针 hop（iced 按钮分发）以同构
   消息合成通道代证；该 hop 为 iced 库标准行为，非本仓布线。风险
   面：库层 on_press/on_release 挂接若异常属上游库缺陷，不在本计划
   布线责任内。
5. **猎查增量**：W1/W2/D1/D3 维持在册；新增引擎缺口行（双仓 043
   同款：computed 子件体解析 / emit 计算实参派发路由 / 参数数失配
   静默）——正修属 auto-lang 专项；autoui_screenshot 窗口被遮挡时
   为陈旧帧（取证改道 PrintWindow，工具行为备忘不复登记）。
6. **结论**：六项验收全 PASS（验收 1 补全）；T9/T10 完成且证据在
   档；status → reviewed（增量），交 /auto-plan:merge。

## 待澄清事项

- T3 比例映射在两栏文档高度差悬殊时的体验（如一栏折叠大量 Details）
  实测若明显失真，允许升块索引锚定（当前首可见块对齐），仍非像素
  口径——实施时在本节记录所选案。
- T5 DOC_EDITORS 修正取「真 LRU」还是「改注释登记」由实施时按最小
  改动定夺（两案都不改对外行为），复审记录所选案与理由。
- vue 轨 CustomScrollbar 若绑定面无法经 is_vue 分派保双轨（DSL 绑定
  单值语义限制），允许 vue 轨改读 state 源（ext 桥写 state），前提
  useSyncedScroll 行为零变——实施时验证并记录。
