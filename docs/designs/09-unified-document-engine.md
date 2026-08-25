# 09 统一文档引擎：跨平台 AutoDown 渲染/编辑一体化架构

> 立项：2026-08-25。承接 plan 008 待澄清 2 预留的"自绘文本编辑器路线"与
> auto-lang Plan 413/421（code_editor 内核 + vue 契约）的工程积累。
> 落地计划：Plan 016-020（见 §13 索引）。

## 1. 背景与动机

### 1.1 现状（2026-08-25 调研结论）

三包格局（`autodown/packages/`）：

| 包 | 状态 | 关键事实 |
|---|---|---|
| `@autodown/core` | 100% Auto 生成 | 仅 IAL 表格属性工具（`auto/ial.at` 67 行），**无文档模型/块树/选区** |
| `@autodown/vue` | 逻辑层 100% Auto，渲染壳手写 | markstream-vue 已消灭（plan 008）：增量解析器 `markdown_parser.at` 1282 行、流式调度/分段全 `.at` 单源；渲染层 `render-node.ts`（204 行手写 h()）+ `StreamingRenderer.vue` 手写 |
| `@autodown/editor` | 组件层 100% Auto，平台层手写 | 第 1 层 14 个 `.at` widget（2743 行，plan 013 后无手写壳）；第 2 层 Tiptap 平台 3119 行手写 + 750 行 ext 桥（分层契约 `packages/editor/ARCHITECTURE.md`，"by design"） |

