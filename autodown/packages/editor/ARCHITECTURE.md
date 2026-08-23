# @autodown/editor — 分层契约（plan 008 Phase 4 定版）

`@autodown/editor` 是 Tiptap 平台上的 AutoDown 文档编辑器，作为**独立可发
面包**定版（本仓 `packages/editor`，上游消费方：auto-musk PLAN-041 Phase 2
的 AutoDownEditor 替代内核）。本文档固定它的两层契约与发包形态。

## 第 1 层 — Auto 应用层（.at 单源，本项目所有）

全部 Vue 组件由 Auto widget DSL 生成（plan 013 起 100% 覆盖，无手写 shell）：

| 源（`src/auto/src/front/*.at`）        | 生成物（`src/`）                          |
| -------------------------------------- | ---------------------------------------- |
| `code_language_icon.at`                | `components/CodeLanguageIcon.vue`        |
| `slash_menu.at`                        | `menus/SlashMenu.vue`                    |
| `bubble_menu.at`                       | `menus/BubbleMenu.vue`                   |
| `table_menu.at`                        | `menus/TableMenu.vue`                    |
| `code_block_menu.at`                   | `menus/CodeBlockMenu.vue`                |
| 七个 node view（details/wiki_link/query_block/block_embed/mermaid/math_block/math_inline） | `node-views/*.vue` |
| `auto_down_editor.at`                  | `core/AutoDownEditor.vue`（顶层装配）    |

- 编译通道：`src/auto/pac.at`（`scene: "ui"`, `render: "vue"`）→ auto-lang
  master `auto build`；再生成方式与 workaround 台账见 `src/auto/README.md`。
- **契约**：组件的 props/emits/slots/expose 形状就是应用层 API；修改这些
  形状 = 破坏性变更，须升主/次版本并同步消费方。emit 契约由 quoted msg
  variants 携带（小写/连字符事件名，见 plan 013）。

## 第 2 层 — Tiptap 平台层（手写 TS，by design）

- `src/extensions/*`：Tiptap 扩展集（CustomCodeBlock/CustomDetails/
  CustomCallout/WikiLink/QueryBlock/BlockEmbed/MermaidBlock/MathBlock/
  MathInline/BlockId/表格行列/快捷键/斜杠命令…）
- `src/composables/*`：`useAutoDownEditor`（编辑器生命周期）、菜单定位、
  node view 桥、预览渲染
- CSS：`src/styles/autodown-editor.css`

**边界规则**：
1. 平台层可以 import 应用层生成的组件（扩展注册 node view / 菜单挂载），
   反向禁止——`.at` 组件不得 import extensions/composables。
2. Tiptap 版本升级只触及第 2 层；组件改版只触及 `.at` 源再 gen。
3. 重能力（katex/mermaid/lowlight）在平台层按 `@autodown/vue` 的
   optional-capabilities 精神对待：缺席时降级为纯文本呈现，不阻塞包可用。

## 公开 API（`src/index.ts`，定版面）

```ts
export { AutoDownEditor }        // 顶层组件（props: modelValue/content/…）
export { useAutoDownEditor }     // 生命周期 composable
export { createExtensions }      // Tiptap 扩展装配
export { getBlockMap, BLOCK_ID_PREFIX } from './extensions/BlockId'
export type { BlockInfo }
export { CodeBlockMenu }
export type { SlashItem }
```

peerDependencies：`vue ^3.4`、`lucide-vue-next ^0.460`。dependencies 里的
Tiptap/yjs 系为运行时实现细节，随版本升级在层内消化。

## 发包形态（plan 008 待澄清 3 定版）

**定版：vendor 快照通道（musk T11 实测裁定并已跑通）**。

- 背景：包依赖 `@autodown/core: workspace:*`，npm/pnpm 在 autostack
  workspace 外均无法解析该依赖——`file:` 直链实测被阻塞。
- 现行通道：auto-musk `scripts/vendor-autodown-vue.mjs` 模式（dist 快照入
  musk 仓 `vendor/@autodown/<pkg>` + `file:` + `.npmrc install-links=true`）。
  editor 接入（musk PLAN-041 Phase 2）走同一机制，需要 auto-musk 侧复制
  该脚本模式做 `vendor-autodown-editor.mjs`。
- 版本跟进 = 消费方重跑 vendor 脚本（快照无传递解析问题）。
- **升级路径（已登记，非本计划内）**：若未来去 `workspace:*`（改 publish
  版本号）并建立 npm publish 流程，消费方可切版本直依赖、退役 vendor 脚本。
  前置条件：`@autodown/core` 与 `@autodown/vue` 同步进 npm。

## 版本

- `@autodown/editor` `0.2.0`（本定版无 API 破坏性变更，维持）。
- `@autodown/vue` `0.2.0`（plan 008 markstream 消灭后升版——对应待澄清 4：
  musk 消费建议锁 `~0.2` 范围跟进 vendor 快照）。
