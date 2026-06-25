# Plan: Jade Garden MVP 实施计划

> 对应设计文档：`docs/07-jade-garden-mvp-design.md`  
> 对应路线图：`docs/06-roadmap.md` Phase 2

## 目标

把 Jade Garden 从当前的 `auto run` 占位页，演进成一个**最小可用的类 Obsidian 知识库编辑器**：

- 打开本地目录作为 Wiki 工作区。
- 左侧文件树浏览、新建/重命名/删除 `.ad` 文件。
- 中间双栏实时编辑/预览 `.ad` 文件。
- 点击 `[[Topic]]` 内部链接跳转，悬空链接可新建页面。
- 右侧边栏显示反向链接、出链、大纲、frontmatter 属性。
- 底栏状态栏 + Quick Switcher + 深色/浅色主题。

## 非目标

- 不实现 `.ad` 的完整 ProseMirror AST 后端解析（MVP 用 Markdown body + frontmatter 拆分）。
- 不实现向量索引、语义搜索、auto-ai 导入管道。
- 不实现全局图视图、插件系统、多人协作。

---

## Phase 1：工程准备（预计 0.5~1 天）

### 任务 1.1 让 `jade-garden` 引用本地 `@autodown/editor` 和 `@autodown/vue`

- 在 `jade-garden/front/pac.at` 或生成后的 `package.json` 中加入 workspace 依赖：
  ```json
  {
    "dependencies": {
      "@autodown/editor": "workspace:*",
      "@autodown/vue": "workspace:*"
    }
  }
  ```
- 确认 `jade-garden` 能被顶层 `pnpm-workspace.yaml` 识别，或独立维护 `pnpm-workspace.yaml`。
- 运行 `pnpm install`，验证 `AutoDownEditor` 与 `StreamingRenderer` 能正常 import。

### 任务 1.2 约定开发流程

- 开发命令：`cd jade-garden && auto run`。
- 每次修改 `front/app.at` 或手写 Vue 组件后，`auto run` 自动重新生成并热更新。
- 后端手写 Rust 代码位于 `D:/.auto/rust-workspace/myapp-back/`（由 `auto run` 生成），或改为在 `jade-garden/back/` 中维护真实 crate 并让 `front/pac.at` 指向它（待决策，见风险项）。

### 验收标准

- [ ] `auto run` 能正常启动 dev server。
- [ ] 新建一个临时 Vue 组件，能成功 `import { AutoDownEditor } from '@autodown/editor'` 并渲染。
- [ ] `pnpm install` 不再误改 `autodown/pnpm-lock.yaml`。

---

## Phase 2：后端 API — 工作区与文件树（预计 1~1.5 天）

### 任务 2.1 设计 `.ad` 文件在磁盘上的结构

沿用 `docs/03-architecture.md` 的目录约定：

```text
my-wiki/
├── .autodown/              # 索引缓存、配置（MVP 可只存空目录）
└── wiki/                   # 所有 .ad 文件
    ├── index.ad
    └── *.ad
```

MVP 启动时用户选择一个目录作为 `wiki_root`，若该目录下没有 `wiki/` 则自动创建。

### 任务 2.2 Rust 后端 API

在 `myapp-back/src/` 中新增模块（建议文件）：

| 模块 | 文件 | 职责 |
|------|------|------|
| `workspace` | `src/workspace.rs` | 获取/切换工作区路径 |
| `files` | `src/files.rs` | 文件树 CRUD |
| `wiki` | `src/wiki.rs` | 文档读写、frontmatter 拆分 |
| `links` | `src/links.rs` | 扫描全部 `.ad` 中的 `[[...]]`，构建 backlinks/outlinks |
| `search` | `src/search.rs` | 文件名/内容搜索 |

新增 API 路由（前缀 `/api`）：

