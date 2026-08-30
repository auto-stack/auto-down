# [PLAN-025] 容器块编辑——list/blockquote 聚焦下沉与结构操作

---
plan_id: PLAN-025
status: reviewed
feature_name: 容器块编辑（聚焦路径下沉装配 + 列表/引用结构命令 + 输入规则容器化修复）
author: [zhaopuming, zcode]
created_at: 2026-08-30T00:15:00+08:00
updated_at: 2026-08-30T13:05:00+08:00
supersedes_spec_components:
  - ".autoos/specs.json P023-2/P023-3: EngineEditor 装配描述——顶层单遍扁平预览改为聚焦路径递归装配（路径容器展开、旁支逐槽预览），渲染管线本体不变"
new_spec_components:
  - ".autoos/specs.json 六节 P025-1..6: 容器块编辑——list-commands 结构命令层（六命令 applyTree 一步撤销+消融护栏）、focus-path 深层选择与递归装配、输入规则容器化（wrap 语义）、宿主父链分流（Enter/Backspace/Tab）+ DOM 边界三修复（AssemblyView 稳定壳/点击 stopPropagation/nbsp 归一化）"
touched_goals:
  - "P024-2: 富文本宿主目标扩展——嵌套容器（列表项/引用段）内宿主就地编辑，宿主协议（输入 diff/blur 回写）不变"
current_step: 13
total_steps: 13
---

## 变更摘要

打通 list/blockquote 容器块的编辑：EngineEditor 的装配从"仅顶层叶块可聚焦"
下沉为**聚焦路径递归装配**（点进列表项/引用段即可编辑文字，路径外旁支保持
预览）；为列表/引用补齐**结构命令层**（回车拆项、空项退出、Backspace 合并、
Tab/Shift-Tab 缩进出退——全部走 applyTree 树变换，一步撤销）；修复 input
rules 的容器化缺失（"- "/"> " 现产生序列化为空、无面板的裸 ListItem——
本计划把它改为产生合法容器结构）。行内 mark 编辑不在本计划（plan-024）。

## 目标

1. **聚焦下沉**：点击列表项/引用内文 → 选中**最深叶块**（列表项的段落），
   BlockHost 就地编辑；所在容器沿路径"展开"，其余子树保持预览渲染。
2. **结构命令层**：`list-commands.ts`——`enterInItem`（拆项；空项则退出
   列表）、`backspaceAtItemStart`（并入前项；首项则提升出列表）、
   `indentItem`/`outdentItem`（嵌套缩进/退出，树变换实现——内核
   WrapBlock/LiftBlock 仅见反转定义，正向应用未确认，v1 不动内核）、
   `enterInQuote`/`exitQuote`。每个命令一步撤销。
3. **输入规则容器化修复**："- /＊/+ "产生 `ListBlock>ListItem>Paragraph`
   （保留已输入文本），"> "产生 `Blockquote>Paragraph`；serialize
   roundtrip 恢复 `- item` 形态。
4. **宿主协议父链感知**：嵌套段落宿主的 Enter/Backspace 按
   `parentOf(...).kind` 分流到结构命令（顶层行为不变）。
5. 滚动同步/getBlockMap/EDITOR-CONTRACT 冻结面零破坏（嵌套
   data-block-id 天然被 getBlockMap 的递归查询覆盖）。

## 架构方案

```
views 装配（EngineEditor）
└─ focusPath = parentOf 链 root→focused（深层叶块 id）
   ├─ 路径上容器：children 逐个装配——路径内子节点继续下钻（容器"展开"），
   │              旁支子树 blockNodeToWNodes→renderNodes 预览
   └─ 路径终点叶块：BlockHost（协议不变；024 富化后同构兼容）
结构命令层（headless）：list-commands.ts（applyTree 树变换，一步撤销）
宿主协议：host-controller.onEnter/onBackspaceAtStart 按 parent.kind 分流
输入规则：inputRuleOps 产容器结构（wrap 语义），不再产裸 ListItem
```

