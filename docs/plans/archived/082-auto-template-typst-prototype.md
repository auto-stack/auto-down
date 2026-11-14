---
plan_id: PLAN-082
status: archived
completion_kind: delivered
feature_name: auto-template-typst-prototype
author: [codex]
created_at: 2026-11-14
updated_at: 2026-11-14
plan_revision: 1
current_step: 8
total_steps: 8
depends_on: []
supersedes_spec_components: []
new_spec_components: [docs/specs/publishing.md]
touched_goals: []
affects: [auto-down]
---

# [PLAN-082] 普通 Auto 模板到 Typst 的首个可运行原型

> 依据：[Design 10](../../designs/10-autodown-publishing.md) §3–5、§9、§12、§14 的 P0/P1。授权范围：用户要求据设计建立实施计划；本文件尚未执行，不表示已生成排版产物。

## 0. 变更摘要

用现有 Auto 工具实际执行普通 fn/type/控制流，处理同一份 AutoDown 正文，构造可观察的内容/出版数据，再由薄适配器调用 Typst，输出论文和办公书籍两种 PDF。先获得真实效果和修改周转数据，再决定后续 API。

本计划完成的是原型闭环，不是完整 Typst 表达力、完整 Auto Node 正文语法或整条 v0.6 路线。

## 1. 目标与边界

- 普通 Auto 模板必须真实参与执行，至少验证函数、类型、条件、循环与参数覆盖；不得只把 .at 当字符串展示或由 JS/Rust 完成所有模板逻辑。
- 正文从一份可被当前 parser 解析的 .ad 文件加载；模板之间复用同一内容/ID，不各自维护一份拼写不同的正文。
- 内容与 str 分开；原型使用现有普通类型/记录/列表及库辅助函数构造 Content 等价数据，具体形态由 T-00 实测决定。
- 得到可检查的版本化出版 IR、生成的 .typ、中间来源映射、两个 PDF 与运行说明。
- 不修改 engine 已冻结的现有出口合同，不改旧 jade-garden 应用；优先使用独立原型目录。
- 不等待 ACE 自举；不在本计划中实现通用样式语言、实时预览、任意 Auto 布局回调或可编辑 DOCX/PPTX。

## 2. 架构方案

当前 parser → 正文适配/来源数据 → 普通 Auto 模板求值 → Publication IR v0 → Typst emitter → 固定版本 Typst CLI → PDF。

建议入口为 `autodown/prototypes/publishing/`，内含 Auto 模板、样例、窄宿主/适配器、验证脚本和 README。JSON 可作首个可观察 IR；跨进程传递数据，不序列化运行时闭包。布局内的页码、目录和引用先映射为 Typst 内置延迟结构，不声称能回调任意 Auto 函数。

IR 最少包含 schema_version、文档元数据、块内容与 NodeId、Origin、页面配置、文字/段落的少量显式属性、后端所需能力。Node 的实际构造与序列化必须复用当前语言能力；缺口用最小反例交 owner，不先改核心语法。

## 3. 详细设计与环境

1. T-00 记录 Auto 运行入口、版本/提交、Typst 可用性、字体清单和平台；机器上存在 auto.exe 不证明其具备本计划全部能力。
2. 先做普通函数生成结构化内容并跨边界传递的探针。若现有 Node 求值不满足，允许使用普通 Auto 文档数据类型/辅助库；不允许退化为直接拼接整份 Typst 源码来替代内容模型。
3. 初始正文白名单以现有 parser 为准，至少覆盖标题、段落、列表和一类插图或表格。无法适配的节点明确报错或显式占位，不能静默丢弃。
4. academic 原型包含标题区与双栏正文；office_book 为单栏正文与页眉页脚。用参数修改字号、页边距或标题布局，验证模板与正文独立。
5. 文本、路径、标签分别序列化；测试井号、引号、反斜线等保持字面含义。资源只通过解析清单传入，字体替代要可见。
6. 生成来源映射至少记录 NodeId → Typst 源范围；完整页面双向定位交 085。
7. Typst 尚未安装时，确定可复现的依赖准备方式与固定版本后再运行；若实际环境仍缺依赖，保留未完成状态，不能把只生成 .typ 算作 PDF 闭环成功。

