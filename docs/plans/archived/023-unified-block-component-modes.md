# [PLAN-023] 统一块组件契约与分类型编辑面（view/stream/edit 三模式）

---
plan_id: PLAN-023
status: archived
feature_name: 统一块组件契约（BlockComponent 三模式）与分类型编辑面重建
author: [zhaopuming, zcode]
created_at: 2026-08-29T16:20:00+08:00
updated_at: 2026-08-29T18:20:00+08:00
supersedes_spec_components: []
new_spec_components: []
touched_goals: []
current_step: 13
total_steps: 13
---

## 变更摘要

废除"编辑/展示并轨"的残余结构，把 engine 的块渲染与块编辑统一到**每类型一个
BlockComponent 契约**上（view / stream / edit 三模式），并在此契约上重建
Tiptap 退役时丢失的分类型编辑面（CodeEditorBlock、Table 编辑面），消除
EngineEditor 预览路径的 md round-trip 分叉。行内 WYSIWYG（段落内加粗/链接的
就地编辑）**明确不在本计划范围**，单列后续计划。

## 目标

1. **管道统一**：EngineEditor 非聚焦块预览不再 serialize→reparse，直接对
   `doc.children` 逐块 `renderNodes`，与 StreamingRenderer/MarkdownRender 共用
   同一条渲染管线（消灭双轨最后的管道分叉）。
2. **契约统一**：新增 `BlockComponent` 契约（`view/stream/edit` 三模式槽位），
   挂接 panel registry；编辑装配（EngineEditor 聚焦块）与流式装配
   （StreamingRenderer 分段）都从同一 registry 解析组件。
3. **分类型编辑面重建**：代码块获得 CodeEditorBlock（语言标题栏 + 多行代码
   编辑区，替换现在的"聚焦即纯文本源码 input"体验）；表格获得编辑面（行列
   增删走引擎 `commands.ts` 命令链）。两者终态为 Auto 源（`.at`）经
   `gen:editor` 管线生成，跟随 plan 021 确立的"手写原型钉行为 → .at 化替换"
   路径。
4. **stream→edit 交接**：裁定并实现 v1 语义——流式进行中编辑面只读（横幅
   提示），流结束解锁，为后续"流式生成完直接就地修改"铺路。
5. 全程保持 EDITOR-CONTRACT.md 冻结面（root class、`data-block-id`、
   `getBlockMap`）与 `assert-editor-gen` 生成物门检不破。

## 架构方案

```
BlockComponent (每 BlockType 一份，注册进 panel registry)
├─ view(node, ctx)            最终态 = 现有 renderNodes 产物（builtin panels）
├─ stream(node, streamCtx)    渐进态 = view + 调度器参数 + final 标志
└─ edit(node, editCtx)        编辑面：CodeEditorBlock / TableEditor / BlockHost 兜底
共享层：BlockNode 模型(016) · applyOp 命令(commands.ts) · panel registry ·
        chrome(标题栏/复制) · 高亮桥(highlight.ts) · 调度决策(render_scheduler.at)
平台边界：Vue 侧组件 = 平台 chrome 层；VM 侧按双壳单核复用模型/命令/决策，
          平台差异走 port（timer / highlight 桥先例）
```

- **编辑热路径保真**：保留 BlockHost 已验证的"聚焦时 DOM 拥有文本、失焦才经
  `diffToOp` 回写模型"协议；分类型编辑面只替换"内容形态"，不换该协议。
- **.at 化路径**：新组件先手写 SFC 钉 DOM/行为（vitest 契约测试为对拍基线），
  再写 `.at` 源进 `auto/editor/`、`gen.mjs` DEPLOY_COMPONENTS 增行、
  `assert-editor-gen` 部署物清单增行，生成物与手写原型对拍后删手写件。