两包**互不依赖**（editor 的 katex/mermaid 预览直连包，不经 `@autodown/vue`），
剩余第三方依赖集中在编辑侧（@tiptap/* 12 个实际使用、katex/mermaid/lowlight）
与渲染侧边缘（lowlight 可选、hast-util-to-html）。此外 editor 声明了 8 个
未使用的 yjs/collaboration 死依赖。

### 1.2 现架构的结构性缺陷

1. **双渲染路径**：编辑侧 Tiptap 渲染与展示侧自研渲染是两套引擎，长相漂移
   无法根除。demo 为此维护 528 行 `useSyncedScroll.ts`（块级位置映射 +
   per-pair spacer）——该机制存在的唯一理由就是两侧渲染不一致。
2. **vue 单平台**：全部渲染/编辑能力只存在于 vue；rust 侧（auto-lang
   iced/VM、jade-garden 后端直读 `.ad`）无法复用；ark/jet 降级为 TextArea。
3. **canonical AST 外包**：`.ad` ↔ 文档模型的转换语义分散在三处——
   `@tiptap/markdown`（editor 内 md↔ProseMirror doc）、`markdown_parser.at`
   （vue 渲染树）、jade-garden `lib/blockParser.ts`（手工镜像后端 parser）。
   语义漂移靠人肉对齐。

### 1.3 目标形态

一个**统一文档引擎**：单一块模型 + 单一渲染路径 + 可选编辑层，Auto 单源，
双端发射（vue + rust），渲染与编辑共用同一条块→视图管线。

## 2. 目标与非目标

### 2.1 目标

1. **高性能/流式展示**：块粒度增量渲染（batch / maxLiveNodes / typewriter
   语义保留），流式追加 O(新增块)。
2. **WYSIWYG 块化编辑**：块为编辑单元（增删移/换型/拖拽），行内编辑分级
   见 §8。
3. **渲染/编辑展示一致**：由构造保证——编辑态 = 渲染态 + 输入层，同一管线。
4. **Auto 单源、双平台**：核心逻辑（模型/解析/序列化/映射）`.at` 单源，
   发射 TS（vue）与 Rust crate（auto-lang 系）；无第三方运行时依赖
   （katex/mermaid/高亮维持可选注入，见 §9）。
5. **包合并**：`@autodown/vue` + `@autodown/editor`（+ 吸收 core）合并为
   `@autodown/engine`（§3）。

### 2.2 非目标

- 不改 `.ad` 文本格式（`docs/designs/02-ad-format.md` 不动，roundtrip 测试存活）。
- 不做协同编辑（yjs 系为死依赖，本设计直接清理；OT/CRDT 留架构钩子不实现）。
- 不在本设计内做 musk 侧迁移执行（musk 自有 PLAN-041，本仓只保证出口就绪，
  见 §10）。
- 不追求 v1 全行内 WYSIWYG（Typora 级行内语法隐藏），分级路线见 §8。

## 3. 核心决策：两包合并为 `@autodown/engine`

**结论：合并。** 理由：

1. **代码上不可分**：新架构里展示模式 = 渲染管线，编辑模式 = 渲染管线 +
   输入层。"渲染库"与"编辑库"不再是两个库，是同一引擎的两种挂载方式。
2. **现状本就同源分身**：editor 与 vue 互不依赖但各自实现了 katex/mermaid
   预览（`composables/renderPreview.ts` vs `optional-capabilities.ts`）、
   各自持有块概念（BlockId/getBlockMap vs node-slot/data-node-type）——
   合并消重复。
3. **消费面极窄**：全量消费方（demo、jade-garden、auto-musk）合计仅导入
   5 个符号（AutoDownEditor、StreamingRenderer、BlockInfo、两个 style.css），
   迁移一次到位成本低于长期维护两包。
4. **发包通道无碍**：现行 vendor 快照通道（plan 008 定版）对包名不敏感，
   musk 重跑 vendor 脚本即可。

### 3.1 包结构与出口

```
autodown/packages/engine/
├── auto/                    # .at 单源（全部核心逻辑）
│   ├── block_model.at       #   块树/行内 span/选区/操作（Plan 016）
│   ├── markdown_parser.at   #   自 @autodown/vue 迁入（吸收）
│   ├── serializer.at        #   块树 → .ad 文本（吸收 @tiptap/markdown 角色）
│   ├── palette_map.at       #   块树 → 视图面板树纯映射（Plan 017）
│   ├── render_scheduler.at / streaming*.at   #   迁入（吸收）
│   └── rust/…               #   a2r 发射配置（Plan 019）
├── src/
│   ├── index.ts             # 出口 `.`
│   ├── parser.ts            # 出口 `./parser`（零 vue 依赖，SSR/后端/rust 对拍）
│   ├── render/…             # 出口 `./render`（渲染，不含编辑机械）
│   └── editor/…             # 出口 `./editor`（AutoDownEditor + 输入层）
└── rust/                    # 发射的 rust crate 源（autodown-core，Plan 019）
```

- **子路径出口**按依赖方向严格分层：`./parser` ⊂ `./render` ⊂ `./editor`。
  tree-shaking 保证只用渲染时不加载编辑机械。
- **过渡 shim**：`@autodown/editor`、`@autodown/vue` 降为 re-export 薄壳
  （版本 0.3.x，只转发到 engine 对应出口），1.0.0 时退役。
- **版本序列**：engine 首发承接 `@autodown/vue 0.2.0` 序列 → **0.3.0**
  （合并 + 渲染统一，Plan 017）→ 0.4.x（编辑内核替换，Plan 018）→
  **1.0.0**（rust 平台齐 + 旧包退役，Plan 019/020）。

## 4. 总体架构：三层

```
┌────────────────────────────────────────────────────────────────┐
│ L3 编辑层（每平台薄壳）                                         │
│   vue: per-block contenteditable + 输入规则 + 菜单 + undo       │
│   rust: 复用 code_editor core 模式（cosmic-text per-block +     │
│         draw-list 光标叠加，auto-lang 413 分层蓝本）            │
├────────────────────────────────────────────────────────────────┤
│ L2 渲染层（单一路径）                                           │
│   块树 ──palette_map──▶ 视图面板树 ──▶ 平台面板渲染器            │
│   vue: 生成式 VNode 渲染器（面板组件与 AURA widget registry      │
│         同名/同类名对齐）                                       │
│   rust: 面板树 = AURA view tree → auto-lang iced 渲染器         │
│   展示模式 = 本层直接挂载；编辑模式 = 本层 + L3                  │
├────────────────────────────────────────────────────────────────┤
│ L1 内核（平台无关，.at 单源，双端发射）                          │
│   块树文档模型 + 行内 span + 选区/操作 + 增量解析 + 序列化       │
│   + 流式分段/调度决策（吸收 markdown_parser/streaming/scheduler）│
└────────────────────────────────────────────────────────────────┘
```

分层规则（沿用 413 的硬约束）：L1 不得出现平台符号（无 vue/iced import）；
L2 不得依赖 L3；L3 只经 L1 的操作接口改文档，不得直改块树。内核输入输出
均为纯数据（对拍/快照测试友好）。

## 5. 块模型设计（L1）

### 5.1 数据结构（`block_model.at`，示意）

```
BlockNode {
    id: BlockId                    # 稳定块 ID（吸收 editor BlockId 体系）
    type: BlockType                # heading/paragraph/fence/blockquote/
                                   # list*/table/thematic_break +
                                   # AutoDown 扩展: callout/details/
                                   # wikilink_block/query_block/
                                   # block_embed/mermaid/math_block
    attrs: Map<str, Value>         # level/language/ial{cols,rows}/type...
    children: List<BlockNode>      # 嵌套块（li/quote/表格 cell）
    inlines: List<InlineSpan>      # 叶子块的行内内容
    source: SourceRange            # 源文本区间（增量编辑定位/roundtrip）
}

