# PARITY.md — demo 双轨平台差异清册（PLAN-046 立案）

vue 轨（`auto run`，生成 App.vue）与 VM 轨（`auto run -r vm`，iced 桌面）
的逐项差异、归宿与证据指针。2026-09-03/04 T1/T2 实勘立案；后续波次
（W2-W5）开工前先到本表对位，收口后销行。

auto-lang master 为活动仓（并行会话持续推进），下述 rust 证据行号为
2026-09-04 快照值，函数/臂名锚点为准。

## 差异总表（十二项）

| # | 项 | vue 轨现状 | VM 轨现状 | 归宿 | 证据 |
|---|----|-----------|----------|------|------|
| 1 | 两栏布局 | `row` + 两 `col`（flex-1 等宽），Tailwind 类 + style 块 scoped 工具类兜底 | 同结构：`row`→convert_row、`col`→convert_column、flex-1→Flex1→width=Fill 两 col 平分 | ✅ **本计划 T1 收编**（README「Layout note」竖排降级销号） | demo/auto/src/front/app.at view 节；vm-two-columns.png（改前竖排形态：vm-block-coverage.png + 旧 README Layout note）；auto-lang ui/aura_view_builder.rs `convert_element_tracked_ctx` row/col 臂、ui/style/iced_adapter.rs `StyleClass::Flex1` 臂 |
| 2 | 滚动同步 | useSyncedScroll（ext bridge 三测量） | Scrollable 写入/读出双臂 + 双向比例联动 | ✅ **PLAN-043 已折入 master**（T2 vm-smoke 滚动三断言 + 拖拽组实证） | DEBTS.md 040 滚动同步销号行；demo/auto/vm-smoke.mjs 组 4；vm-scroll-sync.png |
| 3 | ghost 占位块 | @focusblock emit → bridge.editingBlock | on_focus rust 直写快道 → ghost_id/ghost_height state | ✅ **PLAN-044 已折入+归档**（T2 vm-smoke ghost 组实证） | DEBTS.md 040 ghost 销号行；vm-ghost-at-block0/-block2.png；vm-smoke.mjs 组 5 |
| 4 | 表格列宽拖拽 | ext 桥 useTableColumnResize（DOM 测量） | 固定布局（无测量通道） | ✅ **PLAN-045 已折入+归档**（复审期核实：vm-smoke 第六组拖拽断言随 master smoke；DEBTS 040 表格行已销号） | DEBTS.md 040 表格列宽销号行；EDITOR-CONTRACT §12 |
| 5 | 主题观感 | 浅色：toolbar #fff / 文字 #111827（app.at style 块） | ✅ 浅色一致（PLAN-047 收口）：app.at model 声明 `var dark_mode bool = false`，auto-lang Plan 370 D-GAP sync 每次 view 更新推 `iced_adapter::set_dark_mode`，首帧即浅盘 | ✅ **PLAN-047 收口**（主题段）；渲染面板 `py-4 px-5` 内边距/border 观感残段转介 auto-lang 侧（`autodown` 组件臂 class 整串不读，见实测清单） | app.at model dark_mode 声明；vm-light-theme.png；vm-seeded-start.png；renderer.rs read_state("dark_mode") 臂（Plan 370 D-GAP） |
| 6 | 初始文档种子 | ext `initial_content()` 载 src/content.ts 全文档 | ✅ 同文档起步（PLAN-047 收口）：顶层 `use.web.fn` → 适配器链 app_ext.at→app_ext.vm.at（生成物），initial_content 真符号非桩；`AUTO_VM_EXT_STUBS=0` 仍链接 | ✅ **PLAN-047 收口**（单源：content.ts → scripts/gen-vm-content.mjs 生成，双轨不漂移，T3 回路实证） | scripts/gen-vm-content.mjs；src/front/utils/app_ext.vm.at（GENERATED 头注）；app_ext.at 锚；vm-seeded-start.png |
| 7 | 编辑器空态 | placeholder「Start typing...」空态文案 | 编辑壳臂 `let _ = props.get("placeholder")` 读取后忽略 | **W4 预留**，前置编辑壳空态能力 | auto-lang aura_view_builder.rs autodown_editor 臂 placeholder 行（Plan 040 注） |
| 8 | CustomScrollbar 观感/拖拽 | 自绘 thumb + 拖拽 | 三测量数据已接（043）；拖拽发射面实证（T2 smoke drag 组过）；thumb 观感差异残留 | 数据面 ✅ **PLAN-043 收口**；thumb 观感段转介 auto-lang 侧/后续清册（原「并入 W2」——W2 主题段已由 PLAN-047 落地，thumb 未随，残段在册不销号） | DEBTS.md 040 CustomScrollbar 销号行；vm-smoke.mjs 拖拽断言；vm-drag-before/-after.png |
| 9 | web-only 块降级 | mermaid/query/math 真渲染 | mermaid「web-only」头面板、query「未求值」标签、math「web-only」头面板 + $$ 包裹（048 math chrome 对齐） | ✅ **PLAN-048 裁定收口：显式豁免登记**（mermaid resvg 无布局引擎/query 求值归宿主/math KaTeX web-only——三者补渲染成本高企，维持降级 chrome + 显式标签；math header 随 048 对齐面板族） | vm-block-coverage2.png（041 实证）；048 截图随实机门补档 |
| 10 | mono CJK tofu | 系统字体回退正常 | code fence 等宽字体 CJK 豆腐框 | **auto-lang 侧**（字体 fallback），清册转介 | 041 复审债候选三条之一 |
| 11 | ext 桩告警四符号 | initial_content/is_vue/logSave/logCancel/useDemoAppBridge 真实现 | initial_content 经适配器链真实现（PLAN-047，app_ext.vm.at）；is_vue/logSave/logCancel/useDemoAppBridge 仍 no-op 平台桩 + 运行时各告警一次（**预期行为**） | **显式豁免维持（四符号）**（`AUTO_VM_EXT_STUBS=0` 可复原硬错误；initial_content 已出桩列，STUBS=0 下真符号链接） | DEBTS.md 040 ext 桩行（四符号修准）；README「Ext stub warnings」段；scripts/gen-vm-content.mjs |
| 12 | 编辑面能力差 | @autodown/engine WYSIWYG 块家族（气泡/斜杠菜单/undo/节点视图） | cosmic-text 块编辑壳（块粒度编辑） | **长期线**，清册转介——台账「块组件契约/WYSIWYG」目标族主战场，非波次化对象 | packages/engine/EDITOR-CONTRACT.md；specs 台账 goals 族 |

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
| `py-4` / `px-5` | ✅ 解析 `PaddingY/X`（:781/:775）；❌ **不达视图**——`autodown` 组件臂整串不读 class（scroll_sync 包装层取合成 `w-full h-full`，043 T6 注：元素混类挂 Scrollable 实测炸布局） | aura_view_builder.rs autodown 臂（:1564 起，无 extract_style_with）+ 合成包装（:1616） |
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
| W2 | 主题对齐（VM 浅色两栏） | auto-lang PLAN-527 T8（dark/theme） | ✅ **PLAN-047 收口**主题段（#5）；#8 thumb 观感段、#4 渲染面板内边距（py-4 px-5 VM 消费臂）未随，转介 auto-lang 侧/后续清册 |
| W3 | 初始文档种子 | auto-lang ext 资产机制 或 DSL 多行字面量立项 | ✅ **PLAN-047 收口**（#6；442 A3 适配器链 + 生成转义字面量，两前置均绕开） |
| W4 | 编辑器空态 placeholder | 编辑壳空态能力 | ✅ **PLAN-048 收口**（#7） |
| W5 | web-only 块降级裁定（豁免登记 or 补渲染） | 届时按成本定夺 | ✅ **PLAN-048 裁定收口**（#9 显式豁免 + math chrome 对齐） |
