# AutoDown Wiki 索引层调研

索引层的目标是让知识库“找得到”也“理得清”。本文对比向量索引与图索引，列出候选方案，并给出 AutoDown Wiki 场景下的推荐思路。

## 1. 索引需求

| 需求 | 说明 |
|------|------|
| block 级语义搜索 | 用户问“Dynamo 如何实现最终一致性？”，应定位到具体 block |
| 全文检索 | 精确匹配术语、代码片段、人名 |
| 关系导航 | 从“一致性哈希”跳到相关概念、相关文档 |
| 来源追溯 | 从 wiki block 回到 raw / stage 文件 |
| 增量更新 | 单个 .ad 文件修改后，只更新受影响索引 |
| 本地优先 | MVP 阶段尽量零配置、零外部依赖 |

## 2. 向量索引

### 2.1 作用
把每个 block 的文本映射为 embedding，用户提问时做相似度检索。

### 2.2 粒度
- **文档级**：一篇 .ad 一个向量。太粗，无法定位到具体 block。
- **block 级**：每个顶层 block 一个向量。和 AutoDown 的 block ID 对齐，检索结果可直接跳转。
- **chunk 级**：对长 block 再拆分。更细，但可能破坏结构。

**推荐 block 级**，因为 AutoDown 的 block 天然是语义单元。

### 2.3 候选方案

| 方案 | 优点 | 缺点 | 适用阶段 |
|------|------|------|----------|
| **LanceDB** | 本地文件、零配置、支持 embedding 和全文搜索 | 超大规模性能待验证 | MVP / 个人 Wiki |
| **Chroma** | Python 生态成熟、易用 | 需要 Python 运行时、TS 绑定较弱 | 后端用 Python 时 |
| **pgvector** | 成熟、可扩展 | 需要 PostgreSQL | 团队/多用户 |
| **Qdrant** | 高性能、本地/云端皆可 | 额外服务 | 生产 |

Rust 后端推荐 **LanceDB**（有 Rust 绑定）作为 MVP 首选，后续可迁移到 Qdrant/pgvector。

### 2.4 元数据设计

每个向量记录：

```json
{
  "id": "doc-id::block-id",
  "text": "block 纯文本",
  "doc_path": "wiki/Distributed_Systems.ad",
  "block_id": "block-7",
  "heading_path": ["分布式系统", "Dynamo", "最终一致性"],
  "tags": ["dynamo", "consistency"],
  "source_hash": "a1b2c3d4"
}
```

## 3. 图索引

### 3.1 作用
表达“概念—文档—block—来源”之间的显式关系，支持：

- 相关推荐：和当前 block 共享实体的其他 block；
- 知识缺口：某实体在图里孤立，提示需要补充；
- 来源追溯：entity / block / doc / source 之间的链路。

### 3.2 节点与边

**节点类型：**

- `Document`：一篇 `.ad` 文件
- `Block`：具体 block（由 doc + block_id 唯一标识）
- `Entity`：从 block 中抽取的实体/概念
- `Source`：原始文件（raw/ 中的文件）
- `Tag`：标签

**边类型：**

- `Document --contains--> Block`
- `Block --mentions--> Entity`
- `Block --derived_from--> Source`
- `Document --links_to--> Document`
- `Block --links_to--> Block`
- `Document --tagged_with--> Tag`

### 3.3 候选方案

| 方案 | 优点 | 缺点 | 适用阶段 |
|------|------|------|----------|
| **NetworkX + JSON 文件** | 零依赖、易调试 | 内存限制、无并发 | MVP / 个人 |
| **Neo4j** | 成熟、Cypher 强大 | 需要单独服务 | 团队/大规模 |
| **Memgraph** | 兼容 Cypher、性能高 | 需要单独服务 | 生产 |
| **RDF / Oxigraph** | 语义网标准 | 学习曲线陡峭 | 需要语义推理时 |
| **graphify** | 专门为代码/文档建图 | 需确认本地仓库状态 | 参考实现 |

**推荐**：MVP 先用 NetworkX 或 Rust 原生图库（如 `petgraph`）维护内存/JSON 图，等规模上来再切 Neo4j。

### 3.4 参考 graphify

graphify 的核心思路值得借鉴：

- 把文档/代码解析成 AST；
- 从 AST 抽取节点（函数、类、概念）和边（调用、引用、包含）；
- 用图数据库或内存图存储；
- 提供查询 API 和可视化。

对于 AutoDown Wiki，可以把 `.ad` 的 ProseMirror JSON 当作 AST：

- heading block → 实体候选；
- internal link → `links_to` 边；
- source frontmatter → `derived_from` 边。

## 4. 混合查询策略

```
用户提问 Q
    ↓
[1] 向量检索 Top-K blocks
    ↓
[2] 对 Top-K blocks 做图扩展
    - 找到这些 block 提到的 Entity
    - 找到 Entity 关联的其他 block（1-2 跳）
    ↓
[3] 按与 Q 的语义相似度 + 图中心性 rerank
    ↓
[4] 返回 { doc, block_id, score, related_entities }
```

这种方式兼顾了“语义相关”和“结构相关”。

## 5. 增量更新策略

当一篇 `.ad` 文件保存时：

1. 解析出新旧 block 集合；
2. 删除已不存在的 block 向量/图节点；
3. 为新增/修改的 block 生成向量；
4. 重新抽取实体和边，更新图；
5. 如果文件名或 frontmatter 变了，更新文档级节点。

## 6. 待调研问题

1. **LanceDB 在 Rust 后端中的实际体验**（API 稳定性、嵌入模型集成）。
2. **embedding 模型选型**：本地（BGE / nomic-embed-text）还是也走 `aaid` 的 embedding 接口？
3. **实体抽取质量**：用 LLM 抽取（准但慢/贵）还是用 NER 模型（快但粗）？
4. **graphify 是否能作为依赖**：确认仓库位置、协议、语言栈。
5. **图可视化方案**：Cytoscape.js / D3 / React Flow，哪个和 Vue3 整合最顺？
