---
plan_id: PLAN-042
status: archived
feature_name: vue 侧块家族补齐（容器族/Table 三态收编）+ 三件搭车归档
author: [zhaopuming]
created_at: 2026-09-02
updated_at: 2026-09-03

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components:
  - "P033-2..6（BlockWidget 家族机制）: 修改——registerBlockWidget 增槽覆写参数（slots?: Partial<Pick<BlockComponent,'view'|'stream'|'edit'>>，家族仍一次注册拥有三槽）；BlockEditCtx 扩装配注入契约（可选 children/items/version——容器族 edit 槽经装配闭包注入递归，无注入回落 preview 管线）"
  - "P035-1..6（容器族迁 .at widget + BlockChildren）: 修改——编辑装配面：containerEditSlot 手搭分派退役，四 kind（Callout/Blockquote/ListBlock/Details）经注册家族 edit 槽挂载（递归留单一装配点，经 BlockEditCtx 注入）；focus-path isFocusTarget 复合容器下潜豁免（注册 edit 槽不再截停点选）；chrome 从 .autodown-editor-content 限定改 widget 类名 pane 无关单源（callout 27 条/details 14 条去作用域 + list/blockquote 新规则，漂移值取流式侧观感），StreamingRenderer 对应 :deep 手抄副本退役"
  - "P037-1..6（Table 家族化收官）: 修改——tableEditSlot edit-only 注册退役，Table 三态家族注册（edit 槽内部照旧构造 TableEditorController；stream 面 tableStreamFace 单源导出挂 StreamingRenderer plain script 模块作用域——纯 render 消费方保 json 表格段路径 + 防 setup 每挂载重注册；.table-node chrome 单源，编辑器 tag 规则/流式 :deep 副本退役；json 表格段无内建回落为新契约，两个 stream 路由 pin 更新）"
new_spec_components:
  - "P042-1: 家族注册扩展契约——registerBlockWidget(kind, widget, slots?) 槽覆写（一次调用拥有三槽）+ BlockEditCtx children/items/version 装配注入（复合容器卡 edit 面：递归留单一装配点，直接选中容器回落 preview 子树）+ focus-path 复合容器下潜豁免（Callout/Details/Blockquote/ListBlock 点选继续下潜至最深可编址叶）"
  - "P042-2: chrome 单源惯例（容器+Table）——chrome 挂 widget 类名 pane 无关，编辑器 CSS 去作用域 + 流式 :deep 副本退役；漂移值取流式侧观感（fence 家族镜像真值先例 039 T5）；等盒减 affordance 规则（details summary 以 1px 透明下边框占位 AttrHost 的 dashed 编辑暗示像素）"
  - "P042-3: family-parity 对拍门禁——demo/e2e/family-parity.spec.ts 七组（Callout/Details/Blockquote/List/Table/Heading/Paragraph）edit 面 vs view 面同名元素盒高/行距/chrome 计算样式逐字段对拍（expect.soft 清单化差值）；margin 不跨栏对拍（slot 缘节奏为 scroll-sync 测量模式所有，039 T3 zero-jump 在册）"
  - "P042-4: 编辑器架构决策记录（ADR）——packages/engine/ARCHITECTURE.md §7：三流派取舍表 / 租-own 分层表（caret·IME 租；模型·chrome·流式管线自有）/ 四条否决裁定（全 CM6 化否决 · Monaco 关门 · CM6-fence 在 DEBTS 039 · cosmic-text WASM 远期），来源 PLAN-041 会话裁定，交叉引用 DEBTS.md"
  - "P042-5: packages/editor 空壳退役（plan 017 re-export shim，全仓零消费方、私有未发布——直接删除无 deprecate 过渡）"
  - "P042-6: vm-smoke 惯例——AutoUI MCP（Streamable HTTP POST /mcp JSON-RPC 2.0，initialize→tools/call snapshot/action/state）驱动 vm 轨断言：AURA 快照缩进树解析定位编辑面与兄弟渲染面板；per-attempt nonce 活窗可重复跑；state/snapshot 断言带时限轮询（MCP 状态桥随 view 重建同步、紧邻操作滞后一拍——复审门禁实测）；整体重试一次（jade README:127 静默 exit 口径）；--port 参数化端口冲突"
