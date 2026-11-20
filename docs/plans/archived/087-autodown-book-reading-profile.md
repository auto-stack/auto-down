---
plan_id: PLAN-087
status: archived
completion_kind: delivered
feature_name: autodown-book-reading-profile
plan_revision: 2
current_step: 5
total_steps: 5
depends_on: []
affects: [auto-down, auto-reader, auto-ui]
new_spec_components:
  - docs/specs/book-reading.md
---

# PLAN-087 · AutoDown 书籍解析、卡片与只读组件

## 1. 目标

让同一章 AutoDown 正文能够整章通读、按卡选读、按稳定 ID 回到原段或句群。AutoDown 负责语法、解析索引、源稿回写及可嵌入的只读组件。AutoReader 的 READER-014 负责书包导入、目录、阅读进度、批注和视图切换。校订历史与拆并映射由内容仓维护，解析器保留作者 ID 并提供缺失或歧义诊断。

格式基准为 auto-reader-books 提交 `f972adf` 的 `docs/design/13-autodown-book-format.md`，书包修订为 `pilot-03`、格式标识为 `autodown-reading/1`。测试接受内容仓路径作为参数，随引擎保留最小测试夹具。该计划可与 PLAN-082 的 Auto 模板／Typst 原型并行实施；PLAN-084 选用真实书稿时可消费同一文档模型。

## 2. 架构方案

以 auto-down 的 `autodown/packages/engine` 为根。Auto 源 `auto/parser/markdown_parser.at` 中的 `parse_blocks`、`extractAnchorBlock` 和 `applyAnchorsDeep` 已能将段尾 ID 写入块。`auto/parser/serializer.at` 有对应的锚点序列化。新增书籍语义应复用 `block_model.at` 与现有生成流程，对 TypeScript 和 Rust/VM 交付相同的锚点及卡片结果。

现有 AutoUI 只读入口是 `autodown { content: … }`，可从 `autodown/demo/auto/src/front/app.at` 对照运行。Vue 的 `src/render/MarkdownRender.vue` 当前先执行 `stripAnchorTokens` 再调用 `parseDocument`。阅读模式必须在移除可见标记前采集持久 ID，并让组件提供按 ID 定位与选区回传；仅隐藏标记无法满足批注回访。

## 3. 技术栈

Auto 源、TypeScript/Vue、Rust/AutoUI VM，内容对照采用 pilot-03 的 UTF-8 文件和清单。

## 4. 需求分析与背景调查

2026-11-20，用户通过 `/goal 完成计划087` 授权实施、独立复审、原合同内修复、合并和归档。草案源为 AutoDown 的独立克隆分支 `plan/087-autodown-book-reading` 提交 `ce8b8d7e72e312c07f4e41ed884ec8ffc3132b8a`，该提交仅新增草案。执行采用主仓 `72b097006f34db3a871449f10e213820d51abef6` 作为基线，工作树 `D:/autostack/.wt/down-087/auto-down`，分支 `plan-087-dev`。内容仓绑定 `f972adfad5daccb88a4808da625957e96e2837d1`，已有检出且工作区干净。

2026-11-20，用户追加授权修改和合并 AutoUI 仓库。Vue 的 `StreamingRenderer` 代码生成入口和 VM 的 autodown 转换及事件都由该仓维护。AutoUI 工作树为 `D:/autostack/.wt/down-087/auto-ui`，分支 `plan-087-dev`，基线 `15fa7857a411707c44ceb6e1a37d1822808bef53`。AutoReader 仍按 READER-014 负责消费侧的正式书架接入。

## 5. 详细设计

读书模式显式启用。源稿及位置索引保留在同一个章结果。通读和卡的投影复用同一份正文，各取章内范围。选区以命中的持久段或句群 ID 携带引文和上下文，命中卡时另传卡 ID。已有 Markdown 接口维持原入口。

| 增量 | 操作 | 规范 | 变更与依据 | 验收 |
|---|---|---|---|---|
| SD-01 | 新增 | AutoDown `docs/specs/book-reading.md` | 记录读书语法、段/句群/卡的身份、诊断、序列化和双端入口。见书包格式 v1 | T-01～T-05 |
| SD-02 | 新增 | AutoUI `docs/specs/ui/autodown-reading.md` | 记录 Web 与 VM 同一属性和事件合同，并保留常规 Markdown 入口 | T-04 |

## 6. 测试设计

