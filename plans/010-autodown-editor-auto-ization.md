# Plan: AutoDown 编辑器 Auto 化复刻

> 调研基础：auto-lang 仓库（`D:/autostack/auto-lang`，Rust 编译器 + `crates/auto-lang/src/ui_gen/vue.rs` 约 9800 行的 Vue 生成器）与 `autodown/` monorepo 全量调研。
> 长期目标：AutoDown 编辑器组件层、乃至 Jade-Garden 应用壳的完整 Auto 化。

## 目标

用 Auto 语言复刻 AutoDown 编辑器的 Vue 组件层，由 Auto 编译器翻译成 Vue/TS，在 demo 中替换原手写组件后达到**像素级一致**（以 `autodown/demo/e2e` 现有 Playwright 截图测试为验收基线）。

## 关键架构判断（调研结论）

- **编辑器内核（contenteditable/选区/IME/块拖拽排序）全部由 Tiptap/ProseMirror 承担，不在 Vue 代码里，也永远不用 Auto 重写。** Auto 复刻的范围是 Vue 壳层：扩展组装、菜单弹层、NodeView 包装组件、全局 CSS。
- Auto UI 层当前能力：布局 + Tailwind + 受控表单 + TEA 消息循环，做 CRUD 界面已成熟（`examples/ui/015-notes` dogfood，且已验证 link 嵌入 `@autodown/editor` 的集成架构）。
- Auto 缺的底层 DOM 能力（contenteditable/Selection/clipboard）恰好是本项目几乎用不到的能力。真正需要补的是中间层：通用 DOM 事件、DOM 逃生舱、原生 CSS 透传、slot、通用 watch/effect。
- Auto 生成器存在已知 bug（D1 `for+style:if+msg/on` 组合 OOM、D2 数组 `+` 误转字符串拼接、D3 多语句 handler 链式误生成、死 emit），复刻过程中会撞上，需预留修复预算。

## 非目标

- 不用 Auto 重写 Tiptap 扩展 / ProseMirror 插件（`extensions/`、`useAutoDownEditor.ts` 保持手写 TS，由 Auto 代码 import 调用）。
- 不用 Auto 重写 `StreamingRenderer.vue`（1111 行，依赖 markstream-vue + MutationObserver 后处理）与 `useSyncedScroll.ts`（426 行）——长期保持手写库，由 Auto 调用。
- 不追求 Auto 生成代码本身手写级优雅（死 emit、`any` 等生成质量问题另行治理）。

---

## Phase 0：打通编译管线（预计 1~2 天）

### 任务 0.1 用 Auto 重写 `@autodown/core`

- `autodown/packages/core/src/index.ts`（66 行纯函数 IAL 解析，零 UI）。
- 目标：验证 Auto→TS 编译产物能作为 npm 包被 editor/vue 包消费。
- 现有 vitest 单测必须全过（函数签名与行为不变）。

### 任务 0.2 用 Auto 重写 `CodeLanguageIcon.vue`

- `autodown/packages/editor/src/components/CodeLanguageIcon.vue`（14 行，最小组件）。
- 目标：验证 Auto→Vue SFC 产物能替换进 editor 包并在 demo 中渲染一致。

### 任务 0.3 建立像素验收基线

- 确认 `autodown/demo` 的 Playwright e2e（`e2e/*.spec.ts` + 截图 PNG）在当前手写代码下全绿，固化为基线。
- 约定：此后每个 Auto 复刻组件替换进 demo 后，跑同一套 e2e + 截图 diff 才算完成。

### 验收标准（Phase 0 已完成 ✅）

- [x] core 包 Auto 版本单测全过，editor/vue 包无感知消费。（`packages/core/auto/ial.at` → `auto trans` + 5 组断言后处理 → `src/index.ts`，`pnpm gen` 复现；editor/vue 的 vue-tsc 与 vitest 全过）
- [x] CodeLanguageIcon Auto 版本在 demo 中渲染与原组件一致。（`packages/editor/src/auto/src/front/code_language_icon.at`；42/42 输入的 icon URL 等价性对拍一致。注：该组件目前在 workspace 中无实际使用点，属管线 hello-world，下一个复刻目标 CustomScrollbar 才是 demo 真实渲染的组件）
- [x] e2e 基线全绿且有可重复运行的 diff 命令。（实际基线：截图类像素测试全绿；`scroll-sync.spec.ts:141`「max scroll at bottom」为手写代码既有失败，两轮复现，与本计划无关；验收口径定为"不劣于此基线"）

---

## Phase 1：补齐 Auto 语言能力（核心投入，单独在 auto-lang 立项）

