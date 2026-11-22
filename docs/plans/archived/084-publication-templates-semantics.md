---
plan_id: PLAN-084
status: archived
feature_name: publication-templates-semantics
completion_kind: delivered
author: [codex]
created_at: 2026-11-14
updated_at: 2026-11-22
plan_revision: 2
current_step: 7
total_steps: 7
depends_on: [PLAN-082, PLAN-083]
supersedes_spec_components: [docs/specs/publishing.md §4/§10（publication-ir-v1 与差额表由 v2 更新取代）]
new_spec_components: [docs/specs/publishing.md §17–§21（视图与 occurrence/标准节点与编号/资源与公式 dialect/执行端矩阵/五模板支持矩阵）]
touched_goals: []
affects: [auto-down]
---

# [PLAN-084] 五类出版模板与编号、引用、资源语义

> 依据：[Design 10](../../designs/10-autodown-publishing.md) §8、§10–11、§14。硬前置已满足，见 [082](082-auto-template-typst-prototype.md) 和 [083](083-document-style-render-rules.md)。书籍语料可复用 [087](087-autodown-book-reading-profile.md) 已交的章、卡与持久锚合同。状态为 drafting。

## 0. 变更摘要

在真实 Auto 模板与结构化样式基础上，形成论文、办公书籍、出版书籍、基础报纸、静态演示五个样例；补齐它们必需的文档顺序、编号、引用、脚注、公式与资源边界。

## 1. 目标与边界

- 同一语义材料进入不同 view/template，不为每种输出复制一份手工改写正文。
- 标题、图表、公式编号、目录、ref、脚注与一个文献样例真实工作。
- 出版视图有明确 NodeId/OccurrenceId 与逻辑阅读顺序；重复内容不能悄悄产生歧义标签。
- 完成五类真实 PDF 并人工比较；“办公风格”不宣称 DOCX，“演示”不宣称可编辑 PPTX。
- 首轮报纸限多栏/跨栏标题/图文区域；演示限显式分镜与静态输出。复杂文本框串文、自动摘要、分步动画不在本批。

## 2. 架构方案

复用 082 的正文适配与 IR，083 的 Style/规则；增加 View 与标准文档节点/索引。排版中的标准编号和位置依赖优先映射到 Typst 内置机制，任意 Auto 上下文回调交 086。

模板应是可组合的普通 Auto 模块，元数据/插槽使用类型化参数；模板与 view 分工清晰。资源经同一个 Resolver 提供，字体/图片/数据依赖进入可复现清单。

### 2.1 用真实出版模板验证 ACE

T-00 从原型的 `templates/main.at` 开始。宿主用同一份 `doc.wire`、`request.txt`、`styles.wire` 分别执行 **ACE AV** 和 **由新版 A2R 生成并构建的 Rust 可执行文件**。先用现行 `PLAN083_WIRE`、`PLAN083_REQUEST`、`PLAN083_STYLES` 传入内容，从 stdout 取 IR 信封。若导入或调用形态需要适配，先记录原入口的结果，再用薄入口适配复用同一模板逻辑。长书稿的传输方式按样例实测确定。

两个已交模板各跑一个成功样例，另跑一份错误输入。按独立的既定预期核对 Publication IR 的块 ID、顺序、配置、计算样式、呈现及已暴露的诊断字段。记录源码、工具、provider、入口、输入及实际执行命令。旧版结果可作为兼容对照。可复用 [M2A-08 阶段收据](../../../../auto-lang/docs/specs/ace-migration/m2-certification.md) 和 [ACE 标准库 I/O 交付](../../../../auto-lang/docs/specs/ace-migration/m2-stdlib-io.md)。

AV 通过后优先用于开发与样例输出。新版 A2R 独立记实测结果，缺口不阻塞已通过的 AV 路径。若相应用例确因具名缺口无法在新版运行，可通过同一出版接口显式选择已验的旧版执行路径，记录最小复现、负责计划或模块、新版复验条件，并按原验收覆盖临时路径。五类模板可在临时路径上交付，未通过的新版能力保持待验。上游补齐后复跑同一验收再切换该路径。

