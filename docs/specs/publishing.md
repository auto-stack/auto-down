# 出版原型合同（PLAN-082 / publication-prototype-v1）

> 状态：原型交付（2026-11-14）。本文件记录**已交付的原型合同与边界**，不是最终产品规范；
> 目标设计见 [Design 10](../designs/10-autodown-publishing.md)，后续样式、模板语义、实时预览与
> 延迟布局由 083–086 承接，本合同的字段与名字允许在那些计划中调整。

## 1. 范围

已交付一条可运行的最小闭环：`.ad` 正文 → 现有 engine parser → doc-wire v1 → 普通 Auto 模板求值
→ 版本化出版 IR → Typst 源与来源映射 → 固定版本 Typst CLI → PDF。入口在
`autodown/prototypes/publishing/`（实验目录，不是新的 engine 出口）。

不包含：行内标记（加粗/斜体/行内代码/链接）保真、图片/公式/脚注/参考文献条目、样式作用域与
选择器、五类输出形态、实时预览与字符级定位、Auto 回调下沉到布局阶段。这些属于 083–086。

## 2. 入口

| 命令 | 作用 |
| --- | --- |
| `node host/publish.mjs --source <ad> --template <academic\|office_book> --out <dir>` | 一次出版运行；参数 `--font-size/--columns/--paper/--margin/--header-text` |
| `node scripts/verify.mjs` | AC-01..AC-07 验收，产物 `out/verify/report.json` |
| `node scripts/fetch-typst.mjs` | 准备固定版本 Typst CLI（0.15.1，sha256 校验；失败退回 `cargo install`） |

`publish.mjs` 不因模板名做特殊分支：模板选择与投影发生在 Auto（`templates/main.at` → 模板函数）。

## 3. doc-wire v1（宿主 → Auto）

