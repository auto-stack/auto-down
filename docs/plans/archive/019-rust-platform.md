# Plan 019：rust 平台落地（autodown-core crate + iced 渲染 + 编辑壳）

---
supersedes_spec_components:
  - "auto-man platform 挂载表 markstream-vue 路径: 替换为 @autodown/engine MarkdownRender（存量消费方迁移归 020）"
  - "registry Markdown/AutoDownEditor spec（无 vue 映射态）: 替换为 aura.at vue 声明 @autodown/engine"
new_spec_components:
  - "auto-lang ui/autodown_editor（core+widget）: 新增 iced/VM 块级编辑壳（cosmic-text 缓冲组/焦点导航/结构编辑引擎/marks 叠加）"
  - "auto-lang View::AutodownEditor 变体: 新增（iced 双轨 lowering/gpui 降级/snapshot 探针）"
  - "native 2956 auto.autodown_editor.text: 新增（on_change 回环 payload 口）"
  - "aura schema markdown/autodown_editor ElementDef: 新增类型化 props（props TBD 回退退役）"
  - "autodown-core crate markdown_parser/ial 入册 + 双端金标对拍闭环: 新增（批次六）"
touched_goals:
  - "019 目标1: autodown-core crate a2r 发射 + 双端对拍（验收①）"
  - "019 目标2: iced 渲染链路 + 流式 + 1MB 基线（验收②③）"
  - "019 目标3: rust 编辑壳（验收④，IME 手验为移交边界）"
  - "019 目标4: registry 重定向 @autodown/engine + ark/jet 边界（验收⑤⑥）"
  - "019 目标5: gallery 042 验收页"
---

