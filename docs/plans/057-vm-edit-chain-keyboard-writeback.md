---
plan_id: PLAN-057
status: reviewed
feature_name: VM 编辑链路——真实键盘回写（048）+ doc editor MCP 逐键/拖拽合成通道（055 D2）
author: [zhaopuming]
created_at: 2026-09-07
updated_at: 2026-09-07

supersedes_spec_components:
  - "P048-3: 编辑壳回写链修订——dynamic 臂 on_change 发布 input_value:Some(全文)（textarea 先例），INPUT_TEXT 解释器路径死写移除，generic 臂/ui_gen 路径原样"
  - "P055-3: 编辑臂 MCP 通道扩面——key_press/editor_drag 合成 action + autoui_editor_state 只读探针（原仅 click/type_text/clear）"
new_spec_components:
  - "P057-1: 编辑器回写发布契约（编辑壳 on_change 消息必携全文 input_value:Some + sync_external 回声守卫：曾 emit 过的值不整树 rebuild）"
  - "P057-2: 编辑壳 MCP 合成通道（keyspec v1 词表=13 命名键+c:X、拖拽坐标序列 MousePressed→Dragged×n→Released、keyed 寻址载荷 sk␟widget␟event␟spec）"
touched_goals:
  - "P048-2: VM 编辑行为收尾——真实键盘回写断链闭（048 引擎债销号）"
  - "P055-2: VM 编辑臂表格编辑器——cell 逐键/列宽拖拽净窗 e2e 通道补面（055 D2 销号）"

current_step: 10
total_steps: 10
---

# [PLAN-057] VM 编辑链路——真实键盘回写（048）+ doc editor MCP 逐键/拖拽合成通道（055 D2）

## 变更摘要

auto-lang `renderer.rs` dynamic 臂 DocEditor/CodeEditor 两处 `on_change` 闭包按
textarea `wire_textarea_actions` 先例改为发布 `input_value: Some(text)` 的新消息
（修复真实键盘 → `.App.Edit` → `state.content` 断链，DEBTS 048 行 / 转介单③）；
mcp_server 新增 `key_press` / `editor_drag` 两合成 action（`__mcp_key` /
`__mcp_drag_ade` 拦截臂，`core.handle_input` 直调 = `__mcp_click` 同信任路径，
DEBTS 055 D2 行）；auto-down 侧 vm-smoke 增逐键与拖拽两断言组；台账三处收口。
vue 轨零改动（engine/demo src 不动，仅 vm-smoke.mjs）。

## 目标

1. **真实键盘编辑回写 state.content**（048）：编辑壳内真实键盘输入（合成键/
   物理键同路径）后 `on_change` 发布的消息携带全文 → 解释器
   `on_with_input_for(widget, "Edit", Some(text))` → `.Edit(str)` 收到实参 →
   `.content` 更新 → 右栏 renderer pane 重渲染。
2. **doc editor MCP 逐键/拖拽合成通道**（055 D2）：净窗可 e2e 驱动编辑壳的
   逐键键入（cell 逐字编辑）与鼠标拖拽（表格列宽拖拽、拖选）——不再只靠
   rust 单测覆盖。
3. 两面互为验收仪器：逐键合成走 core 真实按键处理 → 触发（1）修复后的
   发布链——vm-smoke 一组断言同时钉死通道与回写。

## 架构方案

**面 A 回写修复（auto-lang renderer.rs，解释器 dynamic 臂）**

断链机理（立项期代码走查实测，执行期以先红后绿复核）：

- DocEditor dynamic 臂闭包 `renderer.rs:18757-18762`：写 `INPUT_TEXT` 线程局部
  + 返回预构造 `msg.clone()`——其 `input_value` 恒 `None`；
- 主派发 `renderer.rs:12887` → `dynamic.rs:1238 on_with_input_for(widget,
  "Edit", None)`；
- `dynamic.rs:1299-1330` 仅在 `input_value: Some` 时把文本作为 handler 首实参
  （`.Edit(str)` 的 str）——`None` 则无参调用，`.content` 永不更新；
- `INPUT_TEXT` 在解释器路径**零消费**（唯一读者 `last_input_text()`
  `renderer.rs:1067`，调用方仅 ui_gen 生成物 `ui_gen/rust.rs:1241`）——闭包里
  的写入是解释器路径上的死代码；
