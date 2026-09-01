# [PLAN-035] 容器组合原语 + 容器 chrome .at 化——BlockChildren 孔与四类容器家族 widget

---
plan_id: PLAN-035
status: archived
feature_name: BlockChildren 子块挂载孔（组件组合原语）+ Callout/Details/Blockquote/List 四类容器 chrome 迁 .at 家族 widget + AttrHost .at 化 + expandedElement 收缩退役
author: [zhaopuming]
created_at: 2026-09-01
updated_at: 2026-09-01

# /auto-plan:review 填定（merge 时沉淀）
# 2026-09-01 复审通过（记录见 ## 复审记录 末节）
supersedes_spec_components:
  - "P030-2（goals）：容器 WYSIWYG 目标条目改写——容器编辑面 chrome 自手写单源化入 035 家族：expandedElement 四分支/renderCalloutPanel/renderListPanel/DetailsNodeView/AttrHost.vue（手写版）全部退役，Callout/Details/Blockquote/List 四 kind 各一件三模式 .at widget + attr_host.at 单源接管（summary/title attr 宿主与任务 checkbox 行为契约不变——container-editing/host-protocol/extension-blocks/stream-tri-state 四 e2e 与 render.test.ts 零改动通过为证）；030 的'Callout edit==view CSS 单通道'人盯约定升级为同源事实（callout-block-widget.test view 面 norm 后逐字节全等断言在册）"
new_spec_components:
  - ".autoos/specs.json 六节 P035-1..6: BlockChildren 子块挂载孔（组合原语）+ 四容器家族 .at widget + AttrHost .at 化与旧面退役。要点：BlockChildren.ts children_slot 闭包孔——递归与 epoch 重挂/宿主注册表/焦点路径状态机留装配单点，裸 fragment SSR 对拍/闭包逐渲染求值/epoch 键重挂/teardown 单测在册；attr_host.at + attr_host_ext.ts——AttrHost.vue 语义全量（挂载快照/Enter·Esc=blur 提交/blur 单步 undo+nbsp 归一/version 非聚焦同步），名字冲突使 AttrHost 切片提前、手写版 T2 即退役（文件现为 gen 产物）；四容器 widget 一 kind 一件三模式——view 面与 builtin 面板 norm 后逐字节全等（list 惰态 checkbox/无 start），edit 面活点 checkbox 与 details marker 动词经 container_ext 桥单步 undo，items 走扁平 chrome 数据（TableEditorBlock 边界）；装配切换执行裁定——容器编辑面不走 editSlotFor（childSlot 需 AssemblyCtx 闭包）改 assembleView 焦点路径 containerEditSlot 直挂，Callout/List 面板入 render 侧 block-widget-panels（panelOfContainer+容器 fallback 模型），Details 面板留 EngineEditor（marker 动词需 host 窗 engine），panel-registry 新增 §面板体装饰器窗（闭包孔体 wikilink 装饰通道，renderEmbedded 单 vnode 归一）；gen 重冻结 21 widgets/19 部署物/14 ext bridges（assert-editor-gen 零退出 + build 四断言）；回归 engine vitest 673/673 + demo playwright 48/48 + 零改动六文件（四 e2e spec + render.test.ts + semantics.test.ts）git diff master 空 + parity 套件 9→19 含容器四 kind + container-edit-faces.png 手验留档；文档三件 EDITOR-CONTRACT §8 BlockChildren 平台面+容器四行 mode 注记/ARCHITECTURE §6 部署物 15→19、ext 桥 12→14/DEBTS 026② 容器族销号"
touched_goals:
  - ".autoos/specs.json P030-2: 扩展块解析与容器 WYSIWYG 目标——容器编辑 chrome 单源化入 .at 家族（attr 宿主=attr_host.at、checkbox/marker 动词经 ext 桥单步 undo），'edit==view CSS 单通道'自人盯约定升级为同源事实"
  - ".autoos/specs.json P033-2: BlockWidget 家族机制目标——自三试点推广至容器族（四 kind 一件一 widget + BlockChildren 组合孔 = .at 内嵌组件组合 idiom 第二例 + parity 套件 9→19），家族机制成为容器装配正典"

