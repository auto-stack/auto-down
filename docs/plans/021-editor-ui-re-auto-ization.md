# Plan 021：编辑层 UI 再 Auto 化（engine chrome 层 .at 恢复与桥接换向）

---
supersedes_spec_components:
  - "engine src/editor/{menus,components,node-views} 冻结产物态: 替换为 auto/editor/ 单源活生成态（SlashMenu 生成物覆盖冻结产物，diff 恰 1 行；12 部署物与末代逐字节一致 modulo ext import）"
  - "ext 桥 Tiptap 时代实现（composables/tiptap* 双解析 shim + Tiptap API）: 替换为 src/editor/ext/ 引擎接口桥（零 @tiptap import，auto/editor/ext 单源逐字节部署）"
new_spec_components:
  - "engine auto/editor gen 管线（暂存工程 auto build --gen-only --lenient + 收割 + E1 断言式后修 + DEPLOY 部署）: 新增 pnpm gen:editor 部署态"
  - "engine scripts/assert-editor-gen.mjs 冻结产物 guard（头注↔.at 源存在性/12 部署物清单精确/7 ext 桥逐字节同步）: 新增，入 build 第四断言"
  - "engine ARCHITECTURE.md §6 手写平台层 vs .at chrome 层边界: 新增定版（EngineEditor/BlockHost=平台装配层不 .at 化；auto_down_editor.at=dormant 参考实现）"
  - "auto-lang schema dyn ElementDef（dyn (.expr) 结构关键字补声明，S002 误报消除）: 新增，已合 auto-lang master 07134032c（fix ec7a4bd1e）"
touched_goals:
  - "021 目标1: 14 个 .at 源恢复 + gen 三目录化（附录 A，14/14 发射）"
  - "021 目标2: 7 ext 桥引擎换向，widget .at 源零改动达成（附录 B）"
  - "021 目标3: chrome 层全部回活生成态（附录 C，12 部署；挂载缺口显式在册）"
  - "021 目标4: wikilink 交互——按 §协调二选一以 020 装饰器裁定为准，本计划不重复实现（Phase 3 修订注记，用户已批）"
  - "021 目标5: 冻结产物清零 + ARCHITECTURE 边界定版（附录 D + guard）"
---

> 状态：**reviewed（2026-08-28，/auto-plan:review 终审通过）**，待 /auto-plan:merge。立项：2026-08-26。
> Phase 2 产物（详见附录 B）：7 个 ext 桥全部脱离 Tiptap 改接引擎接口
>   （G1 四桥路径重接；node_view_ext 引擎宿主组件；bubble_menu_ext 本地
>   EngineBubbleMenu；auto_down_editor_ext 引擎会话 + 适配器 handle，30 项
>   清单单源自 slash-manifest.ts）；gen.mjs 进入部署态（ext 桥 →
>   `src/editor/ext/`，DEPLOY_COMPONENTS + E1 断言式后修；auto_down_editor_ext
>   随 Phase 3 菜单批次部署）；**SlashMenu 复活**——生成物覆盖冻结产物，
>   diff 恰 1 行 import 说明符，两连跑部署逐字节一致；引擎侧
>   createEditorAdapter 挂 `__engine`（Block link 命令复活，+1 测试）。
>   门：engine 256/256 + build 绿 + demo e2e 9/9。
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
  > **复审修订（2026-08-28）**：本项已由 plan 020 Phase 3 以"编辑器侧
  > 预览装饰器"（engine `src/editor/wikilink.ts` + jade e2e 23/23 回绿）
  > 落地，按 §协调"二选一、以 020 状态头回写为准"裁定：**交互以 020
  > 装饰器为准，本计划不再重复实现**。`wiki_link_node_view.at` 仍按
  > "chrome 层回活生成态"目标恢复为生成源（不承担运行时交互挂载，
  > 引擎行内节点视图协议存在前无挂载点）。
