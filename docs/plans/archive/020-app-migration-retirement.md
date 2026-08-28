# Plan 020：应用迁移与退役收口（demo / jade-garden / musk / 旧包）

---
supersedes_spec_components:
  - "demo/jade-garden package.json + 导入面: 三旧包依赖 → @autodown/engine 直连（shim 旁路跳过）"
  - "engine 0.4.0 → 1.0.0: 出口契约冻结（四出口 + EDITOR-CONTRACT + 命令层 API；natives/rust 面标 experimental）"
  - "@autodown/core / @autodown/vue / @autodown/editor: 定版为 deprecated re-export shim（deprecate 标注 + 墓碑 README，物理归档待 musk vendor 路径确认）"
  - "jade-garden/front/src/assets/autodown-editor.css + engine editor css: .ProseMirror* 与 tiptap 插件残留段删除"
  - "docs/designs/06-roadmap.md Phase 1: canonical AST 修订为统一块模型（ProseMirror JSON 决策废止标注）"
  - "DEBTS 008 跨仓验证行: T13/T10 双销号（T10 按 musk 041 stub 等价裁定）"
new_spec_components:
  - "engine 编辑器预览 wikilink 装饰（src/editor/wikilink.ts）: [[..]] → .autodown-wikilink-label 可点 span + open-wiki-link(title, blockId) 发射（018 冻结选择器复通，单测 6 例）"
  - "packages/engine/ARCHITECTURE.md: 新建（三层架构 + 1.0.0 冻结面 + 双端单源通道 + vendor 发包形态 + 已知边界）"
  - "DEBTS 020 五行: blockParser 镜像保留裁定与 (c) 前置 / bubble·表格·代码块菜单延期 / 旧包物理归档待确认 / 019 边界集中登记×2（ark/jet 编辑降级、rust katex/mermaid 降级）"
  - "裁定记录: 发版通道=vendor 快照维持；退役时点=deprecate 即刻 + 归档待 musk 确认；natives experimental"
touched_goals:
  - "020 目标1: musk 欠账清偿（验收①，DEBTS 008 销号）"
  - "020 目标2: demo 迁移 engine（e2e 9/9）"
  - "020 目标3: jade-garden 迁移 + wikilink 交互 + 块语义裁定（e2e 23/23，grep 归零）"
  - "020 目标4: 旧包退役与 engine 1.0.0 发版裁定"
  - "020 目标5: 文档与台账收口"
---

> 状态：**CLOSED（2026-08-28，/auto-plan:merge 沉淀归档；前态 reviewed）**。
> Phase 1：DEBTS 008
> 双销号（T13=51b8abf 对拍 5/5；T10=musk 041 stub 等价裁定留档）。
> Phase 2：demo 直连 engine（e2e 9/9，b6afa5a）。Phase 3：jade 直连
> engine + wikilink 点击交互（编辑器侧装饰器 + open-wiki-link(title,
> blockId) 发射，e2e 23/23——04 两例回绿）+ .ProseMirror/tiptap 残留归零
> + blockParser 裁定（1dd5451）。Phase 4：engine **1.0.0** 契约冻结
> （natives experimental）+ 旧包 deprecate 标注与退役/发版通道裁定
> （4bcb753）。Phase 5：designs README/03/06 + engine ARCHITECTURE.md +
> DEBTS 020 登记（59ae2a3；复审补 019 边界集中登记两行）。设计依据：
> [docs/designs/09-unified-document-engine.md](../designs/09-unified-document-engine.md) §10。
> 立项：2026-08-25。前置：**Plan 017 完成**（迁移最低门限：渲染统一 +
   shim 可用）；**018/019 完成为 1.0.0 门限**。
