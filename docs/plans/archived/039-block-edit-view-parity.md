---
plan_id: PLAN-039
status: archived
feature_name: Block 编辑/视图模式视觉一致性修复（标题颜色 · 焦点位移 · 代码块 chrome 与高亮）
author: [zcode]
created_at: 2026-09-02
updated_at: 2026-09-02 (archived — /auto-plan:merge 沉淀 P039-1..6 并归档)

# /auto-plan:review 填定（merge 时沉淀）
supersedes_spec_components:
  - "P029-3: 修改——EngineEditor assembleView『裸 host』裁定收口：聚焦叶面（RichTextHost 与家族 widget 编辑面）包进与预览相同的 slotChrome（增 withBoundary 开关，聚焦面不渲染插入 boundary），两态 DOM 结构同构，1-4px 焦点位移根除；getBlockMap 按最外层 slot 去重（聚焦态 slot+host 双 data-block-id 收敛为首见项，VM 端无需补偿）"
  - "P033-2: 修改——代码块家族面板吸收收官：edit 面根类并全 chrome 链（code-block-container rounded-lg border autodown-codeblock-node），语言触发器/复制/折叠按钮入标题栏一等承载（StreamingRenderer 注入器 addCodeBlockHeaders/COPY_ICON 退役），三模式 parity 从 chrome 计算样式升格逐像素（面板高度/行距相等）+ 预览态标题栏语言下拉（hover 显现 caret）"
  - "P024-2: 修改——代码编辑态着色收口：ext 增 editCodeInner 以 <code> 包裹高亮产物使 pre code .hljs-* token 链命中，聚焦后高亮不再消失（e2e 钉 token 色 rgb(215,58,73)；CodeMirror 目标态另立 DEBTS 039 行）"
new_spec_components:
  - "P039-1..6: 新增——三漂移修复全记录（标题颜色 accent 单源 token / 聚焦零位移 engine 层结构同构 / 代码块 chrome 三模式一源）/ slotChrome(withBoundary) 装配面 / 标题栏动作面三契约选择器（data-codeblock-language-badge·copy-btn·expand-btn + .code-header-trigger）/ highlight 能力宿主 opt-in 裁定（engine 守卫破 032 tri-state，归宿主 main.ts）/ e2e 稳定性纪律（beforeEach document.fonts.ready 根治 web 字体竞态重排）/ parity 测试三件（code-block-parity 6 例 + wysiwyg 颜色三向与自位移探针 topInContainer）"
touched_goals:
  - "P029-2: 块级排版 parity 目标收口——被点击块自身零位移（H1/H2/H3 Δ≤0.5px 钉死，补上旧断言只查相邻块的盲区）"
  - "P024-2: 代码编辑态着色目标交付（editCodeInner token 链命中；CodeMirror 升级路径在 DEBTS 039）"

current_step: 14
total_steps: 14
---

# [PLAN-039] Block 编辑/视图模式视觉一致性修复（标题颜色 · 焦点位移 · 代码块 chrome 与高亮）

## 变更摘要

修复 demo（AutoDown v0.1）左栏 EngineEditor 与右栏 StreamingRenderer 之间的三类视觉/交互漂移：

1. **标题颜色**：H1/H2/H3 视图侧为主题色 indigo（`--ad-accent-strong`），编辑侧是黑色（`--ad-fg`）→ 编辑侧统一到 accent token。
2. **H2 点击位移**：点击 H2 进入编辑态时它上移 1-2px → 消除焦点切换前后的布局差异，被点击块自身位置零位移。
3. **代码块编辑面**：编辑栏默认样式与视图不一致（语言标签悬在 box 外、无灰底标题栏）；聚焦进入编辑框后语言栏被包进编辑框、代码高亮消失 → 标题栏保留在容器内并成为语言选择触发器（弹出语言菜单），编辑态恢复高亮，目标态切换到 AutoUI 标准 `code_editor` 组件（CodeMirror，内部高亮）。

## 目标

- 编辑栏（EngineEditor）与视图栏（StreamingRenderer）对同一文档的排版观感一致：标题颜色、代码块 chrome（灰底标题栏在容器内）完全一致。
- 焦点切换（点击块进入编辑）不引起任何可见位移——包括被点击块自身（现行 e2e 只断言"下一块"位移 ≤1px，从未断言被点击块自身）。
- 代码块编辑面沿用家族 widget 单一 chrome 源（plan 033 裁定"view/stream/edit 同 chrome"），语言切换入口回到标题栏内，弹层复用 CodeBlockMenu。
- 代码块编辑态可见高亮不消失；目标态用 AutoUI 标准 code_editor（CodeMirror scaffold）替换 textarea+overlay。

## 架构方案

