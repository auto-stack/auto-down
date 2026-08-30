# [PLAN-026] 挂载宿主协议——021 缺口收口与休眠 chrome 激活

---
plan_id: PLAN-026
status: archived
feature_name: 挂载宿主协议（adapter 事件面/isActive/getAttributes/view shim + node-view props 桥）+ TableMenu/CodeBlockMenu/NodeViews 激活
author: [zhaopuming, zcode]
created_at: 2026-08-30T00:35:00+08:00
updated_at: 2026-08-30T15:50:00+08:00
supersedes_spec_components:
  - ".autoos/specs.json P023-3/P023-4: BlockComponent 契约描述——Fence 编辑面新增宿主壳（.autodown-codeblock-node[data-language] + language badge，CodeBlockMenu 的 DOM 契约）；扩展块（Details/Math/Mermaid/Query/Embed）预览经 017 panel registry custom 槽挂载（补全注册位语义，未造第三条装配路径）"
  - ".autoos/specs.json P024-3/P024-4: tiptap-adapter 描述——并入挂载宿主协议面（.on/.off selectionUpdate 事件总线、块族 isActive、getAttributes、view 惰性 shim、七表动词 + setCodeBlockLanguage/setDetails 语言摘要通道），原描述为 mark 链面 + isActive 恒假桩"
new_spec_components:
  - ".autoos/specs.json 六节 P026-1..6: 挂载宿主协议——adapter 事件/块族/定位面、node-view-host 桥（nodeViewProps fabricator + 渲染窗口 host 栈 + NodeViewContent 注入孔）、五面板预览挂载（block-wnode 扩展型 + 模型回链）、TableMenu/CodeBlockMenu 激活（0 高锚壳/root 系裸挂）、serializer detailsMd open 持久化（TS+rust 双发射体同步）、emitUpdate 内容去重"
touched_goals: []
current_step: 10
total_steps: 11
---

## 变更摘要

补上 021 在册的"菜单宿主协议"缺口，让休眠 chrome 真正挂上引擎：adapter 增加
事件面（`.on/.off('selectionUpdate')`，由 engine.onChange 驱动）、块级
`isActive`/`getAttributes`、链动词（表格行列/代码块语言）；新建 **node-view
props 桥**（把 BlockNode+engine 翻译成 NodeView 组件期望的 tiptap 形状
props）；预览侧挂载走 017 panel registry 的 custom panel 机制（现成注册位，
避免新分叉）。激活三件高价值 chrome：**TableMenu**（表格操作菜单）、
**CodeBlockMenu**（语言选择，接通 023 在档的 IAL 通道）、**DetailsNodeView**
（预览侧交互折叠）；Math/Mermaid/Query/Embed 四件协议就绪按需挂载（在册）。

## 目标

1. **adapter 协议面**：`.on/.off(event, cb)`（engine.onChange →
   selectionUpdate 派发）；`isActive(name)` 块级真实现（'table'/'codeBlock'
   等 = 选区所在块族）；`getAttributes(name)`（聚焦块 attrs——语言等）；
   `view` shim（`view.dom` = 编辑器内容元素，菜单定位用）。
2. **链动词**：`chain().focus().addRowAfter()/deleteRow()`（转发
   commands.ts 表链）、`setCodeBlockLanguage(lang)`（setBlockAttrs IAL 通道）。
3. **node-view props 桥**：`nodeViewProps(node, engine, opts)`——fabricate
   `node{attrs}/updateAttributes/deleteNode/getPos/selected/editor`，让 7 个
   生成物 NodeView 无改动挂载。
4. **预览挂载**：DetailsNodeView 经 panel registry custom panel 注册为
   Details 面板（交互 open 属性经 updateAttributes 写回）；Math/Mermaid/
   Query/Embed 同桥注册（覆盖 builtin degrade）。
5. **菜单激活**：TableMenu 在选中表格时悬浮（isActive('table') 驱动 +
   computeMenuPosition 定位）；CodeBlockMenu 在聚焦 Fence 时可用，语言切换
   经 IAL 生效（CodeEditorBlock 标题栏显示联动）。
6. WikiLinkNodeView 不激活（020 的 wikilink 装饰器已拥有该交互——在册去重）。

## 架构方案