```rust
// workspace
GET  /api/workspace                -> { root: String }
POST /api/workspace/open           -> { root: String }

// files
GET  /api/files?path=&recursive=   -> FileNode[]
POST /api/files/create             -> { path: String, is_dir: bool }
POST /api/files/rename             -> { old_path: String, new_path: String }
POST /api/files/delete             -> { path: String }

// wiki doc
GET  /api/wiki/:path               -> { frontmatter: Object, body: String }
POST /api/wiki/:path               -> { frontmatter: Object, body: String }

// links
GET  /api/backlinks/:title         -> Backlink[]
GET  /api/outlinks/:title          -> Outlink[]

// search
GET  /api/search?q=                -> SearchResult[]
```

### 任务 2.3 数据结构

```rust
pub struct FileNode {
    pub name: String,
    pub path: String,        // 相对于 wiki/
    pub is_dir: bool,
    pub children: Vec<FileNode>,
}

pub struct WikiDoc {
    pub frontmatter: serde_json::Value,
    pub body: String,
}

pub struct Backlink {
    pub source_title: String,
    pub source_path: String,
    pub context: String,
}

pub struct Outlink {
    pub target_title: String,
    pub target_path: Option<String>,
    pub exists: bool,
    pub block_id: Option<String>,
}

pub struct SearchResult {
    pub title: String,
    pub path: String,
    pub snippets: Vec<String>,
}
```

### 任务 2.4 链接索引

- 启动时递归扫描 `wiki/**/*.ad`。
- 用正则 `\[\[([^\]|#]+)(?:#([^\]]+))?\]\]` 提取链接。
- 构建内存索引：
  - `title_to_path: HashMap<String, String>`
  - `outlinks: HashMap<String, Vec<Outlink>>`
  - `backlinks: HashMap<String, Vec<Backlink>>`
- 用 `notify` 监听 `wiki/` 变化，文件保存后增量刷新索引。

### 验收标准

- [ ] `GET /api/files` 返回正确嵌套文件树。
- [ ] `POST /api/files/create` 新建 `.ad` 文件并写入默认 frontmatter。
- [ ] `GET /api/wiki/:path` 能拆分 frontmatter 和 body。
- [ ] `POST /api/wiki/:path` 写回后 `updated_at` 自动更新。
- [ ] 创建/删除文件后，backlinks/outlinks 索引正确刷新。

---

## Phase 3：前端骨架 — Ribbon + 左侧边栏 + 文件树（预计 1~1.5 天）

### 任务 3.1 生成新的 `AppShell`

替换 `jade-garden/front/app.at` 中的占位 `App` widget，改为三栏布局。

建议手写补充的 Vue 组件（放在 `jade-garden/front/src/components/`）：

| 组件 | 文件 | 说明 |
|------|------|------|
| `AppShell.vue` | `src/components/AppShell.vue` | 整体布局 |
| `Ribbon.vue` | `src/components/Ribbon.vue` | 最左侧图标列 |
| `LeftSidebar.vue` | `src/components/LeftSidebar.vue` | 左侧面板容器 |
| `FileTree.vue` | `src/components/FileTree.vue` | 文件树 |
| `FileTreeNode.vue` | `src/components/FileTreeNode.vue` | 递归树节点 |
| `StatusBar.vue` | `src/components/StatusBar.vue` | 底栏 |

### 任务 3.2 状态管理（Pinia）

新增 `src/stores/`：

```text
src/stores/
├── workspace.ts    # 当前 wiki_root、加载状态
├── fileTree.ts     # 文件树数据、展开/折叠状态
├── tabs.ts         # 打开页签、当前活动页签、未保存标记
├── sidebar.ts      # 左右侧边栏展开/折叠、当前 Ribbon 选中项
└── theme.ts        # dark/light 主题
```

### 任务 3.3 文件树交互

- 点击文件 → `tabsStore.open(path)`。
- 右键菜单 → 新建文件、新建文件夹、重命名、删除。
- 文件夹展开/折叠。
- 当前活动文件高亮。

### 验收标准

