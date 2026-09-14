# 提案 066 — auto-lang 原生组件外部注册 SPI（Native Widget Registry）

状态：**已裁定开工并实施（2026-09-14，PLAN-066）**——彼仓分支
`auto-down-dev`（worktree `D:/autostack/.wt/auto-down-066/auto-lang`，基线
master 8aeb8150e9）commits 72fd9d70c（T1/T2）+ 31a2a1035（T3）；全量红集
新红=0；jade vm-smoke 16 臂 ×2 全绿；折 master 随 merge 通道。实施记录见
docs/plans/066-auto-lang-native-widget-spi.md §4/§9。
关联：jade-garden/front/desktop/README.md §8 提案⑦；DEBTS.md 066 行；
docs/plans/attachments/063-auto-lang-transfer.md（跨仓 worktree 通道先例）；
desktop/README §1「Plan 446 原生编辑器」行
日期：2026-09-14（入档）

## 0. 一句话

给 auto-lang 的 VM/iced 渲染栈立一个**原生组件注册 SPI**——`View` 透传变体 +
name→factory 注册表 + 快照/事件配套面——把 `autodown_editor` 从硬编码内置臂
迁出为**第一个外部注册组件**，并补齐 stream 渐进臂（对齐本仓 engine 的
view/edit/stream 三合一契约）；terminal / code_editor / video 同款硬编码件后
续按件受益。

## 1. 背景与动机

auto-down 仓的 `@autodown/engine` 已定型为 view/edit/stream 三合一单包
（BlockComponent 三槽契约 plan 023 + stream 三态 plan 032 + 块家族 widget
033-038 收官，见 `autodown/packages/engine/ARCHITECTURE.md`）。桌面轨消费它的
方式是**原生重实现**：auto-lang `src/ui/autodown_editor/`（Plan 019 Phase 3 /
PLAN-048 收口），块模型走跨仓 path 依赖 autodown-core crate（本仓
`autodown/packages/engine/rust`）。

问题在**接入形态**：这条原生臂是"最深度内部注册"——专属 View 枚举变体 +
专属硬编码派发臂 + 专属快照臂。任何跨仓组件要进渲染库，都得走"改 auto-lang
源码加专属变体"这条路；组件库没有"外部注册"这个类别。本提案主张把注册层抽
出来：宿主立 SPI，组件（含 autodown_editor）作为外部 crate 注册进场。

选 auto-lang 仓落地而非 auto-ui 仓的依据：jade 桌面现役渲染路径是
`auto run -r vm` → auto-lang `src/ui`（iced），auto-ui 仓与 auto-lang 无
Cargo 依赖关系（平行参考框架，其 node_converter/view enum 为同构闭集问
题）；且跨仓依赖通道已有先例——`autodown-core` 即以可选 path 依赖进 auto-lang
（Cargo.toml:132），缺的只是**注册/派发层**。

## 2. 现状证据（2026-09-14 实查）

### 2.1 auto-lang 侧（现役路径，本提案落点）

| 面 | 证据 | 含义 |
| --- | --- | --- |
| 派发硬编码 | `crates/auto-lang/src/ui/aura_view_builder.rs:1727/1731/1734/1887`（code_editor / terminal / autodown_editor / video 各自字符串臂；untyped + typed 双站点 3375-3382 同构，此类臂全文件 38 处） | 富组件全是编译期闭集 |
| View 闭集 | `crates/auto-lang/src/ui/view.rs:428` `pub enum View<M>`；`:591` 专属变体 `AutodownEditor { key, value, is_final, on_change, on_focus, placeholder, style }` | 新组件 = 新变体 = 改彼仓源码 |
| 快照穷尽 match | `crates/auto-lang/src/ui/snapshot_builder.rs:254` 专属臂 → `UiNode { kind: "AutodownEditor", ... }` | AutoUI MCP 测试通道按变体枚举——SPI 必须带快照配套，否则外部件对 MCP 断言不可见 |
| 现有注册表只管 .at 件 | `crates/auto-lang/src/ui/widget_registry.rs`：`WidgetRegistry` 只登记 VM 解释型 `AuraWidget`（.at widget 定义）；其 `get()` 的折叠兜底（Plan 435 P8-6）注释明示派发序="调用方先查内置臂，折叠兜底只在未知 tag 分支生效" | 原生组件无注册通道；但"内置臂 → registry 兜底"的派发序已有雏形 |
| stream 豁免 | `aura_view_builder.rs:33`：「`autodown` 只读臂与 `autodown_editor` 编辑臂：streaming 恒按 final（豁免保留）」 | 原生臂缺 TS 侧 032 三态渐进面 |
| 跨仓依赖先例 | `crates/auto-lang/Cargo.toml:99` `autodown = ["ui-iced", "dep:autodown-core"]`；`:132` `autodown-core = { path = "../../../auto-down/autodown/packages/engine/rust", optional = true }` | "外部 crate + feature 门控"通道已存在 |
| 原生件分层良好 | `crates/auto-lang/src/ui/autodown_editor/mod.rs`：core.rs 禁 iced import（硬分层约束）；widget.rs 是唯一 iced 依赖点；feature 门控 `autodown × code-editor` | 具备拆出为独立注册件的结构条件 |

