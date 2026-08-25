# 面板 ↔ AURA Registry 对齐表（plan 017 Phase 2 验收产物）

单源：`auto/render/palette_map.at`（生成 `src/render/palette-map.generated.ts`）。
本表是映射的人类可读视图与 019（rust 平台）的对齐输入；registry 列指
auto-lang `crates/auto-lang/src/ui_gen/widget/registry.rs` 中的 widget 名。

## 内置面板（有 builtin 渲染器）

| 面板类型 (kind) | 块类型 (block type) | AURA registry widget | class token | 备注 |
|---|---|---|---|---|
| Text | `paragraph` / `text` | `Text` ✓ 已登记 | `paragraph-node` / `text-node` | tag `p` / `span` |
| H1–H6 | `heading`（level 属性） | —（019 待登记，建议 Text level 变体） | `heading-node heading-N` | tag `hN`，level 钳位 1..6 |
| Separator | `thematic_break` | `Separator` ✓ 已登记 | `hr-node` | tag `hr` |
| Codeblock | `code_block` | —（019 待登记） | `code-block-container` | 内部 `pre[data-language] > code` 是下游高亮/头部注入契约 |
| Quote | `blockquote` | —（019 待登记） | `blockquote` | 内嵌 `markdown-renderer` 容器 |
| List | `list` | —（019 待登记） | `list-node`（+ `list-decimal`/`list-disc`） | tag `ul`/`ol` 随 ordered |
| Table | `table` | —（019 待登记） | `table-node` | thead/th 含 `table-node__resize-handle` |

## 扩展面板位（无 builtin，消费方注册，缺席降级 unknown-node）

| 面板类型 (kind) | 块类型 (block type) | AURA registry widget | class token（建议） | 备注 |
|---|---|---|---|---|
| Callout | `callout` | —（019 待登记） | `callout-node` | 容器语法 `:::type title`（编辑器侧已有 CustomCallout） |
| Details | `details` | —（可对齐 `Accordion`/`Collapsible` 族，019 裁定） | `details-node` | `:::details Summary` |
| MathBlock | `math_block` | —（019 待登记） | `math-block` | `$$...$$`；预览实现统一在 `src/render/preview.ts` |
| Mermaid | `mermaid` | `Mermaid` ✓ 已登记 | `mermaid-block-container` | 预览实现统一在 `src/render/preview.ts` |
| Query | `query` | —（019 待登记） | `query-block` | `{{query ...}}`（jade-garden 消费方实现的面板为本位） |
| Embed | `embed` | —（019 待登记） | `embed-block` | 块引用嵌入 |

## 机制说明

- 解析顺序：`registerPanel(kind, renderer)` 自定义 → builtin 渲染器 →
  降级 `div.unknown-node`（扩展面板位故意不配 builtin——plan 017 待澄清
  #2 裁定为"注册位"）。
- 渲染器上下文（`PanelRenderCtx`）携带 `renderEmbedded` /
  `renderInlineChildren` 助手，面板实现不依赖渲染器内部，避免环。
- DOM 三契约（`node-slot[data-node-type]` / `data-block-id` /
  `pre[data-language]`）不受本表影响；根 class 的 `markstream-vue`
  历史段移除是 Phase 3 唯一显式破坏点。
- rust 侧（019）：palette_map.at 按双端可发射编写（无 vue/DOM 依赖），
  a2r 发射后即成为 iced 面板渲染器的映射单源；本表 registry 列的空位
  即 019 需要在 registry.rs 登记的 widget 清单。