- 对照正面先例：textarea `wire_textarea_actions`（`renderer.rs:585-672`）每次
  动作构造 `IcedMessage { widget, event, input_value: Some(text) }` 新消息——
  textarea 真实键盘因此工作；
- MCP `type_text` 正常的原因：VM 模式经独立订阅把 ActionMessage 直转
  `IcedMessage`（input_value: Some，`renderer.rs:19623-19634` 注记自证）。

修复：DocEditor（:18757-18762）与 CodeEditor（:18702-18708，同款闭包=同族
潜伏，同修）两处 dynamic 臂闭包改 textarea 先例——发布时构造
`input_value: Some(<编辑器全文>)` 的新消息。**generic 臂不动**
（`build_autodown_editor_generic` :17960-17962 /
`build_code_editor_generic` :18009-18010）——ui_gen 生成物路径靠
`last_input_text()` 消费，语义保持。

**面 B MCP 合成通道（auto-lang mcp_server.rs + renderer.rs 拦截臂）**

- `key_press` action：payload `"storage_key␟keyspec"`，keyspec v1 词表 =
  13 命名键（left/right/up/down/home/end/pageup/pagedown/enter/backspace/
  delete/escape/tab，映射 `EditorKey`，`code_editor/core/mod.rs:73-90`）+
  `c:X` 单字符（→`Char(char)`）；修饰键后置（见待澄清③）。
  拦截臂 `__mcp_key`：`core.handle_input(DocInput::KeyPressed { key, text,
  modifiers: none })` 直调（`with_font_system` 包裹，`__mcp_click` :11608-11650
  同构）→ `out.text_changed` 时按既有发布链发 `on_change` 消息（带
  `input_value: Some`——经面 A 修复后的同一形态）。
- `editor_drag` action：payload `"storage_key␟x0,y0;x1,y1;..."` 序列 →
  `MousePressed → MouseDragged×n → MouseReleased` 逐段 `core.handle_input`
  （`DocInput` 三变体在 `autodown_editor/core.rs:343-368`；覆盖 055 表格列宽
  拖拽与 048 T3 拖选面）。
- action 枚举与工具描述同步（`mcp_server.rs:598/609`）。

**面 C 验收门（auto-down vm-smoke.mjs）**

- 新断言组两组，插入在现组 7（主题首帧）之后、组 8（主题翻转，必须居末）
  之前执行（净窗纪律，组 8 注记在册）：
  - **[group9] 逐键链路**：经 `key_press` 逐键输入短文档（≥5 字符 + Backspace
    修正 + Enter）→ `autoui_state content` 反映全部编辑 → 右栏重渲染 → 与
    `type_text` 打同一文档的终态逐字节相等（等价性双断言）；
  - **[group10] 表格列拖拽**：复用组 6 表格文档，`editor_drag` 拖列边界序列 →
    列宽变化断言（state 读数或几何）。
- 逐键组无门控、确定性失败不吃 049 重试（组 7 先例口径）。

**同构代证口径**：真实物理键盘手验不构成验收门——逐键合成与物理键共用
`DocInput::KeyPressed` 同一 core 处理路径（043 T9/T10 D2 签核先例：以同构
消息合成通道代证）。可选披露臂：净窗人工敲键复核留证（执行则附 PNG/state）。

## 技术栈

- Rust（auto-lang `crates/auto-lang`）：`ui/iced/renderer.rs`、`ui/dynamic.rs`
  （只读参照）、`ui/mcp_server.rs`、`ui/autodown_editor/core.rs`（只读参照）。
- Node（auto-down `autodown/demo/auto/vm-smoke.mjs`）：MCP 客户端既有形态
  （callTool/autoui_state/screenshot）。

## 需求分析与背景调查

**来源债**：DEBTS.md 048 行（真实键盘编辑不更新 .at state.content，🟡 引擎债，
转介单③同源——「真实键盘是用户主路径，无绕道」）；055 D2 行（doc editor MCP
通道缺逐键/拖拽合成事件，📋 测试通道——「回写链先通，通道扩面才有完整验证
价值，宜合一张编辑链路计划」）。转介单
`docs/plans/attachments/052-auto-lang-transfer.md` 条目③给出建议验收：真实键盘
输入 N 字符 → `autoui_state content` 反映（可加 vm-smoke 组：物理键通道 vs
type_text 同断言）——本计划按此落为 [group9]。

**消费面在位性**（立项期实测）：

