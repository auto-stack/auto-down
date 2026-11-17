---
plan_id: PLAN-083
status: archived
completion_kind: delivered
feature_name: document-style-render-rules
author: [codex]
created_at: 2026-11-14
updated_at: 2026-11-17
plan_revision: 1
current_step: 7
total_steps: 7
depends_on: [PLAN-082]
supersedes_spec_components: [docs/specs/publishing.md §4/§6（v0→v1 迁移）]
new_spec_components: [docs/specs/publishing.md §11–§16（style-system-v1 / render-v1）]
touched_goals: []
affects: [auto-down]
---

# [PLAN-083] 结构化文档样式、作用域与呈现规则

> 依据：[Design 10](../../designs/10-autodown-publishing.md) §4–7。硬前置：[082](082-auto-template-typst-prototype.md) 的运行原型与反馈；API 在本计划开工时重核。尚未实施。

## 0. 变更摘要

在 082 已跑通的内容/出版路径上补 Style、StyleRule、Selector 和自定义呈现。复用普通 Auto 类型与函数；现有字符串 style recipe 保持兼容，不在文档侧再造通用表达式解释器。

## 1. 目标与边界

- 文档样式有类型、可组合、可检查；字号/长度、颜色、段落属性和分页约束有明确适用节点与后端能力。
- 普通函数可返回 Style 或内容；style 关键字的结构化扩展若尚未支持，先采用普通函数/类型接口，不伪称语法已经实现。
- 支持内置默认、主题、模板、文档规则、节点显式属性的逐属性合成，及明确的子树作用域。
- 首期选择器包括语义类型、属性、ID、role、and/or；自定义 theorem/heading 呈现保留来源、编号与引用角色。
- 不实施完整 Typst 上下文回调、页面编辑或所有 CSS 选择器。

## 2. 架构方案

Auto 模板输出出版树与规则 → schema/能力校验 → 样式合成/呈现选择 → Typst 适配。保留逻辑语义节点与呈现内容的关联，视觉替换不覆盖原始正文。

Style 数据及 Selector 应可序列化。RenderRule 可在排版前由普通 Auto 函数求值；布局相关函数交 086。跨边界闭包不能直接存成 JSON。

## 3. 详细设计

1. 首期采用普通类型/函数定义 Length、Color、TextStyle、ParagraphStyle 与必要页面约束；单位工厂可替代新字面量语法，例如 `pt(11)`。具体 API 依 082 探针结果确定。
2. 文档共用 AutoUI 的概念、token 与可用类型，不直接复制整个 UI class 解析器。公共 UI Style 扩展由 UI owner 另立任务；本计划只做文档可用接入。
3. 计算优先级与 Design 10 一致：逐属性合成；同层按作用域深度及声明顺序；节点显式属性最高。先构造的内容仍能接受后套模板的默认值。
4. styled/scope 覆盖整个子树，离开即恢复；这不等同于复制 Typst 的全部源码顺序语义。
5. 每个 occurrence 首期选一条最高优先级的呈现规则，支持显式 next/default 委托；活动规则 guard 防止同一 occurrence 无限重入。
6. 自定义呈现输出保留 semantic origin/role/label。规则生成的装饰节点不默认成为目录条目。
7. 提供 inspect_style 数据接口，列出最终属性、来源、覆盖与能力错误；UI 面板消费由 085 接续。

## 4. 测试与验收标准

| 编号 | 场景 | 成功条件 |
| --- | --- | --- |
| AC-01 | 普通函数按参数产生 Style | 参数实际影响输出，非法值/节点属性可定位拒绝 |
| AC-02 | 同一内容后套不同模板 | 默认样式在最终环境生效；显式属性不丢失 |
| AC-03 | 嵌套覆盖与恢复 | 逐属性优先级可验证，作用域不泄漏 |
| AC-04 | 选择器与呈现函数 | 类型/属性/ID/role 匹配正确，定理框与标题呈现可用 |
| AC-05 | 来源与语义保持 | 呈现替换后 ID、标题角色和引用仍可追溯，无自匹配死循环 |
| AC-06 | inspect_style 与后端边界 | 来源链正确；不支持属性明确诊断，不静默丢弃 |
| AC-07 | 082 原型仍可运行 | 两个模板与当前 IR 明确迁移；旧 parser/editor 合同按触面检查 |

