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
| `.autodown-wikilink-label` | wikilink 节点视图 | jade e2e 04 |
| `.autodown-block-placeholder` | 块编辑占位（滚动同步空挡） | demo scroll-sync |
| `.autodown-block-boundary` | 块边界插入把手 | demo scroll-sync |
| `[data-block-id]` | 块定位（`getBlockMap` 消费） | demo + jade e2e（11 处） |
| `[data-node-index]` | 渲染侧块序号（滚动同步） | demo scroll-sync |
| `.streaming-document` | 渲染根 | demo scroll-sync |
| `.node-slot` / `.node-content` | 渲染块包裹 | 渲染契约（render.test.ts 在册） |
| `[contenteditable]` | 编辑宿主（现 ProseMirror） | jade e2e 02 |

## 2. CustomEvent（document 级）

`autodown:slash-open` / `autodown:slash-close` / `autodown:slash-update` /
`autodown:slash-keydown`（斜杠菜单通信，载荷形状以
`menus/SlashMenu.vue` 现实现为准）。

## 3. 组件 expose / props 契约

- `AutoDownEditor` expose：`getBlockMap()`（demo `useSyncedScroll` 528 行
  的三重依赖）、`handleSave`；props/emits：
  `modelValue`/`content`/`canEdit`/`placeholder`/`@update`/`@save`/
  `@open-wiki-link`/`loadBlock`/`assetUpload`/`runQuery`/`extraSlashItems`。
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

## 核验责任

Phase 2/3 每次桥接换向后跑 demo e2e（9 用例含以上选择器）；Phase 4 逐项
核验本清单 + jade e2e 全量。冻结清单本身的增补须经计划修订（不允许
静默缩水）。
