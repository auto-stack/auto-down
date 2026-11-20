---
plan_id: PLAN-087
status: executing
feature_name: autodown-book-reading-profile
plan_revision: 2
current_step: 3
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
| SD-02 | 修改 | AutoUI 内的 autodown 组件规范 | 记录 Web 与 VM 同一属性和事件合同，并保留常规 Markdown 入口 | T-04 |

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
- [ ] T-04 接入既有只读组件
- [ ] T-05 全库回归与 Reader 交接

当前核对路径为书包 .ad → 读书结构索引和 Markdown 投影 → 既有 AutoDown 块树 → Vue 和 VM 只读组件。以同名 .md 文件和 book.json 的学习项、字节区间校验输出。定向用例另外覆盖作者锚、防误解析、章级引用、同段五卡、跨段回访及位置诊断。


T-01～T-03 以 AutoDown `b5bcf13` 验证。六份固定样章逐字节保真，句群、连续卡、前后向引用、修订重定位、UTF-16 非 BMP 偏移和待完成引用均有定向用例。由 `f972adf` 内容仓的 .md 和学习卡字节区间对拍。Web 组件的学而第三卡及跨段跳转、原生 VM 组件投影与 Iced 富文本拖选均已跑通，T-04 尚待 Vue 代码生成回归复跑。T-05 正等待冻结提交的最终绑定。

## 9. 复审记录

- 基线 `72b0970`，`pnpm install --offline --frozen-lockfile` 成功（5.9 秒）。引擎现有 `block-parser.test.ts` 与 `serializer-roundtrip.test.ts` 共 109 项通过（测试 0.041 秒，总计 2.831 秒）。Rust `cargo test --locked --test smoke --test parse_parity` 共 6 项通过（构建 1.96 秒，分别测试 0.00/0.01 秒，总计 2.221 秒）。书包现有 `examples/reading-syntax/verify.py` 和 `tools/build_reading_sources.py --check` 成功（合计工具墙钟 4.212 秒）。无新增用例。

- stage: new | plan_id: PLAN-087 | plan_revision: r2 | outcome: pass | T-04 修改和合并范围经用户授权新增 auto-ui | next: work
- stage: goal | plan_id: PLAN-087 | plan_revision: r2 | round: 1 | from: new | to: work | status: executing | outcome: pass | worktree: D:/autostack/.wt/down-087/auto-down | commit: 72b0970 | next: work


- `stage: work checkpoint` ｜ `PLAN-087:r2` ｜ AutoDown `b5bcf13` ｜ T-01～T-03 closed ｜ Auto 生成器 `0.1.0+plan-890-verified-r7-t19-116-gc879b3e`（SHA-256 `EDDB2CCE50FD8AFE08CD26959C2FE52E090EB833B5C8B9A3F27538B28D947FCF`）｜ 全库双端 1,594 章、11 卷首、8,946 卡、26,796 段锚、3,697 句群和 19 非学习条目逐项通过，包装命令墙钟 7.015 秒。重跑前分别准备 esbuild 模块和 Rust debug 示例，无隐式编译。工作过程较慢的全库测量为 112.921、57.366、10.301 和 11.389 秒，已通过避免重复解析、将表格触发扫描降为线性，以及并行运行每组 3 部作品降到 7.015 秒。单部作品范围 0.140 至 2.518 秒。原生正常 Markdown 基线加 UTF-16 定向回归共 7 项通过，构建 0.84 秒，墙钟 1.102 秒。

## 10. 待澄清事项

无待定授权。
