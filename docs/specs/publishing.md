# 出版原型合同（PLAN-082 / PLAN-083 / publication-prototype-v1）

> 状态：原型交付（082：2026-11-14；083 样式与呈现规则：2026-11-17）。本文件记录**已交付的
> 原型合同与边界**，不是最终产品规范；目标设计见 [Design 10](../designs/10-autodown-publishing.md)，
> 模板语义、实时预览与延迟布局由 084–086 承接，字段与名字允许在那些计划中调整。

## 1. 范围

已交付一条可运行的最小闭环：`.ad` 正文 → 现有 engine parser → doc-wire v1 → 普通 Auto 模板求值
→ 版本化出版 IR → Typst 源与来源映射 → 固定版本 Typst CLI → PDF。入口在
`autodown/prototypes/publishing/`（实验目录，不是新的 engine 出口）。

不包含：行内标记（加粗/斜体/行内代码/链接）保真、图片/公式/脚注/参考文献条目、
五类输出形态、实时预览与字符级定位、Auto 回调下沉到布局阶段。这些属于 084–086。
（083 已交付样式作用域/选择器/呈现规则，见 §11–§16。）

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

## 4. publication-ir（v1，PLAN-083 起）

Auto 产出 `{"ok":true,"publication":{…}}`（v1 起打印到 stdout，宿主捕获校验后 pretty 写
`publication.json`）；失败信封是 `{"ok":false,"error":{"code":…,"message":…}}`。宿主校验失败返回
`E_IR_SCHEMA` 并指出 JSON 路径。

v1 相对 v0：删除扁平 `style` 组（迁移为规则系统，见 §11–§14）；新增 `styles.rules` /
`styles.explicit` / `styles.match_log` / `styles.render_rules`、`computed`、`presentation`、
`render_diags`；`document` / `page` / `outline` / `content` 保持原字段。

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `schema_version` | str | 必须为 `publication-ir-v1` |
| `template` | str | `academic` 或 `office_book` |
| `document` | obj | `title`、`authors[]`、`abstract`、`lang`（非空）、`source` |
| `page` | obj | `paper` ∈ {a4,a5,iso-b5,us-letter}（与 Typst 0.15.1 实测允许集一致）；`margin.{top,bottom,left,right}` 为长度（pt/mm/cm/in/em）；`columns` 1..3；`font_size` 长度；`font_family` 非空数组；`header_text`；`page_numbers` bool |
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

`origin=template` 表示模板合成块（如 office_book 的前言/摘要），不与正文 NodeId 混淆；
`origin=render` 表示呈现规则生成的装饰块（id 约定 `<semantic-id>!<后缀>`）。

v1 追加数组（与 `content` 一一对应，见 §11–§12）：`computed[i].id === content[i].id`；
`presentation[i].semantic_id` 必须指向某个内容块，条目为 `{semantic_id, role, rule, guard, blocks[]}`；
`render_diags[]` 为呈现层诊断（如 `W_RENDER_RECURSION_GUARD`）。

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
- 参数按模板适用，显式给出不可用组合要报错而不是静默忽略：academic 采纳 `--columns`（1..3）与
  `--header-text`；office_book 固定单栏（显式 `--columns ≠ 1` 返回 `E_OPTION_UNSUPPORTED`），
  `--margin` 未给出时保留 `3cm/2.6cm` 非对称默认、给出时四边统一；`--header-text` 两者均采纳且
  只出现在正文页；`--paper` 两者均采纳，取值限于 `a4/a5/iso-b5/us-letter`（Typst 实测集），
  其余值在校验期以 `E_IR_SCHEMA` 拒绝。

## 7. 后端与失败码

- Typst CLI 固定 0.15.1；宿主按 `$PLAN082_TYPST` → `tools/typst-0.15.1/` → `PATH` 查找，缺失返回
  `E_TYPST_NOT_FOUND`（只生成 `.typ` 不算 PDF 闭环）。
- Typst 编译失败返回 `E_TYPST_COMPILE`，透传 CLI stderr；`--inject-typst-error` 是明确的故障注入，
  仅用于验证该映射。
