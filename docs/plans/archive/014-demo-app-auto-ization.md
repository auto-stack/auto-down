# Plan 014：demo app 的 Auto 化

## Status: COMPLETE


> 状态：**CLOSED**（2026-08-21）。Phase 0-2 全部完成：app.at 真实化，
> `demo/src/App.vue` 与 `CustomScrollbar.vue` 均由 Auto 编译器生成，
> demo e2e 9/9 全绿，vue-tsc 无新增错误（仅剩 6 条既有 TS6133 基线）。
> 过程中发现并修复 auto-lang 除法 Math.trunc 回归（c2f57577 引入），修复
> 在 auto-lang `.worktree/auto-down` 分支，待 auto-lang 侧合并回 master
> （合并前 regen 须用 worktree 二进制，见 `demo/auto/README.md`）。
>
> 执行前先将本文件落入 `docs/plans/archive/014-demo-app-auto-ization.md`（沿用 010-013 编号）。

## 背景与现状

长期目标"autodown 编辑器乃至 jade-garden 的完整 Auto 化"的下一步：demo app
（`autodown/demo`）仍手写 Vue。当前构成：

| 文件 | 状态 | 处置 |
| --- | --- | --- |
| `src/components/CustomScrollbar.vue` | 已 Auto 化（`demo/auto/src/front/custom_scrollbar.at`） | 不动 |
| `src/App.vue`（314 行） | 手写 | **本次目标：由真实根 widget 生成** |
| `src/composables/useSyncedScroll.ts`（473 行） | 手写 | 保持手写（DOM 测量逻辑，同 editor 包 Tiptap 扩展的定位） |
| `src/composables/useTableColumnResize.ts`（173 行） | 手写 | 保持手写（同上） |
| `src/main.ts` | 手写 | 保持手写（入口 + CSS side-effect imports） |

已有基础设施：`demo/auto/` 工程骨架（`pac.at`：`scene: "ui"`, `render: "vue"`；
`app.at` 目前只是占位根 widget，目的是让 CustomScrollbar 生成为独立组件）。

既有可复用模式（plan 010-013 建立）：

- widget DSL + `use { fn/component/composable ... from "src/front/utils/*_ext.ts" }`
  扩展模块；
- **bridge 惯例**：DSL 的 `composable:` 导入以**零参数**在 setup 顶层调用，
  需要参数的组装逻辑放进 ext 的 bridge composable（内部用
  `getCurrentInstance()` 读 props/实例），返回 `reactive({...})` 袋，DSL 侧
  用 `.xxxBridge.yyy` 点链访问（`auto_down_editor.at` 头注释是完整范本）；
- stubs 双解析 shim（gen 工程无 workspace 依赖，需镜像 stub）+ `regen.sh`
  门禁（编译警告/TS 错误时不 deploy）；
- 生成器事实：`style {}` 块的 CSS **原样透传**到 `<style scoped>`
  （auto-lang `ui_gen/vue.rs:1728`），`:deep()` 可按此透传；子 widget 事件
  绑定（`$event` 透传子组件 emit payload）对**同项目 sub-widget** 有原生
  支持（`vue.rs:938`），外部组件待验证；`ref:` 支持子组件
  （`component_ref_names`，`vue.rs:962`）。

## 目标

demo 的 Vue 组件层 100% 由 Auto 编译器生成：`app.at` 从占位变为真实 App 根
widget，输出直接 deploy 为 `demo/src/App.vue`。行为/像素一致，demo e2e
9/9 守门。

明确**不做**：composables / main.ts 的 Auto 化（DSL 是 UI widget 语言，
DOM 测量 composable 不属于它；与 editor 包"Tiptap 扩展、useAutoDownEditor、
CSS 保持手写"的既定边界一致）。

## 关键设计决策

1. **根 widget 即 App**：生成器固定把根 widget 输出为 `App.vue`——正好
   是目标形态，占位 app.at 的注释使命结束。
2. **bridge composable**：`useDemoAppBridge()`（ext TS，零参）持有：
   初始文档内容、workspaceRef/editorRef/rendererRef、`useSyncedScroll`、
   `useTableColumnResize`（含 `rendererContainerRef` computed）。App.vue 中
   `useSyncedScroll({...})` / `useTableColumnResize(...)` 的带参调用无法
   在 DSL 表达（零参限制），全部内收到 bridge。
3. **初始文档内容抽出**：DSL 无多行模板字符串（内容含反引号）。抽到
   手写 `demo/src/content.ts`（`export function initialContent(): string`），
   由 bridge 装入 reactive 袋。
4. **CSS 分层**：scoped 部分（含 `:deep()` 规则）利用 style {} 透传放入
   widget；全局 `html, body, #app` 块抽到 `demo/src/app.css` 由 main.ts
   import（若 P0.5 探针发现 style {} 支持非 scoped 输出则改回 widget 内）。