InlineSpan { marks: Set<Mark>, text: str }   # strong/em/code/link/image/del…

Selection { anchor: BlockPos, head: BlockPos }   # BlockPos = {blockId, offset}
```

> 实施形态修订（Plan 016 Phase 1，2026-08-25）：`attrs` 实为 `List<Attr>`
> 列表扫描、`marks` 实为 `List<Mark>`——a2ts 将 Map 发成 Record 且
> `.contains` 透传为坏 JS、a2r 原生 map 下标断裂；小集合上列表扫描双端
> 全通，定为双端约束下的正式形态（待 auto-lang Map 发射修复后可回迁，
> DEBTS 016 行在册）。

要点：

- **强类型块树**替代现 `parseDocument -> List<any>` 弱类型渲染树；渲染树
  是块树的投影，不再是独立真相源。
- **BlockId 进内核**：现为 editor 的 BlockId 装饰（`data-block-id` DOM +
  `getBlockMap()` expose），jade-garden 滚动定位/块链复制与后端索引都锚定
  它。收编为模型一等公民后，`.ad` 侧沿用"解析时注入、序列化时可选输出"
  策略（`docs/designs/02-ad-format.md` §3.1）。
- **IAL 预处理保留**：core 的 `preprocessMarkdown`/`buildIAL` 迁入 parser
  前置步骤。

### 5.2 选区与操作

- 选区 = 双 `BlockPos`（块锚点 + 块内偏移），跨块选区在模型层表达。
- 编辑以**操作序列**（事务）表达：`insert_text` / `split_block` /
  `merge_blocks` / `set_block_type` / `lift_block` / `wrap_block` /
  `replace_range`…——纯函数，输入 (块树, 选区, 操作) 输出 (新块树, 新选区)。
- undo 栈 = 操作序列的反演；协同（若未来做）= 操作序列的变换目标。IME
  preedit 不进操作栈（组合态在平台层维持，提交时一次性入栈）。

### 5.3 解析与序列化

- **增量解析**：`markdown_parser.at`（1282 行）吸收进内核，输出从弱类型
  渲染树改为强类型块树（投影层兼容旧字段名一个过渡版本）。块边界扫描
  维持现状语义（stream-markdown-parser 0.0.95 子集白名单不变，扩集
  route 见 DEBTS 008 行）。
- **序列化**：新增 `serializer.at`（块树 → `.ad` 文本），吸收
  `@tiptap/markdown` 的角色。验收 = roundtrip：`parse(serialize(parse(x)))`
  语义等价 + 关键 fixtures 逐字节稳定。
- **AutoDown 方言三逃逸符**（`#`/`$`/`%{}`，`auto-lang/docs/design/raw/
  auto-down.md`）：解析器预留 flip 钩子（`$` 逻辑域块产出
  `query_block`/动态块占位），v1 不实现执行，仅保结构无损。

## 6. 渲染路径（L2）

### 6.1 面板映射（`palette_map.at`）

块树 → **视图面板树**的纯映射，`.at` 单源、双端共享。面板树的节点词汇
**对齐 auto-lang AURA widget registry**：`Text/H1/H2/H3/List/ListItem/
Table/Codeblock/Image/Separator…`。这一映射是"渲染走 AURA"的落点：

- **vue 端**：`render-node.ts`（手写 h()）重写为**生成式面板渲染器**
  （由 palette 映射 + 面板组件注册表生成），组件实现与 auto-lang
  vue 后端生成的 widget 同 class/style token。引擎内嵌一份面板组件
  （不依赖 auto-lang 编译器在场）。
- **rust 端**：面板树即 AURA view tree，直接进 auto-lang iced 渲染器
  （`Text` 多 style run、`codeblock` Rich span 高亮已存在，Plan 413）。

### 6.2 流式与性能语义（不变量）

- 块粒度追加：每 chunk O(新增块)。
- batchRendering 批次 / maxLiveNodes 窗口（默认 320）/ typewriter 字符
  预算：`render_scheduler.at` 决策逻辑吸收进内核，定时器经注入端口
  （现状机制平移）。
- SSR：先全量同步渲染，挂载后切批调度（现状语义平移）。

### 6.3 DOM 契约（不变量，消费方依赖）

渲染层对外 DOM 结构保持三契约（demo/jade-garden/e2e 依赖）：

1. 块级包裹：`div.node-slot[data-node-type] > div.node-content`，
   `data-block-id` 属性；
2. 代码块：`pre[data-language]` + header chrome 注入点；
3. 根 class：`markdown-renderer`（现 `markstream-vue markdown-renderer`
   中的历史段在 0.3.0 移除，e2e 同步改——唯一一次显式破坏，进 Plan 017）。

## 7. 编辑层（L3）

### 7.1 vue 策略：per-block contenteditable

- 文档模型为唯一真相源；DOM 是投影。每叶子块一个 contenteditable 宿主，
  焦点块接收输入，blur/换段时提交操作序列回模型。
- 交互面（斜杠菜单/气泡菜单/表格菜单/拖拽把手/块柄）沿用第 1 层 `.at`
  组件（2743 行）与既有 CSS 类名，props/emits 契约尽量保形；`node_view_ext`
  桥从 Tiptap NodeView 改接引擎的块视图接口。
- **模板插入 API**：jade-garden `editor_tab_ext.ts:169` 现直接调
  `editor.chain()`——新引擎提供等价 `insertTemplate(blocks) /
  replaceSelection(blocks)` 命令层 API（Plan 018 明确契约）。
- IME：compositionstart/end 之间 DOM 自治，提交时 diff 成操作（业界
  成熟模式，避开组合态与模型同步竞态）。

### 7.2 rust 策略：复用 code_editor core 蓝本

- 每个文本叶子块挂一个 cosmic-text Buffer（行内 marks → `Attrs` spans），
  非聚焦块只布局不建编辑器；聚焦块走 413 `CodeEditorCore` 同款输入状态机
  （多击/shift 锚点/preedit/滚动）。
- 光标/选区叠加在 L2 的 draw list 上（同一条渲染管线的第二类图元）。
- 生命周期：LRU 常驻编辑器实例（413 已有，容量 32）。

### 7.3 分工矩阵

| 能力 | 归属 |
|---|---|
| 输入规则/markdown 快捷语法（`# ` 换型、`- ` 列表…） | L3，规则表在 L1（纯数据） |
| undo/redo | L1 操作反演 + L3 栈管理 |
| 菜单/把手/块柄 chrome | L3 + 第 1 层 `.at` 组件 |
| 跨块选区绘制 | L2（面板树知道几何）+ L1（语义） |
| 流式写入打开中的文档 | L1 合并策略（追加分流/冲突锁，Plan 018 待澄清） |