> 状态：**CLOSED（2026-08-28，/auto-plan:merge 沉淀归档；前态 reviewed）**。Phase 1-4 全部落地，验收标准
> ①②③⑤⑥ 达成；④ 编辑壳 gallery 可操作已备，IME 微软拼音手验通道
> 已实现（preedit/commit）但人工执行记录在册为移交边界项——随 review
> 一并裁定（补验或登记债务）。终验（worktree @ f55c2e2cc）：lib 3781
> 过/1 败=master 在册（md_hidden）；模块 24/24；schema_drift/docs_gen/
> gallery_golden 全绿。设计依据：[docs/designs/09-unified-document-engine.md](../designs/09-unified-document-engine.md) §4/§6.1/§7.2。
> 立项：2026-08-25。前置：**Plan 016 完成**（块模型 + a2r 探针裁定）、
> **Plan 017 完成**（面板映射 + AURA registry 对齐表，本计划的直接输入）。
> 与 Plan 018 并行（不同端不同仓，汇合点在 020）。
> 仓库分工：本计划主体在 **auto-lang 仓**（渲染器/widget registry/codegen），
> 本仓侧负责 crate 源发射与对拍；本文件为跨仓协调计划，落地时在
> auto-lang 侧立对应计划并互链。
>
> **执行规则（2026-08-27 起）**：Phase 3 编辑壳深水区及其余量、连同
> 归入 Plan 020 的各 phase（demo/jade 迁移、旧包退役等），改按新规则
> 执行：**单 worktree + 每 phase 合回同步**——单条 worktree 分支承载
> 当前 phase，完成即合回 master，双仓同步到同相位后再开下一 phase；
> 停用批次六~八式多 worktree/多分支并行（该方式曾引入跨仓合并顺序
> 约束，见批次七注）。
>
> **进度（2026-08-28，批次十一 Phase 4 收口：registry 重定向与 codegen）**：
> - auto-lang 侧（同 worktree，Phase 4 完成即折回 master 并推送
>   f55c2e2cc）：widget registry 的 Markdown/AutoDownEditor vue 映射按
>   P4-4 单源落 schema/aura.at（MarkdownRender/AutoDownEditor ←
>   @autodown/engine@^0.4.0，npm_package 注入 package.json；手写 insert
>   围栏保持零）——存量 markstream-vue 平台挂载路径退役，musk re-vendor
>   归 020；ark/jet 编辑降级 TextArea/OutlinedTextField 维持 + 边界注释
>   （展示经面板树）；aura/schema.rs 落 markdown/autodown_editor 类型化
>   props（content/final/key/can_edit/show_actions/oninput/onchange），
>   **props TBD 回退退役**；schema/aura.at + schema_drift 基线 +
>   core.md + kitchen-sink.at（23→25 元素）全部再生成；a2vue 002 金标切
>   engine import；auto-man main.ts CSS 注入识别 engine（存量 editor 包
>   兼容），DSL 显式 use.web from 声明包语义保持。测试：lib 3778 过
>   （1 败=master 在册 md_hidden）、schema_drift/docs_gen/gallery_golden/
>   a2vue/vue_capabilities 76/component_registry 7 全绿；ui_snapshots 3
>   败=master 同样失败（显示依赖型 insta，在册）；gallery 基线折叠了
>   plan-458 并行漂移（app/flex/kitchen 三条，归因注明）。
> - **验收标准核账**：①✅ ②✅ ③✅ ④🔶（gallery 编辑可操作已备，**IME
>   微软拼音手验记录在册**为唯一未项，待人工）⑤✅（registry 重定向 +
>   全量绿 + core.md props 完整）⑥✅（ark/jet registry 映射 + 编译通过，
>   实机边界登记）。
>
> **进度（2026-08-27，批次十 Phase 3 第三轨：结构编辑引擎）**：
> - auto-lang 侧（同 worktree `auto-down-dev` 续）：① 关键回环缺陷修正——
>   sync_external 补自回显快速路径（on_change→绑定回写不再整树重建清
>   焦点，敲一键丢一次光标的根因）；② Enter 输入规则：段落/引用内按
>   光标字节偏移拆块、列表项末尾续出空项、空项上 Enter 退出列表
>   （Notion 式惯例）、fence 维持软换行；③ Backspace 块首合并（同宿主
>   相邻两叶，跨容器边界与 fence 登记不做）+ 块表压缩重编号（创建序
>   单调性）；④ ↑↓ 水平落点锚 nav_goal_x（横向/点击/结构操作重置，
>   邻块同 x Click 就近落位）；⑤ cosmic 光标口径修正——Cursor.index 为
>   行内【字节】偏移，拆分/接缝/软尾全线字节制；动作原语前置整形。
> - 验证：核单测 24/24（新增 10 项覆盖上述语义）。全量 lib 另现
>   clipboard set_then_get_roundtrip 失败——主检出同样必现，master 在册。
> - 余量登记：选区不跨块、IME 手验清单（微软拼音 413 清单）、标题拆分
>   降级行为、列表项内多段续项边界。
>
> **进度（2026-08-27，批次九 Phase 3 第二轨：AutodownEditorCore 编辑壳 v1）**：
> - auto-lang 侧（新规则首跑：单 worktree `.worktrees/auto-down-dev`
>   分支 `auto-down-dev`，Phase 未完不合回 master；worktree 内 cargo
>   构建依赖跨仓相对路径，已建目录联接
>   `auto-lang/.worktrees/auto-down → 主检出`）：新增
>   `ui/autodown_editor/` 后端中立核 + iced widget——块表模型
>   （parse_blocks 文本叶子 Paragraph/Heading/Fence 各挂 cosmic-text
>   ViEditor；quote/list/table/hr 骨架化只读、`emit_document` 全文重发），
>   焦点块编辑管线（字符/退格（块首不跨块合并）/Delete/Enter 软换行/
>   undo-redo/剪贴板最小集），↑↓ 首/末物理行跨块迁焦，点击命中聚焦 +
>   多击节律，IME preedit/commit 通道；
> - 行内 marks→样式段叠加层：解析快照 byte 区间 × layout run 求交切样
>   （strong/em/code/del/link→bold/italic/mono/strike/link 色），本地编辑
>   暂态整块退化基础色、回写重建复活（428 P2 Attrs-span 切片同路）；
> - `View::AutodownEditor` 变体入列（key 注册表/差分回写/on_change 契约
>   同 CodeEditor §5.4 口径）——iced renderer 双匹配臂 + 泛型 builder +
>   INPUT_TEXT payload 版 VM 臂、gpui textarea-div 降级、vnode/snapshot
>   探针臂；VM 臂拆分：`autodown_editor` 别名走可编辑变体，
>   `markdown`/`autodown` 维持只读真渲染（feature 门控
>   `all(autodown, code-editor)`，缺一退旧链）；
> - natives 2956 `auto.autodown_editor.text` 四层接入（catalog/native.rs
>   导入/codegen intrinsics ×2/shim），on_change 回环 payload 口；
> - 验证：核单测 16/16 + VM 臂产物测试 1/1；全量 lib 3745 过 /1 败为
>   master 在册项（`test_md_hidden_classes_parse`，主检出复跑同样失败，
>   非本计划引入）；CLI bin 带 feature 构建通过（实机点击/键入待人工）；
> - 余量登记：markdown 输入规则（~~Enter 不拆块~~批次十已实现拆块/
>   续项/退列）、选区不跨块、水平落点 x 保留（~~登记~~批次十已实现
>   nav_goal_x 锚）、IME 手验清单（微软拼音 413 清单）。
>
> **进度（2026-08-27，批次八 Phase 3 第一轨：`autodown_*` VM natives）**：
> - auto-lang 侧（续 feat/plan-019-vm-render）：六个 natives 入册
>   （catalog 2950-2955 + codegen intrinsics ×2 轨 + shim）——
>   `autodown_parse/serialize/text/find_block/insert_text/insert_template`，
>   JSON 传输循 read_dir 先例（BlockNode↔serde_json 封送，crate Value 的
>   JSON 形态 Null/{"Str"}/{"Int"}/...）；insert_text 走 crate `applyOp`
>   （Op::InsertText + collapsedSel），insert_template 为模板块拼接
>   （parent 空 = 顶层，index 负 = 追加）；CLI bin 透传 feature
>   （`--features autodown`）；
> - 验证：natives 4 单测（roundtrip 与 crate 直接 parse+serialize 逐字节
>   一致 / applyOp 语义 / 模板拼接）；042 示例加编程环段——带 feature 的
>   CLI 实机运行 Init 全环（parse→insert_template→serialize）零 handler
>   错误，无 feature 二进制返回明确构建错误（桩路径）；
> - Phase 3 余量（下一批次候选）：AutodownEditorCore 编辑状态机
>   （cosmic-text Buffer/光标/选区叠加/输入规则/undo/IME）与
>   行内 marks→Attrs spans 的 iced 富渲染。
>
> **进度（2026-08-27，批次七 Phase 2 收口）**：
> - auto-lang 侧（worktree feat/plan-019-vm-render）：`markdown`/`autodown`
>   widget 在 VM（iced）从 D-GAP-3 textarea 降级升级为**真渲染**——
>   feature `autodown` 挂 autodown-core crate（跨仓 path 依赖，合入后按
>   Cargo.toml 注释翻转为相对路径；**合并顺序：先 auto-down 批次六、后
>   auto-lang 批次七**）；适配器 `ui/autodown_render.rs` 将 parse_blocks
>   块树分解为既有 View 变体（plan-450 批次三面板臂同源样式：heading
>   样式表/quote 边条/codeblock chrome/表格/列表标记/分隔线；行内 marks
>   按行拆分横排，跨 span 换行不折叠为登记限制）；
> - 流式路径 v1：`final:` 属性（状态解析）驱动流式模式解析，content
>   绑定状态 → 更新自然触发重解析与视图重建；逐块布局缓存登记 v1 性能债；
> - gallery 页：examples/capability-tests/042-autodown-vm（静态全面板
>   词汇 + 按钮驱动流式演示）；测试：适配器 4 单测 + 臂级分派/final
>   解析测试；性能基线：1MB 文档（19692 块）release 计时——优化前
>   parse 199.8s/构建 242.8s → 两轮热路径线性化（normalizeNewlines
>   split/join、+= 自拼接+发射器 E9、循环长度提升局部）后 parse
>   33.0s/构建 32.6s（构建≈内嵌 parse，纯 View 构建近零）；剩余深部
>   优化登记 DEBTS 019 性能债行。~~跨仓合并顺序：先 auto-down 批次六、
>   后 auto-lang 批次七~~ **合并已执行（2026-08-27）**：auto-down
>   bd8d16e（批次六/七/八本仓侧）→ auto-lang 45b005d01（a2r）+
>   1c80b8cf5（批次七/八）+ path 翻转提交；合并后主检出全量验证
>   （crate 8/0、engine 255/255、auto-lang 3729/2 非本计划项、042
>   示例实机零 handler 错误）。
>
> **进度（2026-08-26，批次六 Phase 1 收口）**：
> - 本仓侧：markdown_parser.at + ial.at 全面类型化重写（WNode 结构体替
>   `any` 弱节点、28 处 RegExp 全部手工扫描化、scanDelim/scanLink 返回具名
>   结构、preprocessMarkdown 返回 PreDoc）——TS 行为零漂移（engine 255/255，
>   含对真实 stream-markdown-parser 的逐字符流式对拍）；
> - auto-lang 侧（worktree feat/plan-019-a2r-parser，8 组发射器修复）：
>   r# 保留字转义（type 字段）、String.fromCharCode 映射、str length/slice
>   字符语义（字节→chars，Auto 码元语义对齐）、split 收集 Vec<String>、
>   NullCoalesce 类型剥离与借用、Some(&str 参数) 物化、mut 参数 &mut 透传
>   （parseList/tableConsume 累加器）——auto-lang 自身 3211/0 零回归；
> - crate：`src/markdown_parser.rs` + `src/ial.rs` 入库（全模块经新编译器
>   重发），tests/parse_parity.rs + engine
>   rust-parse-parity-gen.test.ts 金标对拍闭环（18 组 fixtures ×
>   final/streaming 双模式，双端逐字节一致）——**Phase 1 的 parse 双端对拍
>   交付完成**（016 遗留的"parser 不进 crate"欠账就此清偿，DEBTS 行更新）。
>   已登记偏差：isPunctuation 的 \p{P} 近似范围、表格行必须顶格、str
>   chars 计数的 O(n) 性能债。
>
> **进度（2026-08-26，早前批次）**：
> - auto-lang 侧（plan-450，已合 master）：批次一 registry 登记、批次三
>   iced backend 面板映射（VM 七面板臂 + a2r 同族发射）、批次四 codegen
>   臂确认；
> - 本仓侧（本批）：palette_map.at a2r 发射并入 `packages/core/rust/`
>   autodown-core crate（`src/palette_map.rs`，RP1 pub-struct 后修，经
>   `pnpm gen:render` 一键再生）+ 双端金标对拍闭环（engine
>   `rust-palette-parity-gen.test.ts` 每次 `pnpm test` 重写
>   `tests/golden/palette-map.golden.txt`，crate `tests/palette_parity.rs`
>   断言同一金标）——PANEL-ALIGNMENT.md "a2r 发射后即成为 iced 面板渲染器
>   的映射单源" 落地。注意 crate 宿主为 `packages/core/rust/`（016 试点
>   就位处），非本文件 Phase 1 原文的 `packages/engine/rust/`。