- **非目标（本计划不做）**：行内 WYSIWYG（选区映射/inline mark 就地编辑，
  单列 plan-024）；气泡/斜杠菜单宿主协议扩展（021 C.2 既有挂载缺口，独立
  处理）；VM 侧 edit 宿主实现。

## 技术栈

- AutoLang（widget `.at` → `pnpm gen:editor`，工程模式收割）+ Vue 3 SFC
  （平台装配层，不 .at 化，同 021 §6 边界定版）
- vitest（engine 单测，SSR renderToString 契约测试）+ Playwright（demo e2e）
- 现有门检：`assert-parser-pure` / `assert-no-tiptap` / `assert-editor-gen`

## 需求分析与背景调查

（spec 概览后端不可用——无 8080 服务、无 `.autoos/specs.json`；本节以本会话
调研确认的模块事实为锚。）

- **016 统一块内核已落地**：`packages/engine/src/parser/block-model.ts`（913 行
  发射物）含 BlockNode/BlockPos/Selection/applyOp/invertOp；rust 对拍常跑。
  → 编辑与渲染共享同一模型的根基存在。
- **编辑器预览已复用渲染管线但绕路**：`src/editor/components/EngineEditor.vue`
  `previewNodes` 对每个非聚焦块 `serialize` 成 md 再 `parseDocument` 回来走
  `renderNodes`——管道分叉 + 重复解析开销。
- **聚焦块退化为本文本**：`src/editor/engine/host-controller.ts` `blockText()`
  把代码块等拍平成纯文本塞进 BlockHost——Tiptap 退役（018，live-preview 折中
  §8 v1）后分类型编辑面整体缺失，仅 7 个 NodeView 休眠（021 附录 C.2 在册）。
- **流式侧组件注册零散**：`src/render/StreamingRenderer.vue` 内联 `registry`
  （仅 table）+ 内联 `<details>` 渲染——与 panel registry 未合流。
- **表格命令链已就位**：`src/editor/engine/commands.ts`（tableAddRow/addCol/
  deleteRow 等 tree op + engine 包装），编辑面可直接消费，无需新内核能力。
- **生成管线与门检就位**：`auto/editor/gen.mjs`（工程模式收割 + DEPLOY）+
  `scripts/assert-editor-gen.mjs`（部署物清单精确匹配）——新增生成组件需同步
  两处清单。

## 详细设计

### 1. BlockComponent 契约（`src/render/block-component.ts`，手写桥，同 highlight.ts 模式）

```ts
export interface BlockEditCtx {
  engine: EditorEngine            // 命令入口（applyOp / commands.ts 链）
  blockId: string
  readonly: boolean               // stream 进行中 = true（v1 裁定）
}
export interface BlockComponent {
  view(node: BlockNode, final: boolean): VNode            // 复用现有 builtin panel
  stream?(node: BlockNode, final: boolean): VNode         // 缺省 = view
  edit?(node: BlockNode, ctx: BlockEditCtx): VNode        // 缺省 = BlockHost 兜底
}
```

- registry 扩展在 `panel-registry.ts`：`registerBlockComponent(kind, comp)` /
  `resolveBlockComponent(kind)`；builtin 兜底 = `{ view: 现有 panel, edit: undefined }`。
- 导出经 `src/render/index.ts`，供 engine editor 与 StreamingRenderer 消费。

### 2. EngineEditor 装配改造（`EngineEditor.vue`）

- `previewNodes`：改为 `engine.doc.children.map(n => renderNodes([n], true)[0])`，
  保留 `node-slot`/`data-block-id`/`data-node-type`/boundary 包装与 onClick
  select（滚动同步契约不动）；wikilink 装饰照旧作用于返回的 VNode 数组。
- 聚焦装配：`resolveBlockComponent(BlockType[node.kind])?.edit` 优先，无则回落
  `BlockHost`（`isEditableLeaf` 判定不变）。

### 3. CodeEditorBlock（手写原型 → .at 化）