- [ ] 界面与 `docs/07-jade-garden-mvp-design.md` 布局一致：Ribbon + 左侧边栏 + 主区域 + 底栏。
- [ ] 点击文件树中的文件，主区域打开对应页签（内容先用占位文本）。
- [ ] 可以新建/重命名/删除 `.ad` 文件，文件树实时刷新。
- [ ] 底栏显示当前工作区名。

---

## Phase 4：编辑与预览双栏（预计 1~1.5 天）

### 任务 4.1 集成 `@autodown/editor` 与 `@autodown/vue`

新增 `EditorTab.vue`：

```vue
<template>
  <div class="editor-tab flex h-full">
    <AutoDownEditor
      ref="editorRef"
      class="flex-1 overflow-auto"
      :content="body"
      placeholder="Start typing..."
      @update="onUpdate"
      @save="onSave"
    />
    <div class="w-px bg-border" />
    <StreamingRenderer
      ref="rendererRef"
      class="flex-1 overflow-auto"
      :source="body"
      :streaming="false"
    />
  </div>
</template>
```

### 任务 4.2 文档加载与保存

- `tabsStore` 中保存每个页签的 `frontmatter`、`body`、`dirty`。
- 打开文档时：`GET /api/wiki/:path` → 存入 tab。
- 编辑器 `@update` 时：更新 `body` 并标记 `dirty=true`。
- 编辑器 `@save` 或 `Ctrl/Cmd+S` 时：`POST /api/wiki/:path` → 标记 `dirty=false`。
- 自动保存（可选 P1）：debounce 3s 后自动保存。

### 任务 4.3 同步滚动

- 从 `autodown/demo/src/composables/useSyncedScroll.ts` 复制到 `jade-garden/front/src/composables/useSyncedScroll.ts`。
- 在 `EditorTab.vue` 中调用：
  ```ts
  useSyncedScroll(editorRef, rendererRef)
  ```

### 验收标准

- [ ] 点击文件树，主区域显示该 `.ad` 的双栏编辑/预览。
- [ ] 左侧编辑时右侧实时渲染。
- [ ] 保存后文件落盘，`updated_at` 更新。
- [ ] 未保存的页签标题带圆点标记。

---

## Phase 5：WikiLink 导航与悬空链接（预计 1~1.5 天）

### 任务 5.1 解析 `[[...]]`

- 在前端统一解析函数 `src/lib/wikiLink.ts`：
  ```ts
  parseWikiLink(raw: string): { title: string; blockId?: string }
  ```
- 支持 `[[Title]]`、`[[Title#block-id]]`、中文标题、空格。

### 任务 5.2 预览区链接跳转

- `StreamingRenderer` 渲染出的 `<a>` 标签，若 href 是 `wiki://Title#block-id`，则拦截点击。
- 通过 Vue Router 导航到 `/wiki/:path`。
- 若目标不存在，弹出 `CreatePagePrompt` 提示新建。

### 任务 5.3 编辑器内链接跳转

- `AutoDownEditor` 已 emit `link-click` 事件（id 以 `block-` 开头）。
- 对于 `[[...]]` 链接，需要扩展 Tiptap 扩展或事件拦截，使点击时触发前端路由。
- MVP 可先通过右键菜单“打开链接”实现；理想情况下点击即跳转。

### 任务 5.4 悬空链接样式

- 预览区：悬空链接显示为红色/虚线样式。
- 编辑器：Tiptap 中可对悬空 WikiLink 加 mark 样式。

### 验收标准

- [ ] 预览区点击 `[[CAP 定理]]` 打开对应文档页签。
- [ ] 点击 `[[CAP 定理#block-3]]` 打开文档并滚动到 block-3。
- [ ] 悬空链接点击后弹出“新建页面”确认框，确认后创建并打开。

---

## Phase 6：右侧面板 — Backlinks / Outlinks / Outline / Properties（预计 1~1.5 天）

### 任务 6.1 右侧面板容器

新增 `RightSidebar.vue`：可折叠、宽度可拖拽调整、内部多个子面板。

### 任务 6.2 各面板实现

