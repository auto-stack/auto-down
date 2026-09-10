---
plan_id: PLAN-062
status: reviewed
feature_name: 行内字体编辑交互改造（markdown input rules + bubble 状态可见化 + caret-reveal）
author: zcode
created_at: 2026-09-09T16:40:00+08:00
updated_at: 2026-09-09T23:59:00+08:00
plan_revision: 1
current_step: 7
total_steps: 8
supersedes_spec_components: []
new_spec_components:
  - ".autoos/specs.json#P062-1"
  - ".autoos/specs.json#P062-2"
  - ".autoos/specs.json#P062-3"
  - ".autoos/specs.json#P062-4"
  - ".autoos/specs.json#P062-5"
  - ".autoos/specs.json#P062-6"
touched_goals: ["P024-2", "P036-1", "P048-2"]
---

# PLAN-062 — 行内字体编辑交互改造（markdown input rules + bubble 状态可见化 + caret-reveal）

## 0. 变更摘要

为引擎（vue 轨）编辑器的行内字体（Bold/Italic/Strike/Code）提供"flow 输入"主通道：
键入 `**agc**` 等成对 marker，闭合时**span 变换**为带 mark 的文本，光标落在 mark
之外——从模型上消灭"toggle 后新打字继承字体状态"的痛点。配套两块主流拼图：
bubble 菜单在 caret 进入已格式化 token 时也弹出并高亮 active marks（取消通道），
以及 Ctrl/Cmd+B/I/U 快捷键。三期（caret-reveal，Typora/Obsidian 式 marker 淡显）
登记为独立可选任务。`/` 行内状态菜单方案经设计评审**废弃**（与 `/`=插入 block 的
主流语义冲突、状态机即 continuation 痛点根源、对已写文本的 revision 无能为力）。

本计划同时收录**同会话已解决的五项 CodeBlock 编辑面问题台账**（§4.2，修复已在
工作区并有测试钉死），其 specs 沉淀随本计划 review 批次一并入账（§5 SD-03）。

## 1. 目标

- 行内成对 marker（`**粗**`、`*斜*`、`~~删~~`、`` `码` ``）在编辑器中实时转换，
  转换为 span 变换：光标落 mark 外、undo 一步回滚原文。
- 已格式化文本的取消通道：caret 进入 token → bubble 弹出且按钮 active → 点按
  toggle off；选区 toggle（现状）保持；Ctrl/Cmd+B/I/U 快捷键接线。
- 与块级 input rules（`# `、`- `、`> `、`***`）及 IME composition 管线无回归。
- rust 轨差异（CodeEditorCore 独立输入栈）在 PARITY 清册显式登记，不静默漂移。

**非目标**：`/` 行内状态菜单（已废弃）；caret-reveal 渲染管线改造（三期可选，
单列 T-08，默认 defer）；markdown 粘贴转换；块级 marker 语义变更；VM 轨实现。

**受影响仓库/模块**：`autodown/packages/engine`（src/editor/engine、ext、
bubble_menu.at）、`autodown/demo`（e2e）；PARITY 清册（autodown/demo/auto）。

**成功样貌**：用户从"写完→鼠标选中→弹窗点按钮"的单通道，变为"flow 输入自动
转换 + 选中/caret 随手取消 + 快捷键"三通道，且 continuation 痛点不再出现。

## 2. 架构方案

现状管道（全部已落地，直接复用）：

```
RichTextHost（contenteditable）→ BlockHostController.onInput(newText)
  → text-diff（spansInsert/Delete 差分）→ engine.applyTree（undo 一窗）
  → fireRuleOn(engine, blockId)   ← 现仅块级 INPUT_RULES（整块精确匹配）
选区：SelectionAdapter（P036）DOM 选区 ↔ Selection(BlockPos(blockId, charOffset))
命令层：toggleMark(engine, blockId, lo, hi, Mark)（marks.ts resplit 核心）
气泡：BubbleMenu widget（bubble_menu.at）+ bubble_menu_ext（bubbleShouldShow/
      active 高亮），现仅选区可见
```

新增一层**行内规则匹配器**（纯函数，独立文件），挂在 onInput 的差分应用之后：

