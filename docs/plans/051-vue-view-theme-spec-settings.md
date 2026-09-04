---
plan_id: PLAN-051
status: reviewed
feature_name: Vue 轨 view 正确性收口 + view≡stream 自动门 + 主题规约化与双轨 settings
author: [zhaopuming, ZCode]
created_at: 2026-09-04
updated_at: 2026-09-04

supersedes_spec_components:
  - "P047-3: 主题机制扩展——运行时切换器落地（dark_mode 由启动期固定声明变量升级为 settings 面驱动；DEBTS 050 销号）"
  - "P050-3: PARITY 差异清册十六项→十七项（#17 运行时主题切换器+accent 盘 CONSUMED 行；F4 上游回归 051-候选行登记）"
new_spec_components:
  - "P051-规约: auto-lang Design 22 §7 AutoDown 文档面规约章（浅色档逐值盘点零游离+深色档 VM zinc 基准+accent 五色三件套+hljs 双档 hljs_scope_map 单源+排版分叉登记+编辑壳交互面归置）——规约先行/双端投影纪律的成文载体"
  - "P051-架构: 引擎主题声明入口（darkMode/accent props→根 .is-dark+data-accent；缺省档零差异）+accent 双定义收敛单源（双根规则）+is-dark token 层与深色规则组（值逐条对齐 §7 行）"
  - "P051-组件: settings_popover.at 双轨适配件（shadcn token→具体值类+swatch 作用域特异度修正）+native_button 原生逃生名 VM 别名+stream-demo 手写 settings 与深色页 chrome"
  - "P051-机制: fence buffer 运行时重着色（retheme_all_fence_buffers 挂 D-GAP 值变化臂+set_theme 执行臂；ViEditor::update_theme 换档，DEBTS 050 wontfix 前提成立即修）+auto-lang 子→父 emit 三补面（纯 emit 子件派发/引号键归一/幻影载荷裁剪）+app_ext.at Plan 424 纯转发声明（vue 工程发射解锁）"
touched_goals:
  - "P046-2: VM demo 对齐 vue 版——PARITY #17 新增行+F4 候选行，清册十七项"
  - "P047-2: VM demo 观感收尾——主题线延伸至运行时切换（深浅/accent 双轨 settings+fence 重着色），DEBTS 050 销号"
  - "P033-2: BlockWidget 家族机制——主题档经声明入口/家族 chrome 规约行单源，跨模式漂移不回潮"

current_step: 11
total_steps: 11
---

# [PLAN-051] Vue 轨 view 正确性收口 + view≡stream 自动门 + 主题规约化（深浅/accent）与双轨 settings

## 变更摘要

把「vue 轨 view 模式完全正确 + view≡stream 完全一致」从口头目标落成可验收的
工程状态，并补上主题（深浅 × accent 五色）基础设施。核心方法论是**规约先行**：
所有受主题影响的面先在 auto-lang Design 22
（`docs/design/autoui/base-styles-and-visual-parity.md`）落规约行，vue 侧 CSS
与 VM 侧常量都只是规约行的实现投影——杜绝「vue 专属 CSS 注入解决视觉问题」
（PARITY #13 事故模式：VM 不认识 CSS，分叉时无处追因）。

落地物：

1. Design 22 新增 AutoDown 文档面规约章：浅色档逐值盘点（引擎 CSS 现行硬编码
   值入表）+ 深色档（以 VM 现行 zinc 值为基准，VM 零改动）+ accent 五色盘
   （accent/strong/soft 三件套 ×5）+ hljs 语法色双档配对行。
2. 引擎组件新增主题声明入口（`darkMode`/`accent` props，默认=现状浅色 indigo，
   零回归），主题选择成为视图树里两轨都看得见的声明，而非 vue 环境里无源的
   CSS 事实。
3. demo 双轨 settings：`settings_popover.at`（参照
   `auto-lang/examples/ui/common/settings/settings_popover.at`）适配进
   `demo/auto/src/front/`，一份 DSL 喂 vue/VM 两轨；`dark_mode` 状态已在
   （app.at:147），新增 `accent_color`。
4. stream-demo 手写轻量 settings（它在 .at 闭环外）+ **view≡stream 落定对拍
   自动化**（playwright 双主题断言零差异——现状只有手动「对比」按钮，
   package.json 无任何测试脚本）。
5. DEBTS 050（VM fence buffer hljs 主题构建期选定，运行时翻转不重刷）被本计划
   的运行时切换器激活：裁定并处置（实现重着色或显式豁免行）。

显式出域（另行立项）：demo 三模式开关（edit/view/stream 任意并排，默认布局
不变约束本计划钉死）；统一滚动条 widget（PARITY #8 thumb 残段）；VM 侧 document
accent 的 iced 主题接线（本计划豁免行）；PARITY #10 mono CJK tofu（auto-lang
既有债）。

## 目标

- **F1 规约化基座**：引擎渲染面全部硬编码样式值有 Design 22 规约行出处，每行
  带 vue 实现锚点 + VM 实现锚点；引擎内 `--ad-accent*` 双定义
  （`.autodown-editor` 与 `.streaming-document` 各一份，同值 indigo）收敛为
  单源。