current_step: 10
total_steps: 10
---

## 变更摘要

"完美态"路线图 M2 第二步：容器块的 chrome 单源化。现状容器编辑装配
全部在手写 TS 里——`EngineEditor.expandedElement`（429 行起）：Blockquote
薄壳、Callout 卡片链（icon+AttrHost 标题+正文）、Details（marker 翻转+
AttrHost 摘要+显隐）、List（ol/ul+li+任务 checkbox 活点）；view 侧又一
套（builtin renderCalloutPanel / renderListPanel / DetailsNodeView）。
本计划按 033 家族模式收编：

**组合原语**：`BlockChildren` 平台组件（TS 手写层，`use { component }`
导入 .at——NodeViewWrapper 同 idiom）——子块递归挂载孔，闭包持有
AssemblyCtx（epoch 重挂/宿主注册表/焦点路径不变），.at chrome 内嵌即
得递归；VM 契约段同步冻结（孔 → 原生递归装配）。

**四类容器家族 widget**（一 kind 一 widget，view/edit 同 chrome，
033 registerBlockWidget/panelOf 机制直用）：
- `callout_block_widget.at`：吸收 renderCalloutPanel（退役）+
  expandedElement Callout 分支；
- `details_block_widget.at`：吸收 DetailsNodeView（退役）+ expandedElement
  Details 分支（marker 点击 → setBlockAttrs open 单步 undo）；
- `blockquote_block_widget.at` / `list_block_widget.at`：薄壳收编
  （list 含任务 checkbox 活点/惰态的 mode 区分；renderListPanel 退役，
  view 惰态 checkbox 进 widget view 模式）；
- `attr_host.at`：AttrHost.vue（74 行 TS SFC）.at 化——attr 读写宿主
  （挂载模型值/blur→setBlockAttrs 一步 undo/Enter·Esc=blur 提交/version
  联动），Callout 标题与 Details 摘要的宿主内件。

**收缩**：expandedElement 四分支 → 家族分派薄壳（或整体退役，assembleNode
直挂 widget）；EngineEditor 净缩 ~180 行。

**不做的**：文本叶子宿主（PLAN-034）；Table 家族化（依赖 032 归一终态
后的行为面复验，独立小计划）；Query/Embed 数据装载（DEBTS 026①）；
VM 端实现。

## 目标

1. **组合原语在册**：BlockChildren 孔组件（props/闭包契约/epoch 语义）
   + VM 契约段（EDITOR-CONTRACT 平台面增补）；.at widget 内嵌先例立。
2. **四类容器单 widget**：Callout/Details/Blockquote/List 各一件 .at
   widget 服务 view/edit（stream 沿 032 裁定 A=面板路径，widget view
   模式即面板）；旧面（renderCalloutPanel/renderListPanel/
   DetailsNodeView/expandedElement 分支/AttrHost.vue）物理退役。
3. **契约零漂移**：container-editing / host-protocol / extension-blocks
   e2e、render.test.ts extension panels 段**零改动**通过；030 钉死的
   "Callout 卡片链 edit==view CSS 单通道"从约定升级为同源事实。
4. **装配收缩**：expandedElement 退役或缩为分派；gen 清单与
   assert-editor-gen 同步（widgets +5、部署物与 ext 桥重计）。

## 架构方案

