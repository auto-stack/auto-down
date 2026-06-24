# AutoDown 文件格式（`.ad`）

AutoDown Wiki 以 `.ad` 为文件扩展名。一个 `.ad` 文件由 **YAML frontmatter** 和 **AutoDown body** 两部分组成，整体可读、可 diff、可被 LLM（借助 Skill）直接生成和修改。

## 1. 文件结构

```ad
---
title: "分布式系统入门"
source:
  - hash: "a1b2c3d4"
    path: "raw/paper.pdf"
    title: "Dynamo: Amazon's Highly Available Key-value Store"
tags: ["distributed-systems", "dynamo", "storage"]
created_at: "2026-06-16"
updated_at: "2026-06-16"
summary: "本文介绍 Amazon Dynamo 的设计取舍，重点说明一致性哈希、向量时钟和最终一致性。"
---

# 分布式系统入门

## 为什么需要 Dynamo

Amazon 的购物车服务需要极高的可用性。Dynamo 的设计目标是在部分故障时仍然可写 [block-1]。

:::callout type="info"
Dynamo 牺牲了强一致性，换取了分区容错性和可用性。
:::

## 核心概念

### 一致性哈希

一致性哈希把节点和数据映射到同一个环上，增删节点时只影响相邻数据 [block-2]。

```python
# 简化示例
ring = sorted([hash(node) for node in nodes])
```

## 参考

- [[CAP 定理]]
- [[一致性哈希#block-0]]
```

## 2. YAML frontmatter

所有元数据放在 frontmatter 中，保持 body 纯净。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 文档标题 |
| `source` | array | 否 | 来源文件列表，每项含 `hash`、`path`、`title` |
| `tags` | array | 否 | 标签，用于组织和过滤 |
| `created_at` | string | 否 | 创建时间（ISO 8601） |
| `updated_at` | string | 否 | 最后更新时间 |
| `summary` | string | 否 | 一句话摘要，LLM 和用户都能快速理解文档主旨 |
| `entity_refs` | array | 否 | 文档中提到的核心实体，供图索引使用 |
| `status` | string | 否 | `draft` / `review` / `published` |

`source` 的设计把 wiki 页和 raw/stage 文件关联起来，方便反向追溯。

## 3. AutoDown body

body 是 Markdown 的超集，关键扩展如下。

### 3.1 Block ID

每个顶层 block 在解析时会被分配一个稳定 ID。人类书写时不需要写 ID，解析器在读取 `.ad` 文件时自动注入；保存回磁盘时，ID 可以选择性输出为 HTML 注释或隐藏属性，保持正文简洁。

> 具体策略待定：
> - 方案 A：ID 不写入 `.ad` 正文，只存于 `.metadata/` 的索引文件中；
> - 方案 B：ID 以 `<!-- block-id:abc-123 -->` 注释形式写在 block 前；
> - 方案 C：ID 内嵌在 block 的属性语法中（例如 `# 标题 {#block-0}`）。
>
> 推荐方案 B 或 C，因为文本本身即可自描述，不依赖外部索引。

### 3.2 内部链接（WikiLinks）

```ad
[[CAP 定理]]                       # 链接到 wiki/CAP 定理.ad
[[CAP 定理#block-3]]               # 链接到具体 block
[[../another-topic]]               # 相对路径（可选）
```

渲染器会把 `[[...]]` 解析为内部路由链接；若目标 block 不存在，显示为“悬空链接”，便于人工补全。

### 3.3 扩展 block

AutoDown 已支持的 block 都可以出现在 body 中：

- heading、paragraph、blockquote、list、taskList、table
- code block（带语言标题栏）
- math / mermaid
- callout、details
- image / video / embed

未来还可以加入：

- `:::question` 问答块
- `:::todo` 待办块
- `:::entity` 实体定义块

## 4. 与 Markdown 的关系

| 能力 | Markdown | `.ad` |
|------|----------|-------|
| 人类可读 | ✅ | ✅ |
| 稳定 block 引用 | ❌ | ✅ |
| 自定义结构化 block | 有限 | ✅ |
| LLM 直接生成 | ✅ | ✅（需要 Skill 说明语法） |
| Obsidian 兼容 | ✅ | 初期部分兼容，长期不保证 |

## 5. 解析与序列化

- `@autodown/core` 负责把 `.ad` 文本解析为 ProseMirror JSON；
- `@autodown/editor` 在内存中编辑 ProseMirror 文档；
- 保存时，序列化器把 ProseMirror JSON 转回 `.ad` 文本，保持 frontmatter 和链接不变。

## 6. 示例：LLM 生成 .ad 的模板

```
请把下面的 Markdown 整理成 AutoDown 格式。

要求：
1. 输出 YAML frontmatter，包含 title、summary、tags、source。
2. 正文使用 Markdown 标题组织，保留代码块。
3. 把关键技术术语抽取到 entity_refs 中。
4. 如果有合适的内部链接，使用 [[术语]] 语法。

输入：
{stage_markdown}
```

Skill 里会固化这套模板，让应用层不需要每次手写 prompt。
