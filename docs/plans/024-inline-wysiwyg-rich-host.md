# [PLAN-024] 行内 WYSIWYG——富文本宿主与 mark 就地编辑

---
plan_id: PLAN-024
status: drafting
feature_name: 行内 WYSIWYG（富文本宿主 + mark 命令层 + 选区映射 + 气泡菜单激活 + 代码编辑态着色）
author: [zhaopuming, zcode]
created_at: 2026-08-29T19:10:00+08:00
updated_at: 2026-08-29T19:10:00+08:00
supersedes_spec_components: []
new_spec_components: []
touched_goals: []
current_step: 0
total_steps: 12
---

## 变更摘要

把文本叶块（段落/标题/列表项）的编辑从"纯文本源码态"升级为**富文本宿主**：
聚焦时 DOM 直接呈现 strong/em/del/code/link 内联元素并支持就地选区格式化，
失焦时整块把 (text, marks) 序列写回模型（applyTree 一步撤销，与 023 的
CodeEditorBlock 协议同构）。配套三件地基：mark 命令层（内核侧）、DOM↔模型
选区映射（单块 v1）、021 休眠 BubbleMenu 的激活（adapter mark 链 + 定位
shim）。收编 023 待澄清 #2：代码编辑态语法着色（textarea + 高亮叠加层）。
容器块（list/blockquote）聚焦下沉**不并入**——单列 plan-025（裁定见待澄清 #4）。

## 目标

1. **富文本宿主**：BlockHost 渲染 InlineSpan marks 为内联元素；输入期纯文本
   diff 语义保持（结构变化不经 input 事件同步模型）；失焦整块回写
   withInlines（一步撤销）。
2. **mark 命令层**：`toggleMark`/`setLink`/`marksInRange`（spans 重切分工具 +
   applyTree 命令，023 表命令先例；**不动** block_model.at 内核——op 内核无
   mark op，内核改造成本含 rust 对拍，v1 不取）。
3. **选区映射**：DOM Range ↔ (blockId, lo, hi) 单块双向映射（富 DOM 文本节点
   walk 偏移），供气泡定位与命令寻址；跨块选区 v1 明确不支持（在档）。
4. **BubbleMenu 激活**：adapter 增 mark 链（toggleBold/Italic/Strike/Code +
   link）与真 isActive（读选区 marks）；EngineEditor 挂载 + 选区矩形定位
   （computeMenuBounds 先例）；underline 按钮裁剪（Mark 枚举/序列化器无
   Underline，生成物不动）。
5. **代码编辑态着色**（023 待澄清 #2 收编）：CodeEditorBlock 增 textarea 与
   高亮 pre 叠加层（复用 highlight 桥），ext 桥同步滚动/高度；.at 源跟进。
6. 快捷键 Ctrl+B/I/K 就地格式化；全程 EDITOR-CONTRACT 冻结面与既有 e2e
   基线（9 spec）不破。

## 架构方案

```
聚焦态（文本叶块）
└─ BlockHost（富化）：contenteditable 内联元素呈现 marks
   ├─ 输入（IME/键入）→ 纯文本 diff op（不变；结构变化不产生 input 同步）
   ├─ 选区 → selection-map（DOM Range ↔ blockId+lo/hi，单块）
   │           ├─ 气泡定位（选区矩形 → computeMenuBounds）
   │           └─ adapter.isActive / marksInRange（命令寻址）
   └─ 失焦 → onRichBlur：DOM walk 收集 (text, marks, attrs) → 整块回写
             （applyTree 一步撤销 ←→ CodeEditorBlock 同构协议）
命令层（headless）：marks.ts（spans 重切分）+ commands.toggleMark/setLink
菜单（chrome 层）：BubbleMenu（021 生成物激活，underline 裁剪）
```

- **v1 关键裁定——失焦整块回写而非每击键结构 diff**：op 内核（InsertText/
  ReplaceRange/...七种）无 mark op，逐键结构同步要么改内核（含 rust 对拍）
  要么做 DOM↔spans 增量 diff（Tiptap 级复杂度）；整块回写把结构同步压缩到
  失焦一点，IME 由浏览器原生富 contenteditable 承担。
- **非目标**：容器块聚焦下沉（025）；跨块选区；underline mark（需动
  parser/serializer 生成物）；气泡内嵌表单类扩展（链接输入 v1 走
  window.prompt，BubbleMenu 既有 runBubbleLink 通道）。

## 技术栈