- demo 接线已存在：`autodown/demo/auto/src/front/app.at:251`
  `oninput: .Edit`（`.Edit(str)` handler 声明 :103，`.content` 初值 :126）——
  .at 侧零改动；
- 合成面在位：`DocInput` 枚举含 `KeyPressed/MousePressed/MouseDragged/
  MouseReleased`（`autodown_editor/core.rs:343-368`）；core 按键处理
  `:707` 起（text_changed 输出位驱动发布）；
- 编辑壳 MCP 寻址先例：`__mcp_click`（PLAN-044 T6，`renderer.rs:11608` 拦截，
  mcp_server 侧从 vnode path 解析 storage key）——新 action 同一寻址链；
- 现有 action 枚举十项（press/type_text/submit/toggle/select_option/set_value/
  clear/scroll/drag/resize_col，`mcp_server.rs:609`），编辑壳仅 click +
  type_text/clear（后者绕过 widget 键盘路径）。

**spec 关联**（overview 比对）：P048-3（VM 编辑行为收尾——本计划收其 T9 执行
期发现债）、P055-3（VM 编辑臂表格编辑器——本计划收其复审 D2 债）、P044-3/
P045-3（`__mcp_click`/`__mcp_resize_col` 合成通道先例）。无 supersede 面
（修复既有断链，不改冻结契约；EDITOR-CONTRACT 无涉——VM 面契约节无编辑回写
条目，若复审认定需登记则归 review 阶段 spec-impact）。

**前置风险（执行门槛）**：auto-lang master 当前处于未解决合并冲突状态
（`UU crates/auto-lang/src/aura/schema.rs` + 暂存
`crates/auto-lang/src/ui/aura_view_builder.rs` 改动，2026-09-07 实测）——
worktree 创建前须收干净（待澄清①）。

**vue 轨影响**：零——面 A/B 均在 auto-lang VM renderer/mcp 层，demo src 与
engine 不动；`pnpm test:e2e`（88 用例）作零回归确认门。

## 详细设计

1. **闭包改造（面 A）**：两处 dynamic 臂闭包（`renderer.rs:18702-18708`
   CodeEditor、:18757-18762 DocEditor）改为：
   ```rust
   widget = widget.on_change(move || {
       let text = <editor_text>(&sk2);
       IcedMessage {
           widget: msg.widget.clone(),
           event: msg.event.clone(),
           input_value: Some(text),
       }
   });
   ```
   （DocEditor 取 `ade::autodown_editor_text(&sk2)`，CodeEditor 取
   `ce::code_editor_text(&sk)`；`INPUT_TEXT` 写入在 dynamic 臂移除——该路径
   零读者，generic 臂保持原样。）
2. **key_press 通道（面 B-1）**：`mcp_server.rs` 枚举 + keyspec 解析函数
   （`"c:X"` 与 13 命名键 → `EditorKey`；解析失败即报错返回，不静默）；
   `renderer.rs` `__mcp_key` 拦截臂（`__mcp_click` 后同族位置）：
   `with_font_system(|fs| core.handle_input(fs, DocInput::KeyPressed{..}, NullClipboard))`
   → `out.text_changed` 时取 `autodown_editor_text(&sk)` 构造
   `IcedMessage { widget/event 取编辑壳 on_change 消息, input_value: Some }`
   返回（`iced::Task::done`）——与 type_text 订阅直转同形态；`focus_changed`
   时 `write_ghost_state`（:11632-11647 click 臂同款）；末尾 `__noop` 回发
   驱动重绘（Plan 482 通道，click 臂同款）。
3. **editor_drag 通道（面 B-2）**：payload 解析出坐标序列 →
   `MousePressed(x0,y0)` → 逐点 `MouseDragged(x,y)` → `MouseReleased` 各一
   次 `core.handle_input`；`text_changed`/`focus_changed` 处理同上。
4. **vm-smoke 组（面 C）**：新组执行序=组 7 后、组 8 前（组 8 居末纪律）；
   [group9] 断言三件：`autoui_state content` 含逐键编辑结果（含 Backspace
   修正）、右栏渲染断言（既有组 2 linkage 同口径）、`type_text` 等价终态
   逐字节相等；[group10] 断言：拖拽前后列宽读数变化（组 6 表格文档复用）。
   两组失败均确定性报错（不吃 049 重试）。

## 测试设计

