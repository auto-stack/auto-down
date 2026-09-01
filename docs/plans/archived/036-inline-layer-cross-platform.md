# [PLAN-036] 行内层跨平台——选区适配契约 + 行内 wikilink/math 模型化 + MathInline 激活

---
plan_id: PLAN-036
status: archived
feature_name: SelectionAdapter 行内选区/动词契约（DOM 适配 + VM iced rich_text 实现基准）+ 行内 wikilink/math 升格为模型 span（020 DOM 装饰器退役）+ MathInlineNodeView 处置
author: [zhaopuming]
created_at: 2026-09-01
updated_at: 2026-09-01

# /auto-plan:work 执行注记（开工时落）

- 执行日期：2026-09-01。待澄清①—④均按计划内"建议"项裁定执行（①
  `$..$` + 左侧非空白/右侧非数字启用规则；② 架构 a：live-DOM + blur
  回收维持，adapter 只抽象动词面；③ 装饰器立即退役不留双轨；④ v1
  从简——编辑态常显源码字面、view 态渲染，node view 走退役路线）。
  若执行中被证伪，回填本节并记待澄清。

# /auto-plan:review 填定（merge 时沉淀）
supersedes_spec_components:
  - "EDITOR-CONTRACT §1 .autodown-wikilink-label 行: 修改——020 渲染后装饰器退役，render-node span 直渲接管（DOM/事件契约逐项保形），新增 .autodown-math-inline + data-math-src 行"
  - "ARCHITECTURE §6 手写平台层清单: 修改——dom-marks.ts/wikilink.ts 退役，selection-adapter.ts 入列；部署物 19→18、widget 源 21→20；MathInline node view dormant 销注；行内 WYSIWYG 缺口收窄（动词面已契约化）"
  - "P031 工件契约（render/preview.ts）: 修改——math_inline 的 inline 复用（renderKatexPreview displayMode=false 入 renderInlineNode，错误降级源码字面+title 提示）"
  - "DEBTS 台账: 修改——026③ MathInlineNodeView 处置销号、021 WikiLink 在册去重注记销账（020 装饰器退役）、008 解析子集行补行内方言入集"
new_spec_components:
  - "EDITOR-CONTRACT §9 行内层平台面: 新增（9.1 SelectionAdapter 契约：接口/TextRange 平文本坐标/DOM 适配归属/toggleMark 场外辅助/Link 真值表/prompt 留调用侧/调用面/VM 映射；9.2 行内 wikilink/math_inline 模型 span：attr 携带表示/方言规则/三模式渲染/载荷 seam——VM 后端实现基准）"
  - "engine selection-adapter 平台件: 新增（src/editor/engine/selection-adapter.ts——D1 四方法冻结面 + domSelectionAdapter（dom-marks 全量迁入）+ setFocusedRichHost 登记槽 + toggleMark 辅助）"
  - "行内 span 渲染通道: 新增（render-node wikilink label/math katex inline 两 case + render/wikilink-opener.ts 应用回调 seam + rich-html.ts 挂载/回收对（contenteditable=false 原子 label + class/data-attr 两类 blur 走查回收）+ block-wnode.ts leaves() 双桥）"
  - "行内解析方言（双发射）: 新增（markdown_parser.at [[title]]/[[title#block]] 与 $src$ siyuan 系启用规则 + serializer 对称发射 + parse_parity wikilink/math-inline fixture + 守恒表 6 组 byte-canonical）"
touched_goals:
  - "P024-2: 行内 WYSIWYG 目标条目改写——动词面契约化（SelectionAdapter + domSelectionAdapter，EDITOR-CONTRACT §9.1）为其 VM 延伸面；行内 wikilink/math_inline 模型化 + view/stream/edit 三模式同渲染收口该目标的行内层余量（模型驱动即时 mark 应用按架构裁定②维持后置）"

current_step: 10
total_steps: 10
---

## 变更摘要

"完美态"路线图 M2 收官件，也是引擎侧最后一块硬骨头。行内层现状三个
结构问题：

1. **mark 编辑是 DOM 专有**：Ctrl+B/I/K 走 `dom-marks.ts`（DOM Selection
   就地包裹 strong/em/link）+ blur 时 `domRootToSpans` 走查回模型
   （024 裁定的"live DOM + blur 回收"）；bubble 菜单/tiptap-adapter 的
   mark 链同源。iced 没有对应物——VM 端无法照搬。
