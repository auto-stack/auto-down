---
plan_id: PLAN-027
status: execution_done
feature_name: 下游 dev 直连 engine 源码（development 条件出口）
author: zhaopuming
created_at: 2026-08-30T16:30:00+08:00
updated_at: 2026-08-30T17:35:00+08:00

supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 10
total_steps: 10
---

# [PLAN-027] 下游 dev 直连 engine 源码（development 条件出口）

## 变更摘要

`@autodown/engine` 的四个 JS 出口与 `./style.css` 出口增加 `development` 条件，
dev 场景（vite serve，mode=development）解析到 **src**；`import`/`types`/default
路径保持指向 **dist** 不变。配套：jade-garden/front 的 vite/tsconfig 配置、
dist 新鲜度卫兵（内容 hash stamp）、demo 回归、文档销账。

效果：jade 的 dev/e2e 永远消费 engine 当前源码，"src 有、dist 没有"这类静默
过期事故（2026-08-30 实录：`BlockType` 白屏排查）结构性消失；dist 退为纯
发布产物（npm 发布、production build）。

## 目标

1. jade vite dev / e2e 下所有 engine 模块从 src 解析（可断言：页面 resource
   entries 含 `/src/`、无 `/dist/`）。
2. 出口面向后完全兼容：`import`/`types` 条件与 `files: ["dist"]` 发布形状
   零变化，production build 与 npm 消费路径不受影响。
3. dist 消费路径（jade `build`、未来桌面资产构建）前置新鲜度卫兵：src/auto
   内容 hash 与 `dist/.dist-stamp` 不符即拦截并给出重建命令。
4. demo（`workspace:*` 同样吃 exports）同步验证不回归。

## 架构方案

**解析分层（本计划的核心不变量）：**

| 场景 | 激活条件 | 解析目标 |
|---|---|---|
| vite dev serve（jade e2e / demo e2e） | `development`（vite serve 默认激活） | engine **src** |
| `vite build` production | `production`/`import` | engine **dist** |
| npm 发布消费 | `import`/`types`/default | engine **dist** |

**style.css 等价性**：dist 的 `style.css` = `src/editor/styles/autodown-editor.css`
（手写聚合入口）+ 15 个 chrome SFC 的样式块（vite build 聚合）。源码消费下
SFC 样式随组件自动注入，`./style.css` 的 development 条件只需映射到
`autodown-editor.css`，覆盖等价。

**与 plan 017 出口冻结的关系**：冻结的是出口集合与生产解析路径；本计划为
**加性扩展**（新增条件分支，不删不改既有分支），dist 产物形状零变化。需在
engine ARCHITECTURE.md 出口章节落账这一语义。

**新鲜度卫兵（hash 制，非 mtime 制）**：mtime 在本仓库高频 git 操作
（worktree/fold/switch）下会虚警；采用内容 hash——engine build 链尾对
`src/**` + `auto/**`（排除 `auto/**/*.raw.ts`、`_stage`）计算 sha256 写入
`dist/.dist-stamp`；消费者侧 `assert-dist-fresh.mjs` 重算比对，不符即非零
退出并提示 `pnpm --filter @autodown/engine build`。仅在 dist 消费路径前置
（build / e2e-prepare），dev 直连源后 dev 路径天然免疫。

## 技术栈

- package.json `exports` 条件映射（Node/vite/TS bundler 解析）
- vite：`resolve.conditions`（加性）、`optimizeDeps.exclude`（linked 包按源处理）
- tsconfig `customConditions`（moduleResolution=bundler 前提下让类型也吃源）
- node 脚本：`crypto.createHash('sha256')` 遍历目录

## 需求分析与背景调查

**事故动机（2026-08-30 实录）**：并行会话 11:13 落地 plan-022 Phase 5，
engine `src/parser.ts` 扩出口 `BlockType/anchorOf/attrGetInt/spansText`，
jade `blocks_store_ext.ts` 随之消费；主检出 engine dist 未重建 → 14:55
jade e2e 全线白屏（`dist/parser.js does not provide an export named
'BlockType'`），排查横跨 fixture、后端、vite 缓存三处。DEBTS.md 已登记
"jade link: 到 dist 的过期脚枪"。

**spec 关联**：
- P022-3（即日生效纪律——防迁移债增殖）：stale dist 正是该纪律针对的债型，
  本计划是其在依赖形态上的销账动作。
- P026 系列（挂载宿主协议）刚扩了 parser 出口消费面（jade 新增 5 个名字的
  import），出口消费在涨、过期风险随之放大。

