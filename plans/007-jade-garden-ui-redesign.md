# Jade Garden 视觉与主题重构计划

## 现状分析

### 1. 编辑器样式
- 当前 `EditorTab.vue` 只做了最基础的 Reset：去掉了边框、圆角，让编辑器占满面板。
- `autodown/demo/src/App.vue` 与 `auto-forge/frontend/src/components/editors/autodown/styles/autodown-editor.css` 已经有一套经过微调的编辑器样式（段落间距、标题、代码块、任务列表、表格、Slash/Bubble 菜单、拖拽手柄等）。
- Jade Garden 没有引入这些样式，导致编辑器内部看起来“素”，且部分元素（如任务列表、表格、代码块）的默认表现不一致。

### 2. 应用整体样式
- 当前布局由 Tailwind 的原子类堆砌而成，没有统一的设计 token：
  - 左侧文件树标题栏高度约为 `41px`（`px-3 py-2` + 边框），中间标签栏硬编码 `h-9`（`36px`），Ribbon 宽度 `w-12`。
  - 颜色使用的是 Jade Garden 原始的 emerald 主色 + shadcn 默认色板，和 `auto-forge` 的靛蓝/低饱和风格不一致。
  - 各面板padding、字体大小、hover/active 状态不统一。
- 用户明确提到“左侧导航栏和中间的内容面板的上方的标题栏高度竟然不一致”。

### 3. 主题
- 已实现 `light/dark` 切换（通过 `dark` class），但：
  - 没有可切换的“主题基色”。
  - 没有参考 `auto-forge` 的靛蓝/低饱和品牌色。
  - 当前 light/dark 变量是 shadcn 默认色，饱和度过高，不够现代简洁。

## 目标

1. **编辑器**：引入并适配 `auto-forge` 的 `autodown-editor.css`，让编辑器内部排版、代码块、表格、菜单等具备设计感。
2. **应用 shell**：以 `auto-forge` 的 clean & minimal 风格为参考，重新设计 Ribbon、左侧边栏、标签栏、右侧面板、状态栏、工作区选择器；统一 header 高度与间距。
3. **主题**：引入主题基色（参考 auto-forge 的靛蓝）+ 黑白（light/dark）双模式；提供颜色预设切换入口。

## 实施步骤

### Phase A：主题系统（必须先做，后续样式依赖这些变量）

1. 复制 `auto-forge/frontend/src/components/editors/autodown/styles/autodown-editor.css` 到 `jade-garden/front/src/assets/autodown-editor.css`。
2. 重写 `jade-garden/front/src/assets/index.css`：
   - `:root` 使用 `auto-forge` 的 HSL 色值（靛蓝主色、低饱和背景、极细边框）。
   - `.dark` 使用 `auto-forge` 暗色色值。
   - 增加 `--header-height: 2.25rem`（36px），用于统一标签栏与侧边栏标题栏高度。
   - 增加现代简洁的滚动条样式。
3. 扩展 `src/stores/theme.ts`：
   - 拆分为 `mode: 'light' | 'dark'` 和 `accent: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate'`。
   - 在 `<html>` 上同时设置 `dark` class 与 `theme-{accent}` class。
   - localStorage 保存两者。
4. 在 `index.css` 中定义 `.theme-indigo`、`.theme-emerald`、`.theme-rose`、`.theme-amber`、`.theme-slate`，覆盖 `--primary`、`--ring`、`--primary-foreground` 等变量。

### Phase B：编辑器样式

1. 在 `main.ts` 中导入 `autodown-editor.css`（在 `index.css` 之后，确保变量已定义）。
2. 调整 `EditorTab.vue` 的样式：
   - 移除对 `.autodown-editor` 的 border-radius/border 覆盖，让 editor chrome 自身负责。
   - 让 editor 内容区与预览区共用一致的 padding 与背景。
   - 预览区 `.streaming-document` 增加与编辑器一致的字号、行高、标题间距。

### Phase C：应用 shell 重设计

