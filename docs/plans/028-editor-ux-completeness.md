# [PLAN-028] 编辑器体验收尾包——撤销接线/点击可靠性/mark roundtrip/选区定位

---
plan_id: PLAN-028
status: reviewed
feature_name: 编辑器体验收尾（Ctrl+Z 撤销 UI 接线 + blur 回写吞点击修复 + `***` 嵌套 roundtrip + underline mark 补齐 + SlashMenu 选区定位）
author: [zhaopuming, zcode]
created_at: 2026-08-30T17:40:00+08:00
updated_at: 2026-08-31T09:20:00+08:00
supersedes_spec_components:
  - ".autoos/specs.json architecture P024-3: 气泡菜单「underline 裁剪」与非目标声明——028 P2T3 回填第 6 按钮（toggleUnderline 真实现），裁剪态陈述作废"
  - ".autoos/specs.json designs P024-4: 「bubble_menu.at 移除 underline 按钮（源级）」——028 反向回填 + Mark.Underline 全链（枚举/定界/序列化/渲染/命令五臂）"
new_spec_components:
  - ".autoos/specs.json 六节 P028-1..6: 编辑器体验收尾——① Ctrl+Z/Y/Shift+Z UI 接线（headless undo-wiring.ts 路由表 + runHistory 全宿主重同步 + historyEpoch 聚焦面重挂载；附带引擎 redo() 存量 bug 修复：post-tree 误压 undoStack 改记 PRE 态，undo→redo→undo 可循环）；② 吞点击：归因 025 AssemblyView 稳定壳已修（028 原始鼠标事件跨重绘直点用例钉死 + 七处 e2e Save 绕行清除）；③ parser 嵌套定界（`***` 三连先于 `**` 消费→Strong(Em(...)) + scanDelim 真闭合嵌套首字符护栏放宽（`*`/`_` 开头），流式自动闭合护栏不变；`**_x_**` 同族）；④ underline 全链（Mark.Underline=6 尾部追加 + `__`/`___` 定界三连先于双连→Underline(Em) + `_`-系全长度 intraword 护栏 + serializer `__..__` 位于 em 内 del 外 + block-wnode PEEL/wrapMark + render-node `<u>` + rich-html `<u>`↔Underline 双向 + dom-marks u + adapter MARK_BY_NAME/toggleUnderline + 气泡按钮 + z-index:30 修 boundary 拦截；`___x___` 规范化为 `__*x*__`）；⑤ view.coordsAtPos（聚焦富宿主 blockRangeToDomRange→getClientRects()[0] 空退 getBoundingClientRect；AdapterView 可选成员；生成 SlashMenu 两段式定位零改动直连）；执行期两条方法论发现：e2e 须 E2E_PORT 隔离（playwright reuseExistingServer 复用主检出 5173 会假绿——原生撤销+input diff 回写曾掩盖未接线）、Auto 转译不支持 `!(expr)` 括号取反（需布尔变量式）"
touched_goals:
  - ".autoos/specs.json P024-2: 行内 WYSIWYG 目标——028 补齐其 v1 裁剪面（underline mark、`***` 嵌套 roundtrip、blur 吞点击产品级验证）并销 024 在档执行期发现两项（DEBTS 024 两行）"
current_step: 10
total_steps: 10
---

## 变更摘要

清偿编辑器线（023-027）遗留的四项用户可感债务：① **Ctrl+Z/Y 撤销重做 UI
接线**（025-D2：引擎 undo 自 023 起从未绑定键盘——命令级一步撤销由 headless
钉死但用户按不了）；② **blur 回写吞点击产品修复**（024 在档 papercut、025-D4：
"Ctrl+B 后点另一块第一次没反应"，e2e 至今以点 Save 绕行）；③ **parser 嵌套
定界 roundtrip 修复**（024 执行期发现：Strong+Em 序列化 `***x***` 后再解析
丢 Em——md 重载路径数据受损）；④ **underline mark 补齐**（024 v1 裁掉的
气泡按钮背后是 Mark/解析/序列化三处缺失，一并补上）。顺带 **SlashMenu
选区坐标定位**（021-F5：菜单现落默认位置，024 选区映射原语已可直接复用）。

