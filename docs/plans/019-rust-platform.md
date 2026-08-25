# Plan 019：rust 平台落地（autodown-core crate + iced 渲染 + 编辑壳）

> 状态：**草案（待立项）**。设计依据：[docs/designs/09-unified-document-engine.md](../designs/09-unified-document-engine.md) §4/§6.1/§7.2。
> 立项：2026-08-25。前置：**Plan 016 完成**（块模型 + a2r 探针裁定）、
> **Plan 017 完成**（面板映射 + AURA registry 对齐表，本计划的直接输入）。
> 与 Plan 018 并行（不同端不同仓，汇合点在 020）。
> 仓库分工：本计划主体在 **auto-lang 仓**（渲染器/widget registry/codegen），
> 本仓侧负责 crate 源发射与对拍；本文件为跨仓协调计划，落地时在
> auto-lang 侧立对应计划并互链。

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
