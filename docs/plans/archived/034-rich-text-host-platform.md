# [PLAN-034] RichTextHost 平台件——文本叶子编辑面 .at 化与宿主契约冻结

---
plan_id: PLAN-034
status: archived
feature_name: RichTextHost 基础 widget（语义化宿主 chrome .at 单源 + IME/选区接线归 ext 桥）+ 文本叶子块编辑面切换 + VM 端宿主契约冻结（EDITOR-CONTRACT 平台面）
author: [zhaopuming]
created_at: 2026-09-01
updated_at: 2026-09-01

# /auto-plan:review 填定（merge 时沉淀）
# 2026-09-01 复审通过（记录见 ## 复审记录 末节）
supersedes_spec_components:
  - "P024-2（goals）：行内 WYSIWYG 富文本宿主目标条目改写——宿主自手写 BlockHost.vue 换为 .at 单源 RichTextHost（auto/editor/rich_text_host.at → components/RichTextHost.vue）+ rich_text_host_ext.ts 平台接线桥（接线逐条迁移 + liveHosts 重挂载存活守卫），IME 三委托/mark 快捷键/blur 富回写/nbsp 归一行为契约不变（六 spec e2e 零改动 + IME CDP 三例 3/3 为证）"
  - "P029-2（goals）：语义化宿主标签目标条目改写——face 计算自 engine/host-face.ts 并入 RichTextHost 家族（hostTag/hostCls 入 ext 桥带 1-6 钳位，值表冻结于 rich-text-host-ext.test.ts），host-face.ts 物理删除，wysiwyg-typography computed-style 断言零改动通过"
new_spec_components:
  - ".autoos/specs.json 六节 P034-1..6: RichTextHost 平台件——P1 widget 源与 T1 探针裁定（auto/editor/rich_text_host.at：dyn tag h1-h6/p/div + 契约属性 + 九事件 DSL 直发；composition 三事件面证实、三 codegen 缺口 dyn+html 不发 v-html/dyn+ref 不发声明/str() 无内建——全部 ext 侧绕道，build+vue-tsc 双过，裁定记计划复审记录）；P2 ext 桥（rich_text_host_ext.ts：mountHost $el 注入+末光标+卸载注销/liveHosts WeakSet 存活守卫（重挂载 late-blur 不得回写——T7 实证 4 e2e 红的根因修复，复刻旧模板 ref 卸载清空语义）/hostInput diff+input-rule 重同步+slash 派发/hostKeydown 键路由+Ctrl+B·I·K/粘贴双通道/composition 三委托/hostBlur flush→富回写/caret 数学；28 例单测在册）；P3 装配切换与退役（EngineEditor assembleNode 宿主分支扁平 props：blockId=controller.id/level??0/initial_html 装配层现算；BlockHost.vue 194 行/host-face.ts/host-face.test.ts 物理删除；休眠桥 auto_down_editor_ext 双写同步；SSR 语义变化注记：富内容注入自 mount 始，blockhost-rich SSR 改钉 chrome、focus-path 两用例改客户端挂载）；P4 测试与清单（gen 两连跑字节确定；guard 17 widgets/15 部署物/12 ext；face 值表冻结迁册；gen 后 vue-tsc 增量缓存 TS2307 幻影的 rm tsbuildinfo 处置记档）；P5 回归（engine 636/636 semantics 零改动、六 spec 21/21 零改动、demo 全量 47/47——scroll-sync 存量 flake master A/B 4 跑 3 败同症状取证；IME CDP 实管线三例 3/3：preedit 跟随/上屏/候选取消）；P6 文档三件（EDITOR-CONTRACT §7 RichTextHost 平台面四件=props/九事件载荷/controller 协议/tag 映射表——auto-lang iced text_editor VM 后端实现基准；ARCHITECTURE §6 边界改写：BlockHost 移出手写层+021 裁定部分推翻注记+15 部署物/12 桥；DEBTS 019④ 销号（CDP 管线 3/3+VM 壳人工手验残余注记）+ 026② 文本叶子销）"
touched_goals:
  - ".autoos/specs.json P024-2: 行内 WYSIWYG 目标——富文本宿主 chrome .at 单源化（编辑器 .at 化最大单点），平台接线全部有主（ext 桥），mark 快捷键 DOM Selection 依赖留桥待行内层选区模型（计划显式边界）"
  - ".autoos/specs.json P029-2: WYSIWYG 块级排版目标——语义化宿主标签入 .at 家族单源，host-face.ts 退役，parity 由零改动 computed-style 断言续保"