| 面板 | 数据来源 | 行为 |
|------|----------|------|
| `BacklinksPanel` | `GET /api/backlinks/:title` | 列表，点击打开源页面 |
| `OutgoingLinksPanel` | `GET /api/outlinks/:title` | 列表，区分存在/悬空，悬空可新建 |
| `OutlinePanel` | 解析当前 body 中的 heading | 点击滚动到对应 heading |
| `PropertiesPanel` | 当前 tab 的 frontmatter | 显示 title/tags/summary/status，可编辑（P1） |
| `LocalGraphPanel` | 当前页的 outlinks + backlinks | 简单列表或小型力导向图（P1） |

### 任务 6.3 大纲解析

- 用正则匹配 `#`、`##`、`###` 行。
- 生成嵌套列表，点击时通过 `editorRef` 滚动到对应 block。

### 验收标准

- [ ] 右侧面板默认显示 Backlinks 和 Outline。
- [ ] 切换文档时右侧面板内容同步更新。
- [ ] 点击 Outline 项，编辑器和预览区同步滚动到对应标题。

---

## Phase 7： polish — Quick Switcher、主题、状态栏、搜索（预计 1 天）

### 任务 7.1 Quick Switcher

- 新增全局弹窗组件 `QuickSwitcher.vue`。
- 快捷键 `Ctrl/Cmd+O`。
- 调用 `GET /api/search?q=` 或本地文件名列表做模糊匹配。
- 回车打开选中文件。

### 任务 7.2 深色/浅色主题

- 使用 CSS 变量定义颜色。
- `themeStore` 持久化到 `localStorage`。
- 切换时给 `html` 加/减 `.dark` class。

### 任务 7.3 状态栏完善

- 显示：当前工作区名、保存状态、反向链接数、词数、字符数。
- 词数/字符数由前端基于当前 body 计算。

### 任务 7.4 全文搜索（P1）

- 新增 `SearchPanel`（可在 Ribbon 中打开）。
- 调用 `GET /api/search?q=`。
- 结果列表点击打开文件。

### 任务 7.5 通知横幅

- 新增 `NotificationBanner.vue`。
- 用于提示保存状态、索引重建、导入完成等。

### 验收标准

- [ ] `Ctrl/Cmd+O` 打开 Quick Switcher 并搜索文件名。
- [ ] 主题切换后编辑器、预览区、UI 全部生效。
- [ ] 底栏实时显示词数、字符数、反向链接数。

---

## Phase 8：联调与验收（预计 1 天）

### 联调清单

- [ ] 新建工作区 → 创建 `.ad` → 编辑 → 保存 → 刷新页面 → 内容不丢失。
- [ ] 创建两个 `.ad`，互相用 `[[...]]` 链接，验证 backlinks/outlinks。
- [ ] 关闭页签、重新打开，未保存文档提示保存。
- [ ] 删除文件后，backlinks 面板不再显示该文件。
- [ ] `auto run` 能完整启动，无报错。
- [ ] 编辑器/预览区滚动同步正常。

### 测试补充

- 后端单元测试：文件树、frontmatter 拆分、链接扫描。
- 前端 e2e（可选）：用 Playwright 验证文件树点击、WikiLink 跳转。

---

## 文件变更预期

