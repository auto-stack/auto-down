# Jade Garden 关系图谱模块计划

## 现状分析

Jade Garden 已经具备 wiki 链接的基础设施：

- 后端在 `state.rs` 中维护了 `LinkIndex`，包含 `title_to_path`、`outlinks`、`backlinks`。
- 写入 `.ad` 文件后会自动 `rebuild_index`。
- 已有 API：
  - `GET /api/backlinks/{title}`
  - `GET /api/outlinks/{title}`
- 前端已有基于文件树和 tab 的页面打开能力。

目前缺少：
- 全局/局部关系图谱的可视化入口。
- 一次性返回整个图结构（nodes + edges）的 API。
- 图渲染引擎与交互组件。

## 目标

实现一个类似 Obsidian / Logseq 的关系图谱：

1. **全局图谱**：以所有 `.ad` 页面为节点，wiki 链接为边，力导向布局展示整个知识库结构。
2. **局部图谱**：以当前活动页面为中心，展示 1 度（后续可扩展为 N 度）邻居。
3. **右侧控制面板**（参考 `graph-obsidian.png`）：
   - 搜索高亮节点
   - 筛选：隐藏孤立文件、仅显示已创建页面等
   - 外观：节点大小、文本透明度、连线粗细、箭头开关
   - 力度：向心力、节点排斥力、连线吸引力、连线长度
4. **节点交互**：
   - 点击节点打开对应页面（新 tab）
   - hover 显示页面标题/路径
   - 拖拽调整位置
   - 缩放/平移
5. **主题适配**：跟随 Jade Garden 的 light/dark 模式及主题色。

## 参考

### Obsidian（截图 `C:\Users\zhaop\Pictures\PixPin\graph-obsidian.png`）

- 顶部 tab 标题为“关系图谱”。
- 主区域为力导向图，节点为圆点+文件名标签，连线为细直线。
- 右侧控制面板分组：
  - **筛选**：搜索框、标签、附件、“仅显示已创建的笔记”、孤立文件开关。
  - **颜色组**：可新建颜色组，按规则给节点上色。
  - **外观**：箭头、文本透明度、节点大小、连线粗细、播放动画按钮。
  - **力度**：图谱向心力、节点间排斥力、相连节点间吸引力、连线长度。

### Logseq（本地仓库 `D:\github\logseq`）

- 核心文件：
  - `src/main/frontend/components/graph.cljs`
  - `src/main/frontend/extensions/graph.cljs`
  - `src/main/frontend/extensions/graph/pixi.cljs`
  - `src/main/frontend/common/graph_view.cljs`
- 渲染：Pixi.js + d3-force。
- 数据：`build-graph` 在 web worker 中从 Datascript 生成 `{nodes, links}`。
- 节点类型：page / tag / property / journal / object。
- 交互：hover 放大、单击选中邻居、双击打开、Shift+Click 侧边栏预览、拖拽带动邻居。
- 设置持久化：`localStorage` 保存 `logseq.graph.settings.<repo>`。

## 技术选型

Jade Garden 当前是 Vue 3 + Vite，为了快速出可用版本，优先选择 **Cytoscape.js + cytoscape-fcose**：

- 内置缩放、平移、点击、拖拽、选择。
- `cytoscape-fcose` 提供高性能力导向布局。
- 对中等规模图（数千节点）足够。
- Vue 集成简单，不需要自己管理 canvas/WebGL。

未来如果图规模上万，可以再评估迁移到 Pixi.js + d3-force（参考 Logseq）或 Sigma.js。

## 数据模型

### 后端 API

新增 `GET /api/graph`：

```json
{
  "nodes": [
    {
      "id": "CAP 定理.ad",
      "label": "CAP 定理",
      "path": "wiki/CAP 定理.ad",
      "exists": true,
      "degree": 5
    }
  ],
  "edges": [
    {
      "source": "CAP 定理.ad",
      "target": "Hello World.ad",
      "blockId": null
    }
  ]
}
```

- `id` 使用文件相对路径，保证唯一性。
- `exists`：目标文件是否存在（用于区分 dangling link）。
- `degree`：节点的连接数，用于动态调整节点大小。
- 边去重：同一对页面之间只保留一条边。

### 前端状态

新增 `useGraphStore`：

- `nodes`、`edges`、加载状态。
- `load()` 调用 `/api/graph`。
- `settings`：持久化到 `localStorage` 的图谱外观/力度设置。

## 实施步骤

### Phase A：后端图谱 API

1. 在 `jade-garden/back/server/src/links.rs` 中新增 `get_graph`：
   - 从 `state.read_index` 读取 `title_to_path` 和 `outlinks`。
   - 构造 nodes 和 edges。
   - 计算每个节点的 `degree`。
2. 在 `jade-garden/back/server/src/main.rs` 注册路由：
   - `GET /api/graph`。
3. 启动后端，用 curl/browser 验证 `/api/graph` 返回正确结构。

### Phase B：前端依赖与数据层

