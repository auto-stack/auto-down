# [PLAN-033] 三模式共享 chrome——Fence/Math/Mermaid 试点"一 kind 一 widget"与家族注册机制

---
plan_id: PLAN-033
status: archived
feature_name: BlockWidget 家族机制（一 kind 一个三模式 .at widget：view/stream/edit 同 chrome）+ Fence/MathBlock/Mermaid 三类试点合流 + builtin 双面退役
author: [zhaopuming]
created_at: 2026-09-01
updated_at: 2026-09-01
# 2026-09-01 二次开工：前置 031/032 已 merge 归档，待澄清⑤阻塞解除

# /auto-plan:review 填定（merge 时沉淀）
supersedes_spec_components:
  - "P031-3（architecture）：chrome 部署物层描述改写——031 的 16 部署物/11 ext（MathEditBlock/MermaidEditBlock/两 NodeView/三 ext 桥）被 033 家族化替换为 14 部署物/11 ext（三 *_BlockWidget + 三 *_widget_ext），Codeblock 面板 builtin 退役改 custom 槽"
  - "P031-4（designs）：math/mermaid 编辑面设计条目改写——MathEditBlock/MermaidEditBlock 两件设计合入 MathBlockWidget/MermaidBlockWidget 家族设计（行为契约不变：blur 整段提交/同步·debounce 预览/readonly 横幅/工件 final-put，031 e2e 零改动通过为证）"
new_spec_components:
  - ".autoos/specs.json 六节 P033-1..6: BlockWidget 家族机制与三试点合流——P1 机制（src/render/block-widget.ts：registerBlockWidget 三槽包装 + panelOf 面板面 + WNode 静态回退含 loading 槽；block-widget-panels.ts 经 render-node 副作用导出注册 Codeblock custom 槽，032 StreamingTable 同通道；既有按槽 API 零破坏，机制文件零 diff 复核）；P2 三 widget（auto/editor/{code,math,mermaid}_block_widget.at，261/263/301 行——CodeBlockWidget 吸收 renderCodeblockPanel 字节契约（viewCodeInner 手拼 pre 内层/032 骨架/aria-busy）+ CodeEditorBlock 与 badge 宿主契约，Math/Mermaid 吸收 NodeView+031 编辑面+工件 final-put 随桥迁移）；P3 退役与清单（5 .at+3 ext 桥+5 SFC+renderCodeblockPanel 物理删除；计数执行期冻结 widgets 16/部署物 14（计划稿 15 系笔误）/ext 11；三编译器事实记 .at 头注：多根被包容器/text 产 span/dyn 上 html 非 v-html）；P4 parity 套件（block-widget-parity.test.ts，happy-dom 新 devDep，三 kind×三 mode 容器盒模型/共享件类链/view≡stream 逐项相等，edit 白名单冻结文件头；math/mermaid 容器统一 view 正典值，031 灰底编辑卡退役）；P5 测试与回归（engine 612/612、demo 47/47、render.test 零 diff、e2e 12 spec 零 diff+screenshot.spec 纯追加 90 行留档用例、scroll-sync 109/141 环境性 flake 对 master A/B 同败再次当场取证；执行期抓修一真回归：源码槽模板缩进空白×pre-wrap 致每面 +40px 滚动同步漂移，white-space:normal 修复+块高探针 master 逐块一致）；P6 文档三件（EDITOR-CONTRACT 三行 mode 注记/ARCHITECTURE §6 家族机制段+清单 14/DEBTS 020 家族化改写）+ 三模式对照截图×3"
touched_goals:
  - ".autoos/specs.json P023-2: 统一块组件契约目标——家族机制落地为三槽契约的糖（一次注册三槽+panelOf 双消费面），试点三 kind（Fence/MathBlock/Mermaid）编辑面升级为家族形态（一 widget 三模式同 chrome），目标第 3 条编辑面谱系家族化"
  - ".autoos/specs.json P026-2: 挂载宿主协议目标——③ NodeView 预览挂载面演进：MathBlock/Mermaid 从 NodeView 挂载转家族 widget panelOf 面（NodeView 在挂 3 件），Codeblock 面板经 custom 槽单通道"
  - ".autoos/specs.json P031-2: math/mermaid 编辑面+工件契约目标——行为契约随家族迁移（031 e2e 零改动通过、工件 put 通路在册有测），容器 chrome 家族统一为 view 正典值"

