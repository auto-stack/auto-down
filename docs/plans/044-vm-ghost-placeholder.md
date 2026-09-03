---
plan_id: PLAN-044
status: reviewed
feature_name: VM ghost 占位块（编辑壳聚焦跟踪 + DocLayout 尺寸暴露 + 只读臂 ghost 渲染）+ vue 侧发射者点亮
author: [zhaopuming]
created_at: 2026-09-03
updated_at: 2026-09-03

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components:
  - "P040-4（demo 单源化+双轨契约扩展·详细设计）: 修改——placeholder_block_id/placeholder_height 双 prop 的 VM 臂叙事从「读取后忽略（豁免归 PLAN-044 补）」改为「PLAN-044 起真消费」（只读臂绑定求值进 render：block-N 顶层索引命中块前置 View::Container 定高灰盒；编辑臂 onfocusblock 事件进 on_focus 消息读出臂）；streaming 恒 final 豁免保留不动；DEBTS 040 ghost 行随之销号"
  - "P043-4（EDITOR-CONTRACT scroll 双轨契约/宿主消息通道·详细设计）: 修改——043 建立的宿主消息通道（View 扩字段 newtype 回调 + update 层 rust 直写快道 + MCP 合成事件面）复用扩至 ghost 面：onfocusblock 事件（FocusCallback/FocusMetrics 载荷）+ OnEditorFocus write_ghost_state 直写 + MCP click action（__mcp_click 合成点击，__mcp_scroll/__mcp_drag 同族）"
new_spec_components:
  - "P044-1: reports——变更摘要（VM 三件套：block_rects 尺寸暴露/on_focus 消息通道/只读臂 ghost 盒；vue 发射者 @focusblock 点亮 editingBlock；双轨 placeholder 真消费；待澄清①-③执行期落定：vue 尾沿 gate/push-emit+onfocusblock 定名/缓存存裸块）"
  - "P044-2: goals——五目标（点击→定高灰盒+vm-smoke 钉死/双 prop 双轨真消费/契约注记在册/DEBTS 040 销号/streaming 语义不变）全达成；「聚焦即灰盒」vue 臂结构性不可行（useSyncedScroll 补偿 margin 打断 zero-jump）经待澄清①预授权 gate 落定"
  - "P044-3: architecture——FocusMetrics{block:Option<usize>,height:f32}+FocusCallback<M> newtype（ScrollCallback 同款跨消息换型）；DocEditor.publish 焦点现场打包（block_rects 取高，宿主零查询）；render_document_with/_streamed_with 第 4 参 placeholder（streamed 缓存存裸块、包装每帧重建）；aura_view_builder autodown_placeholder/autodown_on_focus_binding；renderer OnEditorFocus 拦截 + write_ghost_state（ghost_id 'block-N' 字符串/ghost_height +1e-3 分数化）+ __mcp_click"
  - "P044-4: designs——EDITOR-CONTRACT §1 ghost 双轨 VM 面（消息通道/state 单源/行为对齐非像素）+§3 @focusblock 行（push-emit 裁定/载荷/250ms 尾沿 gate/VM 臂无 gate 分置）；MCP click action 契约（element_id=autodown_editor vnode、value='x,y' 内容坐标、__noop 回发重绘）；vue gate 裁定（连续 dirty>250ms 才发射、纯选区发 null、replaceDoc seed 抑制）"
  - "P044-5: tests——block_rects 快照测/焦点消息可达测（sync_external 须闭包外防 RwLock 重入死锁坑）/renders_placeholder 两态+二帧复用/发射测试 ignored→consumed 翻转/编辑臂 onfocus 消息通道测/playwright 真链路用例（gating 语义：纯点击不亮、聚焦+输入→ghost、点走→清空）/vm-smoke 第四断言组（state 主断言+快照 col[空container,block] 包装形全树搜）/双态实拍 vm-ghost-at-block0|block2.png"
  - "P044-6: reviews——复审记录（tf 3397/3399 两红均 fork+master 双同红预存/schema_drift 'vb_not_in_render pre'=PLAN-055 pre/code 臂遗留、kitchen_sink 同；tv 3559 全绿；playwright 73/73 两复跑；净窗 smoke 两复跑 exit 0；core_reference core.md 再生成复审修复在档）"
