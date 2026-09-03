---
plan_id: PLAN-044
status: drafting
feature_name: VM ghost 占位块（编辑壳聚焦跟踪 + DocLayout 尺寸暴露 + 只读臂 ghost 渲染）+ vue 侧发射者点亮
author: [zhaopuming]
created_at: 2026-09-03
updated_at: 2026-09-03

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 0
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
- T2 view.rs View::AutodownEditor 扩 on_focus + widget 焦点消息 +
  renderer 消费 + 消息可达单测。验证：`cargo test -p auto-lang
  --features autodown,code-editor autodown_editor view`。
- T3 autodown_render.rs ghost 盒插入（两臂）+ render_document_with
  扩参 + renders_placeholder 两态测试。验证：`cargo test -p
  auto-lang --features autodown,code-editor autodown_render`。
- T4 aura_view_builder 两臂消费 + 发射测试 + 三处注记摘行。
  验证：`cargo test -p auto-lang --features autodown,code-editor
  aura`（发射断言红→绿）。
- T5 EngineEditor focus-block 通道 + app.at state 化 + regen +
  EDITOR-CONTRACT expose 行 + e2e 真链路用例。验证：`cd
  autodown/demo && npx playwright test scroll-sync`（新旧用例双绿）。
- T6 vm-smoke.mjs 第四断言组。验证：净窗 `auto run -r vm` + `node
  demo/auto/vm-smoke.mjs` 退出码 0。
- T7 DEBTS/README/EDITOR-CONTRACT/注记收口。验证：grep
  「placeholder.*ignored」「PLAN-043 补齐（ghost」零命中。
- T8 全量回归三连（rust 双 feature / demo playwright 全套 /
  vm-smoke 净窗）。验证：退出码全 0，结果记复审记录。

## 复审记录

（待执行后填写；/auto-plan:review 补 spec-impact。）

## 待澄清事项

- ①「聚焦即灰盒」的体验 gate：首版按裁定不做 gate（与 vue 金标
  同构）；实机手验若认为过于激进（任何点击都出灰盒），允许加
  会话级 gate（如仅块内容变更未回显期间显示），实施时在本节记录
  所选案——gate 属加法不动契约。
- ② vue 侧 EngineEditor 聚焦块的发射形态（emit 事件 vs expose
  回调注册）按 engine 既有模式（getBlockMap 拉取 vs update emit）
  实施时定夺，EDITO-CONTRACT §3 whichever 记录；节流口径（每块切换
  至多一发）写入实现注释。
- ③ ghost 盒在 streamed 路径与 block_key 复用的交互：ghost 插入是
  包装层（Column 包裹），不影响 block_key 内容哈希——若实测复用
  键因包装抖动，允许 ghost 层独立于缓存（每帧重建包装），验收不
  受影响。
