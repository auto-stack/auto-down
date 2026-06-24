# AutoDown Wiki 愿景

> 一个面向 AI 时代的、类 Obsidian 的 AutoDown 知识库编辑器与阅读器。

## 1. 为什么要做 AutoDown Wiki

Obsidian 把“本地文件 + Markdown + 双向链接”的组合推向了大众，但它建立在传统 Markdown 之上：

- 没有稳定的 block 级地址，引用只能到标题或整篇文档；
- 无法原生表达 AutoDown 里越来越重要的结构化 block（callout、details、math、mermaid、code block 标题栏等）；
- 对 LLM 不够友好：LLM 生成的是松散文本，人类后期整理成本高。

AutoDown 已经解决了“结构化编辑 + 双栏同步预览”的问题。下一步需要把这套能力扩展到**知识库**场景：

- 以 `.ad` 文件为中心，本地存储；
- 编辑器/阅读器一体化，像 Obsidian 一样开箱即用；
- 每段内容都有 block ID，支持精确引用和 AI 生成；
- 与 `auto-ai` 生态集成，让 LLM 成为知识库的“维护者”而非一次性回答器。

## 2. 核心定位

| 维度 | 选择 |
|------|------|
| 存储 | 本地文件系统优先，`wiki/` 目录即知识库 |
| 格式 | `.ad`（AutoDown 专用格式），不保证与 Obsidian 长期兼容 |
| 编辑 | 内嵌 `@autodown/editor`，支持 block 级编辑 |
| 阅读 | 内嵌 `@autodown/vue` 渲染器，支持滚动同步 |
| LLM | 通过 `auto-ai-client` 调用 `auto-ai-daemon`，不直连 LLM API |
| 索引 | 向量 + 图混合索引，先调研后实现 |
| 角色 | 人类负责策展（curate），LLM 负责维护（maintain） |

## 3. 与 LLM Wiki 三大流程的关系

```
raw/        →  stage/       →  wiki/         →  index/
原始资料      →  AI 可读的    →  结构化知识     →  可检索/可导航
              Markdown       (.ad 文档)
```

AutoDown Wiki 编辑器/阅读器是这三个流程的**终点和起点**：

- **终点**：人类在这里阅读、审阅 LLM 生成的 `.ad` 文档；
- **起点**：人类手动新建或修改 `.ad` 文档，触发 LLM 重新索引、补全链接、更新图索引。

## 4. 类 Obsidian 的功能范围

第一阶段至少包含：

1. **文件树**：浏览 `wiki/` 目录，新建/重命名/删除 `.ad` 文件；
2. **标签/文件夹视图**：按 YAML frontmatter 的 `tags` 或目录组织；
3. **双栏编辑器**：左侧 `@autodown/editor`，右侧 `@autodown/vue` 渲染；
4. **内部链接**：`[[Topic]]` 打开文档，`[[Topic#block-3]]` 跳转到 block；
5. **反向链接**：显示哪些文档/哪些 block 引用了当前文档；
6. **搜索**：基于文件名的快速搜索 + 未来基于向量索引的语义搜索；
7. **图视图**：文档/实体关系图（依赖索引层实现）。

## 5. 设计原则

- **本地优先**：没有网络也能读和写；LLM 调用走本地 `aaid`。
- **文本优先**：`.ad` 文件是人类可读的，Git 友好，方便 diff。
- **block 是一切的基础**：block ID 让引用、搜索、索引、LLM 生成全部对齐到同一把尺子。
- **渐进增强**：先做一个好用的编辑器，再叠加 AI 和索引能力。