- 手写件 `src/editor/components/CodeEditorBlock.vue`：语言标题栏（复用
  `code-block-header` DOM 契约与 `highlight` 桥做编辑态着色可后置，v1 纯文本
  编辑区）+ `<textarea>` 多行代码区（auto-resize，等宽字体）+ 失焦经
  `engine.applyOp` 写回 `node.code`；语言修改走代码块菜单既有 IAL 通道。
- `.at` 源 `auto/editor/code_editor_block.at`；`auto/editor/gen.mjs`
  DEPLOY_COMPONENTS 增行；`scripts/assert-editor-gen.mjs` 部署清单增行；
  生成物与手写件 DOM 对拍（既有 12 部署物 diff 方法论）后删手写件。

### 4. TableEditorBlock

- 手写件直接消费 `commands.ts`（tableAddRow/tableAddCol/deleteRow/deleteTable）；
  单元格文本编辑沿用 BlockHost 协议（cell 即叶块）。.at 化路径同上
  （`auto/editor/table_editor_block.at`）。

### 5. StreamingRenderer 合流

- 内联 `registry`（table）与 `<details>` 分支改为经
  `resolveBlockComponent(kind).stream?.(...)` 解析；markdown 段照旧
  MarkdownRender。调度器参数透传不变。

### 6. stream→edit 只读门控（v1 裁定）

- `BlockEditCtx.readonly = streaming`；编辑面呈现只读态 + 横幅（"流式生成中"）。
  流结束（`streaming=false`）自动解锁。裁定记录写入 ARCHITECTURE §6 修订。

## 测试设计

- **契约单测**（engine vitest，SSR renderToString）：三模式解析优先级
  （注册组件 > builtin 兜底 > BlockHost）；readonly 门控呈现。
- **行为单测**：CodeEditorBlock 编辑→失焦回写（`node.code` 断言 + serialize
  roundtrip）；TableEditorBlock 四向命令链调用后块树断言。
- **回归门**：engine 全量 vitest（当前 271/271 基线）、`pnpm build` 三断言、
  `pnpm gen:editor` 两连跑逐字节一致、demo Playwright e2e 全绿（9 spec 基线，
  已知 `scroll-sync.spec.ts:141` max-scroll 项为历史豁免）。
- **对拍**：.at 生成物 vs 手写原型的 DOM 快照逐字节 diff（021 方法论）。

## 验收标准

- [x] EngineEditor 预览零 `serialize→parseDocument` 往返（代码检索无该调用），
  demo e2e 全绿。
- [x] 聚焦代码块呈现 CodeEditorBlock（标题栏 + 多行代码区），不再是纯文本
  input；编辑回写后 `serialize` 输出含修改后的代码块。
- [x] 聚焦表格呈现编辑面，行列增删经 `commands.ts` 生效且 undo 可回退。
- [x] `BlockComponent` 三模式契约从 `@autodown/engine/render` 公开导出；
  StreamingRenderer 与 EngineEditor 均经 registry 解析。
- [x] CodeEditorBlock / TableEditorBlock 终态为 `.at` 生成物，
  `assert-editor-gen` 门检含新增部署物，`pnpm gen:editor` 确定性两连跑一致。
- [x] 流式进行中编辑面只读、流结束解锁（单测钉死）。
- [x] EDITOR-CONTRACT.md 冻结面与 `getBlockMap` 契约零破坏。

## 执行步骤

> 约定：工作树 `.worktrees/plan-023-dev`（由 /auto-plan:work 创建）；验证命令
> 均在工作树根执行。`PnTm` = Phase n Task m。

### Phase 0：管道统一（P0）