- **选择模型无需改**：`BlockPos(blockId)` 与 `findBlock/parentOf` 本就是
  深层寻址——缺的只是装配层与命令层。
- **非目标**：拖拽重排 UI（moveBlock 命令已有）、跨块选区、表格/代码块
  嵌套容器、多级列表的连续缩进 UX 打磨（操作可复合，交互后评）。

## 技术栈

现有栈：Vue 3 SFC + vitest（headless/SSR）+ Playwright（demo e2e）。
不触碰生成物（block-model/markdown-parser/serializer 不改——输入规则修复
在手写 input-rules 层完成容器化，不动 parser）。

## 需求分析与背景调查

（spec 账本现含 P023 条目；本节以本会话调研确认的模块事实为锚。）

- **模型寻址是深层的**：`findBlock`/`parentOf` 递归全树（block-model.ts
  :494/:507）；`Selection{anchor,head}` 可指向任意嵌套块——下沉无内核障碍。
- **装配是顶层的**：`EngineEditor.views` 只映射 `doc.children`；预览分支
  排除"聚焦**顶层**可编辑叶块"；嵌套点击冒泡到顶层 node-slot 的 onClick
  选中整个容器（`selectBlock` 用 `children.find`，仅顶层）。聚焦容器 =
  预览态，无法编辑。
- **输入规则产物是坏的**（本计划主线动机）：`"- "` 经 `SetBlockType`
  产生顶层裸 `ListItem`——序列化走 `joinChildren(children=[])` 输出**空**
  （serializer.ts:406），palette 无 `list_item` 面板（渲染 unknown-node）。
  规则表 `INPUT_RULES` 有 ListItem/Blockquote 项但无 wrap 语义。
- **解析侧形状**：`ListBlock{ordered,start}` → `ListItem` → `Paragraph`
  （文本在段落 inlines；`blockText(ListItem)==""`）——编辑列表项 = 聚焦
  嵌套段落。
- **内核 op 面貌**：SplitBlock/MergeBlocks/SetBlockType 按 id 深层应用 ✓；
  WrapBlock/LiftBlock 在 op 枚举与 invertOp 中存在，正向 applyOp 实现未见
  ——缩进出退走 applyTree 树变换（023 表命令先例），不动生成物内核。
- **isEditableLeaf**（children==0 && 非 ThematicBreak）对嵌套段落天然为
  真——宿主判定函数无需改。
- **getBlockMap** 递归查询 `[data-block-id]` ✓；滚动同步契约以块几何为锚，
  嵌套块挂上 data-block-id 后自动入表。

## 详细设计

### 1. 结构命令层 `src/editor/engine/list-commands.ts`（手写）

```ts
enterInItem(engine, paragraphId)      // 拆项：后段文本→新 ListItem(尾插)；空项→退出列表(段落提升到列表后)
backspaceAtItemStart(engine, paragraphId) // 并入前项末尾；首项→提升出列表；列表空→消融
indentItem(engine, paragraphId)       // 并入前一项的子列表（无则新建）
outdentItem(engine, paragraphId)      // 提升到父级列表同层（顶层则止）
enterInQuote(engine, paragraphId)     // 延续引用：新空段；空段→退出引用
```

全部 `applyTree`（一步撤销）；护栏：不可产生空 ListBlock/裸 ListItem
（消融规则在案）。

### 2. 输入规则容器化（input-rules.ts）

`inputRuleOps` 为容器类规则（ListItem 标记）增加 wrap 语义：删除标记后
不改 kind 为裸 ListItem，而是 `applyTree` 把该块包成
`ListBlock>ListItem>原段落`；Blockquote 同理包 `Blockquote>原段落`。
规则表增 `wrap: BlockType` 字段；Heading/Fence/ThematicBreak 行为不变。

### 3. 聚焦路径装配（EngineEditor.vue）

- `focusPathOf(id)`：parentOf 链上溯得 id 集合。
- `views` 递归化：`assemble(node)`——node 在路径上且为容器 → 其 children
  逐个 `assemble`；在路径上的子节点继续下钻，旁支子树走
  `renderNodes([blockNodeToWNode(child)], true)` 预览并包 node-slot
  （onClick 深层 `selectBlock`，data-block-id 挂嵌套叶块）。
