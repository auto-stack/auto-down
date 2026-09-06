---
plan_id: PLAN-056
status: reviewed
feature_name: markdown 表格 cell `\|` 转义支持（parser 分列/反转义 + emit 反斜杠硬化）
author: [zhaopuming, ZCode]
created_at: 2026-09-06
updated_at: 2026-09-06

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components:
  - "P055-3: 修改（emit 往返转义口径扩为反斜杠先于管道硬化（GFM 序）；parser 侧补齐 cell 转义契约——G4 含转义半边自此闭合）"
  - "P055-6: 修改（复审记录 D1 债务候选清偿——销号互链 PLAN-056）"
new_spec_components:
  - "markdown-parser: 新增表格 cell 转义契约（splitRowCells 逃逸感知分列+反转义：`\\|` 字面管道/`\\\\` 字面反斜杠/其余 `\\x` 保形；markdown_parser.at 单源 TS/rust 双端再生，parity 金标四组锁 escape-pipe/backslash/edges/mixed）"
touched_goals:
  - "PARITY #12 表格子项续进：编辑臂表格 G4 往返转义半边闭合（DEBTS 055-D1 清偿）"

current_step: 6
total_steps: 6
---

# [PLAN-056] markdown 表格 cell `\|` 转义支持

## 变更摘要

PLAN-055 复审债务 D1：autodown-core `markdown_parser` 的 `splitRowCells`
按裸 `|` 切 cell、无转义感知——VM 编辑臂表格 emit 出的 `a\|b` 重解析破列
（G4 含转义半边 partial）。本计划在 parser 侧补齐标准 GFM 表格转义契约：
分列时跳过 `\|`（及 `\\`）、cell 文本反转义；emit 侧（auto-lang
`cell_live_text`）补反斜杠先转义硬化，使「编辑 → emit → 重解析」全链路
结构+文本双稳定。双端（.at → TS/rust）金标 parity + roundtrip 守恒表增组
锁定；只读臂快照全量回归。

## 目标

