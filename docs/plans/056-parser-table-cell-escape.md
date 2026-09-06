---
plan_id: PLAN-056
status: drafting
feature_name: markdown 表格 cell `\|` 转义支持（parser 分列/反转义 + emit 反斜杠硬化）
author: [zhaopuming, ZCode]
created_at: 2026-09-06
updated_at: 2026-09-06

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 0
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

- [ ] **T1** `.at` 逃逸感知分列：`markdown_parser.at` splitRowCells 重写
      （D1 算法）；`auto.exe trans` 再生 rust 产物 + copy 进 crate。
      验证：`cd autodown/packages/engine/rust && cargo test`（既有组全绿，
      新组红→绿在 T2）。
- [ ] **T2** 金标/守恒表增组（D4 四组）+ TS 产物再生 + parity 双端跑。
      验证：`cd packages/engine && pnpm test` 增组双绿；crate cargo test
      含新 roundtrip 组绿；金标 diff 判读记录成文。
- [ ] **T3** serializer 写侧核对（D3）：发射表格则同口径转义 + roundtrip
      组，否则记录跳过。验证：roundtrip 组绿（或跳过注记入复审）。
- [ ] **T4** auto-lang emit 硬化（D2）：dep worktree 改 `cell_live_text`
      + `table_emit_roundtrip_after_cell_edit` 回桩升级（`a\|b` 重解析断
      言）。验证：`cargo test -p auto-lang --lib --features autodown
      autodown_editor` 全绿。
- [ ] **T5** 回归：playwright 全量 88/88 + `cargo tf --no-fail-fast`
      （唯一红=charts 既有）+ 净窗表格探针复跑（vm-table-055.mjs，emit
      转义路径实机过）。验证：三门前绿。
- [ ] **T6** 折回与簿记：auto-lang 分支折回 master；DEBTS 055 D1 行销号
      + 055 归档复审记录 D1 加清偿注记；提交带 PLAN-056。验证：计数落复
      审记录。

## 复审记录

（待 /auto-plan:review 填写）

## 待澄清事项

1. **serializer 写侧**：是否发射表格 cell 待 T3 首查（若表格不经
   serializer 则 D3 记录跳过——不影响 G2，emit→重解析闭环不经过它）。
2. **wikilink 邻接形变**：cell 内 `[[a\|b]]` 字面文本由 `\|` 形变为 `|`
   （wikilink 无 alias 语法，两者均降字面）——默认接受，登记待澄清②。
3. **TS 产物部署副本**：parser_gen.ts 存在 jade front 部署副本（022 先
   例）——本计划是否同步部署由 T2 时按消费方实况裁定（engine 内消费已覆
   盖即不动 jade）。
