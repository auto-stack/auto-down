---
plan_id: PLAN-059
status: archived
feature_name: 三模式展示面 showcase——全新 .at 单源双轨 demo（edit/view/stream 三栏任意组合开关 + 流式重播 + 主题贯通），demo 冻结锚与 stream-demo 仪器保持分立不动
author: [zhaopuming]
created_at: 2026-09-07
updated_at: 2026-09-07

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components:
  - "PLAN-059 六节存款（merge 时入 specs.json）：三模式展示面 showcase——三 demo 分立架构裁定（demo=平价锚/stream-demo=仪器/showcase=展示面）、edit/view/stream 三栏任意组合 + feed 快照/落定语义（feed_source 快照与四态状态行）、.at 双轨脚手架三先例（VM 子件须顶层 use <模块> 注册进 WidgetRegistry；契约流 regen.sh 卫兵需 pipefail+Failed-to-compile 通配（硬解析错误曾漏网）；vue 工程入口硬编码 src/front/app.at）、feed 窗口按轨双源分派（vue=ext 桥 timer 驱动 bridge、VM=state 状态机，demo csb_* 先例）、VM 结构布局必须用核心 row/col 标签（div 竖排且不消费工具类——PLAN-046 先例的再一次实证）"
touched_goals:
  - "P051-2: demo 三模式开关『显式出域（另行立项）』项落地——消费 051 的 darkMode/accent 声明入口 + settings_popover.at 形态 + view≡stream 落定一致性既有证明"
  - "P041-2: view≡stream 对拍不变式获得第二处回归钉（showcase e2e：落定后 stream DOM == view DOM）"
  - "P046-2/P047-2: VM demo 双轨脚手架先例（row/col 收编 + content.ts→gen-vm-content 种子适配链 + dark_mode D-GAP）在新应用全套复用并补强（regen 卫兵加固）"

current_step: 10
total_steps: 10
---

# [PLAN-059] 三模式展示面 showcase（全新 .at 双轨应用）

## 变更摘要

新建 `autodown/showcase/` 全新应用：给人看、给人玩的"全方位 demo"——
edit / view / stream 三栏各带开关（任意组合，默认三栏全开），共享同一文档单源；
stream 栏把当前文档流式重播（重播/步进/速度控制），落定后与 view 栏一致；
深浅主题 + 五色 accent 经 051 铺好的引擎声明 props 三栏贯通。
**全程 .at 单源双轨**（vue 编译部署 + `auto run -r vm` iced 桌面轨），
脚手架完全沿用 demo（plan 040 契约流）与 jade（ext 逃生舱）的既有先例。

**显式不动**：`demo/`（平价锚，300+ e2e 选择器挂默认布局）与
`stream-demo/`（测试仪器，051 的 view≡stream 自动门）零改动——三 demo 分立
是本计划的架构裁定（详见架构方案）。

## 目标

1. **三栏可选**：工具栏三个开关（edit/view/stream），任意组合布局，默认
   三栏全开等宽；每栏有栏头标识（edit / view / stream）。
2. **文档单源**：edit 栏是内容单源（`autodown_editor`，oninput 写 model 的
   `content`）；view 栏实时直映（`autodown` + `streaming: false`）。
3. **流式重播**：stream 栏（`autodown` + `streaming: true`）按需把**当前
   文档**切片渐进重播——重播（清零）/ 播放/暂停（vue 轨自动）/ 步进（两轨
   手动）/ 三档速度；落定判定 `stream_text == feed_source`，栏头显示进度与
   落定态；落定后 stream 栏 DOM 与 view 栏一致（041 T12 已证的同一配置）。
4. **主题贯通**：⚙ settings 弹层（051 `settings_popover.at` 模式复制），
   深浅 + indigo/coral/ocean/sage/amber 五色，三栏同 `dark_mode`/`accent`
   props 生效。
5. **双轨**：同一 `showcase.at` 驱动 vue 轨（契约流 regen 部署）与 VM 轨
   （`auto.exe run -r vm`）；VM 轨**不设 vm-smoke 断言门**，手验 + 截图
   留档（showcase 是展示面，不是平价锚）。
6. **冻结锚零扰动**：`demo/` 与 `stream-demo/` 全程零改动（git diff 为空
   是验收项）；既有全部门禁（demo e2e、stream-demo test、engine 门）零回归。

### v1 明确不做（scope cut，登记在案）

- **跨栏滚动同步**：三栏内容状态不同步（stream 是重播窗口），v1 各栏独立
  滚动——与 demo 的 edit↔view 同步是不同场景，未来增强另行立项。
- **VM 轨自动播放**：.at DSL 无 timer 原语（jade 先例：定时器走 ext 逃生
  舱，vue-only）。VM 轨 v1 用「步进」按钮手动推进，DEBTS 登记平台豁免行；
  正修属 auto-lang tick 原语（彼仓）。