```
组合原语（手写平台层）
src/editor/components/BlockChildren.tsx（或 .vue 函数组件）
├─ props：children_slot Array<str>（() => VNode[] 闭包，controller-prop
│   宽类型 idiom——装配层构造，闭包持有 AssemblyCtx）
├─ 语义：render 期求值闭包 → 子块 VNode 列表（assembleNode 递归产物）
│   epoch/version 驱动的重挂由闭包捕获的 ctx 天然继承（029 机制不动）
└─ VM 契约：children 孔 = 原生递归装配入口（契约段冻结形状）

容器家族（chrome 层 .at 单源，033 机制直用）
auto/editor/callout_block_widget.at
├─ view：callout-node 卡片链（class/data-callout-type/icon 条件/
│   header+content）+ AttrHost（title）+ BlockChildren 孔
├─ edit：同 chrome，readonly 横幅（streaming）——030"聚焦保卡片"语义
└─ mode: view | edit（stream = view，032 裁定 A）
auto/editor/details_block_widget.at
├─ marker（▼/▶ + 点击 → controller 面动词 open 翻转）+ AttrHost
│   （summary）+ content 显隐 + BlockChildren 孔
└─ 吸收 DetailsNodeView（其 onkeydown.enter/escape 提交语义随 AttrHost 迁）
auto/editor/blockquote_block_widget.at（薄壳）
auto/editor/list_block_widget.at
├─ ol/ul + start 属性 + li（task-item 条件 class + checkbox）
├─ edit：checkbox 活点（点击 → toggleTaskChecked 单步 undo）
└─ view：checkbox 惰态（disabled，renderListPanel 现语义）
auto/editor/attr_host.at
└─ contenteditable 单行 attr 宿主：挂载模型值/blur→setBlockAttrs/
    Enter·Esc=blur 提交/version 非聚焦同步（AttrHost.vue 语义全量）

装配（src/editor/components/EngineEditor.vue）
├─ expandedElement 四分支删除 → assembleNode 容器路径直挂家族 widget
│   （registerBlockWidget('Callout'/'Details'/'Blockquote'/'ListBlock', …)）
├─ renderCalloutPanel/renderListPanel 退役（builtin-panels 删两项，
│   custom 槽 panelOf 挂 widget——033 Codeblock 同通道）
├─ DetailsNodeView registerPanel → panelOf(details_block_widget)
└─ AttrHost.vue 删除（.at 产物接管）

gen 面
└─ 清单：17 widgets（034 后）→ +5 = 22；部署物/ ext 桥按实际归并重计
   （attr 域动词桥合并进各容器 ext 或独立 attr_host_ext——执行期冻结）
```

**为何孔走闭包而非数据化 children**：子块装配依赖 EngineEditor 运行态
（epoch 版本号/宿主注册表/焦点路径/重绘调度），数据化即复制这套状态机；
闭包孔把递归留在唯一装配点，.at 只持 chrome——与 033"controller-prop
扁平 chrome"同哲学（孔是渲染域的 controller）。

## 技术栈

- Auto widget DSL（use-component 组合 idiom + gen:editor 管线）
- Vue 3（BlockChildren 平台组件 + 生成物）
- 既有内核：setBlockAttrs/toggleTaskChecked（命令层，一行不改）
- Vitest + Playwright

## 需求分析与背景调查

（来源：.autoos/specs.json 总览、DEBTS.md、engine 源码核查 2026-09-01；
前置 = PLAN-033 merge 硬依赖（registerBlockWidget/panelOf 机制与 gen
清单基线）；PLAN-034 软依赖（ext 桥 idiom/事件探针结论供 attr_host.at
复用——AttrHost 无 composition 面，硬依赖仅 dyn tag/html 注入 idiom
已有先例，故可并行起草、034 merge 后再执行 attr 段）

- expandedElement 盘点（429-520 行）：四分支全 chrome+闭包递归
  （childSlot）+ 两类 attr 交互（open 翻转/checked 翻转）+ AttrHost
  两用——无引擎内核耦合，命令动词均经 commands 层，可整体迁 .at。
- 030 双通道约定盘点：Callout 卡片链"edit 装配与 renderCalloutPanel
  逐字一致 = CSS 单通道"（人盯约定）；本计划后变同源事实。renderListPanel
  任务项惰态 checkbox vs 编辑活点——mode 区分吸收。
