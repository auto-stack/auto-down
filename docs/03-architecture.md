# AutoDown Wiki 系统架构

本文描述 AutoDown Wiki 应用的整体组件划分、数据流和与 `auto-ai` 生态的对接方式。

## 1. 总体组件

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AutoDown Wiki 应用                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │ 文件树/标签  │  │   编辑器     │  │   预览/阅读  │  │  搜索   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬────┘ │
│         │                 │                  │                │     │
│         └─────────────────┴──────────────────┴────────────────┘     │
│                                   │                                  │
│                              Vue Frontend                           │
│  - @autodown/editor            - @autodown/vue                     │
│  - 文件树、链接、图视图、搜索 UI                                     │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │ HTTP / WebSocket
┌───────────────────────────────────┴─────────────────────────────────┐
│                            Rust Backend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │ File System  │  │   Ingest     │  │    Index     │  │  Server │ │
│  │   Watcher    │  │   Pipeline   │  │   Service    │  │ (axum)  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬────┘ │
│         │                 │                  │                │     │
│         └─────────────────┴──────────────────┴────────────────┘     │
│                                   │                                  │
│  - 监听 raw/、stage/、wiki/ 变化                                   │
│  - 调用 auto-ai-agent 完成 markdown→autodown                       │
│  - 维护 vector / graph 索引                                        │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │ auto-ai-client (HTTP)
┌───────────────────────────────────┴─────────────────────────────────┐
│                        auto-ai-daemon (aaid)                        │
│           统一 LLM 网关：并发控制、API 密钥、模型路由                │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. 目录约定

一个 AutoDown Wiki 工作区就是磁盘上的一个目录：

```
my-wiki/
├── .autodown/              # 应用元数据（索引、缓存、配置）
│   ├── index/
│   │   ├── vector/         # 向量索引数据
│   │   └── graph/          # 图索引数据
│   └── cache/
├── raw/                    # 原始资料（只读，用户投放）
├── stage/                  # markitdown 等提取出的中间 Markdown
├── wiki/                   # AutoDown 知识库主体（.ad 文件）
│   ├── index.ad            # 目录入口
│   ├── log.ad              # 变更日志（可人工 + LLM 共同维护）
│   └── *.ad
└── skills/                 # 本 Wiki 专用的 auto-ai skills
    ├── ingest/
    ├── convert/
    └── enrich/
```

`.autodown/` 里的数据可以从 `wiki/` 重建，因此不必须 Git 跟踪。

## 3. 核心模块职责

### 3.1 前端（Vue + TypeScript）

| 模块 | 依赖 | 说明 |
|------|------|------|
| `FileTree` | — | 展示 `wiki/` 目录，支持新建/重命名/删除 `.ad` |
| `EditorPane` | `@autodown/editor` | 双栏左侧编辑器 |
| `PreviewPane` | `@autodown/vue` | 双栏右侧渲染器，复用 `useSyncedScroll` |
| `WikiLinkResolver` | `@autodown/core` | 把 `[[Topic#block-id]]` 解析为路由 |
| `SearchPanel` | backend API | 文件名搜索 + 未来语义搜索 |
| `GraphView` | backend API + D3/Cytoscape | 知识关系图 |

### 3.2 后端（Rust）

| 模块 | 依赖 | 说明 |
|------|------|------|
| `fs_watcher` | `notify` / `tokio` | 监听 `raw/`、`stage/`、`wiki/` 变更 |
| `ingest` | `markitdown`（子进程） | raw → stage |
| `converter` | `auto-ai-agent` | stage → `.ad`（LLM 驱动） |
| `indexer` | `serde`、`lancedb` 等 | 维护 vector/graph 索引 |
| `server` | `axum` | 给前端提供 API |
| `ad_parser` | `@autodown/core` 或 Rust 重写 | `.ad` ↔ ProseMirror JSON |

### 3.3 auto-ai 客户端集成

后端不直接调用 OpenAI/Anthropic 等上游 LLM，而是链接 `auto-ai-client`：

1. 构造 `CompletionRequest`（canonical 格式）；
2. 通过 HTTP 发送到 `auto-ai-daemon`；
3. 接收 canonical 响应；
4. 把结果写入 `wiki/` 或更新索引。

对于复杂的多步流程（例如 markdown → autodown），使用 `auto-ai-agent` 的 Profession / Workflow 能力编排。

## 4. 关键数据流

### 4.1 阅读一篇 Wiki

```
用户点击文件树中的 Topic.ad
    → 前端 GET /api/wiki/Topic
    → 后端读取 wiki/Topic.ad
    → ad_parser 解析为 ProseMirror JSON
    → 返回 { frontmatter, doc_json }
    → 编辑器加载 doc_json，渲染器同步显示
```

### 4.2 编辑并保存

```
用户在编辑器中修改
    → 前端 POST /api/wiki/Topic { doc_json }
    → 后端序列化为 .ad 文本
    → 写回 wiki/Topic.ad
    → 触发 indexer 增量更新
    → 返回 ok
```

### 4.3 导入原始资料

```
用户把 paper.pdf 拖入 raw/
    → fs_watcher 检测到新增
    → ingest 模块调用 markitdown paper.pdf
    → 输出 stage/{hash}.md + {hash}.json 元数据
    → converter 模块构造 prompt，调用 auto-ai-agent
    → LLM 生成 wiki/Distributed_Systems.ad（或更新已有页）
    → 写入 wiki/，触发索引更新
    → 前端提示“已生成/已更新”
```

### 4.4 内部链接跳转

```
用户点击 [[CAP 定理#block-3]]
    → WikiLinkResolver 解析目标路径和 block ID
    → 路由到 /wiki/CAP%20定理
    → 加载文档并滚动到 block-3
    → 编辑器/预览器同时定位
```

## 5. 与 `auto-ai` 的关系

AutoDown Wiki 是 `auto-ai` 生态中的一个**客户端应用**，和 `auto-musk` 处于同一层级：

- 后端依赖：`auto-ai-client` + `auto-ai-agent` + `ai-config`；
- 不直接调用任何 LLM API；
- 复杂任务封装为 `skills/`，符合 `auto-musk` 的 Skill 约定（`SKILL.md` + frontmatter）。

这种分层的好处：

- 模型密钥、并发、用量统计全部由 `aaid` 统一处理；
- Wiki 应用本身只关心“知识库业务逻辑”；
- 未来更换模型或接入私有部署，只需改 `aaid` 配置。

## 6. 扩展性考虑

- **多 Wiki 工作区**：每个目录就是一个 workspace，启动时指定路径；
- **MCP Server**：未来可暴露 `read_wiki`、`search_wiki`、`update_wiki` 等工具，让 Claude Code / Codex 直接操作知识库；
- **插件/主题**：渲染器支持自定义 Vue 组件，block 类型可扩展。