现有栈：Vue 3 SFC + vitest（SSR/headless）+ Playwright（demo e2e）+ AutoLang
widget（`pnpm gen:editor`，bubble_menu.at / code_editor_block.at 源跟进）。
不引入新依赖（jsdom 不进 engine——DOM 侧逻辑走 e2e 实机钉死 + 注入式纯函数
单测，023 先例）。

## 需求分析与背景调查

（spec 账本仅含 P023 条目（023 合并时新建）；本节以本会话调研确认的模块
事实为锚。）

- **模型侧就绪度高**：`InlineSpan {text, marks: Mark[], attrs}`；Mark 枚举
  Strong/Em/Code/Link/Image/Del；spansInsert/Delete/SplitAt 已有；预览侧
  marks 渲染完整（renderInlineNode strong/em/del/code/a）。
- **选区模型**：`Selection {anchor, head}` 各为 `BlockPos(blockId, offset)`
  ——文本偏移、方向性已表达、无 mark 感知（isActive 需从 range 内 spans 求）。
- **op 内核无 mark op**（七种枚举实测）；block-model.ts 是生成物（源在
  auto-lang `auto/block_model.at`）——mark 走 applyTree 命令层，023 表命令
  与 023 热修（applyGroup 补 emit）保证命令即时重绘。
- **BlockHost 现状**：`{{ initialText }}` 纯文本渲染；`caretOffset()` 已有
  DOM→偏移（单块、纯文本）；contenteditable + composition 协议完整。
- **BubbleMenu 休眠件**（021 部署未挂载）：期望
  `editor.isActive('bold')` + `editor.chain().focus().toggleBold().run()` 面；
  adapter 现状 `isActive: () => false`、链仅块级命令（v1 注释明言 inline
  deferred）；含 underline 按钮——Mark/序列化器无对应，需裁剪。
- **定位先例**：`computeMenuPosition`（`src/editor/composables/useMenuBounds`，
  slash 菜单在用）可复用于气泡选区矩形定位。
- **着色素材**：highlight 桥（setHighlightImpl）+ lowlight 默认实现已在
  预览侧着色；CodeEditorBlock（.at 生成物）当前纯文本 textarea。
- **已知编译器债务（024 写 .at 会踩，建议前置或首批修）**：① model var 用
  prop 初始化发射于 defineProps 之前（TDZ）；② .at 视图引用与 prop 命名不
  一致时静默渲染空 v-for——均在 auto-lang 仓（023 复审在档）。

## 详细设计

### 1. mark 内核工具 `src/editor/engine/marks.ts`（手写）

```ts
toggleMarkOnSpans(spans, lo, hi, mark): InlineSpan[]  // 切分/合并/取消部分覆盖
setLinkOnSpans(spans, lo, hi, href): InlineSpan[]     // Link mark + attrs
marksAtRange(spans, lo, hi): Mark[]                    // isActive 语义源
```

边界：跨界切分（span 部分覆盖）、同 mark 合并、嵌套（Strong 内 Em）保持、
toggle 判据 = range 内全部已含该 mark 则取消否则添加。

### 2. mark 命令（commands.ts 增段）

`toggleMark(engine, blockId, lo, hi, mark)` / `setLink(engine, blockId, lo,
hi, href)`——读块 spans → 工具重切分 → `applyTree` 整块 withInlines 回写
（一步撤销）；`marksInRange(engine, sel)` 供 isActive。

### 3. 选区映射 `src/editor/engine/selection-map.ts`

- `domRangeToBlockRange(hostEl, blockId): {lo, hi} | null`——window
  .getSelection() 的 range 落在单一宿主内时，walk 文本节点累积偏移；
  跨块/跨宿主返回 null（v1 在档限制）。
- `blockRangeToDomRange(hostEl, lo, hi): Range`——反向 walk 供选区恢复。
- 偏移 walk 抽成纯函数（输入节点序列描述）以 headless 单测；真 DOM 侧
  e2e 钉死。

### 4. BlockHost 富化（P2 核心）

- 渲染：初始内容由 spans 映射内联元素（strong/em/del/code(`code`)/a——a
  带 contenteditable=false 防止点击跳转），挂载即渲染（替换
  `{{ initialText }}`）。
- 输入：onInput 的 textContent diff 语义**保持不变**（结构变化不触发 input
  同步——toggle bold 是 DOM 包裹，不产生 input 事件；IME 输入纯文本照走）。
- 失焦：`onRichBlur` walk DOM 收集 (text, marks, attrs) → 整块
  withInlines 回写；已知文本（controller.knownText）同步更新。
- Enter/Backspace/粘贴协议不动（结构键在纯文本层语义已定义）。

### 5. 气泡菜单激活