## 3. 详细设计

1. 建立规范化出版逻辑树、occurrence 索引、引用作用域及显式歧义处理。
2. 编号依模板和 view 展开后的逻辑阅读顺序，不依 Auto 函数执行顺序。模板插入前言后，正文编号应相应变化。
3. 标准节点覆盖本批实际需要的 outline、ref、figure/caption、equation、footnote、bibliography；用一个固定文献输入格式/编号风格作为验收样例，不能声称完整期刊格式兼容。
4. 公式保留 dialect/原始来源；原型保证明确的 Typst 数学路径。TeX/KaTeX 未转换项必须报错或明确 fallback，不能直接粘贴混用。
5. 演示使用作者标注的结论/图表/slide 材料，普通函数按规则组织；选取、摘要与原文修改不是模板隐式副作用。
6. 书籍 card、段落 ID、锚点与源格式复用 087 的公开合同。先用具名书籍样例验证导入与引用定位，确需 parser 扩展时记录最小反例并交给对应模块。
7. 资源清单记录模板/字体/引擎版本与内容哈希；缺字、替代字体、资源缺失和非法路径产生可见诊断。

## 4. 测试与验收标准

| 编号 | 场景 | 成功条件 |
| --- | --- | --- |
| AC-01 | 五个模板消费同一材料 | 五个可打开并人工检查的 PDF，正文来源一致且形态区别成立 |
| AC-02 | 章节重排/前置内容 | 编号与目录按最终逻辑顺序正确变化 |
| AC-03 | 引用、脚注和文献 | 目标与显示正确；悬空、重复与歧义有定位诊断 |
| AC-04 | Content 复用两次 | occurrence 唯一；引用策略明确，不随机选首个目标 |
| AC-05 | 混合语言/公式/资源 | 字体诊断可见；公式 dialect 受检查；未知内容不丢失 |
| AC-06 | 图表与长内容 | 长标题、长段落、表格等样例无无声截断；超出本批能力明确记录 |
| AC-07 | 模板/view 与文件格式分离 | 切换视图不修改原文；PDF 幻灯片不宣称 Office 可编辑等价 |
| AC-08 | 真实模板的引擎接入 | 分别记录 AV 和新版 A2R 的正反例、IR 对照与实际执行路径。采用旧版时保留具名缺口、同等验收与新版复验条件 |

每类模板保留一份代表性截图/人工观察摘要与可复跑命令；输出证据按执行时工作树/产物规则管理。不能仅以生成进程退出码代替视觉检查。

## 5. 规范沉淀

在 `docs/specs/publishing.md` 记录已支持节点、文档顺序、引用作用域、模板包与资源合同；书籍语法变化只由其格式规范统一定义。向 085 交接 occurrence/定位需求，向 086 交接实际计数器与查询对象。

## 6. 任务清单

