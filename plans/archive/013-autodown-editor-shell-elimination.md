# Plan: AutoDown 编辑器 Auto 化深化 —— 薄壳消除与缺口回迁

## Status: COMPLETE


> 前置：plan 010（编辑器 Auto 化复刻，Phase 0-4 全 ✅）、plan 011（jade Auto 化）、plan 012（编译器 backlog，已 CLOSED）。
> 状态：**CLOSED ✅（2026-08-19）**——Phase 0/1/2/3 全部完成。编辑器包 Vue 组件层 100% Auto 生成，薄壳与 Inner 分割已消除。
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
| withDefaults 运行时默认值 | 类型侧已通（`cap_optional_props_with_defaults` → `?: type`）；运行时默认值疑似仍不生效（README AutoDownEditor #4） | ✅ probe 11 实证已自愈：`can_edit?: boolean` + 运行时 `{ can_edit: true }` 双侧都在 |

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

### Phase 0.3 probe 结论（2026-08-19 实证，`tmp/dsl-probes/plan013/REPORT.md`）

13 条最小 probe 全部跑完，**12 条可用、仅 1 条确认残留**：

- ✅ 已自愈（A 组全中）：三元 computed、`??` computed、`!= null` computed（发宽松 `!= null`）、v-show（`show:`）、v-html（`html:`）、defineExpose（`expose {}` 支持 state/模板 ref/on handler/use fn）、async handler（`.await` 后缀，无双回调）、ext `use { fn }`。
- ✅ B 组预判被推翻（实际已好）：DOM `.contains` 原样透传、withDefaults 运行时默认值、空 handler 体、PascalCase 自动 `:key` 启发式存在。
- ❌ 唯一确认残留：**括号丢弃**——`(a+b)*c` → `a + b * c`、`(x||y)&&z` → `x || y && z`，静默错语义、无警告。回迁期间规避法：带优先级的混合表达式拆多步 `let`，不写括号。已记录，待立项修编译器。
- 附带观察：每个 msg handler 自动追加 `emit('X')` + defineEmits 声明（无害噪音，既有设计）；`expose` 的 on handler 固定 void，要返回值需 expose `use { fn }` 引入的函数。

## Phase 0：门控与基线（0.5~1 天）

- **任务 0.1 regen.sh**：照 jade `front/auto/gen/regen.sh` 模式为 `packages/editor/src/auto` 写 regen 脚本——镜像 stubs/真模块 → `auto build`（vue-tsc 失败即 abort，不留 stale）→ sed 重写 import → 拷回 editor 树。消掉 README Regenerate 小节的手工 12 步。
- **任务 0.2 首次门控 regen + drift 清单**：用当前编译器全量 regen，记录所有 vue-tsc 错误/产物 diff（预判：手写 `.value` 双重解包为主）。**不改源，先出清单**。
- **任务 0.3 probe 复核**：对上表"大概率已自愈"逐条写最小 probe（auto-lang worktree 或 tmp/），确认/推翻预判，更新 README 标注。
- 验收：regen.sh 可重复跑；drift 清单 + probe 结论写入本计划。

## Phase 1：回迁批次（1~2 天，editor 侧为主）✅ 完成（2026-08-19）

- **任务 1.1 手写 `.value` 清除**（同 jade gap 40 模式）：按 0.2 清单逐文件清除，注释同步。✅ 残留 `.value` 均为合法形态（`e.target.value` DOM 取值、computed ref 显式 `.filtered.value`、注释）。
- **任务 1.2 原生能力回迁**：v-show（`show:`）、v-html（`html:`，RenderNV 三个组件去 setInnerHTML）、三元/`!= null`/expose 等 probe 确认项逐批回迁。✅ 批次 1（details `show: .is_open`；`.contains` 试迁后回退——null 初值局部变量仍被字符串方法映射误伤，保留 bracket 写法）、批次 2（三 RenderNV `html:` + setInnerHTML 全删）、批次 3（QueryBlock/BlockEmbed 真 `.await` + try/catch/finally，catch 参数 unknown 经 ext `errorMessage` 收窄）、批次 4（`??`/三元 computed：noResultsOr 删除、marker/display_label 改三元；`||` 语义的 strOr/orNull 全部保留——probe 14 证实独立 `||` computed 误推 `computed<boolean>`）。
- **任务 1.3 ext 简化**：`strOr`/`orNull`/`noResultsOr`（若 `||`/`??` 类型推断已修）、`getLanguageIconUrl` 重实现改 ext import、CodeBlockMenu `is_empty` 等命名 computed 规避评估。✅ 批次 5：noResultsOr 已删；getLanguageIconUrl 改 `code_language_icon_ext.ts` 再导出真身 + 恢复原生 computed（README Known #1/#2 同步关闭）；strOr/orNull 保留（probe 14）；CodeBlockMenu defineExpose 保真恢复不做（无消费方，README note 10 故意丢）。
- 每批验收：regen 绿 + `packages/editor` vitest 22/22 + demo e2e 截图基线（8 通过 + scroll-sync:141 既有失败不劣化）+ jade regen/e2e 23/23 不回归。✅ 全部门禁绿（demo e2e 须 `--workers=1` 串行，并发下 scroll-sync 假挂为既有口径）。
- 记录在案（auto-lang 侧后续修复候选）：括号丢弃（probe 09，`(a+b)*c`→`a+b*c` 静默错语义）；三元条件 `==/!= ""` 坍缩成 `!`/`!!`（probe 14，对 null 有语义差）。

## 后续修复（CLOSED 后追加，2026-08-19）

