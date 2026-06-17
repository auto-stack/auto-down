# 005 — 扩展 Block 组件支持

## 背景

当前 AutoDown 已经实现了基础 block 的编辑与同步渲染：

- 段落、标题（1-3 级）
- 加粗、斜体、行内代码、链接
- 无序/有序列表、任务列表
- 引用块（blockquote）
- 代码块（含语言选择、语法高亮、复制按钮）
- 图片、表格、水平分割线

但随着产品向"类 Notion/Obsidian 的 Markdown 编辑器"演进，仍有许多常见 Markdown 扩展、富媒体、交互式组件以及 AutoDown 独有的内容类型尚未 block 组件化。本次计划通过分析常见 Markdown 编辑器、markstream-vue、Tiptap 生态和 Obsidian 等应用，设计下一批需要支持的 block 组件。

---

## 调研结论

### 1. 当前编辑器能力边界（`@autodown/editor`）

**已注册 Tiptap 扩展**（`packages/editor/src/extensions/index.ts`）：
- `StarterKit`：paragraph、heading、blockquote、bulletList、orderedList、horizontalRule
- `CustomCodeBlock`：自定义代码块
- `Link`、`CustomImage`、TaskList/TaskItem、Table 系列
- `BlockId`：用于同步滚动的 block 标识
- `SlashCommand`：通过 `/` 触发 block 插入

**缺失但常见的能力**：
- Callout / Admonition（提示框）
- Details / Accordion（折叠块）
- Math（KaTeX / MathJax）
- Mermaid / D2 图表
- 音/视频、Iframe 嵌入
- 脚注（Footnote）
- 定义列表（Definition List）
- 自定义占位符/变量块

### 2. markstream-vue 已支持的能力

markstream-vue `0.0.14-beta.8` 原生或可选支持：
- 标准 Markdown 全量渲染
- 代码块（Monaco / Shiki 高亮）
- Mermaid 图表（渐进式渲染）
- KaTeX 数学公式
- D2 图表、`@antv/infographic` 信息图
- 自定义 HTML tags + `setCustomComponents` 映射 Vue 组件
- Worker 异步渲染（KaTeX / Mermaid）

这意味着**渲染端具备承载能力**，主要工作在于：
- 编辑器侧定义对应 Tiptap Node 扩展
- 把 Markdown 语法/自定义标签映射到 markstream-vue 的自定义组件
- 保证 block ID 同步与滚动对齐

### 3. Tiptap 生态参考

Tiptap 官方/社区已有可直接参考的扩展形态：
- `CalloutExtension`：属性化 block，内容可嵌套
- `Details` / `DetailsSummary` / `DetailsContent`：折叠块
- `Mention`：提及/标签（可作为变量引用参考）
- `Youtube` / `Twitch` / `Audio`：媒体嵌入
- `Emoji`：表情节点
- `Mathematics`：数学公式
- 社区 `tiptap-extension-mermaid`：Mermaid 双模式编辑

### 4. Obsidian / Notion / Typora 等应用参考

**Obsidian**：
- `> [!note] 标题` Callout（含 tip/warning/caution 等类型）
- `![[文件名]]` 内部链接/嵌入
- `%%注释%%` 与 YAML frontmatter
- `^block-id` 块引用
- `$...$` / `$$...$$` 数学

**Notion**：
- Callout、Toggle List、Divider、Quote
- Embed（Video、Audio、File、Code、Web Bookmark）
- Equation（block / inline）
- Database-linked blocks

**通用需求收敛**：
Callout、折叠块、数学公式、图表、媒体嵌入、脚注/引用是跨平台高频 block；AutoDown 可在此基础上加入"变量/占位符/模板"等独有 block。

---

## 目标

1. 补齐常见 Markdown 扩展 block 的编辑与渲染。
2. 保证新增 block 与现有 block ID、同步滚动、SlashMenu 机制兼容。
3. 为 AutoDown 独有的动态内容（变量、占位符、模板等）设计可扩展的 block 框架。
4. 分阶段落地，优先做价值高、改动可控的 block。

---

## 拟新增 Block 清单（按优先级）