- **stream→edit 就地交接**（流式进行中编辑面只读横幅）：023 目标 4 的
  语义在 showcase 只展示不实现——那是引擎/编辑器层职责，非展示面职责。

## 架构方案

### 三 demo 分立（本计划的核心裁定）

| 应用 | 身份 | 门禁 | 本计划 |
|---|---|---|---|
| `demo/` | VM 平价锚 + 工程 playground（e2e/vm-smoke/证据 PNG 挂默认布局） | demo e2e + vm-smoke | **零改动** |
| `stream-demo/` | 测试仪器（单一变量隔离：同一 StreamingRenderer 两态对拍） | 051 view≡stream playwright 门 | **零改动** |
| `showcase/`（新） | **展示面**——给人看给人玩的三模式全景 | 轻量冒烟 e2e + build 门 | 本计划交付 |

依据：051 显式出域原文（"demo 三模式开关（edit/view/stream 任意并排，
默认布局不变约束本计划钉死）……后续立项，本计划只铺 props/状态地基"）+
051 的 demo/stream-demo 分立裁定（"edit 面与 render 面 DOM 合法不同，该
对拍逻辑不可跨模式泛化"）。showcase 消费 051 铺好的声明入口
（`dark_mode`/`accent` props）与 settings 形态（`settings_popover.at`）。

### 目录布局（镜像 demo 的契约流结构）

```
autodown/
├── pnpm-workspace.yaml            # packages 增 'showcase'（T1）
└── showcase/                      # 新 pnpm 包 @autodown/showcase
    ├── package.json               # dev/build/preview/test 四脚本
    ├── index.html  vite.config.ts  tsconfig.json  tsconfig.node.json
    ├── playwright.config.ts       # T8
    ├── src/
    │   ├── main.ts                # 手写入口（挂 App + app.css）
    │   ├── app.css                # 手写全局样式（html/body/#app，demo 先例）
    │   ├── App.vue                # gen 部署产物（regen.sh，勿手改）
    │   ├── components/SettingsPopover.vue  # gen 部署产物
    │   └── sample.ts              # 种子语料单源（= demo 的 content.ts 角色）
    ├── e2e/showcase-smoke.spec.ts # T8 冒烟
    └── auto/
        ├── pac.at                 # name: "showcase-app"，engine link 同深度路径
        ├── gen/regen.sh           # 契约流（demo 版改写：App + SettingsPopover）
        ├── scripts/gen-vm-content.mjs  # 从 sample.ts 生成 VM 种子适配（T4）
        └── src/front/
            ├── showcase.at        # 主 app（model/view/on/style）
            ├── settings_popover.at # demo 版复制适配（PLAN-059 注记）
            └── utils/
                ├── showcase_ext.at    # ext 声明面（bridge + initial_content）
                ├── showcase_ext.ts    # vue 轨实现（bridge bag + feed timer）
                └── showcase_ext.vm.at # 生成：VM 种子（gen-vm-content.mjs）
```

### 数据流（.at model 是唯一状态源）

```
                    ┌─ edit 栏: autodown_editor ── oninput: .Edit ─┐
                    │                                             ▼
  sample.ts ─Init→ .content（文档单源）                    .content
                    │                                             │
                    ├─ view 栏: autodown { content: .content, streaming: false }
                    │         （实时直映，无中间态）
                    │
                    └─ stream 栏: autodown { content: .stream_text, streaming: true }
                                  .feed_source ──FeedReset 快照── .content
                                  .FeedStep: .stream_text = feed_source 前缀切片
                                             （长度 min(len, +.speed)，到头落定）

  vue 轨 timer：.FeedPlayPause（is_vue() != None 臂）→ showcase_ext.ts
                setInterval(dispatch FeedStep, 90ms)，落定/暂停/重播自清
  VM 轨：无 timer 原语 → 「步进」按钮手动 FeedStep（v1 豁免，DEBTS 在册）

  主题：.dark_mode / .accent_color → 三栏 props 同步 + app chrome 条件类
```

要点：

- **feed 快照语义**：重播开始时把 `.content` 快照进 `.feed_source`——播放
  期间用户继续编辑 content 不影响本次重播（观感稳定），再次重播取新快照。
- **条件元素**用 `if .show_edit { ... }` 形态（jade backlinks_panel 先例）；
  播放按钮 `if is_vue() != None { ... }` 门控（vue 轨专用），步进按钮两轨
  可见。
- **e2e 锚**：栏容器 class `col-edit` / `col-view` / `col-stream`；工具栏
  `toggle-edit` / `toggle-view` / `toggle-stream`、`btn-play` / `btn-step` /
  `btn-replay`、`speed-select`。全部在 .at 里显式声明（showcase 自己的
  锚，不碰 demo 的 `.left`/`.right` 语义）。
