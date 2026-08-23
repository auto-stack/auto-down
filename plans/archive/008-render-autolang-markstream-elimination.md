# 008 渲染库 Auto 化与 markstream-vue 消灭（含编辑库对外融合路线）

> 立项：2026-08-23，来自 auto-musk [PLAN-038](../../auto-musk/docs/plans/038-auto-native-third-party-libs.md)
> T14 的落地草稿（跨平台迁移线缺口 1）。上游消费方：auto-musk（PLAN-038 Phase 3
> 将把 `ports/renderer` 从 markstream-vue 直依赖切到 `@autodown/vue`；PLAN-041
> web 轨退役依赖本计划的编辑库路线）。

## 现状分析

### 1. 渲染栈对 npm 外部件的依赖（2026-08-23 实测）

`@autodown/vue` 0.1.1 的能力栈全部架在外部包上：

- **markstream-vue 0.0.14-beta.8**（Simon He 的 beta 包）：MarkdownRender 增量渲染、
  batch/typewriter 流式语义、setCustomComponents 注册表——渲染核心整体外包。
- **stream-markdown-parser 0.0.95**（markstream 传递依赖，markdown-it 语义）：
  增量 markdown 解析。
- **lowlight**（hljs 系）代码块高亮；**katex** 数学；**mermaid 11** 图表——三个重能力
  均为无条件依赖。

### 2. 本仓已具备的 Auto 化基础

- `@autodown/core` 的 `auto/ial.at`：**.at 单源 → `auto trans`（a2ts）→ dist 发布**
  通道已跑通，带文档化后修补清单（`int?`/`List<int?>` 优先级、RegExp 直通、内置
  parseInt/isNaN 直通）——这是纯逻辑模块 Auto 化的现成模式。
- `@autodown/editor` 的 `src/auto/`：Tiptap 编辑器已有 .at 应用层（auto_down_editor/
  code_block_menu/bubble_menu 等一组 widget）。
- `useStreamingDocument`（增量 JSON 解析 + 分段）与 `StreamingTable` 为纯逻辑/轻耦合
  件，是渲染库里最易先行 Auto 化的部分。

### 3. 消费方（auto-musk）的现状

musk 的 `src/front/components/StreamingRenderer.vue` 逃生舱与本仓 StreamingRenderer
同源同构（上游超集）；musk 侧用 prismjs 自定义 code_block 高亮（注册路径与
setCustomComponents 兼容，切换无行为变化）。

## 目标

1. **渲染库纯逻辑层 Auto 化**：`useStreamingDocument` + `StreamingTable` 迁 `.at`
   单源（循 ial.at 的 a2ts 模式），TS 侧产物由转译生成。
2. **markstream-vue 消灭**：增量 markdown 解析层自研 `.at` 实现（对拍
   stream-markdown-parser 语义，fixtures 复用 musk 侧真实内容采样）；渲染批处理/
   typewriter/max-live-nodes 语义内化进本库；`MarkdownRender` 出口形态保持兼容
   （musk 消费面零改动切换）。
3. **重能力可选化与降级**：katex/mermaid/高亮转为可选注入（enableXxx 注册式），
   提供 VM/无 DOM 后端的降级渲染路径（代码块 + i18n 提示）。
4. **编辑库对外融合路线**：`@autodown/editor` 作为独立可发面包定版（.at 应用层 +
   Tiptap 平台实现层的分层契约），承接 musk 编辑器场景迁移（PLAN-041 Phase 2 的
   AutoDownEditor 替代内核）。

## 阶段划分

### Phase 1 — 纯逻辑层先行（无外部依赖）

- `useStreamingDocument.ts` / `StreamingTable.vue` 逻辑 → `packages/vue/auto/*.at`
  （a2ts 通道 + pnpm gen 后修补脚本固化）。
- 对拍：与现 TS 实现行为全等（fixtures 从 musk `scripts/lib-parity/fixtures/`
  引用或复制）。

> **进度（2026-08-23）**：Phase 1 完成。`auto/streaming.at`（分段逻辑全量）与
> `auto/streaming_table.at`（表格 props 归一化）落地，经 `pnpm gen` 生成
> `src/streaming.generated.ts` / `src/streaming-table.generated.ts`；手写 JS 语义桥
> （try/catch/typeof/truthiness，a2ts 表达不了的三件）收敛在 `src/auto-helpers.ts`。
> 对拍测试 `streaming-parity.test.ts` 21 例全绿（musk render fixtures 逐字符前缀
> 扫描 + 定向 edge + sticky 缓存序列），dist 运行时冒烟与 demo 消费链验证通过。
> 详见 `packages/vue/auto/README.md`。

### Phase 2 — 增量 markdown 解析层（markstream 消灭核心）

- 块级/行内/GFM 围栏解析 + 流式 loading 态，`.at` 实现；语义对拍
  stream-markdown-parser（最终态树 + 流式前缀态树双断言）。
- 决策点（见待澄清 1）：从零实现 vs markdown-it 语义子集对拍——以后者验收口径为准。

> **进度（2026-08-23）**：Phase 2 解析层完成（决策点 1 落地：markdown-it 语义子集
> 对拍口径）。`auto/markdown_parser.at` 实现块级（heading ATX+setext/paragraph/fence
> +流式 loading/blockquote/列表族/thematic_break/table+流式预解析）与行内
> （strong/emphasis/inline_code/link/image/strikethrough/hardbreak）+ typographer
> 智能引号 + 流式尾部半成品修剪。对拍 `markdown-parity.test.ts` 43 例全绿：定向
> 36 × 双模式 + musk fixtures 5 × 双模式 + 逐字符流式前缀扫描 2 条（含真实截断
> 中间态全序列）。验收为**语义投影对拍**（显式剔除 raw/center/text/diff 等噪音
> 字段——投影函数在测试侧可审）。超集能力（math/footnote/mark/sub/sup/insert/
> `:::` 容器/html 块/linkify）白名单登记后置。注入侧（MarkdownRender 出口接线）
> 归 Phase 3。