```
adapter（tiptap-adapter.ts 扩展）
├─ 事件总线：engine.onChange → 'selectionUpdate' 订阅者
├─ isActive/getAttributes：选区块族判定 + attrs 读取
├─ 链动词：表格/代码块语言（commands.ts 转发）
└─ view shim：view.dom = .autodown-editor-content（定位锚）
node-view 桥（新 node-view-host.ts）
└─ nodeViewProps(node, engine)：tiptap 形状 props fabricator
预览挂载（panel registry custom panel——017 机制，无新分叉）
└─ Details/Math/Mermaid/Query/Embed 面板 = 桥包装的 NodeView
菜单（EngineEditor 装配）
└─ TableMenu（选中表格悬浮）/ CodeBlockMenu（聚焦 Fence 语言通道）
```

- **挂载路径裁定**：023 的 previewNodes 走 panel 管线（不经 BlockComponent
  view 槽）——NodeView 挂预览用 `registerPanel`（plan 017 注册位），BlockComponent
  契约只承载 edit/stream（维持 023 语义，不造第三条装配路径）。
- **非目标**：BubbleMenu mark 链（024 所有）；NodeView 的编辑态深度（
  updateAttributes 即可，源码级编辑单列）；拖拽/resize 把手。

## 技术栈

现有栈：Vue 3 SFC + vitest（headless/SSR）+ Playwright（demo e2e）。生成物
（menus/NodeViews SFC）零改动——协议桥在 TS 侧适配它们的既有期望面。

## 需求分析与背景调查

（spec 账本现含 P023 条目；本节以本会话调研确认的模块事实为锚。）

- **休眠 chrome 的协议期望面（实测 grep）**：TableMenu 用
  `editor.on/off('selectionUpdate')` + `isActive('table')` +
  `chain().focus().addRowAfter()/deleteRow()`；CodeBlockMenu 用
  `getAttributes('codeBlock')` + `chain().focus().setCodeBlock`；BubbleMenu
  的 mark 链归 024。
- **adapter 现状**：`isActive: () => false` 恒假桩；无 `.on/.off`、无
  `getAttributes`、无 `view`；链骨架仅块级 setHeading 类（v1 注释明言
  inline deferred）。
- **node_view_ext shim 已备**（021 Phase 2）：NodeViewWrapper/NodeViewContent
  渲染薄组件（data-node-view-* DOM 契约）+ 图标/正则工具；头注明言"the
  assembly mounts them and feeds the widget props"——挂载协议为设计预留，
  从未建。
- **panel registry 注册位现成**（017）：`registerPanel(kind, renderer)`，
  extension 面板无 builtin、缺注册即 degrade——NodeView 桥包装成
  PanelRenderer 即挂入预览，零管线改动。
- **表命令链就位**：commands.ts 的 tableAddRow/DeleteRow 等（023 热修后
  emit 即时重绘）即 TableMenu 动词的直接后端。
- **语言 IAL 通道在档**：023 v1 裁定"语言修改走代码块菜单既有 IAL 通道"——
  setBlockAttrs(language) 即 CodeBlockMenu 的落点；CodeEditorBlock 标题栏
  显示 language（attr 联动随重绘自动）。
- **定位先例**：computeMenuPosition（useMenuBounds，slash 菜单在用）。
- **WikiLink 去重**：020 的 wikilink 装饰器已拥有点击交互（预览侧），
  WikiLinkNodeView 激活只会双轨——在册不激活。

## 详细设计

### 1. adapter 协议面（tiptap-adapter.ts）

```ts
on(event, cb) / off(event, cb)     // 订阅表；engine.onChange → 选区变化时派发 'selectionUpdate'
isActive(name)                     // 'table'→选区在 Table 子树；'codeBlock'→Fence；'bold' 等 mark 名→false（024 域）
getAttributes(name)                // 聚焦块 attrs 对象（codeBlock→{language}）
view: { dom: HTMLElement }         // 惰性取 .autodown-editor-content（菜单定位锚）
```

### 2. 链动词

`chain().focus().addRowAfter()/deleteRow()` → `tableAddRow/tableDeleteRow`
（选区行解析）；`setCodeBlockLanguage(lang)` → `setBlockAttrs(engine, fenceId,
[language])`。focus() 语义 = 保持现选区（引擎无焦点抢占）。