- **F2 view≡stream 自动门**：stream-demo 对拍（DOM 指纹 + 计算样式全量比对）
  进 e2e，浅/深两档 × 默认 accent（+深档一非默认 accent 抽查）断言零差异，
  `pnpm -C stream-demo test` exit 0。
- **F3 引擎主题声明入口**：`StreamingRenderer`/`EngineEditor`（经
  `autodown`/`autodown_editor` 标签）接受 `dark_mode`/`accent` 声明，默认档
  行为与现状逐像素等价（既有 vitest + demo playwright 基线 73 全绿零回归）。
- **F4 双轨 settings**：demo vue 轨 popover 实机可切深浅/accent 并作用于两侧
  面板；VM 轨 popover 原生渲染、`dark_mode` 翻转驱动既有 D-GAP 链路。
- **F5 DEBTS 050 处置**：VM fence buffer 运行时重着色实现落地，或 PARITY 显式
  豁免行 + wontfix 复评注记，二选一在案。
- **F6 默认布局与平价锚零扰动**：demo 默认 edit+view 布局不变，vm-smoke 11/11
  全绿，PARITY/README/DEBTS 按实况收口。

## 架构方案

### 四层纪律（本计划的真值流）

1. **语义层（DSL 状态）**：`dark_mode`（已有，app.at:147）/`accent_color`
   （新增）——VM 轨经 Plan 370 D-GAP 同步消费 dark_mode；vue 轨经绑定消费两者。
2. **声明层（视图树）**：app 级 chrome 用条件 class 串（`style: if .dark_mode
   { "bg-zinc-900 ..." } else { ... }`，settings_popover.at 已示范）；引擎组件
   经标签 props 声明（`dark_mode: .dark_mode`、`accent: .accent_color`）——
   「引擎该渲染哪一档」对两轨可见。vue 轨消费**不是** CSS 感知 `.dark` 祖先类，
   而是 prop 驱动组件内部选档。
3. **规约层（Design 22）**：每个受主题影响的面的取值先落规约行（格式照 §4.6：
   规约值 + Vue 实现锚点 + VM 实现锚点），深色档以 VM 现行 zinc 值为基准
   （`FENCE_CHROME` 暗档、iced 原生 zinc 系），vue 向其对齐——VM 侧浅色档已由
   PLAN-050 `FENCE_CHROME_LIGHT` 逐值对齐过 vue 实值，深色档反向同源。
4. **实现层（双端投影）**：引擎 CSS 按 prop 选档（内部用 `.is-dark` 修饰类 +
   accent data-attr / CSS 变量均可，属实现自由，**取值必须逐条对齐规约行**）；
   VM 侧 `family_of` 常量双档（已有）+ `hljs_scope_map.rs` 镜像锚（P041-4）
   补深色档。

流程纪律：任何平价相关值改动，**先加/改规约行，再动两侧实现，同一计划内
完成，PARITY 留证据行**。单侧先动 CSS 视为违规。

### 结构裁定（沿袭会话决议）

- **demo 与 stream-demo 保持分立**：demo 是 VM 平价锚 + 人看的 playground
  （PARITY 表、vm-smoke 分组断言、证据 PNG 都挂在其默认布局上）；stream-demo
  是测试仪器（单一变量隔离：同一 StreamingRenderer 两实例，`streaming=false`
  vs feed 驱动；waitSettled 落定检测；DOM 指纹全量比对——edit 面与 render 面
  DOM 合法不同，该对拍逻辑不可跨模式泛化，故不并入统一 demo）。
- **demo 默认布局不变**：edit+view 两栏照旧，settings 为工具栏增量；三模式
  任意组合开关后续立项，本计划只铺 props/状态地基。

### 双仓落点

- auto-down：`packages/engine`（props/CSS/hljs 深色组/vitest）、`demo/auto`
  （settings_popover.at、app.at 接线）、`stream-demo`（settings + e2e）。
- auto-lang：Design 22 规约章（文档）、`aura_view_builder.rs` 组件臂 prop
  处置、`autodown_editor/core.rs`（DEBTS 050 buffer 重着色，若裁定实现）、
  `hljs_scope_map.rs` 深色档。auto-lang 侧改动按 Plan 529 worktree 惯例
  （`.wt/auto-lang-051/auto-lang`）先行折入其 master（PLAN-050 先例）。

### 关键适配点

- `settings_popover.at` 原文用 shadcn token 类（`bg-card`/`border-border`/
  `text-muted-foreground`/`bg-primary` 等）——demo 无 tailwind/shadcn 运行时
  （style 块兜底只定义 plain 工具类），VM 侧 token 解析口径另立。适配时全部
  改写为具体值类（zinc/indigo 系），两轨同串。
- 引擎 hljs 色值现状为 `autodown-editor.css` 手写 `.hljs-*` 规则组（浅色），
  无外挂主题 CSS；深色配对=同选择器组加 `.is-dark` 作用域深色规则组，值对齐
  VM syntect 暗主题映射（`hljs_scope_map.rs` 镜像锚）。
- DSL bool prop 传递可行（README gotcha 12：`streaming: false` 先例）；绑定
  传值照 `content: .content` 先例。