每一项在 auto-lang 侧实现，并配一个 `examples/ui/` 下的最小验证示例。

### 任务 1.1 通用 DOM 事件绑定

- 现状：仅 7 个事件（click/input/change/enter/blur/dblclick/submit），`key_bindings` 被 Vue 生成器完全忽略。
- 补齐：keydown/keyup/mousedown/mousemove/mouseup/wheel + 常用修饰符；document 级监听（CodeBlockMenu 的滚动锁定需要 capture 阶段 document 监听，`CodeBlockMenu.vue:360-385`）。

### 任务 1.2 DOM 逃生舱（template ref + 命令式 DOM 调用）

- 现状：无 template ref、无 `document.*` 通路。
- 补齐：view 中声明 ref、`on` 块中调用 `getBoundingClientRect`、`scrollTop`、`addEventListener` 等命令式 API。弹层定位（`useMenuBounds.ts`）与滚动同步全靠它。

### 任务 1.3 原生 CSS 透传

- 现状：仅 Tailwind 类，生成的 `<style scoped>` 是空占位。
- 补齐：widget 可声明原生 CSS 块（或指定 .css 文件原样进入生成工程）。
- 原则：`autodown-editor.css`（1124 行 BEM `.autodown-*`）**整体搬运，不逐类翻译成 Tailwind**。

### 任务 1.4 slot / 子节点透传（如 Phase 3 证实需要）

- NodeView 类组件与容器组件需要渲染插槽。Phase 3 前先做最小设计，不提前实现。

### 任务 1.5 通用 watch/effect（如 Phase 3 证实需要）

- 滚动同步、MutationObserver 类逻辑需要。同上，不提前实现。

### 任务 1.6 外部 TS import 机制（Phase 0 实证确认的硬缺口）

Phase 0 实证：widget DSL **完全无法 import 手写 TS 模块**——`use` 只支持 Auto store/type 模块和 `back.api`；外部组件（如 `autodown_editor`）是硬编码在 `crates/auto-lang/src/ui_gen/widget/registry.rs:1013` 的特例；`ts_adapter.rs`/`vue.rs` 无 raw-TS 逃生舱。
Phase 3/4 的组件大量依赖手写 TS（`useMenuBounds`、lucide 图标、`codeBlockLanguage` 等 util、Tiptap 命令），没有通用 import 机制就只能把每个依赖都硬编码进编译器——不可持续。
要求：在 widget DSL 中支持 import 本地 TS 模块（至少在 `on` 块/computed 中可调用），或提供声明式的外部符号绑定机制。

### 任务 1.7 修复生成器已知 bug + CI

- 修 D1（OOM）、D2、D3（见 `auto-lang/docs/plans/358-auto-lang-generator-defects-fix.md`）。
- Phase 0 新发现的 a2ts/widget 生成器 bug（均已核实，详见 `autodown/packages/core/auto/README.md` 与 `autodown/packages/editor/src/auto/README.md`）：
  - a2ts：`List<T?>` 生成缺括号（`ts_types.rs:20-31`）；不生成 `export`；顶层 `const` 被吞进合成的 `main()` 且总是追加空 `main()`；`type X {}` 生成 class 而非 interface；空数组字面量在部分语法位置解析失败。
  - widget：`computed` 表达式过弱（裸标识符/普通函数调用解析失败、`.prop` 误生成 `self.prop`、字符串拼接误推断为 `computed<number>`）；无 `watch`（组件无法响应 prop 变化，0.2 被迫用 `.Init` 一次性计算，语义有差异）。
- 把 `examples/ui/` 关键示例纳入 CI，保证复刻过程中能区分"DSL 写错"还是"生成器错了"。

### 验收标准（Phase 1 已完成 ✅，合并提交 `120c64b9`）

- [x] 任务 1.1~1.3 各有 examples/ui 最小示例，编译通过、行为正确、进 CI。（026-keyboard-mouse-events / 027-native-css / 028-dom-escape，另加 029-external-imports 覆盖任务 1.6；新增 `build-ui-examples.yml` CI + `auto build --gen-only`）
- [x] D1/D2/D3 修复并回归。（D2/D3 早已修于 `8d740af1`，本次补回归测试；D1 根因早已修于 `a86c183c`，本次补 10 倍量级压力回归测试：峰值 33.7MB / 109ms）
- [x] 任务 1.6 外部 TS import 机制：widget 级 `use { fn/component/composable: ... from "..." }` 块，本地文件拷入生成工程 `@/ext/`，npm 包配合 `npm_deps:`；`autodown_editor` 硬编码特例可用新机制表达（旧路径保留）。
- [x] Phase 0 实证 bug 全部修复：a2ts 括号/export/const-吞并（`gen.mjs` 的 F1/F2/F5 后处理可退役）、computed 解析与类型推断、`.prop` 误生成 `self.prop`。
- 任务 1.4（slot）/1.5（watch）按计划保持 deferred，待 Phase 3 实证后回填。