- DetailsNodeView 现状：.at 已在（挂 preview），含 summary 提交键序
  （onkeydown.enter/escape.prevent idiom——DSL 键面先例，attr_host.at
  直用）。
- use-component idiom 先例：node_view_ext 的 NodeViewWrapper/
  NodeViewContent（026 起 .at 内嵌 TS 组件）——BlockChildren 同型。
- 契约冻结面：EDITOR-CONTRACT 容器装配面四段（030 增补：callout 链/
  details 链/attr-host/task-checkbox）；e2e container-editing /
  host-protocol / extension-blocks 三 spec 零改动是硬验收。
- spec 支点：P025-2（容器块编辑——聚焦路径下沉装配）、P030-2（容器
  WYSIWYG）、P033 家族机制（本计划是其"试点三类"向容器族的推广）。
- DEBTS 对账：026②"NodeView 编辑态深度"容器族部分销；030 v1 边界
  不动（alias/args 边界与本计划无涉）。
- VM 关联：容器 chrome 单源 + BlockChildren 孔契约 = VM 端容器渲染/
  装配的实现面（路线图计划 6/7 消费）。

## 详细设计

### D1 BlockChildren 孔（平台组件）

```ts
// src/editor/components/BlockChildren.ts
export const BlockChildren = defineComponent({
  props: { children_slot: { type: Function, required: true } },
  setup(p) { return () => (p.children_slot as () => VNode[])() },
})
```

- .at 内嵌：`use { component: BlockChildren from "ext/container_ext.ts" }`
  → `BlockChildren { children_slot: .children }`（.children 为
  Array<str> 宽类型 prop，装配层传入闭包）。
- 闭包构造：适配器 `childrenOf(node, ctx)` 返回
  `() => node.children.map((ch) => childSlot(ch, ctx))`——childSlot/
  assembleNode 递归不动。
- 测试 teardown/重挂语义由闭包捕获的 ctx 保证（epoch key 机制 029）。

### D2 容器 widget 的 mode 与动词

- 三 mode 同 chrome（033 idiom）：`mode: view | stream | edit`；stream
  沿 032 裁定 A=面板路径（widget view 模式即面板，无 stream 分支行为）。
- 动词面（经 ext 桥/controller，.at 不写命令逻辑）：
  - details marker 点击 → `toggleDetailsOpen(controller, blockId)`（ext
    桥转发 setBlockAttrs——现 inline onClick 的 stopPropagation 语义保留）；
  - list checkbox 点击 → `toggleTaskChecked(controller, blockId)`（edit
    mode 活点；view mode 渲染 disabled checkbox——renderListPanel 语义）；
  - AttrHost blur → `commitAttr(controller, blockId, attrKey, text)`。
- controller prop：容器域薄控制器（`ContainerController` 包装
  engine+blockId，或直接传 engine 宽类型 + blockId——033 CodeBlockWidget
  的 fenceEditSlot 现状是后者，沿用）。

### D3 attr_host.at（单行 attr 宿主）

- props：`controller Array<str>, blockId str, attr_key str, value str,
  placeholder str, host_class str, readonly bool, version int`。
- 语义逐条对齐 AttrHost.vue：挂载排版值（textContent 注入）、
  `onkeydown.enter.prevent/escape.prevent` → blur 提交、blur →
  commitAttr（一步 undo）、version 变化且非聚焦 → 同步模型值（失焦
  重挂机制）、contenteditable 无框样式。
- ext 桥 `attr_host_ext.ts`：commitAttr/isFocused/模型同步三函数。

### D4 装配切换与退役清单

- EngineEditor：四 `registerBlockWidget` + 适配器（childrenOf/attrs
  扁平化/readonly 传 streaming）+ expandedElement 删除（assembleNode
  容器分支直挂 widget，isExpandableContainer 判定保留为分派条件）。
