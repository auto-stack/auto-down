# Plan 021：编辑层 UI 再 Auto 化（engine chrome 层 .at 恢复与桥接换向）

> 状态：**草案（待立项）**。立项：2026-08-26。
> 前置：**与 plan 020 合并执行或紧随其后**（020 剩余批次正手写补
> bubble/table/codeblock 菜单与 wikilink 交互——本计划提供 .at 实现路径，
> 避免手写一遍再翻一遍；汇合裁定点见 §协调）。
> 关联：plan 013（第 1 层 .at 组件资产，本计划的恢复对象）、
> plan 018（编辑内核替换，新接口面的定义者）、plan 017（包合并，
> engine/auto/{parser,render} 布局蓝本）、auto-lang plan 019 Phase 4
> （registry spec 层，本计划不动）。

## 背景

**Auto 化覆盖率回退事件（2026-08-26 查明）**：

- plan 013 建立了编辑层 14 个 `.at` widget 源（2743 行，组件层 100%
  Auto 化）+ 7 个 ext TS 桥（750 行，接 Tiptap NodeView/API）。
- plan 017 Phase 1（8f8d494）将其原样迁至 `engine/src/editor/auto/`。
- plan 018 Phase 4（c7364cd）Tiptap 退役时**整树删除**。当前
  `engine/src/editor/menus/SlashMenu.vue` 等仍是"Auto-generated"字样的
  冻结产物——**源已不在仓库，再生成即丢失**。
- 新编辑层（EngineEditor/BlockHost/commands/input-rules 等）为手写
  TS/Vue。其中引擎核心胶水（editor-engine/composition/host-controller）
  属平台层性质（同 renderer 的手写壳待遇），**不是**本计划的 Auto 化
  对象；菜单/块视图 chrome 层才是。

**架构裁定（2026-08-26，与 auto-lang AutoUI 的关系）**：通用统一点在
auto-lang registry 的 `AutoDownEditor` WidgetSpec（spec 层已在位，019
Phase 4 做后端映射重定向）；本计划的子组件（slash/bubble/table 菜单、
块视图）领域耦合重（slash 清单 30 项为 AutoDown 文档语义）且依赖 ext
桥，**不上收为 AutoUI 通用 widget**（无第二消费方，YAGNI；未来出现
第二消费方时再把通用壳子抽出）。

## 目标

1. **`.at` 源恢复**：从 git 历史（c7364cd 父提交）恢复 14 个 widget 源
   至 `packages/engine/auto/editor/`（与 parser/render 布局对齐，不再
   埋 src/ 下）；gen 管线扩为三目录（parser/render/editor）。
2. **ext 桥换向**：`node_view_ext`（150 行）从 Tiptap NodeView 改接引擎
   块视图接口；`auto_down_editor_ext`（427 行）改接引擎装配/命令层
   （`insertTemplate`/`replaceSelection`/`focusBlock`，018 产物）；
   bubble/code_block/table/code_language_icon/slash_item 各 ext 同步。
   目标按 018 计划口径：**widget .at 源零改动预期，预期小修事件载荷**。
3. **chrome 层全部回到活生成态**：SlashMenu（现有冻结产物恢复可再生成）
   + bubble/table/codeblock 菜单（020 剩余批次的 .at 化实现）+ 7 个块
   视图（math/mermaid/details/wikilink/query/block_embed 富渲染）。
4. **wikilink 点击交互**：`wiki_link_node_view.at` 恢复后提供
   `[[..]]` span + `open-wiki-link` 发射（020 移交项的 .at 化落地）。
5. **冻结产物清零**：engine 内不存在"源已删除的生成物"；手写与生成
   的边界写进 engine ARCHITECTURE.md。

## 非目标

- 引擎核心胶水（editor-engine/commands/composition/host-controller/
  text-diff/tiptap-adapter）保持手写平台层，不 Auto 化。
- EngineEditor/BlockHost 装配层 v1 保持手写（IME/composition 平台逻辑
  密集）；Phase 4 评估是否可 .at 化（不行则登记边界）。
- 不动 auto-lang registry spec（019 Phase 4 的职责）。
- 不改 DOM 契约与 e2e 选择器（018 冻结清单继续有效）。

