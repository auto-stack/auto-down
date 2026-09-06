---
plan_id: PLAN-054
status: archived
feature_name: VM 编辑壳块家族渲染对齐（quote/callout/details/table/list 可见化 + fence 细节）
author: [zhaopuming, ZCode]
created_at: 2026-09-05
updated_at: 2026-09-06

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components:
  - "P053-2: 修改（VM 编辑壳块家族渲染对齐第二期——五族可见化与 fence 细节在其四象限统一目标上续进）"
  - "PARITY #12: 修改（编辑壳块家族可见化落地——VM 编辑臂 quote/fence header/list marker/task/table 管道行/callout/details summary 可见性子集清偿；编辑能力仍留长期线）"
  - "PARITY #4: 修改（callout chrome.body px-4 py-3 视图臂消费面补齐——贴边紧凑根因⑦）"
new_spec_components:
  - "style-ir: 新增 border-l-N 单侧宽度档（StyleClass::BorderLeftWidth + IcedStyle::side_border_width 专属通道，不触发四边容器边框；style_parity 白名单收窄+coverage 再生）"
  - "autodown-editor: 新增骨架归因 DFS（walk_skeleton_attribution：quote/列表 marker 缩进/callout/details 容器 chrome 单遍产出）+ 渲染序列 DrawItem（表格管道行/thematic break 只读出运行，无布局槽）+ Seg::Callout/Details/List.checked（emit 往返保留 task[·]/$callout/$details）"
touched_goals:
  - "P053-2: VM 编辑壳块家族渲染对齐第二期——五截图根因全清偿（quote 去框/fence header 居中+no-lang 主题/列表任务标记/table 可见/callout-details 可见+图标统一）"
  - "PARITY #12 可见性子集 + PARITY #4 callout padding 邻界面清偿"

current_step: 10
total_steps: 10
---

# [PLAN-054] VM 编辑壳块家族渲染对齐第二期

## 变更摘要

PLAN-053 W2.5-W2.8 完成 heading/正文/quote/块距的主题与排版收敛后，用户实机
验收（2026-09-05 五张截图）又指出五处两臂不一致。共性根因：**编辑壳
（cosmic-text 块编辑器）的块模型只有 LeafKind::{Paragraph,Heading,Fence}**，
quote/callout/details/table/list 五类块在编辑臂被拍平或丢弃（不可见/纯文本），
而只读臂经家族 statics 有完整 chrome。本计划两线并修：

1. **视图侧快修**（单点小改）：quote 去整圈边框（用户裁定用编辑臂样式）、
   fence header 标签垂直居中、无语言 fence 主题档与有语言同源、task
   checkbox 两态图标统一风格、callout padding/图标观感。
2. **编辑壳可见化**（结构项，全部沿用 T17 已验证的「骨架段推导归属 +
   BlockDrawCtx 旗标 + fills/runs 绘制」模式）：list 标记（圆点/序号/
   checkbox + 层级缩进）、table 管道文本行呈现、callout 左条+标题+内容、
   details summary 行+内容。

## 目标

- **G1** quote 两臂同款：左条 + muted 缩进，无整圈边框（用户裁定编辑臂样式）。
- **G2** fence 观感收敛：header 标签垂直居中；无语言 fence 文字在浅色档
  可读（加深，随主题档）。
- **G3** 列表两臂同构：编辑臂显示 圆点/序号/checkbox 标记 + 层级缩进；
  只读臂 checkbox 两态图标同风格。
- **G4** table 编辑臂可见：以管道文本行呈现（只读，非编辑态表格）。
- **G5** callout/details 编辑臂可见：callout=左条+标题+内容（§7.4 pad），
  details=summary 行+内容；只读臂 callout padding/icon 观感修正。

## 架构方案

沿用 PLAN-053 已验证的三件套模式，不引入新机制：