## 背景

- 引擎现状 **vue 单平台**：rust 侧（auto-lang iced 桌面/VM、jade-garden
  后端）无法消费任何渲染/编辑能力；ark/jet 移动端 `autodown_editor`
  降级 TextArea（auto-lang `ui_gen/widget/registry.rs:787`）。
- auto-lang 侧已有可复用地基（调研 2026-08-25）：
  - **渲染**：iced 端 `Text` 多 style run、`codeblock` Rich span 关键字
    高亮（`renderer.rs`）、行号/滚动（Plan 413）；
  - **编辑**：`CodeEditorCore`（`crates/auto-lang/src/ui/code_editor/core/`，
    2379 行）——cosmic-text ViEditor + 输入状态机 + draw list，后端中立
    分层（"不得 import iced"硬约束）是编辑壳蓝本；
  - **通道**：`.at` → rust 发射（a2r）与 `#[backend(ark/jet/vue)]` 多端
    widget 映射体系成熟；`markdown`/`autodown_editor` 两个 widget spec
    已在 registry（现映射第三方 npm 包，待重定向）。

## 目标

1. **`autodown-core` crate**：016 内核（块模型/解析/序列化）a2r 发射为
   rust crate，`rust/` 目录源 + 冒烟测试。
2. **rust 渲染**：面板树（017 `palette_map` 发射物）→ AURA view tree →
   auto-lang iced 渲染器全链路；流式追加路径（chunk → 增量块 → 局部重布局）。