- **落定检测**（e2e 用）：两帧 300ms innerHTML 指纹不变（stream-demo
  `waitSettled` 同款语义，覆盖 typewriter 清零/调度器残余/fence loading）。

### 种子语料（sample.ts）

覆盖 032 三态有代表性的子集：heading ×3 级 / 段落 + 全 marks（bold/italic/
code/link/strike）/ 嵌套 list + checkbox / blockquote / fence（多语言）/
table / details / callout / wikilink。math/mermaid 不入种子（首屏算力 +
VM 轨观感债未清），编辑即可加。语料来源直接改编 demo `content.ts` 的
代表段，不新造文体。

## 技术栈

- **Auto DSL**（auto-lang 编译器 `D:/autostack/auto-lang/target/debug/auto.exe`，
  a2ts vue 发射 + a2r VM 发射；`autodown` 特性已在 CLI 默认集——plan 040）。
- **Vue 3 + Vite 6 + vue-tsc**（workspace 内 `@autodown/engine` link 消费）。
- **Playwright**（showcase 冒烟 e2e）。
- **iced VM**（`auto.exe run -r vm`，AutoUI MCP `127.0.0.1:9247` 备用于
  脚本化截图）。
- pnpm workspace（新增 'showcase' 成员）。

## 需求分析与背景调查

（来源：`.autoos/specs.json` 总览 + 会话期研究；本计划动工前 specs 地基
如下）

- **P051-2..6**（Vue 轨 view 收口 + view≡stream 自动门 + 主题规约化与双轨
  settings）：本需求的直接出处——051 显式出域"demo 三模式开关（edit/
  view/stream 任意并排）后续立项，本计划只铺 props/状态地基"；本计划就是
  那个"后续立项"，消费 051 的全部地基（darkMode/accent 声明入口、
  settings_popover.at 形态、view≡stream 落定一致性的既有证明）。
- **P023-2**（BlockComponent 三模式契约）：showcase 三栏是 view/stream/
  edit 三模式契约的**展示面消费**——引擎侧三模式早已统一（033 家族机制
  单源同 chrome），本计划不碰引擎，纯组装。
- **P032-2**（流式三态契约）：stream 栏的渐进行为全由引擎 StreamingRenderer
  既有语义承担（17 kind 三态裁定在册），showcase 只提供 feed 窗口。
- **P046-2/P047-2**（VM demo 对齐 + 观感收尾）：双轨脚手架先例——row/col
  核心布局标签两轨同源、`dark_mode` 状态经 D-GAP 全局翻转、content.ts →
  gen-vm-content.mjs → app_ext.vm.at 种子适配链。showcase 全套照搬。
- **P040**（demo 单源化 + 双轨跑法）：契约流 regen.sh 的卫兵语义（compile
  warning / gen vue-tsc error 阻断部署）照搬。
- **DEBTS 040 行**（`streaming` VM stays final 豁免族）：showcase stream 栏
  VM 臂渲染终态（渐进按文档粒度）属同族已知行为，不新设豁免；本计划新增
  的豁免仅 VM auto-play timer 一行。
- **现状核实**（2026-09-07 会话）：`demo/auto/src/front/app.at` 的
  `streaming: false` 为硬编码 view 态，无模式选择器；`stream-demo` 对拍台
  （041 T12）与自动门（051 F2）在库且绿；docs/plans 无活动计划。

## 详细设计

### 1. showcase.at 主件骨架

```
use.web.fn initial_content from "src/front/utils/showcase_ext.at"

widget App {
    use { autodown_editor, autodown, settings_popover }
    model {
        var content = ""            // 文档单源（edit 写、view 直映）
        var stream_text = ""        // feed 窗口（stream 栏消费）
        var feed_source = ""        // 重播快照（FeedReset 时取 content）
        var playing = false
        var speed = 96              // 字符/步：24 | 96 | 384 三档
        var show_edit = true
        var show_view = true
        var show_stream = true
        var dark_mode = false       // 051 语义：renderer 认可名，VM 经 D-GAP
        var accent_color = "indigo"
        var settings_open = false
        // e2e/断言用派生：feed 进度与落定态（栏头展示同源）
        stream_len => len(.stream_text)
        source_len => len(.feed_source)
        progress_pct => .source_len == 0 ? 100 : (.stream_len * 100 / .source_len)
        settled => .stream_text == .feed_source && .feed_source != ""
    }
    view { /* toolbar + 三栏 row，见下 */ }
    on { /* Init/Edit/Feed*/Toggle*/Set* 等，见下 */ }
}
```