touched_goals:
  - "目标1（VM 点击→定高灰盒、焦点移走消失、vm-smoke 钉死）: 达成——净窗 smoke 两复跑 exit 0 + 双态实拍（muted 带 86 行随焦点移位 199px）；失焦变体（block=None→(-1,0.0)）消息级实现+单测，VM v1 无窗口失焦清块焦点的输入路径（预存编辑器语义）以焦点迁移清除旧位代证"
  - "目标2（placeholder 双 prop 双轨真消费）: 达成——VM 发射测试 ignored→consumed 钉死 + vue demo 自然态 ghost（typing gate 语义，待澄清①落定）+ e2e 真链路绿"
  - "目标3（rust 全绿+demo e2e 全套绿）: 达成——tf 3397/3399（2 红=fork+master 双同红预存，A/B 证据在复审记录）+ tv 3559 全绿 + playwright 73/73 两复跑（含新旧 ghost 用例）"
  - "目标4（契约/DEBTS/注记收口）: 达成——EDITOR-CONTRACT §1/§3 在册、DEBTS 040 ghost 行销号、双短语 grep 零命中（aura.at 编辑壳 placeholder 空态文案 prop 为不同 prop 计划明示豁免保留）"
  - "目标5（streaming 语义不变）: 达成——两臂 let _ = streaming 保留、恒 final 注记在册、无行为改动（复审 grep 复核）"

current_step: 8
total_steps: 8
---

# [PLAN-044] VM ghost 占位块 + 双轨点亮

## 变更摘要

DEBTS 040 三大平台豁免之二：`placeholder_block_id`/`placeholder_height`
双轨契约在案（schema/aura.at:62-63），vue 臂消费、VM 臂读取后忽略
（aura_view_builder.rs 两臂，worktree 058aa7df5 行号 :1454-1461/
:2557-2562）。本计划落地 VM ghost 占位，并修复一个实勘发现的
**双轨共同缺口**：

1. **实勘关键事实**：vue 侧 ghost 也从未真正点亮——demo 的
   `editingBlock` 恒 null 且全仓无写入者（app_ext.ts:20-22,46 注记
   "reserved, always null today"），EngineEditor 不外发聚焦块
   （engine.selection.anchor.blockId 只在内部 :486），唯一可见路径是
   e2e 手工注入占位（scroll-sync.spec.ts:89-111）。**VM 编辑壳反而
   有现成聚焦状态**：`focus: Mutex<Option<usize>>`（块索引，
   core.rs:358）+ `focused_block()` pub（:406-408），点击 hit_test
   写入（:865-868）。
2. **VM 三件套**（路线图原文）：编辑壳块聚焦跟踪（focus 变化 →
   on_focus 消息，携带块索引 + DocLayout 高度）+ DocLayout 尺寸暴露
   （layout 私有无 getter，加 pub 快照）+ 只读臂 ghost 渲染
   （`View::Container{height, bg-muted}` 灰盒，无新 View 变体）。
3. **vue 侧发射者点亮（搭车，双轨闭环）**：EngineEditor expose/emit
   聚焦块（anchor blockId :486 + getBlockMap() 的 BlockInfo.height，
   block-map.ts:8 现成）→ demo bridge 写 `editingBlock` → app.at
   state 单源（与 043 scroll state 同模式，不分轨双源）→ vue demo
   ghost 自然态可见，e2e 从手工注入升级真链路。
4. **豁免收口**：placeholder 两 prop 从 ignored 变消费；streaming
   prop 维持恒 final（vue 金标 ghost 显示不 gate streaming——
   StreamingRenderer applyBlockIdsAndPlaceholder :250-315 只看
   placeholder props 非 null，本计划与 vue 同构，不动 streaming 语义）。
5. **编号漂移尾单**：DEBTS.md:40 与 demo README:40-41 的 ghost 行
   旧指向 PLAN-043 修准为本计划并销号。

**时序硬前置**：043（滚动同步契约）折入 master——本计划的 on_focus
消息沿 043 建好的宿主消息通道（View 扩字段 + event_router +
call_handler 模式），且 aura_view_builder 消费臂已被 043 T2 改动过。
行号基准：auto-lang 侧给 worktree auto-down-dev @ 058aa7df5（含
041+043 T1/T2）行号，折入后允许平移。

**会话裁定（2026-09-03，防止复议）**：
- **ghost 显示条件 = placeholder props 非 null，不 gate streaming、
  不 gate「内容 dirty」**——与 vue 金标逐字同构（:250-315 实证）；
  若实机体验「聚焦即灰盒」过于激进（任何点击都出现），允许加
  会话级 gate（见待澄清①），但首版不做。
- **消息携带 (block_index, height)，宿主零查询**——高度在 widget
  焦点变化现场从 layout 取（方案 a），不做 DocLayout state 桥/
  autoui_state 轮询；「DocLayout 尺寸暴露」落为 core pub getter
  （widget 内部消费 + 单测锚定），不对 DSL 开放查询面。
- **块 id 口径 = `block-${index}` 顶层索引**——vue 写
  data-block-id="block-${index}"（:295-300），VM 只读臂 Column
  children 顺序同构对应，编辑壳 focus 索引同一解析树，三方同源。

## 目标