## 目标

1. **撤销重做接线**：EngineEditor 内容级 keydown 增 Ctrl+Z（undo）/
   Ctrl+Y、Ctrl+Shift+Z（redo）；历史变更后聚焦宿主 knownText 经
   syncFromModel 重同步（预览路径随 repaint 自动）；IME 组合期不拦截。
2. **吞点击修复**：blur 提交引发的 views 重算不得吃掉引发它的那次点击——
   去除 e2e 的 Save 绕行，产品路径直修（归因方向在档：组件身份稳定壳已
   落地，残留在聚焦态↔预览态分支切换的事件时序）。
3. **roundtrip 完整性**：`***x***` 与 `**_x_**` 家族经 serialize→parse
   往返 Strong+Em 双 mark 无损（定界符解析增强，parser .at 源）。
4. **underline mark**：`__x__` 定界（Mark 枚举 + parser + serializer +
   气泡按钮恢复），全链 roundtrip。
5. **SlashMenu 定位**：adapter 暴露 coordsAtPos（复用 024 selection-map
   的 blockRangeToDomRange→getClientRects），菜单随光标出现。
6. 全程 EDITOR-CONTRACT 冻结面零破坏；DEBTS 台账相应行销账。

## 架构方案

```
键盘层（EngineEditor.onContentKeydown 扩展）
└─ Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z → engine.undo/redo
   └─ 聚焦宿主 syncFromModel（knownText 重同步；预览随 repaint）
点击可靠性（blur 提交时序）
└─ 归因→修复：提交引发的重绘与点击命中解耦（方向：mousedown 锚定
   / 延迟 selectBlock / 分支切换 DOM 保序——执行期以复现用例裁定）
mark 域（auto/ 单源，本仓 gen 再生）
├─ parser .at：`***`/`**_` 嵌套定界 + `__` underline 定界
├─ block_model .at：Mark.Underline
└─ bubble_menu .at：underline 按钮恢复（撤 no-op 垫片）
定位（adapter view 面）
└─ coordsAtPos：selection-map.blockRangeToDomRange → client rects
```

- **非目标**：跨块选区（后续）、math/mermaid 编辑态深化（026 余量在册）、
  Dependabot 依赖清偿与发包前置（DEBTS 008/027，建议 029 单列）。

## 技术栈

现有栈；三处 .at 源（parser/block_model/bubble_menu）均本仓 auto/ 目录，
`pnpm gen:parser` / `pnpm gen:editor` 本地再生——**零跨仓依赖**。

## 需求分析与背景调查

（spec 账本含 P023..P027 各节；本节锚定债务台账与模块事实。）

- **D2（025 复审登记）**：UI 无 Ctrl+Z 接线——grep 实证 BlockHost/
  EngineEditor 零 undo 引用；引擎 undo/redo + 历史重绘路径（emit
  history:true）自 018 在册，纯接线债。
- **D4（024 在档 / 025 复审）**：blur 富回写触发 applyTree→views 重算→
  click 落空；025 已落 AssemblyView 稳定壳（源码 11 处引用实证），但复审
  自账"产品修复未做、e2e 以 Save 稳定化绕行"。
- **`***` 缺陷（024 执行期发现，待澄清在档）**：span 同含 Strong+Em 时
  序列化发射 `***x***`，parser（生成物）不支持三连定界嵌套——再解析只剩
  Strong；`**_x_**` 同坏。模型/编辑器内双 mark 无损，仅 md 重载受损。
- **underline（024 v1 裁定）**：Mark 枚举（Strong/Em/Code/Link/Image/Del）
  无 Underline；气泡按钮已从 bubble_menu.at 裁除（grep 实证空）、
  toggleUnderline 留 no-op 垫片。