2. **行内 wikilink 不在模型**：parser 保持纯文本，`wikilink.ts` 是
   **渲染后 DOM 装饰器**（扫文本包 `.autodown-wikilink-label` span，
   020 Phase 3）——web-only 的后处理，VM 端无 DOM 可装饰。
3. **MathInline 无承载**：`math_inline_node_view.at` 在册 dormant
   （DEBTS 026③），行内数学连解析 span 都没有。

本计划三段：

**P1 SelectionAdapter 契约**：把 dom-marks/tiptap-adapter mark 链的
动词面（读选区/施加/移除 mark、link 交互）抽成**平台中立接口**，
dom-marks 迁入为 DOM 适配实现（行为零漂移）；契约冻结进
EDITOR-CONTRACT——VM 端 iced rich_text 的实现基准（034 RichTextHost
平台面同口径）。

**P2 行内 wikilink 模型化**：parser inline 子集升格 `[[title]]` 为
span 类型（.at 单源双发射 + 对拍金标 + 守恒表），渲染侧 span 渲染器
（`.autodown-wikilink-label` DOM 契约保形），**020 装饰器退役**
（模型化后"无双轨"去重注记销账）；编辑态=可点击（open-wiki-link
零漂移）+ 源码字面可编辑。

**P3 MathInline**：语法裁定（待澄清①）→ parser span + 渲染（复用 031
工件契约的 inline 变体）→ `math_inline_node_view.at` 处置（激活或
退役，按交互形态裁定）。

**不做的**：mark 的模型驱动即时应用（架构 b，见待澄清②——live-DOM
+blur 回收语义维持，adapter 只抽象动词面）；解析子集余量
（sub/sup/insert/linkify/footnote，DEBTS 008 独立跟踪）；行内 image
交互深化（渲染已在册）；VM 端实现本身。

## 目标

1. **契约在册**：SelectionAdapter 接口（选区读取/mark 动词/link 交互，
   文本坐标语义）冻结 EDITOR-CONTRACT；DOM 适配实现过既有
   inline-marks e2e **零改动**。
2. **wikilink 模型化**：`[[..]]` 双发射解析 + 守恒对拍绿；渲染 DOM
   契约（class/data 属性/事件）零漂移；装饰器 `wikilink.ts` 物理退役；
   jade e2e 04（依赖 `.autodown-wikilink-label`）零改动通过。
3. **MathInline 通**：解析/渲染/roundtrip 全通；渲染态 + 源码态切换
   （交互形态按待澄清④）；node view 处置在案。
4. **行内层 parity**：行内 span（wikilink/math/mark）在 view/stream/edit
   三模式同渲染（030/033 家族语义的行内延伸）。

## 架构方案