### 执行/验证两阶段协议（模型分工）

本计划全部正确性门为**程序门**（vitest 计算样式断言 / playwright DOM 断言 /
view≡stream DOM 指纹对拍 / vm-smoke / cargo test / grep 盘点），旗舰验收
A2 零视觉判读。据此分两阶段：

- **Phase 1 实现+采集**（非多模态强模型可全担）：T1-T11 含**脚本化**截图
  采集（vue 侧 `page.screenshot()`、VM 侧 AutoUI MCP `autoui_screenshot`
  通道）——采集是机械落盘，不需判读；execution_done 时 PNG 证据齐，PARITY
  证据指针不断链。
- **Phase 2 判读+验收**（多模态模型）：对已采集 PNG 逐张目检（A1-A7 目检
  项）+ 实机把玩（深浅/accent 切换手感）；对拍台判读面=「零差异」报告文本，
  非图像。
- **缺陷回流协议**：Phase 2 发现的视觉缺陷先转写为失败程序化断言
  （playwright/vitest 可表达），回流 Phase 1 模型修复；Flash 不做无断言
  陪跑的实现改动。深色档取值调整一律走规约行改值（待澄清 4 口径）。

## 技术栈

- vue 轨：Vue 3 SFC（引擎 `packages/engine`，vitest）、Vite、playwright。
- DSL/编译：Auto widget DSL（`auto.exe build/run`，regen 链
  `demo/auto/gen/regen.sh`）。
- VM 轨：auto-lang（iced + cosmic-text + syntect），AutoUI MCP 通道
  （`vm-smoke.mjs`）。
- 规约载体：auto-lang Design 22 markdown 表格。

## 需求分析与背景调查（spec 总览对位）

- 平价线目标族在案：P046-2（VM demo 对齐 vue 版 + PARITY 清册）、P047-2
  （主题对齐+种子）、P048-2（编辑行为收尾+W4 空态+W5 豁免裁定）、P050-2
  （代码块与行内渲染对齐）——本计划是其「vue 侧正确性 + 主题基础设施」的
  正向延伸：先前各波次以 vue 实值为靶，本计划把靶子本身成文为规约行。
- P033-2（BlockWidget 家族：一 kind 一个三模式 widget，view/stream/edit 同
  chrome）——accent/深浅选档必须进家族 widget 的 `mode` 机制而不是旁路覆写，
  防跨模式漂移回潮。
- 实勘事实（2026-09-04）：
  - 引擎 CSS 全库 `.dark`/`data-theme` 0 命中——深色档为全新面，无既有暗档
    可依赖；`--ad-accent*` 双定义（autodown-editor.css:6-8 与
    StreamingRenderer.vue:428-430，同值 indigo）。
  - `EngineEditor.vue`/`StreamingRenderer.vue` 现无任何 theme prop（props 面
    仅 source/streaming/placeholderBlockId/placeholderHeight/scrollSync）。
  - `dark_mode` 状态已在 app.at:147（VM 轨 D-GAP 消费，vue 轨不消费）。
  - stream-demo 无测试脚本（package.json 仅 dev/build/preview），对拍只有
    App.vue 手动「对比」按钮（comparePanes + waitSettled 已实现，可直接
    程序化复用）。
  - demo 基线：playwright 73/73；vm-smoke 11/11；engine vitest（`vitest run`）。
  - DEBTS.md 050 行：fence buffer hljs 主题构建期选定，运行时翻转不重刷，
    wontfix 前提「直到运行时主题切换器存在」——本计划 F5 即该前提成立点。
  - Design 22 §4.5/§4.6 已示范「CSS 不可表达处的默认样式规约 + 双端锚点」
    模式（auto-musk PLAN-054/056 的 `.dark` 对拍先例）。

## 详细设计

### 1. Design 22 新章：AutoDown Document Face 规约（浅色档盘点）

新增小节（编号顺延，建议 §7；§4.7/§4.6 先例为 markdown 渲染器域，本节为
autodown 引擎域）。入表来源=引擎渲染面全部硬编码样式值，逐值登记：

- 面板/容器：`.code-block-container` 族（#f9fafb 容器/#e5e7eb 边与 header/
  #374151 标签——PARITY #13 已镜像的浅色实值）、admonition/callout、details、
  blockquote（#e5e7eb 边）、表格、行内 code。
- 文字：正文/标题（--ad-accent-strong 赋色段）/muted 系。
- accent 三件套：--ad-accent #4f46e5 / --ad-accent-strong #4338ca /
  --ad-accent-soft #eef2ff（含双定义收敛后的单源声明）。
- hljs 浅色规则组（.hljs-keyword/.hljs-string/… 选择器组 → 色值）。
- 块间节奏引用 §4.5（12px，不重复立行）。

每行格式：`面 | 浅色值（tailwind 等价类或 hex）| Vue 锚点（文件:选择器）|
VM 锚点（autodown_blocks.rs 常量 / hljs_scope_map 映射）`。

### 2. 深色档 + accent 盘 + hljs 配对行