## 8. WYSIWYG 分级路线

- **v1（Plan 018）**：块级 WYSIWYG + Obsidian live preview 式折中——渲染态
  隐藏语法标记，光标所在叶子块显示源码态（块粒度 text/code 翻转，与
  auto-down.md 的 Flip 哲学同构）。理由：全行内 WYSIWYG 的光标/标记鬼影
  问题是独立大坑，隔离它保主线路径。
- **v2（后续增强，不在 016-020 内）**：行内标记光标态显隐（Typora 式）。
- demo 双栏（源码 + 渲染同步）降级为诊断/对拍视图保留——终态下编辑侧与
  展示侧共用管线，`useSyncedScroll` 的补偿问题在单栏形态中消失，但双栏
  作为回归工具仍有价值。

## 9. 重能力与降级

- katex/mermaid/lowlight：维持 `optional-capabilities` 注册式可选注入
  （缺席降级为纯文本 + 提示，不阻塞包可用）——此契约 008 已定版，平移。
- rust 端高亮对应 syntech（auto-lang 现成）；katex/mermaid rust 端 v1
  降级纯文本（后续增强）。
- **第三方清单终态**：运行时零第三方（vue peerDep 仅 `vue`；rust 为
  auto-lang 系 crate）。`hast-util-to-html` 随 StreamingRenderer 代码高亮
  路径内化消失。

## 10. 兼容契约与消费方

### 10.1 三条应用契约（保住则应用近乎零改动）

