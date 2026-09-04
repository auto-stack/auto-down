---
plan_id: PLAN-050
status: execution_done
feature_name: VM demo 代码块与行内渲染对齐（token 标点/高亮主题/标签条/编辑壳行内）
author: [zhaopuming]
created_at: 2026-09-04T00:00:00+08:00
updated_at: 2026-09-04T15:30:00+08:00

supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 7
total_steps: 7
---

# [PLAN-050] VM demo 代码块与行内渲染对齐

## 变更摘要

修复用户实测确认的四项 VM 渲染轨清册盲区：①代码块语法高亮 token 标点
丢失 + 间距散架（两臂同病）；②代码块深色底 vs vue 浅色底（全局浅色主题
下高亮主题未跟随）；③预览臂代码块语言标签条塌陷成游离小黑块（文字缺失
+ 宽度塌陷）；④编辑臂行内 span 重叠（inline code 与相邻文字叠字，预览
臂正常）。照 PLAN-046 先例：实勘定位 → PARITY 补行 → 修复 → 截图证档
+ 双门回归。改动主体预计落 auto-lang 仓（渲染核心），按 PLAN-048 惯例
先行折入 auto-lang master + 本仓计划文档面随行。

## 目标

1. F1 标点/间距：`console.log(foo)`、`fn main() {`、`def fibonacci(n):`
   等代码在 VM 两臂渲染出**全部字符**（含括号/分号/冒号/逗号），token
   间距与 vue 轨目测一致（headless 全字符断言钉住）。
2. F2 高亮主题：全局浅色主题（047 `dark_mode=false`）下代码块浅底深字，
   与 vue 轨同族（截图对照）。
3. F3 标签条：预览臂每个代码块带全宽语言标签条、文字可见，游离黑块消失。
4. F4 行内：编辑臂行内 code span 与相邻文字不再重叠（截图）。
5. PARITY 清册补行：四项逐项成行（归宿 + 证据），消除盲区。
6. 回归不破：vm-smoke 退出码 0；autodown_editor rust 测试 66/66 不回退
   （F4 动编辑壳）；playwright 73/73 钉 vue 轨零意外。

## 架构方案

排查-修复不动架构，落点全在既有渲染链路（2026-09-04 master 快照锚点，
auto-lang 为活跃仓，执行期以函数/臂名锚复核行号）：

- **F1/F2 主战场**：`crates/auto-lang/src/ui/autodown_render.rs` ——
  :392「lang-<token> 类携带语言到 renderer 的 syntect 着色路径」；
  :407-419 PLAN-041 fence 三态统一（view/stream 正文 = 共享 buffer 绘制，
  code-editor 缺席时降级 lang-<token> View::Text 走 renderer syntect）；
  :246 `fence_view_key`。高亮 token 流的组装点即标点丢失嫌疑面；
  高亮 Theme 的选取点即 F2 嫌疑面（与 Plan 370 D-GAP `set_dark_mode`
  同路径核对主题联动）。
- **F3**：`autodown_render.rs:969` fence chrome 结构（圆角容器 >
  header + 代码区）——header 标签条在预览臂塌陷（文字缺失 + 容器宽度
  shrink），编辑臂同结构正常（:962 测试先例可对照）。
- **F4**：`crates/auto-lang/src/ui/autodown_editor/widget.rs`（cosmic-text
  块编辑壳）——行内 span 测宽/布局重叠；048 刚在 master 稳住编辑壳
  （66/66），直接其上修，不重开结构。
- **登记面**：`autodown/demo/auto/PARITY.md` 差异总表补行（四项盲区
  立案销账）；`DEBTS.md` 若实勘出余债随行登记。

## 技术栈

Rust（auto-lang 渲染核心，debug 构建 `D:/autostack/auto-lang`）；
Node（vm-smoke.mjs 双门）；AutoUI MCP 快照/截图（证档）；
playwright（vue 轨零回归门）。

## 需求分析与背景调查

### 实测背景（2026-09-04 会话实证）

- 用户实机截图（VM 版 demo，种子起步文档）与 047 复审留档
  `vm-seeded-start.png` 逐像素同款 → **非回归、既存状态**；047 验收
  口径为"同文档/同浅色/同两栏"三要素，块内部渲染不在口径内。
- vue 原件对照 `vm-vue-side-by-side-vue.png`：代码块浅底、全宽语言
  标签条（文字 + 折叠/复制钮）、`console.log(foo)` 等标点齐整紧凑。
