# 003 — 左右面板同步滚动与自定义滚动条

## 背景

当前 `demo/src/App.vue` 采用左右分栏布局：
- 左侧：Tiptap 编辑器（`AutoDownEditor`）
- 右侧：`StreamingRenderer` 实时渲染

目前左右两侧各自使用系统滚动条，存在以下问题：
1. 滚动条宽度会导致两侧面板在纵向上出现像素级偏差。
2. 两侧滚动不同步，长文档左右错位。
3. 左侧若出现 block 级编辑框（未来功能），右侧对应 block 没有留出等高空挡，导致后续 block 上下错位。
4. 系统滚动条视觉不统一，且在某些平台下会挤压内容宽度。

## 目标

1. 用 Vue 自实现一套轻量滚动条，替代左右两侧的系统滚动条。
2. 单个滚动条同时驱动左右两个面板滚动，并保持内容在垂直方向上一致。
3. 滚动条隐藏/显示（或 hover 显隐）不改变面板可用宽度，避免内容跳动。
4. 支持左侧 block 打开编辑框时，右侧对应 block 前留出等高空挡，保证两侧 block 上下对齐。

---

## 调查发现

### 编辑器侧（左侧）

- `AutoDownEditor` 基于 Tiptap/ProseMirror，最终可滚动容器为 `.autodown-editor-content-wrapper`。
- 当前没有稳定的 block ID，但可以通过扩展给每个顶层 block 的 DOM 节点附加 `data-block-id`。
- `AutoDownEditor.vue` 已 expose `{ editor, handleSave }`，父组件可以拿到 `editor` 实例。
- 通过 `editor.state.doc` 可遍历顶层节点；通过 `editor.view.domAtPos(pos)` 可获取 block 对应 DOM。

### 渲染器侧（右侧）

- `StreamingRenderer.vue` 内部使用 `markstream-vue` 的 `MarkdownRender`。
- 当前没有 block 级标识，需要利用 `markstream-vue` 的 `setCustomComponents` 给各节点包一层带 `data-block-id` 的 wrapper。
- `StreamingRenderer` 目前没有 expose 任何 ref，需要新增 `containerRef` 或 `getBlockElements()`。

### Demo 侧

- `App.vue` 中 `.panel` 是左右滚动容器，已有 webkit 滚动条样式，但仍是系统滚动条。
- 需要隐藏系统滚动条，并新增一个统一的外部滚动条组件。

---

## Part 1 — 编辑器侧：给 block 增加可识别 ID

### 1.1 新建 BlockId 扩展

**新建文件**: `packages/editor/src/extensions/BlockId.ts`

- 使用 Tiptap 的 `Node` 扩展或 ProseMirror Plugin，为每个顶层 block 渲染 `data-block-id` 和 `data-block-index`。
- `data-block-id` 使用稳定的索引（如 `block-0`、`block-1`），按文档顺序生成。
- 该属性不序列化到 Markdown，仅用于 DOM 映射。
- 暴露 helper：`getBlockMap(editor)`，返回：
  ```ts
  interface BlockInfo {
    id: string
    index: number
    pos: number
    el: HTMLElement
    top: number
    height: number
  }
  ```

### 1.2 注册 BlockId 扩展

**文件**: `packages/editor/src/extensions/index.ts`

- 在 `createExtensions` 中注册 `BlockId`。

### 1.3 暴露编辑器 block 查询能力

**文件**: `packages/editor/src/core/AutoDownEditor.vue`

- 在 `defineExpose` 中新增 `getBlockMap()` 方法，供父组件调用。

---

## Part 2 — 渲染器侧：让右侧 block 可被对应

### 2.1 新建 BlockWrapper 组件

**新建文件**: `packages/vue/src/components/BlockWrapper.vue`

- 接收 `indexKey`（来自 markstream-vue）和默认 slot。
- 渲染 `<div :data-block-id="`block-${indexKey}`">` 包裹 slot。

### 2.2 注册自定义节点组件

**文件**: `packages/vue/src/StreamingRenderer.vue`

- 在 `onMounted` 中调用 `setCustomComponents`，为常见 block 类型注册 wrapper：
  - paragraph、heading、blockquote、code_block
  - bullet_list、ordered_list、task_list
  - table、horizontal_rule、image
- wrapper 统一使用 `BlockWrapper`，将 markstream-vue 的 `indexKey` 映射为 `data-block-id`。

### 2.3 暴露容器引用

**文件**: `packages/vue/src/StreamingRenderer.vue`

- 新增 `defineExpose({ containerRef })`，让父组件可以访问右侧内容容器。

---

## Part 3 — Demo 宿主：自定义滚动条与同步滚动

### 3.1 隐藏系统滚动条

**文件**: `demo/src/App.vue`

- 将 `.panel` 的 `overflow-y: auto` 改为 `overflow-y: hidden`（或仍保留 hidden 滚动但隐藏滚动条）。
- 添加 CSS 彻底隐藏 webkit / firefox 滚动条：
  ```css
  .panel::-webkit-scrollbar { display: none; }
  .panel { scrollbar-width: none; -ms-overflow-style: none; }
  ```