1. 在 `jade-garden/front` 安装依赖：
   - `cytoscape`
   - `cytoscape-fcose`
   - `@types/cytoscape`（dev）
2. `jade-garden/front/src/lib/api.ts` 新增 `getGraph(): Promise<GraphData>`。
3. 新建 `jade-garden/front/src/stores/graph.ts`：
   - `nodes`、`edges`、`loading`、`error`。
   - `load()` 调用 API。
   - `settings` 读取/保存 localStorage。

### Phase C：图谱渲染组件

1. 新建 `jade-garden/front/src/components/GraphView.vue`：
   - 初始化 Cytoscape 实例。
   - 注册 `cytoscape-fcose` layout。
   - 根据当前主题（light/dark）设置节点/边/背景样式。
   - 节点大小根据 `degree` 映射。
   - 监听数据变化，重新布局。
2. 处理交互：
   - `tap` 节点 → 调用 `tabs.open(path)`。
   - `tapstart` / `drag` → 暂停布局或固定节点。
   - 滚轮缩放、拖拽平移（Cytoscape 默认支持）。
3. 加载/空状态提示。

### Phase D：控制面板

1. 新建 `jade-garden/front/src/components/GraphControls.vue`：
   - 搜索框：高亮匹配节点，未匹配节点降低透明度。
   - 筛选：
     - 显示/隐藏孤立文件
     - 仅显示已创建页面（过滤 `exists=false`）
   - 外观：
     - 节点大小 slider
     - 文本透明度 slider
     - 连线粗细 slider
     - 箭头开关
     - 重新布局/播放动画按钮
   - 力度：
     - 向心力 slider
     - 节点排斥力 slider
     - 连线吸引力 slider
     - 连线长度 slider
2. 设置变更后：
   - 立即影响样式（节点大小、透明度等）。
   - 力度参数变化后重新运行 `fcose` 布局。
   - 保存到 `useGraphStore.settings`。

### Phase E：集成到应用 Shell

1. 在 `Ribbon.vue` 增加“关系图谱”按钮（例如 `Network` 图标）。
2. 点击后切换主区域为图谱视图：
   - 方案 A（推荐）：在 `MainArea.vue` 中增加 `viewMode` 状态，`editor` | `graph`。
   - 方案 B：新增独立路由 `/graph`。
   采用方案 A，保持当前 tab 体系不被破坏，且可以在任意时刻回到编辑器。
3. 在图谱视图下，顶部 tab 栏仍然显示已打开的文件 tab，方便切换回编辑。
4. 从文件树或 tab 切回编辑器时，`viewMode` 恢复为 `editor`。

### Phase F：局部图谱（可选但推荐包含在 MVP）

1. `GraphView.vue` 支持 `centerPath` prop。
2. 当 `centerPath` 存在时，只加载/显示该中心节点 1 度范围内的节点和边。
3. 在 `MainArea.vue` 的 tab 右键菜单或 tab 附近增加“查看局部图谱”入口。
4. 也可在 RightSidebar 增加一个“局部图谱”小面板（后续扩展）。

### Phase G：验证

1. `cd jade-garden/front && pnpm build` 通过。
2. `cd jade-garden/back/server && cargo test` 通过。
3. 手动验证：
   - 打开“关系图谱”能看到所有页面节点和连线。
   - 点击节点打开对应 tab。
   - 调整右侧 slider 后样式/布局实时变化。
   - 切换 light/dark 主题后图谱颜色适配。

## 预期改动文件

### 后端
- `jade-garden/back/server/src/links.rs`
- `jade-garden/back/server/src/main.rs`

### 前端
- `jade-garden/front/package.json`
- `jade-garden/front/pnpm-lock.yaml`
- `jade-garden/front/src/lib/api.ts`
- `jade-garden/front/src/stores/graph.ts`（新增）
- `jade-garden/front/src/components/GraphView.vue`（新增）
- `jade-garden/front/src/components/GraphControls.vue`（新增）
- `jade-garden/front/src/components/Ribbon.vue`
- `jade-garden/front/src/components/MainArea.vue`
- `jade-garden/front/src/components/AppShell.vue`（可能需要调整主区域高度/布局）

## 可选决策

1. **渲染引擎**：MVP 用 Cytoscape.js；如果用户明确要求像 Logseq 一样高性能/大规模，可改用 Pixi.js + d3-force，但工作量更大。
2. **布局库**：默认 `cytoscape-fcose`；也可以先用 `cytoscape-cose-bilkent`，但 `fcose` 更快、更适合大图。
3. **颜色组**：Obsidian 支持按路径/标签/查询规则给节点分组上色。MVP 可先只做“已存在/不存在/孤立”三种基础颜色，颜色组作为后续迭代。
4. **局部图谱入口**：可以在 tab 右键菜单加“局部图谱”，也可以在 Ribbon 加一个切换“全局/局部”的按钮。
5. **持久化范围**：控制面板的设置保存到 localStorage；是否按 workspace 隔离取决于后续需求，MVP 可先全局保存。