current_step: 9
total_steps: 9
---

## 变更摘要

"完美态"路线图 M2 第一步，也是编辑器 **.at 单源化的最大单点解锁**。现状：
Paragraph/Heading/ListItem/Blockquote 内文/WikilinkBlock 等全部文本叶子的
编辑面 = 手写 `BlockHost.vue`（194 行，contenteditable + composition 三事件
+ 选区 API + mark 快捷键），plan 021 曾以"widget DSL 无 contenteditable 与
composition 事件面"裁定其**永不 .at 化**。本计划部分推翻该裁定：

- **chrome 归 .at**：`rich_text_host.at` 新 widget——语义化宿主标签
  （h1-h6/p/div，吸收 host-face.ts 的 face 计算）、class 链、data 契约、
  contenteditable/dir/spellcheck 属性、挂载 HTML 注入孔；
- **接线归 ext 桥**：`rich_text_host_ext.ts` 承接 BlockHost.vue 现全部
  平台接线（挂载聚焦+末尾光标、nbsp 归一、input-rule 重同步、键路由
  Enter/Backspace/Tab、粘贴 markdown 通道、**composition 三事件**、
  blur 富结构回写、slash 派发）——composition 事件面若 DSL 不支持则
  命令式 addEventListener 兜底（T1 探针裁定），**零 auto-lang 仓依赖**；
- **语义不动**：BlockHostController（引擎内核）一行不改——
  semantics.test.ts 是零改动回归基线；
- **VM 契约冻结**：EDITOR-CONTRACT 新增 RichTextHost 平台面一节
  （props/事件/controller 方法签名/语义 tag 表）——auto-lang iced
  text_editor 后端照此实现，RichTextHost 成为首个跨平台编辑基础件。

**吸收与退役**：BlockHost.vue 退役；host-face.ts face 计算并入 widget
（.at 条件分支），TS 侧留薄 re-export 一版过渡。装配点：
EngineEditor `view: BlockHost`（assembleNode 419 行）切到生成的
RichTextHost.vue。

**不做的**：mark 快捷键的选区模型抽象（Ctrl+B/I/K 的 DOM Selection
依赖留 ext 桥，跨平台选区模型 = 路线图计划 6 行内层）；EngineEditor
装配壳 .at 化（维持 021 裁定的手写平台层）；MathInline（行内层）；
VM 端实现本身。

## 目标

1. **单源 chrome**：文本叶子编辑宿主的 DOM 契约（语义 tag/class/
   data-block-id/data-node-type/[contenteditable] 选择器面）出自一份
   .at 源；gen:editor 两连跑逐字节确定。
2. **行为零漂移**：semantics.test.ts、wysiwyg-typography / inline-marks /
   undo / scroll-sync e2e、EDITOR-CONTRACT 选择器面**零改动**通过；
   中文 IME 手验（413 清单三例）通过并留档。
3. **接线有主**：BlockHost.vue 的全部平台接线迁移至 ext 桥并有单测
   （composition 暂存/提交、input-rule 重同步、粘贴通道、caret 计算）。
4. **VM 契约在册**：RichTextHost 平台面（组件 props、事件载荷、
   controller 协议、语义 tag 映射表）冻结进 EDITOR-CONTRACT——后续
   auto-lang iced 后端实现的对齐面。

## 架构方案