- builtin-panels：renderCalloutPanel / renderListPanel 删（Callout/
  ListBlock 经 custom 槽 panelOf；ListItem/TableRow/TableCell 等中介
  面板不动）；DetailsNodeView registerPanel → panelOf(details widget)。
- 删除：DetailsNodeView.vue（gen 产物）、AttrHost.vue、gen 部署物增删
  按实际（.at 源 DetailsNodeView 退役；node_view_ext 相应导出收缩）。
- assert-editor-gen 清单重冻结；ARCHITECTURE §6 清单数同步。

### D5 parity 与契约

- 三模式 parity：容器四 kind 进 033 block-widget-parity 套件（chrome
  层属性矩阵，edit 白名单外零差异）。
- EDITOR-CONTRACT：容器装配面四段补 mode 语义注记（033 同口径）+
  §BlockChildren 平台面（孔契约：children_slot 闭包形状/epoch 语义/
  VM 映射=原生递归装配）。

## 测试设计

- **零改动回归（硬验收）**：container-editing / host-protocol /
  extension-blocks / stream-tri-state 四 e2e spec；render.test.ts
  extension panels 段；semantics.test.ts（内核零改动佐证）。
- **新增单测**：BlockChildren 孔（闭包求值/epoch 重挂/teardown）；
  attr_host.at 产物（提交键序/blur 提交单步/version 同步）；四容器
  widget 三 mode DOM 契约（对齐现 renderCalloutPanel 断言形状）；
  parity 矩阵扩展四 kind。
- **gen**：两连跑逐字节确定；清单断言。
- **手验**：容器聚焦编辑三例（Callout 标题就地/Details 摘要+开合/
  任务 checkbox 翻转）截图留档（029 T10 口径）。

## 验收标准

1. Callout/Details/Blockquote/List 四 kind 各一件 .at widget 服务
   view/edit（stream=面板路径）；renderCalloutPanel/renderListPanel/
   DetailsNodeView/AttrHost.vue/expandedElement 分支物理退役。
2. BlockChildren 孔组件 + 契约段在册；.at 内嵌组件组合 idiom 二例
   在案（NodeViewWrapper 先例外再加本计划）。
3. 零改动回归清单（四 e2e + render.test.ts + semantics）全绿；
   parity 矩阵含容器四 kind。
4. gen 清单/assert-editor-gen/ARCHITECTURE §6 同步冻结；"Callout
   edit==view CSS 单通道"从人盯约定变同源事实（复审记录验明）。
5. 文档三件（EDITOR-CONTRACT 容器 mode 注记 + BlockChildren 平台面 /
   ARCHITECTURE / DEBTS 026② 容器族销号）更新完。

## 执行步骤

- [x] T1 `src/editor/components/BlockChildren.ts` 孔组件 +
      `src/render/__tests__/block-children.test.ts`（闭包/epoch/
      teardown）；验证：`pnpm --filter @autodown/engine test --
      block-children` 绿。
      [✅ 已完成] 5/5 绿（裸 fragment SSR 对拍/闭包逐渲染求值×2/epoch 键重挂 mount-unmount-mount 序列/teardown 一次性卸载）；commit `plan-035-dev`。
- [x] T2 `auto/editor/attr_host.at` + `auto/editor/ext/attr_host_ext.ts`
      （D3，语义对齐 AttrHost.vue 注释逐条）；验证：gen 两连跑 +
      attr 单测（键序/blur/version 三组）绿。
      [✅ 已完成] gen 两连跑逐字节 DETERMINISTIC；attr-host.test 9/9（键序
      Enter/Esc·preventDefault/blur 单步 undo+nbsp/unchanged·readonly skip/
      version 非聚焦同步+聚焦不覆写）；engine vitest 650/650。注：attr_host.at
      生成 AttrHost.vue 与手写件同名，部署冲突迫使 D4 的 AttrHost 切片提前到
      T2——EngineEditor 两调用点已切生成件 prop 面（controller=engine），手写
      版随之退役。