current_step: 8
total_steps: 8
---

## 变更摘要

"完美态"路线图 M1 第二步，也是"三模式样式一致"的**结构解**。现状每 kind
有 2-3 套并行的面实现（样式一致性靠同 class 链 + 人盯）：

| kind | view | stream | edit |
|---|---|---|---|
| Fence | builtin renderCodeblockPanel（TS） | 同 view（final flag） | CodeEditorBlock（.at） |
| MathBlock | MathBlockNodeView（.at） | 同 view | MathEditBlock（.at，031） |
| Mermaid | MermaidNodeView（.at） | 同 view | MermaidEditBlock（.at，031） |
| Table | builtin renderTablePanel（TS） | StreamingTable | TableEditorBlock（.at） |
| Callout/Details | builtin/node view | 同 view | EngineEditor expandedElement（TS）+ AttrHost |

本计划立**家族机制**并试点三类：每 kind 一个 `.at` widget，内部按
`mode: view | stream | edit` 切行为，**chrome（DOM 骨架/class/样式）三态
同一份**——模式间样式漂移从根上不可能。试点范围 Fence/MathBlock/Mermaid
（不依赖 RichTextHost 与递归组合原语，可即行）；Table/容器族推广列待澄清③。

**试点合流**：
- Fence：`CodeBlockWidget`（.at 三模式）吸收 renderCodeblockPanel（退役）
  + CodeEditorBlock（退役）；
- MathBlock：`MathBlockWidget` 吸收 MathBlockNodeView + MathEditBlock
  （两件 031/026 产物合一件，工件契约挂接随迁）；
- Mermaid：同型 `MermaidWidget`。

**兼容面**：render.test.ts 的 DOM 字节契约、EDITOR-CONTRACT 选择器清单、
CodeBlockMenu 的宿主 DOM 契约（`.autodown-codeblock-node[data-language]`
+ language badge）、gen:editor 部署清单（16 → 15：净 -4 +3）——全部逐项
保形，契约测试零改动通过是硬验收。

**不做的**：Table/Callout/Details/Query/Embed 合流（待澄清③，依赖 032
表格归一与递归原语计划）；文本叶子（RichTextHost 计划）；VM 侧。

## 目标

1. **家族机制**：`registerBlockWidget(kind, widget)` 一次注册自动填三槽
   （view/stream/edit 包装成槽位工厂）；既有按槽注册 API 零破坏（P023
   契约不回写）。
2. **三试点单 widget**：Fence/MathBlock/Mermaid 各一件 .at widget 三态
   服务；对应 builtin 面板与旧 widget 退役；gen:editor 部署清单与
   assert-editor-gen 同步。
3. **契约保形**：render.test.ts（含 extension block panels 段）零改动
   通过；demo e2e 12+ spec 零改动通过；EDITOR-CONTRACT 选择器逐项在册
   （新 widget 沿用既有 class 面，不新增选择器）。
4. **三模式 parity 在册**：三试点 kind 的 view/stream/edit computed-style
   parity 测试（chrome 层属性：容器 class 链/边框/排版盒），模式间只允许
   行为差异（编辑态 textarea/横幅），不允许样式差异。

## 架构方案

```
机制层（手写平台层，同 block-component.ts 模式）
src/render/block-widget.ts（新）
├─ BlockWidgetProps { mode: 'view'|'stream'|'edit', node/ctx/readonly/final }
├─ registerBlockWidget(kind, widget)：
│     view  → (node, final)   => h(widget, { mode: final?'view':'stream', node, final })
│     edit  → (node, ctx)     => h(widget, { mode: 'edit', node, ctx })
│  并经 registerBlockComponent 落槽（既有机制复用，非旁路）
└─ 既有 registerBlockComponent 三槽注册不动（家族是糖，不是替代）

试点层（chrome 层 .at 单源）
auto/editor/code_block_widget.at      三模式：view=pre+高亮（吸收 renderCodeblockPanel
                                      DOM 契约）/ stream=开放 loading+闭合 view
                                      / edit=吸收 CodeEditorBlock（textarea+overlay+blur 提交）
auto/editor/math_block_widget.at      view=node-view 预览（katex html 注入+错误横幅）
                                      / stream=final 前骨架 / edit=031 编辑面（同步预览+textarea）
auto/editor/mermaid_block_widget.at   同型（debounce 异步预览三态）
auto/editor/ext/*_widget_ext.ts       合并各自旧 ext 桥（code_editor_block_ext +
                                      node_view_ext 相关导出归一）

装配层
src/editor/components/EngineEditor.vue
├─ fenceEditSlot/mathEditSlot/mermaidEditSlot → registerBlockWidget 三注册替换
├─ registerPanel('MathBlock'/'Mermaid', nodeViewPanel(...)) → 家族 widget 挂载
│   （panel-registry custom 槽，026 同模式；renderCodeblockPanel 退役同通道）
└─ CodeBlockMenu 宿主契约：fenceEditSlot 现有包裹层（badge+data-language）
   保持——edit 槽包装不动，widget 只换内芯

退役清单
builtin-panels.ts：renderCodeblockPanel 删（Codeblock 项经 custom 槽）
node-views/{Math,Mermaid}NodeView.vue + components/{CodeEditorBlock,MathEditBlock,
MermaidEditBlock}.vue 删（gen 部署物清单 16 → 15：-4 旧 +3 新 widget +机制无部署物）
```