- 门：demo e2e 9/9 + jade e2e（020 基线，目标 23/23）。
  > **复审修订（2026-08-28）**：开工前须先合入 master（020 全相位 +
  > engine 1.0.0 + wikilink，领先本分支 9 提交），门在合并后基线上跑。

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

---

## 附录 B：Phase 2 落地记录（2026-08-28）

### B.0 基线勘误（worktree 环境）

- Phase 1 附录 A 的基线未含 demo dev server 侧：worktree 内 shim 包
  （`@autodown/editor`/`@autodown/vue`）dist 未构建，demo vite 解析
  `<pkg>/style.css` 500、e2e 9 全挂。补跑两 shim 的 `pnpm build`
  （workspace 内构建产物，不涉源码改动）后恢复 9/9。engine 侧
  `pnpm install`/test/build 基线与附录 A 一致。

### B.1 ext 桥换向（7/7 完成，无 @tiptap import）

| 桥 | 换向 | 要点 |
|---|---|---|
| slash_menu_ext | G1 | computeMenuPosition 路径重接（`../composables/useMenuBounds`） |
| code_language_icon_ext | G1 | getLanguageIconUrl 路径重接（`../utils/codeBlockLanguage`） |
| table_menu_ext | G1 | 同上 + tableMenuTitles 原样 |
| code_block_menu_ext | G1 | 同上 + 语言清单/Check 图标原样 |
| node_view_ext | G2 | NodeViewWrapper/NodeViewContent 换本地引擎宿主组件（`as` 元素 prop + attrs 透传 + data-node-view-* 标记，DOM 契约保形）；renderPreview 路径重接；其余（parseWikiLinkRaw/图标/normalizeQueryResults/errorMessage/focusAndSelect）原样 |
| bubble_menu_ext | G3 | tiptap BubbleMenu → 本地 EngineBubbleMenu：引擎 handle（`__engine`）驱动可见性（onChange 重算）、shouldShow 收引擎形态 state（selection.empty = anchor==head collapsed）、outside-pointerdown/Escape 关闭、v1 定位锚到聚焦块元素。**v1 块粒度选择恒 collapsed → 菜单不弹**（与 020 移交口径一致：待行内 mark/选择扩展）；runBubbleLink 的 set/unsetLink 链可选调用（适配器无此命令不炸） |
| auto_down_editor_ext | G3 | useAutoDownEditorBridge 建 EditorEngine 会话 + createEditorAdapter handle（getMarkdown=serialize(doc,true)、commands.setContent=replaceDoc、setEditable、isFocused、`__engine`）；30 项清单 **单源自 `src/editor/slash-manifest.ts`**（零复制）；EditorContent=本地 EngineContentHost（聚焦叶块走 BlockHost、其余走 render 预览管线——EngineEditor 的活预览折衷的桥内移植，Phase 4 装配评估的过渡实现）；appendTableIAL=identity（引擎序列化器自持 IAL 发射，016 S4）；blockMapOf=引擎 block-map（handle.__contentEl 域内） |

- 保形度：widget .at 源零改动达成（桥导出面与 `use` 声明逐项对齐，
  含 `TiptapBubbleMenu`/`EditorContent` 历史导出名）；事件载荷无变化。

### B.2 gen.mjs 部署态 + SlashMenu 复活

- `EXT_DEPLOY`（6 桥）+ `DEPLOY_COMPONENTS`（本阶段仅 SlashMenu.vue →
  `src/editor/menus/`）+ **E1** 后修：`from '@/ext/ext/<n>'` →
  `from '../ext/<n>'`（menus/components/node-views/core 皆为 src/editor/
  直接子目录，统一 `../ext/` 前缀；断言式——无 ext import 即失败）。
- **auto_down_editor_ext 部署推迟 Phase 3**：其 `../menus/{BubbleMenu,
  TableMenu,CodeBlockMenu}.vue` re-export 在菜单生成物落地前无法过
  vue-tsc（gen.mjs 注释 + 桥头注均已记录）。
