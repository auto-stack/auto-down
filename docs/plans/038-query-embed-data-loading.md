# [PLAN-038] Query/Embed 数据装载接通——loader 通道 + attrs 归位 + 双块家族收官

---
plan_id: PLAN-038
status: reviewed
feature_name: runQuery/loadBlock 注入通道（props→extension.options→node view 四态装载）+ block-wnode Query attr 修复 + embed src 语义归位 + Query/Embed 家族 widget 收官（17 kind 家族化闭环）+ demo mock 与 jade 点亮验证
author: [zhaopuming]
created_at: 2026-09-01
updated_at: 2026-09-01

# /auto-plan:review 填定（merge 时沉淀）
supersedes_spec_components:
  - "P026-2: 修改——挂载宿主协议数据面收口（extension.options 恒空点接通 → data-loaders 模块槽；Query/Embed node view 退役，挂载协议桥留存平台层）"
  - "P033-2: 修改——BlockWidget 家族机制收官注记（Query/Embed 转 panelOf，17 kind 全员家族闭环）"
  - "P032-2: 修改——stream 裁定 A 延伸（loader 只在 final 触发，流式中 query/embed 为占位骨架零装载）"
new_spec_components:
  - "P038-1..6: 新增——loader 通道（RunQueryFn/LoadBlockFn + QueryResultEnvelope/EmbeddedBlock 信封 + 声明才拥有所有权）/ Query·Embed 家族 widget（四态·三态装载 + parseEmbedSrc 三形）/ block-wnode query 桥 / 三源退役与 gen 清单 / demo mock + jade 点亮 / 契约三件（EDITOR-CONTRACT §10 + ARCHITECTURE §5/§6 + DEBTS 026①·020·021）"
touched_goals:
  - "P026-2: 挂载宿主协议数据面收口（node view 面全部收官，装载通道在册）"

current_step: 10
total_steps: 10
---

## 变更摘要

销 DEBTS 026①（"Query/Embed 数据装载未接——nodeViewProps 的
extension.options 恒空"，用户原裁定"常规组件全实现后再考虑"，036/037
后条件成熟）。调研结论：**链路两端就绪，中段断线**——

- 装载协议早已实现：`query_block_node_view.at` / `block_embed_node_view.at`
  具备完整四态异步装载（loading/error/results/empty，async/await +
  try/catch/finally），从 `extension.options.runQuery / .loadBlock` 取
  注入；
- 消费端早已就绪：jade-garden `EditorTab.vue` 已把 `:loadBlock/
  :runQuery/:assetUpload` 传给编辑器（EDITOR-CONTRACT 在册 props）；
- 后端求值器早已就绪：jade `/api/query`（plan 022 query.at 双发射，
  `QueryResponse{results}` 信封与 normalizeQueryResults 形状吻合）；
- **断线三处**：① EngineEditor（= 导出的 AutoDownEditor）不声明
  runQuery/loadBlock/assetUpload props（jade 传入即 attrs 落地无声
  丢弃）；② `node-view-host.ts:127` `extension: { options: {} }` 恒空
  （注释在案：026 范围外）；③ 两处 attrs 错位——block-wnode 的
  QueryBlock case 全 null（**query 文本在模型→WNode 桥上丢失**）、
  embed node view 读 `attrs.raw/title/blockId` 而方言与 roundtrip 携带
  的是 `attrs.src`（siyuan 时代旧形状）。

本计划四段：

**P1 loader 通道**：props 声明 → 模块级 loader 注册（宿主窗口同模式）→
`nodeViewProps` 的 `extension.options` 装填。最小路径即可点亮 jade 现有
传入（jade 侧零改动）。

**P2 attrs 归位**：block-wnode QueryBlock case 补 query（镜像 parser 的
content 槽）；embed 语义裁定（待澄清③）——`attrs.src` 为正典（roundtrip
已在册），title/blockId 由 src 派生（ext helper `parseEmbedSrc`），
旧 `raw` 形状退役。

