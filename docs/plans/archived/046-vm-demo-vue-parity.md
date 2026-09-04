---
plan_id: PLAN-046
status: archived
feature_name: VM demo 对齐 vue 版（两栏布局收编 + 平台差异清册）
author: [zhaopuming]
created_at: 2026-09-03
updated_at: 2026-09-04

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components:
  - "P046-1: reports——变更摘要（两栏收编 row/col/flex-1 + PARITY 清册入库 + Layout note 销号；执行期新发现：e2e 定位钩类依赖、auto.exe 旧二进制缺 MCP click、vm-smoke warm-up 滚动收敛 flake、全 suite math 截图 flake——均登记非阻塞）"
  - "P046-2: goals——五验收全达成（VM 两栏等宽截图留档+smoke 0/playwright 73 全过/PARITY 十二项有归宿有证据/Layout note 销号+DEBTS 新行编号无漂移/零 rust 改动双仓核实）；vue 轨零回归证明口径=app.at 唯一消费面 regen 后全量 e2e 绿"
  - "P046-3: architecture——双轨两栏布局机制：row→convert_row/col→convert_column/flex-1→StyleClass::Flex1→width=Fill（iced Row 两 Fill 子元素平分）；vue 轨工具类真 CSS 由 app.at style 块 scoped 兜底定义（demo 无 Tailwind 运行时：package.json/engine style.css/CustomScrollbar 串三证）；autodown 组件臂 class 整串不读（渲染面板 py-4 px-5 缺席→观感族 W2）；left/right 未知 token VM 静默跳过"
  - "P046-4: designs——类映射表契约（div.panels→row{h-full w-full}/section.panel→col{flex-1 min-w-0 overflow-hidden}/.left→border-r/.fill→flex-1 min-h-0 overflow-hidden/.right .fill→+py-4 px-5）；PARITY.md 差异清册格式（项/vue 现状/VM 现状/归宿/证据指针 + 实测类消费清单 + 波次索引 W2-W5）；e2e 定位钩类保留裁定（待澄清④：15 spec 300+ 选择器，Tailwind 类外双轨共存）"
  - "P046-5: tests——vm-two-columns.png 截图口径（单分辨率，待澄清③）；类消费实测方法（class.rs parse_single/iced_adapter 消费臂/组件臂读码 + T2 截图双证）；vue 回归门=regen+playwright 73 全量（复审三跑：两绿+一试合并干扰红作废重跑）；VM 验收门=vm-smoke 9 组退出码 0（复审净窗复跑同绿）；容器编辑面基线 2px 子像素滑移刷新（PIL bbox 实证视觉同帧）"
  - "P046-6: reviews——复审记录（五验收全过逐条证据；试合并冲突面 4 文件全机械=归并语义双取；复审核获 PARITY #4 过时表述修复一处；D1-D3 债候选）"
touched_goals: []

current_step: T5
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
  [✅ 已完成] row{h-full w-full}+两 col{flex-1 min-w-0 overflow-hidden}（左 col 带 border-r）+组件类 fill→flex-1 min-h-0 overflow-hidden（渲染侧+py-4 px-5）；style 块结构段换 scoped 工具类兜底定义（demo 无 Tailwind 运行时，vue 轨真 CSS 由本文件提供）+:deep 去 left/right 锚直挂；left/right 类保留为 e2e 定位钩（15 spec 300+ 选择器消费，计划前提修正→待澄清④）；regen REGEN OK；worktree 提交 + playwright 73/73 全过零回归（套件现值 73）。
  [前置：PLAN-043 折入 master]（已折：a5b184d 在 master）
- T2 净窗 VM 两栏验证：`auto.exe run -r vm` + vm-smoke 退出码 0
  + 两栏截图 `demo/auto/vm-two-columns.png` 留档。
  [✅ 已完成] 净窗（预存 auto.exe 残窗先清）+ vm-smoke 9/9 断言组全过退出码 0（首 attempt 滚动收敛 flake，脚本内建重试一次过=既定 bar）；vm-two-columns.png 留档——两栏等宽、中缝分隔线可见；容器编辑面基线 2px 子像素滑移刷新（视觉同帧）；工具链前置：auto.exe 旧二进制缺 MCP click（044 T6 动作）→ cargo build -p auto 重编至 master 后过。worktree 提交。
