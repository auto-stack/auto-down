---
plan_id: PLAN-046
status: drafting
feature_name: VM demo 对齐 vue 版（两栏布局收编 + 平台差异清册）
author: [zhaopuming]
created_at: 2026-09-03
updated_at: 2026-09-03

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 0
total_steps: 5
---

# [PLAN-046] VM demo 对齐 vue 版（两栏布局 + 差异清册）

## 变更摘要

demo README「Layout note」登记在案的 VM 轨竖排降级（「the two panels
stack vertically instead of the vue flex row (cosmetic v1 divergence)」）
收编：demo 唯一单源 `app.at` 的两栏容器从 web 语义标签
（`div.panels` + style 块 `display:flex`）改为 AutoUI 核心布局标签
**`row` + 两个 `col`（各 `flex-1` 等宽）**——双轨机制现成：

- vue 轨：vue 生成器 tag→tailwind（`ui_gen/style.rs:44-45`，
  row=`flex flex-row`、col=`flex flex-col`），`flex-1` 即 Tailwind
  官方等宽方案；
- VM 轨：`aura_view_builder.rs` 分派 `row`→`convert_row`、
  `col`→`convert_column`，`flex-1` 经 iced_adapter `Flex1→width=Fill`
  （:861-865）真消费，iced Row 两 Fill 子元素天然平分。

随带把两面板的自定义类（`panel left/right`、`fill`——只被
vue-only 的 style 块消费，VM 轨零效果）换成 Tailwind 原生类实现
双轨同源消费。**本计划同时作为「VM demo 对齐 vue 版」伞形计划**：
一揽子调研清册入库（PARITY.md，十二项差异逐项归宿），后续波次
留位（主题/初始种子/编辑器空态等，前置在 auto-lang 侧）。

上游关系：机制深水区（Tailwind 全量覆盖）归 auto-lang
**PLAN-527**；ghost 占位归 PLAN-044、表格列宽归 PLAN-045（均在
案）；本计划只吃本仓 DSL/文档面，**零 rust 改动**。

## 目标

1. VM demo 左右两栏等宽可见（`auto run -r vm` 截图留档）；
   vue 轨零回归（regen + e2e 72 全过）。
2. 两面板样式双轨同源：结构类走 Tailwind 原生类，style 块仅余
   vue 专属增强（:deep 等）。
3. 平台差异清册（PARITY.md）入库：每项差异有明确归宿
   （本计划波次 / PLAN-043/044/045 / auto-lang PLAN-527 / 显式豁免）。
4. README「Layout note」降级注记销号；DEBTS.md 补登记新差异行
   （主题/初始种子）。

## 架构方案

```
app.at view（双轨单源，plan 040）
  div.app
    header.toolbar                    → 不变
    main.workspace
      div.panels                      → row  { class: "h-full w-full" }
        section.panel.left            → col  { class: "flex-1 min-w-0 overflow-hidden" }
          autodown_editor {…}         → 不变（043 已挂 scroll 双臂）
        section.panel.right           → col  { class: "flex-1 min-w-0 overflow-hidden" }
          autodown {…}                → 不变
      div.splitter-hover-zone         → 不变
      CustomScrollbar {…}             → 不变
        │
  vue 轨：tag_to_tailwind（row=flex flex-row / col=flex flex-col）
        + class attr 直传 → 与 scoped style 块并存
        → gen/regen.sh + playwright 72 回归门
  VM 轨："row"→convert_row（aura_view_builder.rs:1327）
        "col"→convert_column（:1304）
        Flex1→width=Fill（iced_adapter.rs:861-865）→ 两 col 等分
```

**类映射表**（style 块现状 → Tailwind 原生）：