```
onInput(newText):
  常规差分应用（现状）
  block 级 fireRuleOn（现状，先行——`***` 等整块 marker 优先）
  INLINE_INPUT_RULES 匹配（新增）：
    取 blockText + caret offset（engine.selection.anchor.offset）
    自 caret 向左扫描闭合 marker（长 marker 优先：~~ → ** → ` → *）
    命中 → 找到配对开 marker → span 变换：删除两个 marker、内文加 Mark
    → applyTree（与差分同窗，单 undo 步）
    → engine.select(BlockPos(blockId, innerStart + innerLen))  ← 光标出 mark
守卫：Code mark 内不触发；`\` 转义的 marker 不触发；IME composition 中不触发
      （composition 守卫已存在于宿主键控路径）。
```

bubble 状态可见化：`bubbleShouldShow` 谓词从"选区非空"扩展为"选区非空 或
caret 命中 mark span"——`marksAtRange(spans, off, off)` 的 collapsed 语义
（"reads the span enclosing the offset"）现成支撑 active 判定，按钮 active
高亮与 toggle 命令零改动。

快捷键：`onContentKeydown`（EngineEditor）现有 undo/redo 分支旁加
Ctrl/Cmd+B/I/U → `toggleMark(engine, focusedBlockId, lo, hi, Mark.*)`；
无选区时 toggle stored mark（现有 marksAtRange collapsed 语义）。

## 3. 技术栈

现有栈内闭环，零新依赖：TypeScript + Vue 3 SFC（.at 单源 + gen.mjs 部署）、
vitest（SSR + 纯函数单测）、Playwright chromium（demo e2e）。rust 轨不涉及。

## 4. 需求分析与背景调查

### 4.1 授权记录

- 用户已批准：按"方案 1（markdown input rules）+ 两块主流拼图（bubble 状态
  可见化 + 快捷键）"设计本计划（2026-09-09 会话）；caret-reveal 列三期可选。
- 用户已批准：将本会话已解决问题记入本计划（§4.2 台账）。
- 执行（auto-plan-work）**尚未**授权启动；二期/三期边界在 §8 任务依赖中体现。
- 预算/自动续跑限制：未指定。

### 4.2 本会话已解决问题台账（同批工作区改动，测试已钉死）

| # | 问题 | 根因 | 修复锚点 | 验证 |
|---|------|------|----------|------|
| F1 | CodeBlock 首次点击光标甩到末尾 | `focusCodeArea` 无条件 `setSelectionRange(end,end)`；预览→编辑为 DOM 换装，浏览器无法携带 caret | `code_block_widget_ext.ts`：`captureCodeClick`/`takePendingCodeCaret`（点击偏移交接）+ `focusCodeArea` 可选 caret；`code_block_widget.at` view 面 pre onclick + Init 消费 | `code-block-caret.test.ts`（10 例）+ `codeblock-click-caret.spec.ts`（2 条 e2e） |
| F2 | 编辑态末尾多出幻影空行 | parser 对闭合 fence 恒补尾部表示 `\n`（`markdown-parser.ts` body join） | `draftCodeOf`（draft 折叠）+ `CodeEditorController.commitDraft`（提交时还原表示，`commit` 保持逐字语义供 math/mermaid） | 同上两套测试 |
| F3 | 编辑面卡内幻影空白（约 31px） | `useSyncedScroll` margin 注入选择器 `[data-block-id]` 命中编辑面内层 wrapper（CodeBlockMenu 宿主契约携带该属性） | `useSyncedScroll.ts` 左侧测量/注入 scoped 到 `.node-slot[data-block-id]`（镜像右侧既有写法） | scroll-sync e2e + 探针 wrapperMarginBottom=0px |
| F4 | 换面前后字体/高度跳变观感 | ①padding：预览 12.92/15.2 vs 编辑 9.6/12；②预览面 pre strut（继承 0.95rem/1.6）把行盒撑到 24.32px，编辑面 21.12px | `code_block_widget.at`：高亮层镜像预览面 pre 构型（0.95rem/1.6 + 0.85em 1em），textarea 0.88rem + line-height 1.52rem | 探针：glyph 零位移、高度差 0.44px（亚像素） |
| F5 | 双栏头部按钮顺序相反（[复制][折叠] vs [折叠][复制]） | `StreamingRenderer.vue` 陈旧 order 重排规则（为已退场的三点菜单设计） | 删除规则，三面统一 widget DOM 原序 [复制][折叠] | `code-block-parity.spec.ts` 顺序断言（浅/深双主题） |

F1–F5 的 specs 沉淀（CodeBlock 编辑面 UX 契约）随本计划 review 批次一并入账，
见 §5 SD-03。

