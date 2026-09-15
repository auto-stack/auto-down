---
plan_id: PLAN-069
status: drafting       # drafting → executing → execution_done → reviewed → archived
feature_name: vm-native-slash-menu
author: [zhaopuming]
created_at: 2026-09-15
updated_at: 2026-09-15
plan_revision: 1
current_step: 0
total_steps: 6
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

affects: [auto-down, auto-lang]
---

# [PLAN-069] vm-native-slash-menu

## 0. 变更摘要

VM 轨原生 `autodown_editor` 补齐 `/` 弹出候选 block（slash menu），对齐 web 轨
既有能力——PARITY 清册 #12「编辑面能力差」长期线里"斜杠菜单"分项的首切片
（PLAN-067/068 把 jade 桌面正文换装到同一原生件后，此缺口在 jade VM 同样
可见；用户 2026-09-15 核验在案）。

两件事：

1. **auto-lang 仓（主战场）**：`AutodownEditorCore` 增 slash 弹层状态机
   （`/` 触发 + query 跟随 + ↑↓/Enter/Esc 键位路由 + 子串过滤）、渲染层
   菜单浮层（DocDrawList menu 段 + 光标锚定定位 + 命中测试点选）、插入
   命令族（复用 048 输入规则同款 kind 迁移/wrap 变换 + 骨架插入）、MCP
   快照暴露（`internal_text` 先例）。
2. **auto-down 仓（本仓）**：demo vm-smoke 新增 slash 臂（`key_press 'c:/'`
   真实触发 → 快照断言 → 点选 → 文档变换断言，split+merged 双模）；
   PARITY.md #12 行更新 + demo README VM 轨 slash 契约节 + DEBTS 登记。

web 轨引擎零改动（回归门）；jade 桌面为下游受益者（工具链重建后自动
继承，非本计划任务）。

## 1. 目标

- **G1 触发与导航**：VM 编辑器内块首/空白后键入 `/` 弹出候选浮层，
  query 子串过滤、↑↓ 循环、Enter 选中插入、Esc 关闭——web 轨
  `slashQueryAt`/SlashMenu 同语义（fence 内与词中不触发）。
- **G2 点选与插入**：候选项可点击插入；冻结清单（§5.3 v1 manifest）每项
  命令执行后 `emit_document` 与 web 轨同构 markdown，且一步 undo 回原状。
- **G3 观测与实机**：MCP 快照暴露弹层状态；demo vm-smoke 新臂
  split+merged 全绿且既有臂零回归；web 轨 slash e2e 零回归。
- **G4 契约落账**：PARITY #12 行、demo README 契约节、DEBTS 行三处
  落账，web 轨引擎 diff 为零。

**非目标**：web 轨引擎/菜单任何改动；bubble menu/节点视图/行内 input
rules（#12 兄弟分项与 #20，另行登记）；jade 仓改动（下游自动继承，
消费核验随 jade 下次计划）；有序列表/任务列表**输入规则**接线（非菜单
面）；`autodown_editor` 富 props；auto-lang 仓测试基建之外的工具链改动。

## 2. 架构方案

弹层完全落在 native 编辑器件内（core 状态 + widget 绘制），不经 .at
DSL/view 树——组件子树对 MCP 快照不可见的约束（068 ②）因此天然满足，
且对两端消费方（demo / jade）零 API 变化。

| 环节 | web 轨先例 | VM 轨落点 |
| --- | --- | --- |
| 触发判定 | tiptap-adapter.ts `slashQueryAt`（'/' 须在块首或空白后） | core `handle_key` Char('/') 臂：光标前缀判空 + 非 fence 块 |
| 候选清单 | slash-manifest.ts 30 项 | core 静态 manifest 表（v1 冻结子集，§5.3） |
| 过滤/导航 | SlashMenu.vue filtered + ↑↓/Enter/Esc | core 状态机（`EditorKey::Up/Down/Enter/Escape` 已在枚举） |
| 浮层绘制 | SlashMenu.vue 两段式定位 | widget `draw()` menu 段（quad+text，preedit 先例）+ 光标矩形锚定 |
| 点选 | button onclick | core `handle_mouse_press` 前置菜单命中臂 |
| 插入命令 | editor.chain() 块命令 | core 变换函数（`try_line_start_rule` 同款 kind 迁移/wrap）+ 骨架插入 |
| 观测面 | DOM `.autodown-slash-menu` | snapshot_builder AutodownEditor 臂增 slash props（`internal_text` 读 core 先例） |
| 实机驱动 | Playwright 键入 | vm-smoke `autoui_action key_press 'c:/'` + `click`（group9 逐键先例） |