### 2.2 auto-ui 仓（同构问题，本提案不在彼仓落地，登记备考）

- `crates/auto-ui/src/node_converter.rs:78-101`：13 种内置 kind 硬编码 match，
  未知 → `UnknownKind`；
- `crates/auto-ui/src/view.rs:223` `View<M>` 闭集 enum；
- Plan 011 `EventRouter.register` 是组件**实例**级注册（动态解释器运行面），
  非组件**类型**级——不构成扩展点。

### 2.3 TS 三合一引擎与 Rust 渲染库的边界（防复议）

`@autodown/engine` 的三槽契约本体是 DOM/浏览器世界的 Vue 组件面（SFC +
panel registry + slash 菜单），**不可能直接"注册"进 Rust 渲染库**。两个世界
共享的是单源模型：`.at`（`auto/parser` / `auto/render`）+ a2r/a2ts 双发射 +
金标对拍（parse_parity × parity.ad、artifact_hash 双端钉死）。桌面端注册进去
的是**原生形态**（autodown-core 块模型 + 原生 widget factory），不是 TS 组件
实例。

## 3. 提案内容（SPI 四件套）

### 3.1 `View::Custom` 透传变体

```rust
// ui/view.rs 新增（示意；字段形状由彼仓按现有 events/props 面裁定）
Custom {
    name: String,                     // 组件名（注册键）
    props: Vec<(String, Value)>,      // 属性透传（VM 值面）
    events: Vec<(String, Msg)>,       // 事件→消息，沿用现有 events 通道
    style: Option<Style>,             // 统一样式面，与既有变体同待遇
},
```

- **为什么不是 `Box<dyn NativeWidget>`**：View 要求 `Clone + Debug`；更关键
  的是 AutoUI MCP 快照通道要求视图树可枚举——`name + props` 透传保住快照明
  文面（外部件在 snapshot 里 `kind = name`、props 在场），Box<dyn> 会把测试
  通道打盲（autoui_snapshot / autoui_action 断言不可用）。

### 3.2 NativeWidgetRegistry（name → factory）

```rust
// 示意；factory 签名由彼仓按 iced renderer 现状裁定（props → Element）
pub struct NativeWidgetRegistry { /* name → factory(entry) */ }
```

- 注册时序：feature 门控模块在 session/app 装配期 register——`autodown`
  feature 注册 autodown_editor factory；后续 terminal / code_editor 同款迁入；
- 归属裁定项（彼仓）：全局 once_cell vs session 级（影响多窗口 / 热重载语义）；
- 门检配套：注册清单可 dump（如 `AUTOUI` 面 native widget list），desktop 侧
  门检可对拍（ext-registry-gate 同纪律）。

### 3.3 派发序（保持现状语义不弱化）

内置硬编码臂（**零改动**）→ NativeWidgetRegistry（原生外部件，含迁移件）
→ AuraWidgetRegistry（.at 解释件，现行）→ 折叠兜底（P8-6）→ 未知 tag 兜底
（文本占位，现状不变）。即"原生优先"的现行语义在 registry 化后保持；未注册
名的行为与 master 逐字节一致（快照对拍验收）。

### 3.4 配套面

- `snapshot_builder`：`View::Custom` 臂 → `UiNode { kind: name, props,
  actions: events }`——外部件对 MCP 驱动/断言可见；
- iced renderer：`Custom` lowering = 查注册表取 factory → `Element`；未注册
  回落未知 tag 兜底；
- 事件路由：沿用 AuraNode events → DynamicMessage / Typed msg 既有通道。

## 4. 首迁对象：autodown_editor

1. **臂迁移**：`aura_view_builder.rs:1734`（untyped）/ `:3382`（typed）两处
   字符串臂改经注册表查得 factory；行为保形。