以固定书包的 .md 字节和清单 byte ranges 作独立预期，以每个目标的身份和可见文本作定位断言。另用测试夹具覆盖相邻/共享句群、跨段引用、转义、以代码或容器保护的同形标记、语法无效及流式待完成。双端既有入口分别验证。T-01～T-05 的实施与定向验收归 work，冻结后的独立判定归 review，合并与归档归 merge。

## 7. 验收标准

| 步骤 | 交付内容 | 可运行的验收 |
|---|---|---|
| T-01 固定真实输入与公共结果 | 冻结章结果所需字段：有序正文块、目标 ID 与类型、按声明顺序的卡及范围、带位置的诊断。定义章／卡投影、目标解析和选区到源锚的接口。既有 Markdown 的调用方式保持兼容 | 在 Web 和原生分别运行普通段锚读写基线；建立《管晏列传》《学而》《行宮》《长恨歌》的输入与期望结果 |
| T-02 扩展块与行内语法 | 识别顶层 `::card cid 卡题`、显式 `::card ^cid ^first..^last 卡题` 及单锚形式。空行保持自然段。支持 `[句群]{^sid}`、行内样式和合法转义。连续卡在下一卡、原书标题或文件末结束 | 围栏、缩进、引用、列表和行内代码中的示例维持字面意义；真实卡题不进入目录；普通横线不结束连续卡 |
| T-03 全章解析、输出与校订 | 章结束时统一解析前向和后向引用、允许卡与卡选文重叠；诊断重名、空卡、悬空、倒序及无效嵌套。提供源稿序列化、无标记 Markdown 导出及按卡取文。对齐 TS 与 Rust 输出 | 整章导出保留原段形和空行；改字、前插段、改卡题后持久 ID 仍相同。诊断定位到章、行及目标；流式输入完成前允许引用待解析 |
| T-04 接入既有只读组件 | 通过 AutoUI 的 `autodown` 在 Vue 与原生 VM 消费书籍章／卡投影。暴露目标跳转与选区事件，单独返回卡 ID、段或句群 ID、选文和上下文。确定已有组件可复用的属性及须新增的协议 | 双端从整章打开《学而》第三卡，仅显示“巧言令色”该则，回访仍在同一自然段；《管晏列传》的跨段卡可跳到第二段，导出的 Markdown 与参照一致 |
| T-05 全库回归与 Reader 交接 | 固定解析器、只读组件与原生消费入口的版本或提交，提供可重复运行的样章入口和全库对拍命令。输出兼容性与两端验证记录 | 全部 1,594 章、11 份卷首的 Markdown 与基准逐字节相同；8,946 张卡的有序 ID、题及正文一致。段 ID 共 26,796 个、句群 ID 3,697 个；19 项非学习材料可通读。在两端验证 T-04 后由 READER-014 验证真实书架至正文的全链路 |

首批夹具包括 `shiji/chapters/062.ad` 的跨段故事、`lunyu/chapters/001.ad` 的首段五卡、`tangshi/chapters/001.ad` 的作者与短诗、`tangshi/chapters/250.ad` 的长诗五卡，以及 `shiji/chapters/016.ad` 和 `043.ad` 的表略与缺卷。每章旁的同名 Markdown 可作独立对照。

READER-014 的书包导入/目录可与 T-01～T-03 并行，Reader 的正式通读、卡片和批注回访消费 T-04 的组件合同。

## 8. 执行步骤

当前会话若提供 TODO 工具，实施开始前登记下列稳定任务 ID。各项的验收见 §7。

- [x] T-01 固定真实输入与公共结果
- [x] T-02 扩展块与行内语法
- [x] T-03 全章解析、输出与校订
- [x] T-04 接入既有只读组件
- [x] T-05 全库回归与 Reader 交接

当前核对路径为书包 .ad → 读书结构索引和 Markdown 投影 → 既有 AutoDown 块树 → Vue 和 VM 只读组件。以同名 .md 文件和 book.json 的学习项、字节区间校验输出。定向用例另外覆盖作者锚、防误解析、章级引用、同段五卡、跨段回访及位置诊断。


T-01～T-03 以 AutoDown `b5bcf13` 验证。六份固定样章逐字节保真，句群、连续卡、前后向引用、修订重定位、UTF-16 非 BMP 偏移和待完成引用均有定向用例。由 `f972adf` 内容仓的 .md 和学习卡字节区间对拍。Web 组件的学而第三卡及跨段跳转、原生 VM 组件投影与 Iced 富文本拖选均已跑通，Vue 代码生成复跑通过。T-05 已核验同版双端入口与内容仓；待复审和合并。