touched_goals:
  - "目标1（容器族家族注册+回退臂退役）：四 kind registerBlockWidget（Details 差项经 T1 清单并入），containerEditSlot 函数删除，残留两处 h(widget) 为 sanctioned panel 面注册（Details 编辑器侧 panel/List panel 适配器）"
  - "目标2（Table 三态收编）：tableEditSlot 退役，stream 面单源 tableStreamFace，纯 render 消费方 json 表格段路径保持（streaming-table-gold + stream-tri-state e2e 钉）"
  - "目标3（parity spec 先红后绿）：T1 首跑 4 红（Callout 14 差/Details 8 差/List 1 差/Table 6 差）3 绿，差值清单在复审记录；终态七组全绿（复审全量 e2e 内 7/7）"
  - "目标4（三件搭车落地）：ADR §7 在册交叉引用可达；packages/editor 删除+计划口径 grep 零命中；vm-smoke 活窗 4 连跑+净窗 3 连跑退出码全 0（含复审修复）"

current_step: 8
total_steps: 8
---

# [PLAN-042] vue 侧块家族补齐 + 架构决策归档

## 变更摘要

PLAN-041 §9 悬置的"vue 侧剩余 kind 家族化"在本计划落地，另收编三件
搭车小事（用户裁定入本计划）：

1. **容器族 + Table 三态家族收编**：现状三态完整家族（`registerBlockWidget`
   ）仅 Fence/MathBlock/Mermaid；Callout/Blockquote/List 的 widget 文件
   已存在但经 node-view 回退臂挂载（`EngineEditor.vue:458-461`，无三态
   契约），Table 仅 edit 槽（:94）——demo 左右栏的现存不一致主要源于此。
   本计划按 plan 033 家族模式收编 + per-kind 三列对拍 parity spec
   （041 §9 ④ 模板）钉死。
2. **搭车①**：engine `ARCHITECTURE.md` 增「编辑器架构决策记录」节——
   三流派分析、租/own 成本框架、会话否决裁定（全 CM6 化否决 / Monaco
   关门 / WASM 远期 / CM6-fence 在 DEBTS 039），推理过程归档。
3. **搭车②**：`packages/editor` 空壳退役（plan 017 re-export shim，
   全仓 grep 零消费方，私有 workspace 未发布）。
4. **搭车③**：demo vm 自动 smoke——经 AutoUI MCP（jade 桌面六流驱动
   同款机制，见 jade-garden/front/desktop/README.md:114-132）断言
   `auto run -r vm` 双面板渲染与编辑→预览联动，替代 040 T11 的纯手验。

依赖与时序：**必须在 040 之后**（demo e2e 基线随 040 的 app.at 重写变
更，避免双重 churn）。与 041 文件集零交集（本计划动 engine/src +
demo/e2e + packages/editor；041 动 auto-lang + stream-demo +
packages/core），可并行亦可串行；按用户裁定默认串行：040 → 041 → 042。

## 目标

1. Callout/Blockquote/List（+盘点所示 Details 差项）经 `registerBlockWidget`
   家族注册，三态同一 widget、chrome 单源；node-view 回退臂对已收编
   kind 退役。
2. Table 三态收编（view/stream/edit 同 TableBlockWidget 家族）。
3. `demo/e2e/family-parity.spec.ts`：每 kind 一组三列对拍断言
   （edit 列 vs view 列盒高/行距/关键 chrome 计算样式相等），先红后绿，
   实测差值记录在复审记录。
4. 三件搭车全部落地（决策记录成文、editor 包删除、vm smoke 可重复跑）。

## 架构方案

```
EngineEditor.vue 注册面（现状 → 目标）
  registerBlockWidget('Fence'|'MathBlock'|'Mermaid')      已有，不动
  registerBlockComponent('Table', {edit})        →  registerBlockWidget('Table', TableBlockWidget)
  node-view 回退臂 :458-461（Callout/Blockquote/List）
                                       →  registerBlockWidget 三条 + 回退臂退役
  panelOf/panel 注册（view 面）         →  家族注册覆盖（family 拥有三槽）
```

家族模式依据 plan 033 D1（`block-widget.ts`：一个 widget 三 mode，
chrome 单源）；对拍门沿用 `code-block-parity.spec.ts` 度量模式（041 §9
④）。

## 技术栈