## 4. 测试与验收标准

| 编号 | 验收 | 证据 |
| --- | --- | --- |
| AC-01 | 真实 Auto 执行并构造内容 | 运行命令、工具版本、调用链与结构化输出；fn/type/if/for 正例 |
| AC-02 | 同一正文由两个模板输出 | 两个可打开的 PDF；正文关键内容/ID 一致，页面/栏结构真实不同 |
| AC-03 | 模板参数实际生效 | 修改一个参数，布局或可提取的配置/几何确实变化 |
| AC-04 | 来源与序列化正确 | 块级映射样例；特殊字符不会被执行或丢失 |
| AC-05 | 失败可解释 | Auto 语法错误、未知节点/版本、Typst 失败至少各一例，返回真实失败状态 |
| AC-06 | 现有合同未受损 | 按实际触面验证 parser/serializer 与既有消费；未触面不重复跑全仓 |
| AC-07 | 原型可重跑并可评估 | README、固定样例、字体/版本记录、冷/热阶段计时与输出观察 |

PDF 验证不能只有文件非空：检查标题/关键正文可提取或定位、页数与页面尺寸，再人工查看两种输出。原型报告明确字体、排版、API 和运行时限制，不沿用历史测试数字。

## 5. 规范与后续交接

新增 `docs/specs/publishing.md` 只记录实际交付的原型合同和边界；Design 10 保留目标设计性质。向 083 交接 IR/Style 的实际形态与问题，向 084 交接正文/引用适配，向 085 交接版本请求与来源链。

不因原型成功而冻结全部 API；后续计划可以统一迁移原型样例。

## 6. 任务清单

- [x] T-00：工具、字体、当前语言与 parser 能力探针；确定运行与隔离目录。证据：`templates/probe.at` 实测 fn/type/if/for/List/文件读写/字符串操作；auto `0.1.0+plan-890-verified-r7-t19-20-g347c29f-dirty`；Typst 本机原本缺失，由 `scripts/fetch-typst.mjs` 固定 0.15.1（GitHub release zip + sha256，下载被重置时退回 `cargo install typst-cli --version 0.15.1 --locked`，同版本实编 4m44s）；`typst fonts` 见 Noto Serif SC/Noto Sans SC；隔离树 `D:/autostack/.wt/down-082/auto-down`。
- [x] T-01：普通 Auto Content 构造/序列化样例，验证函数与控制流。证据：probe.at → probe-result.json（labels=[alpha,空,gamma（超出）], over_limit=1）；IR 由 `templates/ir.at` 的手写 JSON 序列化产出（`json.encode` 在该 auto 构建的 stdlib provider 缺 callee，实测不可用）。
- [x] T-02：复用现有 parser 加载同一 .ad，建立原始 ID/Origin 适配。证据：`host/doc-parse.mjs` 只消费 `@autodown/engine` 的 `dist/parser.js`（`parse_blocks`），块 id/kind/level/attrs 原样保留；doc-wire v1（`host/wire.mjs` ↔ `ir.at:parse_doc`）；白名单外节点（Mermaid 样例 block-2）显式 `E_NODE_UNSUPPORTED`。
- [x] T-03：实现 Publication IR v0、校验与 Typst emitter。证据：`publication-ir-v0`（`docs/specs/publishing.md` §4）+ `host/emit-typst.mjs`（路径级 `E_IR_SCHEMA`）+ `publication.map.json`（NodeId → typ 行范围）。
- [x] T-04：实现 academic/office_book 两个普通 Auto 模板与参数。证据：`templates/academic.at`（双栏/1.1 编号/boxed 摘要）、`templates/office_book.at`（单栏/首行缩进 2em/章节另起页/页眉/前言合成块）；参数 `--columns/--font-size/--margin/--header-text` 经 request.txt 由 Auto 解析。
- [x] T-05：真实生成、检查并人工观察两个 PDF，验证正反例。证据：同一 research.ad → academic 2 页（双栏）与 office_book 7 页（单栏+页眉），A4 595.28×841.89；参数变体 3 页单栏；四负例（E_AUTO_RUN/E_NODE_UNSUPPORTED/E_DOC_WIRE_VERSION/E_TYPST_COMPILE）均 exit 1；页面 PNG 已人工查看（`D:/autostack/plan-artifacts/plan-082/evidence/png/`）。
- [x] T-06：完成运行说明、计时、限制与原型反馈，沉淀实际规范。证据：`autodown/prototypes/publishing/README.md`（运行/固定版本/字体/计时/限制）+ `docs/specs/publishing.md`（原型合同与边界、与设计差额表）。
- [x] T-07：按实际变更复审、验证并记录交接；后续计划据反馈修订。证据：`scripts/verify.mjs` AC-01..AC-07 10/10 pass；engine parser/serializer 限定测试 109 passed；交接见 README §与后续计划。