- **rust 单测**（auto-lang）：keyspec→EditorKey 解析全覆盖（13 命名键 +
  `c:X` + 非法输入报错臂）；两拦截臂 payload 解析（`__mcp_click` 既有测试
  同族位置）；闭包消息形态如可单测（IcedMessage 构造提辅助函数则直测，
  否则经 vm-smoke 端到端覆盖并披露）。
- **vm-smoke**：[group9]/[group10] 如上；整轮回归含组 1-8 零漂移。
- **demo e2e**：`pnpm test:e2e` 88/88（vue 轨零回归确认）。
- **先红后绿**：[group9] 在面 A 修复前跑——逐键后 state.content 不动（048
  症状复现）→ 修复后绿。执行期留两读数证（红/绿各一）。

## 验收标准

1. [group9] 逐键链路：`key_press` 逐键输入（≥5 字符 + Backspace + Enter）→
   `autoui_state content` 反映全部编辑 → 右栏重渲染 → 与 `type_text` 同文档
   终态逐字节相等。
2. [group10] 拖拽链路：表格列边界 `editor_drag` 序列 → 列宽变化断言成立。
3. 回归门：vm-smoke 整轮全绿（组 1-8 零漂移 + 两组新增）；demo e2e 88/88；
   auto-lang `cargo test` 受影响面全绿。
4. 台账收口：DEBTS 048 行、055 D2 行销号注记；转介单③终结段（含
   「custom_scrollbar/分数化绕道不涉——048 与 043 行分立」口径澄清）。
5. 真实物理键盘手验为可选披露臂（043 D2 同构代证口径），不作验收门。

## 执行步骤

> 双仓 worktree（`.wt` 兄弟组布局，`/auto-plan:work` 创建）：auto-lang
> `plan-057-dev`（T1-T5）、auto-down `auto-down-057-dev`（T6-T9）；exe 从
> auto-lang worktree 重建后跑 T6-T8。前置：auto-lang master 收干净（待澄清①）。

- **T1** [auto-lang] `crates/auto-lang/src/ui/iced/renderer.rs:18757-18762`
  DocEditor dynamic 臂闭包 → textarea 先例（`input_value: Some` 新消息，
  移除该臂 `INPUT_TEXT` 写入）。验证：`cargo check -p auto-lang` 零错。
  [✅ 已完成] c0ed05ced：闭包发布 `IcedMessage{input_value:Some(autodown_editor_text)}`，INPUT_TEXT 写入移除、头注同步；cargo check 零错（41.76s，仅存量 lint）。
- **T2** [auto-lang] 同文件 `:18702-18708` CodeEditor dynamic 臂同族同修。
  验证：`cargo check -p auto-lang` 零错。
  [✅ 已完成] c0ed05ced 同提交：CodeEditor 臂同款闭包（`ce::code_editor_text`），INPUT_TEXT 写入移除；待澄清②未发现既有消费方依赖 None 形态（ui_gen 走 generic 臂未动）。
- **T3** [auto-lang] `crates/auto-lang/src/ui/mcp_server.rs`（枚举 :609 +
  描述 :598 + 解析/寻址）+ `renderer.rs` `__mcp_key` 拦截臂（keyspec →
  EditorKey → `core.handle_input(KeyPressed)` → text_changed 发消息）。
  验证：`cargo test -p auto-lang -- mcp` 相关测试绿 + `cargo check`。
  [✅ 已完成] f60c22d91：key_press action + `__mcp_key` 臂全链落位。实现注记：载荷扩为 4 段 `sk␟widget␟event␟keyspec`（拦截事件名占 event 槽，on_change 名随载荷传——「widget/event 取编辑壳 on_change 消息」的机械必要扩展）；UiActionType 增 KeyPress 变体（action_mapper/execute_* 穷尽臂同步）。测试需 `--features autodown`（默认档把编辑面 cfg 掉——首次跑 0 匹配即此因）。
- **T4** [auto-lang] `mcp_server.rs` + `renderer.rs` `__mcp_drag_ade` 拦截臂
  （坐标序列 → MousePressed/MouseDragged×n/MouseReleased 逐段直调）。
  验证：同 T3。
  [✅ 已完成] f60c22d91 同提交：`parse_drag_points` 单源解析 + 逐段直调臂；输出位累积 text_changed/focus_changed 处理同 key 臂。可观测面落地：编辑器表格合成读数 state（`editor_table_geom`/`editor_col_widths`，ghost_id 占位 state 同款先例；core 加 `table_geometry_snapshot`/`table_widths_snapshot` 只读访问器）——「state 读数」断言路径的必要实现（列边界坐标依赖运行期布局，vm-smoke 无法静态计算）。