- 其它：`E_ENGINE_PARSER`（engine dist 未构建）、`E_FRONTMATTER`、`E_NODE_UNSUPPORTED`（带 NodeId）、
  `E_AUTO_RUN`（Auto 非零退出，透传诊断）、`E_IR_MISSING`/`E_IR_PARSE`/`E_IR_SCHEMA`、
  `E_OPTION_UNSUPPORTED`（参数对模板不适用，如 office_book 多栏）。

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
参数变体（Typst 配置查询 + 版面变化）、参数适用性（academic 页眉、office_book 页边距、office_book 多栏拒绝）、
纸型矩阵（四个允许值出对应页面尺寸，`b5`/`letter` 校验期拒绝）、特殊字符（parser→IR 零改动 + PDF 字面量 +
序列化层独立反例）、失败码（AC-05 四例 + `E_OPTION_UNSUPPORTED`）、限定 parser/serializer 测试、
README/字体/冷热计时。历史测试数字不外推。

## 10. 与目标设计的差额

| 设计能力 | 原型现状 |
| --- | --- |
| Content 一等值与行内组合 | 正文块级模型；行内 mark 未建模 |
| 样式作用域/选择器/呈现规则 | 只有 `page`/`style` 两组显式字段，无规则与作用域 |
| 五类输出形态 | 只有 academic / office_book 两个模板 |
| 实时预览、revision、双向定位 | 无；只有块级来源映射 |
| 延迟布局与 Auto 回调 | 只用 Typst 内置 `context`（页码、目录），无 LayoutExpr |
| 可编辑 Office 格式 | 无（PDF 输出） |

## 11. 样式系统（PLAN-083 / style-system-v1）

入口：`--doc-styles <json>`（宿主 `host/style-wire.mjs` 结构校验并编码为 `STYLEWIRE 1`
行协议；Auto 侧 `templates/style.at:parse_styles_wire` 解码并做值级校验，错误可定位到
规则/条目/属性）。

### 11.1 值类型与单位工厂

- `StyLength{milli int, unit str}`：整数千分定标（`pt(11,0)`=11pt、`cm(2,200)`=2.2cm、
  `em(0,640)`=0.64em）；单位白名单 pt/mm/cm/in/em/%；未设置 = `unit==""`。
  （不用 float：本机 VM float 跨模块序列化不稳定，见 §16c。）
- `Color{r,g,b}`（0..255，`rgb()`/hex 解析）；未设置 = r<0。
- `TextStyle`（size / weight 100..900 / color / italic / font）、`ParagraphStyle`
  （justify / first_line_indent / leading / spacing_above / spacing_below）、`DocStyle`
  （heading_numbering（空串=不编号，独立 set 标志区分未设置）/ chapter_pagebreak /
  title_size / abstract_style（boxed|plain）/ hanging_punctuation）。
- 未设置约定：int 标志 -1；font 空表。样式记录不使用 bool 字段。
- 普通函数按参数产生 Style（如 `emphasis(base, bump_milli)`）；非法值/单位/范围在
  `check_*` 拒绝并给出 `who / prop` 定位（`E_STYLE_VALUE`）。

### 11.2 属性注册表（15 项）

text.size/weight/color/italic/font；para.justify/first_line_indent/leading/spacing_above/
spacing_below；doc.heading_numbering/chapter_pagebreak/title_size/abstract_style；
doc.hanging_punctuation（**后端不支持示例**：Typst 发射器不实现 → `W_STYLE_UNSUPPORTED`
诊断并保留在 IR/inspect，不静默丢弃）。

v1 继承语义：块级扁平模型中 inherit=1 的文本属性经**作用域包含**获得基值（外层作用域规则
同样作用于内层块）；行内层（mark 继承）属 084，本表不含。

### 11.3 层级与逐属性合成

内置(0) < 主题(1) < 模板(2) < 文档规则(3) < 节点显式(4)。逐属性合成：规则未设置的属性
不覆盖（同一内容的模板默认在最终环境生效——先构造的内容不被提前固化，显式属性最高且
跨模板保留）。同层排序：作用域深度（更深的子树优先）→ 声明顺序（后声明优先）。
无 CSS specificity / important。

### 11.4 作用域

规则 `scope` 为 `""`（全文档）或标题 NodeId（锚点子树：含锚点，止于下一个同级别或更高级
别标题；`scope_depth` = 锚点 heading level，文档=0）。离开子树即恢复；锚点不存在 →
`E_STYLE_SCOPE`（Auto 侧 `validate_rules`）。

### 11.5 选择器

`type`（块类型）/ `attr`（key ∈ kind|level|callout_type，值相等）/ `id` / `role`
（heading→"heading"，callout→callout_type 如 theorem/tip，其余→kind）/ `and` / `or`
（子项限终端选择器，不嵌套复合）/ `all`。匹配日志 `styles.match_log[]`
（rule × node × matched，含未命中）可观察。未知属性 → `E_STYLE_PROP_UNKNOWN`。

### 11.6 计算结果与检查接口