**为何 view 模式也进 widget（而不留 builtin TS）**：样式一致的保证物是
"同一份 chrome 源"——view 留在 TS 就仍是两份源两份样式；.at widget 的
view 模式经 panel-registry custom 槽挂载有 026 nodeViewPanel 先例，通路
已验证。

**mode 切换 vs 三 widget**：一 widget 三 mode（推荐）——chrome 状态机
（readonly/loading/error）跨 mode 复用，样式段天然单份；代价是 widget
稍大（约 250-350 行 .at），可接受（现 TableEditorBlock 同量级）。

## 技术栈

- Auto widget DSL（.at 单源，gen:editor 管线，两连跑逐字节确定）
- Vue 3 SFC（生成物）+ panel-registry/block-component（既有挂载机制）
- katex/mermaid（经 031 preview.ts 工件桥，widget 不直接 import）
- Vitest + Playwright（契约保形与 parity 套件）

## 需求分析与背景调查

（来源：.autoos/specs.json 总览、DEBTS.md、engine 源码核查 2026-09-01；
前置 = PLAN-032 merge（三态裁定表与表格单通道是本计划的行为基线）；
PLAN-031 的 MathEditBlock/MermaidEditBlock/工件契约为直接吸收物）

- 双面清单核实（上表）；试点三类的"两套 chrome 同型"程度高——
  code-block-header 契约已在 view/edit 两侧共用（026 P2T2），
  Math/Mermaid 的 node view 与 031 编辑面共用 error 横幅 idiom 与
  preview.ts 桥——合流的迁移面小、收益直接。
- 挂载通路核实：panel-registry custom 槽挂 Vue 组件有 026 nodeViewPanel
  与 031 后 MathBlock/Mermaid 面板两个先例；BlockComponent 三槽
  （P023-2）resolveBlockComponent/stream 槽消费者（StreamingRenderer）
  已在 032 钉死。
- 契约冻结面：render.test.ts 168 行 DOM contract；EDITOR-CONTRACT 全表
  （e2e 依赖的根 class/data 属性/选择器）；CodeBlockMenu 点击契约
  （[data-codeblock-language-badge] + .autodown-codeblock-node）。
- gen 面核实：assert-editor-gen 三断言（头注↔.at 存在性/部署清单精确性/
  ext 桥同步），清单增删须显式改——本计划净 16→15。
- 031 产物吸收边界：MathEditBlock/MermaidEditBlock 退役但
  CodeEditorController 复用关系、readonly 横幅 idiom、工件 final-put
  挂接点全部随 widget 迁移——行为面以 031 e2e 为回归基线。
- VM 关联：三试点的 .at 三模式 widget 是 VM widget 后端（路线图计划 6）
  的首批可编译消费物——本计划是 M2/M3 的结构前置。

## 详细设计

### D1 家族机制（src/render/block-widget.ts）

```ts
export type BlockWidgetMode = 'view' | 'stream' | 'edit'
export interface BlockWidgetProps {
  mode: BlockWidgetMode
  node: BlockNode                 // view/stream：BlockNode；edit：同
  final?: boolean                 // stream 消费
  ctx?: BlockEditCtx              // edit 消费（engine/blockId/readonly）
}
export function registerBlockWidget(kind: string, widget: Component): void {
  registerBlockComponent(kind, {
    view: (node, final) => h(widget, { mode: 'view', node, final }),
    stream: (node, final) => h(widget, { mode: 'stream', node, final }),
    edit: (node, ctx) => h(widget, { mode: 'edit', node, ctx }),
  })
}
```

