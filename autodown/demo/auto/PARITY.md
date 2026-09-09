# PARITY.md — demo 双轨平台差异清册（PLAN-046 立案）

vue 轨（`auto run`，生成 App.vue）与 VM 轨（`auto run -r vm`，iced 桌面）
的逐项差异、归宿与证据指针。2026-09-03/04 T1/T2 实勘立案；后续波次
（W2-W5）开工前先到本表对位，收口后销行。

auto-lang master 为活动仓（并行会话持续推进），下述 rust 证据行号为
2026-09-04 快照值，函数/臂名锚点为准。

## 差异总表（十九项）

| # | 项 | vue 轨现状 | VM 轨现状 | 归宿 | 证据 |
|---|----|-----------|----------|------|------|
| 1 | 两栏布局 | `row` + 两 `col`（flex-1 等宽），Tailwind 类 + style 块 scoped 工具类兜底 | 同结构：`row`→convert_row、`col`→convert_column、flex-1→Flex1→width=Fill 两 col 平分 | ✅ **本计划 T1 收编**（README「Layout note」竖排降级销号） | demo/auto/src/front/app.at view 节；vm-two-columns.png（改前竖排形态：vm-block-coverage.png + 旧 README Layout note）；auto-lang ui/aura_view_builder.rs `convert_element_tracked_ctx` row/col 臂、ui/style/iced_adapter.rs `StyleClass::Flex1` 臂 |
| 2 | 滚动同步 | useSyncedScroll（ext bridge 三测量） | Scrollable 写入/读出双臂 + 双向比例联动 | ✅ **PLAN-043 已折入 master**（T2 vm-smoke 滚动三断言 + 拖拽组实证） | DEBTS.md 040 滚动同步销号行；demo/auto/vm-smoke.mjs 组 4；vm-scroll-sync.png |
| 3 | ghost 占位块 | @focusblock emit → bridge.editingBlock | on_focus rust 直写快道 → ghost_id/ghost_height state | ✅ **PLAN-044 已折入+归档**（T2 vm-smoke ghost 组实证） | DEBTS.md 040 ghost 销号行；vm-ghost-at-block0/-block2.png；vm-smoke.mjs 组 5 |
| 4 | 表格列宽拖拽 | ext 桥 useTableColumnResize（DOM 测量） | 固定布局（无测量通道） | ✅ **PLAN-045 已折入+归档**（复审期核实：vm-smoke 第六组拖拽断言随 master smoke；DEBTS 040 表格行已销号） | DEBTS.md 040 表格列宽销号行；EDITOR-CONTRACT §12 |
| 5 | 主题观感 | 浅色：toolbar #fff / 文字 #111827（app.at style 块） | ✅ 浅色一致（PLAN-047 收口）：app.at model 声明 `var dark_mode bool = false`，auto-lang Plan 370 D-GAP sync 每次 view 更新推 `iced_adapter::set_dark_mode`，首帧即浅盘 | ✅ **PLAN-047 收口**（主题段）；✅ **PLAN-058 T12 收口**（渲染面板 `py-4 px-5` 内边距：`autodown` 臂内容侧 padded Container 消费观感段 token，混合结构段仍不并入包装层；实机截图四点核验在案） | app.at model dark_mode 声明；vm-light-theme.png；vm-seeded-start.png；renderer.rs read_state("dark_mode") 臂（Plan 370 D-GAP） |
| 6 | 初始文档种子 | ext `initial_content()` 载 src/content.ts 全文档 | ✅ 同文档起步（PLAN-047 收口）：顶层 `use.web.fn` → 适配器链 app_ext.at→app_ext.vm.at（生成物），initial_content 真符号非桩；`AUTO_VM_EXT_STUBS=0` 仍链接 | ✅ **PLAN-047 收口**（单源：content.ts → scripts/gen-vm-content.mjs 生成，双轨不漂移，T3 回路实证） | scripts/gen-vm-content.mjs；src/front/utils/app_ext.vm.at（GENERATED 头注）；app_ext.at 锚；vm-seeded-start.png |
| 7 | 编辑器空态 | placeholder「Start typing...」空态文案 | ✅ 编辑壳空态真消费（PLAN-048 T7）：aura_view_builder 双路径臂 placeholder 绑定求值 → `View::AutodownEditor` 扩字段 → iced 双 lowering → content 空且非聚焦渲染基色 0.55 调光灰文案（空白文案/只读实例/聚焦三守卫） | ✅ **PLAN-048 收口**（W4 销行；core 3 测试 + 发射测试翻转钉死） | auto-lang aura_view_builder.rs autodown_editor 臂（Plan 040 忽略豁免摘除）；view.rs placeholder 字段；autodown_editor/core.rs render_frame 注入 |
| 8 | CustomScrollbar 观感/拖拽 | 自绘 thumb + 拖拽 | 三测量数据已接（043）；拖拽发射面实证（T2 smoke drag 组过）；thumb 观感差异残留 | 数据面 ✅ **PLAN-043 收口**；✅ **PLAN-058 T12 收口**（thumb 观感：bg-black/30 命名色+透明度 VM 不解析→改 bg-[#000000]/30 arbitrary 形态（plan 503 支持），w-[8px]/rounded 原生可解析；实机 thumb 灰色可见） | DEBTS.md 040 CustomScrollbar 销号行；vm-smoke.mjs 拖拽断言；vm-drag-before/-after.png |
| 9 | web-only 块降级 | mermaid/query/math 真渲染 | mermaid「web-only」头面板、query「未求值」标签、math「web-only」头面板 + $$ 包裹（048 math chrome 对齐） | ✅ **PLAN-048 裁定收口：显式豁免登记**（mermaid resvg 无布局引擎/query 求值归宿主/math KaTeX web-only——三者补渲染成本高企，维持降级 chrome + 显式标签；math header 随 048 对齐面板族；mermaid 标签低对比观察在 DEBTS 048 行） | vm-block-coverage2.png（041 实证）；vm-webonly-chrome.png（048 实机） |
| 10 | mono CJK tofu | 系统字体回退正常 | code fence 等宽字体 CJK 豆腐框 | **auto-lang 侧**（字体 fallback），清册转介 | 041 复审债候选三条之一 |
| 11 | ext 桩告警四符号 | initial_content/is_vue/logSave/logCancel/useDemoAppBridge 真实现 | initial_content 经适配器链真实现（PLAN-047，app_ext.vm.at）；is_vue/logSave/logCancel/useDemoAppBridge 仍 no-op 平台桩 + 运行时各告警一次（**预期行为**） | **显式豁免维持（四符号）**（`AUTO_VM_EXT_STUBS=0` 可复原硬错误；initial_content 已出桩列，STUBS=0 下真符号链接） | DEBTS.md 040 ext 桩行（四符号修准）；README「Ext stub warnings」段；scripts/gen-vm-content.mjs |
| 12 | 编辑面能力差 | @autodown/engine WYSIWYG 块家族（气泡/斜杠菜单/undo/节点视图） | cosmic-text 块编辑壳（块粒度编辑；048 补齐跨块选区/跨容器合并/行首输入规则/undo 钉死——编辑行为面收口） | **长期线**，清册转介——台账「块组件契约/WYSIWYG」目标族主战场，非波次化对象；048 T1 产出的 vue↔rust 编辑语义用例对照表（26 组三态映射，计划复审记录在册）为 #12 长期线的底册输入 | packages/engine/EDITOR-CONTRACT.md；specs 台账 goals 族；PLAN-048 复审记录对照表 |
| 13 | 代码块 chrome 主题分叉 | `.code-block-container` 浅色实值（#f9fafb 容器/#e5e7eb 边与 header/#374151 标签，engine autodown-editor.css） | ✅ 主题同源（PLAN-050）：`FENCE_CHROME_LIGHT` 浅色档对齐 vue 实值 + `family_of(Fence)` 按 `dark_mode` 选 static + 编辑壳 `fence_palette()` 同源翻转 + D-GAP 值变化标 view_dirty（预览臂 chrome 曾卡首帧暗色 Element 缓存——两臂分叉根因）；**PLAN-053 复验注记（2026-09-05）**：view 臂同族残留（StreamCache 主题不失效）经 theme 主题代数修复收口（`--quadrants` F(view 翻转) 轴 CONSISTENT 实证），第七组浅档净窗硬断言在岗 | ✅ **PLAN-050 收口**（#5 主题族的 fence 段延伸：047 收的是面板级，fence 内 chrome 本行收口） | auto-lang ui/autodown_blocks.rs FENCE_CHROME_LIGHT/fence_palette/family_of；ui/iced/renderer.rs dynamic_view D-GAP 标脏；vm-050-fence-preview.png/-editor.png |
| 14 | 代码块标点不可见 | lowlight 着色，标点齐整 | ✅ 全字符可见（PLAN-050）：根因非字符丢失——DocRun 流本就完整（探针实证 `(` `)` `.` 全在流中、x 单调），浅色 hljs 基色标点近黑 (0.04,0.04,0.04) 画在硬编码 zinc-950 暗底上不可见；#13 chrome 浅色化后自愈（同源翻转） | ✅ **PLAN-050 收口**（与 #13 同根同修；`fence_chrome_and_text_follow_light_theme` 测试钉死主题一致性） | vm-050-fence-preview.png（`console.log(foo)`/`fn main() {` 全标点实机）；auto-lang autodown_editor/core.rs 测试 |
| 15 | fence 语言标签条塌陷 | 全宽 header 条 + 文字 + 折叠/复制钮 | ✅ 全宽标签条文字可读（PLAN-050）：根因 header Container 色类不达子 Text（默认前景近黑画 zinc-800 不可见）+ 宽度收缩成游离黑条；修 header `w-full` + `header_label` 自带色（暗/浅两档同修） | ✅ **PLAN-050 收口**（折叠/复制钮不在 VM 轨范围——只读降级 chrome 语义，048 #9 豁免族邻接） | auto-lang autodown_blocks.rs FENCE_CHROME(_LIGHT) header/header_label；vm-050-label-bars.png |
| 16 | 行内 code 叠字 | 行内 code 等宽字体、无叠字 | ✅ mono 测宽=画宽（PLAN-050）：根因双层——段落 buffer 全文 sans 测宽而绘制侧 code 段换 mono（更宽）超槽压叠后词 + cosmic SyntaxEditor 高亮重写行 attrs_list 抹除 family span（syntect.rs:337-369）；修 `mono_family()`=Consolas（Windows，对齐绘制）+ render_frame 帧内 `ensure_code_family_spans` 幂等重落（fence token 间距散架同修：cosmic Monospace ≈8.2px ≠ Consolas ≈7.77px@14px） | ✅ **PLAN-050 收口**（`paragraph_inline_code_measured_mono` render_frame 后断言契约；插桩复验「, and a 」起点 328.97→348.70=Consolas 实宽） | auto-lang autodown_editor/core.rs mono_family/ensure_code_family_spans；vm-050-inline-code.png；vm-050-side-by-side.png |

| 17 | 运行时主题切换器 + accent 盘 | settings popover（settings_popover.at 适配件）：⚙ 钮 → 深浅/accent 五色，引擎 darkMode/accent props 声明式消费（根 .is-dark + data-accent，Design 22 §7 规约行单源）；app 级 chrome 条件类 .app-dark | 同构：popover 两轨原生渲染（native_button 原生逃生名 + auto-lang VM 别名），dark_mode 状态经 D-GAP 全局翻转 + **fence buffer 运行时重着色**（retheme_all_fence_buffers 两翻转臂挂钩，DEBTS 050 销号）；document accent 消费豁免（见行内注） | ✅ **PLAN-051 收口**（vm-051-settings.mjs 实机全链路 PASS：⚙→popover→Dark→✕→Light 程序门 + vm-051-light/dark.png；document accent VM 侧 iced 主题接线为豁免残段，后续独立立项）。**PLAN-052 T10-T12 读数注记（2026-09-05）**：浅档干净启动 view 臂 fence 深盘分叉（051-候选，非 051 引入）经像素探针 probe-051-view-theme.mjs 四轴判读——首帧 FORK（renderer zinc950 40.4%）、深档对照同批 statics、D-GAP 翻回浅不重建存量（A2b）、编辑新建 fence 正确浅（A3）→ pinpoint=首帧取档错误+内容寻址缓存不随主题失效；auto-lang HEAD 仍在；回归门=vm-smoke 第七组（AUTO_VM_KNOWN_FORK 门控，修复后摘门）。**PLAN-053 T10/T12 收口注记（2026-09-05）**：fork 已修（转介单①收回自修——theme 主题代数+StreamCache 主题失效，auto-lang master 2d3b2d1e0 折回）；`--quadrants` 七行全 CONSISTENT；第七组+第八组（主题翻转组）摘门控转硬断言，AUTO_VM_KNOWN_FORK 门控退役 | demo/auto/vm-051-settings.mjs；auto-lang dynamic.rs 三补面（纯 emit 子件派发/引号键归一/幻影载荷裁剪）；PARITY-051 证据 vue-051-*/vm-051-*.png |

| 18 | 块键编辑 UX 三项（标题回车尾块降级 / 空块退格合并 / 方向键跨块垂直导航） | ①②③ 全落地（2026-09-07 复审轮，commit 9c6f3bf + cd8fa98）：① SplitBlock 尾块 Heading→Paragraph（block_model.at splitTailKind 不变式 + level 属性不随降级复制）；② 空块退格合并（prevSiblingId 模型侧前驱修复 DOM 兄弟死路 + ext 按合并结果 preventDefault）；③ ↑/↓ 跨块垂直导航（caretOnFirstLine/LastLine 行盒探测 + navigateUp/Down 端点落位：↑ 上一块末尾 / ↓ 下一块开头，字形级正上方匹配缓行） | ①✅ **PLAN-060 收口**：enter_split 尾块降级（LeafKind::Heading→Paragraph，原「保持同级」即同款缺陷）；②✅ **现状达标随单测钉死**：caret_at_soft_start → merge_into_previous（junction 落位/焦点回迁/块数还原）；③✅ 原生已有且为超集（navigate_vertical + nav_goal_x 字形落位记忆，批次十④） | ✅ **PLAN-060 收口**（TDD 3 单测：enter_split_heading_tail_demotes/at_end + backspace_empty_tail_merges_to_prev_end；vm-060-probe.mjs MCP 实机三断言 PASS）；VM 的 nav_goal_x 字形落位保留为超集行为，网页轨端点落位为已裁定子集 | auto-lang autodown_editor/core.rs enter_split/merge_into_previous；vm-060-enter.png/-backspace.png；demo/auto/vm-060-probe.mjs；demo/e2e/heading-enter-backspace.spec.ts + cross-block-arrow-nav.spec.ts（网页轨真键盘对照） |

| 19 | 块首点光标落点（文本叶块点击交接 / 容器点击归属 / 表格单元格聚焦） | ✅ **本次（2026-09-09）网页轨落地**：click-caret 单槽通道（点 / 明文偏移 / cellId 三类载荷）+ `resolveClickHit`（叶包装 ↔ 模型原子子叶按文档序配对、表格行列定位）+ `selectBlock` 深选覆盖 + RichTextHost / 表格编辑面挂载消费；实测修复前 H2 点 `i`(offset 4)→caret 11、容器点第 2 项→焦点落第 1 项、表格编辑面不聚焦，修复后逐项 = 点击位 | ✅ **PLAN-061 T-04/T-05 收口（2026-09-09）**：单趟字形命中实证达标——vm-061-probe.mjs ALL PASS（A1 标题中线 / A2 段落 x=40→off5·x=120→off16 字形单调含行内标记 / A3+A4 列表第 2 项独立点击带 / A5 引用中线 / A6 Callout 正文 / A7 Details 正文·编辑臂恒展开 / B1 表格 Barbaz cell 几何命中 off2→8 / B2 fence 代码行字形级 / B3 行尾 Down 无幻影尾行）+ core.rs 三单测钉死（mouse_click_leaf_lands_caret_at_clicked_glyph / mouse_click_list_lands_on_clicked_item / mouse_click_table_lands_on_clicked_cell）；观察两项登记：①空白点击最近块回落（VM 特有，web 槽外无效果）②Details 编辑臂恒展开（只读臂正常折叠） | ✅ **PLAN-061 收口**（双轨语义对齐裁定：VM 天然达标零逻辑改动，T-05 走单测钉死路径；docs/plans/061-click-caret-parity.md） | engine src/editor/engine/click-caret.ts（:64/76/101/168/181/212/224）；src/editor/components/EngineEditor.vue:617/828；demo/e2e/block-click-caret.spec.ts（8）+ codeblock-click-caret.spec.ts（2）；vm-061-probe.mjs + vm-061-para-caret/-table-cell/-fence-caret.png；auto-lang autodown_editor/core.rs（handle_mouse_press:1162 单趟命中 + T-05 三测） |

## T1/T2 实测类消费清单（VM 轨，view 树逐 token）

实測口径：auto-lang `StyleClass::parse_single`（ui/style/class.rs）+
`iced_adapter` 消费臂读码 + T2 截图/snapshot 实证。

| token | VM 轨消费 | 证据（2026-09-04 快照） |
|-------|-----------|------------------------|
| `flex-1` | ✅ `StyleClass::Flex1` → width=Fill（Row 两 Fill 子元素天然平分） | class.rs `return Ok(StyleClass::Flex1)`（:1228）；iced_adapter.rs Flex1 臂（:1024，Plan 370 注） |
| `h-full` / `w-full` | ✅ Width/Height(Full) | class.rs parse_single w-full/h-full 臂（测试 :2130 在案） |
| `flex` / `flex-row` / `flex-col` | ✅ Display + FlexDirection（vue 生成器默认注入类；VM 轨读 DSL 原文 tag 语义，row/col 臂自带方向） | vue.rs :7511-7512 默认类；aura_view_builder row/col 臂 |
| `min-w-0` | ✅ `MinWidth(0.0)`（PLAN-527 T3 收紧后数值命名） | class.rs min-w 臂（:1341） |
| `min-h-0` | ✅ `MinHeight(0.0)` | class.rs min-h 臂（:1329） |
| `overflow-hidden` | ✅ `OverflowHidden` → iced x/y Hidden | class.rs :1739；iced_adapter.rs :922 |
| `border-r` | ✅ `BorderRight`（`border_right=true`；border_color None → 主题默认色） | class.rs :1445；iced_adapter.rs :774 |
| `py-4` / `px-5` | ✅ 解析 `PaddingY/X`（:781/:775）；✅ **PLAN-058 T12 达视图**——`autodown` 臂观感段（py-*/px-*/p-*）经内容侧 padded Container 消费（结构段 flex-1/min-h-0/overflow-hidden 仍不并入包装层，043 T6 炸布局注记维持） | aura_view_builder.rs autodown 臂 padded Container + autodown_padding_class helper |
| `left` / `right` | ➖ 未知 token 静默跳过（parse_single 兜底）——e2e 定位钩，VM 零效果（plan 046 待澄清④） | class.rs parse_single 尾部兜底 return |

组件臂通路注记：

- `autodown_editor`：class 解析进**内层**编辑壳视图（:1528 extract_style_with；
  包装 Scrollable 合成样式 :1549）——`flex-1 min-h-0 overflow-hidden` 落内层，
  观感无害。
- `autodown`：class 整串不消费 → 渲染面板 `py-4 px-5` 内边距 VM 缺席，
  原并入差异 #5（观感族，W2/PARITY-527 补齐）；PLAN-047 落地主题段后
  本残段转介 auto-lang 侧（组件臂 class 消费），不阻塞结构验收。

## vue 轨兜底注记（T1 落地形态）

demo 构建无 Tailwind 运行时（demo/package.json 无 tailwind 依赖；
@autodown/engine style.css 无工具类；CustomScrollbar 类串中的 tailwind
token 同为惰性）——T1 结构类（flex/flex-row/flex-col/flex-1/h-full/w-full/
min-w-0/min-h-0/overflow-hidden/border-r/py-4/px-5）的 vue 轨真 CSS 由
app.at style 块 **scoped 工具类兜底定义** 提供（plan 046「vue 侧 style
块保留兜底」原则的落实）；VM 轨经上表真消费，两轨类名单源。

## 预留波次索引

| 波次 | 内容 | 前置 | 吞吐差异项 |
|------|------|------|-----------|
| W2 | 主题对齐（VM 浅色两栏） | auto-lang PLAN-527 T8（dark/theme） | ✅ **PLAN-047 收口**主题段（#5）；**PLAN-050 续收 fence 内 chrome 段**（#13/#14，浅色 hljs 主题 × 硬编码暗板的分叉）；#8 thumb 观感段、#4 渲染面板内边距（py-4 px-5 VM 消费臂）仍未随，转介 auto-lang 侧/后续清册；**PLAN-051 续收运行时主题切换器**（#17：popover+props+重着色，thumb 观感仍开放） |
| W3 | 初始文档种子 | auto-lang ext 资产机制 或 DSL 多行字面量立项 | ✅ **PLAN-047 收口**（#6；442 A3 适配器链 + 生成转义字面量，两前置均绕开） |
| W4 | 编辑器空态 placeholder | 编辑壳空态能力 | ✅ **PLAN-048 收口**（#7） |
| W5 | web-only 块降级裁定（豁免登记 or 补渲染） | 届时按成本定夺 | ✅ **PLAN-048 裁定收口**（#9 显式豁免 + math chrome 对齐） |