- PARITY.md 十二项无此四项 → **清册盲区**（046 实勘只勘结构类 token，
  主题行 #5 只收全局浅盘；代码块内部渲染两期都未入册）。

### 四项症状细节（用户截图逐项）

| # | 症状 | 两侧 |
|---|------|------|
| F1 | `console .log foo`（`()` 丢）、`fn main` 后大缩进孤悬 `"Hello, world!"`（`(){};println!` 全丢）、`def fibonacci n / = 0 1 / = +`（`():,` 丢、token 间距散） | 编辑臂 + 预览臂 |
| F2 | 代码块深底 | 两臂；vue 为浅底 |
| F3 | 语言标签条塌陷成小黑块、文字不可见，每个预览代码块上方悬一游离黑块 | 仅预览臂（编辑臂标签条正常带文字） |
| F4 | 段落行内 code span 与相邻文字叠字（"inline cod[e]" 与 "and" 重叠） | 仅编辑臂（预览臂行内正常） |

### 相关 spec 底册

- P041（fence 家族统一 / fence_view_key 实例键）、P046（PARITY 立案 +
  类消费清单：`autodown` 组件臂 class 整串不读的通路事实）、P047
  （`dark_mode` 声明变量 → Plan 370 D-GAP sync 主题机制）、P048（编辑壳
  收尾，master 66/66 已稳——F4 的直接基线）。
- PLAN-049 结论在案：VM 窗口消失 = 共享机并行会话外部击杀（非产品
  bug）——执行期遇窗口消失直接重启续跑，不再误判回归。

## 详细设计

### 排查顺序与依赖

F1 与 F3 同在 fence 渲染链，先 F1 后 F3（同一实勘面）；F2 依赖 F1 落点
（高亮 token 组装点旁即 Theme 选取点）；F4 独立（编辑壳）可并行。

### 修复方向预案（实勘后裁定，以下为初始假设）