- [x] T-00：复核 082/083/087 合同，按 §2.1 用固定样例验证两个 ACE 执行端，将实际结果交 085 复用。证据（2026-11-22，`D:/autostack/plan-artifacts/plan-084/t00/REPORT.md` + `runs/` + `repro/`）：三用例 × 四执行端矩阵——旧版 VM 车道（`AUTO_ACE_CANDIDATE=0`，auto `0.1.0+plan-890-verified-r7-t19-116-gc879b3e` 2026-11-19 构建，脚本面默认已翻转 ACE sys）3/3 通过且独立既定预期 3/3（`check-expectations.mjs`）；ACE AV console/sys 车道具名缺口 G-AV-1..4（无 record/无 use 导入/无 env/str 方法缺失，最小复现 8 份）；新版 A2R（scalar 前门）全量缝合 bundle（3,112 行，`host/stitch-entry.mjs`）transpile 成功（189 fragments）但生成 Rust 编译失败（82 错误/6 类 G-A2R-1..6，`gap1.at` 隔离）。按 §2.1 回退条款：`publish.mjs` 增 `--auto-engine legacy|ace` 默认显式旧版；复验条件与交 085 事项见 REPORT.md。
- [x] T-01：实现 view、文档索引与 occurrence/引用作用域。证据：doc-wire v2（行内语义段 + figure/equation/footnote_def/bib_entry；v1 兼容）；publication-ir-v2 occurrence（`id`/`id#N`，computed/presentation/references 按 occ 对齐，显式属性按 occ 展开）；`ir.at:index_of_content/validate_refs`（E_REF_DANGLING/E_REF_AMBIGUOUS/E_CITE_UNKNOWN/E_FOOTNOTE_DANGLING/E_FOOTNOTE_DUPLICATE 具名可定位）；`project_view`（slides 选取分镜，W_SLIDES_UNPLACED 可见丢弃）；消歧出现序由宿主在 wire 层结构化携带（VM 嵌套循环字段-子函数形态误编译规避，规范 §16f/§17）。
- [x] T-02：实现标准编号、目录、ref、脚注与文献样例。证据：Typst 内置映射——headings `<h-occ>` label + 模板 numbering、figure 计数器（图 N）、式计数器（(N)，行内式显式不编号）、`#footnote[定义]`、文末编号文献节（`<bib-键>`，引用上标 [n] 链接）；无编号模板 ref 退化 `#link`；编号按出版树顺序（P-02：office_book/press_book 前言=第一章、目录含模板前言、图 1/式 (1)(2)(3)）；负例七类具名（P-03）。
- [x] T-03：补资源清单、字体诊断与公式 dialect 边界。证据：`resource-manifest-v1`（工具链身份/auto_engine、源 sha256、字体 × typst fonts 核对 → W_FONT_MISSING、图片 sha256/拷贝状态）；W_RESOURCE_MISSING / W_RESOURCE_PATH_ILLEGAL；公式 dialect 门（typst 唯一，E_EQUATION_DIALECT/E_EQUATION_SYNTAX——P-05 含 TeX 反例与 `#` 逃逸反例）。
- [x] T-04：实现/迁移五个普通 Auto 模板及正文材料映射。证据：academic/office_book 迁移 v2 + press_book/news/lecture 新增（规范 §21 支持矩阵）；样例包 `samples/paper.ad`（双语、两级章节、定理/提示、表格、矢量图、块/行内公式、脚注、节点引用、文献 3 条、slide 分镜、长段/长表边界）+ `samples/assets/fusion.svg` + 9 份负样例；同一材料五模板（P-01：五 PDF、source 块一致、形态区别——双栏/单栏/16:9（297×167.0625mm 实测）/三栏+跨栏标题/分镜页）。
- [x] T-05：真实输出并人工核验五类样例与边界反例，复核 AC-08 的逐端结果。证据：五 PDF（academic 4 页 / office_book 9 / press_book 9 / news 2 / lecture 6×16:9=841.89×473.56pt）；视觉门（visual-judge 独立代理逐页验收）经 7 轮修复-复判全部 **PASS**（academic 4/4、office_book 6/6、press_book 6/6、lecture 6/6、news 2/2）；修复链见提交 7d7be56/a49b805/<终版>（锚卡泄漏、行内公式定界符空白规则、块公式编号 set+show、图浮动、表格比例列宽/跨栏策略、报纸 grid 三栏近似均衡+避头点+公式不编号、页眉流中设置触发改页）；AC-08 逐端复核=T-00 矩阵 + P-08。
- [x] T-06：复审、沉淀支持矩阵与限制，交接预览/延迟上下文计划。证据：`docs/specs/publishing.md` §17 视图/occurrence/引用作用域、§18 标准节点与编号（含报纸不编号例外与各项实测成因）、§19 资源清单与公式 dialect、§20 执行端矩阵（G-AV-1..4/G-A2R-1..6 + 复验条件）、§21 五模板支持矩阵（含"不宣称"列）；README 同步（运行/执行端/限制/交接）；向 085 交接 occurrence 级来源映射 + style-inspect references 表 + T-00 输入通道事实，向 086 交接文档索引/计数器形态。

## 7. 验证记录

