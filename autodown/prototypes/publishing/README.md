# AutoDown 出版原型（PLAN-082）

普通 Auto 模板 → 版本化出版 IR → Typst → PDF 的第一个可运行原型。范围来自
[Design 10 §14](../../../docs/designs/10-autodown-publishing.md) 的 P0/P1：
用真实 Auto 函数/类型/控制流处理同一份 `.ad` 正文，输出论文与办公书籍两种版面。

本目录是实验入口，**不是**已冻结的 API：样式、模板形态与后端边界随 083–086 的计划调整。

## 数据流

```
samples/*.ad
  → host/doc-parse.mjs      现有 @autodown/engine parser（dist/parser.js）解析为块模型
  → host/wire.mjs           doc-wire v1（行协议，字段转义）
  → templates/main.at       普通 Auto 脚本：解析 wire、调用模板、序列化 IR
      templates/ir.at       类型、doc-wire 解码、Publication IR、JSON 序列化
      templates/academic.at / office_book.at   两个普通 Auto 模板
  → publication.json        publication-ir-v0（Auto 产出，宿主校验后 pretty 落盘）
  → host/emit-typst.mjs     IR → publication.typ + publication.map.json（NodeId → Typst 行范围）
  → typst compile           publication.pdf
```

宿主只做解析、校验、Typst 序列化与编译；模板投影（含参数、页面配置、结构差异）由 Auto 执行。

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

参数：`--source`、`--template`、`--out`、`--font-size`、`--columns`、`--paper`、`--margin`、
`--header-text`、`--font-path`；诊断用 `--auto-entry`、`--doc-wire-version`、`--inject-typst-error`、`--skip-pdf`。

每次运行的 `<out>/run-report.json` 记录命令、退出码、各阶段耗时、产物 sha256、Typst 查询到的实际配置与诊断。
生成物：`doc.wire`、`request.txt`、`publication.raw.json`（Auto 原文）、`publication.json`（校验后）、
`publication.typ`、`publication.map.json`、`publication.pdf`、`run-report.json`。

## 验收

```powershell
node scripts/verify.mjs       # AC-01..AC-07；产物在 out/verify/report.json / report.md
```

脚本会真实运行 Auto（探针 + 两个模板 + 参数变体 + 四个负例），调用 Typst 编译并用 PDF 文本/几何检查
正文一致性、栏结构与字面量，最后跑现有 engine parser 的限定测试（block-parser + serializer-roundtrip）。

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
- 行内标记（加粗/斜体/行内代码/链接）在 v0 压平为文本，并产生 `W_INLINE_MARKS_FLATTENED` 诊断；
  行内层留待 083/084。
- frontmatter 只支持 `title/authors/abstract/lang/date`；未知键保留在元数据并给诊断。图片、公式、
  脚注、参考文献条目均未实现。
- 页眉只出现在正文页（标题页保持干净）；页码为 `当前页 / 总页数`，目录页码由 Typst 延迟求值。
- Auto 侧限制（实测，2026-11-14）：`json.encode`/`decode` 在该构建的 stdlib provider 缺 callee，
  所以 IR 由手写 JSON 序列化生成；`str.len()/sub()` 以 UTF-8 字节为单位，按字符遍历必须自己算宽度；
  `split()` 产物是 DStr，先 `.to(str)` 再取子串，否则 `sub()` 返回 None。
- 只保证块级来源映射（NodeId → Typst 行范围）；字符级与双向预览定位属 085。

## 与后续计划的交接

- 083（样式与呈现规则）：IR 已有 `page`/`style` 显式字段，尚未有作用域/选择器；样式值仍是字符串长度。
- 084（模板语义）：`academic`/`office_book` 是普通函数，槽位、编号、引用与资源边界需在此形态上扩展。
- 085（预览与来源）：`publication.map.json` 给出块级行范围，会话/revision/字符定位未实现。
- 086（延迟布局）：当前只用 Typst 内置 context（页码、目录），没有 Auto 回调 lowered 到布局阶段。
