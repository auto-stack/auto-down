# Plan 018：编辑内核替换（Tiptap 退役，vue 平台自研编辑层）

> 状态：**草案（待立项）**。设计依据：[docs/designs/09-unified-document-engine.md](../designs/09-unified-document-engine.md) §7/§8。
> 立项：2026-08-25。前置：**Plan 017 完成**（engine 0.3.0 在册，渲染管线
> 已统一）。
> 关联：plan 008 待澄清 2（"自绘文本编辑器路线承接，auto-lang
> 041-auto-edit/code_editor 内核在"——本计划即该路线的 vue 端落地）、
> plan 013（第 1 层 `.at` 组件资产复用）、auto-lang Plan 421（vue 编辑器
> 契约经验：props 消费/事件发射/降级声明）。

## 背景

editor 的 Tiptap 平台层（3119 行手写 TS + 750 行 ext 桥）深耦合
ProseMirror：

- **文档语义外包**：schema/doc/selection/事务全在 `@tiptap/pm`；
  md↔doc 转换经 `@tiptap/markdown`（016 序列化器已备替代）。
- **渲染二套**：编辑器内渲染（ProseMirror DOM）与展示渲染（engine
  `./render`）不同源——目标 3（渲染/编辑一致）的结构性根源。
- **消费方泄漏**：jade-garden `editor_tab_ext.ts:169` 直接调
  `editor.chain()`（slash 模板插入），是唯一 tiptap API 旁路。

016 的操作序列模型 + 017 的统一渲染管线就位后，编辑层 = 渲染层 +
输入层，ProseMirror 的全部角色都有了自研承接点。

## 目标

1. **自研编辑引擎**：per-block contenteditable + 016 操作序列，替换
   ProseMirror 事务/视图体系；文档模型为唯一真相源，DOM 是投影。
2. **编辑/渲染同管线**：编辑态 = `./render` 渲染 + 输入层叠加（光标/
   选区/菜单 chrome），展示一致性由构造保证。
3. **第 1 层 `.at` 组件保形复用**：斜杠/气泡/表格/代码块菜单与 7 个
   块视图组件（2743 行）props/emits 契约尽量不动，仅桥接层换向
   （`node_view_ext.ts` 从 Tiptap NodeView 改接引擎块视图接口）。
4. **命令层 API**：`insertTemplate(blocks)`/`replaceSelection(blocks)`/
   `focusBlock(id)` 等，替代 `editor.chain()` 旁路（jade-garden 迁移点）。
