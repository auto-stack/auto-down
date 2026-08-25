# 004 — Code Block 标题栏交互完善

## 背景

在完成 002（语言选择器）和 003（同步滚动条）之后，Code Block 的核心功能已经可用，但在实际使用中发现若干细节问题：

1. 右侧预览端代码块没有语法高亮，与左侧编辑器不一致。
2. 左右两侧代码块缺少一键复制按钮。
3. 语言标签位置过于贴边，hover 时没有明确的下拉提示。
4. 语言选择弹窗在滚动后会偏移，且纵向位置离标题栏太远。
5. 弹窗打开时滚动鼠标，页面会跟着滚动而弹窗不跟随，体验不佳。

## 本次改动总览

| 功能 | 涉及包 | 主要文件 |
|------|--------|----------|
| 预览端代码块语法高亮 | `@autodown/vue` | `packages/vue/src/StreamingRenderer.vue`, `packages/vue/package.json`, `packages/vue/vite.config.ts` |
| 代码块复制按钮 | `@autodown/editor`, `@autodown/vue` | `packages/editor/src/extensions/CustomCodeBlock.ts`, `packages/editor/src/menus/CodeBlockMenu.vue`, `packages/editor/src/styles/autodown-editor.css`, `packages/vue/src/StreamingRenderer.vue` |
| 语言标签左移 + hover 下拉箭头 | `@autodown/editor`, `@autodown/vue` | `packages/editor/src/styles/autodown-editor.css`, `packages/vue/src/StreamingRenderer.vue` |
| 弹窗定位与滚动跟随 | `@autodown/editor` | `packages/editor/src/menus/CodeBlockMenu.vue` |
| 弹窗打开时锁定页面滚动 | `@autodown/editor` | `packages/editor/src/menus/CodeBlockMenu.vue` |

---

## Part 1 — 预览端代码块语法高亮

### 1.1 依赖与构建配置

**文件**: `packages/vue/package.json`

新增依赖：
- `lowlight`（已注册常用语言的高亮库）
- `hast-util-to-html`（把 lowlight 输出的 HAST 转成 HTML）

**文件**: `packages/vue/vite.config.ts`

把 `lowlight` 和 `hast-util-to-html` 加入 `external`，避免打包进 dist。

### 1.2 高亮逻辑

**文件**: `packages/vue/src/StreamingRenderer.vue`

新增 `highlightCodeBlocks(container)`：
- 遍历 `pre[data-language] > code`
- 跳过 `text` / `plaintext`
- 对注册语言调用 `lowlight.highlight(language, text)`
- 用 `hast-util-to-html` 写入 `<code>` 内部
- 通过 `data-highlighted` 属性避免重复高亮

在 `refresh()` 和 `MutationObserver` 回调中调用该函数，保证流式输出时也能及时高亮。

### 1.3 预览端 token 颜色

**文件**: `packages/vue/src/StreamingRenderer.vue` `<style>`

新增 `.hljs-*` 各 token 颜色，与编辑器亮主题保持一致：
- `.hljs-keyword`, `.hljs-selector-tag` 等 → `#d73a49`
- `.hljs-title`, `.hljs-function .hljs-title` → `#6f42c1`
- `.hljs-string`, `.hljs-regexp` → `#032f62`
- `.hljs-number`, `.hljs-literal`, `.hljs-attr` 等 → `#005cc5`
- `.hljs-comment`, `.hljs-quote` → `#6a737d` + italic
- `.hljs-meta` → `#176f2c`
- `.hljs-tag`, `.hljs-built_in` → `#22863a`

---

## Part 2 — 代码块复制按钮

### 2.1 编辑器侧

**文件**: `packages/editor/src/extensions/CustomCodeBlock.ts`

在 `renderHTML` 输出的标题栏中增加复制按钮：
```html
<div class="codeblock-language-badge">
  <span class="codeblock-language-label">{language}</span>
  <button class="codeblock-copy-btn" data-codeblock-copy-btn type="button" title="复制">
    <span class="codeblock-copy-icon"></span>
  </button>
</div>
```

复制图标使用 `mask-image` + `background-color: currentColor` 方案，避免 SVG 在 ProseMirror 节点视图中不渲染的问题。

**文件**: `packages/editor/src/styles/autodown-editor.css`

- 标题栏改为 `display: flex; justify-content: flex-end; gap: 0.25rem`
- 复制按钮固定 `width/height: 1.5rem`，hover 时背景加深
- `.codeblock-copy-icon` 使用统一的 14×14 SVG mask

**文件**: `packages/editor/src/menus/CodeBlockMenu.vue`

在已有的编辑器 click 捕获监听器中，增加对 `[data-codeblock-copy-btn]` 的处理：
- 阻止事件冒泡
- 读取 `pre > code` 的 `textContent`
- 调用 `navigator.clipboard.writeText(code)`