5. **`editingBlock` 保留语义**：当前恒为 null 的预留状态；用 ternary
   computed（DSL 已支持，见 editor `focused`）表达 `?.id` / `?.height`，
   不引入 `?.` 依赖。

## Phase 0：DSL 能力探针（tmp/dsl-probes/plan014/，gitignored，不入库）

仿 plan 013 Phase 0.3 的 probe 工程方式，逐项实证，结论记入
`tmp/dsl-probes/plan014/REPORT.md`：

- **P0.1 外部组件事件绑定**：`AutoDownEditor { onSave: .onSave }` /
  `CustomScrollbar { onUpdateScrollTop: .setScrollTop }` 是否生成正确的
  `@save` / `@UpdateScrollTop` 监听（外部组件非 sub-widget，vue.rs:938
  的机制未必覆盖）。*回退*：auto-lang worktree（`.worktree/auto-down`
  分支）补能力，或 bridge relay。
- **P0.2 组件 ref 读取与联动**：`ref: "editorRef"` 声明后 handler 内
  `.editorRef` 能否读到组件实例；ref 如何喂给 bridge 持有的
  useSyncedScroll（候选：a) `.Init` 中把 ref 传给 ext init fn；
  b) DSL `expose {}` 暴露 ref 后 bridge 经 `inst.exposed` 读；
  c) handler 内直接对 bridge 袋赋值）。注意 composable 必须在 setup 上下文
  调用，不能在 `.Init`（onMounted 时机）里 new useSyncedScroll。
  *回退*：bridge 从 `$el` 做 DOM 查询定位 workspace/editor/renderer
  （`__vueParentComponent` 技，与 demo e2e harness 已有用法一致）。
- **P0.3 bridge 袋属性写**：handler 内 `.demoAppBridge.content = md`
  （onUpdate 回填）是否编译通过且运行时生效。
- **P0.4 style {} 透传核实**：`:deep()`、多选择器、`::after` 伪元素、
  `::-webkit-scrollbar` 是否原样进 `<style scoped>`。
- **P0.5 全局样式**：widget 是否能出非 scoped `<style>`（vue.rs:1756 的
  `style` + `scoped_style` 双槽暗示可能有）；不能则按决策 4 抽 app.css。

每个探针：最小 widget + gen 工程编译 + 必要时 dev 起 demo 验证运行时。

## Phase 1：ext 骨架与资源抽取（demo 内，手写 TS）

1. `demo/src/content.ts` — 从 App.vue 原样搬出初始 markdown。
2. `demo/src/app.css` — 全局样式；`main.ts` 增加 import（P0.5 结论决定
   是否需要）。
3. `demo/auto/src/front/utils/app_ext.ts` — `useDemoAppBridge` +
   save/cancel/update 日志助手 + editingBlock 预留状态。
4. `demo/auto/stubs/` — gen 工程镜像 shim（useSyncedScroll、
   useTableColumnResize、`@autodown/editor`、`@autodown/vue` 的组件 stub）。
5. `demo/auto/gen/regen.sh` — 仿 editor regen.sh：`auto build -d .` +
   门禁 grep + deploy 到 `demo/src/App.vue`（含 `@/ext` 别名重写）。

## Phase 2：app.at 真实化

按 P0 结论写完整 `widget App { ... }`：模板结构（toolbar/panels/
splitter-hover-zone/CustomScrollbar）、组件 props 与事件、hover 状态、
watch/on 逻辑、style {} scoped 样式。regen deploy 覆盖
`demo/src/App.vue`，占位注释使命结束。

**门禁**（全部通过才算完成）：

- `cd autodown/demo && E2E_PORT=5199 pnpm exec playwright test --workers=1`
  → 9/9（含 scroll-sync 全组，最近刚修复，作为回归哨兵）；
- `pnpm exec vue-tsc -b` 无新增错误（既有 7 条噪音：App.vue:39 与
  CustomScrollbar.vue 的 TS6133 —— App.vue:39 那条会随本次重写消失）；
- regen 可重复（连跑两次输出稳定，仅 HashMap 顺序 churn 级别差异）。

## Phase 3：收尾

- 更新 `demo/auto/README.md`：App.vue 加入生成清单、接口差异、探针结论
  沉淀（DSL gotchas 一节）。
- `plans/014` 状态标记 CLOSED；若根 README/docs 提及 demo 结构则同步。
- 删除本计划产生的临时 probe 工程之外的杂物；提交（提交前逐项向用户
  请示，沿用本会话惯例）。

## 风险

- P0.1/P0.2 探针若发现能力缺口，优先走 auto-lang worktree 补能力
  （补完需 auto-lang 侧 agent 合并回 master，本仓 regen 用 master 二进制），
  其次 bridge/DOM 回退——不阻塞主路径。
- 生成器属性/声明顺序的 HashMap churn 会带来纯顺序 diff 噪音，评审 diff
  时注意区分。