---

## Phase 2：第一个真交互组件 —— CustomScrollbar（预计 2~3 天）

### 任务 2.1 用 Auto 重写 `CustomScrollbar.vue`

- `autodown/demo/src/components/CustomScrollbar.vue`（146 行）：computed 几何 + props/emit + mouse 拖拽，**无 ProseMirror 依赖，可脱离编辑器单独跑**。
- 这是检验 Phase 1 补齐成果（事件 + DOM 逃生舱）的最佳试金石。

### 验收标准（Phase 2 已完成 ✅）

- [x] 替换进 demo 后 e2e + 截图 diff 不劣于基线（8 通过 + 1 个既有失败 scroll-sync:141，数值与基线一致）。（`autodown/demo/auto/src/front/custom_scrollbar.at` 191 行；`App.vue` 仅 2 行胶水改动：`@update:scroll-top`→`@UpdateScrollTop`、`@hover-change`→`@HoverChange`）
- 实证结论（回填 Phase 1 能力清单）：
  - 1.1/1.2/1.3 能力在真实组件上全部验证可用（window 拖拽监听、ref 命令式几何写、style 块透传）。
  - **watch（任务 1.5）确认需要**：本次用 `onscroll.window.capture` 做"事实上的 watch"绕过，但"只改 scrollHeight 而无任何事件"时 thumb 几何会滞后——Phase 3 前应补上 watch 或模板 `:style` map 绑定（风险点 2 的根治）。
  - DSL 小坑 8 个记录在 `autodown/demo/auto/README.md`（字面量 msg 参数、连字符 class key 不加引号、惰性 handler 注册等），可作为后续生成器打磨清单。

---

## Phase 3：菜单弹层族（预计 1~2 周）

交互模式相同（绝对定位弹层 + 边界计算 + 键盘导航），第一个通了后面是复制模式。按难度递增：

1. `SlashMenu.vue`（185 行）+ `useMenuBounds.ts`（120 行）——第一个"真组件"：列表渲染、键盘导航、定位弹层；对编辑器的依赖只有 `coordsAtPos` 和 `chain()` 命令，接口边界清晰。
2. `BubbleMenu.vue`（128 行）。
3. `TableMenu.vue`（165 行）。
4. `CodeBlockMenu.vue`（392 行，最难：坐标定位、document 级事件捕获、滚动锁定、rAF 重定位）。

### 验收标准（Phase 3 已完成 ✅）

- [x] 四个菜单全部 Auto 化，demo e2e + 截图 diff 不劣于基线（8 通过 + 1 个既有失败 scroll-sync:141）。
  - SlashMenu：`slash_menu.at`（150 行）+ ext TS；`SlashItem` 接口移至 `menus/slashItem.ts`（包公共 API 经 `index.ts` re-export 保持不变）。
  - BubbleMenu / TableMenu / CodeBlockMenu：各 `.at` + ext TS 模式；CodeBlockMenu 采用"全状态入 ext"架构（DSL 无法注册 editor dom 上的 capture 监听）。
- [x] slot / watch 两项缺口的实证结论：**watch 已在 3.0b 实现并投入使用**（SlashMenu 重置选中、thumb 几何）；**slot 仍未需要**（菜单族无插槽需求，dyn 动态组件覆盖了图标场景），任务 1.4 继续 deferred 至 Phase 4 评估（NodeView 可能需要）。
- Phase 3 新增的 DSL 能力（3.0a/3.0b，auto-lang `phase3-dsl-capabilities` 分支，已合并 master `1ecc13e3`）：引号自定义事件（`on "autodown:slash-open".document`）、`style_obj` 内联样式绑定、`dyn` 动态组件、widget 级 `watch` 块、块体闭包 StateRef 修复。
- **闭包真相与回流重构**（重要）：Auto 语言一直有闭包（`x => expr`、`(x, y) => x + y`，Plan 060/090），Phase 3 中期"DSL 无闭包"为误判，唯一真 bug 是块体闭包经 a2ts 委托丢 StateRef `.value`（已修）。修复后四个菜单的 ext TS 大规模回流 Auto：slash 147→33、bubble 144→86、table 147→56、codeblock 452→92 行。ext 中仅留真正表达不了的（tiptap/lowlight 再导出、静态图标/语言清单、import 手写定位纯函数）。README 误判清单已纠错，真实限制（computed 里 `??`/块体闭包、括号丢失、`.contains` 被映射为 `.includes` 等约 10 条）记录在 `src/auto/README.md`，是后续生成器打磨清单。