- 深色档基准：VM 现行 zinc 值（`FENCE_CHROME` 暗档、iced 原生 zinc 深盘）
  为规约值，vue 实现对齐——VM 零改动、vue 补实现，与 PLAN-050 浅色档方向
  互为镜像。vue 侧无既有暗档，无历史包袱。
- accent 五色盘：indigo（现行值）/coral/ocean/sage/amber，每色定义
  (accent, accent-strong, accent-soft) 三件套 hex 值（swatch 展示色照
  settings_popover.at 的 rose/sky/emerald/amber-500 口径，document 取值
  新定入表）。深浅两档共用 accent 主值，soft 档深色下允许入表变体。
- hljs 深色组：选择器组同浅色、值对齐 VM syntect 暗主题（hljs_scope_map.rs
  反向锚定）。
- 标题色深色档：accent-strong 在深底的可读性变体（如需提亮，入表新值而非
  实现侧临场调）。

### 3. 引擎 accent 双定义收敛

`.autodown-editor` 与 `.streaming-document` 的 `--ad-accent*` 收敛为单源
（引擎级共享 token 定义，组件根挂载/引入），两侧选择器消费同名变量。收敛后
grep 断言定义处唯一（vitest 或 build 后置断言）。

### 4. 引擎主题声明入口（props）

- `StreamingRenderer.vue` / `EngineEditor.vue`（及家族 widget 面板挂载路径
  `block-widget.ts`/`block-widget-panels.ts` 经由其容器传递）新增：
  - `darkMode?: boolean = false`
  - `accent?: 'indigo'|'coral'|'ocean'|'sage'|'amber' = 'indigo'`
- 组件根节点按 prop 挂 `.is-dark` 修饰类与 `data-accent="<name>"`；CSS 内
  `[data-accent='coral'] { --ad-accent: … }` 覆盖组 + `.is-dark` 深色规则组
  （含 hljs 深色组）。默认档（false/indigo）渲染结果与现状逐像素等价。
- vitest 新增：prop 切换断言（根类/data-attr 在场 + 深色规则作用域内取样
  一处计算色）。

### 5. app.at 声明式接线

- `var accent_color str = "indigo"` 入 model。
- `autodown` / `autodown_editor` 标签加 `dark_mode: .dark_mode`、
  `accent: .accent_color` 绑定。
- 工具栏/面板 chrome 条件 class 串（浅/深两串具体值类，入 style 块兜底
  定义）。
- VM 臂处置（auto-lang）：组件臂读到 props 后映射到既有全局链路
  （dark_mode 与 D-GAP 同源；accent 本计划 VM 侧不消费 document 值——
  PARITY 豁免行，popover swatch 本身两轨原生渲染）。

### 6. settings_popover.at 适配（demo 双轨）

- 新文件 `demo/auto/src/front/settings_popover.at`（源：auto-lang
  `examples/ui/common/settings/settings_popover.at`），shadcn token 类全部
  改写为具体值类；msg 契约不变（Close/ToggleDarkMode/SetTheme/SetAccent）。
- app.at 工具栏加 ⚙ 触发钮 + popover 挂载 + msg 接线：
  `SetTheme("dark") -> .dark_mode = true` 等。
- regen 后 vue 轨生效；`auto.exe src/front/settings_popover.at` 语法检查；
  VM 轨原生渲染实证。

### 7. stream-demo 手写 settings + 对拍 e2e

- App.vue 工具栏加轻量切换（深浅 toggle + 5 accent swatch，本地 ref 状态），
  两栏 StreamingRenderer 同 props；wrapper 无关 class 不入对拍面。
- 新增 playwright：`stream-demo/playwright.config.ts` +
  `stream-demo/e2e/view-stream-parity.spec.ts`：load → `feed.finish()` →
  waitSettled → comparePanes 复用 → 断言 diffs.length === 0；跑
  (light, dark) × indigo + dark × coral 三组。
- `stream-demo/package.json` 加 `"test": "playwright test"` 与 devDeps。

### 8. DEBTS 050 裁定与处置（VM fence buffer 重着色）

- 姿态：默认实现——`set_dark_mode` 翻转时既有 fence buffer 重跑 syntect
  着色（core.rs buffer 层，D-GAP 值变化已标 view_dirty，缺 buffer 重高亮
  一步）；成本超限（>1 人日）则转显式豁免：PARITY 新行「VM 深色档 fence
  高亮停留构建期主题」+ DEBTS 050 行复评注记，vue 侧完整性不受影响。
- 两分支都有落点与验证，不允许悬置。

### 9. 收口：PARITY / README / DEBTS

- PARITY.md：新增行（accent document 值 vue-only 消费豁免；DEBTS 050 处置
  结果行；深色档 vue/VM 对齐状态行）+ 证据 PNG（vue 浅/深、VM 浅/深切换
  截图）。
- README（demo/auto）：settings 双轨用法段 + 「settings_popover.at 适配」
  条目。
- DEBTS.md：050 行按处置结果销号或复评注记。

## 测试设计

- 引擎单测（vitest，`packages/engine`）：props 默认档等价（现有测试零改动
  全绿即证）；prop 切换断言（.is-dark/data-accent + 计算色取样）；accent
  双定义收敛 grep 断言。