```
auto/editor/rich_text_host.at（新 widget）
├─ props 扁平：controller Array<str>, blockId str, blockKind str,
│  level int, initial_html str（chrome 全数据化，VM 对象走 Array<str>
│  宽类型——controller-prop idiom）
├─ view：dyn (.tag) 根元素（h1-h6/p/div 由 .at 条件计算，吸收
│  host-face.ts）+ class/契约 data + contenteditable/dir/spellcheck +
│  html: .initial_html（挂载注入，数学预览/高亮 overlay 同 idiom）
├─ 事件（T1 探针二选一）：
│   a) DSL 面：oninput/onkeydown/onfocus/onblur/onpaste +
│      oncompositionstart/update/end（若可解析）
│   b) ext 命令式：.Init -> wireHostEvents(.root, controller 回调包)
│      （addEventListener 全套，零 DSL 依赖——兜底保底路线）
└─ msg：Input/Keydown/CompositionX/Paste/Focus/Blur → 全部薄转发 ext 桥

auto/editor/ext/rich_text_host_ext.ts（新桥，BlockHost.vue 接线迁移）
├─ mountHost(el, controller)：聚焦+末光标（Range/selectNodeContents）
├─ hostText(el)：nbsp 归一
├─ handleInput(el, controller)：diff 派发 + input-rule 重同步
│   （span-resync+caret 回末，025 P2T1 语义）+ slash 派发
├─ handleKeydown(e, controller, hostApi)：Enter/Backspace/Tab +
│   Ctrl+B/I/K（domToggleMark/domSetLink 就地包裹，024 P3T3）
├─ handlePaste(ev, controller)：纯文本 vs markdown 通道
├─ handleCompositionX(el, controller)：CompositionSession 三委托
├─ handleBlur(el, controller)：pending flush + onRichBlur 结构回写
└─ caretOffset(el)/previousSiblingId(el)：Range 数学

装配
src/editor/components/EngineEditor.vue
├─ `view: BlockHost` → RichTextHost（props 经适配器扁平化：
│   tag/cls 由 widget 自算，initial_html=spansToHtml(controller.inlines)）
├─ hostFor/BlockHostController 注册表不动（内核零改动）
└─ components/BlockHost.vue 删除；engine/host-face.ts 并入 .at 后留
    薄 re-export（wysiwyg-typography 测试引用面过渡）

契约
EDITOR-CONTRACT.md 新增 §RichTextHost 平台面
└─ props/事件载荷/controller 协议/h1-h6·p·div 语义 tag 表
   （iced text_editor 后端实现基准）
```

**为何 ext 桥而非 DSL 原语（v1）**：composition 三事件与 Selection API
是否入 DSL 是 auto-lang 仓的长期决策；ext 桥路线让 engine 侧零依赖落地，
DSL 原语化后可平滑收回（.at 事件面替换命令式接线，桥瘦身）。

## 技术栈

- Auto widget DSL（gen:editor 管线，两连跑逐字节确定）
- Vue 3 SFC（生成物）+ TS ext 桥（平台接线）
- 既有内核：BlockHostController / CompositionSession / dom-marks /
  rich-html（spansToHtml）/ tiptap-adapter（slash 派发）
- Vitest + Playwright + 413 IME 手验清单

## 需求分析与背景调查

（来源：.autoos/specs.json 总览、DEBTS.md、engine 源码核查 2026-09-01；
前置 = PLAN-033 merge（家族机制/gen 清单冻结 16 widgets 是本计划的
清单基线）；PLAN-032 已归档（stream 面契约不影响本计划））

- 021 裁定原文（ARCHITECTURE §6）：装配壳 + BlockHost 手写，理由
  "widget DSL 无 contenteditable 属性与 composition 事件面"。**事实
  修正**：contenteditable 属性面已被 table_editor_block.at 单元格证伪
  （布尔属性直发）；composition 事件面仍未证——T1 探针定夺，ext 命令式
  兜底使本计划不依赖 auto-lang 仓任何变更。
- BlockHost.vue 逐行盘点（194 行）：接线 100% 可迁 ext 桥（挂载聚焦/
  nbsp 归一/键路由/粘贴/三 composition/blur 回写/caret 数学/mark
  快捷键/slash 派发）；模板面 100% 可 .at（dyn tag + html 注入 idiom
  均有先例：math node view 的 code_tag、code_block_widget 的高亮）。
- 契约冻结面：EDITOR-CONTRACT `[contenteditable]` 行（jade e2e 02 依赖
  语义化标签注记，029）；wysiwyg-typography e2e 的 computed-style 断言
  （h1-h6/p 宿主）——零改动是硬验收。
- 内核边界：BlockHostController（215 行 host-controller.ts）与
  semantics.test.ts（引擎无关语义基线）不动——VM 端将来按同协议实现
  控制器（路线图计划 7），本计划先冻结核外的宿主面。
- spec 支点：P024-2（行内 WYSIWYG 富文本宿主——本计划是其 chrome
  单源化）、P029-2（语义化宿主标签——face 计算入 .at）、P023-2/
  P033 家族机制（文本叶子不走 BlockComponent edit 槽，宿主是装配层
  直挂——机制不受影响）。