（实际语法以 demo `app.at` / jade 各 .at 为准——`len()`、三元、字符串比较
均为既有表达式面；`settled` 若三元嵌套受限可落 handler 内计算存 var。）

### 2. 视图结构

- **toolbar**：左标题 "AutoDown Showcase"；中三开关（文本按钮
  `class: "toggle-edit"` 等，onclick 翻转对应 `show_*`，开态高亮）；右
  stream 控制组（`btn-play` vue 轨门控 / `btn-step` 常显 / `btn-replay` /
  `speed-select` 三档）+ `native_button "⚙"` 开 settings。
- **主体**：`row { if .show_edit { col { class: "...col-edit", 栏头 "edit",
  autodown_editor {...} } } if .show_view { col {...col-view, 栏头 "view",
  autodown { content: .content, streaming: false, dark_mode, accent } } }
  if .show_stream { col {...col-stream, 栏头 "stream" + 进度/落定态文本,
  autodown { content: .stream_text, streaming: true, dark_mode, accent } } } }`。
- **栏头状态行**（stream 栏）：`未开始` / `流式中 {progress_pct}%` /
  `已落定`——与 `settled` 派生同源。
- `autodown_editor` 的 props 按 demo 面减配：`content/oninput/placeholder/
  dark_mode/accent`；不带 scroll_sync/ghost/表格列宽（那些是平价锚的
  交互验证面，展示面不需要）。
- style 块：三栏等宽（`flex-1` + min-w-0）、栏头小标签样式、深色 chrome
  条件类 `.app-dark`（051 demo 同款兜底规则）、`document.fonts.ready`
  无关（无像素断言在 app 内）。

### 3. handlers

```
.Init      -> { .content = initial_content(); .feed_source = "";
                .stream_text = "" }        // 起屏即有文档，stream 栏待重播
.Edit($v)  -> { .content = $v }            // view 栏随绑定自动直映
.FeedStep  -> { if .stream_len < .source_len {
                    .stream_text = slice(.feed_source, 0,
                        min(.source_len, .stream_len + .speed))
                } else { .playing = false } }
.FeedReset -> { .feed_source = .content; .stream_text = ""; .playing = false }
.FeedPlayPause -> { .playing = !.playing
                    if is_vue() != None { ext 桥启停 timer（见 §4） } }
.FeedSetSpeed($v) -> { .speed = $v }
.ToggleEdit / .ToggleView / .ToggleStream -> { 翻转对应 show_* }
.OpenSettings / .CloseSettings / .SetTheme($v) / .SetAccent($v)
    // 051 settings_popover 契约同名消息，逐字对齐
```

（`slice`/`min` 若表达式面缺位，则 FeedStep 落 handler 层用既有字符串
原语实现；执行时以编译器报错为准就地适配，语义不变。）

### 4. ext 桥（vue 轨 timer，jade 逃生舱先例）

`showcase_ext.ts`：`useShowcaseBridge()` 返回 `{ play(stepDispatch,
intervalMs), stop() }`——`setInterval` 循环派发 `.FeedStep` 消息（经由
bridge bag，同 demo `app_ext.ts` 的消息通道模式）；`FeedReset` 与落定
（`playing` 翻 false 的路径）在 vue 臂调 `stop()`。`initial_content()`
从 `sample.ts` 读模板串（demo `content.ts` 同款导出）。VM 面由
`gen-vm-content.mjs` 生成 `showcase_ext.vm.at`（转义单行 Auto 串字面量，
脚本从 demo 版复制改路径）。

### 5. settings_popover.at

从 `demo/auto/src/front/settings_popover.at` 复制，头注改 PLAN-059 来处；
消息面（Close/SetTheme/SetAccent）与 props（open/dark_mode/accent_color）
零改动——它本就是 051 为复用设计的自包含兄弟件。

## 测试设计

- **build 门**：`pnpm -C showcase build`（vue-tsc -b && vite build）。
- **regen 卫兵门**：`bash auto/gen/regen.sh` 的既有卫兵（Warning: Failed
  to compile / error TS 阻断部署）原样生效。
- **冒烟 e2e**（`pnpm -C showcase test`，~7 用例）：
  1. 默认三栏可见（`col-edit/col-view/col-stream` 存在性）；
  2. 三开关各自隐藏/恢复对应栏（toggle 后栏容器消失/重现）；
  3. edit 输入 → view 栏实时同步（键入标记文本后 view 含对应渲染节点）；
  4. 重播 → vue 轨自动播放 → 落定（两帧指纹稳定）→ stream 栏
     innerHTML == view 栏 innerHTML（041 T12 同配置既证，此处为回归性
     冒烟断言）；
  5. 深浅切换三栏同效（三栏内 `.is-dark` 计数）；
  6. accent 切换 `data-accent` 三栏一致；
  7. 速度切换改变落定步数（慢/快两档的 FeedStep 计数单调性——可选，
     实现成本高则降级为仅断言 speed 值回显）。