## 9. 复审记录

- 基线 `72b0970`，`pnpm install --offline --frozen-lockfile` 成功（5.9 秒）。引擎现有 `block-parser.test.ts` 与 `serializer-roundtrip.test.ts` 共 109 项通过（测试 0.041 秒，总计 2.831 秒）。Rust `cargo test --locked --test smoke --test parse_parity` 共 6 项通过（构建 1.96 秒，分别测试 0.00/0.01 秒，总计 2.221 秒）。书包现有 `examples/reading-syntax/verify.py` 和 `tools/build_reading_sources.py --check` 成功（合计工具墙钟 4.212 秒）。无新增用例。

- stage: new | plan_id: PLAN-087 | plan_revision: r2 | outcome: pass | T-04 修改和合并范围经用户授权新增 auto-ui | next: work
- stage: goal | plan_id: PLAN-087 | plan_revision: r2 | round: 1 | from: new | to: work | status: executing | outcome: pass | worktree: D:/autostack/.wt/down-087/auto-down | commit: 72b0970 | next: work


- `stage: work checkpoint` ｜ `PLAN-087:r2` ｜ AutoDown `b5bcf13` ｜ T-01～T-03 closed ｜ Auto 生成器 `0.1.0+plan-890-verified-r7-t19-116-gc879b3e`（SHA-256 `EDDB2CCE50FD8AFE08CD26959C2FE52E090EB833B5C8B9A3F27538B28D947FCF`）｜ 全库双端 1,594 章、11 卷首、8,946 卡、26,796 段锚、3,697 句群和 19 非学习条目逐项通过，包装命令墙钟 7.015 秒。重跑前分别准备 esbuild 模块和 Rust debug 示例，无隐式编译。工作过程较慢的全库测量为 112.921、57.366、10.301 和 11.389 秒，已通过避免重复解析、将表格触发扫描降为线性，以及并行运行每组 3 部作品降到 7.015 秒。单部作品范围 0.140 至 2.518 秒。原生正常 Markdown 基线加 UTF-16 定向回归共 7 项通过，构建 0.84 秒，墙钟 1.102 秒。

- stage: work | plan_id: PLAN-087 | plan_revision: r2 | outcome: pass | worktrees: D:/autostack/.wt/down-087/auto-down and auto-ui | branch: plan-087-dev | bases: auto-down 94d190d, auto-ui 68ff80f0 | commits: auto-down 7bb7b35c0ddddb01a9e8566d62805ae0239934a7, auto-ui 8bf77ecc8b737885bf650593d879655f84a291cd | dependencies: content f972adf, auto-lang 89f702282, auto-web 26d085f | task_ids: T-01..T-05 | next: review
- 两仓基线推进后在各自身工作树变基，`git range-diff` 确认代码补丁相等（AutoDown 630f5d4/b5bcf13 → d5f5b1d/7bb7b35；AutoUI da10cd81 → 8bf77ecc）。代码、验收脚本和夹具的内容绑定不变。
- Web `vitest run --reporter=verbose` 定向运行 book-reading、book-reading-view、serializer-roundtrip 和 block-parser 共 122 项，墙钟 4.846 秒，Vitest 发现与转换 0.551 秒、收集 2.39 秒、用例 0.090 秒。新增 13 项按输出顺序为六样章 4/1/1/1/1/1 ms、同段五卡选区 2 ms、修订跨段 1 ms、Markdown 字面保护 1 ms、引用与错误 1 ms、嵌套格式 0 ms、实际 Vue 第三卡拖选/回访 26 ms、跨段目标 6 ms。日志 `web-work.log` SHA-256 `5768ae324de0a2a818d743c925fe0a3be48aa0748aca2a4635fadc5cac68ea0a`，毫秒数为测试工具观测值。
- 原生引擎 `cargo test --locked --test book_reading --test parse_parity --test smoke` 七项通过，含新 UTF-16/CRLF/代码字面量与待引用用例。构建 0.84 秒，测试目标分别 0.00/0.01/0.00 秒，墙钟 1.102 秒。
- AutoUI 明确准备 `cargo test --locked --offline -p auto-ui-runtime -p auto-ui-compiler --features auto-ui-runtime/autodown,auto-ui-runtime/ui-iced --lib --no-run`（1m42s），执行准备好的原生二进制筛选新用例。VM 两章卡片、持久锚定位和回传 0.749 秒；Iced 真实富文本跨样式拖选消息 1.844 秒。Vue DSL 绑定与消息生成单例退出 0，准备 1m34s，墙钟 0.337 秒。未跑无关额外测试。
- 全库命令 `node scripts/verify-book-reading.mjs <book-repo> <prepared-parser> <prepared-rust-example>` 双端通过，7.015 秒，见上文 12 部计数，卷首及 19 非学习条目均进整章。原始 `corpus-parallel.log` SHA-256 `c345565f03e017f2302138e637de77c4106bfc00ef2e2475d247e03911b12653`。Reader 正式书架消费仍归 READER-014，本计划交接版本绑定到上面成对提交。
- stage: goal | plan_id: PLAN-087 | plan_revision: r2 | round: 2 | from: work | to: review | status: execution_done | outcome: pass | worktree: D:/autostack/.wt/down-087/auto-down | commit: 7bb7b35 | next: review

