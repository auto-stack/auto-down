# AutoDown 出版原型（PLAN-082 / PLAN-083）

普通 Auto 模板 → 版本化出版 IR → Typst → PDF 的可运行原型。PLAN-082 建立
`.ad` → 模板求值 → IR → Typst → PDF 闭环（[Design 10 §14](../../../docs/designs/10-autodown-publishing.md) P0/P1）；
PLAN-083 在其上补结构化样式与呈现规则（Design 10 §6–7）：类型化样式值、
逐属性合成（内置/主题/模板/文档规则/节点显式五层）、标题子树作用域、
选择器（type/attr/id/role/and/or）、呈现规则（定理框/侧注委托/章节标题）与
`inspect_style` 数据接口。

本目录是实验入口，**不是**已冻结的 API：模板语义、实时预览与延迟布局随 084–086 调整。

## 数据流

```
samples/*.ad (+ style-rules.json)
  → host/doc-parse.mjs      现有 @autodown/engine parser（dist/parser.js）解析为块模型
  → host/wire.mjs           doc-wire v1（行协议，字段转义）
  → host/style-wire.mjs     --doc-styles JSON → STYLEWIRE 1（文档规则 + 节点显式属性）
  → templates/main.at       薄入口（env 输入 / stdout 输出；见下文 VM 缺陷记录）
      templates/style.at    样式值类型/校验/注册表、选择器、逐属性合成、作用域、匹配日志
      templates/render.at   呈现规则应用（最高优先级单命中、next/default 委托、递归保护）
      templates/ir.at       类型、doc-wire 解码、publication-ir-v1 序列化
      templates/academic.at / office_book.at   两个普通 Auto 模板（规则声明式）
  → publication.json        publication-ir-v1（computed/presentation/来源链；宿主校验后落盘）
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

# 4) 参数覆盖（验证模板参数真实生效）
node host/publish.mjs --source samples/research.ad --template academic --out out/academic-param `
  --columns 1 --font-size 12pt --margin 3cm