- **F5（021 复审）**：SlashMenu 两段式定位依赖 `editor['view'].coordsAtPos`
  而适配器无此面→定位跳过落默认位；026 已建 view.dom 锚，024 的
  selection-map.blockRangeToDomRange 提供 DOM Range——coordsAtPos 可直通。
- **gen 布局**：`auto/parser/gen.mjs` 覆盖 block_model.at→block-model.ts
  与 parser 双产物；bubble_menu.at 走 gen:editor（部署清单不变，内容变更）。

## 详细设计

### 1. 撤销重做接线（EngineEditor.vue）

`onContentKeydown` 增分支：`(ctrl||meta) && key==='z'` → undo（shift 则
redo）；`'y'` → redo。执行后 `hostFor(focusedId)?.syncFromModel()`（宿主
knownText 对齐历史树）；`e.preventDefault()`。组合期（任一宿主
composition.composing）直接放行不拦截。

### 2. 吞点击修复（执行期归因裁定）

复现用例先红：e2e 移除 Save 绕行、直点目标块。候选修法（按归因落）：
mousedown 时锚定目标块 id（pointerdown 捕获阶段记录，click 读锚而非命中
元素）/ blur 提交的重绘推迟到 microtask 后 / 聚焦↔预览分支切换保持外层
node-slot DOM 节点身份。修后该 e2e 转绿且既有 22 spec 不回归。

### 3. parser 嵌套定界 + underline（auto/parser/markdown_parser.at）

定界符扫描增强：`***`/`___` 三连（含混合 `**_x_**` 家族）按 CommonMark
定界符栈语义拆解为嵌套 Strong(Em(...))；`__x__` 独立为 Underline（优先级：
三连先于双连消费）。block_model.at 增 `Underline = 6`；serializer
spanMd 增 `__..__` 包裹（顺序与 Mark 语义对齐）；convertInlines 增
underline 通道。金标用例：`***x***`、`**_x_**`、`__x__`、嵌套含
inline_code 干扰例。

### 4. 气泡 underline 恢复（auto/editor/bubble_menu.at）

按钮回填（icon/btn 通道既有）+ `chain().focus().toggleUnderline()`；ext
垫片注释更新（真实现经 mark 命令层补 toggleUnderline——与 Bold 同式，
commands/marks 域顺带补全）。

### 5. coordsAtPos（tiptap-adapter.ts）

`view.coordsAtPos(blockId, offset)`：blockRangeToDomRange 取
`getClientRects()[0]`（空则退回 range.getBoundingClientRect）；SlashMenu
computeMenuPosition 消费路径接通（现有两段式定位代码已写好，只缺坐标源）。

## 测试设计

- **headless（TDD 先红）**：undo 接线（engine 级 undo/redo 树断言已有——
  补 keydown 路由的控制器级测试）；`***`/`**_`/`__` 金标 parse 往返 +
  serialize roundtrip；toggleUnderline 命令；coordsAtPos 纯函数段（range
  构造逻辑注入式）。
- **e2e**：`e2e/undo.spec.ts`（输入→Ctrl+Z 回退→Ctrl+Y 重做，富宿主与
  代码块两路）；`inline-marks.spec.ts` 增吞点击直点用例（去 Save 绕行）+
  underline 按钮用例；slash 菜单定位断言（菜单纯出现在光标附近坐标带）。
- **回归门**：engine 全量（432 基线）、build 三断言、gen:parser/gen:editor
  两连跑确定性、demo e2e（22+新增）、jade-garden build。

## 验收标准

- [x] Ctrl+Z/Ctrl+Y/Ctrl+Shift+Z 在编辑器内撤销/重做生效（富宿主与代码
  块两路 e2e 钉死），IME 组合期不受干扰。
  [✅] undo.spec.ts 两路绿含 Shift 别名；组合期放行由 keydown 分支守卫
  （IME 冒烟用例既有绿）。
