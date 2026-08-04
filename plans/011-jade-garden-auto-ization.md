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

### Phase 5.0：准备 ✅（2026-07-31 完成）

- ✅ 5.0a 隔离旧 AutoUI 遗留（legacy-autoui/），front 转为"包内嵌 Auto 项目"模式（front/auto/ 骨架）；删除 useSyncedScroll.ts。
- ✅ 5.0b 编译器投资：defineExpose（`expose {}` 块）、slot outlet + 具名 slot、v-model:open 修复 + `"update:modelValue"` 契约 + `.to_float()`；探针证实递归组件已支持、Teleport 用 BodyPortal workaround 足够。auto-lang master f6f0c059（17627f1a + 集成合并 9926ab47，零文本冲突；ui_gen 504 passed / 3 预存失败）。
- ✅ 5.0c e2e 基线：Playwright 19 测试两遍全绿（front/e2e/，含 8 张像素基线）；`pnpm test:e2e`。
- 提交：auto-down 0a56e4b。注意：主仓 auto.exe 需 `cargo build` 重建后才含新能力（或用 worktree 二进制）。

### Phase 5.1：store + 简单面板 ✅（2026-07-31 ~ 08-01 完成）

- ✅ 全部 9 个 store（试点 tabs，批量 blocks/fileTree/graph/plugins/recentFiles/sidebar/theme/workspace）翻译为 Auto store 模块 + 手写 facade，消费方零改动。
- ✅ 纯声明式组件 15 个分三批完成（batch 1：Backlinks/OutgoingLinks/UnlinkedRefs/Outline/RecentFiles；batch 2：Ribbon/StatusBar/Agenda/Search/ThemePopover；batch 3：WorkspaceOpener/CreatePagePrompt/AppShell/LeftSidebar/RightSidebar/TabStrip）。
- ✅ 每个批次翻译后跑 5.0c 基线，全绿。
- 提交：38b332e（试点）、6fd4999（其余 store）、f4466f4 / 6c2a128 / 56b3a15（组件三批）。

### Phase 5.2：中等组件 ✅（2026-08-02 完成）

- ✅ GraphControls（range 滑杆经 ext RangeInput）、FlashcardModal（v-model:open 脱糖）、CommandPalette、QuickSwitcher（全局热键 + 键盘导航修饰符）、PropertiesPanel 全部翻译。
- ✅ lib 层 `use import` / ext 中转接线全部落地（api/wikiLink/dailyNote/templates + 双侧 stub）。
- 提交：aa6e4b2。

### Phase 5.3：困难组件 ✅（2026-08-03 ~ 08-04 完成，四批）

- ✅ 5.3a FileTree + FileTreeNode（递归 widget + 显式 `key:`，cb24440）。
- ✅ 5.3b GraphView + GraphPage + GraphSidebar（cytoscape ext 封装 + `expose {}`，cf04d95）。
- ✅ 5.3c EditorTab（事件总线 + $el 逃生舱 + EditorShell wrapper）+ MainArea 整体翻译（077010c）。
- ✅ 5.3d WhiteboardPage（d7e3643）：实际组件无拖拽/选区/IME，仅 contenteditable+blur，全部可用 DSL + 薄 ext 复刻（`whiteboard_page.at` + `whiteboard_page_ext.ts`；探针 tmp/dsl-probes/whiteboard 验证 contenteditable/onblur/ondblclick/多语句闭包透传）；MainArea 改为兄弟 widget 直引，gen_components stub 清空（目录已无任何 stub），e2e 19/19 全绿。

### Phase 5.4：收尾 ✅（2026-08-04 完成）

