# DEBTS.md — 债务与风险台账

| Plan | Type | Category | Severity | Description | Root Cause | Reference | Logged |
|------|------|----------|----------|-------------|------------|-----------|--------|
| 008 | 延期 | 跨仓验证 | 🟡 | musk 侧端到端验证未记录：T13 渲染切换（markstream-vue → @autodown/vue 0.2.0 vendor 快照，render-switch.mjs 白名单对拍）与 T10 编辑器接入（PLAN-041 Phase 2，AutoDownEditor 替代内核，vendor-autodown-editor.mjs 模式） | 验证动作属于 auto-musk 仓的计划任务，须 musk 会话执行其 render-switch/接入流程；本仓侧 dist 新鲜、出口面与契约文档已就绪 | plans/008 验收标准 4；auto-musk 038/041 | 2026-08-24 |
| 008 | 风险/绕道 | 已知限制 | 🟡 | 解析器语义子集白名单后置：math/footnote/mark/sub/sup/insert/`:::` 容器/html 块/linkify 未实现（消费面内容不出现，出现时按字面文本渲染不报错） | 对拍基线为 musk 真实内容 fixtures + 定向用例，超集语法无对拍基准；扩集时补 markdown-parity 用例即可 | packages/vue/auto/markdown_parser.at 头注；markdown-parity.test.ts | 2026-08-24 |
| 008 | 风险/绕道 | 已知限制 | 🟢 | 对拍口径为语义投影（剥 raw/center/text/diff/maybeCheckbox/startLine/endLine/attrs 及 undefined 键），非逐字段复刻 stream-markdown-parser 输出怪癖 | 投影函数在测试侧显式可审；被剥字段均为渲染层不消费的噪音（消费面经 render.test.ts DOM 契约锁定） | packages/vue/src/__tests__/markdown-parity.test.ts DROPPED | 2026-08-24 |
| 008 | 风险/绕道 | 未来增强 | 📋 | 发包走 vendor 快照而非 npm publish（workspace:* 阻塞 file: 直链） | npm 通道前置：@autodown/core 与 @autodown/vue 去workspace 依赖并建立 publish 流程；达成后 musk 退役 vendor 脚本 | packages/editor/ARCHITECTURE.md「发包形态」 | 2026-08-24 |
| 012 | 风险/绕道 | 已知限制 | 🟢 | DSL→Vue codegen 残留缺口全清单（P2 niche ~16 项 + P3 长尾），均有稳定规避；唯一 🔲 cap_vmodel_fold master 回归单列排查 | 残留无需求驱动，重开条件=出现实际需求方（详单在计划文件内） | plans/archive/012（CLOSED 记录） | 2026-08-24 |
| 013 | 风险/绕道 | 已知限制 | 🟢 | 编辑器 DSL 真实残留 4 条：括号丢弃（后已修复）、三元 `==/!= ""` 坍缩（设计性）、spread 合并未验证、语句首点号需前置空行 | 全部有稳定规避，清单在 packages/editor/src/auto/README.md 头部状态块 | packages/editor/src/auto/README.md | 2026-08-24 |
| 015 | 风险/绕道 | 已知限制 | 🟢 | stale SFC 清理仅覆盖 auto run 增量路径（incremental_compile_changed）；auto build 全量路径（VueProject::generate）无 UICache 集成，孤儿产物需手工清理（本轮三仓 gen 树 CodeEditor.vue 已手工清） | 全量路径 cache 集成是独立工程（generate 重写全部产物但无历史清单）；增量路径机制已验证有效 | auto-man/src/vue.rs incremental_compile_changed vs VueProject::generate | 2026-08-24 |
| 015 | 风险/绕道 | 已知限制 | 🟡 | 顶层裸兄弟元素 + 带参事件的组合（`div { onclick: .X(a) }` 连续两个）在 master 即解析失败（Expected term, got RBrace）；col 内同形态正常。jade 带参事件都在 for 循环内故未踩中 | 预存 parser 缺陷（P1#5 探针发现），view 元素解析的事件属性收尾问题；规避=外层容器包裹 | plan-015-p0 probe 复现（/tmp/probe-p5） | 2026-08-24 |
| 015 | 延期 | 编译器 | 🟢 | P1#8 保留字/关键字撞名（view/link/task 元素名、type:/as:/to: prop 名）响亮报错未实现——现状 link 等元素被静默丢弃 | 设计已定（validator R014 扫 view AST 撞 hard keyword，strict 下 fail），实现需多点位接线，独立批次继续 | plans/015 Phase 3 #8 | 2026-08-24 |