- adapter：`isActive(name)` → 读引擎选区 + marksInRange；chain 增
  `toggleBold/toggleItalic/toggleStrike/toggleCode`（转发当前聚焦宿主执行
  DOM 就地包裹——`surroundContents` 或 range 重建，宿主方法实现）。
- EngineEditor 装配 `<BubbleMenu :editor="adapter">` + 选区矩形定位
  （computeMenuPosition 通道）。
- `auto/editor/bubble_menu.at` 移除 underline 按钮（源级）→ gen 重生成 →
  对拍 + 门检清单同步（生成物内容变化，部署清单不变）。

### 6. 代码编辑态着色（CodeEditorBlock 叠加层）

- `auto/editor/code_editor_block.at`：textarea 置于高亮 `<pre>` 之上
  （叠层定位，pre aria-hidden），pre 内容 = highlight 桥产出 HTML（ext 桥
  `renderCodeHighlight(code, language)` 经 setHighlightImpl 通道）；ext 桥
  同步 oninput/onscroll 的 scrollLeft/scrollTop 与 autoresize 高度。
- 文本颜色设为透明（textarea caret 保留）——经典 overlay 方案。

## 测试设计

- **headless 单测**（vitest）：marks 工具（跨界/合并/取消/嵌套）；命令
  （toggle→serialize roundtrip 含 `**b**`、撤销一步）；adapter isActive
  （构造带 mark 的选区）；selection-map 纯函数偏移算法。
- **SSR**：BlockHost 富渲染含 strong/em/a 元素。
- **e2e**（demo，新增 `e2e/inline-marks.spec.ts`）：选中文字→Ctrl+B→失焦→
  预览 `<strong>` + serialize roundtrip；气泡出现于选区上方→点击 italic；
  链接 Ctrl+K→prompt→a 元素；着色叠加层存在（pre.code-editor-highlight）
  且滚动同步。
- **回归门**：engine 全量（309 基线）、`pnpm build` 三断言、gen 确定性
  两连跑、demo e2e 全绿（9+1 spec）、jade-garden build。

## 验收标准

- [ ] 聚焦含加粗/斜体/链接的段落，宿主直接呈现富文本（非纯文本源码）。
- [ ] 选中一段文字 Ctrl+B / 气泡 bold / Ctrl+K 链接：失焦后预览与
  `serialize` 输出含对应 markdown 标记；撤销一步恢复。
- [ ] IME 在富宿主内输入正常（composition 协议回归）。
- [ ] BubbleMenu 在选区上方出现，isActive 反映当前选区 marks，无 underline
  按钮；为其裁剪后 `pnpm gen:editor` 确定性保持。
- [ ] CodeEditorBlock 编辑区呈现语法着色叠加层，输入/滚动同步无错位。
- [ ] 跨块选区调用映射返回 null 且不崩溃（在档 v1 限制）。
- [ ] EDITOR-CONTRACT 冻结面零破坏；既有 9 spec 全绿。

## 执行步骤

> 约定：工作树 `.worktrees/plan-024-dev`（由 /auto-plan:work 创建）；验证
> 均在工作树根执行。`PnTm` = Phase n Task m。

### Phase 0：mark 命令层（headless 地基）

- [ ] P0T1 spans 重切分工具：新建 `autodown/packages/engine/src/editor/engine/marks.ts`（toggleMarkOnSpans/setLinkOnSpans/marksAtRange）+
  `src/editor/__tests__/marks.test.ts`（TDD 先红：跨界切分/同 mark 合并/
  部分覆盖取消/嵌套保持/link attrs）。验证：`npx vitest run src/editor/__tests__/marks.test.ts`。
- [ ] P0T2 mark 命令与 isActive 源：`src/editor/engine/commands.ts` 增
  `toggleMark/setLink`（applyTree 一步撤销）与 `marksInRange(engine, sel)`；
  `commands.test.ts` 增段（toggle→serialize roundtrip + undo）。验证：
  `npx vitest run src/editor/__tests__/commands.test.ts`。

### Phase 1：选区映射

- [ ] P1T1 选区映射层：新建 `src/editor/engine/selection-map.ts`
  （domRangeToBlockRange/blockRangeToDomRange + 偏移 walk 纯函数抽出）+
  `src/editor/__tests__/selection-map.test.ts`（纯函数注入节点序列测；
  跨块 null 语义）。验证：`npx vitest run src/editor/__tests__/selection-map.test.ts`。

### Phase 2：富文本宿主（核心）