- T3 `demo/auto/PARITY.md` 十二项差异清册入库（归宿+证据指针
  +实测 Unsupported 补录）。
  [✅ 已完成] PARITY.md 入库：十二项逐表（归宿：#1 本计划/#2 #3 #8数据面 ✅043 044/#4→045/#5 #8观感→W2(527)/#6→W3/#7→W4/#9→W5/#10 #12 转介/#11 豁免）；类消费清单逐 token（auto-lang class.rs/iced_adapter.rs/aura_view_builder.rs 行号快照+函数锚点）；实测新增记录=autodown 组件臂 class 整串不读（渲染面板 py-4 px-5 缺席→并入 #5 观感族）、未知 token（left/right）静默跳过。worktree 提交。
- T4 README Layout note 销号 + 豁免清单同步 + DEBTS 两新行
  （主题/种子）+ 残留核实结果落行。验证：grep 旧注记零残留。
  [✅ 已完成] README Layout note 改写（两栏收编+兜底新形态+PARITY 指针）+VM track status 增 Two-column layout ✅046 / Theme look 🟡W2 / Initial seed 🟡W3 三行+旧行 PARITY 编号；DEBTS 新增 046 两行（主题观感→527 T8+W2、初始种子→W3）；csb 核实=数据面 043 已销号不新增、thumb 观感并入主题行；grep「stack vertically」零残留（仅计划文件自引）。worktree 提交 e942638。
- T5 双门复跑（vue e2e + vm-smoke 净窗）+ 状态推进
  execution_done。
  [✅ 已完成] 双门复跑全绿：playwright 73/73 退出码 0（1.2m）+ vm-smoke 净窗 9/9 断言组退出码 0（首 attempt 滚动收敛 warm-up flake 两回合同款读数，脚本内建重试 bar 内）；全程零 rust 改动（auto-down 无 rust 面、auto-lang 仅重编二进制至 master 未改源）。全 suite 截图 flake 一例（math-edit-face 被 code-block 区域误捕获）——隔离复跑 0 像素差证实 flake、基线还原，非本计划回归。status→execution_done 交 review。

## 复审记录

- **复审人/时间**：ZCode /auto-plan:review，2026-09-04。
- **基址核实**：worktree `plan-046-dev` 五提交 35016cb/72f3d98/89cd92e/e942638/9bb23ea（末笔=复审修复）；worktree clean。零 rust 改动复核：`git diff master..plan-046-dev --name-only` 零 `.rs`/`crates/`；auto-lang 源零改动（仅 `cargo build -p auto` 重编二进制至 master，T2 工具链前置在案）。
- **验收逐条**：
  1. ✅ VM 两栏等宽截图 + vm-smoke 退出码 0——复审净窗复跑 9/9 组全过退出码 0（warm-up 滚动收敛 flake 第三回合同款读数：首 attempt `left_client 779.2/height 2591/top 0.001` 不收敛→内建重试全过；三回合同模式，预存 flake 特征钉死非本计划回归）；vm-two-columns.png 在册（T2 人工比对：两栏等分+中缝可见）。
  2. ✅ regen 后 playwright 全过——复审全量复跑 73/73 退出码 0（1.1m）。注：复审首跑 4 红系复审自身试合并（`--no-commit` 后 abort）在套件运行期改写服务中文件所致，时序强相关、干净重跑全绿，作废不计。
  3. ✅ PARITY.md 在册——十二项逐项归宿+证据指针抽核通过（vm-block-coverage*.png/vm-drag-*.png/DEBTS 行均在册；PLAN-527 实存 auto-lang `docs/plans/archive/527-vm-tailwind-parity.md`）；T1/T2 实测类消费清单在册（flex-1/min-w-0/overflow-hidden/border-r 等逐 token 到消费臂）。
  4. ✅ README Layout note 销号 + DEBTS 新行——grep「stack vertically」零残留（仅计划文件自引与 PARITY 历史引用）；DEBTS 046 两行在册，编号 046/527/044/045 全实存无漂移（044/045 本仓 archive、527 auto-lang archive）。
  5. ✅ 零 rust 改动（见基址核实）。