复审修复（2026-11-14，提交 `00c21c7`，基于 `797f325`）：T-03..T-07 因 F-1/F-2 重开并重新闭合——
T-03 修 paper 允许集对齐 Typst（`a4/a5/iso-b5/us-letter`，`b5/letter` 校验期 `E_IR_SCHEMA`）；
T-04 修参数适用性（academic 采纳 `header_text`、office_book 显式 `margin` 四边统一、office_book 显式多栏
`E_OPTION_UNSUPPORTED`）；T-05 复跑 `scripts/verify.mjs` **12/12 pass**（新增 AC-03b 参数适用性、AC-03c 纸型矩阵）；
T-06 规范/README 同步参数适用性、paper 集与失败码；T-07 待本轮修复后的最终复审确认。

## 7. 验证记录

实施与验证：2026-11-14，隔离工作树 `D:/autostack/.wt/down-082/auto-down`（分支 `plan-082-dev`，基线 58ea33f），
实现提交 `797f325`。工具：auto `0.1.0+plan-890-verified-r7-t19-20-g347c29f-dirty`；Typst `0.15.1`（固定版本，
本机 cargo 实编同版本）；Node `v25.2.1`；`win32`。原始证据：`D:/autostack/plan-artifacts/plan-082/evidence/`
（`report.md` / `report.json`、两个 PDF、IR/typ/map、页面 PNG）。

| AC | 结果 | 证据（命令与关键数字） |
| --- | --- | --- |
| AC-01 | pass | `auto templates/probe.at` exit 0 → `probe-result.json`（labels=`[alpha,空,gamma（超出）]`, over_limit=1）；脚本含 `type ProbeInput` / `fn expand` / `for item in input.items` / `if index >= limit` |
| AC-02 | pass | 同一 `samples/research.ad`：academic PDF 2 页（正文字符行首聚簇=2 栏）、office_book PDF 7 页（1 栏，页眉只在正文页）；A4 595.28×841.89；关键内容（标题/时间基准/表格/融合流程/结论）两 PDF 均有；21 个 source NodeId 顺序一致 |
| AC-03 | pass | academic `--columns 1 --font-size 12pt --margin 3cm`：`typst query <plan082-config>` 返回实际 `{font_size:12pt, columns:1, margin.top:3cm}`；页数 2→3、字符数 2859→2446、PDF sha 变化、栏位变 1 |
| AC-04 | pass | escape.ad：12 个字面量（`#` `$` `%` `*` `_` `[ ]` `< >` `{ }`、`《排版原型》`、`café`、反斜线）在 PDF 文本中保持；IR 与 parser 输出逐块零改动；block-1 → typ 行 41..43；序列化层独立反例（85 字符含直引号/反斜线/全部标记字符）PDF 全字面（`#("…")` + `smartquote(enabled:false)`） |
| AC-05 | pass | 四例均 exit 1：Auto 语法错误 `E_AUTO_RUN`（透传 `auto_syntax_E0099`/`E0007`）、未知节点 `E_NODE_UNSUPPORTED`（`block-2 Mermaid`）、未知版本 `E_DOC_WIRE_VERSION`（`DOCWIRE 9`）、Typst 失败 `E_TYPST_COMPILE`（故障注入 `#panic` 的 stderr 透传） |
| AC-06 | pass | 工作树 tracked 改动 0、原型外 untracked 0；engine `block-parser` + `serializer-roundtrip` 限定测试 109 passed（`pnpm --filter @autodown/engine exec vitest run …`）；未改 parser/serializer 源与出口 |
| AC-07 | pass | README 含运行/固定版本/字体/限制/计时；`typst fonts` 见 Noto Serif SC/Noto Sans SC；冷启动 517 ms（parse 5 / auto 340 / typst 93），热启动 526 ms，两次 `.typ` sha 相同（可重跑） |

