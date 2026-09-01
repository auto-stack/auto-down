# @autodown/engine — 分层契约（plan 020 Phase 5 定版）

`@autodown/engine` 是 AutoDown 的统一文档引擎：parser / render / editor
三合一单包（plan 017 起吸收 `@autodown/core` / `@autodown/vue` /
`@autodown/editor`，plan 020 起旧包为 deprecated re-export shim）。本文
固定三层架构、出口契约与发包形态；编辑器 DOM/事件面以
[EDITOR-CONTRACT.md](./EDITOR-CONTRACT.md) 为准（plan 018 冻结）。

## 1. 三层架构

| 层 | 目录 | 出口 | 职责 |
|----|------|------|------|
| parser | `src/parser/`（单源 `auto/parser/*.at`） | `./parser` | `.ad` ↔ 统一块模型：markdown 解析、IAL/锚点深剥离、序列化；vue-free（构建期 `assert-parser-pure` 断言） |
| render | `src/render/`（单源 `auto/render/*.at`） | `./render` | 块模型 → VNode：面板注册表（palette map 单源）、流式调度、表格、可选能力（katex/mermaid/highlight） |
| editor | `src/editor/`（Auto 生成 + 手写内核） | `./editor` | 自研编辑内核（plan 018 退役 Tiptap）：块粒度 contenteditable 宿主 + 预览翻转、命令层 API、slash 菜单、行内 wikilink/math span 直渲（plan 036，020 装饰器退役）；chrome 层 .at 单源再生（plan 021，见 §6） |

根出口 `.` 是三层的策展组合（`AutoDownEditor` / `StreamingRenderer` /
`getBlockMap` / `insertTemplate` 等命令层 + `BlockInfo` 等类型）；
`./style.css` 单一 css 资产（editor chrome + 渲染层共享）。

## 2. 出口契约（1.0.0 冻结面，plan 020 Phase 4）

- **四出口 + style.css**：`.` / `./parser` / `./render` / `./editor` ——
  新增出口非破坏；改/删出口符号 = 破坏性变更，须升主版本。
- **development 条件（plan 027 加性扩展）**：四 JS 出口与 `./style.css`
  各增 `development` 条件映射到 **src**（style.css →
  `src/editor/styles/autodown-editor.css`）；`import` / `types` / default
  路径与 `files: ["dist"]` 发布形状零变化——对 017/020 出口冻结是纯加性
  （新增条件分支，不删不改既有分支），冻结的是出口集合与生产解析路径。
  效果：vite dev serve（jade-garden/front、demo）直连引擎源码，"src 有、
  dist 没有"的静默过期事故结构性消失。**dist 角色收窄为纯发布产物**
  （npm 发布 / production build）；dist 消费路径前置新鲜度卫兵：build 链尾
  `scripts/write-dist-stamp.mjs` 对 `src/**` + `auto/**` 取内容 sha256 写
  `dist/.dist-stamp`，消费方 `scripts/assert-dist-fresh.mjs` 重算比对，
  不符即非零退出并提示 `pnpm --filter @autodown/engine build`。
- **DOM/事件面**：EDITOR-CONTRACT.md 全清单（根 class、`data-block-id`、
  `.autodown-wikilink-label`、CustomEvent 四则、`getBlockMap`/`containerRef`
  expose）。
- **命令层 API**：`insertTemplate` / `replaceSelection` / `focusBlock` /
  `moveBlock` / `setBlockAttrs` / table ops / `createEditorAdapter`
  （plan 018 立，随 1.0 冻结）。
- **编辑器事件载荷**：`open-wiki-link(title, blockId?)`（plan 020 恢复
  发射；payload 与旧 Tiptap 契约一致）。
- **experimental（不随 1.0 冻结）**：rust/VM 平台面 —— autodown-core
  crate（a2r 发射、`packages/core/rust`）与 VM natives（413 清单，
  auto-lang 侧）：尚未稳定，破坏性变更不升主版本。

## 3. 双端与单源通道

- TS 端：`auto/parser`、`auto/render`（.at 单源）→ `pnpm gen:parser` /
  `gen:render` 再生成 `src/**/**.generated.ts`（纪律：改 .at 后必 regen，
  plan 019 批次七教训）。
- rust 端：autodown-core crate（`packages/core/rust`）消费同一 .at 的
  a2r 发射；双端金标对拍 = `tests/parse_parity.rs` ×
  `src/rust/tests/golden/parity.ad`（engine 侧金标）。
