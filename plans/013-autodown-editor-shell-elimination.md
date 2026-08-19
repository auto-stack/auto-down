# Plan: AutoDown 编辑器 Auto 化深化 —— 薄壳消除与缺口回迁

> 前置：plan 010（编辑器 Auto 化复刻，Phase 0-4 全 ✅）、plan 011（jade Auto 化）、plan 012（编译器 backlog，已 CLOSED）。
> 调研基础：`autodown/packages/editor/src/auto/README.md` workaround 全清单（2026-07 基线）逐条对照当前编译器（plan 402-410 + 批次 A-G + plan-408/055）。
> 长期目标不变：消除编辑器包最后一层手写 Vue 壳，缺口能回迁尽回迁，ext 只留真 ext 项。

## 目标

1. **薄壳消除**：`src/core/AutoDownEditor.vue`（123 行手写）整个由 Auto 生成，编辑器包 Vue 层真正 100% Auto。
2. **缺口回迁**：README 记录的 ~25 条 workaround 逐条复核，已自愈的回迁 DSL 原生写法，ext 只保留真实 ext 项（npm 库、正则、双解析 shim、类型导出）。
3. **工具补齐**：editor 包 regen 目前是无门控的手敲 shell（解析失败留 stale 产物仍报成功），补齐 jade 同款 regen.sh + vue-tsc 门。

## 关键调研结论（2026-08-19）

### 薄壳四硬缺口的现状

| 缺口 | 现状 | 结论 |
|---|---|---|
| 小写/连字符 emit 名（update/save/link-click 等） | `cap_quoted_lowercase_emit_child/parent_wiring` 双侧锁定 | ✅ 已自愈，quoted msg variant 可表达 |
| defineExpose（editor/handleSave/getBlockMap） | `expose {}` 块已支持 handler/state/template ref（test_expose_* 系列） | ✅ 可用；handleSave 需 handler 带返回值（gap 10 已自愈） |
| slot（save-label/cancel-label 具名非作用域） | 具名 slot outlet + 父侧 `slot(name:)` 双侧已通 | ✅ 可用，可弃"函数式组件 + dyn"桥接 |
| withDefaults 运行时默认值 | 类型侧已通（`cap_optional_props_with_defaults` → `?: type`）；**运行时默认值疑似仍不生效**（README AutoDownEditor #4） | ⚠️ 需 probe；若仍缺，是唯一需要先修编译器的项 |

### 需立即注意：editor widgets 可能已无法 regen

Plan 408 P4（handler/watch 体 ref 自动解包）后，jade 侧 20 处手写 `.value` 全部双重解包（已清）。**editor 包的 `.at` 文件存在同类手写 `.value`**（README NodeView #6 明确记载 `.loading.value` 写法），且 editor regen 是无门控手敲流程、可能很久没用当前编译器跑过——首次 regen 大概率撞双重解包/其它 drift。Phase 0 必须先建立门控再动手。

### workaround 自愈预判（probe 复核清单）

**大概率已自愈（候选回迁）**：
- 手写 `.value`（NodeView #6、SlashMenu #5 等）—— P4 自动解包，同 jade gap 40
- 三元 computed 发 undefined（NodeView #1）—— plan-408 `computed if 转三元`（09afadba）
- computed `!= null` 误发 `!== undefined`（NodeView #8）—— 批次 A gap 47
- v-show（NodeView #11）—— `show:` prop（c5b5fecf）
- v-html（RenderNV #2 setInnerHTML 命令式填充）—— `html:` prop（c7034bf5）
- defineExpose（CodeBlockMenu #10）—— `expose {}`
- async handler / Promise 双回调（NodeView #14）—— plan-408 async handler（7bd6d4e3）
- import 手写 TS（Known #1，getLanguageIconUrl 重实现）—— ext `use { fn }`
- `??` computed 发 undefined（SlashMenu #2 等）—— plan-408 批次疑似覆盖，待实证

**预计仍残留（保持规避或记 niche）**：括号丢弃（SlashMenu #6）、DOM `.contains` 误映射（Bubble/Table #7，括号记号）、`view` 关键字（SlashMenu #7/CodeBlockMenu #6）、正则字面量、`??` 若未修、tiptap/npm 双解析 shim、slashItem 类型导出、空 handler 体 noop 占位、PascalCase 自动 `:key` 启发式（CodeBlockMenu #7）。