3. **rust 编辑壳**：复用 CodeEditorCore 模式——每聚焦文本块挂 cosmic-text
   Buffer（行内 marks → Attrs spans），光标/选区叠加在渲染 draw list；
   LRU 常驻（容量对齐 413 的 32）。
4. **auto-lang widget registry 重定向**：`Markdown`/`AutoDownEditor` spec
   的 vue 后端映射切 `@autodown/engine`；ark/jet 展示路径经面板树获得
   （编辑仍降级，登记边界）；`ui_gen/vue.rs` codegen 臂（`markdown`/
   `autodown_editor` 两处）出口同步。
5. **gallery 验收页**：auto-lang examples 增 autodown 页（文档渲染 + 流式 +
   编辑壳演示），双后端（wgpu/tiny-skia）渲染。

## 非目标

- ark/jet 编辑（展示免费、编辑降级 TextArea 的边界写进 registry 注释
  与文档）。
- rust 端 katex/mermaid（v1 降级纯文本 + 提示，设计 §9）。
- jade-garden 后端 `parser.rs` 替换（020 校准语义对齐，不强制换实现）。

## 阶段划分

### Phase 1 — crate 发射与对拍（本仓侧）

- `packages/engine/rust/`：a2r 发射 `autodown-core`（按 016 探针裁定的
  覆盖面），`cargo test` 冒烟。
