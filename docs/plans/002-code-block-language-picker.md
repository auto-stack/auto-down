# 002 — Code Block 优化：语言选择 + 渲染端语言显示

## 背景

当前 Code Block 存在两个问题：
1. 编辑器中无法选择代码语言（如 `rust`、`python` 等）
2. 右侧渲染端没有显示语言标签（markstream-vue 已内置此功能，但未配置）

## 调查发现

- **编辑器**：使用 StarterKit 默认 CodeBlock，`setCodeBlock()` 不传语言参数，无语言选择 UI
- **渲染器**：`StreamingRenderer.vue` 给 `<MarkdownRender>` 未传 `codeBlockProps`，markstream-vue 的 header/语言图标/复制按钮等功能均未启用
- **markstream-vue 已有能力**：`showHeader`、`showCopyButton`、`showExpandButton`、语言图标系统、主题控制等

---

## Part 1 — 渲染端（右侧 StreamingRenderer）

> 改动小、效果立竿见影，建议先做。

### 1.1 启用 markstream-vue 代码块 header

**文件**: `packages/vue/src/StreamingRenderer.vue`

给 `<MarkdownRender>` 添加 `codeBlockProps`：

```vue
<MarkdownRender
  ...
  :code-block-props="{
    showHeader: true,
    showCopyButton: true,
    showExpandButton: true,
  }"
/>
```

### 1.2 调整 CSS 适配 window 风格代码块

**文件**: `packages/vue/src/StreamingRenderer.vue` `<style scoped>`

- 调整 `pre` 样式：去掉独立圆角，改为与 header 栏衔接
- 为 `.code-block-header` 添加 title bar 样式（背景色、圆角顶部、padding）
- 确保 header + 代码区域视觉上是一个整体"窗口"

---

## Part 2 — 编辑端（左侧 AutoDownEditor）

> 需要新建自定义扩展 + UI 组件。

### 2.1 新建 CustomCodeBlock 扩展

**新建文件**: `packages/editor/src/extensions/CustomCodeBlock.ts`

- 继承 `@tiptap/extension-code-block`
- 添加 `language` 属性（string，默认空）
- 添加 `setCodeBlockLanguage` 命令
- 渲染时在代码块顶部添加语言标识（可点击触发选择器）

### 2.2 新建 CodeBlockMenu 语言选择菜单

**新建文件**: `packages/editor/src/menus/CodeBlockMenu.vue`

- 当光标在 code block 内时显示
- 参考 `TableMenu.vue` 的定位模式（node-level contextual menu）
- 预设常用语言列表：
  - JavaScript, TypeScript, Python, Rust, Go, Java, C/C++, C#
  - HTML, CSS, JSON, YAML, TOML, XML
  - Markdown, Shell/Bash, SQL, Dockerfile
  - Plain Text（无语言标记）
- 支持搜索过滤
- 选中后更新 code block 的 `language` 属性

### 2.3 修改扩展注册

**文件**: `packages/editor/src/extensions/index.ts`

```ts
// 禁用 StarterKit 默认 codeBlock
StarterKit.configure({
  heading: { levels: [1, 2, 3] },
  link: false,
  codeBlock: false,  // ← 新增
})

// 注册自定义 codeBlock
CustomCodeBlock.configure({
  HTMLAttributes: { class: 'autodown-code-block' },
}),
```

### 2.4 修改 SlashMenu Code Block 命令

**文件**: `packages/editor/src/core/AutoDownEditor.vue`

- 插入 code block 后自动弹出语言选择（可选行为）
- 或保持默认无语言，用户通过点击 header 区域手动选择

### 2.5 集成 CodeBlockMenu 到编辑器

**文件**: `packages/editor/src/core/AutoDownEditor.vue`

- 引入 `CodeBlockMenu` 组件
- 在模板中添加 `<CodeBlockMenu v-if="editor" :editor="editor" />`

---

## Part 3 — 测试验证

### 3.1 更新 roundtrip 测试

**文件**: `packages/editor/src/__tests__/roundtrip.test.ts`

- 添加测试：带语言标记的 code block（如 ` ```rust `）能正确保留语言属性
- 验证 Markdown → Tiptap → Markdown 的语言信息不丢失

### 3.2 Demo 验证

**文件**: `demo/src/App.vue`

- 更新默认内容，添加多种语言的代码块示例
- 验证左右两侧同步显示语言标签

---

## 实施顺序

| 步骤 | 内容 | 预计改动 |
|------|------|----------|
| 1 | Part 1 — 渲染端启用 header + CSS | ~30 行 |
| 2 | Part 2.1 — CustomCodeBlock 扩展 | ~80 行 |
| 3 | Part 2.2 — CodeBlockMenu 组件 | ~120 行 |
| 4 | Part 2.3-2.5 — 集成到编辑器 | ~30 行 |
| 5 | Part 3 — 测试 + Demo | ~40 行 |

## 依赖

- `@tiptap/extension-code-block`（已在 StarterKit 中）
- `markstream-vue` 的 `codeBlockProps` API（已安装 `0.0.14-beta.8`）
- `lucide-vue-next` 图标库（已在项目中使用）
