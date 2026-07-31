# Plan: Jade-Garden 应用 Auto 化

> 前置：plan 010（AutoDown 编辑器 Auto 化）已完成，编译器能力基线 = auto-lang master（闭包/watch/dyn/style_obj/自定义事件/use import/ref DOM 逃生舱/块体闭包）。
> 调研结论：Jade-Garden 名义是 Auto 工程，实际 99% 手写——`front/` 约 6600 行手写 Vue 3 + Pinia + Tailwind（26 组件 + 10 store + lib 层 + 704 行 CSS），`back/server/` 3706 行手写 Rust Axum。`.at` 文件（app.at/api.at 等）全是占位，且**`auto run` 会用占位覆盖真实 `src/App.vue`，必须先行隔离**。

## 目标

把 `jade-garden/front/` 的 Vue 组件层改写为 Auto 语言源码（经 auto-lang 编译器生成 Vue/TS），功能与视觉保持一致，可由脚本化 e2e 验证。

## 非目标（明确不做）

- **后端不 Auto 化**：`back/server/`（3706 行 Axum + SQLite 索引 + notify watcher）保持手写 Rust。api.at 机制与真实后端差距巨大，不在本计划范围。
- **lib 层不翻译**：`lib/api.ts`（363 行 fetch）、`blockParser.ts`（304）、`dailyNote.ts`、`templates.ts`、`wikiLink.ts` 作为 TS 依赖保留，Auto 侧经 `use { fn: ... }` import（1.6 机制）。
- **不重写第三方集成内核**：cytoscape（GraphView）、Tiptap（编辑器）的实例创建与生命周期按 editor 包既有模式封装在手写 TS/composable 里。
- 不引入新功能；不动 `tmp/wiki-demo` 数据。

## 关键架构决策（预先定调）

1. **隔离旧 AutoUI 遗留**（Phase 5.0 第一件事）：归档 `front/app.at`、`back/api.at`/`db.at`/`service.at`、`gen/`、`dist/`、`.auto/ui-cache.json`，改 pac.at 使 `auto run` 不再覆盖 src/——或直接把 front 转成 editor 包同款"包内嵌 Auto 项目"模式（`front/auto/` 放 .at，生成产物 cp 进 `front/src/`），彻底脱离 `auto run`。**推荐后者**：与 editor 包流程一致，回归验证路径相同。
2. **Pinia → Auto store**：10 个 Pinia store（~590 行）映射为 Auto 的 store 模块（`store` 声明 → composable，015-notes 的 notes_store.at 已验证该机制）。tabs store（dirty/save 状态机）是核心资产，第一个做。
3. **跨组件 window 事件总线**（`jade-scroll-to-block` 等 4 派 6 收）：优先用 `on "ns:event".document`（3.0a 已具备）原样复刻；不重构为 store 驱动（保持行为一致优先）。
4. **编辑器集成契约不动**：EditorTab 对 AutoDownEditor 的 props/emits/expose（`$el`、`@update`、`@open-wiki-link`）已在 plan 010 Phase 4 的薄壳中保留，本计划直接消费。
5. **死代码清理**：`front/src/composables/useSyncedScroll.ts`（394 行，零引用）随迁移删除。

## 编译器投资（Phase 5.0b，auto-lang 新 worktree）

按 Phase 4 实证 + 本次调研预判，按优先级：

| 能力 | 需求方 | 备注 |
|---|---|---|
| **defineExpose** | GraphView（fit/relayout）、各顶层组件 | Phase 4 已实证为真实缺口（薄壳根源之一） |
| **slot（含具名 slot）** | 顶层组件壳、EditorTab | plan 010 任务 1.4 正式回填 |
| **Teleport** | EditorTab（浮动按钮到 body）、FileTreeNode（右键菜单） | 新能力 |
| **递归组件** | FileTreeNode（自引用） | 可能只需生成器允许组件自引用 import |
| **命名 v-model / v-model.number** | FlashcardModal（v-model:open）、GraphControls（11 个数字滑杆） | emit 字面量名问题的子集 |
| **全局键盘监听** | CommandPalette（Ctrl+P）、QuickSwitcher（Ctrl+O） | `on "keydown".document` + key 判断可能已够，先探针 |

每项配 examples/ui 最小示例 + 单测，流程同 phase1/phase3 worktree。

**5.0b 探针结论**（agent-29，探针在 `tmp/dsl-probes/`，全管线 vue-tsc+vite 验证）：