- `selectBlock`/`focusFirstBlock`/Ctrl+End 改用深层 `findBlock` 与全树
  末叶。
- 预览排除逻辑改为"排除**聚焦路径终点**叶块"（原顶层判定语义的推广）。

### 4. 宿主父链感知（host-controller.ts）

`onEnter`：`parentOf(doc, id)?.kind` 为 ListItem→`enterInItem`（传嵌套
段落 id）、Blockquote→`enterInQuote`，否则原 SplitBlock。
`onBackspaceAtStart`：同法分流 `backspaceAtItemStart`；前驱解析改为
"同容器内前一个叶块"。Tab/Shift-Tab 键（BlockHost keydown 增）→
indent/outdent。

## 测试设计

- **headless 单测**（vitest，TDD）：list-commands 全命令（树断言 + undo
  一步 + 护栏：首项 outdent 无操作、空列表消融）；input rules 容器化
  （"- "→ListBlock 结构 + serialize roundtrip `- item` + "> " 同理 +
  Heading 行为不回归）。
- **SSR**：聚焦路径装配——嵌套叶块挂 data-block-id、旁支预览含
  `node-slot`。
- **e2e**（demo 新增 `e2e/container-editing.spec.ts`）：点击列表项→输入
  回写；回车拆项；Tab 缩进（嵌套序列化）；空项回车退出；"> " 输入规则；
  滚动同步不回归。
- **回归门**：engine 全量（309 基线）、build 三断言、demo e2e 全绿、
  jade-garden build。

## 验收标准

- [ ] 点击列表项/引用内文即可编辑文字（BlockHost 就地，非预览态）。
- [ ] "- " 输入产生合法列表且 serialize roundtrip 为 `- item`（修复裸
  ListItem 丢内容缺陷）。
- [ ] 回车拆项 / 空项退出 / Backspace 合并 / Tab-Shift+Tab 缩进出退全部
  经命令层生效且各一步撤销。
- [ ] 聚焦容器的旁支子树保持预览渲染；嵌套块入 getBlockMap（滚动同步
  契约不破）。
- [ ] 顶层块编辑行为与 023/024 基线完全不变（回归）。
- [ ] EDITOR-CONTRACT 冻结面零破坏；全部门检绿。

## 执行步骤

> 约定：工作树 `.worktrees/plan-025-dev`（由 /auto-plan:work 创建）；验证
> 均在工作树根执行。`PnTm` = Phase n Task m。

### Phase 0：结构命令层 + 输入规则修复（headless 地基）

- [x] P0T1 list-commands：新建 `autodown/packages/engine/src/editor/engine/list-commands.ts`
  （enterInItem/backspaceAtItemStart/indentItem/outdentItem/enterInQuote/
  exitQuote，applyTree 一步撤销 + 消融护栏）+
  `src/editor/__tests__/list-commands.test.ts`（TDD 先红：六命令 × 树
  断言/undo/护栏）。验证：`npx vitest run src/editor/__tests__/list-commands.test.ts`。
  [✅ 已完成] 25/25 绿（f734423）；六命令全 applyTree 一步撤销，空容器消融，
  首项 indent/顶层 outdent 为无历史 no-op；barrel 已导出；vue-tsc 过。
- [x] P0T2 输入规则容器化：改 `src/editor/engine/input-rules.ts`——规则表
  增 wrap 字段，inputRuleOps 对 ListItem/Blockquote 标记产容器结构（不再
  SetBlockType 裸 ListItem）；`input-rules` 相关测试更新 +
  roundtrip 断言。验证：`npx vitest run src/editor/__tests__ -t rule`。
  [✅ 已完成] 9/9 规则测试绿 + 包全量 376/376（086f80e）；顺带修复
  EditorEngine.redo 丢 after 树变换的既有缺陷（heading level/容器 wrap
  redo 不再丢）；serialize roundtrip `- item`/`> quoted` 达成。

