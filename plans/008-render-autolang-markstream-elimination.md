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

### Phase 2 — 增量 markdown 解析层（markstream 消灭核心）

- 块级/行内/GFM 围栏解析 + 流式 loading 态，`.at` 实现；语义对拍
  stream-markdown-parser（最终态树 + 流式前缀态树双断言）。
- 决策点（见待澄清 1）：从零实现 vs markdown-it 语义子集对拍——以后者验收口径为准。

### Phase 3 — 渲染语义内化 + 可选能力

- batch/typewriter/max-live-nodes 调度内化（定时器经注入端口，VM 侧由 adapter 提供）。
- katex/mermaid/highlight 改可选注册 + 降级路径；`MarkdownRender` 兼容出口。
- musk PLAN-038 Phase 3 在此阶段完成后切换消费。

### Phase 4 — 编辑库定版

- `@autodown/editor` 分层契约文档化（.at 应用层 API / Tiptap 平台层边界）；
  发包形态（npm 或 workspace file:）定版；musk PLAN-041 Phase 2 接入验证。

## 验收标准

1. `@autodown/vue` 的 dependencies 不再含 markstream-vue 及其传递链（解析/渲染自研）。
2. 解析层与渲染语义对拍全绿（musk 真实内容 fixtures）。
3. katex/mermaid/highlight 缺席时库可用（降级渲染路径有测试）。
4. musk 侧切换（PLAN-038 T13）与编辑器接入（PLAN-041 T10）各有一次端到端验证记录。
5. `auto trans` 产物与手写 TS 行为等价（Phase 1 对拍绿）。

## 待澄清事项

1. **解析层路线**：从零自研 vs 锚定 markdown-it 语义子集对拍（推荐后者——验收口径
   客观，且 musk 侧 PLAN-038 原方案的 fixtures 设计可直接复用）。
2. **Tiptap 的 VM 后端命运**：编辑库融合只承诺"vue 轨可用 + 分层契约稳定"；VM/Rust
   后端的编辑器（自绘文本编辑器路线，auto-lang 041-auto-edit/code_editor 已有内核）
   是否作为后续独立计划——建议明确切出，不在本计划内展开。
3. **发包形态**：npm 发布 vs workspace file: 链接（musk T11 接入方式的对应决策）。
4. **版本策略**：消灭 markstream 后是否升 0.2 并锁 musk 消费版本范围。
