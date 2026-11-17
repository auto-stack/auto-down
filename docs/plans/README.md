# AutoDown 当前实施计划

> 2026-11-14：依据 [Design 10](../designs/10-autodown-publishing.md) 建立文档排版路线。082 已交付为可运行原型（归档于 [archived/082-auto-template-typst-prototype.md](archived/082-auto-template-typst-prototype.md)）。
> 2026-11-17：083 已交付——结构化样式（五层逐属性合成/子树作用域/选择器/呈现规则/inspect_style），publication-ir-v1（归档于 [archived/083-document-style-render-rules.md](archived/083-document-style-render-rules.md)）；084–086 仍为 drafting。

## 计划与依赖

| 计划 | 范围 | 硬依赖 | 对应原型阶段 |
| --- | --- | --- | --- |
| [082 普通 Auto 模板与 Typst 原型](archived/082-auto-template-typst-prototype.md)（已交付） | Auto 实际求值、内容/出版 IR、两种 PDF、可复现运行入口 | 无新计划；依赖现有工具与解析器 | P0 + P1 |
| [083 文档样式与呈现规则](archived/083-document-style-render-rules.md)（已交付） | 结构化样式、作用域、选择器、自定义呈现、来源检查 | 082（已满足） | 已交付 2026-11-17；样式系统/呈现规则/inspect 为 084–086 基础 |
| [084 多形态模板与文档语义](084-publication-templates-semantics.md) | 五类输出、编号、引用、脚注、公式/资源边界 | 082、083 | P1b 与专业文档基础 |
| [085 实时分页预览与定位](085-live-pagination-preview-source-map.md) | revision、更新调度、预览/导出一致、双向定位 | 082、083 | P2 |
| [086 延迟布局与上下文表达](086-deferred-layout-context.md) | 普通 Auto 回调支持集、测量、查询、计数器与能力诊断 | 083、084 | P3 布局部分 |

084 与 085 在共享合同明确后可以独立实施；此处“独立”描述任务依赖，不要求并行 agent。086 不以 085 为硬前置，可先通过命令行验证；两者完成后再做交互集成核验。

推荐顺序：**082 已交付 → 原型评估** → 083 → 084/085 → 086。082 的实际输出若不理想，可先修改设计、API 和后续计划，不机械推进整条路线。

## 编号与状态

- 本仓归档计划最高为 082（082 已交付归档）；本次分配 082–086，检查当前计划文件和已登记 worktree 的计划目录后未发现冲突。
- 当前无计划分配脚本，新增 `.next-id` 记为 87，表示下一个候选编号。取号时必须复核当前/归档文件与在途任务，不能覆盖同名计划。
- 082–086 是 auto-down 的本地计划编号，不等同于其他仓的同号计划。
- `drafting` 不是已实现、已验证或已合入；082 已按该纪律在隔离工作树执行、复审并归档（见其 §7/§9），其余计划执行时同样处理。
- 继续使用文档维护计划与规范；历史 `.autoos/specs.json` 只读，不为本路线恢复手写账本或缓存索引。

## 跨仓边界

auto-down 负责文档模型、模板库、出版适配和验证入口；AutoLang/ACE 的语法或求值扩展、AutoUI 的公共 Style/控件/工具接口，由最小反例交给对应仓建立任务。现阶段不预分配其他仓的计划号。

书籍 card、段落 ID 与 reader 消费遵循其独立格式合同；082 使用当前可解析的正文子集，不依赖它们才能运行。084 接入实际书籍材料时，先核对格式规范和现有改动，复用已有实现。