- [x] T3 `auto/editor/callout_block_widget.at`（D2：卡片链 + AttrHost
      内嵌 + BlockChildren 孔 + readonly 横幅）；验证：gen 两连跑 +
      DOM 契约对拍（与 renderCallpanel 旧断言形状逐字节）绿。
      [✅ 已完成] gen 两连跑 DETERMINISTIC；callout-block-widget.test 5/5
      —— view 面与 builtin renderCalloutPanel norm 后逐字节全等（含空标题
      fallback/异型无 icon/stream≡view）；edit 面 AttrHost+markdown-renderer
      孔+readonly 横幅。裁定：view 面标题为静态 div（render.test 零改动硬验
      收优先于架构草图"view 含 AttrHost"字样）；widget 经 container_ext 桥
      内嵌 AttrHost/BlockChildren，静默部署待 T6。
- [x] T4 `auto/editor/details_block_widget.at`（marker 动词 +
      summary 宿主 + 显隐 + 孔）；验证：gen 两连跑 + host-protocol
      e2e 用例零改动绿（data-open 断言面）。
      [✅ 已完成] gen 两连跑 DETERMINISTIC；details-block-widget.test 5/5
      （data-open 双态/marker ▼▶/Details fallback/display:none/双面 toggle 单步
      undo/edit 面 AttrHost+孔）。e2e host-protocol 于 T6 接线后随全量跑（widget
      目前静默部署未接线，旧路径未动）。裁定：view 面编辑流（铅笔+input）由
      AttrHost 面取代，NodeViewWrapper/Content 标记随 DetailsNodeView 退役。
- [x] T5 `auto/editor/blockquote_block_widget.at` +
      `list_block_widget.at`（薄壳 + checkbox mode 区分）；验证：
      gen 两连跑 + container-editing e2e 用例零改动绿。
      [✅ 已完成] gen 两连跑 DETERMINISTIC；blockquote-list-widget.test 5/5
      —— 两 view 面与 builtin 面逐字节全等（list 惰态 checkbox/aria-label
      "task checkbox"/无 start），edit 面活点 checkbox 单步 undo+start="3"+
      markdown-renderer 孔。e2e 于 T6 接线后随全量跑。items 走扁平 chrome 数据
      （{id,task,checked,cls,children_slot}，TableEditorBlock 边界）。
- [x] T6 `src/editor/components/EngineEditor.vue`：四
      registerBlockWidget + 适配器 + expandedElement 删除 +
      builtin 两面板退役 + DetailsNodeView registerPanel 切
      panelOf（D4）；验证：engine vitest 全量 + render.test.ts
      零改动绿。
      [✅ 已完成] engine vitest 665/665（render.test.ts 零改动过）。实现裁定：
      容器编辑面不走 editSlotFor 注册（childSlot 需 AssemblyCtx 闭包）——
      assembleView 焦点路径分支直挂 widget（containerEditSlot）；Callout/List
      面板注册入 render 侧 block-widget-panels（panelOfContainer + 容器
      fallback 模型），Details 面板留 EngineEditor（marker 动词需 host 窗
      engine）。新增 panel-registry §面板体装饰器窗：闭包孔体内 wikilink
      装饰经构造期捕获+求值期应用（renderEmbedded 单 vnode 归一修复）；
      node-view-mount/wikilink 两测试随新装配改写。
- [x] T7 旧物清理：AttrHost.vue / DetailsNodeView.vue（含 .at 源）/
      node_view_ext 导出收缩 + `scripts/assert-editor-gen.mjs` 清单
      重冻结；验证：`node scripts/assert-editor-gen.mjs` 零退出 +
      `pnpm --filter @autodown/engine build` 绿。
      [✅ 已完成] assert 零退出（19 chrome products / 14 ext bridges）+
      build 四断言绿（parser-pure/no-tiptap/editor-gen/dist-stamp）；
      DetailsNodeView .at+部署物删、detailsEditIcon 收缩（focusAndSelect
      留 WikiLink）；AttrHost.vue 手写版已于 T2 随部署覆盖退役。注：worktree
      与主检出的 vue-tsc -b 首跑均现 .vue 解析失败（增量态脏，--force 后
      全新态亦绿）——环境级现象，非本计划引入。engine vitest 665/665 复绿。