- ✅ 全量验证：`pnpm build`（vue-tsc + vite）干净通过；`pnpm test:e2e` 19/19 一次通过（含 8 张截图像素基线，无 03-tabs flake）。
- ✅ 组件层盘点：`front/src/` 共 31 个 `.vue` —— 29 个由 `.at` 生成（`components/*.vue`，均含生成标记，与 `front/auto/src/front/*.at` 一一对应）；2 个特许手写：`App.vue`（7 行根壳，仅挂载 AppShell，属 bootstrap）与 `PluginFrame.vue`（iframe sandbox/postMessage RPC，milestone 7 遗留，当前**零引用**死代码，未翻译，建议另行清理）。`auto/stubs/gen_components/` 已清空。
- ✅ store 层盘点：9 个 store 全部翻译（注：5.0 调研口径"10 store"有误，0a56e4b 基线实际即 9 个），生成 composable 在 `src/stores/auto/`，手写 facade 在 `src/stores/`。
- ✅ 704 行 CSS 保持手写资产原样引入；lib 层（api/blockParser/dailyNote/templates/wikiLink）保持手写 TS。
- ✅ 编译器缺口回填 plan 012（`plans/012-autodsl-vue-codegen-backlog.md`，55 条缺口分级 + 三批修复建议）；各 README 已随各批次同步。

## Phase 5 总结

**最终数字**：11 个提交（5.0：0a56e4b；5.1：38b332e/6fd4999/f4466f4/6c2a128/56b3a15；5.2：aa6e4b2；5.3：cb24440/cf04d95/077010c/d7e3643；另有 45559b8 文档提交）。产出 29 个 widget `.at` + 9 个 store `.at`，覆盖全部 29 个组件与 9 个 store；e2e 19/19 稳定绿（含截图基线）；`front/auto/README.md` 沉淀 55 条编译器缺口 + 30 余条新验证能力。

**什么有效**：

- **facade 零 diff 模式**：生成 composable 与 Pinia API 的形状差异全部由薄 facade 抹平，消费方（组件/测试）零改动——diff 面即回归面，每次替换的审查成本极低。
- **ext 层政策**：只装 DSL 真正表达不了的东西（npm 库、try/catch、正则、imperative 内核），且有 dual-resolution shim 让 gen 侧 vue-tsc 同样可检查——ext 没有变成藏污纳垢的后门。
- **e2e + 截图门控**：5.0c 先建基线再动手，之后每批必跑 19 测试 + 像素基线；静默类编译器缺陷（P0）多次被截图/断言当场抓出（如 Tailwind content glob、逗号垃圾 div）。
- **探针先行**：每个难组件翻译前在 `tmp/dsl-probes/` 做最小管线探针，把不确定性从正式翻译中剥离。

**真实代价**：

- **55 条编译器缺口**：其中 9 条是"静默出错且无告警"级（P0），全靠下游规避 + 人工 grep + e2e 兜底；修复 backlog 见 plan 012。
- **ext 层体积**：29 个组件几乎各配一个 `*_ext.ts`，加上 stubs 镜像与双重 src 拷贝流程，regen 流程步骤多、易错（cp -r 嵌套、镜像过期各踩过一次）。
- **regen 不可无人值守**：store 一次只能编译一个、parse 失败静默、`auto build` 不 fail——每次 regen 必须人工核对输出。

**后续**：编译器侧按 plan 012 三批推进（静默发射防护 → store 编译正确性 → 测试债回填）；P2 表达力缺口随批次顺手做。

## 风险与对策

| 风险 | 对策 |
|---|---|
| `auto run` 覆盖真实代码（已证实的地雷） | 5.0a 最先做，做完验证 auto run 无害或不可用 |
| 无测试基线，回归靠肉眼 | 5.0c 先建 e2e 基线，未绿不动手翻译 |
| Pinia→Auto store 机制不匹配（多 store 组合、getter） | 5.1 先翻 tabs store 试点，验证机制可行性后再铺开；不行则 store 保留手写 Pinia，Auto 组件经 use import 消费 |
| 编译器投资超支（Teleport/递归可能伤筋动骨） | 每项时间盒 1 天，做不出就用手写壳方案（editor 包 Inner+壳模式已验证） |
| MainArea 的 v-show 保活契约（Tiptap 实例不重建） | 翻译 MainArea 时作为硬约束写进验收 |