**消费面盘点（现状事实）**：
- jade front 3 个 import 点：`main.ts` 的 style.css、`blocks_store_ext.ts`
  的 `@autodown/engine/parser`、`editor_tab_ext.ts` 的 `@autodown/engine/editor`；
  依赖声明 `link:../../autodown/packages/engine`。
- demo：`workspace:*`，vite.config 无 optimizeDeps 特配。
- jade peer 前提已满足：`vue ^3.4.0`、`lucide-vue-next` 均在依赖中；
  engine 正式 deps（katex/mermaid/lowlight/hast-util-to-html）经 pnpm link
  从 engine 自身 node_modules 解析。
- jade `tsconfig.json` `moduleResolution: "bundler"` → `customConditions`
  可用；jade 有真实 production 路径 `build: "vue-tsc && vite build"`。
- jade e2e 钩子现成：`pretest:e2e` → `scripts/e2e-prepare.mjs`。

**引擎侧既有出口**（`autodown/packages/engine/package.json`）：
`.`/`./parser`/`./render`/`./editor` 四出口（import+types 双条件）+ `./style.css`
单映射；构建门含 `assert-no-tiptap`（扫 dist 无 @tiptap）、`assert-parser-pure`、
`assert-editor-gen` 三断言，全部不受 exports 条件扩展影响。

## 详细设计

### D1 engine exports（`autodown/packages/engine/package.json`）

```jsonc
"exports": {
  ".":           { "development": "./src/index.ts",  "import": "./dist/index.js",  "types": "./dist/index.d.ts" },
  "./parser":    { "development": "./src/parser.ts", "import": "./dist/parser.js", "types": "./dist/parser.d.ts" },
  "./render":    { "development": "./src/render.ts", "import": "./dist/render.js", "types": "./dist/render.d.ts" },
  "./editor":    { "development": "./src/editor.ts", "import": "./dist/editor.js", "types": "./dist/editor.d.ts" },
  "./style.css": { "development": "./src/editor/styles/autodown-editor.css", "default": "./dist/style.css" }
}
```

条件顺序：`development` 在前（vite serve 命中即短路）；`types` 保持在
`import` 之后（TS 默认解析不受 dev 条件影响，除非消费方显式开 customConditions，
见 D4）。`main`/`module`/`types` 顶层字段与 `files` 不动。

### D2 新鲜度卫兵（engine 侧两脚本）