- [x] 去除 Save 绕行后"编辑→直点另一块"一次生效（吞点击 e2e 绿）。
  [✅] 原始鼠标事件跨重绘直点用例绿（heading+列表深槽位）；七处绕行清除。
- [x] `***x***`、`**_x_**`、`__x__` serialize→parse 往返 mark 无损
  （金标 + roundtrip 断言）。
  [✅] 金标 11 用例（嵌套 5 + underline 6）+ roundtrip 全绿。
- [x] 气泡菜单 underline 按钮可用且 `__x__` 落盘。
  [✅] e2e：6 按钮、underline 点击、三 mark `<u><strong><em>` 全链落盘。
- [x] SlashMenu 出现在光标附近而非默认位置。
  [✅] slash-position.spec.ts 坐标带断言先红（默认位）后绿。
- [x] EDITOR-CONTRACT 冻结面零破坏；DEBTS（025-D2/D4、021-F5、024 两项
  执行期发现）销账。
  [✅] EDITOR-CONTRACT.md/BlockHost 零 diff，AdapterView 仅加可选成员
  （惯例同前）；DEBTS 五项销账（021-F5 改行 + 024/025 四行落地即清偿），
  commit 79143a6。

## 执行步骤

> 约定：工作树 `.worktrees/plan-028-dev`（由 /auto-plan:work 创建）；验证
> 均在工作树根执行。`PnTm` = Phase n Task m。

### Phase 0：撤销重做接线

- [x] P0T1 keydown 接线：改 `autodown/packages/engine/src/editor/components/EngineEditor.vue`
  的 `onContentKeydown`——Ctrl+Z（Shift 变体/Ctrl+Y）→ `engine.undo()/redo()`
  + 聚焦宿主 `syncFromModel()`，组合期放行；`src/editor/__tests__/undo-wiring.test.ts`
  （TDD：路由与宿主重同步）。验证：`npx vitest run src/editor/__tests__/undo-wiring.test.ts`。
  [✅ 已完成] headless 核心 engine/undo-wiring.ts（historyActionOf 路由表 + runHistory
  全宿主重同步——undo 可回退任意块，只同步聚焦宿主会留陈旧 knownText 基线）；EngineEditor
  keydown 分支 + 组合期放行 + historyEpoch 进聚焦视图 key（宿主 v-html/代码面草稿非响应，
  历史树必须 remount 落 DOM，覆盖富宿主与代码块两面）。TDD 先红（模块缺失）后绿 5/5；
  editor 全量 218 绿；vue-tsc -b 过；commit 5900cc4。
- [x] P0T2 e2e：新建 `autodown/demo/e2e/undo.spec.ts`（富宿主输入→Ctrl+Z
  回退→Ctrl+Y 重做；代码块编辑同路）。验证：`cd autodown/demo && npx
  playwright test undo.spec.ts`。
  [✅ 已完成] 两用例绿（富宿主含 Ctrl+Shift+Z 别名；代码块 commit→undo→redo）。
  执行期两发现：① e2e 必须 E2E_PORT=5199 隔离——playwright reuseExistingServer
  会复用主检出的 5173 dev server，测的是无改动代码（rich 路曾被浏览器原生撤销
  +input diff 回写假绿，标记法甄别）；② 引擎 redo() 存量 bug——把 post-thread
  树压进 undoStack（preTree/preSel 捕获未用），redo 后再 undo 空转；已改记
  PRE 态并补 undo→redo→undo 循环引擎测试。editor 221 测试绿；commit b62b844。

### Phase 1：吞点击修复

- [x] P1T1 复现先红：`autodown/demo/e2e/inline-marks.spec.ts` 增"编辑后
  直点另一块一次生效"用例（无 Save 绕行），确认现状红。验证：该用例
  失败输出在案。
  [✅ 已完成——现状不红] 用例已加（inline-marks.spec.ts，原始 mouse 事件
  down→80ms→up 跨重绘手势，比 locator.click 更严——后者 actionability 重试会
  掩盖吞点击）。实测绿：025 P2T1 AssemblyView 稳定壳已保住 node-slot DOM 身份，
  024 在档根因（component :is 身份不稳定）已修，仅无人钉 e2e。heading 直点与
  列表深槽位直点（container-editing 在档形状）均一次生效。
