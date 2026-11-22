# AutoDown 当前实施计划

> 2026-11-14：依据 [Design 10](../designs/10-autodown-publishing.md) 建立文档排版路线。082 已交付为可运行原型（归档于 [archived/082-auto-template-typst-prototype.md](archived/082-auto-template-typst-prototype.md)）。
> 2026-11-17：083 已交付——结构化样式（五层逐属性合成/子树作用域/选择器/呈现规则/inspect_style），publication-ir-v1（归档于 [archived/083-document-style-render-rules.md](archived/083-document-style-render-rules.md)）；084–086 仍为 drafting。

> 2026-11-20：084–086 修订为 r2，采用 ACE/AGE 新版优先、具名缺口可回退的路线。

> 2026-11-22：084 已交付（归档于 [archived/084-publication-templates-semantics.md](archived/084-publication-templates-semantics.md)）——五类模板/occurrence 与引用作用域/标准节点/资源清单；ACE AV 与新版 A2R 对模板形态的具名缺口按 §2.1 在显式旧版路径（`--auto-engine legacy`）交付，复验条件见 [publishing 规范](../specs/publishing.md) §20。085/086 为实施草案。

## 计划与依赖

| 计划 | 范围 | 硬依赖 | 对应原型阶段 |
| --- | --- | --- | --- |
| [082 普通 Auto 模板与 Typst 原型](archived/082-auto-template-typst-prototype.md)（已交付） | Auto 实际求值、内容/出版 IR、两种 PDF、可复现运行入口 | 无新计划；依赖现有工具与解析器 | P0 + P1 |
| [083 文档样式与呈现规则](archived/083-document-style-render-rules.md)（已交付） | 结构化样式、作用域、选择器、自定义呈现、来源检查 | 082（已满足） | 已交付 2026-11-17；样式系统/呈现规则/inspect 为 084–086 基础 |
| [084 多形态模板与文档语义](archived/084-publication-templates-semantics.md)（已交付） | 五类输出、编号、引用、脚注、公式/资源边界 | 082、083（已满足） | 已交付 2026-11-22：publication-ir-v2/doc-wire v2、occurrence 与引用作用域、资源清单、执行端矩阵（AV/A2R 具名缺口与复验条件见规范 §20） |
| [085 实时分页预览与定位](085-live-pagination-preview-source-map.md) | revision、更新调度、预览/导出一致、双向定位 | 082、083 已满足 | P2。Typst 会话与定位可先做，预览优先验新版 AGE/AutoUI |
| [086 延迟布局与上下文表达](086-deferred-layout-context.md) | 普通 Auto 回调支持集、测量、查询、计数器与能力诊断 | 083、084 | P3 布局部分 |

**先启动 084 的真实模板验证，同时可用 083 样例推进 085 的会话、revision 与来源定位。** 084 把执行端结果交给 085。085 在新版 Windows 直连预览上优先验证，RQ 与新版 A2R GUI 按需要演进。086 的功能验收在 084 交付后可从 CLI 开始，交互联验消费 085。

排版路线按实际使用的能力推进。ACE M2/A 阶段已签发，整套 M2/B、AGE 和 RQ 无需整体成为前置。Type/模块/IO、受检回调、窗口/输入/资源等缺口先按实际复现交对应负责方。可在同一接口下显式使用已验旧版，按实际路径验收，并记录新版复验与切换条件。Typst 继续负责分页与 PDF。当前实施范围由 084–086 承接。

## 书籍解析与只读组件

[087 AutoDown 书籍解析、卡片与只读组件](archived/087-autodown-book-reading-profile.md)（已交付） 对接 AutoReader 的 READER-014，交付书籍语法、章内持久锚、双端只读组件和全库验收。

## 编号与状态

- 082、083、087 已归档交付，084–086 为实施草案。
- 当前无计划分配脚本，计划 087 已登记，`.next-id` 为 88。取号时必须复核当前/归档文件与在途任务，不能覆盖同名计划。
- 082–086 是 auto-down 的本地计划编号，不等同于其他仓的同号计划。
- `drafting` 不是已实现、已验证或已合入；082 已按该纪律在隔离工作树执行、复审并归档（见其 §7/§9），其余计划执行时同样处理。
- 继续使用文档维护计划与规范；历史 `.autoos/specs.json` 只读，不为本路线恢复手写账本或缓存索引。

## 跨仓边界

auto-down 负责文档模型、模板库、出版适配和验证入口；AutoLang/ACE 的语法或求值扩展、AutoUI 的公共 Style/控件/工具接口，由最小反例交给对应仓建立任务。现阶段不预分配其他仓的计划号。

书籍 card、段落 ID 与 reader 消费复用 087 的独立格式合同。084 接入实际书稿时复用已交解析接口，遇到超出合同的样例时记录最小缺口。