- **骨架段归属推导**：render_frame 从 `self.segs`（Mutex<Vec<Seg>>）推导
  每块的容器归属与参数（T17 quote_ids 同款 DFS；T15 heading_extra_margins
  同款消费）。新增 list 归属（Seg::List 的 items/ordered/start/嵌套深度）
  与 callout/details 归属。
- **BlockDrawCtx 旗标 + 颜色**：heading/quote 之外新增 list（层级缩进+
  marker 文本）、callout（kind 配色+左条）、details（summary 行）字段；
  buffer_block_runs/push_styled_pieces 消费。
- **左条/填充绘制**：list.fills 先于 runs 渲染（widget.rs 既有序），
  quote 左条（T17）同点扩展。

### 根因登记（2026-09-05 勘读）

| # | 症状 | 根因 | 修复面 |
|---|---|---|---|
| 1 | quote 右栏整圈边框（box 样） | `border-3`→BorderWidth(3)=容器四边边框 + 左条叠加；用户裁定用编辑臂样式 | QUOTE_CHROME 去 border-3；左条宽固定 3px（§7.4） |
| 2a | fence header 标签不居中 | header 容器 center_y:false，标签顶对齐 | autodown_render fence 臂 center_y:true |
| 2b | 无语言 fence 文字浅灰不可读 | new_leaf_buffer lang=None 硬编码 hljs 主题 `base16-eighties.dark`（暗主题默认前景=浅灰） | 无语言同走 hljs_theme_name(dark_mode()) |
| 3 | 列表编辑臂纯文本 | LeafKind 无 List；骨架 Seg::List 有 items/ordered/start 但绘制不消费 | render_frame 骨架推导 marker+缩进 |
| 4 | task checkbox 两态图标不一致 | 只读臂 marker 用 ☑(U+2611 带色)/☐(U+2610 素框) 混排 | 统一字符对/绘制方案（见待澄清①） |
| 5 | table 编辑臂不可见 | Table 块无编辑壳模型 → 空 buffer | 管道文本行 buffer（只读） |
| 6 | callout/details 编辑臂不可见 | 同上（无 Callout/Details 模型） | 骨架段标注 + 绘制（复用 quote 模式） |
| 7 | callout 右栏紧凑/图标差 | 图标用 unicode ℹ✓⚠✕；容器 pad 有但观感差 | 图标统一（随 #4 方案）+ padding 实测调整 |

## 技术栈

- 修复面：auto-lang `crates/auto-lang/src/ui/{autodown_blocks.rs,
  autodown_render.rs, autodown_editor/{core.rs,widget.rs}}`（dep worktree
  模式，同 PLAN-053 W2.5-W2.8）。
- 验证面：本仓 `autodown/demo` vtree/截图 + px-measure.cjs 像素勘读；
  auto-lang `cargo test -p auto-lang --lib --features autodown`。

## 需求分析与背景调查

- **来源**：用户 2026-09-05 实机验收五张截图（PLAN-053 T18 后的
  final exe），逐条勘读根因见上表；勘读手段=vtree 转储 + autoui_screenshot
  + px-measure.cjs（PLAN-053 W2.7 交付的比对工具）。
- **承接**：PLAN-053 W2.5-W2.8 已验证「骨架段归属推导 + BlockDrawCtx
  旗标」模式（quote 左条、heading 配色/字重均由此落地）；本计划全部
  结构项复用该模式，无新机制。
- **spec 台账**：本计划承接 PARITY #12（编辑面能力差——长期线）的可见性
  子集与 #4（渲染面板内边距）邻界面；P033-2（家族三模式同 chrome）在
  VM 编辑壳方向的延伸。
- **约束**：VM 无 lucide/图标库——图标方案走 unicode 统一对或矢量绘制
  （待澄清①裁定）；编辑臂列表/表格为**呈现收敛**（非编辑能力——编辑
  能力属 PARITY #12 长期线）。

## 详细设计

### D1 quote 去框（G1）