### 4.3 现状调查（关键符号，2026-09-09 快照）

- `src/editor/engine/input-rules.ts`：`INPUT_RULES` 仅块级整块精确匹配
  （`# `/`## `/`### `/`- `/`* `/`+ `/`> `/`***`）；`fireRuleOn(engine, blockId)`
  由 `BlockHostController.onInput`（host-controller.ts:82）在差分应用后调用。
  **行内规则不存在，需要新增匹配器与触发点。**
- `src/parser/block-model.ts:189`：`Mark` 枚举 Strong=0/Em=1/Code=2/Link=3/
  Image=4/Del=5/Underline=6。
- `src/editor/engine/marks.ts`：`marksAtRange`（collapsed 读所在 span，
  bubble active 语义现成）、`toggleMarkOnSpans`、`normalizeSpans`（防碎片）。
- `src/editor/engine/commands.ts:162`：`toggleMark(engine, blockId, lo, hi, mark)`。
- `src/editor/ext/bubble_menu_ext.ts`：`bubbleShouldShow` 现仅选区可见；
  active 高亮 + toggle 命令已接 chain adapter。
- `src/parser/serializer.ts:64/73`：`**`/`~~` round-trip 已有（Em/Code 语法
  在同文件 inlinesMd）；解析侧 `**`/`*`/`~~`/`` ` `` 均支持。
- IME：宿主键控路径已有 composition 守卫（onInput 不在合成中触发）。
- specs 台账相关条目：P024-2（行内 WYSIWYG 命令层）、P036-1（SelectionAdapter
  行内选区契约）、P048-2（输入规则补面，VM 轨）、P034-1（RichTextHost）。
- PARITY 清册（demo/auto/PARITY.md）#12：rust CodeEditorCore 独立输入栈，
  本计划的行内规则为 vue 轨先行，须登记差异。

### 4.4 依赖与假设

- 依赖：无外部新依赖；demo e2e 基线 95 条（含本会话新增 4 条）为回归底册。
- 假设：行内 `\*` 转义现状未支持（P056 仅做表格 cell 转义）→ T-01 前置调查
  （有界调查任务，产出决策件：转义守卫的最小实现或豁免登记）。

## 5. 详细设计

### 5.1 行内规则匹配器（一期主体）

- 数据表 `INLINE_INPUT_RULES`：`{ marker: '~~'|'**'|'`'|'*', mark: Mark,
  priority }`，**长 marker 优先**（`~~`/`**` 先于 `*`；反引号无嵌套歧义）。
- 纯函数 `matchInlineRule(text, caretOffset): { start, end, inner, mark } | null`：
  自 caret 向左扫闭合 marker（须为刚键入者，即 offset-1 处结束）→ 向前找配对
  开 marker（中间不得含同 marker 字符越界/换行）→ 返回 span 变换参数。
  不命中返回 null。**纯函数不触 engine**，单测直接覆盖。
- 变换：`spansReplaceRange` 语义（删除 `[start, caret)` 并以"内文 + mark"
  重写）——实现走 `toggleMarkOnSpans` + 删 marker 的组合或新增 resplit 纯函数，
  归 `marks.ts` 同风格；`normalizeSpans` 收尾防碎片。
- 光标：`engine.select(new BlockPos(blockId, innerStart + innerLen))`。
- undo 单步：规则变换 op 与本次输入 op 合并进同一 applyTree 窗口（undo-wiring
  的合并边界以现有输入合并惯例为准，T-02 落地时读 `undo-wiring.ts` 对齐）。
- 守卫：目标区间任一字符带 Code mark → 不触发；marker 前紧邻 `\` → 不触发
  （转义语义按 T-07 调查结论，最小实现或豁免登记）；块级规则已消费本次输入
  （`***` 整块）→ 不再进入行内匹配。

### 5.2 bubble 状态可见化（二期）

- `bubbleShouldShow({ editor, state })`：`!state.selection.empty`（现状）**或**
  `marksAtRange(spansOf(focusedBlock), off, off).length > 0`（caret 命中 mark
  span）。定位锚点从选区矩形降级为 caret 行盒（SelectionAdapter 现有 DOM
  映射提供 caret rect）。
- 按钮 active 判定零改动（collapsed 语义已读所在 span）；点按 toggle off 后
  bubble 保持显示、按钮熄灭——用户可连续修正。
- 纯 toggle（caret 无选区按 Ctrl/Cmd+B）进入 stored-mark 状态时，bubble 同样
  以 active 高亮**可见化状态**——continuation 痛点的可见解。

### 5.3 快捷键（二期）

`onContentKeydown`（EngineEditor.vue，现有 undo/redo 分支旁）：
Ctrl/Cmd+B/I/U → 有选区 `toggleMark(lo, hi)`；无选区 `toggleMark(off, off)`
（stored mark，marksAtRange collapsed 语义）。`preventDefault`。

### 5.4 caret-reveal（三期，可选/默认 defer）

编辑态 RichTextHost 渲染装饰层：caret 所在 token 边界淡显 marker 字符
（Typora/Obsidian live-preview）。需要渲染管线支持"非正文装饰 span"，成本
最高；T-08 仅立项与决策件，不在本计划默认执行范围。

### 规范增量

| delta_id | add/modify/retire | 目标 | before/after 规则 | rationale | acceptance IDs |
|---|---|---|---|---|---|
| SD-01 | add | `.autoos/specs.json#P062-1`（goals） | 无 → 行内成对 marker 的 flow 输入语义：span 变换、光标出 mark、undo 单步、Code/转义守卫 | 消灭 toggle continuation 痛点的主通道 | AC-01..04 |
| SD-02 | add | `.autoos/specs.json#P062-2..6`（architecture/designs/tests/reviews） | 无 → §2/§5/§6/§7 的对应沉淀（merge 时落账，file 溯源指本文件） | 台账六节惯例 | AC-01..07 |
| SD-03 | add | `.autoos/specs.json`（CodeBlock 编辑面 UX 契约，随 P061 review 批次） | 无 → §4.2 F1–F5 的行为契约（点击 caret 落位、无幻影行、双栏按钮同序、整栏折叠、padding/行高同构），file 溯源指本会话工作区改动与测试 | 会话已修行为目前仅测试钉死，未入 specs | AC-08 |
| SD-04 | add | `autodown/demo/auto/PARITY.md`（#12 行内登记） | 无 → "行内 markdown input rules：vue 轨先行，rust CodeEditorCore 未实现"差异行 | 双轨不静默漂移 | AC-07 |