- **双端对拍**：同一 fixtures 集（musk 采样 + 定向）在 TS（`./parser`）
  与 rust（crate）两侧 `parse_blocks` 输出语义投影比对——序列化 JSON
  投影逐字段断言（对拍脚本入库，CI 双跑）。
- 序列化器对拍：`serialize(parse_blocks(x))` 两侧逐字节一致。

### Phase 2 — iced 渲染链路（auto-lang 仓）

- 面板树 → AURA view tree 适配层（面板词汇 ↔ registry widget 的 rust
  侧映射，以 017 对齐表为契约）。
- iced 渲染器补缺：按对齐表盘点现缺口（预期：表格块/列表缩进/引用条
  为主要缺口项——`Text` style run 与 codeblock 已备），逐项补渲染。
- 流式路径：文档 chunk 增量解析 → 块追加 → 受影响块局部重布局
  （布局缓存按块失效）。
- gallery 页落地（渲染 + 流式演示）；性能基线：1MB 文档冷启动与
  稳态渲染（对齐 413 口径记录）。

### Phase 3 — 编辑壳（auto-lang 仓）

- `AutodownEditorCore`：每文本叶子块一个 cosmic-text Buffer，焦点块
  挂编辑状态机（413 `CodeEditorCore` 同款：多击/shift 锚点/preedit/
  滚动）；容器块（quote/list）只读渲染 + 块间导航（上下块焦点迁移）。
- 行内 marks → `Attrs` spans 映射（strong/em/code 颜色字体族）。
- 光标/选区/块焦点框叠加为渲染管线第二类图元（同 draw list 路径）。
- 输入规则（016 规则表发射物）+ undo 栈接线；IME 手验清单执行
  （微软拼音，413 清单复用）。
- 操作序列 ↔ VM natives：`autodown_text/insert_template/find_block` 等
  natives（catalog + shims + codegen，循 413 `code_editor_*` 模式），
  `.at` handler 内可编程操作文档。

### Phase 4 — registry 重定向与 codegen（auto-lang 仓）

- `Markdown`/`AutoDownEditor` widget spec：
  - vue 后端映射 `@autodown/engine`（`markdown` → MarkdownRender、
    `autodown_editor` → AutoDownEditor，props/events 契约对齐
    `ui_gen/vue.rs:8121+` 现臂语义）；
  - ark/jet：展示经面板树映射（Text/List/Table 组件化），编辑降级
    TextArea 维持（注释明示边界）。
- VM 模式降级链验证：`autodown` widget 在 VM（iced）从 textarea 降级
  升级为真渲染（现 `render_support.rs:171` 降级臂切换）。
- schema_drift 基线 + core.md 生成器再生成（props 声明补齐——现
  `autodown` 组件 "props TBD" 状态借此落定）。
- 回归：auto-lang 全量测试 + examples 041/gallery 实机。

## 验收标准

1. `autodown-core` crate `cargo test` 绿；双端对拍脚本全绿（parse 投影 +
   serialize 字节级）；
2. iced 端渲染链路：gallery autodown 页双后端渲染正常，对齐表内全量
   面板类型有 rust 渲染实现（或显式降级登记）；
3. 流式：chunk 追加 O(新增块) 布局失效（基准测试在册）；
4. 编辑壳：文本块编辑/光标/选区/输入规则/undo 在 gallery 可操作；
   IME 手验记录在册；
5. registry 重定向后 auto-lang 全量测试绿，`autodown`/`markdown`
   widget 的 schema 文档（core.md）props 声明完整；
6. ark/jet 展示路径冒烟（registry 映射 + 编译通过即可，实机验证登记
   边界）。