- stage: review | review_scope: final | reviewer: 本会话，未分配独立复审人；从冻结 diff、实际入口、留出用例和变异结果重建判断 | plan_id: PLAN-087 | plan_revision: r2 | outcome: pass | worktrees: D:/autostack/.wt/down-087/{auto-down,auto-ui} | branch: plan-087-dev | reviewed commits: 7bb7b35c0ddddb01a9e8566d62805ae0239934a7 / 8bf77ecc8b737885bf650593d879655f84a291cd | bases: 94d190d / 68ff80f0 | dependencies: auto-lang 89f702282, auto-web 26d085f, corpus f972adf | findings: 无未关闭项 | next: merge
- T-01/T-02：对比两轨入口，均从同一 Auto 源生成书籍解析，旧普通 Markdown 入口仍经标准模式。检查六样章、构造嵌套、代码/引用/列表、非法卡头和空连续卡断言。新留出输入同时含前向混合端点、横线持续入卡、标题结束连续卡、带强强调的非 BMP 句群。范围和引文验证通过。
- T-03：留出输入前插段并改尾段，原 ID 命中且卡内容更新。CRLF 原稿回写一致，观察终态未知目标、歧义与倒序的定向断言。初次留出探针将“𠮷”的范围误写为 8..10，校正为 7..9 后字符串及段内前后文通过，探针输入错误，无产品改动。
- T-04：Web 的 `StreamingRenderer` → BookReadingView 真实 DOM 指针释放与滚动动作用例、VM 的 `autodown` 组件入口 → 原生 Rich 和 ScrollAnchorMark → Iced 先前实测可复用，已核对签名以及 Vue 代码生成对单 JSON 载荷的路由。第三卡及跨两段落点均有覆盖，旧入口走原渲染路径。
- T-05：复用同输入及补丁的双端全部对拍。复审在临时副本实际改动《学而》预期 .md 的内容，参数化全库命令按预期对该章返回 1 并定位 `Web chapter: lunyu/chapters/001.ad`。节点留出业务新用例 0.003 秒，留出、复制、变异、启动及失败传播合计 0.258 秒。未新增持久测试。本会话没有使用旧用例重跑替代合并自有的受影响回归。
- SD-01 AutoDown `docs/specs/book-reading.md` SHA-256 `f01d2ed27b3118dc6db342e98075e6cb2e5e317a62113a33e900b487e49e4a5f`；SD-02 AutoUI `docs/specs/ui/autodown-reading.md` SHA-256 `172032a653fd0e77ae7b8e4982c60b3d1a834424cabb4f85e49ae5e50420c99c`。两处规则与组件协议、构建准备和代码一致；两仓变更未写历史 JSON 账本和手工索引。
- stage: goal | plan_id: PLAN-087 | plan_revision: r2 | round: 3 | from: review | to: merge | status: reviewed | outcome: pass | worktree: D:/autostack/.wt/down-087/auto-down | commit: 7bb7b35 | next: merge