**P3 家族收官**：Query/Embed 转 `query_block_widget.at` /
`embed_block_widget.at` 家族 widget（033 模式，吸收两个 node view 的
四态装载与 normalizeQueryResults/query 归一 ext），nodeViewPanel 注册
→ panelOf；**17 kind 家族化闭环**（037 Table 后仅剩此两件）；顺手处置
dormant 的 `wiki_link_node_view.at` 源（036 wikilink 模型化后无双轨，
源退役销挂账）。

**P4 验证**：demo mock runner（固定结果/空/错三态）+ e2e；jade 点亮
验证（既有 props 零改动生效）；EDITOR-CONTRACT §数据通道平台面
（loader 签名/信封形状/VM host-bridge 映射——022 vm_server 先例口径）。

**不做的**：Query/Embed 的 edit 面（query 文本就地编辑 via AttrHost，
待澄清②后置）；assetUpload 粘贴图片链路（待澄清①，倾向独立小计划）；
VM 端实现本身；jade 后端任何改动。

## 目标

1. **通道通**：EngineEditor 声明并转发 runQuery/loadBlock props →
   装载四态在 demo/jade 实际驱动；jade 侧零改动点亮。
2. **attrs 无损**：query 文本经模型→WNode 桥不丢（render 路径与编辑
   预览同值）；embed src 派生 title/blockId 的裁定落档，roundtrip
   金标零变化。
3. **家族闭环**：Query/Embed 两件家族 widget；两个 node view 与
   wiki_link dormant 源退役；gen 清单同步（17 kind 全员单 widget）。
4. **契约在册**：EDITOR-CONTRACT §数据通道平台面（签名/信封/VM
   host-bridge 映射）；DEBTS 026① 销号。

## 架构方案

```
P1 loader 通道（手写平台层）
src/editor/engine/node-view-host.ts
├─ 模块级 loader 槽：setDataLoaders({ runQuery?, loadBlock? }) /
│   getDataLoaders()（宿主窗口栈同模式；EngineEditor props watch 更新）
└─ nodeViewProps：extension.options = { runQuery, loadBlock }
   （现 {options:{}} 恒空点改注）
src/editor/components/EngineEditor.vue
└─ props 增 runQuery?: (q: string) => Promise<QueryResultEnvelope>
   loadBlock?: (id: string) => Promise<EmbeddedBlock | null>
   （类型 engine 出口导出；watch → setDataLoaders；undefined 即回落
   "No query runner configured" 现占位语义）

P2 attrs 归位
src/render/block-wnode.ts
└─ QueryBlock case：attrGetStr(node.attrs,'query','') → WNode content
   槽（镜像 parser queryNode；Embed case 已在册 src 槽，不动）
auto/editor/ext/embed_ext.ts（随 P3 widget 桥）
└─ parseEmbedSrc(src) → { title, blockId }（"title"/"title#^id"/"^id"
   三形，待澄清③裁定）——widget computed 消费，旧 attrs.raw 缺省
   "![[Untitled]]" 退役

P3 家族收官（chrome 层 .at 单源）
auto/editor/query_block_widget.at   四态装载 + mode（view=结果面板 /
                                   stream=final 前占位骨架（032 裁定 A）/
                                   edit=v1 无（非 editable leaf 维持））
auto/editor/embed_block_widget.at   同型（loading/error/block 三态 +
                                   display_label 派生）
auto/editor/ext/{query,embed}_widget_ext.ts
   normalizeQueryResults / errorMessage / parseEmbedSrc 迁入归一
src/editor/components/EngineEditor.vue
└─ registerPanel('Query'/'Embed', nodeViewPanel(...)) → panelOf(widget)；
   旧 QueryBlockNodeView/BlockEmbedNodeView（.at 源+产物）退役；
   wiki_link_node_view.at dormant 源处置（退役）
P4 验证与契约
demo/src/{content.ts, mockLoaders.ts} + e2e 四态断言
EDITOR-CONTRACT §数据通道平台面 + ARCHITECTURE §6 家族闭环注记
```

**装载时机与 stream 裁定**：loader 只在 final 触发（032 裁定 A 的
延伸——流式中 query/embed 是占位面板，final 成块后 .Init 装载一次；
query attr 变更 watch 重载语义保留）。**为何模块级注册而非逐层 props**：
nodeViewProps 的 fabricator 深处无组件树上下文（宿主窗口栈同问题的
既有解），模块级槽 + EngineEditor watch 是最小面；纯渲染消费面
（StreamingRenderer）后续同经 setDataLoaders 受益（待澄清④）。