## 阶段划分

### Phase 1 — 源恢复与管线

- 从 `c7364cd^` 恢复 `engine/src/editor/auto/` 14 源 →
  `packages/engine/auto/editor/`；gen.mjs 三目录化（parser/render/
  editor 各自发射规则与后修沿用现有两目录惯例）。
- 恢复即编译盘点：哪些 widget 直接过 a2ts，哪些因 ext 桥缺失符号
  报错——产出换向工作量清单（进计划附录）。
- 门：`pnpm gen` 三目录确定性两连跑一致；不改变任何现行部署物
  （本阶段只建立发射能力，不覆盖 src/ 冻结产物）。

### Phase 2 — ext 桥换向与 slash 复活

- 按 018 接口面（EDITOR-CONTRACT.md + engine/src/editor/engine/
  index.ts 出口）重写 7 个 ext 桥的实现侧，接口签名尽量保形。
- SlashMenu 复活：`.at` 源 → 生成物覆盖冻结产物，diff 评审
  （预期仅事件载荷/import 路径差异）；slash-manifest 30 项零改动。
- 门：engine 测试全绿 + demo e2e 9/9。

### Phase 3 — 菜单与块视图（020 汇合点）

- bubble/table/codeblock 菜单 .at 化恢复（= 020 剩余菜单批次的实现
  路径）；CodeLanguageIcon 恢复。
- 7 个块视图 .at 恢复 + 块视图接口接引擎宿主协议（math/mermaid 预览
  经 optional-capabilities 注入位，018 遗留口径）。
- wikilink 点击交互（`[[..]]` span + open-wiki-link 发射）。
- 门：demo e2e 9/9 + jade e2e（020 基线，目标 23/23）。

### Phase 4 — 收口

- EngineEditor/BlockHost 的 .at 化可行性评估（结论二选一：实施或
  登记"平台装配层"边界进 ARCHITECTURE.md）。
- 冻结产物扫描脚本（生成物头注 ↔ .at 源存在性断言）入 build guard。
- ARCHITECTURE.md 手写/生成边界定版；CHANGELOG；DEBTS 增量登记。
- 门：engine 全测试 + demo 9/9 + jade 23/23 + 三 regen 确定性。

## 验收标准

1. `engine/auto/editor/` 14 源在册且为对应部署物的唯一真相源
   （冻结产物扫描 guard 断言）；
2. 菜单三件套 + 7 块视图 + wikilink 交互全部 .at 生成，e2e 行为与
   018 冻结选择器清单一致；
3. ext 桥全部脱离 Tiptap 类型（grep 断言无 `@tiptap` import）；
4. demo e2e 9/9、jade e2e 23/23、engine 测试全绿；
5. ARCHITECTURE.md 边界章节评审通过（手写平台层 vs .at chrome 层）。

## 待澄清事项

1. **与 020 的执行关系**：并入 020 剩余批次（菜单恢复即 .at 恢复，
   推荐）vs 020 手写先行、本计划后续翻译（两遍工）——开工前与
   020 执行方确认。
2. **ext 桥保形度**：若引擎事件载荷与 Tiptap 时代差异大，允许
   widget .at 小修（偏离"零改动预期"），差异清单入附录。
3. **`.am/`/pac 状态文件**（编辑器 Auto 工程的 auto-man 元数据）是否
   随源恢复——按现行 regen 管线实际需要裁定。

## 协调

- **plan 020（执行中）**：其剩余批次（bubble/table/codeblock 菜单、
  wikilink 点击）与本计划 Phase 3 是同一批功能的两种实现路径，
  强制二选一，避免双重实现。本计划文件不由 020 执行方修改，
  汇合裁定以 020 状态头回写为准。
- **plan 019 Phase 4（auto-lang 侧）**：registry spec 映射只认 engine
  出口（`AutoDownEditor`/`MarkdownRender`），不触内部 chrome 层，
  与本计划无冲突。
- **开发模式**：沿用 worktree（`.worktree/plan-021`，完成合并回
  master）；若需 auto-lang 侧 DSL 能力修补，重建 `.worktree/auto-down`
  worktree 处理。