- [x] P1T2 归因与修复：按详细设计 §2 候选方向定位（组件身份/事件时序/
  DOM 保序），实施修复至 P1T1 用例转绿且 22 spec 全回归。验证：`cd
  autodown/demo && npx playwright test`。
  [✅ 已完成] 归因落"组件身份"方向——025 稳定壳即修复本体，无新代码修法；
  残留债务是 e2e 绕行：inline-marks 3 处 / container-editing focusListItem+
  commitToRightPane / host-protocol commitToRightPane / undo 1 处共七处 Save
  绕行全部改直点。全套 25/25 绿（E2E_PORT=5199 隔离工作树 server）；commit 290f530。

### Phase 2：parser roundtrip + underline

- [x] P2T1 嵌套定界：改 `autodown/packages/engine/auto/parser/markdown_parser.at`
  （`***`/`**_` 家族定界符栈语义）+ `pnpm gen:parser`；金标/roundtrip 用例
  （TDD 先红于改源前入库）。验证：`npx vitest run src/render/__tests__/markdown-parity.test.ts
  src/parser` 相关 + `pnpm gen:parser` 两连跑一致。
  [✅ 已完成] 金标 5 用例先红（block-parser.test.ts 新 describe）：`***x***`→
  Strong+Em 双 mark、`**_x_**` 同、inline_code 干扰例、serialize→parse 往返、
  未闭合三连保持字面量。实现：`***` 三连分支先于 `**` 消费→Strong(Em(...)) +
  scanDelim 真闭合时首字符护栏放宽（`*`/`_` 开头=嵌套，流式自动闭合护栏不动）。
  parity 43 绿、parser 111 绿、引擎全量 443 绿（432 基线+11 新增）、gen 两连跑
  字节一致。执行期发现：Auto 转译不支持 `!(expr)` 括号取反（生成 `!close != -1`
  恒真拒扫），改布尔变量式 `!nest`；commit 2fa5e77。
- [x] P2T2 underline 全链：`auto/parser/markdown_parser.at` 增 `__` 定界 +
  `auto/block_model.at`（经 gen:parser 覆盖）增 Mark.Underline + serializer
  `__..__` + mark 命令层 toggleUnderline；用例同式。验证：`npx vitest run`
  相关 + `pnpm gen:parser` 两连跑一致。
  [✅ 已完成] Mark.Underline=6（尾部追加，枚举数值稳定）；parser：`___` 三连
  先于 `__` 双连（Underline(Em(...)) / Underline(...)），`_` 保持 Em，
  `_`-系全长度 intraword 护栏（snake__case__word 字面）；serializer
  spanMd `__..__` 位于 Em 内 Del 外；渲染/宿主/命令全臂补齐：block-wnode
  PEEL_ORDER+wrapMark、render-node `<u>`、rich-html 双向（`<u>`↔Underline）、
  dom-marks u、adapter MARK_BY_NAME+toggleUnderline 真实现（撤 024 no-op 垫片）。
  `___x___` 规范化为 `__*x*__`（同 `**_x_**`→`***x***`），mark 无损+一轮后字节
  稳定。金标 6 用例先红；toggleMarkOnSpans/spansToHtml 钉子 2；引擎全量 451
  绿；gen 两连跑确定；vue-tsc 过；commit dcb67ae。