测试以有区分力的嵌套/冲突/先构造后套模板反例为主，不只断言实现内部字段。结构化 style 语法未落地时，报告区分“普通函数 API 已交付”与“关键字扩展未实施”。

## 5. 规范沉淀

更新 `docs/specs/publishing.md` 的实际类型、优先级、作用域、规则与能力表。若语言/UI owner 另有扩展计划，记录真实编号与前置，不能预写其已交付。

## 6. 任务清单

- [x] T-00：复核 082 反馈与现有 Style/主题接口，冻结本批最小合同。证据：082 交接（README/规范 §10 差额表）复核；Auto 能力探针 `plan-artifacts/plan-083/scratch/cap-probe1–5`（float 字面量/算术可用但跨模块序列化不稳定；`bool.to(str)` 内存损坏→int 标志；`Length` 为内置类型名；`view`/`pub` 保留字；记录字段赋值/列表替换可用）；冻结合同：整数 milli 定标长度、五层逐属性合成、标题子树作用域、终端选择器集合、呈现规则名派发、IR v1、`--doc-styles` JSON→STYLEWIRE 入口、后端能力表含 1 项不支持示例。工具：auto `0.1.0+plan-890-verified-r7-t19-24-g54fe407-dirty`；typst 0.15.1（下载分支网络重置→cargo 实编 2m16s，与 082 同版本策略）；Node v25.2.1；engine 0.5.0 worktree 内构建 dist（未改源）。
- [x] T-01：实现结构化样式类型、普通函数构造与边界校验。证据：`templates/style.at`——StyLength(milli)/Color/TextStyle/ParagraphStyle/DocStyle、单位工厂 `pt(11,0)`/`cm(2,200)`/`em(0,640)`、`check_*` 可定位拒绝（`E_STYLE_VALUE` 带 `who/prop`）、15 项属性注册表、hex 颜色解析；`templates/style-probe.at` 17/17 子检查全过（`auto templates/style-probe.at` → `{"ok_count":17,"total":17,"all_pass":true}`，755ms）。
- [x] T-02：实现逐属性合成、继承与子树作用域。证据：`style.at:compose_styles`——内置<主题<模板<文档规则<节点显式，同层作用域深度+声明序，未设置属性不覆盖；标题子树 scope_extents（含锚点、止于同级/更高级标题）离开即恢复；来源链逐属性升序（末位生效）。探针 t2a–t2f + 验收 S-02/S-03（computed + PDF 字号 13.0/15.0/11.0 分布）全过。
- [x] T-03：实现选择器及可观察匹配结果。证据：`sel_matches`（type/attr/id/role/and/or/all，and/or 子项限终端）+ `match_log_of`（rule×node×matched 含未命中）；探针 t3sel + S-04（真实文档：doc-sub-emph 只命中 block-5，block-3/9 未命中）全过。
- [x] T-04：实现呈现函数接入、委托与递归保护，保留语义来源。证据：`templates/render.at`——最高优先级单命中（同优先级先声明胜）、`aside-note` 显式 next 委托（`next_rule_below`→`callout-plain`，输出含"【两段提示】"）、`theorem-box`（"定理 1（一致性条件）"按内容顺序编号）、`chapter-h1`（"第N章"含模板前言=第一章）；活动 (rule, occurrence) 守卫：`render-guard-demo.at` 负例 `W_RENDER_RECURSION_GUARD`×2、presentation 有界（==content 数）、guard=1 条目回落默认；outline 全部语义标题（装饰前缀不进入，S-05 断言两模板全部条目）。
- [x] T-05：实现样式检查接口，完成 PDF 与反例验证。证据：`host/emit-typst.mjs` v1 校验 + `backendCapabilityDiagnostics`（`doc.hanging_punctuation`→`W_STYLE_UNSUPPORTED`×5，值保留 IR 不丢弃）+ `buildStyleInspect`（style-inspect-v1：props+采用链+backend 支持标记）；`host/pdf_probe.py` 每页字号分布；`host/style-wire.mjs` 结构校验+编码。验收 S-03/S-06（PDF 字号 13/15 出现、结论页无 13pt 泄漏；block-1 链 builtin>template>explicit、block-5 末位 doc-sub-emph）全过。
  复审 F-1 重开（2026-11-17）：显式属性引用不存在的节点 id 时被静默接受（IR 回显、合成无效果）——与同通道规则的可定位拒绝（E_STYLE_SCOPE）不一致，违反 AC-01“非法值/节点属性可定位拒绝”。修复闭合（提交 7d92349）：`style.at:validate_explicit` + finalize 调用 → `E_STYLE_EXPLICIT_NODE: explicit:block-99: node not found in document`（与规则侧 E_STYLE_SCOPE 对称可定位）；verify S-06 增负例断言，复跑 **19/19**。
