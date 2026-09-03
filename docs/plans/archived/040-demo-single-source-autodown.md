---
plan_id: PLAN-040
status: archived
feature_name: demo 单源化 + AutoDown 命名统一 + 双轨契约扩展
author: [zhaopuming]
created_at: 2026-09-02
updated_at: 2026-09-02

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components:
  - "P022-7c: 修改——markdown 元素契约主名翻转：element markdown→autodown（markdown/markdown_editor 降 legacy 别名，存量 .at 不破），vue 换绑 StreamingRenderer（MarkdownRender 超集，内部组合其段落渲染，裁定②）；aura.at/schema.rs/registry/vue 臂四表同步 + 002 golden 随迁锁别名路径；MarkdownRender 保留 engine 内部渲染器与公共导出（存量消费方零破坏）"
  - "P014/P015（demo App Auto 化形态）: 修改——ext 组件直挂退役：use component: AutoDownEditor/StreamingRenderer 删除，双轨 tag（autodown_editor/autodown）承载双面板；content 状态从 demoAppBridge bag 移入 widget model（oninput: .Edit 回写联动，Init 经 initial_content() 播种）"
new_spec_components:
  - "P040-1: autodown 只读元素契约扩展——streaming/placeholder_block_id/placeholder_height(float)/scroll_sync 4 props 双轨语义：vue 臂全量发射（:source 绑定/显式 streaming 优先·final 反相发射/两 placeholder snake→kebab/:scroll-sync 缺省 true），VM v1 读取后忽略（豁免注记 aura_view_builder.rs 文件头，归 PLAN-042/043）；autodown_editor 补 placeholder prop（字面/绑定）"
  - "P040-2: 双轨载荷与轨道守卫惯例——oninput 裸 msg 引用双轨成立（vue 经 shadcn_event_to_vue 映射 @update:modelValue 载荷直传，EngineEditor 双发射均带 md；VM edit 信号走 INPUT_TEXT 自动绑定通道，同 code_editor 惯例）；轨道探针 ext fn is_vue()（VM 桩返回 None，`!= None` 判）守卫 vue 专属 bridge 喂 ref/测量回写——VM 轨 state 无模板 ref/composable 字段，未守卫即 handler_App_Init 崩（需求分析在案形态，实证修复）"
  - "P040-3: autodown 提为 auto CLI default feature（裁定①：旗舰消费方 path 恒在，任意 cargo build -p auto 即真渲染，run -r vm 不再静默 textarea 降级）+ 特性门编译漂移修复（View onclick/selectable 字段补齐 ×20 处、Mark::Underline 三 match 臂——core 已演进而特性从未构建过）"
  - "P040-4: codegen/围栏/MCP 三补——registry 解析为 PascalCase 真组件的 ref 判 ref<any>（native 伪映射 col→div 维持 HTMLElement）；ref 入 validators UNIVERSAL_PROPS（DSL 级通用属性）；MCP 打字通道 autodown 编辑器双臂（extract_action_from_view/extract_handler_from_view 补 type_text/clear，对齐 code editor Plan 413 follow-up）"
touched_goals:
  - "目标1（app.at 单源双轨可跑）：vue 65 e2e + vm 双面板真渲染/编辑联动（MCP 三证 + vm-first-light.png，复审在主检出 binary 重证）"
  - "目标2（vue 零回归）：e2e 65/65（T9）+ engine 776/776 + regen 零警告"
  - "目标3（tag 契约承载全 props，ext 直挂退役）：schema/registry/codegen/VM 四表同步 + 漂移围栏绿"
  - "目标4（auto.exe 默认即真渲染）：cargo tree default→autodown 链生效 + 主检出 binary 实测无降级"

current_step: 12
total_steps: 12
---

# [PLAN-040] demo 单源化：AutoDown 统一命名 + 双轨 tag 契约扩展

## 变更摘要

demo 的 Auto 工程（`autodown/demo/auto`）从「ext 组件直挂」改为消费统一
的 AutoUI 双轨 tag：`autodown_editor`（编辑面）+ `autodown`（只读面，主名
从 `markdown` 翻转而来）。同一份 `app.at` 经 `auto run` 出 vue 版（真
@autodown/engine 组件）、经 `auto run -r vm` 出 iced 原生桌面版。配套：