- 面板侧（StreamingRenderer 右栏/纯渲染消费者）不经 BlockComponent——
  经 panel-registry custom 槽挂同一 widget（`registerPanel(kind,
  panelOf(widget))`，`panelOf` 内部 `h(widget, { mode:'view', node,
  final })`），确保**view 的两个消费面（编辑器预览/纯渲染）也同源**。
- `unregisterBlockWidget` / 测试 teardown 对齐 clearBlockComponents。

### D2 CodeBlockWidget（auto/editor/code_block_widget.at）

- props：`mode str, node Array<str>, ctx Array<str>, final bool,
  blockId str, language str, code str, readonly bool`（扁平 chrome，
  node/ctx 走 Array<str> 宽类型——031 同 idiom）。
- chrome 单份：`.autodown-codeblock-node[data-language]` 容器 +
  `code-block-header`（title=language）+ 主体区。
- view/stream 主体：`pre[data-language]` + 高亮 HTML（经 ext 桥
  renderCodeHighlight，吸收现 renderCodeblockPanel 的 DOM 字节契约，
  含 `.node-slot/.node-content` 包裹层对齐）。
- edit 主体：吸收 CodeEditorBlock 全部（textarea 透明文本 + 高亮
  overlay + blur→controller.commit + .Init focus + readonly 横幅）。
- stream 开放态：loading 骨架（032 契约 class），闭合后走 view 主体。
- CodeBlockMenu 契约：edit 槽的 badge 包裹层留在装配层（fenceEditSlot
  现状不动），widget 内芯替换。

### D3 MathBlockWidget / MermaidBlockWidget

- 同 D2 骨架；主体三态：
  - view：预览区（katex html / mermaid svg 注入）+ 错误横幅 +
    源码 `<pre><code>` 折叠槽（node view 现契约）；工件 final-put 挂接
    （031 enableArtifactStore 通路随迁）。
  - edit：031 编辑面行为原样（math 同步预览 / mermaid debounce 三态 +
    textarea + blur 提交）。
  - stream：final 前骨架，final 后走 view（031 三态钉死的延续）。
- ext 桥归一：`math_block_widget_ext.ts` / `mermaid_block_widget_ext.ts`
  合并 031 的 `*_edit_ext.ts` 与 node_view 相关导出（renderKatexPreview /
  renderMermaidPreview / debounce / focus）。

### D4 退役与部署清单

- 删：`src/render/builtin-panels.ts` renderCodeblockPanel（Codeblock 项
  改 custom 槽）；gen 部署物 CodeEditorBlock.vue / MathEditBlock.vue /
  MermaidEditBlock.vue / MathBlockNodeView.vue / MermaidNodeView.vue
  （+对应 .at 源与 ext 桥）。
- 增：三 widget .at 源 + 三 ext 桥 + 部署物 3。
- `scripts/assert-editor-gen.mjs` 清单 16 → 15（-5 +3：净 -2 SFC；
  ext 9 → 8：-4 旧桥中 code_editor_block_ext 保留改导出名或合并后
  重计——执行期按实际归并数冻结）。
- EngineEditor：三 registerBlockWidget 替换三 edit 槽注册；
  MathBlock/Mermaid 的 registerPanel(nodeViewPanel) 改 panelOf(widget)。

### D5 parity 套件

- `src/render/__tests__/block-widget-parity.test.ts`：三 kind × 三 mode
  mount，computed-style 断言 chrome 层属性（class 链、容器盒模型、
  header 排版）逐项相等（edit 允许的差异白名单：textarea/caret/横幅）。
- demo e2e：既有 12+ spec 零改动回归（契约保形的最终裁判）+ 031 的
  math/mermaid 编辑面 e2e 零改动通过（行为回归）。

## 测试设计

- 单测：家族机制（三槽自动填充/unregister 回落）；三 widget 三 mode
  DOM 契约（对齐 render.test.ts 既有断言形状，**该文件本身零改动**）；
  parity 套件；gen 两连跑字节确定。
- e2e：demo 全量零改动回归；031 extension-blocks.spec.ts（math/mermaid
  编辑行为）零改动通过。
