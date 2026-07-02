# 08 · Logseq / Obsidian 功能调研与 jade-garden 差距分析

> 调研日期：2026-07（对应仓库快照 `D:/github/logseq` @ `master`，schema 版本 `65.33`）。
> 目标：系统梳理 Logseq（及 Obsidian）的功能与关键设计，对照 jade-garden 当前能力，定位差距并给出可执行的复刻路线。
> 本文是给工程团队看的技术调研 + 差距分析，不是产品说明书。所有 Logseq 结论均有源码路径佐证（路径相对 logseq 仓库根）。

---

## 0. TL;DR（先读这一段）

1. **我们扫描到的 Logseq 是"DB 版"，不是经典"Markdown 文件版"。** 这个 checkout 已经从"文件即真相"演进到"**DataScript/SQLite 数据库即真相 + Markdown 单向镜像**"。它的绝大多数高级能力（块引用、属性类型系统、类/对象、live query、闪卡、RTC 协同、E2EE、云发布、PDF 标注）**都建立在"块是带稳定 UUID 的一等数据库实体"之上**。
2. **jade-garden 目前等价于 Logseq 的"file graph"或 Obsidian 模型**：一页一 `.ad` 文件、YAML frontmatter + 段落式 WYSIWYG，block ID 只是临时位置序号、不落盘、非持久锚点。
3. **因此最根本的战略抉择只有一个**：是否要引入"块级稳定标识 + 索引/数据库层"。
   - 不引入 → 能舒服复刻的是 **Obsidian 那一档**能力（双链、反链、标签、embeds、图谱、模板、每日笔记、富内容、插件、主题）。
   - 引入 → 才能碰 **Logseq 独有的那一档**（大纲 outliner、块引用/嵌入、结构化属性/类/对象、datalog 查询、闪卡、块级实时协同）。
4. **Obsidian 才是 jade-garden 更贴近的"北极星"**（同为一页一文件的 Markdown 模型）；Logseq 的 outliner/数据库能力属于"更高投入的进阶目标"。
5. 有几样东西**这版 Logseq 已经没有了，不要照抄**：白板（tldraw，已移除）、Excalidraw（弃用）、Mermaid（前端无引用）、经典 file-sync、Roam/Obsidian 导入器、Zotero Web API（退化为仅设置）。图谱也**不是 Cytoscape**，而是 d3-force + Pixi.js。

---

## 1. 调研范围与方法

- **Logseq**：静态通读 `D:/github/logseq` 源码，按领域拆成 7 路并行调查（数据模型、大纲/链接/属性、查询/任务/闪卡、图谱/搜索/日记/富内容、插件/主题/快捷键/设置、同步/发布/导入导出/集成），未运行程序，结论来自源码与官方 docs。
- **Obsidian**：闭源，无法读源码；第 5 节基于对 Obsidian 公开功能与生态的既有知识整理，并标注与 Logseq 的关键差异。
- **jade-garden**：通读 `back/server/src/*.rs` + `front/src/**` + `@autodown/editor` 包，形成"已实现"清单（第 6 节）。

> ⚠️ 版本歧义提醒：若产品目标是对标**经典 Markdown 版 Logseq**（`.md` 文件 + `logseq/` 目录 + `{{query}}`/`{{embed}}` 宏 + 白板），需要另找旧版本 tag 复核——本次快照里这些已被 DB 模型取代或移除。下文凡涉及都会标注。

---

## 2. Logseq 架构总览

- **技术栈**：ClojureScript + Rum（React 封装）+ **DataScript**（内存 Datalog 图数据库）。构建用 shadow-cljs + Gulp。桌面端 Electron，移动端 Capacitor（`src/main/mobile/`，android/ios 原生工程）。UI 组件系统 = shadcn/Radix（`packages/ui`）+ ClojureScript 门面 `deps/shui`。
- **状态二分**：文档状态（页面/块/内容/引用）在 DataScript；UI 状态（当前编辑块、侧栏开合）在 Clojure atom，用 Rum 响应式订阅。`CODEBASE_OVERVIEW.md`。
- **块是一等公民**：页面和块都是 DataScript 实体，靠属性区分。核心属性（`deps/db/src/logseq/db/frontend/schema.cljs`）：
  - `:block/uuid`（全局唯一，跨页引用锚点）、`:block/parent`（父块或所属页）、`:block/order`（**分数索引字符串** fractional index，决定兄弟顺序）、`:block/page`、`:block/title`（正文）、`:block/refs`/`:block/tags`/`:block/alias`（多 ref）、`:block/collapsed?`。
  - **注意**：旧的 `:block/left`（左兄弟链表）**已被移除**，改用 `parent + order`。排序用 `logseq/clj-fractional-indexing`，插入/移动块只改自身一条 order，无需重排兄弟——**这是值得 jade-garden 借鉴的大纲排序方案**。
- **两种图谱存储模型**（靠仓库名前缀区分，`deps/common/src/logseq/common/config.cljs`）：
  - **File graph**（`logseq_local_`）：磁盘上就是 `.md`/`.org` 文件（`pages/`、`journals/`），启动时 `deps/graph-parser/` 解析成 DataScript 事务。人类可读、git 友好，但块无磁盘级稳定 ID（靠正文里的 `id::` 补）。**≈ jade-garden 现状。**
  - **DB graph**（`logseq_db_`）：每图一个 `db.sqlite`，里面**不是**关系表，而是一张 `kvs` 表存 DataScript `:storage` 序列化的 datoms（transit 编码，浏览器端 sqlite-wasm + OPFS，事务走 Web Worker）。另可导出 `mirror/markdown/` 人类可读镜像（单向投影，非真相源）。
- **⚠️ 最根本的架构抉择**：Logseq 已把大量原本靠 `config.edn`/文本表达的东西移进数据库（见 `file-only-config` 废弃清单：`:journals-directory`、`:preferred-format`、`:preferred-workflow`、`:favorites` 等在 DB 图里都不再用）。jade-garden 要么"文件为真相 + 外挂索引库"，要么"数据库为真相 + `.ad` 镜像"，二者不可兼得，需在早期定死。

---

## 3. Logseq 功能详录

> 每个特性后用标记表示对**块数据库/datalog 的依赖度**：🟢 纯交互/渲染，file 模型可直接复刻；🟡 需自建轻量索引层；🔴 强依赖块数据库/类型系统/datalog。

### 3.1 数据模型与文件格式
- **Markdown 语法映射**（`docs/logseq-markdown-syntax.md`，写出 `worker/markdown_mirror.cljs`，解析 `graph-parser/block.cljs`）🟡
  - 缩进 → 嵌套（每层 2 空格）；`-` 列表项 = 块；`*` 列表项 + `key::` = 属性；页面属性在首块前，块属性在其块下。
  - 引用 `[[Page]]`、标签 `#tag`、`#[[Multi word]]`；任务状态行内编码 `- TODO ...`/`- DONE ...`（不单独导出为属性）。
  - 镜像文件顶部 `id:: <uuid>` 关联 DB 页面（不是普通属性）。
- **属性系统**：File 图是文本 `key:: value`（多值逗号分隔）🟡；DB 图里**属性本身是实体**，有命名空间 `:db/ident`（`:user.property/*`、`:logseq.property/*`），值直接存为块实体上的 datom（标量或 ref）🔴。属性类型：`:default :number :date :datetime :checkbox :url :node :asset`；ref 型可反查；`:number/:url/:default` 可设为**闭合值（枚举/下拉）**；可切单值/多值基数。
- **页面身份与日记**：普通页 UUID 随机；**日记页 UUID 由日期确定性派生**（同一天在任何图一致，便于合并）。日记带整数 `:block/journal-day`（`yyyyMMdd`），文件名默认 `yyyy_MM_dd`。🟡
- **命名空间**：File 图用页名里的 `/` 表层级（磁盘文件名把 `/` 编码为 `___`）；DB 图改用实体引用（页面 `:block/parent`、类 `:logseq.property.class/extends`）。🟡/🔴

### 3.2 大纲编辑器与块操作（Outliner）🔴（核心差异）
- 引擎 `deps/outliner/src/logseq/outliner/core.cljs`：`insert-blocks!`/`save-block!`/`delete-blocks!`/`move-blocks!`/`move-blocks-up-down!`/`indent-outdent-blocks!`，全部以"结构化 op + 校验 + 单事务"表达（`op.cljs` 的 `op-schema`）——这是撤销/重做与同步的基础。
- **缩进/反缩进/上移下移/DnD 重排**：靠改 `:block/parent` + 重算 `:block/order`（分数索引），带防环检查。
- **折叠/展开**：`:block/collapsed?` 布尔位。🟢
- **Zoom-in（块作为页面）+ 面包屑**：因块和页面同构、按 uuid 可路由，把块 uuid 当路由即可"聚焦到某块"。🔴 file 模型要复刻需自建"块锚点路由 + 沿缩进祖先算面包屑"。
- **键盘模型**（`modules/shortcut/config.cljs`）：Enter=新建同级块、Shift+Enter=块内换行、Tab/Shift+Tab=缩进/反缩进、Mod+Shift+↑/↓=移动块、Mod+↑/↓=折叠/展开、Mod+Enter=循环任务状态。🟢
- **Slash 命令**（`commands.cljs`）：`/` 触发的"步骤序列"命令表；内置分组含引用/嵌入、格式、H1-H6、任务/优先级、日期、有序列表、query、模板、上传、add-property；插件可注册。🟢（交互层）