1. **命名统一**（用户裁定）：AutoDown 是 Markdown 超集，用户可见词汇统一
   叫 AutoDown——tag 主名 `markdown` → `autodown`（`markdown`/
   `markdown_editor` 降为 legacy 别名，存量 `.at` 不破）；vue 绑定从
   MarkdownRender 换绑 StreamingRenderer（超集组件，内部本就组合
   MarkdownRender 渲染段落）。
2. **契约扩展**：`autodown` tag 增加 `streaming`/`placeholder_block_id`/
   `placeholder_height`/`scroll_sync` props（vue 臂发射、VM 臂 v1 忽略并
   登记），`autodown_editor` 补 `placeholder` prop——demo 现 ext 用法用到的
   全部 props 进契约，vue 侧行为零回归。
3. **工具链**：auto-lang CLI 的 `autodown` feature 提为 `default`（裁定见
   需求分析），`cargo build -p auto` 产出即含 autodown-core 真渲染。

VM v1 已知缺席（本计划登记豁免、不实现）：滚动同步、ghost 占位块、表格
列宽拖拽、CustomScrollbar 数据——分别归 PLAN-042/043/044 与平台豁免表。

## 目标

1. `demo/auto/src/front/app.at` 单一源：vue（`auto run`）与 vm
   （`auto run -r vm`）双轨可跑，右栏只读渲染、左栏编辑、编辑→预览联动
   在两轨均真实工作（vm 轨 v1 为 6 块子集 + 编辑壳）。
2. demo e2e 65/65 保持全绿（vue 侧行为零回归）。
3. tag 契约（aura.at）承载 demo 所需全部 props，ext 组件直挂退役。
4. `auto.exe` 默认构建即可跑 vm 真渲染（无需手工 `--features autodown`）。

## 架构方案

```
demo/auto/src/front/app.at（单源）
  ├─ vue 轨：ui_gen/vue.rs 发射 → StreamingRenderer/AutoDownEditor（engine）
  └─ vm 轨：aura_view_builder.rs → View::AutodownEditor（cosmic-text 壳）
            / autodown_render.rs（parse_blocks → View 树）

schema/aura.at（P4-4 单源，本计划扩契约）
  element autodown（原 markdown 主名翻转）
    vue: StreamingRenderer（原 MarkdownRender）
    props: + streaming / placeholder_block_id / placeholder_height / scroll_sync
  element autodown_editor
    props: + placeholder
```

- ext 边界收缩但不消失：`useDemoAppBridge`（滚动同步/表格列宽/scrollbar
  测量）与 `initial_content` 仍是 vue 手写增强；VM 侧退化为 no-op 桩
  （ext stub 告警属预期，登记豁免）。组件 `component:` 导入全部退役。
- `content` 状态进 widget `model`，`oninput` 消息回写实现两栏联动；
  初始文档经 ext fn `initial_content()`（vue = content.ts，VM 桩 = ""）。

## 技术栈

- auto-lang（Rust）：schema/aura.at、ui_gen/vue.rs、ui/aura_view_builder.rs、
  ui/render_support.rs、ui_gen/widget/registry.rs、crates/auto/Cargo.toml
- auto-down（TS/Vue）：packages/engine（无代码改动，仅消费审计）、
  demo/auto/src/front/{app.at,utils/app_ext.ts}、demo e2e
- 验证：cargo build/test、regen.sh（vue-tsc + vite build）、playwright、
  `auto run -r vm` 手验

## 需求分析与背景调查

（spec store 离线，本节以 2026-09-02 实勘为据。）

- 现状实测：`auto.exe run -r vm` 于 demo/auto 可开窗，但五符号
  （AutoDownEditor/StreamingRenderer/useDemoAppBridge/logSave/logCancel）
  退化为 ext no-op 桩，`handler_App_Init` 因 `demoAppBridge` 字段不存在
  崩，双面板空白。现有 auto.exe 构建 features=[default, python, ui-iced]，
  **无 autodown**（fingerprint 实查），原生 tag 也会降级 textarea。
- 双轨能力已在：aura.at 已有 `autodown_editor`（vue=AutoDownEditor /
  iced=编辑壳）与 `markdown`（vue=MarkdownRender / iced=parse_blocks 真渲
  染）双轨元素；vm 渲染臂在 `aura_view_builder.rs:1359/1395`（及 2345/2381
  镜像）。
- StreamingRenderer props 面（实查）：`source/streaming/placeholderBlockId/
  placeholderHeight/scrollSync`，内部组合 MarkdownRender 渲染段落——是
  MarkdownRender 的超集，换绑不丢能力。