5. **交互语义保全**：输入规则（`# `/`- `/``` 等 markdown 快捷）、undo/redo、
   拖拽块、slash 菜单、表格行列操作、IME、**粘贴**（paste：纯文本/markdown
   经 016 parser 转块插入为 v1 必备；HTML 富粘贴裁定见待澄清 5——
   ProseMirror 现默默兜底此能力，替换时必须显式承接，不可遗漏）。
6. **第三方出清**：`@tiptap/*` 全系 + katex/mermaid/lowlight 降为可选
   注入（katex/mermaid 本就走 optional-capabilities，编辑层不再直连）。

## 非目标

- rust 编辑壳（019）。
- v2 行内 WYSIWYG（Typora 式标记鬼影，设计 §8 后续增强）。
- 协同编辑（无 yjs 承接计划，死依赖已在 016 清出）。
- demo/jade-garden 消费迁移执行（020；本计划经命令层 API 保证可迁）。

## 阶段划分

### Phase 0 — 契约冻结与对拍基线

- **e2e 选择器冻结清单**：`.autodown-slash-menu`、`autodown:slash-open`
  CustomEvent、`[data-node-index]`、`.autodown-block-placeholder`、
  `[data-block-id]` 等（demo 4 spec + jade e2e 全量 grep 产物）成册，
  作为引擎替换期的不变量。
- **交互行为基线**：以 demo + editor 现有 e2e 为准录制关键路径清单
  （输入/换段/列表续行/表格增删行/undo/斜杠插入/中文 IME 输入），
  每路径配"操作序列 + 期望文档状态"用例——引擎无关的语义层测试
  （跑在 016 操作模型上，先行编写）。

### Phase 1 — 编辑引擎核心（无 UI）

- `editor/engine/`：
  - 块焦点/选区状态机：`BlockPos` 渲染定位（面板树几何查询接口，
    017 渲染器提供 `measure(blockId)` —— `getBlockMap` 的模型化承接）；
  - contenteditable 宿主协议：focus 块接输入，compositionstart/end
    自治（IME preedit 不进操作栈，提交时 diff 成操作）；
  - 输入规则引擎：规则表（纯数据，L1 侧）+ 匹配执行（`# ` → 
    `set_block_type(heading)` 等）；
  - undo 管线：操作栈 + 相邻合并 + 反演（016 已备）。
- 单测：Phase 0 语义用例全绿（引擎层，无浏览器依赖）。

### Phase 2 — 视图桥接与菜单复用

- contenteditable 宿主组件挂接渲染管线：每叶子块一个宿主，非叶子块
  （容器块）整块只读渲染 + 块柄交互。
- **live preview 折中落地**（设计 §8 v1）：渲染态隐藏语法标记，光标
  所在叶子块切换源码态显示（块粒度 text/code 翻转）。
- 桥接层换向：`node_view_ext.ts`（150 行）+ `auto_down_editor_ext.ts`
  （427 行）从 Tiptap API 改接引擎接口；7 个块视图 `.at` 组件的
  props 适配（目标零改动，预期小修：事件载荷形状）。
- 菜单系统复用：斜杠/气泡/表格/代码块菜单（`.at` 组件）接引擎的
  选区/命令事件源；`extraSlashItems` 的执行回调改命令层 API
  （`insertTemplate`）。

### Phase 3 — AutoDownEditor 顶层重构

- `core/AutoDownEditor.vue`（生成自 `auto_down_editor.at`）装配新引擎：
  props/emits 契约不变（`modelValue`/`content`/`canEdit`/`placeholder`/
  `@update`/`@save`/`@open-wiki-link`/`loadBlock`/`assetUpload`/
  `runQuery`/`extraSlashItems`）。
- `useAutoDownEditor` composable 重写：生命周期/实例管理 API 形状
  保持，内部从 Tiptap Editor 换自研引擎；`createExtensions` 出口
  废止（Tiptap 概念，破坏性变更 → engine **0.4.0**，CHANGELOG 迁移
  指南 + jade-garden/demo 迁移说明先行）。
- 表格/拖拽把手/块柄：行列操作走操作序列（`table_add_row` 等扩展
  操作）；拖拽 = `move_block` 操作 + HTML5 DnD（现 DragHandle 扩展
  的交互面保形）。

### Phase 4 — 退役与回归

- `@tiptap/*` 全系 + `lucide` 之外的全部第三方出 dependencies
  （katex/mermaid/lowlight 确认仅剩 optional-capabilities 注册式路径）。
- 删除平台层 Tiptap 实现（24 个 extensions 文件中 schema/事务系全撤，
  语义归并：输入规则进引擎、块定义进 016 模型、node view 桥进
  Phase 2 新桥）。
- 回归：editor 测试树全绿 + demo e2e 9/9 + Phase 0 冻结清单逐项
  核验 + IME 手验清单（微软拼音，循 413 清单条目）。
- 版本：engine **0.4.0**（createExtensions 移除的唯一破坏点）。

## 验收标准

1. `@autodown/engine` dependencies 无 `@tiptap/*`/`@tiptap/pm`/
   `@tiptap/markdown`（deps guard 断言）；
2. Phase 0 语义用例 + e2e（demo 9/9）全绿；冻结选择器清单零破坏；
3. 编辑态与 `./render` 展示态对拍：同一文档双路径 DOM 语义投影一致
   （渲染一致性验收，对拍脚本入库）；
4. jade-garden 关键路径（打开/编辑/保存/wikilink 跳转/slash 模板）
   在 demo harness 等价环境验证通过（正式迁移在 020）；
5. IME 手验记录在册（vue contenteditable 组合态三例：中文/日文罗马字/
   撤销组合中途）；
6. `getBlockMap`/`containerRef` expose 契约存活（demo `useSyncedScroll`
   零改动跑通）。

## 待澄清事项

1. **流式写入打开中文档的合并策略**（设计 §7.3）：追加块分流 + 聚焦块
   锁定 vs follow-tail——倾向追加分流（用户正在编辑的块不受流影响，
   AI 追加走块尾部），Phase 1 定案。
2. **contenteditable vs 自绘光标**：v1 用浏览器原生（caret/selection
   API）足够；自绘光标（Lexical 式）留 v2 与 rust 端统一时评估。
3. **表格编辑深度**：行列增删 + 单元格编辑 v1 必备；合并单元格等
   高级操作是否随 v1（倾向后置，现 Tiptap 表格用法盘点后裁定）。
4. **`createExtensions` 消费面盘点**：musk PLAN-041 是否直接消费该
   出口（若是，0.4.0 需给 musk 侧迁移窗口——020 协调项）。
5. **粘贴深度**（修订新增）：v1 必备 = 纯文本/markdown 粘贴经 016 parser
   转块插入（含多行拆块）；HTML 富粘贴（clipboardData text/html → 块树）
   是否随 v1——倾向后置（降级为取 text/plain 走 markdown 路径），现 Tiptap
   粘贴行为盘点后裁定。另：018 Phase 1 前建议加一次性 spike（contenteditable
   宿主 + 016 操作序列闭环原型）验证主线可行性，再全量投入。