### Phase 3 — 渲染语义内化 + 可选能力

- batch/typewriter/max-live-nodes 调度内化（定时器经注入端口，VM 侧由 adapter 提供）。
- katex/mermaid/highlight 改可选注册 + 降级路径；`MarkdownRender` 兼容出口。
- musk PLAN-038 Phase 3 在此阶段完成后切换消费。

> **进度（2026-08-23）**：Phase 3 完成（本仓侧）。
> ① `MarkdownRender.vue` + `render-node.ts` 自研渲染层——DOM 契约与 markstream
> 对齐（node-slot/node-content 包裹、data-node-type、pre[data-language]、
> table-node、code-block-header、嵌套 markdown-renderer），下游滚动同步/代码头
> 注入/CSS override 零改动。② 调度内化：`auto/render_scheduler.at`（batch 推进/
> max-live-nodes 窗口/typewriter 步进的纯决策）+ `use-render-scheduler.ts`
> （定时器注入端口，VM adapter 可换装）；MarkdownRender 集成（SSR 全量树 +
> hydration 后调度接管）。③ 重能力可选化：`optional-capabilities.ts` 注册式
> enableKatex/enableMermaid/enableHighlight，缺席时库可用（降级测试在册）；
> katex/mermaid 移出 dependencies。④ **markstream-vue 及 katex/mermaid 移出
> dependencies（验收 1 达成）**；`MarkdownRender`/`parseDocument`/enable* 进
> `@autodown/vue` 出口（musk T13 切换面就绪）。测试 82 例全绿（+渲染 DOM 契约
> 11 + 调度器 7）；demo 消费链与 SSR 冒烟通过。musk 侧 T13 端到端切换验证待
> musk 会话执行（其 render-switch 白名单机制现成）。

### Phase 4 — 编辑库定版

- `@autodown/editor` 分层契约文档化（.at 应用层 API / Tiptap 平台层边界）；
  发包形态（npm 或 workspace file:）定版；musk PLAN-041 Phase 2 接入验证。

> **进度（2026-08-23）**：Phase 4 完成（本仓侧）。分层契约定版于
> `packages/editor/ARCHITECTURE.md`（.at 应用层组件面 = 公开 API 契约；
> Tiptap 扩展/composables 平台层边界规则；重能力降级原则）。发包形态定版
> 为 **vendor 快照通道**（musk T11 实测裁定：`workspace:*` 阻塞 file: 直链，
> 现行 vendor 脚本模式已跑通；editor 接入循同一模式；npm 发包登记为升级路径
> 而非本计划内）。版本定版：`@autodown/editor 0.2.0` 维持、`@autodown/vue`
> 0.1.1→**0.2.0**（markstream 消灭升版，对应待澄清 4：musk 消费锁 ~0.2 跟进
> vendor 快照）。musk 侧接入验证（PLAN-041 Phase 2 + T10 端到端）待 musk
> 会话执行——本仓 dist 新鲜、契约文档与出口面就绪。

## 验收对照（2026-08-23 全计划收口）

1. ✅ `@autodown/vue` dependencies 不含 markstream-vue 及传递链（仅剩
   @autodown/core/lowlight/hast-util-to-html；stream-markdown-parser 降为
   devDep 仅对拍测试用）。
2. ✅ 解析层与渲染语义对拍全绿（markdown-parity 43 例：最终态 + 逐字符流式
   前缀双断言，musk 真实内容 fixtures）。
3. ✅ katex/mermaid/highlight 缺席时库可用（optional-capabilities 注册式 +
   降级测试在册）。
4. ◻ musk 侧端到端：T13 渲染切换与 T10 编辑器接入各一次记录——**本仓侧
   就绪，待 musk 会话执行**（唯一未闭环项，→ DEBTS.md 延期登记）。
5. ✅ `auto trans` 产物与手写 TS 行为等价（Phase 1 streaming-parity 21 例）。

> **finish-plan 复审（2026-08-24）**：全部验证命令重跑——vue 82/82 测试 +
> build + deps guard CLEAN（markstream/katex/mermaid 均出依赖）、editor
> 22/22 + build、demo vite build、四个 .at 单源与 gen.mjs/ARCHITECTURE.md
> 交付物在册。Phase 1-4 逐阶段 pass。验收 4 为外部仓验证动作
> （auto-musk T13/T10），本仓无法执行，记 DEBTS.md 延期行。

## 待澄清事项（全部落定）

1. **解析层路线** → 落定：markdown-it 语义子集对拍（Phase 2 按此实施，
   语义投影对拍口径在册）。
2. **Tiptap 的 VM 后端命运** → 落定：明确切出本计划，作为后续独立计划
   （自绘文本编辑器路线承接，auto-lang 041-auto-edit/code_editor 内核在）。
3. **发包形态** → 落定：vendor 快照通道（musk T11 实测裁定；详见
   packages/editor/ARCHITECTURE.md「发包形态」；npm 发包登记为升级路径）。
4. **版本策略** → 落定：`@autodown/vue` 升 **0.2.0**（markstream 消灭后），
   musk 消费锁 ~0.2 跟进 vendor 快照；`@autodown/editor` 0.2.0 维持。