- [x] T8 parity 矩阵扩展四 kind（block-widget-parity.test.ts）+
      三例容器手验截图；验证：vitest 绿 + 截图留档。
      [✅ 已完成] parity 19/19（+10：四 kind 类链/结构标记矩阵，view≡stream
      及 edit 白名单——AttrHost 宿主/活点 checkbox/markdown-renderer 孔/横幅；
      容器 style 块为空、类链即 parity 钉面）；截图
      demo/e2e/screenshots/container-edit-faces.png（Callout 标题就地/Details
      摘要+开合/任务 checkbox，screenshot.spec 纯追加 033 同款）。
- [x] T9 文档三件（EDITOR-CONTRACT 容器 mode 注记 + §BlockChildren
      平台面 / ARCHITECTURE §6 / DEBTS 026②）；验证：文档 diff 复核。
      [✅ 已完成] 三件 diff 复核：EDITOR-CONTRACT 四行 033 同口径注记 +
      新 §8 BlockChildren 平台面；ARCHITECTURE §6 部署物 15→19、ext 桥
      12→14、家族机制段容器族落地；DEBTS 026② 容器族销号。
- [x] T10 全量回归：engine test + build + demo playwright 全量 +
      手验清单执行；验证：全绿 + 零改动回归清单复核一遍。
      [✅ 已完成] engine vitest 673/673；engine build 四断言绿（19 products/
      14 bridges）；demo playwright 48/48（container-editing/host-protocol/
      extension-blocks/stream-tri-state 四 spec 零改动过）；零改动清单六文件
      git diff master 空（四 e2e spec + render.test.ts + semantics.test.ts）；
      手验三例即 T8 截图留档（container-edit-faces.png）。

## 复审记录

**复审人**：ZCode（/auto-plan:review，2026-09-01）
**复审基线**：worktree `.worktrees/plan-035-dev`（branch plan-035-dev @ 6516e86，工作树干净；diff master 40 文件 +2384/−671，含 f7f983a 之后的 9 个计划提交）

### 验收标准逐条复核（全部重跑/重验，不采信勾选框）

1. **四 kind .at widget + 旧面物理退役** — PASS。五 .at 源在树（callout/details/blockquote/list_block_widget/attr_host）；`EngineEditor.vue` expandedElement 已删（仅 :408 注释提及；isExpandableContainer 保留为分派条件，:500/:514，符合 D4）；builtin-panels.ts 无 renderCalloutPanel/renderListPanel 活代码（仅 callout-block-widget.test.ts 内冻结逐字节参照，属测试资产）；DetailsNodeView.vue（−122）与 details_node_view.at（−190）物理删除；AttrHost.vue 手写版退役——文件现为 gen 产物（gen.mjs 映射 `'AttrHost.vue': 'components/AttrHost.vue'`，T2 名字冲突裁定的提前执行）。
2. **BlockChildren 孔 + 契约段 + 组合 idiom 二例** — PASS。`src/editor/components/BlockChildren.ts:16`（children_slot 闭包 prop，裸 fragment 无自包裹）；EDITOR-CONTRACT.md:134 §8 平台面（children_slot 闭包形状/epoch 语义/VM 映射=原生递归装配/装饰器窗）；container_ext.ts 内嵌 BlockChildren/AttrHost——NodeViewWrapper 之后第二例 idiom 在案。
3. **零改动回归 + parity** — PASS。六文件（container-editing/host-protocol/extension-blocks/stream-tri-state 四 e2e + render.test.ts + semantics.test.ts）`git diff master..HEAD` 为空；engine vitest 全量 **673/673**（49 文件，复审重跑）；demo playwright 全量 **48/48**（复审重跑，含四零改动 spec）；parity 套件 19/19 含容器四 kind（view≡stream + edit 白名单：AttrHost 宿主/活点 checkbox/markdown-renderer 孔/横幅）。
4. **gen 冻结 + CSS 单通道同源事实** — PASS。`node scripts/assert-editor-gen.mjs` 零退出（19 chrome products / 14 ext bridges，复审重跑）；engine build 四断言绿（parser-pure/no-tiptap/editor-gen/dist-stamp，复审重跑）；ARCHITECTURE §6 部署物 15→19、ext 桥 12→14 与清单一致；"Callout edit==view CSS 单通道"已从约定变同源事实——view 与 edit 同一 .at 单源 + callout-block-widget.test view 面 norm 后逐字节全等断言钉死。
5. **文档三件** — PASS。EDITOR-CONTRACT 容器四行 mode 注记 + §8；ARCHITECTURE §6 数字与容器族落地段；DEBTS.md:37 026② "容器族已销（plan 035，2026-09-01）"，余量收窄为 Table 族与其余 kind。