## 技术栈

- Auto widget DSL（gen:editor 管线；async/await + try/catch 探针级
  能力已在两 node view 验证）
- 既有四态装载协议与 normalizeQueryResults（迁移不改语义）
- demo mock + jade e2e（零改动点亮验证）

## 需求分析与背景调查

（来源：.autoos/specs.json 总览、DEBTS.md、engine/jade-garden 源码
核查 2026-09-01；前置 = PLAN-036 merge（node_view_ext 现状）+
PLAN-037 merge（gen 清单与家族机制基线）硬依赖，两者均在收口）

- 断线三处证据：EngineEditor props 无 runQuery/loadBlock（grep 证，
  仅 extraSlashItems 在册）；node-view-host.ts:125-127 注释"Query/Embed
  widgets read extension.options.runQuery/.loadBlock — the data-loading
  surface is out of plan 026 scope"；block-wnode.ts QueryBlock case
  全 null 对照 parser queryNode(content 槽)。
- 消费端证据：jade EditorTab.vue:78-80/108 传 :loadBlock/:runQuery/
  :assetUpload；api.ts runQuery → /api/query（QueryResponse 信封，
  api_gen 为 022 a2ts 契约产物）；loadBlockFn 在 editor_tab_ext
  （id → 块装载闭包）。
- 形状对齐：normalizeQueryResults 读 `res.results`（信封）→
  { marker, priority, priority_label, content, source } —— jade
  QueryResponse 同构；EmbeddedBlock = { title?, content }（node view
  读 .block.content/.title）。
- embed 方言现状：$embed(src: "..")（030）；serializer 对称；node view
  旧形状 raw/title/blockId 为 siyuan 时代移植残留（original
  "![[Untitled]]" 缺省）。
- 家族现状：037 Table 落地后 17 kind 中仅 Query/Embed 两件非家族
  （nodeViewPanel 挂载）；wiki_link_node_view.at 为唯一 dormant 源
  （036 模型化 + 装饰器退役后无双轨）。
- spec 支点：P026-2（挂载宿主协议——本计划是其数据面收口）、
  P033 家族机制（收官注记）、P032（stream A 裁定延伸）。
- DEBTS 对账：026① 销号；026③ 姊妹清理（wiki_link dormant 源）；
  020 行"余量仅剩 Query/Embed 数据装载"销账收官。

## 详细设计

### D1 类型与通道（P1）

```ts
// src/editor/engine/data-loaders.ts（新）
export interface QueryResultItem { marker?: string; priority?: number;
  content: string; title?: string; page_path?: string }
export interface QueryResultEnvelope { results: QueryResultItem[] }
export interface EmbeddedBlock { title?: string; content: string }
export type RunQueryFn = (q: string) => Promise<QueryResultEnvelope>
export type LoadBlockFn = (id: string) => Promise<EmbeddedBlock | null>
setDataLoaders / getDataLoaders  // 模块级槽（undefined 回落占位语义）
```

- EngineEditor：props 增两函数 + `watch(() => [props.runQuery,
  props.loadBlock], …, immediate)` → setDataLoaders；出口
  `./editor` 导出四类型。
- nodeViewProps：`extension: { options: { runQuery, loadBlock } }`
  （getDataLoaders()）。

### D2 attrs 归位（P2）

- block-wnode QueryBlock：`content: attrGetStr(node.attrs,'query','')`
  ——镜像 parser；render 路径（无 back-link 的静态 fallback）即刻受益。
- embed：attrs.src 保持正典（roundtrip 金标零变化）；title/blockId
  派生进 widget（D3），node view 旧 attrs.raw 读取面随家族化消亡。

### D3 家族 widget（P3）

- `query_block_widget.at`：props（mode/controller/blockId/readonly/
  final/query str）+ 四态装载（.Init + watch query——现 node view 的
  双载体重制 idiom 原样迁）；结果列表 DOM 契约逐字节对齐现
  QueryBlockNodeView（.query-results 链与 class 面 e2e 可能依赖）。
- `embed_block_widget.at`：props + parseEmbedSrc 派生
  display_label/blockId；装载/错误/块三态。