- 合并前发现 AutoUI master 已落地 PLAN-109（68ff80f0 → af0a06a2）。AutoUI 工作树变基 8bf77ecc → 378a36c15d45714c39f69ee7f6249196293d6413。唯一冲突为 view.rs 的两个相邻定义插入，同步保存上游 ButtonKeyboard 的全部方法以及 PLAN-087 RichSelectionCallback。range-diff 仅上下文位置变化。原 AutoUI 复审票据留存，变基后复跑受影响的 Vue 生成、VM 组件、滚动控制器和 Rich 相关验证再重新签票。AutoDown 未变，已验收证据照常有效。
- stage: review | review_scope: final | plan_id: PLAN-087 | plan_revision: r2 | outcome: pass | final commits: AutoDown 7bb7b35c0ddddb01a9e8566d62805ae0239934a7 and AutoUI 9bdbbcf859e5185335014425af5e74f5512e8c29 | scope: PLAN-109 集成后的 AutoUI 受影响路径复审、同一会话声明沿用 | next: merge
- 复审确认 `view.rs` 仅相邻定义冲突。PLAN-109 的 ButtonKeyboard 与 087 的选区回传均保留。AutoUI 复跑基线 `378a36c1` / `af0a06a2`，后来主分支仅有 PLAN-109 归档文档 `fc4a173e`，变基 `378a36c1` → `9bdbbcf8`，range-diff 相等。代码、配置、规范和输入均无变化，复用此次实测。
- merge 受影响回归（debug/test）：AutoDown `pnpm exec vitest run src/parser src/render --maxWorkers=3`，32 文件 / 436 项全过，Vitest 7.87 秒，墙钟 9.403 秒；Rust `cargo test --locked --offline --all-targets`，17 项全过，墙钟 1.642 秒。Web 与 Rust 的原始日志散列分别为 `7a2e7c3f720f5e7c9c2bff2669455e82c351d8783ca57a28f77abb6e1535125d` 和 `fa5ce7941cc7b85251468b01f53eb24c565d12fdfbfb36be6709759db482c7d9`。
- AutoUI 的 `cargo test --locked --offline -p auto-ui-runtime -p auto-ui-compiler --features auto-ui-runtime/autodown,auto-ui-runtime/ui-iced --lib --no-run` 准备 93.804 秒。运行编译器的 `::autodown test_autodown schema::tests plan087_` 25 项全过，墙钟 0.460 秒。运行 runtime 的 `autodown_render::tests autodown_widget_true_render scroll::controller::tests scroll_anchor::tests selectable_text::tests plan087_ keyboard` 56 项过，墙钟 2.796 秒。两项既有 release 专用性能基线保留 ignored（`autodown_perf_baseline_1mb` 和 `autodown_stream_perf_guard_300x30`）；其它过滤掉的例数分别 1,154 和 2,743。准备、执行及直接补测由本计划显式拆开。计划 1051 自 18:39:22 运行 ACE 固定组，等待其结束后 18:43:33 启动本计划回归。两个 UI 日志 SHA-256 为 `2f1138d8d136d72f6c731e27d00a37c799d7bf6a2ebe0f8b184b2d724bdba8f3`（VM）和 `77b220231205165d99993b38b03f86cc215623223dda4a70b2fffbfc464f1c20`（生成）。
- stage: goal | plan_id: PLAN-087 | plan_revision: r2 | round: 4 | from: review | to: merge | status: reviewed | outcome: pass | worktree: D:/autostack/.wt/down-087/auto-ui | commit: 9bdbbcf8 | next: merge
- merge prepared：两仓冻结提交和 SD-01 / SD-02 的 SHA-256 均见上。主分支代码变更范围与两组当前内容已核对，继续快进落地。
- merge landed and canonical_verified：AutoDown `94d190d → d5f5b1d → 7bb7b35`、AutoUI `fc4a173e → 9bdbbcf8` 分别通过 `git merge --ff-only plan-087-dev`。各自 `master` tip 与评审交付哈希一致，两个规范路径的 SHA-256 与复审记录一致。快进完成后的 AutoDown 主检出书籍解析及 Vue 交互 13 项通过（墙钟 5.191 秒），Rust Unicode 与待引用用例 1 项通过（debug 构建 1.17 秒，墙钟 1.318 秒）。AutoUI 从主检出复跑已准备的同源码 Vue 生成 1 项（0.156 秒）与 VM 书籍视图、Iced 拖选 2 项（0.767 秒），返回成功。AutoUI 主检出既有文档状态与落地前的列表相同。
- merge archived：五项任务全过，`current_step: 5`、`total_steps: 5`，计划目录链接迁至本归档，待清理专用工作树和已折叠证据。
## 10. 待澄清事项

无待定授权。