1. VM demo：点击编辑栏某块 → 预览栏对应块位置出现定高灰盒
   （高度=该块 DocLayout 实测高），焦点移走/失焦即消失；vm-smoke
   可重复断言。
2. `placeholder_block_id`/`placeholder_height` 双轨真消费：VM 臂
   ignored→consumed（发射测试钉死）；vue demo 自然态可见 ghost。
3. vue 轨 e2e 升级：scroll-sync.spec 手工注入用例保留，新增聚焦→
   ghost 真链路用例；全套零回归。
4. DocLayout pub 快照在册；on_focus 消息通道进 EDITOR-CONTRACT。
5. DEBTS 040 ghost 行销号；README/头注/schema 注记收口。

## 架构方案

```
编辑壳（auto-lang autodown_editor）
  core.rs  focus: Option<usize>（hit_test 点击写入 :865-868）
    + pub layout_snapshot() -> Vec<(rect)>        ← 新：尺寸暴露
  widget.rs 焦点变化现场：
    block_rects()[focus].height 打包 → View::AutodownEditor
    { key, value, is_final, on_focus: Option<M> }  ← 新字段（043 同款
                                                     扩字段非新变体）
        │  renderer build_autodown_editor_generic lowering
        ▼
  DynamicMessage(payload: index,height) → call_handler("handler_.._OnFocus")
        │  （043 宿主消息通道，零新机制）
        ▼
demo app.at（DSL 层，state 单源不分轨）
  state: placeholder = { id, height }   ← VM：OnFocus handler 写入
  vue：EngineEditor emit/expose 聚焦块 → app.vue → bridge.editingBlock
       写值 → placeholder computed 读 state（app.at:66-67 改源）
        │
        ▼  绑定求值（043 offset 绑定同机制）
aura_view_builder.rs 两臂（:1454-1461 / :2557-2562）
  placeholder_block_id/placeholder_height 读取后传入 render
        │
        ▼
autodown_render.rs（render_document_with :35-50 沿 _with 加参模式）
  plain 臂 children 循环（:40-49）/ streamed 臂（:120-134）：
  index == placeholder.id 的块 View 前并列插入
  View::Container { height, style: "bg-muted rounded-lg", child: 空 }
  （对齐 vue 语义：ghost 插块内容之前，:302-314 同构）
```

**vue 轨不回归保证**：engine 改动仅加法（expose/emit 聚焦块），
EDITOR-CONTRACT §3 expose 表同步；demo 侧 bridge.editingBlock 从
死状态变活，scroll-sync.spec 手工注入用例不删（占位注入路径与
真链路并存）。

## 技术栈

- auto-lang（Rust，043 折入后的 master）：`crates/auto-lang/src/ui/
  view.rs`（View::AutodownEditor 扩 on_focus）、`ui/iced/renderer.rs`
  （build_autodown_editor_generic 消费）、`ui/autodown_editor/
  {core.rs,widget.rs}`（layout_snapshot + 焦点消息）、
  `ui/autodown_render.rs`（ghost 盒插入 + render_document_with 扩参）、
  `ui/aura_view_builder.rs`（两臂 placeholder 消费 + 文件头注记）、
  `ui/render_support.rs:193-199`（props 认知清单）、`schema/aura.at`
  （:61-63 注记）、DEBTS.md
- auto-down：`packages/engine/src/editor/components/EngineEditor.vue`
  （聚焦块 expose/emit）、`packages/engine/EDITOR-CONTRACT.md`（§3
  expose 表 + ghost VM 面）、`demo/auto/src/front/app.at`（placeholder
  state 化 + OnFocus handler）、`demo/src/front/utils/app_ext.ts`
  （editingBlock 活化）、`demo/src/App.vue`（regen 镜像）、
  `demo/e2e/scroll-sync.spec.ts`（真链路用例）、`demo/auto/vm-smoke.mjs`
  （断言组）、`demo/auto/README.md`、`DEBTS.md`
- 无新依赖

## 需求分析与背景调查

（spec store 离线，以 2026-09-03 双仓实勘为据，worktree
auto-down-dev @ 058aa7df5；spec 台账 goals 沉淀至 P040。）

- **vue 金标**：StreamingRenderer props（:88-103，
  placeholderBlockId/placeholderHeight/streaming/scrollSync）；
  applyBlockIdsAndPlaceholder（:250-315）——写
  `data-block-id="block-${index}"`（:295-300），ghost=div.
  autodown-block-placeholder 内联高度插 slot.firstChild 之前
  （:302-314）；clearPlaceholders 只清 .node-slot 直接子级（:195-204）；
  watch 三 props 触发 refresh（:402-406）。占位 div 无 CSS 规则
  （纯内联高，e2e 以 offsetHeight 验证）。`.is-loading` 是另一族
  （open-fence 骨架，plan 032，autodown-editor.css:1171-1180），本计划
  不碰。