- [x] T-06：迁移 082 样例，复审并沉淀实际规范。证据：academic/office_book 迁移为规则声明（`publication-ir-v1`，扁平 StyleConfig 删除）；research.ad/escape.ad/style-demo.ad × 两模板 × 参数/负例全通（AC-01..AC-07 + S-01..S-07 = **19/19**，`node scripts/verify.mjs` 29.8s）；office_book 可见变化（"第N章"呈现、h2 去编号——后端嵌套计数冲突实测 "0.1."）记录于规范 §13；`docs/specs/publishing.md` 新增 §11–§16（样式系统/呈现规则/能力与诊断/入口协议/VM 缺陷规避）；README 同步。

## 7. 验证记录

实施与验证：2026-11-17，隔离工作树 `D:/autostack/.wt/down-083/auto-down`（分支 `plan-083-dev`，基线 5af11a3），
实现提交 `1c0ec92` + 修复 `246b191` + 文档 `bb8ff2c`。工具：auto `0.1.0+plan-890-verified-r7-t19-24-g54fe407-dirty`；
typst `0.15.1`（tools 固定，cargo 实编同版本）；Node `v25.2.1`；`win32`。
原始证据：`D:/autostack/plan-artifacts/plan-083/evidence/`（report.json sha256 567c5853…、report.md、
sd-book/sd-academic PDF、sd-book IR+style-inspect、guard-demo IR、vm-repro 最小复现对）与
`plan-artifacts/plan-083/scratch/`（cap-probe 1–5、style-smoke、编译定位探针）。

| AC | 结果 | 证据（命令与关键数字） |
| --- | --- | --- |
| AC-01 | pass | `auto templates/style-probe.at` → 17/17（emphasis 参数影响输出：12.5pt/14pt；weight 50/未知单位/负长度/坏 hex 可定位拒绝）；S-01 |
| AC-02 | pass | S-02：同一 style-demo.ad，academic 默认 10pt/0em vs office_book 11pt/2em（模板默认在最终环境生效）；block-1 显式 15pt 两模板均保留且链顶 explicit（先构造内容不固化默认值） |
| AC-03 | pass | S-03：doc 规则 scope=block-4 子树内 block-5=13pt（链末位 doc-sub-emph），block-3/9 恢复模板值且链中无该规则；PDF 字号分布 13.0/15.0 出现、结论页无 13.0 |
| AC-04 | pass | S-04：match_log doc-sub-emph 仅命中 block-5；theorem-box→"定理 1（一致性条件）"、chapter-h1→"第二章 方法"（PDF 可见）；aside-note 长正文显式 next 委托（注：+【标题】+正文） |
| AC-05 | pass | S-05：outline 两模板全部语义标题（无"第N章/定理"污染，逐条断言 =content 标题文本）；来源映射逐条目可定位；递归负例 `render-guard-demo.at`：W_RENDER_RECURSION_GUARD×2、presentation==content 数（有界）、guard 条目回落默认 |
| AC-06 | pass | S-06：style-inspect-v1——block-1 链 builtin>template>explicit、block-5 末位 doc-sub-emph；`doc.hanging_punctuation` → W_STYLE_UNSUPPORTED×5 且值保留 IR（capabilities 表 supported:false，不静默丢弃） |
| AC-07 | pass | AC-01..AC-07 基线全过（19/19 中的 12 项）：research.ad/escape.ad × academic/office_book 参数变体、纸型矩阵、四负例 + E_OPTION_UNSUPPORTED；engine 限定测试 109 passed（block-parser + serializer-roundtrip，385ms）；office_book 迁移可见变化（第N章/h2 去编号）在 S-07 显式断言 |

结构化 style 关键字语法（`style x = …` 声明形态）未实施——按 §1/§3.1 以普通函数/类型接口交付
（`emphasis`/单位工厂/规则声明），报告如实区分。

### 本轮测试计时（test-discipline）