- 对拍：不涉 rust（纯装配层；.at 单源性由 gen 管线保证）。

## 验收标准

1. Fence/MathBlock/Mermaid 三 kind 各仅一件 .at widget 服务三模式；
   旧双面（renderCodeblockPanel/两 NodeView/三 EditBlock）物理删除，
   assert-editor-gen 清单精确同步。
2. render.test.ts、demo e2e 全量、031 行为 e2e **零改动**通过。
3. parity 套件在册：三 kind 三 mode chrome 属性相等（差异白名单外零
   失败）。
4. 家族机制 API 在册（registerBlockWidget/panelOf），既有
   registerBlockComponent/registerPanel 调用零破坏。
5. EDITOR-CONTRACT（试点三 kind 的三模式选择器段——沿用既有 class 面，
   补 mode 语义注记）、ARCHITECTURE §6（chrome 清单/家族机制段）、
   DEBTS（020 编辑态深化行改写为家族化在册）更新完。

## 执行步骤

- [x] T1 `src/render/block-widget.ts` 新建家族机制（D1）+
      `src/render/__tests__/block-widget.test.ts`（三槽填充/teardown/
      panelOf）；验证：`pnpm --filter @autodown/engine test -- block-widget`
      绿。[✅ 已完成] 13/13 绿（三槽 mode 传参/家族覆盖旧 edit 槽/unregister
      回落 builtin/clear teardown/panelOf 回链模型+静态回退 fabricated
      Fence·MathBlock 模型/final 缺省 true/export 面三 API）；vue-tsc -b 零错
- [x] T2 `auto/editor/code_block_widget.at` 新建三模式 widget（D2：先
      view/stream 与 renderCodeblockPanel 字节对拍，后吸收 edit）；
      验证：`pnpm --filter @autodown/engine gen:editor` 两连跑 + 对拍
      测试绿。[✅ 已完成] 两连跑 sha256 一致；对拍 10/10 绿（view 4
      语料 vs builtin 含 032 骨架/stream≡view/edit vs 旧 fenceEditSlot
      归一化字节相等）；vue-tsc -b 零错。执行期发现三编译器事实记入
      .at 头注：多根 view 被包 app 容器（改单根+root_class computed）、
      text 产 span（view 文本走 html: 转义）、dyn 上 html: 非 v-html
      （pre 整段 inner 由 ext 桥 viewCodeInner 构造）；badge 包裹层按
      D2 末段随 widget 内化（DOM 保形，装配层 fenceEditSlot 待 T6 退役）
- [x] T3 `auto/editor/math_block_widget.at` 新建（D3，吸收 node view +
      031 编辑面）；验证：gen 两连跑 + 031 math e2e 用例零改动绿。
      [✅ 已完成] gen 部署 MathBlockWidget.vue + math_block_widget_ext.ts
      （合并 math_edit_ext + node_view 的 renderMathBlockPreview 工件
      final-put）；widget 测试 8/8 绿（view 契约/stream≡view/edit vs 旧
      mathEditSlot 归一化字节相等/readonly/工件 put-恰成功态）；vue-tsc
      零错。031 demo e2e（math 用例）留待 T8 全量回归一并裁判（装配
      切换在 T6，此前旧面仍在位）
- [x] T4 `auto/editor/mermaid_block_widget.at` 新建（D3）；验证：同 T3
      （mermaid 用例）。[✅ 已完成] widget 测试 8/8 绿（view 契约含空源
      双无分支/stream≡view/edit vs 旧 mermaidEditSlot 归一化字节相等/
      readonly/工件 svg put-恰成功态）+ gen 两连跑 sha256 一致 +
      vue-tsc 零错；031 mermaid e2e 留待 T8 全量回归
- [x] T5 ext 桥归一（D3 末段）+ `scripts/assert-editor-gen.mjs` 清单
      16→15 + 旧部署物/旧 .at 源删除（D4）；验证：`node
      scripts/assert-editor-gen.mjs` 零退出 + `pnpm --filter
      @autodown/engine build` 绿。[✅ 已完成]（与 T6 联动落地——build 门
      要求装配切换先行）删除 5 .at + 3 ext 桥（auto+部署副本）+ 5 SFC
      + renderCodeblockPanel；node_view_ext 撤 math/mermaid 两桥（迁
      widget 桥）；计数按待澄清④执行期冻结：widgets 16 / 部署物 14
      （16-5+3，计划稿 15 为笔误）/ ext 11（11-3+3，code_editor_block_ext
      并入 code_block_widget_ext 为家族读取器正典家）；
      assert-editor-gen "14 products, 11 bridges" 零退出 + build 四断言全绿