### 遗漏/延后/workaround 排查

- 无未勾任务、无静默裁剪。待澄清事项全部闭合：#1（034 merge 阻塞）已解除；List/Quote 薄壳已做（T5）；attr 桥独立 attr_host_ext.ts 已落地；ListItem/TableRow/TableCell 中介面不动与 Table 家族化另行立项均为计划"不做的"声明边界（DEBTS 026② 同步注记），非未批准延后。
- 执行裁定五条（计划内有记录，非静默）：① AttrHost 名字冲突致退役切片提前到 T2；② 容器编辑面不走 editSlotFor 改 containerEditSlot 焦点路径直挂（childSlot 需 AssemblyCtx 闭包，T6）；③ view 面标题静态 div（render.test 零改动硬验收优先于架构草图字样，T3）；④ panel-registry 新增 §面板体装饰器窗 + renderEmbedded 单 vnode 归一（T6 范围增量；node-view-mount/wikilink 两测试随新装配改写——不在零改动清单内，合规）；⑤ gen 清单 22→21 widgets 修正（DetailsNodeView .at 同批退役）。
- 环境级注记（非本计划引入）：vue-tsc -b 增量态首跑 .vue 解析失败（--force 后全新态绿；主检出同样现象），已在 T7 记录为观察项。
- **结论：五条验收全 PASS，无阻塞债——复审通过，路由 `reviewed`，可进 /auto-plan:merge。**

## 待澄清事项

1. ~~**T2 起阻塞：PLAN-034 未 merge**（2026-09-01 执行记录）~~ 已解除：
   034 merge 完毕（f7f983a，archived），worktree 已同步 `git merge master`
   （56bdb6e，零冲突）。attr 段按计划续执，ext 桥 idiom 参照 034 的
   rich_text_host_ext.ts。
2. **List/Quote 薄壳是否本期做**（建议：做——"edit 面全 .at"终局一步
   到位；若执行中发现 list 任务项交互面复杂度超预期，可裁出独立小
   计划，blockquote 先行）。
2. **attr 域动词桥归属**（建议：独立 attr_host_ext.ts——Callout/
   Details 两 widget 共用，避免容器 ext 各持一份）；033 后 ext 桥
   已 11+，增长趋势可在 merge 时统一盘点一次归并面。
3. **ListItem/TableRow/TableCell 中介面**（建议：不动——中介节点无
   独立 chrome 面，随容器 widget 与表格家族化（后续）覆盖）。
4. **Table 家族化时点**（建议：独立小计划，前置 = 032 归一终态的
   行为面复验 + 本计划 BlockChildren 孔——TableWidget 吸收
   TableEditorBlock + StreamingTable 终态，量级与 033 试点相当）。