- 后端消费（jade-garden）：plan 021 起 back 块解析/链接提取同样单源到
  engine .at 发射物（parser.rs 退役为薄壳）。

## 4. 发包形态

- **vendor 快照通道**（现行裁定，plan 020 Phase 4）：消费方以 dist 快照
  形式 vendor（musk 0.2.0 快照已冻结于其仓 51b8abf）；npm publish 前置
  （去 workspace 内联依赖、changeset access 调整）登记于 DEBTS.md 008。
- 版本仪式：changesets 手写（`.changeset/*.md`），版本号手 bumped；
  契约冻结 changeset = plan-020-engine-1.0.0.md（原记 1.0.0；2026-08-28 版本策略修订改 0.5.0，见 .changeset/2026-08-28-engine-version-policy-0-5-0.md）。

## 5. 已知边界（登记在案）

- **stream 模式定型（plan 032）**：流式期间 markdown 段走全量 parser +
  panel 管线（final flag 驱动三态：未闭合=安全降级段落字面或行构造即刻
  完整、开放 fence=loading code 骨架 `.autodown-block-placeholder.is-loading`
  （等高占位 min-height，无动画 v1）、闭合=终态面板且 final=false/true 下
  DOM 一致）。17 kind 裁定全 A 零 stream 槽注册（裁定表 plan 032 D2，
  `render/__tests__/stream-tri-state.test.ts` 同源钉死）；表格通道归一
  （plan 037 收官）——builtin renderTablePanel（032 退役）→
  StreamingTable.vue 单源双面（032）→ **TableBlockWidget 三模式**：view
  （tablePanel 契约）经 `block-widget-panels.ts` 的 registerPanel custom
  槽、stream（```json 组件段渐进面）经 StreamingRenderer registry 直挂、
  edit（TableEditorBlock 七动词）经 EngineEditor edit 槽；五态 DOM 金标
  逐字节对拍（`render/__tests__/streaming-table-gold.test.ts`）+
  render.test.ts 零改动守卫；触发点=render-node 的副作用 import（同 033
  fence 通道），避开 panel-registry↔builtin-panels 运行时环。stream 槽机制契约在
  `render/__tests__/block-component-stream.test.ts`；parity 四类与三态序列在
  `demo/e2e/stream-tri-state.spec.ts`（扩展块 parity 待 033 共享 chrome）。
- ~~行内 mark 层（bold/italic bubble）、表格/代码块菜单、node view 富渲染~~
  —— 024 激活 bubble，026 激活 CodeBlockMenu 与 5 件 NodeView 预览挂载
  （Details/MathBlock/Mermaid/Query/Embed）；TableMenu 挂载后被裁定合并回
  TableEditorBlock 工具栏（单一入口）；030 补 Callout builtin 面板与容器块
  WYSIWYG 装配（Callout/Details 聚焦保卡片 chrome，title/summary 走
  AttrHost 就地无框编辑）；031 落 math/mermaid 专用编辑面（源码+实时
  预览同屏，MathEditBlock 同步 katex / MermaidEditBlock debounce 三态，
  替换 030 的 fence 复用与 BlockHost 文本兜底）；**036 落行内层跨平台**
  （SelectionAdapter 契约 + dom-marks 迁入退役、行内 wikilink/math_inline
  模型 span 双发射、MathInline node view 退役——EDITOR-CONTRACT §9）；
  余量（Query/Embed
  数据装载）见 DEBTS.md 020/021/026 行。
- **解析子集（plan 030 扩集；行内方言 plan 036）**：blocks = heading(ATX+setext)/paragraph/
  fence/`%{ }%` math 块/```` ```mermaid ```` closed fence→Mermaid/
  blockquote/list(ul+ol+任务项 `- [ ]`/`- [x]`)/thematic_break/table/
  `$callout/$details/$query/$embed` 引擎方言组件块（roundtrip-first，
  语法=serializer 自家写出形状；未闭合/未知 `$name` 降级段落字面）。
  行内（plan 036）：wikilink `[[title]]`/`[[title#block]]`（`[[[` 转义、
  未闭合/空 title/含 `|` 降级字面）与 math_inline `$src$`（开启符右非
  空白/闭合符左非空白/闭合符右非数字/禁换行，未命中即字面；`\$` 反斜杠
  转义）——attr 携带 span 模型化，双端 parity + 守恒表在册。
  siyuan 系 `:::`/`$$` 旧方言 alias 不做（DEBTS.md 030 行）；footnote/
  mark/sub/sup/insert/html 块/linkify 仍在白名单外。