- **T5** [auto-lang] rust 单测补齐（keyspec 全词表 + 非法臂 + payload 解析）。
  验证：`cargo test -p auto-lang` 受影响面全绿。
  [✅ 已完成] f60c22d91：tests_plan057 4 件（13 命名键全词表/c:X 单字符含 unicode/9 非法臂/payload 4 段契约）+ renderer `plan057_parse_drag_points`（正常/坏段防御/空串）= 5/5 绿；autodown_editor 面 80/80 绿；mcp 过滤面 20 绿 + 1 既有红（`desktop_mcp_switcher_thumbs`，master 基线同败、与编辑链路无关，已披露）。
- **T6** [auto-down] `autodown/demo/auto/vm-smoke.mjs` 增 [group9]（先红后绿
  两读数留证：面 A 修复前 exe / 修复后 exe 各跑一次）。验证：净窗 vm-smoke
  [group9] PASS。
  [✅ 已完成] 2ffdced + auto-lang 7b4d6400e。红读数：无守卫 exe（T3-T5 态）净窗跑 [group9] `state.content 卡 "he"`；绿读数：全修复态净窗整轮 PASS（[group9] 三断言：`content==="hello\n\nvm"` 含 Backspace 修正、右栏双段渲染、type_text 终态逐字节等价）。**执行期必要增项（已披露）**：①红绿双 exe 同败暴露 `sync_external` 连发回声竞态——旧自回显晚到被判外部真变化→整树 rebuild 清焦点→后续键全哑（真实键盘快速连打同潜伏）——core 增回声守卫（emit 回声集，回声只推进差分基准），单测 `plan057_stale_self_echo_sync_keeps_focus_mid_typing` 绿、autodown_editor 81/81；②组 4 滚动腿为本机既有环境债（053 待澄清⑦/054 裁定族；master 基线 exe 复现同败），vm-smoke 增 `VM_SKIP_SCROLL_LEG=1` 选通跳过（非门控态硬断言保持），红绿读数与回归用门控态，见待澄清④。
- **T7** [auto-down] 同文件增 [group10]（组 6 表格文档复用）。
  验证：净窗 vm-smoke [group10] PASS。
  [✅ 已完成] 2ffdced：探针 `autoui_editor_state` 读运行期表格几何定列边界（实测 (213.0,102.0)）→ `editor_drag` 拖 +60px → 探针断言 `col_widths[col0]=273.0`（core col_drag→table_widths 落定）。观测面执行注记：原设「state 读数」因 .at 零改动约束（未声明键写不进 state，ghost_* 先例是 demo 显式声明）改走只读探针工具（auto-lang 7b4d6400e），core 加 `table_geometry_snapshot`/`table_widths_snapshot` 访问器。
- **T8** [auto-down] 整轮回归：vm-smoke 全组（049 重试纪律）+ demo e2e
  `pnpm test:e2e`（E2E_PORT 让道如常）88/88。验证：双绿。
  [✅ 已完成] vm-smoke 腿：净窗整轮 **PASS**（门控态 `VM_SKIP_SCROLL_LEG=1`——组 1-3/5-8 零漂移 + [group9] 三断言 + [group10] 拖拽断言 + 组 8 居末翻转绿；组 4 滚动腿为 master 基线复现的既有环境债，见待澄清④；非门控态硬断言保持）。e2e 腿：**86/88**——2 失败（`scroll-sync.spec.ts:144/:176`，leftScrollTop 距 maxScroll 130px）在**主 checkout master 基线同样失败**（E2E_PORT=5198 对照实锤），系 DEBTS 055 D3 已登记的满载 flake 族（同 spec 同 delta 口径在册），非本计划回归（vue 轨/demo src 零改动，86 绿即零回归确认）；88/88 达成受阻记录在案，见待澄清⑤。
- **T9** [auto-down] 台账收口：`DEBTS.md` 048 行、055 D2 行销号注记；
  `docs/plans/attachments/052-auto-lang-transfer.md` 条目③终结段。
  验证：文档 diff 自审（file+related 溯源形态）。
  [✅ 已完成] 7eaf55a：048 行（状态/优先级/日期三格 + 根因链/修复面/[group9] 验收 + 043 D2 同构代证口径）、055 D2 行（同格销号 + 「宜合一张编辑链路计划」预判回扣）、转介单③终结段（含「custom_scrollbar/分数化绕道不涉——048 与 043 行分立」口径澄清）；格式与 046/055-D1 既有销号行对齐，diff 自审过。
