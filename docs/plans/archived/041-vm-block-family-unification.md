---
plan_id: PLAN-041
status: archived
feature_name: VM 块渲染统一（块家族）+ 覆盖补齐 + 平台差异豁免表
author: [zhaopuming]
created_at: 2026-09-02
updated_at: 2026-09-03

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components:
  - "P041-1: 块家族注册表 autodown_blocks.rs——ChromeSpec（view 轨 tailwind 类串 + 编辑壳 pad/header_h 几他与 FENCE_* 配色常量）/BodyKind（Text{mono,size}|Panel）mode 门控表/17 kind family_of 全注册（'static 单例）；heading 双表（view 类串/编辑字号）与 callout kind 配色单源——只读臂（autodown_render）与编辑壳（autodown_editor）样式同源"
  - "P041-2: 共享绘制段与编辑壳家族 chrome——buffer_block_runs 纯函数（&Buffer→DocRun：语法 attrs_list span × mark 区间边界并集切格，code_editor push_run_pieces 同路）+BlockDrawCtx；render_frame 走共享段并发射 fence chrome（header 底色/四边线/语言标签/正文底色）；fence 字号 16→FENCE_SIZE(14) 两态统一；BlockBuf.syntax 语言 token"
  - "P041-3: fence 三态统一与 readonly 门控——只读臂 fence 正文=View::AutodownEditor 共享 buffer 实例（key=view_fence_<fnv1a(lang,code)> 跨流式帧稳定，value=围栏源重建；code-editor 缺席降级 lang- View::Text 双轨）；门控单源 core.is_view_instance：不路由输入（不建 undo/无光标）/不发射 chrome（外壳由只读臂 View 树家族装配），语法着色三态恒真；renderer lowering 零改动"
  - "P041-4: 跨轨高亮 token 映射表 hljs_scope_map.rs（autodown-core rust 单源手写模块，无 .at 源 regen 不触）——SCOPE_CLASS_TABLE 21 行 syntect scope 原子前缀→.hljs-* 类名（最长前缀匹配）+ 色板分组（与 engine CSS 选择器分组一一对应，light 实值镜像）+ dark 变体；auto-lang 烘焙 autodown-hljs-dark/light syntect 主题（feature autodown 门控），fence 家族（编辑+只读）着色与 vue lowlight 观感对齐不换引擎"
  - "P041-5: VM 块覆盖 13 显式臂 + 3 显式降级臂——Callout（kind 配色+icon+title 回落）/Details（▸/▾ 两态，状态源=open attr 与 vue 容器槽同源）/WikilinkBlock（链接色）/BlockEmbed（面板占位）/任务列表 ☑☐ 复选格/行内 View::Image；Mermaid（web-only 标签）/MathBlock（$$ 包裹）/QueryBlock（未求值标签）显式降级不再静默段落化"
  - "P041-6: 流式增量 StreamCache + 平台差异豁免表 + stream-demo 对拍台——render_document_streamed（结构键=serializeBlocks FNV-1a/未变块复用 gens 不增/悬挂尾块重同步/final 翻转整建/位置前缀对齐；builder tracked 臂按 path 挂注册表）；豁免表 12 行（计划）+DEBTS 六行双登记；对拍台（comparePanes 零依赖 TreeWalker+getComputedStyle 22 键快照，差异红色高亮；view 一次性 vs stream 落定零差异不变式，浏览器手验成立）"
touched_goals:
  - "目标1（VM 只读覆盖 6/17→13/17 显式臂，难块显式降级）：13 臂结构测试全绿（autodown_render 16 测）+ 联测 MCP vtree 七关键词命中 + 双截图（复审换真件 md5 72b2df7c 独立）"
  - "目标2（编辑壳块 chrome，编辑态=家族另一 mode）：fence 编辑态 header(rust 标签)+近黑面板+hljs 着色截图实证；heading 字号表同源"
  - "目标3（edit↔view 像素一致结构免费）：同一 Buffer+共享绘制段（shared_segment 一致性单测）+ 三态同 hljs 主题链"
  - "目标4（流式只弄脏尾块+护栏阈值）：streaming_increment/mid_insert gens 复用断言 + 300 块×30 chunk 护栏 release 88.49ms/单帧 5.77ms（阈值 2s/200ms 注释在案）"

current_step: 12
total_steps: 12
---

# [PLAN-041] VM 块渲染统一：块家族架构 + 缺口补齐 + 豁免表

## 变更摘要

VM 轨今天的块呈现是**两条独立实现**：只读臂（`autodown_render.rs`：
parse_blocks → View 树，有 chrome）与编辑壳（`autodown_editor/core.rs`：
块树拍平成 cosmic-text 文本叶子，kind 只影响字号/等宽，无 chrome）。本计划
按 vue 侧已验证的家族模式（plan 033：一个 widget 三态、chrome 单源）把
VM 轨收敛为**块家族架构**，并顺手补齐只读臂的块覆盖缺口：