### 3.3 链接与引用 🟡
- **语法 token**（`deps/common/src/logseq/common/util/{page_ref,block_ref}.cljs`）：页面/节点 `[[Page]]`；块引用 `((uuid))`（DB 图里**已统一为 `[[]]`**，键入 `((` 会提示改用 `[[`）；嵌入 `{{embed ((uuid))}}`/`{{embed [[Page]]}}`（**旧宏在 DB 图弃用**，改由 slash "节点嵌入"）；`#tag`（DB 图里 = 打类/标签）。
- **底层**：每块把引用记入 `:block/refs`（多 ref）；反链 = "谁的 refs/page/父链 refs 指向本页"，子块继承祖先 ref 上下文，用 `frequencies` 统计出现次数。
- **面板**：Linked References（反链，`components/reference.cljs`，表格/列表渲染）、**Unlinked References**（扫正文里出现页名但未建链接的块）、**引用过滤器**（include/exclude 标签云，shift+点击=排除）。
- **页面别名** `:block/alias`（多 ref），多标题解析到同一实体。
- 🟡 复刻要点：file 模型需维护一张全局引用索引（page→引用它的块）+ 别名映射表；unlinked refs 需对所有块做页名子串扫描。

### 3.4 属性、类/标签、对象（DB 图独有）🔴
- **属性**：DB 图里是一等实体（见 3.1）；UI 在 `components/property.cljs` + `components/property/`。
- **类/标签（Class）**：Class 是特殊页面实体（内置 `:logseq.class/{Page,Task,Asset,Journal,Card,Template,...}`）。`#tag` = 把该 Class 加入块的 `:block/tags`；类可声明自己的属性集（`:logseq.property.class/properties`）、可继承（`extends` 父子层级）。
- **对象（Objects）= 被某 Class 标记的页面/块**：`components/objects.cljs` 以**表格视图**呈现某类的全部实例，列 = 该类属性，可增删列（= 给类加减属性）、排序、过滤、切视图类型。本质是"对结构化实体集合的数据库查询 + 可编辑网格"。
- 🔴 几乎全部强依赖块数据库。file 模型可**低配**用 frontmatter/`key::` 存文本属性，但"属性值可反查""某类全部对象聚合成表""属性随类继承"必须自建索引 + 查询引擎，否则退化为静态文本。

### 3.5 查询系统 🔴
- **简单/DSL 查询**（`db/query_dsl.cljs`）：S 表达式编译成 datalog。支持 `(and/or/not)`、`[[Page]]`/`#tag`、`(property K V)`、`(task TODO DOING)`、`(priority A B)`、`(tags Foo)`、`(between -7d +7d)`、`(sample N)`、全文 `"..."`、以及内联 datalog 子句。相对时间 `today/yesterday/tomorrow/now` + `y m w d h`。
- **高级查询**：块携带 `:logseq.property/query`（查询文本）；map 形式 = 原始 datalog `{:query :inputs}`。
- **查询构建器**（`components/query/builder.cljs`）：可视化过滤树（filter + and/or/not），序列化回 DSL 文本，与文本双向同步。
- **结果视图**（`components/views.cljs`，~140KB）：DB 视图类型是闭合值 `:logseq.property.view/type`，**本版只有 table/list/gallery 三种**；board/kanban 通过 group-by 属性实现；**没有独立的 calendar 视图**。⚠️ 经典 file 版的 list/table/board/calendar 查询视图在此不全。
- **求值与缓存**：DSL→datalog，`db/react.cljs` 全局 `*query-state` 按 key 缓存响应式结果 atom；事务后 `refresh-affected-queries!` 只重算受影响查询。
- 🟡 可移植的最干净一块是 **DSL 解析器**（`query_dsl.cljs`）；求值/缓存/视图强绑数据库。

### 3.6 任务、排期、重复任务 🔴（语义可借，实现绑 DB）
- **工作流（本版）**：任务 = 打 `:logseq.class/Task` 标签的块 + 闭合值 `:logseq.property/status`（Backlog/Todo/Doing/In Review/Done/Canceled，默认 Todo）。Mod+Enter 三态循环 Todo→Doing→Done→清除。
- ⚠️ 经典 `NOW/LATER/DOING/TODO/DONE/CANCELED`、`WAIT/WAITING/IN-PROGRESS` **降级为导入映射表**，不再是运行时概念。
- **优先级**：闭合值 Low/Medium/High/Urgent；经典 `[#A][#B][#C]` 映射为 high/medium/low。
- **SCHEDULED / DEADLINE**：两个 datetime 属性；org 行语法 `SCHEDULED:`/`DEADLINE:` + `<...>` 仅解析时识别。**Agenda**（今日日记页的"Scheduled and deadline"区）由 datalog 在窗口内查（排除 done/canceled）。
- **重复任务**（`worker/commands.cljs`，`docs/recurring-tasks.md`）：org repeater cookie 映射为 `:repeat-type`：`.+`=从完成时推进、`+`=从计划时推进（可叠加逾期）、`++`=从计划推进并跳到未来（默认，保留星期）。间隔 = frequency × unit（Minute/Hour/Day/Week/Month/Year）。标记 DONE 时重算下一次时间。
- 🟡 重复任务语义（org 风格）与 DSL 都很自包含，适合移植；status/priority/scheduled/repeat 的存储绑 DB。

### 3.7 闪卡 / 间隔重复（FSRS）🔴
- **卡片语法**：任意打 `#Card`（`:logseq.class/Card`）标签的块；cloze 挖空 `{{cloze answer}}`，可选提示 `{{cloze answer \ hint}}`。
- **发现**：datalog 查所有 Card 且 `:logseq.property.fsrs/due ≤ now`（或缺 due）；`#Cards` 块可挂 DSL 查询做"卡组/deck"。
- **复习流**：`#cards-modal` 弹窗，phase `init→show-cloze→show-answer`；评分 Again/Hard/Good/Easy（快捷键 1/2/3/4，`s` 揭示）。
- **算法**：**仅 FSRS**（`open-spaced-repetition.cljc-fsrs`），状态存 `:logseq.property.fsrs/{state,due}` 两个属性。⚠️ 经典 SM-2 已从本版移除。

### 3.8 图谱视图 🟡（注意：非 Cytoscape）
- **引擎**：布局 **d3-force**，渲染 **Pixi.js（WebGL）**（`extensions/graph/pixi.cljs` 2677 行 + `pixi/logic.cljs` 的 forceLink/forceManyBody/forceCollide/forceCenter）。为上万节点做了视口裁剪、LOD 标签、增量更新、按节点数在 `:force`/`:fast` 布局间切换、`draw-edge-limit`/`render-node-limit` 限流。
- **数据构建在 DB Worker**（`common/graph_view.cljs` 的 `build-graph`，扫 datoms）🔴：节点=页面/标签/属性/日记（`:kind` 着色、**尺寸按度数** `8*cbrt(link-count)`）；边=引用/父子/类继承。
- **模式与过滤**：`tags-and-objects`（按标签聚类，可勾选 tag）/ `all-pages`（可显示日记）；Depth 1-5、Link distance、**Time-travel 时间轴**（按创建时间过滤）；设置持久化到 localStorage。
- 🟡 jade-garden 已用 Cytoscape+fcose；节点/边语义与过滤维度（kind 着色、按度数缩放、tag 聚类、depth/journal 开关、time-travel）可原样借鉴，图数据自建。

### 3.9 搜索、命令面板、快速切换 🟡
- **搜索架构**：前端 protocol/agency 抽象 → DB Worker 里 **SQLite FTS5 + trigram tokenizer**（对中文子串友好），触发器保持索引同步（`worker/search.cljs`）。一次搜索并联多路召回（精确标题 / FTS MATCH / 模糊 LIKE / 可选语义向量），用 **RRF（Reciprocal Rank Fusion）** 融合排序；自研哨兵标记做摘要高亮。模糊算法含**汉字转拼音首字母**（`common/search_fuzzy.cljs`）。
- **命令面板 / 快速切换（Cmd-K）**：同一个 cmdk UI（`components/cmdk/`），靠 filters 在 nodes/commands/files/themes 等维度切换；命令按历史调用次数排序，支持拼音首字母。
- **页内查找**：仅 Electron，走 Chromium 原生 find-in-page。
- 🟡 复刻要点：FTS5+trigram（中文友好）、模糊兜底、RRF 融合、哨兵高亮、Cmd-K 分组 + 命令频次排序。file 模型需自建 SQLite/Orama/MiniSearch 索引并在保存时增量更新。