> 关联：DEBTS.md 008 行（musk T13/T10 欠账，本计划强制先清）。
> 018 移交（2026-08-26）：engine 0.4.0 编辑内核已替换——jade-garden 迁移面：① editor_tab_ext 的 editor.chain() 模板插入 → insertTemplate 命令层；② 视觉基线重录（e2e 08 三例）；③ 编辑流回归（02 typing→debounced save、11 properties）。当前 jade e2e 9/23 过。bubble/table/codeblock 菜单与 node view 富渲染（math/mermaid）待行内 mark/面板注入位扩展。
> 协调项（017 Phase 3 移交）：engine 渲染根 class 已去掉 `markstream-vue`
> 历史段（现为 `markdown-renderer`）——musk 重新 vendor 时须在对拍脚本中确认
> 无该 class 依赖（本仓侧审计：demo/jade-garden 选择器干净）。
> 执行模式（2026-08-27 起，含 019 余量的后续）：单 worktree + 每 phase
> 合回同步——不再按批次开多 worktree/多分支并行；每个 phase 落地即合回
> 主线、双仓同步到同相位后再进下一 phase（取代 019 批次六~八的多轨合并，
> 免除跨仓合并排序约束）。

## 背景

应用侧影响面（2026-08-25 调研结论）：

- **消费面极窄**：demo + jade-garden + musk 合计仅 5 个导入符号
  （`AutoDownEditor`/`StreamingRenderer`/`BlockInfo`/两个 style.css），
  真正耦合在 DOM 契约（`data-block-id`/`.autodown-editor*`/
  `.streaming-document`/`.node-slot`）与两个 expose
  （`getBlockMap`/`containerRef`）。
- **jade-garden**：单栏 WYSIWYG，不用渲染包；唯一 tiptap 旁路
  `editor_tab_ext.ts:169`；`autodown-editor.css` 598 行中 `.ProseMirror*`
  覆写在 018 后大半作废。
- **demo**：双栏 harness，`useSyncedScroll.ts`（528 行）三重契约依赖；
  e2e 304 行选择器深耦合。
- **musk**：vendor 快照消费方，008 的 T13/T10 验证至今未执行
  （DEBTS 在册）。

## 目标

1. **musk 欠账清偿**：T13（渲染切换 markstream→`@autodown/vue 0.2.0`）
   与 T10（编辑器接入）在 musk 会话执行记录——engine 迁移的强制前置。
2. **demo 迁移**：消费切 `@autodown/engine`；双栏保留为诊断/对拍视图。
3. **jade-garden 迁移**：slash 旁路换命令层 API（018 `insertTemplate`）；
   CSS 覆写清理（`.ProseMirror*` 作废段删除）；`.ad` 块语义与引擎
   序列化器对齐校准。
4. **旧包退役**：`@autodown/vue`/`@autodown/editor`/`@autodown/core`
   shim 状态定版（deprecate 标注 + 退役时点裁定）。
5. **文档收口**：README/ARCHITECTURE/roadmap/docs 索引全面反映 engine
   架构；DEBTS 增量登记。

## 阶段划分

### Phase 1 — musk 欠账清偿（外部仓协调）

- 协调 musk 会话执行 T13/T10（渲染切换 + 编辑器接入 vendor 验证），
  记录进 DEBTS 008 行销号。
- 若 musk 侧排期不可得：裁定"合并验证"（musk 直接 vendor engine
  0.3.0+，跳过 0.2.0 中间态）——风险是丢失 0.2.0 基线对拍，需 musk
  侧同意并登记。

### Phase 2 — demo 迁移

- `demo/package.json` 依赖切 `@autodown/engine`（shim 可选路径跳过，
  demo 是本仓应用直接切目标态）；`app_ext.ts` re-export 源改 engine。
- `useSyncedScroll.ts`：三契约核验（`getBlockMap`/`containerRef`/
   `node-slot`）零改动预期；若有几何测量差异（018 编辑器 DOM 结构
   变化引起的 offsetParent 链差异），按块对齐语义修适配层不动机制。
- e2e：017/018 冻结清单核对，更新选择器仅限已显式破坏项。
- 验收：demo e2e 9/9 + 双栏对拍（左编辑右渲染一致性目检记录）。

### Phase 3 — jade-garden 迁移

- `editor_tab_ext.ts`：
  - `import { AutoDownEditor } from '@autodown/editor'` → engine；
  - slash 模板插入 `editor.chain()` → `insertTemplate(blocks)` 命令层
    API（018 产物）；
  - `EditorShell` 薄壳（onAssetUpload 改名转发）随 DSL 事件能力现状
    重新评估能否拆除（015 若已支持，删除薄壳）。