**成立的工具链前提**（已核实，2026-09-15）：

- native 编辑器 `AutodownEditorCore`（auto-lang
  `crates/auto-lang/src/ui/autodown_editor/core.rs`，~6000 行）无任何
  slash/menu/overlay 现存代码（全文件 `'/'` 零命中）——全新增，无迁移负担。
- `EditorKey` 已含 Up/Down/Enter/Escape（code_editor/core/mod.rs:73-90），
  键位路由零枚举扩展。
- 块模型全谱系在 autodown-core `block_model.rs` `BlockType`
  （Heading/Paragraph/Fence/Blockquote/ListBlock/ListItem/Table*/ThematicBreak/
  Callout/Details/…），插入目标类型无需扩模型。
- VM core 已有同族变换先例：048 T5 行首输入规则（`# `→Heading 迁移、
  `- `→列表 wrap、`> `→引用 wrap；落点 `try_line_start_rule`，core.rs:3524）
  ——菜单命令复用同款操作子。
- 实机驱动面齐备：vm-smoke `key_press`（`c:/`、`enter`、`backspace` 逐键，
  group9 在案）+ `click 'x,y'` + `autoui_snapshot`。
- feature 门不变：编辑器件在 `autodown × code-editor` 下（widget.rs 头注），
  本计划不新增 feature。

**约束**：①web 轨引擎（packages/engine/src|auto）零 diff，作为回归门而
非实现参照移植——VM 侧语义对齐、实现形态原生；②core 编辑状态（光标/
undo/块 walk）在弹层开关与命令执行前后保持一致（弹层不建独立 undo 段，
命令本身一步 undo）；③menu 浮层坐标 widget 本地系（与 DocDrawList 同系），
命中测试先于文档命中臂执行；④只读实例（view instance）与流式只读门
（066）下弹层不触发（复用 `handle_input` 现有早退）。

## 3. 技术栈

- auto-lang Rust（`crates/auto-lang/src/ui/autodown_editor/{core,widget}.rs`
  + `snapshot_builder.rs`；`cargo test` 单测）；
- auto-lang 仓改动直接落其主检出 master（该仓为活动仓、并行会话惯例，
  PLAN-051/052 转介先例）；auto-down 仓改动走本计划 worktree
  （`.wt/auto-down-069`）；
- auto.exe 工具链重建（R-067-1 处置先例：重建即重跑双模 smoke 作消费方
  核验）；
- auto-down：demo vm-smoke.mjs（AutoUI MCP over Streamable HTTP）、
  demo playwright（web 回归门）、PARITY.md / README / DEBTS 落账。

## 4. 需求分析与背景调查

**授权记录**：用户 2026-09-15 在 VM slash 缺口核验后授权——"走
/auto-plan:new 新建一个跨仓计划，计划放在本仓库跟踪即可"。授权范围 =
auto-lang 仓 `crates/auto-lang/src/ui/autodown_editor/**` +
`snapshot_builder.rs`（及配套单测）、auto-down 仓
`autodown/demo/auto/**`（vm-smoke.mjs / PARITY.md / README.md）、
`DEBTS.md`；计划文档落 auto-down 仓 docs/plans/。预算未限定；自动续行
默认。web 轨引擎代码、jade-garden、auto-os、后端均不在授权内。

**证据清单**：