### Phase 1 — 高频 Markdown 扩展

| Block | 编辑器输入 | 渲染输出 | 优先级 | 说明 |
|-------|-----------|----------|--------|------|
| **Callout / Admonition** | Obsidian 语法 `> [!note] title` 或 `:::tip` | 带图标/标题的提示框 | P0 | 文档类内容高频使用 |
| **Details / Toggle** | `:::details{summary="点击查看"}` 或 HTML `<details>` | 可折叠内容区域 | P0 | 替代长引用，提升可读性 |
| **Math Block** | `$$...$$` | KaTeX 渲染的块级公式 | P0 | markstream-vue 已支持 KaTeX |
| **Inline Math** | `$...$` | KaTeX 行内公式 | P1 | 常与块级公式一起支持 |
| **Mermaid Diagram** | ` ```mermaid ` | Mermaid 渲染图表 | P0 | markstream-vue 已支持 |
| **D2 Diagram** | ` ```d2 ` | D2 渲染图表 | P1 | markstream-vue 可选支持 |

### Phase 2 — 富媒体与引用

| Block | 编辑器输入 | 渲染输出 | 优先级 | 说明 |
|-------|-----------|----------|--------|------|
| **Video Embed** | `:::video{src="..."}` 或 `![video](...)` | `<video>` 或 iframe | P1 | 本地/远程视频 |
| **Audio Embed** | `:::audio{src="..."}` 或 `![audio](...)` | `<audio>` | P1 | 播客/语音 |
| **Iframe Embed** | `:::iframe{src="..."}` | sandboxed iframe | P1 | 通用嵌入（Figma、YouTube 等） |
| **Web Bookmark** | `:::bookmark{url="..."}` | 卡片式链接预览 | P2 | 需要后端抓图或接口 |
| **Footnote** | `[^1]` / `[^1]: 内容` | 底部脚注区域 | P2 | 学术/长文档需求 |
| **Definition List** | `<dl>` / 自定义语法 | 定义列表 | P2 | 技术文档常用 |

### Phase 3 — AutoDown 独有 block

| Block | 编辑器输入 | 渲染输出 | 优先级 | 说明 |
|-------|-----------|----------|--------|------|
| **Variable / Placeholder** | `{{variableName}}` 或 `[[VAR:...]]` | 可替换的占位渲染 | P1 | 动态文档、模板化内容 |
| **Template Include** | `[[INCLUDE:path/to/template]]` | 引用并渲染外部模板 | P2 | 复用片段 |
| **AI Prompt Block** | `:::ai-prompt{model="..."}` | 显示/执行 AI 提示 | P2 | 未来可与 AI 工作流结合 |
| **Comment / Annotation** | `%%comment%%` 或 `[[COMMENT:...]]` | 阅读视图隐藏/批注 | P2 | 协作批注 |

---

## 总体架构设计

### 1. 编辑器侧（`@autodown/editor`）

每个新 block 对应一个 Tiptap Node 扩展：

```ts
// packages/editor/src/extensions/CustomCallout.ts
export const CustomCallout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: { default: 'note' },
      title: { default: '' },
      collapsible: { default: false },
    }
  },

  parseHTML() {
    return [
      { tag: 'div[data-callout]' },
      // 同时支持 Obsidian 语法的导入转换
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0]
  },
})
```

** SlashMenu 接入**：
- 在 `AutoDownEditor.vue` 的 `slashItems` 中为每个 block 新增命令
- 命令负责插入对应 node 并可选聚焦到编辑区

** Markdown 序列化**：
- 利用 `@tiptap/markdown` 的 `addStorage().markdown` 或自定义 `Markdown` 扩展
- 为每个 block 定义 `serialize` / `parse` 规则，保证 Markdown roundtrip

### 2. 渲染侧（`@autodown/vue`）

利用 markstream-vue 的 `setCustomComponents` 机制：

```ts
// packages/vue/src/customBlocks/index.ts
import { setCustomComponents } from 'markstream-vue'
import Callout from './Callout.vue'
import Details from './Details.vue'
import MathBlock from './MathBlock.vue'
import MermaidBlock from './MermaidBlock.vue'

setCustomComponents('autodown', {
  CALLOUT: Callout,
  DETAILS: Details,
  MATH: MathBlock,
  MERMAID: MermaidBlock,
  // ...
})
```