- **VM 轨手验清单**（不设断言门，截图留档）：起屏三栏 + 种子文档；
  步进推进 stream 栏（每次点击文本增长）；重播清零；深浅切换；编辑
  落 view。产出 `auto/vm-059-*.png` ≥3 张。
- **零回归门**：`pnpm -C demo exec playwright test`（demo 全量 e2e）、
  `pnpm -C stream-demo test`、engine vitest 全量——三者零改动跑绿
  （git diff 同时证明零触碰）。

## 验收标准

1. `pnpm -C showcase build` 与 `pnpm -C showcase test` 全绿；regen.sh
   无 warning 部署。
2. `git diff master -- autodown/demo autodown/stream-demo` 为空（冻结锚
   与仪器零改动）；demo e2e / stream-demo test / engine 测试全绿复跑。
3. 三栏任意组合开关可用且默认全开；edit 改动 view 实时反映；stream 重播
   三档速度可用，落态栏头显示"已落定"，e2e 断言 stream 落定 DOM == view。
4. 深浅 + 五色 accent 三栏同生效（e2e 断言在案）。
5. VM 轨 `auto.exe run -r vm`：三栏起屏、步进、重播、主题切换、编辑均
   可用；截图 ≥3 张在库；DEBTS 新增 VM auto-play 豁免行在册。
6. `showcase/README.md` 在库：跑法（vue/VM）、三 demo 分立表、数据流图。

## 执行步骤

> 工作树：默认检出起草；执行期由 /auto-plan:work 开
> `.wt/auto-down-059/auto-down` 工作树（Plan 529 布局）。

- **T1 workspace 脚手架**
  操作：`pnpm-workspace.yaml` packages 增 `'showcase'`；新建
  `showcase/package.json`（name `@autodown/showcase`，scripts
  dev/build/preview/test，deps `@autodown/engine: workspace:*` + vue，
  devDeps vite/@vitejs/plugin-vue/typescript/vue-tsc/@playwright/test——
  版本对齐 stream-demo/package.json）；`index.html`/`vite.config.ts`
  （@vitejs/plugin-vue，server.port 独立如 5175）/`tsconfig.json`/
  `tsconfig.node.json`（抄 stream-demo 同名件改引用）；手写
  `src/main.ts` + `src/app.css` + 临时手写 `src/App.vue`（占位文本）。
  验证：`pnpm install` exit 0 且 `pnpm -C showcase build` exit 0。
  [✅ 已完成] 83b20d0：11 文件入库；冷启动补建 engine dist（vue-tsc+vite
  +四断言绿）后 `pnpm install` + `pnpm -C showcase build` 全 exit 0；
  vite.config.d.ts/js 随 composite 产物入库（demo/stream-demo 同惯例）。

- **T2 .at 工程脚手架 + 契约流**
  操作：新建 `showcase/auto/pac.at`（name `showcase-app`，scene `ui`，
  render `vue`，npm_deps engine link 路径与 demo 同深度同串）；最小
  `showcase/auto/src/front/showcase.at`（单栏静态：model `content="hello"`
  → `autodown{content, streaming:false}`）；
  `showcase/auto/src/front/utils/showcase_ext.at`（`use.web.fn
  initial_content` 声明 + 空 bridge）；`showcase/auto/gen/regen.sh`
  （复制 demo 版：改部署目标 App.vue、去 CustomScrollbar 段、SettingsPopover
  段 T7 再启、`@/ext/.../app_ext` 重写规则改 `showcase_ext`）。
  验证：`cd showcase/auto && bash gen/regen.sh` 输出 REGEN OK，
  `src/App.vue` 被部署，`pnpm -C showcase build` 绿。
  [✅ 已完成] 执行期事实：auto CLI 入口硬编码 `src/front/app.at`
  （showcase.at 遵例改名 app.at，见待澄清③）；regen.sh REGEN OK +
  App.vue 部署（gen 别名 sed 重写 `@/ext/.../showcase_ext` →
  `../auto/src/front/utils/showcase_ext`）+ build 绿；gen/front/vue
  脚手架 17 文件入库（demo 22 文件惯例，ext 拷贝/src 镜像随任务增）。