- `autodown/packages/engine/scripts/write-dist-stamp.mjs`：遍历 `src/**`（.ts/.vue/.css）
  与 `auto/**`（.at + ext/*.ts，排除 `*.raw.ts`、`gen/`、`_stage`），按相对路径
  排序拼接 `(path + '\0' + content)` 取 sha256，写 `dist/.dist-stamp`（单行 hex）。
  挂到 `package.json` 的 `build` 链最末（三断言之后）。
- `autodown/packages/engine/scripts/assert-dist-fresh.mjs`：同一算法重算，
  与 stamp 比对；`dist/` 或 stamp 缺失、内容不符 → stderr 输出
  `engine dist stale — rebuild with: pnpm --filter @autodown/engine build`，
  exit 1。供消费方以相对路径调用：
  `node ../../autodown/packages/engine/scripts/assert-dist-fresh.mjs`。

### D3 jade vite 配置（`jade-garden/front/vite.config.ts`）

```ts
resolve: {
  conditions: ['development'],            // 显式加性声明（serve 默认已激活，双保险）
  alias: { '@': resolve(__dirname, './src') },
},
optimizeDeps: {
  exclude: ['@autodown/engine'],          // linked 包按源处理，不走预打包
},
```

`optimizeDeps.exclude` 后，engine src 对 katex/mermaid/lowlight 的 import 由
vite 按普通依赖发现并各自预打包（CJS 互操作保持正确）；mermaid 体积大，dev
首启预打包一次后走缓存，可接受。

### D4 类型侧（`jade-garden/front/tsconfig.json`）

`"customConditions": ["development"]` 使 vue-tsc/volar 的类型解析也吃 engine
src。**决策规则**：跑 `pnpm build`（vue-tsc 段）；若 engine 源在 jade 的
tsconfig 标志组合下报类型错（两侧 strictness 差异），**不加** customConditions
（类型退回 dist d.ts，运行时不受影响），差异清单记入复审记录——类型吃源是
增益项不是阻塞项。

### D5 消费方卫兵挂点（`jade-garden/front`）

- `scripts/e2e-prepare.mjs` 头部：execFileSync 调 engine 的
  `assert-dist-fresh.mjs`（e2e 虽已直连源，保留卫兵兜底 dist 消费面并给
  并行会话一个即早失败信号）。
- `package.json`：`"prebuild": "node ../../autodown/packages/engine/scripts/assert-dist-fresh.mjs"`、
  `"predev": "node ../../autodown/packages/engine/scripts/assert-dist-fresh.mjs || exit 0"`
  （dev 直连源后 stale 不应阻塞，仅 build 严格拦截；predev 可省略，执行时
  按此优先级取舍）。

### D6 demo（`autodown/demo/vite.config.ts`）

同样加 `optimizeDeps.exclude: ['@autodown/engine']`（`resolve.conditions` 可省，
serve 默认激活）。demo e2e 作为 workspace:* 路径的回归门。

## 测试设计

- **T-脚本自测**（新增 `autodown/packages/engine/src/__tests__/` 不适用——卫兵
  是构建脚本非运行时，自测走命令行验证，见执行步骤 T2 的三态验证）。
- **解析路径断言**（新增 `jade-garden/front/scripts/verify-dev-resolves-src.mjs`）：
  起本地 vite（复用 e2e 的 backend+vite 组装或仅 vite 静态页面）→ playwright
  打开 → `performance.getEntriesByType('resource')` 收集模块 URL → 断言含
  `engine/src/` 且无 `engine/dist/`。
- **门（全量复跑）**：
  - engine：`pnpm test`（432）+ `pnpm build`（三断言）——证明 dist 产物面零回归；
  - jade：`pnpm test:e2e` 全量 23/23（此时已吃 src 跑）；
  - demo：demo e2e 22/22。

## 验收标准

1. jade vite dev 下 engine 模块 URL 全部指向 src（verify-dev-resolves-src 通过）。
2. engine `pnpm build` 三断言 + 432 单测不回归；jade e2e 23/23；demo e2e 22/22。
3. 卫兵有效：构造 stale（修改 engine 任一 src 文件内容不重建）→ jade
   `pnpm build` 前置拦截并输出重建命令；重建后通过。
4. 出口兼容：`node -e "import('@autodown/engine/parser')"` 在无 development
   条件激活的 node 环境仍解析 dist（`files`/发布形状不变）。
5. 文档落账：engine ARCHITECTURE.md 出口章节含 development 条件语义与 dist
   角色收窄说明；DEBTS.md 的 stale dist 行销账。

## 执行步骤

- [x] **T1** `autodown/packages/engine/package.json`：按 D1 改 exports。
  验证：`node -e "const e=require('./package.json').exports;console.log(e['./parser'].development,e['./style.css'].development)"`
  输出 `./src/parser.ts ./src/editor/styles/autodown-editor.css`；`pnpm build`
  三断言仍过。
  [✅ 已完成] exports node 检查输出正确；worktree 内 `pnpm build` 三断言
  （parser-pure / no-tiptap / editor-gen）全绿（commit 24ddde6）。
- [x] **T2** 新建 `scripts/write-dist-stamp.mjs` + `scripts/assert-dist-fresh.mjs`
  （D2），`build` 脚本链末追加 stamp 写入。验证三态：构建后 `node
  scripts/assert-dist-fresh.mjs` exit 0；改 `src/parser/serializer.ts` 一行后
  exit 1 且 stderr 含重建命令；恢复并重建后 exit 0。
  [✅ 已完成] 三态验证全过：fresh→exit 0（stamp 4630ab0b…）；改 serializer.ts
  一行→exit 1 且 stderr 含 `pnpm --filter @autodown/engine build`；恢复重建→
  exit 0 且 stamp 回到同值（确定性印证）。另验外部 cwd 调用 exit 0。共享算法
  落在 `dist-stamp-lib.mjs`（读写两侧同源，不漂移）。
- [x] **T3** `jade-garden/front/vite.config.ts` 按 D3 加 conditions +
  optimizeDeps.exclude；新建 `scripts/verify-dev-resolves-src.mjs`。验证：
  `node scripts/verify-dev-resolves-src.mjs` 通过（全 src 无 dist）。
  [✅ 已完成] 探针通过：74 个 engine resource URL 全部
  `/engine/src/`（/@fs/ 服务），零 `dist`，exit 0。探针自起 vite（随机
  空闲端口，不起后端——模块图为静态导入，API 失败不影响加载）+
  playwright chromium 收集 `performance.getEntriesByType('resource')`。
- [x] **T4** `jade-garden/front/tsconfig.json` 加 `customConditions:
  ["development"]`，跑 `pnpm build`（vue-tsc 段）；按 D4 决策规则取舍并在
  本文件复审记录留痕。
  [✅ 已完成] **保留 customConditions**：`pnpm build` 全绿（vue-tsc + vite
  build 9.28s），--traceResolution 证实类型解析深入 engine/src（如
  EngineEditor.vue），零类型错。**执行中发现并修正 D3 缺陷**：vite 6.4.3
  的 `resolve.conditions` 是整体替换默认集且 serve/build 共用（源码
  mergeWithDefaults 数组替换 + resolveExportsOrImports 仅映射
  development|production token），D3 字面写法会让 production build 也吃
  src（实证：该配置下 build 陷 src 依赖图 >10min 无输出；Node
  `--conditions development` 解析实证 engine exports 语义正确）。修正为
  `command === 'serve'` 时声明
  `['module','browser','development|production','development']`（真加性），
  build 回归默认集吃 dist（build 9.28s 绿）。修正后 dev 探针复验 74/74
  src URL 不回归。留复审重点核对。
- [x] **T5** jade 卫兵挂点（D5）：`e2e-prepare.mjs` 头部 + `prebuild`。验证：
  构造 stale → `pnpm test:e2e` 在 prepare 阶段拦截；重建后 `pnpm test:e2e`
  全量 23/23。
  [✅ 已完成] stale（改 serializer.ts 不重建）→ e2e 在 prepare 阶段 exit 1
  且输出重建命令；恢复重建后 e2e 全量 **23/23 绿**（32.1s，此时 e2e 已吃
  engine src 跑）。`predev` 按计划优先级取舍省略（dev 直连源 stale 不应
  阻塞）。桌面资产构建入口盘点：front 仅有 `build` 一个 production 入口
  （无 CI/打包脚本），未发现需补挂的入口。执行环境注记：worktree 需从
  主检出复制 cargo exe 与 tmp fixture（均 gitignore：`.gitignore:47 /tmp/`）。
- [x] **T6** `autodown/demo/vite.config.ts` 加 optimizeDeps.exclude（D6）。验证：
  demo e2e 22/22。
  [✅ 已完成] demo e2e **22/22 绿**（17.7s，`npx playwright test`，经
  workspace:* 路径消费 engine dev 源）。
- [x] **T7** engine 门复跑：`pnpm test` + `pnpm build`（432 + 三断言）。
  [✅ 已完成] `pnpm test` **432/432**（31 文件，2.23s）；`pnpm build` 三断言
  全过 + stamp 写入（4630ab0b…）。
- [x] **T8** 文档：`autodown/packages/engine/ARCHITECTURE.md` 出口章节
  （development 条件、dist 角色收窄、与 017 冻结的加性关系）；`DEBTS.md`
  销 stale dist 行；`jade-garden/front/README.md` 依赖形态一句（dev 吃源、
  build 吃 dist+卫兵）。
  [✅ 已完成] ARCHITECTURE.md §2 新增 development 条件条款（加性关系 +
  dist 角色收窄 + 卫兵机制）；DEBTS.md 026 行按台账惯例划线销账（✅已销号，
  plan 027）；front/README.md 新建（原本不存在），含依赖形态两则。
- [x] **T9** 全量门汇总跑一遍（engine 432+三断言 / jade 23/23 / demo 22/22），
  结果回填复审记录。
  [✅ 已完成] 汇总连跑全绿：engine `pnpm test` **432/432**（31 文件）+
  `pnpm build` 三断言 + stamp（4630ab0b…）；jade `pnpm test:e2e` **23/23**
  （39.0s，e2e 吃 engine src 跑）；demo e2e **22/22**（17.4s）。
- [x] **T10** 提交折叠回 master（worktree 清理、默认检出计划状态同步）。
  [✅ 已完成] 前置全量门（T9 三扇门连跑全绿）后折叠：plan-027-dev 7 个提交
  ff 合入 master（be487b6 落点），计划文件入库；worktree 无未提交残留，
  master 回同步至 worktree；主检出 engine dist 重建（stamp 4630ab0b…），
  主检出侧卫兵即开即绿。worktree `.worktrees/plan-027-dev` 按规程保留，
  终局清理归 /auto-plan:merge。

## 复审记录

（待 /auto-plan:review 填写）

## 待澄清事项

1. **类型吃源 vs dist d.ts**（D4）：决策规则已内联（报错即回退），最终取舍
   复审时确认。
2. **桌面资产构建入口盘点**：plan 022 VM 化后 production 资产的固定构建入口
   若不止 `pnpm build`（如 CI/打包脚本），执行 T5 时盘点补挂卫兵；发现新
   入口则回写本节。