编辑器输出 Markdown 时，把 block 序列化为 markstream-vue 可识别的占位符：

```markdown
[[CALLOUT:type="warning" title="注意"]]
这里是需要提示的内容。
[[/CALLOUT]]
```

或利用 markstream-vue 的 `custom-html-tags` 支持直接输出自定义标签：

```html
<callout type="warning" title="注意">...</callout>
```

### 3. Block ID 与同步滚动

所有新增 block 必须：
- 属于顶层 block（`group: 'block'`）
- 通过 `BlockId` 扩展或自定义 Node 渲染时附加 `data-block-id`
- 在右侧 `StreamingRenderer` 中通过 `setCustomComponents` 渲染出的 wrapper 也附加 `data-block-id`

### 4. 样式体系

新增 block 的样式统一遵循现有 CSS 变量：
- `--ad-surface`：背景
- `--ad-border`：边框
- `--ad-muted`：次要文字
- `--ad-fg`：主文字
- `--ad-primary`：主题色

标题栏/工具栏风格与 Code Block 保持一致（window 风格、圆角 8px、右上角操作按钮）。

---

## Phase 1 详细设计

### Part 1 — Callout / Admonition

#### 编辑器

**文件**: `packages/editor/src/extensions/CustomCallout.ts`

- Node name: `callout`
- Attributes: `type` (note/info/tip/warning/caution/danger), `title`, `icon` (可选)
- 支持嵌套 block 内容
- 渲染为 `div[data-callout]`，标题用 `div.callout-title`，内容用 `div.callout-content`

**文件**: `packages/editor/src/menus/CalloutMenu.vue`（可选）

- 点击标题栏时弹出类型选择（类似 CodeBlockMenu）
- 或直接在标题栏右侧显示类型切换按钮

**文件**: `packages/editor/src/styles/autodown-editor.css`

- 各类型左侧色条/背景色
- 标题栏图标使用 lucide 图标

#### Markdown 语法

优先支持 Obsidian 风格：
```markdown
> [!warning] 注意
> 这是一段警告内容。
> 支持多行和 **Markdown**。
```

同时支持容器语法作为替代：
```markdown
:::warning 注意
这是一段警告内容。
:::
```

#### 渲染端

**文件**: `packages/vue/src/customBlocks/Callout.vue`

- 接收 props: `type`, `title`, 默认 slot 内容
- 使用 markstream-vue 的 `MarkdownRender` 递归渲染 slot 内容
- 在 `StreamingRenderer.vue` 初始化时 `setCustomComponents`

---

### Part 2 — Details / Toggle

#### 编辑器

**文件**: `packages/editor/src/extensions/CustomDetails.ts`

Tiptap 没有原生 Details 扩展，需要自定义：
- Node name: `details`
- 内容结构：`detailsSummary + detailsContent`
- 渲染为 `details > summary + div.details-content`

或使用单一 Node：`details` 包含 `summary`（作为属性）和 `content`。

#### Markdown 语法

```markdown
:::details{summary="展开查看详情"}
这里是折叠内容。
:::
```

#### 渲染端

**文件**: `packages/vue/src/customBlocks/Details.vue`

- 渲染为 `<details>` / `<summary>`
- 内容区域通过 markstream-vue 递归渲染

---

### Part 3 — Math Block

#### 编辑器

**文件**: `packages/editor/src/extensions/MathBlock.ts` / `MathInline.ts`

- Block math: `$$...$$` → Node name `mathBlock`
- Inline math: `$...$` → Node name `mathInline`（可选 P1）
- 编辑时显示为 textarea 或 code block，失焦后渲染为 KaTeX
- 渲染 HTML: `div[data-math-block]` 或 `span[data-math-inline]`

#### Markdown 语法

```markdown
$$
E = mc^2
$$
```

#### 渲染端

markstream-vue 已支持 KaTeX，只需：
- 安装 `katex` peer
- 调用 `enableKatex()`
- 渲染端无需额外组件，标准 `$$` 语法即可