**真 ext 项（不回迁）**：katex/mermaid 渲染、lucide 图标值、30 项 slash 清单（prompt/clipboard 块体闭包）、`useAutoDownEditorBridge`、computeMenuPosition 再导出、双解析 stub 机制。

## Phase 0：门控与基线（0.5~1 天）

- **任务 0.1 regen.sh**：照 jade `front/auto/gen/regen.sh` 模式为 `packages/editor/src/auto` 写 regen 脚本——镜像 stubs/真模块 → `auto build`（vue-tsc 失败即 abort，不留 stale）→ sed 重写 import → 拷回 editor 树。消掉 README Regenerate 小节的手工 12 步。
- **任务 0.2 首次门控 regen + drift 清单**：用当前编译器全量 regen，记录所有 vue-tsc 错误/产物 diff（预判：手写 `.value` 双重解包为主）。**不改源，先出清单**。
- **任务 0.3 probe 复核**：对上表"大概率已自愈"逐条写最小 probe（auto-lang worktree 或 tmp/），确认/推翻预判，更新 README 标注。
- 验收：regen.sh 可重复跑；drift 清单 + probe 结论写入本计划。

## Phase 1：回迁批次（1~2 天，editor 侧为主）

- **任务 1.1 手写 `.value` 清除**（同 jade gap 40 模式）：按 0.2 清单逐文件清除，注释同步。
- **任务 1.2 原生能力回迁**：v-show（`show:`）、v-html（`html:`，RenderNV 三个组件去 setInnerHTML）、三元/`!= null`/expose 等 probe 确认项逐批回迁。
- **任务 1.3 ext 简化**：`strOr`/`orNull`/`noResultsOr`（若 `||`/`??` 类型推断已修）、`getLanguageIconUrl` 重实现改 ext import、CodeBlockMenu `is_empty` 等命名 computed 规避评估。
- 每批验收：regen 绿 + `packages/editor` vitest 22/22 + demo e2e 截图基线（8 通过 + scroll-sync:141 既有失败不劣化）+ jade regen/e2e 23/23 不回归。

## Phase 2：薄壳消除（1~2 天，可能含 auto-lang 任务）

- **任务 2.1 prop 运行时默认值**：probe `canEdit: bool = true` 类声明的运行时行为；若默认值不进 props 配置，在 auto-lang worktree 修（withDefaults 或默认参数发射），配能力锁测试。
- **任务 2.2 emit 契约迁移**：inner widget 改 quoted msg variant（`"update"`/`"save"`/`"link-click"`/`"open-wiki-link"` 等）替代 callback props 桥；ext bridge 改 `getCurrentInstance().emit`（已声明 emit，无穿透污染）；注意与 view 源 `@SaveRequest` 既有路径统一。
- **任务 2.3 expose + slot 迁移**：shell 的 `defineExpose({editor, handleSave, getBlockMap})` 进 inner widget `expose {}`；`save-label`/`cancel-label` 用具名 slot 原生写法（弃函数式组件 + dyn 桥）；`v-bind="$props"` 透传与 class 两层穿透的等价方案设计（可能仍需极薄壳或编译器支持，probe 后定）。
- **任务 2.4 AutoDownEditor.vue 全生成**：壳删除，demo/jade 消费方（`getBlockMap()`、`$el`、`exposed.editor` 形状）逐一核对。
- 验收：编辑器包 Vue 层零手写组件；demo e2e + jade e2e 全绿；`src/index.ts` 公共 API 不变。

## Phase 3：收口（0.5 天）

- README workaround 章节重写为"当前真实残留"清单（仿 jade README 收工模式）；plan 013 状态关闭；plan 010 补记深化结果。

## 风险与对策

| 风险 | 对策 |
|---|---|
| editor regen 长期无门控，首次全量 regen 漂移面未知 | Phase 0 先出门控与清单再动手；所有批次以 demo 截图基线 + vitest 收口 |
| 薄壳的 `v-bind="$props"`/attr 两层穿透 DSL 无对应物 | 任务 2.3 先 probe；最坏情况保留 <30 行极薄壳并记录原因（仍比现状好） |
| 编译器修复（prop 默认值等）与用户 master 活跃开发冲突 | auto-lang 改动一律 worktree + rebase + FF 合并，沿用既有节奏 |
| demo e2e 无 test 脚本、端口/服务复用不稳定 | 复用 playwright.config 既有约定；scroll-sync:141 既有失败作为基线口径 |
