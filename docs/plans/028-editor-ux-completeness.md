# [PLAN-028] 编辑器体验收尾包——撤销接线/点击可靠性/mark roundtrip/选区定位

---
plan_id: PLAN-028
status: drafting
feature_name: 编辑器体验收尾（Ctrl+Z 撤销 UI 接线 + blur 回写吞点击修复 + `***` 嵌套 roundtrip + underline mark 补齐 + SlashMenu 选区定位）
author: [zhaopuming, zcode]
created_at: 2026-08-30T17:40:00+08:00
updated_at: 2026-08-30T17:40:00+08:00
supersedes_spec_components: []
new_spec_components: []
touched_goals: []
current_step: 0
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

- [ ] Ctrl+Z/Ctrl+Y/Ctrl+Shift+Z 在编辑器内撤销/重做生效（富宿主与代码
  块两路 e2e 钉死），IME 组合期不受干扰。
- [ ] 去除 Save 绕行后"编辑→直点另一块"一次生效（吞点击 e2e 绿）。
- [ ] `***x***`、`**_x_**`、`__x__` serialize→parse 往返 mark 无损
  （金标 + roundtrip 断言）。
- [ ] 气泡菜单 underline 按钮可用且 `__x__` 落盘。
- [ ] SlashMenu 出现在光标附近而非默认位置。
- [ ] EDITOR-CONTRACT 冻结面零破坏；DEBTS（025-D2/D4、021-F5、024 两项
  执行期发现）销账。

## 执行步骤

> 约定：工作树 `.worktrees/plan-028-dev`（由 /auto-plan:work 创建）；验证
> 均在工作树根执行。`PnTm` = Phase n Task m。

### Phase 0：撤销重做接线

- [ ] P0T1 keydown 接线：改 `autodown/packages/engine/src/editor/components/EngineEditor.vue`
  的 `onContentKeydown`——Ctrl+Z（Shift 变体/Ctrl+Y）→ `engine.undo()/redo()`
  + 聚焦宿主 `syncFromModel()`，组合期放行；`src/editor/__tests__/undo-wiring.test.ts`
  （TDD：路由与宿主重同步）。验证：`npx vitest run src/editor/__tests__/undo-wiring.test.ts`。
- [ ] P0T2 e2e：新建 `autodown/demo/e2e/undo.spec.ts`（富宿主输入→Ctrl+Z
  回退→Ctrl+Y 重做；代码块编辑同路）。验证：`cd autodown/demo && npx
  playwright test undo.spec.ts`。

### Phase 1：吞点击修复

- [ ] P1T1 复现先红：`autodown/demo/e2e/inline-marks.spec.ts` 增"编辑后
  直点另一块一次生效"用例（无 Save 绕行），确认现状红。验证：该用例
  失败输出在案。
- [ ] P1T2 归因与修复：按详细设计 §2 候选方向定位（组件身份/事件时序/
  DOM 保序），实施修复至 P1T1 用例转绿且 22 spec 全回归。验证：`cd
  autodown/demo && npx playwright test`。

### Phase 2：parser roundtrip + underline

- [ ] P2T1 嵌套定界：改 `autodown/packages/engine/auto/parser/markdown_parser.at`
  （`***`/`**_` 家族定界符栈语义）+ `pnpm gen:parser`；金标/roundtrip 用例
  （TDD 先红于改源前入库）。验证：`npx vitest run src/render/__tests__/markdown-parity.test.ts
  src/parser` 相关 + `pnpm gen:parser` 两连跑一致。
- [ ] P2T2 underline 全链：`auto/parser/markdown_parser.at` 增 `__` 定界 +
  `auto/block_model.at`（经 gen:parser 覆盖）增 Mark.Underline + serializer
  `__..__` + mark 命令层 toggleUnderline；用例同式。验证：`npx vitest run`
  相关 + `pnpm gen:parser` 两连跑一致。
- [ ] P2T3 气泡恢复：改 `auto/editor/bubble_menu.at`（underline 按钮回填）
  + ext 垫片真实现 + `pnpm gen:editor`；对拍（按钮在、命令通）。验证：
  `pnpm gen:editor && pnpm gen:editor && pnpm build`。

### Phase 3：SlashMenu 定位

- [ ] P3T1 coordsAtPos：`src/editor/engine/tiptap-adapter.ts` 增
  `view.coordsAtPos`（selection-map 复用）+ SlashMenu 定位接通验证（e2e
  断言菜单纯出现于光标坐标带）。验证：`cd autodown/demo && npx playwright
  test check-heading.spec.ts`（含 slash 定位断言的就近 spec）或新增小 spec。

### Phase 4：收尾

- [ ] P4T1 全量门 + 销账：engine `pnpm test && pnpm build`、gen 双管线
  确定性两连跑、demo e2e 全绿、`cd jade-garden/front && pnpm build`；DEBTS
  台账销账行（025-D2/D4、021-F5、024 执行期两项）更新 → `execution_done`。
  验证：四门退出码 0。

## 复审记录

（/auto-plan:review 填写）

## 待澄清事项

- [ ] underline 的 markdown 形态：起草为 `__x__`（CommonMark 无官方 underline
  的通行扩展形态；`<u>` 会撞 html 块语义）。备选 `<u>x</u>`。是否认可？
- [ ] P1T2 修法方向三选一留给执行期按归因裁定（本计划只钉"去 Save 绕行
  后 e2e 绿"的行为标准）——是否认可？
- [ ] Dependabot 30 项（14 高）与 DEBTS 008 发包前置**不并入本计划**，
  建议 029 单列"发包前置清偿包"（依赖升级 + publish 流程 + 剥 development
  条件，一轮门回归复用）——是否认可？