---

### Part 4 — Mermaid Diagram

#### 编辑器

**文件**: `packages/editor/src/extensions/MermaidBlock.ts`

- Node name: `mermaidBlock`
- 编辑模式：textarea 编辑源码，失焦/切换按钮后渲染 SVG
- 渲染 HTML: `div[data-mermaid]` 包含原始代码

参考社区 `tiptap-extension-mermaid` 的双模式（编辑/预览）。

#### Markdown 语法

```markdown
```mermaid
graph TD
  A --> B
```
```

#### 渲染端

markstream-vue 已支持 Mermaid：
- 安装 `mermaid` peer
- 调用 `enableMermaid()`
- 标准 ` ```mermaid ` 代码块即可自动渲染

---

## Phase 2 概要设计

### 富媒体嵌入

统一设计为 `embed` 节点，通过 `type` 区分：

```ts
// packages/editor/src/extensions/EmbedBlock.ts
addAttributes() {
  return {
    type: { default: 'video' }, // video | audio | iframe | bookmark
    src: { default: null },
    width: { default: '100%' },
    height: { default: 'auto' },
  }
}
```

Markdown 语法：
```markdown
:::embed{type="video" src="https://..." width="100%"}
:::
```

渲染端：
- `EmbedBlock.vue` 根据 type 渲染 `<video>` / `<audio>` / `<iframe>` / bookmark 卡片
- iframe 使用 sandboxed iframe 并校验域名白名单

### Footnote

Tiptap 本身没有 footnote 扩展，需要自定义实现：
- `footnoteReference` inline node
- `footnoteBlock` block node（底部脚注区）
- Markdown 序列化/反序列化规则

考虑到复杂度，建议 P2。

---

## Phase 3 — AutoDown 独有 block

### Variable / Placeholder

**场景**：文档中包含需要动态替换的值，如 `{{userName}}`、`{{currentDate}}`。

**编辑器**：
- Node name: `variable`
- 渲染为带有下划线/背景色的 inline 或 block 占位符
- 点击可编辑变量名

**Markdown 语法**：
```markdown
你好，{{userName}}！
```

**渲染端**：
- `Variable.vue` 接收 `name`，从外部 context 取值渲染
- 无值时显示占位符样式

### Template Include

**场景**：复用外部 Markdown 片段。

**Markdown 语法**：
```markdown
[[INCLUDE:snippets/common-setup.md]]
```

**渲染端**：异步加载片段内容后通过 markstream-vue 渲染。

---

## 实施顺序建议

| 阶段 | 内容 | 预计改动 | 依赖 |
|------|------|----------|------|
| 1 | Callout 编辑 + 渲染 | ~250 行 | lucide 图标 |
| 2 | Details 折叠块 | ~200 行 | 无 |
| 3 | Math Block（KaTeX） | ~150 行 | katex |
| 4 | Mermaid Block 双模式编辑 | ~250 行 | mermaid |
| 5 | 嵌入块（video/audio/iframe） | ~200 行 | 无 |
| 6 | Footnote、Definition List | ~300 行 | 无 |
| 7 | Variable / Include / AI Prompt | ~300 行 | 需设计 AutoDown context API |

---

## 兼容性考虑

1. **Markdown roundtrip**：所有 block 必须定义 `parseHTML` 和 `renderHTML`，并通过 `@tiptap/markdown` 配置序列化。
2. **BlockId 同步**：自定义 Node 渲染时需在顶层 DOM 附加 `data-block-id`，与现有同步滚动兼容。
3. **SlashMenu**：新增 block 必须加入 `slashItems`，保证可通过 `/` 插入。
4. **markstream-vue 自定义组件**：占位符语法需要 markstream-vue 在流式渲染时稳定解析，建议在 `final` 阶段再对 block 占位符做最终渲染。
5. **深色模式**：所有新增组件使用 CSS 变量，支持 `.dark` 或 `:is-dark` 切换。

---

## 待决策问题

1. **Callout Markdown 语法**：优先 Obsidian 风格 `> [!type]` 还是容器语法 `:::type`？Obsidian 风格更符合现有用户习惯，但解析相对复杂。
2. **Math 行内支持**：是否同时支持 `$...$`？可能与货币符号冲突，建议默认关闭或需要转义。
3. **AutoDown 变量 context**：变量值由谁提供？是通过 props 传入 `AutoDownEditor`，还是全局 store？
4. **嵌入块安全策略**：iframe 域名白名单、video/audio 是否允许 base64？
5. **Mermaid 编辑体验**：是否在编辑器内实时渲染，还是只显示源码？实时渲染需要异步加载 mermaid。

---

## 实施结果（Phase 1）

Phase 1 已在 `@autodown/editor` 和 `@autodown/vue` 中实现并合并。

### 已交付 Block

| Block | 编辑器 | 预览 | 测试 | 备注 |
|-------|--------|------|------|------|
| **Callout** | ✅ `CustomCallout.ts` | ✅ markstream-vue `AdmonitionNode` | ✅ roundtrip | 使用容器语法 `:::type title`，与 markstream-vue 原生兼容 |
| **Details** | ✅ `CustomDetails.ts` | ✅ 转换为 `<details>` HTML | ✅ roundtrip | 使用容器语法 `:::details Summary` |
| **Math Block** | ✅ `CustomMathBlock.ts` | ✅ markstream-vue `MathBlockNode` + KaTeX | ✅ roundtrip | 使用 `$$...$$` 语法；demo 已导入 katex CSS |
| **Mermaid** | ✅ Slash 命令插入 ` ```mermaid ` | ✅ markstream-vue `MermaidBlockNode` | ✅ roundtrip | 复用现有 `CustomCodeBlock`；预览已启用 `enableMermaid()` |