- DEBTS 对账：026②"NodeView 编辑态深度"文本叶子部分随本计划销；
  019④ IME 手验（编辑壳通道已实现未手验）——本计划 T8 执行 413
  清单三例并回填，销号。
- VM 关联：RichTextHost 是路线图计划 6（widget VM 后端）首个必需
  基础件；契约先冻结 = auto-lang 侧可并行开工。

## 详细设计

### D1 探针（T1）：composition 事件面

scratch 工程 `auto build --gen-only --lenient`（gen.mjs 既有暂存通道）：
widget 声明 `oncompositionstart: .CS($event)` 等三事件，观产物 SFC 是否
发出 `onCompositionstart` 监听。**裁定规则**：三事件全发且 vue-tsc 过 →
路线 a（DSL 面）；任一不发 → 路线 b（ext 命令式，.Init 一站式接线）。
裁定连同探针产物摘要记入本计划复审记录。

### D2 widget props 与 face 计算

```
widget RichTextHost(controller: Array<str>, blockId: str, blockKind: str,
                    level: int, initial_html: str) {
    computed {
        tag => if .blockKind == "Heading" { "h" + str(.level) } else {
                 if .blockKind == "Paragraph" { "p" } else { "div" } }
        cls => if .blockKind == "Heading" { "autodown-block-host heading-node heading-" + str(.level) }
               else { if .blockKind == "Paragraph" { "autodown-block-host paragraph-node" }
                      else { "autodown-block-host" } }
    }
    view { dyn (.tag) { class: .cls, data-block-id: .blockId,
             data-node-type: .blockKind, dir: "auto",
             contenteditable: true, spellcheck: "false",
             html: .initial_html, …事件面（D1 裁定） } }
}
```

（level 钳位 1-6 的 clamp 逻辑同 host-face.ts；.at 条件链已证可承载
details_node_view 级复杂度。）

### D3 ext 桥 API 面（rich_text_host_ext.ts）

导出纯函数集，widget msg 薄转发或 .Init 命令式接线（按 D1）。关键语义
逐条对齐 BlockHost.vue 注释：① input-rule 消费后 host DOM 重同步跳过
composition 中（preedit 只在 DOM）；② Ctrl+B/I/K preventDefault 覆盖
浏览器原生 `<b>`（DOM 规范化 strong）；③ blur 先 flush pending 纯文本
diff 再 onRichBlur 富回写；④ onBeforeUnmount 清 focusedRichHost 登记
（widget Unmount msg → ext 清理函数）。

### D4 装配切换与退役

- EngineEditor：`import RichTextHost from './RichTextHost.vue'`，
  assembleNode 宿主分支 props 适配（controller 传递不变，initial_html
  现算）；BlockHost.vue 删除。
- host-face.ts：face 计算并入 .at 后，TS 侧改 re-export gen 产物常量表
  （或直接删除，视 wysiwyg-typography 测试引用面——执行期定，倾向删除
  并改测试引用选择器而非 face 函数）。
- gen 清单：16 widgets → 17；部署物 +1（RichTextHost.vue）；ext 桥
  11 → 12。assert-editor-gen 三断言同步。

### D5 VM 契约段（EDITOR-CONTRACT 新增）

- props 表：controller（宿主控制器对象——方法面清单）、blockId/
  blockKind/level/initial_html；
- 事件表（载荷形状）：input{text}、keydown{key,ctrl/meta,shift}、
  composition{phase,data}、paste{textPlain}、focus/blur；
- controller 协议：BlockHostController 公开方法签名（onInput/onEnter/
  onBackspaceAtStart/onTab/onPasteMarkdown/onRichBlur/composition 三
  委托/id/text/inlines）；
- 语义 tag 映射表（blockKind×level → tag+class，与 D2 同源）。

## 测试设计

- **零改动回归（硬验收）**：semantics.test.ts 全量；demo e2e
  wysiwyg-typography / inline-marks / undo / scroll-sync / check-heading /
  check-padding；EDITOR-CONTRACT 选择器 grep 面不变。
- **新增单测**：ext 桥行为（composition 暂存/提交单步、input-rule
  重同步、粘贴 markdown 通道、caret 数学、focusedRichHost 登记/清理）；
  gen 两连跑字节确定；face 计算等价（.at 产物 vs 旧 host-face 快照）。