- **递归组件：已支持，无需编译器工作**。widget 自引用编译通过（生成自 import，vite/vue-tsc 均过），FileTreeNode 可直接写。
- **Teleport：无关键字，短期用 workaround 足够**——6 行 `BodyPortal.vue`（`<Teleport to="body"><slot/></Teleport>`）经 `use{component}` 引入即可用；长期可做 `teleport(to:)` 标签映射（注意 `teleport`/`Teleport` 目前会静默退化为 div /  bogus import，无警告）。
- **slot：部分支持，需编译器投资（最高优先）**。父→子默认 slot 内容传递已可用（含 `use{component}` 外部组件）；但 widget 内**无 slot outlet**（`slot` 被静默编译成 `<div/>`，子内容被吞且无警告），也**无具名 slot**。需：outlet 语法（`slot` / `slot(name:)` → `<slot/>`/`<slot name=>`）+ 父侧具名 slot 语法（→ `<template #name>`）+ 无 outlet 时传子内容应告警。
- **v-model：手动双向已可用**（prop down + msg-event up，类型检查过）。缺口：① `bind:` → `v-model` 的生成器分支是死代码（parser 不产生该 key）；② msg/emit 名不能含 `:`，无法做 `update:modelValue`/`v-model:open`；③ 内建 overlay 的 `v-model:open` 被**静默丢弃**（`extract_state_ref` vue.rs:8231 只认裸 Ident，`.state` 引用匹配不上；相关单测是手构 AST 才过的假绿）；④ 无 `.number`/`.to_float()`（`.to_int()` → parseInt 可用）。
- **附带缺陷**（顺手记录，是否修另行决定）：shadcn `input{value:…}` 丢 `:value` 绑定成非受控；015-notes 示例事件名接线不匹配（`@_delete` vs `emit('Delete')`）。
- 全局键盘：探针未覆盖，按原计划用 `on "keydown".document` 先试。

## 分阶段实施

### Phase 5.0：准备（预计 0.5 天）

- 5.0a 隔离旧 AutoUI 遗留（决策 1），front 转为"包内嵌 Auto 项目"模式；删除 useSyncedScroll.ts。
- 5.0b 编译器投资（上表），worktree 开发、合并 master。
- 5.0c **建立 e2e 基线**：扩充 `front/e2e-multi-tab.cjs` 为 Playwright 套件——工作区打开、文件树 CRUD、标签保活、编辑器输入/保存、wiki 链接跳转、右栏面板、图视图渲染、命令面板。基线全绿后才开始翻译。

### Phase 5.1：store + 简单面板（预计 1 周）

- tabs/theme/workspace/files store 翻译为 Auto store 模块。
- 纯声明式组件（约 15 个）：Ribbon、StatusBar、BacklinksPanel、OutgoingLinksPanel、UnlinkedReferencesPanel、OutlinePanel、AgendaPanel、RecentFilesPanel、SearchPanel、WorkspaceOpener、CreatePagePrompt、ThemePopover、AppShell、LeftSidebar、RightSidebar、MainArea 标签栏。
- 每个组件翻译后跑 5.0c 基线。

### Phase 5.2：中等组件（预计 1 周）

- GraphControls（v-model.number 滑杆）、FlashcardModal（命名 v-model）、CommandPalette、QuickSwitcher（全局热键 + 命令式 DOM）、PropertiesPanel（frontmatter 编辑）。
- lib 层 `use import` 接线。

### Phase 5.3：困难组件（预计 2 周）

- EditorTab（Teleport + 事件总线 + $el DOM 逃生舱 + 防抖）。
- GraphView + GraphPage + GraphSidebar（cytoscape 封装 + defineExpose）。
- FileTree + FileTreeNode（递归 + Teleport）。
- WhiteboardPage（contenteditable + 拖拽）——如代价过高可保留手写并记录理由（同 editor 内核策略）。

### Phase 5.4：收尾

- 全量 e2e + 视觉对拍（关键页面截图 diff）。
- 704 行 CSS 保持手写资产原样引入。
- 回填 plan 010 Phase 5 验收；更新本 plan 与各 README。

## 风险与对策

| 风险 | 对策 |
|---|---|
| `auto run` 覆盖真实代码（已证实的地雷） | 5.0a 最先做，做完验证 auto run 无害或不可用 |
| 无测试基线，回归靠肉眼 | 5.0c 先建 e2e 基线，未绿不动手翻译 |
| Pinia→Auto store 机制不匹配（多 store 组合、getter） | 5.1 先翻 tabs store 试点，验证机制可行性后再铺开；不行则 store 保留手写 Pinia，Auto 组件经 use import 消费 |
| 编译器投资超支（Teleport/递归可能伤筋动骨） | 每项时间盒 1 天，做不出就用手写壳方案（editor 包 Inner+壳模式已验证） |
| MainArea 的 v-show 保活契约（Tiptap 实例不重建） | 翻译 MainArea 时作为硬约束写进验收 |