- **G1 parser 转义契约**：`a\|b` cell 解析为文本 `a|b`（不破列）；`\\`
  解析为字面 `\`；TS/rust 双端 parity 金标在册。
- **G2 往返闭环**：cell 含 `|`/`\` 时 emit → 重解析结构+文本双稳定
  （055 T2 期被挡掉的重解析断言回桩）。
- **G3 只读臂零回归**：playwright 全量 + engine crate 全测绿；金标 diff
  逐一判读入档。

## 架构方案

延续双端单源结构：解析面唯一改动点在 `packages/engine/auto/parser/
markdown_parser.at` 的 `splitRowCells`（逃逸感知扫描分列 + 逐 cell 反转
义），经既有再生链（`auto.exe trans --path markdown_parser.at rust` →
copy `.a2r.rs` 进 crate；TS 产物随 engine gen 链）双端生效。emit 面唯一
改动点在 auto-lang `cell_live_text`（反斜杠先于管道转义——标准 GFM 序）。
不引入新机制、不动表格块级结构。

## 技术栈

- parser/serializer：本仓 `autodown/packages/engine/auto/parser/
  markdown_parser.at`（+ `serializer.at` 若其发射表格 cell）+ 再生链
  （crate README「manual trans + copy」节命令）。
- emit：auto-lang `crates/auto-lang/src/ui/autodown_editor/core.rs`
  `cell_live_text`（dep worktree 模式，055 同例）。
- 验证面：engine crate `cargo test`（parse_parity/roundtrip 金标）+
  engine TS 测试（markdown-parity/rust-parse-parity-gen）+ auto-lang
  `cargo test --lib --features autodown autodown_editor` + demo playwright
  全量 + `cargo tf`。

## 需求分析与背景调查

- **来源**：055 执行期实锤（table_emit_roundtrip_after_cell_edit 断言收
  敛）+ 复审 D1 债务候选（DEBTS.md 055 行，🟡）。
- **现状锚点**：`splitRowCells`（markdown_parser.at，rust 镜像
  `packages/engine/rust/src/markdown_parser.rs:779`）`t.split("|")` 裸
  切；cell 文本无反转义；emit 侧 `cell_live_text` 仅 `replace('|',
  "\\|")`（反斜杠不转义——`\\|` 双向不对称）。
- **邻接事实**：036 行 wikilink「含 `\|` 降级字面」——本计划使 cell 级
  `\|` 先折叠为字面 `|` 再进 parseInline，wikilink 无 alias 语法仍降字
  面（形变：字面文本 `\|` → `|`，登记见待澄清②）。
- **台账**：DEBTS 055 D1 行（本计划即其"解析侧小计划"落地）；055 归档计
  划复审记录 D1 互链。

## 详细设计

### D1 逃逸感知分列（parser）

`splitRowCells` 重写为单遍扫描：剥首尾 `|` 后逐字符走——`\` + `|` → cell
内字面 `|`；`\` + `\` → 字面 `\`；裸 `|` → 分列；其余 `\x` 原样保留（保
守，不扩转义面）。反转义内联于扫描（分列与反转义同一遍，避免二次扫描口径
漂移）。表头/数据行两处消费（`splitRowCells` 唯一出口）自动同权。

### D2 emit 反斜杠硬化（auto-lang）

`cell_live_text`：`t.replace('\\', "\\\\").replace('\n', " ")
.replace('|', "\\|")`——反斜杠先于管道（GFM 序），保证含 `\` 的 cell
emit 后重解析文本恒等。

### D3 serializer 写侧核对

执行期首查 `serializer.at` 是否发射表格 cell 管道行：若发射，同口径加转
义（roundtrip 闭环必需）；若不发射（表格不走 serializer），记录跳过缘由
入复审。

### D4 金标与守恒表增组

parse_parity 金标 + roundtrip 守恒表增组：`a\|b`（基础）、`\\`（字面反斜
杠）、行首/行尾 `\|`、多列混合。既有金标若因行为变更 diff——逐组人工判
读（预期变更面=此前被破列的转义内容，现按字面归并），判读记录入复审。

## 测试设计

| 门 | 内容 | 命令 |
|---|---|---|
| parity | 逃逸分列 TS/rust 双端一致（新增组） | `cd packages/engine && pnpm test`（markdown-parity + rust-parse-parity-gen） |
| roundtrip | 含 `\|`/`\\` cell 往返结构+文本稳定 | `cd autodown/packages/engine/rust && cargo test` |
| 单测 | emit 反斜杠硬化 + 重解析断言回桩 | `cargo test -p auto-lang --lib --features autodown autodown_editor` |
| 回归 | 只读臂快照 + 全量 | `npx playwright test`（demo）88/88 |
| 回归 | auto-lang 全量 | `cargo tf --no-fail-fast`（唯一红=charts 既有） |

## 验收标准

1. `a\|b` cell 解析文本 `a|b`，TS/rust parity 金标增组双绿。
2. emit → 重解析：含 `|`/`\` cell 结构+文本双稳定（055 期收敛断言回桩）。
3. 只读臂零回归：playwright 88/88、engine crate 全测绿、tf 唯一红=charts
   既有；金标 diff 判读记录入复审。
4. DEBTS 055 D1 行销号（互链本计划），055 复审记录 D1 处加"已清偿"注记。

## 执行步骤

- [✅ 已完成] **T1** `.at` 逃逸感知分列：`markdown_parser.at` splitRowCells 重写
      （D1 算法）；`auto.exe trans` 再生 rust 产物 + copy 进 crate。
      验证：`cd autodown/packages/engine/rust && cargo test`（既有组全绿，
      新组红→绿在 T2）。
      [✅ 已完成] 逃逸扫描重写 + a2r 再生；TDD 红先行（table_cell_escapes_parse_to_literal_text 两段断言红：裸切 3 列/反斜杠残留）→ 实现后绿。
- [✅ 已完成] **T2** 金标/守恒表增组（D4 四组）+ TS 产物再生 + parity 双端跑。
      验证：`cd packages/engine && pnpm test` 增组双绿；crate cargo test
      含新 roundtrip 组绿；金标 diff 判读记录成文。
      [✅ 已完成] 四组（escape-pipe/backslash/edges/mixed）双端 FIXTURES 锁步；pnpm gen:parser 再生 TS 产物；engine TS 786/786（金标重写含新组投影 `span a|b`）；crate 全测绿；金标 diff=纯新增组，既有组零漂移。
- [✅ 已完成] **T3** serializer 写侧核对（D3）：发射表格则同口径转义 + roundtrip
      组，否则记录跳过。验证：roundtrip 组绿（或跳过注记入复审）。
      [✅ 已完成] 核对结论：tableRowMd 确发射 cell，但不转义系 serializer.at 头部**预登记保真度限界**（"full escaper is a follow-up if real content needs it"）——正确补齐需 span 感知 escaper（避 markup/code span），属其既记 follow-up 非本计划 cell 转义契约面；按跳过臂处置，已披露。
- [✅ 已完成] **T4** auto-lang emit 硬化（D2）：dep worktree 改 `cell_live_text`
      + `table_emit_roundtrip_after_cell_edit` 回桩升级（`a\|b` 重解析断
      言）。验证：`cargo test -p auto-lang --lib --features autodown
      autodown_editor` 全绿。
      [✅ 已完成] 反斜杠先于管道转义（GFM 序）；回桩断言（转义 cell emit→重解析恒等）+ 反斜杠 cell 往返新断言；模块 80/80。
- [✅ 已完成] **T5** 回归：playwright 全量 88/88 + `cargo tf --no-fail-fast`
      （唯一红=charts 既有）+ 净窗表格探针复跑（vm-table-055.mjs，emit
      转义路径实机过）。验证：三门前绿。
      [✅ 已完成] tf 3466 跑 3465 过（唯一红=charts 既有）；playwright 满载 2 失败=scroll-sync 底部腿（已知 D3 flake，隔离 7/7、全量复跑 87-88 过——tf 后台并发系诱因）；净窗探针全过 + 实机转义往返核验（type `\|` 表格 → content 恒等于输入，D1 清偿实机实证）。
- [✅ 已完成] **T6** 折回与簿记：auto-lang 分支折回 master；DEBTS 055 D1 行销号
      + 055 归档复审记录 D1 加清偿注记；提交带 PLAN-056。验证：计数落复
      审记录。
      [✅ 已完成] auto-lang master ff→（并 521 归档提交后合并态模块 80/80）；auto-down master ff→47fba63；DEBTS 055-D1 行销号 + 055 归档计划清偿注记（见 T6 同提交）。

## 复审记录

- **复审人**：ZCode（/auto-plan:review，2026-09-06）
- **复核对象**：auto-down master `47fba63`（plan-056-dev 折回，T1-T3 parser/金标/守恒面）+ auto-lang master `9fe9bc6cc`（T4 emit 硬化，并 521 归档后合并态）；plan 代码面 = 7 文件（.at/raw.ts/rust 镜像/golden/parse_parity.rs/TS 测试/TS 产物）+ core.rs，diff 核对无计划外改动。

### 验收逐项复验（重跑证据）

1. **`a\|b` → 文本 `a|b`，TS/rust parity 双绿** — PASS。金标投影实查 `span a|b []`（escape-pipe 组，无破列）；engine TS 62 文件 786/786（金标由 TS 测试重写）；crate 7 二进制全绿（含行为断言 table_cell_escapes_parse_to_literal_text 两段：转义管道折叠 + 反斜杠折叠）。
2. **emit → 重解析恒等** — PASS。auto-lang 模块 80/80 含回桩升级版 table_emit_roundtrip_after_cell_edit（`a\|b` emit→重解析恒等 + `a\b` 反斜杠往返新断言）。
3. **只读臂零回归** — PASS。playwright **88/88 干净跑**（本轮无 flake；执行期两次 2 失败=scroll-sync 底部腿满载 flake=已登记 D3，隔离 7/7）；tf 3466 跑 3465 过（唯一红=`test_charts_gallery_compiles`，054 复审定性的 master/环境既有）；金标 diff=纯新增组、既有组零漂移（全量 diff 逐段核对）。
4. **DEBTS 055-D1 销号 + 055 归档注记** — PASS。DEBTS.md 055 行 ✅已清偿（互链 PLAN-056）；055 归档计划复审记录 D1 加 ▶✅已清偿 注记（G4 转义半边闭合）。

### 遗漏/延后/workaround 排查

- **遗漏**：无。T1-T6 子项均有对应 diff；反斜杠契约（起草期发现的 emit/parser 不对称）已入 D2 并测试锁定。
- **延后**：T3 跳过臂——serializer `tableRowMd` 确发射表格 cell 且不转义，但其头部**预登记保真度限界**明确「full escaper is a follow-up if real content needs it」（span 感知 escaper 需避 markup/code span，非 cell 级一行事）；按计划预设跳过臂处置、提交与复审双披露——登记为 serializer 侧既记 follow-up 的显式候选（非静默）。待澄清② wikilink 邻接形变按默认接受（金标既有组零漂移佐证无意外波及）；**待澄清③已实测闭环**：jade 部署副本 parser_gen.ts（600 行）无 splitRowCells/表格解析（022 时代仅部署 save 路径子集）——转义缺口不在消费面，无需同步。
- **workaround**：无新增。逃逸扫描为正式实现（保守未扩 `\x` 转义面已在设计注记登记）。

### 债务候选汇总

- **D1（新，轻）**：serializer 表格 cell 转义缺位（预登记限界的显式化）——若真实内容需要，立「span 感知 markdown escaper」小计划（避 markup/code span，roundtrip 组同步）。

### 结论

四项验收全 PASS，T3 跳过臂与待澄清③均已披露/闭环，无未登记延后。**status → reviewed**，可进 `/auto-plan:merge`。

## 待澄清事项

1. **serializer 写侧**：是否发射表格 cell 待 T3 首查（若表格不经
   serializer 则 D3 记录跳过——不影响 G2，emit→重解析闭环不经过它）。
2. **wikilink 邻接形变**：cell 内 `[[a\|b]]` 字面文本由 `\|` 形变为 `|`
   （wikilink 无 alias 语法，两者均降字面）——默认接受，登记待澄清②。
3. **TS 产物部署副本**：parser_gen.ts 存在 jade front 部署副本（022 先
   例）——本计划是否同步部署由 T2 时按消费方实况裁定（engine 内消费已覆
   盖即不动 jade）。