- **手验**：413 IME 清单三例（微软拼音：preedit 跟随/上屏/候选取消）
  于 demo 执行并回填记录（销 DEBTS 019④）。
- **回归**：engine vitest + build + demo playwright 全量。

## 验收标准

1. 文本叶子编辑宿主 chrome 单源 .at；BlockHost.vue 物理删除；gen 清单
   17/部署物/ext 桥数与 guard 一致。
2. D5 零改动回归清单全绿；wysiwyg-typography computed-style 断言零改动。
3. ext 桥单测在册（composition/重同步/粘贴/caret 四组）；D1 探针裁定
   与产物摘要记录在案。
4. EDITOR-CONTRACT §RichTextHost 平台面在册（props/事件/controller/
   tag 表四件）；ARCHITECTURE §6 手写平台层边界改写（BlockHost 移出
   "永不 .at"名单，接线归 ext 桥，EngineEditor 装配壳维持手写）。
5. IME 手验三例回填 DEBTS 019④ 销号。

## 执行步骤

- [x] T1 探针：scratch .at（composition 三事件 + dyn tag + html 注入）
      经 gen.mjs 暂存通道生成，`vue-tsc` 校验；裁定路线 a/b 记录本文件；
      验证：探针产物 SFC 存在且类型检查过（产物摘要入复审记录）。
      [✅ 已完成] 裁定 = **路线 a（DSL 事件面）**：探针 v3（gen/_probe/
      暂存工程，auto.exe 1487b5c5 release）build exit 0 + vue-tsc 零错误。
      产物模板直发九监听（@input/@keydown/@paste/@focus/@blur/
      @compositionstart/@compositionupdate/@compositionend/@click.stop），
      详见复审记录"探针裁定"节。
- [x] T2 `auto/editor/rich_text_host.at` 新建（D2 chrome + D1 裁定的
      事件面）；验证：`pnpm --filter @autodown/engine gen:editor` 两连跑
      产物字节确定。
      [✅ 已完成] 探针 v3 终形落地（路线 a）；gen.mjs 计数 16→17（ext 桥
      文件须先在位——编译器 use 块拷贝校验，故 T3 的 ext 文件创建提前
      并行完成）；两连跑 `diff -r` 零差异，产物 RichTextHost.vue 九监听
      + dyn 根 chrome + onMounted(mountHost) 与 BlockHost 模板逐项对齐。
- [x] T3 `auto/editor/ext/rich_text_host_ext.ts` 新建（D3 全 API，
      BlockHost.vue 接线逐条迁移，注释保留语义说明）；验证：
      `pnpm --filter @autodown/engine build`（vue-tsc 过）。
      [✅ 已完成] mountHost（$el 注入+末光标+卸载注销）/hostInput（diff+
      重同步+slash）/hostKeydown（mark 快捷键+Enter/Backspace/Tab）/
      hostPaste（双通道）/composition 三委托/hostBlur（flush+富回写）/
      caretOffset/previousSiblingId 全量迁移；gen.mjs EXT_DEPLOY+
      DEPLOY_COMPONENTS 增项；assert-editor-gen 部署清单 +RichTextHost
      （15 物/12 桥）；build 全链绿（vue-tsc+vite+四断言）。
- [x] T4 ext 桥单测四组（composition/重同步/粘贴/caret + focusedHost
      登记）`src/editor/__tests__/rich-text-host-ext.test.ts`；验证：
      `pnpm --filter @autodown/engine test -- rich-text-host-ext` 绿。
      [✅ 已完成] 27 例全绿（happy-dom 真挂载）：composition 三委托（基线
      +caret/e.data 回退/nbsp 归一提交）、input-rule 重同步（含 composition
      中跳过 + slash open/close 派发）、粘贴双通道 + 空剪贴板忽略、caret
      数学（跨内联元素/无选区/nbsp）、键路由（Enter 新 id 形状/Backspace
      合并退化/Tab 双向/Ctrl+B/I/K 覆写 + composition 中静默）、
      focusedRichHost 登记→blur 清理（flush 先于富回写次序钉死）、卸载注销、
      face 值表（host-face.test.ts 同表冻结）、RichTextHost.vue 挂载端到端
      （chrome 契约属性/末光标/卸载清理）。