- [x] T6 `src/editor/components/EngineEditor.vue`：三 registerBlockWidget
      替换 + registerPanel 改 panelOf + builtin-panels renderCodeblockPanel
      退役；验证：render.test.ts 零改动 + engine vitest 全量绿。
      [✅ 已完成] fenceEditSlot/mathEditSlot/mermaidEditSlot 删，三
      registerBlockWidget 注册；MathBlock/Mermaid registerPanel 改
      panelOf(widget)；Codeblock 面经新 src/render/block-widget-panels.ts
      注册（render-node 副作用导入，032 StreamingTable 同通道——保证
      render.test 无 editor 依赖见同面板）；view 槽无 EngineEditor 消费
      者的确认记入（预览列走 renderNodes→panel-registry，无 DOM 变化）；
      engine vitest 601/601 绿（render.test/node-view-mount/artifact-store
      零语义改动——mount 测试 math 行去 data-node-view-wrapper 断言：
      NodeViewWrapper 宿主标记随家族化消失，无冻结契约消费）
- [x] T7 `src/render/__tests__/block-widget-parity.test.ts` 三 kind ×
      三 mode parity（D5）；验证：vitest 绿（差异白名单冻结在测试内）。
      [✅ 已完成] happy-dom（新增 devDep）computed-style 矩阵 11 用例绿：
      math/mermaid 容器盒模型三 mode 逐项相等（为此将容器 chrome 家族
      统一为 view 正典值，031 灰底编辑卡退役）/共享件类名与计算值相等/
      view≡stream 全链相等/fence header 链三态同构+排版相等/032 骨架
      家族键于 attrs；edit 白名单（textarea/caret/横幅/stack 分隔/fence
      容器属消费方 CSS 领地/根类名各由外契约钉死）冻结在文件头注；
      engine vitest 612/612
- [x] T8 文档三件（EDITOR-CONTRACT mode 段 / ARCHITECTURE §6 家族机制
      与清单 15 / DEBTS 020 行改写）+ 全量回归（engine test + build +
      demo playwright 全量）；验证：全绿 + 截图留档（三 kind 三模式
      对照各一张，029 T10 口径）。[✅ 已完成] 文档三件落（EDITOR-
      CONTRACT 三行 mode 注记/ARCHITECTURE §6 家族机制段+清单 14+ext 11
      /DEBTS 020 家族化改写）；全量回归：engine vitest 612/612 + build
      四断言绿 + demo playwright 47/47（scroll-sync 已知环境 flake 对在
      另跑中复现 master 同败在案，终跑全绿）；截图三张留档 demo/e2e/
      screenshots/{fence,math,mermaid}-three-modes.png（screenshot.spec
      常驻用例，harness 取 view/stream + 编辑面取 edit）。执行期发现并
      修复一真回归：math/mermaid 源码槽模板缩进空白 × pre-wrap 致每面
      +40px（滚动同步块对齐漂移，master A/B 块高探针钉死后 white-space
      normal 修复——NodeViewContent 组件渲染本无空白文本节点）

## 复审记录

**复审人**：zhaopuming（/auto-plan:review，2026-09-01）；复审对象 = 工作树
`.worktrees/plan-033-dev`（7 提交，58 文件 +3293/−2290），代码优先于计划文本。

**逐条验收裁决**（全部复现，不信任勾选框）：

1. **PASS** 三 kind 各一件 .at widget（code/math/mermaid_block_widget.at，
   261/263/301 行<待澄清① 400 界）；旧双面物理删除（git rm 5 .at + 3 ext 桥
   ×auto/src 两副本 + 5 SFC + renderCodeblockPanel）；源码零死引用（7 处
   旧名命中均为历史注释，vue-tsc 过）；assert-editor-gen
   "14 products, 11 bridges" 零退出。