| 证据 | 出处 |
| --- | --- |
| web 触发语义（'/' 块首/空白后） | `packages/engine/src/editor/engine/tiptap-adapter.ts:612-636`（slashQueryAt + CustomEvent 派发） |
| web 候选清单 30 项 | `packages/engine/src/editor/slash-manifest.ts:34-268`（getSlashItems） |
| web 弹层交互（过滤/↑↓/Enter/Esc/两段定位） | `packages/engine/auto/editor/slash_menu.at:36-273`（SlashMenu widget DSL） |
| web e2e 基线 | `demo/e2e/slash-position.spec.ts`（caret band 定位断言） |
| VM 侧缺口实证 | auto-lang `core.rs`/`widget.rs` 全文无 slash/menu/popup/overlay/'\/' 命中（2026-09-15 grep 实勘）；`DocInput` 枚举（core.rs:346-372）五类输入无弹层通道 |
| 键位枚举现成 | auto-lang `crates/auto-lang/src/ui/code_editor/core/mod.rs:73-90`（EditorKey 含 Up/Down/Enter/Escape） |
| 输入规则变换先例 | auto-lang core.rs:3524 `try_line_start_rule` + 测试 :4256-4345（# →Heading 迁移、- →wrap、> →wrap、fence 内 noop、整块匹配门槛） |
| 块类型全谱系 | `packages/engine/rust/src/block_model.rs:327-341`（BlockType 17 值；ordered/level/checked 字段在 WNode） |
| 有序列表输入规则未接线口径（vue 亦无） | core.rs:4334 `input_rule_ordered_marker_not_wired`（冻结面测试） |
| 快照臂与 internal_text 先例 | auto-lang `snapshot_builder.rs:252-264`（AutodownEditor 臂读 core 注册表） |
| 实机逐键动词 | `demo/auto/vm-smoke.mjs:880-948`（group9：click 聚焦 + key_press 'c:h'/'backspace'/'enter' 逐键 + 通道等价断言） |
| PARITY 在册 | `demo/auto/PARITY.md` #12（编辑面能力差=长期线）+#9（web-only 降级豁免）+#20（行内规则 VM 未实现） |
| 工具链重建处置先例 | `docs/plans/archived/067-…md` merge 记录（R-067-1） |
| 跨仓执行先例 | `docs/plans/attachments/063-auto-lang-transfer.md`（转介单）；PLAN-051/052 转介收口 |

## 5. 详细设计

### 5.1 core 弹层状态机（G1）

`AutodownEditorCore` 新增（.Mutex 门控同现有域风格）：

```text
slash: Mutex<Option<SlashState>>
struct SlashState { query: String, selected: usize, anchor: (block, byte) }
```

- **触发**：`handle_key` 的 `Char('/')` 臂前置判定——焦点块非 Fence、
  光标位于块首或前一字符为空白（web `slashQueryAt` 同语义）。命中则置
  `SlashState { query: "", … }` 并消费该键（`/` 字符不落入文档，对齐 web
  deleteRange 语义——触发字符本身被命令 range 消化）。
- **query 跟随**：弹层开启期间可打印字符追加 query、Backspace 删尾；
  query 变化即重过滤（空 query 全 match，web 同）。
- **键位路由**（弹层开启时优先于编辑路由）：Up/Down 循环移动 selected；
  Enter 执行选中命令并关层；Escape 关层；两者 `DocOutput.captured`。
  非 ↑↓/Enter/Esc/可打印/Backspace 的键（如鼠标以外的导航键）关层放行
  ——对齐 web OnKeydown 仅拦截四键、其余落文档的形态。
- **关闭**：焦点丢失/块切换/命令执行/Esc/query 删空后继续 Backspace
  （web 无此臂，VM 取「删穿即关、`/` 留档」——登记差异）。
- **门控**：只读实例与流式只读早退沿用 `handle_input` 既有臂，弹层
  状态不建立。

### 5.2 渲染浮层与命中（G2）

- **绘制**：`render_frame` 产出的 `DocDrawList` 增 `menu: Option<MenuDraw>`
  段（背景 quad、边框、项高亮 quad、icon 位留白 + title/description
  text run）。锚点 = 当前光标矩形（caret rect 已在 list.caret）下方
  8px、左对齐；视口下缘溢出翻转到光标上方（单段翻转即可，web 两段式
  定位系 DOM 测量产物，VM 侧 DocDrawList 自测量不需要两段——登记差异）。
  绘制次序在选区/文本之后（浮层最上）。
- **命中**：`handle_mouse_press` 开臂——menu 几何（MenuDraw 各项 rect）
  缓存于 core（布局期写回，table_geometry_snapshot 先例），press 落项
  rect 即执行该项命令；落层外即关层且**不**向文档传递该 press（web 点击
  外部关闭同语义）。