- [x] P2T3 气泡恢复：改 `auto/editor/bubble_menu.at`（underline 按钮回填）
  + ext 垫片真实现 + `pnpm gen:editor`；对拍（按钮在、命令通）。验证：
  `pnpm gen:editor && pnpm gen:editor && pnpm build`。
  [✅ 已完成] 按钮回填（bold/italic/underline/strike/code/link 六枚，italic
  后 strike 前；icon 通道既有 Underline 直用）；ext 注释更新；命令通=P2T2
  toggleUnderline 真实现直连。执行期发现：气泡无 z-index 被 boundary hover
  条（z-10 栈上下文）拦截第 6 按钮——CSS 补 z-index:30。e2e 气泡用例升级：
  6 按钮+underline 点击+三 mark 全链 `<u><strong><em>` 落盘断言（顺带销
  024"v1 parser 不能再嵌 ***"的陈旧注释）。gen:editor 两连跑确定、build 三
  断言过、inline-marks 6/6 绿；commit c58ae2b。

### Phase 3：SlashMenu 定位

- [x] P3T1 coordsAtPos：`src/editor/engine/tiptap-adapter.ts` 增
  `view.coordsAtPos`（selection-map 复用）+ SlashMenu 定位接通验证（e2e
  断言菜单纯出现于光标坐标带）。验证：`cd autodown/demo && npx playwright
  test check-heading.spec.ts`（含 slash 定位断言的就近 spec）或新增小 spec。
  [✅ 已完成] adapter view 增 coordsAtPos(from)：getFocusedRichHost（空则
  blockId 选择器兜底）→ blockRangeToDomRange → getClientRects()[0]（空退
  getBoundingClientRect），PM 形状四坐标；AdapterView 冻结面加可选成员
  （惯例同 getAttributes/view）。生成 SlashMenu 两段式定位零改动直连。
  新增 slash-position.spec.ts（坐标带断言先红——默认位 menuTop=85，后绿
  落段落带）；scroll-sync 含 slash 钳制 4 用例回归绿；vue-tsc 过；
  commit 1d1fe6c。

### Phase 4：收尾

- [x] P4T1 全量门 + 销账：engine `pnpm test && pnpm build`、gen 双管线
  确定性两连跑、demo e2e 全绿、`cd jade-garden/front && pnpm build`；DEBTS
  台账销账行（025-D2/D4、021-F5、024 执行期两项）更新 → `execution_done`。
  验证：四门退出码 0。
  [✅ 已完成] 四门全绿：engine 451 测试 + build 三断言过；gen:parser+
  gen:editor 两连跑零 diff；demo e2e 26/26（E2E_PORT=5199 隔离）；jade-garden
  front build ✓（chunk 体积警告为既有）。DEBTS 销账：021-F5 行改写 + 025-D2/
  D4、024-***/underline 四行落地即清偿（commit 79143a6）。验收标准六项全勾；
  → execution_done。

## 复审记录

**复审**：zcode，2026-08-31 09:20（/auto-plan:review；工作树
`.worktrees/plan-028-dev` @ 79143a6，分支领先 master 8 commits，工作树净）。

**全量门（复审唯一全量套件运行，全部退出码 0）**：engine `pnpm test`
451/451 + `pnpm build` 三断言 + `vue-tsc -b` 0 错；demo e2e `E2E_PORT=5199`
26/26；gen:parser + gen:editor 两连跑 `git status` 0 差异；jade-garden/front
`pnpm build` ✓（chunk 体积警告为既有）。

**逐条验收**：

1. **撤销重做接线 — PASS**：undo.spec.ts 两路（富宿主含 Ctrl+Shift+Z 别名；
   代码块 commit→undo→redo）在 26 套件内绿；headless undo-wiring 5 用例 +
   引擎 undo→redo→undo 循环用例绿；组合期守卫代码在位
   （EngineEditor.vue `onContentKeydown`：composing 判定先于 preventDefault
   return）。验证口径注：Playwright 无真 IME 引擎，组合期×Ctrl+Z 的直接
   交互为代码级验证 + 既有 CJK 冒烟绿（预存限制，非本计划引入）。
2. **吞点击直点一次生效 — PASS**：inline-marks 直点用例（原始 mouse 事件
   down→80ms→up 跨重绘，严于 locator.click 的 actionability 重试）绿；
   heading 直点 + 列表深槽位直点均一次生效；七处 Save 绕行（inline-marks×3/
   container-editing×2/host-protocol/undo）全数改直点后全套 26 绿。
