# Plan 017：渲染统一与包合并（@autodown/engine 0.3.0）

> 状态：**草案（待立项）**。设计依据：[docs/09-unified-document-engine.md](../docs/09-unified-document-engine.md) §3/§6。
> 立项：2026-08-25。前置：**Plan 016 完成**（块模型 + 强类型解析在册）。
> 关联：plan 008（markstream 消灭，本计划是其渲染层收口）、plan 013
> （editor `.at` 化，第 1 层组件资产在本计划后归 engine）。

## 背景

渲染侧自研已基本完成（008），但存在三处结构债：

1. **渲染壳在手写区**：`render-node.ts`（204 行手写 h()）+ 
   `StreamingRenderer.vue`（1114 行）不在 Auto 单源内，"渲染走 AURA"
   的最后一公里未通。
2. **两包同源分身**：editor 与 vue 各自实现 katex/mermaid 预览
   （`composables/renderPreview.ts` vs `optional-capabilities.ts`）、
   各自持有块概念（BlockId vs node-slot）。
3. **消费方 import 分散**：demo/jade/musk 合计仅 5 个符号，但分散在
   两个包名下。

设计文档 §3 裁定合并为 `@autodown/engine`（单包多出口 + 过渡 shim），
§6 裁定渲染路径统一为"块树 → palette_map → 视图面板树 → 平台面板渲染器"。

## 目标

1. **包合并**：`@autodown/core` + `@autodown/vue` + `@autodown/editor`
   → `@autodown/engine` **0.3.0**，子路径出口 `.` / `./parser` /
   `./render` / `./editor`；旧包名降为 re-export shim。
2. **面板映射单源**：`palette_map.at`（块树 → 视图面板树，词汇对齐
   auto-lang AURA widget registry：Text/H1/List/Table/Codeblock…）。
3. **渲染器生成化**：`render-node.ts` 手写 h() 层重写为由面板映射 +
   组件注册表驱动的渲染器；vue 面板组件与 auto-lang vue 后端 widget
   同 class/style token。
4. **DOM 三契约保持**：`node-slot[data-node-type]`/`data-block-id`/
   `pre[data-language]` 原样；根 class 的 `markstream-vue` 历史段移除
   （唯一显式破坏，见 Phase 3）。
5. **渲染一致性对拍基准**：demo 双栏左编辑右渲染，右侧即新渲染器——
   作为 018 编辑内核替换前后的展示一致性锚点。

## 非目标

- 不动编辑内核（Tiptap 平台层原样迁移进 engine `./editor`，018 替换）。
- 不做 rust 渲染（019，本计划只保证面板映射纯逻辑可双端发射）。
- 不迁移 demo/jade-garden 的消费代码（020；本计划旧包名 shim 保证
  零改动可继续运行）。

## 阶段划分

### Phase 1 — engine 包骨架与吸收

- 起 `packages/engine/`（目录 + `package.json` + vite 多入口 lib 构建：
  entries `{'.': src/index.ts, './parser': …, './render': …,
  './editor': …}` + exports map + dts）。
- 016 的内核源（block_model/markdown_parser/serializer/scheduler/
  streaming）与 vue 包渲染壳、editor 包全部 src 迁入对应层
  （迁移不改逻辑，import 路径机械改写）。
- 依赖方向校验：`./parser` 零 vue 依赖（CI 脚本断言 import 图）。

### Phase 2 — 面板映射与渲染器生成化

- `palette_map.at`：块树 → 面板树纯映射（`.at` 单源，走 016 已验证的
  a2ts 通道）；AutoDown 扩展块（callout/details/mermaid/math）映射到
  扩展面板位（组件注册表可插拔，缺席降级）。
- 渲染器重写：`render/` 下由注册表驱动的块→VNode 渲染器替代
  `render-node.ts`；**组件与 auto-lang AURA registry 对齐表**作为
  验收产物（每个面板类型 ↔ registry widget 名 ↔ class token 三列）。
- 流式语义平移：`render_scheduler`/`useStreamingDocument`/`StreamingRenderer`
  接新渲染器，batch/maxLiveNodes(320)/typewriter/SSR 四不变量测试在册。
- **Tiptap 编辑器内的预览切换**：editor `composables/renderPreview.ts`
  （katex/mermaid 直连）改为消费 `./render` 同一管线——editor 与 vue
  的双预览实现自此合一（两包合并的第一个实质收益）。

### Phase 3 — 出口冻结与 shim

- 出口面定版（engine 0.3.0）：
  - `.`：`MarkdownRender`、`StreamingRenderer`、`StreamingTable`、
    `AutoDownEditor`、`useStreamingDocument`、`useAutoDownEditor`、
    `getBlockMap`、`BLOCK_ID_PREFIX`、`BlockInfo`、`SlashItem`、
    optional-capabilities 五函数 + 类型；
  - `./parser`：`parseDocument`、`parse_blocks`、`serialize` + 类型；
  - `./render`/`./editor` 分层拆分；`style.css` 子路径维持。
- `@autodown/vue`/`@autodown/editor`/`@autodown/core` 降为 re-export
  shim（0.3.x，转发 engine），CHANGELOG + `.changeset` 记录。
- DOM 契约唯一破坏点执行：根 class `markstream-vue markdown-renderer`
  → `markdown-renderer`；同步改本仓 demo e2e 选择器（musk 侧无此 class
  依赖——T13 切换时 vendor 脚本对拍确认，登记到 020 协调项）。
- vite external 清理：`markstream-vue`/`mermaid` 残留项出列表（008 遗留）。

### Phase 4 — 回归与版本

- 测试迁移：vue 82 例 + editor 22 例平移到 engine 测试树全绿；
  DOM 契约快照（node-slot/data-node-type/pre[data-language]）在册。
- demo 消费验证：经 shim 跑通（零改动）+ 直接切 engine 出口跑通
  （020 的预演分支）。
- 版本：`@autodown/engine 0.3.0`；shim 包 `@autodown/vue`/`editor` 同步
  0.3.0（CHANGELOG 注明 re-export 地位与退役预告）。

## 验收标准

1. `pnpm -F @autodown/engine build` 产物含四个出口 + style.css，
   vue-tsc 绿；`./parser` 无 vue import（脚本断言）；
2. vue/editor 既有测试（82+22）全绿迁入；流式四不变量测试全绿；
3. 面板 ↔ AURA registry 对齐表在册且评审通过（019 的输入）；
4. demo 经旧包名 shim 与 engine 出口双路跑通，e2e 9/9（选择器更新后）；
5. `renderPreview` 双实现合一，editor 预览与 `./render` 输出对拍一致；
6. 三仓 regen 不受影响（editor 的 `.at` 工程随迁移后 regen 绿）。

## 待澄清事项

1. **engine 目录内是否保留分包 tsconfig**（单包多 project 便于出口分层
   编译）vs 单 tsconfig + 目录约定——倾向前者（vite 多入口 + 项目引用）。
2. **面板组件注册表 vs 固定面板集**：AutoDown 扩展块（query/embed）在
   engine 内是内置面板还是注册位（消费方注入）——倾向注册位
   （jade-garden 的 query 面板本就是消费方实现）。
3. **shim 退役时点**：0.3.x 维持多久——倾向 musk 完成切换 + 1.0.0
   一起退役（020 收口裁定）。