- engine parser 不产出 source 行号（`SourceRange` 为占位）、`:::` 容器/
  table 子集与 jade 前端镜像的差异清单 —— 见 DEBTS.md 020 行（镜像保留
  裁定的前置条件）。

## 6. 手写平台层与 .at 生成 chrome 层的边界（plan 021 Phase 4 定版）

编辑器内部按"平台装配层（手写）/ chrome 层（.at 生成）"二分，与 renderer
的手写壳待遇一致；本节为两边的定版边界。

**手写平台层（不 .at 化）**

- 引擎内核 `src/editor/engine/`：editor-engine / commands / composition /
  host-controller / input-rules / text-diff / tiptap-adapter /
  node-view-host（plan 026 挂载宿主协议桥）/ selection-adapter（plan 036
  行内选区/动词契约 + domSelectionAdapter——dom-marks.ts 迁入退役，
  EDITOR-CONTRACT §9 VM 面）。
- 装配壳 `components/EngineEditor.vue`（021 裁定维持手写）：expose 契约
  （getBlockMap/handleSave）、宿主注册表、重绘版本号与 wikilink-opener
  注册 seam（plan 036——open-wiki-link 事件面不变，020 装饰器接线退役）。
  ~~+ BlockHost.vue~~——**plan 034 部分推翻 021
  裁定**：文本叶子宿主 BlockHost 的 chrome 已 .at 化（见下
  RichTextHost），原"widget DSL 无 contenteditable 属性与 composition
  事件面"两项事实依据均被证伪（contenteditable 布尔属性先证于
  table_editor_block.at 单元格；composition 三事件直发证于 034 T1 探针
  ——build + vue-tsc 双过）；平台接线（挂载聚焦/nbsp 归一/键路由/粘贴/
  composition 三委托/blur 回写/caret 数学）归 ext 桥
  `rich_text_host_ext.ts`，Selection API 的动词面已契约化为
  SelectionAdapter（**plan 036 落地**——EDITOR-CONTRACT §9；模型驱动
  即时应用仍后置，架构裁定 ② live-DOM + blur 回收维持）。
- `block-map.ts`、`slash-manifest.ts`、`menus/slashItem.ts`。
  ~~`wikilink.ts`（预览装饰器）~~——**plan 036 退役**：wikilink 模型
  span 化后 render-node 直渲 label（020"无双轨"注记销账）。

**.at 生成 chrome 层（`auto/editor/` 单源，`pnpm gen:editor` 再生）**

- 17 个部署物（plan 037 块级家族化收官：19 → 17，19 widget 源）：
  `menus/{SlashMenu,BubbleMenu,CodeBlockMenu}.vue`、`components/{
  CodeLanguageIcon,CodeBlockWidget,MathBlockWidget,MermaidBlockWidget,
  RichTextHost,AttrHost,CalloutBlockWidget,DetailsBlockWidget,
  BlockquoteBlockWidget,ListBlockWidget,TableBlockWidget}.vue`、
  `node-views/*.vue`（3：WikiLink/Query/BlockEmbed——DetailsNodeView
  随 plan 035 并入 DetailsBlockWidget 退役，MathInlineNodeView 随
  plan 036 T7 退役——行内 math 走 render-node span 直渲；TableMenu/
  TableEditorBlock 随 plan 037 T5 退役——Table 族归一进
  TableBlockWidget，dormant 菜单源一并销账）——gen 管线（暂存工程
  `auto build --gen-only --lenient` → 收割 → E1 import 后修 → 部署），
  两连跑逐字节确定。块级家族化至此全员单 widget：Fence（033）/
  Math/Mermaid（033）/容器四族（035）/Table（037）。
- 13 个 ext 桥（plan 037：table_menu_ext/table_editor_block_ext 退役，
  table_block_widget_ext 接棒——commitTableCell 迁入 + 三根 chrome 读数
  + streaming_table.at 规范化归并）：`src/editor/ext/*.ts` 是
  `auto/editor/ext/*.ts` 的逐字节
  部署（引擎接口，零 Tiptap；plan 033 起三族桥 code_block_widget_ext /
  math_block_widget_ext / mermaid_block_widget_ext 替换 code_editor_
  block_ext / math_edit_ext / mermaid_edit_ext——家族读取器
  nodeText/ctxReadonly/codeController 等以 code_block_widget_ext 为正典家，
  其余桥 re-export；plan 034 增 rich_text_host_ext——文本叶子宿主的全部
  平台接线，含 liveHosts 重挂载存活守卫；plan 035 增 attr_host_ext（单行
  attr 宿主：挂载/blur 提交/version 同步）与 container_ext（容器四族共享：
  BlockChildren 孔与 AttrHost 件再输出 + 容器 flat 读取 + open/checked 翻
  转动词））。