- **demo 消费面**：app.at:66-67 computed ← bridge.editingBlock（恒
  null）；:99-101 传 streaming:false + placeholder 双 prop；app_ext.ts
  :46 ref 声明、:20-22 注记；EngineEditor expose 仅 getBlockMap/
  handleSave（:772），emits 仅 update/save/open-wiki-link（:327），
  anchor.blockId 内部 :486。e2e 唯一 ghost 可见路径 = 手工注入
  （scroll-sync.spec.ts:89-111）。
- **VM 编辑壳**：focus: Mutex<Option<usize>>（core.rs:358），
  focused_block() pub（:406-408），点击 hit_test 写入（:865-868），
  rebuild/sync_external 清空（:465、:425-446）；DocLayout/
  BlockLayout{rect,origin,font_size,line_height}（:281-293）私有
  （:368），render_frame 计算后写回（:925-1081，块高=layout_runs
  求高 + BLOCK_GAP 累积 :1073）；WidgetState.last_frame 缓存
  （widget.rs:147-148）。DOC_EDITORS LRU cap 32（core.rs:1914-1917，
  043 T5 修过的口径）。
- **VM 只读臂**：render_document(src,is_final)（:27-29）/
  render_document_with(...details_onclick)（:35-50）/ streamed 双入口
  （:96-145）；块循环 plain :40-49 / streamed :120-134（位置前缀 +
  block_key 内容哈希复用）；灰盒现成变体 View::Container
  （height: Option<u16> + style，Tailwind 类串 bg-muted/rounded 先例
  autodown_render.rs:945,:182）；renderer 真消费 background/
  radius（renderer.rs:1180-1235）。**View 树无 block-N 位置键**，
  Column children 顺序即位置事实（与 vue topLevelBlocks 同构）。
- **契约/豁免现状**：aura_view_builder 文件头 :33-37 豁免注记
  （scroll_sync 已随 043 T2 摘行，placeholder 仍在）；两臂
  :1454-1461/:2557-2562 读取后忽略；render_support.rs:193-199 props
  认知清单；schema/aura.at:61-63 注记 "VM v1 ignores — PLAN-043"；
  EDITOR-CONTRACT §1:18 `.autodown-block-placeholder`（块编辑占位，
  滚动同步空挡）；DEBTS.md:40 / demo README:40-41 旧指向 PLAN-043。
- **streaming 语义**：VM 恒 final（core.rs:425-428 编辑器恒按 final；
  悬挂尾 stripDanglingTail，markdown_parser.rs:371-376）；vue ghost
  不 gate streaming（金标实证）——本计划维持，豁免注记只摘
  placeholder 两行。

## 详细设计

1. **T1 DocLayout 尺寸暴露**：core.rs 加 `pub fn block_rects(&self)
   -> Vec<Rect>`（layout 快照，读锁或 clone；Rect 即 BlockLayout.rect
   的平铺）。单测：构造多块 doc → render_frame → block_rects 长度与
   单调 y 断言。
2. **T2 on_focus 消息**：view.rs View::AutodownEditor 加
   `on_focus: Option<M>`（其余构造点补 None，编译器驱动）；widget.rs
   焦点变化现场（hit_test 写 focus 处 :865-868 及失焦清空处）打包
   `(block_index, height_px)`（height 取 block_rects[focus]；失焦=
   index 置 None 的消息变体）→ renderer build_autodown_editor_generic
   lowering → call_handler("handler_<W>_OnFocus")。单测：模拟点击
   后消息可达（沿 041 Details onclick 消息测试模式）。
3. **T3 只读臂 ghost 盒**：render_document_with 扩参
   `placeholder: Option<(usize, f32)>`（_with 签名现 3 参，扩后仍
   可读；若实施中参数再增则收敛为 RenderExtras struct，二选一在
   复审记录）；plain/streamed 两臂 children 循环：index==id 的块
   View 外包 `View::Column{children:[ghost, block], spacing:0}`，
   ghost=`View::Container{height:Some(px), style:"bg-muted rounded-lg
   w-full"}`。结构测试：renders_placeholder（有/无 props 两态、
   streamed 路径同测）。
4. **T4 消费臂接线**：aura_view_builder 两臂 placeholder 双 prop 从
   `let _ =` 变绑定求值（043 offset 绑定同机制：数值 prop 直取，
   null 即 None）传入 render；发射测试更新（ignored→consumed 断言，
   :8874 系模式）；文件头 :33-37 与 render_support.rs:193-199、
   schema/aura.at:61-63 注记摘 placeholder 行（streaming 行保留）。