- [x] T5 `src/editor/components/EngineEditor.vue` 装配切换 +
      BlockHost.vue 删除 + host-face.ts 处置（D4）；验证：engine
      vitest 全量绿（semantics.test.ts 零改动）。
      [✅ 已完成] 装配分支扁平 props（controller 不变/blockId=controller.id/
      level??0/initial_html=spansToHtml 现算）；休眠桥 auto_down_editor_ext
      同步切换（.ts 源+部署物双写，gen 字节同步）；BlockHost.vue/
      host-face.ts/host-face.test.ts 物理删除（待澄清 #2 裁"删除"路线：
      face 值表已冻结进 rich-text-host-ext.test；wysiwyg-typography e2e
      无 face 函数引用）；SSR 语义注记——富内容注入自 mount 始（旧
      :innerHTML 绑定 SSR 可见），blockhost-rich SSR 改钉 chrome 面、
      focus-path 两用例改客户端挂载（结构+内容双覆盖）；engine vitest
      635/635 绿，semantics.test.ts 零改动。
- [x] T6 `scripts/assert-editor-gen.mjs` 清单同步（17 widgets）；
      验证：`node scripts/assert-editor-gen.mjs` 零退出。
      [✅ 已完成] EXPECTED +components/RichTextHost.vue（14→15 物）+ 桥数注记
      （seven→twelve；12 桥由 readdir 动态断言）；同步动作在 T3 提前落地
      （build 链内断言所需），本步独立复验零退出。
- [x] T7 零改动回归批：demo e2e 六 spec（wysiwyg-typography/
      inline-marks/undo/scroll-sync/check-heading/check-padding）；
      验证：`pnpm --filter demo exec playwright test` 全绿零改动。
      [✅ 已完成] 首轮 4 红（undo/input-rule 翻转/scroll-sync×2）→ 根因：
      **重挂载 late-blur 回写**——旧宿主元素被替换时 Chromium 对其发
      blur（e.target 仍在），ext 桥的 flush 把过渡态 DOM 文本重新
      InsertText 进刚恢复的模型并经 applyOp 把选区拽回旧块（旧
      BlockHost 靠 el.value 模板 ref 卸载即 null 天然免疫，e.target 无
      此性质）；修复 = liveHosts WeakSet 存活守卫（mount 置位/
      onBeforeUnmount 清位，hostBlur/hostFocus 查位——精确复刻旧 ref
      生命周期），单测补守卫反例 → 28/28；**六 spec 21/21 全绿零改动**
      （spec 文件未动）。附记：gen:editor 重写部署物后 vue-tsc -b 增量
      缓存会出 .vue TS2307 幻影（rm tsconfig.tsbuildinfo 即清，非本计划
      引入）。
- [x] T8 IME 手验三例（微软拼音，413 清单）于 demo 执行回填；
      验证：手验记录入 DEBTS 019④ 销号。
      [✅ 已完成] **CDP 实输入管线验证 3/3 PASS**（Playwright +
      `Input.imeSetComposition`/`Input.insertText`——原生
      compositionstart/update/end 事件 + 浏览器自管 preedit 渲染与取消，
      非合成 dispatchEvent；非人工按键，见待澄清 5）：① preedit 跟随
      ——'nihao' preedit 落宿主 DOM、模型零污染（右栏无 nihao）；② 上屏
      ——commit '你好' 双落（宿主 DOM + 模型），preedit 清除；③ 候选取消
      ——compositionend:data="" 后浏览器自除 preedit，宿主回基线、模型
      不变。取消路径注记：CDP 下 Escape 不触发 compositionend（无真实
      IME 引擎接管），以"composition 置空"驱动等价取消语义。
- [x] T9 文档三件：EDITOR-CONTRACT §RichTextHost 平台面（D5 四件）+
      ARCHITECTURE §6 边界改写 + DEBTS（019④ 销号/026② 文本叶子销）
      + 全量回归；验证：engine test + build + demo playwright 全绿。
      [✅ 已完成] EDITOR-CONTRACT 新 §7（props/九事件载荷/controller
      协议/tag 映射表 + 接线归属，VM 后端基准）；ARCHITECTURE §6
      （BlockHost 移出手写层 + 021 裁定部分推翻注记、15 部署物/12 桥、
      家族段文本叶子落地）；DEBTS 019④ 销号（CDP 实管线 3/3 + VM 壳
      残余注记）、026② 文本叶子销。全量：engine build 四断言绿 +
      vitest 636/636 + demo playwright 46/47（唯一 fail = scroll-sync
      **存量 flaky**：同用例单独重跑绿、master 基线 4 跑 3 败同症状，
      非本计划回归；六 spec 零改动批 T7 已 21/21）。