- build guard：`scripts/assert-editor-gen.mjs`——生成头注 ↔ .at 源存在性、
  部署清单精确性（增删均须显式改 guard 清单）、ext 桥同步，三项断言。

**BlockComponent 三模式契约（plan 023）**

- `src/render/block-component.ts`（手写桥，同 highlight.ts 模式）：每类型
  一个组件，`view`（终态=现有 panel 管线，经 BlockNode→WNode 桥
  `block-wnode.ts` 直连，EngineEditor 预览零 md 往返）/ `stream`（渐进态，
  缺省沿用 markdown 段路径）/ `edit`（分类型编辑面，缺省=BlockHost 文本
  兜底）三槽位；注册表键为 BlockType 枚举名（canonicalKind 归一
  'code_block'→'CodeBlock'）。
- 归属边界：**编辑面 SFC 归 chrome 层**（CodeEditorBlock/TableEditorBlock
  已 .at 化，扁平 chrome props）；**无头控制器与适配器归平台层**
  （engine/code-editor-controller、engine/table-editor-controller、
  EngineEditor plain script 里的 node/ctx→扁平 props 适配与注册）。
- **stream→edit v1 裁定**：`BlockEditCtx.readonly = streaming`——流式进行
  中编辑面只读（横幅"流式生成中"+disabled），流结束自动解锁；备选
  "流式中编辑转 final 截断流"交互更激进、改动面大，不取。
- 在册缺口：行内 WYSIWYG 的**动词面**已由 plan 036 契约化
  （SelectionAdapter + domSelectionAdapter，EDITOR-CONTRACT §9；行内
  wikilink/math 已模型化）；模型驱动即时 mark 应用（选区映射改模型重渲）
  仍后置（架构裁定 ② live-DOM + blur 回收维持）；表格嵌套块单元格 v1
  仅文本单元格可编辑。

**BlockWidget 家族机制（plan 033，三模式同 chrome 的结构解）**

- `src/render/block-widget.ts`（手写平台层，同 block-component 模式）：
  `registerBlockWidget(kind, widget)` 一次注册填满三槽（view/stream/edit
  包装成 `h(widget, { mode, node, final, ctx })` 槽位工厂——家族是糖，
  既有按槽 registerBlockComponent API 零破坏）；`panelOf(widget)` 把同一
  widget 包成 PanelRenderer 挂 panel-registry custom 槽，view 的两个消费
  面（编辑器预览列 / 纯渲染）同源。
- 试点三族（一 kind 一 .at widget，约 250-350 行）：`CodeBlockWidget`
  （吸收退役的 renderCodeblockPanel——Codeblock 面板经
  `src/render/block-widget-panels.ts` 注册，render-node 副作用导入（032
  StreamingTable 开创的通道——该模块已随 plan 037 Table 族归一退役）——
  与 CodeEditorBlock 含 CodeBlockMenu 宿主契约 badge 包裹）、`MathBlockWidget` / `MermaidBlockWidget`（吸收对应
  NodeView + 031 编辑面，工件 final-put 随 widget 桥迁移）。
- parity 套件在册：`src/render/__tests__/block-widget-parity.test.ts`
  （happy-dom computed-style；033 三 pilot kind × 三 mode 容器盒模型/
  共享件类链/view≡stream 全链逐项相等 + 035 容器四族类链/结构标记 +
  037 Table 族——table-node 单链/cell chrome 共享/stream loading 族/
  readonly 门；edit 白名单——textarea/caret/横幅/stack 分隔/toolbar/
  contenteditable——冻结在文件头注与各 describe 注记）。