- [x] P0T1 EngineEditor 预览去 round-trip：改 `autodown/packages/engine/src/editor/components/EngineEditor.vue` 的 `previewNodes`——删除
  `mdBlocks/serialize/parseDocument` 路径，改为对
  `engine.doc.children`（排除聚焦可编辑叶块）逐个 `renderNodes([n], true)`
  并沿用现有 node-slot/data-block-id/boundary/onClick 包装；wikilink 装饰后置。
  验证：`cd autodown/packages/engine && pnpm test`（271+ 全绿）。
  [✅ 已完成] 新增手写桥 `src/render/block-wnode.ts`（BlockNode→WNode，镜像
  convertBlock/serializer 约定——renderNodes 消费的是 WNode 形状，直连需此转换）；
  `previewNodes` 改为 过滤→blockNodesToWNodes→renderNodes(一次，保持 data-node-index
  编号)→decorateWikilinks；EngineEditor.vue 已无 parseDocument 调用；`pnpm test`
  271/271 全绿。
- [x] P0T2 回归门：`cd autodown/demo && npx playwright test`（scroll-sync
  契约重点观察）；不绿则修 P0T1 引入的 DOM 差异。验证：e2e 退出码 0。
  [✅ 已完成] 9/9 全绿（含 scroll-sync:141 历史豁免项，本次也过）。备注：冷
  worktree 首跑需先 `pnpm build` engine（demo 消费 dist），且 vite 首启
  dep-optimize 竞态可致 check-heading 假阴——预热后复跑稳定全绿。

### Phase 1：契约 + 分类型编辑面（P1）

- [x] P1T1 契约类型：新建 `autodown/packages/engine/src/render/block-component.ts`（`BlockComponent`/`BlockEditCtx`/注册表 API：registerBlockComponent/resolveBlockComponent/unregister，含 builtin 兜底）；`src/render/index.ts` 导出。验证：`cd autodown/packages/engine && pnpm test`。
  [✅ 已完成] block-component.ts 落地：三模式契约 + register/unregister/clear +
  canonicalKind（'code_block'→'CodeBlock' 键归一）+ sfcEditSlot 包装 helper +
  editSlotFor；resolve 恒返回可 view 组件（注册槽覆盖、缺省槽落 builtin
  renderNodes 产物）；index.ts 全量导出。pnpm test 281/281。
- [x] P1T2 契约单测：新建 `src/render/__tests__/block-component.test.ts`——三模式解析优先级、未注册回落、导出面冒烟。验证：`npx vitest run src/render/__tests__/block-component.test.ts`。
  [✅ 已完成] 10/10：未注册回落（view 出 panel DOM、stream/edit undefined）、
  edit-only 注册保留 builtin view（P1T5 形状）、view/stream 注册覆盖、
  canonicalKind 键归一互认、index 导出面冒烟。TDD 先红后绿。
- [x] P1T3 EngineEditor 聚焦装配走契约：`EngineEditor.vue` 聚焦分支先查
  `resolveBlockComponent(...)?.edit`，无则回落 BlockHost（`isEditableLeaf`
  不变）。验证：`cd autodown/packages/engine && pnpm test && pnpm build`。
- [x] P1T4 CodeEditorBlock 手写原型：新建 `src/editor/components/CodeEditorBlock.vue`（标题栏 + textarea 编辑区 + 失焦
  `applyOp` 回写 `node.code`）+ `src/editor/__tests__/code-editor-block.test.ts`（回写断言 + serialize roundtrip + readonly 呈现）。验证：`npx vitest run src/editor/__tests__/code-editor-block.test.ts`。
  [✅ 已完成] 新增 CodeEditorController（无头，整段回写 applyTree 一步撤销——
  逐字符 diff op 会把 "\n" 引入文本 op 内核，代码块语义整段更稳）+ SFC
  （code-block-header DOM 契约标题栏 + 自适应 textarea + readonly 横幅/禁用）。
  测试 8/8：回写/undo/roundtrip/无变化 no-op/块已删/SVC SSR 标题栏+readonly 横幅。