未覆盖项（与 §1/§3 一致，交后续计划）：行内 mark 压平（诊断 `W_INLINE_MARKS_FLATTENED`）、图片/公式/脚注/文献、
样式作用域与选择器、实时预览与字符级定位、Auto 回调下沉布局阶段、可编辑 DOCX/PPTX。历史测试数字未沿用。

2026-11-14 复审（§9）确认上述 AC 证据有效，同时发现 F-1（paper 允许集）、F-2（参数静默忽略）两项
in-contract 缺陷；T-03..T-07 已重开，修复后需重跑受影响验收（纸型全值、参数适用性、负例），
其余 AC 证据（AC-01/02/04/06）输入未变可复用。

2026-11-14 修复轮（F-1/F-2，提交 `00c21c7` 基于 `797f325`）：paper 允许集对齐 Typst 0.15.1 实测集
（a4 595.28×841.89、a5 419.53×595.28、iso-b5 498.9×708.66、us-letter 612×792；b5/letter 校验期
`E_IR_SCHEMA`）；academic 采纳 `--header-text`（typst config 与 PDF 正文页可见、标题页干净）；
office_book 显式 `--margin 1.2cm` 四边统一生效；office_book `--columns 2` → `E_OPTION_UNSUPPORTED`。
复跑 `node scripts/verify.mjs` → **12/12 pass**（新增 AC-03b/AC-03c）；engine 限定测试仍 109 passed；
证据副本已刷新（report.json sha256 876acce3…、academic.pdf 9b3b461b…、office-book.pdf 268975a5…）。
AC-01/AC-02/AC-04/AC-05 输入未变，复跑结果与上表一致。

## 8. 风险与决策点

- 当前语言不能直接实现目标 Content API：先用普通类型/函数验证最小模型；确需上游扩展时记录阻塞与最小反例。
- 初期源码生成适配不具备持久增量缓存：允许作为本计划限制，不能据此宣称实时性。
- 原型效果不佳：先修改设计与样例；是否改 083–086 的范围以具体反馈为依据。
- 书籍 card/段落 ID 在独立路线变化：本计划的已支持子集不依赖该变化，避免并行修改同一 parser。

## 9. 复审记录