| 原（style 块专属）          | 新（Tailwind 原生，双轨消费）                  |
|-----------------------------|------------------------------------------------|
| .panels{display:flex;h/w:100%} | row 标签自带 flex 行 + `h-full w-full`       |
| .panel{flex:1;min-width:0;overflow:hidden} | `flex-1 min-w-0 overflow-hidden` |
| .left{border-right:1px #e5e7eb} | `border-r`（边色 VM 轨若 Unsupported→登记 PARITY，vue 侧 style 块兜底） |
| .fill{flex:1;min-height:0;overflow:hidden} | `flex-1 min-h-0 overflow-hidden` |
| .right .fill{padding:1rem 1.25rem} | `py-4 px-5`                            |

**兜底原则**：T1 仅保证**结构两栏**（row/col/flex-1 为 VM 核心
机制，现状即可用）；观感类个别在 VM 轨 Unsupported 不阻塞——登记
PARITY 表转 auto-lang PLAN-527 补齐，vue 侧 style 块保留兜底。

## 技术栈

- auto-down：`demo/auto/src/front/app.at`（+ regen 产物）、
  `demo/auto/README.md`（Layout note 销号 + 豁免清单同步）、
  `demo/auto/PARITY.md`（新）、`DEBTS.md`（主题/种子两新行）
- 验证链：`bash gen/regen.sh`、`cd autodown/demo && npx playwright
  test`、`auto.exe run -r vm`、`node demo/auto/vm-smoke.mjs`、
  MCP autoui_screenshot
- **零 rust 改动、零 auto-lang 改动**（缺类登记不实现）

## 需求分析与背景调查

（起因：用户实勘 VM demo 截图——只见单栏 scroll probe 内容，
问「最基础的左右两栏都没有」。溯源结论：① VM 轨从无左右两栏，
README Layout note 登记的 v1 降级；② 截图内容是 plan-043-dev
worktree 未提交 vm-smoke.mjs（T6 滚动探针）跑完的残留态。）

- **布局机制实勘**：VM 分派表（aura_view_builder.rs:1304 起）
  中 `div`/`section`/`main`/`header` 全落 `convert_container`
  （垂直容器），仅 `row`/`grid`/`taskbar` 有水平语义；style 块
  编译 vue scoped CSS only（README Layout note 原文在案）。
  041 官方截图 vm-block-coverage.png 即竖排形态——非回归。
- **等宽机制实证**：Flex1→width=Fill 真消费（auto-lang
  iced_adapter.rs:861-865）；vue 生成器 row/col→tailwind flex 类
  （ui_gen/style.rs:44-45）。**两栏方案零新机制**。
- **差异清册十二项**（vue 轨现状 vs VM 轨现状，2026-09-03 实勘）：
  1. 两栏布局（竖排）→ **本计划 T1**；
  2. 滚动同步（scroll_sync 双臂+比例联动）→ PLAN-043 执行中
     （T1-T5 ✅，T6-T8 余）；
  3. ghost 占位块（placeholder_*，streaming 恒 final）→ PLAN-044；
  4. 表格列宽拖拽（ext 桥 useTableColumnResize vs VM 固定布局）
     → PLAN-045；
  5. 主题观感（vue 浅色 toolbar #fff/#111827 vs VM 深色默认主题
     ——截图实证）→ 预留 W2，前置 auto-lang PLAN-527 T8（dark/
     theme）；
  6. 初始文档种子（vue 经 ext `initial_content()` 载 content.ts
     142 行文档 vs VM 桩返回 ""空文档起步+五符号桩告警，DEBTS
     040 行 43 在案）→ 预留 W3，前置 auto-lang 侧 ext 资产机制
     或 DSL 多行字面量（content.ts 头注明言 DSL 无多行模板
     字面量）；
  7. 编辑器空态（placeholder「Start typing...」VM 臂
     `let _ = props.get("placeholder")` 读取后忽略，
     aura_view_builder.rs autodown_editor 臂）→ 预留 W4，前置
     编辑壳空态能力；
  8. CustomScrollbar 观感/拖拽（三测量数据 043 T3 已接；thumb
     观感与拖拽手感残留待 043 T6 后核实）→ T3 核实项；
  9. web-only 块降级（mermaid「web-only」头面板、query「未求值」
     标签、math 包裹——041 coverage2 截图实证）→ 预留 W5 裁定
     （豁免登记 or 补渲染）；
  10. mono CJK tofu（code fence 等宽字体 CJK 豆腐框，041 债候选
      三条之一）→ auto-lang 侧（字体 fallback），清册转介；
  11. ext 桩告警五符号（预期行为，AUTO_VM_EXT_STUBS=0 可复原硬
      错误；DEBTS 040 行 43 已登记）→ 维持豁免，清册记录；
  12. 编辑器编辑面能力差（vue @autodown/engine WYSIWYG 块家族
      vs VM cosmic-text 块编辑壳——台账「块组件契约/WYSIWYG」
      目标族的主战场，非本计划范围）→ 清册转介，长期线。
- **时序硬前置**：PLAN-043 正在 plan-043-dev worktree 执行
  （app.at/vm-smoke.mjs 双双在动，T3/T4 已改 app.at）。本计划
  T1 基于 **PLAN-043 折入 master 之后**的 app.at 开工，避免同文件
  冲突（043 先例同款硬前置写法）。

## 详细设计

1. **T1 app.at 两栏改造 + regen + vue 回归门**：按架构方案类
   映射表改 view 树（div.panels→row、两 section.panel→col、
   Tailwind 原生类、style 块保留 :deep 等 vue 专属段）；跑
   `bash gen/regen.sh` 重生成 App.vue。验证：`cd autodown/demo &&
   npx playwright test` 72 全过零回归（app.at 是唯一 vue 消费面，
   regen 后全绿即双轨不回归证明）。
2. **T2 VM 侧两栏验证 + 留档**：净窗 `auto.exe run -r vm` +
   `node demo/auto/vm-smoke.mjs` 退出码 0（master 版 smoke：编辑
   联动断言组，不依赖 043 未提交的 T6 探针）；MCP
   autoui_screenshot 两栏等宽截图存
   `demo/auto/vm-two-columns.png` 留档（041 双截图口径）。个别
   观感类 VM 侧缺效果 → 记入 T3 的 PARITY 表，不阻塞结构验收。
3. **T3 平台差异清册入库**：新建 `demo/auto/PARITY.md`——需求
   分析十二项差异逐项成表：项/vue 现状/VM 现状/归宿（本计划波次
   W2-W5 / PLAN-043/044/045 / auto-lang PLAN-527 / 显式豁免）/
   证据指针（截图、文件行号、DEBTS 行）；含 T1/T2 实测新增的
   Unsupported 类清单（若有）。
4. **T4 文档收口**：demo/auto/README.md「Layout note」段销号
   改写（两栏已收编 + PARITY.md 指针）、豁免清单同步（主题/种子
   行指向 PARITY.md）；DEBTS.md 新增两行（主题观感差异🟡归
   PLAN-527+W2、初始种子差异🟡归 W3），CustomScrollbar 残留核实
   结果落对应行（若 043 已收口则不新增）。验证：grep 旧
   「stack vertically」注记零残留、DEBTS 新行在册。
5. **T5 收尾复核**：vue e2e + vm-smoke 双门复跑（净窗）；计划
   状态推进 execution_done；spec-impact 留 /auto-plan:review。

**预留波次**（不计入 total_steps；前置满足后经 /auto-plan:work
扩充为原子任务，或折入后继计划）：

- **W2 主题对齐**（前置：auto-lang PLAN-527 T8 dark/theme 机制）
  ——VM 主题态接 demo 观感，浅色两栏。
- **W3 初始文档种子**（前置：auto-lang ext 资产机制或 DSL 多行
  字面量立项）——VM 起步即载 content.ts 同款文档。
- **W4 编辑器空态 placeholder**（前置：编辑壳空态能力）。
- **W5 web-only 块降级裁定**（mermaid/query/math：豁免登记 or
  补渲染，届时按成本定夺）。

## 测试设计

- vue 回归门：`gen/regen.sh` + `npx playwright test` 72 全过
  （app.at 双轨单源，vue 面零行为变化证明）。
- VM 验收门：vm-smoke 退出码 0 + 两栏截图留档（人工比对 +
  snapshot 双 panel 结构断言可并入 smoke 后续波次，本计划以截图
  留档为口径）。
- 清册可核性：PARITY.md 每行带证据指针（文件:行号/截图/DEBTS
  行号），review 时逐行可溯源。

## 验收标准

1. `auto run -r vm` 左右两栏等宽可见，截图 `vm-two-columns.png`
   留档；vm-smoke 退出码 0。
2. regen 后 `npx playwright test` 72 全过零回归。
3. `demo/auto/PARITY.md` 在册：十二项差异逐项有归宿、有证据
   指针；T1/T2 实测 Unsupported 类（若有）在册。
4. README「Layout note」销号；DEBTS 新增行在册且编号指向
   实际计划（046/527/044/045，无编号漂移）。
5. 全程零 rust 改动（auto-down 与 auto-lang 两仓皆然；缺口登记
   不实现）。

## 执行步骤

- T1 app.at 两栏改造（row/col/flex-1 + 类映射表）+ regen。
  验证：`cd autodown/demo && npx playwright test`（72 全过）。
  [前置：PLAN-043 折入 master]
- T2 净窗 VM 两栏验证：`auto.exe run -r vm` + vm-smoke 退出码 0
  + 两栏截图 `demo/auto/vm-two-columns.png` 留档。
- T3 `demo/auto/PARITY.md` 十二项差异清册入库（归宿+证据指针
  +实测 Unsupported 补录）。
- T4 README Layout note 销号 + 豁免清单同步 + DEBTS 两新行
  （主题/种子）+ 残留核实结果落行。验证：grep 旧注记零残留。
- T5 双门复跑（vue e2e + vm-smoke 净窗）+ 状态推进
  execution_done。

## 复审记录

（待执行后填写；/auto-plan:review 补 spec-impact。）

## 待澄清事项

- 与 PLAN-043 的折返顺序：043 折入 master 后本计划 T1 即可开工
  （T2-T5 无冲突可先行）；若 046 先执行则 T1 需 rebase 到 043
  折后的 app.at 上重放——默认取前者。
- 面板边框色/内边距等观感类在 VM 轨的 Unsupported 面实测后定
  契约：保 style 块 vue 兜底 + PARITY 登记（默认案），还是即时
  等 527 T3 补类后二次 regen（波次并入 W2）。
- vm-two-columns 截图是否需要双分辨率（对齐 041 双截图口径的
  宽窗+窄窗）实施时按等宽断言需要定夺。
