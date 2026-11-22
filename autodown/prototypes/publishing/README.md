# AutoDown 出版原型（PLAN-082 / PLAN-083 / PLAN-084）

普通 Auto 模板 → 版本化出版 IR → Typst → PDF 的可运行原型。PLAN-082 建立
`.ad` → 模板求值 → IR → Typst → PDF 闭环（[Design 10 §14](../../../docs/designs/10-autodown-publishing.md) P0/P1）；
PLAN-083 在其上补结构化样式与呈现规则（Design 10 §6–7）；PLAN-084 交付
**五类出版模板**（论文 / 办公书籍 / 出版书籍 / 基础报纸 / 静态演示）与
编号、引用、脚注、公式、资源语义（Design 10 §8、§10–11）：

- 视图（article/book/newspaper/slides）与模板分工：视图选择与组织材料（slides 选取
  作者标注的分镜），模板决定页面与呈现；切换视图/模板不改写正文；
- occurrence：模板/视图展开后的内容树逐块唯一标识（首次 `id`、复用 `id#N`）；
  同一语义块可复用两次，引用歧义显式报错或用 `id#N` 消解；
- 文档索引与引用作用域：`[文字](#id)` 节点引用、`[文字](@key)` 文献引用、
  `[^label]` 脚注；悬空/未知/重复/歧义具名可定位（`E_REF_DANGLING` 等）；
- 标准节点：outline、ref、figure/caption、equation（dialect 受检查）、footnote、
  bibliography（固定输入格式 + 编号风格）；编号映射 Typst 内置计数器，按出版树
  逻辑顺序；
- 资源清单（`resource-manifest.json`）：引擎/工具版本、字体集合（缺失给
  `W_FONT_MISSING`）、图片内容哈希；非法路径与缺失资源产生可见诊断。

本目录是实验入口，**不是**已冻结的 API：实时预览与延迟布局随 085–086 调整。

## 数据流

```
samples/*.ad (+ style-rules.json)
  → host/doc-parse.mjs      现有 @autodown/engine parser（dist/parser.js）解析为块模型
                            （PLAN-084：链接 span→ref/cite、math_inline→行内公式、
                             图片段→figure、[^x]: →脚注定义、bibliography 提示→文献条目）
  → host/wire.mjs           doc-wire v2（行协议；v1 兼容——082 样例仍可跑）
  → host/style-wire.mjs     --doc-styles JSON → STYLEWIRE 1（文档规则 + 节点显式属性）
  → templates/main.at       薄入口（env 输入 / stdout 输出；见下文 VM 缺陷记录）
      templates/style.at    样式值类型/校验/注册表、选择器、逐属性合成、作用域、匹配日志
      templates/render.at   视图投影、occurrence 赋值、引用作用域校验、呈现规则应用
      templates/ir.at       类型、doc-wire v1/v2 解码、publication-ir-v2 序列化
      templates/academic.at / office_book.at / press_book.at / news.at / lecture.at
                            五个普通 Auto 模板（规则声明式）
  → publication.json        publication-ir-v2（view/occ/computed/presentation/references）
  → host/emit-typst.mjs     presentation × computed 逐块发射 + 能力诊断 + style-inspect.json
  → typst compile           publication.pdf
```

宿主只做解析、校验、Typst 序列化与编译；模板投影、样式合成与呈现选择全部由 Auto 执行。
每个 occurrence 的最终样式带逐属性采用链（`computed[].sources`），
`style-inspect.json` 提供同一数据的面板友好视图；后端不支持的属性（如
`doc.hanging_punctuation`）产生 `W_STYLE_UNSUPPORTED` 诊断并保留在 IR，不静默丢弃。

## 运行

前置：`auto` 在 PATH（或用 `PLAN082_AUTO` 指定），Node ≥ 20，Python 3 + pymupdf/pypdf（仅验收脚本用）。