- 不改 EDITOR-CONTRACT.md 冻结面（root class、`data-block-id`、`getBlockMap`）与 `assert-editor-gen` 生成物门禁。
- 问题 1/3a 属 CSS 单源问题：token 与规则落在 `src/editor/styles/autodown-editor.css`（经 `@autodown/engine` 的 `./style.css` 出口分发），与 StreamingRenderer 的 scoped 样式保持同一 token 值。
- 问题 2 属 demo 层 scroll-sync 注入规则与 plan 029"裸 host"装配的相互作用：修复落 demo 的 `useSyncedScroll.ts` 注入规则集，使其对"预览 slot"与"裸 host"两种 DOM 形态产生相同的有效 adjoining margins（engine 层结构对齐方案记入待澄清②）。
- 问题 3b/3c 属家族 widget：改动单源 `auto/editor/code_block_widget.at` + `auto/editor/ext/code_block_widget_ext.ts`，经 `npm run gen:editor` 再生成部署到 `src/`，`assert-editor-gen` 把关字节同步；语言弹层复用现有 `CodeBlockMenu.vue`（`CODE_BLOCK_LANGUAGES` 清单 + 搜索 + 勾选 + 定位），触发器锚定契约 `[data-codeblock-language-badge]` 保留。
- 目标态（T10）按 auto-lang vue 后端的 `code_editor` → CodeMirror scaffold 通道（`auto-lang/crates/auto-lang/src/ui_gen/vue.rs:6911`，registry `ui_gen/widget/registry.rs:611`，scaffold 样例 `auto-lang/examples/capability-tests/k2-child-handler-binding/gen/front/vue/src/components/CodeEditor.vue`）在 engine 内落等价组件。

## 技术栈