1. **块家族架构**（本计划核心设计，用户裁定写入）：每 kind 一个家族 =
   chrome/样式单源 + mode 门控 body。文本体 view/stream 用 cosmic-text
   Buffer 裸布局（不建编辑状态），edit 用 ViEditor 包装同一 Buffer；
   面板体（table/mermaid/math/query/embed）三态同一 View，edit 加控件。
2. **fence 先行**：三态统一 SyntaxEditor/ViEditor（只读态本来就要 syntect
   着色），readonly = 不路由键盘、不画 caret、不建 undo——「view 模式关掉
   编辑功能」。
3. **覆盖补齐**：Callout/Details/WikilinkBlock/BlockEmbed + 任务列表
   checkbox + 行内图片 View::Image（现在 7 种块全部段落降级）。
4. **难块裁定 + 豁免表**：Mermaid/MathBlock/QueryBlock 显式降级口径，
   与 CustomScrollbar、代码块 chrome、WYSIWYG 手感差异一起落平台差异
   豁免表。
5. **流式增量**：keyed 块单元（chunk 只同步尾块），替代现状全文档
   reparse + View 重建（v1 性能债部分偿还）。

依赖与并行度（2026-09-02 复核）：**硬依赖仅 T11**（demo vm 联测需
040 的 app.at/feature 门/tag 名落地）。其余任务与 040 文件集零交集
（040 动 aura.at/vue.rs/aura_view_builder.rs/render_support.rs/registry.rs
/Cargo.toml + demo；本计划动 autodown_blocks.rs(新)/autodown_render.rs/
autodown_editor/*/DEBTS.md + stream-demo/packages/core）。可先行切片：
T12（stream-demo 对拍台）、T4 的 token 映射表（autodown-core 侧）——
均纯 auto-down，与 040 零冲突；auto-lang 侧任务（T1-T10）建议等 040
的 auto-lang 批次（T1-T5）折入后再开工，避免同检出工作树冲突与
cargo target 争用。

## 目标

1. VM 只读渲染块覆盖：6/17 显式臂 → 13/17（+Callout/Details/Wikilink/
   Embed/ThematicBreak 已有/checkbox/图片），难块 3 种显式降级不再静默
   段落化。
2. 编辑壳获得块 chrome：fence 编辑态显示与只读态同源的 header/边框/
   等宽着色；heading 编辑态用同源字号表——「编辑态只是块家族的另一个
   mode」在 VM 上成立。
3. edit↔view 像素一致在结构上免费：同一 Buffer + 同一绘制路径。
4. 流式更新只弄脏尾块（结构键 diff），大文档护栏测试登记阈值。

## 架构方案

```
crates/auto-lang/src/ui/
  autodown_blocks.rs        ← 新：块家族注册表（本计划核心）
    BlockFamily { kind, chrome: ChromeSpec, body: BodyKind }
    BodyKind = Text{mono,size} | Panel
    chrome 样式表单源（从 autodown_render.rs 的 Style 字符串表抽出）
  autodown_render.rs        只读臂：render_block → family 装配
                            文本体 → 共享 buffer 绘制（fence/试点）
  autodown_editor/core.rs   编辑臂：BlockBuf 保留，chrome 从 family 取
                            共享段：buffer → DocDrawList 纯函数抽取
```

**关键事实（实勘，设计的成立基础）**：

- cosmic-text 0.15 被 pin 死与 iced 0.14 同份（Cargo.toml:182 注释：
  "MUST stay on the same minor as iced 0.14.0's pin — a second copy
  would break the Weak<Buffer> handoff"）——只读臂 `View::Text` 与编辑壳
  ViEditor **底层同一文本引擎**，统一无第二实例成本。
- 编辑壳已复用 code_editor 绘制原语（core.rs:40 import
  `code_editor::draw::{CaretDraw, PreeditDraw, Pt, Rect}`），plan 019
  编辑壳本就骑在 plan 413 code_editor 栈上。
- vue 侧先例形态：plan 033 家族（chrome 单源、mode prop）、plan 039 T12
  结构同构；vue 的统一层 = 契约 + chrome + 调度，文本引擎按模式特化
  （vnode 渲染 vs contenteditable）——VM 对偶 = Buffer vs ViEditor，且因
  cosmic-text 同源可比 vue 更彻底。

**mode 门控 body（核心裁定）**：

| 块类 | view/stream | edit |
| --- | --- | --- |
| 文本体（paragraph/heading/fence/quote 正文） | Buffer 裸布局（无编辑器状态） | 同一 Buffer + ViEditor（光标/选区/undo/IME） |
| 面板体（table/mermaid/math/query/embed） | family View | 同一 View + edit 控件 |

「到处挂编辑器关掉编辑」被否：view/stream 不建 undo 栈、无光标状态，
mode 门控后编辑机器常驻开销≈0。

## 技术栈

- auto-lang（Rust）：ui/autodown_blocks.rs（新）、ui/autodown_render.rs、
  ui/autodown_editor/{core.rs,widget.rs}、ui/mod.rs、DEBTS.md
- 依赖既有：cosmic-text 0.15（vi+syntect）、syntect 5、iced 0.14
- 验证：cargo test（--features autodown）、demo `auto run -r vm` 联测

## 需求分析与背景调查

（spec store 离线，以 2026-09-02 实勘为据；上游讨论 = 本对话轮次。）

- `BlockType` 17 种（autodown-core block_model.rs:326）；
  `render_block` 显式臂仅 6（Heading/Fence/Blockquote/ListBlock/Table/
  ThematicBreak），Callout/Details/WikilinkBlock/QueryBlock/BlockEmbed/
  Mermaid/MathBlock 落 `_ => render_inlines` 段落降级。
- 编辑壳 core.rs:1119 的 BlockType 分发是**序列化回写/叶子定型**用的，
  不做呈现；`kind_font_size`/`LeafKind` 是仅有的呈现差异（字号/等宽）。
- 流式现状：`render_document` 每次 content 更新全文档 reparse + 全 View
  树重建（autodown_render.rs 头注释自登记 v1 性能债）。
- vue 端 engine 已无 Tiptap/CodeMirror（plan 018 自研引擎 +
  `assert-no-tiptap.mjs` 门禁，实查 packages/editor 为空壳）——三态统一
  的深度先例：文档模型单源 + chrome 单源，叶子编辑宿主按模式特化。

**会话架构裁定（2026-09-02，防止复议）**：

- 全文档 CM6 化（含 view 模式）**否决**——stream 性能本可行（增量事务
  + 虚拟化甚至更强），但代价四处：SSR/静态渲染出局、块树压平成装饰体操
  （Obsidian Live Preview 多年 glitch 区）、IME 高发区、**切断 016 ops ↔
  VM spine**（负贡献）。Obsidian Reading View 独立于 CM 是先例反证。
- Monaco **关门**（铁板不可抽件）；CM6 底层可抽件（state/lezer 无 DOM）
  但对位层我们已有单源实现，换入=倒退。
- fence 嵌 CM6 逃生门**已在册**：DEBTS.md 039 行（T10 降级交付，前置
  两条待裁定：npm Vue 组件桥、engine 引 @codemirror 依赖族）。
- cosmic-text WASM canvas 路线（web 与桌面逐像素同实现）= Google Docs
  级投入，**远期选项**，不进现行 roadmap；触发条件 = 产品硬性要求逐像素
  同实现。
- vue 侧超长文档流式若成瓶颈：自有管线加视口窗口化（本计划 T8 keyed
  块单元的 vue 镜像），不换引擎。

## 后续路线图（本会话商定；已建：040/041/042，其余创建时编号）

| 序 | 主题 | 核心内容 | 状态 |
| --- | --- | --- | --- |
| 040 | demo 单源化 + AutoDown 命名统一 + 契约扩展 | 见计划文件 | 已建·执行中 |
| 041 | VM 块家族统一 + 覆盖补齐 + 豁免表 | 本计划 | 已建 |
| 042 | vue 侧块家族补齐 + 三件搭车归档 | 容器族/Table 三态收编、family-parity spec、ARCHITECTURE 决策记录、editor 壳退役、vm-smoke | 已建 |
| — | 滚动同步契约 | View 契约加 scrollable offset 绑定 + 滚动消息；DSL 两栏联动；vm demo 双栏同步验收（vm-smoke 复用 042 T8） | 待建 |
| — | ghost 占位块 | 编辑壳块聚焦跟踪 + DocLayout 尺寸暴露 + 只读臂 ghost 渲染（契约 props 040 已定） | 待建 |
| — | 表格列宽拖拽 | iced Table 列边界命中 + 拖拽 + 列宽状态；验收口径=行为对齐非像素对齐 | 待建 |
| — | 编辑行为补齐 + 语料跨轨 | VM 编辑壳在册缺口（Enter 拆块/退格跨块合并/跨块选区/IME 实机）；验收 = vue `semantics.test.ts` 语料移植 VM | 待建 |
| — | jade widget 词汇补齐 | 29 widget 清点 → iced fallback 名单（select/tabs/modal/…）逐个补臂 | 待建 |
| — | jade desktop 重组装 | 废 260 行骨架 app.at，desktop 改消费 front/auto 29 widget + stores；六流驱动断言 | 待建 |
| — | jade parity 收口 | 六流基线、cytoscape 等难件终裁、DEBTS 销号（"29-widget 迁移归位"待办退役） | 待建 |

（jade-garden 现状：desktop 为独立 260 行骨架 app.at + textarea 编辑，
与 front/auto 29-widget 完全平行——统一工作即上表末三行。执行序：
040 → 041 → 042 → 其余按序创建。）

## 详细设计

1. **autodown_blocks.rs（新模块）**：
   - `ChromeSpec`：容器样式类（Style 字符串表）+ 可选 header（fence 语言
     栏）+ 边框/配色（callout kind 配色表对齐 vue `builtin-panels.ts`）。
   - `BlockFamily { kind: BlockType, chrome: ChromeSpec, body: BodyKind }`，
     `family_of(kind) -> &BlockFamily` 全量注册。
   - 样式表从 autodown_render.rs 各臂内联 Style 字符串**搬家**（非复制），
     autodown_render 与 autodown_editor 都从 family 取——两臂样式从此
     单源。
2. **共享绘制段**：core.rs 中 buffer→DocDrawList 的生成逻辑抽为模块内
   纯函数（输入 &Buffer + family chrome，输出 draw list），编辑壳与
   只读臂共用。不做跨 crate API（还在 auto-lang 内部）。
3. **fence 家族三态**（先行样例）：
   - view/stream：family 装配 = header（语言标签）+ 共享绘制的
     SyntaxEditor 着色 buffer（syntect 只读态照跑——现状 View::Text 的
     `lang-<token>` 类本来也走 renderer syntect 路径，成本持平）。
   - edit：现状 ViEditor 叶子 + family chrome 包裹（header/边框补上）。
   - readonly 门控：不路由键盘事件、不画 caret、不建 undo。
4. **prose 家族**：view/stream = Buffer 裸布局（heading 用 family 字号
     表）；edit = 现状 ViEditor。chrome（heading 字号、quote 边条）单源。
5. **覆盖补齐臂**：Callout（容器+kind 配色+title）、Details（summary 行
   + 折叠：点击→消息→状态→重渲染，VM 响应式即可，无需新 View 变体）、
   WikilinkBlock（链接色文本+下划线，点击事件留给宿主）、BlockEmbed
   （src 面板占位）、任务列表 checkbox（ListBlock item attr `task` →
   复选格 + 文本）、行内图片（Image mark → View::Image，src 现成）。
6. **难块降级臂**（显式、非静默）：
   - Mermaid：v1 维持代码面板展示源码 + 「mermaid: web-only」标签
     （resvg 只能消费现成 SVG，布局引擎缺失，豁免表）。
   - MathBlock：mono 文本 + `$$` 标记（KaTeX web-only，豁免表）。
   - QueryBlock：query 文本面板 + 「query: 未求值」标签（求值运行时
     归宿主，豁免表）。
7. **流式增量**：render_document 增结构键（kind+children 数+文本 hash）
   diff，未变块复用上次 View/buffer；悬挂尾块（final=false）单独重同步。
   全文档 reparse 债务降级为「尾窗重解析」登记（正交优化留待后续）。
8. **平台差异豁免表**（本计划定稿——执行后收口版，merge 时入 spec
   ledger；auto-lang DEBTS.md 同步登记同款行）：

   | # | 差异项 | 豁免口径（VM v1） | 依据/归宿 |
   | - | ----- | ----------------- | --------- |
   | 1 | CustomScrollbar/原生滚动条 | vue 覆盖式滚动条 vs VM iced 原生滚动，观感差异豁免 | 滚动同步契约计划（路线图在册）收口 |
   | 2 | 代码块 chrome 精修 | 复制/折叠按钮、语言下拉不进 VM fence header（v1 仅语言标签） | vue 侧 039 已精修；VM 等交互控件批次 |
   | 3 | WYSIWYG 手感 | 拆块（Enter 部分在册）/跨块选区/IME 实机清单为 VM 编辑壳既有在册缺口 | 编辑行为补齐计划（路线图在册） |
   | 4 | Mermaid | 源码面板 + 「mermaid · web-only」标签（显式降级臂） | resvg 只能消费现成 SVG，无布局引擎 |
   | 5 | MathBlock | mono 文本 + $$ 包裹（显式降级臂） | KaTeX web-only |
   | 6 | QueryBlock | query 文本面板 + 「query · 未求值」标签（显式降级臂） | 求值运行时归宿主 |
   | 7 | 行内 span 跨块换行折叠 | View::Text 单样式按行拆分，跨 span 换行不折叠（019 已知限制延续） | 单 span 行保持原生换行 |
   | 8 | Details 点击折叠回路 | 状态源=open attr（loading 强制展开/final 缺省收起）；点击→消息→状态回路归宿主事件通道 | VM 无内部消息通道；随滚动同步契约计划接线 |
   | 9 | parser 组件指令多参 | argstr 扫描仅首参可靠（callout title 第二参丢失、open 须首参） | autodown-core a2r 发射既有行为，登记不改 |
   | 10 | 流式增量 v1 解析面 | View 装配层增量（结构键复用），解析仍全文档 reparse | 尾窗重解析为正交优化，留后续 |
   | 11 | fence 编辑壳 mono 族 | `Family::Monospace`（code_editor 用 Windows Consolas 防 CJK tofu）；fence 中文注释字体观感差异 | T11 联测观察；对齐方案留债候选 |
   | 12 | untracked 渲染臂 | convert_element（无 path 键）autodown 维持全量渲染；StreamCache 注册表无容量上限 | tracked 主路径已增量；LRU 随滚动同步计划 |
9. **三态一致性检验门（家族任务模板的固定组件，用户裁定入册）**：
   每补一个块，三态（view/stream/edit）一致性按四层单源 + 一道门验收，
   缺一不算完成——
   - ① 同壳：三态住同一容器 chrome（vue=家族 widget 同一根 /
     VM=BlockFamily 同一 ChromeSpec）；
   - ② 同高亮链：着色 HTML/视图出自同一函数（vue=`getHighlightImpl() ??
     lowlight` 链；VM=syntect 单路径）；
   - ③ 构造对齐：层间对齐靠布局结构不靠测量（vue=textarea 定尺寸 +
     pre `absolute inset:0` 贴满，度量 token 成对同文件相邻；
     VM=单 Buffer 单绘制路径，成对 token 不存在）；
   - ④ 像素门：逐像素断言（vue 侧沿用 `code-block-parity.spec.ts`
     模式扩展为 per-kind 三列对拍 spec：edit 列 vs view 列 vs stream
     列的盒高/行距相等；VM 侧结构基线 + 共享绘制一致性单测对位）。
   vue 侧剩余 kind 的家族化（Callout/Blockquote/List 容器族、Table
   view 面等）**已立项 PLAN-042**（2026-09-02，含三件搭车：ARCHITECTURE
   决策记录 / packages/editor 退役 / vm-smoke），验收复用同一模板；
   现状基线：三态完整家族仅 Fence/MathBlock/Mermaid
   （`EngineEditor.vue:58-60`），Table 仅 edit 槽（:94），Details/
   Query/Embed 走 panelOf（:149-152），容器族 edit 面未家族化——demo
   左右列的现存不一致即源于此覆盖缺口，非机制缺失。
10. **view↔stream 对拍台（stream-demo 改造，用户提案入册）**：
    `stream-demo/src/App.vue` 从单栏改为左右对比——左栏
    `StreamingRenderer :source="SAMPLE_DOCUMENT" :streaming="false"
    :scroll-sync="false"`（一次性全量，view 态），右栏保留现 feed 驱动
    的流式栏；不变式：**右栏播完落定后两栏像素一致**。设计要点：
    - 左栏用 StreamingRenderer 定格态而非 MarkdownRender——同组件
      两态对拍，隔离"流式落定 vs 一次性"单一变量（details 拆分/
      banner/fence loading 两栏同享）；
    - 落定语义：`done` 后等 typewriter 清零 + 调度器残余 flush +
      fence loading 旗标清（streaming=false → final 路径）再比对；
    - `scroll-sync` 两侧同值 false（开启时清 slot 边距属刻意差异）；
    - 两栏等宽等 padding（grid 1fr×2），保证换行点一致；
    - 零依赖结构对拍：「对比」按钮页内 TreeWalker + getComputedStyle
      对两栏做结构+计算样式快照 diff，差异节点红色高亮；
    - 像素级自动断言为可选项（需为 stream-demo 引 @playwright/test
      + config，元素截图 buffer 相等断言），暂不强制。
11. **跨轨高亮 token 映射表（会话裁定补录）**：颜色观感对齐不换引擎——
    VM 侧 syntect 的 scope 名（`keyword.control` 等）映射到与 vue 侧
    lowlight 输出**同名的 `.hljs-*` CSS 类**，映射表落 autodown-core
    （rust 单源，VM renderer 消费），两侧样式表自然共享同一套类名
    约定；随 T4 fence 家族落地。

## 测试设计

- 结构单测（autodown_render.rs tests 模块扩展，沿用现有
  `renders_*` 模式）：每新块一测（Callout chrome 类、Details 折叠两态、
  checkbox 结构、图片 View::Image 变体、三个降级臂的标签断言）。
- 三态检验门（详细设计 9）：vue 侧每 kind 一条 per-kind parity spec
  （三列对拍，沿用 code-block-parity.spec.ts 度量模式）；VM 侧每 kind
  结构基线条目 + 家族单源断言（family_of 消费方唯一）。
- 家族单测（autodown_blocks.rs）：family_of 全量覆盖断言 + 样式表与
  两臂消费一致性（render/editor 取同一 family 实例）。
- 绘制共享单测：同一 Buffer 经共享段生成的 draw list 与编辑壳路径
  一致（像素一致的结构性验证）。
- 流式增量单测：两帧只差尾块时，未变块 View 指针/id 复用断言。
- 性能护栏：`#[ignore]` 大文档 bench（300 块流式 30 chunk，计时上限
  登记阈值），CI 不跑、手跑留档。
- 联测：demo `auto run -r vm`（040 后跑法）手验清单——Callout/Details/
   checkbox/图片在预览栏正确显示，fence 编辑态带 header/着色。

## 验收标准

1. `cargo test -p auto-lang --features autodown` 全绿；新块结构测试
   13 显式臂 + 3 降级臂全覆盖。
2. demo vm：预览栏 7 种原降级块全部正确呈现（Callout/Details/Wikilink/
   Embed/checkbox/图片）或显式降级标签（Mermaid/Math/Query）；fence
   编辑态与只读态 chrome 同源可见。
3. 豁免表成文（计划节 + DEBTS.md 双登记）。
4. 流式增量测试证明未变块零重建。
5. stream-demo 对拍台：样本播放落定后点「对比」，左（一次性）右
   （流式落定）两栏结构与计算样式零差异；样本覆盖 fence/details/
   callout 面板类块。

## 执行步骤

- T1 新建 `crates/auto-lang/src/ui/autodown_blocks.rs`：ChromeSpec/
  BodyKind/BlockFamily + family_of 全量注册；`ui/mod.rs` 挂模块。验证：
  `cargo test -p auto-lang --features autodown autodown_blocks`。
  [✅ 已完成] b8c600742（auto-lang auto-down-dev）：17 kind 全注册+单例断言，
  fence/quote/break/table chrome 字面量锚定（T2 搬家基准），heading 双表
  单源，BodyKind 门控表测试，callout kind 配色表；6/6 绿。
- T2 `autodown_render.rs`：6 个既有臂的样式字符串搬家进 family（行为
  等价重构）。验证：既有 renders_* 测试全绿（零改动通过）。
  [✅ 已完成] f00fc31f1：六臂（heading 委托/fence 全 chrome/quote/table/
  break）改 family_of 取样式；4 renders_* + streaming 测零改动全绿。
- T3 `autodown_editor/core.rs`：buffer→drawlist 生成抽共享纯函数；
  编辑壳 chrome（fence header/边框、heading 字号）改从 family 取。验证：
  `cargo test -p auto-lang --features autodown autodown_editor`。
  [✅ 已完成] 4db52ca57：buffer_block_runs 纯函数（语法 span×mark 并集
  切格）+BlockDrawCtx；fence chrome（header/四边线/标签/底色）家族发射；
  字号表单源（fence 16→14 两态统一）；BlockBuf.syntax 语言 token；
  autodown_editor 32/32（实测 features autodown,code-editor）。
- T4 fence 三态统一：只读臂 fence 分支改走共享 buffer 绘制 + readonly
  门控；同任务落跨轨 token 映射表（详细设计 11：syntect scope →
  `.hljs-*` 类名，表落 autodown-core）。验证：fence 结构测试更新 +
  共享绘制一致性单测通过 + 映射表单测（scope→类名全断言）。
  [✅ 已完成] core 侧 695962c（auto-down，已折 master ff06141）+
  auto-lang 侧 c4b7c34ca：hljs_scope_map.rs 21 行表+色板镜像（5 测）；
  highlight.rs 烘焙 autodown-hljs 主题；编辑臂 fence 着色（syntax_by_
  extension）；只读臂 fence 正文=View::AutodownEditor 共享 buffer 实例
  （view_fence_ 键+readonly 门控）；双配置 133/133+4/4 绿。
- T5 Callout/Details 臂（Details 折叠状态机：点击→on 消息→重渲染）。验证：
  新增 renders_callout/renders_details 两测通过。
  [✅ 已完成] a7458d6be：Callout（kind 配色+icon+title 回落+children）、
  Details（▸/▾ 两态，状态源=open attr 与 vue 容器槽同源；点击消息回路
  归宿主通道，余量登记）；两测过（7/7）。发现 parser 限制：argstr 多参
  扫描仅首参可靠（title 第二参丢失、open 须首参）——T10 登记。
- T6 WikilinkBlock/BlockEmbed 臂 + 任务列表 checkbox + 行内图片。验证：
  对应 4 个结构测试通过。
  [✅ 已完成] fe10874b6：四臂齐落（wikilink 链接色/embed 面板占位/
  ☑☐ 复选格/Image span→View::Image）；4 新测过，autodown_render 11/11。
- T7 Mermaid/MathBlock/QueryBlock 显式降级臂 + 标签。验证：3 个降级
  断言测试通过。
  [✅ 已完成] bea1a002a：三臂独立测（mermaid web-only/math $$/query
  未求值），autodown_render 14/14；13 显式臂收官。
- T8 流式增量：结构键 diff + 未变块复用。验证：流式增量单测通过；
  `renders_fence_quote_list_ordered_start` 等流式路径测试不回归。
  [✅ 已完成] 42fc94208：StreamCache+render_document_streamed（serialize
  FNV 结构键/尾块重同步/final 翻转整建/位置前缀），builder tracked 臂
  path 键挂缓存；两增量测过，16/16+144/144 三连绿。
- T9 性能护栏：`#[ignore]` bench + 阈值注释。验证：`cargo test -p
  auto-lang --features autodown -- --ignored` 手跑留档。
  [✅ 已完成] 54edeca08：300 块/30 chunk 护栏（阈值合计<2s/单帧<200ms
  注释在案）；留档 release 88.49ms / debug 231.4ms 全过（--ignored
  autodown 过滤集含 019 基线全绿）。
- T10 豁免表落档：本文件详细设计 8 节定稿 + `auto-lang/DEBTS.md` 登记。验证：
  表目与实现臂一一对应（人工核对）。
  [✅ 已完成] 计划节 12 行定稿（主检出）+ DEBTS.md 六行（T7 难块臂/Details
  臂/parser argValueAt/StreamCache+untracked/mono 族+主题定格/chrome 精修），
  逐行核对对应实现臂在案。
- T11 联测：demo/auto 跑 `auto.exe run -r vm`，按验收 2 手验清单执行并
  截图存 `demo/auto/vm-block-coverage.png`。验证：清单全过。
  [✅ 已完成] plan-041-dev 提交（worktree auto.exe 构建自 auto-down-dev
  分支）：MCP 通道（9247）type 喂样/snapshot vtree 13 臂全命中/双截图
  ——编辑壳 fence=header(rust)+近黑面板+hljs 着色（三态统一编辑态直接
  证据）；预览 callout 蓝框ℹ/details ▾/☑☐ 复选格两面板实渲染/表格形态
  /query 未求值/math \$\$/mermaid web-only 头部/分隔线；图片=alt 链接
  回退（远程加载 N/A，豁免注记）；wikilink 无 markdown 源形（结构测覆
  盖，联测不可达为 parser 现实）。vm-block-coverage(+2).png 在库。
- T12 stream-demo 对拍台（详细设计 10）：`stream-demo/src/App.vue` 左右
  分栏（左一次性 / 右流式，等宽 grid、scroll-sync 两侧 false）+「对比」
  按钮页内结构/计算样式 diff（新文件
  `stream-demo/src/comparePanes.ts`）；`stream-demo/src/app.css` 分栏
  样式。验证：`cd autodown/stream-demo && pnpm build` 绿；手验——播放
  至落定后点「对比」零差异；`sample.ts` 补一个含 fence/details/callout
  的样本（若缺）使对拍覆盖面板类块。
  [✅ 已完成] plan-041-dev 提交：双栏+对比+comparePanes（22 键计算样式
  快照/差异红色高亮/栏标签排除——首版级联错位教训在案）+样本补
  \$callout/\$details；pnpm build 绿（4.73s）；浏览器手验重播→直达终点
  →对比=**零差异 ✓**（vm-panes-parity.png 留证）。

## 复审记录

**复审**：/auto-plan:review · 2026-09-03 · 复审人 zhaopuming（会话内独立重验）

### 验收逐条判定

1. **测试全绿 + 13 显式臂/3 降级臂覆盖 — PASS（含存量失败归属裁定）**
   - 标准门禁（技能口径）：`cargo tf` 3357/3358（1 失败=schema_drift_fence
     `[vb_not_in_render] pre`——主检出 master 同签名红，055 T12 pre 臂欠
     render 表同步的存量漂移，非本计划引入）；`cargo tv` **3516/3516 全绿**。
   - 字面命令 `cargo test -p auto-lang --features autodown`：4450-4451
     passed / 18-19 failed，逐项主检出同条件复现归属三类，**零新增失败**：
     ① master 同红存量（strip_html / d8_toggle_dark_mode /
     desktop_mcp_switcher（040 在册锁屏环境族）/ schema_drift_fence）；
     ② 基线存量红：vm_bridge calendar×3（基点 a893cdf6b 即红，plan-522
     提交自述「修复 store 重构以来既有红」并在 master 重写测试+app——
     merge 重同步自愈，无需行动）；③ libtest 并行隔离偶发
     （counter_loopback/icon_component/osconfig/settings 族——两侧单跑皆绿）。
   - 13 显式臂+3 降级臂测试在案：autodown_render 16 + autodown_blocks 6 +
     autodown_editor 33（含共享段一致性/fence 三态/readonly+着色）。
2. **demo vm 联测 — PASS**：复审独立重跑（worktree binary 新实例：type
   样本二 → snapshot vtree 七关键词全命中 ☑/甲表头/未求值/E=mc^2/
   web-only/待办项/tags:todo → 真截图）；执行期证据（编辑壳 fence
   header+近黑面板+hljs 着色=三态统一编辑态直接证据；预览 callout 蓝框ℹ/
   details ▾/☑☐ 实渲染/表格形态/三降级标签）经分析通道核验。附注：
   wikilink 无 markdown 源形（parser 不产）——结构测覆盖，联测不可达。
3. **豁免表双登记 — PASS**：计划节 12 行（详细设计 8 定稿）+ auto-lang
   DEBTS.md 六行，逐行对应实现臂。
4. **流式增量零重建 — PASS**：gens 复用断言（前缀不增/尾块重同步/
   final 整建/稳定帧零重建）随本轮三档全量跑绿。
5. **对拍台零差异 — PASS**：复审独立重跑（dev server 前台整流程
   reload→finish→对比）= **零差异 ✓**；pnpm build 5.15s 绿；样本含
   fence/details/callout/$json 组件块。

### 复审修补（review fix）

- **vm-block-coverage2.png 换真件（c78c30f）**：发现原入库文件与
  coverage.png 同 md5（autoui_screenshot 两捕同内容），提交信息所述样本二
  视觉未真实入库——重跑联测换真图（md5 72b2df7c≠15f4f840）。

### 猎查（遗漏/延后/workaround）

- **遗漏**：无——真实 delta 与计划文件集一致（auto-lang 9 文件
  1615+/136-；auto-down core+stream-demo+demo 证据），每任务有测试。
- **延后**：vue 侧家族化归 PLAN-042（路线图立项在册，非私拆）；
  Details 点击回路/尾窗重解析/untracked 臂全量/StreamCache 无 LRU/
  fence mono 族 CJK tofu 风险——全部豁免表+DEBTS 透明在案。
- **workaround/环境**：① 对拍台「对比」在冻结后台标签页会卡死
  （settle 轮询依赖页内 timer，冻结丢弃 pending timer——重载即愈、
  前台验证成立）→ **债候选**；② execution 期 external_echo 单次偶发
  与 libtest 并行隔离偶发同族（环境）。
- **债候选三条**：(a) 对拍台后台冻结卡死（timer 依赖，低）；(b) Details
  点击回路（豁免 #8，归宿主通道）；(c) fence 编辑壳 mono 族
  Family::Monospace 的 CJK tofu 风险（T11 未观察到 ☑☐/中文异常，DEBTS
  行在案待实机长测）。

### 结论

五条验收全 PASS（存量/环境失败逐项归属在案，零新增）；修补一项（截图
真件）。**status → reviewed，交 /auto-plan:merge。**（merge 注意：折返
auto-lang 时先重同步 master——vm_bridge calendar 三测的上游修复在
master 侧。）

## 待澄清事项

- T4 共享绘制的接入点（只读臂直接生成 drawlist vs 复用编辑壳 widget
  readonly 模式）在实现时按「最小侵入」定夺，两案都在家族架构内，不
  改变契约——执行中在本节记录所选案与理由。
  - **[已裁定 2026-09-02，T4 执行中]** 选**方案 b（复用编辑壳 widget
    readonly 模式）+ 外壳仍由只读臂 View 树装配**的混合形态。理由：
    View 树无自定义绘制变体（Plan 319 单臂规则 + View 是跨轨契约，
    新增变体要动 renderer/vue 双侧，非最小侵入）；`View::AutodownEditor`
    变体与 DocEditor widget 已存在（plan 019/040 遗产），只读 fence 臂
    发射 `View::AutodownEditor { key: view_fence_<fnv1a(lang,code)>,
    value: 围栏源重建 }` 即得「同一 Buffer+同一 hljs 绘制路径」；readonly
    门控单源 `core.is_view_instance()`（键前缀判定）——不路由输入（不建
    undo/无光标）、不发射 chrome（避免与 View 树外壳双绘）；renderer
    lowering **零改动**（key 语义复用）。code-editor feature 缺席时降级
    原 `lang-<token>` View::Text 轨（Plan 442 A6 语义不变，双轨 cfg）。
    实证：c4b7c34ca 双配置 133/133。
- 流式增量的结构键在无锚文档（无 block id）上的稳定性若实测抖动，
  允许降级为「文本 hash 全比对 + 尾块重同步」，仍满足验收 4。