- [x] P1T5 装配代码块：在 P1T3 的 edit 槽注册
  `BlockType.CodeBlock → CodeEditorBlock`（`src/editor/index.ts` 或
  EngineEditor 装配处，二选一以不产生循环依赖为准）。验证：`pnpm test` + `pnpm build`。
  [✅ 已完成] 注册在 EngineEditor.vue 的 plain `<script>` 块（script setup 语句
  会编译进 setup()——导入即注册必须用 plain script；BlockInfo 类型导出随之迁入
  plain script 以过双 script 的 vue-tsc）。键为 BlockType 枚举名 'Fence'（即
  代码块类型）。pnpm test 289/289 + build 三断言绿。
- [x] P1T6 TableEditorBlock 手写原型：新建 `src/editor/components/TableEditorBlock.vue`（消费
  `src/editor/engine/commands.ts` 表链；单元格沿用 BlockHost 协议）+ 对应
  `src/editor/__tests__/table-editor-block.test.ts`（四向命令 + undo）。验证：`npx vitest run src/editor/__tests__/table-editor-block.test.ts`。
  [✅ 已完成] TableEditorController（addRow/addColumn/deleteRow/deleteColumn
  各一步撤销 + 护栏：末行/末列不可删；单元格 commitCell 走 diffToOp 协议）+
  SFC（table-node DOM 契约 thead/th+tbody/td + 工具栏 data-te-action 四钮 +
  readonly 横幅）。测试 9/9；EngineEditor plain script 增注册
  Table→TableEditorBlock；全套 298/298 + build 绿。备注：deleteTable 不在
  commands.ts 命令面（验收仅要求行列增删），v1 不做按钮。
- [x] P1T7 CodeEditorBlock .at 化：新建 `autodown/packages/engine/auto/editor/code_editor_block.at`；`auto/editor/gen.mjs` DEPLOY_COMPONENTS 与
  `scripts/assert-editor-gen.mjs` 部署清单各增一行；`pnpm gen:editor` 收割；
  生成物与 P1T4 手写件对拍（DOM 快照 diff）后删手写 SFC，测试改指生成物。验证：`pnpm gen:editor && pnpm gen:editor`（两次逐字节一致）+ `pnpm build`（三断言含新部署物）。
  [✅ 已完成] code_editor_block.at（扁平 chrome props：controller/blockId/
  language/code/readonly；EngineEditor plain script 适配器 fenceEditSlot 做
  node/ctx→扁平 props）+ ext/code_editor_block_ext.ts（focus/resize DOM 桥）；
  gen.mjs 与 assert-editor-gen.mjs 清单各 +1（13 部署物/8 桥）。对拍收敛：类/
  data-block-id/横幅/disabled 逐字节一致，diff 仅编译器固有项（text 节点包
  span、v-model textarea SSR 空内容+mount 回填、attr 顺序）。在档的编译器
  缺口：model var 用 prop 初始化会发射在 defineProps 之前（TDZ）——绕行为
  .Init 回填并在 .at 头注记录。gen 两连跑 md5 一致；test 298/298 + build 绿。
- [x] P1T8 TableEditorBlock .at 化：同 P1T7 路径（`table_editor_block.at`）。验证：同 P1T7。
  [✅ 已完成] table_editor_block.at（扁平 chrome 数据：controller/blockId/
  readonly/header_cells/body_rows——适配器 tableEditSlot 每次 render 从
  BlockNode 拍平 {id,text,cls}；嵌套 v-for 带行/格 key）+
  ext/table_editor_block_ext.ts（blur 事件 dataset 提取桥）。对拍收敛（差异
  同 P1T7 类：span 包裹/attr 顺序）；踩坑在档：.at 视图引用与 prop 声明
  命名必须一致（snake_case），否则 v-for 源 undefined 静默渲染空表。gen
  两连跑 md5 一致（14 部署物/9 桥）；test 298/298 + build 绿。