- auto-down：`packages/engine/src/editor/components/`（EngineEditor.vue、
  容器族 widget、TableBlockWidget.vue）、`packages/engine/ARCHITECTURE.md`、
  `packages/engine/src/editor/__tests__/`（callout-block-widget.test.ts 等）、
  `demo/e2e/family-parity.spec.ts`（新）、`packages/editor/`（删）、
  `demo/auto/vm-smoke.mjs`（新）
- 无新依赖（AutoUI MCP 是 auto.exe 内建，vm-smoke 用 node 原生 fetch）

## 需求分析与背景调查

（spec store 离线，以 2026-09-02 实勘 + 会话记录为据。）

- 三态家族现状：`registerBlockWidget` 仅 Fence/MathBlock/Mermaid
  （EngineEditor.vue:58-60）；Table 仅 edit 槽（:94）；Details/Query/
  Embed/Math/Mermaid 走 panelOf（:149-152）；容器族 edit 挂载走 :458-461
  的 node-view 回退装配（`h(CalloutBlockWidget, {...base, childrenOf})`
  形态），无家族三态契约——聚焦态 slotChrome（039 T4b）保证结构同构，
  但 chrome 细节（列表 marker/引用条/callout 配色与标题编辑）未经家族
  单源，demo 可观察到不一致。
- `packages/editor`：`src/index.ts` 仅一行 `export * from
  '@autodown/engine/editor'`（plan 017 迁移 shim）；全仓 grep
  `@autodown/editor` 零消费方（仅自身文件）；workspace 私有未发布。
- AutoUI MCP：vm 运行日志 `AutoUI MCP: listening on http://127.0.0.1:9247`；
  jade 桌面六流即经它驱动（click/type_text + 断言），机制说明在
  jade-garden/front/desktop/README.md:114-132，含已知坑（下探针进程偶发
  静默 exit(1)）。
- 文本叶（paragraph/heading）：039 T4b/T12 slotChrome 已钉结构同构，
  本计划核查确认即可，预期无代码改动。
- 裁定：容器族收编按 033 家族模式（family 拥有三槽，替换既有
  per-slot/panelOf 注册）；editor 包直接删除（零消费 + 未发布，无
  deprecate 过渡必要）；vm-smoke 独立脚本不进 playwright（原生窗口
  无浏览器驱动面）。

## 详细设计

1. **T1 红**：`demo/e2e/family-parity.spec.ts` 新建，per-kind 三列对拍
  （edit 列元素 vs view 列同名元素的 offsetHeight/lineHeight/关键
   chrome backgroundColor/borderWidth）；覆盖 Callout/Details/
   Blockquote/List/Table/Heading/Paragraph 七组；首跑记录实测差值清单
   进本文件复审记录（差值=工作清单）。
2. **T2 绿（容器族）**：EngineEditor.vue 增
   `registerBlockWidget('Callout'|'Blockquote'|'List', ...)`；:458-461
   回退臂对应 kind 删除（家族编辑槽接管）；既有 panelOf/panel 注册
   被 family 覆盖（family 拥有三槽语义，block-widget.ts 注册序）；
   `__tests__/callout-block-widget.test.ts` 等断言更新。
3. **T3 绿（Table）**：`registerBlockWidget('Table', TableBlockWidget)`
   三态收编，`tableEditSlot`（:68-93）退役；TableEditorController
   语义不变（edit 槽内部照旧构造 controller）；table 相关 e2e 回归。
4. **T4 文本叶核查**：跑 T1 的 Heading/Paragraph 两组——若绿，复审记录
   记"核查通过零改动"；若有差，按 039 同法修（预期极小）。
5. **搭车①**：`packages/engine/ARCHITECTURE.md` 增「编辑器架构决策
   记录」节：三流派表（原生输入即引擎/contenteditable+受控模型/全自研
   引擎）、租-own 分层表（caret/IME 租、模型与 chrome 自有）、否决
   裁定四条（全 CM6 化、Monaco、WASM 远期、CM6-fence→DEBTS 039），
   交叉引用 PLAN-041 裁定记录与 DEBTS.md。
6. **搭车②**：删除 `packages/editor/` 目录；`pnpm install` 刷
   pnpm-lock.yaml；全仓 grep `@autodown/editor` 零命中复核。
