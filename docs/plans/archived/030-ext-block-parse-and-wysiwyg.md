---
plan_id: PLAN-030
status: archived
feature_name: 扩展块解析通道（$组件族/%{ }%/任务列表/mermaid 判定）+ 容器块 WYSIWYG 编辑面（Callout/Details/checkbox）
author: [zhaopuming]
created_at: 2026-08-31
updated_at: 2026-08-31
status_note: execution_done 于 2026-08-31（T1-T10 全绿）；reviewed 于 2026-08-31（六验收全 PASS，零阻塞债，债候选 ①-⑤ 见复审记录）；archived 于 2026-08-31（merge 六节沉淀 P030-1..6，零 supersede 加性变更）

# /auto-plan:review 填定（merge 时沉淀）
supersedes_spec_components: []
new_spec_components:
  - ".autoos/specs.json 六节 P030-1..6: 扩展块解析通道 + 容器块 WYSIWYG——P1 解析：markdown_parser.at 单源补 $callout/$details/$query/$embed（compOpenScan 引号感知扫描 + 列0 } 深度配对 + argValueAt/argStrOf/argBoolOf args 提取）、%{ }% math fence 式状态机（源码原样入 inlines 不走内联解析）、闭合 ```mermaid fence→Mermaid 判定（开放态维持 codeNode loading）、GFM 任务项 - [ ]/-[x]（仅 bullet，ordered 不识别）；未闭合/未知 $name/含内嵌引号 args 降级段落字面（流式安全）；serializer componentBlockMd(name,argsText) 泛化 + calloutMd 发 type+title（title 空省略）+ listMd checked 前缀（续行 pad=普通 bullet 宽）；WNode 增 checked bool? 第21字段（20 构造点补位；gen.mjs structNames 补 CompScan——B1 new 修正硬编码清单）；rust 四文件 trans/cp 双发射，对拍金标 FIXTURES +9 组（双侧手工同步）逐字节一致，方言 roundtrip 守恒表 9 组 byte-canonical+idempotent。P2 装配：builtin-panels 增 renderCalloutPanel（callout-node+data-callout-type+autodown-callout* 类链复用既有 CSS 零新样式；title 空回退 type 标签、未知类型无图标；扩展面板降级断言迁 Query）+ renderListPanel 任务项前置 disabled checkbox；block-wnode 补 Callout case（language=type/title=title 槽位对齐解析侧）+ ListItem checked + 全扩展 case 修 21 参；EngineEditor isExpandableContainer += Callout/Details、expandedElement 两分支（Callout 卡片链与 renderCalloutPanel 逐字一致=CSS 单通道、Details 对齐 DetailsNodeView 外观 + marker 翻 open）、任务项 LIVE checkbox（点击 setBlockAttrs 单步 undo）、Mermaid editSlot 复用 fenceEditSlot（徽章恒 mermaid）；新 AttrHost.vue（attr 读写宿主：挂载模型值/blur→setBlockAttrs 一步 undo/Enter·Esc=blur 提交/version 联动非聚焦同步/排版 class 调用方传）；nodeViewPanel 静态回退模型补 math/mermaid 源码与 details/query/embed attrs（右栏静态面板数据通路，此前恒空）；adapter setCallout 真实现（type+title 落 attrs——此前 KIND_COMMANDS 泛化路径静默丢弃）、toggleTaskList 真实现（ListItem 祖先定位落/清 checked，区别于 bullet）；demo content.ts 换引擎方言（:::→$callout/$details、$$→%{}）+ extension-blocks e2e 5 用例；jade CSS fork 对照补 details/AttrHost/task 三段；DEBTS 008 部分清偿/020·026 余量改写/新增 030 v1 边界行（alias 不做/args 无内嵌引号/ordered 任务不识别/fence 内列0 } 提前闭合四件）；EDITOR-CONTRACT 选择器表 +4（callout 卡片链/details 链/attr-host/task-checkbox）+ 手验清单容器块条目；ARCHITECTURE §5 解析子集段更新。执行期坑位记录：a2r 参数位内联 .join() 结果不自动借用（源内先绑定变量绕道，.at 注释在案——019 家族发射器缺口）；两处 WNode 构造参数槽位错位（callout title/embed src）经程序化计数修正；host-protocol details 用例随右栏真渲染改版（断言 data-open 而非裸文本）"