5. **T5 DSL 接线 + vue 发射者**：app.at placeholder state 化
   （`placeholder = {id,height}`，OnFocus handler 写入/清空；
   computed :66-67 改读 state）；engine 侧 EngineEditor 增加
   focus-block 通道（engine.selection.anchor.blockId :486 → 节流
   emit/expose，高度经 getBlockMap().height）→ app.vue →
   bridge.editingBlock 赋值（app_ext.ts:46 活化）→ 同写 state；
   EDITOR-CONTRACT §3 expose 表增行。regen。验证：vue e2e
   scroll-sync.spec 真链路新用例（聚焦块→ghost offsetHeight 出现/
   失焦消失）+ 手工注入旧用例保留双绿。
6. **T6 vm-smoke 断言组**：vm-smoke.mjs 增第四断言组：action 点击
   块内坐标（沿 type_text 的 target 语法）→ state.placeholder_height
   非零 + autoui_state 轮询到值；snapshot 侧预览栏出现灰盒节点
   （Container→snapshot 节点类型实施时核，断言 state 为主）。
7. **T7 文档收口**：auto-down DEBTS.md:40 ghost 行销号（转本计划
   完成注记）、demo README:40-41 豁免行更新（ghost 已实现；
   streaming 仍恒 final 保留注记）、EDITOR-CONTRACT §1:18 行补 VM
   面口径（消息通道/state 单源/行为对齐非像素）；auto-lang DEBTS.md
   041 系对应行（若有 ghost 相关登记）核对销号。
8. **T8 全量回归**：`cargo test -p auto-lang --features
   autodown,code-editor` 全绿；`cd autodown/demo && npx playwright
   test` 全过（新增真链路用例后总数更新）；vm-smoke 净窗全断言组
   退出码 0；vm 手验截图留档（聚焦块灰盒出现/消失两态）。

## 测试设计

- rust 单测：block_rects 快照、on_focus 消息可达（点击→payload）、
  renders_placeholder 两态（plain/streamed）、消费臂发射断言
  （placeholder consumed）。
- demo e2e：scroll-sync.spec 真链路用例（聚焦→ghost 出现/消失）+
  既有手工注入用例保留；全套回归（app.at regen 后 vue 轨零回归）。
- vm-smoke：第四断言组（点击→placeholder state→snapshot）。
- 手验：vm 双态截图（041 T11 双截图口径）。

## 验收标准

1. VM demo 点击编辑栏块 → 预览栏对应位置灰盒（高=DocLayout 实测），
   失焦消失；vm-smoke 断言过。
2. placeholder 双 prop 双轨真消费：VM 发射测试 + vue demo 自然态
   ghost 可见 + e2e 真链路用例绿。
3. `cargo test -p auto-lang --features autodown,code-editor` 全绿；
   demo e2e 全套绿（含新旧 ghost 用例）。
4. EDITOR-CONTRACT expose 表与 ghost VM 面在册；DEBTS 040 ghost 行
   销号；README/头注/schema 注记无「placeholder ignored」残留。
5. streaming prop 语义不变（恒 final 注记保留，无行为改动）。

## 执行步骤

- T1 core.rs 加 pub block_rects() + 单测。验证：`cargo test -p
  auto-lang --features autodown,code-editor autodown_editor`。
  [✅ 已完成] auto-lang@120235e69：block_rects 快照读出 + 快照测试
  （长度/y 严格单调/块高>0/末块底≈帧高），模块 34 测全绿。
- T2 view.rs View::AutodownEditor 扩 on_focus + widget 焦点消息 +
  renderer 消费 + 消息可达单测。验证：`cargo test -p auto-lang
  --features autodown,code-editor autodown_editor view`。
  [✅ 已完成] auto-lang@b787ac645：FocusMetrics/FocusCallback newtype +
  widget publish 焦点现场打包（高取 block_rects）+ renderer 三消费点；
  单测×2（回调读出含失焦变体；点击→shell 消息可达）。验证：autodown_editor
  36 过 + on_focus 2 过（含 view 测试）。测试坑：sync_external 内部自调
  with_font_system，须闭包外调用防同线程 RwLock 写锁重入死锁。
- T3 autodown_render.rs ghost 盒插入（两臂）+ render_document_with
  扩参 + renders_placeholder 两态测试。验证：`cargo test -p
  auto-lang --features autodown,code-editor autodown_render`。
  [✅ 已完成] auto-lang@a47e654ec：_with/_streamed_with 扩第 4 参
  placeholder（未收敛 RenderExtras，4 参仍直读——复审记录）；ghost =
  Column[Container{height, bg-muted rounded-lg w-full, Empty}, block]
  spacing=0；streamed 缓存存裸块（待澄清③落定：包装每帧重建，复用
  键/代数不抖）；18 测全绿。