- `autodown-editor.css`：`.ProseMirror*` 作废段删除（018 后无此 DOM）；
  `.autodown-*` 保留段与 engine style.css 合并策略裁定（倾向覆写段
  收敛进 engine 主题变量，jade 侧只留布局类）。
- `lib/blockParser.ts`（304 行前端镜像解析）与后端 `parser.rs` 的块
  语义对齐：与 engine `./parser` 的 `parse_blocks` 输出投影比对，
  差异清单 → 三选一裁定（改前端镜像/改后端/直接消费 engine parser
  的 TS 发射物——倾向第三者，消除第三处镜像）。
- stub 更新：`gen_autodown_editor.d.ts` 指向 engine 类型。
- 验收：jade vue-tsc + e2e 23/23 + 手验（打开/编辑/保存/wikilink/
  slash 模板/图谱视图不受影响）。

### Phase 4 — 旧包退役与发版裁定

- 退役时点裁定（017 待澄清 3 收口）：musk 切换完成 + 无其他消费方
  查证 → `@autodown/vue`/`@autodown/editor`/`@autodown/core` 打
  deprecate 标注（README + npm 字段预留），1.0.0 时归档。
- 发版通道裁定：vendor 快照维持 vs npm publish（前提：engine 去
  `workspace:*` 内联依赖 + `.changeset` access 调整）——按届时 musk
  需求定，DEBTS 登记决策。
- `@autodown/engine` **1.0.0**（019 完成后）：双平台齐 + 契约冻结。

### Phase 5 — 文档与台账收口

- `docs/designs/README.md` 索引 + 关键决策表更新（engine 单包、ProseMirror
  AST 决策废止记录）；`docs/designs/03-architecture.md` 前端组件表改 engine；
  `docs/designs/06-roadmap.md` Phase 1 修订（canonical AST 改统一块模型，
  标注修订历史）。
- `packages/engine/ARCHITECTURE.md`：吸收并改写 editor 分层契约文档
  （三层架构 + 出口契约 + 发包形态）。
- DEBTS.md：本设计系列产生的延期/风险行集中登记（含 019 ark/jet
  编辑降级边界、rust katex/mermaid 降级）。

## 验收标准

1. musk T13/T10 有执行记录（或合并验证裁定 + 登记）；
2. demo/jade-garden `package.json` 无 `@autodown/vue`/`@autodown/editor`/
   `@autodown/core` 依赖；各自 e2e 全绿（9/9、23/23）；
3. jade-garden 无 `.ProseMirror` CSS 残留、无 tiptap API 引用
   （grep 断言）；块语义对齐差异清单归零或登记；
4. 旧包 shim deprecate 标注在册，退役时点有裁定记录；
5. engine 1.0.0 发布（vendor 或 npm 通道按裁定），文档收口清单逐项
   核验。

## 待澄清事项

1. ~~**jade-garden 前端 blockParser 的最终归宿**（Phase 3 三选一）~~
   **✅ 已裁定（2026-08-28）**：保留前端镜像（选项 a）+ 差异清单登记
   （DEBTS 020 行）。原倾向的"前端直消费 engine parser 发射物"（选项 c）
   经实证不可行：engine parser `SourceRange` 恒占位 rng(0,0)（.at 头注
   自证 startLine/endLine dropped），`ensureBlockAnchors` 的行级锚点手术
   无行号可用；`:::` 容器/table 亦不在解析子集。选项 b（改后端）已被
   plan 021 的 back 单源化自然否决。(c) 的前置（parser 补行号 + 子集
   扩展）已登记为后续债项。
2. ~~**musk 排期不可得时的合并验证**是否可接受~~ **✅ 无需触发**：
   musk 侧两项均有执行记录（T13 = 51b8abf；T10 = 041 stub 等价裁定），
   DEBTS 008 行双销号（26c450a）。
