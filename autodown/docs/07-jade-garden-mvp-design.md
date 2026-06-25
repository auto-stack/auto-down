# Jade Garden MVP 设计：简化版 Obsidian

## 目标

基于 Obsidian / LogSeq 的界面范式，为 AutoDown 设计一个最小可用的知识库编辑器（MVP）。

- **文件格式**：`.ad`（AutoDown 格式，见 `02-ad-format.md`）。
- **编辑器/预览**：复用 `autodown/packages/editor` 与 `autodown/packages/vue`。
- **部署形态**：Web 优先（`auto run` 即开即用），后续可叠加 Tauri 桌面壳。

---

## 参考借鉴

### Obsidian

界面核心：

- **三栏布局**：左侧边栏（文件树 / 导航）、中间主编辑区、右侧边栏（反向链接 / 大纲 / 局部图）。
- **页签系统**：一个主区域可同时打开多篇文档，支持分屏。
- **命令面板 / Quick Switcher**：`Ctrl/Cmd+O` 快速搜索并打开页面。
- **图视图**：全局知识图谱 + 当前页的局部图谱。
- **反向链接**：右侧面板列出引用当前页的所有页面。
- **内部链接**：`[[Topic]]` 点击跳转，悬空链接可一键创建。

### LogSeq

源码参考（`D:\github\logseq`）带来的可复用模式：

- **block-first 架构**：每篇文档是一棵 block 树，渲染与编辑共用同一容器，按 `editing?` 切换。
- **侧边栏堆栈**：右侧面板是“面板栈”，可同时打开多个引用页/块。
- **outliner + 大纲**：左侧除了文件树，还可以有“大纲”视图。
- **CSS 变量主题**：`--ls-primary-background-color`、`--lx-accent-*` 等变量驱动深色/浅色模式。
- **组件化 UI**：底层用 Radix + Tailwind + shadcn/ui 风格的 design system。

Jade Garden 不会照搬 LogSeq 的 outliner（因为 AutoDown 编辑器已经是块级 Markdown 编辑器），但会借鉴其三栏 shell、右侧面板栈、主题变量和 block-ID 映射。

---