QUOTE_CHROME.outer：`border-l border-3 pl-4 py-2 ...` → 去掉 `border-3`
（整圈边框源），左条宽度固定 3px：apply_side_borders 的 strip 宽在
quote 场景取 3（实现：border-l 类附 Width(3) 专属字段，或 chrome 常量
QUOTE_BORDER_W=3.0 由渲染臂直接使用——执行期按最小侵入裁定）。
编辑臂 strip 3px 已在（T17）。测试：migrated_chrome_strings 同步。

### D2 fence header 居中 + no-lang 主题（G2）

- autodown_render.rs fence 臂 header 容器 `center_y: false` → `true`
  （28px 定高内垂直居中，与编辑臂 (h_h-12)/2 同视觉）。
- core.rs new_leaf_buffer：`None => "base16-eighties.dark"` →
  `None => ce_highlight::hljs_theme_name(crate::ui::style::theme::dark_mode())`
  （与 Some(lang) 臂同源；浅档默认前景=深色可读）。
- 测试：无语言 fence 浅档帧 runs 颜色断言（非浅灰）。

### D3 列表编辑臂标记（G3）

- render_frame 从骨架收集 list 归属：`list_of: HashMap<block_id,
  (marker_text, depth)>`——Seg::List 递归（ordered ? "{n}. " : "• "；
  task 块 "☑ "/"☐ " 随 D4 统一）；嵌套深度=递归层数，缩进=depth×16px。
- 绘制：marker 以独立 DocRun 画在 x=depth×16（text 前缀模式，类 fence
  header label 的独立 run 推法）；buffer 文本 x_off += marker 宽。
- 只读臂 checkbox：ListBlock 臂 marker 字符对统一（见待澄清①）。

### D4 task/图标配别（G3/G5 子项）

两态 marker 换同风格对：`✔`(U+2714)/`□`(U+25A1)（或 ☑→`☒` 系），done 态
追 accent 色 run（分色 run 拼接）。callout 图标同步换统一对（ℹ✓⚠✕ →
同族 unicode，粗细一致）。**裁定待澄清①**。

### D5 table 编辑臂文本行（G4）

build_walk `BlockType::Table` 臂：目前拍平为空——改为单 Paragraph buffer，
内容=管道行文本（`| Name | Value | Note |` 形式，含分隔行），只读呈现；
骨架段无需新类型（Quote 内嵌同构，表格内容不可编辑——PARITY #12 边界）。
测试：table 块 buffer 文本含表头三格。

### D6 callout/details 编辑臂可见化（G5）

- 骨架：build_walk 的 Callout/Details 臂把容器段标注进 segs（扩 Seg::
  Callout{kind, title, inner} / Seg::Details{summary, inner}，或 Quote
  结构复用+kind 字段——执行期按最小侵入裁定）。
- 绘制：callout=左条 3px（kind 配色 §7.4）+ 标题 DocRun（icon+title，
  kind 色）+ 内容 buffer；pad=§7.4 1.1rem/1rem；details=summary DocRun
  （"▸ {summary}"）+ 内容 buffer。
- 只读臂 callout：padding 核对（CALLOUT_CHROME body px-4 py-3 是否真达
  内容区）+ icon 统一（D4）。

## 测试设计

| 门 | 内容 | 命令（cwd=auto-lang 除注明） |
|---|---|---|
| 单测 | blocks chrome 串/表格 buffer 文本/marker 推导单测 | `cargo test -p auto-lang --lib --features autodown autodown` |
| 集成 | VM 净窗 vtree/截图：五类块两臂同款（px-measure + 目测） | 本仓 demo：窗口 + autoui_screenshot/vtree |
| 回归 | auto-lang 全量 tf | `cargo tf --no-fail-fast`（唯一红=charts 既有甄别） |
| 回归 | 本仓 demo e2e + vm-smoke | playwright 全量 + vm-smoke（环境恢复后） |