- stream-demo e2e（新增）：view≡stream 三组（light/dark × indigo +
  dark × coral）零差异断言，`pnpm -C stream-demo test` exit 0。
- demo e2e（playwright 基线 73）：regen 后全量复跑零回归；可加 settings
  切换冒烟（popover 开合 + 根类翻转）1 条。
- VM 轨：vm-smoke 11/11（默认布局不变）；实机深浅切换截图留档
  （vm-051-dark.png / vm-051-light.png）；DEBTS 050 若实现，加重着色前后
  buffer 截图对照。
- 规约表一致性人工核：Design 22 新章每行两侧锚点可点开定位（review 阶段
  逐行核）。

## 验收标准

- [x] A1 Design 22 新章在案：浅色盘点行齐（引擎 CSS 硬编码值全部入表，无
      游离值）、深色档行齐（VM zinc 基准）、accent 五色三件套行齐、hljs 双档
      行齐；每行双端锚点。
- [x] A2 `pnpm -C stream-demo test` exit 0，三组对拍零差异断言在案；对拍
      暴露的差异已修或在案登记根因。
- [x] A3 引擎 props 落地：默认档 vitest+playwright 基线零回归；切换断言
      测试绿。
- [x] A4 demo settings 双轨：vue 轨实机切换浅/深 + 5 accent 截图留档；VM 轨
      popover 原生渲染 + dark_mode 翻转窗口生效（或 DEBTS 050 豁免行在案）。
- [x] A5 regen 后 demo playwright 全绿（≥基线 73）；engine vitest 全绿；
      vm-smoke 11/11。
- [x] A6 PARITY/README/DEBTS 收口：新行/销行/注记按实况齐；证据 PNG 入
      demo/auto。
- [x] A7 默认布局零扰动：app.at 默认态（dark_mode=false, accent=indigo,
      edit+view 两栏）与 PLAN-050 终态截图 diff 一致（settings 入口为工具栏
      增量，不移动既有元素）。

## 执行步骤

> 纪律：T1/T2（规约行）先行，任何实现任务不得先于其对应规约行落表。auto-lang
> 侧改动在 `.wt/auto-lang-051/` worktree 进行（Plan 529 布局），折入其 master
> 后 auto-down 侧方可引用新臂行为。
> 两阶段协议见架构方案末节：本节 T1-T11 全部属 Phase 1（实现+脚本化采集，
> 各任务中的「截图」均为机械落盘，判读统一在 Phase 2 验收）。

- **T1 浅色档规约盘点落表** [✅ 已完成] Design 22 §7 章落地（auto-lang worktree commit 557578dc3）：§7.1 中性板/§7.3 排版+heading 三方分叉登记/§7.4 块家族浅色行；程序化零游离核对全引擎源（editor css 34 去重值/renderer 33/widget 散值 6/mermaid 参数 5 全收，`comm` 比对 ZERO STRAY ✓）。
  操作：盘点 `packages/engine/src/editor/styles/autodown-editor.css` 与
  `packages/engine/src/render/StreamingRenderer.vue`（scoped 段）及家族
  widget 面板类串的全部硬编码样式值，写入
  `D:/autostack/auto-lang/docs/design/autoui/base-styles-and-visual-parity.md`
  新章浅色行（格式见详细设计 §1）。
  验证：`grep -cE '#[0-9a-fA-F]{3,8}' autodown-editor.css` 计数与表中浅色
  行覆盖面人工核对零游离（review 清单项）。

- **T2 深色档 + accent 盘 + hljs 配对行落表** [✅ 已完成] 同章 §7.2 accent 五色盘（600/700/50 步进+深档 400/15% 口径）/§7.4 深色列（VM zinc 基准，VM 零改动）/§7.5 hljs 双档表（hljs_scope_map 生成物单源；light 与 vue CSS 逐值同、dark=github-dark）——实测确认生成物 rust 表已是双轨单源，vue 深色规则组取值有锚。
  操作：同文件补深色行（VM `FENCE_CHROME` 暗档/zinc 系为基准值）、accent
  五色三件套表、hljs 双档选择器组表（VM 锚点
  `crates/auto-lang/src/ui/hljs_scope_map.rs`）。
  验证：行数与设计 §2 清单一致；每行双锚点非空。

- **T3 引擎 accent 双定义收敛** [✅ 已完成] 双根单源规则（`.autodown-editor,.streaming-document`，autodown-editor.css，style.css 出口全员载入）+ StreamingRenderer 副本退役 + vitest 单源断言三连；TDD 红→绿；引擎全量 779/779 绿（plan-051-dev 提交在案）。
  操作：`packages/engine` 内 `--ad-accent*` 定义收敛单源（共享 token 定义，
  `.autodown-editor`/`.streaming-document` 消费），新增 grep 断言脚本或
  vitest 用例钉死定义处唯一。
  文件：`src/editor/styles/autodown-editor.css`、
  `src/render/StreamingRenderer.vue`、（如需）新增 token css。
  验证：`pnpm -C packages/engine test` 全绿（.at worktree 外先行，纯引擎内）。