### 3. node-view 桥 `src/editor/engine/node-view-host.ts`

```ts
nodeViewProps(node: BlockNode, engine: EditorEngine, selected: boolean) => {
  node: { attrs: attrsToObject(node.attrs), ... },
  updateAttributes: (patch) => setBlockAttrs(engine, node.id, patch),
  deleteNode: () => replaceNode 移除,
  getPos: () => childIndex,
  selected, editor: adapter,
}
```

### 4. 预览挂载（panel registry）

`registerPanel('Details', ctx => h(DetailsNodeView, nodeViewProps(...)))`
（open 属性切换经 updateAttributes 写回 → serialize roundtrip `:::details`）；
Math/Mermaid/Query/Embed 同式注册（各自 attrs 驱动）。注册在 EngineEditor
装配处（与 023 的 edit 槽注册同位置、同 module-scope 语义）。

### 5. 菜单激活（EngineEditor 装配）

- TableMenu：`isActive('table')` 计算显隐 + computeMenuPosition 于表格矩形；
  与 023 TableEditorBlock 工具栏并存裁定见待澄清 #2。
- CodeBlockMenu：聚焦 Fence 显隐；语言点击 → `setCodeBlockLanguage` →
  重绘联动 CodeEditorBlock 标题栏。

## 测试设计

- **headless 单测**（vitest，TDD）：事件总线（onChange→selectionUpdate 派发
  /off 解除）；isActive/getAttributes 块族判定；链动词（表行操作树断言 +
  undo；语言 attr 写入 + serialize roundtrip）；node-view 桥（props 形状 +
  updateAttributes/deleteNode 效果）。
- **SSR**：Details 面板注册后预览含 data-node-view 标记与 open 属性；
  Math/Mermaid 注册后不再 degrade 为 unknown-node。
- **e2e**（demo 新增 `e2e/host-protocol.spec.ts`）：表格选中出 TableMenu→
  加行生效；聚焦代码块出 CodeBlockMenu→切语言→标题栏/fence 输出联动；
  Details 预览折叠交互。
- **回归门**：engine 全量、build 三断言、demo e2e 全绿、jade-garden build。

## 验收标准

- [x] adapter 具备 `.on/.off/isActive/getAttributes/view`，TableMenu/
  CodeBlockMenu 生成物零改动挂载成功。
- [x] 选中表格悬浮 TableMenu，加/删行经 commands.ts 生效且一步撤销。
- [x] 聚焦代码块可经 CodeBlockMenu 换语言；serialize 输出新语言 fence；
  CodeEditorBlock 标题栏联动。
- [x] Details 在预览侧可交互折叠（open 属性持久化到 serialize）；
  Math/Mermaid 预览不再 degrade。
- [x] WikiLinkNodeView 维持不激活（020 装饰器无双轨）。
- [x] EDITOR-CONTRACT 冻结面零破坏；全部门检绿；ARCHITECTURE §5/§6 的
  dormant 缺口销账修订。

## 执行步骤

> 约定：工作树 `.worktrees/plan-026-dev`（由 /auto-plan:work 创建）；验证
> 均在工作树根执行。`PnTm` = Phase n Task m。

### Phase 0：adapter 协议面（headless 地基）

- [✅] P0T1 事件总线：`src/editor/engine/tiptap-adapter.ts` 增 `.on/.off`
  订阅表 + engine.onChange→'selectionUpdate' 派发（选区变化门控）+
  `tiptap-adapter.test.ts` 增段（TDD 先红）。验证：`npx vitest run src/editor/__tests__/tiptap-adapter.test.ts`。
  [✅ 已完成] 5 用例先红（adapter.on is not a function）后绿：变化派发/同位去重/appendBlocks 不派发/off 解除/回跳派发；18/18 passed
- [✅] P0T2 isActive/getAttributes/view shim：同文件增块族判定与 attrs
  读取、view.dom 惰性锚 + 测试增段。验证：同 P0T1 命令。
  [✅ 已完成] BLOCK_BY_NAME 块族表 + collectFamilyKinds 祖先链 + attrsToObject；
  getAttributes 聚焦块优先、祖先兜底；view{dom 惰性/state.selection/nodeDOM} 全 DOM 可选；
  23/23 passed