```
P1 选区适配（手写平台层，034 ext 桥同哲学）
src/editor/engine/selection-adapter.ts（新）
├─ interface SelectionAdapter {
│    getSelection(): { blockId, start, end } | null   // 文本坐标
│    applyMark(mark: Mark, attrs?: LinkAttrs): boolean
│    removeMark(mark: Mark): boolean
│    isActive(mark: Mark): boolean
│    promptAndApplyLink(): boolean   // 交互留 app 面，adapter 只收结果
│  }
├─ domSelectionAdapter：dom-marks.ts 全量迁入（setFocusedRichHost
│   登记/domToggleMark 包裹/domSetLink），行为逐字节对齐
└─ 调用面切换：RichTextHost ext 桥键路由（Ctrl+B/I/K）与
   BubbleMenu/tiptap-adapter mark 链 → adapter（调用点不感知后端）

P2 wikilink 模型化（parser 单源 + render span）
auto/parser/markdown_parser.at
├─ inline 扫描增 `[[title]]` → WNode("wikilink", title 槽)（转义
│   规则：`[[[` 字面化；不识别跨行）
├─ serializer 对称发射 `[[title]]`
└─ 双发射 + rust-parse-parity-gen 对拍金标 + 守恒表增组
src/parser/block-model.ts（gen 对齐）
└─ InlineSpan 增 Wikilink 变体（或 WNode inline 类型表 +19 槽位
   对齐——执行期按现结构定，倾向新 inline 类型常量）
src/render/render-node.ts（文本面板 inline 渲染）
└─ wikilink → span.autodown-wikilink-label[data-wikilink-title]
   + click → open-wiki-link(title, blockId)（现装饰器 DOM 契约逐项
   保形）；stream/final 同型（renderInlineChildren 单通道）
src/editor/wikilink.ts 删除（装饰器退役）

P3 MathInline（同 P2 通道 + 工件复用）
auto/parser/markdown_parser.at
└─ inline 数学定界（待澄清①裁定语法）→ WNode("math_inline", src 槽)
src/render/render-node.ts
└─ math_inline → span 渲染（katex inline html，renderKatexPreview
   displayMode=false；错误降级源码字面——031 工件契约 inline 复用）
编辑态：源码字面可编辑（live-DOM 语义自然覆盖）+ 渲染态点击 →
   就地源码/预览切换（待澄清④）
auto/editor/math_inline_node_view.at 处置：激活（若走 node view 挂载）
   或退役（若走 render-node span 直渲——倾向后者，行内无块级挂载位）
```

**为何 span 直渲而非 node view**：行内节点在文本面板的 inline 流内，
无块级挂载位（026③ 的根因）；render-node 的 inline 渲染通道
（renderInlineChildren）是唯一自然宿主——WikiLink 的 020 装饰器当年
绕开模型正是因为此通道无 span 类型，本计划补上类型即归位。

## 技术栈

- Auto parser DSL（.at 单源双发射 + 对拍金标）
- TS 平台层（selection-adapter / render-node span 渲染器）
- katex（经 preview.ts 既有桥，inline displayMode）
- Vitest + Playwright + 守恒/对拍既有口径

## 需求分析与背景调查

（来源：.autoos/specs.json 总览、DEBTS.md、engine 源码核查 2026-09-01；
前置 = PLAN-035 merge（软依赖：gen 清单与 ext 桥计数基线；行内层本体
只依赖 034 已归档的 RichTextHost/事件面）

- mark 层盘点：Mark 七种（Strong/Em/Code/Link/Image/Del/Underline，
  028 补 Underline）；dom-marks 三导出（setFocusedRichHost/
  domToggleMark/domSetLink）；rich-html 双向（spansToHtml 模型→DOM /
  domRootToSpans DOM→模型）；bubble（024 激活）与快捷键共用 dom 面。
- wikilink 链路盘点：parser 无 inline 类型（grep 证）——`[[..]]` 以
  纯文本入模型；`src/editor/wikilink.ts` 渲染后装饰（`.autodown-
  wikilink-label` span + data-wikilink-title + open-wiki-link 事件）；
  EDITOR-CONTRACT 在册该选择器（jade e2e 04 依赖）。
- MathInline 盘点：`math_inline_node_view.at` 在册（026 dormant），
  DEBTS 026③"行内 math 无块级承载，与行内选择模型同期"——本计划
  即该"同期"。
- 解析子集边界：行内已收 text/strong/em/underline/inline_code/link/
  image/strikethrough/hardbreak；wikilink/math_inline 缺席（DEBTS 008
  口径外的 autodown 特有方言）。
- 契约冻结面：EDITOR-CONTRACT `.autodown-wikilink-label` 行、
  open-wiki-link 事件载荷、inline-marks e2e（024 立的 Ctrl+B/I/K 面）。
- spec 支点：P024-2（行内 WYSIWYG——动词面契约化是其 VM 延伸）、
  P020 系装饰器、P031 工件契约（inline 复用）。
- DEBTS 对账：026③ 销号（MathInline 处置）；021 行 WikiLink"在册
  去重"注记销账（装饰器退役，无双轨）；008 行注记补 wikilink/
  math_inline 入子集。

## 详细设计

### D1 SelectionAdapter 接口（T1 审计冻结）

```ts
export interface TextRange { blockId: string; start: number; end: number }
export interface SelectionAdapter {
  getSelection(): TextRange | null
  isActive(mark: Mark): boolean
  applyMark(mark: Mark, href?: string): boolean
  removeMark(mark: Mark): boolean
}
// 注：文本坐标 = 模型 spans 的平文本 offset（domRootToSpans 同坐标系）
```

- DOM 适配：现 domToggleMark 的 selection→Range 包裹逻辑迁入；
  `promptAndApplyLink` 的 window.prompt 留在调用侧（ext 桥），adapter
  收 url 施加——交互策略不进契约。
- tiptap-adapter 的 mark 链动词（isActive/toggleMark shim）改委托
  adapter——bubble 菜单调用面不变。

### D2 wikilink span（parser + 守恒）

- 扫描规则：`[[` 起 `]]` 止，内部禁换行；空 title/未闭合 → 字面文本
  （008 方言哲学）；`[[[` 前置转义。
- WNode 槽位复用 title 槽（19 参位与 link/image 同族）；serializer
  `[[title]]` 对称；守恒表增 3 组（基本/转义/未闭合降级）。
- InlineSpan 表示：Mark 数组之外新增 span 类型字段（执行期按
  block-model 现结构选最小侵入面——倾向 `kind: 'wikilink'` 变体或
  复用 Link + data 属性，以 roundtrip 无损为准）。

### D3 span 渲染器（render-node）

- wikilink：`h('span', { class: 'autodown-wikilink-label',
  'data-wikilink-title': title, onClick })`——与装饰器现 DOM 逐字节
  对齐（含事件载荷 open-wiki-link(title, blockId)）。
- math_inline：`renderKatexPreview(src, false)` 成功 → html 注入
  span；失败 → 源码字面 + title 提示（031 error idiom）。
- 编辑态：live-DOM 下 span 随 innerHTML 注入自然呈现；blur 回收
  domRootToSpans 增 wikilink/math_inline 走查分支（保 span 回模型）。

### D4 交互形态（待澄清④裁定后冻结）

- wikilink 编辑态点击：现装饰器行为=open-wiki-link（预览侧）；编辑
  侧点击聚焦宿主（不跳转）——维持现状语义，仅契约化。
- math_inline：渲染态点击 → 该 span 高亮为源码字面（CSS 态切换，
  contenteditable 内不可变 DOM 子树的风险记录）或选中后由 ext 桥
  显示源码 tooltip——v1 从简：源码字面常显于编辑态、渲染态仅 view
  （031 块级"源码+预览同屏"的行内退化版），交互增强后置。

## 测试设计

- **零改动回归（硬验收）**：inline-marks e2e（Ctrl+B/I/K 面）、
  semantics.test.ts、jade e2e 04（若在本仓可跑；选择器契约面 grep）、
  serializer-roundtrip / parse_parity 全量。
- **新增单测**：adapter（选区坐标/mark 动词/DOM 适配对拍 dom-marks
  旧行为快照）；wikilink 解析守恒 3 组 + 双端对拍；span 渲染 DOM
  契约；domRootToSpans wikilink/math_inline 回收分支。
- **e2e 增**：demo 行内样例（`[[..]]` 与 inline math 进 content.ts）+
  点击断言 + blur 回收 roundtrip。
- **IME 回归**：034 的 CDP 三例通道复跑（选区重构后必检）。

## 验收标准

1. EDITOR-CONTRACT §行内选型平台面在册（接口/坐标语义/DOM 适配
   归属）；inline-marks e2e 零改动绿；IME 三例复跑绿。
2. `[[..]]` 双发射对拍 + 守恒绿；装饰器删除；`.autodown-wikilink-label`
   DOM/事件契约零漂移（e2e 佐证）。
3. MathInline 解析/渲染/回收全通；node view 处置在案；工件 inline
   复用在册。
4. 三模式行内同渲染（view/stream/edit 的 span 一致性抽查断言）。
5. DEBTS 026③销、021 WikiLink 注记销、008 子集注记补；ARCHITECTURE
   §5/§6（行内层段 + wikilink 装饰器退役）更新完。

## 执行步骤

- [x] T1 审计冻结 D1 接口：dom-marks/tiptap-adapter/bubble 调用面
      盘点表（函数→adapter 方法映射）落本文件；验证：映射表复核无
      遗漏调用点（grep 三源全命中）。
      [✅ 已完成] 盘点表落本节下方（2026-09-01）；grep
      `dom-marks|domToggleMark|domSetLink|setFocusedRichHost|`
      `getFocusedRichHost` 全仓命中 5 文件：ext 桥双份（auto/ 源 +
      src/ 部署）、dom-marks 本体、tiptap-adapter、rich-text-host-ext
      单测 import——三源全命中、无遗漏、无公共 API 泄漏（engine/
      editor 两个 index.ts 不再导出 dom-marks 符号）。

#### T1 调用面盘点表（冻结，D1 之审计落地）

实际路径：`autodown/packages/engine/src/editor/engine/dom-marks.ts`
（计划内 `src/editor/engine/` = engine 包 `src/editor/engine/`）。

**现状符号 → adapter 归宿：**

| dom-marks 现符号 | selection-adapter.ts 归宿 | 语义保形要点 |
|---|---|---|
| `setFocusedRichHost(el\|null)` | 模块级宿主槽（接口外，DOM 适配实现的状态） | 原名原签名；ext 桥 mount/focus/blur/unmount 四调用点仅换 import |
| `getFocusedRichHost()` | 同上导出 | tiptap-adapter `coordsAtPos` 定位回退继续消费 |
| `domToggleMark(tag)` | 拆解为 `isActive(mark)` + `applyMark(mark)` + `removeMark(mark)` 三方法 + 模块级辅助 `toggleMark(adapter, mark)`（= isActive ? remove : apply，**非**接口成员——D1 四方法冻结面之外） | isActive = 原 unwrap 三条件（起终点包裹元素存在且同一且包含 commonAncestor）；unwrap 分支体→removeMark；wrap 分支体→applyMark；行为逐字节对齐 |
| `domSetLink(href\|null)` | `applyMark(Mark.Link, href)`（已连→改 href / 未连→wrap）+ `removeMark(Mark.Link)`（已连→unwrap）；domSetLink 真值表整体迁入，两方法为其投影（Link + falsy href 的 applyMark 落到 removeMark 语义） | Ctrl+K 的 window.prompt 留 ext 桥调用侧；chain.setLink/unsetLink 行为零漂移 |
| （新契约读面） | `getSelection(): TextRange \| null` | Range→平文本 offset（`Range.toString().length` 数学 + `\u00A0→' '` 归一 = domRootToSpans 同坐标系）；blockId 取宿主 `data-block-id`；collapsed/出宿主→null |

**三源调用点 → 新调用：**

1. **ext 桥**（`auto/editor/ext/rich_text_host_ext.ts` 源 + `src/editor/ext/` 部署副本，双份同改）：`hostKeydown` Ctrl+B/I → `toggleMark(adapter, Strong/Em)`；Ctrl+K → prompt 后 `applyMark(Link, url)`；`mountHost`/`hostFocus`/`hostBlur` 的登记/注销 → 原名直呼（import 换源）。
2. **tiptap-adapter**：chain `toggleBold/toggleItalic/toggleStrike/toggleCode/toggleUnderline` ×5 → `toggleMark(adapter, ...)`；chain `setLink/unsetLink` → `applyMark(Link, href)`/`removeMark(Link)`；`coordsAtPos` 的 `getFocusedRichHost()` import 换源。
3. **bubble**（`bubble_menu.at` 按钮 + `bubble_menu_ext.runBubbleLink`）：全部经 `editor.chain().focus().toggle*().run()` / `setLink/unsetLink` 动词链——**调用面零改动**，动词链底层已换 adapter。

**裁定两条（复审复核点）：**

- `EditorAdapter.isActive`（bubble 按钮 active 旗标）**维持模型读**
  `commands.marksInRange`（headless 单测锁死 + 旗标零漂移）——与
  SelectionAdapter.isActive（选区包裹真值，DOM 适配实现）语义不同
  位不合并；D1 "isActive shim 委托 adapter" 读取为动词面委托。
- Mark→tag 映射：Strong→strong / Em→em / Del→del / Underline→u /
  Code→code（TAG_ALIASES 五键）；Link→a 走专用分支；Mark.Image 无
  DOM wrap 面（applyMark 返 false，与今日无调用点一致）。

**随删测试换源**：`__tests__/rich-text-host-ext.test.ts` L27 的
`getFocusedRichHost` import 换 selection-adapter（断言体不变）。
- [x] T2 `src/editor/engine/selection-adapter.ts` 接口 +
      domSelectionAdapter（dom-marks 迁入，快照对拍测试）；验证：
      `pnpm --filter @autodown/engine test -- selection-adapter` 绿。
      [✅ 已完成] selection-adapter.ts 落地（接口+DOM 适配+toggleMark
      辅助）；20 例绿（headless no-op 2 + happy-dom 18 含 dual-run
      11 场景新旧字节对拍）——验证命令 2 files/20 tests passed。
- [x] T3 调用面切换（ext 桥键路由/bubble/tiptap-adapter → adapter）+
      dom-marks.ts 删除；验证：inline-marks e2e 零改动绿 + IME CDP
      三例复跑。
      [✅ 已完成] ext 桥（auto/ 源+src/ 部署双份）Ctrl+B/I/K →
      toggleMark(adapter, Mark)/applyMark(Link, url)；tiptap-adapter
      chain 动词 ×7 → adapter；bubble 调用面零改动；dom-marks.ts
      删除（净 -164 行）；inline-marks e2e 6/6 零改动绿 + IME CDP
      三例 3/3（临时 spec 复跑后删，034 同处置）+ engine 692/692。
- [x] T4 `auto/parser/markdown_parser.at` + `serializer.at` wikilink
      span（D2）+ `pnpm gen:parser` + rust trans + 对拍金标 3 组；
      验证：双侧 parity 绿 + 守恒表增组过。
      [✅ 已完成] .at 双源落地（wikilink WNode title 槽=raw inner +
      attr 'wikilink' 判别，无新 Mark；`[[[` 转义/空 title/未闭合/含 |
      降级字面）；gen:parser + a2r 双重生；parse_parity 增 wikilink
      fixture、golden 重写——TS parser 161/161 + cargo test 全绿（双侧
      parity）；守恒表增 4 组 byte-canonical 绿；wikilink.test.ts 9 例。
      执行裁定：span 表示取 D2 备选"复用 data 属性"（attr 判别、无新
      Mark.Link、roundtrip 无损为准）。
- [x] T5 `src/render/render-node.ts` wikilink span 渲染器（D3 契约
      逐字节对齐）+ `src/editor/wikilink.ts` 删除；验证：DOM 契约
      对拍测试（装饰器旧输出快照）绿。
      [✅ 已完成] render-node case 'wikilink' 直渲 label span（class/
      data-wikilink-title/label/onClick stopPropagation 逐项对齐装饰器）
      + wikilink-opener.ts seam（open-wiki-link 事件零漂移；静态渲染
      惰性）；block-wnode leaves() attr→WNode 桥；EngineEditor 装饰器
      注册退役；wikilink.ts + 旧装饰器单测物理删除；wikilink-render
      .test.ts 6 例 DOM 契约锁绿；engine 705/705 + build 四断言绿。
      （与 T4 同 commit 落地——待澄清③"模型化与 span 渲染同 PR 落"，
      装饰器单测 4 例在 T4 后短暂红、T5 退役归零。）
- [x] T6 math_inline：parser span + 渲染器（D3，工件 inline 复用）+
      `domRootToSpans` 回收分支（wikilink/math_inline 两类）；验证：
      单测（解析/渲染/回收三组）绿。
      [✅ 已完成] `$..$`（① siyuan 规则）→ math_inline span
      （attr=text=src，编辑态常显源码字面）；render-node katex inline
      （031 工件契约 displayMode=false，错误降级源码字面+title）；富宿
      主挂载/回收对（spansToHtml wikilink label 装饰器契约保形 + math
      源码载体；richTreeToSpans class/data-attr 两类回收）——往返无损；
      守恒表 +2、parity fixture math-inline、cargo 双侧绿；单测三组
      12+3+8 例全绿；engine 729/729 + build 四断言。
      执行发现：a2ts codegen 丢内层括号致 `!(a&&b)` 误编译——digitAfter
      局部绕道（源内注记）。
- [x] T7 `auto/editor/math_inline_node_view.at` 处置（激活或退役，
      按待澄清④）+ gen 清单同步；验证：`node
      scripts/assert-editor-gen.mjs` 零退出。
      [✅ 已完成] 退役（④ v1：render-node span 直渲为行内自然宿主）：
      .at + 生成 SFC 物理删除、gen.mjs 条目移除 + 计数 21→20、
      assert 期望 19→18、node_view_ext renderKatexPreview 纯再导出随退
      （双份同步）；assert-editor-gen 零退出（18 chrome/14 ext）+
      gen:editor 绿 + engine 729/729 + build 四断言。
- [x] T8 demo content.ts 行内样例 + e2e 增（点击/blur 回收/三模式
      span 一致性）；验证：`pnpm --filter demo exec playwright test`
      全量绿。
      [✅ 已完成] content.ts 末尾行内样例段；inline-spans.spec.ts 3 例
      （label 点击 stopPropagation 不落选块/edit-blur 回收往返/三模式
      span 面一致含右 pane katex）绿；block-wnode math 桥 T6 补缺
      （e2e 实测逼出）；全量 49/50 + scroll-sync 109/141 为 034 已档
      master 存量 flake（A/B 复证无本计划改动同症状），重跑绿；留档
      截图两张随副产物更新。
      执行注记：编辑面 host 裸挂（slot chrome 让位、data-block-id 在
      host 自身）——e2e 定位循全局单例口径。
- [x] T9 EDITOR-CONTRACT（§SelectionAdapter 平台面 + wikilink 段
      mode 注记）+ ARCHITECTURE §5/§6 + DEBTS（026③/021 注记/008
      子集）；验证：文档 diff 复核。
      [✅ 已完成] EDITOR-CONTRACT 新 §9（9.1 SelectionAdapter 接口/
      TextRange 坐标/DOM 适配归属/toggleMark 场外辅助/Link 真值表/
      prompt 留调用侧/调用面/VM 映射 + 9.2 行内 span 模型表示/方言
      规则/三模式渲染/open-wiki-link 载荷 seam）；§1 表 wikilink 行
      036 化 + 新增 .autodown-math-inline 行；§8 装饰器窗 036 注记。
      ARCHITECTURE §2/§5/§6 更新（解析子集行内方言、行内层跨平台落
      地、selection-adapter 入手写层清单、wikilink.ts 退役、18 部署
      物/20 widget 源、行内 WYSIWYG 缺口收窄）。DEBTS 026③ 销号、
      021 WikiLink 去重注记销账、008 行内方言入子集。
      jade 契约面 grep 复核：e2e 04 选择器 `.autodown-wikilink-label`
      与 `@open-wiki-link` 事件绑定均零改动（EditorTab.vue）。
- [x] T10 全量回归：engine test + build（含 assert 四链）+ demo
      playwright + IME 三例；验证：全绿。
      [✅ 已完成] engine vitest 729/729；engine build 四断言全绿
      （parser-pure / no-tiptap / editor-gen 18 chrome·14 ext /
      dist-stamp）；cargo 双侧 parity 10/10；demo playwright 49/50——
      scroll-sync 109/141 为 master 存量 flake（本检出 A/B 实证：
      master fb8f276 无本计划改动 3 跑 2 败同症状 109，与本计划无关，
      重跑即绿）；IME CDP 三例 3/3（preedit 跟随/上屏 blur 回写/
      候选取消）。

## 复审记录

- **复审人**：/auto-plan:review（2026-09-01）
- **核位**：worktree 已折入 master（e85c791 = 分支 tip，主检出核验；
  plan-036-dev 工作树已被后续会话清除，分支合入发生在复审前——折入
  动作本身不属于本技能，未经本关卡放行属流程越位，但 diff 完整可核、
  全部门禁在本检出重跑通过，见下）
- **diff 对账**：fb8f276..e85c791，44 文件 +1776/−589，与计划声称的
  落点逐一对上（新增 selection-adapter/wikilink-opener/四测试文件/
  rust 双发射/golden/三文档/e2e；删除 dom-marks/wikilink.ts/
  math_inline_node_view.at/生成 SFC/旧装饰器单测）。新增行零
  TODO/FIXME/HACK 标记。

**验收标准逐条（全部重跑取证）**：

1. **契约在册 + 零改动回归** —— ✅ PASS。EDITOR-CONTRACT §9 在册
   （EDITOR-CONTRACT.md:164，9.1/9.2 两节）；inline-marks.spec.ts 与
   wysiwyg-typography.spec.ts 零改动（diff stat 无此二文件）且全量绿；
   IME CDP 三例复审重跑 3/3（preedit 跟随/上屏 blur 回写/候选取消）。
2. **wikilink 双发射 + 守恒 + 装饰器删除 + 契约零漂移** —— ✅ PASS。
   cargo 10/10（parse_parity 含 wikilink fixture，golden 双侧逐字节）；
   守恒表 6 组绿；wikilink.ts 物理不在册；demo inline-spans e2e 锁
   label class/data 属性/点击载荷；jade 契约面 grep 复核（e2e 04 选择
   器 ×2 + EditorTab.vue @open-wiki-link 绑定零改动——jade 全栈 e2e
   未跑，计划测试设计明示"若在本仓可跑；选择器契约面 grep"的回退口径）。
3. **MathInline 全通 + node view 处置 + 工件复用** —— ✅ PASS。解析
   12 例/渲染 3 例/回收 8 例单测绿；.at + 生成 SFC 物理删除、
   assert-editor-gen 18 chrome/14 ext 零退出；render-node 经
   renderKatexPreview displayMode=false 复用 031 契约。
4. **三模式行内同渲染** —— ✅ PASS。inline-spans e2e 第三例：edit 宿
   主原子 label/math 源码字面 → blur 回收 → view 预览与 stream 右 pane
   同 face 断言（右 pane katex 可见）。
5. **文档三件 + 台账** —— ✅ PASS。DEBTS 026③ 销号/021 注记销账/008
   行内方言入子集；ARCHITECTURE §5（解析子集行内方言 + 行内层跨平台
   落地）§6（selection-adapter 入列、wikilink.ts 退役、18/20 计数、
   node view 销注）复核无残留旧口径。

**全量门禁（本检出重跑）**：engine vitest 729/729；engine build 四断
言（parser-pure/no-tiptap/editor-gen 18·14/dist-stamp）；cargo 10/10；
demo playwright **50/50 全绿**（含 scroll-sync 两例——执行期 flake 本
轮未复现）；IME 三例 3/3。

**遗漏/延后/workaround 猎获（均非阻塞，已在案）**：

- a2ts 内层括号丢弃致 `!(a&&b)` 误编译——digitAfter 局部变量绕道（
  markdown_parser.at 源内注记）；与 DEBTS 016 行在册的 a2ts 缺口同类，
  根因属 auto-lang 发射器，建议 merge 时于 016 行补一笔实例注记。
- EditorAdapter.isActive 维持模型读（commands.marksInRange）而
  SelectionAdapter.isActive 为选区包裹真值——D1 "isActive shim 委托
  adapter" 的裁定读法，T1 盘点表显式在案（headless 单测锁 + bubble 旗
  标零漂移依据）；复审认可双读面不同位不合并。
- jade 全栈 e2e 未跑（回退口径计划内已裁定，见标准 2）。
- 面板体装饰器窗机制保留而建库动机（wikilink 装饰）已退——CONTRACT
  §8/ARCHITECTURE §6 双注记，留作未来面板体后处理孔。
- wikilink 内部 canonical-trim（`[[ x ]]` 存盘归一 `[[x]]`）——
  解析期归一化方言决策（smartQuotes 同传统），测试在册。

**结论**：五条验收全 PASS，无未声明的遗漏/延后/workaround →
`status: reviewed`，可进入 `/auto-plan:merge`。

## 待澄清事项

1. **inline math 语法**（需裁定）：候选 `$..$`（CommonMark 生态惯例，
   但与 `$` 货币文本冲突需转义规则）/ `\(...\)`（LaTeX 惯例，零冲突）/
   块级方言对齐的 inline 变体。建议 `$..$` + 左侧非空白/右侧非数字
   启用规则（siyuan 系惯例），未命中即字面。
2. **适配架构**（建议 a）：a) live-DOM + blur 回收维持，adapter 只
   抽象动词面（零回归，VM 各自实现）；b) 模型驱动即时应用（选区
   映射到 offset 后直接改模型重渲——跨平台更"纯"，但 caret/IME
   保形风险高，024 裁定历史负担重）。本计划按 a 设计。
3. **装饰器退役节奏**（建议立即）：模型化与 span 渲染同 PR 落，
   不留双轨过渡（与 020"无双轨"注记一致）；若执行中发现预览装饰
   有 span 渲染覆盖不到的边角（如 stream 中段），才回退为过渡双轨
   一期并记 DEBTS。
4. **MathInline 交互形态**（建议 v1 从简）：编辑态常显源码字面、
   view 态渲染；点击切换/弹层增强后置。据此 node view 倾向退役
   （render-node span 直渲），但保留裁定空间。