- **T4 引擎主题 props + 深色/accent 规则组** [✅ 已完成] plan-051-dev 766e1c8：双组件 props（默认档零差异）+ 根 .is-dark/data-accent + token 层（五 accent 组+is-dark 档）+ 深/hljs 规则块双侧 + 16 处等值 var 化；TDD 红→绿（theme-props 7 用例）；引擎全量 786/786 绿；lint 报缺失为环境既有（主 checkout 同状，非本次引入）。
  操作：`StreamingRenderer.vue`/`EngineEditor.vue` 新增 `darkMode`/`accent`
  props（默认 false/'indigo'），根挂 `.is-dark`+`data-accent`；CSS 按 T1/T2
  规约值加覆盖组与深色组（含 hljs 深色规则组）；家族 widget 面板路径传递。
  vitest：默认档零变化 + 切换断言两用例。
  文件：上述两组件 + `autodown-editor.css` + `block-widget(-panels).ts`。
  验证：`pnpm -C packages/engine test` 全绿。

- **T5 app.at 声明式接线 + regen** [✅ 已完成] 前置 auto-lang codegen（schema.rs 双元素 dark_mode/accent PropDef + vue.rs 两臂 :dark-mode/:accent 发射 + 模块内 codegen 双测试，auto-down-dev 提交）；auto.exe worktree 构建（1m46s）→ 语法检查（VM 实跑路径）→ regen REGEN OK → 生成物三要素实证 → **playwright 73/73（1.2m）零回归**。注记：S001 INFO（aura.at 运行时 schema 未声明新 props）与 scroll_top/table_col_widths 同款多年容忍模式；use-block Error（app_ext.at）为较新编译器诊断、exit 0 不阻门、initial_content 链路完好。
  操作：`demo/auto/src/front/app.at`——model 加 `var accent_color str =
  "indigo"`；`autodown`/`autodown_editor` 标签加 `dark_mode:`/`accent:` 绑定；
  工具栏/面板 chrome 条件 class 串 + style 块兜底定义。
  验证：`D:/autostack/auto-lang/target/debug/auto.exe src/front/app.at` 无
  parse error；`bash gen/regen.sh` 全绿；`npx playwright test`（demo 目录）
  基线全绿。

- **T6 settings_popover.at 适配 + 双轨挂载** [✅ 已完成] 兄弟件落地（具体值类改写+组件自带 scoped 兜底+深浅条件串）+ app.at ⚙ 触发/挂载/四 msg 回路；执行中发现并修复两项管线障碍：① app_ext.at 空锚点被新 auto-man Plan 424 校验拒绝（vue 工程发射中断、**vue-tsc 门自 T5 起被静默跳过**——补纯转发声明解锁，全门恢复真跑）② DSL button→shadcn Button 拖 reka-ui 依赖——改 native_button 原生逃生名+auto-lang VM 臂别名（零新 npm 依赖）；settings-theme 冒烟 spec 绿 + 三证据 PNG（vue-051-light/dark/accent-coral）；**全量 playwright 74/74**（基线 73+1）+ demo vite build 过。
  操作：新建 `demo/auto/src/front/settings_popover.at`（shadcn token 类改写
  具体值类），app.at 工具栏 ⚙ 钮 + popover + msg 接线（SetTheme/SetAccent →
  `.dark_mode`/`.accent_color`）。
  验证：`auto.exe src/front/settings_popover.at` 语法过；regen + playwright
  全绿；playwright 驱动浅/深/accent 切换并 `page.screenshot()` 采集
  vue-051-light/dark/accent-*.png（机械采集，判读在 Phase 2）。

- **T7 stream-demo 手写 settings** [✅ 已完成] 工具栏深浅 toggle + 五色 swatch（声明入口=引擎 props 同口径，swatch 色=§7.2 盘），两栏 StreamingRenderer 同 props；vue-tsc/vite build 过。
  操作：`stream-demo/src/App.vue` 工具栏加深浅 toggle + 5 swatch（本地 ref），
  两栏 StreamingRenderer 绑 props。
  验证：`pnpm -C stream-demo dev` 手动实证两栏联动（prop 翻转可经 T8 e2e
  程序断言）；playwright 采集 stream-051-dark.png（机械采集）。

- **T8 view≡stream 对拍 e2e** [✅ 已完成] playwright.config（端口 5288 可让位）+ 三组用例驱动既有「对比」按钮断言「零差异」；`pnpm -C stream-demo test` exit 0，**三组首跑全绿**。
  操作：`stream-demo/playwright.config.ts` +
  `stream-demo/e2e/view-stream-parity.spec.ts`。对拍载体=驱动 App **既有**
  「对比」按钮（其 compare() 已内含 waitSettled 落定检测；comparePanes 是
  浏览器上下文模块，测试侧不直接 import）：点击 finish→等 done→点击
  对比→断言 `.stream-demo__diff-report` 文本以「零差异」开头；经 T7 settings
  UI 切主题，跑 light/dark × indigo + dark × coral 三组。package.json 加
  test script + devDeps。
  验证：`pnpm -C stream-demo test` exit 0。

