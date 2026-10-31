# AutoDown 规范知识入口

> PLAN-107 / document-source-v1。

本仓当前知识以本目录的主题规范维护；历史账本的状态和旧验证数字不自动成为当前要求。仓内包含 `autodown/` 文档引擎源码和 `jade-garden/` 历史应用来源；旧架构材料明确标注其计划阶段，保留原出处。

- [迁移对账与全部历史记录](history/legacy-ledger/README.md)：逐条来源、原字段、归档去向及回滚说明。
- [Jade Garden 的原阶段架构](../../jade-garden/ARCHITECTURE.md)：原文标注 plan 022 state，按历史上下文读取。
- [既有债务台账](../../DEBTS.md)：本次迁移不自动关闭旧债，也不重新认证历史测试。

后续产品变化先核对实际代码与已批准合同，再更新对应当前规范；agent 不再写 specs.json，应用从文档和归档计划派生索引。遗留 JSON 保留为只读来源，迁移报告不充当应用手填索引。