- T4 aura_view_builder 两臂消费 + 发射测试 + 三处注记摘行。
  验证：`cargo test -p auto-lang --features autodown,code-editor
  aura`（发射断言红→绿）。
  [✅ 已完成] auto-lang@6ffb12c6e：autodown_placeholder 绑定求值
  （Str "block-N"/Int 双口径）+ autodown_on_focus_binding（onfocus→
  FocusCallback，args=[Int block, Float height]，失焦 (-1,0.0)）+
  发射测试翻转为 consumed + 新增编辑臂 onfocus 消息通道测试；三处注记
  收口（文件头/render_support/schema-aura.at）。aura 138 过（唯一 fail=
  strips_tags_and_decodes_entities 预存 flake，主检出 master 同红证
  与本计划无关）；schema 20 过。
- T5 EngineEditor focus-block 通道 + app.at state 化 + regen +
  EDITOR-CONTRACT expose 行 + e2e 真链路用例。验证：`cd
  autodown/demo && npx playwright test scroll-sync`（新旧用例双绿）。
  [✅ 已完成] auto-down@2773f74 + auto-lang@dfa43e8（T5 半提交）：
  EngineEditor @focusblock emit（onChange 钩挂+lastFocusedId 去重+
  nextTick 量高，push-emit 裁定记 §3）+ app.at ghost_id/ghost_height
  state（名字与 computed 错开防生成层 TS2451）+ 双臂 computed（csb_*
  同模式）+ regen OK（vue-tsc 零错）+ e2e 真链路用例；auto-lang 侧
  OnEditorFocus rust 直写快道（043 T6 同款拦截）。scroll-sync 7/7
  双绿（手工注入旧用例保留）。待澄清②落定：emit 形态、事件名
  onfocusblock（codegen onX→@X 直映）。
- T6 vm-smoke.mjs 第四断言组。验证：净窗 `auto run -r vm` + `node
  demo/auto/vm-smoke.mjs` 退出码 0。
  [✅ 已完成] auto-down@d172518（vm-smoke 第四组）+ auto-lang@6944d2b4c
  （click 前分支 + __mcp_click + write_ghost_state 公用）：MCP click 块内坐标 → state
  主断言（ghost_id="block-0"+ghost_height>0）+ 快照灰盒包装形次断言
  （col[空 container, block] 全树搜——快照格式不发 container height
  prop，实施时核落定）。净窗 9 断言组全过，退出码 0（首拍冷窗滚动
  竞态按既定 jade bar 重试一次过）。
- T7 DEBTS/README/EDITOR-CONTRACT/注记收口。验证：grep
  「placeholder.*ignored」「PLAN-043 补齐（ghost」零命中。
  [✅ 已完成] auto-down@f568ac8：DEBTS 040 ghost 行销号（043 销账同款
  转完成注记）+ README ghost 行更新为 CONSUMED since PLAN-044
  （EDITOR-CONTRACT §1 VM 面已在 T5 落）；auto-lang DEBTS 无 ghost 登记
  核对无差；验证 grep 双短语双仓零命中（aura.at 编辑壳 placeholder
  空态文案 prop 为不同 prop 维持豁免，范围外）。
- T8 全量回归三连（rust 双 feature / demo playwright 全套 /
  vm-smoke 净窗）。验证：退出码全 0，结果记复审记录。
  [✅ 已完成] 三连结果：① rust 全量 4362 过 / 174-181 失败——A/B
  判定 fork 点（eb0ff8a7b，零 044 改动）同跑 177 失败同族（plan-446
  C1-3 Temp canary 共享夹具级联 + plan370 dark_mode/plan055 strips_tags
  隔离亦红=预存/环境，并行会话活跃干扰：主检出工作树半编辑态
  scrollbar_thumb E0425、ui_desktop.exe 文件锁）；本计划增量 scoped
  全绿（autodown_editor 37 / autodown_render 18 / on_focus 3 /
  placeholder 12 / aura 138+1 预存 flake / schema 20）+ cargo check
  0 error。② demo playwright 全套 **73/73 绿**（含新增真链路用例 +
  手工注入旧用例保留；期间发现并修复 vue gate 回归 c278db5——
  待澄清①落定）。③ vm-smoke 净窗两跑（含 __noop 重绘链重编后再验）
  全断言组过退出码 0。④ vm 手验双态截图留档 vm-ghost-at-block0/
  block2.png（物理像素抓取，muted 带 86 行随焦点移位 199px）。
  终提交：auto-down@53ffbe8 / auto-lang@c3d54857c。

## 复审记录

（执行侧摘记 2026-09-03；/auto-plan:review 补 spec-impact。）