```

参数与适用性（不静默忽略：不可用组合直接报错）：

| 参数 | 适用模板 | 行为 |
| --- | --- | --- |
| `--source` / `--out` / `--template` / `--font-size` | 两者 | 源文件、输出目录、模板名、字号（长度如 `10pt`） |
| `--paper` | 两者 | `a4` / `a5` / `iso-b5` / `us-letter`（Typst 0.15.1 实测值）；其它值校验期 `E_IR_SCHEMA` |
| `--columns` | academic 1..3；office_book 仅 1 | office_book 显式给出 ≠1 时返回 `E_OPTION_UNSUPPORTED` |
| `--margin` | 两者 | academic 四边统一；office_book 未给出时保留 `3cm/2.6cm` 非对称默认，给出时四边统一 |
| `--header-text` | 两者 | 页眉只出现在正文页（标题页保持干净） |

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
  如 theorem/tip）/ `and` / `or`（子项限终端选择器）。
- 呈现规则（模板声明，普通 Auto 函数按名字派发）：每个 occurrence 取最高优先级一条；
  `aside-note` 演示显式 next 委托；`echo-heading`（`templates/render-guard-demo.at`）演示
  递归保护 `W_RENDER_RECURSION_GUARD`。装饰块（“第N章”“定理 N”）不进入目录，目录永远
  由语义标题生成；编号按出版树（内容）顺序。

诊断用：`--auto-entry`（替换 Auto 入口，负例用）、`--doc-wire-version`、`--inject-typst-error`（故障注入）、
`--font-path`、`--skip-pdf`、`--doc-styles`。

每次运行的 `<out>/run-report.json` 记录命令、退出码、各阶段耗时、产物 sha256、Typst 查询到的实际配置与诊断。
生成物：`doc.wire`、`request.txt`、`publication.raw.json`（Auto 原文）、`publication.json`（校验后）、
`publication.typ`、`publication.map.json`、`publication.pdf`、`run-report.json`。

## 验收

```powershell
node scripts/verify.mjs       # AC-01..AC-07 + S-01..S-07；产物在 out/verify/report.json / report.md
```

脚本会真实运行 Auto（探针 + 样式探针 + 两个模板 + 参数变体 + 负例 + 递归保护负例），
调用 Typst 编译并用 PDF 文本/几何/**字号分布**检查正文一致性、栏结构、字面量与
样式真实生效（作用域覆盖/恢复、显式属性），断言 `style-inspect.json` 来源链与
后端能力诊断，最后跑现有 engine parser 的限定测试（block-parser + serializer-roundtrip）。

## 固定版本

| 组件 | 版本/来源 | 记录位置 |
| --- | --- | --- |
| Typst CLI | 0.15.1（官方 release zip，sha256 `19ce3551…6736`；下载不可用时 `cargo install typst-cli --version 0.15.1 --locked`） | `scripts/fetch-typst.mjs`、`run-report.json:tool.typst` |
| Auto | `auto 0.1.0+plan-890-verified-r7-t19-20-g347c29f-dirty`（本机 PATH） | `run-report.json:tool.auto` |
| Node | v25.2.1（验收时） | `run-report.json:tool.node` |

字体：`typst fonts` 可见的系统中文字体被直接使用，默认 `Noto Serif SC` / `Noto Sans SC`；换字体用
`--font-path` 指向字体目录，实际使用家族记录在 IR `page.font_family` 与 `run-report.json`。

## 计时（本机 2026-11-14，Windows，A4 两页样例）

数字取自 `node scripts/verify.mjs` → `out/verify/report.md`（AC-07 冷/热两轮）：

| 阶段 | 实测区间 | 说明 |
| --- | --- | --- |
| 解析 .ad（engine parser） | 5–9 ms | Node 内消费 engine dist |
| Auto 求值（VM 脚本） | 323–431 ms | 含 auto.exe 进程启动与全量 IR 序列化 |
| Typst 编译 | 90–106 ms | 固定版本 CLI，含字体发现 |
| 合计 | 500–641 ms | 冷/热各一轮（`report.json` AC-07）；不宣称实时性，热更新与缓存属 085 |

两次运行的 `.typ` sha256 相同（可重跑）；PDF 含创建时间，不建议按字节比对。

## 限制（原型边界，逐项有诊断或测试）

- 正文白名单：标题、段落、列表、表格、提示块（`$callout`）、分隔线；其余节点（代码围栏、mermaid、
  公式、details、引用/嵌入等）**显式报错** `E_NODE_UNSUPPORTED` 并给出 NodeId，不静默丢弃。
- 行内标记（加粗/斜体/行内代码/链接）压平为文本，并产生 `W_INLINE_MARKS_FLATTENED` 诊断；
  **行内层继承（mark 继承）留 084**——v1 的“继承”只覆盖块级作用域包含语义。
- frontmatter 只支持 `title/authors/abstract/lang/date`；未知键保留在元数据并给诊断。图片、公式、
  脚注、参考文献条目均未实现。
- 页眉只出现在正文页（标题页保持干净）；页码为 `当前页 / 总页数`，目录页码由 Typst 延迟求值。
- 模板参数按模板适用（上表）：无意义组合显式报错（如 office_book 多栏），不做静默忽略。
- 样式 v1 边界：属性注册表 15 项（`doc.hanging_punctuation` 为后端不支持示例，显式诊断）；
  `and/or` 选择器子项限终端（不嵌套复合）；无 CSS specificity/important；主题层为原型内置
  `theme-print-ink` 一条；渲染函数按名字 if/else 派发（当前 VM 无函数值）。
- **office_book 迁移的可见变化（PLAN-083）**：一级标题由呈现规则渲染为“第N章 标题”
  （编号按出版树顺序，含模板前言），h2/h3 不再带 Typst 原生编号（一个层级的编号被呈现规则
  接管时，后端嵌套计数与呈现编号冲突——实测出现 “0.1.”；层次编号后续计划再评估）。
  academic 仍用 Typst 原生 “1.1” 编号，输出与 082 一致。
- 只保证块级来源映射（NodeId → Typst 行范围）；字符级与双向预览定位属 085。
- Auto 侧限制（实测，2026-11-14/11-17）：`json.encode`/`decode` 在该构建的 stdlib provider 缺 callee，
  所以 IR 由手写 JSON 序列化生成；`str.len()/sub()` 以 UTF-8 字节为单位，按字符遍历必须自己算宽度
  （中文数字等必须用列表索引而非 `sub`）；`split()` 产物是 DStr，先 `.to(str)` 再取子串。
- **本机 auto VM 缺陷（2026-11-17 实测，已规避并记录，交 auto-lang owner）**：
  (a) 入口文件 `use file` 时，被调模块中部分“字段比较/内部子函数调用”形态的函数被错误编译
  （`compose_styles` 来源链出现幻影条目、校验函数返回错值；不导入 file 则全部正确；
  最小复现 8 行，见 PLAN-083 §7）——因此 `main.at` 改为 env 输入 / stdout 输出，
  整个 Auto 调用图不导入 `file`，I/O 由宿主承担；(b) `Length` 是内置类型名（样式长度类型改名
  `StyLength`）、`view`/`pub` 为保留字；(c) float 跨模块序列化路径不稳定
  （探针 1/5 出现 4294967xxx 类乱值与空串）——样式值层全整数 milli 定标；
  (d) `bool.to(str)` 出现内存损坏——样式记录一律 int 标志（-1=未设置）。

## 与后续计划的交接

- 083（样式与呈现规则）：已交付（本批）——规则系统/computed/presentation/inspect；
  行内继承、嵌套复合选择器、主题体系化、层次编号属后续。
- 084（模板语义）：`academic`/`office_book` 是普通函数 + 规则声明，槽位、引用与资源边界需在此形态上扩展。
- 085（预览与来源）：`publication.map.json` 给出块级行范围；`style-inspect.json` 已是面板可消费数据，
  会话/revision/字符定位未实现。
- 086（延迟布局）：当前只用 Typst 内置 context（页码、目录），没有 Auto 回调 lowered 到布局阶段。