2. **`View::AutodownEditor` 变体处置**（彼仓裁定，两案）：
   - 案 a（建议起步）：变体保留为 sugar——registry factory 内部仍产
     `View::AutodownEditor`，快照 kind 不变，vm-smoke 断言面零改动，最小
     diff；
   - 案 b（终态可选）：变体并入 `Custom`（kind = "autodown_editor"），快照
     字段形状等价迁移。
3. **stream 渐进臂（本提案的实质增量，对齐三合一的验收项）**：现状
   "streaming 恒按 final"豁免（aura_view_builder.rs:33）。对齐 TS 侧 032 三
   态契约——未闭合 = 安全降级（段落字面/行构造）、开放 fence = loading 等高
   骨架、闭合 = 终态，`is_final` flag 驱动且 DOM（快照）一致。原生侧即
   `is_final = false` 通道的 loading/未闭合渲染语义，登记于 autodown_editor
   的 PLAN-048 余量台账同族。

## 5. 边界与不做

- TS/Vue SFC 组件面不注册（§2.3 边界）；共享 = `.at` 单源 + a2r 发射物；
- "外部"语义 = **Cargo 可选依赖的外部 crate + 运行时注册**（先例：
  autodown-core path 依赖）；不做 dylib 动态插件加载；
- iced 后端先行；gpui / aura 平行栈与 auto-ui 仓的同构改造不在本提案
  （auto-ui 仓若要对齐另单）；
- 既有内置件（terminal / code_editor / video）语义零变化；其 registry 化迁
  移为后续独立项，不在首迁范围。

## 6. 建议验收（门纪律对齐 PLAN-063 / PLAN-622）

1. **等价性**：autodown_editor 经注册表注册后，jade desktop vm-smoke 16 臂
   全绿 ×2（不弱化）+ 编辑器流五断言（desktop/README §5 slice 4 口径）；
2. **保形**：未注册名行为与 master 逐字节快照对拍（未知 tag 兜底语义不变）；
3. **stream 三态**：MCP snapshot 可断言 loading 骨架 / 未闭合降级 / 终态翻转
   （`is_final` 通道，新增断言臂）；
4. **TDD**：新测先红后绿；彼仓 lib 全量红集 ⊆ master 基线（063 转介单口径）。

## 7. 实施与验证方式

- **彼仓 worktree 实施**：先例 = PLAN-063（`D:/autostack/.wt/auto-down-063/
  auto-lang`，基线 master a3d53cbfc，T-04 系列折回）；PLAN-622（auto.list
  splice e3d17db71、捕获槽位 7e2fd920a 折 master）。本提案实施计划建议取号
  PLAN-066，起步时记录 worktree 基线 commit；
- **本仓侧回归门**：jade `desktop/vm-smoke.mjs`（现 16 臂）+ AutoUI MCP 驱动
  通道（probe_driver_* 先例）；实机验收口径沿 desktop/README §6 运行方式；
- 实施时若 SPI 面与快照/事件通道发生本文未预见的行为变化，按门纪律回退并
  转介（064 ⑥残余接缝同款流程）。

## 8. 证据索引

| # | 证据 | 位置 |
| --- | --- | --- |
| 1 | 派发硬编码臂 ×38 | auto-lang `src/ui/aura_view_builder.rs:1727-1887, 3375-3525` |
| 2 | streaming 恒按 final 豁免 | 同上 `:33` |
| 3 | View 闭集 + 专属变体 | auto-lang `src/ui/view.rs:428, :591` |
| 4 | 快照专属臂 | auto-lang `src/ui/snapshot_builder.rs:254` |
| 5 | .at 件注册表与派发序注释 | auto-lang `src/ui/widget_registry.rs:9-19, 53-78` |
| 6 | 跨仓 path 依赖先例 | auto-lang `crates/auto-lang/Cargo.toml:94-99, :132` |
| 7 | 原生件分层（core 禁 iced / widget 唯一点） | auto-lang `src/ui/autodown_editor/mod.rs` |
| 8 | 三合一契约 | auto-down `autodown/packages/engine/ARCHITECTURE.md`（023 三槽 / 032 三态 / 033-038 家族） |
| 9 | auto-ui 仓同构闭集 | auto-ui `crates/auto-ui/src/node_converter.rs:78-101`、`view.rs:223` |
| 10 | 桌面现役路径与原生编辑器行 | auto-down `jade-garden/front/desktop/README.md` §1/§6 |