- Vue 3 SFC + `.at` widget DSL（gen:editor 管线）+ 原生 CSS（autodown-editor.css）
- lowlight/highlight.js（现有高亮）；vue-codemirror / @codemirror/*（仅 T10 新增依赖，见待澄清③）
- Playwright e2e（demo）+ Vitest（engine pin 测试）

## 需求分析与背景调查

需求来自用户截图对照（左=edit 模式，右=view 模式）的三条差异，代码证据如下。

**问题 1：标题颜色（spec 关联 P029-2 语义化宿主 / P033-2 同 chrome）**
- 视图侧：`autodown/packages/engine/src/render/StreamingRenderer.vue:481-503` — `.streaming-document :deep(h1..h3) { color: var(--ad-accent-strong) }`，token 定义于同文件 :448-452（`--ad-accent: #4f46e5; --ad-accent-strong: #4338ca`）。
- 编辑侧：`autodown/packages/engine/src/editor/styles/autodown-editor.css:106-114` — `.autodown-editor-content h1,h2,h3 { color: var(--ad-fg, #111827) }` → 黑色。`--ad-fg` 从未定义，全靠 fallback。
- 两侧字号/字重/行高已一致（plan 029 e2e 钉住），仅颜色漂移。

**问题 2：H2 点击位移（spec 关联 P029-2 / P034-3）**
- 预览态 DOM：`EngineEditor.vue` slotChrome（:409-432）→ `div.node-slot[data-block-id] > div.node-content > h2`（`renderNodes`，builtin-panels.ts:39 赋 `heading-node heading-2`）。
- 聚焦态 DOM：plan 029 裁定"裸 host"——`RichTextHost.vue` 的 `h2.autodown-block-host.heading-node.heading-2` 直接挂在 `.autodown-editor-content` 下，`data-block-id` 在 h2 自身（rich_text_host_ext.ts:43-55）。
- demo 滚动同步按 `data-block-id` 注入规则（`autodown/demo/src/composables/useSyncedScroll.ts:199-218`）：
  - `[data-block-id=X] { margin-bottom: Npx !important }`（N ≥ MIN_BLOCK_GAP=16，:138）
  - `[data-block-id=X] + [data-block-id] { margin-top: 0 !important }`
- **不对称点**：预览态该清零命中 slot 包裹层，内层 h2 的 `margin-top:1.25rem`（autodown-editor.css:110）经 margin 塌穿仍贡献到上方间距（有效间距 = max(上一块注入 margin-bottom, 20px)）；聚焦态规则直接命中 h2 自身，`margin-top` 被清零（有效间距 = 上一块注入 margin-bottom ≈ 19px）。两者差 ≈ 1-2px → 上移。现行 `wysiwyg-typography.spec.ts` 只断言计算 margin 值相等与"下一块"位移 ≤1px（:119、:148），H2/H3 用例（:151-177）根本没有 zero-jump 断言，故漏网。
- T3 的运行时探针将实测钉死该数值后 T4 落修复。

**问题 3：代码块编辑面（spec 关联 P033-2 家族单 chrome / P024-2 代码编辑态着色）**
- 家族 widget：`autodown/packages/engine/auto/editor/code_block_widget.at`（部署副本 `src/editor/components/CodeBlockWidget.vue`）。编辑面（.at :87-143）：根类翻转为 `autodown-codeblock-node`（丢容器 chrome）、语言 badge 按钮渲染在 `.autodown-code-editor` **之外**（:88-93）、内部虽有 `code-block-header`（:106-121）但无灰底样式；`renderCodeHighlight`（ext :85-90）输出**裸 hljs span**（无 `<code>` 包裹，对比 viewCodeInner :57-63 有包裹）。
- 编辑栏 CSS 仍停留在退役的旧结构：`autodown-editor.css:925-931` 把 `pre[data-language]` 当容器（border + padding-top:36px），`:933` 的 header 灰底规则要求 header 是 `pre[data-language]` 的**子元素**——而家族 widget 里 header 是 pre 的兄弟 → 编辑栏预览呈现"语言标签悬在 box 外 + pre 自成 box"，即截图所示；hljs token 规则链要求 `pre code .hljs-*`（:1032 起），编辑态 overlay 无 `<code>` 祖先 → **聚焦后高亮消失**（右栏正常，因其规则不带该链，StreamingRenderer.vue:832-885）。
- 语言弹层已有现成件：`src/editor/menus/CodeBlockMenu.vue` + `ext/code_block_menu_ext.ts`（`CODE_BLOCK_LANGUAGES` 清单/搜索/勾选/定位），触发查找 `[data-codeblock-language-badge]`（CodeBlockMenu.vue:177、:241），adapter 已有 `setCodeBlockLanguage`（tiptap-adapter.ts:455）。
- 目标态参照：AutoUI vue 后端 DSL 元素 `code_editor`（用户口述 code_edit）映射到脚手架 `CodeEditor.vue`（vue-codemirror CodeMirror 6 壳，props `modelValue/lang/wrap`，内部高亮），见 `auto-lang/crates/auto-lang/src/ui_gen/vue.rs:6911-6917`、`ui_gen/widget/registry.rs:611-631`、scaffold 样例 `auto-lang/examples/capability-tests/k2-child-handler-binding/gen/front/vue/src/components/CodeEditor.vue`。demo/engine 当前无 codemirror 依赖。

## 详细设计

### 1. 标题颜色单源（T1-T2）

`autodown-editor.css` 顶部 `.autodown-editor` 根上定义与 StreamingRenderer 相同的三个 token：

```css
.autodown-editor {
  --ad-accent: #4f46e5;
  --ad-accent-strong: #4338ca;
  --ad-accent-soft: #eef2ff;
}
```

`.autodown-editor-content h1,h2,h3` 的 `color` 改为 `var(--ad-accent-strong, #4338ca)`。StreamingRenderer 侧不改动（token 值保持唯一定义语义：两处字面量相等，收敛到共享文件记待澄清④）。e2e 增加三向断言：编辑 host 颜色 === 右栏 h1 颜色 === `rgb(67, 56, 202)`。

### 2. 焦点切换零位移（T3-T4）

T3 先在 `wysiwyg-typography.spec.ts` 增加"被点击块自身 top 稳定"断言（点击前后 `getBoundingClientRect().top` 差 ≤0.5px，H1/H2/H3 三级），先跑出实测 delta 记入复审记录；T4 在 `useSyncedScroll.ts` 的 `applyBlockSpacers` 左栏注入规则补齐内层清零，使两种 DOM 形态的 adjoining margins 一致：

```
.autodown-editor-content [data-block-id=X] + [data-block-id] > .node-content > :first-child { margin-top: 0 !important }
.autodown-editor-content [data-block-id=X] > .node-content > :last-child { margin-bottom: 0 !important }
```

块间距仍由注入的 `margin-bottom`（≥16px）唯一控制，块内节奏不受影响（每 slot 恰一个顶层节点）。scroll-sync.spec 全量回归。

### 3. 编辑栏代码块 chrome 对齐（T5-T6）

把 `autodown-editor.css:925-1000` 的退役 `pre[data-language]` chrome 迁移到家族 widget 标记：

- 删除 `pre[data-language]` 的容器化规则（border/padding-top:36px），pre 回到容器内普通块。
- `.autodown-editor-content .code-block-container .code-block-header { … }` 灰底标题栏（对齐 StreamingRenderer.vue:1057 的视觉值：背景 #e5e7eb、min-height、padding、绝对定位顶部）。
- hljs token 作用域补 `.autodown-editor-content .code-block-container pre code .hljs-*`（保留旧链不删，避免误伤）。
- T6 新建 `code-block-parity.spec.ts`：左栏预览 header 计算样式（背景/高度）与右栏逐一相等。

### 4. 编辑面重构：标题栏内语言触发器（T7-T8）

`code_block_widget.at` 编辑面：

- `root_class` 编辑态合并容器 chrome：`code-block-container rounded-lg border autodown-codeblock-node`（保住 CodeBlockMenu 对 `.autodown-codeblock-node` 的锚定与 `data-language` 宿主契约，rootDataLanguage 不变）。
- 删除外部 badge button；`code-block-header` 的 `code-header-main` 成为触发器：语言文本 + 选择 icon（内联小 svg chevron/pencil），触发器元素携带 `data-codeblock-language-badge` 标记 + `title="切换语言"`——CodeBlockMenu 的触发查找（`triggerEl.querySelector('[data-codeblock-language-badge]')`）与定位逻辑零改动。
- `code-editor-stack`（textarea+highlight overlay）暂保留，语义（blur commit / readonly banner / focus-on-mount）不变。
- ext 桥同步：`auto/editor/ext/code_block_widget_ext.ts` 调整 root/badge 相关 helper；`npm run gen:editor` 再生成，`assert-editor-gen` 字节把关；`code-block-widget.test.ts` pin 同步更新。

### 5. 编辑态高亮：过渡修复 + 目标态 code_editor（T9-T10）

- **T9 过渡（随 T7 一并生效）**：ext 新增 `editCodeInner(code, language)`——高亮成功时输出 `<code translate="no" data-highlighted="…">${html}</code>`（复用 viewCodeInner 的包裹，单源），失败时输出 `<code>${escapeHtml(code)}</code>`；overlay pre 的 `v-html` 换用之。`pre code .hljs-*` 链即刻命中，编辑态高亮恢复。
- **T10 目标态**：engine 新增 `src/editor/components/AutoCodeEdit.vue`（镜像 AutoUI scaffold：`vue-codemirror` 的 `Codemirror` + 按语言装 `@codemirror/lang-*`，props `modelValue/lang/wrap`）；`.at` 编辑面的 `code-editor-stack` 替换为该组件（经 DSL 组件组合孔，参照 `auto-lang/examples/capability-tests/k3-widget-composition`），保留 blur→`controller.commit`、mount 聚焦、readonly 退化（readonly 时退回现 overlay 只读面或禁用编辑）、语言触发器不受影响。依赖与代码gen可行性见待澄清①③；受阻则 T9 即交付态，T10 移入 DEBTS.md 另立计划。

## 测试设计

- **Vitest（engine pin）**：`code-block-widget.test.ts` 更新——编辑根类链含容器 chrome、无外部 badge、header 触发器带 `data-codeblock-language-badge`、`editCodeInner` 包裹 `<code>`；`rich-text-host-ext.test.ts` 不动（host 面未变）。
- **Playwright（demo）**：
  - `wysiwyg-typography.spec.ts`：+颜色三向断言；+被点击块自身 top 零位移断言（H1/H2/H3，容差 0.5px）。
  - 新 `code-block-parity.spec.ts`：左右栏 header 计算样式相等；点击代码块后编辑框内 hljs token 计算颜色 ≠ 基础前景色（高亮在）；语言触发器点击 → CodeBlockMenu 弹层可见 → 选语言 → 标题栏文本更新（写回引擎）。
  - `scroll-sync.spec.ts`、`extension-blocks.spec.ts`、`screenshot.spec.ts` 全量回归（截图基线如因修正而变化，属预期更新）。

## 验收标准

1. 左栏 H1/H2/H3（预览与聚焦两态）计算颜色 === 右栏 === `rgb(67, 56, 202)`。
2. 点击 H1/H2/H3 前后，被点击块自身 `getBoundingClientRect().top` 差 ≤0.5px；相邻块不动（现有断言继续通过）。
3. 编辑栏未聚焦代码块与右栏视觉一致：灰底标题栏在容器内、语言文本在栏内、无悬浮标签。
4. 点击代码块进入编辑：标题栏保留在容器顶部，语言文本旁出现选择 icon；点击弹出语言菜单（搜索/勾选交互同 CodeBlockMenu），选择后标题与引擎属性更新；语言栏不进编辑区。
5. 编辑态代码可见语法高亮（token 颜色生效）；T10 落地后由 CodeMirror 内部高亮承载，blur commit / 撤销一步 / 流式只读横幅语义不回归。
6. `npm run build`（engine，含 assert-editor-gen / assert-no-tiptap）与 demo e2e 全套绿。

## 执行步骤

> 约定：engine 命令在 `autodown/packages/engine` 下执行，e2e 在 `autodown/demo` 下执行；e2e 需先起 dev server（playwright config 自带 webServer :5173）。

### Phase 1 标题颜色（问题 1）

- [ ] **T1 e2e 先行（红）**：`autodown/demo/e2e/wysiwyg-typography.spec.ts` — 在 H1 用例内增加颜色断言：`faceOf` 扩展 `color` 字段；断言 `edit.color === stream.color === 'rgb(67, 56, 202)'`。
  验证：`cd autodown/demo && npx playwright test wysiwyg-typography` → 新断言失败（实际为 `rgb(17, 24, 39)`）。
  [✅ 已完成] 实测红：`Expected "rgb(67, 56, 202)" Received "rgb(17, 24, 39)"`（H1 用例 1 failed / 4 passed，E2E_PORT=5199）。
- [ ] **T2 CSS 修复（绿）**：`autodown/packages/engine/src/editor/styles/autodown-editor.css` — `.autodown-editor` 根定义 `--ad-accent/--ad-accent-strong/--ad-accent-soft` 三个 token；:106-114 规则的 `color` 改 `var(--ad-accent-strong, #4338ca)`。
  验证：T1 命令转绿；`cd autodown/packages/engine && npm run test`。
  [✅ 已完成] e2e 5 passed（含新颜色断言）；engine vitest 31 files / 361 tests passed。

### Phase 2 焦点零位移（问题 2）

- [ ] **T3 探针断言（红，钉数值）**：`wysiwyg-typography.spec.ts` — H1/H2/H3 用例各加"点击前后被点击块自身 top 差 ≤0.5px"断言（复用 `topOf`，点击前对 `[data-block-id=X]`、点击后对 `.autodown-block-host[data-block-id=X]` 测量）；运行后把实测 delta 写入本文件复审记录。
  验证：`npx playwright test wysiwyg-typography` → 新断言失败并记录 delta（预期 ≈1-2px，且 H2 上移）。
  [✅ 已完成] 实测：H2 自位移 **4px**（`Expected <= 0.5, Received 4`），H1（首块）绿。临时诊断 spec 分解：预览态 h2 margin-top 20px 塌穿双层包裹贡献 gap（slot.top == h2.top == 178.17，computed slot mt=0/h2 mt=20px，prev 注入 mb=16px），聚焦态 host mt 被清零 → gap 16px；Δ = 20 − 16 = 4px 整，机制钉死（h2 非直接子元素，renderNodes 双层包裹 node-content > node-slot > node-content > h2）。
- [ ] **T4 注入规则修复（绿）**：`autodown/demo/src/composables/useSyncedScroll.ts` `applyBlockSpacers`（:199-220 区域）左栏 rules 数组补两条内层清零规则（见详细设计 §2），注释写明"预览 slot 与裸 host 的 adjoining margins 对齐（plan 039）"。
  验证：T3 断言转绿；`npx playwright test scroll-sync` 全绿。
  [✅ 已完成] 规则精确穿透双层包裹（`> .node-content > .node-slot > .node-content > :first-child/:last-child`）；wysiwyg-typography 5 passed（含 H1/H2/H3 自位移断言）；scroll-sync 6 passed。

### Phase 3 代码块 chrome 对齐（问题 3a）

- [ ] **T5 编辑栏 CSS 迁移**：`autodown-editor.css` — 删 `.autodown-editor-content pre[data-language]` 容器化规则（:925-931）；新增 `.autodown-editor-content .code-block-container .code-block-header`（及 `-main/-copy/-title`）灰底栏规则，视觉值对齐 StreamingRenderer.vue:1057-1070；hljs 作用域补 `.code-block-container pre code .hljs-*` 链。
  验证：`npm run build`（engine）；手动 `pnpm dev` 目视左栏代码块出现灰底标题栏。
  [✅ 已完成] 退役 `pre[data-language]` 整段（含 actions/expand 死规则）替换为 container 作用域规则，pre 终值对齐流式侧最终覆盖（`padding:0.85em 1em; margin:0; background:#f9fafb; border:none`）；engine build 四断言 ok。**计划外必要修复（落地形态经执行期修正）**：左栏预览无 hljs span 的真因是 `isCapabilityEnabled('highlight')` 为 false（overlay 无开关故有 span，实测证实）。先尝试 EngineEditor 模块作用域守卫自启用（对齐 StreamingRenderer 惯用法），但该守卫改变了所有含 EngineEditor 模块图的默认渲染，032 tri-state 契约钉（依赖 flag 关闭的纯文本形）红 3 例——**裁定：能力注册属宿主职责（plan 008 goal 3 opt-in 语义）**，回退引擎守卫，改为 demo 宿主 main.ts mount 前 `enableHighlight()`；demo 两栏着色一致，032 钉 776 全绿不动。
- [ ] **T6 parity e2e**：新建 `autodown/demo/e2e/code-block-parity.spec.ts` — 左栏预览 `.code-block-container .code-block-header` 与右栏同名元素计算样式（backgroundColor/height/fontSize）相等；token 颜色抽查一条（`.hljs-keyword` 两侧相等）。
  验证：`npx playwright test code-block-parity` → 绿。
  [✅ 已完成] 断言含 header 四项 + pre margin/padding + 容器 radius + `.hljs-keyword` 颜色两侧相等（`rgb(215,58,73)`）且非基础前景色；1 passed。
- [ ] **T4 修正（Phase 3 期间发现）**：T4 的 `:last-child { margin-bottom: 0 }` 镜像规则使 h1 的 8px margin-bottom 不再塌穿，boundary 热区上移 8px 压住短块文字中心 → extension-blocks 数学用例 blur 点击被拦截（master 基线绿 → 复现 → 定位）。该规则对布局本为无效项（注入 mb=16px 经 max() 恒占优）——删除，仅保留 top 侧规则；注释记录裁定。
  验证：`extension-blocks.spec.ts:142` 单跑 passed；wysiwyg-typography（T3 自位移断言）5 passed。
  [✅ 已完成] 见 useSyncedScroll.ts 注释"Deliberately TOP SIDE ONLY"。

### Phase 4 编辑面重构（问题 3b）

- [ ] **T7 .at + ext 单源改动 + 再生成**：`autodown/packages/engine/auto/editor/code_block_widget.at` — `root_class` 编辑态并 `code-block-container rounded-lg border autodown-codeblock-node`；删外部 badge button；header 的 `code-header-main` 改触发器（语言文本 + 内联 svg icon，携带 `data-codeblock-language-badge` 与 `title: "切换语言"`）；`auto/editor/ext/code_block_widget_ext.ts` 同步 helper。运行 `npm run gen:editor`。
  验证：`cd autodown/packages/engine && npm run build`（assert-editor-gen 过）；`npx playwright test code-block-parity` 中"触发器弹层"用例绿。
  [✅ 已完成] gen:editor 再生成（auto.exe 编译 .at → 部署 CodeBlockWidget.vue）；build 四断言 ok；e2e"edit face: language trigger lives in the title bar; popup switches language"绿（根含 container 类、唯一 badge 标记在 header 内、点触发器弹 CodeBlockMenu、选 Python 后标题更新）。菜单 label 为首字母大写（'Python'），e2e 首版小写未命中已修。
- [ ] **T8 engine pin 更新**：`src/editor/__tests__/code-block-widget.test.ts` — 编辑面断言改为：根类链含容器 chrome、不存在 `[data-codeblock-language-badge]` 于容器外、header 触发器存在且带标记、`editCodeInner`（T9）输出带 `<code>` 包裹。
  验证：`npm run test`。
  [✅ 已完成] pin 改名"container root + in-header trigger"；断言根类链/触发器/caret/无外部 badge（not.toContain autodown-codeblock-language-badge）；editor 套件 31 files / 361 tests 全绿。

### Phase 5 编辑态高亮（问题 3c）

- [ ] **T9 过渡修复**：`auto/editor/ext/code_block_widget_ext.ts` 新增 `editCodeInner(code, language)`（成功：`<code translate="no" data-highlighted="…">html</code>`；失败：`<code>escaped</code>`）；`code_block_widget.at` 编辑面 overlay pre 的 `html:` 改用之；`npm run gen:editor`。
  验证：`npm run build`；`npx playwright test code-block-parity` 的"编辑态 token 颜色生效"用例绿。
  [✅ 已完成] e2e 先红（`code .hljs-keyword` toHaveCount 1 → 0，overlay 原为裸 span）→ 实现 → 绿（token 色 `rgb(215,58,73)` 非基础前景色）；build 四断言 ok；361 vitest 绿。注：gen 过程发现 .at 模板 `html:` 引用漏改（TS2339 highlight_html 不存在）已补。
- [ ] **T10 目标态 code_editor 接入**：engine `package.json` 增 `vue-codemirror`、`@codemirror/state`、`@codemirror/view`、`@codemirror/lang-javascript/-python/-rust/-markdown/-json`；新增 `src/editor/components/AutoCodeEdit.vue`（镜像 scaffold：props `modelValue/lang/wrap`，Codemirror 壳）；`code_block_widget.at` 编辑面 `code-editor-stack` 替换为 AutoCodeEdit（DSL 组件组合孔；blur→`controller.commit`、mount 聚焦、readonly 退化语义保留）；`npm run gen:editor`；T8 pin 更新为 CodeMirror 面。
  验证：`npm run build && npm run test`；`npx playwright test code-block-parity`（高亮断言改走 CodeMirror token 类或保持 hljs 等价断言）；受阻则按待澄清①落 DEBTS.md 并以 T9 为交付态。
  [✅ 已完成（降级交付，按计划预授权路径）] 可行性核验：widget↔widget 组合可用（k3/plan 425 `use row: ItemRow`），但 npm Vue 组件（vue-codemirror）桥未经验证 + 新依赖裁定属用户（待澄清③）→ 以 T9 为交付态，T10 移入 DEBTS.md（039 行，2026-09-02）另立计划。e2e 的 overlay 着色断言已钉住交付态的高亮正确性。

### Phase 6 收尾

- [ ] **T11 全量回归**：engine `npm run build && npm run lint && npm run test`；demo `npx playwright test` 全套；`screenshot.spec.ts` 基线如因修正变化则更新；遗留项记 `DEBTS.md`。
  验证：两条命令全绿；DEBTS.md 无未记录的新债。
  [✅ 已完成] engine build 四断言 ok + vitest **776/776**；demo e2e 全套 **62/62**（含新增 code-block-parity 3 例）；截图基线 8 张随新视觉更新（screenshot.spec 绿）。执行期两次计划外裁定均有留档：① highlight 能力注册归宿主（T6 行）；② T4 `:last-child` 镜像规则删除（T4 修正行）。
- [ ] **T12 引擎层改造（评审裁定②，代码标记 T4b，2026-09-02）**：用户裁定"通用问题须在 engine 层修（VM 端还要实现）"。落地：
  - `EngineEditor.vue assembleView`：聚焦叶面（RichTextHost 与家族 widget 编辑面）包进与预览相同的 `slotChrome`（**修 plan 029 裸 host 裁定**）——两态 DOM 同构，结构敏感的宿主逻辑（scroll-sync 注入、未来 VM 布局）只见一种形态，1-4px 位移根除；
  - `block-map.ts getBlockMap`：按最外层 slot 去重（聚焦态 slot 与语义 host 双带 `data-block-id`；`tiptap-adapter.ts:294` 按 class+attr 寻址 host 不受影响）；
  - `slotChrome(withBoundary)`：聚焦面不渲染插入 boundary——其热区（top:-20px/h:28px/z-10）会吞聚焦块尾部的 caret 点击（实测破 host-protocol Details 用例与真实编辑体验）；
  - 退役 demo 侧 T4 注入补丁规则（结构性等价后不再需要，保留即成新不对称源）；
  - `scroll-sync.spec` beforeEach 增 `document.fonts.ready`——web 字体竞态致全文档 ~130px（~3%）瞬时重排，是 :109/:141/:186 数值族 flaky 的共同根因（全套并行/串行、master/worktree 均可复现的非本计划噪声，此次顺带根治）；
  - `wysiwyg-typography.spec`：margin parity 对照物改预览内层叶（注入 mb 现同落 slot 与 host，值断言失配但几何由 next-top 兜底）；top 度量全部改 `topInContainer`（聚焦可触发滚动入视，非布局位移）。
  验证：engine build 四断言 + 776/776；demo e2e **62/62 并行与串行双绿**（此前同一代码全套 flake 1-6 例不等的负载噪声随 fonts.ready 一并消失）。
  [✅ 已完成] 提交 95dcf31。
- [ ] **T13 面板像素级一致 + 预览态语言下拉（评审反馈②，2026-09-02）**：用户报告两栏代码面板行距不一致且要求"编辑栏未聚焦代码块与视图模式像素级一致，唯一差异 = 标题栏语言项 hover 显 icon、点击开下拉"。落地：
  - 根因（探针实测）：编辑栏容器 code 带 `display: block`（T5 误迁），行框走自身 1.5 = 21.12px；流式栏 inline code 行框由 pre 的 line-height（1.6 → 24.32px）主导——每行 ~3px 漂移。删 `display: block`，两栏行距/面板高度一致；
  - 视图/流式面标题栏语言项升级为 `code-header-trigger`（与编辑面同构）：未 hover 时 caret 透明（`opacity: 0`，含 trigger 边框透明、负 margin 补偿文本原位）——与纯标题栏像素一致；hover 现 ▾；点击经 CodeBlockMenu 开语言菜单；
  - `code_block_menu.at` 容器路径：trigger 解析增 `closest(".code-block-container")`、语言从其 `pre[data-language]` 读取、该路径**放行冒泡**（slot 的 selectBlock 把引擎选择移到本块，语言写回依赖选择；pre/host 路径维持 stopPropagation 原状）；
  - `code-block-parity.spec` 增：面板高度/行距/padding 逐像素相等断言（fonts.ready 后采样）、caret 未 hover `opacity: 0` + hover 显现 + 预览态选语言写回断言。
  验证：engine build 四断言 + 776/776；demo e2e **65/65**（新增 2 例像素相等与 hover 下拉）。
  [✅ 已完成] 提交（T13）。
- [ ] **T14 header 复制/折叠按钮回归（评审反馈③，2026-09-02）**：用户报告 CodeBlock 右侧复制/折叠按钮消失（家族 widget 吸收 builtin 面板时 actions 丢失，双面标题栏右侧为空 div）。落地：
  - `code_block_widget.at`：编辑/视图双面标题栏右侧补回 `data-codeblock-copy-btn`（复制）与 `data-codeblock-expand-btn`（折叠）两按钮；
  - `autodown-editor.css`：`.code-action-btn` + `codeblock-copy-icon`（沿用 base64 mask）+ `codeblock-expand-icon`（chevron mask）+ 折叠态（`:has(pre.is-collapsed)` 图标翻转 / pre `max-height: 320px`）全局规则，两栏共用；
  - `code_block_menu.at`：copy/expand 处理器增容器回退（按钮在 header 为 pre 兄弟，`closest("pre")` 落空）；
  - `StreamingRenderer.vue`：`handleContainerClick` 同步容器回退并接手折叠切换；退役注入器 `addCodeBlockHeaders`/`COPY_ICON`（widget header 已一等承载，注入件与 header 按钮重复）；
  - `code-block-parity.spec` 增双栏按钮可见 + 折叠切换断言。
  验证：engine build 四断言 + 776/776；demo e2e **65/65**。
  [✅ 已完成] 提交 907fbb7。

## 复审记录

### /auto-plan:review 复审（2026-09-02，zcode）

**验证环境**：全部在执行工作树 `.worktrees/plan-039-dev`（HEAD=33cc498，与 master 代码一致——master 仅多 docs 提交 c8ff825；分支已按增量纪律折入）。累计 diff `cd8670a..HEAD`：27 文件 +992/−241，与计划范围吻合。

**逐条验收（全部重跑，不信勾选框）**：

1. **标题颜色 — PASS**。CSS：`autodown-editor.css:6-8` 根上 `--ad-accent/-strong/-soft` 三 token，`:120` h1-h3 走 `var(--ad-accent-strong, #4338ca)`。e2e：`wysiwyg-typography.spec.ts:135-136` 三向断言（聚焦 host === 右栏 === `rgb(67,56,202)`）随全套绿。备注：直接断言钉在 H1 聚焦态；预览态与 H2/H3 聚焦态走同一条共享规则（单一 selector list）且 T12 后两态 DOM 同构挂同一根下，无分叉机制——记备注不记失败（见债候②）。
2. **聚焦零位移 — PASS**。`wysiwyg-typography.spec.ts:144/200/207` H1/H2/H3 自位移 ≤0.5px + 相邻块 ≤1px 断言绿（T3 实测基线：修前 H2 自位移 4px）。引擎层修复在案：`EngineEditor.vue:517/530` 聚焦叶面入 slotChrome（withBoundary=false）、`block-map.ts` 最外层去重、demo 侧 T4 补丁已退役（useSyncedScroll.ts 注释在档）。
3. **未聚焦代码块 chrome — PASS**。`code-block-parity.spec.ts` test 1：header 背景四项 + pre margin/padding + 容器 radius 两侧计算样式相等，灰底 `rgb(229,231,235)` 钉死；test 2（T13）：面板高度/行距/padding 逐像素相等（容差 0.5px）。
4. **标题栏触发器/语言菜单 — PASS**。"edit face: language trigger lives in the title bar" 用例：编辑根类含容器链、`data-codeblock-language-badge` 全节点唯一且在 header 内、点触发器弹 CodeBlockMenu、选 Python 后标题写回；T13 补预览态 caret 未 hover `opacity:0` / hover 显现 / 下拉选语言写回断言。
5. **编辑态高亮 — PASS**。"edit face: the overlay highlight is visibly token-colored"（T9）：`.code-editor-highlight code .hljs-keyword` 存在且色 `rgb(215,58,73)` ≠ 基础前景；`undo.spec` 代码块 Ctrl+Z/Ctrl+Y 绿（blur commit/撤销语义不回归）。**T10（CodeMirror 目标态）按计划预授权路径降级交付**——widget↔widget 组合可用但 npm Vue 组件桥未验证 + 新依赖属用户裁定，T9 为交付态，DEBTS.md:51 039 行在册（用户已见 4765400 提交）——属已签收延后，非遗漏。
6. **全套绿 — PASS（实测）**。engine：`npm run build` 四断言 ok（assert-parser-pure / assert-no-tiptap / **assert-editor-gen 16 产物 15 桥** / dist-stamp）+ vitest **60 files / 776 tests 全绿**（5.9s）。demo：`npx playwright test` **65/65 全绿**（1.1m，含 code-block-parity 6 例）。lint 一项说明：`eslint` 不在 devDependencies（基线 cd8670a 起即如此），`npm run lint` 在本环境不可跑——预存环境缺口非本计划引入，类型检查由 build 内 `vue-tsc -b` 承担（build 绿）。

**遗漏/延后/workaround 狩猎**：diff 内无 TODO/FIXME/HACK 标记；无 .skip 测试；T10 延后已签收在册；两次计划外裁定（highlight 能力归宿主、T4 镜像规则删除）均在计划文件留档且测试钉死。**债候（非阻塞，建议随 merge 前小补或另立任务）**：

- **债候①（文档漂移）**：`EDITOR-CONTRACT.md` §2 行 19 编辑面描述滞后（仍写"edit 模式走宿主链 + badge"——badge 已是标题栏内触发器，根类已并容器链），T7/T13/T14 新增契约选择器（`data-codeblock-copy-btn` / `data-codeblock-expand-btn` / `.code-header-trigger`）未入选择器表；`PANEL-ALIGNMENT.md:16`"头部注入契约"表述随 T14 注入器退役失真。根因：计划架构方案只承诺"不改冻结面"，未把契约文档同步列入任务。
- **债候②（断言面）**：预览态标题颜色与 H2/H3 聚焦态颜色无直接断言（当前共享规则无分叉机制，风险低，顺手补两行即可）。
- 观察项（无碍）：demo `vite.config.js` optimizeDeps.exclude 注释引 plan 027（T14 引入的惯例出处引用）；scroll-sync 注入模型保留为宿主职责（裁定在案）。

**裁定：六条验收全部 PASS，无阻塞债 → `status: reviewed`，待 `/auto-plan:merge`。**

### 执行期记录（2026-09-02，/auto-plan:work）

- 分支/工作树：`plan-039-dev`（fe1daee T1+T2 → 9ddda1e T3+T4 → Phase3 折入 → 58fec68 T7-T9 → 12d0961 T11 → 95dcf31 T4b → 9601e5d T13 → 907fbb7 T14）；各阶段按增量纪律折入 master。
- 实测钉死：H2 点击自位移 **4px**（预览 h1-h6 margin-top 20px 塌穿双层包裹 vs 聚焦态注入清零后 gap=16px）；T3 断言容差 0.5px 钉死回归。
- 两处计划外必要修复：① highlight 能力注册归宿主（EngineEditor 自启用守卫破 032 tri-state 钉 3 例，改 demo main.ts 注册，776 钉全绿）；② T4 `:last-child` 镜像规则删除（不塌穿致 boundary 热区上移压短块文字，破 extension-blocks blur 点击）。
- T4b（评审裁定②）：问题 2 修复上移 engine 层（聚焦叶面入 slotChrome + getBlockMap 去重 + 聚焦面无 boundary），demo 补丁退役；scroll-sync 数值族 flaky 根因鉴定为 web 字体竞态并以 `document.fonts.ready` 根治——此前"全套 1-6 例随机失败"的负载噪声消失，62/62 并行串行双绿。
- ~~既有 flaky 登记~~ → **已根治（T12，fonts.ready）**：scroll-sync 数值族（:109/:141/:186）的根因是 web 字体竞态致全文档 ~130px 瞬时重排，`beforeEach` 增 `document.fonts.ready` 后并行/串行全套双绿，噪声消失。
- 评审跟踪（2026-09-02 起）：计划保持 executing 状态，用户观察到的后续问题以 T15+ 原子任务追加到本文件「执行步骤」末尾，随观察随修随折入 master。

## 待澄清事项

1. **T10 代码gen可行性**（执行期结论 2026-09-02）：widget↔widget 组合孔可用（k3-widget-composition / plan 425：`use row: ItemRow` + 子 widget 视图直引），但 **npm Vue 组件桥**（vue-codemirror 脚手架进入 engine + codegen component_refs + gen 部署）未验证——按计划预授权降级路径，T9 为本计划交付态，T10 移入 DEBTS.md（039 行）另立计划。
2. **问题 2 修复层次**（评审裁定②已落地，T12 2026-09-02）：engine 层结构同构为正式修复（聚焦叶面入 slotChrome，修 plan 029 裸 host 裁定），demo 注入补丁已退役；scroll-sync 的注入模型本身保留（宿主职责），VM 端实现无需补偿——engine 已保证两态同构。执行期另修正过 T4 规则的边界副作用（`:last-child` 镜像不塌穿致 boundary 热区压短块文字 → 已删）。
3. **新依赖裁定**：vue-codemirror/@codemirror 引入随 T10 延后，DEBTS.md 039 行在册；engine 现维持零第三方 UI 依赖。
4. **token 收敛**：`--ad-accent*` 现于 StreamingRenderer 与 autodown-editor.css 两处等值字面量，两侧均有 e2e 颜色断言钉住（wysiwyg-typography / code-block-parity）；物理收敛到共享 token 块留 review 裁定。
