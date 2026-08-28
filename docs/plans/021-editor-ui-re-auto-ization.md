# Plan 021：编辑层 UI 再 Auto 化（engine chrome 层 .at 恢复与桥接换向）

> 状态：**Phase 1 完成（2026-08-26）**，Phase 2 待开工。立项：2026-08-26。
> Phase 1 产物：
> - 14 个 widget .at + 7 个 ext 桥恢复至 `engine/auto/editor/`（扁平
>   布局 + `ext/` 子目录；`use` 路径 23 处机械改写；pac.at 带、
>   .am/stubs 裁定不带——理由见该目录 README）。
> - gen 管线三目录化：新 `auto/editor/gen.mjs`（工程模式
>   `auto build --gen-only --lenient` → 暂存工程 → 收割 13 SFC 到
>   隔离区 `auto/editor/gen/components/`，**零写 src/**）+ engine
>   package.json 加 `gen:editor`。widget DSL 只能走工程模式（
>   `auto trans ts` 不吃 view），vue 后端硬编码 src/front/ 布局，
>   故用暂存工程隔离。
> - **编译盘点（附录 A）：14/14 全部发射成功**，与 c7364cd^ 末代
>   部署物逐组件 diff 差异 100% 为 ext import 说明符行，其余逐字节
>   一致。缺口归类 G1-G5（附录 A）；G4（`<dyn>` schema 漂移）/
>   G5（auto build 间歇静默 exit 1，重试已兜底）登记 DEBTS，
>   G4 修复归 Phase 4（auto-lang worktree），G5 报 auto-lang 侧排查。
> - 基线：engine 17 文件/255 用例全绿 + build 绿（恢复前后各验一次）；
>   三目录 gen 两连跑逐字节一致；src/ 零 diff。
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

---

## 附录 A：Phase 1 编译盘点（2026-08-28 落地）

执行环境：worktree `.worktree/plan-021`；auto.exe = auto-lang master
`1487b5c5d`（debug 二进制时间戳 08-28 10:19，晚于末提交 10:17，未重建、
未改 auto-lang 源码）。

### A.0 基线（恢复前）

- `autodown` workspace `pnpm install`：OK（405 包，锁文件零变更）。
- `packages/engine` `pnpm test`：**17 文件 / 255 用例全绿**（702ms）。
- `packages/engine` `pnpm build`：**绿**（vue-tsc + vite + assert-parser-pure
  + assert-no-tiptap）。
- 三目录 gen 两连跑后 `git status`：`src/` 零 diff（现行部署物未被触及）。

### A.1 恢复清单（全部来自 `c7364cd^`，新落位 `packages/engine/auto/editor/`）

- 14 个 widget 源（扁平布局）：`app.at`（占位根，必带——生成器总把根
  widget 发成 `App.vue`，产物丢弃）、`auto_down_editor.at`、四个菜单
  （`slash_menu`/`bubble_menu`/`table_menu`/`code_block_menu`）、
  `code_language_icon.at`、七个块视图（`details`/`wiki_link`/`query_block`/
  `block_embed`/`mermaid`/`math_block`/`math_inline`）。
- 7 个 ext 桥 → `auto/editor/ext/`：`auto_down_editor_ext.ts`、
  `bubble_menu_ext.ts`、`code_block_menu_ext.ts`、`code_language_icon_ext.ts`、
  `node_view_ext.ts`、`slash_menu_ext.ts`、`table_menu_ext.ts`（均原样恢复，
  Tiptap 时代实现，换向属 Phase 2）。
- **源码级改动（纯机械，零语义）**：14 个 .at 内的 23 处 `use { ... }`
  路径由 `src/front/utils/<name>_ext.ts` 改写为 `ext/<name>_ext.ts`
  （新布局的项目根相对路径）；头注中的旧 README/再生成命令指针同步
  更新（`src/auto/README.md` → `auto/editor/README.plan013.md`，
  `code_language_icon.at` 的 regen 命令 → `pnpm gen:editor`）。
- `README.plan013.md`：旧 README 原样保留作参考；新 `README.md` 记现行
  管线。
- **元数据裁定**：`pac.at` **带**（`auto build` 无 manifest 拒绝运行）；
  `.am/` **不带**（auto-man 工具态，每次构建在 stage 目录自生自灭，
  parser/render 管线亦不携带）；`stubs/`（10 个 gen 工程 shim）**不带**
  （只为旧门禁构建的 gen 内 vue-tsc 服务，`--gen-only` 跳过该门禁；
  可从 `c7364cd^` 找回）。

### A.2 gen 管线三目录化

- 新 `auto/editor/gen.mjs` + engine `package.json` 增 `gen:editor` 脚本。
- widget DSL **不能**走 `auto trans ... ts`（`Expected term, got View`），
  唯一通道是工程模式 `auto build`；vue 后端硬编码项目布局
  `<root>/src/front/*.at`，故 gen.mjs 每次全新搭建暂存工程
  （`auto/editor/gen/_stage/`，编译器增量发射缓存对被清空的目录不可靠，
  故一律重建），跑 `auto build --gen-only --lenient`，把 13 个组件 SFC
  收割到**隔离输出区** `auto/editor/gen/components/`，校验日志落
  `gen/validation.log`。**不写 src/ 任何文件**。
- `--lenient` 必需：strict（plan 015 起默认）把 S002 `<dyn>` 警告升级为
  构建失败。E1 后修（`@/ext/ext/<name>_ext` → 部署目标路径）**刻意未做**，
  属 Phase 2 部署期后修。
- 确定性：三目录 gen 两连跑产物逐字节一致（已验证）。
- **编译器抖动**（登记）：`auto build` 偶发在校验阶段结束后静默 exit 1、
  无任何输出（本次会话约 1/4 概率，计时敏感）；gen.mjs 检测产物缺失
  自动重试一次，再败则响亮失败。

### A.3 14 widget 编译盘点

通道：`auto build -r vue --gen-only --lenient`（auto-lang master
`1487b5c5d`）。**14/14 全部发射成功**（13 组件 SFC + App.vue 丢弃）。
与 `c7364cd^` 对应部署物逐组件 diff：**差异全部且仅为 ext import 说明符
行**（`@/ext/ext/<name>_ext` vs 旧 `../auto/src/front/utils/<name>_ext`，
每组件 1–7 行），其余逐字节一致——含现行冻结产物
`src/editor/menus/SlashMenu.vue`（新发射与其仅 1 行 import 差异）。

| widget | 发射 | 校验警告 | 与末代部署物 diff | ext 桥依赖现状 |
|---|---|---|---|---|
| app.at | ✅（App.vue 丢弃） | — | — | 无 |
| code_language_icon | ✅ | 无 | 1 import 行 | `codeBlockLanguage.ts` 现存 → 仅路径重接 |
| slash_menu | ✅ | S002 dyn ×1, R011 ×1, S001 ×2 | 1 import 行 | `useMenuBounds.ts` 现存 → 仅路径重接 |
| bubble_menu | ✅ | S002 ×1, R011 ×1, S001 ×1 | 2 import 行 | `tiptapBubbleMenu` ❌（Tiptap BubbleMenu 包装/shouldShow 语义）→ 换向引擎选择态/菜单宿主 |
| table_menu | ✅ | S001 ×3 | 1 import 行 | `useMenuBounds.ts` 现存 → 仅路径重接 |
| code_block_menu | ✅ | S002 ×1, R011 ×1, S001 ×3 | 1 import 行 | `useMenuBounds.ts` 现存 + lucide Check → 仅路径重接 |
| details_node_view | ✅ | S002 ×1, S001 ×6 | 3 import 行 | `node_view_ext`：`tiptapNodeView` ❌ + `renderPreview` ✅ → 半换向 |
| wiki_link_node_view | ✅ | S002 ×1, S001 ×2 | 2 import 行 | 同上（含 `open-wiki-link` 发射，Phase 3 交互落点） |
| query_block_node_view | ✅ | S002 ×1 | 2 import 行 | 同上 |
| block_embed_node_view | ✅ | 无 | 2 import 行 | 同上 |
| mermaid_node_view | ✅ | S002 ×1, S001 ×2 | 3 import 行 | 同上 |
| math_block_node_view | ✅ | S002 ×1, S001 ×2 | 3 import 行 | 同上 |
| math_inline_node_view | ✅ | S001 ×2 | 2 import 行 | 同上 |
| auto_down_editor | ✅ | S004 ×1, S002 ×1 | 7 import 行 | `useAutoDownEditor` ❌ / `tiptapEditorContent` ❌ / 菜单 SFC ×4 ❌（可再生）/ `extensions/BlockId` ❌ / `extensions/tableAttributes` ❌ / `slashItem.ts` ✅ → 最重换向（接 018 装配/命令层） |

缺口归类（Phase 2 工作量清单）：

- **G1 仅路径重接**（目标模块现存）：`code_language_icon_ext`、
  `slash_menu_ext`、`table_menu_ext`、`code_block_menu_ext` —— 4 桥小修。
- **G2 半换向**：`node_view_ext` —— NodeViewWrapper/NodeViewContent 换接
  引擎块视图宿主协议（018 接口面），`renderPreview` 路径重接即可。
- **G3 全换向**：`bubble_menu_ext`（Tiptap BubbleMenu 包装 → 引擎菜单宿主）、
  `auto_down_editor_ext`（useAutoDownEditor/EditorContent/BlockId/
  tableAttributes 全部改接 engine 装配与命令层
  `insertTemplate`/`replaceSelection`/`focusBlock`）。
- **G4 schema 漂移**（auto-lang 侧，本计划不改）：现行 `schema/aura.at`
  不识 `<dyn>`（S002 ×9，8 widget）——发射产物仍正确生成
  `<component :is>`，警告为校验噪声，但与 strict 默认冲突；R011 ×3
  （BubbleMenu/CodeBlockMenu/SlashMenu 各一处 class/style 未发射警告）
  与 S001 prop 白名单噪声同理（产物与末代部署物逐字节一致，证明这些
  警告在 plan 013 时代同样存在或被接受）。待决策：auto-lang schema 补
  `dyn`/prop 白名单，或 widget 源换写法（Phase 2 裁定）。
- **G5 编译器间歇静默失败**：见 A.2，已由 gen.mjs 重试兜底；若频发需
  auto-lang 侧排查（登记，未定位根因）。

### A.4 Phase 1 门核验

- `pnpm gen:parser` / `gen:render` / `gen:editor` 三目录两连跑产物一致 ✅
- 现行部署物零变更（git status 仅新增 `auto/editor/` + package.json
  一行脚本）✅
- engine test 255/255、build 绿（恢复前后一致，本阶段未引入回归）✅