`computed[]`：每 occurrence 的最终 text/para/doc + 每属性**采用链**
（`sources[]`：prop/layer/origin/rule/scope/order，升序，末位生效）。
宿主产出 `style-inspect.json`（`style-inspect-v1`）：occurrence 的 props
（值 + 链 + backend supported/unsupported）、能力表、呈现诊断——UI 面板消费由 085 接续。

## 12. 呈现规则（PLAN-083 / render-v1）

- 模板声明 `render_rules[]`（name/priority/selector）；渲染函数为普通 Auto fn，按名字
  if/else 派发（当前 VM 无函数值）。每个 occurrence 取**最高优先级的一条**（同优先级
  先声明优先），不做隐式多次包裹。
- 显式委托：`aside-note` 对长提示正文先出侧注标记行，再委托 `next`（低于自身的最高
  匹配规则，如 `callout-plain`）或 default。内置渲染：`theorem-box`（"定理 N（原文标题）"
  编号框）、`chapter-h1`（"第N章 原文"，office_book）、`aside-note`/`callout-plain`（提示）。
- 递归保护：活动 (rule, occurrence) 不再次匹配同一规则——渲染输出派生的新节点再命中
  同一规则时回落默认呈现并记 `W_RENDER_RECURSION_GUARD`（负例入口
  `templates/render-guard-demo.at`，输出有界）。
- 语义保持：`presentation[i]` 携带 `semantic_id`/`role`；装饰块不进入目录——`outline`
  永远由语义内容标题生成（装饰前缀如"第N章""定理 N"不污染 outline）；来源映射按
  presentation 条目定位。编号按**出版树（内容）顺序**，不按函数调用顺序（office_book
  前言合成为第一章）。

## 13. 模板迁移（office_book 可见变化）

office_book：一级标题经 `chapter-h1` 渲染"第N章"，h2/h3 不再使用 Typst 原生编号
（一个层级编号被呈现规则接管时后端嵌套计数与呈现编号冲突，实测 "0.1."；层次编号后续
再评估）；首行缩进/两端对齐/章节另起页/标题区 22pt/摘要 plain 迁移为模板规则属性。
academic：保持 Typst 原生 "1.1" 编号，输出与 082 一致。

## 14. 后端能力与诊断（Typst 发射器 v1）

- 逐块发射：`presentation × computed`——文本属性 `#text(...)`、段落属性 `#par(...)`、
  段距 `#v(...)` 局部包裹；文档级属性（编号/分页/标题区/摘要形态）取文档作用域计算值；
  章节分页仅在一级标题前。
- 能力表：注册属性除 `doc.hanging_punctuation` 外全部支持；不支持属性 → 每个设置了它的
  occurrence 一条 `W_STYLE_UNSUPPORTED`（run-report.diagnostics + inspect），值保留 IR。
- PDF 级样式证据：`host/pdf_probe.py` 输出每页字号分布（`font_sizes[]`）。

## 15. 入口协议变化（env / stdout）

`templates/main.at` 为薄入口：输入经环境变量 `PLAN083_WIRE` / `PLAN083_REQUEST` /
`PLAN083_STYLES`（宿主已读文件），IR 信封打印到 stdout 由宿主捕获——Auto 调用图不导入
`file` 模块（原因见 §16a）。`--auto-entry` 负例入口遵循同一协议。**边界**：env 通道有
实际容量上限（Windows 单变量约 32K 字符）；原型样例（research 级正文 ~6KB wire）无碍，
超大正文需要换通道（stdin/临时文件由宿主代读），属后续计划的协议调整。

## 16. 已知 VM 缺陷与规避（2026-11-17 实测，本机 auto 0.1.0+plan-890-…-t19-24；交 auto-lang owner）

(a) **入口 `use file` 时部分被调函数被错误编译**（确定性；最小复现 8 行：`use file: read_text`
+ `use style: pt, emphasis_check` 调用即返回错值；不导入 file 则正确）。受影响形态：
"字段比较/内部子函数调用"的函数（曾名 emphasis_check/chain_check；compose_styles 的
来源链经子函数记录时出现幻影条目）。规避：入口不导入 file（§15）；链记录判断内联在
compose_styles 体内；校验类函数删除，验证走 JSON 序列化路径（jcomputed_all 实测正确）。
(b) `Length` 为内置类型名（改名 StyLength）；`view`/`pub` 为保留字。
(c) float 跨模块序列化路径不稳定（乱值/空串）→ 全整数 milli。
(d) `bool.to(str)` 内存损坏 → int 标志。
(e) `str.sub` 按字节：中文必须列表索引。