3. **`***`/`**_`/`__` roundtrip — PASS**：金标 11 用例（嵌套定界 5 +
   underline 6）绿，含 inline_code 干扰例与 serialize→parse 往返；
   `___x___` 规范化为 `__*x*__`（mark 无损 + 一轮后字节稳定，测试钉死）。
4. **气泡 underline — PASS**：e2e 6 按钮 + underline 点击 + `<u><strong><em>`
   三 mark 全链落盘断言绿；headless toggleMarkOnSpans(Underline) +
   spansToHtml(`<u>`) 钉子绿；气泡 z-index:30 修复 boundary 拦截在案。
5. **SlashMenu 定位 — PASS**：slash-position.spec.ts 坐标带断言绿（执行期
   先红 menuTop=85 默认位留档）；scroll-sync slash 钳制 4 用例回归绿。
6. **契约零破坏 + 销账 — PASS**：`git diff master..HEAD --
   EDITOR-CONTRACT.md src/editor/components/BlockHost.vue` 0 行；AdapterView
   仅加可选成员 coordsAtPos（惯例同 getAttributes/view 垫片）；DEBTS 五项
   销账（021-F5 改行 + 025-D2/D4、024-***/underline 四行落地即清偿，
   commit 79143a6）。

**遗漏/延后/workaround 狩猎**：

- 遗漏：无。产品文件 diff 与计划触面 1:1（22 文件 + 测试/e2e/DEBTS）；
  计划测试设计节 sketch 的「coordsAtPos 纯函数段注入式单测」以 e2e 钉死 +
  selection-map 既有 blockRangeToDomRange 单测覆盖落地（P3T1 执行步骤本身
  只要求 e2e 断言）——记录为落地形态分歧，非缺失。
- 延后：无。Dependabot 30 项与发包前置为计划明示非目标（029 单列建议在
  DEBTS 027 行维持）。
- Workaround：diff 内零 TODO/FIXME/HACK 新增。两条非阻塞观察（不构成债，
  无人报告需求）：① undo 后聚焦面 remount 光标落块尾（历史恢复 caret 偏移
  未还原——计划未要求）；② 代码块未提交草稿期间 Ctrl+Z 撤销的是上一条
  commit 条目（草稿 blur 才入史，与 CodeEditorBlock 提交协议一致）。

**计划↔实现分歧（以代码为准，均已在案）**：P1T1「确认现状红」未发生——
025 稳定壳已修吞点击，归因改正入 DEBTS 025-D4 行；引擎 redo() 存量 bug 为
超计划新增修复（e2e 循环用例钉出，preTree/preSel 捕获未用改记 PRE 态）。

**路由**：六项验收全 PASS、无阻塞债 → `status: reviewed`，就绪
`/auto-plan:merge`。

## 待澄清事项

- [x] underline 的 markdown 形态：起草为 `__x__`（CommonMark 无官方 underline
  的通行扩展形态；`<u>` 会撞 html 块语义）。备选 `<u>x</u>`。是否认可？
  [执行裁定 2026-08-30] 按 `__x__` 落地（P2T2），`___` 三连规范形 `__*x*__`。
- [x] P1T2 修法方向三选一留给执行期按归因裁定（本计划只钉"去 Save 绕行
  后 e2e 绿"的行为标准）——是否认可？
  [执行裁定 2026-08-30] 归因落"组件身份"：025 AssemblyView 稳定壳即修复，
  无需新修法；028 补直点用例钉死 + 清七处绕行。
- [x] Dependabot 30 项（14 高）与 DEBTS 008 发包前置**不并入本计划**，
  建议 029 单列"发包前置清偿包"（依赖升级 + publish 流程 + 剥 development
  条件，一轮门回归复用）——是否认可？
  [执行确认] 本计划零触碰依赖版本；029 单列建议维持（DEBTS 027 行在册）。