- **F1**：syntect 高亮循环组装文本节点时，非 keyword token（标点/操作符）
  被过滤或零宽化；或 styled text join 丢失原文字符串。修复 = token 流
  全量映射 + 空格/原宽重建。**先写失败用例**：headless 渲染
  ```` ```javascript ```` fence，断言输出文本含 `console.log(foo)` 全字符。
- **F2**：syntect Theme 默认深色（如 base16-ocean），未接 047 的
  `dark_mode` D-GAP。修复 = 浅色主题注册 + `set_dark_mode` 路径联动切换。
- **F3**：header 容器宽度语义（shrink 塌陷）+ 标签文字色与底色同色。
  修复 = header 行 width=Fill + 文字色对齐主题；游离黑块即塌陷 header
  本体，随修复消失。
- **F4**：cosmic-text 行内 span 测宽不含 code 字体度量差或 span 边界
  off-by-N。修复 = span 宽度计算补齐度量；048 的选区/合并逻辑不改。

### 明确不在本计划（边界）

- PARITY #5 残段（渲染面板 `py-4 px-5` 内边距，autodown 组件臂 class
  整串不消费）与 #8 thumb 观感——已在册转介，不吞。
- #10 mono CJK tofu（字体 fallback）——独立事项。
- #12 WYSIWYG 长期线。

## 测试设计

- **headless rust 断言**（主门）：`autodown_render.rs` 测试模块已有
  `renders_fence_quote_list_ordered_start`（:962）先例——F1 加全字符
  断言用例（javascript/rust/python 三 fence 的标点序列）；F4 在
  `autodown_editor` 测试侧加 span 边界用例。命令：
  `cargo test -p auto-lang autodown_render` / `cargo test -p auto-lang autodown_editor`。
- **截图证档**：净窗起 VM（`AUTOUI_MCP_PORT=9248` 起，9247 被 musk.exe
  占用为常态），种子起步即含全部四症状素材——四张特写
  （fence-token / fence-light-bg / fence-label / inline-overlap）+
  一张 vue 并排对照（照 047 T6 拼接口径）。
- **双门**：vm-smoke.mjs 退出码 0（窗口被外部击杀即重启整轮重试，
  049 caveat 在案）；playwright 73/73（vue 轨理应零影响，跑一把钉住）；
  `cargo test -p auto-lang autodown_editor` 66/66。

## 验收标准

1. F1：headless 断言三语言 fence 标点全字符通过；截图目测 token 间距
   与 vue 一档。
2. F2：浅色主题下代码块浅底（截图），`dark_mode` 联动路径有断言或
   打点证据。
3. F3：预览臂标签条全宽、文字可见、游离黑块消失（截图）。
4. F4：编辑臂行内无叠字（截图）；autodown_editor 66/66 不回退。
5. PARITY 差异总表四项在册（编号 + 归宿 + 证据快照行号/函数锚双标）；
   证据截图入库 `demo/auto/`。
6. 双门绿：vm-smoke 退出码 0 + playwright 73/73。
7. 旧归因/旧状态零残留：`grep` PARITY 无「盲区补行前」的过时表述。

## 执行步骤

### T1 实勘 F1 标点丢失点 + 失败用例
- 操作：读 `autodown_render.rs:392-419` syntect 着色与 token 组装路径
  （必要时追 `code_editor/core/highlight.rs`），定位标点 token 丢失/
  零宽化点位；在 `autodown_render.rs` 测试模块加三语言 fence 全字符
  断言用例（对标 :962 先例结构）。
- 文件：`D:/autostack/auto-lang/crates/auto-lang/src/ui/autodown_render.rs`。
- 验证：`cargo test -p auto-lang autodown_render` 新用例红，红在断言
  缺字符上（非编译错）。
- [✅ 已完成] 实勘翻案：DocRun 流本身完整（探针 dump：`(` `)` `.` 全在
  流中、x 单调递增）——丢失在**主题分叉**：buffer hljs 主题随全局
  `dark_mode()`（047 后浅色）选浅色主题，fence chrome 却硬编码 zinc-950
  暗板；浅色 hljs 的基色标点近黑 (0.04,0.04,0.04) 画在近黑底上不可见。
  **F1/F2 同根**（chrome 与 buffer 主题不同源翻转）。次因（间距散架）：
  cosmic Monospace 测宽 8.2px/字符@14px ≠ 绘制 Consolas ≈7.77px。F4：
  段落行内 code 区间 buffer 以 sans 测宽、绘制换 mono（更宽）→ 叠字。
  F3：header Container 的 text-zinc-400 色类不达子 Text（默认黑画
  zinc-800 上不可见）+ 宽度收缩成游离黑条。失败用例按实证口径落位
  （主题一致性断言，非全字符——字符本就全在）：
  `fence_chrome_and_text_follow_light_theme`（core.rs，红：bg got
  (0.04,0.04,0.04)）、`paragraph_inline_code_measured_mono`（core.rs，
  红）、`fence_view_chrome_light_header_full_width_label_colored`
  （render.rs，红）。

### T2 修 F1 至绿
- [✅ 已完成] 与 T3/T4 合并实施（同根）：①`autodown_blocks.rs` 增
  `FENCE_CHROME_LIGHT`（浅色档对齐 vue `.code-block-container` 实值
  gray-50/gray-200/gray-700）+ `fence_palette()` 编辑壳配色同源翻转 +
  `family_of(Fence)` 按 `theme::dark_mode` 选暗/浅两 static（同主题下
  单例语义不变，测试同步扩展）；②暗色档 header 补 `w-full` + 标签自带
  色（F3 同修，字面量锚测试随新单源更新）；③`renderer.rs`
  `dynamic_view` D-GAP 同步增「值变化 → 标 view_dirty」——预览臂
  chrome 类串在 view 求值期解析，Element 缓存曾卡首帧暗色档（真窗首验
  发现的两臂分叉：编辑臂 palette 在 draw 期不受影响）。测试：两只新
  用例绿；editor 68（+2）/render 22（+1）/blocks 6。真窗截图验证：两
  臂浅底 + 标点全 + 标签条全宽可读。worktree commit 07c13ab27（红用
  例）→ 461032df8（修复）。

### T3 修 F2 高亮主题接全局主题
- [✅ 已完成] 实勘翻案：buffer hljs 主题本就随 `dark_mode`
  （`new_leaf_buffer` → `hljs_theme_name(dark_mode())`）——分叉在
  chrome 硬编码暗板，T2 的 chrome 主题感知即为 F2 修复本体（两侧同源
  翻转后自洽）。demo 侧零改动 ✓（沿 047 机制）。已知余量：buffer
  主题在构建期选定，运行时翻转主题不重刷存量 buffer（demo 无切换面，
  T7 DEBTS 登记）。

### T4 修 F3 预览臂标签条塌陷
- [✅ 已完成] 根因：header Container 的 `text-zinc-400` 色类不达子
  Text（View::Text 自带 style 无色 → iced 默认前景近黑画 zinc-800 暗
  底不可见）+ 容器宽度收缩成游离黑条。修法并入 T2 的
  FENCE_CHROME(_LIGHT)：header 类串补 `w-full`（→Width(Full)），
  `header_label` 自带 `text-zinc-400`/`text-gray-700`。两臂截图标签
  条全宽可读、游离黑块消失 ✓。

### T5 修 F4 编辑壳行内重叠
- [✅ 已完成] 根因双层：①段落 buffer 全文 sans 测宽、绘制侧 st.code
  段换 mono 字体（更宽）→ 画宽超槽压叠后词；②建仓期落的 AttrsList
  family span 会被 cosmic SyntaxEditor 高亮重写抹除（cosmic-text
  syntect.rs:337-369 以 defaults+颜色 span 整体重写行 attrs_list——
  widget 临时插桩实证：真窗「inline code」槽位 77px=sans 量宽，Consolas
  实宽应 ~97px）。修法：①`mono_family()` Windows 对齐绘制侧
  Consolas（fence token 间距散架同修：cosmic Monospace ≈8.2px/字符
  vs Consolas ≈7.77px@14px）；②`ensure_code_family_spans` 在
  render_frame 块循环 `shape_as_needed` 后帧内幂等重落 family span +
  补一次整形（常态已就位零成本跳过；两臂共用 render_frame 单点覆盖）。
  插桩复验：「, and a 」起点 328.97 → 348.70（槽位=Consolas 实宽），
  真窗截图行内不叠字 ✓。editor 68/68（66 基线 + `paragraph_inline_
  code_measured_mono` 改为 render_frame 后断言的诚实契约 + F1 主题
  一致性用例）。

### T6 证档 + PARITY 补行 + 双门
- [✅ 已完成] 证档五件入库 demo/auto/：vm-050-fence-preview.png /
  vm-050-fence-editor.png（两臂浅底+标点全）/ vm-050-label-bars.png
  （标签条全宽可读）/ vm-050-inline-code.png（行内不叠字）/
  vm-050-side-by-side.png（VM×vue 并排，vue 原件复用 047——vue 轨本
  计划零改动，playwright 73/73 证明）+ vm-050-fixed-full.png 整窗。
  PARITY 差异总表十二→十六项：#13 chrome 主题分叉 / #14 标点不可见
  （探针翻案口径）/ #15 标签条塌陷 / #16 行内 code 叠字（编号+归宿+
  函数锚+截图双标）；W2 波次行续收注记。README 增两条 CONSUMED
  状态（PLAN-050 四症状+证据指针）。双门绿：vm-smoke 11/11 退出码 0
  + playwright 73/73（1.3m）。worktree commit 0aad8cb。

### T7 收口
- [✅ 已完成] grep 残留零活性（「游离黑块/塌陷/console .log foo」仅存
  于 PLAN-050 曾/根因语境的史实记录）；DEBTS.md 增 050 行（buffer
  hljs 主题构建期选定，运行时翻转不重刷存量 buffer——demo 无切换面
  🟢）。预折门：cargo tf 失败集 ≡ master（schema_drift_fence +
  kitchen_sink_page_in_sync 两红为主 checkout 基线既有，主仓对照复跑
  证，非 050 引入）+ cargo tv 3565/3565 全绿。折入：auto-lang master
  merge commit **53d4c57fc**（fast 无冲突，4 文件 +275/−21）。auto-down
  worktree plan-050-dev 待 /auto-plan:merge 终折；auto-lang 依赖
  worktree（auto-down-dev 分支）已折，目录留待终清。

## 复审记录

（待 /auto-plan:review 填写）

## 待澄清事项

1. PARITY 编号：四项按 #13-#16 新行，还是 F2 并入 #5 主题族行内销账
   ——T6 实勘后按证据亲疏定，草案按新四行起。
2. auto-lang 改动携带方式：沿 048 先例（代码先行折入 auto-lang master
   + 本仓文档面随行）预计无争议；若执行期 auto-lang 并行会话冲突，
   冲突面与折入顺序在 T7 前落定。
3. F2 若实勘发现高亮 Theme 与 #10（CJK 字体回退）共用字体/主题加载面，
   是否顺带修 #10——默认不顺带（边界外），实勘后若同点再议。