3. ~~**engine 1.0.0 的 API 冻结范围**~~ **✅ 已裁定（2026-08-28，按倾向
   执行）**：命令层 API（018）随 1.0.0 冻结；VM natives 与 rust 平台面
   （a2r crate）标 experimental 不冻结——见
   packages/engine/ARCHITECTURE.md §2 与 changeset
   plan-020-engine-1.0.0.md。

## 复审记录

- **复审人/时间**：/auto-plan:review，2026-08-28（worktree `.worktree/plan-020` @ master 同相位复验）。
- **验收①（musk T13/T10 执行记录）**：✅ pass——T13 = musk 51b8abf（render-switch 5/5 对拍）；T10 = musk PLAN-041 Phase 2 执行记录（2026-08-26 stub 等价裁定，checkbox [x] 在册）；DEBTS 008 行双销号（26c450a）。合并验证备选未触发。
- **验收②（双 app 无旧依赖 + e2e 全绿）**：✅ pass——`grep '@autodown/' demo/package.json jade package.json`：各仅 `@autodown/engine` 一条；复审时重跑 demo e2e **9/9**、jade vue-tsc 零错 + e2e **23/23**（含 04 wikilink 两例）。
- **验收③（CSS/tiptap 归零 + 块语义对齐）**：✅ pass——`grep ProseMirror`（jade src+auto，css/vue/ts）= 0；`grep @tiptap/`（jade+demo 源与依赖）= 0；engine 自身 css 的 `.ProseMirror-selectednode`/gapcursor/drag-handle 残留一并清除（超出计划最低要求）。块语义差异清单**登记**（DEBTS 020 行）：engine parser 行号占位 + `:::`/table 子集缺口 → 保留前端镜像（选项 a），(c) 前置在册；选项 b 被 plan 021 back 单源化自然否决。5 文件 fixture 对拍差异清单在执行日志。
- **验收④（shim deprecate + 退役时点裁定）**：✅ pass——三包 package.json `deprecated` 字段 + 墓碑 README；changeset plan-020-engine-1.0.0.md；DEBTS 020 归档行（物理归档前置 = musk vendor 再生路径确认）。
- **验收⑤（engine 1.0.0 + 文档收口）**：✅ pass——version 1.0.0（复审 grep 实证）；vendor 通道裁定落档（changeset + ARCHITECTURE §4 + DEBTS 008 行维持）；designs README/03/06、engine ARCHITECTURE.md 逐项在（59ae2a3）。
- **全量门禁（review 专属）**：engine vitest **261/261**（含新增 wikilink 6 例）；`pnpm -r build` 断言双绿（assert-parser-pure / assert-no-tiptap）。
- **遗漏猎查**：发现并已补救 1 项——Phase 5 文本要求 DEBTS 集中登记"019 ark/jet 编辑降级边界、rust katex/mermaid 降级"，原执行只登记了 020 自身三行；复审补 2 行（ark/jet 编辑降级、rust katex/mermaid v1 降级，引用 019 归档 + 设计 §9）。补救后 Phase 5 完整。
- **延后猎查**：bubble/表格/代码块菜单与 node view 富渲染延期已按"归零**或登记**"条款入册（DEBTS 020 行，前置 = 行内 mark 层）；旧包物理归档挂 musk 确认（DEBTS 020 行）。均为计划文本允许的登记式收口，非未批准缩水。
- **Workaround 猎查**：① 05/08 e2e 期望 2→3 + 基线重录——根因是 master 上 plan-021 今晨改 fixture（CAP 定理.ad 新增 [[Hello World]]）未同步 jade 期望，属跨计划漂移修复，已在测试注释与提交信息留痕；② EditorShell 薄壳**评估后保留**——计划允许"重新评估能否拆除"，DSL 现状仍把 on* prop 当事件监听（onAssetUpload 改名转发仍必需），拆除前置（DSL 支持任意 on* prop 名）未达成，薄壳保留为正解非绕道；③ wikilink 装饰器对 TEXT_CHILDREN vnode 采用重建而非原地改 children——Vue shapeFlag 约束下的正确做法，单测锁定。
- **DEBT 候选**：无新增（020 五行 + 019-IME 等既有行覆盖全部边界）。
- **裁定**：五项验收全 pass、无阻断债 → **reviewed**，移交 /auto-plan:merge。