| 模块/范围 | 结果 | 准备 | 执行 | 总时长 |
| --- | --- | --- | --- | --- |
| `node scripts/verify.mjs`（AC×12 + S×7，含 ~20 次出版×Typst 编译） | 19/19 pass | engine dist 3.4s + typst fetch 2m16s（一次） | 单检查 ≤2.2s | 29.8s 墙钟 |
| `auto templates/style-probe.at`（17 项子检查） | 17/17 | 无（源内联） | 755ms | 755ms |
| engine vitest（block-parser + serializer-roundtrip） | 109 passed | dist 已建 | 385ms | ~1.8s（AC-06 含 git 检查） |
| 冒烟/探针迭代（cap-probe1–5、style-smoke、编译定位） | 开发期证据 | — | — | scratch 记录 |

新增用例（本计划引入，全部 ≤10s）：S-01 style-probe（755ms）；S-02/S-03/S-04/S-05/S-06/S-07
verify 检查（各 0–384ms，含子断言）；render-guard-demo 出版运行（S-05 内）。无 >10s 新用例。

### 已知边界与 VM 缺陷（详见 docs/specs/publishing.md §16）

- 本机 auto VM：入口 `use file` 时部分被调函数被错误编译（8 行最小复现在
  `plan-artifacts/plan-083/evidence/vm-repro/`：k1(file)=0 vs k2(nofile)=1；
  compose 来源链幻影条目同理）→ **入口改 env 输入/stdout 输出，Auto 调用图不导入 file**；
  float 跨模块不稳定→整数 milli；`bool.to(str)` 损坏→int 标志；`Length`/`view`/`pub` 保留字。
  待交 auto-lang owner。
- v1 样式边界（如实声明）：行内继承属 084；and/or 子项限终端；无 CSS specificity；
  主题层为单条内置原型；office_book h2/h3 无编号（层次编号与呈现接管冲突，后续评估）。

## 8. 风险与决策点

同一 Node 承担语义和视觉身份会导致引用丢失，必须保留两层关联。完整普通函数求值与现有 recipe 的有限替换不可混称；优先复用通用求值链。API 冗长时可加语法糖，但不以本计划为由立刻修改所有 AutoUI 应用。

## 9. 复审记录