| 日期 | 记录 |
| --- | --- |
| 2026-11-14 | stage: work / plan_id: PLAN-082 / plan_revision: r1 / outcome: **pass（execution_done）** / worktree_path: `D:/autostack/.wt/down-082/auto-down` / branch: `plan-082-dev` / base_commit: 58ea33f / code_commit: 797f325 / dependency_revisions: auto 0.1.0+plan-890-verified-r7-t19-20-g347c29f-dirty（PATH）；typst 0.15.1（固定版本，工具目录未入库）；engine `@autodown/engine` 0.5.0 于同一基线 worktree 构建 dist（未改源）/ task_ids: T-00..T-07 全 / evidence: `node scripts/verify.mjs` 10/10 pass（AC-01..AC-07，见 §7）；engine 限定测试 109 passed；证据副本 `D:/autostack/plan-artifacts/plan-082/evidence/`（report.json sha256 6b4c783c…、academic.pdf f99bb073…、office-book.pdf 93640e58…）/ blockers: 无 / next: review。注：主检出 `docs/designs/10-*`、`docs/plans/082–086`、`docs/plans/README.md`、`docs/specs/00-overview.md` 为本路线起草期的未提交文档 WIP（非代码），merge 阶段需与 `docs/specs/publishing.md` 一并落账，不在本轮改动。 |
| 2026-11-14 | stage: goal / plan_id: PLAN-082 / plan_revision: r1 / round: 1 / from: drafting / to: execution_done / status: execution_done / outcome: pass / worktree: `D:/autostack/.wt/down-082/auto-down` / commit: 797f325 / next: review |
| 2026-11-14 | stage: review / review_scope: **final** / reviewer: lead（实现会话自审；无独立会话可用，结论按工件与代码重建，未采信执行叙述——独立性受限，如实记录）/ plan_id: PLAN-082 / plan_revision: r1 / outcome: **needs_fix** / worktree_path: `D:/autostack/.wt/down-082/auto-down` / branch: `plan-082-dev` / reviewed_commit: 797f325（工作树净）/ base_commit: 58ea33f / dependency_revisions: auto 0.1.0+plan-890-verified-r7-t19-20-g347c29f-dirty、typst 0.15.1（tools 固定）、engine 0.5.0 同基线 dist / spec_inputs: `docs/specs/publishing.md`（sha256 a2911fb0…，7618 B）、`docs/specs/00-overview.md`、Design 10 / acceptance_results: AC-01 pass（probe 复跑 exit 0，labels/over_limit 一致）；AC-02 pass（2 页 vs 7 页，A4 595.28×841.89，21 个 source NodeId 顺序一致，栏位 2 vs 1，页眉只在书籍正文页）；AC-03 pass（academic 参数变体 typst query 12pt/1/3cm，页数 2→3）；AC-04 pass（12 字面量 + IR↔parser 零改动 + 序列化独立反例；另独立构造 doc-wire 探针：真制表/换行、字面 `\t`/`\n`、引号、反斜线、空表格单元、空 callout 标题全部往返无损）；AC-05 pass（四失败码均 exit 1）；AC-06 pass（tracked 改动 0、原型外 untracked 0、109 限定测试）；AC-07 pass（README/字体/冷热计时、.typ 可重跑一致）；`node scripts/verify.mjs` 复审复跑 **10/10**，`fetch-typst.mjs` 幂等路径复跑通过 / pending_closeout_gates: 合并期统一回归与 landing 检查（本轮未做，属 merge）；AC-06 仅限定触面 / findings: **F-1（in-contract）** `paper` 允许集与 Typst 0.15.1 不一致——IR 校验接受 `b5`/`letter` 而 Typst 拒绝（实测 `typst compile` 两者报 expected a0…a11/iso-b*/us-letter…；`PAPER` 集合又拒绝 Typst 接受的 `iso-b5`），结果：非法纸型以 `E_TYPST_COMPILE` 晚失败而非校验期 `E_IR_SCHEMA`，且 `docs/specs/publishing.md` §4 与 README 记载了错误允许集；复现：`node host/publish.mjs --source samples/research.ad --paper letter` → E_TYPST_COMPILE（stderr 列出合法纸型）。修法：允许集对齐 Typst（a4/a5/iso-b5/us-letter，实测四者 OK），非法值在校验期报错，补每个允许值与两个拒绝值的验收用例并更新规范。— **F-2（in-contract，契约清晰性）** CLI 参数按模板静默忽略：`office_book --margin 1cm` 后 `typst_config.margin.top` 仍 3cm（模板硬编码 3cm/2.6cm）；`academic --header-text` 后 IR `page.header_text=""`（模板硬编码空）；`office_book --columns` 恒为 1。README/规范把参数写成通用而实际只对部分模板生效，属未声明的收缩。修法：academic 采纳 `header_text`；office_book 在显式给出 `margin` 时采纳（默认保留非对称页边距）；office_book 显式 `columns != 1` 返回 `E_OPTION_UNSUPPORTED`；参数适用性写入 README/规范并加入验收。— info F-3：`fetch-typst.mjs` 的下载分支在本机被网络重置未能实测（幂等分支与 cargo 实编路径已验），记为覆盖限制。— info F-4：自审独立性受限（见 reviewer 字段）。/ evidence: 复审复跑 `node scripts/verify.mjs` → 10/10；`node host/publish.mjs …--paper letter` → E_TYPST_COMPILE（Typst 纸型列表）；`--paper b5` 同；`--paper a5/us-letter/a4` OK；`iso-b5` 被 IR 校验拒绝但 Typst 实编 OK（`typst compile` 直接探针）；`office_book --margin 1cm` → report margin.top=3cm；`academic --header-text 页眉文字` → IR header=""；doc-wire 独立探针 6/6 PASS；全部记录在 `D:/autostack/plan-artifacts/plan-082/review/` / next: **work（按 F-1/F-2 修复，T-03..T-07 已重开，current_step=3）**；修复与验收后回 review。 |
| 2026-11-14 | stage: goal / plan_id: PLAN-082 / plan_revision: r1 / round: 2 / from: execution_done / to: executing / status: executing / outcome: needs_fix / worktree: `D:/autostack/.wt/down-082/auto-down` / commit: 797f325 / next: work |
| 2026-11-14 | stage: work / plan_id: PLAN-082 / plan_revision: r1 / outcome: **pass（execution_done，F-1/F-2 修复）** / worktree_path: `D:/autostack/.wt/down-082/auto-down` / branch: `plan-082-dev` / base_commit: 58ea33f / code_commit: 00c21c7（在 797f325 之上；工作树净）/ dependency_revisions: auto 0.1.0+plan-890-verified-r7-t19-20-g347c29f-dirty、typst 0.15.1（tools 固定）、engine 0.5.0 同基线 dist（未改源）/ task_ids: T-03..T-07 重开并重新闭合 / evidence: `node scripts/verify.mjs` **12/12 pass**（AC-03b：academic header=页眉文字检查 且只在正文页、office_book margin 1.2cm 四边生效、office_book columns=2 → E_OPTION_UNSUPPORTED；AC-03c：a4/a5/iso-b5/us-letter 页面尺寸分别 595.28×841.89 / 419.53×595.28 / 498.9×708.66 / 612×792，b5/letter → E_IR_SCHEMA；AC-02a 仍 2 vs 7 页；AC-06 parser 限定测试 109 passed）；证据副本 `D:/autostack/plan-artifacts/plan-082/evidence/`（report.json sha256 876acce3…、academic.pdf 9b3b461b…、office-book.pdf 268975a5…）/ blockers: 无 / next: review（最终复审，F-1/F-2 关闭确认）。 |
| 2026-11-14 | stage: goal / plan_id: PLAN-082 / plan_revision: r1 / round: 3 / from: executing / to: execution_done / status: execution_done / outcome: pass / worktree: `D:/autostack/.wt/down-082/auto-down` / commit: 00c21c7 / next: review |
| 2026-11-14 | stage: review / review_scope: **final（修复后复审）** / reviewer: lead（实现会话自审；无独立会话，按 diff/工件/复跑重建结论，独立性受限，如实记录）/ plan_id: PLAN-082 / plan_revision: r1 / outcome: **pass** / worktree_path: `D:/autostack/.wt/down-082/auto-down` / branch: `plan-082-dev` / reviewed_commit: 00c21c7（工作树净，父 797f325）/ base_commit: 58ea33f / dependency_revisions: auto 0.1.0+plan-890-verified-r7-t19-20-g347c29f-dirty、typst 0.15.1（tools 固定）、engine 0.5.0 同基线 dist（未改源）/ spec_inputs: `docs/specs/publishing.md`（修复后 sha256 e01972bb…；diff 797f325..00c21c7 仅 157+/16-，8 文件）、`docs/specs/00-overview.md`、Design 10 / acceptance_results: 修复后复跑 `node scripts/verify.mjs` **12/12 pass**（AC-01、AC-02a/b、AC-03、**AC-03b**、**AC-03c**、AC-04a/b/c、AC-05、AC-06、AC-07）；**F-1 closed**：纸型矩阵 a4 595.28×841.89 / a5 419.53×595.28 / iso-b5 498.9×708.66 / us-letter 612×792，`b5`/`letter` 校验期 `E_IR_SCHEMA`（不再晚失败为 E_TYPST_COMPILE）；**F-2 closed**：academic `--header-text` 在 typst 配置与 PDF 正文页可见且标题页干净、office_book 显式 `--margin 1.2cm` 四边统一、office_book 显式 `--columns 2` → `E_OPTION_UNSUPPORTED`；diff 评审确认修复只触 T-03..T-06 面（emit-typst/ir.at/main.at/两模板/README/spec/verify），无越界改动 / regression_probes: 8 项复审自测全过——office_book 默认页边距仍 3cm/2.6cm 非对称、显式 columns=1 不误拒、academic columns=3 生效、columns=0 → E_OPTION_VALUE、font-size `abc` → E_IR_SCHEMA、margin `1`（缺单位）→ E_IR_SCHEMA、office_book margin+header 同时生效、office_book paper a5 出 419.53×595.28 / pending_closeout_gates: merge 期统一回归与 landing 检查（重建/重启或显式陈旧观察）；主检出 `docs/designs/10-*`、`docs/plans/082–086`、`docs/plans/README.md`、`docs/specs/00-overview.md` 起草期文档 WIP 需在 merge 一并落账（非代码）/ findings: F-1 closed、F-2 closed；info F-3（fetch-typst 下载分支本机网络受限未实测，幂等/cargo 路径已验）、info F-4（复审独立性受限）/ evidence: verify 12/12（`D:/autostack/plan-artifacts/plan-082/evidence/report.json` sha256 876acce3…；academic.pdf 9b3b461b…、office-book.pdf 268975a5…）；回归探针输出记录于本轮会话与 §7 / next: **merge**（规范传递、归档、worktree 清理；主检出文档 WIP 一并落账）。 |
| 2026-11-14 | stage: goal / plan_id: PLAN-082 / plan_revision: r1 / round: 4 / from: execution_done / to: reviewed / status: reviewed / outcome: pass / worktree: `D:/autostack/.wt/down-082/auto-down` / commit: 00c21c7 / next: merge |
| 2026-11-14 | stage: merge / **PLAN-082:r1** / outcome: **pass（prepared/landed/canonical_verified/archived；cleaned 见下条）**——① **prepared**：reviewed 00c21c7（final pass r1，工作树净）、base 58ea33f、delta `docs/specs/publishing.md` sha256 e01972bb…（8469 B）、无 index/ledger 写入；② **landed**：主检出 `git merge --ff-only plan-082-dev` → master tip = 00c21c7（无 merge commit；线性段 58ea33f→797f325→00c21c7）；③ **canonical_verified**：main 上 `docs/specs/publishing.md` sha256 e01972bb… 与 reviewed 一致，engine 源/出口零改动；主检出 post-landing smoke：`PLAN082_TYPST=<worktree tools> node host/publish.mjs --source samples/research.ad --template academic` → ok，PDF 2 页 A4 595.28×841.89（parse 10 / auto 335 / typst 99 ms）；④ **archived**：本文件移至 `docs/plans/archived/082-auto-template-typst-prototype.md`，status archived + completion_kind delivered；同 commit 落账本路线设计/计划入口（Design 10、09/06 设计链、plans README 082–086、`docs/specs/00-overview.md` 导航），并将 082 状态从 drafting 更新为已交付；归档检查：任务 8/8、链接从新父目录可解析、README/路线图入口指向本归档文件。 |