2. **PASS** 零改动门：render.test.ts 对 master **零 diff** 通过（612/612 内）；
   demo e2e 12 spec 零 diff、全量 47/47（本复审窗口三跑：47/47、46/47、
   复跑过）；031 行为 e2e（extension-blocks）零改动绿；screenshot.spec
   +90 行**纯追加**留档用例（031 同款先例，既有用例零改动）。scroll-sync
   109/141 为 031 在案环境性 flake 对——本次当场 A/B：分支重跑 109 过、
   master 同刻跑 109 败，非本计划回归。
3. **PASS** parity 套件 11 用例在册绿（全量+定向双跑）；edit 差异白名单
   冻结于测试文件头注。
4. **PASS** 家族 API 在册（registerBlockWidget/unregisterBlockWidget/panelOf
   出口+13 单测）；block-component.ts/panel-registry.ts/两契约测试文件
   **零 diff**；registerBlockComponent('Table')/nodeViewPanel×3 原样在位。
5. **PASS** 文档三件：EDITOR-CONTRACT 三行 mode 注记、ARCHITECTURE §6
   家族机制段+清单 14/ext 11、DEBTS 020 家族化改写。

**遗漏/延后/workaround 猜查**：

- 遗漏：无——8 任务各有对应 diff；D1 的 unregisterBlockWidget 落地有测。
- 延后：Table/容器族/RichTextHost/VM 为计划内显式边界（待澄清③），非静默。
- 债项候选（记录不阻塞）：
  ① viewCodeInner 手拼 HTML 字符串——编译器双缺口所迫（dyn 上 html: 非
  v-html；text 产 span），迁移期已与 builtin 归一化对拍验证字节等价，DSL
  补原生文本发射后可简化；② 源码槽 white-space:normal——根因修复（模板
  缩进空白×pre-wrap 致每面 +40px 滚动漂移），master 块高逐块一致取证；
  ③ 7 处历史注释仍提名退役组件（block-component.ts:9 等纯文案），候选随
  后续计划顺手清；④ happy-dom 新 devDep（parity computed-style 所需）。
- 计划稿偏差（已记录在案）：D2 扁平 props 简化为家族四 props+ext 读取器；
  部署物计数 14（稿 15 系算术笔误，按待澄清④执行期冻结）；badge 包裹层
  按语义内化进 widget edit 面（DOM 保形，CodeBlockMenu 契约 e2e 过）。

**裁决：全部验收 PASS，无阻塞债项 → status: reviewed。**

## 待澄清事项

1. **mode 用 prop 还是三 widget**（建议 prop 单 widget）：单份样式段/
   状态机复用是本计划的目的本身；若试点中发现 .at 对条件分支规模敏感
   （view+edit 合体超 400 行），可退为"chrome 壳 widget + 三主体子
   widget 组合"（.at 组合语法支持度执行期验证）。
2. **renderCodeblockPanel 退役的消费者面**（建议随本计划全切）：
   StreamingRenderer 右栏/markdown 段路径经 palette custom 槽即切；
   若 musk vendor 快照消费 builtin 面有耦合（DEBTS 008 vendor 通道），
   以契约测试零改动作准绳，必要时 Codeblock 面保留薄 re-export 一版
   （标注 deprecated）。
3. **Table/容器族推广是否入本计划**（建议另立计划）：Table 合流依赖
   032 归一终态；Callout/Details/Query/Embed 依赖递归组合原语（路线图
   计划 4）——两者都是独立计划体量，本计划以试点+机制交付为界。
4. **gen 部署物计数口径**（执行期冻结）：ext 桥归并后 9→8 还是 9→7
   （code_editor_block_ext 是否并入 code_block_widget_ext）以实际归并
   为准，guard 清单同步——不影响验收面。
5. **[阻塞 2026-09-01] 前置依赖未就绪，无法开工**：本计划前置 = PLAN-032
   merge（行为基线），但当前 ① PLAN-031 状态 reviewed 而分支
   `plan-031-dev`（f8f4113，T1-T11）**未折入 master**——T3/T4 要吸收的
   MathEditBlock/MermaidEditBlock/工件契约（math_edit_block.at/
   mermaid_edit_block.at/artifact_hash.at）与 031 e2e 用例在 master 上
   不存在（已核 git ls-tree）；② PLAN-032 状态 drafting、current_step: 0，
   完全未执行——T2 的"032 契约 class"loading 骨架无从引用。需先依次
   走 /auto-plan:merge 031 → /auto-plan:work 032 → merge 032，再重启
   本计划的 /auto-plan:work。
