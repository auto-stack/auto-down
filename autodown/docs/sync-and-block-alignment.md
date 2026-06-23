# 左右滚动同步与块高度对齐

本项目的双栏编辑器/预览视图通过 `demo/src/composables/useSyncedScroll.ts` 保持滚动位置一致。文档说明其工作原理，以及未来新增自定义块时需要遵守的约定。

---

## 1. 同步策略概览

### 1.1 不要求单块等高

左侧是源码编辑区，右侧是渲染预览区。同一个源块在两侧的**内容高度**通常不同（例如 Mermaid 源码 vs 渲染后的图表）。

因此同步采用**块级位置映射**，而不是像素级 1:1 滚动：

1. 把左右两侧内容各自划分成若干 `data-block-id` 标记的块。
2. 找到当前滚动位置落在左侧哪个块内，以及在该块内的滚动比例 `ratio`。
3. 在右侧找到**同 ID** 的块，把右侧滚动到对应块的相同比例位置。

这样即使某个块在右侧比左侧高 5 倍，滚动时两边仍然能保持“当前块”对齐。

### 1.2 让后续块顶部也对齐

仅有比例映射还不够：如果一个块在右侧特别高，它后面的所有块都会整体下移，导致两侧后续块的顶部不再对齐。

因此 `useSyncedScroll` 还会注入**per-pair spacer**：

- 对每一对匹配到的块，计算“到下一个块的距离”（effective height）。
- 如果右侧距离 > 左侧距离，就在左侧该块加 `margin-bottom` spacer，并把下一块的 `margin-top` 置 0，避免 margin collapse。
- 反之则在右侧加 spacer。

这样处理之后，**每一个对应块的顶部都能对齐**，两侧总高度也会趋于一致；最后再用一个全局的 `.autodown-sync-spacer` 补齐末尾差异。

---

## 2. 新增编辑器自定义块（NodeView）

### 2.1 必须保证 `data-block-id` 在外层 wrapper 上

`packages/editor/src/extensions/BlockId.ts` 会给每个顶层节点添加 `data-block-id` 装饰。

- 对于普通文本节点，装饰会落在外层 DOM 上，没有问题。
- 对于自定义 `NodeView`，`view.nodeDOM(pos)` 可能返回 NodeView 的**内部 content 元素**（例如 Details 折叠后隐藏的 content）。
- 内部元素的高度/位置往往是错的，会导致同步逻辑拿到错误的块高。

`useSyncedScroll` 已经改用 DOM 查询 `[data-block-id]` 来测量编辑器块，因此只要装饰落在**外层 wrapper** 上，就能正确对齐。

### 2.2 检查方法

在浏览器 DevTools 里检查新块的最外层元素是否带有 `data-block-id="block-N"`：

```html
<div class="autodown-my-block" data-block-id="block-12">
  ...
</div>
```

如果 `data-block-id` 被加在内部子元素上，需要调整 NodeView 或 BlockId 装饰逻辑。

### 2.3 不需要手动同步代码

只要外层有 `data-block-id`，`useSyncedScroll` 会自动把它纳入左右块映射和 spacer 计算。

---

## 3. 新增预览组件（markstream-vue 组件块）

### 3.1 右侧块 ID 的生成逻辑

`packages/vue/src/StreamingRenderer.vue` 里的 `applyBlockIdsAndPlaceholder` 负责给右侧 `.node-slot` 分配 `data-block-id`。

判断一个 `.node-slot` 是否是顶层块的入口是 `getTopLevelBlockType(content, nodeType)`：

1. 先按常见 HTML 标签识别（`p`、`pre`、`h1`...）。
2. 再按当前已知的组件 class 识别（Callout、Details、Math、Mermaid、Image）。
3. **兜底**：使用 markstream 的 `data-node-type` 属性。

只要 `data-node-type` 不是 `text`，就会被当作一个顶层块。

### 3.2 需要显式声明为 wrapper 的块

如果新组件内部还包含 Markdown 子块（类似 Callout/Admonition 内部有段落、列表），必须让 `isWrapperBlockType(type)` 返回 `true`，否则内部段落会被当成独立顶层块，导致：

- 右侧块数量比左侧多。
- 后续块的 `data-block-id` 整体错位。
- 滚动同步从该处开始失效。

当前已声明的 wrapper 类型：

```ts
type === 'blockquote' ||
type === 'ul' ||
type === 'ol' ||
type === 'callout' ||
type === 'admonition'
```

如果新增了“TabGroup”、“Card”这类会嵌套 Markdown 的组件，请把它对应的 `data-node-type` 加进 `isWrapperBlockType`。

### 3.3 检查方法

打开预览区 DOM，确认：

1. 新组件对应一个 `.node-slot`，并且 `.node-content` 上带有 `data-block-id`。
2. 组件内部的 Markdown 段落**没有**被分配独立的 `data-block-id`（如果分配了，说明该组件应被识别为 wrapper）。
3. 左右两侧相同源块的 `data-block-id` 一致（例如都是 `block-12`）。

---

## 4. 快速验证

启动 demo 后，在控制台运行：

```js
const left = document.querySelector('.autodown-editor-content-wrapper')
const right = document.querySelector('.streaming-document')
const pairs = []
for (const l of document.querySelectorAll('.autodown-editor-content [data-block-id]')) {
  const r = document.querySelector(`.streaming-document [data-block-id="${l.dataset.blockId}"]`)
  if (r) {
    pairs.push({
      id: l.dataset.blockId,
      diff: Math.round(l.getBoundingClientRect().top - left.getBoundingClientRect().top - (r.getBoundingClientRect().top - right.getBoundingClientRect().top))
    })
  }
}
console.table(pairs)
```

如果所有 `diff` 都为 0（或末尾缺失块导致的小偏差），说明对齐正常。

---

## 5. 总结

| 场景 | 是否能自动对齐 | 需要做的事 |
|------|--------------|-----------|
| 普通段落/标题/代码/表格/图片 | ✅ 自动 | 无 |
| 现有 Callout/Details/Math/Mermaid | ✅ 自动 | 无 |
| 新增 markstream 简单组件（无嵌套 Markdown） | ✅ 自动 | 确保有非 `text` 的 `data-node-type` |
| 新增 markstream wrapper 组件（嵌套 Markdown） | 需要补规则 | 把 `data-node-type` 加入 `isWrapperBlockType` |
| 新增编辑器自定义 NodeView | 需要检查 | 确保 `data-block-id` 在外层 wrapper，而不是内部 content |