- engine 已无 Tiptap（plan 018，`assert-no-tiptap.mjs` 门禁）、无
  CodeMirror；packages/editor 是空壳。
- 裁定 ①（feature 归宿）：`autodown` 提为 auto CLI crate 的 default
  feature。理由：auto-down 是旗舰消费方，path 依赖恒在本机检出；备用方案
  （regen.sh 固化 `cargo build -p auto --features autodown`）会让
  `auto run -r vm` 在任意构建上静默降级，不符合「开箱真渲染」目标。
- 裁定 ②（组件归一方向）：overlay 换绑 StreamingRenderer，MarkdownRender
  保留为 engine 内部段落渲染器与公共导出（不删导出，存量消费方零破坏）。
  备选（MarkdownRender 吸收超集 props）被否：重复两份流式拆分逻辑。
- 裁定 ③（tag 主名）：`autodown` 为主名（用户裁定 AutoDown 统一命名），
  `markdown`/`markdown_editor` 入 aliases。内部生成物名（markdown_parser
  等）本计划不动（涟漪全部生成孪生，收益低）。

## 详细设计

1. **aura.at `element markdown` → `element autodown`**：tag 翻转，
   aliases=["markdown","markdown_editor"]（原 autodown 别名转正）；
   `vue: { component: "StreamingRenderer", import: "@autodown/engine" }`；
   props 增 `{streaming bool=false}{placeholder_block_id string}`
   `{placeholder_height number}{scroll_sync bool=true}`，原
   `content/final/class` 保留（final 与 streaming 反相共存，文档注明）。
2. **ui_gen/vue.rs 只读臂**（现 :10068 markdown 臂）：tag 匹配改
   `"autodown" | "markdown" | "markdown_editor"`；发射
   `:source`（content 绑定）、`:streaming`、`:placeholder-block-id`、
   `:placeholder-height`、`:scroll-sync`（snake→camel 映射）；`final` 发射
   为 `:streaming="!final"`。编辑臂（:10026）增 `placeholder` →
   `placeholder="..."` 字面/绑定发射。
3. **VM 臂**（aura_view_builder.rs 双镜像 + render_support.rs 表）：tag 匹配
   同步翻转；新 props 读取后忽略（`let _ =`），文件头注释登记
   「VM v1 豁免：streaming 恒按 final、ghost/scroll_sync 未实现，
   PLAN-042/043 补」。
4. **registry.rs**：markdown widget 条目 npm/描述同步换绑 StreamingRenderer，
   单测（`test_autodown_editor_mobile_backends_stable` 邻位）补 autodown
   条目断言。
5. **Cargo.toml**：crates/auto `default = ["ui-iced", "python", "autodown"]`。
6. **app.at 重写**（保留现有注释风格，头部注释改述双轨形态）：
   - `use` 块：fn 增 `initial_content`；`component:` 两行删除；
     composable useDemoAppBridge 保留。
   - model：`var content str = ""`（hovering_splitter 保留）。
   - msg：增 `Edit(str)`；`handleUpdate` 更名 `Edit`；save/cancel 保留
     ext fn 调用（VM 桩豁免）。
   - view：左栏 `autodown_editor { content: .content, placeholder:
     "Start typing...", oninput: .Edit, onsave/oncancel 保留 }`；右栏
     `autodown { content: .content, streaming: false,
     placeholder_block_id: .placeholder_id, placeholder_height:
     .placeholder_height, scroll_sync: true }`（computed 两项保留）。
   - Init：`.content = initial_content()` 先于 bridge 喂 refs。
7. **app_ext.ts**：导出 `initial_content()`（返回 content.ts 的
   INITIAL_MARKDOWN；VM 桩自动 ""）；其余不动。

## 测试设计

- auto-lang：`cargo test -p auto-lang --features autodown`（render/widget
  registry/新 autodown 条目断言）；`cargo build -p auto` 后于 demo/auto 跑
  `auto.exe run -r vm` 手验：双面板真渲染、左栏可编辑、右栏随 Edit 更新。
- vue 轨：`bash gen/regen.sh` 零警告；demo `npx vue-tsc -b && npx vite
  build` 绿；`npx playwright test` 65/65（StreamingRenderer 换绑后 DOM
  同组件，预期 selector 零改动；若有差异逐 spec 修）。
- engine：`pnpm -C packages/engine test`（776 基线，无代码改动应全绿）。

## 验收标准