- **落地链**：T1 block_rects（120235e69）→ T2 on_focus 消息通道
  （b787ac645）→ T3 ghost 盒两臂（a47e654ec）→ T4 消费臂接线+注记
  （6ffb12c6e）→ T5 vue 发射者+regen+e2e（2773f74/dfa43e8）→ T6
  __mcp_click+vm-smoke 第四组（d172518/6944d2b4c）→ T7 文档销号
  （f568ac8）→ T8 vue gate 回归修复（c278db5）+ __noop 重绘
  （c3d54857c）+ 双态截图（53ffbe8）。
- **执行期裁定**：①vue 臂发射端尾沿 gate（250ms 持续 dirty 才亮、
  纯选区/程序化 seed 不亮——useSyncedScroll 补偿 margin 使聚焦即
  灰盒打断 zero-jump，详见待澄清①）；②push-emit + 事件名
  onfocusblock；③streamed 缓存存裸块。
- **复审需知**：(a) rust 全量失败为 fork 点预存/环境（A/B 证据在
  T8 条目；并行会话同机活跃——主检出半编辑+auto.exe 多实例是干扰
  源，复审全量跑建议净机）；(b) PrintWindow 抓帧对重编后窗口失灵
  （双态像素全同），改 SetProcessDPIAware 物理抓取成档——043 的
  PrintWindow 口径在新窗口上有复验必要（复审可关注）；(c) VM 灰盒
  暗色主题下对比度低（bg-muted rgb(30,41,59) vs 底 rgb(20,26,41)），
  布局占位真实（高度断言+带移位在案），视觉增强（如边框）属后续
  打磨非本计划验收项。
- **regen 顺带**：gen 镜像（content.ts/useSyncedScroll.ts 等 master
  滞留差）随 regen 刷新入库——镜像漂移非本计划引入。

### 复审（2026-09-03，reviewer=zhaopuming/@auto-plan:review）

**五验收逐条复验（代码/命令为准，非勾选框）**：

1. **VM 点击→定高灰盒** — PASS。净窗 vm-smoke 两复跑全断言组 exit 0
   （click→ghost_id="block-0"+height 43.5 主断言 + 快照
   col[空container,block] 包装形）；双态实拍复核（物理像素扫描 muted
   带 86 行、随焦点移位 199px）。注：失焦变体消息级实现+单测在册；
   VM v1 无「窗口失焦→清块焦点」输入路径（预存编辑器语义，非本计划
   面），以焦点迁移旧位清除代证。
2. **placeholder 双 prop 双轨真消费** — PASS。rust 发射测试
   ignored→consumed 翻转复跑绿；vue 自然态 ghost（typing-gated，
   待澄清①预授权落定）；e2e 真链路用例绿（聚焦+输入→出现、点走→清空）。
3. **rust 全绿 + demo e2e 全套绿** — PASS（2 预存例外在案）。
   `cargo tf` 3399 跑 3397 过 2 红：schema_drift_fence
   （vb_not_in_render `pre`，fork 点同红+master 34 提交未触及=
   PLAN-055 pre/code 臂遗留）与 docs_gen kitchen_sink（fork 同红）；
   `cargo tv` **3559/3559 全绿**；playwright **73/73 两复跑**。
   复审新抓并修复：docs_gen core_reference_in_sync——aura.at 描述改
   后 core.md 未再生成（DOCS_GEN_UPDATE 重写 2 行恰为描述同步，
   auto-lang@复审修复提交）。执行期 cargo test（非 nextest）~177
   红为跨测试进程共享 Temp 夹具污染（fork 同量级），tf 为本仓复审
   门命令（AGENTS.md/Plan 466 口径）。
4. **契约/销号/注记** — PASS。EDITOR-CONTRACT §1 ghost 双轨 VM 面+
   §3 @focusblock 行（含 gate 裁定）在册；DEBTS 040 ghost 行销号
   （043 销账同款注记）；「placeholder.*ignored」「PLAN-043 补齐
   （ghost」双仓 grep 零命中（残留 2 处「读取后忽略」=编辑壳
   placeholder 空态文案 prop，计划明示豁免范围外）。
5. **streaming 语义不变** — PASS。两臂 `let _ = props.get("streaming")`
   保留、恒 final 注记（文件头/aura.at/render_support）在册、零行为
   改动（grep 复核）。

**遗漏/延后/workaround 猎查**：

- 遗漏：core.md 再生成（复审门抓红→已修复入档，见验收 3）。
  计划技术栈 9 文件（auto-lang）+9 文件（auto-down）与 merge-base
  diff 一一对应，无丢件；T1-T8 子项逐条对得上。
- 延后：无未经签认的延期。RenderExtras 收敛为计划内二选一（选 4 参
  直读，T3 记录）；vue gate 为待澄清①预授权路径（已记）。