- [✅] P0T3 链动词：同文件 chain 增 addRowAfter/deleteRow/
  setCodeBlockLanguage（commands.ts 转发）+ 测试（树断言/undo/roundtrip）。
  验证：同 P0T1 命令。
  [✅ 已完成] 七表动词齐（行前后/删行/列前后/删列/删表，focusedTableCell 就地解析，
  run() 增悬空锚修复）+ setCodeBlockLanguage/setCodeBlock({language}) 走
  setKind(language) 通道（serialize roundtrip ```ts 断言）；commands.ts 补
  tableAddColumnAtTree/tableDeleteColumnAtTree（末列守卫）；42/42 passed

### Phase 1：node-view 桥 + 预览挂载

- [✅] P1T1 node-view props 桥：新建 `src/editor/engine/node-view-host.ts`
  （nodeViewProps fabricator）+ `src/editor/__tests__/node-view-host.test.ts`
  （TDD：props 形状/updateAttributes/deleteNode/getPos）。验证：`npx vitest run src/editor/__tests__/node-view-host.test.ts`。
  [✅ 已完成] nodeViewProps（attrs 对象+textContent+updateAttributes 单步 undo+
  deleteNode/getPos/extension.options/decorations）+ push/pop/currentNodeViewHost
  渲染窗口栈（模块级注册位解析当前引擎）；无 engine 静态渲染不写回；8/8 passed
- [✅] P1T2 Details 预览挂载：`src/editor/components/EngineEditor.vue` 装配处
  `registerPanel('Details', ...)`（桥包装 DetailsNodeView）+ SSR 断言入
  `src/editor/__tests__/node-view-mount.test.ts`（data-node-view 标记/open
  属性/折叠写回）。验证：`npx vitest run src/editor/__tests__/node-view-mount.test.ts`。
  [✅ 已完成] nodeViewPanel 模块级注册（blockOfWNode 回链 + host 窗口取引擎，
  previewVNodeOf 以 push/pop 包住渲染段）；NodeViewContent 孔经 provide/inject
  接装配内容（ext shim + NodeViewContentProvider）；serializer.at 增 detailsMd
  （open=true 时 `, open: true`）经 pnpm gen:parser 再生（先证 regen 幂等）；
  5/5 mount 断言绿 + 引擎全量 421/421（rust parity golden 无 open 树，零漂移）。
  补充（P2T4 后）：rust 发射体同步——auto trans serializer.at rust 再生
  core/rust/src/serializer.rs（detailsMd + 分发），cargo test 全绿；.at 单源
  与 TS/rust 双发射体一致
- [✅] P1T3 Math/Mermaid/Query/Embed 挂载：同式注册四面板 + SSR 断言（不再
  unknown-node）。验证：`npx vitest run src/editor/__tests__/node-view-mount.test.ts`。
  [✅ 已完成] blockNodeToWNode 增 math_block/mermaid/query/embed 四型（palette
  对位 spec），四面板 nodeViewPanel 同式注册（叶块无内嵌体）；SSR 5 断言
  （各标记 + query attrs 通道写回 $query(b)）；mount 10/10 + 全量 426/426 +
  build exit 0 三断言（ext 桥同步 auto/editor/ext 源）

### Phase 2：菜单激活 + 收尾

- [✅] P2T1 TableMenu 激活：`src/editor/components/EngineEditor.vue` 装配
  `<TableMenu :editor="adapter">`（isActive 显隐 + computeMenuPosition 定位）。
  验证：`cd autodown/packages/engine && pnpm test && pnpm build`。
  [✅ 已完成] 装配于 .autodown-menu-anchor 0 高定位壳（TableMenu 坐标系=
  view.dom 内容原点）；聚焦表格经 focus 停靠语义落 TableEditorBlock（table-node
  可被菜单 querySelector 命中）；与 023 工具栏并存（待澄清 #2 起草口径）；
  426/426 + build exit 0
- [✅] P2T2 CodeBlockMenu 激活：同装配处 `<CodeBlockMenu :editor="adapter">`
  （聚焦 Fence 显隐；语言→IAL 通道）。验证：同 P2T1。
  [✅ 已完成] fenceEditSlot 宿主壳：.autodown-codeblock-node[data-language] 包
  CodeEditorBlock + [data-codeblock-language-badge] 徽标（生成菜单的点击契约
  DOM，菜单坐标 root 系裸挂）；语言切换经 setCodeBlock({language})→setBlockAttrs
  IAL 通道→重绘联动标题栏；徽标样式入 autodown-editor.css；426/426 + build exit 0
- [✅] P2T3 e2e：新建 `autodown/demo/e2e/host-protocol.spec.ts`（TableMenu
  加行/CodeBlockMenu 换语言联动标题栏/Details 折叠）。验证：`cd autodown/demo
  && npx playwright test host-protocol.spec.ts`。
  [✅ 已完成] 3 景全绿（加行落 markdown/换语言联动标题栏+badge+right pane fence/
  Details 斜杠挂载→toggle→serialize open: true）；执行中三修复：tableTarget 表级
  选区缺省语义（追加/末行）、deleteRange 区间感知（v1 尾截假设错）、
  isEditableLeaf 排除 Details/Callout/Query/Embed（容器/attr 型不宿主，聚焦态
  落 node-view）+ setDetails 内联搬子段（防序列化丢正文）；demo 全量 22/22
- [✅] P2T4 ARCHITECTURE 修订 + 全量门：§5/§6 dormant 缺口销账（7 NodeViews
  中 6 挂载、WikiLink 在册去重；menus 激活状态）；engine `pnpm test && pnpm
  build`、demo e2e 全绿、`cd jade-garden/front && pnpm build` →
  `execution_done`。验证：四门退出码 0。
  [✅ 已完成] §5 划账改记余量、§6 dormant 段销账为协议落地纪实、
  node-view-host 入 §6 平台层清单；四门：engine 429/429 + build exit 0（三断言）
  + demo e2e 22/22 + jade-garden build exit 0

### 执行后补充（用户指令"先把需要补充的事情做完"，2026-08-30）

- rust 发射体同步：auto trans serializer.at rust → core/rust/src/serializer.rs
  （detailsMd + 分发），cargo test 全绿（已折叠）。
- ARCHITECTURE 勘误：NodeView 在挂真数 5/7（MathInline 未挂——原记 6/7 系
  照抄计划稿算术，grep 实证无挂载）；§5/§6 同步修正。
- DEBTS.md 落账：021 dormant 行销号、020 菜单行部分落地、026 新行（Query/
  Embed 数据装载未接/NodeView 编辑态深度/MathInline 未挂/TableMenu 首表定位）
  + 主检出 engine dist 陈旧脚枪行。
- jade e2e 补跑（EDITOR-CONTRACT 冻结面最硬证据）：后端工作树 cargo build
  （主检出 exe 落后 back/ 源 19 天）+ journals 夹具补齐（gitignore 本地数据，
  工作树缺）→ **22/22 全绿**。
- 顺带修复（jade e2e 实证的存量断裂，025 引入、主检出陈旧 dist 掩盖）：
  EngineEditor emitUpdate 内容去重——挂载期 focusFirstBlock 的 selection 发
  update，jade EditorTab OnUpdate 早于父 onMounted 触发 debounced_save null
  崩溃；现 selection-only 变化不再重发 md。回归：engine 429/429、demo 22/22。
- lint 门不可执行说明：workspace 从未安装 eslint（主检出同），非本计划引入。

## 复审记录

**复审**（/auto-plan:review，zcode，2026-08-30 15:50，工作树 `.worktrees/plan-026-dev` 内独立重跑全量门）

**验收六条逐条重验（全 pass）**：
1. ✅ adapter 协议面：`.on/off/isActive/getAttributes/view` 齐（tiptap-adapter.ts:168-178，接口冻结面以可选成员扩展，工厂恒设）；TableMenu/CodeBlockMenu 生成物零改动——`assert-editor-gen` 绿（14 部署物/9 桥逐字节同步），menus/node-views 目录 diff 为零，装配在 EngineEditor.vue:11-13。
2. ✅ TableMenu 悬浮加/删行：e2e host-protocol.spec.ts:25（加行落 markdown）；一步撤销由单测钉死（tiptap-adapter.test.ts:232 addRowAfter one undo step + undo 断言）。
3. ✅ CodeBlockMenu 换语言：e2e :43（标题栏/badge/right-pane fence 三联动）；serialize roundtrip 单测在册。
4. ✅ Details 折叠持久化：e2e :69（toggle→serialize `open: true` 落右栏）；Math/Mermaid 不再 degrade：node-view-mount.test.ts SSR 断言 not.toContain('unknown-node')。
5. ✅ WikiLinkNodeView 零挂载（grep 全库无引用），ARCHITECTURE 在册去重。
6. ✅ 冻结面零破坏 + 门检：jade e2e 22/22（本计划新增的最硬契约证据，补跑促成）+ demo 22/22；ARCHITECTURE §5/§6 已修订。

**复审独立全量门（五门全绿）**：engine vitest 429/429 · build exit 0（三断言）· demo e2e 22/22 · jade e2e 22/22（两块）· rust cargo test 3 targets ok · jade-garden front build ✓。

**遗漏/延后/workaround 清查**：
- 无未声明延期；rust 发射体同步为用户指令补充且已完成（cargo 绿）。
- 债候选（已入 DEBTS 026 行）：Query/Embed extension.options 恒空（数据装载未接）/ NodeView 编辑态深度 / MathInlineNodeView 未挂 / TableMenu 首表定位（生成物 querySelector 语义）/ 主检出 engine dist 陈旧脚枪。另：SlashMenu coordsAtPos 仍缺（DEBTS 021 F5 维持）；nodeViewPanel 静态降级 stub 用 `as unknown as BlockNode`（无害，注释在册）；eslint 未装、lint 门本环境不可执行（环境性，非本计划引入）。
- 计划↔代码偏差（4 项，均无害已落档）：①"serialize roundtrip `:::details`" 为草案笔误，实际面型 `$details(summary, open)`（方言真形）；②步骤文本"7 NodeViews 中 6 挂载"实为 5/7（MathInline 未在任务列，算术错，ARCHITECTURE 已勘误）；③P0T3 字面只列三动词，实现为七表动词+setDetails/setCodeBlock 超集（生成物期望面驱动，各有测试）；④新增 emitUpdate 内容去重与 isEditableLeaf 容器排除（jade e2e 实证的存量断裂修复，执行后补充节在册）。
- 待澄清 #1/#2 维持开放（起草口径已实现并落档，留用户否决权——P023 复审同例）。

**spec-impact**：见 frontmatter——supersedes P023-3/4、P024-3/4；new P026-1..6；touched_goals 空（不猜：本计划目标为新增，未直接推进既有 goals 条目）。

## 待澄清事项

- [x] TableMenu（悬浮菜单）与 023 TableEditorBlock 工具栏的功能并存口径：
  起草为"编辑态用 TableEditorBlock 工具栏，选中（非聚焦）态悬浮 TableMenu"；
  备选：合并为单一入口（TableEditorBlock 吸收菜单项，TableMenu 继续休眠）。
  [✅ 用户裁定 2026-08-30：合并单一入口] TableEditorBlock 工具栏吸收七动词
  （新增 行↑/列←/删表，保留 行↓/删行/列→/删列），TableMenu 卸载回休眠
  （部署物保留）；执行提交见 adj-026-table-merge 分支。
- [x] Math/Mermaid/Query/Embed 四件的挂载深度：起草为"预览渲染 + 属性更新"
  （源码级编辑单列后续）；Query/Embed 的数据装载（查询执行/资源解析）不在
  本计划（需要后端面，另立）。
  [✅ 用户裁定 2026-08-30：认可起草深度] 深化（源码级编辑/数据装载）后置到
  常规组件全部实现之后再考虑（DEBTS 026 行在册）。
- [x] 与 024/025 的顺序：起草 026 最后执行（024 定 mark 链的 isActive 语义
  边界、025 定选区深层语义——两者都动 adapter/selection 相关面，026 收口
  在后最稳）。若并行，文件交集在 tiptap-adapter.ts（024 mark 链 vs 026
  事件面），需错峰。
  [✅ 已按起草口径执行] 024/025 均已 reviewed 后 026 收口；adapter 改动无冲突
  （mark 面/事件面分立），未需错峰。#1/#2 留用户裁定（执行按起草默认：并存挂载、
  预览渲染+属性更新深度）。