1. markdown 字符串进出：`content` prop / `@update`（md 文本）；
2. `data-block-id` 块级 DOM 属性；
3. 块对齐测量接口：`getBlockMap(): BlockInfo[]` 与 `containerRef` expose
   （demo `useSyncedScroll` 依赖）。

### 10.2 消费方迁移

| 消费方 | 动作 | 计划 |
|---|---|---|
| demo | 双栏 harness 改接 engine 出口；作为渲染一致性对拍基准 | Plan 020 |
| jade-garden | `editor_tab_ext.ts` slash API 换新命令层；CSS 覆写清理 | Plan 020 |
| auto-musk | **前置**：先执行 008 遗留的 T13/T10 musk 侧验证（DEBTS 在册），再 vendor engine 0.3.0 | Plan 020 协调 |

### 10.3 路线图修订

`docs/designs/06-roadmap.md` Phase 1 的"canonical AST 基于 ProseMirror JSON"决策
**废止**，改为"基于统一块模型（本文档 §5）"；jade-garden 前端
`lib/blockParser.ts` 与后端 `parser.rs` 的块语义对齐到内核序列化器输出
（保持 API 形状，Plan 020 校准）。

## 11. 风险与已知债务

| 风险 | 等级 | 缓解 |
|---|---|---|
| 跨块选区/光标几何是块编辑器经典硬骨 | 🔴 | 操作序列模型先行（纯函数可穷举测试）；v1 折中见 §8 |
| IME（vue contenteditable + rust 413 同源） | 🟡 | composition 自治模式；413 手验清单复用 |
| e2e 安全网破坏 | 🟡 | DOM 三契约 + 选择器冻结清单进各计划验收 |
| plan 015 在途（PLAN-037 defineModel 阻断 + auto-lang worktree 未合并） | ~~🔴~~ 已解除 | 2026-08-25 收口：015 CLOSED；PLAN-037 经 auto-lang plan 443（38adb1ef4）裁定落地（defineModel 降级收窄）；worktree 修复已合并 master（73861f8d）。016 无前置阻断 |
| musk 008 欠账（T13/T10 未验证）叠加 | 🟡 | 迁移顺序强制先清欠账 |
| 行内 WYSIWYG 复杂度 | 🟢 | 分级路线隔离（§8） |
| a2r 通道覆盖块模型所需语言特性 | 🟡 | Plan 016 Phase 0 探针先行（循 015 模式） |

## 12. 与既有文档/计划的关系

- `docs/designs/03-architecture.md`：前端组件表更新为 engine 单包（020 收口时改）。
- plan 008（archived）：渲染自研路线的奠基，本设计是其"编辑侧续篇"——
  待澄清 2 预留的自绘编辑器路线在此落地。
- plan 013（archived）：editor `.at` 化 100%，第 1 层组件资产直接复用。
- plan 015（archived，2026-08-25 CLOSED）：DSL 能力债已清偿，016 前置解除。
- auto-lang Plan 413/421：rust 编辑内核蓝本与 vue 编辑器契约经验。
- auto-lang widget registry（`ui_gen/widget/registry.rs` 的
  `Markdown`/`AutoDownEditor` spec）：Plan 019 中 codegen 臂重定向到
  engine，ark/jet 展示路径随之免费升级。

## 13. 落地计划索引

| 计划 | 主题 | 交付 |
|---|---|---|
| [Plan 016](../plans/archive/016-unified-block-core.md) | 统一块模型内核 | 强类型块树 + 选区/操作 + 序列化 + rust 发射探针 |
| [Plan 017](../plans/017-render-unify-package-merge.md) | 渲染统一与包合并 | `@autodown/engine` 0.3.0 + 面板渲染器 + DOM 契约保持 |
| [Plan 018](../plans/018-editor-kernel-replacement.md) | 编辑内核替换（vue） | Tiptap 退役 + 自研编辑层 + 命令层 API |
| [Plan 019](../plans/019-rust-platform.md) | rust 平台落地 | autodown-core crate + iced 渲染 + 编辑壳 + registry 重定向 |
| [Plan 020](../plans/020-app-migration-retirement.md) | 应用迁移与退役收口 | demo/jade/musk 迁移 + 旧包退役 + 文档修订 |

依赖顺序：016 → 017 → 018 → 020；019 依赖 016/017，可与 018 并行
（不同仓、不同端，汇合点在 020）。