## 复审记录

### T1 探针裁定（2026-09-01，执行期填入）

**裁定：路线 a——DSL 事件面**。探针工程 `auto/editor/gen/_probe/`（复用
gen.mjs 的 staging 通道结构：pac.at + src/front/*.at + ext/，`auto build
-d . --gen-only --lenient`），三轮迭代后 v3 终形 build exit 0 且 vue-tsc
（engine node_modules，minimal tsconfig）零错误。探针产物摘要：

- **P1 composition 三事件（通过）**：`oncompositionstart/update/end` 在
  DSL 可解析，产物模板逐一直发 `@compositionstart="CompositionStart($event)"`
  等监听（v1 即证实，推翻 021 裁定的最后一项事实依据）。
- **P2 html: on dyn（不通过，绕开）**：dyn 元素上的 `html:` 发出
  `:html="..."` 普通属性绑定而非 v-html（与 code_block_widget.at 头注
  033 记录一致）——DOM 契约污染，弃用；挂载 HTML 注入移入 ext 桥
  mountHost（$el innerHTML），语义等价（挂载即定格）。
- **P3 ref: on dyn（不通过，绕开）**：dyn 根的 `ref:` 只发 `:ref="'root'"`
  绑定、不发 `const root` 声明——处理器引用 `.root` 得 TS2304。绕法：事件
  处理器一律用 `e.target`（九事件全部在宿主根上触发，等价 el.value）；
  挂载用 ext 侧 `getCurrentInstance()?.proxy?.$el`（auto_down_editor_ext.
  ts:131 既有 idiom）；卸载清理（focusedRichHost 注销）在 mountHost 内
  注册 `onBeforeUnmount`（生命周期钩子内注册合法）。
- **P4 str() 内建（不存在，绕开）**：computed 里 `str(.level)` 裸发调用，
  TS2304/运行时 ReferenceError。tag/cls 计算移 ext 桥（hostTag/hostCls，
  承接 host-face.ts 的 clamp 语义），.at 以 computed 调 ext fn（033 家族
  wide-prop idiom）。
- 附带确认：`onclick.stop: .ClickStop($event)`（裸修饰符绑定需带参 msg
  ——details_node_view 的 Noop idiom，msg 无参则模板 `$event` 实参 TS2554）。

（/auto-plan:review 填定）

### /auto-plan:review 复审（2026-09-01，worktree plan-034-dev @ 2d3af22）

**逐条验收裁决**

1. **chrome 单源 + BlockHost 删除 + 清单一致 — PASS**：`auto/editor/
   rich_text_host.at`（115 行）在册；diff 实证 BlockHost.vue（-194）/
   host-face.ts（-18）/host-face.test.ts（-32）物理删除；`.at` 源 18 文件
   含 pac.at/app.at = 17 widget 与 gen.mjs 断言一致；
   `assert-editor-gen` 15 部署物/12 ext 桥零退出（复审门内重跑）。
2. **零改动回归 — PASS**：`git diff master..HEAD -- demo/e2e/` 仅
   math-edit-face.png（见下取证），**spec 文件零改动**；engine vitest
   636/636（semantics.test.ts 零改动，复审门重跑）；六 spec 批 T7
   21/21；demo 全量 47/47。
3. **ext 桥单测 + 探针裁定 — PASS**：rich-text-host-ext.test.ts 28 例
   （四组 + 守卫反例 + 挂载端到端）全绿；T1 裁定与产物摘要在本文件
   复审记录节。
4. **文档三件 — PASS**：EDITOR-CONTRACT §7（props/九事件/controller
   协议/tag 映射四件，:92 起）；ARCHITECTURE §6 边界改写（+42/-19 行）；
   DEBTS 019④ 销号 + 026② 文本叶子销。
5. **IME 三例回填 — PASS（带注记）**：CDP 实输入管线 3/3（原生
   composition 事件 + 浏览器自管 preedit）；形态注记与 019④ 原范围
   （auto-lang 042 VM 壳）差已在待澄清 #5 双注，DEBTS 行如实保留
   残余注记。

**全量门（本 skill 唯一全量跑）**：engine 清缓存 build 四断言绿 +
vitest 44 文件 636/636 + demo playwright **47/47**（本连跑含 scroll-sync
两用例全过）。

**遗漏 / 延后 / workaround 猎查**

- 遗漏：无计划内子项缺失（9 步各有 diff 物证）。残留 "BlockHost"
  字样均为注释/概念引用（vue-tsc 证无悬空导入）。
- 延后：mark 快捷键选区抽象/MathInline/VM 实现/装配壳 .at 化——
  全部为计划"不做的"显式边界，非静默缩水。
- Workaround（有档非隐瞒）：① liveHosts WeakSet——重挂载 late-blur
  守卫，T7 根因修复的忠实移植（旧 el.value 卸载清空语义），非凑合；
  ② hostKeydown `currentTarget ?? target`——直调单测兜底，真分发
  两者等价；③ SSR 富内容自 mount 始（旧 :innerHTML SSR 可见）——
  D1 探针裁定的既定语义变化，消费面全客户端，测试改造已注记。
- diff 假象澄清：`docs/plans/archived/033-*.md` "删除"系执行期间
  master 被并行推进（033 merge 提交 3daad6b 归档该文件），本分支
  早于该提交所致，非本计划改动。
- 取证：math-edit-face.png 重生成（screenshot.spec 无条件覆写式留档）
  ——与 master 版逐像素对比 11/93600 px 差异，全部位于右缘 3px 滚动条
  条带 ±1-2 灰阶（抗锯声噪声），无内容变化。

**债候选（记录不阻塞）**

- ① `auto/editor/README.md` widget 清单陈旧（"14 sources + 7 ext"，
  013 时代文档，033/034 均未同步；gen.mjs 头注指向它）。
- ② `host-controller.ts:2` 头注仍写 "The Vue shell (BlockHost.vue)
  wires"（壳已换 RichTextHost + ext 桥）。
- ③ scroll-sync e2e 存量 flaky（master A/B 4 跑 3 败同症状，033 复审
  亦取证过）——建议后续计划单独治理。
- ④ gen:editor 重写部署物后 vue-tsc -b 增量缓存出 .vue TS2307 幻影
  （rm tsconfig.tsbuildinfo 即清；master 干净缓存同状，非 034 引入）。

**裁决：五条验收全 PASS，无阻塞债 → status: archived。**

## 待澄清事项

1. **composition 事件路线**（T1 探针裁定，建议：ext 命令式兜底为保底
   路线）——DSL 面若通则 .at 事件声明直用，桥瘦身；不通则 .Init 命令式
   接线，零 auto-lang 依赖。两路线对 D5 契约段无影响（事件载荷形状同）。
2. **host-face.ts 处置**（建议：删除，wysiwyg-typography 测试改引用
   DOM 选择器）——若测试引用面耦合 face 函数则留薄 re-export 一版
   标注 deprecated。
3. **mark 快捷键的归属**（建议：本计划留 ext 桥）——Ctrl+B/I/K 的
   domToggleMark 依赖 DOM Selection；跨平台选区抽象是路线图计划 6
   （行内层）的核心交付，提前做会返工。
4. **spansToHtml 注入时机**（建议：装配层现算传 prop，widget 不持
   响应式依赖）——保持"引擎非 Vue 响应式、挂载即定格"的既定语义
   （029 epoch 重挂机制不动）。
5. **T8 验证形态注记**（执行期）：IME 三例以 CDP 实输入管线
   （Input.imeSetComposition / Input.insertText，原生 composition 事件
   + 浏览器自管 preedit）完成 3/3——语义等价于微软拼音产生的浏览器
   事件序列，但非人工按键；若 019④ 需"人工手验"字面销号，仍需一次
   实机人工执行。另注：019④ 原文范围是 auto-lang 仓 042 页 VM 编辑壳
   （DocInput::ImePreedit/ImeCommit），本计划的 demo 执行验证的是
   WEB 编辑器 composition 三接线——VM 壳的手验是否随之销号请用户
   裁定（T9 的 DEBTS 行已如实双注）。