## MVP 界面布局

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ≡  Jade Garden   [Quick Switcher ░░░░░░░]    +  🌙  ⚙️                     │  <- 顶栏
├──────┬──────────────────────────────────────────────────────┬───────────────┤
│      │                                                      │               │
│  L   │                                                      │   R           │
│  E   │                   主编辑区 / 预览区                   │   I           │
│  F   │                  (双栏：左编右看)                      │   G           │
│  T   │                                                      │   H           │
│      │                                                      │   T           │
│  S   │                                                      │   S           │
│  I   │                                                      │   I           │
│  D   │                                                      │   D           │
│  E   │                                                      │   E           │
│  B   │                                                      │   B           │
│  A   │                                                      │   A           │
│  R   │                                                      │   R           │
│      │                                                      │               │
└──────┴──────────────────────────────────────────────────────┴───────────────┘
```

### 顶栏（Header）

- 左侧：折叠/展开左侧边栏按钮、当前工作区名称。
- 中间：Quick Switcher（全局文件名搜索，回车打开）。
- 右侧：
  - 新建笔记按钮（`+`）。
  - 图视图切换按钮。
  - 深色/浅色切换按钮。
  - 设置入口（后续扩展）。

### 左侧边栏（Left Sidebar）

可折叠，内部用页签切换：

1. **文件树（Files）**
   - 树形展示 `wiki/` 目录下的 `.ad` 文件。
   - 支持展开/折叠文件夹。
   - 当前打开文件高亮。
   - 右键菜单：新建文件、新建文件夹、重命名、删除。
   - 拖拽排序/移动到文件夹（可选，MVP 可用右键替代）。
2. **大纲（Outline）**
   - 当前文档的标题层级（H1-H3）。
   - 点击标题滚动到对应位置。
3. **最近（Recent）**
   - 最近打开的 10 个文件。

### 主编辑区（Main Area）

- **页签栏（Tabs）**：显示已打开的文件，支持关闭、切换。
- **编辑/预览双栏**：
  - 左侧：`AutoDownEditor`，绑定当前 `.ad` 的 Markdown body。
  - 右侧：`StreamingRenderer`，实时渲染同一 Markdown。
  - 中间拖拽条可调整左右比例。
  - 复用 `demo/src/composables/useSyncedScroll.ts` 做 block 级同步滚动。
- **单栏阅读模式**：提供按钮切换为“仅预览”或“仅编辑”。
- **内部链接交互**：
  - 预览区 `[[Topic]]` 点击 → 打开新页签或替换当前页签。
  - 编辑器内 `[[Topic]]` 点击 → 同预览区行为。
  - 目标 block ID（`[[Topic#block-3]]`）→ 打开文档并滚动定位。

### 右侧边栏（Right Sidebar）

可折叠，内部用“面板栈”方式展示：

1. **反向链接（Backlinks）**
   - 列出所有引用当前页的页面。
   - 显示引用上下文（摘要一行）。
   - 点击打开对应页面。
2. **出链（Outgoing Links）**
   - 当前页中所有 `[[...]]` 链接。
   - 区分“已存在”和“悬空链接”。
   - 悬空链接提供“新建页面”按钮。
3. **大纲 / 文件属性（Outline & Properties）**
   - 当前文档 frontmatter 摘要（title、tags、summary、status）。
   - 标签可点击搜索。
4. **局部图（Local Graph）**
   - 当前页为中心的 1 度关系图（当前节点 + 相邻节点）。
   - 点击节点跳转。
   - MVP 可用简单 SVG/Canvas 力导向图或列表代替。

---

## MVP 功能清单

### P0 — 必须有

1. **打开工作区**
   - 启动时选择/记忆一个本地目录作为 Wiki root。
   - 按 `my-wiki/` 约定识别 `wiki/` 子目录（若不存在则自动创建）。
2. **文件树导航**
   - 列出 `wiki/` 下所有 `.ad` 文件。
   - 点击文件打开页签。
   - 新建/重命名/删除 `.ad` 文件。
3. **编辑与预览**
   - 双栏实时编辑预览。
   - 保存时写回磁盘，并更新 `updated_at` frontmatter。
   - 支持 `@autodown/editor` 已提供的所有 block（heading、list、code、callout、details、math、mermaid、table 等）。
4. **内部 WikiLink 导航**
   - 解析 `[[Title]]` 与 `[[Title#block-id]]`。
   - 点击跳转并定位到 block。
   - 悬空链接提示创建。
5. **反向链接与出链**
   - 后端扫描全部 `.ad` 文件中的 `[[...]]`。
   - 提供 `/api/backlinks/:title` 和 `/api/outlinks/:title`。
6. **Quick Switcher**
   - `Ctrl/Cmd+O` 打开，按文件名模糊搜索。
7. **深色/浅色主题**
   - 使用 CSS 变量，跟随系统或手动切换。

### P1 — 强烈建议有

8. **大纲面板**：当前文档标题导航。
9. **最近文件**：左侧最近页签。
10. **局部图视图**：当前页 1 度关系可视化。
11. **全文搜索**：按内容搜索 `.ad` 文件（MVP 可用 ripgrep / 简单 scan）。
12. **YAML frontmatter 编辑**：侧边栏显示并可编辑 title/tags/summary/status。

### P2 — 后续迭代

13. 全局图视图（Global Graph）。
14. 标签/目录过滤。
15. 工作区设置、主题扩展。
16. auto-ai 导入管道（拖入 PDF → 生成 `.ad`）。
17. 向量/语义搜索。

---

## 前端组件划分

```text
jade-garden/front/
├── app.at                    # 根 widget，调 AppShell
├── widgets/
│   ├── AppShell.at           # 三栏布局 + 顶栏
│   ├── LeftSidebar.at        # 左侧边栏 + 页签切换
│   ├── FileTree.at           # 文件树组件
│   ├── OutlinePanel.at       # 大纲面板
│   ├── RecentPanel.at        # 最近文件
│   ├── MainArea.at           # 页签 + 编辑器/预览
│   ├── EditorTab.at          # 单个页签的编辑预览双栏
│   ├── RightSidebar.at       # 右侧面板栈
│   ├── BacklinksPanel.at     # 反向链接
│   ├── OutgoingLinksPanel.at # 出链
│   ├── PropertiesPanel.at    # frontmatter 摘要
│   ├── LocalGraphPanel.at    # 局部图
│   ├── QuickSwitcher.at      # 全局搜索弹窗
│   └── CreatePagePrompt.at   # 悬空链接创建提示
├── composables/
│   ├── useWorkspace.at       # 当前工作区状态
│   ├── useFileTree.at        # 文件树数据与操作
│   ├── useOpenTabs.at        # 页签状态管理
│   ├── useWikiLinks.at       # 链接解析与跳转
│   └── useSyncedScroll.at    # 从 demo 复用的滚动同步
└── lib/
    └── api.at                # 后端 API 类型/调用
```

> 注：AutoUI 的 widget 可以嵌套调用；若 AutoUI 对复杂组件支持有限，部分 UI 可在生成后的 Vue 项目里手写。

---

## 后端 API 设计

基于 Rust/axum，统一前缀 `/api`。

### 工作区

```rust
GET  /api/workspace          -> { root: string, wiki_dir: string }
POST /api/workspace/open     -> { root: string }   // 切换工作区
```

### 文件树

```rust
GET  /api/files?path=wiki/... -> FileNode[]
POST /api/files/create        -> { path: string, is_dir: bool }
POST /api/files/rename        -> { old_path: string, new_path: string }
POST /api/files/delete        -> { path: string }
```

`FileNode`：

```ts
{
  name: string
  path: string        // 相对于 wiki root
  is_dir: boolean
  children?: FileNode[]
}
```

### 文档读写

```rust
GET  /api/wiki/:path        -> { frontmatter: object, body: string }
POST /api/wiki/:path        -> { frontmatter: object, body: string }
```

- `path` 是 URL-encoded 的相对路径（如 `分布式系统入门`）。
- 读取时后端只负责读取原始文本、拆分 frontmatter 与 body。
- 保存时后端写回 `.ad` 文本，并自动更新 `updated_at`。
- 前端拿到 `body` 作为 Markdown 传给 `AutoDownEditor` / `StreamingRenderer`。

### 链接与图

```rust
GET /api/backlinks/:title   -> Backlink[]
GET /api/outlinks/:title    -> Outlink[]
GET /api/graph/local/:title -> GraphData
GET /api/graph/global       -> GraphData
```

`Backlink`：

```ts
{ source_title: string, source_path: string, context: string }
```

`Outlink`：

```ts
{ target_title: string, target_path: string | null, exists: boolean, block_id?: string }
```

`GraphData`：

```ts
{ nodes: { id: string, title: string, group?: string }[],
  links: { source: string, target: string }[] }
```

### 搜索

```rust
GET /api/search?q=keyword   -> SearchResult[]
```

`SearchResult`：

```ts
{ title: string, path: string, snippets: string[] }
```

---

## 数据流

### 打开文档

```text
用户点击文件树中的 Topic.ad
  → 前端 GET /api/wiki/Topic
  → 后端读取 wiki/Topic.ad
  → 分离 frontmatter + body
  → 返回 { frontmatter, body }
  → 前端：
      - 在 MainArea 新建/激活页签
      - AutoDownEditor 加载 body
      - StreamingRenderer 同步渲染
      - 右侧面板加载 backlinks / outlinks / outline
```

### 编辑保存

```text
用户点击 Save 或触发自动保存
  → 前端 POST /api/wiki/Topic { frontmatter, body }
  → 后端序列化为 .ad 文本（保持 frontmatter 顺序）
  → 写回 wiki/Topic.ad
  → 触发链接索引刷新（异步）
  → 返回 ok
  → 前端更新页签“未保存”状态
```

### 内部链接跳转

```text
用户点击 [[CAP 定理#block-3]]
  → WikiLinkResolver 解析 title="CAP 定理", block_id="block-3"
  → 路由到 /wiki/CAP%20定理
  → 加载文档
  → 通过 BlockId 扩展滚动到 block-3（编辑器和预览器同时）
```

### 悬空链接创建

```text
用户点击悬空链接 [[New Topic]]
  → 弹出创建确认
  → 前端 POST /api/files/create { path: "New Topic.ad", is_dir: false }
  → 后端创建带默认 frontmatter 的空文件
  → 前端打开新页签
```

---

## .ad 解析策略（MVP 简化）

MVP 阶段不依赖完整的 ProseMirror AST 后端解析，后端只做两层：

1. **Frontmatter 解析**：用 `gray_matter` 等价库（Rust 可用 `yaml-rust` / `serde_yaml`）解析 `---` 之间的 YAML。
2. **Body 与链接扫描**：把 body 当 Markdown 文本，用正则提取 `\[\[([^\]]+)\]\]`，用于 backlinks / outlinks / graph。

前端编辑时，`AutoDownEditor` 直接使用 body Markdown；保存时后端把前端传回的 Markdown 拼回 frontmatter 写盘。

这样可以在不等待 `@autodown/core` ProseMirror parser 落地的情况下，先把整个 UI 跑起来。

---

## 技术实现建议

### 前端

- **框架**：AutoUI 生成 Vue 3 + TypeScript 骨架，复杂 widget 手写补充。
- **状态管理**：Pinia 或 Vue 响应式 `ref`/`reactive`。
  - `workspaceStore`：当前工作区路径。
  - `tabsStore`：打开页签、当前活动页签、未保存标记。
  - `sidebarStore`：左右侧边栏展开/折叠、当前面板。
- **路由**：Vue Router，路径 `/wiki/:path*`。
- **图视图**：先用 `@unovis/graph` / `d3-force` / `cytoscape.js` 做局部图；全局图后续再加。
- **图标**：复用 `lucide-vue-next`。
- **样式**：Tailwind CSS + CSS 变量主题。

### 后端

- **语言**：Rust（与现有 `auto run` 生成 Axum server 一致）。
- **文件监听**：`notify` 监听 `wiki/` 变化，变化时刷新内存链接索引。
- **链接索引**：启动时全量扫描 `wiki/*.ad`，构建：
  - `title -> path` 映射
  - `path -> [outlink]`
  - `title -> [backlink]`
- **持久化**：`.autodown/` 目录存放索引缓存、工作区配置、主题设置。

### 与 `@autodown/editor` / `@autodown/vue` 集成

- 前端通过 workspace 依赖引用本地包：

```json
{
  "dependencies": {
    "@autodown/editor": "workspace:*",
    "@autodown/vue": "workspace:*"
  }
}
```

- 在 `front/pac.at` 的 `api` 之外，需要让 `auto run` 生成的 Vue 项目识别 workspace 依赖。可在生成后手动调整 `package.json` / `pnpm-workspace.yaml`，或未来让 AutoLang 支持 workspace deps。

---

## 实施顺序

### Step 1：三栏 Shell + 文件树

- 实现 `AppShell`、`LeftSidebar`、`FileTree`。
- 后端 `/api/files`、`/api/workspace`。
- 点击文件树打开页签（暂用占位文本）。

### Step 2：编辑预览双栏

- 集成 `AutoDownEditor` + `StreamingRenderer`。
- 实现 `EditorTab` + `useSyncedScroll`。
- 后端 `/api/wiki/:path` 读写。
- 保存按钮与未保存状态。

### Step 3：WikiLink 导航

- 预览区与编辑器内点击 `[[...]]` 跳转。
- 路由 `/wiki/:path*`。
- 悬空链接创建页面。

### Step 4：右侧面板

- Backlinks / Outgoing Links。
- Outline。
- Properties（frontmatter 摘要）。
- Local Graph（简单图或列表）。

### Step 5： polish

- Quick Switcher（`Ctrl/Cmd+O`）。
- 深色/浅色主题。
- 最近文件。
- 全文搜索。

---

## 与路线图的对应

本文对应 `06-roadmap.md` 的 **Phase 2：类 Obsidian 编辑器 MVP**。

完成本文设计后，下一步即可进入 Step 1 编码，把 Jade Garden 从“Check Backend”占位页变成真正的 Wiki 编辑器。