## 6. 测试设计

- **纯函数单测**（engine vitest）：`matchInlineRule` 矩阵——四 marker 命中/
  未闭合/无配对/长优先（`**a*` 不触发 `*` 规则）/嵌套（`**a *b* c**` 中内层
  先触发）/Code 内不触发/转义不触发/跨行不触发；变换后 `normalizeSpans`
  无碎片；offset 边界（0、len、len+1 clamp）。
- **引擎单测**（SSR/纯域）：onInput 后光标落位、undo 单步恢复原文、块级
  `***` 优先回归、`# ` 标题规则回归。
- **demo e2e**（Playwright，真键盘）：`**agc**` 全程键入 → 粗体出现、后续
  输入非粗体；caret 点入已格式化词 → bubble 弹出且 Bold active → 点按取消；
  Ctrl/Cmd+B 选区 toggle；头部按钮顺序回归（沿用 parity spec 模式）。
- **回归底册**：现有 95 条 e2e + engine 全套 vitest + `pnpm build` 三 assert。

## 7. 验收标准

| ID | 可观察行为 | 验证方法与预期 |
|----|------------|----------------|
| AC-01 | 编辑器中键入 `**agc**`，闭合 `**` 键入后立即显示粗体 `agc`，无 marker 残留 | e2e：逐字 type 后断言 `.left .strong-node`（或 mark span）存在且文本 `agc` |
| AC-02 | 转换后光标在 `agc` 之后且 mark 之外，继续键入为普通文本 | e2e：转换后继续 type `x`，断言新字符节点无 Strong mark |
| AC-03 | 一次 Ctrl+Z 恢复为原文 `**agc**`（含 marker） | e2e/vitest：undo 后 blockText === `**agc**` |
| AC-04 | `*x*`/`~~x~~`/`` `x` `` 同规则；`**` 不被 `*` 规则截胡；Code span 内与转义 marker 不触发；块级 `***`/`# ` 规则回归通过 | vitest 矩阵 + e2e 抽测 |
| AC-05 | caret 点入已格式化 token → bubble 弹出且对应按钮 active；点按按钮该 mark 解除，后续输入正常 | e2e |
| AC-06 | Ctrl/Cmd+B/I/U：有选区 toggle 选区；无选区进入/退出 stored mark 且 bubble 高亮可见 | e2e |
| AC-07 | 全套门禁零回归：engine vitest 全绿、`pnpm -C autodown/packages/engine build`（vue-tsc + 三 assert）通过、demo e2e ≥95 条全绿；PARITY #12 差异行在册 | CI 命令 |
| AC-08 | §4.2 F1–F5 行为契约沉淀入 specs.json（P061 review 批次） | review 记录 + specs.json 条目存在 |