- **括号丢弃已修**（auto-lang `auto-down` 分支）：三个 TS/Vue 表达式发射点（ts_adapter `transpile_expr`、vue.rs `expr_to_js` / `expr_to_vue_bound_value`）按优先级/结合性重推括号（`bina_child_needs_parens`），含右操作数同级重括号与一元 `!`/`-` 操作数；方法/字段调用 receiver 亦覆盖（`transpile_receiver` + 各 emitter 的 Dot/Call 臂，`(.first+" "+.last).to_upper()` → `(first.value + ' ' + last.value).toUpperCase()`）。能力锁 `cap_bina_parens_*` ×3 + `cap_bina_parens_on_call_receiver`。editor 全量 regen 零漂移（现有 .at 无 Bina receiver 形态），SlashMenu filter/环绕导航的既有规避保留不折腾。
- **独立 `||`/`&&` computed 误型已修**（probe 14①）：`expr_to_ts_type` 对 `||`/`&&` 改推操作数类型（同型取该型、异型 `any`），能力锁 `cap_logical_computed_infers_operand_type`。`strOr`/`orNull` 从 `node_view_ext.ts` 删除，7 个 node view 全部回迁原生 `||`（`computed<string>`/`<any>` 正确发出）。
- **三元 `==/!= ""` 坍缩定性为故意设计**（PLAN-026：`undefined !== ''` 误判缺失字段），不修，README/probe 报告已注明。
- 门禁：auto-lang 3021 过 + 1 既有环境挂（route::discovery）；editor vue-tsc/vitest 22/22/build ✓；demo e2e 8 过 + scroll-sync:141 基线；jade e2e 23/23。

## Phase 2：薄壳消除（1~2 天，可能含 auto-lang 任务）✅ 完成（2026-08-19）

- **任务 2.1 prop 运行时默认值** ✅：withDefaults 运行时默认值 probe 11 已实证；widget 签名直接带上契约默认值（`canEdit: bool = true`、`saveLabel: str = "Save"` 等），壳的 withDefaults 删除。
- **任务 2.2 emit 契约迁移** ✅：probe 15 实证 quoted msg variant 可 self-call 带 payload，但发现两个编译器 gap——① 无 handler/未被 view 引用的 quoted variant 不进 defineEmits；② self-called quoted handler 无尾 emit。worktree 修复（`MsgVariant.quoted` 标记：quoted 恒声明 + 恒尾 emit + 无 handler 也带 payload 类型），能力锁 `cap_quoted_emit_declared_without_view_reference` / `cap_quoted_emit_self_called_relay`。bridge 改 `inst.emit(...)`，callback props 全删；`save` 走"computed-payload relay"（handleSave 算 md → self-call `."save"(md)` 尾 emit 携带）。
- **任务 2.3 expose + slot 迁移** ✅：`expose { .handleSave, .getBlockMap }`（camelCase handler/model var probe 15c 实证）；`save-label`/`cancel-label` 用具名 slot + fallback 子节点（probe 15b），函数式组件 + dyn 桥删除；`v-bind="$props"` 透传随壳消失（widget 即组件，props 直接声明）。
- **任务 2.4 AutoDownEditor.vue 全生成** ✅：widget 改名 AutoDownEditor，直接部署到 `src/core/AutoDownEditor.vue`，壳与 AutoDownEditorInner.vue 删除。**关键发现（probe 16）**：生产构建的 `<script setup>` 内联模板使 `setupState` 为空，ext 经 `inst.proxy` 写 model var 落到非响应式 ctx（dev 正常 dist 静默失效）——editor 实例改走 bridge 返回的 `reactive({ items, editor })` 袋（ref 属性保持链接），DSL 全侧用 `.autoDownEditorBridge.editor` 点链；`editor` ref 由 bridge 在 onMounted 合并进 `inst.exposed`（demo e2e 的 `exposed.editor.value` 形状保持）。消费方核对：demo（@save/@cancel/@update + exposed.editor.value + getBlockMap）✓、jade（EditorShell attrs 穿透 + onOpenWikiLink prop 通道 + $el）✓、`src/index.ts` 公共 API 不变 ✓。
- 验收 ✅：编辑器包 Vue 层零手写组件；demo e2e 串行基线 + jade e2e 23/23 不劣化。

## Phase 3：收口（0.5 天）✅ 完成（2026-08-19）

- README workaround 章节重写为"当前真实残留"清单（头部状态块：括号丢弃 / 三元 `==/!= ""` 坍缩 + 独立 `||` computed 误型 / spread 合并未验证 / 句首点需空行）；AutoDownEditor 章节重写为"全生成装配组件"（quoted emit 契约 + computed-payload relay + expose + 具名 slot + withDefaults + probe 16 reactive 袋模式）；Layout/Regenerate 同步（新 stub、AUTO 环境变量指向 worktree 二进制、改名不清 stale 产物 caveat）；plan 013 关闭；plan 010 补记深化结果。

## 风险与对策

| 风险 | 对策 |
|---|---|
| editor regen 长期无门控，首次全量 regen 漂移面未知 | Phase 0 先出门控与清单再动手；所有批次以 demo 截图基线 + vitest 收口 |
| 薄壳的 `v-bind="$props"`/attr 两层穿透 DSL 无对应物 | 任务 2.3 先 probe；最坏情况保留 <30 行极薄壳并记录原因（仍比现状好） |
| 编译器修复（prop 默认值等）与用户 master 活跃开发冲突 | auto-lang 改动一律 worktree + rebase + FF 合并，沿用既有节奏 |
| demo e2e 无 test 脚本、端口/服务复用不稳定 | 复用 playwright.config 既有约定；scroll-sync:141 既有失败作为基线口径 |