- **T9 对拍暴露差异修复（条件任务）** [✅ 已完成] 首跑即零差异（三组 6.2s 全绿），无差异可修——证据：`pnpm -C stream-demo test` 输出 3 passed；深色/accent 档两栏消费对称性（.is-dark/data-accent 双根断言）同 spec 内钉住。
  操作：若 T8 非全绿，按 diff 根因修（限 view/stream 落定路径；edit 面不
  涉）；若全绿，在复审记录登记「首跑即零差异」证据。
  验证：复跑 `pnpm -C stream-demo test` exit 0。

- **T10 DEBTS 050 裁定与处置（auto-lang worktree）** [✅ 已完成] **实现分支**（成本远低于 1 人日线）：`retheme_all_fence_buffers`（core.rs 注册表遍历 + fence 叶 `ViEditor::update_theme`）挂 renderer 两翻转臂（D-GAP 值变化臂 + Plan 518 set_theme 执行臂）；core 层测试 `fence_buffer_rethemes_on_runtime_flip` 钉死基色前景双向翻转；模块 62/62 绿（auto-down-dev 提交在案）。
  操作：`.wt/auto-lang-051/`——`set_dark_mode` 翻转时 fence buffer 重着色
  （`crates/auto-lang/src/ui/autodown_editor/core.rs` buffer 层）实现并加
  测试；或成本超限转 PARITY 豁免行 + DEBTS 050 复评注记。
  验证：实现分支=`cargo test -p auto-lang`（相关用例）绿 + buffer 主题翻转
  的 core 层断言（程序门）+ MCP `autoui_screenshot` 采集深浅切换前后
  fence 对照图（机械采集，判读在 Phase 2）；豁免分支=PARITY/DEBTS 行在案。

- **T11 VM 实机验证 + 清册收口** [✅ 已完成] 实机全链路 PASS（vm-051-settings.mjs：⚙→popover 渲染→Dark→dark_mode=true→✕ 关闭→Light 回浅，程序门断言 + vm-051-light/dark.png 机械采集）；**打通依赖 auto-lang 子→父 emit 三补面**（纯 emit 子件 HandlerNotFound 后声明式路由照派 / Plan-367 引号键 `on"SetTheme"` 剥引号归一 / 零参父 handler 幻影载荷裁剪——实测根因链三连，CustomScrollbar 同病同治）；vm-smoke **11/11** 复绿（终态二进制）；PARITY 十六→十七项（#17 CONSUMED）+ DEBTS 050 销号 + README settings 段；两仓工作树提交齐（auto-down-dev / plan-051-dev）。
  操作：`auto.exe run -r vm` 实机——popover 原生渲染、dark_mode 翻转窗口
  生效、（T10 实现分支）fence 跟随；`node vm-smoke.mjs` 11/11；MCP
  `autoui_screenshot` 采集 vm-051-light/dark.png（机械采集）；PARITY.md
  新行/销行 + 证据 PNG 指针；demo/auto README settings 段；DEBTS.md 050 行
  终态。
  验证：vm-smoke exit 0；三文档 diff 人工核（review 清单项）；Phase 2 对
  采集 PNG 逐张判读。

## 复审记录

- **复审人/时**：ZCode（GLM-5.3-Flash，多模态判读档）/ 2026-09-04。
- **方法**：程序门全部在执行工作树重跑（不信勾选）；六张证据 PNG 逐张
  视觉判读（两阶段协议 Phase 2）；auto-lang 侧按 §6.4 跑全量门
  （tf + tv，本计划触及 VM 文件）。

### A1-A7 逐条复验

| 项 | 判 | 证据 |
| :-- | :- | :-- |
| A1 规约章 | ✅ | Design 22 §7 落地（557578dc3）；零游离程序核对重跑 ✓（全引擎源 hex 对表）；§7.5 hljs 双档实测与 hljs_scope_map 生成物逐值同源 |
| A2 stream-demo 门 | ✅ | `pnpm -C stream-demo test` 复跑 3/3（**复审期重跑仍零差异**）；修 F1 后复采 stream-051-dark.png 判读可读 |
| A3 引擎 props | ✅ | 默认档等价（786/786 含 pre-051 基线用例全绿）+ 切换断言 7 用例绿 |
| A4 双轨 settings | ✅（修后） | 判读首刷发现 F2（swatch 全透明——`.settings-popover button` 重置 (0,2,1) 压过裸 bg-* 类 (0,2,0)）与 F1（stream-demo 深档页 chrome 未 themed=白字白底）；修后复判 PASS（swatch 五色可见/stream 深页可读）；coral link 计算色探针 rgb(225,29,72) ✓（首刷误读排除） |
| A5 全量门 | ✅（修后） | 引擎 vitest 786/786；demo playwright 74/74（复跑）；vm-smoke 11/11；auto-lang **tf**：复审抓获 `test_a2vue_markdown` 新增红（T5 缺省 `:dark-mode="false"` 契约未同步 golden）→ 修后复跑失败集≡master 既有两红基线（schema_drift_fence+kitchen_sink，050 复审在案）；**tv 3571/3571 全绿** |
| A6 清册收口 | ✅ | PARITY 十七项+DEBTS 050 销号+README 段（执行期提交）；复审增补 051-候选行（F4） |
| A7 默认布局零扰动 | ✅ | settings 为工具栏增量（⚙ 钮+关态零渲染）；demo 74/74 含 73 条既有断言零改动全绿 |

