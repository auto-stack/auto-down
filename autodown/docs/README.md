# AutoDown Wiki 设计文档

本目录存放 AutoDown 知识库项目的设计与架构文档。

## 文档索引

| 文档 | 主题 |
|------|------|
| [01-vision.md](./01-vision.md) | 项目愿景：类 Obsidian 的 AutoDown 知识库编辑器 |
| [02-ad-format.md](./02-ad-format.md) | `.ad` 文件格式规范 |
| [03-architecture.md](./03-architecture.md) | 系统架构与数据流 |
| [04-auto-ai-integration.md](./04-auto-ai-integration.md) | 与 `auto-ai` 生态的集成方式 |
| [05-indexing-research.md](./05-indexing-research.md) | 向量索引与图索引调研 |
| [06-roadmap.md](./06-roadmap.md) | 分阶段实施路线图 |

## 关键决策

- 文件扩展名：`.ad`（AutoDown 专用格式）
- 编辑器/阅读器：内嵌现有 `@autodown/editor` + `@autodown/vue`
- LLM 调用：通过 `auto-ai-client` → `auto-ai-daemon`，不直连 LLM API
- 索引：向量 + 图混合，具体技术栈待进一步调研
- 存储：本地文件系统优先，`wiki/` 目录即知识库