- ext 桥：normalizeQueryResults/errorMessage/parseEmbedSrc 归一
  （node_view_ext 相应导出收缩——036 已开始该文件瘦身）。
- 注册：panelOf 两件 + registerBlockWidget（edit 槽 v1 不注册，
  isEditableLeaf 语义不变）。

### D4 契约段（EDITOR-CONTRACT 增）

- §数据通道平台面：RunQueryFn/LoadBlockFn 签名、QueryResultEnvelope
  信封、EmbeddedBlock 形状、"loader 只在 final 触发"时序约定、VM
  host-bridge 映射注记（vm_server jade.api 同模式，022 先例）。

## 测试设计

- **零改动回归（硬验收）**：serializer-roundtrip / parse_parity 全量
  （attrs 零变化守卫）；render.test.ts extension panels 段（Query/Embed
  占位面）；demo 既有 e2e 全量；jade e2e（零改动点亮——Query 页/
  含 $query 文档渲染结果）。
- **新增单测**：data-loaders 通道（注册/回落/props watch 更新）；
  parseEmbedSrc 三形；block-wnode query 桥（attrs→content 槽）；
  两 widget 四态（mock loader resolve/reject/空/not-found）。
- **e2e 增**：demo mock 装载四态断言（query 三态 + embed 三态）+
  final 触发时序（流式中不装载）。
- **gen**：两连跑字节确定；清单断言。

## 验收标准

1. jade 传入的 :runQuery/:loadBlock 零改动生效（jade e2e 或手验截图
   佐证 Query 结果渲染）；demo mock 四态 e2e 绿。
2. block-wnode query 桥修复有单测；roundtrip 金标零改动通过。
3. 17 kind 家族化闭环（两 widget 上、三源退役——两 node view +
   wiki_link dormant）；gen 清单/assert-editor-gen 同步冻结；
   ARCHITECTURE §6 收官注记。
4. EDITOR-CONTRACT §数据通道平台面在册；DEBTS 026① 销号。
5. embed src 语义裁定落档（三形 + 派生规则），待澄清③结论记入。

## 执行步骤

- [x] T1 `src/editor/engine/data-loaders.ts` 类型 + 模块槽 + 出口
      导出 + 单测（注册/回落/watch）；验证：`pnpm --filter
      @autodown/engine test -- data-loaders` 绿。
      [✅ 已完成] data-loaders.ts（setDataLoaders/getDataLoaders/withDataLoaders + 四类型经 engine barrel 与 ./editor 出口）+ data-loaders.test.ts 5 例绿（ba8d644）
- [x] T2 EngineEditor props 两函数声明 + immediate watch →
      setDataLoaders；node-view-host extension.options 装填（恒空点
      改注）；验证：单测（options 注入形状 + undefined 回落）绿。
      [✅ 已完成] props+immediate watch+卸载回落（wikilink 同款 identity guard）；nodeViewProps options 装填；测试 10 例绿（含 happy-dom 挂载 EngineEditor 三例）（4d5d52d）
- [x] T3 `src/render/block-wnode.ts` QueryBlock case 补 query content
      槽 + 单测（attrs→桥→fallback 同值）；验证：render.test.ts
      零改动 + 新单测绿。
      [✅ 已完成] content 槽补装 + node-view-mount 增三例绿；render.test.ts/markdown-parity/serializer-roundtrip 全绿零改动（9628740）
- [x] T4 `auto/editor/query_block_widget.at` + ext（四态装载迁移，
      DOM 契约逐字节对齐现 node view）；验证：gen 两连跑 + mock 四态
      单测绿。
      [✅ 已完成] query_block_widget.at + query_block_widget_ext.ts（queryRunner/loader 槽读 + normalizeQueryResults/errorMessage 归一）+ final 门控（032 A：final=false 骨架不装载）；gen 两连跑字节确定；mock 四态 7 例绿；guard 清单同步 19 产物/15 桥（f7f1179）