- Workaround（均登记）：①__noop 回发重绘（view_dirty 不驱动 iced
  重绘，Plan 482 通道借用——可提炼为通用「MCP 写态→重绘」机制，
  债候选）；②OnEditorFocus rust 直写快道（043 T6 既有模式复用）；
  ③__mcp_click 合成点击（__mcp_scroll/__mcp_drag 同族测试面）；
  ④PrintWindow 抓帧对重编窗口失灵→SetProcessDPIAware 物理抓取
  （043 双截图口径需复验，债候选）。

**债候选（不阻塞本计划，供 merge/后续立项）**：

- D1 schema_drift `vb_not_in_render pre` + 三条已消除漂移待裁剪 +
  docs_gen kitchen_sink——fork+master 双同红存量（PLAN-055 pre/code
  臂遗留：vb 表收录 pre 而 render_support 表未同步/baseline 未记/
  kitchen-sink.at 未再生成），建议归 PLAN-055 收尾或独立小计划。
- D2 cargo test（非 nextest）跨测试共享 Temp 夹具污染致全量假红
  （plan-446 C1-3 已登记竞态，实测波及 ~177 用例）——tf 已是门命令，
  建议测试夹具改进程隔离临时目录，独立立项。
- D3 VM 暗色主题下 ghost 灰盒对比度低（bg-muted rgb(30,41,59) vs
  底 rgb(20,26,41)）——布局/高度/移位全部真实（断言+实拍在案），
  视觉增强（边框/hover 描边）属打磨项。
- D4 e2e 证据截图（e2e/screenshots/*.png 三张）随 playwright 复跑
  刷新、经 c278db5 git add -A 携带入库——与本仓 042「复审截图重跑」
  惯例一致，但属静默携带，特此显式记录。

**裁定：reviewed（PASS）**——五验收全过（例外均 fork/master 双同红
预存且 A/B 证据在案），复审修复 1 项已入档，无未签认延期。

## 待澄清事项

- ①「聚焦即灰盒」的体验 gate：首版按裁定不做 gate（与 vue 金标
  同构）；实机手验若认为过于激进（任何点击都出灰盒），允许加
  会话级 gate（如仅块内容变更未回显期间显示），实施时在本节记录
  所选案——gate 属加法不动契约。
  **[执行期落定 2026-09-03]**：实勘证实「聚焦即灰盒」在 vue demo
  结构性不可行——ghost 经 useSyncedScroll 高差补偿 margin 机制
  （demo/src/composables/useSyncedScroll.ts:205 给编辑栏块注入
  margin-bottom）使每次聚焦/迁移即刻位移两栏布局：wysiwyg-typography
  zero-jump 三用例 +52px 跳变红、playwright 坐标点击竞态
  （inline-marks 用例）。所选案 = **发射端尾沿 gate（vue 臂）**：
  EngineEditor `@focusblock` 仅在持续文本编辑（连续 dirty >250ms）
  发射聚焦块；纯选区变化发 null、程序化 replaceDoc seed 不发射——
  瞬态闪现同样禁止（每次闪现=两栏 ±px 抖动）。gate 属发射端策略，
  StreamingRenderer 契约（props 非 null 即显）不动；**VM 臂维持
  聚焦即显无 gate**（目标 1 原文「点击→灰盒」，VM 无 zero-jump
  约束）——双轨发射策略分置已记 EDITOR-CONTRACT §3。gate 后 demo
  e2e 全套 73/73 绿（含新增真链路用例：聚焦+输入→ghost 出现、
  点走→消失）。
- ② vue 侧 EngineEditor 聚焦块的发射形态（emit 事件 vs expose
  回调注册）按 engine 既有模式（getBlockMap 拉取 vs update emit）
  实施时定夺，EDITO-CONTRACT §3 whichever 记录；节流口径（每块切换
  至多一发）写入实现注释。
  **[执行期落定 2026-09-03]**：push-emit（update/save 同族）；事件名
  `focusblock`（.at `onfocusblock` → vue codegen onX→@X 直映 + VM
  events 表同键，双轨单源）；节流 = 载荷去重 + 250ms 尾沿 debounce
  （见①）；已记 EDITOR-CONTRACT §3 与实现注释。
- ③ ghost 盒在 streamed 路径与 block_key 复用的交互：ghost 插入是
  包装层（Column 包裹），不影响 block_key 内容哈希——若实测复用
  键因包装抖动，允许 ghost 层独立于缓存（每帧重建包装），验收不
  受影响。
  **[执行期落定 2026-09-03]**：实施取「缓存存裸块」案——streamed 臂
  raw_blocks 先 clone 入缓存、包装仅进 children（无逆解包模式匹配、
  无误判面）；二帧复用代数不增有测（renders_placeholder 二帧
  gens=[1,1] 断言）。