UTF-8 行协议，一行一条记录，`TAB` 分隔字段。字段内 `\` `\t` `\n` `\r` 转义；其余控制字符归一为
空格（不静默改写正文，宿主给出诊断）。

```
DOCWIRE 1
meta    <title|abstract|lang|source|author>  <value>
block   heading          <id> <level> <text>
block   paragraph        <id> <text>
block   thematic_break   <id>
block   list             <id> <ordered 0|1> <count>
block   list_item        <list-id> <index> <text>
block   table            <id> <cols> <row-count>
block   table_row        <table-id> <row-index> <cell>...
block   callout          <id> <type> <title> <paragraph-count>
block   callout_paragraph<callout-id> <index> <text>
end
```

首个非空行不是 `DOCWIRE 1` 时，Auto 返回 `E_DOC_WIRE_VERSION`；计数与实际行数不符返回
`E_DOC_WIRE_COUNT`；未知块类型返回 `E_NODE_UNSUPPORTED`。宿主与 Auto 各持一份实现：
`host/wire.mjs`（编码）与 `templates/ir.at:parse_doc`（解码）。

## 4. publication-ir-v0

Auto 产出 `{"ok":true,"publication":{…}}`，宿主校验后 pretty 写 `publication.json`；失败信封是
`{"ok":false,"error":{"code":…,"message":…}}`。宿主校验失败返回 `E_IR_SCHEMA` 并指出 JSON 路径。

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `schema_version` | str | 必须为 `publication-ir-v0` |
| `template` | str | `academic` 或 `office_book` |
| `document` | obj | `title`、`authors[]`、`abstract`、`lang`（非空）、`source` |
| `page` | obj | `paper` ∈ {a4,a5,b5,us-letter,letter}；`margin.{top,bottom,left,right}` 为长度（pt/mm/cm/in/em）；`columns` 1..3；`font_size` 长度；`font_family` 非空数组；`header_text`；`page_numbers` bool |
| `style` | obj | `heading_numbering`（空串表示不编号）、`first_line_indent` 长度、`chapter_pagebreak` bool、`justify` bool、`title_size` 长度、`abstract_style` ∈ {boxed,plain} |
| `outline` | obj | `depth` 0..3、`title`、`entries[{id,level,title}]`；entry 必须指向同 publication 中的 heading |
| `content` | array | 非空；每项含 `id`、`kind`、`origin`（`source`\|`template`），kind 见下 |

`content` 块类型：

| kind | 必填字段 |
| --- | --- |
| `heading` | `level` 1..6、`text` |
| `paragraph` | `text` |
| `list` | `ordered` bool、`items[]`（非空） |
| `table` | `cols` 1..8、`rows[][]`（每行 `cols` 个字符串） |
| `callout` | `callout_type`、`title`、`body[]`（非空） |
| `thematic_break` | 无 |

`origin=template` 表示模板合成块（如 office_book 的前言/摘要），不与正文 NodeId 混淆。

## 5. 来源映射（source-map-v0）

`publication.map.json`：`{schema_version, source, template, typ_file, blocks:[{node_id, kind, origin,
typ_start, typ_end}]}`，行号 1 起，指向 `publication.typ` 中该块的注释行到块末行。只保证块级映射；
字符级、页面坐标与双向预览定位属于 085。

## 6. 模板合同

模板是普通 Auto 函数 `build_<template>(doc Doc, opts Options) Publication`：

- `Doc`/`DocBlock` 是正文模型（doc-wire 解码结果），`Options` 是宿主参数（字体、栏数、纸张、页边距、页眉文字）。
- 模板决定页面配置、结构化样式（编号/缩进/章节分页/摘要形态）、目录深度与标题、以及合成块。
- 模板不得拼接 Typst 源码；Typst 序列化只发生在 `host/emit-typst.mjs`。
- 参数默认值与取值范围在 `templates/ir.at:default_options` 与 `parse_options`；非法值返回
  `E_OPTION_VALUE`，未知模板返回 `E_TEMPLATE_UNKNOWN`。

## 7. 后端与失败码

- Typst CLI 固定 0.15.1；宿主按 `$PLAN082_TYPST` → `tools/typst-0.15.1/` → `PATH` 查找，缺失返回
  `E_TYPST_NOT_FOUND`（只生成 `.typ` 不算 PDF 闭环）。
- Typst 编译失败返回 `E_TYPST_COMPILE`，透传 CLI stderr；`--inject-typst-error` 是明确的故障注入，
  仅用于验证该映射。
- 其它：`E_ENGINE_PARSER`（engine dist 未构建）、`E_FRONTMATTER`、`E_NODE_UNSUPPORTED`（带 NodeId）、
  `E_AUTO_RUN`（Auto 非零退出，透传诊断）、`E_IR_MISSING`/`E_IR_PARSE`/`E_IR_SCHEMA`。

## 8. 正文边界（与 parser 的关系）

- 使用现有 parser（`@autodown/engine` 的 `parse_blocks`）解析正文，不新增第二套 Markdown 解析。
- 白名单：Heading、Paragraph、ListBlock/ListItem、Table、Callout、ThematicBreak；其余块类型显式报错，
  不静默丢弃。
- frontmatter 由宿主剥离为元数据，只认 `title/author(s)/abstract/lang/date`；未知键保留并诊断
  （`W_FRONTMATTER_UNKNOWN_KEY`）。frontmatter 不属于 parser 合同。
- 行内 mark 在 v0 压平为文本并给出 `W_INLINE_MARKS_FLATTENED`（含 NodeId 与数量）；这不是静默丢弃，
  行内层由 083/084 补。
- 现有 parser 的既有行为（如 ASCII 引号归一为弯引号、Markdown 反斜线转义）在 IR 中原样保留，
  原型不二次改写；序列化层的字面量保证由 `#("…")` + `set smartquote(enabled: false)` 承担。

## 9. 验证

`scripts/verify.mjs` 逐项产生证据：Auto 探针（fn/type/if/for）、两个模板（页数/栏位/页眉/NodeId 顺序）、
参数变体（Typst 配置查询 + 版面变化）、特殊字符（parser→IR 零改动 + PDF 字面量 + 序列化层独立反例）、
四个失败码、限定 parser/serializer 测试（109 例）、README/字体/冷热计时。历史测试数字不外推。

## 10. 与目标设计的差额

| 设计能力 | 原型现状 |
| --- | --- |
| Content 一等值与行内组合 | 正文块级模型；行内 mark 未建模 |
| 样式作用域/选择器/呈现规则 | 只有 `page`/`style` 两组显式字段，无规则与作用域 |
| 五类输出形态 | 只有 academic / office_book 两个模板 |
| 实时预览、revision、双向定位 | 无；只有块级来源映射 |
| 延迟布局与 Auto 回调 | 只用 Typst 内置 `context`（页码、目录），无 LayoutExpr |
| 可编辑 Office 格式 | 无（PDF 输出） |
