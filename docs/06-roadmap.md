# AutoDown Wiki 实施路线图

本路线图从“设计文档”走向“可运行的类 Obsidian 编辑器”，再逐步叠加 AI 和索引能力。

## Phase 0：设计与共识（当前）

- [x] 明确愿景：类 Obsidian 的 AutoDown 知识库编辑器
- [x] 确定 `.ad` 文件格式
- [x] 确定后端为 Rust + `auto-ai` 客户端
- [x] 梳理架构和索引调研
- [ ] 确认索引具体技术栈（LanceDB / petgraph / Neo4j 等）
- [ ] 确认 block ID 持久化方案

交付物：

- `docs/01-vision.md`
- `docs/02-ad-format.md`
- `docs/03-architecture.md`
- `docs/04-auto-ai-integration.md`
- `docs/05-indexing-research.md`

## Phase 1：.ad 格式与解析器

目标：让 AutoDown 编辑器能够读写 `.ad` 文件。

- [ ] 定义 `.ad` 文件的 canonical AST（基于 ProseMirror JSON）
- [ ] 实现 parser：`text(.ad)` → ProseMirror JSON
- [ ] 实现 serializer：ProseMirror JSON → `.ad` text
- [ ] 处理 YAML frontmatter 的解析与保留
- [ ] 处理 `[[WikiLink]]` 和 `[[Title#block-id]]`
- [ ] 单元测试：roundtrip（解析后再序列化，结果一致）

交付物：

- `@autodown/core` 中的 `.ad` parser/serializer
- 测试用例覆盖常见 block

## Phase 2：类 Obsidian 编辑器 MVP

目标：一个能打开目录、编辑 `.ad`、预览 `.ad` 的最小可用工具。

- [ ] 新建 package/app：`apps/wiki` 或 `auto-down-wiki`
- [ ] Rust 后端骨架：axum + 文件读取
- [ ] Vue 前端骨架：文件树 + 编辑器 + 预览
- [ ] 集成 `@autodown/editor` 和 `@autodown/vue`
- [ ] 文件树：新建/重命名/删除 `.ad`
- [ ] 路由：点击文件树打开对应文档
- [ ] 保存：编辑器内容 → `.ad` 文件
- [ ] 内部链接：点击 `[[Topic]]` 打开对应文档

交付物：

- 可本地运行的 AutoDown Wiki 桌面/Web 应用
- 支持基础阅读和编辑

## Phase 3：auto-ai 集成与导入管道

目标：让 Wiki 能通过 LLM 自动把原始资料转成 `.ad`。

- [ ] Rust 后端链接 `auto-ai-client` + `auto-ai-agent`
- [ ] 实现 `skills/ingest-markitdown`
- [ ] 实现 `skills/convert-to-autodown`
- [ ] 文件监听器：`raw/` 变更触发 ingest
- [ ] 转换结果写入 `wiki/` 并更新 `log.ad`
- [ ] 前端显示处理进度/结果

交付物：

- 拖拽 PDF 到 `raw/`，自动生成对应的 `.ad` wiki 页

## Phase 4：向量索引与搜索

目标：用户可以通过语义搜索定位到具体 block。

- [ ] 选定 embedding 方案（本地模型或 `aaid` embedding 接口）
- [ ] block 级向量索引（LanceDB 或等价方案）
- [ ] 保存/更新 `.ad` 时增量更新索引
- [ ] 前端搜索面板：输入问题，返回 block 级结果
- [ ] 点击结果跳转到对应文档和 block

交付物：

- 语义搜索功能

## Phase 5：图索引与知识导航

目标：通过图结构发现关系和缺口。

- [ ] 实体抽取（LLM 或 NER）
- [ ] 图索引（petgraph / NetworkX / Neo4j）
- [ ] 反向链接面板：谁引用了当前文档/block
- [ ] 图视图：文档/实体关系可视化
- [ ] 相关推荐：基于图邻近度的“你可能还想看”

交付物：

- 图视图 + 相关推荐

## Phase 6：高级功能

- [ ] MCP Server：让 Claude Code / Codex 能读写 Wiki
- [ ] Chrome/Web 剪藏：网页一键导入 raw/
- [ ] 版本对比与 diff 视图
- [ ] 多人协作（可选）：Git 同步 + 冲突解决
- [ ] 移动端阅读器

## 近期下一步建议

1. **确认 `.ad` parser/serializer 放在哪里**：
   - 选项 A：在 `@autodown/core` 里扩展；
   - 选项 B：在 Rust 后端里实现，前端只接收 ProseMirror JSON。
2. **确认工作区目录结构**：是否每个 Wiki 一个 `.autodown/` 目录。
3. **确认是否立即启动 `apps/wiki` 工程**：如果是，需要先决定用 Tauri（桌面）还是纯 Web。