### Phase 1：聚焦路径装配 + 宿主父链感知

- [x] P1T1 深层选择基础：`EngineEditor.vue` 的 selectBlock/focusFirstBlock/
  onContentKeydown(Ctrl+End) 改深层 findBlock/全树末叶；单测或既有回归
  确认顶层行为不变。验证：`cd autodown/packages/engine && pnpm test`。
  [✅ 已完成] 376/376 全绿（既有回归确认顶层不变）；新增
  engine/focus-path.ts（focusPathOf/focusTargetOf/lastFocusTargetOf，
  编辑面类型短路下钻——表聚焦到表面非单元格）；初始聚焦改无条件深层解析。
- [x] P1T2 聚焦路径递归装配：views 重构为 assemble 递归（focusPath 展开、
  旁支 blockNodeToWNodes→renderNodes 预览、嵌套叶块 node-slot onClick/
  data-block-id）；SSR 断言入 `src/editor/__tests__/focus-path.test.ts`。
  验证：`npx vitest run src/editor/__tests__/focus-path.test.ts`。
  [✅ 已完成] 9/9 绿；展开容器镜像 builtin 面板壳层（ul/li/blockquote +
  markdown-renderer），旁支预览槽挂深层 data-block-id；顶层 DOM 基线断言
  不变；flat previewNodes 计算属性退役（按槽按需生成）。
- [x] P1T3 宿主父链分流：`src/editor/engine/host-controller.ts`——
  onEnter/onBackspaceAtStart 按 parent.kind 分流到 list-commands；BlockHost
  增 Tab/Shift+Tab keydown（indent/outdent）；host-controller.test.ts 增
  嵌套用例。验证：`npx vitest run src/editor/__tests__/host-controller.test.ts`。
  [✅ 已完成] 17/17 绿（216b995）；Tab 绑定按待澄清 1 起草案落地
  （Tab/Shift+Tab=缩进/出退，列表外透传浏览器默认）；前驱合并加
  isEditableLeaf 护栏（容器兄弟永不并入）。
- [x] P1T4 契约回归门：`pnpm test`（全量）+ `pnpm build`（三断言）——
  顶层基线与冻结面确认。验证：两命令退出码 0。
  [✅ 已完成] 391/391（基线 376 + 新 15）+ build 三断言全过；顶层
  SSR/DOM 基线断言不变（focus-path.test.ts baseline 用例）。

### Phase 2：e2e + 收尾

- [ ] P2T1 容器编辑 e2e：新建 `autodown/demo/e2e/container-editing.spec.ts`
  （点击列表项编辑/回车拆项/Tab 缩进/空项退出/"> "规则/滚动同步冒烟）。
  验证：`cd autodown/demo && npx playwright test container-editing.spec.ts`。
- [x] P2T2 全量回归：demo e2e 全绿（既有 9+1 spec + 新 1）+ `cd
  jade-garden/front && pnpm build`。验证：两者退出码 0。
  [✅ 已完成] demo e2e 19/19（5 spec：check-heading/check-padding/
  inline-marks/screenshot/scroll-sync + 新 container-editing）；
  jade-garden front 构建退出码 0。
- [x] P2T3 收尾门：engine `pnpm test && pnpm build` + 计划书回写 →
  `execution_done`。
  [✅ 已完成] 391/391 + build 三断言全过；status 翻转 execution_done，
  待 /auto-plan:review 复审。

## 复审记录

**复审人**：zcode（/auto-plan:review）· **时间**：2026-08-30 13:05 +08:00 · **结论**：**通过 → reviewed**

**验证基线**：工作树 `.worktrees/plan-025-dev`（b763178..HEAD 累计 8 提交，16 文件
+1438/-100，无生成物改动）。全量门（复审专属、全部亲自重跑）：engine 391/391
（29 文件）+ vue-tsc 0 错 + build 三断言过；demo e2e 19/19（5 spec 含新
container-editing 5 用例）；jade-garden front 构建退出码 0。

**逐条验收**（全部 pass，证据在案）：