- **T3 三栏布局 + 栏目开关**
  操作：`showcase.at` 增 model `show_edit/show_view/show_stream=true`；
  toolbar 三开关（class `toggle-edit` 等，onclick 翻转）；主体 row 三
  col 条件元素（`if .show_x`），栏容器 class `col-edit/col-view/col-stream`
  + 栏头标签；三栏分别挂 `autodown_editor`（oninput: .Edit）/`autodown`
  （streaming:false，content: .content）/`autodown`（streaming:true，
  content: .stream_text 暂空）；`.Edit($v){.content=$v}` handler；style
  块三栏等宽 + 栏头样式。
  验证：regen + build 绿；`pnpm -C showcase dev` 手验三栏等宽、开关
  生效、edit 打字 view 实时变。
  [✅ 已完成] regen/build 绿；手验以 playwright 探针代肉眼（三栏可见/
  toggle-edit 隐现/edit→view 实时联动全过）+ 截图
  auto/vue-059-t3-three-panes.png 在库；渲染栏补 demo 同款 py-4 px-5
  内边距。

- **T4 种子语料两轨同源**
  操作：`showcase/src/sample.ts`（从 demo `src/content.ts` 改编代表段，
  export const SAMPLE_DOCUMENT 模板串）；`showcase_ext.ts` 实现
  `initial_content()`（读 sample）+ bridge 骨架；复制
  `showcase/auto/scripts/gen-vm-content.mjs`（demo 版改：读 ../..../src/
  sample.ts，写 utils/showcase_ext.vm.at）；`.Init` 调 `initial_content()`
  写 content（vue 轨经 bridge 真符号，VM 轨经适配链——demo 模式照搬）。
  验证：regen + build 绿；dev 轨起屏有种子文档；`node scripts/
  gen-vm-content.mjs` 生成物在库且带 DO-NOT-EDIT 头。
  [✅ 已完成] gen 脚本产出 showcase_ext.vm.at（1470 字符/DO-NOT-EDIT 头）
  + regen/build 绿 + 探针全过（edit/view 双栏五探针 + 表格节点）+
  截图 auto/vue-059-t4-seeded.png 在库。

- **T5 feed 状态机（.at 层）**
  操作：model 增 `stream_text/feed_source/playing/speed` + 派生
  `progress_pct/settled`（或 handler 计算 var）；handlers `FeedStep/
  FeedReset/FeedPlayPause/FeedSetSpeed`（§3 语义：FeedReset 快照
  content→feed_source；FeedStep 前缀切片步进，到头 playing=false）；
  stream 栏工具行 `btn-step`（常显）/`btn-replay`/`speed-select` 三档 +
  `btn-play`（`if is_vue() != None` 门控）；栏头状态行（未开始/流式中
  %/已落定）。
  验证：regen + build 绿；dev 轨手验：步进逐点增长、重播清零重走、
  速度三档步长不同、落定显示"已落定"。
  [✅ 已完成] regen（vue-tsc 门）+ build 绿；playwright 探针全过
  （步进增长/重播清零/慢<中步长/快档 40 步内落定）+ 截图
  auto/vue-059-t5-feed.png 在库。执行期微调：手动步进态显示"已暂停"
  （playing=false 且中段——语义自洽）；表达式面落 str.len()/substr/
  Math.min/.str()（VM 内建面 + jade 双轨先例），未用 plan 猜想的
  slice/min 形态。

- **T6 vue 轨自动播放 ext 桥**
  操作：`showcase_ext.ts` 增 `play(dispatch, intervalMs)/stop()`（
  setInterval 派发 FeedStep，句柄存 bridge）；`.FeedPlayPause` vue 臂调
  ext 启停、`.FeedReset` 调 stop；落定路径（playing 翻 false）vue 臂
  同步 stop（防悬挂 interval）。
  验证：dev 轨点播放自动渐进至落定自动停；暂停/续播/重播无残留计时器
  （重播后立即播放不双速）。
  [✅ 已完成] regen+build 绿；探针全过（自动播放免操作落定/重播+播放
  单速 364ms/暂停渲染稳定冻结+续播恢复）。落地形态与计划 §4 有别：
  feed 窗口 vue 轨改桥持有（demo csb_* 双源先例，computed 按轨分派
  feed_text/feed_source_text/feed_playing，handlers is_vue() 臂委托桥）
  ——SFC handler 是本地函数，桥无法直接派发 FeedStep，双源是 demo 
  既定模式。执行期发现两项在册：use 块尾逗号解析硬约束、regen.sh 
  硬解析错误漏网（已补 pipefail+通配 grep）；引擎 typewriter 残余在
  showcase 实测存在，探针/断言须用两帧稳定判据（stream-demo 同款）。

