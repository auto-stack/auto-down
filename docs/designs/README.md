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
| [07-jade-garden-mvp-design.md](./07-jade-garden-mvp-design.md) | Jade Garden MVP 设计 |
| [08-logseq-obsidian-feature-research.md](./08-logseq-obsidian-feature-research.md) | Logseq/Obsidian 功能调研与 jade-garden 差距分析 |
| [09-unified-document-engine.md](./09-unified-document-engine.md) | 统一文档引擎：跨平台渲染/编辑一体化架构（Plan 016-020） |

## 关键决策

- 文件扩展名：`.ad`（AutoDown 专用格式）
- 编辑器/阅读器：~~内嵌现有 `@autodown/editor` + `@autodown/vue`~~ → 合并为 `@autodown/engine` 单包多出口（[09](./09-unified-document-engine.md) §3，Plan 017 落地）
- 文档 canonical AST：~~基于 ProseMirror JSON~~（roadmap Phase 1 原决策）→ 统一块模型（[09](./09-unified-document-engine.md) §5，Plan 016 落地）
- LLM 调用：通过 `auto-ai-client` → `auto-ai-daemon`，不直连 LLM API
- 索引：向量 + 图混合，具体技术栈待进一步调研
- 存储：本地文件系统优先，`wiki/` 目录即知识库
- 文档引擎：`@autodown/engine` **1.0.0 契约冻结**（Plan 020 Phase 4，2026-08-28）——四出口 + EDITOR-CONTRACT DOM/事件面 + 命令层 API 冻结；rust/VM 平台面（a2r crate、VM natives）标 experimental 不随 1.0 冻结
- 旧包退役：`@autodown/vue`/`@autodown/editor`/`@autodown/core` 自 Plan 020 起为 deprecated re-export shim（demo/jade-garden 已切 engine；musk 冻结 0.2.0 vendor 快照）；物理归档待 musk vendor 再生路径确认弃用后执行