- [x] T5 `auto/editor/embed_block_widget.at` + ext（parseEmbedSrc 三形
      派生 + 三态）；验证：gen 两连跑 + parseEmbedSrc/三态单测绿。
      [✅ 已完成] parseEmbedSrc 三形（title / title#^id / ^id）+ 锚定装载（页面级引用渲染 label 面零装载）+ final 门控 + 根 data-block-id 退役（防 [data-block-id] 块图污染）；gen 两连跑确定；单测 14 例绿；guard 20 产物/16 桥（a952593）
- [x] T6 装配切换：panelOf 两注册 + 两 node view（.at 源/产物）+
      wiki_link_node_view.at 退役 + node_view_ext 导出收缩 +
      `scripts/assert-editor-gen.mjs` 清单同步；验证：guard 零退出 +
      engine build 绿。
      [✅ 已完成] panelOf(QueryBlockWidget/EmbedBlockWidget) + panelOf fallback 增 query/embed 形；三源三产物退役、node-views/ 目录消失；node_view_ext 收缩至 NodeViewWrapper/Content+KEY；gen 19 源/17 产物/16 桥；guard+四断言 build 绿；engine 全量 762 例绿（687a826）
- [x] T7 demo：`mockLoaders.ts`（固定结果/空/reject/not-found 四路）+
      content.ts 增 `$query`/`$embed` 样例 + e2e 四态断言（含流式中
      不装载时序）；验证：`pnpm --filter demo exec playwright test`
      全量绿。
      [✅ 已完成] mockLoaders 四路+调用记录（window.__mockLoaderCalls）入口注册；content 六样例；e2e 8 例绿——四态+左右双面+流式时序（流开=骨架零装载、final 恰一次）；全量 58 例绿；附带修复：EngineEditor 无 props 时 immediate watch 清洗外部注册（T7 抓获，watch 精化为"声明才拥有"语义+回归单测）（d695020）
- [x] T8 jade 点亮验证：jade e2e 全量（或含 Query 文档手验截图），
      预期零改动通过；验证：jade e2e 绿 + 截图留档。
      [✅ 已完成] jade e2e 21/23 绿（2 例日期依赖 flashcard 用例 master 同败，与本计划无关——主页仓实测对照）；手验探针：probe 工作区 Query Demo.ad 经既有 :runQuery/:loadBlock props 渲染真实 /api/query 结果与 /api/blocks 嵌入块，断言全过后截图留档 docs/plans/attachments/038-jade-query-lit.png；jade 代码零改动（f982409）
- [x] T9 EDITOR-CONTRACT §数据通道平台面 + ARCHITECTURE §6 家族闭环
      注记 + DEBTS（026① 销号 / wiki_link dormant 清理 / 020 行收官
      改写）；验证：文档 diff 复核。
      [✅ 已完成] EDITOR-CONTRACT §10（10.1 签名信封/10.2 声明才拥有/10.3 final 时序/10.4 三形表/10.5 VM 映射）+ §3 props 注记；ARCHITECTURE §5/§6（17 部署物/19 源/16 桥、node-views/ 消失、17 kind 闭环、推广边界销项）；DEBTS 026①/020/021 三行；diff 复核通过（2d986b2）
- [x] T10 全量回归：engine test + build（四断言）+ demo playwright +
      IME 三例复跑（装载重构不触 IME 面，例行）；验证：全绿。
      [✅ 已完成] engine 763/763 + build 四断言全绿（parser-pure/no-tiptap/editor-gen 17 产物 16 桥/dist-stamp）；demo playwright 全量 58/58；IME CDP 三例 3/3（preedit 跟随/上屏双落/候选回基线，034 T8 口径复跑）；留档截图两帧随回归副产物更新（0d5bbc1）

## 复审记录

（/auto-plan:review 填定）

- **复审人/时间**：ZCode（/auto-plan:review），2026-09-01，于
  `.worktrees/plan-038-dev` 全量重跑验证（不信任绿勾，逐项重证）。
- **全量门禁（复审重跑）**：engine 763/763 全绿；engine build 四断言
  全绿（parser-pure / no-tiptap / editor-gen 17 产物 16 桥 /
  dist-stamp 89667c5c…）；demo playwright 全量 58/58 绿。
