# DEBTS.md — 债务与风险台账

| Plan | Type | Category | Severity | Description | Root Cause | Reference | Logged |
|------|------|----------|----------|-------------|------------|-----------|--------|
| 008 | 延期 | 跨仓验证 | 🟡 | musk 侧端到端验证未记录：T13 渲染切换（markstream-vue → @autodown/vue 0.2.0 vendor 快照，render-switch.mjs 白名单对拍）与 T10 编辑器接入（PLAN-041 Phase 2，AutoDownEditor 替代内核，vendor-autodown-editor.mjs 模式） | 验证动作属于 auto-musk 仓的计划任务，须 musk 会话执行其 render-switch/接入流程；本仓侧 dist 新鲜、出口面与契约文档已就绪 | plans/008 验收标准 4；auto-musk 038/041 | 2026-08-24 |