1. 同一 `app.at`：`auto run`（vue）65 e2e 全绿；`auto run -r vm` 双面板
   真渲染 + 编辑联动可跑（6 块子集）。
2. `grep -rn "AutoDownEditor\|StreamingRenderer" demo/auto/src/front/app.at`
   为空（ext 组件直挂退役）。
3. 任意全新 `cargo build -p auto` 产出的 auto.exe 跑 `-r vm` 不出现
   textarea 降级。
4. 豁免登记在案（VM v1：滚动同步/ghost/列宽/scrollbar/ext 桩告警）。

## 执行步骤

- T1 `auto-lang/crates/auto/Cargo.toml`：default 增 `"autodown"`。验证：
  `cargo build -p auto` 成功且日志含 autodown-core 编译。
  [✅ 已完成] ee49db1e0（auto-lang auto-down-dev 分支）：default=["ui-iced","python","autodown"]；`cargo build -p auto` Finished + `cargo tree -e features -i autodown-core` 确认 default→autodown→autodown-core 链生效。附带：修复特性门内既有编译漂移 21 错（View onclick/selectable 字段 ×18、Mark::Underline match ×3——auto-down 主检出 core 已演进而特性从未构建过），机械补齐三文件（autodown_render/editor core+widget/natives 往返表）。
- T2 `auto-lang/schema/aura.at`：element markdown → autodown 主名翻转 +
  aliases + vue 换绑 StreamingRenderer + 4 新 props；autodown_editor 增
  placeholder prop。验证：`cargo test -p auto-lang --features autodown
  schema`（或元素表加载单测）通过。
  [✅ 已完成] 8d53e0060：主名翻转 + aliases=["markdown","markdown_editor"] + vue: StreamingRenderer@autodown/engine + 4 新 props（placeholder_height 用 float——schema 类型词表无 number）+ editor placeholder；发现并同步双源与围栏面：schema.rs elements.insert 同步改名（typed props 源）、element_coverage 双向登记改名、drift baseline 增 markdown 两行（裁定：markdown 降 legacy 别名、派发臂保留）+ 顺手裁剪 master 已消除 3 条（chart×2/popover）、特性门内测试模式漂移 2 处；`cargo test --features autodown schema` 全绿（两漂移围栏 2/2）。
- T3 `auto-lang/crates/auto-lang/src/ui_gen/vue.rs`：只读臂/编辑臂发射
  规则按详细设计 2。验证：`cargo test -p auto-lang --features autodown
  vue`（含 autodown_editor_rendering 既有测试）通过。
  [✅ 已完成] 460ec1f15：只读臂三拼写匹配 + content→:source + streaming
  显式优先/final 反相 + 两 placeholder snake→kebab + scroll_sync 缺省 true；
  编辑臂 placeholder 字面/绑定发射；002 golden 同步（legacy markdown 别名
  → StreamingRenderer 路径锁定）；新增 test_autodown_streaming_props_and_
  editor_placeholder；vue 278/278 全绿。实施备注：T5 的 registry 翻转是
  autodown 主 tag 在 codegen 解析为组件的前置（否则落 div 兜底），故与 T5
  同批落地，两步验证各自独立跑绿。
- T4 `auto-lang/crates/auto-lang/src/ui/aura_view_builder.rs`（双镜像臂）+
  `ui/render_support.rs`：tag 匹配翻转、新 props 忽略 + 豁免注释。验证：
  `cargo test -p auto-lang --features autodown autodown`。
  [✅ 已完成] aaaf eb738：双镜像只读臂 + 双镜像编辑臂新 props 读取后忽略
  （let _ =）；文件头 VM v1 豁免登记（streaming 恒按 final、ghost/
  scroll_sync 未实现，PLAN-042/043）；render_support 臂注记同步（tag 五
  拼写已在位无需翻转）；既有单测扩 props 断言不破真渲染/编辑壳；
  `--features autodown autodown` 122 全绿（ui-iced 档 editor 臂同绿）。
- T5 `auto-lang/crates/auto-lang/src/ui_gen/widget/registry.rs`：markdown
  条目换绑 + 新断言单测。验证：`cargo test -p auto-lang --features
  autodown registry`。
  [✅ 已完成] 460ec1f15（随 T3 同批，见其备注）：spec Markdown→Autodown +
  aliases markdown/markdown_editor；vue 臂 StreamingRenderer@autodown/
  engine + npm 经 schema overlay 落库（npm 首个 @ 切分怪癖系存量，断言锁
  现状）；新增 test_autodown_entry_streaming_rebind；registry 153/153。
