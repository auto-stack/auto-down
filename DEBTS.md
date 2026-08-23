# DEBTS.md — 债务与风险台账

| Plan | Type | Category | Severity | Description | Root Cause | Reference | Logged |
|------|------|----------|----------|-------------|------------|-----------|--------|
| 008 | 延期 | 跨仓验证 | 🟡 | musk 侧端到端验证未记录：T13 渲染切换（markstream-vue → @autodown/vue 0.2.0 vendor 快照，render-switch.mjs 白名单对拍）与 T10 编辑器接入（PLAN-041 Phase 2，AutoDownEditor 替代内核，vendor-autodown-editor.mjs 模式） | 验证动作属于 auto-musk 仓的计划任务，须 musk 会话执行其 render-switch/接入流程；本仓侧 dist 新鲜、出口面与契约文档已就绪 | plans/008 验收标准 4；auto-musk 038/041 | 2026-08-24 |
| 008 | 风险/绕道 | 已知限制 | 🟡 | 解析器语义子集白名单后置：math/footnote/mark/sub/sup/insert/`:::` 容器/html 块/linkify 未实现（消费面内容不出现，出现时按字面文本渲染不报错） | 对拍基线为 musk 真实内容 fixtures + 定向用例，超集语法无对拍基准；扩集时补 markdown-parity 用例即可 | packages/vue/auto/markdown_parser.at 头注；markdown-parity.test.ts | 2026-08-24 |
| 008 | 风险/绕道 | 已知限制 | 🟢 | 对拍口径为语义投影（剥 raw/center/text/diff/maybeCheckbox/startLine/endLine/attrs 及 undefined 键），非逐字段复刻 stream-markdown-parser 输出怪癖 | 投影函数在测试侧显式可审；被剥字段均为渲染层不消费的噪音（消费面经 render.test.ts DOM 契约锁定） | packages/vue/src/__tests__/markdown-parity.test.ts DROPPED | 2026-08-24 |
| 008 | 风险/绕道 | 未来增强 | 📋 | 发包走 vendor 快照而非 npm publish（workspace:* 阻塞 file: 直链） | npm 通道前置：@autodown/core 与 @autodown/vue 去workspace 依赖并建立 publish 流程；达成后 musk 退役 vendor 脚本 | packages/editor/ARCHITECTURE.md「发包形态」 | 2026-08-24 |