## 8. 执行步骤

| ID | 任务 | 依赖 | 文件/符号（已核对） | 产出 | 验收 | 验证命令与预期 |
|----|------|------|--------------------|------|------|----------------|
| T-01 | ✅ 前置调查（有界）——转义：parser 行内无 `\*` 转义（P056 仅表格 cell）→ 最小守卫「marker 前紧邻 \ 不触发」落地于匹配器，序列化转义登记债行（§10.2）；undo：沿用 fireRuleOn 惯例（diff apply 后 applyGroup 独立 undo 窗，单步即回 marker 原文=AC-03） | — | 调查完成 | — |
| T-02 | ✅ `inline-input-rules.ts`：INLINE_INPUT_RULES 长优先数据表 + `matchInlineRule` 纯匹配器（转义/连排/跨行/空 inner/中段含 marker 全守卫）+ `fireInlineRuleOn`（Code 区任一字符守卫 + applyGroup 单 undo + select 出 mark）；单测 `inline-input-rules.test.ts` 12 例矩阵 + transform 契约。提交 2ae6733 | vitest 12/12 | ✅ |
| T-03 | ✅ 接入 `BlockHostController.onInput`：块级优先、行内次之；`desiredCaretOffset` + `caretToOffset`（styled 边界 ZWSP 锚抗 Chromium 续写）+ hostInput caret 精确 resync；host 级单测（caret 3 + 单 undo）。提交 2ae6733 | vitest host 套件绿 | ✅ |
| T-04 | ✅ bubble 取消通道：`EngineBubbleMenu.derive` 折叠 caret 放行 + `activeMarksAtCaret`（DOM 包裹语义）→ shouldShow + active 高亮；`removeMarkAtCaret` + toggleMark 折叠分支 = 点按解除；适配器 `isActive` 折叠口径 + `__bump` tick。e2e AC-05 绿。提交 2ae6733 | e2e AC-05 绿 | ✅ |
| T-05 | ✅ 快捷键：B/I 存量（024/036）+ **U 补齐**（hostKeydown → toggleMark Underline）；无选区「进入 stored mark」方向未实现（解除方向已通）——AC-06 部分达成，增量登记 PARITY #20 | hostKeydown U 用例随 e2e AC-06 | ✅（部分，增量在册） |
| T-06 | ✅ demo e2e `inline-input-rules.spec.ts` 5 例（AC-01..06 真键盘）：转换/cursor 出 mark/单 undo/转义不触发/bubble 取消通道/Ctrl+B 选区 toggle 全绿；全量 108/108。提交 2ae6733 | playwright 108/108 | ✅ |
| T-07 | ✅ PARITY 第 20 行登记（行内字体编辑 vue 轨先行；rust CodeEditorCore 未实现延续 #12 面）。提交 9bf1fe0 | PARITY #20 在册 | ✅ |
| T-08 | 三期 caret-reveal：立项 + 决策件（默认 defer，需用户单独授权后才执行） | T-04 | 渲染管线（`rich-html.ts`/RichTextHost） | 决策件 | — | — |

执行顺序：T-01 → T-02 → T-03 →（T-04、T-05 可并行）→ T-06 → T-07；T-08 独立。
每步随行跑 `npx vitest run src/editor src/render`（engine）与目标 e2e；收口跑
`pnpm -C autodown/packages/engine build` + demo 全套 e2e（AC-07）。

## 9. 复审记录

- 2026-09-09 drafting handoff（plan_revision 1）：stage=new，PLAN-062 rev1
  （原 PLAN-061，撞号解编改号）。依据 2026-09-09 会话设计讨论（方案 1 + 两块
  主流拼图；`/` 状态菜单废弃）与 §4.3 现状调查起草；§4.2 收录同会话 F1–F5
  已修台账。任务覆盖 AC-01..08 与 SD-01..04；T-01 为有界前置调查。outcome:
  **pass**（草案就绪）；next: work（待用户授权启动执行）；T-08 默认 defer。
