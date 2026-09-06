---
plan_id: PLAN-054
status: drafting
feature_name: VM 编辑壳块家族渲染对齐（quote/callout/details/table/list 可见化 + fence 细节）
author: [zhaopuming, ZCode]
created_at: 2026-09-05
updated_at: 2026-09-05

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 0
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

- [ ] **T1** quote 去框：QUOTE_CHROME 去 `border-3`，左条 3px 通道落地
  （autodown_blocks.rs + apply_side_borders/iced 转换按需）；测试同步。
  验证：净窗截图 quote 两臂同款（左条无框）。
- [ ] **T2** fence header 居中：autodown_render.rs fence 臂 header 容器
  `center_y: true`。验证：截图 header 标签垂直居中。
- [ ] **T3** no-lang fence 主题：core.rs new_leaf_buffer None 臂改
  `hljs_theme_name(dark_mode())`。验证：浅档 plain fence 文字深色可读。
- [ ] **T4** checkbox/callout 图标统一（方案待澄清①裁定后执行）+
  callout padding 核对。验证：截图两态图标同风格。

### W2 编辑壳可见化

- [ ] **T5** list 归属推导 + marker/缩进绘制（core.rs render_frame +
  BlockDrawCtx；骨架 Seg::List 消费）。验证：编辑臂 bullets/序号/缩进
  与只读臂同构（截图）。
- [ ] **T6** task checkbox 编辑臂呈现（D4 字符对）。验证：截图两态。
- [ ] **T7** table 管道文本行 buffer（build_walk Table 臂）。验证：
  编辑臂表格文本可见（截图）。
- [ ] **T8** callout/details 骨架段 + 编辑臂绘制（D6）。验证：编辑臂
  callout 三件+details 可见（截图）。
- [ ] **T9** 回归：`cargo tf --no-fail-fast` + 本仓 playwright 全量 +
  vm-smoke（环境恢复后）；计数落复审记录。

### W3 收段

- [ ] **T10** 折回 auto-lang master + 本仓簿记（逐折提交信息带 PLAN-054）。

## 复审记录

（待 /auto-plan:review 填写）

## 待澄清事项

1. **图标配别方案**（T4 前置）：A=unicode 统一对（✔/□ 或 ☑/☐ 同族 +
   done 态 accent 色 run，最小改动）；B=矢量绘制（fill_rect 拼勾/框，零
   字体依赖，工作量中）。建议先 A 后视观感升级 B。
2. **quote 左条宽度通道**：§7.4 定 3px——实现走 border-l 专属宽度字段
   （class IR 微扩）还是 chrome 常量由渲染臂直读？执行期按最小侵入裁定。
3. **编辑臂表格/容器块的编辑边界**：本计划只做只读呈现（管道文本行/
   容器绘制），编辑能力属 PARITY #12 长期线——若验收期望可编辑，需
   另行立项。
4. **callout/details 骨架段形态**：扩 Seg 枚举（新变体）vs 复用 Quote
   结构+kind 标注——执行期按对既有 match 臂的扰动最小裁定。