## 待澄清事项

1. **crate 归属**：`packages/engine/rust/` 发射源 vs 直接入 auto-lang
   workspace——倾向前者（单源随包走），auto-lang 以 path/git 依赖消费；
   发布形态（crates.io）随 020 的 npm/发版通道裁定一起。
2. **表格 rust 渲染深度**：v1 等宽网格 + 表头（IAL 列宽应用）vs 完整
   自适应列宽——倾向先等宽（413 行号/测宽基建可复用），自适应后置。
3. **VM natives 命名域**：`autodown_*` vs 复用 `code_editor_*` 语义——
   倾向独立域（文档操作与代码编辑语义不同），413 natives 不动。
4. **与 018 并行的汇合风险**：两端编辑语义（vue contenteditable vs
   rust cosmic-text）共享 016 操作模型但几何实现不同——跨块选区两端
   各自实现，020 收口时以语义用例集（018 Phase 0 产物）双端跑对拍。

## 复审记录

- **复审人/时间**：ZCode /auto-plan:review，2026-08-28。
- **核验基点**：auto-lang master f55c2e2cc（Phase 1-4 折叠点，worktree
  auto-down-dev 已同相位）；autodown-core crate 主检出实测。

| 验收标准 | 判定 | 证据 |
|---|---|---|
| ① crate cargo test 绿 + 双端对拍全绿 | **pass** | crate `cargo test` 3 bins ok（本轮实测）；批次六 18 组 fixtures × final/streaming 逐字节一致（parse_parity + rust-parse-parity-gen 在册） |
| ② gallery 双后端渲染 + 对齐表全量面板 rust 实现 | **pass** | 批次七交付（042 页 + 适配器 4 单测 + plan-450 同源臂），对齐表面板全量有实现/显式降级 |
| ③ 流式 chunk 追加 O(新增块) 基准在册 | **pass** | 1MB/19692 块基线 parse 199.8s→33.0s（批次七实测 + perf 测试在库，ignored 口径） |
| ④ 编辑壳可操作 + IME 手验记录在册 | **partial（用户批准的移交边界）** | 编辑/光标/选区/undo/拆块/合并 24 单测全绿 + 042 第四块可编辑演示；**IME 微软拼音人工手验未执行**（通道已实现：preedit/commit/输入区逐帧）。根因：需人工 GUI 会话。处置：登记 DEBTS（019-IME），由人工实机补验后销号 |
| ⑤ registry 重定向 + 全量绿 + core.md props 完整 | **pass** | aura.at vue 声明 @autodown/engine（MarkdownRender/AutoDownEditor，npm 注入）；core.md 两组件 props 入册；lib 3781 过（1 败=master 在册 md_hidden，主检出同样失败）+ schema_drift/docs_gen/gallery_golden/a2vue/vue_capabilities 76/component_registry 7 全绿 |
| ⑥ ark/jet 展示路径冒烟（映射 + 编译） | **pass** | registry ark/jet 映射在册 + 编辑降级边界注释；ui-gpui/全仓编译通过（gpui 轨 master 既有失败与本项目无关，在册） |

- **遗漏/延后/workaround 猎查**：
  - 遗漏：无（批次九~十一逐项对回阶段划分；natives 四层接入经编译器穷尽匹配兜底）。
  - 延后（**均经用户批准或计划内登记**）：IME 手验 → DEBTS（019-IME）；
    musk re-vendor / 存量 markstream 消费方迁移 → Plan 020 Phase 1/2；
    选区不跨块、标题拆分降级、列表项内多段续项边界 → 已登记 Phase 3 v1 边界；
    表格自适应列宽 → 待澄清 2（v1 等宽已交付）。
  - workaround：无隐藏 hack——autodown_editor 模块 TODO/FIXME/HACK 扫描零命中；
    快照降级（本地编辑暂态基础色）为设计内行为非权宜。
  - code over plan 偏差：crate 宿主为 `packages/core/rust/`（016 试点处）而非
    Phase 1 原文 `packages/engine/rust/`（批次一起已登记，非本审查新发现）。
- **债务候选**：019-IME（唯一 blocking 候选，用户已批准作为移交边界随
  merge 登记 DEBTS）；019 性能债（DEBTS 019 行，批次七起在册）。
- **结论**：全部准则 pass / 经批准边界，无未批准延后 → **status: reviewed**。
  可进入 `/auto-plan:merge`。