7. **搭车③**：`demo/auto/vm-smoke.mjs`——拉起/复用 AutoUI MCP
   （127.0.0.1:9247），断言：左编辑面板可聚焦输入、右预览面板含
   期望文本、输入后预览更新（联动）；README 记录跑法
   （先 `auto run -r vm` 再 `node vm-smoke.mjs`）；jade README:127
   的静默 exit 坑写入脚本注释（重试一次的口径）。

## 测试设计

- T1 parity spec 先红后绿；最终 `cd autodown/demo && npx playwright
  test` 全绿（既有 65 + 新 family-parity）。
- engine 回归：`cd autodown && pnpm -C packages/engine build && pnpm
  -C packages/engine test`（776 基线 + 更新的 widget pin）。
- T7 删除后：`cd autodown && pnpm install && pnpm -r build` 全绿 +
  grep 零命中。
- T8：`node demo/auto/vm-smoke.mjs` 退出码 0，输出断言清单。

## 验收标准

1. `registerBlockWidget` 覆盖 Fence/MathBlock/Mermaid/Callout/
   Blockquote/List/Table 七 kind；:458-461 回退臂仅剩未收编 kind
   （若有）。
2. family-parity.spec.ts 七组全绿（edit/view 列对拍零差）。
3. engine 776+ 测试与 demo 全套 e2e 全绿。
4. ARCHITECTURE.md 决策记录节在册；packages/editor 不存在于 workspace
   且全仓无引用；vm-smoke.mjs 可重复执行通过。

## 执行步骤

- T1 [✅ 已完成] `demo/e2e/family-parity.spec.ts` 七组对拍 spec 落位，首跑
  4 红（Callout 14 差/Details 8 差/List 1 差/Table 6 差）3 绿（Blockquote/
  Heading/Paragraph），差值清单录入复审记录。
- T2 [✅ 已完成] EngineEditor.vue 四条 registerBlockWidget（Callout/Blockquote/
  ListBlock/Details，block-widget.ts 增槽覆写参数；edit 槽经 BlockEditCtx
  注入装配闭包 children/items/version，回退臂 containerEditSlot 退役；
  focus-path.ts 容器族下潜豁免保住"点卡即入文"交互）；chrome 单源：编辑器 CSS
  去作用域至 widget 类名（callout 27 条/details 14 条/list/blockquote 新
  widget 类规则，值取流式侧既有观感），StreamingRenderer 对应 :deep 手抄
  副本退役。验证：engine 776 全绿（widget pin 套件零改动直过）+ family-parity
  容器四组转绿 + 容器相关 e2e 24 个全过（container-editing/wysiwyg 等）。
- T3 [✅ 已完成] `registerBlockWidget('Table', TableBlockWidget)` 三态收编（view/stream/
  edit 槽闭包：edit 内部照旧构造 TableEditorController；stream 槽复用单源
  tableStreamFace——原 StreamingRenderer 本地 StreamingTableFace 上提为
  block-widget-panels 导出，注册留在 StreamingRenderer plain script 模块
  作用域（原 face 之家、无循环导入、纯 render 消费方保路径）；
  tableEditSlot/:94 注册退役）。chrome 单源：`.table-node` widget 类规则
  （取流式真值：单元格 padding 0.9rem/表头 accent-soft 底），编辑器 tag
  规则与流式 :deep 副本退役。验证：engine 776 绿（两个 stream 路由 pin 更新
  至新契约：表格路径=注册非内建）+ family-parity Table 组绿 + stream-tri-
  state（含 json 表格段与 Table 计算样式对拍）绿。
- T4 [✅ 已完成] 文本叶核查通过零改动：Heading/Paragraph 两组自 T1 首跑即绿
  （039 T4b slotChrome + T12 字色钉过的成果），T2/T3 收编后复跑仍绿（family-
  parity 7/7）。
- T5 [✅ 已完成] 全量回归全绿：engine build（vue-tsc + vite + parser-pure/
  no-tiptap/editor-gen/dist-stamp 四门禁）+ 776 测试 + demo playwright 全套
  72 个（既有 65 + family-parity 7）全过；两张编辑面截图副产物随 chrome
  变更刷新入库（table padding/表头底色真变了，非噪声 churn）。