1. **AppShell.vue**
   - 给整个外壳加细微的 background/foreground，确保高度 `100%` 无滚动。
2. **Ribbon.vue**
   - 宽度改为 `44px`，图标尺寸 `18px`。
   - 当前激活项使用左侧 3px primary 色条指示，而非整背景变色。
   - 底部增加“主题/外观”按钮（Palette 图标），用于打开主题面板。
3. **LeftSidebar.vue / FileTree.vue / FileTreeNode.vue**
   - 标题栏统一高度 `var(--header-height)`，和中间标签栏对齐。
   - 标题栏文字使用小字号大写 + 字母间距，右侧图标按钮统一尺寸。
   - 文件树项高度 `28px`，hover 使用 subtle background，active 使用 `primary/10` 背景 + `primary` 文字。
   - 文件夹/文件图标统一颜色逻辑。
4. **MainArea.vue**
   - 标签栏高度改为 `var(--header-height)`。
   - Tab 样式改为胶囊状：active 使用 `bg-primary/10 text-primary` 背景，关闭按钮常驻显示（active 时）或 hover 显示。
   - 空状态居中显示更友好的提示。
5. **RightSidebar.vue / 各 Panel**
   - 使用 `gap-3`、`p-3`。
   - 每个面板使用 card 样式：圆角、细边框、内部 padding，section header 使用小字号大写、 muted 色。
   - 链接列表 hover 使用 `bg-accent`，dangling 链接用 `text-destructive`。
6. **StatusBar.vue**
   - 高度 `24px`，文字 `11px`，使用更 muted 的颜色。
   - 左侧工作区名称，右侧状态信息用 `·` 或竖线分隔，避免过多 label。
7. **WorkspaceOpener.vue**
   - 使用 card 容器，更大的圆角与阴影。
   - Logo 使用 primary 色而非 emerald。
   - 输入框、按钮使用统一 design token。

### Phase D：主题切换 UI

1. 新增 `src/components/ThemePopover.vue`：
   - 小型弹出面板，包含：
     - Light / Dark 切换按钮组（带 Sun/Moon 图标）。
     - 颜色预设选择（5 个色块）。
2. 在 `Ribbon.vue` 底部添加 `Palette` 按钮，点击弹出 `ThemePopover`。
3. 移除 Ribbon 上原来的 Sun/Moon 按钮（功能并入主题面板）。

### Phase E：验证

1. `pnpm build` 通过。
2. 重启前端 dev server。
3. 在浏览器中验证：
   - 打开文档不再报错。
   - 多个 tab 切换/关闭正常。
   - 左/中 header 高度对齐。
   - 主题基色切换、light/dark 切换生效。

## 预期改动文件

- `jade-garden/front/src/assets/index.css`
- `jade-garden/front/src/assets/autodown-editor.css`（新增，复制自 auto-forge）
- `jade-garden/front/src/main.ts`
- `jade-garden/front/src/stores/theme.ts`
- `jade-garden/front/src/components/Ribbon.vue`
- `jade-garden/front/src/components/ThemePopover.vue`（新增）
- `jade-garden/front/src/components/LeftSidebar.vue`
- `jade-garden/front/src/components/FileTree.vue`
- `jade-garden/front/src/components/FileTreeNode.vue`
- `jade-garden/front/src/components/MainArea.vue`
- `jade-garden/front/src/components/RightSidebar.vue`
- `jade-garden/front/src/components/StatusBar.vue`
- `jade-garden/front/src/components/WorkspaceOpener.vue`
- `jade-garden/front/src/components/EditorTab.vue`

## 可选决策

- **颜色预设数量**：默认提供 indigo（auto-forge 靛蓝）、emerald、rose、amber、slate 五种。如用户有偏好颜色，可在实现中增减。
- **编辑器 chrome 边框**：`auto-forge` 的 `autodown-editor.css` 给编辑器加了 1px 边框和圆角。Jade Garden 的编辑器嵌在左右分栏内，我会把外层 border 去掉（或改为仅内部分栏线），保留内部排版、菜单、表格等样式。