### 3.10 日记、快速捕获/添加 🟢/🟡
- **日记**：带 `:logseq.class/Journal` + `:block/journal-day` 的页面；`date.cljs` 管格式化，`handler/journal.cljs` 管今日/前后一日导航。首页 journals feed 用 Virtuoso **虚拟滚动**逐天渲染（`components/journal.cljs`）。
- **Quick Add**：内置"Quick add"暂存页，Mod+E 把块移动到今日日记末尾。
- **Quick Capture**（移动/Electron）：模板 `**{time}** [[quick capture]]: {text} {url}`，URL 自动美化（视频转 `{{video}}` 等）。
- 🟡 file 模型可平移：日记 = 按日期命名 `.ad`；今日/前后导航；虚拟滚动 feed；capture 模板。

### 3.11 模板 🟡
- DB 图模板 = 打 `#Template`（`:logseq.class/Template`）标签的块/页；`:logseq.property/template-applied-to` 可**自动套用到指定类**。
- **动态变量** `<% ... %>`（`template.cljs` + `outliner/template.cljs`）：内置 `today/yesterday/tomorrow/time/current page`，未命中时尝试自然语言日期解析（`nld-parse`）。
- 🟡 可实现为"标记为模板的 `.ad` 页" + `<% today %>` 占位符；auto-apply-to-tag 依赖类型系统可后置。

### 3.12 富内容扩展 🟢（多数可直接移植）
- **LaTeX/KaTeX**：行内 `$...$`、块级 `$$...$$`（`extensions/latex.cljs`，含 mhchem 化学式）。
- **代码块**：编辑态 CodeMirror 5（~百种语言），只读/导出 highlight.js；语言选择器写 `:logseq.property.code/lang`。
- **行内计算器 Calc**：`calc` 语言代码块，instaparse 语法 + bignumber.js 高精度（四则/幂/三角/对数/进制/变量）。
- **文本高亮** `^^highlight^^`、粗斜删除线等。
- **图片灯箱**：PhotoSwipe。
- **宏 `{{name args}}`**（`components/macro.cljs` + `block.cljs` macro-cp）：`{{video}}`/`{{youtube}}`/`{{vimeo}}`/`{{bilibili}}`/`{{tweet}}`/`{{renderer}}`（插件 UI slot）。⚠️ `{{query}}`/`{{embed}}`/`{{namespace}}` 在 DB 版弃用。
- **⚠️ 无 Mermaid**（前端无引用）、**Excalidraw 弃用**、**白板/tldraw 移除**——若需图表须自行集成（mermaid.js/excalidraw/tldraw）。

### 3.13 插件系统与 API/SDK 🟢（架构可借鉴）
- **沙箱 + 异步 RPC + 宿主注册表**三件套（`libs/` JS SDK + `src/main/logseq/` 宿主 API + `handler/plugin.cljs`）：不受信插件 JS 跑在隔离 iframe（或 shadow-DOM 的 effect/theme 插件），通过 postMessage RPC（vendored Postmate）与宿主通信；插件贡献的斜杠命令/命令面板项/UI 注入/渲染器/样式/主题都注册进宿主 state map，由宿主渲染。
- **API 分组**（宿主 `src/main/logseq/api/`）：`App`（应用/图信息、路由、导航、注册 UI/命令、生命周期 hook）、`Editor`（块/页 CRUD、树查询、光标/选区、块属性、slash 注册，最大一组）、`DB`（`q` DSL、原始 datascript、`custom_query`、get/set file content、onChanged 监听）、`UI`、`Assets`、插件存储/偏好、`Experiments`（fenced-code renderer、HTTP、React 复用）、`Git`、DB-图模型 API（属性/类/标签）。
- **市场**：GitHub 上的 marketplace（`plugins.json`/`stats.json`），Electron IPC 安装；全局 `plugins.edn`（rewrite-edn 保格式 + Malli 校验）记录已装插件便于可移植。
- **每插件设置 UI**：settingsSchema（string/number/boolean/enum/object/heading）自动渲染成控件 + JSON 编辑模式。每插件日志查看器。