- SlashMenu diff 评审：与冻结产物 diff **恰 1 行**——
  `import { computeMenuPosition }` 说明符由 `../composables/useMenuBounds`
  → `../ext/slash_menu_ext`（运行时等价：桥内即 re-export 该模块）。
- 确定性：gen 两连跑后部署物（SlashMenu.vue + ext/）逐字节一致 ✅。

### B.3 引擎侧小修

- `createEditorAdapter` 挂 `__engine`（EditorAdapter 接口 + 实现）：
  slash-manifest 的 getCurrentBlockAnchor/Block link 命令此前读
  `editor?.__engine` 恒 undefined（死路径），现接通；+1 测试钉住
  （tiptap-adapter.test.ts）。

### B.4 Phase 2 门核验

- engine test **256/256**（255 基线 + 1 新增）✅
- engine build 绿（vue-tsc + vite + assert-parser-pure + **assert-no-tiptap**）✅
- demo e2e **9/9**（E2E_PORT=5199, --workers=1）✅
- slash-manifest 30 项零改动（未触文件）✅
- 部署 ext 无 @tiptap import（grep 仅注释文字命中）✅

---

## 复审记录（/auto-plan:review，2026-08-28，中期——Phase 2 专项）

**裁定：不路由 `reviewed`**（计划未达 execution_done，Phase 3/4 未开工；
本次为用户点名的中期复审，核验已声称完成的 Phase 2 并修订 Phase 3 范围）。
回 `/auto-plan:work`。spec-impact frontmatter 留待终审（Phase 4 后）填写。

### 逐项核验（全部本 worktree 重跑，非引用执行记录）

| 项 | 判定 | 证据 |
|---|---|---|
| engine 全测试 | ✅ | 17 文件 / **256/256**（基线 255 + `__engine` 新增 1） |
| engine build | ✅ | vue-tsc + vite + assert-parser-pure + assert-no-tiptap 全绿 |
| demo e2e | ✅ | **9/9**（E2E_PORT=5199, --workers=1） |
| SlashMenu diff 评审 | ✅ | 与冻结产物 diff 恰 1 行（computeMenuPosition import 说明符），无事件载荷差异 |
| slash-manifest 30 项零改动 | ✅ | slash-manifest.ts / slashItem.ts 零 diff |
| ext 无 @tiptap import | ✅ | `from '@tiptap` 在 auto/editor/ext/ + src/editor/ext/ 命中 0 |
| gen 确定性 | ✅ | 复跑 gen 后 git status 稳定（部署物无漂移） |
| Phase 1 资产在册 | ✅ | auto/editor/ 14 个 .at 源在位 |
| 验收 3（桥脱离 Tiptap） | ✅（源侧） | 7/7 桥重写完成；运行时部署 6/7（见 F1） |

### 遗漏 / 延后 / workaround 清单（debt 候选，不隐藏）

- **F1 延后（已记录）**：auto_down_editor_ext 部署推迟 Phase 3（其
  `../menus/*.vue` re-export 在菜单生成物落地前不过 vue-tsc）。计划原文
  Phase 2 未拆部署相位——本延后系执行裁量，已在 gen.mjs/桥头注/附录 B
  三处记录，Phase 3 收口。
- **F2 重复实现（Phase 4 输入）**：EngineContentHost 为 EngineEditor 活预览
  折衷的桥内移植（~60 行重复）；装配评估裁定前两份并存。
- **F3 v1 固有限制**：EngineBubbleMenu 在块粒度选择下恒 collapsed 不弹
  （与 020 移交口径一致：待行内 mark/选择扩展）；runBubbleLink 以可选链
  容错适配器缺失的 set/unsetLink。
- **F4 小欠账**：EngineBubbleMenu 的 onChange 监听无 off 通道（unsubscribe
  为墓碑 no-op，EngineEngine 无移除 API）。