- **主题**：底/边/高亮色取 `fence_palette()` 同源两档（dark_mode 翻转
  已有挂钩），不引入新主题面。

### 5.3 插入命令族与 v1 manifest（G2）

命令实现循 `try_line_start_rule` 同款操作子（kind 迁移 `overwrite_block_text`
+ walk 重建、容器 wrap），执行后光标落插入块正文起点，undo 一步入栈
（048 T6 栈），emit_document 即终态。v1 冻结清单（对 web 30 项的子集
裁定）：

| # | 项 | web 命令 | VM v1 落点 | 层 |
| --- | --- | --- | --- | --- |
| 1 | Text | setParagraph | kind 迁移→Paragraph | A |
| 2-4 | Heading 1-3 | setHeading(1-3) | kind 迁移→Heading(n)（输入规则同款） | A |
| 5 | Bullet List | toggleBulletList | `- ` wrap（输入规则同款） | A |
| 6 | Quote | toggleBlockquote | `> ` wrap（输入规则同款） | A |
| 7-9 | Heading 4-6 | setHeading(4-6) | 同 Heading 族参数化（解析面 H1-6 在档） | B |
| 10 | Numbered List | toggleOrderedList | ordered wrap（模型 ordered 字段在；输入规则面 vue 亦未接线，仅菜单路径提供） | B |
| 11 | Code Block | setCodeBlock | kind 迁移→Fence + ``` 骨架 | B |
| 12-18 | TODO/DOING/DONE/NOW/LATER/Priority A/B/C | insertContent 文本 | 光标处文本插入（ImeCommit 同通道），带 `- `/`[#N] ` 前缀 | B |
| 19 | Divider | setHorizontalRule | ThematicBreak 块插入（`---`） | C |
| 20 | Table | insertTable 3×3 | 表骨架插入（3×3 含 header 行） | C |
| 21 | Callout | setCallout note | callout 骨架插入 | C |
| 22 | Details | setDetails | details 骨架插入 | C |
| — | Image / Query / Mermaid / Math / Block link | — | **不提供，登记**：Image 需 URL prompt（VM 无对应）；Query/Mermaid/Math 属 web-only 降级豁免（PARITY #9）；Block link 依赖 block anchor 登记面（VM 未建） | — |

v1 = A+B+C 全 22 项一次落地（A/B 同族薄，C 四项是真正新操作子）。
manifest 为 core 内静态表（title/description/searchTerms/op 变体），
无运行时扩展面。

### 5.4 MCP 快照暴露（G3）

`snapshot_builder.rs` AutodownEditor 臂（:252）增 props（循
`internal_text` 读 core 注册表先例）：`slash_visible`、`slash_query`、
`slash_selected`、`slash_count`（过滤后项数）。view builder/ aura schema
不动——弹层是件内状态非 view 树节点。

### 5.5 demo vm-smoke 新臂（G3）

新增 slash 组（编号续现有 group 尾）：

1. `click` 聚焦编辑器 → `key_press 'c:/'` → snapshot 断言
   `slash_visible=true` 且 `slash_count=22`（空 query 全量）；
2. `key_press 'c:h'`（query="h"）→ `slash_count` 收缩断言；
3. `click` 命中首候选项 rect（坐标经快照 slash props + 布局换算，或
   探针期冻结常数）→ 断言 `emit` 结果（state.content 全文该块已迁移
   Heading）+ `slash_visible=false`；
4. `key_press 'enter'`、`'escape'` 语义臂（导航选中插入 / 关闭不落键）；
5. 既有全臂零回归（open-ws/files/read/save/links/cards/d4/search/tabs/
   key 链等）；fixture 恢复 hash 前后一致。

web 回归门：demo playwright 既有 suite 绿（重点 `slash-position.spec.ts`，
零改动应绿）。

### 5.6 回退裁定（决策点）

若实机出现**弹层期间每帧重建抖动**（DocDrawList menu 段 × 全文重排版
交互风险；反证：preedit 浮层同环先例 + table 列宽拖拽实时重排先例）：
首选收窄 = menu 段缓存化（仅 selected/query 变化重算 menu 段）；仍不济
= 降级为「光标下方静态条 + 键盘全导航、无鼠标命中」并登记。决策工件
落 §9，不缩 G1-G4 语义。

### 规范增量

| delta_id | add/modify/retire | 目标（canonical） | before/after 规则 | rationale | acceptance IDs |
| --- | --- | --- | --- | --- | --- |
| SD-01 | modify | `autodown/demo/auto/PARITY.md` #12 行（VM 轨现状列 + 归宿列） | before：VM=cosmic-text 块编辑壳（斜杠菜单归 web 独有 WYSIWYG 族）；after：斜杠菜单分项标注 VM 收口（v1 manifest 22 项 + 不提供 5 项登记 + 差异注记：触发字符不落档、单段定位），bubble/节点视图仍留长期线 | 首个 #12 分项收口，防清册漂移 | AC-07 |
| SD-02 | add | `autodown/demo/auto/README.md` 新「VM 轨 slash 菜单契约」节 | add：触发语义（块首/空白后、fence 内 noop、只读/流式门控不触发）、键位路由表（↑↓/Enter/Esc/其余放行）、v1 manifest 冻结表（§5.3 全表转抄）、快照 props 名（slash_visible/query/selected/count）、smoke 臂指针 | VM 轨行为契约首次成文（对齐 §9.4 口径风格） | AC-01..05 |
| SD-03 | add | `DEBTS.md` 新行（069） | add：web 30 项与 VM v1 22 项的 5 项差额（Image/Query/Mermaid/Math/Block link）+ 触发字符不落档/单段定位两差异，归宿=各自前置面建成时再议 | 差额显式在册，双轨不静默漂移 | AC-07 |

auto-lang 仓侧文档（模块头注/测试名即契约，无独立 spec 文件）随代码
落账，不入本表。

## 6. 测试设计

- **core 单测（auto-lang）**：`cargo test -p auto-lang --features "autodown,code-editor" slash`
  ——触发四态（块首/空白后/词中/fence 内）、只读+流式门零触发、query
  过滤与删空关层、↑↓ 循环/Enter 插入/Esc 关闭、每 manifest 项 emit
  roundtrip 断言（对照 §5.3 期望 markdown）、一步 undo 回原状、点选命中
  /层外点击关闭、快照 props 读数。触发字符不落档断言（`/` 不在
  emit_document）。
- **实机双模（auto-down）**：`cd autodown/demo/auto && node vm-smoke.mjs`
  （split）与 `VM_MERGED=1 node vm-smoke.mjs`（merged）——新 slash 组
  全臂 PASS + 既有臂零回归 + fixture hash 一致。
- **web 回归门**：demo playwright 既有 suite（含 slash-position.spec.ts）
  全绿，引擎包零 diff（`git diff -- autodown/packages/engine/src` 为空）。
- **人工/探针核验**：浅/深两档菜单配色、IME 中文输入下弹层不误触
  （preedit 期不触发）、demo 与 jade 各开一轮目检。
- **失败语义**：任一臂红 → 修复后全臂重跑（不接受单臂绿收口）；工具链
  重建 → 双模重跑作消费方核验（R-067-1 处置）。

## 7. 验收标准

| ID | 可观察行为 | 验证方法与预期 |
| --- | --- | --- |
| AC-01 | 块首/空白后键入 `/` 弹出候选；fence 内、词中、只读、流式期不触发；触发字符不落入文档 | core 单测四态 + 实机臂 1 |
| AC-02 | query 子串过滤（空 query 全量 22 项）；↑↓ 循环、Enter 选中插入、Esc 关闭；删空续 Backspace 关层且 `/` 留档 | core 单测 + 实机臂 2/4 |
| AC-03 | 候选项可点击插入；点击层外关闭且该 press 不作用于文档 | core 单测 + 实机臂 3 |
| AC-04 | 冻结 manifest 22 项逐项：命令后 emit_document 为同构 markdown（对照 §5.3），一步 undo 回原状，光标落插入块正文起点 | core 单测逐项 |
| AC-05 | MCP 快照 AutodownEditor 节点含 slash_visible/query/selected/count 且读数与 core 状态一致 | 实机臂 snapshot 断言 |
| AC-06 | 实机双模（split+merged）新臂 PASS 且既有臂零回归；web 轨 playwright suite 绿、引擎 src 零 diff | 两 smoke 命令退出码 0；playwright 全绿；git diff 审查 |
| AC-07 | PARITY #12 行更新、README 契约节、DEBTS 差额行三处落账且与代码交叉一致 | 文档审查 + 与单测/臂断言交叉对读 |

## 8. 执行步骤

| ID | 任务 | 文件/落点 | 依赖 | 验证命令与预期 | linked AC |
| --- | --- | --- | --- | --- | --- |
| T-01 | core 弹层状态机：触发判定/query 跟随/键位路由/门控 + 触发字符不落档 | auto-lang `crates/auto-lang/src/ui/autodown_editor/core.rs` | — | `cargo test -p auto-lang --features "autodown,code-editor" slash_` 绿（AC-01/02 单测） | AC-01, AC-02 |
| T-02 | 渲染浮层：DocDrawList menu 段 + 光标锚定/翻转 + 两档配色；命中测试点选/层外关闭 | 同上 core.rs + widget.rs | T-01 | 单测（menu 几何/命中臂）绿 | AC-02, AC-03 |
| T-03 | 插入命令族 A+B 层（Text/Heading1-6/Bullet/Numbered/CodeBlock/7 文本插入项）+ manifest 静态表 + 一步 undo | 同上 core.rs | T-01 | 单测逐项 emit roundtrip + undo 绿 | AC-04 |
| T-04 | 插入命令族 C 层（Divider/Table/Callout/Details 骨架插入操作子） | 同上 core.rs | T-03 | 单测逐项 emit roundtrip 绿 | AC-04 |
| T-05 | 快照暴露（snapshot_builder 四 props）+ demo vm-smoke slash 组五臂 + 工具链重建双模收口 + web playwright 回归 | auto-lang `snapshot_builder.rs`；auto-down `demo/auto/vm-smoke.mjs` | T-02, T-03, T-04 | 双模 smoke 退出码 0；playwright 绿；引擎 src 零 diff | AC-05, AC-06 |
| T-06 | 落账：PARITY #12 行 + README 契约节 + DEBTS 行；交叉一致性审查 | auto-down `demo/auto/PARITY.md` / `README.md` / `DEBTS.md` | T-05 | 文档与代码交叉对读一致（AC-07 审查） | AC-07 |

（T-01→T-02 串行同文件；T-03/T-04 串行同文件；T-05 跨仓汇聚；总 6 步
与 frontmatter `total_steps` 对齐。）

## 9. 复审记录

- 2026-09-15 drafting（起草交接，plan_revision 1）：stage: new，
  PLAN-069 rev1。背景调查齐（web 三层实现/VM 缺口实证/EditorKey/输入
  规则变换族/BlockType 全谱/快照臂/逐键动词/门控面八路证据，见 §4）；
  任务覆盖全部 AC 与 SD；路径与命令均对两仓现行 master 实地核实。
  outcome: pass——授权范围内可执行，无阻塞决策（§5.1 关层差异臂、§5.3
  manifest 裁定、§5.6 回退均为执行期有界决策点，owner=work 执行会话）。
  next: work。

## 10. 待澄清事项

| # | 事项 | 处置 |
| --- | --- | --- |
| Q1 | H4-6 迁移与 Numbered wrap 在 emit 侧的 roundtrip 形态（解析面在档但命令路径新） | T-03 单测逐项钉死；roundtrip 不成形则该项降级登记 DEBTS（不缩 AC-04 逐项断言语义——清单项从冻结表除名需记 §9 决策工件） |
| Q2 | 跨仓提交形态：auto-lang 侧改动是否随 auto-down worktree 合并节奏走（该仓并行会话惯例） | 执行会话开工前与用户对一次：auto-lang 直落 master（051/052 先例）或独立分支；转介单可选 |
| Q3 | 弹层期间 `content:` 每帧回写环（068 同环）与 query 重过滤的抖动叠加 | §5.6 回退裁定在案；demo 同环实证绿为强反证 |
| Q4 | jade 桌面下游核验时机（工具链重建后其编辑器自动获得弹层） | 非本计划任务；随 jade 下次计划或 PLAN-068 T-03 人工核验顺带目检 |
