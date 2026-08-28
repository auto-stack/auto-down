---
'@autodown/engine': minor
---

2026-08-28 版本策略修订（用户裁定）：整个语言生态未达 1.0，包版本不得率先占用
1.0。engine 契约冻结（plan 020）的版本号由 1.0.0 修正为 **0.5.0**（0.4.0 之上
一个小版本步进）；冻结语义不变——四出口 + EDITOR-CONTRACT + 命令层 API 面
照旧，rust/VM 平台面仍标 experimental。内部消费方（demo/editor shim/vue shim）
均走 workspace:*，无版本面影响。schema（auto-lang aura.at）的
`@autodown/engine@^0.4.0` 声明待消费计划一并Align到 ^0.5.0。