- **F5 继承缺口（非本次引入）**：SlashMenu 两段式定位依赖 `editor['view']`
  （coordsAtPos），引擎适配器无此面 → 定位跳过、菜单位置为默认值。018
  冻结产物行为相同（e2e 以默认位姿通过）；定位保真待引擎坐标系 API。
- **F6 契约冻结冲突（新发现，合并前必修）**：master 上 020 Phase 4 已将
  `createEditorAdapter` 列入 **engine 1.0.0 冻结面**（ARCHITECTURE.md §2），
  而本分支给导出接口 `EditorAdapter` 加了**必填** `__engine` 字段——对外部
  实现方是破坏性类型变更。修法：改可选（`__engine?: EditorEngine`，
  slash-manifest 的 `editor?.__engine` 读法天然兼容）或补契约注记。
- **F7 合并前提（新发现）**：本分支落后 master 9 提交（020 全相位 + engine
  1.0.0 + wikilink.ts + EngineEditor 装饰器接线 + engine 261 测试）。文件
  面无冲突（020 未触 SlashMenu/tiptap-adapter/slash-manifest/auto/），但
  Phase 3 必须先 `git merge master` 并在合并后基线重跑全门（engine 应
  262+、jade 23/23 以 master 为基）。

### Phase 3 范围修订（依 020 状态头回写，已改上文 Phase 3 节）

- wikilink 点击交互：**020 装饰器为准，本计划不重复实现**（二选一裁定）；
  wiki_link_node_view.at 仍恢复为生成源，不挂运行时交互。
- Phase 3 门在合并 master 后的基线上跑。

---

## 附录 C：Phase 3 落地记录（2026-08-28，master 合并基线）

### C.0 合并前提（复审 F6/F7 执行）

- F6 落地：`EditorAdapter.__engine` 改**可选**字段（020 已将
  createEditorAdapter 冻结进 1.0.0 契约面，必填字段对外部实现方是
  破坏性变更），随 Phase 2 提交 b32a0e1。
- F7 落地：`git merge master`（1e7298e，零冲突；带入 020 全相位 +
  engine 1.0.0 + wikilink.ts + EngineEditor 装饰器接线）。
  合并后基线全门：engine **262/262**（255 + 020 wikilink 6 + 本计划 1）
  + build 绿 + demo 9/9 + **jade 23/23**。
- 环境勘误：jade e2e 首跑 22/23——worktree 的 `tmp/wiki-demo` fixture
  为立项时快照，缺 020 期间新增的 `journals/` 目录；自主仓同步
  fixture 后 23/23（tmp/ 未版本化，非代码回归）。

### C.1 部署（chrome 层全量回活生成态）

- gen.mjs 部署清单翻面：EXT_DEPLOY 补 `auto_down_editor_ext.ts`（第 7
  桥，其 `../menus/*.vue` re-export 随本批菜单落地可解析）；
  DEPLOY_COMPONENTS 补 12 SFC——菜单三件套 → `menus/`、
  CodeLanguageIcon → `components/`、7 块视图 → `node-views/`（目录
  重建，gen.mjs 补目标目录 mkdir）。AutoDownEditor.vue 仍不部署
  （Phase 4 装配裁定）。
- **diff 评审：12/12 全部与 c7364cd^ 末代部署物逐字节一致**（仅 ext
  import 说明符行差异，双向过滤后 diff 为空）——.at 源零改动 +
  桥保形换向的验收面。
- gen 复跑部署逐字节一致（确定性）。

### C.2 挂载缺口（显式记录，非静默延后）

部署的菜单/块视图**未被 EngineEditor 挂载**（dormant 生成物）：

- 菜单三件套运行时需要引擎菜单宿主协议：适配器 `.on/.off(
  'selectionUpdate')`、`isActive('table')`、`getAttributes('codeBlock')`、
  表链命令（addRow*/deleteRow/deleteTable 等映射 commands.ts）、
  `view.dom` 定位 shim——v1 引擎无此面（018/020 口径：待行内
  mark/面板注入位扩展）。挂载属引擎功能扩展，超出本计划"chrome 层
  回活生成态"的范围。