- **T7 settings 弹层 + 主题三栏贯通**
  操作：复制 `demo/auto/src/front/settings_popover.at` →
  `showcase/auto/src/front/settings_popover.at`（头注 PLAN-059）；主件
  use 挂载；model 增 `dark_mode/accent_color/settings_open`；handlers
  OpenSettings/CloseSettings/SetTheme/SetAccent（051 同名契约）；三栏
  props 挂 `dark_mode: .dark_mode, accent: .accent_color`；style 块
  `.app-dark` chrome 兜底（051 demo 同款）；regen.sh 启用 SettingsPopover
  部署段。
  验证：regen + build 绿；dev 轨深浅/五色切换三栏同步生效，⚙ 关态零
  渲染。
  [✅ 已完成] regen+build 绿；探针全过（关态零渲染/暗色三栏 .is-dark
  ×3 + .app-dark chrome/coral data-accent 0→3/✕ 卸载）+ 截图
  auto/vue-059-t7-dark-coral.png。执行期三发现在册：①根 SFC 以
  '@/components/SettingsPopover.vue' 别名导入——正解 = vite alias @
  （demo 惯例），非 sed 重写；②tsconfig 需 ES2021+paths+noUnusedLocals
  off（生成物死 helper getAccentNames，demo 051 在册先例两处）；
  ③部署目标需 mkdir -p src/components。

- **T8 冒烟 e2e**
  操作：`showcase/playwright.config.ts`（webServer 起 vite dev，抄
  stream-demo 配置改端口/目录）；`showcase/e2e/showcase-smoke.spec.ts`
  落测试设计 7 用例（含 waitSettled 两帧指纹法 + stream/view innerHTML
  相等断言）。
  验证：`pnpm -C showcase test` exit 0 全绿。
  [✅ 已完成] 7/7 绿（E2E_PORT=5299）。暗色断言首版误数（.is-dark 按
  栏根分派：render 栏 .streaming-document ×2 + 编辑栏 .autodown-editor
  ×1），error-context 快照定位后修正；速度档取测试设计 #7 允许的降级
  断言（高亮回显），步数单调性留在 T5/T6 探针。

- **T9 VM 轨手验留档 + DEBTS**
  操作：`cd showcase/auto && D:/autostack/auto-lang/target/debug/auto.exe
  run -r vm` 手验清单（三栏起屏/种子/步进/重播/主题/编辑→view），
  截图存 `showcase/auto/vm-059-{light,dark,stream-step}.png` ≥3 张
  （可经 AutoUI MCP 9247 截图通道）；`DEBTS.md` 新增行：`059 | 平台
  豁免 | 🟢 | VM showcase 流式自动播放 timer 缺位（.at 无 tick 原语，
  手动步进代用；正修属 auto-lang）| … | … | 2026-09-07`。
  验证：截图在库；DEBTS 行在册。
  [✅ 已完成（截图 1/3，余 2 张环境阻断登记在案）] 功能断言全过：三栏
  起屏+种子六探针/步进 0→196/重播清零/⚙ popover 渲染/🌙 Dark→true/☀
  Light 回切（MCP 9359 合成通道）；vm-059-stream-step.png 实拍在库。
  两项执行期发现：① **VM 子件注册须顶层 `use settings_popover`**——
  lib.rs register_transitive_widgets 只沿 use 语句链收集兄弟件，缺行则
  ⚙ 弹层 VM 永不渲染（demo app.at L73/L78 隐含先例；vue 轨不受影响），
  已补并注记；② 截图 2 张（dark/light）被锁屏环境阻断（窗口 zero-size，
  049 静默退出同族；iced 零尺寸守卫无软件绕过）——043 同构通道代证
  先例处置，DEBTS 059 行随附登记。

- **T10 README + 零回归收尾**
  操作：`showcase/README.md`（跑法 vue/VM/test、三 demo 分立表、数据流
  图、锚选择器表、已知豁免指针）；`git diff master -- autodown/demo
  autodown/stream-demo` 确认空；复跑全门禁：`pnpm -C showcase build`、
  `pnpm -C showcase test`、`pnpm -C demo exec playwright test`、
  `pnpm -C stream-demo test`、engine vitest 全量。
  验证：全部 exit 0；diff 空。
  [✅ 已完成] 全门绿：showcase build + e2e 7/7、stream-demo 3/3、
  demo e2e 88/88、engine vitest 786/786、冻结锚 diff=0；README 在库。

## 复审记录

- **复审人**：zhaopuming（/auto-plan:review，2026-09-07，工作树
  `.wt/auto-059/auto-down` @ 5630c6e）