- **遗漏/延后/workaround 清查**：遗漏零发现（T1-T5 与 diff 一一对应）；延后仅计划文本预授权的 W2-W5 预留波次（非 silent deferral）；workaround 一处=left/right 定位钩类保留（待澄清④登记+PARITY 实测清单+复审元数据三层在案，非隐藏）。
- **master 漂移与冲突面**：复审窗口期 PLAN-045 折入 master（0a4f584，merge 会话已声明「046 并行会话改动未触碰」）。试合并（--no-commit 后 abort）冲突 4 文件全机械：①app.at=045 的 `table_col_widths`/`oncolresize` props+注释 vs 本计划的 class 行——双取；②README=045 的 Table bullet CONSUMED 段 vs 本计划的 `(PARITY #4)` 指针——双取；③④gen/部署两份 App.vue=同源再生冲突——折后重跑 regen 即平。**归并后必须**：regen 重放 + playwright + vm-smoke（master smoke 已扩第六组表格断言）复跑双门。
- **复审修复**：PARITY #4 归宿「PLAN-045 execution_done 待 review」→「✅已折入+归档」（9bb23ea）。
- **债候选**：D1 vm-smoke warm-up 滚动收敛 flake（净窗首 attempt 三回合必现，重试 bar 内——auto-lang 侧滚动测量首帧 settling 排查候选）；D2 全 suite 并发活动下 screenshot.spec 误捕获 flake（soft-assert+固定 timeout 构造时序敏感，隔离复跑 0 像素差——spec 岔路等待改确定性 wait 候选）；D3 PARITY 证据行号为 auto-lang master 快照值（并行会话活跃漂移，已用函数锚点双标缓解）。
- **裁定**：五验收全过、无阻塞债 → `status: reviewed`，交 /auto-plan:merge（附上方归并语义与折后复跑要求）。

## 待澄清事项

- ①（执行前落定）与 PLAN-043 的折返顺序：043 已折入 master
  （a5b184d，2026-09-03），T1 即基于折后 app.at 开工，默认案成立，
  无 rebase 需求。
- ②（T1/T2 执行中落定，默认案）观感类 VM 轨 Unsupported 契约=保
  style 块 vue 兜底 + PARITY 登记：实测唯一真缺口是 `autodown` 组件
  臂 class 整串不读（渲染面板 py-4 px-5 内边距缺席，PARITY 实测清单
  在册）——并入 #5 观感族转 W2/PLAN-527，不等 527 T3 二次 regen。
- ③（T2 执行中落定）vm-two-columns 截图单分辨率即可：等宽断言由
  截图（两栏等分+中缝可见）+ vm-smoke 结构断言组共同承载，窄窗档
  无新增信息，不采双分辨率。
- ④（T1 执行中落定）变更摘要称自定义类「只被 vue-only 的 style
  块消费」对 e2e 面不成立：`.left`/`.right` 被 15 个 spec 文件 300+
  处选为定位钩，删类直接 67 红。处置：两 col 在 Tailwind 类外保留
  `left`/`right` 锚（VM 轨未知 token 零效果，见 style/class.rs
  parse_single 未知类静默跳过），e2e spec 零改动；`.panel`/`.panels`
  e2e 零消费照计划删。vue 轨工具类真 CSS 由 app.at style 块 scoped
  兜底定义提供（demo 构建无 Tailwind 运行时——package.json 无
  tailwind 依赖，engine style.css 无工具类，CustomScrollbar 的
  tailwind 串同样惰性），即「vue 侧 style 块保留兜底」原则的落实。