---

## Phase 4：NodeView 与顶层集成（预计 2~3 周）

### 任务 4.1 NodeView 组件 Auto 化

- `autodown/packages/editor/src/node-views/` 7 个组件（各 61~178 行）：WikiLink、QueryBlock、BlockEmbed、Details、Mermaid、MathBlock、MathInline。双态（编辑/预览）+ 少量编辑器命令调用。
- 保持 `VueNodeViewRenderer` 适配层为手写 TS，Auto 产物作为被包装的 Vue 组件。

### 任务 4.2 顶层 `AutoDownEditor.vue` 组装组件 Auto 化

- `autodown/packages/editor/src/core/AutoDownEditor.vue`（421 行）：组装 `<EditorContent>` + 4 个菜单 + Save/Cancel；含约 30 项 slash 命令静态清单。
- Tiptap 扩展注册（`useAutoDownEditor.ts`、`extensions/index.ts`）保持手写 TS，Auto 代码 import 调用。

### 任务 4.3 CSS 整体搬运

- `autodown-editor.css`（1124 行）通过任务 1.3 的机制进入 Auto 工程，与原文件做 diff 保证一致。

### 验收标准（Phase 4 已完成 ✅）

- [x] `@autodown/editor` 的 Vue 组件层 100% 由 Auto 生成（Tiptap 扩展与 CSS 除外）。
  - 7 个 NodeView 全部 Auto 化（交互型 4 + 渲染型 3），`VueNodeViewRenderer` 适配层保持手写；mermaid/katex 渲染收进 `composables/renderPreview.ts`（npm 库 + try/catch + v-html 属真实 ext 项）。
  - 顶层 `AutoDownEditor.vue` 采用 **Inner（Auto 生成）+ 薄壳（手写 130 行）**架构——四个硬缺口叠加：小写/连字符 emit 名（`update`/`save`/`link-click` 等）、defineExpose（`getBlockMap()`/`$el` 被 demo 和 jade-garden 消费）、slot（save-label/cancel-label）、withDefaults。30 项 slash 清单留 ext（图标数据携带 + 块体闭包含 prompt/clipboard，BubbleMenu 同款取舍）。
  - 全量 regen 刷新全部 13 个生成组件（消除了中间态滞留 diff），editor build + 22/22 vitest + e2e 全量基线；**像素级对拍：.bak 原版与 Auto 版的 initial-viewport.png 字节级相同**。
- [x] demo 全量 e2e + 截图 diff 全绿，达到像素级一致目标。（8 通过 + 1 个既有失败 scroll-sync:141，与本计划无关的手写 useSyncedScroll 既有 bug）
- [x] CSS 整体搬运：`autodown-editor.css` 1124 行零改动（组件 class 名全部保持，无需搬运）。
- Phase 4 实证的新 DSL 缺口（约 25 条，记录在 `src/auto/README.md`）：**slot 与 defineExpose 成为真实需求**（薄壳方案可绕但每个顶层组件都要壳）；computed 三元/对象字面量体/`||` 推断；watch immediate；非视图引用 handler 不发射等——为后续编译器迭代提供了精确清单。

---

## Phase 5：长期 —— Jade-Garden 应用壳 Auto 化

- Jade-Garden（侧栏/标签页/设置/图视图）属于 Auto 已验证可行的 CRUD 界面象限（参考 `examples/ui/015-notes`）。
- 待 Phase 4 完成后启动，主要是工程量而非技术风险，届时单独立 plan。

---

## 风险与对策

| 风险 | 对策 |
|---|---|
| Phase 1 补能力比预想大（vue.rs 已 9800 行，改动面大） | Phase 0 先做，用 core 包实测编译管线稳定性后再投入；每项能力配独立最小示例，可分批落地 |
| 生成器 bug 打断复刻节奏 | 任务 1.6 先修 D1/D2/D3 并补 CI；遇到新 bug 一律在 auto-lang 侧修，不在生成产物上手改 |
| 像素级 diff  flaky（动画/字体渲染差异） | 复用 demo 现有 e2e 的截图策略；必要时加稳定化（禁动画、固定视口） |
| Auto 生成代码质量（死 emit/any）影响 editor 包对外 API | Phase 4 时以 editor 包的公共 TS 类型为准做适配层；生成质量治理走 auto-lang 的 Plan 367，不阻塞本计划 |