### 遗漏/延后/workaround 清查

- **F4（债候选，非 051 阻塞）**：VM 浅色档 view 臂深色 chrome（fence 深盘
  +标题深条，编辑臂全浅）。master 二进制 A/B 实证**上游既有**（b1a08dd28
  线同分叉；050 证档时点正常→回归落在 050 后的 master 并行合并窗口）。
  已登记 DEBTS 051-候选行（🟡），建议独立排查（嫌疑：read 臂 view 树/
  缓存主题档解析）。051 未触及 read-arm 主题路径；T10 retheme 钩子在翻转
  时会顺带覆盖 view fence buffer。
- **F-fix 三件均为复审期当场修复**（golden/swatch 特异度/stream 深页），
  修复后对应门全绿+图复判 PASS——无遗留 workaround。
- **延后项**：无新增（三模式开关/统一滚动条/VM document accent 均为立项
  时既定出域，待澄清 1-3 在案）。
- **已知容忍**：S001 INFO（aura.at 未声明新 props，scroll_top 同款）；
  engine eslint 配置缺失（环境既有）；stream-demo 深档表格单元格对比度
  偏弱（判读记录，文档内容 chrome 打磨项，不阻塞）。

### 结论

**PASS → `status: reviewed`**。spec-impact 元数据已填（supersedes
P047-3/P050-3；new P051 规约/架构/组件/机制四条；touched P046-2/P047-2/
P033-2）。证据八件（vue-051×3 + stream-051 + vm-051×2 + 探针截图×2 于
tmp）齐备。交 /auto-plan:merge。

### 附：执行侧随记（执行阶段留档，复审已核）

- **T1/T2**：Design 22 §7 章约 130 行（auto-lang 557578dc3）；零游离程序核对
  全引擎源 ✓（含家族 widget 散值 6 + mermaid 参数 5）；实测发现
  hljs_scope_map 生成物已是双轨单源（light 与 vue CSS 逐值同、dark=
  github-dark）。
- **T4**：hljs 深色规则组两侧（editor css + renderer scoped）取值自生成物
  rust 表（§7.5 行），非手拍。
- **T6 执行中发现并修复三项管线障碍**（超出计划预判，均为打通必需）：
  ① app_ext.at 空锚点被新 auto-man Plan 424 校验拒绝——vue 工程发射中断、
  **vue-tsc 门自 T5 起被静默跳过**（regen 假绿）；补纯转发声明后全门真跑。
  ② DSL `button`→shadcn `<Button>` 拖 reka-ui/cn 依赖链（demo 零 shadcn
  运行时姿态）——`shadcn: off` 连引擎组件映射一起关（过钝）；定案
  `native_button` 原生逃生名 + auto-lang VM 臂 3 行别名。
  ③ regen.sh 部署段补 SettingsPopover.vue。
- **T11 执行中发现 auto-lang 子→父 emit 三断点**（settings 弹层 VM 打通
  的实测根因链）：纯 emit 子件（msg 无自有 handler）HandlerNotFound 后
  声明式父路由不派发；Plan-367 引号式监听键 `on"SetTheme"` 原样注册查表
  miss；零参父 handler 幻影 Nil 载荷 B12(b) 帧移崩。三补面落
  auto-down-dev（dynamic.rs ×2 + aura_view_builder.rs 键归一），VM 实机
  全链路 PASS + smoke 11/11 复绿。
- **门读数汇总**：engine vitest 786/786；demo playwright 74/74（73 基线
  +1 settings）；stream-demo 对拍 3/3（**首跑即零差异**）；vm-smoke
  11/11；auto-lang autodown_editor 模块 62/62（×2 复跑稳定；一次单跑失败
  为并发构建竞态，复现不出）。lint 缺 eslint.config 为环境既有（主
  checkout 同状）。
- **证据 PNG（Phase 2 判读面）**：vue-051-light/dark/accent-coral.png、
  stream-051-dark.png、vm-051-light/dark.png（demo/auto 与 stream-demo
  根）。

## 待澄清事项

1. **三模式统一 demo 开关**（edit/view/stream 任意并排，默认 edit+view）：已
   裁定后续立项；本计划 A7 钉死默认布局零扰动为其预留地基。
2. **统一滚动条 widget**（含 PARITY #8 thumb 观感残段、跨面板/跨模式/跨轨
   语义）：独立 plan，依赖本计划规约基座（thumb 观感值应从规约行取）。
3. **VM 侧 document accent 消费**（iced 主题 accent 接线）：本计划豁免行
   （popover swatch 两轨原生、document accent vue-only），后续随 auto-lang
   主题系统演进再立。
4. **深色档标题可读性变体**：T2 入表时若发现 accent-strong 深底对比不足，
   允许入表提亮变体值（规约行内双档分列），不许实现侧临场调。
5. settings_popover 交互细节（点击外侧关闭、Esc）：源组件未含，适配时按
   demo 现有 popover 惯例最小实现或不做（不影响验收）。