### 2.2 预览端

**文件**: `packages/vue/src/StreamingRenderer.vue`

新增 `addCodeBlockHeaders(container)`，为每个带语言的代码块注入真实 DOM 标题栏：
```html
<div class="codeblock-language-badge" data-codeblock-language-badge="{language}">
  <span class="codeblock-language-label">{language}</span>
  <button class="codeblock-copy-btn" ...>...</button>
</div>
```

- 使用 `[data-header-added]` 标记避免重复注入
- 隐藏原来的 CSS 伪元素标题栏（`[data-header-added]::before { display: none }`）
- 容器捕获 click，点击复制按钮时写入剪贴板

---

## Part 3 — 语言标签左移 + hover 下拉箭头

### 3.1 编辑器侧

**文件**: `packages/editor/src/styles/autodown-editor.css`

- `.codeblock-language-label` 增加 `margin-right: 20px`
- 通过 `::after` 伪元素显示 `▼` 小箭头
- 默认 `opacity: 0`，hover 时渐显
- 箭头 `pointer-events: none`，点击仍然打开语言选择器

### 3.2 预览端

**文件**: `packages/vue/src/StreamingRenderer.vue` `<style>`

预览端注入的真实标题栏复用同一份 class，因此自动继承 `margin-right` 和 hover 箭头样式。

---

## Part 4 — 弹窗定位与滚动跟随

### 4.1 参考系修正

**文件**: `packages/editor/src/menus/CodeBlockMenu.vue`

原实现使用 `view.dom.getBoundingClientRect()`（内容可编辑区）作为参考系，但菜单是 `position: absolute` 挂在 `.autodown-editor` 上。内容区位于可滚动的 `.autodown-editor-content-wrapper` 内部，导致滚动后参考系错开。

改为：
```ts
const editorEl = view.dom.closest('.autodown-editor') as HTMLElement | null
const editorRect = editorEl.getBoundingClientRect()
```

所有 trigger 坐标都相对于 `.autodown-editor` 计算。

### 4.2 监听编辑器内容滚动

在 `.autodown-editor-content-wrapper` 上监听 `scroll`，弹窗打开时通过 `scheduleUpdate` 实时重算位置。

### 4.3 阻止 mousedown 导致 wrapper 回滚

点击语言标签时，ProseMirror 的 `mousedown` 可能会把选择区移到文档开头，导致 wrapper 自动滚动回顶。新增 capture 阶段 `mousedown` 监听器，在语言标签/复制按钮上 `preventDefault()` + `stopPropagation()`。

### 4.4 减小纵向偏移

语言弹窗原本相对于标题栏底部偏移约两行（~50px），在短代码块上几乎贴到底部。改为固定 `6px` 小间隙，弹窗紧贴标题栏下方。

---

## Part 5 — 弹窗打开时锁定页面滚动

### 5.1 全局 wheel 锁定

**文件**: `packages/editor/src/menus/CodeBlockMenu.vue`

新增 `handleGlobalWheel` 并注册为 `document` 级别 capture 监听器：
- 弹窗可见时，所有 wheel 事件 `preventDefault()` + `stopPropagation()`
- 如果事件目标在候选列表内部，把滚动量应用到列表自身的 `scrollTop`
- 列表到达顶部或底部后，继续滚动不再影响外部页面
- 弹窗关闭后移除监听器，页面滚动恢复

### 5.2 移除旧的列表 wheel 处理

原实现仅在列表能向该方向滚动时阻止默认行为，边界时会冒泡到页面。已删除该逻辑，统一由全局监听器处理。

---

## Part 6 — 测试与验证

### 6.1 单元测试

- `packages/editor`：18 个测试全部通过
- `packages/vue`：无测试文件，构建通过
- `packages/core`：无测试文件

### 6.2 Demo 截图验证

- `demo/e2e/screenshots/initial-viewport.png`：确认左右两侧复制按钮、语言标签、hover 箭头一致
- 临时 Playwright 测试：验证滚动后弹窗位置正确、wheel 锁定行为符合预期

---

## 相关 Commit

- `76c1a1c` feat(editor,vue): add preview code highlighting, fix code-block language menu
- `3fe17c8` feat(editor,vue): add copy button to code block header bars
- `7c045a5` fix(editor,vue): use mask-image SVG for code-block copy icon to fix alignment
- `ea682e6` feat(editor,vue): shift language label left and add hover dropdown arrow
- `e484c1a` style(editor,vue): reduce language label left margin to 20px
- `e64782d` fix(editor): anchor code-block language menu to autodown-editor and update on scroll
- `9277f11` fix(editor): reduce code-block language menu offset to 6px
- `e7fcd7b` fix(editor): lock page scroll while code-block language menu is open