实施与验证：2026-11-22，隔离工作树 `D:/autostack/.wt/down-084/auto-down`（分支 `plan-084-dev`，基线 45b642d），
实现提交 404279f + 视觉门修复 7d7be56。工具：auto `0.1.0+plan-890-verified-r7-t19-116-gc879b3e`（执行端显式
legacy 车道）；typst 0.15.1（tools 固定）；Node v25.2.1；win32。

| AC | 结果 | 证据（命令与关键数字） |
| --- | --- | --- |
| AC-01 | pass | P-01：`node host/publish.mjs --source samples/paper.ad --template <五模板>` 全绿；五 PDF（academic 4 页/office_book 9/press_book 9/news 3/lecture 7）；source 块 38 个四模板一致；lecture 16:9=841.89×473.56pt；news 三栏（行首簇 45/218/384pt） |
| AC-02 | pass | P-02：office_book/press_book 前言=第一章、引言=第二章；outline 首条 tpl-preface；academic 图 1（图 1）与式 (1)(2)(3) 按内容顺序 |
| AC-03 | pass | P-03：references[] 7 条（ref/cite/footnote 全类）；脚注定义与文献 [1][2][3] 进 PDF；七负例具名（E_REF_DANGLING/E_CITE_UNKNOWN/E_FOOTNOTE_DANGLING/E_FOOTNOTE_DUPLICATE/E_BIB_ENTRY/E_FIGURE_MIXED_INLINE/E_REF_AMBIGUOUS）；`#fig-x#2` 显式消解正例 |
| AC-04 | pass | P-04：lecture template-reuse 块 occ=`block-35#2`/`block-37#2`；occ 全唯一；computed/presentation 与 occ 逐位对齐；未限定引用被拒（非随机选首） |
| AC-05 | pass | P-05：E_EQUATION_SYNTAX（`#` 逃逸）、E_EQUATION_DIALECT（TeX 反例）；resource-manifest 字体核对 0 缺失、图片 sha256 入清单；容器/外链压平诊断可见 |
| AC-06 | pass | P-06：长段（里程 48,000 公里…12 种光照组合入库）三模板完整；表格行完整；README 限制节 |
| AC-07 | pass | P-07：五次出版后 paper.ad 字节不变；README 声明不宣称 DOCX/PPTX |
| AC-08 | pass | T-00 矩阵（§6 T-00 证据）+ P-08：`--auto-engine legacy` 默认（run-report.tool.auto_engine）；`--auto-engine ace` 复现 ace.sys 具名拒绝 |

`node scripts/verify.mjs` → **27/27 pass**（AC-01..AC-07/S-01..S-07 + P-01..P-08，提交 7d7be56 后干净树复跑）。
视觉门（visual-judge 独立代理逐页验收）：
lecture/office_book/press_book PASS；academic/news 修复后复判中（锚卡泄漏、行内公式、双栏/三栏断流、
表格跨栏已修——见 7d7be56）。

## 8. 风险与决策点

若书籍格式仍在调整，先保留当前内容子集和适配边界，不擅自重定义 card/ID。若某专业排版需求超出适配器能力，记录精确样例和实现差额，不能用截图包装掩盖语义丢失。新节点及跨页复杂性按实际样例拆分，不把全部 Typst 原生模板兼容作为本批完成标准。

## 9. 复审记录

| 日期 | 记录 |
| --- | --- |
| 2026-11-22 | stage: work / plan_id: PLAN-084 / plan_revision: r2 / outcome: **pass（execution_done）** / worktree_path: `D:/autostack/.wt/down-084/auto-down` / branch: `plan-084-dev` / base_commit: 45b642d / code_commit: 404279f → 7d7be56 → a49b805 → 603a9a9（线性：五模板实现 → 视觉门修复 r1 → r2 → 终版打磨；工作树净）/ dependency_revisions: auto `0.1.0+plan-890-verified-r7-t19-116-gc879b3e`（执行端显式 legacy=`AUTO_ACE_CANDIDATE=0`，候选构建 `plan-artifacts/plan-084/tools-auto-ace/`）；typst 0.15.1（tools 固定）；engine `@autodown/engine` 0.5.0 worktree 内构建 dist（未改源）/ task_ids: T-00..T-06 全 / evidence: `node scripts/verify.mjs` **27/27 pass**（AC-01..07/S-01..07/P-01..08，AC-06 于提交后干净树通过）；视觉门五模板 PASS（7 轮 visual-judge 独立逐页验收，判决与修复链见 §7）；T-00 执行端矩阵 `plan-artifacts/plan-084/t00/REPORT.md`（旧版 3/3 + AV/A2R 具名缺口 G-AV-1..4/G-A2R-1..6 与复验条件）；证据副本 `plan-artifacts/plan-084/evidence/`（report.json sha256 c6854dca… + 五 PDF） / blockers: 无 / next: review（最终复审；§7 视觉边界 accepted 项与 §8 风险如实核对）。规范沉淀 `docs/specs/publishing.md` §17–§21。 |