- T6 [✅ 已完成] ARCHITECTURE.md 增「## 7. 编辑器架构决策记录（ADR）」：
  7.1 三流派取舍表（原生输入即引擎/受控 contenteditable/编辑器框架/自研
  现行）、7.2 租-own 分层表（caret/IME 租；模型/chrome/流式管线自有）、
  7.3 四条否决裁定（全 CM6 化否决/Monaco 关门/CM6-fence 在 DEBTS 039/
  WASM 远期）。验证：章节在册（:283）；DEBTS.md 相对链接可达（仓库根
  ../../../DEBTS.md）；041 引用按文档惯例纯文本+归档路径注记（其文件在
  主检出未提交，防断链）。
- T7 [✅ 已完成] packages/editor 空壳退役：前提复核（src/index.ts 仅一行
  re-export；消费方 grep 仅自身文件）→ git rm + pnpm install 刷 pnpm-lock。
  验证：`pnpm -r build` 退出码 0 全绿（5 项目）+ 计划口径 grep（*.ts/*.json
  排除 node_modules）零命中（StreamingRenderer 一处 CSS 历史注释提及不在
  grep 口径内，保留）。
- T8 [✅ 已完成] demo/auto/vm-smoke.mjs + README 跑法节。协议实勘自
  auto-lang mcp_server.rs（Streamable HTTP：POST /mcp JSON-RPC 2.0，
  initialize→tools/call snapshot/action/state）。验证：同窗两连跑 + 净窗
  完整流程（起窗→node vm-smoke.mjs）退出码均 0；断言三项全过（编辑面
  textarea 可输入、.Edit→state.content 联动、右面板真渲染且 `# ` 标记被
  heading 渲染消费）。nonce 支持活窗重复跑；--port 参数化 9247 冲突；
  jade README:127 静默 exit 坑写进头注（整体重试一次口径）。

## 复审记录

### T1 首跑实测差值清单（2026-09-02，worktree plan-042-dev，`npx playwright test family-parity`）

4 组红 / 3 组绿（Blockquote、Heading、Paragraph 首跑即绿——edit/view 两面计算样式全等）：

- **Callout（14 差，全红）**：右栏 view 面完全无 chrome——backgroundColor
  `rgba(0,0,0,0)`（左 edit `rgb(255,251,235)`）、border 0px（左 1px #fcd34d）、
  borderRadius 0（左 12px）、padding 全 0（左 17.6/16/16px）；title fontSize
  13 vs 15.2px、fontWeight 600 vs 400、lineHeight 13 vs 24.32px、color amber
  vs 深灰。根因：widget 渲染 `.autodown-callout-*` 类，chrome 只写在
  `autodown-editor.css`（`.autodown-editor-content` 限定左栏）；右栏
  StreamingRenderer `:deep` 只抄了 markstream 的 `.admonition-*` 类，永不匹配。
- **Details（8 差）**：右栏 summary 行无样式——bg 透明 vs 左
  `rgba(107,114,128,0.06)`、padding 0 vs 8.8/8.8/12px、fontWeight 400 vs 500、
  fontSize 15.2 vs 14.4px、lineHeight 24.32 vs 23.04px、行高差 18.33px。
  右栏 details 经 panel 管线渲染为 `div.autodown-details`（非原生
  `<details>`；`:::details` 拆分分支不适用于 `$details` 语法）。
- **List（1 差）**：ul paddingLeft 24px（左，editor css 1.5rem）vs 20px
  （右，StreamingRenderer `:deep` 手抄 1.25rem）——双源漂移实锤。li 组全绿。
- **Table（6 差）**：th/td paddingTop/Bottom 6.4px（左 0.4rem）vs 14.4px
  （右 0.9rem）；th backgroundColor 左 `rgba(107,114,128,0.06)` vs 右
  `rgb(238,242,255)`（accent-soft）；th height 38.09 vs 54.09（差 16px）。
  边框/字号/行距/td 底色全等。
- **Blockquote / Heading / Paragraph（0 差）**：border 条/字色/行距/标记样式
  两面全等（039 已钉的成果）。

结论：红项集中在「右栏 view 面 chrome 缺失/双源值漂移」，与计划预判一致；
修复主体在 T2（容器族）+ T3（Table）。spec 落位
`demo/e2e/family-parity.spec.ts`（选择器修正两处：嵌套 list 取直子 ul；
details 先点 marker 展开再点内容聚焦——marker 的 click.stop 只切换展开）。

### 复审记录（2026-09-03，/auto-plan:review）

复审人：zhaopuming（会话复审）｜工作树 `.worktrees/plan-042-dev`（8 提交 + 1 复审修复提交）。

**逐条验收（全部重跑实证，不信任勾选框）**：

1. **家族注册覆盖 + 回退臂退役：PASS**。registerBlockWidget 八处（EngineEditor.vue:62-64
   试点三 + :115-132 容器四 + :169 Table——超出计划的七 kind：Details 差项经
   T1 实测差值成立并入，属计划待澄清①预授权路径）。containerEditSlot/tableEditSlot
   函数已删（grep 仅存 2 处注释提及）；残留两处 `h(widget)` 为 sanctioned panel
   面注册（Details 编辑器侧 panel :240——marker 动词需活引擎；List panel 适配器
   block-widget-panels.ts:66）。新增代码零 TODO/FIXME/HACK。
2. **family-parity 七组全绿：PASS**。复审全量 e2e 内 7/7
   （/tmp/review-e2e.log 22-28 号用例）。
3. **全量门禁：PASS**。复审重跑：`pnpm -C packages/engine build` exit 0（四
   门禁过）+ vitest 776/776 + demo playwright 72/72（1.3m）。
4. **搭车三件：PASS**。①ARCHITECTURE.md §7 三小节在册（:283 起），DEBTS.md
   相对链接自文件目录可达；②packages/editor 工作树中不存在于 git 索引（磁盘
   node_modules 残壳无害），`pnpm -r build` exit 0，计划口径 grep 零命中；
   ③vm-smoke 净窗 3 连跑 + 活窗 4 连跑退出码全 0——**含一次复审修复**（见下）。

**复审修复（commit 于分支）**：验收 4 首测抓到可重复性 flake——紧邻第二次运行
state 断言失败。根因：AutoUI MCP 状态桥随 view 重建同步，`autoui_state` 在
type_text 后可能返回滞后一拍的状态（失败输出中的 nonce 实为前一 attempt 的
文档）。修复：state 与渲染断言改带 2s 时限的 100ms 轮询。修复后 7 连跑全 0。

**遗漏/延后/workaround 猎查**：

- **无未批准延后、无 dropped 子项**：T1-T8 逐一对 diff 核对（26 文件 +880/-1125，
  其中 041 计划文件 385 行"删除"系 master 期间被 041 会话提交 d616860 所致的
  diff 假象——本分支从未触碰该文件，merge 时无冲突面）。master 执行期漂移
  （ff06141 core token 映射 + d616860）与本分支文件集零交集。
- **计划-实施偏差（非缺失，记录）**：T2 预告"`__tests__/callout-block-widget.test.ts`
  等断言更新"——实际零改动直过（该套件直接挂 widget 不经注册面）；实际更新的
  pin 是两个 stream 路由测试（表格段无内建回落新契约）。
- **债候选三条（在册，不阻塞）**：
  ① StreamingRenderer 死规则：`.admonition-*` :deep 一组永不匹配 widget DOM
  （widget 渲染 `.autodown-callout-*`）——清理候选；
  ② DEBTS.md 040 行「VM 滚动同步 → 归 PLAN-042 补齐」指向失准——本计划范围
  从未含该任务，债仍开放，归属需更正（043 或新计划）；
  ③ 容器 kind 清单双处硬编码（focus-path.ts COMPOSITE_CONTAINER_KINDS 与
  EngineEditor isExpandableContainer）——新增容器 kind 需同步两处（结构注记级）。

**spec-impact 元数据**：已填 frontmatter（supersedes P033/P035/P037 各节条目；
new P042-1..6；touched_goals 四条）——/auto-plan:merge 按此 upsert。

**结论：四条验收全 PASS，无阻塞债 → status: reviewed，交 /auto-plan:merge。**

## 待澄清事项

- T2 家族化后容器族 panel 注册的去留按 block-widget.ts「family 拥有
  三槽」语义执行（替换 per-slot 注册）；若 Details 盘点显示回退臂与
  panelOf 双路径有差，并入 T2 处理，不另立任务。
- vm-smoke 的 MCP 协议细节以 jade 六流驱动实现为参照（实施时从
  jade-garden README 指引定位其驱动脚本）；若 9247 端口冲突，脚本
  参数化端口。