- 7 块视图同理需要预览列的 block-view 挂载协议（math/mermaid 预览
  能力已就位于 ext 侧：node_view_ext → composables/renderPreview →
  render/optional-capabilities 注入位）。
- wikilink 交互：020 预览装饰器（`src/editor/wikilink.ts`）为准（见
  Phase 3 节修订注记）；WikiLinkNodeView 仅为生成源。

### C.3 Phase 3 门核验（合并基线）

- engine test **262/262** ✅；build 绿（vue-tsc 全量检查 12 新 SFC +
  第 7 桥 + assert-parser-pure + assert-no-tiptap）✅
- `from '@tiptap` 在 src/editor/ 全域命中 0 ✅
- demo e2e **9/9** ✅；jade e2e **23/23** ✅（fixture 同步后）
- 12 SFC 与末代部署物逐字节一致（modulo ext import）✅；gen 复跑
  部署一致 ✅

---

## 附录 D：Phase 4 落地记录（2026-08-28）

### D.1 冻结产物 guard 入 build

- 新 `scripts/assert-editor-gen.mjs` 接进 build 末位：① src/editor/ 全域
  扫 "Auto-generated" 头注 → PascalCase↔snake_case 映射断言 .at 源在册；
  ② 部署清单精确性（12 部署物双向核对，漂移须显式改 guard 清单）；
  ③ 7 个 ext 桥 auto/editor/ext ↔ src/editor/ext 逐字节同步。正负两向
  实测（移走 .at 源 → 响亮失败；恢复 → 绿）。

### D.2 EngineEditor/BlockHost .at 化裁定：登记"平台装配层"边界

**不实施 .at 化**，依据（ARCHITECTURE.md §6 定版）：
- BlockHost = contenteditable + compositionstart/update/end 接线 +
  CompositionSession 协议 + 光标偏移读取——widget DSL 无 contenteditable
  属性与 composition 事件面（plan 013 widget 集从未有 contenteditable
  widget，旧 EditorContent 恒为 Tiptap re-export）；
- EngineEditor = expose 契约（getBlockMap/handleSave）+ 宿主注册表 +
  重绘版本号 + 020 预览 wikilink 装饰接线——平台胶水性质。
- F2 裁定：auto_down_editor.at + 其桥为 **dormant 参考实现**保留
  （EngineContentHost = 活预览折衷的桥内移植，"装配路径可行"原型；
  过 vue-tsc、tree-shaken 不进 dist；guard 豁免）。重启装配 .at 化的
  前置：移植 wikilink 装饰与 slash 派发 + IME 手验。

### D.3 G4 修复（auto-lang 侧，分支 auto-down-g4-dyn）

- 修法 = slot/teleport 同款先例（其注释原话"codegen 特判已有，补声明
  使 S002 不再误报"）：schema.rs 登记 `element dyn`（Content 类，
  allows_children，**props 空**——透传 prop 归目标组件所有无从枚举，
  空 props 同时使 S001 prop 校验整体跳过，零新增 advisory 噪声）；
  aura.at 经 SCHEMA_DRIFT_GENERATE_AT=1 再生成（diff 恰 +10 行）；
  baseline 增量两条（rs_not_in_render/rs_not_in_vb × dyn，理由入
  auto-lang 提交信息：vue codegen 结构关键字，iced 侧无元素表成员）；
  validators 增回归测试（dyn + 透传 prop → S002/S001 双零）。
- 验证：auto-lang lib **3236/0**、schema_drift fence 绿；auto-down
  engine gen:editor（AUTO_EXE 指 G4 二进制）**S002 9→0**，部署物零
  漂移；S001/R011 26 条为 advisory（--lenient 维持，strict 兼容待
  R011/S001 口径另行裁定，不在 G4 范围）。