| 日期 | 记录 |
| --- | --- |
| 2026-11-17 | stage: work / plan_id: PLAN-083 / plan_revision: r1 / outcome: **pass（execution_done）** / worktree_path: `D:/autostack/.wt/down-083/auto-down` / branch: `plan-083-dev` / base_commit: 5af11a3 / code_commit: bb8ff2c（线性：1c0ec92 实现 → 246b191 验证收尾 → bb8ff2c 规范/README；工作树净）/ dependency_revisions: auto `0.1.0+plan-890-verified-r7-t19-24-g54fe407-dirty`（PATH）；typst 0.15.1（tools 固定，cargo 实编）；engine `@autodown/engine` 0.5.0 同基线 worktree 构建 dist（未改源）/ task_ids: T-00..T-06 全 / evidence: `node scripts/verify.mjs` **19/19 pass**（AC-01..AC-07 基线迁移 + S-01..S-07 新验收，29.8s；`auto templates/style-probe.at` 17/17 755ms；engine 限定测试 109 passed；证据 `D:/autostack/plan-artifacts/plan-083/evidence/`：report.json sha256 567c5853…、sd-book.pdf 1f1fc1f8…、IR/inspect/guard-demo 副本、vm-repro 最小复现对）/ blockers: 无 / next: review。规范沉淀 `docs/specs/publishing.md` §11–§16（style-system-v1/render-v1/能力与 VM 缺陷）；VM 缺陷（入口 use file 错误编译、float/bool.to(str)/保留字）已规避并记录，交 auto-lang owner。 |
| 2026-11-17 | stage: goal / plan_id: PLAN-083 / plan_revision: r1 / round: 1 / from: drafting / to: execution_done / status: execution_done / outcome: pass / worktree: `D:/autostack/.wt/down-083/auto-down` / commit: bb8ff2c / next: review |
| 2026-11-17 | stage: review / review_scope: **final** / reviewer: lead（实现会话复审；无独立会话可用，结论按工件/代码/独立重跑重建，未采信执行叙述——独立性受限，如实记录）/ plan_id: PLAN-083 / plan_revision: r1 / outcome: **needs_fix** / worktree_path: `D:/autostack/.wt/down-083/auto-down` / branch: `plan-083-dev` / reviewed_commit: bb8ff2c（工作树净；线性 5af11a3→1c0ec92→246b191→bb8ff2c）/ base_commit: 5af11a3 / dependency_revisions: auto 0.1.0+plan-890-verified-r7-t19-24-g54fe407-dirty、typst 0.15.1（tools 固定）、engine 0.5.0 同基线 dist / spec_inputs: `docs/specs/publishing.md`（bb8ff2c 版，§11–§16 新增）、Design 10 §6–7 / acceptance_results: 复审独立重验 15/15（fresh publish rv-book：explicit 15pt/scoped 13pt/恢复 11pt/链 builtin>template>explicit、末位 doc-sub-emph/outline 语义标题/定理与章节呈现/hanging 保留 IR+5×W_STYLE_UNSUPPORTED/inspect v1 能力表）；确定性 .typ sha 两次一致（8e705ced4d03）；负例：未知作用域锚点 → E_STYLE_SCOPE（可定位）、非法单位值 → E_DOC_STYLES；`node scripts/verify.mjs` 复跑 **19/19**（29.8s）；engine 限定测试 109 passed 复用（输入未变）；规范增量与实测行为一致 / findings: **F-1（in-contract）** 显式属性（xstyle）引用不存在的节点 id：宿主结构校验通过、IR 回显该条目、合成静默无效果——同通道规则侧有 E_STYLE_SCOPE 可定位拒绝，显式侧缺失，违反 AC-01“非法值/节点属性可定位拒绝”。复现：`{"explicit":[{"id":"block-99","props":{"text.size":"18pt"}}]}` → publish ok，computed 无 18pt，styles.explicit 回显 block-99。修法：合成管线校验 explicit id（E_STYLE_EXPLICIT_NODE，带 id 定位）+ verify 负例。— info F-2：env 输入通道容量上限未记载（建议规范 §15 一句边界说明）。— info F-3：属性注册表 style.at 与 host/style-wire.mjs 双份维护（原型期接受，规范已记载注册表为源）。 / evidence: 独立重验输出（review 会话内，关键数字已录入本表）；verify 19/19 report.json sha256 567c5853… / next: **work（F-1 修复 + F-2 文档；T-05 重开）**，修复后回 review 复验受影响范围。 |
| 2026-11-17 | stage: goal / plan_id: PLAN-083 / plan_revision: r1 / round: 2 / from: execution_done / to: executing / status: executing / outcome: needs_fix / worktree: `D:/autostack/.wt/down-083/auto-down` / commit: bb8ff2c / next: work |
| 2026-11-17 | stage: work / plan_id: PLAN-083 / plan_revision: r1 / outcome: **pass（execution_done，F-1 修复）** / worktree_path: `D:/autostack/.wt/down-083/auto-down` / branch: `plan-083-dev` / base_commit: 5af11a3 / code_commit: 7d92349（bb8ff2c 之上：style.at validate_explicit + render.at 调用 + verify S-06 负例 + samples/neg/explicit-unknown-node.json + F-2 规范/README 边界记载）/ dependency_revisions: 同前（auto t19-24、typst 0.15.1、engine 0.5.0 dist）/ task_ids: T-05 重开并重新闭合 / evidence: F-1 复现转正例：`--doc-styles samples/neg/explicit-unknown-node.json` → exit 1 `E_STYLE_EXPLICIT_NODE`（消息含 block-99）；`node scripts/verify.mjs` **19/19**（S-06 含新负例） / blockers: 无 / next: review（F-1/F-2 复验） |
| 2026-11-17 | stage: goal / plan_id: PLAN-083 / plan_revision: r1 / round: 3 / from: executing / to: execution_done / status: execution_done / outcome: pass / worktree: `D:/autostack/.wt/down-083/auto-down` / commit: 7d92349 / next: review |
| 2026-11-17 | stage: goal / plan_id: PLAN-083 / plan_revision: r1 / round: 4 / from: execution_done / to: reviewed / status: reviewed / outcome: pass / worktree: `D:/autostack/.wt/down-083/auto-down` / commit: 7d92349 / next: merge |
| 2026-11-17 | stage: review / review_scope: **final（F-1 修复后复验）** / reviewer: lead（实现会话复审；独立性受限同前，按工件/独立重跑重建）/ plan_id: PLAN-083 / plan_revision: r1 / outcome: **pass** / worktree_path: `D:/autostack/.wt/down-083/auto-down` / branch: `plan-083-dev` / reviewed_commit: 7d92349（工作树净；bb8ff2c 之上单提交修复）/ base_commit: 5af11a3 / dependency_revisions: 同前轮 / spec_inputs: `docs/specs/publishing.md`（7d92349 版：§11–§16 + §15 env 容量边界）/ acceptance_results: **F-1 closed**——`--doc-styles samples/neg/explicit-unknown-node.json` → exit 1 `E_STYLE_EXPLICIT_NODE`（`explicit:block-99: node not found in document`，与 E_STYLE_SCOPE 对称可定位）；`node scripts/verify.mjs` **19/19**（S-06 含新负例断言）；**F-2 closed**——env 容量上限记入规范 §15 与 README；回归面：有效输入输出零变化（同参数 .typ sha 与修复前逐字节一致 8e705ced4d038173；S-01..S-05/S-07 断言全部复过）/ pending_closeout_gates: merge 期统一回归与 landing 检查（重建/重启或显式陈旧观察）；F-3（注册表双份维护）info 级接受，规范已记载注册表为源 / findings: F-1 closed、F-2 closed、info F-3 / evidence: 本表数字 + verify 19/19 report（out/verify）；vm-repro 与证据副本 `D:/autostack/plan-artifacts/plan-083/evidence/` / next: **merge**（规范随代码已在 7d92349；归档、worktree 清理、landing 检查） |
| 2026-11-17 | stage: goal / plan_id: PLAN-083 / plan_revision: r1 / round: 5 / from: reviewed / to: archived / status: archived / outcome: pass / worktree: `D:/autostack/.wt/down-083/auto-down` / commit: 5a71168 / next: done |
| 2026-11-17 | stage: merge / **PLAN-083:r1** / outcome: **pass（prepared/landed/canonical_verified/archived/cleaned）**——① **prepared**：reviewed 7d92349（final pass r1，工作树净）、base 5af11a3、Spec delta `docs/specs/publishing.md`（§4 v1 化 + §11–§16 新增）已在交付提交内、无 index/ledger 写入；② **landed**：worktree rebase master（4 提交，`git range-diff` **全等**：1c0ec92→03d2231、246b191→312f58b、bb8ff2c→ce7c553、7d92349→5a71168）→ 主检出 `git merge --ff-only plan-083-dev` → master tip = **5a71168**（无 merge commit；线性段 5af11a3→03d2231→312f58b→ce7c553→5a71168）；③ **canonical_verified**：主检出 `docs/specs/publishing.md` sha256 `fab7e15efc630a1d…` 与 reviewed 工作树逐字节一致；engine 源/出口零改动；主检出 post-landing smoke：`PLAN082_TYPST=<worktree tools>/typst.exe node host/publish.mjs --source samples/style-demo.ad --template office_book --doc-styles samples/style-rules.json` → ok（parse 4 / auto 928 / typst 82 ms，PDF 4 页 63705 B，含"定理 1（一致性条件）""第二章 方法"）；④ **archived**：本文件移至 `docs/plans/archived/083-document-style-render-rules.md`，status archived + completion_kind delivered；plans README 083 行改为已交付并指向归档；归档检查：任务 7/7、Design/082 链接从新父目录可解析；同 commit 落账（d7b6e0e）；⑤ **cleaned**：wt-guard 首轮报 1083 个 pnpm junction，逐条删链接后二次 guard **clean**；`git worktree remove` + `git branch -D plan-083-dev`（was 5a71168）+ 空组目录删除 + prune 无残留；`D:/autostack/plan-artifacts/plan-083/` 全删（evidence 已折叠入本文件 §7/§9；VM 最小复现以文字形式保留于规范 §16）。⑥ **landing 观察**：本计划无生产消费面——engine 源/出口零改动，无后端 release/前端 bundle/daemon 依赖原型产物，无需 rebuild/restart（主检出 engine dist 非本计划产物，陈旧观察不适用）；Typst 0.15.1 属 scratch（已随 scope 删除），复现入口 `node scripts/fetch-typst.mjs`。⑦ **batch regression**：auto-down 无该批量门（auto-lang 专有）；083 非 5 倍数 → 不适用。备注：retention registry（`plan-artifacts/.retention/policy.json`）在写入时解析失败（auto-ui/PLAN-080 边界既有/并发损坏，非本计划写入），plan-083 scope 删除已在盘面核实、无具名 hold，registry 修复留其 owner。 |