```text
auto-down/
├── jade-garden/
│   ├── front/
│   │   ├── app.at                          # 替换为 AppShell
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── AppShell.vue
│   │   │   │   ├── Ribbon.vue
│   │   │   │   ├── LeftSidebar.vue
│   │   │   │   ├── FileTree.vue
│   │   │   │   ├── FileTreeNode.vue
│   │   │   │   ├── MainArea.vue
│   │   │   │   ├── EditorTab.vue
│   │   │   │   ├── RightSidebar.vue
│   │   │   │   ├── BacklinksPanel.vue
│   │   │   │   ├── OutgoingLinksPanel.vue
│   │   │   │   ├── OutlinePanel.vue
│   │   │   │   ├── PropertiesPanel.vue
│   │   │   │   ├── LocalGraphPanel.vue
│   │   │   │   ├── StatusBar.vue
│   │   │   │   ├── NotificationBanner.vue
│   │   │   │   ├── QuickSwitcher.vue
│   │   │   │   └── CreatePagePrompt.vue
│   │   │   ├── stores/
│   │   │   │   ├── workspace.ts
│   │   │   │   ├── fileTree.ts
│   │   │   │   ├── tabs.ts
│   │   │   │   ├── sidebar.ts
│   │   │   │   └── theme.ts
│   │   │   ├── composables/
│   │   │   │   ├── useSyncedScroll.ts    # 从 demo 复制并适配
│   │   │   │   └── useWikiLinks.ts
│   │   │   ├── lib/
│   │   │   │   ├── api.ts                # 由 auto run 生成或手写封装
│   │   │   │   └── wikiLink.ts
│   │   │   └── styles/
│   │   │       └── variables.css         # 主题变量
│   │   └── package.json                  # 加入 @autodown/editor / vue
│   └── back/
│       └── (api.at 已存在，保持不变)
└── D:/.auto/rust-workspace/myapp-back/     # 由 auto run 生成，手写扩展
    └── src/
        ├── workspace.rs
        ├── files.rs
        ├── wiki.rs
        ├── links.rs
        ├── search.rs
        └── main.rs                         # 注册路由
```

---

## 风险与待决策

1. **后端代码位置**
   - 当前 `auto run` 把 Rust server 生成到 `D:/.auto/rust-workspace/myapp-back/`，不在 `jade-garden/back/`。
   - 方案 A：直接在 `myapp-back` 手写扩展（简单，但每次 `auto run` 可能覆盖）。
   - 方案 B：把 `myapp-back` 源码迁回 `jade-garden/back/rust-server/`，由 `front/pac.at` 指向它，或脱离 `auto run` 的后端生成。
   - **建议**：MVP 先用方案 A，等稳定后再迁移。

2. **`.ad` 后端解析深度**
   - MVP 只拆分 frontmatter + body；链接扫描用正则。
   - 后续 Phase 1 parser 落地后，再替换为正则扫描为 AST 扫描。

3. **WikiLink 在编辑器内的点击行为**
   - `AutoDownEditor` 当前只支持 `#block-id` 的 `link-click`。
   - 需要确认是否能方便地给 `[[...]]` 添加 click handler，否则 MVP 可先只做预览区跳转。

4. **工作区选择 UI**
   - Web 应用无法直接 `showOpenDirectoryPicker` 之外持久化本地路径。
   - 若用纯 Web，首次启动需要用户选择目录；Tauri 桌面版可直接记忆路径。
   - **建议**：MVP 先用 `<input type="file" webkitdirectory>` 或 directory picker，后续 Tauri 再优化。

---

## 时间估算

| Phase | 内容 | 预计 |
|-------|------|------|
| Phase 1 | 工程准备 + workspace 依赖 | 0.5~1 天 |
| Phase 2 | 后端 API：工作区、文件树、文档读写、链接索引 | 1~1.5 天 |
| Phase 3 | 前端骨架：Ribbon + 左侧边栏 + 文件树 | 1~1.5 天 |
| Phase 4 | 编辑/预览双栏 + 同步滚动 + 保存 | 1~1.5 天 |
| Phase 5 | WikiLink 跳转 + 悬空链接创建 | 1~1.5 天 |
| Phase 6 | 右侧面板：backlinks / outline / properties | 1~1.5 天 |
| Phase 7 | Quick Switcher、主题、状态栏、搜索 | 1 天 |
| Phase 8 | 联调、测试、修 bug | 1 天 |
| **总计** | | **7~10 天** |

---

## 下一步行动

建议按 Phase 顺序推进。如果希望快速看到效果，可以先做 **Phase 2 + Phase 3 + Phase 4**（后端 API + 文件树 + 编辑预览），这样 MVP 的核心读写能力就通顺了；WikiLink 和右侧面板随后补齐。