- **逐条验收**：
  1. **build/test/regen** — PASS。`pnpm -C showcase build` 绿（vue-tsc +
     vite）；`E2E_PORT=5299 pnpm -C showcase test` **7/7**（含落定后
     stream innerHTML == view innerHTML 断言）；regen.sh REGEN OK（卫兵
     已加固：pipefail + Failed-to-compile 通配）。
  2. **冻结锚零改动 + 全门复跑** — PASS。`git diff master -- demo
     stream-demo` = 0 行；demo e2e **88/88**、stream-demo **3/3**、
     engine vitest **786/786** 复跑全绿。注：两包各自 tracked 的证据
     PNG（table-edit-faces/stream-051-dark）在套件每次运行时被改写——
     运行产物入库的既有惯例（非本计划改动，已还原；债务候选见下）。
  3. **三栏开关/联动/重播/落定** — PASS。e2e 用例 1/2/3/4/7 + T5/T6
     探针（步长单调性、自动播放免操作落定、暂停/续播、重播不双速）。
  4. **主题贯通** — PASS。e2e 钉 dark（三栏各归其根：.streaming-document
     ×2 + .autodown-editor ×1）+ coral；复审补验**五色逐个**（indigo/
     coral/ocean/sage/amber 各 data-accent×3，一次性探针全过）。
  5. **VM 轨** — PASS（带两项在案注记）。MCP 9359 合成通道功能断言
     全过：三栏起屏+种子六探针、步进 0→196、重播清零、⚙ popover、🌙
     Dark→true、☀ Light 回切、**编辑→view 同步**（autoui_type 经
     .App.Edit 派发实证）。截图 3/3 在库：light=修后横排实拍，
     dark/step 为锁屏环境前旧拍（构建版本偏差在册，见 debt③）；终版
     补拍被锁屏窗口 zero-size 阻断（049 族，环境反复）。DEBTS 059
     豁免行在册。
  6. **README** — PASS。跑法/三 demo 分立表/数据流图/锚表/豁免四条。
- **复审期修复（用户指出的 VM 布局缺陷 + 连带发现，5630c6e）**：
  ① 工具栏/栏头结构容器 div → 核心标签 row ×7（VM div=竖排且不消费
  工具类；PLAN-046 收编先例）——修后 VM 横排实证；② feed 三 computed
  的 VM 臂从 else 移到 then（VM 上 .showcaseBridge 不可解析，054 分支
  回退未兜住 → stream 栏起屏误染全文档；实测修后 stream_text=0 且
  文档文本仅 view 栏渲染）。修后 regen/build 绿 + e2e 7/7 复跑。
- **遗漏/延后/workaround 猎查**：无静默遗漏。三 demo 零改动经 diff
  证实；VM auto-play 为计划内 scope cut（DEBTS 059 在册）；VM 截图
  2 张环境阻断为已披露环境类 debt（待澄清⑤）；速度档 e2e 降级断言为
  测试设计 #7 预授权。scope cut 三项（跨栏滚动同步/stream→edit 交接/
  math-mermaid 种子）均为计划明文。
- **债务候选（非阻塞）**：
  ① demo/stream-demo tracked 证据 PNG 每次跑套件即被改写（运行产物
  入库的仓库惯例）——宜后续 .gitignore 化或移出跟踪（独立小清理）；
  ② VM computed→文本绑定不随 state 失效（状态行卡「未开始」，状态机
  本身正常；auto-lang 侧，实证在案）；
  ③ VM 证据截图两张构建版本偏差（锁屏环境反复，环境允许后
  `node vm-059-probe.mjs` 重摄）；
  ④ VM 状态行/类名消费等观感残段沿 047 PARITY 表家族（auto-lang 侧）。
- **结论**：六条验收全 PASS（标准 5 带两项在案注记），无未签核的
  静默延后。**status → reviewed，可进 /auto-plan:merge。**

## 待澄清事项

1. **VM 轨 auto-play**：v1 裁定为手动步进 + DEBTS 豁免行（倾向已定，
   执行不再问）；若执行期发现 auto-lang 已有可用 tick/animation 原语
   （如 043 拖拽消息合成通道的同构能力），可就地升级为双轨自动播放并
   在复审记录注明。
2. **速度三档与 interval 常量**（24/96/384 字符/步 × 90ms tick）：执行期
   以观感微调允许偏差，落 README 记终值即可，不必回改本计划。
3. **（执行期事实，无需裁定）** auto CLI 的 vue 工程入口硬编码
   `src/front/app.at`——showcase.at 遵例改名 app.at（T2）。
4. **（执行期发现，已在册）** VM 轨兄弟件注册须顶层 `use settings_popover`
   （lib.rs register_transitive_widgets 只沿 use 链收集；demo L73/L78 隐含
   先例）——T9 已补并注记；建议 demo/README 或 auto-lang 文档显式化。
5. **（T9 遗留，待环境）** VM 证据截图 3 张仅 1 张实拍在库
   （vm-059-stream-step.png），dark/light 两张被锁屏环境阻断（049 族
   窗口 zero-size，无软件绕过）——功能断言已全过（043 同构通道代证
   先例）；环境允许时可跑 `cd showcase/auto && node vm-059-probe.mjs`
   补齐。
