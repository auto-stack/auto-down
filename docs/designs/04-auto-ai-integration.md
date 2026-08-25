# AutoDown Wiki 与 auto-ai 的集成

AutoDown Wiki 不是独立调用 LLM，而是作为 `auto-ai` 生态的客户端应用存在。本文说明集成的具体方式，以及知识库三大流程中哪些步骤需要 LLM、对应哪些 Skill 或 Agent。

## 1. 集成层次

```
┌────────────────────────────────────┐
│        AutoDown Wiki 应用          │
│  ┌─────────────┐  ┌──────────────┐ │
│  │   Skill     │  │   Agent /    │ │
│  │   定义      │  │   Workflow   │ │
│  │  (SKILL.md) │  │   编排       │ │
│  └──────┬──────┘  └──────┬───────┘ │
│         │                │         │
│  ┌──────┴────────────────┴───────┐ │
│  │        auto-ai-agent           │ │
│  │   Profession / ReAct / Workflow│ │
│  └─────────────┬─────────────────┘ │
│                │                   │
│  ┌─────────────┴─────────────────┐ │
│  │        auto-ai-client         │ │
│  │   发送 canonical CompletionRequest │
│  └─────────────┬─────────────────┘ │
└────────────────┼────────────────────┘
                 │ HTTP
┌────────────────┴────────────────────┐
│        auto-ai-daemon (aaid)        │
│   并发控制 / 密钥管理 / 模型路由      │
└─────────────────────────────────────┘
```

Wiki 后端只用到 `auto-ai-agent` 和 `auto-ai-client`；
`aaid` 作为系统 daemon 单独运行，所有应用共享。

## 2. 哪些步骤需要 LLM

| 大步骤 | 子步骤 | 是否用 LLM | 说明 |
|--------|--------|-----------|------|
| raw → stage | 格式转换（PDF/Word → Markdown） | 否 | 用 markitdown / MinerU 等工具 |
| raw → stage | 图片 OCR / 图表描述 | 可选 | 可用 vision LLM，走 aaid |
| stage → wiki | 提取实体与结构 | 是 | 阶段 A |
| stage → wiki | 生成 `.ad` 正文 | 是 | 阶段 B |
| stage → wiki | 生成 frontmatter | 是 | 阶段 B |
| stage → wiki | 发现/补全内部链接 | 是 | 阶段 C |
| wiki → index | 生成 block 级 embedding | 否 | 调用 embedding API（可能也走 aaid） |
| wiki → index | 抽取实体关系 | 是 | 图索引输入 |
| 维护 | 根据新资料更新旧页 | 是 | 增量更新 |
| 维护 | lint / 悬空链接修复 | 是/否 | 规则 + LLM 辅助 |

## 3. Skill 设计

参考 `auto-musk` 的约定，每个 Skill 是一个目录，包含 `SKILL.md` 和相关工具实现。

### 3.1 `skills/ingest-markitdown`

负责 raw → stage。其实主要是本地工具调用，Skill 用于描述参数和输出格式。

```markdown
---
name: ingest-markitdown
description: 调用 markitdown 把 raw/ 中的文件转换为 Markdown 并写入 stage/
inputs:
  - file_path: string
outputs:
  - markdown: string
  - metadata: object
---
```

### 3.2 `skills/convert-to-autodown`

负责 stage → wiki，是最核心的 LLM Skill。

```markdown
---
name: convert-to-autodown
description: 把中间 Markdown 转换为结构化的 .ad AutoDown 文档
inputs:
  - markdown: string
  - existing_pages: string[]    # 已有 wiki 页面标题，用于链接推荐
  - schema: string              # wiki 风格与 block 规范
outputs:
  - frontmatter: object
  - body: string                # AutoDown body
  - entity_refs: string[]
  - suggested_links: string[]
---
```

运行时会经历内部两阶段：

1. **阶段 A**：提取标题、实体、结构、关键问答；
2. **阶段 B**：生成符合 `.ad` 格式的正文 + frontmatter。

### 3.3 `skills/enrich-links`

在已有 `.ad` 文档之间发现链接机会，补全 `[[...]]`。

```markdown
---
name: enrich-links
description: 分析 wiki 中所有 .ad 文档，发现同义/相关概念并建议双向链接
inputs:
  - pages: { title, summary, entity_refs }[]
outputs:
  - link_suggestions: { from, to, context }[]
---
```

### 3.4 `skills/update-wiki`

当 raw 更新时，决定是新建页面还是合并到已有页面。

```markdown
---
name: update-wiki
description: 根据新增或变更的源资料，增量更新 wiki 页面
inputs:
  - new_source_markdown: string
  - existing_pages_summaries: { title, summary }[]
outputs:
  - action: "create" | "update" | "skip"
  - target_page: string
  - diff_summary: string
---
```

## 4. Agent / Workflow 编排

对于单一文件的转换，直接调用 Skill 即可；
对于“导入整个文件夹”或“夜间自动维护”，需要一个 Workflow：

```
workflow ingest-folder:
  1. 枚举 raw/ 中未处理文件
  2. 并行调用 ingest-markitdown → stage/
  3. 对每个 stage 文件调用 convert-to-autodown
  4. 汇总所有新生成/更新的 .ad
  5. 调用 enrich-links 补全链接
  6. 写入 wiki/ 并更新 log.ad
  7. 触发 indexer 重建/增量更新
```

这类编排可以复用 `auto-ai-agent` 的 Workflow 引擎，也可以在后端自己用 `tokio` 写状态机。

## 5. Prompt 工程要点

为了让 LLM 稳定输出 `.ad`，需要在 Skill 的 system prompt 里固化：

1. **格式规范**：明确 `.ad` 文件由 frontmatter + body 组成；
2. **可用 block**：列出当前 AutoDown 支持的 block 类型和语法；
3. **ID 策略**：明确 LLM 不需要写 block ID，ID 由解析器自动注入；
4. **链接策略**：说明 `[[Title]]` 和 `[[Title#block-id]]` 的用法，但 `#block-id` 通常在 enrich-links 阶段由系统补全；
5. **示例**：提供 1-2 个高质量的输入/输出示例（few-shot）。

## 6. 与现有 @autodown/editor 的关系

编辑器当前输出 ProseMirror JSON，保存时序列化为 `.ad`。
未来可以：

- 在编辑器里一键调用 `convert-to-autodown` Skill，把当前打开的 Markdown/stage 内容转成结构化 `.ad`；
- 在编辑器里高亮悬空链接，提供“让 LLM 补全链接”的按钮；
- 把 LLM 生成的 diff 以“建议”形式展示在编辑器中，人工确认后应用。

## 7. 安全和成本

- 所有 LLM 调用经过 `aaid`，天然有并发限制和用量统计；
- 对于大规模批量导入，应在后端做队列和限流，避免一次性触发大量请求；
- 用户的原始文件和生成的 `.ad` 都保留在本地，敏感资料不会上传到外部服务（除非 LLM API 本身需要）。
