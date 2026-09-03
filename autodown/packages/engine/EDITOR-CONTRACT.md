# 编辑器对外契约冻结清单（plan 018 Phase 0）

本清单是编辑内核替换（Tiptap 退役）期间的**不变量**：新自研编辑层必须
逐项保形。来源 = demo e2e 4 spec + jade-garden e2e 12 spec 全量 grep +
editor 源码 CustomEvent 盘点（2026-08-25）。核验时以本清单逐项打勾。

## 1. DOM 选择器（e2e 依赖）

| 选择器 | 用途 | 出现处 |
|---|---|---|
| `.autodown-editor` | 编辑器根 | demo + jade e2e（5 处） |
| `.autodown-editor-content` | 内容容器 | demo scroll-sync |
| `.autodown-editor-content-wrapper` | 滚动容器（`useSyncedScroll` 契约） | demo e2e（6 处） |
| `.autodown-editor-actions` | 底部动作条（toolbar 遮挡测试） | demo scroll-sync |
| `.autodown-slash-menu` | 斜杠菜单 | demo + jade e2e |
| `.autodown-wikilink-label` | wikilink 标签（**plan 036 起模型 span 直渲**——parser `[[inner]]` 升格 attr 携带 span，renderInlineNode 直接出 label；020 渲染后 DOM 装饰器 `editor/wikilink.ts` 退役；`data-wikilink-title` + 点击 open-wiki-link 载荷 (title, blockId) 不变；edit 宿主挂载同链 + `contenteditable="false"` 原子化，blur 富回写走查回收） | jade e2e 04 + demo inline-spans e2e |
| `.autodown-math-inline` + `data-math-src`（/`.autodown-math-error`） | 行内数学（**plan 036 新增**）——view/stream 态 katex inline 渲染（031 工件契约 displayMode=false，错误降级源码字面 + title 提示）；edit 宿主常显源码字面（D4 v1），blur 走查按 `data-math-src` 回收模型 span | demo inline-spans e2e |
| `.autodown-block-placeholder` | 块编辑占位（滚动同步空挡；**仅 `.node-slot` 直接子级**会被 clearPlaceholders 清除——同 class 家族的开放态骨架在更深层，plan 032） | demo scroll-sync |
| `.code-block-container.autodown-block-placeholder.is-loading` + `pre[aria-busy="true"]` | 开放 fence 骨架（含 ```` ```mermaid ```` 开 fence；等高占位 min-height 5.5rem；闭合翻转即摘除，plan 032）；**plan 033 起该面板为 CodeBlockWidget 的 view/stream 模式**（edit 模式走 `.autodown-codeblock-node` 宿主链 + badge + `.autodown-code-editor` 编辑面，CodeBlockMenu 点击契约不变） | demo stream-tri-state e2e |
| `.autodown-block-boundary` | 块边界插入把手 | demo scroll-sync |
| `[data-block-id]` | 块定位（`getBlockMap` 消费） | demo + jade e2e（11 处） |
| `[data-node-index]` | 渲染侧块序号（滚动同步） | demo scroll-sync |
| `.streaming-document` | 渲染根 | demo scroll-sync |
| `.node-slot` / `.node-content` | 渲染块包裹 | 渲染契约（render.test.ts 在册） |
| `[contenteditable]` | 编辑宿主（聚焦宿主为语义化标签——Heading→h1-h6、Paragraph→p、其余 div；class 与 data 面不变，plan 029） | jade e2e 02 |
| `.callout-node[data-callout-type]` + `.autodown-callout*` 类链 | Callout 卡片（builtin 面板与编辑装配共用同一链，CSS 单通道，plan 030）；**plan 035 起为 CalloutBlockWidget 的 view/stream/edit 三模式**（面板走 block-widget-panels custom 槽，edit 模式标题换 `.autodown-attr-host` 宿主 + readonly 横幅；"edit==view CSS 单通道"从人盯约定变同源事实） | demo extension-blocks e2e |
| `.autodown-details[data-open]` + `.autodown-details-*` | Details 卡片（node-view 预览与编辑装配同链，plan 030）；**plan 035 起为 DetailsBlockWidget 的三模式**（DetailsNodeView 退役，marker 翻转动词两 mode 均活——经 setBlockAttrs 单步 undo） | demo extension-blocks e2e |
| `.autodown-attr-host` | 容器块 attr 就地无框编辑宿主（Callout title / Details summary；blur→setBlockAttrs 一步 undo，Enter/Esc=blur 提交，plan 030）；**plan 035 起 `.at` 单源**（`auto/editor/attr_host.at`，挂载模型值快照/value prop、version 非聚焦同步，语义逐条不变；由两容器 widget 内嵌） | demo extension-blocks e2e |
| `.task-item` > `.task-checkbox` | GFM 任务项（view/stream 态 disabled 只读、aria-label "task checkbox"；编辑装配态可点 aria-label "toggle task"，点击翻转 checked attr 单步 undo，plan 030）；**plan 035 起为 ListBlockWidget 的 mode 区分**（view 面板走 custom 槽，无 start 属性；edit 面有序列表带 start） | demo extension-blocks e2e |
| `.autodown-math-editor` + `.autodown-math-preview` / `.autodown-math-error` / `.math-editor-textarea` | MathBlock 专用编辑面：源码 textarea + 同步 katex 实时预览同屏（blur 整段一步 undo 提交，非法源错误横幅，plan 031）；**plan 033 起为 MathBlockWidget 的 edit 模式**（view/stream 模式走 `.autodown-math-block` + `.math-block-source` 节点视图链——一 widget 三态同 chrome） | demo extension-blocks e2e |
| `.autodown-mermaid-editor` + `.autodown-mermaid-preview` / `.autodown-mermaid-error` / `.mermaid-editor-loading` / `.mermaid-editor-textarea` | Mermaid 专用编辑面：300ms debounce 异步预览三态 loading/svg/error（plan 031，替换 030 的 fenceEditSlot 复用）；**plan 033 起为 MermaidBlockWidget 的 edit 模式**（view/stream 走 `.autodown-mermaid-block` + `.mermaid-source` 链） | demo extension-blocks e2e |

## 2. CustomEvent（document 级）

`autodown:slash-open` / `autodown:slash-close` / `autodown:slash-update` /
`autodown:slash-keydown`（斜杠菜单通信，载荷形状以
`menus/SlashMenu.vue` 现实现为准）。

## 3. 组件 expose / props 契约

- `AutoDownEditor` expose：`getBlockMap()`（demo `useSyncedScroll` 528 行
  的三重依赖）、`handleSave`；props/emits：
  `modelValue`/`content`/`canEdit`/`placeholder`/`@update`/`@save`/
  `@open-wiki-link`/`loadBlock`/`assetUpload`/`runQuery`/`extraSlashItems`。
  其中 `runQuery`/`loadBlock` 自 plan 038 起实际声明并驱动装载（§10
  数据通道平台面）；`assetUpload` 仍在册未接（粘贴图片链路，另行立项）。
- `StreamingRenderer` expose：`containerRef`（demo 滚动同步消费）。
- `getBlockMap()` 返回 `BlockInfo { id, index, pos, el, top, height }`。

## 4. 语义层基线（引擎无关）

交互语义以 `src/editor/__tests__/semantics.test.ts` 在册：输入 / 换段 /
列表续行 / 表格行增删（语义表达，待 Phase 3 扩展操作封装）/ undo-redo
（`invertOp` 反演）/ 斜杠模板插入 / markdown 输入规则 / IME 组合约定
（preedit 不进操作栈，提交时 diff 成单操作）。跑在 016 操作模型上，
Tiptap 退役前后都必须全绿。

## 5. 交互路径手验清单（Phase 4 回归用）

- 中文 IME：输入中 / 确认 / 组合中途撤销（微软拼音，循 auto-lang 413 清单）
- 拖拽块（DragHandle 交互面）、表格行列增删、粘贴（纯文本 + markdown 多行）
- 容器块 WYSIWYG（plan 030）：聚焦 Callout/Details 内段落时卡片 chrome
  不变、正文就地编辑；title/summary 无框就地编辑 blur 落盘一步 undo；
  任务项 checkbox 点击翻转
- math/mermaid 专用编辑面（plan 031）：聚焦 `%{ }%` 块 → 源码 textarea +
  同步 katex 预览同屏，改字即刷、非法源错误横幅且预览降级；聚焦闭合
  ```` ```mermaid ```` 块 → debounce 异步三态（渲染中… → SVG 面板 / 错误
  横幅）；两面 blur 整段提交一步 undo，流式生成中 readonly + 横幅