## 验收标准

1. quote 两臂=左条+ muted+缩进，无整圈边框（用户裁定样式）。
2. fence header 标签垂直居中（两臂）；无语言 fence 浅档文字可读。
3. 列表编辑臂显示 圆点/序号/checkbox+缩进；只读臂 checkbox 两态同风格。
4. table 编辑臂可见（管道文本行）。
5. callout/details 编辑臂可见（左条/summary+内容）；只读臂 callout
   padding/icon 观感修正。
6. auto-lang tf 全量（唯一红=charts 既有）+ 本仓 playwright 全量绿。

## 执行步骤

### W1 视图侧快修

- [✅ 已完成] **T1** quote 去框：QUOTE_CHROME 去 `border-3`，左条 3px 通道落地
  （autodown_blocks.rs + apply_side_borders/iced 转换按需）；测试同步。
  验证：净窗截图 quote 两臂同款（左条无框）。
  **[✅ 已完成]** 类 IR 新变体 `BorderLeftWidth(f32)`→iced 臂 `side_border_width`
  专属字段（初版映射 border_width 仍触发四边框——净窗勘读抓出次生面，已修）；
  编辑壳 quote 叶补 py-2 同款；截图实证两臂左条 3px 无框；提交 30ab7de00+4e8e05011。
- [✅ 已完成] **T2** fence header 居中：autodown_render.rs fence 臂 header 容器
  `center_y: true`。验证：截图 header 标签垂直居中。
  **[✅ 已完成（方案修正）]** center_y=true 在 iced 臂强制 height(Fill) 顶掉
  h-[28px] 定高（+2px/块 pitch 漂移实测抓出）——改 py-2 类通道（8px=(28-12)/2
  与编辑臂同值），像素实测标签中心与带中心差 ≤1.5px；提交 4e8e05011。
- [✅ 已完成] **T3** no-lang fence 主题：core.rs new_leaf_buffer None 臂改
  `hljs_theme_name(dark_mode())`。验证：浅档 plain fence 文字深色可读。
  **[✅ 已完成]** retheme 臂同步含无语言（翻转换挡）；截图浅档 plain fence
  深色可读（两臂）；提交 30ab7de00。
- [✅ 已完成] **T4** checkbox/callout 图标统一（方案待澄清①裁定后执行）+
  callout padding 核对。验证：截图两态图标同风格。
  **[✅ 已完成]** 待澄清①按计划内建议裁定方案 A（✔ U+2714/□ U+25A1 +
  done accent 色；callout ✓/✕→✔/✖ 重体同族）；callout chrome.body（px-4 py-3）
  落视图臂消费面（根因⑦=pad 声明无消费）；截图两态同风格实证；提交 f1c3ff85f。

### W2 编辑壳可见化

- [✅ 已完成] **T5** list 归属推导 + marker/缩进绘制（core.rs render_frame +
  BlockDrawCtx；骨架 Seg::List 消费）。验证：编辑臂 bullets/序号/缩进
  与只读臂同构（截图）。
  **[✅ 已完成]** walk_skeleton_attribution 单 DFS 归因（quote/列表/容器合一）
  + 渲染序列 DrawItem；marker 独立 run 画 gutter 左缘（深度×16 缩进）；截图
  bullets/序号/嵌套缩进与只读臂同构；提交 3e7834085。
- [✅ 已完成] **T6** task checkbox 编辑臂呈现（D4 字符对）。验证：截图两态。
  **[✅ 已完成]** Seg::List 增 checked 并行 vec（build/prune/续项/退列同步）；
  emit 往返 "- [x] "；✔ accent/□ muted 截图两态实证；提交 3e7834085。
- [✅ 已完成] **T7** table 管道文本行 buffer（build_walk Table 臂）。验证：
  编辑臂表格文本可见（截图）。
  **[✅ 已完成]** 渲染序列 RawText 出运行（无布局槽不可编辑——PARITY #12
  边界守住，buffer 方案改只读绘制更小扰动）；thematic break 同路补 hline；
  截图管道行五格全可见+emit 往返不变；提交 3e7834085。