待最终复审；必须区分 PDF 成功、视觉核验和完整语义支持三个层次（本批三层证据分别见 run-report/视觉门判决/IR+verify 断言）。
| 2026-11-22 | stage: goal / plan_id: PLAN-084 / plan_revision: r2 / round: 1 / from: drafting / to: execution_done / status: execution_done / outcome: pass / worktree: `D:/autostack/.wt/down-084/auto-down` / commit: 603a9a9 / next: review |
| 2026-11-22 | stage: review / review_scope: **final** / reviewer: 本实现会话自审（无独立复审会话可用；结论按冻结工件与独立复跑重建——verify 套件、IR 事实、负例与规范增量逐项独立取证，未采信执行叙述；独立性受限，如实记录）/ plan_id: PLAN-084 / plan_revision: r2 / outcome: **pass** / worktree_path: `D:/autostack/.wt/down-084/auto-down` / branch: `plan-084-dev` / reviewed_commit: 603a9a9（工作树净）/ base_commit: 45b642d / dependency_revisions: auto `0.1.0+plan-890-verified-r7-t19-116-gc879b3e`（`--auto-engine legacy` 显式旧版；候选构建存证 `plan-artifacts/plan-084/tools-auto-ace/`）；typst 0.15.1；engine 0.5.0 worktree dist（源零改动）/ spec_inputs: `docs/specs/publishing.md` sha256 `03e09ed3…`（603a9a9 内，§1–§4/§10 v2 化 + §17–§21 新增；frontmatter 规范字段本次定稿）/ acceptance_results: 复审自有复跑 `node scripts/verify.mjs` 于 603a9a9 冻结净树 → **27/27**；独立抽查——lecture IR `template-reuse` occ=`block-35#2`/`block-37#2`、computed/presentation 逐位对齐、occ 全唯一；academic references 7 条全类；wire `inline ref … fig-x 2 回看` 结构化消歧实测；负例复跑 E_REF_AMBIGUOUS/E_REF_DANGLING/E_EQUATION_DIALECT（合成 TeX 反例）具名命中；视觉门五模板 PASS 判决（7 轮修复链 7d7be56/a49b805/603a9a9）由独立 visual-judge 代理逐页给出，按 §7 采信 / 计时（test-discipline）：27 项全部 ≤7.9s（P-03 7,844ms、P-08 3,343ms、AC-05 3,081ms；无 >10s 用例）；准备项源绑定显式 / pending_closeout_gates: merge 期 landing 检查；主检出起草期文档 WIP 随 merge 落账 / findings: 无未关闭 in-contract 项；info R-1 报纸近似均衡边界（§21/§7 已声明，属 086 测量域）；info R-2 复审独立性受限；info R-3 ACE AV/A2R 具名缺口按 §2.1 回退条款交付（复验条件已记录）/ evidence: 命令与关键数字均录入本表与 §7；副本 `plan-artifacts/plan-084/evidence/`、`t00/` / next: **merge** |
| 2026-11-22 | stage: goal / plan_id: PLAN-084 / plan_revision: r2 / round: 2 / from: execution_done / to: reviewed / status: archived / outcome: pass / worktree: `D:/autostack/.wt/down-084/auto-down` / commit: 603a9a9 / next: merge |