## 6. stream 面契约（plan 032 定型）

三态语义（17 kind 裁定**全 A**——默认面板路径，零 stream 槽注册；裁定表
plan 032 D2，`stream-tri-state.test.ts` 同源钉死）：

- **未闭合**：构造降级为段落字面（`%{` 无 `}%`、`$callout(` 无 `}`、表头
  无分隔线、`$query(` 无 `)` 等）；行构造（heading/paragraph/quote/list/
  thematic）即刻完整。
- **开放**（fence 族）：loading code 块——源码可见、终态面板（mermaid
  svg/math katex）不渲染；容器加 `.autodown-block-placeholder.is-loading`
  骨架 class（见 §1 表）。
- **闭合**：终态面板；同一闭合构造在流式中（final=false）与终态
  （final=true）下 DOM 逐标记一致（翻转无跳变的机制根据）。
- **Table 单通道（plan 037 家族化归一）**：`table.table-node` DOM 契约
  （thead+th/.table-node__resize-handle/tbody+td/embedded renderer）由
  Table 家族 widget **TableBlockWidget 的 view 模式**经 panel registry
  **custom 槽**渲染（block-widget-panels 注册；原 StreamingTable.vue 的
  tablePanel、TableEditorBlock、StreamingTable 渐进模板三面退役）。
  同一 widget 三模式：edit = 七动词工具栏（`.autodown-table-editor` 宿主
  + contenteditable 单元格 blur 提交，选择器不变）经 EngineEditor edit
  槽；stream = ```json `{"type":"table"}` 渐进通道（列头先行/loading 行/
  final 翻转，`.streaming-table` 契约）经 StreamingRenderer registry 直挂。
  五态 DOM 金标逐字节对拍在册（`streaming-table-gold.test.ts`）；
  `unregisterPanel('Table')` 语义 = 降级 unknown-node（无 builtin
  兜底）。
- **stream 槽机制**：注册即覆盖该 kind 的段路径（组件段=props 传参去
  `type` 键、details 段=part 本身；final 随段闭合/streaming flag 翻转）；
  `clearBlockComponents()` teardown 干净（block-component-stream.test.ts）。
- **e2e 面签**：`demo/stream-harness.html`（streaming/final 双 pane）+
  `demo/e2e/stream-tri-state.spec.ts`（三态序列 + computed-style parity
  四类 Heading/Paragraph/Fence/Table；扩展块 parity 待 plan 033 共享 chrome）。

## 7. RichTextHost 平台面（plan 034 定型——VM 后端实现基准）

文本叶子编辑宿主（原手写 `components/BlockHost.vue`，034 起 `.at` 单源
`auto/editor/rich_text_host.at` → `components/RichTextHost.vue` + 平台接线
`ext/rich_text_host_ext.ts`）。本节冻结跨平台实现面（auto-lang iced
text_editor 后端照此实现 RichTextHost + 控制器协议）。

- **props（全扁平 chrome 数据，装配层现算）**：`controller`（宿主控制器
  对象——方法面见下）、`blockId`（str，= controller.id）、`blockKind`
  （str，BlockType 枚举名：Paragraph/Heading/ListItem/…）、`level`
  （int，Heading 的 1-6，非 heading 传 0）、`initial_html`（str，
  spansToHtml(controller.inlines) 的挂载即定格快照——引擎非 Vue 响应式，
  kind/level/epoch 翻转经 vnode key 重挂载重注，不持响应式依赖）。
- **事件面（九事件，全部薄转发 ext 桥；T1 探针证 DSL 可直发）**：
  `input{text}`、`keydown{key,ctrlKey/metaKey,shiftKey}`、
  `compositionstart{}`、`compositionupdate{data}`、
  `compositionend{}`（提交文本读宿主 DOM——preedit 只在 DOM 的既定语义）、
  `paste{textPlain}`（ClipboardEvent，双通道判定在桥）、`focus{}`、
  `blur{}`、`click.stop{}`（选择保护空操作）。浏览器侧事件载荷形状即
  VM 端事件载荷形状。
- **controller 协议（BlockHostController 公开面，VM 端按同协议实现）**：
  `id`/`text`/`inlines`（只读）、`onInput(newText)`、`onEnter(offset,
  newId)`、`onBackspaceAtStart(prevSiblingId|null)`、`onTab(shift): bool`
  （true=已消费需 preventDefault）、`onPasteMarkdown(md)`、
  `onRichBlur(domRoot)`（富结构整段回写一步 undo）、
  `compositionBegin(baseline, offset)`/`compositionUpdate(preedit)`/
  `compositionCommit(finalText)`（CompositionSession 三委托）、
  `syncFromModel()`（历史跳变后重对齐 knownText）。
- **语义 tag 映射表（chrome 单源，wysiwyg-typography e2e computed-style
  钉死）**：Heading → `h1-h6` + `autodown-block-host heading-node
  heading-N`（level 钳位 1-6，缺省 1）；Paragraph → `p` +
  `autodown-block-host paragraph-node`；其余可编辑 kind → `div` +
  `autodown-block-host`。恒定属性：`data-block-id`/`data-node-type`/
  `dir="auto"`/`contenteditable="true"`/`spellcheck="false"`。
- **平台接线归属（ext 桥 `rich_text_host_ext.ts`，VM 端等价物）**：
  挂载注入 + 聚焦末光标 + 卸载注销（liveHosts 存活守卫——重挂载场景的
  late-blur 不得回写，T7 实证）；nbsp 归一；input-rule 消费后 DOM 重同步
  （composition 中跳过）+ slash 派发；Enter/Backspace/Tab 键路由与
  Ctrl+B/I/K mark 快捷键（DOM Selection 依赖留桥，跨平台选区模型 =
  路线图行内层）；粘贴纯文本/markdown 双通道；blur 先 flush 纯文本 diff
  再 onRichBlur 富回写。单测面：`rich-text-host-ext.test.ts` 28 例。

## 8. BlockChildren 平台面（plan 035 定型——VM 后端实现基准）

容器组合原语：子块递归挂载孔（`src/editor/components/BlockChildren.ts`
手写平台件，.at 经 `ext/container_ext.ts` 内嵌——`use { component }`
idiom，NodeViewWrapper 同型第二例）。

- **props**：`children_slot`（`() => VNode[]` 闭包，controller-prop 宽
  类型 idiom——装配层构造，widget 模板只持 chrome）。
- **闭包形状**：编辑装配 = `childrenOf(node, ctx) = () => node.children
  .map(ch => childSlot(ch, ctx))`（childSlot/assembleNode 递归不动）；面
  板/view = `renderEmbedded(children, final, budget)` 的求值闭包（经
  panelOfContainer/items 扁平化构造）。
- **epoch 语义**：闭包捕获 AssemblyCtx（焦点路径/宿主注册表/计数器），
  epoch/version 驱动的重挂经闭包产物 vnode 的 key 天然贯通（029 机制零
  改动；`src/render/__tests__/block-children.test.ts` 五例钉死：闭包逐渲
  染求值/裸 fragment/epoch 键重挂/teardown 一次性卸载）。
- **渲染语义**：裸 fragment（无自有包裹元素）——子块列表直接落在容器
  chrome 内；widget 端 edit 面包一层 `.markdown-renderer`（沿
  expandedElement 旧形），view 面不包。
- **VM 映射**：children 孔 = **原生递归装配入口**——VM 后端的容器渲染
  直接递归装配子块，无需等价闭包机制（闭包是 Vue 装配层的实现细节，
  孔契约只有"子块列表挂到 chrome 内这一点"）。
- **配套：面板体装饰器窗**（`panel-registry.ts` §plan 035）：闭包孔体对
  外层后处理不透明——装饰器在 renderNodes 窗口内注册、容器面板适配器
  构造期捕获/求值期应用（renderEmbedded 单 vnode 归一为数组）。
  **plan 036 注记**：窗的建库动机 decorateWikilinks 已随 wikilink 模型化
  退役（span 直渲经 renderInlineChildren 天然贯通容器闭包体）；窗机制本
  身保留给未来面板体后处理。

## 9. 行内层平台面（plan 036 定型——VM 后端实现基准）

### 9.1 SelectionAdapter（选区/行内动词契约）

- **接口**（`src/editor/engine/selection-adapter.ts`，D1 冻结四方法）：
  `getSelection(): TextRange | null`、`isActive(mark): boolean`、
  `applyMark(mark, href?): boolean`、`removeMark(mark): boolean`。
  `TextRange { blockId, start, end }` = 模型 spans 的平文本 offset
  （domRootToSpans 同坐标系，nbsp 归一）。
- **DOM 适配**：`domSelectionAdapter` 单例（dom-marks.ts 全量迁入，行为
  逐字节对齐）；宿主登记槽 `setFocusedRichHost`/`getFocusedRichHost`
  （原名原签名，034 ext 桥 mount/focus/blur/unmount 消费）。
  `toggleMark(adapter, mark)` 模块辅助 = 旧 domToggleMark 决策
  （isActive ? remove : apply），**在冻结面之外**。
- **Link 真值表**：`applyMark(Link, href)` 已连→改 href / 未连→wrap；
  falsy href 投影到 removeMark（unwrap-if-inside-else-false）。
- **交互策略不进契约**：window.prompt 留调用侧（ext 桥 Ctrl+K / bubble
  runBubbleLink），adapter 只收结果。
- **调用面**：ext 桥 Ctrl+B/I/K 键路由 + tiptap-adapter chain
  toggle×5/setLink/unsetLink 委托 adapter；bubble 按钮调用面不变（动词
  链底层已换）。`EditorAdapter.isActive`（bubble 旗标）维持模型读
  （commands.marksInRange）——与 SelectionAdapter.isActive（选区包裹
  真值）语义不同位不合并。
- **VM 映射**：iced 端实现同一接口（选区读取 + mark 动词），live-DOM
  包裹语义由各平台自选（架构裁定 ②：adapter 只抽象动词面，模型驱动
  即时应用不在本契约）。

### 9.2 行内 wikilink / math_inline 模型 span

- **模型表示**：InlineSpan 无新 Mark——判别 attr 携带：`wikilink`
  （attr = text = `[[..]]` 内部 canonical-trimmed）/ `math_inline`
  （attr = text = `$..$` 源码）。marks 组合保序（`**[[x]]**` 的 Strong
  在 label 外层）。
- **解析方言**（未命中即字面，008 哲学）：`[[inner]]` 禁换行/`|`、空
  title 字面、`[[[` 前置转义字面化；`$src$` 启用规则 = 开启符右非空白 +
  闭合符左非空白 + 闭合符右非数字（siyuan 系，货币文本不误吞）+ 禁
  换行；`\$` 走反斜杠标点转义。serializer 对称发射 `[[attr]]` / `$attr$`
  （spanMd 文本级包装，其余 mark 仍外包）——守恒表 byte-canonical。
- **三模式渲染**：view/stream = renderInlineNode（wikilink label 契约 /
  math katex inline）；edit = spansToHtml 挂载（原子 `contenteditable=
  "false"` label，math 常显源码字面）+ blur 富回写 richTreeToSpans 按
  class/data-attr 两类回收（模型无损往返）。
- **载荷**：label 点击 stopPropagation + open-wiki-link(title, blockId)
  ——应用回调经 `render/wikilink-opener.ts` seam 注册（EngineEditor
  open-wiki-link 事件面不变；静态渲染无注册=惰性）。

## 10. 数据通道平台面（plan 038 定型——VM 后端实现基准）

Query/Embed 块的异步数据装载通道（DEBTS 026① 销号面）。

### 10.1 签名与信封（`src/editor/engine/data-loaders.ts`，./editor 出口）

- `RunQueryFn = (q: string) => Promise<QueryResultEnvelope>`；
  `QueryResultEnvelope = { results: QueryResultItem[] }`（jade
  `/api/query` 的 QueryResponse 同构）；
  `QueryResultItem { marker?, priority?, content, title?, page_path? }`
  （仅 `content` 必填；widget 侧 normalize 预计算
  `source = title || page_path`、`priority_label = [#N]`）。
- `LoadBlockFn = (id: string) => Promise<EmbeddedBlock | null>`；
  `EmbeddedBlock { title?, content }`（jade `/api/blocks/{id}` 的 block
  DTO 同构；null = 未找到）。id 为**裸锚 id**（无 `^` 前缀）。

### 10.2 通道与所有权（声明才拥有）

- EngineEditor 声明 `runQuery?`/`loadBlock?` props → immediate watch →
  模块级槽 `setDataLoaders/getDataLoaders`（nodeViewProps 深处无组件树
  上下文，宿主窗口栈同型解；消费面经 widget ext 桥读取）。
- **声明才拥有**：仅当至少一个 prop 非 undefined 时编辑器写槽；双
  undefined 的编辑器不清洗既有注册（demo 入口 mockLoaders 注册在先的
  场景，T7 e2e 抓获后冻结的语义）。卸载仅在"当前槽仍是自己的函数"时
  清空（wikilink-opener 同款 identity guard）。
- 未配置 loader 时 widget 落位占位态文案（"No query runner
  configured" / "No block loader configured"），静态渲染不报错。

### 10.3 装载时序（032 裁定 A 延伸）

- **loader 只在 final 触发**：流式进行中（final=false）query/embed 为
  占位骨架（loading 文案），零装载调用；块闭合/final 渲染时 `.Init`
  装载一次（流式管线中未闭合 `$query(`/`$embed(` 本就保持段落字面，
  三态机 028/032 在册）。query attr 外部变更经 watch 重载（语义保留）。
- **embed 锚定装载**：仅 `src` 解析出块锚的 embed 调 loader（页面级
  引用渲染 label 面，零装载——jade 装载通道按块 id 键控）。

### 10.4 embed src 三形裁定（待澄清③ 落档）

`attrs.src` 为正典（roundtrip 原样守恒，金标零变化）；title/blockId
由 ext `parseEmbedSrc` 派生，仅显示/装载层消费：

| src 形 | title | blockId（裸） | display_label |
|---|---|---|---|
| `"title"`（页面级引用） | `title` | null | `title` |
| `"title#^id"`（页内块锚） | `title` | `id` | `title#id` |
| `"^id"`（当前页块锚） | `''` | `id` | `id` |

siyuan 时代旧形状（`attrs.raw`/`title`/`blockId` 读取面）随 node view
退役；widget 根不落 `data-block-id`（派生锚 id 不进编辑器
`[data-block-id]` 块图命名空间）。

### 10.5 VM host-bridge 映射注记

VM 端（iced/auto 场景）实现同签名通道（runQuery/loadBlock 的
QueryResponse/BlockDTO 形状即 10.1），经 host-bridge 注入装载位——
jade `vm_server` 走 `/api/query`/`/api/blocks` 同模式的先例（plan 022
Phase 3：axum shell 与 vm_dispatch 共享 impl core）。VM 侧实现本身不在
本计划（消费面就绪即插）。

## 11. scroll_sync 双轨契约（plan 043 定型——VM 后端实现基准）

vue 面（040 起在案，不变）：`scroll_sync` prop 由 StreamingRenderer 消费
（块级映射 + spacer 注入，`useSyncedScroll` 547 行金标）。

VM 面（043 新增，行为对齐非像素对齐口径）：

- `scroll_sync: true` 时 autodown / autodown_editor 元素为渲染输出外包
  `View::Scrollable`（稳定 id 由 render 路径的 vnode_* 派生）。
- **写入臂**：`scroll_top` prop（数值绑定）求值为绝对像素偏移，经
  renderer pending 队列（>0.5px 去抖）落 `iced scroll_to`。
- **读出臂**：`onscroll` 事件回宿主 handler，实参序
  **（scrollHeight, clientHeight, scrollTop）**——注意 top 在末位
  （VM 引擎整值 float 实参绑定 bug 的历史绕道形态，见 DEBTS 043
  nanbox 行；正修后可回 (top, height, client) 语序）。
- **比例同步口径**：peer.top = self.top / (self.height - self.client) *
  (peer.height - peer.client)，除零不联动；块级映射留 vue 侧先例，
  VM 需要时再升（041 会话裁定）。
- **像素级不保证**：两臂文档高度同构（同一 cosmic-text Buffer），比例
  失真远小于 vue 场景，但非像素对齐。
- **VM 轨执行层**：级联与三测量记录由 auto-lang renderer.rs update 层
  rust 直写快道执行（write_state 信任路径 + 数值 +1e-3 分数化绕
  nanbox 整值 float bug）；app.at 的 OnScroll handler 为 vue 生成侧
  契约面。
- **Details 折叠回路**（同通道搭车）：`ondetailsclick` 事件回宿主
  （args = ["d<块结构键>" block_key 内容哈希]），open 状态以 content 内
  open attr 为单源（v1 单 details 块场景；多块 map 化留余量）。

## 核验责任

Phase 2/3 每次桥接换向后跑 demo e2e（9 用例含以上选择器）；Phase 4 逐项
核验本清单 + jade e2e 全量。冻结清单本身的增补须经计划修订（不允许
静默缩水）。