- [x] P1T9 ARCHITECTURE §6 修订：在 `autodown/packages/engine/ARCHITECTURE.md` §6 增补 BlockComponent 三模式契约边界（手写平台层/生成 chrome 层归属、
  readonly 裁定、P2 行内 WYSIWYG 缺口显式在册）。验证：文档存在且被 build
  门检不依赖（`pnpm build` 仍绿）。
  [✅ 已完成] §6 新增"BlockComponent 三模式契约（plan 023）"小节：三槽位
  语义/键归一、编辑面 SFC 归 chrome 层 vs 控制器+适配器归平台层的归属线、
  readonly v1 裁定（备选方案不取）、行内 WYSIWYG 与嵌套块单元格缺口在册；
  部署物计数更新 12→14、ext 桥 7→9。build 三断言绿。

### Phase 2：流式合流（P3）

- [x] P2T1 StreamingRenderer 接契约：改 `autodown/packages/engine/src/render/StreamingRenderer.vue`——内联 `registry`（table）与
  `<details>` 分支改经 `resolveBlockComponent(kind).stream`；markdown 段与
  调度参数不动。验证：`cd autodown/packages/engine && npx vitest run src/render/__tests__/streaming-details.test.ts src/render/__tests__/streaming-highlight.test.ts`。
  [✅ 已完成] stream 槽经 streamSlotOf 解析（json 组件块按 componentType、
  details 段按 'details'；槽接收段载荷 + 对应 final 语义），注册覆盖内置
  分支、未注册走原生 details/StreamingTable 不变；markdown 段与调度参数
  未动。既有 9 测试全绿 + 新增 streaming-component-slot.test.ts 4 例钉死
  路由（含 markdown 段永不解析）。调研在档：组件段仅来自 ```json 围栏
  组件块（streaming 协议），markdown 表不触发。
- [x] P2T2 stream→edit 只读门控 v1：`BlockEditCtx.readonly = streaming` 贯通
  （EngineEditor 装配层传参 + CodeEditorBlock/TableEditorBlock 只读呈现 +
  横幅）；新增/更新单测钉死语义。验证：`npx vitest run src/editor/__tests__/code-editor-block.test.ts src/editor/__tests__/table-editor-block.test.ts`。
  [✅ 已完成] EngineEditor 增 `streaming?: boolean` prop（缺省 false），装配
  call site 以 `readonly: props.streaming === true` 注入 BlockEditCtx（两编辑
  面适配器透传）；编辑面只读呈现/横幅/disabled 为 P1T4-P1T8 既有产物。新增
  4 例装配级测试钉死（code/table × streaming true/false）。21/21 绿。
- [x] P2T3 消费端验证：`cd autodown/demo && npx playwright test`；`cd jade-garden/front && pnpm build`（消费 engine link 不回归）。验证：两者退出码 0。
  [✅ 已完成] engine dist 重建（14 部署物/9 桥）后 demo e2e 9/9 全绿（含
  scroll-sync:141，其抖动性已在 P1 折叠前单独排查：左右面板 DOM 与
  maxScroll 双边逐字节一致，失败为在册豁免项的点击映射抖动）；jade-garden
  front `pnpm build` 绿（link: 相对路径消费 worktree engine，验证有效）。
  两者退出码 0。

### 收尾

- [x] P3T1 全量门：engine `pnpm test && pnpm build`、demo e2e、`gen:editor`
  确定性两连跑——四门全绿后状态推进 `execution_done`。
  [✅ 已完成] ① engine test 306/306（基线 271 → +35）；② build 三断言绿
  （parser-pure / no-tiptap / editor-gen 14 部署物+9 桥）；③ gen:editor 两连
  跑逐字节一致；④ demo e2e 9/9（scroll-sync:141 过）。状态推进
  execution_done。

## 复审记录

**复审人**：zcode（/auto-plan:review）· **时间**：2026-08-29 18:20 · **结论**：✅ PASS → `reviewed`
（复审在 `.worktrees/plan-023-dev` 内独立复跑验证；分支已随 Phase 0/1/2 分阶段折叠于 master。）

**验收标准逐条复核**（全部 PASS，证据为复审当次实测）：

1. ✅ 预览零 round-trip：`EngineEditor.vue` 无 `parseDocument` 调用（仅注释提及）；
   全 editor 检索唯一残留在 `ext/auto_down_editor_ext.ts:146`——§6 在册 dormant
   桥，实测 dist 无引用（tree-shaken）。demo e2e 9/9。
2. ✅ 聚焦代码块 = CodeEditorBlock（标题栏+textarea）：SSR/装配测试过（含
   `data-block-id`）；回写语义由 CodeEditorController 测试钉死（serialize
   roundtrip 含修改后代码 + 一步撤销）。
3. ✅ 聚焦表格编辑面：四向命令链经 commands.ts 各一步撤销 + 末行/末列护栏，
   TableEditorController 9 测试过。
4. ✅ 契约公开导出（`src/render/index.ts:17-23`，导出面冒烟测试在册）；
   EngineEditor（`editSlotFor`→resolve，:186）与 StreamingRenderer
   （`resolveBlockComponent(kind).stream`，:161）均经 registry 解析。
5. ✅ 两编辑面头部为 Auto-generated 生成物；`assert-editor-gen` 绿（14 部署物
   /9 桥，清单含两新行）；gen:editor 两连跑 14 文件 md5 全一致。
6. ✅ 流式只读门控：4 例装配级测试（code/table × streaming true/false）钉死
   `streaming prop → BlockEditCtx.readonly → 横幅/disabled`。
7. ✅ 冻结面零破坏：EngineEditor diff 中契约面（root class / data-block-id /
   getBlockMap / node-slot / boundary）零行变更；demo e2e 全绿佐证。

**复审独立全量门**：engine vitest 306/306 · build 三断言 · gen 确定性 ·
demo e2e 9/9 · jade-garden front build ✓（五门全绿）。

**遗漏/延后/workaround 清查**：
- 无未声明延期；行内 WYSIWYG 与嵌套块单元格为计划文本明载的 v1 边界
  （非执行期悄悄砍范围）。
- 在档 workaround（2 项，根因均在 auto-lang 仓，记为跨仓债务候选）：
  ① model var 用 prop 初始化发射于 defineProps 之前（TDZ）——绕行为
  `.Init` 回填，副作用为 textarea SSR 空内容（mount 填充）；
  ② .at 视图成员引用与 prop 命名不一致时静默渲染空 v-for（无校验）——
  本计划靠命名约定规避（snake_case）。
- 计划↔代码偏差（无害）：P0T1 字面未列 block-wnode.ts 桥文件，因
  renderNodes 消费 WNode 形状而必须新增，语义目标（单一管线零重解析）达成。

**spec-impact**：本仓无 spec 账本（docs/specs 不存在，起草时已记录后端
不可用）——supersedes/new_spec/touched_goals 留空不猜；持久裁定已落于
`ARCHITECTURE.md` §6（BlockComponent 三模式契约小节）。

**待澄清三项维持开放**（计划起草时的 v1 取舍已按草案实现并落档，留用户
否决权）：stream→edit 只读裁定 / 编辑态语法着色后置 / 嵌套块单元格深度。

## 待澄清事项

- [ ] stream→edit v1 只读裁定是否认可？（本计划按"流式中只读 + 横幅"起草；
  备选：流式中编辑自动转 final 并截断流——交互更激进，改动面大）
- [ ] CodeEditorBlock 编辑态是否需要编辑区语法着色（v1 起草为纯文本编辑区，
  着色可复用 highlight 桥后置——涉及 textarea 叠加层方案，预算另计）？
- [ ] 表格单元格里嵌套块（多段落单元格）在 TableEditorBlock v1 的支持深度：
  起草为仅文本单元格可编辑，嵌套块单元格保持预览态（016 模型支持嵌套，
  交互复杂度单独评估）。