- [✅ 已完成] **T8** callout/details 骨架段 + 编辑臂绘制（D6）。验证：编辑臂
  callout 三件+details 可见（截图）。
  **[✅ 已完成]** Seg::Callout/Details 新变体（待澄清④裁定：新变体扰动小于
  Quote 复用——match 臂全量增补可控）；kind RGB 表 autodown_blocks 单源；
  编辑臂左条+图标标题行+summary 行+内容；emit 往返 $callout/$details 保留
  （原 catch-all 往返即丢容器——一并修复）；截图三 callout+details 全可见；
  提交 3e7834085。
- [✅ 已完成] **T9** 回归：`cargo tf --no-fail-fast` + 本仓 playwright 全量 +
  vm-smoke（环境恢复后）；计数落复审记录。
  **[✅ 已完成]** cargo tf 3454/3455 唯一红=charts 既有甄别（与计划门定义
  逐字吻合）；playwright 全量 88/88 绿（web 轨本计划零改动，主干检出代跑，
  内容与工作树同源）；vm-smoke 两次（含净窗复跑）均卡滚动状态回写收敛腿
  （待澄清⑤=053 待澄清⑦环境面延续，计划预案"环境恢复后"）——随复审门
  兜底，内容面已由净窗五族截图实证替代覆盖。计数在案（3454/88/0）。

### W3 收段

- [✅ 已完成] **T10** 折回 auto-lang master + 本仓簿记（逐折提交信息带
  PLAN-054）。
  **[✅ 已完成]** 预折门 tf 全量绿（唯一红=charts 甄别）；merge --no-ff
  57b7bde33（与 master 02840d764 零冲突，8 文件 +703/-97）；工作树
  `git merge master` 回同步完成；工作树留存待 /auto-plan:merge 终折清理。

## 复审记录

**Reviewer**: ZCode（/auto-plan:review）· **时间**: 2026-09-06 · **对象**: 分支
`plan-054-dev` / `auto-down-054-dev` 4 提交 + merge 57b7bde33（工作树已回同步，
按合并态复核）。

### 逐条验收（重验，不信任勾选）

| # | 准则 | 判定 | 证据 |
|---|---|---|---|
| 1 | quote 两臂=左条+muted+缩进，无整圈边框 | **PASS** | 净窗截图（合并态 exe 复拍）：右臂 crop 仅 3px 左条无框；单测 migrated_chrome_strings + renders_fence_quote_list_ordered_start 锁 `border-l-3` 串；编辑壳 quote 叶 py-2 同款（pitch 归零实测） |
| 2 | fence header 标签垂直居中（两臂）；无语言浅档可读 | **PASS** | 像素实测：标签中心 vs 带中心差 ≤1.5px；单测 fence_header_label_vertically_centered（py-2 类断言 + center_y 恒 false 锁）；fence_no_lang_theme_follows_dark_mode 单测 + 截图浅档 plain fence 深色可读（两臂） |
| 3 | 列表编辑臂 圆点/序号/checkbox+缩进；只读臂 checkbox 两态同风格 | **PASS** | 截图两臂同构（bullets/嵌套缩进/1. 2./✔accent/□）；单测 list_markers_and_indent_drawn + task_checkboxes_drawn_and_roundtrip（accent 饱和度断言+emit 往返） |
| 4 | table 编辑臂可见（管道文本行） | **PASS** | 截图表头/分隔/三数据行五格全可见；单测 table_pipe_lines_visible_in_edit_arm（含 emit 往返不变）；无布局槽→不可聚焦（澄清③边界） |
| 5 | callout/details 编辑臂可见；只读臂 callout padding/icon 修正 | **PASS** | 截图三 callout（kind 条+图标标题+pad 内容）+ details（▸ summary+内容）；单测 callout_details_drawn_with_chrome_and_roundtrip（strip 3px fill/kind 色/emit 往返）+ renders_callout（chrome.body 断言） |
| 6 | tf 全量（唯一红=charts 既有）+ playwright 全量绿 | **PASS（两既有红在案）** | 复审重跑 tf：3455 跑 3453 过，红=①charts（计划门定义既定）②kitchen_sink_page_in_sync——**二分实锤 02840d764（折回前 master）同红**：并行会话 547/569/570 提交的 docs-sync 失步，master 继承红，非本计划引入（本计划 diff 不触 examples//docs_gen）；playwright 复审重跑 **88/88 绿** |