1. 点击列表项/引用内文就地编辑 — **pass**：e2e container-editing:45（点击→宿主
   挂载→输入→右栏回写）+ SSR focus-path 两用例（列表首/引用首文档聚焦嵌套段）。
2. "- " 产合法列表且 roundtrip `- item` — **pass**：editor-engine.test.ts:157-174
   （serialize `'- item\n'` + reparse 断言 + undo/redo 往返）；裸 ListItem 缺陷
   （序列化空、无面板）已由 wrap 语义消除；"> " 同理 :176。
3. 回车拆项/空项退出/Backspace 合并/Tab 出退经命令层且各一步撤销 — **pass**：
   list-commands.test.ts 25 用例（5 处 e.undo() 断言；首项 indent/顶层 outdent
   无历史 no-op 护栏；空容器消融）+ e2e 拆项/退出/Tab 往返三景。
4. 旁支预览 + 嵌套块入 getBlockMap（滚动同步不破）— **pass**：SSR 断言旁支
   node-slot+data-block-id；scroll-sync 5 用例 + 新嵌套滚动冒烟全绿
   （getBlockMap 递归查询天然收编嵌套槽）。
5. 顶层基线不变 — **pass**：023/024 既有用例全数在绿（309 基线全保留于 391）；
   inline-marks/scroll-sync e2e 过；顶层 SSR DOM 基线断言不变（boundary/槽位
   形状）；唯一语义增量是前驱合并加 isEditableLeaf 护栏（顶层宿主均为可编辑叶，
   行为等价）。
6. EDITOR-CONTRACT 冻结面零破坏 + 门检绿 — **pass**：getBlockMap 函数零 diff、
   root classes 未动、data-block-id 仅增量（嵌套槽新增）；全量门如上全绿。

**遗漏/延后/workaround 扫查**：diff 零 TODO/FIXME/HACK；九执行步均有对应代码与
测试落点；无未经批准的延后（有序列表标记 "1. " 系待澄清 #2 起草案明示 v1 不做）。
待澄清 #1（Tab 绑定）按起草方案落地（Tab/Shift+Tab=缩进/出退，列表外透传），
待澄清项保持开放供翻案。

**执行中发现的既有缺陷（已顺带修复，非本计划原始范围）**：EditorEngine.redo()
丢 after 树变换（heading level/容器 wrap redo 即丢）；Chromium contenteditable
末尾空格产 U+00A0 致 "- "/"# " 输入规则永不匹配（heading 同病）；{render} 对象
每次重算致 Vue 换组件类型、子树整体重挂。

**债候选（记录不阻塞，供 /finish-plan 或后续计划裁决）**：

- D1 ext 桥装配（auto_down_editor_ext.ts EngineContentHost）仍顶层-only +
  serialize→reparse 预览——025 聚焦路径装配未下沉该路径，widget 侧装配能力
  双轨分叉（demo/jade 主路径均走 EngineEditor，不受影响）。
- D2 UI 无 Ctrl+Z 键接线（引擎 undo 从未绑定——023 起既有空白；命令级一步
  撤销由 headless 钉死，UI 级撤销不可用）。
- D3 槽位 data-node-index 全等伪影（惰性 render 闭包读共享计数器终值，旧代码
  同款模式；无消费方读值，纯外观）。
- D4 blur-回写吞点击（024 在档 papercut；025 e2e 以 Save 稳定化绕行——测试
  手法，产品修复未做）。

## 待澄清事项

- [ ] Tab 缩进 v1 是否绑定（起草：Tab/Shift+Tab=缩进/出退；备选：Tab=跳出
  引用块语义，列表用 Shift+Tab 单向）？
- [ ] 输入规则修复是否顺带支持有序列表标记（"1. "，起草：v1 不做——规则
  表无此项，parser 支持 ordered，补规则属低风险小项可后补）？
- [ ] 与 024 的执行顺序：起草 024 先行（富宿主先稳内容协议，025 再叠结构
  键；两计划在 BlockHost/host-controller 有文件交集，串行更稳）。