### 关键实现决策

1. **Callout Markdown 语法**：最终采用容器语法 `:::type title` 而非 Obsidian 语法 `> [!type] title`。原因是 markstream-vue 原生通过 `markdown-it-container` 支持容器语法并渲染为 `AdmonitionNode`；Obsidian 语法需要额外编写 markdown-it 插件并在 markstream-vue 的后处理阶段对齐 token 类型，改动更大。后续可通过预处理器兼容 Obsidian 语法的导入。

2. **Math 行内支持**：按决策暂不支持 `$...$`；Phase 1 仅实现块级 `$$...$$`。

3. **Details 预览方案**：编辑器内部用容器语法 `:::details Summary` 保证结构化 roundtrip；在 `StreamingRenderer.vue` 中通过正则将其转换为原生 `<details>/<summary>` HTML，让浏览器处理折叠/展开。

4. **KaTeX / Mermaid 依赖**：在 `@autodown/vue` 中调用 `enableKatex()` / `enableMermaid()`；KaTeX CSS 由 demo 消费者导入，避免库包体积暴增。

### 新增/修改文件

- `packages/editor/src/extensions/CustomCallout.ts`
- `packages/editor/src/extensions/CustomDetails.ts`
- `packages/editor/src/extensions/CustomMathBlock.ts`
- `packages/editor/src/extensions/index.ts`
- `packages/editor/src/core/AutoDownEditor.vue`
- `packages/editor/src/styles/autodown-editor.css`
- `packages/editor/src/__tests__/roundtrip.test.ts`
- `packages/vue/src/StreamingRenderer.vue`
- `packages/vue/package.json`
- `demo/src/main.ts`
- `plans/005-extended-block-components.md`

### 验证

- `pnpm -r test`：全部通过（editor 22 项测试）
- `pnpm --filter @autodown/editor exec vue-tsc -b --noEmit`：通过
- `pnpm --filter @autodown/vue exec vue-tsc -b --noEmit`：通过
- `pnpm --filter @autodown/editor build`：通过
- `pnpm --filter @autodown/vue build`：通过
- `pnpm --filter demo build`：通过

### 后续可继续

- Phase 2：富媒体嵌入（video/audio/iframe/bookmark）、脚注、定义列表
- Phase 3：AutoDown 独有 block（变量、模板引用、AI Prompt、批注）
- Callout 标题行内编辑、Details 手风琴交互、Mermaid 编辑器内预览切换