- T6 `autodown/demo/auto/src/front/utils/app_ext.ts`：导出
  `initial_content()`。验证：`npx vue-tsc -b`（demo）绿。
  [✅ 已完成] 0442d98（plan-040-dev）：initial_content()（返 content.ts
  initialContent()）+ 轨道探针 is_vue()（设计外必要增项：守卫 .Init 喂
  bridge ref / SetScrollTop——VM 轨无模板 ref 字段，未守卫即 handler_App_
  Init 崩，语法探针实证复现+修复后消失）。vue-tsc 验证并入 T8 同跑（
  regen 门禁已含 gen 树 vue-tsc 绿）。
- T7 `autodown/demo/auto/src/front/app.at`：按详细设计 6 重写。验证：
  `cd autodown/demo/auto && bash gen/regen.sh` 零警告完成部署。
  [✅ 已完成] 0442d98：app.at 单源重写（component: 退役/双 tag/model
  content/Msg Edit/Init 先 initial_content）+ regen 零警告部署（AUTO 指向
  auto-lang worktree auto.exe——主检出 binary 待依赖折返后即默认可用）。
  实施备注：① oninput 用裸 .Edit 引用（042 例样同款）——vue 轨映射
  @update:modelValue（EngineEditor 双发射 update/update:modelValue 均带
  md），VM 轟 edit 信号走 INPUT_TEXT 通道；② 过程揭出并修复 auto-lang
  codegen 两缺（7370b28b2：registry 组件 ref 应 ref<any> 非 HTMLElement
  ［TS2741×2］、ref 应入 validators UNIVERSAL_PROPS［S001 误报］）。
- T8 demo 构建：`cd autodown/demo && npx vue-tsc -b && npx vite build`。
  验证：退出码 0。
  [✅ 已完成] vue-tsc -b 退出 0 + vite build ✓ built（chunk 体积告警为存量
  信息级）。前置：worktree 冷启 pnpm install + engine dist 构建（build 四
  断言全过）。
- T9 demo e2e：`cd autodown/demo && npx playwright test`。验证：65/65。
  [✅ 已完成] 65 passed (1.3m)——StreamingRenderer 换绑后 selector 零改动
  （预案的 >3 spec 断裂未发生）；一处截图副产物字节漂移（table-edit-
  faces.png，动画时序）已还原不入库。
- T10 engine 回归：`cd autodown && pnpm -C packages/engine test`。验证：
  776 全绿。
  [✅ 已完成] 60 files / 776 tests 全过（零代码改动，纯消费审计基线）。
- T11 vm 手验：`cd autodown/demo/auto && D:/autostack/auto-lang/target/
  debug/auto.exe run -r vm`，按验收 1 清单手验并截图存
  `demo/auto/vm-first-light.png`。验证：无 textarea 降级、无
  handler_App_Init 崩、联动可见。
  [✅ 已完成] 11eb9cf：vm-first-light.png（MCP 内部截图通道——锁屏下 OS
  屏摄不可用）。验证链：0 handler 错误（.Init 干净）、5 符号 ext 桩告警=
  预期豁免集、MCP type → .App.Edit → 右栏 6 块真渲染（H1/粗体 span 拆分/
  列表/引用/fence 头+体）双 binary（worktree+主检出）各验一遍；「textarea
  降级」甄别：快照层 vnode 命名系 plan 019 既有降级命名（View::
  AutodownEditor→Textarea VNode），真渲染证据=右栏块树（若 feature 缺失
  双栏皆 textarea）。依赖折返：auto-lang 两次折入 master（49dded024 +
  00eae6319 fast-forward），折返门禁 tf 3357/3357 + tv 3515/3515 绿；
  两存量环境失败（d8_toggle_dark_mode/desktop_mcp_switcher_thumbs，锁屏
  窗口渲染类）经 061b4b18b 基线复现判非本变更引入；MCP 打字通道补
  autodown 编辑器双臂（00eae6319）。
- T12 文档：`demo/auto/README.md` 增「VM 桌面跑法」章节（含 feature 前提、
  豁免清单、042-044 归属）；`DEBTS.md`（auto-down 根）登记豁免四项 +
  ext 桩告警项。验证：文中命令可复制执行。
  [✅ 已完成] 6fdda04：README VM 桌面跑法（含 MCP 验证通道与布局注记）+
  Layout 节 app_ext 描述同步（re-export 退役）；DEBTS 040 六行（三延期
  042/043/044 + CustomScrollbar 平台豁免 + ext 桩告警项）；三命令
  （regen.sh / run -r vm / cargo build -p auto）本会话均已实际执行。