- **验收① PASS**：jade 侧零改动实证（`git diff e85c791..HEAD --
  jade-garden` 空输出）；手验探针经既有 :runQuery/:loadBlock props
  渲染真实 /api/query 结果与 /api/blocks 嵌入块（DOM 断言全过后截图
  docs/plans/attachments/038-jade-query-lit.png）；demo mock 四态
  e2e 8 例绿（query-embed-loading.spec.ts，含流式时序断言）。
- **验收② PASS**：block-wnode query 桥单测三例在册
  （node-view-mount.test.ts"query text through the model→WNode
  bridge"）；serializer-roundtrip / parse-parity 全量绿零改动
  （763 之内）。
- **验收③ PASS**：assert-editor-gen 17 chrome 产物 sourced / 16 ext
  桥 in sync；三源三产物物理缺席（auto/editor 无 node_view 源、
  src/editor/node-views/ 目录不存在）；ARCHITECTURE §6 收官注记在册
  （"17 kind 全员家族 widget 闭环"）。
- **验收④ PASS**：EDITOR-CONTRACT §10 数据通道平台面在册（10.1-10.5
  五节）；DEBTS 026① 销号行在册。
- **验收⑤ PASS**：embed src 三形表落档（EDITOR-CONTRACT §10.4）；
  待澄清③ 结论记入计划（含执行期落定四项 + 新增裁定⑤）。
- **遗漏/延后/workaround 猎获**：无阻塞项。三项非阻塞注记：① embed
  widget 根 data-block-id 退役与 data-node-view-wrapper 标记退役为
  计划内 DOM delta（widget 头注 + 契约 §10.4 明示，query 结果链
  逐字节对齐不受影响）；② T7 执行期发现并修复"空 props immediate
  watch 清洗外部注册"缺陷，精化为「声明才拥有」语义（超计划文本的
  缺陷修复，契约 §10.2 + 回归单测冻结）；③ 复审期发现 master 已被
  并行会话推进（036/037 merge，触碰 ARCHITECTURE/EDITOR-CONTRACT/
  DEBTS/guard 清单等同面文件）——本分支基于 e85c791，折入时
  /auto-plan:merge 需解交叠冲突（非计划缺陷，移交 merge 处置）。
- **结论**：五条验收全 PASS，路由 `status: reviewed`，待
  /auto-plan:merge。

## 待澄清事项

1. **assetUpload 是否入本计划**（建议：不入，独立小计划）——第三个
   未接通 props，但链路是"粘贴图片→上传→image span 重写"，涉及
   RichTextHost paste 面，与本计划 loader 通道不同族；先在本计划
   契约段登记形状占位。
   —— 执行期落定：未入（EDITOR-CONTRACT §3 注记"在册未接，另行立项"）。
2. **Query/Embed edit 面**（建议：后置）——query 文本/ embed src 的
   就地 attr 编辑（AttrHost 模式）是体验增强，装载通后再评估；
   v1 维持"非 editable leaf"语义（聚焦即预览面）。
   —— 执行期落定：后置维持（isEditableLeaf 不变，edit 槽未注册）。
3. **embed src 方言格式**（需裁定）：建议三形——`"title"`（页面级
   引用）/ `"title#^blockId"`（块锚）/ `"^blockId"`（当前页块锚，
   上下文补全）——display_label 派生规则与 roundtrip 无关（attrs.src
   原样守恒），仅装载与显示层消费。
   —— 执行期落定（T5）：三形照建议落地，parseEmbedSrc 单一正典
   （EDITOR-CONTRACT §10.4 表格在册）；页面级引用渲染 label 面零装载
   （jade 装载通道按块 id 键控）。
4. **纯渲染消费面**（建议：v1 模块级注册即可）——StreamingRenderer
   是否也开 props（jade 预览窗格传 loader）；模块级槽已可服务，props
   化等首个真实消费诉求。
   —— 执行期落定：v1 模块级注册（demo 右栏静态渲染 + stream harness
   均经槽点亮并 e2e 在册）。
5. **执行期新增裁定（T7 抓获）**：EngineEditor 的 loader watch 精化为
   「声明才拥有」——无 props 的编辑器不得清洗既有模块槽注册（demo
   入口注册被空 props immediate watch 覆盖的回归，e2e 抓获后冻结为
   契约语义，EDITOR-CONTRACT §10.2 + 回归单测在册）。