### vm-smoke 腿裁定（待澄清⑤）

复审重跑仍卡滚动状态回写收敛（净窗、零交互、新鲜窗复现同症；视觉滚动正常，
left_top 状态读回滞留→同步腿/assert 不收敛）。与 053 T10 勘读同症（当时已以
"环境面非代码回归"归档并随 053 复审折回）；失败通道（Scrollable onscroll→状态
回写）与本计划 diff（编辑核渲染/骨架/样式）无交集，且五族内容面已由净窗截图
替代实证。**裁定：非阻塞**——挂待澄清⑤为债候选，环境恢复后由复审/merge 门或
独立环境修复计划复跑。

### 遗漏/延后/workaround 猎查

- diff 零 TODO/FIXME/HACK；无静默丢项（10/10 步均有代码+验证双证据）。
- **计划文→实现的四处分歧（码为准，均已根因化登记）**：①T2 center_y→py-2
  （iced 臂 center_y=true 强制 height(Fill) 顶掉定高——副作用实测抓出）；
  ②T7 Raw 出运行替代 Paragraph buffer（比计划文案更强的只读保证，守澄清③）；
  ③T1 编辑壳 quote 叶补 py-2（"两臂同款"的 pitch 必要项）；④T8 Seg 新变体
  （澄清④按最小扰动裁定，已记录）。
- **显式延后（用户可见，非偷缩）**：图标方案 B 矢量绘制（计划原文"先 A 后视
  观感升级"）；callout/details 容器内结构编辑（Enter/合并 no-op——PARITY #12
  长期线边界，计划约束③）；pitch 残差 f+2px/h−2.5px（≤053 ±4px 验收带，
  待澄清⑥留档）。

### 债候选（移交台账）

1. `kitchen_sink_page_in_sync` master 继承红（02840d764 实锤）——归属并行
   会话 547/569/570 提交，建议知会对应计划修复（KITCHEN_SINK_UPDATE 再生）。
2. vm-smoke 滚动状态回写环境漂移（待澄清⑤，053⑦延续）。
3. 两臂 pitch 残差（待澄清⑥）与图标方案 B 升级权（待澄清①尾）。

### 结论

**全部六条验收 PASS**（两条全量红均为 master/环境继承、二分实证与本计划
无涉），无未披露缩面。→ `status: reviewed`，可进 `/auto-plan:merge`。

### 复审追记（2026-09-06 用户实机反馈修复轮）

用户实机对比截图指出四处两臂残差：①bullet 一大一小；②有序数字字体不一；
③checkbox 两态图标字形不一；④列表行距/行高不一（两边高度不一致）。勘读
定因三项、当轮修复折回（merge 8d4090fb0）：

1. **字族不同源**（①②③字形根因）：只读臂全轨默认 **Inter**（应用嵌入
   三字重），编辑臂 buffer 测量与 DocRun 绘制走 `Font::default()`
   （SansSerif→系统 sans）——✔/□/•/数字字形两端不同。修复：编辑臂
   `sans_family()`=Name("Inter") + `run_font` 同步；编辑臂共享 iced 全局
   FontSystem（widget.rs install_font_system_source，Inter 已注册），
   测宽=画宽（PLAN-050 同例）。