## 复审记录

**复审**：/auto-plan:review（2026-09-02，执行会话内复审；代码面 worktree
plan-040-dev @6fdda04+ 与 auto-lang master @00eae6319 实核）。

**逐条验收**：

1. **同一 app.at 双轨可跑 — PASS**。vue 轨：T9 会话内 65/65 全绿（部署产物
   与今 diff 一致）；vm 轨：复审在当前主检出 binary 重证——MCP type →
   `.App.Edit` 触发 → 右栏真渲染（"Review Pass" H1 + 粗体 span 拆分），
   T11 全量证据（6 块子集 + vm-first-light.png 经内部截图通道）在案。
   ⚠️ 环境注记：复审时点会话已锁屏，e2e scroll-sync 2 例红——**同 spec 在
   pre-040 主检出（旧 App.vue）复现同败**，判锁屏 throttling rAF 滚动测量
   所致非本计划回归；解锁后建议复跑留档。
2. **ext 组件直挂退役 — PASS（附注）**。`grep -rn "AutoDownEditor\|
   StreamingRenderer" app.at` 仅命中头部注释（双轨映射说明文档），use 块
   与 view 使用位零残留；验收条文字面「为空」与注释性提及的差异如实记录。
3. **任意全新构建不降级 — PASS**。cargo tree 确认 default→autodown→
   autodown-core 链；主检出 `cargo build -p auto` 产物实测右栏 parse_blocks
   真渲染。甄别注记：快照层 `textarea` 节点名系 plan 019 VNode 转换器的
   既有命名（View::AutodownEditor→Textarea VNode），非 D-GAP-3 降级
   （若特性缺失双栏皆 textarea）——**债候选①：快照命名易误判，建议 042
   顺带正名**。
4. **豁免登记在案 — PASS**。DEBTS.md 040 五行（滚动同步 042/ghost 043/
   列宽 044 + CustomScrollbar 数据平台豁免 + ext 桩告警预期项含 is_vue
   守卫机理）+ README「VM 桌面跑法」章节（复审补中文锚与 DEBTS 指针一致）。

**全量门禁**（复审档，覆盖最终内容含 MCP 双臂提交 00eae6319）：
auto-lang `cargo tf` 3358/3358 + `cargo tv` 3516/3516 全绿；tt/tb 不适用
（未触转译器/书）。存量环境失败两例（d8_toggle_dark_mode/
desktop_mcp_switcher_thumbs，锁屏窗口渲染类）经 061b4b18b 折返前基线
复现，判非本计划引入（已入 auto-lang 提交信息在案）。

**遗漏/延后/workaround 猎查**：

- 遗漏：无——T1-T12 每步均有对应 diff 与验证（auto-down 7 文件/
  auto-lang 折返 19 文件），测试设计清单五项全部实跑。
- 延后：VM v1 四缺席（滚动同步/ghost/列宽/scrollbar 数据）为**计划自身
  条款**（豁免登记即验收 4），归 042/043/044 与平台豁免表——非私自收缩。
- Workaround（均已记录非隐藏）：① VM 手验经 MCP 打字通道（锁屏 OS 屏摄
  不可用）——补的是正式双臂+门禁绿，非临时 hack；② is_vue() 轨道探针为
  设计内机制（DEBTS 行含机理）；③ npm 首个 @ 切分怪癖以断言锁现状
  （存量，plan 019 期即如此）。
- 债候选：① VNode 快照层 autodown 编辑器命名（见验收 3 注记）；② VM 双
  面板垂直堆叠（scoped CSS 不及 VM 轨，README 已注记，非验收面）；③
  锁屏环境窗口/rAF 类测试不稳（auto-lang 2 + demo e2e 2，解锁后复跑）。

**结论**：四条验收全 PASS、无阻断债 → `status: reviewed`，交
/auto-plan:merge。

## 待澄清事项

- 无阻塞项。裁定 ①②③ 已在需求分析记录；执行中若发现 StreamingRenderer
  换绑导致 e2e selector 断裂超出预期（>3 个 spec），回到 T9 前先评估是否
  改走「MarkdownRender 吸收 props」备选并更新本节。