### 3.2 新建 CustomScrollbar 组件

**新建文件**: `demo/src/components/CustomScrollbar.vue`

- Props：
  - `scrollTop: number`
  - `scrollHeight: number`
  - `clientHeight: number`
- 计算 thumb 高度和位置。
- 支持：
  - 鼠标拖动 thumb 滚动
  - 点击轨道跳转
  - hover 时高亮
- 样式：固定宽度（如 8px），absolute 定位在容器右侧，不占据文档流宽度。

### 3.3 新建 useSyncedScroll 组合式函数

**新建文件**: `demo/src/composables/useSyncedScroll.ts`

- 输入：左侧编辑器实例、右侧渲染器容器 ref。
- 维护统一的“虚拟滚动高度”：
  - 左侧：所有 block 高度之和 + 编辑框高度（如果打开）。
  - 右侧：所有 block 高度之和 + 编辑框占位高度（如果打开）。
- 提供 `scrollTop` 响应式状态。
- 监听自定义滚动条拖动，将 `scrollTop` 同步到左右容器。
- 监听鼠标滚轮事件（在 `.workspace` 层捕获），驱动统一滚动。
- 当某侧内容高度变化时，重新计算并调整 `scrollTop`（避免溢出）。

### 3.4 编辑框状态同步

**文件**: `demo/src/App.vue`

- 维护状态：
  ```ts
  const editingBlock = ref<{
    id: string      // block-?
    height: number  // 编辑框高度
  } | null>(null)
  ```
- 当编辑框打开/关闭/高度变化时，更新 `editingBlock`。
- 右侧 `BlockWrapper` 或 `StreamingRenderer` 接收 `placeholder` 信息，在对应 block 前渲染等高的空挡：
  ```vue
  <div class="edit-placeholder" :style="{ height: `${editingBlock.height}px` }" />
  ```
- 该空挡计入右侧总高度，用于同步滚动计算。

### 3.5 布局改造

**文件**: `demo/src/App.vue`

- `.workspace` 外层新增相对定位容器，作为统一滚动视口。
- 左右 `.panel` 绝对定位或固定高度 flex item，不再各自滚动。
- 自定义滚动条组件放在 workspace 最右侧，浮动显示。
- 结构示意：
  ```vue
  <div class="workspace">
    <div class="panels">
      <section class="panel left">...</section>
      <section class="panel right">...</section>
    </div>
    <CustomScrollbar
      :scroll-top="scrollTop"
      :scroll-height="scrollHeight"
      :client-height="clientHeight"
      @update:scroll-top="scrollTop = $event"
    />
  </div>
  ```

---

## Part 4 — 编辑框占位（若当前无 block 编辑框，可先预留接口）

### 4.1 当前状态

- 当前编辑器没有独立的 block 级编辑框，编辑直接在 contenteditable 中进行。
- 浮层菜单均为 absolute 定位，不影响文档流。

### 4.2 预留方案

- 在 `AutoDownEditor.vue` 中预留 `edit-box` slot / emit：
  - `@edit-open="{ blockId, height }"`
  - `@edit-close`
  - `@edit-height-change="{ blockId, height }"`
- App.vue 监听这些事件更新 `editingBlock`。
- 右侧 `StreamingRenderer` 通过 prop `placeholderBlockId` + `placeholderHeight` 在对应位置渲染空挡。

---

## 实施顺序

| 步骤 | 内容 | 预计改动 |
|------|------|----------|
| 1 | Part 1.1-1.2 — 新建并注册 `BlockId` 扩展 | ~80 行 |
| 2 | Part 1.3 — `AutoDownEditor` expose `getBlockMap()` | ~10 行 |
| 3 | Part 2.1-2.2 — `BlockWrapper` + `setCustomComponents` | ~60 行 |
| 4 | Part 2.3 — `StreamingRenderer` expose `containerRef` | ~10 行 |
| 5 | Part 3.1 — 隐藏系统滚动条 | ~10 行 |
| 6 | Part 3.2 — `CustomScrollbar` 组件 | ~150 行 |
| 7 | Part 3.3 — `useSyncedScroll` 组合式函数 | ~200 行 |
| 8 | Part 3.4-3.5 — App.vue 布局与编辑框占位集成 | ~120 行 |
| 9 | Part 4 — 编辑框事件接口预留 | ~30 行 |

---

## 依赖

- `@tiptap/core`、`@tiptap/pm`（已在 editor 包中）
- `markstream-vue` 的 `setCustomComponents` API（已安装 `0.0.14-beta.8`）
- Vue 3 Composition API

---

## 验证标准

1. 打开 demo 后，左右两侧均不显示系统滚动条。
2. 自定义滚动条可见并可拖动，拖动时左右两侧内容同步滚动。
3. 鼠标滚轮在 workspace 内滚动时，左右两侧同步移动。
4. 调整窗口大小后，滚动条 thumb 高度和位置正确更新。
5. 长文档滚动到底部时，左右两侧最后一个 block 的顶部对齐。
6. （编辑框功能就绪后）打开编辑框时，右侧对应 block 出现等高空挡，两侧后续 block 仍然上下对齐。