touched_goals:
  - ".autoos/specs.json P025-2: 容器块编辑目标——isExpandableContainer 扩到 Callout/Details（聚焦路径下沉装配覆盖容器卡片块，025 的列表/引用机制原样延伸，卡片 chrome 聚焦保持）"
  - ".autoos/specs.json P023-2: BlockComponent 三模式契约——Mermaid edit 槽位注册（复用 fenceEditSlot）+ Callout builtin 面板（view/edit 两槽补齐，registry 机制不变）"
  - ".autoos/specs.json P026-2: 挂载宿主协议——nodeViewPanel 静态回退模型补齐（右栏静态渲染的 node-view 面板此前 attrs/源码恒空，030 起 math/mermaid 源码与 details/query/embed attrs 通路打通）"

current_step: 10
total_steps: 10
---

# [PLAN-030] 扩展块解析通道 + 容器块 WYSIWYG 编辑面

## 变更摘要

两个互相锁定的阶段打包（P2 的验收依赖 P1 的 roundtrip）：

**P1 解析通道**：把 Callout/Details/Query/Embed/MathBlock/任务列表/mermaid 从
"slash 能插入、序列化能写出、解析器不认识"（roundtrip 断链）补成全通。语法
采用**引擎自家序列化方言**（roundtrip-first）：`$callout(type: "..", title:
"..") { .. }`、`$details(summary: "..", open: true) { .. }`、`$query(..)`、
`$embed(src: "..")`、`%{ .. }%`、`- [ ] `/`- [x] `、```` ```mermaid ```` fence
判定。单源 `.at` 双发射（TS `gen:parser` + rust `auto.exe trans`），金标对拍
双侧钉死。

**P2 容器编辑面 WYSIWYG**：Callout/Details 聚焦时保持卡片 chrome、正文/摘要/
标题就地编辑（029 哲学延伸到容器块）；Callout 补 view 渲染器（消灭
unknown-node degrade）；Details summary 从单行 input 换成就地无框编辑；
任务列表 checkbox 双侧可点、落盘 roundtrip。

**不做的**：`:::`/`$$` 旧方言 alias（记 DEBTS）；Math/Mermaid 编辑态深化
（源码+实时预览同屏，DEBTS 020/026 余量维持后置）；Query/Embed 数据装载
（DEBTS 026 ① 后置）；行内 wikilink/image/MathInline（行内层，独立计划）。

## 目标

1. **roundtrip 全通**：上列七类语法 解析→BlockNode→序列化→再解析 稳定
   （kind 与 attrs 守恒；mermaid 例外见设计 §5——fence↔Mermaid kind 双向
   归一）；TS 与 rust 双发射对拍逐字节绿。
2. **容器 WYSIWYG**：聚焦 Callout/Details 内部段落时卡片外观不变（同 view
   class），正文走 029 语义化宿主；summary/title 为 attr 宿主（无框就地
   编辑，blur 回写一步 undo）；任务项 checkbox 在 view/stream 可见、编辑态
   可点翻转。
3. **stream 兼容**：未闭合 `$`/`%{`（isFinal=false）降级为段落字面文本不
   报错（008 方言哲学平移）；闭合后流式侧与 view 同型渲染。

## 架构方案

```
P1（解析层，.at 单源）
auto/parser/markdown_parser.at
├─ WNode type 增 checked bool? 字段（61 行 type 定义；rust 结构同发射）
├─ parseBlocks（738 行主循环）增三条规则：
│   ① $name(k: "v", ...) {  … 扫列 0 的 } 配对 → 递归 parseBlocks 为
│      children → callout/details/query/embed 四实例（attrs: type/title/
│      summary/open/query/src）；未闭合 → 段落字面降级
│   ② %{ … }% fence 式规则 → mathBlock（inlines=源码文本）
│   ③ ```mermaid closed fence → Mermaid kind（其余语言仍为 Fence）
├─ 列表项：marker 剥离后识别 [ ]/[x]/[X] 前缀 → itemNode(checked)
└─ convertBlock（2223 行）：list_item 的 checked → ListItem attr；
    callout/details/math_block/mermaid/query/embed 的 WNode→BlockNode 落 attrs
auto/parser/serializer.at
├─ componentBlockMd 泛化为多 args（callout: type+title；details 既有）
└─ listMd：checked 项 marker 后写 [ ]/[x]
双发射：pnpm gen:parser（TS）+ auto.exe trans --path ×4 rust + cp
（core/rust README 命令）；对拍金标 rust-parse-parity-gen fixtures 增补后重写

P2（装配层，手写源）
packages/engine/src/editor/components/EngineEditor.vue
├─ isExpandableContainer += Callout/Details
├─ expandedElement 分支：Callout → 卡片 chrome（class 对齐 builtin
│   renderCalloutPanel：callout-node + data-callout-type + 标题行）；
│   Details → details-node chrome + SummaryHost + body childSlot
├─ editSlotFor('Mermaid') = fenceEditSlot 复用（CodeEditorBlock 高亮编辑）
└─ toggleTaskList 真实现：focused ListItem 落/清 checked attr（区别于 bullet）
packages/engine/src/editor/components/AttrHost.vue（新）
└─ attr 读写型宿主：contenteditable 无框、挂载排版对齐 node-view 同位元素，
   blur → setBlockAttrs（单步 undo）；Details summary / Callout title 复用
packages/engine/src/render/builtin-panels.ts
├─ 新增 renderCalloutPanel（view/stream 共用；卡片 + icon + title + children）
└─ renderListPanel item 增 checked → 前置 <input type=checkbox disabled>
    （view 态；点击翻转在编辑装配层做）
```

**为何 attr 宿主而非模型改造**：Details summary/Callout title 是 attrs（序列化
方言即 args），改造为 inlines 子块会破坏既有序列化格式与 node-view
updateAttributes 通道；AttrHost 保持模型零变动。

## 技术栈

Auto 语言 `.at`（parser/serializer/block_model 单源）+ auto.exe a2r 双发射、
Vue 3 手写 SFC、Vitest（金标生成器双侧）、Playwright（demo e2e）、cargo test
（rust 对拍）。无新 npm 依赖。

## 需求分析与背景调查

- **现状断链实测**（本计划起草前用引擎解析器验证）：`$$e=mc^2$$`、
  `:::warning`、`:::details`、`- [ ] task` 全部解析为普通段落字面文本；
  slash 菜单可插入 Callout/Details/MathBlock/Mermaid（tiptap-adapter
  KIND_COMMANDS 42-52 行），序列化能写出（serializer.at 387-393 行：
  `$callout(type:..){..}`、`$details(summary:..){..}`、`%{..}%`、
  ```` ```mermaid ````），但重解析回不来——保存即降级为段落，数据形态丢失。
- **WYSIWYG 缺口盘点**（用户裁定 P1+P2 打包）：Callout view 无 builtin
  渲染器 → unknown-node degrade；Callout/Details 不在 isExpandableContainer
  → 聚焦其内部段落时容器整体退 preview（聚焦宿主不挂载的装配洞）；
  Details summary 编辑是单行 `<input>`（DetailsNodeView 106 行）；任务列表
  `- [ ]` 字面化、toggleTaskList 与 bullet 同实现（KIND_COMMANDS 50 行）、
  无 checkbox UI；mermaid fence 解析为 Fence → view 为代码块而非 SVG 面板
  （slash 插入的 Mermaid kind 才走 MermaidNodeView）。
- **spec 关联**：P023-2（BlockComponent 三模式契约——本计划补 view 编辑面
  对齐）、P024-2/P028-2（富宿主行内 WYSIWYG——正文编辑复用其成果）、
  P026-2（挂载宿主协议——node-view 预览既有）。DEBTS 关联行：008（解析
  白名单——math/`:::` 项部分清偿：math 走 `%{}`、容器走 `$` 族；footnote/
  mark 等余量留行）、020/026（math/mermaid 编辑态深化——余量仍后置）、
  026（Query/Embed 装载——后置维持）。
- **rust 双发射机制**（core/rust README）：parser/ial/block_model/serializer
  四文件 `auto.exe trans --path X.at rust` + cp 进 crate；对拍金标
  `rust-parse-parity-gen.test.ts` 每次 `pnpm test` 自动重写，crate 侧
  parse_parity.rs 逐字节断言——改 .at 后双侧跑绿即同步。
- **既有方言锚点**：serializer.at 348-363 行已定义
  `componentBlockMd`/`detailsMd`（本计划把 parser 对上它，并把 callout 的
  title arg 补进序列化——slash setCallout 传 type+title 两参而现序列化只写
  type，title 现在是丢的）。

## 详细设计

### 1. `$` 组件块规则（markdown_parser.at parseBlocks）

- 触发：行首（indent<4）`$` + 标识符 + `(`；本行或后续行出现 `) {`（args
  允许跨行 v1 不做——单行 args）。
- args 解析：`k: "v"` 逗号序列；`open: true` 布尔。转义按 serialize 写出
  形状（`"` 包裹，v1 不支持内嵌 `"`——与 serializer.at 字符串拼接现状对齐）。
- 闭合：列 0 的 `}` 行；body 行收集 → 递归 parseBlocks → children。
- kind 映射：callout→Callout(type,title)、details→Details(summary,open)、
  query→QueryBlock(query)、embed→BlockEmbed(src)；未知 `$name` → 段落字面。
- 未闭合（isFinal=false）：整段按段落字面降级（流式安全）。

### 2. `%{ }%` math 块与 ```mermaid 判定

- `%{` 单独行开启，`}%` 列 0 行闭合（fence 式状态机复用 isCloseFence 模式）；
  body 为源码行 → MathBlock(inlines=[源码文本])；未闭合降级段落。
- fence 分支：`language == "mermaid" && closed` → Mermaid(inlines=源码)；
  开放态维持 codeNode(loading) 流式语义。Mermaid kind 的编辑面=
  editSlotFor('Mermaid') 复用 fenceEditSlot（CodeEditorBlock，语言徽章
  mermaid）——无裸 div 倒退。

### 3. 任务列表

- 列表项 marker 剥离后：`[ ] `/`[x] `/`[X] ` 前缀识别 → 前缀从文本剥除、
  itemNode(checked=true/false)；仅 bullet 列表（ordered 不识别，与 CommonMark
  GFM 对齐）。
- WNode type 定义加 `checked bool?`（markdown_parser.at 61 行；21 参构造
  调用点全部补位 null——TS/rust 同发射）；convertBlock list_item 分支落
  ListItem attr `checked`。
- serializer.at listMd：marker 写出 `- [ ] `/`- [x] `（有 checked attr 时）。
- block-wnode.ts ListItem 转换：checked attr → itemNode checked。
- renderListPanel：item 有 checked → li 前置 disabled checkbox（view/stream）。
- 编辑装配：checkbox 点击 → 列表命令通道翻转 attr（复用 list-commands 的
  选中定位）；toggleTaskList 动词= focused ListItem 置 checked（清除则转
  普通 bullet）。

### 4. Callout/Details 容器装配（EngineEditor）

- isExpandableContainer：`children.length > 0 && (ListBlock | Blockquote |
  Callout | Details)`。
- expandedElement(Callout)：`div.callout-node[data-callout-type]` > 标题行
  （icon + AttrHost(title)）> `div.markdown-renderer` > childSlot 递归——
  class 链与 renderCalloutPanel 逐字一致（CSS 单通道）。
- expandedElement(Details)：details chrome（对齐 DetailsNodeView 外观 class）
  + summary 行（三角 + AttrHost(summary)）+ body childSlot；open 翻转走
  updateAttributes 既有通道。
- AttrHost.vue：props `{ blockId, attrKey, engine, placeholder? }`；挂载值=
  attrGetStr；blur → setBlockAttrs 单步 undo；排版 class 由调用方传（对齐
  node-view 同位元素）；Enter/Escape 直接 blur 提交；不走 BlockHostController
  （无 inlines/拆块语义）。
- focus-path：focusTargetOf 对 Callout/Details 已走"最深叶块"通用递归
  （children 存在即下钻），无需改动——装配洞仅因 isExpandableContainer 缺席。

### 5. 序列化对齐（serializer.at）

- componentBlockMd 泛化：`args: List<(k, v)>`；callout 发出
  `$callout(type: "..", title: "..")`（title 空省略）；details 既有
  detailsMd 并入同一泛化。
- roundtrip 守恒表（金标钉）：callout(type,title)/details(summary,open)/
  math/mermaid/task 逐对用例。

## 测试设计

1. **金标**：rust-parse-parity-gen.test.ts FIXTURES 增 8 组（$callout 闭合/
   未闭合、$details open、$query/$embed、%{}%、- [ ]/- [x] 混排、
   ```mermaid 闭合/开放），双侧绿（engine `pnpm test` 重写 golden +
   `cargo test`）。
2. **单测**：serializer-roundtrip 新方言守恒用例；block-parser 新 kind
   attrs 断言；render.test 补 renderCalloutPanel DOM + List checkbox。
3. **e2e（demo）`extension-blocks.spec.ts`**：demo 文档含四类样例块——
   左栏聚焦 callout 内段落（卡片 chrome 保持、宿主无框就地编辑）、details
   summary 无框编辑、任务项点击翻转、`%{ %}` 右栏出 KaTeX 面板；
   Save 后 textarea/落盘断言 `$callout`/`- [x]` roundtrip。
4. **回归门**：engine 全量 + build（三断言）+ demo e2e 全套 + jade
   build/e2e（jade CSS fork 若缺 callout-node/details 段则对照引擎补）。

## 验收标准

1. 七类语法 roundtrip 守恒（金标 + 单测绿，TS/rust 双侧一致）。
2. Callout view 不再 unknown-node；聚焦卡片内正文=卡片外观不变 + 就地编辑。
3. Details summary / Callout title 无 input 边框就地编辑，blur 落盘一步 undo。
4. 任务项 checkbox：view/stream 可见、编辑态可点翻转、roundtrip 落盘。
5. ```mermaid 文档块 view 呈 SVG 面板、聚焦为高亮代码编辑（无裸 div）。
6. 全量门绿：engine vitest + cargo test + engine build + demo e2e + jade。

## 执行步骤

- [x] **T1** `auto/parser/markdown_parser.at`：WNode type 加 `checked bool?`
  （61 行区）+ 全构造调用点补位；`pnpm gen:parser`；rust 四文件
  trans+cp（core/rust README 命令）。验证：`pnpm --filter @autodown/engine
  test && cd ../core/rust && cargo test`。
  [✅ 已完成] 21 字段落位、20 构造点补 None；engine vitest 455 绿 +
  cargo test 全绿（worktree commit 2a77cdc）
- [x] **T2** 同文件 parseBlocks：`$name(args) {` 组件块规则（§1）+
  convertBlock 四 kind attrs 落位。验证：engine vitest 新 block-parser
  用例（先写用例先红）。
  [✅ 已完成] compOpenScan/args 提取/嵌套花括号配对/降级路径全落位；
  block-parser 9 新用例先红后绿，engine 464 绿 + rust cargo test 绿
- [x] **T3** 同文件：`%{ }%` math 规则 + ```mermaid closed→Mermaid 判定（§2）。
  验证：同上 + parse_parity 金标 fixture 增补后双侧绿。
  [✅ 已完成] math fence 式状态机 + mermaid closed 判定落位；金标 +7 组
  双侧逐字节绿（rust FIXTURES 手工同步）；engine 471 绿 + cargo test 全绿
- [x] **T4** 同文件列表项 `[ ]/[x]` 识别 → checked（§3 解析半）；
  `auto/parser/serializer.at` listMd 前缀写出。验证：serializer-roundtrip
  新用例。
  [✅ 已完成] 前缀剥离/ordered 不识别/续行 pad=2；roundtrip 3 用例 +
  block-parser 3 用例先红后绿；金标 task-list 双侧绿；engine 477 +
  cargo 全绿
- [x] **T5** `auto/parser/serializer.at`：componentBlockMd 多 args 泛化 +
  callout title。验证：roundtrip 守恒表单测全绿；rust 侧同步 trans+cp +
  cargo test。
  [✅ 已完成] argsText 泛化 + quotedArg + calloutMd(detailsMd 并入)；
  守恒表 9 组 byte-canonical+idempotent 全绿（callout-title 先红后绿）；
  engine 486 绿 + cargo 全绿
- [x] **T6** `src/render/block-wnode.ts`（Callout case 补齐 + ListItem
  checked）+ `src/render/builtin-panels.ts`（renderCalloutPanel + List
  checkbox）+ markdown-parser 转换侧 checked→attr 核对。验证：render.test
  新用例 + vue-tsc。
  [✅ 已完成] renderCalloutPanel builtin（复用既有 autodown-callout* CSS）+
  checkbox view 态；block-wnode 21 参全修 + Callout/ListItem case；
  render.test 3 用例先红后绿；palette-map 降级断言迁移 Query；engine 490
  绿 + vue-tsc 0 错
- [x] **T7** P2 装配：`EngineEditor.vue`（isExpandableContainer/expandedElement
  两分支 + editSlotFor('Mermaid') 复用 + toggleTaskList 真实现 + checkbox
  点击翻转）+ 新 `AttrHost.vue`。验证：engine vitest（focus-path/装配用例）+
  demo dev 手检。
  [✅ 已完成] AttrHost 无框宿主 + Callout/Details 展开 chrome（类链与
  renderCalloutPanel/DetailsNodeView 逐字一致）+ LIVE checkbox + Mermaid
  editSlot 复用 + adapter setCallout/toggleTaskList 真实现；focus-path +
  adapter 用例绿（demo 手检并入 T8 e2e 覆盖）；engine 494 绿 + vue-tsc 0 错
- [x] **T8** `demo/src/content.ts`：`:::` 段替换为 `$callout` 方言 + 增
  `$details`/`%{ %}`/`- [ ]` 样例；新 `demo/e2e/extension-blocks.spec.ts`
  （§测试设计 3，先红后绿）。验证：`cd autodown/demo && npx playwright test
  extension-blocks`。
  [✅ 已完成] 五用例全绿（callout chrome 保持/AttrHost 无框/checkbox 翻转/
  KaTeX·mermaid 右栏/Save roundtrip）；配套 nodeViewPanel 静态回退模型
  （右栏面板数据通路）+ host-protocol 适配；demo e2e 36/36 绿
- [x] **T9** 全量门：engine test + cargo test + engine build + demo e2e
  全套 + jade build/e2e。验证：五门命令逐个跑绿。
  [✅ 已完成] engine 494/494；cargo 全绿（对拍金标 8 组新 fixture 逐字节
  一致）；engine build 三断言过；demo e2e 36/36；jade build + e2e 23/23
  （CSS fork 已对照补齐；见待澄清 #5 fixture 漂移备注）
- [x] **T10** 落账：DEBTS.md（008 行部分清偿改写、020/026 行余量改写、新
  增 `:::`/`$$` alias 后置行）、ARCHITECTURE.md（解析子集扩集段落）、
  EDITOR-CONTRACT.md（容器装配面说明）。验证：目视 + git diff 复核。
  [✅ 已完成] 三文档落位（008 部分清偿/020·026 余量/新增 030 v1 边界四
  件行；§5 解析子集段；契约表 +4 选择器 + 手验清单）；diff 复核通过

## 复审记录

**复审人**：zhaopuming（/auto-plan:review，2026-08-31）
**复审方式**：工作树 `.worktrees/plan-030-dev`（branch `plan-030-dev`，11 commits，
master..HEAD diff 32 文件 +3383/−195）内重跑全量门 + 逐条验收复验 + 一次性
playwright 探针（验证后删除，不落库）。

### 逐条验收判定

1. **七类语法 roundtrip 守恒（TS/rust 双侧一致）— PASS**
   证据：engine vitest 494/494（block-parser 新 13 用例 + serializer-roundtrip
   守恒表 9 组 byte-canonical+idempotent + rust-parse-parity-gen 金标重写）；
   `cargo test` 全绿（parse_blocks_matches_ts_golden 逐字节，金标 +9 组 fixture
   双侧手工同步在 diff 中核验：rust-parse-parity-gen.test.ts 与
   core/rust/tests/parse_parity.rs FIXTURES 一一对应）。
2. **Callout 不再 unknown-node + 聚焦卡片外观不变就地编辑 — PASS**
   证据：render.test「renders $callout as a callout card — no unknown-node」+
   palette-map「callout renders through its builtin panel since plan 030」；
   demo e2e「focusing a callout body keeps the card chrome and edits in place」
   （卡片链/AttrHost 无框/无 input 断言全绿）。
3. **Details summary / Callout title 无框就地编辑 blur 一步 undo — PASS**
   证据：e2e「the details summary edits through the borderless AttrHost」（编辑
   →右栏联动）+ callout title AttrHost 可见性断言；「一步 undo」机制证据=
   AttrHost.commit→setBlockAttrs→engine.applyTree 单 undo 条
   （commands.test.ts setBlockAttrs 在册单步断言）。小缺口见债候选 ③。
4. **任务项 checkbox 三态 — PASS**
   证据：render.test（view 态 disabled checkbox 形状 checked/unchecked）+
   e2e「task checkboxes flip on click and serialize the flag」+
   serializer-roundtrip task 3 用例。
5. **```mermaid view 呈 SVG 面板 + 聚焦高亮代码编辑（无裸 div）— PASS**
   证据：e2e 右栏 `.autodown-mermaid-block svg` 可见断言；聚焦编辑面无自动化
   钉子——复审一次性探针实测（聚焦 Mermaid 块 → `.autodown-codeblock-node`
   + 语言徽章文本 `mermaid` + 可编辑面，881ms 绿，探针已删）。缺口见债候选 ①。
6. **全量门绿 — PASS（本复审独立重跑）**
   engine vitest 494/494；cargo test 全绿；engine build ✓（三断言
   parser-pure/no-tiptap/editor-gen 全过）；demo e2e 36/36；jade build ✓ +
   e2e 23/23（CSS fork 三段已在 diff）。

### 遗漏 / 延后 / workaround 清查

- **遗漏**：无——T1-T10 每步在 diff 中有对应落点；测试设计四项（金标 8→实际
  9 组、单测、e2e、回归门）全数兑现。
- **延后（均经用户在计划内裁定/登记）**：`:::`/`$$` alias 不做（待澄清#1）；
  args 无内嵌引号（#2）；ordered 任务列表（#3）；Math/Mermaid 编辑态深化
  （DEBTS 020 余量维持）；Query/Embed 数据装载（DEBTS 026① 维持）——全部
  已入 DEBTS 030/020/026 行，非隐匿缩水。
- **Workaround**：a2r 参数位内联 `.join()` 结果不自动借用 → 源内先绑定变量
  绕道（.at 注释在案，019 家族发射器缺口类）——债候选 ②。
- **偏差（已记录非隐匿）**：T7「demo dev 手检」由 T8 e2e 系统化覆盖替代
  （计划证据行在案）；plan 017 旧契约测试「扩展面板无 builtin 时降级」随
  Callout 获得 builtin 迁移到 Query（palette-map.test.ts 改版，行为变更即
  本计划设计意图）。

### 债候选（复审新增，非阻塞）

① 聚焦 mermaid 编辑面缺自动化 e2e 钉子（复审探针已验证行为；建议把探针
用例并入 extension-blocks.spec.ts，5 行级改动）。
② a2r 发射器：参数位内联方法调用结果不自动借用（本次 .join() 实证；
019 家族，建议归并进 auto-lang 侧发射器缺口登记）。
③ AttrHost blur 回写的「一步 undo」无专属 e2e undo 用例（机制由
commands.test setBlockAttrs 单步断言覆盖，端到端未钉）。
④（观察项）palette spec tag 类名（`mermaid-block-container`）与 node-view
实际类名（`autodown-mermaid-block`）不一致——既有现象，非本计划引入。
⑤（非本计划债）jade fixture `tmp/wiki-demo/wiki/journals/` 主检出未提交
（待澄清#5）——master 提交态 fresh worktree 上 01-workspace 必红，需用户
裁决归位。

### 判定

六条验收全 PASS，无阻塞债 → **status: reviewed**，可交 `/auto-plan:merge`。

## 待澄清事项

1. **旧方言 alias**：`:::type Title`/`$$..$$`（siyuan 系）不解析，demo
   内容同步换成引擎方言；如需兼容消费面存量文档，单列后续（默认不做）。
2. **args 转义**：v1 args 字符串不含 `"`（与 serializer 现状对齐），含引号
   内容会降级段落；富转义单列。
3. **ordered 任务列表**：`1. [ ]` 不识别（GFM 对齐），如需再议。
4. **jade CSS fork**：callout-node/details-node 段若缺，T9 内对照引擎补齐
   （jade 侧是拷贝fork）。
5. **jade fixture 漂移（T9 执行中发现，非本计划引入）**：jade
   e2e/01-workspace 期望 fixture 目录 `tmp/wiki-demo/wiki/journals/`，但该
   目录在主检出是**未跟踪**状态（2026-08-30 新建）——master 提交态的
   fixture 缺它，fresh worktree 上该测试必红。已在工作树本地补拷（未提
   交）跑绿；journals fixture 的提交归属另一会话，需用户裁决归位。