```powershell
cd autodown/prototypes/publishing

# 1) 准备固定版本 Typst CLI（0.15.1）
node scripts/fetch-typst.mjs

# 2) 论文模板（双栏）
node host/publish.mjs --source samples/research.ad --template academic --out out/academic

# 3) 办公书籍模板（单栏、页眉、章节另起页）
node host/publish.mjs --source samples/research.ad --template office_book --out out/office_book `
  --header-text "AutoDown 排版原型"

# 4) 出版书籍（封面/前言/目录/章节另起页）
node host/publish.mjs --source samples/paper.ad --template press_book --out out/press

# 5) 基础报纸（三栏正文、跨栏文章标题）
node host/publish.mjs --source samples/paper.ad --template news --out out/news

# 6) 静态演示（16:9 分镜页；同一正文）
node host/publish.mjs --source samples/paper.ad --template lecture --out out/lecture

# 7) 参数覆盖（验证模板参数真实生效）
node host/publish.mjs --source samples/research.ad --template academic --out out/academic-param `
  --columns 1 --font-size 12pt --margin 3cm
```

参数与适用性（不静默忽略：不可用组合直接报错）：

| 参数 | 适用模板 | 行为 |
| --- | --- | --- |
| `--source` / `--out` / `--template` / `--font-size` | 全部 | 源文件、输出目录、模板名、字号（长度如 `10pt`） |
| `--view` | 全部 | `article`/`book`/`newspaper`/`slides`（默认随模板） |
| `--paper` | a4 类全部 | `a4`/`a5`/`iso-b5`/`us-letter`/`16:9`（lecture 默认 16:9 = 297×167.0625mm）；其它值校验期 `E_IR_SCHEMA` |
| `--columns` | academic/news 1..3；office_book/press_book/lecture 仅 1 | 显式给出不可用值返回 `E_OPTION_UNSUPPORTED` |
| `--margin` | 全部 | academic 四边统一；office_book 未给出时保留 `3cm/2.6cm` 非对称默认，给出时四边统一 |
| `--header-text` | 非 lecture | 页眉只出现在正文页（标题页保持干净）；press_book/news 默认取书名 |
| `--auto-engine` | 全部 | `legacy`（默认，已验旧版 VM 车道）/ `ace`（当前构建默认脚本车道；其对本模板形态的具名缺口见“执行端”） |

文档侧样式（`--doc-styles samples/style-rules.json`）：

```json
{ "rules": [ { "name": "doc-sub-emph", "origin": "document", "scope": "block-4",
               "order": 1, "selector": { "kind": "type", "type": "paragraph" },
               "props": { "text.size": "13pt" } } ],
  "explicit": [ { "id": "block-1", "props": { "text.size": "15pt" } } ] }
```

- 规则层：内置(0) < 主题(1) < 模板(2) < 文档规则(3) < 节点显式(4)；同层按作用域深度、
  后声明优先；逐属性合成（未设置的属性不覆盖）。
- 作用域：`scope` 为标题 NodeId 时规则覆盖该标题子树（含锚点，止于下一个同级或更高级标题），
  离开子树即恢复；`""` 为全文档。
- 选择器：`type` / `attr`（kind|level|callout_type）/ `id` / `role`（callout 的语义角色，
  如 theorem/tip/slide）/ `and` / `or`（子项限终端选择器）。
- 呈现规则（模板声明，普通 Auto 函数按名字派发）：每个 occurrence 取最高优先级一条；
  `aside-note` 演示显式 next 委托；`echo-heading`（`templates/render-guard-demo.at`）演示
  递归保护 `W_RENDER_RECURSION_GUARD`。装饰块（“第N章”“定理 N”）不进入目录，目录永远
  由语义标题生成；编号按出版树（内容）顺序。

正文书写约定（PLAN-084，全部建立在 parser 冻结合同之上）：

- 稳定锚：段尾 ` ^id`（parser 原生）；公式等无法承载段尾锚的节点用**锚卡**——
  独立一行 `^id` 紧随其后，重命名前一块；