- **T10** 折回：auto-lang `plan-057-dev` → master、auto-down
  `auto-down-057-dev` → master；worktree 双清（wt-guard clean）。
  验证：双侧 master log + wt-guard clean。
  [✅ 已完成] 预折门 `cargo tf --no-fail-fast`：3468/3469 唯一红=`test_charts_gallery_compiles`（056 期在册既有）。折回：auto-lang master 合并提交 13a62781a（分支 auto-down-057-dev，三提交 c0ed05ced/f60c22d91/7b4d6400e；正文括注的分支名与 053/056 既定约定互换，按 skill 规则+先例执行，双侧 log 溯源无误）；auto-down master 快进至 7eaf55a（2ffdced/7eaf55a）。清理：wt-guard 双侧 clean（auto-down 侧 pnpm node_modules 1185 链接逐 link-only 摘除——1074 rmdir + 111 父链级联消失，056 先例同口径）→ 双 worktree remove + 双分支删 + 组目录 `.wt/auto-down-057/` 除名。注：终态 scoped 复验已由预折门与 T6-T8 读数承载（T10 折回清场为计划自带末步，worktree 终态移除即其验证语义）。

## 复审记录

**Reviewer**：zhaopuming（/auto-plan:review，2026-09-07）。**复核基线**：双侧
worktree 已折回清场（T10），按 skill 规则对默认 checkout 复核——且 master 已
叠并入 577/565 两期并行合并（auto-down 8b28c1d / auto-lang ecc27c81e 在上），
全部读数取自含后续合并的现行 master（更严口径）。057 提交面核对：auto-down
a6d5ecf→7eaf55a（3 文件 +341/-146）、auto-lang 5ed1e96df→7b4d6400e（5 文件
+640/-12），与计划宣称面一致。

**逐验收判定**（全部复审期重跑，不信执行期勾选）：

1. **[group9] 逐键链路 — PASS**：现行 master 重建 exe + 净窗门控态整轮，
   `key chain` 三断言绿（`content==="hello\n\nvm"` 含 Backspace 修正、右栏
   双段渲染、type_text 终态逐字节等价）。代码面抽查：DocEditor dynamic 臂
   闭包发布 `input_value: Some(autodown_editor_text)`（renderer.rs 现行
   :18920-18934 一带，PLAN-057 注记在位）、INPUT_TEXT 写入该臂已无
   （`INPUT_TEXT.with` 剩 11 处全在 generic/ui_gen/输入面路径）。
2. **[group10] 拖拽链路 — PASS**：同轮 `editor drag: col boundary
   213.0,102.0;273.0,102.0 -> editor_col_widths[col0] = 273.0` 绿。
3. **回归门 — PASS（带披露）**：①vm-smoke 门控态整轮 PASS（组 1-3/5-8 零
   漂移 + 两组新增 + 组 8 居末）；非门控腿仍被组 4 环境债阻塞（复审重跑
   读数逐位同执行期：left_top 240.001/right_top 237.17——待澄清④，基线
   实证在案，追认门控态为等效验收面）。②demo e2e **88/88 全绿**（执行期
   86/88 的 2 失败经复审重跑消解=055 D3 瞬态满载 flake，执行期基线同败
   实证在案——待澄清⑤留档）。③auto-lang 受影响面：`--features autodown`
   plan057 6/6、autodown_editor 81/81、mcp 20 绿+1 红
   （`desktop_mcp_switcher_thumbs`——执行期已在 pre-057 master 基线实证
   预存，窗口切换器缩略图面，与本计划施工面无关）。④全量门 `cargo tf
   --no-fail-fast` 3468/3469 唯一红 `test_charts_gallery_compiles`（charts
   既有红，577 合并消息同口径在册）。
4. **台账收口 — PASS**：DEBTS 048 行/055 D2 行销号注记 2 处、转介单（052
   附件）条目③终结段 1 处均现行 master 抽查在位（含「custom_scrollbar/
   分数化绕道不涉——048 与 043 行分立」口径澄清）。
5. **物理键盘可选披露臂 — N/A**（计划明文非验收门；同构代证口径已在
   销号注记留档）。

**遗漏/延后/workaround 清猎**（Step 3 专项）：