- 环境记录：共享 target 的 auto.exe 被运行中进程锁定（os error 5），
  G4 二进制建于 worktree 本地 target（.worktree/plan-021-g4/target），
  验证经 AUTO_EXE 覆盖；auto-down 仓检出的 `.worktree/auto-down`
  （auto-lang 内，喂 autodown-core 跨仓 path 依赖）曾被误删已恢复
  （detach 于 e0b4f66）。

### D.4 Phase 4 门核验

- engine **262/262** + build 绿（vue-tsc + 三断言，新增
  assert-editor-gen）✅
- demo e2e **9/9** ✅；jade e2e **23/23** ✅
- 三 regen（parser/render/editor，G4 二进制）两连跑：src 稳定、日志
  逐字节一致 ✅
- 台账：ARCHITECTURE.md §6 边界定版；changeset plan-021（minor）；
  DEBTS 增 021 两行（dormant 挂载缺口 / F4-F5 小欠账）、G4 行转已修复。

---

## 复审记录（/auto-plan:review 终审，2026-08-28）

**裁定：通过 → `reviewed`**（入口 execution_done；全部验收新鲜重跑核验，
非引用执行记录）。中期 Phase 2 专项复审与发现 F1-F7 见上节，其处置已随
Phase 3/4 落地（F1 第七桥部署 ✅、F2 dormant 裁定 ✅、F6 可选字段 ✅、
F7 合并基线 ✅；F3/F4/F5 登记 DEBTS 021 行）。

### 验收标准逐项核验

| # | 标准 | 判定 | 证据 |
|---|---|---|---|
| 1 | 14 源在册且为部署物唯一真相源（guard 断言） | ✅ | `auto/editor/` 14 .at 在位；assert-editor-gen 入 build 本轮绿（12 products sourced, 7 bridges in sync）；负向实测（移源即败） |
| 2 | 菜单三件套 + 7 块视图 + wikilink 交互全部 .at 生成，e2e 与 018 冻结清单一致 | ✅（wikilink 项按修订） | 12 SFC 头注齐全、与 c7364cd^ 逐字节一致；wikilink 交互 = 020 预览装饰器（§协调二选一，Phase 3 修订注记 + 用户批准）；demo 9/9 + jade 23/23（.autodown-wikilink-label 在册） |
| 3 | ext 桥脱离 Tiptap（grep 无 @tiptap import） | ✅ | src/editor/ + auto/editor/ext/ `from '@tiptap` 命中 0；assert-no-tiptap 绿 |
| 4 | demo 9/9、jade 23/23、engine 全绿 | ✅ | 终审新鲜重跑：engine **262/262** + build 四断言绿；demo 9/9、jade 23/23（Phase 4 门，worktree 同树零后续改动） |
| 5 | ARCHITECTURE.md 边界章节 | ✅ | §6 定版在册（手写平台层/生成 chrome 层/dormant 豁免/挂载缺口），随 Phase 4 提交用户批准 |

### 遗漏 / 延后 / workaround 终审清单

- 挂载缺口（菜单/块视图 dormant）：显式在册（附录 C.2 + ARCHITECTURE §6
  + DEBTS 021 行），前置 = 行内 mark/菜单宿主协议——**用户已批的范围内
  裁定**，非静默。
- G5（auto build 间歇静默 exit 1）：DEBTS 021 行在册，gen.mjs 重试兜底，
  根因排查归 auto-lang 侧——延期在册非隐藏。
- F3/F4/F5、--lenient 维持（S001/R011 advisory）：DEBTS 021 行在册。
- G4 已修复销号（auto-lang master 07134032c）。
- 未发现未记录的遗漏/缩水：全部计划级任务在 diff 中有对应落点。

### 环境事实（留档）

- 共享 target auto.exe 被运行中进程锁定：G4 验证经 AUTO_EXE 指向
  worktree 本地二进制；auto-lang master 已含修复，共享二进制下次可写
  重建后自然携带。
- auto-lang `.worktree/auto-down`（autodown-core 跨仓依赖位）曾误删已
  恢复（detach e0b4f66），保留不清理。