### 3.14 主题与 UI 定制 🟢
- 三种模式 light/dark/**system**；根节点切 `data-theme` + Tailwind `dark` 类；独立**强调色**选择器（Radix HSL token）。
- **custom.css**：注入 `<style>`（图内 `custom.css` 或自定义链接）；另有需授权的 **custom JS** 执行路径（每周复确认，安全注意）。
- **插件主题**：`theme:true` 插件；`--ls-*` CSS 变量约定；主题选择器 UI。

### 3.15 快捷键 🟢
- 单一大 map `all-built-in-keyboard-shortcuts`（`modules/shortcut/config.cljs`），平台条件绑定、多绑定、`false` 禁用；按显示类别与 handler id（决定作用域）分组。
- 运行时 Mousetrap 式注册（`modules/shortcut/core.cljs`），冲突检测（前缀重叠/跨上下文）。
- 定制 UI（`components/shortcut.cljs`）：实时录键、冲突横幅、重置默认；用户绑定存 config EDN `:shortcuts`。帮助浮层 `shortcut_help.cljs`（触发符表 + Markdown 速查 + 全键位）。

### 3.16 设置 🟢
- 左导航 Modal（`components/settings.cljs` ~1500 行）：Account / General（更新渠道、语言、主题、强调色、编辑器字体、config.edn 与 global-config.edn 编辑器、custom theme/CSS）/ Editor（括号、宽屏、反缩进、块引用自动展开、粘贴行为、日期格式、拼写检查）/ Keymap / AI（桌面）/ Advanced（开发者模式、自动更新、Sentry、版本）/ Features（首页默认页、feature flags）/ Collaboration & Encryption（登录后）/ Plugins。

### 3.17 同步 / 实时协同（RTC）🔴
- **模型**：**op-log（事务重放）+ 服务器全序**，不是 CRDT。服务器给每图分配单调逻辑时钟 `t`，每次写 append 到 `tx_log`；**乐观并发**——客户端带 `t-before` 提交，服务器 `t` 已推进则 `tx/reject{stale}`，客户端 pull 新事务、本地重放后重试。两种结构修复：重复 `:block/order` 重生成、缺失引用块修复。
- **拓扑**：每图一个 Cloudflare Durable Object + 自己的 SQLite（`kvs`/`tx_log`/`sync_meta`）；元数据在 D1；也有 Node.js 自托管适配（Cognito JWT）。
- **传输**：WebSocket + JSON 信封（tx 内是 transit）；hello/pull/tx-batch/presence/ping 等 malli schema。滚动校验和（FNV-1a+DJB2）检测分叉；新客户端下载 gzip transit 快照 bootstrap；presence 广播"谁在编辑哪块"。
- **⚠️ 经典 file-sync 已移除**（仅剩残留 CSS）。RTC 仅 DB 图可用。

### 3.18 端到端加密（E2EE）🔴
- WebCrypto：每用户 RSA-OAEP-2048 密钥对（私钥用 PBKDF2 派生的 AES-GCM 加密）；每图 AES-GCM-256 内容密钥，用用户 RSA 公钥包裹。分享 = 用被邀人公钥重新包裹同一 AES 密钥（无需重新加密内容）。密码缓存在 OS keychain。
- **关键设计**：**只加密内容属性** `#{:block/title :block/name}`，结构属性（parent/order/uuid/refs）保持明文，服务器仍能排序/去重/校验/合并而看不到内容。

### 3.19 发布 / 静态导出 🔴
- **(a) 经典静态站 SPA 导出**（`deps/publishing/` + `publishing.cljs`）：把 release JS + 公开页数据（transit）打包成自包含单页应用，可托管到 GitHub Pages。
- **(b) 云端逐页发布**（`deps/publish/` Cloudflare Worker + `handler/publish.cljs`）：把单页 datoms（transit）+ 引用资源（生成 1024/1600px 变体）+ 可选 publish.css/js 上传，Worker 存 R2 + Durable Object 重建 DataScript，返回短链存回页面；支持逐页密码、取消发布。

### 3.20 导入 / 导出 🟡
- **导出**（`components/export.cljs` + `handler/export/`）：SQLite DB、zip、DB EDN（sqlite.build）、**Markdown**（缩进 dashes/spaces/none）、HTML、OPML、**Roam JSON**、debug transit；块级右键导出；定时自动备份到指定文件夹。
- **导入**（`components/imports.cljs`）：SQLite DB+assets、**File graph（Markdown/Org）→ DB**（用 `graph-parser/exporter`，含把标签转类等丰富选项）、debug transit、DB EDN。
- ⚠️ **诚实说明**：本版 Roam 仅**导出**无导入；**无 Obsidian/OPML 导入**（旧 file 版有）。`deps/graph-parser`（mldoc/extract/block/exporter）是通用 Markdown/Org 摄入路径。

### 3.21 PDF 标注 🔴
- PDF.js 查看器（`extensions/pdf/`）。每个高亮 = 打 `:logseq.class/Pdf-annotation` 标签的**块**，经属性存颜色/页码/位置 rects/类型；**区域高亮**把选区栅格化存 PNG 资源；标注块与源块互为反链，可跳回 PDF 页。

### 3.22 资源管理（Assets）🟡
- 文件放图内 `assets/`；DB 图里每个资源是带 `:logseq.property.asset/{type,checksum,size,...}` 的块，磁盘存 `assets/<uuid>.<ext>`。100MB/文件上限；`asset://` 协议解析；Electron 支持外部目录别名（`@` 前缀）；同步图支持按需远程下载资源。

### 3.23 其它集成（本版状态）
- **Zotero**：⚠️ 退化为~98 行 stub，仅剩设置 + 本地附件路径解析，**Web API 导入已移除**。
- **本地 HTTP API 服务器**：Electron 主进程 Fastify 绑 `127.0.0.1:12315`，`POST /api` bearer-token 桥接**整个插件 API**；可选 **MCP server**（`/mcp`，给 LLM agent 用）。
- **白板**：⚠️ **本版已移除**（无组件/路由/tldraw 包，仅剩兼容性数据守卫）。
- **移动端**：完整 Capacitor app（非壳），复用共享 handler/DataScript/RTC，自带移动 UI 层；原生 secure storage 承载 E2EE 密码。

---

## 4. Obsidian 功能补充（对比视角）

> Obsidian 闭源，本节基于公开功能与生态知识整理。**对 jade-garden 更重要**——因为 Obsidian 与 jade-garden 同为"一页一 Markdown 文件"模型，是更现实的对标对象。

### 4.1 核心模型
- **Vault = 一个文件夹**，里面是 `.md` 文件 + 附件；**文件即真相**，无数据库（社区插件另建索引）。编辑器有 **Live Preview（所见即所得）** 与 Source 两种模式 + Reading（阅读）视图。
- **Properties（frontmatter）**：YAML frontmatter 被提升为一等"属性"，有类型（text/list/number/checkbox/date/datetime），有属性面板 UI 与全局属性视图。**≈ jade-garden 的 frontmatter，但 Obsidian 有类型化 + UI 编辑。**

### 4.2 链接与引用（与 Logseq 的关键差异）
- 内部链接 `[[Note]]`、`[[Note#Heading]]`、别名 `[[Note|显示名]]`。
- **持久块引用**：在段落末尾写 `^block-id` 生成**落盘的稳定块 ID**，用 `[[Note#^block-id]]` 链接、`![[Note#^block-id]]` 嵌入。**这正是 jade-garden 现在缺的、且比 Logseq 的 file 模型更适合借鉴的方案**——块 ID 是写进 Markdown 的锚点，不依赖数据库。
- **嵌入/转写（transclusion）** `![[...]]`：嵌入整页、某标题段、某块、或图片/PDF/音视频。
- 标签 `#tag`、嵌套标签 `#a/b`、标签面板。
- **Backlinks 面板**（Linked + Unlinked mentions）、**Outgoing links 面板**——与 Logseq 概念一致。

### 4.3 视图与导航
- **图谱**：全局图谱 + **局部图谱**（当前笔记邻域，可调 depth）；力导向；按 tag/路径分组着色、过滤、可存过滤器。
- **大纲面板**、**标签面板**、**搜索**（强大的 operator：`file: path: tag: line: section: block: task: task-todo: task-done:`，正则、搜索替换）。
- **命令面板 Cmd-P**、**Quick switcher Cmd-O**、**Bookmarks（书签）**。
- **多窗格/分屏/标签页 + Linked panes（联动窗格）**、Workspaces（工作区布局保存）。

### 4.4 内容与富文本
- **Callouts** `> [!note] Title`、**脚注** `[^1]`、**Mermaid（原生）**、**LaTeX（MathJax）** `$...$`/`$$...$$`、代码块、表格、任务列表 `- [ ]`。
- **Canvas（核心）**：无限白板，存为 JSON `.canvas` 文件，可放卡片/笔记/图片/连线——对应 Logseq（已移除）的白板。
- **Bases（新核心功能，1.9+）**：对笔记的 properties 做**数据库式表格/视图**（类似内置 Dataview / Notion 表），是 Obsidian 版的"对象/结构化查询"。

### 4.5 每日笔记、模板
- **Daily Notes（核心）** + Periodic Notes（社区，周/月/季/年）。
- **Templates（核心）** + **Templater（社区，JS 脚本模板）**。

### 4.6 生态、主题、定制
- **社区插件生态（庞大）**：Dataview（frontmatter/inline field 查询语言）、Tasks（任务管理，查询/重复/优先级）、Excalidraw、Kanban、Calendar、Advanced Tables、PDF++ 等——很多 Logseq 内置能力在 Obsidian 是插件。
- **主题 + CSS Snippets**、**Hotkeys 自定义**、**核心插件开关**。
- 插件 API 是 TypeScript（`obsidian` 包），直接操作 DOM/Vault/MetadataCache，非沙箱（与 Logseq 沙箱 RPC 不同）。

### 4.7 同步与发布
- **Obsidian Sync（官方付费）**：端到端加密的文件级同步（含版本历史）。
- **Obsidian Publish（官方付费）**：一键发布为公开静态站。
- 免费用户常用 git / 第三方网盘同步。

### 4.8 Obsidian vs Logseq 一句话总结
- **Obsidian**：文件为真相、段落式 Markdown、`^block-id` 落盘、Canvas、Bases、插件生态庞大、Live Preview。**架构上 = jade-garden 的近邻。**
- **Logseq**：数据库为真相（本版）、大纲/块为核心、结构化属性/类/对象/datalog、RTC 协同、闪卡。**能力更"重"，架构离 jade-garden 更远。**

---

## 5. jade-garden 当前能力清单（浓缩）

> 详见第 6 节差距表的"jade-garden 现状"列；此处给整体定位。完整逐组件清单见调查底稿。

- **架构定位**：一页一 `.ad` 文件（YAML frontmatter + Markdown body）；Rust/Axum 后端把 body 当纯文本（只拆 frontmatter + 正则扫 `[[...]]`）；Vue3 前端单栏 Tiptap WYSIWYG。**非块/大纲数据库**；block ID 只是临时位置序号、不落盘。
- **后端端点**：workspace 打开/查询、files 列表/建/改名/删、wiki 读/写（自动写 `updated_at`）、backlinks、outlinks、graph（仅全局）。内存 `LinkIndex`（title→path / outlinks / backlinks），启动/写入/文件监听时重建。⚠️ 设计文档里的 `/api/graph/local`、`/api/search` 未实现。
- **前端已实现**：三栏 Shell + Ribbon（Files/Search/Recent + 全局图谱 + 主题）；文件树（展开折叠/打开，**无右键/重命名/删除 UI/拖拽**，且因后端返回扁平列表嵌套目录平铺）；**多标签**（常驻挂载 v-show 切换）；WYSIWYG 编辑 + 2s 防抖自动保存；**WikiLink 点击跳转 + 悬空链接建页**（block 跳转仅 console.log 未实现）；**Cytoscape 图谱**（全局 + 前端 BFS 局部，控件齐全）；右侧栏 Outline（只读、点击不滚动）/ Backlinks / Outgoing links / Properties（**只读、不可编辑**）；搜索面板（**仅文件名模糊、非全文**）；Quick Switcher（Cmd+O 文件名模糊）；状态栏；主题（light/dark + 5 强调色）。
- **编辑器（@autodown/editor，Tiptap）**：段落、H1-H3、引用、分割线、无序/有序/任务列表、代码块（highlight.js + 语言选择器）、表格（列宽/行高拖拽、IAL 往返）、Callout（7 型 `:::type`）、Details 折叠（`:::details`）、Math 块（`$$`，**编辑器内不实时渲染 KaTeX**）、Mermaid（仅代码块高亮**不渲染图**）、图片、WikiLink（`[[Title]]`/`[[Title#blockId]]` 即时转 atom 节点、可点击）、粗斜下删/行内码/链接、斜杠菜单（16 项）、Bubble Menu、拖拽手柄。
- **明显缺失**：持久块 ID/块引用、编辑器内 math/mermaid 实时渲染、H4-H6、脚注、页面嵌入/transclusion、`#tag` 系统、全文搜索、可编辑 frontmatter、文件右键操作、面包屑、每日笔记、模板、最近文件、局部图后端、块级滚动定位。

---

## 6. 差距分析

图例：现状 ✅ 已具备 / 🟡 部分 / ❌ 缺失。依赖：🟢 纯前端/渲染 · 🟡 需索引层 · 🔴 需块数据库。优先级：**P0** 基础必备 · **P1** 高价值中期 · **P2** 进阶 · **P3** 远期/可选。

### 6.1 编辑与内容
| 功能 | Logseq | Obsidian | jade-garden | 依赖 | 优先级 |
|---|---|---|---|---|---|
| Markdown WYSIWYG 编辑 | ✅ | ✅(Live Preview) | ✅ | 🟢 | — |
| H4-H6 / 脚注 | ✅ | ✅ | ❌ | 🟢 | P1 |
| Callout / Details / 表格 | ✅ | ✅ | ✅ | 🟢 | — |
| 编辑器内 KaTeX 实时渲染 | ✅ | ✅ | 🟡(源码文本) | 🟢 | P1 |
| 编辑器内 Mermaid 渲染 | ❌(本版) | ✅ | 🟡(仅高亮) | 🟢 | P1 |
| 可编辑 Properties(frontmatter) | ✅ | ✅(类型化) | 🟡(只读) | 🟢 | P0 |
| 斜杠命令 / Bubble Menu | ✅ | ✅ | ✅ | 🟢 | — |

### 6.2 链接与结构
| 功能 | Logseq | Obsidian | jade-garden | 依赖 | 优先级 |
|---|---|---|---|---|---|
| `[[页面]]` 链接 + 建页 | ✅ | ✅ | ✅ | 🟡 | — |
| `[[Note#Heading]]` 标题跳转 | ✅ | ✅ | 🟡(解析未定位) | 🟡 | P1 |
| **持久块 ID + 块引用** | ✅`((uuid))` | ✅`^id` | ❌(临时序号) | 🟡 | P1 |
| 嵌入/transclusion `![[...]]` | ✅ | ✅ | ❌ | 🟡 | P2 |
| `#tag` 标签系统 + 标签面板 | ✅ | ✅ | ❌ | 🟡 | P1 |
| 页面别名 | ✅ | ✅ | ❌ | 🟡 | P2 |
| 反链面板(Linked) | ✅ | ✅ | ✅ | 🟡 | — |
| Unlinked references | ✅ | ✅ | ❌ | 🟡 | P2 |
| 出链面板 | ✅ | ✅ | ✅ | 🟡 | — |
| **大纲 outliner / 缩进块树** | ✅(核心) | ❌(段落) | ❌ | 🔴 | P3 |
| Zoom-in / 面包屑 | ✅ | 🟡 | ❌ | 🔴 | P3 |

### 6.3 检索与导航
| 功能 | Logseq | Obsidian | jade-garden | 依赖 | 优先级 |
|---|---|---|---|---|---|
| **全文搜索** | ✅(FTS5) | ✅(operators) | ❌(仅文件名) | 🟡 | P0 |
| 命令面板 Cmd-P | ✅ | ✅ | ❌ | 🟢 | P1 |
| Quick switcher | ✅ | ✅ | ✅ | 🟢 | — |
| 大纲面板可点击滚动 | ✅ | ✅ | 🟡(不滚动) | 🟢 | P0 |
| 页内查找 | ✅ | ✅ | ❌ | 🟢 | P2 |
| 书签 / 收藏 | ✅ | ✅ | ❌ | 🟢 | P2 |
| 最近文件 | ✅ | ✅ | 🟡(占位) | 🟢 | P1 |

### 6.4 图谱
| 功能 | Logseq | Obsidian | jade-garden | 依赖 | 优先级 |
|---|---|---|---|---|---|
| 全局图谱 | ✅ | ✅ | ✅ | 🟡 | — |
| 局部图谱 | ✅ | ✅ | ✅(前端 BFS) | 🟡 | — |
| 过滤/分组着色/depth | ✅ | ✅ | ✅ | 🟢 | — |
| Time-travel 时间轴 | ✅ | ❌ | ❌ | 🟡 | P3 |
| tag/属性节点入图 | ✅ | 🟡 | ❌(仅页面) | 🟡 | P2 |

### 6.5 组织与工作流
| 功能 | Logseq | Obsidian | jade-garden | 依赖 | 优先级 |
|---|---|---|---|---|---|
| 每日笔记 / 日记 | ✅ | ✅ | ❌ | 🟡 | P1 |
| 模板(变量 `<%today%>`) | ✅ | ✅ | ❌ | 🟡 | P1 |
| Quick capture / add | ✅ | 🟡 | ❌ | 🟡 | P2 |
| 任务(TODO/优先级/排期) | ✅ | 🟡(核心+Tasks 插件) | ❌ | 🟡/🔴 | P2 |
| 重复任务 | ✅ | 🟡(插件) | ❌ | 🟡 | P3 |
| **查询/Dataview/Bases** | ✅datalog | ✅Bases/Dataview | ❌ | 🔴 | P3 |
| 闪卡 / 间隔重复 | ✅FSRS | 🟡(插件) | ❌ | 🔴 | P3 |
| 结构化属性/类/对象 | ✅ | ✅Bases | ❌ | 🔴 | P3 |

### 6.6 文件与工作区
| 功能 | Logseq | Obsidian | jade-garden | 依赖 | 优先级 |
|---|---|---|---|---|---|
| 文件树嵌套/展开 | ✅ | ✅ | 🟡(平铺) | 🟢 | P0 |
| 文件右键(重命名/删除/新建) | ✅ | ✅ | ❌ | 🟢 | P0 |
| 拖拽移动文件 | 🟡 | ✅ | ❌ | 🟢 | P2 |
| 多标签/分屏 | ✅ | ✅ | 🟡(标签,无分屏) | 🟢 | P1 |
| 侧栏折叠/拖拽宽度 | ✅ | ✅ | ❌(固定宽) | 🟢 | P1 |
| 资源/附件管理(拖入图片) | ✅ | ✅ | ❌ | 🟡 | P1 |

### 6.7 平台与扩展
| 功能 | Logseq | Obsidian | jade-garden | 依赖 | 优先级 |
|---|---|---|---|---|---|
| 主题 light/dark + 定制 | ✅ | ✅ | ✅(+强调色) | 🟢 | — |
| custom.css | ✅ | ✅ | ❌ | 🟢 | P2 |
| 快捷键自定义 | ✅ | ✅ | ❌ | 🟢 | P2 |
| 插件系统 / API | ✅(沙箱 RPC) | ✅(TS) | ❌ | 🟢 | P3 |
| 实时协同 RTC | ✅ | ❌(仅 Sync) | ❌ | 🔴 | P3 |
| E2EE | ✅ | ✅(Sync) | ❌ | 🔴 | P3 |
| 发布静态站 | ✅ | ✅(付费) | ❌ | 🟡 | P3 |
| 导入(Roam/Obsidian/MD) | 🟡 | ✅ | ❌ | 🟡 | P2 |
| 导出(MD/OPML/HTML/PDF) | ✅ | ✅ | ❌ | 🟡 | P2 |
| PDF 标注 | ✅ | ✅ | ❌ | 🔴 | P3 |
| 白板 / Canvas | ❌(本版) | ✅Canvas | ❌ | 🟡 | P3 |
| 移动端 | ✅ | ✅ | ❌(Web) | — | P3 |

---

## 7. 关键架构抉择（必须先定）

整个复刻计划的分水岭是**是否引入"块级稳定标识 + 索引/数据库层"**。给出三条可选路线：

- **路线 A：坚守 Obsidian 式文件模型（推荐作为主线）**
  - 文件永远是真相；引入 **Obsidian 式落盘块 ID `^id`**（写进 `.ad`，不依赖数据库）解决持久块引用/嵌入。
  - 后端建一个**持久化索引库**（SQLite：pages、blocks(带 heading/`^id`)、links、tags、properties、FTS5），文件保存/监听时增量更新。这层只是"派生缓存"，删了能从文件重建。
  - 可覆盖第 6 节几乎所有 P0/P1/P2（双链、块引用、标签、全文搜索、反链/unlinked、图谱、每日笔记、模板、Bases 式属性表）。
  - **不追求** Logseq 的大纲 outliner（段落模型与 outliner 是两种编辑范式，混用体验差）。

- **路线 B：转向 Logseq 式块/大纲数据库**
  - 数据库为真相，`.ad` 降为镜像。能拿到 Logseq 全部能力（outliner、块引用、datalog、RTC），但要重写编辑器为 outliner、承担 db↔文件镜像/同步复杂度，且**背离 jade-garden 现有段落式 WYSIWYG**。投入巨大。

- **路线 C：混合**——文件为真相 + 可选"大纲视图"作为某些页面的呈现方式。复杂度高、收益边际，暂不建议。

> **建议**：走**路线 A**。它与现有代码（一页一文件 + Tiptap + 内存 LinkIndex）连续，把内存 `LinkIndex` 升级为持久化 SQLite 索引即可解锁绝大多数 Obsidian 档功能；Logseq 独有的 outliner/datalog/闪卡列为 P3 远期，视需要再评估路线 B。

---

## 8. 建议路线图

按第 6 节优先级归并成阶段（每阶段可独立交付、验证）。

### P0 — 基础补齐（让"日常可用"不再有硬伤）
1. **可编辑 Properties 面板**：frontmatter 读写 UI（文本/列表/数字/勾选/日期），保存回 `.ad`。
2. **全文搜索**：后端把内存 `LinkIndex` 升级为 SQLite（含 FTS5，trigram 以支持中文子串），新增 `/api/search`；前端搜索面板接入（片段高亮）。
3. **大纲面板可点击滚动定位** + **正文标题锚点跳转**（含 `[[Note#Heading]]`）。
4. **文件树修复**：后端返回真正的嵌套树（填 `children`）；前端加右键菜单（新建/重命名/删除）。

### P1 — 对齐 Obsidian 常用体验
5. **持久块 ID `^id`**：编辑器落盘块 ID + `[[Note#^id]]` 链接与跳转（借鉴 Obsidian，不依赖数据库）。
6. **`#tag` 标签系统** + 标签面板 + 图谱标签节点。
7. **每日笔记**（按日期命名 `.ad`、今日/前后导航、journals feed）+ **模板**（`<% today %>` 等变量 + 自然语言日期）。
8. **命令面板 Cmd-P** + **最近文件**。
9. **编辑器内 KaTeX / Mermaid 实时渲染**（把 preview renderer 能力接进单栏编辑器）。
10. **UI 打磨**：侧栏可折叠/拖拽宽度、多标签分屏、H4-H6/脚注、拖入图片存 assets。

### P2 — 进阶知识管理
11. **Unlinked references** + **页面别名** + **嵌入/transclusion `![[...]]`**。
12. **任务系统**（TODO/优先级/SCHEDULED/DEADLINE + agenda 视图，语义借鉴 Logseq/Tasks 插件，落文本）。
13. **导入/导出**（Markdown/OPML/HTML，Obsidian vault 导入）。
14. **custom.css / 快捷键自定义 / 页内查找 / 书签**。

### P3 — 远期 / 需重架构评估
15. **Bases 式结构化查询**（对 frontmatter 属性做表格/看板视图；先做无 datalog 的属性过滤 + 表格）。
16. **闪卡 / 间隔重复（FSRS）**、**PDF 标注**、**Canvas 白板**、**插件系统（沙箱 + RPC + 注册表）**。
17. **协同/同步**：先文件级（git/3-way 合并），Logseq 式块级 op-log/RTC 属"路线 B"范畴，按需再评估。

---

## 9. 源码路径速查（Logseq）

- 数据模型/Schema：`deps/db/src/logseq/db/frontend/{schema,property,malli_schema}.cljs`、`.../property/type.cljs`、`deps/db/src/logseq/db/common/{order,sqlite}.cljs`
- 解析器/文件格式：`deps/graph-parser/src/logseq/graph_parser/{extract.cljc,block.cljs,property.cljs,exporter.cljs,mldoc.cljc}`、`docs/logseq-markdown-syntax.md`、`src/main/frontend/worker/markdown_mirror.cljs`
- 大纲/编辑：`deps/outliner/src/logseq/outliner/{core,op,tree,property,template}.cljs`、`src/main/frontend/handler/editor.cljs`、`src/main/frontend/commands.cljs`、`modules/shortcut/config.cljs`
- 引用/属性/类/对象：`src/main/frontend/components/{reference,reference_filters,property,class,objects,views}.cljs`、`deps/db/src/logseq/db/common/reference.cljs`
- 查询/任务/闪卡：`src/main/frontend/db/query_dsl.cljs`、`components/query/*`、`components/scheduled_deadlines.cljs`、`worker/commands.cljs`、`extensions/fsrs.cljs`、`docs/recurring-tasks.md`
- 图谱/搜索：`src/main/frontend/extensions/graph/{pixi,pixi/logic}.cljs`、`common/graph_view.cljs`、`worker/search.cljs`、`components/cmdk/*`、`common/search_fuzzy.cljs`
- 日记/模板/富内容：`components/journal.cljs`、`handler/journal.cljs`、`template.cljs`、`extensions/{latex,code,calc,highlight,lightbox}.cljs`、`components/macro.cljs`
- 插件/主题/快捷键/设置：`libs/`、`src/main/logseq/api/*`、`handler/plugin.cljs`、`components/{plugins,theme,shortcut,settings}.cljs`、`deps/shui`、`packages/ui`
- 同步/加密/发布/导入导出：`deps/db-sync/`、`src/main/frontend/worker/sync/*`、`common/crypt.cljs`、`worker/sync/crypt.cljs`、`deps/publish/`、`deps/publishing/`、`components/{export,imports,e2ee,server}.cljs`、`extensions/pdf/`、`handler/assets.cljs`

---

## 10. 追加：文件版 Logseq（0.10.15）——文件模型下的具体实现

> 之前第 2–3 节分析的 logseq 快照是当前 `master`（DB 版）。本节专门补查 **tag `0.10.15`**（commit `03bcefbdf8`，2025-11-14 发布），这是最后一个**文件图版本**：磁盘上就是 `.md`/`.org` 文件，`deps/db-sync` / `markdown_mirror.cljs` 等 DB 版机制都不存在，白板、`{{query}}`/`{{embed}}`、SM-5 闪卡等能力仍是一等公民。它与 jade-garden 的"一页一文件"模型完全同构，是**最应参考的实现来源**。

### 10.1 两个版本的核心差异速览

| 维度 | 0.10.15 文件版 | master DB 版 |
|---|---|---|
| 真相源 | `.md`/`.org` 文件 | SQLite 里的 DataScript（transit 序列化） |
| Markdown Mirror | 无 | 有（单向导出） |
| RTC/DB Sync | 无 | 有（`deps/db-sync`） |
| 白板 | ✅ `whiteboards/*.edn` + tldraw | ❌ 已移除 |
| `{{query}}` 宏 | ✅ 一等公民 | ⚠️ 已弃用，改 DB live query |
| `{{embed}}` 宏 | ✅ | ⚠️ 已弃用 |
| 块引用 `((uuid))` | ✅ | ⚠️ 提示改用 `[[` |
| 任务语法 | ✅ Markdown marker + `SCHEDULED:` | ✅ 但映射为 DB 属性 |
| 闪卡 | ✅ SM-5，状态写 `.md` 属性 + 全局 `srs-of-matrix.edn` | ✅ FSRS，状态写 DB 属性 |
| 图谱 | d3-force + Pixi（一致） | d3-force + Pixi（一致） |

因此，jade-garden 要复刻的是 **0.10.15 文件版的这套做法**，而不是 master 的 DB 版做法。

### 10.2 块级身份与 `((uuid))` 块引用

**块 ID 怎么来**
- DataScript schema 中 `:block/uuid` 是 `:db.unique/identity`，全局主键（`deps/db/src/logseq/db/schema.cljs`）。
- 解析器优先读正文里的 `id:: <uuid>`（也兼容 `custom_id`/`custom-id`）；没有则 `d/squuid` 生成（`deps/graph-parser/src/logseq/graph_parser/block.cljs`）。
- **关键**：被引用（`(:block/_refs b)` 非空）且当前 content 里还没有该 UUID 的块，**保存时会把 `id::` 自动写回源文件**（`src/main/frontend/modules/file/core.cljs` 的 `transform-content`）。`handler/editor.cljs` 的 `set-blocks-id!` 也会批量写入。
- Markdown 中 `id::` 作为简写属性放在块首行；Org 模式用 `:PROPERTIES:` 抽屉。

**语法**
- 块引用 `((aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee))`，正则见 `deps/graph-parser/src/logseq/graph_parser/util/block_ref.cljs`。
- mldoc AST 产出 `["Block_reference" "<uuid>"]` 或 `["Block_ref" "<uuid>"]`；`{{embed ((uuid))}}` 与 `{{embed [[Page]]}}` 也在同一解析路径处理。
- 渲染：`src/main/frontend/components/block.cljs` 的 `block-reference` 组件渲染 `((uuid))`，`macro-embed-cp` 渲染 embed。

**跨文件解析**
- 文件图没有外部索引文件。它通过把所有文件解析进同一个内存 DataScript 来建全局索引：`deps/graph-parser/src/logseq/graph_parser.cljs` 的 `parse-file` 会先 retract 旧块但保留仍被引用的 UUID，再事务写入 page/block/uuid/refs 等。
- 因此 `((uuid))` 跨文件解析直接靠 DataScript 的 uuid lookup ref，不依赖文件名。

**给 jade-garden 的落地要点**
1. 在 Markdown body 中支持 `id:: <uuid>`（放在块首行）。
2. 后端/前端维护一个全局 `uuid → block` 索引；每次文件保存/监听时增量更新。
3. 保存文件时，检查"被引用但未持久化 UUID"的块，自动注入 `id::`。
4. 前端 `((uuid))` 与 `[[Page#^id]]` 可二选一：Logseq 用 UUID；Obsidian 用落盘 `^id`。建议 jade-garden 同时支持 Obsidian 式 `^id`（更短可读）并内部 fallback 到 UUID。

### 10.3 日记 / Daily Notes

- 目录：`journals/`（`logseq/config.edn` 的 `:journals-directory`）。
- 默认文件名：`yyyy_MM_dd.md`（`src/main/frontend/date.cljs`）。
- 可配置：`:journal/file-name-format`（文件名日期格式）、`:journal/page-title-format`（页面标题格式，默认 `"MMM do, yyyy"`）。
- 日记页就是普通 `.md`/`.org`，无特殊 frontmatter；区别仅在页面实体的 `:block/journal? true` + `:block/journal-day`（整数 `yyyyMMdd`）。
- 创建/导航：`handler/page.cljs` 的 `create-today-journal!` 计算标题→文件名→路径；`handler/journal.cljs` 的 `go-to-tomorrow!`/`go-to-prev-journal!` 按日期前后跳转。

**给 jade-garden**：直接按日期命名 `.ad` 文件，支持 `:journal/file-name-format`/`page-title-format`，提供今日/前后导航和 journals feed（可虚拟滚动）。

### 10.4 白板（Whiteboards）

- 目录：`whiteboards/`（`:whiteboards-directory`）。
- 文件格式：`.edn`（不是 Markdown），结构是 `{:pages [...] :blocks [...]}`。
- 页面 `:block/type "whiteboard"`、`:ls-type :whiteboard-page`；形状块 `:ls-type :whiteboard-shape`、`:logseq.tldraw.shape {...}`。
- 渲染：tldraw，动态加载（`src/main/frontend/extensions/tldraw.cljs`、`components/whiteboard.cljs`）。
- 与普通页链接：白板上 "logseq-portal" 形状，`:blockType "P"` 引用页面名，`:blockType "B"` 引用块 UUID；解析后写入 `:block/refs` 参与反链。

**给 jade-garden**：白板 = `.canvas`/`.edn` 文件 + tldraw 渲染。可先用 tldraw SDK 实现基础无限白板；portal 链接到 `.ad` 页面/块。优先级 P3。

### 10.5 任务管理（TODO / 优先级 / SCHEDULED / 重复）

**语法（纯文本）**
- marker：`- TODO ...`、`- DOING ...`、`- DONE ...`、`- NOW ...`、`- LATER ...`。
- 优先级：`- TODO [#A] 重要任务`。
- 计划/截止：独立成行的 `SCHEDULED: <2024-01-15 Mon>` / `DEADLINE: <...>`。
- 重复：`- TODO 周报 SCHEDULED: <2024-01-15 Mon +1w>`。

**状态循环**
- `:preferred-workflow :now` → `LATER → NOW → DONE → 清除 → LATER`。
- `:preferred-workflow :todo`（默认）→ `TODO → DOING → DONE → 清除 → TODO`。
- 快捷键 `mod+enter` 调 `frontend.handler.editor/cycle-todo!`。

**重复任务写回规则**
- 带 repeater 且标记完成时，`update-timestamps-content!` 会：
  1. 把 `SCHEDULED:` / `DEADLINE:` 行日期替换为 next-timestamp；
  2. 把 marker 重置为 `TODO`/`LATER`（不是 DONE）；
  3. 向 `logbook` drawer 追加状态变更记录。
- repeater 类型：`+`（从计划推进）、`.+`（从完成推进）、`++`（跳到未来）。

**Agenda 聚合**
- Journal 页底部 "SCHEDULED AND DEADLINE" 用 Datalog 查 `:block/scheduled`/`:block/deadline` 在今天到未来 N 天之间、marker 非 DONE/CANCELED 的块（`components/scheduled_deadlines.cljs`、`db.model/get-date-scheduled-or-deadlines`）。

**给 jade-garden**：完全可在纯文本 `.ad` 中实现。需后端解析 marker、优先级、`SCHEDULED:`/`DEADLINE:` 行及 repeater；保存时按规则重写日期/marker；提供 journal agenda 聚合查询。

### 10.6 查询系统 `{{query ...}}`

**语法**
- `{{query [[Page]]}}`、`{{query #tag}}`、`{{query (and [[project]] (task NOW LATER))}}`。
- 渲染：`components/block.cljs` 的 `macro-query-cp` → `components.query/custom-query` → `db.query-dsl/query`。

**支持的 DSL**
- `[[Page]]` / `#tag`、`(and/or/not)`、`(task NOW LATER)`、`(priority A B)`、`(between -7d +7d)`、`(between created-at -1d today)`、`(property key value)`、`(page-property key value)`、`(page-tags #tag)`、`(sample N)`、`(sort-by created-at asc)`、`"full text"`。
- Datalog rules：`frontend.db.rules/query-dsl-rules`。

**执行模型**
- 文件 → 解析成 mldoc AST → 生成 DataScript tx-data → 写入内存 DataScript。
- 查询在内存 DataScript 上执行（`db.query-react/react-query`）。

**结果渲染**
- 默认列表；表格触发条件：block 属性 `query-table: true`、query 字符串以 `table` 结尾、传入 `table-view?`。
- 表格列由 `query-properties` 或结果中所有非内置属性决定（`components.query-table/result-table`）。
- 自定义 view：query block 的 `:view` 属性放 Clojure 函数，用 `frontend.extensions.sci` 执行。
- ⚠️ 0.10.15 文件图**没有内置 board/calendar/gallery**；需通过 `:query/views` 自定义 SCI 函数实现。

**给 jade-garden**
- 不需要 DataScript：把 `.ad` 解析成块模型（块 UUID、properties、refs、marker、scheduled/deadline），在内存建索引，即可执行同样 DSL。
- 优先实现列表 + 表格；自定义 view / board 后续再做。

### 10.7 闪卡 / SRS（SM-5）

**卡片语法**
- `#card` 标签或 `[[card]]` 引用 = 该块是卡片；包含子块。
- `{{cloze 答案\提示}}` 挖空宏。
- `{{cards [[Deck]]}}` 组件宏，按 query 找出卡组复习。

**调度算法：SM-5**
- 维护 OF-Matrix（optimal factor matrix），键为 `[重复次数 n, 当前 EF]`。
- 评分 quality 0–5；复习按钮对应 1（忘记）、3（艰难想起）、5（清晰记得）。
- 公式：
  - `EF' = max(1.3, EF + 0.1 - (5-q)(0.08 + 0.02(5-q)))`
  - `OF' = OF * (0.72 + q * 0.07)`，再用 learning-fraction 平滑
  - interval = OF(n, EF) 的递归乘积
- 若 `q < 3`，interval 重置为 `-1`，repeats 重置为 `1`。

**状态存储**
- 每张卡片的调度状态存在**块属性**里（写入 `.md`）：
  - `card-last-interval`、`card-repeats`、`card-last-reviewed`、`card-next-schedule`、`card-ease-factor`、`card-last-score`。
- 全局 OF-Matrix 通过 `frontend.util.persist-var` 存到 **`logseq/srs-of-matrix.edn`**。

**给 jade-garden**
- 完全可用文件模型复刻：`#card` + `{{cloze}}` + 块属性存 SM-5/SM-2 状态 + `jade-garden/srs-matrix.edn` 存全局矩阵 + 复习 UI。优先级 P2/P3。

### 10.8 文件树、资源与图谱

**目录约定**
- `pages/`、`journals/`、`whiteboards/`、`assets/`、`logseq/`（config.edn、custom.css、custom.js、export.css、.recycle/）。
- `pages/contents.md` 自动作为目录页。

**资源 assets**
- 拖拽/粘贴文件统一写入 `assets/`，文件名空格/`%`/`/` 会被替换并追加时间戳索引，如 `assets/journals_2021_02_03_1612350230540_0.png`。
- Markdown 引用：`![alt](../assets/xxx.png)`、`[label](../assets/xxx.pdf)`。
- 桌面端支持 asset alias `@alias/file.png`。
- 渲染时 `make-asset-url` 转成平台 URL（Electron `assets://`、浏览器 `blob:` URL、移动端 capacitor protocol）。

**图谱**
- 渲染栈同 master：d3-force + Pixi（`extensions/graph/pixi.cljs`）。
- 数据：`handler/graph.cljs` 的 `build-global-graph` / `build-page-graph` / `build-block-graph`，分别调用 `db.model/get-pages-relation`、`get-page-referenced-pages`、`get-block-referenced-blocks`。
- 节点：page、tag、namespace parent；边来源：页面引用 `[[Page]]`、tag 关系、namespace 层级；块引用单独 `build-block-graph`。
- 过滤：journal、orphan pages、builtin pages、`exclude-from-graph-view`；持久化到 `logseq/config.edn` 的 `:graph/settings` 与 `:graph/forcesettings`。

**给 jade-garden**：资源系统可直接照搬 `assets/` 集中管理 + 相对路径引用；图谱可继续用 Cytoscape，但节点/边语义和过滤维度参考此处。

### 10.9 导入 / 导出 / Markdown 往返

**导入**
- Roam JSON、Logseq EDN/JSON、OPML（`frontend/handler/external.cljs`）。
- Markdown/Org 的"导入" = 直接把目录作为新图谱打开（`frontend/handler/repo.cljs` 的 `parse-files-and-load-to-db!`）。
- ⚠️ 0.10.15 **没有专门的 Obsidian vault 导入器**。

**导出**
- EDN、JSON、Roam JSON、Markdown、OPML、HTML（公开页）。
- Markdown 导出走 `frontend/handler/export/text.cljs`，可选择缩进 dashes/spaces/none。

**Markdown 往返如何保留块元数据**
- 写文件链路：`outliner op → modules/outliner/file.cljs → modules/file/core.cljs/tree->file-content → transform-content`。
- **自动补 `id::`**：被引用且 content 无 UUID 的块自动插入 `id::`。
- 属性以 `key:: value`（Markdown）写出；marker、优先级、scheduled/deadline 作为行内文本；折叠状态 `:collapsed true` 作为 property 写出。

**给 jade-garden**：写 `.ad` 时同样要自动为被引用块注入稳定 ID，保留 frontmatter/properties 与 body 的 round-trip。

### 10.10 文件版插件 API（与 DB 版差异）

入口 `src/main/logseq/api.cljs` + `src/main/logseq/api/block.cljs` + `src/main/logseq/sdk/*.cljs`。

文件版特有或强依赖本地文件的能力：
- 图谱路径：`get_current_graph` 返回 `{:url :name :path}`。
- 原始文件读写：`write/read/unlink_plugin_storage_file`（点目录 `storages/<plugin-id>/` 或 `assets/`）。
- Git：`exec_git_command`、读写 `.gitignore`。
- 资源：`sdk.assets/make_url`、`list_files_of_current_graph`。
- 导出：`download_graph_pages`（zip）。

DB 版会弱化/替换这些为数据库 blob / API；jade-garden 作为文件模型应保留这些文件系统级能力。

### 10.11 对前文差距表的修正

读了 0.10.15 后，第 6 节差距表有几处应**从"P3/不可行"改为"P1–P2/可在文件模型实现"**：

| 功能 | 原评级 | 修正后 | 理由 |
|---|---|---|---|
| 持久块 ID / 块引用 | P1 | P1（核心） | 文件版用 `id::` + 全局 uuid 索引；jade-garden 可照搬，并兼容 Obsidian `^id`。 |
| `((uuid))` / `{{embed}}` | P2 | P1 | 0.10.15 文件版原生支持，不依赖 DB。 |
| `{{query}}` 宏 | P3 | P2 | 文件版靠"文件 → 内存 DataScript"实现；jade-garden 可用"文件 → 内存块索引"替代。 |
| 每日笔记 | P1 | P1 | 确认只是日期命名文件。 |
| 任务系统 | P2 | P2 | 纯文本 marker + SCHEDULED/DEADLINE + repeater。 |
| 闪卡 / SRS | P3 | P2 | SM-5/SM-2，状态写块属性 + 全局矩阵文件。 |
| 白板 | P3 | P3 | 存在但技术栈（tldraw）独立，工作量大。 |
| 导入 Obsidian vault | P2 | P3（本版没有） | 0.10.15 没有专门 Obsidian 导入器，需要自己按 vault 目录结构解析。 |

---

## 11. 修正后的建议路线图（文件模型优先）

基于 0.10.15 文件版可知，绝大多数"Obsidian/Logseq 常用能力"都能在**一页一文件 + 内存索引**模型下实现，无需路线 B 的数据库化。因此推荐路线调整为：

### 阶段 0：统一块模型（前置）
- 后端/前端都能从 `.ad` body 解析出**块列表**（heading、list item、paragraph、code block 等），并为每个块生成/读取稳定 ID（Obsidian `^id` 为主，兼容 Logseq `id:: uuid`）。
- 后端内存索引升级为持久化 SQLite：pages、blocks（含 id/uuid、marker、priority、scheduled/deadline、properties、refs）、links、tags、FTS5。

### 阶段 1：P0 基础补齐（同第 8 节）
- 可编辑 Properties 面板；全文搜索（FTS5）；大纲可点击滚动 + `[[Note#Heading]]` 定位；文件树嵌套 + 右键操作。

### 阶段 2：P1 双链与块引用
- 落盘块 ID `^id`；`((uuid))` / `[[Page#^id]]` 跳转与嵌入 `![[Page#^id]]`；Unlinked references；页面别名。

### 阶段 3：P1 组织工作流
- 每日笔记 + 模板；命令面板；最近文件；KaTeX/Mermaid 编辑器内渲染。

### 阶段 4：P2 查询、任务、闪卡
- `{{query ...}}` 宏（列表/表格）；任务 marker + priority + SCHEDULED/DEADLINE + repeater；SM-5/SM-2 闪卡。

### 阶段 5：P2–P3 平台与集成
- 导入/导出（Markdown/Roam/OPML/EDN/HTML）、custom.css、快捷键自定义、资源拖拽、插件沙箱 API、发布静态站、白板、PDF 标注、协同同步。

### 关键不变的战略结论
- **不要走路线 B（数据库即真相）**，除非未来必须做块级实时协同。0.10.15 已经证明：文件模型足够支撑 Logseq 的绝大多数能力。
- **Obsidian 是功能目标，0.10.15 是实现参考**。Obsidian 闭源，但文件版 Logseq 开源且同构，是复刻其能力的最佳蓝本。

### 0.10.15 关键源码路径速查
- 块 UUID / 解析：`deps/graph-parser/src/logseq/graph_parser/{block.cljs,util/block_ref.cljs,extract.cljs}`、`deps/db/src/logseq/db/schema.cljs`
- 文件写回/补 id：`src/main/frontend/modules/file/core.cljs`、`src/main/frontend/handler/editor.cljs`
- 渲染：`src/main/frontend/components/block.cljs`
- 日记：`src/main/frontend/date.cljs`、`src/main/frontend/handler/{journal.cljs,page.cljs}`
- 白板：`src/main/frontend/components/whiteboard.cljs`、`src/main/frontend/extensions/tldraw.cljs`、`deps/graph-parser/src/logseq/graph_parser/whiteboard.cljs`
- 任务：`src/main/frontend/handler/editor.cljs`、`frontend.util.marker`、`frontend.handler.repeated`、`frontend.components.scheduled_deadlines`
- 查询：`src/main/frontend/components/query.cljs`、`src/main/frontend/db/query_dsl.cljs`、`src/main/frontend/db/rules.cljs`
- 闪卡：`src/main/frontend/extensions/srs/`、`frontend.util.persist-var`
- 图谱：`src/main/frontend/handler/graph.cljs`、`src/main/frontend/extensions/graph/pixi.cljs`
- 资源：`src/main/frontend/handler/{editor.cljs,assets.cljs,paste.cljs}`
- 导入导出：`src/main/frontend/components/{export.cljs,imports.cljs}`、`src/main/frontend/handler/{export/*,external.cljs}`
- 插件 API：`src/main/logseq/api.cljs`、`src/main/logseq/api/block.cljs`、`src/main/logseq/sdk/*.cljs`


---

## 附：jade-garden 关键源码
- 后端：`jade-garden/back/server/src/{main,wiki,links,files,workspace,state}.rs`
- 前端：`jade-garden/front/src/{components/*.vue,stores/*.ts,lib/{api,wikiLink}.ts}`
- 编辑器：`autodown/packages/editor/src/{extensions,node-views,menus,core}/`
