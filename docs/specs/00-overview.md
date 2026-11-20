# AutoDown 规范知识入口

> PLAN-107 / document-source-v1。

本仓当前知识以本目录的主题规范维护；历史账本的状态和旧验证数字不自动成为当前要求。仓内包含 `autodown/` 文档引擎源码和 `jade-garden/` 历史应用来源；旧架构材料明确标注其计划阶段，保留原出处。

- [迁移对账与全部历史记录](history/legacy-ledger/README.md)：逐条来源、原字段、归档去向及回滚说明。
- [Jade Garden 的原阶段架构](../../jade-garden/ARCHITECTURE.md)：原文标注 plan 022 state，按历史上下文读取。
- [既有债务台账](../../DEBTS.md)：本次迁移不自动关闭旧债，也不重新认证历史测试。

后续产品变化先核对实际代码与已批准合同，再更新对应当前规范；agent 不再写 specs.json，应用从文档和归档计划派生索引。遗留 JSON 保留为只读来源，迁移报告不充当应用手填索引。

- [书籍阅读格式与只读组件](book-reading.md) 记录章、卡与持久锚的语义和双端验收入口。

## 设计中方向

- [AutoDown 文档排版与 Auto 模板设计](../designs/10-autodown-publishing.md)：2026-11-14 Draft 0.1；v0.6 的普通 Auto 模板、Node 正文与 Typst 排版方向，附 P0-P3 原型范围、边界与验收场景。当前是设计输入，尚未实现，不替代已冻结的 parser/render/editor 出口合同。

- [对应实施计划 082–086](../plans/README.md)：082 已交付为可运行原型（归档计划，含原型合同与边界规范 [publishing.md](publishing.md)）；083–086 仍为 drafting，待原型评估反馈后执行。