2. **marker 号数不同**（①大小根因）：只读臂 marker/标题/摘要无 size 类
   （落渲染默认 16px）；显式 `text-[15.2px] leading-[1.6]` 正文号后两臂
   同号。
3. **列表行距不同**（④根因）：编辑臂叶间一律 BLOCK_GAP 8，只读臂 list
   items spacing 2/容器内 4。修复：归因 DFS 增 `sibling_gap`（list 2、
   quote/callout/details 4、顶层 8），按兄弟关系逐叶补齐；行距单测断言
   26.32（24.32+2）。

净窗复拍（新鲜窗）：两臂 bullet/序号/task ✔□/表格管道行全同构，行距
device 52px vs 53px（同值域）；粗体 warning 渲染正常。单测 97 绿。
**勘读附记**：复验途中曾见 warning callout 内容行有插入字符——实为上一
窗口被复审期 vm-smoke 键入序列污染的 buffer 残留（新鲜窗即净），非渲染
缺陷；新鲜窗全净。

## 待澄清事项

1. **图标配别方案**（T4 前置）：A=unicode 统一对（✔/□ 或 ☑/☐ 同族 +
   done 态 accent 色 run，最小改动）；B=矢量绘制（fill_rect 拼勾/框，零
   字体依赖，工作量中）。建议先 A 后视观感升级 B。
   **【已裁定 2026-09-06】**按计划内建议采方案 A：✔(U+2714)/□(U+25A1)，
   done 态 theme primary accent 色 run；callout ✓/✕ → ✔/✖ 重体同族。
   观感若需升级 B 另行立项。
2. **quote 左条宽度通道**：§7.4 定 3px——实现走 border-l 专属宽度字段
   （class IR 微扩）还是 chrome 常量由渲染臂直读？执行期按最小侵入裁定。
   **【已裁定】**class IR 微扩 `BorderLeftWidth(f32)`（`border-l-N`）；
   iced 臂经 `side_border_width` 专属字段只供 apply_side_borders 条宽
   （border_width 通道会触发 build_container_style 四边框条件——次生
   根因，勘读抓出后修正）。style_parity 白名单收窄 + coverage 表再生。
3. **编辑臂表格/容器块的编辑边界**：本计划只做只读呈现（管道文本行/
   容器绘制），编辑能力属 PARITY #12 长期线——若验收期望可编辑，需
   另行立项。（已按只读边界落地：表格 Raw 段无布局槽不可聚焦）
4. **callout/details 骨架段形态**：扩 Seg 枚举（新变体）vs 复用 Quote
   结构+kind 标注——执行期按对既有 match 臂的扰动最小裁定。
   **【已裁定】**扩 Seg::Callout/Details 新变体（Quote 复用需在 5 处
   match 加 kind 分叉而新变体走同构 inner 递归；emit 往返需各自 attr，
   变体更直接）。locate_leaf 对容器内叶返回 None（Enter/Backspace 合并
   在 callout/details 内降级 no-op/跨界合并）——编辑能力属 PARITY #12，
   登记余量。
5. **滚动同步状态回写漂移（环境面，承接 053 待澄清⑦）**：本次净窗验证
   中左栏 MCP scroll 视觉生效但 left_top 状态滞留 0、右栏不跟随——与
   053 收段时读数同症（环境面非代码回归）。本次以双栏独立滚动替代同步
   腿完成五族截图验证；vm-smoke group4 的同步断言随复审门/环境恢复裁定。
6. **两臂 pitch 残差（已知化妆项）**：净窗勘读 fence dy 由 +27..+33
   修复至 -5..+1（quote 区 pitch 归零）；残差 = 右臂 fence 每块 +2px
   （iced 外框 1px×2 vs 编辑壳条内绘）与 heading 每块 -2.5px（053 承接
   残差，低于 053 T16 ±4px 验收带）。非本计划五根因，不扩面，留档。