- 引用：`[显示](#目标id)`；文献引用：`[显示](@文献键)`；脚注：正文 `[^label]` +
  定义行 `[^label]: 文字`；文献条目：`$callout(type: "bibliography")` 内一行一条
  `键: 条目文字`；分镜：`$callout(type: "slide", title: "页题")` 内每行一个要点，
  分镜之后的段落/图表/公式附属该页。

诊断用：`--auto-entry`（替换 Auto 入口，负例用）、`--doc-wire-version`、`--inject-typst-error`（故障注入）、
`--font-path`、`--skip-pdf`、`--doc-styles`。

每次运行的 `<out>/run-report.json` 记录命令、退出码、各阶段耗时、产物 sha256、Typst 查询到的实际配置与诊断。
生成物：`doc.wire`、`request.txt`、`publication.raw.json`（Auto 原文）、`publication.json`（校验后）、
`publication.typ`、`publication.map.json`、`publication.pdf`、`resource-manifest.json`、
`style-inspect.json`、`run-report.json`（图片资源按 `assets/…` 相对路径拷入输出目录）。

## 执行端（PLAN-084 §2.1 / AC-08）

当前 `auto` 构建（2026-11-19，含 ace-candidate）的**脚本面默认已是 ACE sys 车道**；
出版接口默认显式选择已验**旧版 VM 车道**（`--auto-engine legacy` = `AUTO_ACE_CANDIDATE=0`）。
两个新执行端对本模板形态的具名缺口（2026-11-22 实测，最小复现与矩阵见 PLAN-084 §7 T-00）：

- **ACE AV console/sys**：脚本车道无 record 声明（`type` 被拒）、无多模块导入、sys 车道
  无 `str.split`/`.to(str)`——模板逻辑不可承载（`--auto-engine ace` 可复现具名拒绝）；
- **新版 A2R**（scalar 前门）：缝合单文件（`node host/stitch-entry.mjs --mode a2r --out <file>`）
  可完整 transpile（record/List/str 方法全部生成），但生成 Rust 编译失败
  （82 错误/6 类：str→int 裸 cast、参数列表 for-in、引用后赋值、derive、typed-main）。

上游补齐后复跑同一验收（`node scripts/verify.mjs` + T-00 envelope 对照）再切换执行端。

## 验收

```powershell
node scripts/verify.mjs       # AC-01..AC-07 + S-01..S-07 + P-01..P-08；产物在 out/verify/report.json / report.md
```