- **遗漏**：未发现——T1-T10 均有对应 diff 与读数；group9/group10、单测
  6 件、探针工具、台账三处全数在现行 master 到位。
- **延后**：keyspec 修饰键余量（待澄清③）为立项期已批 v1 范围决策，非
  执行期静默缩面；滚动腿环境债为 pre-existing（待澄清④），均非本计划
  借口性推迟。
- **Workaround（均已披露，无静默）**：①载荷 4 段 `sk␟widget␟event␟spec`
  （拦截事件名占 event 槽的机械必要扩展，T3 注记）；②`autoui_editor_state`
  探针取代 state 读数（.at 零改动约束下未声明键写不进——T7 注记）；
  ③`VM_SKIP_SCROLL_LEG=1` 选通（非门控态硬断言保持，待澄清④）；④回声
  守卫为执行期发现竞态的实质修复（单测钉死），非绕道。
- **非阻断观察（N1）**：`tool_editor_state` 经 `autodown_editor(&sk)` 探测
  未渲染编辑壳时会创建空 core 注册项（下帧 sync_external 即重建覆盖，
  LRU 有界）——无行为影响，留档不改。
- **非阻断观察（N2）**：计划正文括注的双仓分支名与 053/056 既定约定互换
  （auto-lang=auto-down-057-dev / auto-down=plan-057-dev），执行按 skill
  规则+先例落位，双侧 log 溯源已核对无误——后续计划立项文案留意对齐。

**结论**：五验收全 PASS（3 带在册披露），无阻断债。spec-impact 元数据已
填（supersedes P048-3/P055-3、new P057-1/P057-2、touched P048-2/P055-2，
对照 .autoos/specs.json 现行 ID 核对）。status → **reviewed**，可进
/auto-plan:merge。

## 待澄清事项

1. **auto-lang master 合并冲突收口（执行前置，非本计划施工项）**：`UU
   crates/auto-lang/src/aura/schema.rs` + 暂存 `aura_view_builder.rs` 改动
   须先解决提交。与本计划施工面（ui/iced/renderer.rs、ui/mcp_server.rs）
   不相交；若收口过程触及 `aura_view_builder.rs` 编辑器装配段，执行期复核
   基线再开工。默认假设：由用户/既有会话收口。
2. **CodeEditor 同族修复并入**（默认并入）：`:18702-18708` 同款闭包、同解释
   器消费链，无单列理由；若执行期发现既有消费方依赖 `input_value: None`
   形态（未预期），回退该臂并披露单列。
3. **keyspec v1 范围**：13 命名键 + `c:X` 单字符，无修饰键——VM 编辑壳 v1
   无快捷键消费场景（mark 快捷键在 web 面，048 系列未接 VM）；修饰键
   （ctrl/shift 组合、shift+方向选区扩展）登记为余量，出现消费方再扩。
4. **组 4 滚动腿环境债（执行期实测，非本计划施工项）**：本机今日跑 vm-smoke
   组 4（scroll sync/reset）确定性失败——**master 基线 exe（2026-09-07 07:15
   构建）复现同败、读数逐位一致**（scroll-reset 不收敛 left_top 240/right_top
   237），系 053 待澄清⑦登记的「滚动状态回写漂移」族（新旧 exe 双复现、
   视觉滚动正常而状态读回滞留、054 裁定非阻塞挂债候选）。处置：vm-smoke
   增 `VM_SKIP_SCROLL_LEG=1` 选通跳过（仅该组，非门控态硬断言保持；本计划
   红绿读数与 T8 回归用门控态）。遗留：该环境债的收口归其债主计划/复审
   裁定，本计划不施工。复审追认：review 期非门控重跑仍同败（读数逐位
   一致），裁定维持——非门控 vm-smoke 全绿在本机环境不可达，门控态 PASS
   + 基线实证披露为等效验收面。
5. **demo e2e 执行期 86/88（复审已消解）**：执行期（T8）86/88——2 失败
   （scroll-sync.spec.ts:144/:176，leftScrollTop 距 maxScroll ~130px）在主
   checkout master 基线**同样失败**（E2E_PORT=5198 对照实锤），系 DEBTS
   055 D3 已登记满载 flake 族（同 spec 同 delta 在册）。复审重跑（folded
   master，负载较轻时段）**88/88 全绿**——瞬态 flake 坐实、非代码回归，
   无需挂债；执行期 86/88 读数留档为该 flake 族的又一复现实例。