- [ ] P2T1 富渲染：改 `src/editor/components/BlockHost.vue`——挂载内容由
  spans 渲染内联元素（strong/em/del/code/a，a 禁跳转），保持既有事件面；
  SSR 断言入 `src/editor/__tests__/blockhost-rich.test.ts`。验证：
  `npx vitest run src/editor/__tests__/blockhost-rich.test.ts`。
- [ ] P2T2 失焦富回写：`src/editor/engine/host-controller.ts` 增
  `onRichBlur(domRoot)`（DOM walk 收集 spans → 整块 applyTree 回写，
  CodeEditor 同构）+ host-controller.test.ts 增（walk 纯函数注入测）。
  BlockHost @blur 分流（纯文本 diff 已无未提交变化时走富回写）。验证：
  `npx vitest run src/editor/__tests__/host-controller.test.ts`。
- [ ] P2T3 输入期语义在档回归：确认输入 diff/IME/Enter/Backspace 协议在富
  DOM 下不破（textContent 语义覆盖富结构）；`pnpm test` 全绿。验证：
  `cd autodown/packages/engine && pnpm test`。
- [ ] P2T4 e2e 钉死：新建 `autodown/demo/e2e/inline-marks.spec.ts`——
  选中→Ctrl+B→失焦→预览 strong + roundtrip；IME 冒烟（type 中文）。
  验证：`cd autodown/demo && npx playwright test inline-marks.spec.ts`。

### Phase 3：气泡菜单激活

- [ ] P3T1 adapter mark 链：`src/editor/engine/tiptap-adapter.ts`——
  isActive(name) 真实现（marksInRange）+ chain 增 toggleBold/Italic/Strike/
  Code（转发聚焦宿主 DOM 包裹）+ `tiptap-adapter.test.ts` 增段。验证：
  `npx vitest run src/editor/__tests__/tiptap-adapter.test.ts`。
- [ ] P3T2 BubbleMenu 激活与裁剪：改 `auto/editor/bubble_menu.at` 移除
  underline 按钮；`src/editor/components/EngineEditor.vue` 装配
  `<BubbleMenu :editor="adapter">` + 选区矩形定位（computeMenuPosition
  通道）；`pnpm gen:editor` 两连跑确定性 + 对拍（underline 缺席）。
  验证：`pnpm gen:editor && pnpm gen:editor && pnpm build`。
- [ ] P3T3 快捷键与链接：Ctrl+B/I/K（BlockHost keydown 或内容级）+
  链接 prompt 通道（runBubbleLink 既有）+ e2e 增例（气泡出现/isActive/
  italic/链接）。验证：`cd autodown/demo && npx playwright test inline-marks.spec.ts`。

### Phase 4：代码编辑态着色（023 待澄清 #2 收编）

- [ ] P4T1 着色叠加层：改 `auto/editor/code_editor_block.at`——textarea
  叠于 `pre.code-editor-highlight`（aria-hidden）之上，文本色透明保留
  caret；`auto/editor/ext/code_editor_block_ext.ts` 增
  renderCodeHighlight（highlight 桥）与滚动/高度同步；gen 重生成 + 对拍 +
  e2e 增例（叠加层存在、滚动同步）。验证：`pnpm gen:editor && pnpm gen:editor
  && pnpm build && cd ../../demo && npx playwright test`。

### Phase 5：收尾

- [ ] P5T1 全量门：engine `pnpm test && pnpm build`、gen 确定性两连跑、
  demo e2e 全绿（9+1 spec）、`cd jade-garden/front && pnpm build`——四门
  全绿后状态推进 `execution_done`。

## 复审记录

（/auto-plan:review 填写）

## 待澄清事项

- [ ] 富宿主回写粒度 v1：起草为"失焦整块回写"（CodeEditorBlock 同构；避开
  无 mark op 的内核约束与逐键结构 diff 复杂度）。备选：逐键 DOM↔spans 增量
  diff（真 Tiptap 级，改动面大）。是否认可？
- [ ] underline 裁剪：Mark 枚举/序列化器（生成物）无 Underline——起草为
  v1 裁掉气泡按钮，补 mark 另立小项（需动 parser/serializer .at 源）。
  是否认可？
- [ ] 跨块选区 v1 限定单块（映射返回 null）——跨块格式化后续计划。是否认可？
- [ ] 容器块（list/blockquote）聚焦下沉：**不并入本计划**，单列 plan-025
  （理由：024 已动宿主协议核心；下沉改变 views/selection 顶层假设，混做
  风险叠加）。是否认可？
- [ ] auto-lang 两项编译器债务（TDZ 顺序 / .at 命名静默空渲染）：起草为
  024 前置或 Phase 0 并行小项（在 auto-lang 仓修）。归置方式待定。