脚本会真实运行 Auto（探针 + 样式探针 + 五个模板 + 参数变体 + 负例 + 递归保护负例），
调用 Typst 编译并用 PDF 文本/几何/**字号分布**检查正文一致性、栏结构、字面量与
样式真实生效（作用域覆盖/恢复、显式属性），断言 `style-inspect.json` 来源链、
后端能力诊断、引用/脚注/文献编号与 occurrence 复用，最后跑现有 engine parser
的限定测试（block-parser + serializer-roundtrip）。

## 固定版本

| 组件 | 版本/来源 | 记录位置 |
| --- | --- | --- |
| Typst CLI | 0.15.1（官方 release zip，sha256 `19ce3551…6736`；下载不可用时 `cargo install typst-cli --version 0.15.1 --locked`） | `scripts/fetch-typst.mjs`、`run-report.json:tool.typst` |
| Auto | `auto 0.1.0+plan-890-verified-r7-t19-116-gc879b3e`（本机 PATH，2026-11-19 构建） | `run-report.json:tool.auto` + `tool.auto_engine` |
| Node | v25.2.1（验收时） | `run-report.json:tool.node` |

字体：`typst fonts` 可见的系统中文字体被直接使用，默认 `Noto Serif SC` / `Noto Sans SC`；
换字体用 `--font-path` 指向字体目录。请求的字族会与 `typst fonts` 清单核对，
不在清单的家族产生 `W_FONT_MISSING`（typst 自行回退渲染，诊断可见），
记录在 `resource-manifest.json` 的 `fonts` 节。

## 计时（本机 2026-11-14/22，Windows，A4 两页样例）

数字取自 `node scripts/verify.mjs` → `out/verify/report.md`（AC-07 冷/热两轮）：

| 阶段 | 实测区间 | 说明 |
| --- | --- | --- |
| 解析 .ad（engine parser） | 5–9 ms | Node 内消费 engine dist |
| Auto 求值（VM 脚本） | 323–431 ms | 含 auto.exe 进程启动与全量 IR 序列化 |
| Typst 编译 | 90–106 ms | 固定版本 CLI，含字体发现 |
| 合计 | 500–641 ms | 冷/热各一轮（`report.json` AC-07）；不宣称实时性，热更新与缓存属 085 |

两次运行的 `.typ` sha256 相同（可重跑）；PDF 含创建时间，不建议按字节比对。

## 限制（原型边界，逐项有诊断或测试）

- **输出格式边界（AC-07）**：五种输出均为 **PDF**；“办公风格”**不宣称**可编辑 DOCX，
  “演示”**不宣称**可编辑 PPTX；PDF 幻灯片不宣称 Office 兼容。屏幕交互图表的 print fallback
  由节点/模板声明并留诊断（本批未含交互图表）。
- **报纸边界**：首轮仅多栏正文、跨栏一级标题（文章标题）、图表区域；任意文本框串文、
  复杂绕排、印前拼版不在本批。**演示边界**：静态 16:9 分镜（一页一分镜）；分步动画、
  备注面板、播放器不在本批。
- 正文白名单：标题、段落、列表、表格、提示块（`$callout`）、分隔线、数学块（`%{ %}`）、
  图片段、脚注定义行、文献条目；其余节点（代码围栏、mermaid、details、引用/嵌入等）
  **显式报错** `E_NODE_UNSUPPORTED` 并给出 NodeId，不静默丢弃。
- 行内普通标记（加粗/斜体/行内代码）压平为文本并产生 `W_INLINE_MARKS_FLATTENED`；
  结构化行内语义（ref/cite/footnote/行内公式）保留在段落 `segments`；容器（列表项/
  提示正文/表格单元）内的链接/公式压平为文本并给 `W_INLINE_IN_CONTAINER_FLATTENED`；
  外部链接压平为“文字（URL）”并给 `W_LINK_EXTERNAL_FLATTENED`。
- 图片段：一段一图（首图生效，多图给 `W_FIGURE_EXTRA_IMAGES`）；图片与 ref/cite/脚注/
  行内公式混排给 `E_FIGURE_MIXED_INLINE`（作者拆段）。图片文件从正文目录拷入输出目录；
  缺失给 `W_RESOURCE_MISSING`（Typst 编译会如实失败），越界路径给
  `W_RESOURCE_PATH_ILLEGAL` 且不拷贝。
- 公式：dialect 字段保留原始来源；当前唯一 dialect 是 `typst`（engine `$..$`/`%{ %}` 槽）。
  非 typst dialect（TeX/KaTeX）在序列化层 `E_EQUATION_DIALECT` 具名拒绝；源含 `#`/`$`
  （会逃出 Typst 数学模式）给 `E_EQUATION_SYNTAX`——未转换项必须报错，不粘贴混用。
  完整 TeX 转换器不在本批。
- 文献：固定输入格式（`键: 条目文字` 一行一条）+ 固定编号风格（声明顺序 [1..n]，引用上标
  [n] 链接）；**不宣称**完整 CSL/期刊格式兼容。
- 引用作用域：ref 目标 = 块 id（heading/figure/equation）；同 id 复用时未限定引用给
  `E_REF_AMBIGUOUS`（列出全部 occurrence），显式 `#id#N` 消解；cite 目标 = 文献键；
  脚注按 label 配对。文献/脚注定义不出现在正文流（脚注在标记处展开，文献在文末汇总）。
- 样式 v1 边界：属性注册表 15 项（`doc.hanging_punctuation` 为后端不支持示例，显式诊断）；
  `and/or` 选择器子项限终端（不嵌套复合）；无 CSS specificity/important；主题层为原型内置
  `theme-print-ink` 一条；渲染函数按名字 if/else 派发（当前 VM 无函数值）。
  显式样式按 occurrence 展开（同一语义块的每次出现都获得该属性）。
- **office_book/press_book 可见变化**：一级标题由呈现规则渲染为“第N章 标题”
  （编号按出版树顺序，含模板前言），h2/h3 不再带 Typst 原生编号（一个层级的编号被呈现规则
  接管时，后端嵌套计数与呈现编号冲突——实测出现 “0.1.”；层次编号后续计划再评估）。
  academic 仍用 Typst 原生 “1.1” 编号。无编号模板（news/press 章节、lecture 分镜）中的
  标题引用退化为文本链接（`#link`，语义 ID 与 label 保留）。
- slides 视图：仅选取 slide 分镜材料（首个分镜之前的内容给 `W_SLIDES_UNPLACED` 后不投影，
  不静默）；lecture 模板的总结分镜显式复用正文首个图/式（`origin=template-reuse`，
  occurrence `#2`）。演示材料必须作者标注；自动摘要/改写不是模板副作用。
- 只保证块级来源映射（occurrence → Typst 行范围）；字符级与双向预览定位属 085。
- Auto 侧限制（实测，2026-11-14/17/22）：`json.encode`/`decode` 在该构建的 stdlib provider 缺 callee，
  所以 IR 由手写 JSON 序列化生成；`str.len()/sub()` 以 UTF-8 字节为单位，按字符遍历必须自己算宽度
  （中文数字等必须用列表索引而非 `sub`）；`split()` 产物是 DStr，先 `.to(str)` 再取子串；
  记录为引用语义——渲染/复用必须经 `pub_copy` 构造新块，不得原地改写内容块。
- **本机 auto VM 缺陷（2026-11-17 实测，已规避并记录，交 auto-lang owner）**：
  (a) 入口文件 `use file` 时，被调模块中部分“字段比较/内部子函数调用”形态的函数被错误编译
  （`compose_styles` 来源链出现幻影条目、校验函数返回错值；不导入 file 则全部正确；
  最小复现 8 行，见 PLAN-083 §7）——因此 `main.at` 改为 env 输入 / stdout 输出，
  整个 Auto 调用图不导入 `file`，I/O 由宿主承担（env 通道容量上限约 32K 字符/变量——
  research 级正文无碍，超大正文需换通道，见规范 §15）；(b) `Length` 是内置类型名（样式长度类型改名
  `StyLength`）、`view`/`pub` 为保留字（084 的视图字段因此命名 `view_name`，wire 键仍为 `view`）；
  (c) float 跨模块序列化路径不稳定
  （探针 1/5 出现 4294967xxx 类乱值与空串）——样式值层全整数 milli 定标；
  (d) `bool.to(str)` 出现内存损坏——样式记录一律 int 标志（-1=未设置）。

## 与后续计划的交接

- 084（本批）：五类模板、编号/引用/脚注/公式/文献、occurrence 与文档索引、资源清单、
  执行端矩阵与具名缺口（见“执行端”）。
- 085（预览与来源）：`publication.map.json` 给出 occurrence→Typst 行范围；`style-inspect.json`
  已是面板可消费数据（含 references 解析表）；会话/revision/字符定位未实现。T-00 的执行端
  矩阵与输入通道事实（env 仅旧版可用；sys 车道 stdin 仅文本入口形态）交 085 复用。
- 086（延迟布局）：编号/目录/页码已映射 Typst 内置计数器与 context；Auto 回调 lowered 到
  布局阶段未实现；实际计数器与查询对象按 084 的 occurrence/文档索引形态交接。