- 推广边界（待后续计划）：Table 合流依赖 032 归一终态；Query/Embed 依赖
  数据装载（DEBTS 026①）；~~Callout/Details/Blockquote/List 容器族~~——
  **plan 035 已落地**：`BlockChildren` 孔（`components/BlockChildren.ts`，
  子块递归挂载孔——children_slot 闭包持有 AssemblyCtx，epoch 重挂/宿主注册
  表/焦点路径机制不动；.at 经 container_ext 内嵌，契约面
  EDITOR-CONTRACT §8）+ 四族 widget（Callout/Details/Blockquote/
  ListBlock 各一件三模式 .at，吸收 renderCalloutPanel/renderListPanel/
  DetailsNodeView/expandedElement 四分支/AttrHost.vue；Callout/List 面板走
  block-widget-panels custom 槽 panelOfContainer，Details 面板留
  EngineEditor（marker 动词需 host 窗 engine）；容器闭包体的 wikilink
  渲染原经 panel-registry §面板体装饰器窗——**plan 036 起 span 直渲经
  renderInlineChildren 天然贯通闭包体，wikilink 装饰用法退、窗机制保
  留**）；~~文本叶子走 RichTextHost 计划~~——
  **plan 034 已落地**：`RichTextHost` = 文本叶子编辑宿主的 .at 单源
  （dyn tag h1-h6/p/div + 契约属性 + 九事件面直发，装配层扁平 props；
  接线/Selection/caret 数学归 ext 桥；EDITOR-CONTRACT §7 冻结 VM 面），
  BlockHost.vue 退役删除。

**在册不部署的源（dormant，guard 豁免）**

- `app.at`：强制占位根（生成器总发 App.vue，产物丢弃）。
- `auto_down_editor.at` + `ext/auto_down_editor_ext.ts`：装配 widget 的
  参考实现，被 EngineEditor 平台壳取代（上述裁定）。桥内
  EngineContentHost 是活预览折衷的桥内移植，保留为"装配路径可行"的原型
  （过 vue-tsc、tree-shaken 不进 dist）；如未来重启装配 .at 化，须先移植
  wikilink 装饰与 slash 派发并过 IME 手验。
- ~~菜单三件套与 7 块视图 dormant~~ —— plan 026 挂载宿主协议落地后销账：
  adapter 具备 `.on/.off('selectionUpdate')`/块族 `isActive`/
  `getAttributes`/`view` 定位 shim 与表链/语言链动词；EngineEditor 装配
  CodeBlockMenu（fence 宿主壳 `.autodown-codeblock-node[data-language]` +
  language badge 提供 DOM 契约）；TableMenu 曾于本计划挂载、后按用户裁定
  （2026-08-30 待澄清 #1）合并回单一入口——七动词吸收进 TableEditorBlock
  工具栏（.at 源 + gen:editor 再生），悬浮菜单回休眠；
  NodeView 经 panel registry custom 槽挂预览（node-view-host.ts 桥：
  nodeViewProps fabricator + 渲染窗口 host 栈 + NodeViewContent 注入孔）；
  plan 033 起 MathBlock/Mermaid 预览改挂各自家族 widget（panelOf 面），
  NodeView 在挂 3 件（Details/Query/Embed）；
  MathInlineNodeView 已随 plan 036 T7 物理退役（行内 math 走 render-node
  span 直渲——行内无块级挂载位的需求随模型化消失，见 DEBTS.md 026③ 销
  号）；WikiLinkNodeView 在册不激活（036 起 span 直渲已拥有该交互，无
  双轨）。
  余量：Query/Embed 数据装载（runQuery/loadBlock 注入面）与 NodeView
  编辑态深度，见 DEBTS.md 020/021/026 行。

**渲染工件契约（plan 031，view 模式的持久化通道）**

- view 渲染成功即产出工件：mermaid→SVG（天然 VM/iced 可显示物）、
  math→HTML v1（KaTeX→SVG 生成器选型后置，DEBTS 跟踪）。契约
  `RenderedArtifact { kind: 'html'|'svg', body, error }` +
  `artifactFor(kind, source)` 在 `src/render/preview.ts`（npm/try-catch
  不可 DSL 化的同一老边界）。
- 工件键 = **单源 hash**：`auto/render/artifact_hash.at`（FNV-1a 32 over
  kind+U+0000+source 的 UTF-16 码单元 + len 混入，键形
  `kind:<len>:<8hex>`）双发射——a2ts → `src/render/artifact-hash.generated.ts`
  （零 post-fix），a2r → core rust `artifact_hash.rs`（RP2 encode_utf16
  包装器追加）；TS/rust 金标对拍（中文/星面 emoji 语料）钉死字节一致。
  .at 侧适配约束（字面量上限/括号丢弃/double 精确域）见该 .at 头注。
- 存储经注入：`enableArtifactStore({ get, put })`（optional-capabilities
  既有模式）——engine 零落盘、`.ad` 序列化零变化；put 咽喉点
  `recordArtifact`（成功 final 才写、键幂等），node-view 桥
  （renderMathBlockPreview / renderMermaidPreview 包装）挂接；未注册 =
  行为与 031 前逐字节一致。VM 端将来接磁盘缓存 + resvg 显示。