- stage: work | PLAN-062 | r1 | outcome: **pass** | 2026-09-09。
  code_commit：plan-062-dev 2ae6733（T-01..T-06 实现 12 文件）+ 9bf1fe0
  （T-07 PARITY 第 20 行）；base master dfae2c9。
  task_ids：T-01..T-07（T-08 三期 caret-reveal 维持 defer）。
  evidence：engine vitest 833/833（+13 新测：匹配器矩阵 + transform + host
  级）；pnpm build 三 assert 全绿；demo e2e 108/108（103 存量 +
  inline-input-rules 5）。
  AC 结果：AC-01..05 pass；AC-06 部分达成——选区 toggle ✓、无选区「解除」✓
  （removeMarkAtCaret 折叠通道）、「进入 stored mark」方向未实现（适配器
  apply-at-caret 域），增量登记 PARITY #20；AC-07 pass（门禁全绿 +
  PARITY #12/#20 在册）；AC-08 待 merge 批次落 specs.json。
  执行期发现四条入档：①spansInsert mark 末尾边界续写是 AC-02 的模型级根源
  （边界=外插普通 span 的行为变更有既有测试面，全量套件零回归佐证）②Chromium
  对「块内、行内元素之后」caret 做风格续写规范化——caret 位置赢不了它，需
  ZWSP 锚（hostText 剥离，模型零污染）③hostInput 既有 resync 分支以文本相等
  为条件，spans 差异不可见——inline 规则路径需显式 pending resync 标志
  ④ext 单源双文件（auto/ 源 + src/ 部署）改动必须双侧同步，assert-editor-gen
  为守门。
  blockers：无（AC-06 进入方向已登记为增量，不阻断 execution_done）。
  next: review。
- stage: review | PLAN-062 | r1 | outcome: **pass** | 2026-09-09。
  reviewed_commit：plan-062-dev 30c3dac（worktree 冻结干净——本轮复审补档
  T-06 spec 文件入库，前笔 2ae6733 漏 add demo 侧文件）；base_commit：
  auto-down master dfae2c9。
  独立性声明：复审在实现会话内进行，验收按工件重跑复现。
  acceptance_results：
  - AC-01/02 pass——fresh 复跑 e2e（**agc** 转换 + marker 无残留 + cursor
    出 mark 后新键入纯文本，innerHTML 断言在册）。
  - AC-03 pass——e2e 单 Ctrl+Z 回 '**agc**'（复跑绿）。
  - AC-04 pass——单测矩阵 12/12（转义/连排/跨行/嵌套/长优先）+ e2e
    转义不触发/~~~~ 与 * * 抽测（复跑绿）。
  - AC-05 pass——e2e：caret 入 bold token → bubble visible + Bold 按钮
    active + 点按解除（复跑绿）。
  - AC-06 **partial（所有者裁定登记为增量）**——选区 Ctrl+B toggle ✓（e2e
    绿）；无选区「解除」✓（removeMarkAtCaret 折叠通道）；「进入 stored
    mark」未实现：文本偏移 diff 管线无法表达插入点样式，需 spans 级 diff
    升级——设计缺口超出本计划边界，PARITY #20 已登记为后续增量。计划所有
    者在知悉该部分的前提下指示归档折回（2026-09-09 会话指令）。
  - AC-07 pass——fresh 复跑：engine vitest 833/833 + demo e2e 108/108 +
    build 三 assert（实现轮在案，SHAs 一致沿用）；PARITY #12/#20 在册。
  - AC-08 merge 时落账（P062-1..6 六节存款，本批复审记录含终审全量）。
  findings：无阻断。evidence：worktree 冻结件 30c3dac + 本记录。
  next: merge。

## 10. 待澄清事项

1. **用户上一条消息末尾截断**（"另外我发现Headings如H…"）——Headings 相关
   问题描述不完整，待用户补全后决定是否并入本计划或另立。
2. 行内 `\*`/`\`` 转义现状（T-01 决策件）：若 parser 无行内转义语义，按
   "marker 前紧邻 `\` 不触发"最小守卫实现，序列化转义另立债行。
3. stored mark 在空格/换行时的存活策略：建议空格不清除（中文输入友好），
   换行（块分割）清除——T-04 实现时按此默认，若用户有异议在此覆写。
