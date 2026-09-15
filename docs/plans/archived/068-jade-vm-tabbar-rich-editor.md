---
plan_id: PLAN-068
status: archived        # drafting → executing → execution_done → reviewed → archived
feature_name: jade-vm-tabbar-rich-editor
author: [zhaopuming]
created_at: 2026-09-15
updated_at: 2026-09-15
plan_revision: 1
current_step: 4
total_steps: 4
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

affects: [auto-down/jade-garden]
---

# [PLAN-068] jade-vm-tabbar-rich-editor

## 0. 变更摘要

jade 桌面 VM 轨视图后续档（PLAN-067 非目标里登记的"后续档"首切片），两件事：

1. **tab 条 041 化**：把 PLAN-067 保持 slice-5 形态的裸按钮 tab 排
   （`app.at` ~402-408，无活动态/无脏标/无关闭钮）换装为 041-auto-edit 的
   tab 条形态——激活 tab 高亮行 + amber `*` 脏标 + x 关闭钮，非激活 tab
   淡色，点击 `.SwitchTab` 流不变（Plan 449 双分支结构）。
2. **正文编辑器换装 `autodown_editor`**：把 PLAN-067 G4 落的
   `code_editor`（CodeMirror6）换为 AutoDown 块编辑器原生组件——消费
   PLAN-066 已合入 auto-lang master 的 NativeWidgetRegistry SPI
   （`72fd9d70c`，autodown_editor 首迁外部件），形态模仿本仓
   `autodown/demo/auto` 左栏编辑器（content 播种 + `oninput: .Edit`，
   INPUT_TEXT 通道与 code_editor 同约定）。六流编辑行为契约不变，vm-smoke
   元素绑定锁步更新（isEditorNode 多形态 + tabs 臂 x 钮断言）。

规范增量：`jade-garden/front/desktop/README.md` §9（jade/desktop-view-contract
canonical）增 tab 条契约小节 + 编辑器换装口径（SD-01/SD-02）。

## 1. 目标

- **G1 tab 条 041 化**：激活 tab 视觉可辨（高亮底 + 脏标 + x 关闭钮），
  非激活淡色可点；tab 六臂行为断言（切换/关闭/脏/落盘/重复 Open）全绿且
  定位锚（button ownText）不变。
- **G2 正文编辑器原生换装**：`.ad` 正文由 `autodown_editor` 原生外部件
  渲染编辑（块编辑壳 + 内层输入面），`key: .active_path` 播种通道、
  `.Edit(str)` 单参通道、空态锚文本全部保形。
- **G3 smoke 双模锁步**：vm-smoke split + merged 全臂 PASS（含编辑器臂
  定位更新与 tabs 臂新增 x 钮断言）；fixture 恢复协议 hash 前后一致。
- **G4 契约落账**：README §9 增量（tab 条小节 + 编辑器口径泛化），
  tabs_store web 共享面零改动。

**非目标**：`autodown` 渲染器/右侧预览栏与滚动同步（无第二栏，另行计划）；
graph 可视化组件化；cards review 交互重设计；web 轨视图同步；tabs_store
业务语义变更；auto-lang 仓任何改动；新建文件流（041 的 "+" 钮无对应六流，
不移植——见 §5.1 裁定）；`autodown_editor` 富 props 消费（placeholder/
dark_mode 等，本计划最小面，需要时另行登记）。

## 2. 架构方案

模板/先例映射（jade 现状 → 模板 → 落点）：

| jade 现状 | 模板/先例 | 落点 |
| --- | --- | --- |
| tab 排裸按钮 `for t in .tabs { button }`（app.at ~402） | 041 tab 条双分支（041 app.at ~130-166） | app.at 根视图 tab 行 |
| `code_editor (key: .active_path, lang: "markdown")`（app.at ~417） | demo 左栏 `autodown_editor { content, oninput }`（demo app.at ~247）+ 042 语料 `final: true` | app.at 编辑区 |
| `isEditorNode` textarea/code_editor 双形态（vm-smoke.mjs:512） | demo vm-smoke textarea 输入面 + PLAN-066 外部件快照面 | vm-smoke.mjs |

**成立的工具链前提**（已核实，2026-09-15）：
- PLAN-066 SPI 已是 auto-lang master 祖先（`72fd9d70c`，merge-base 实证）；
  注册表在 `all(feature = "autodown", feature = "code-editor")` 下注册
  `autodown_editor`/`autodowneditor` 双拼写 → `convert_autodown_editor_native`；
  缺 feature 降级 textarea 注册。
- `auto` crate `default = ["ui-iced", "python", "autodown"]`，且
  `ui-iced ⇒ code-editor`（auto-lang Cargo.toml features 链）——现行
  auto.exe（2026-09-15 master 构建）双 feature 全开，真块编辑器可用。
- demo 侧 PLAN-066 后 vm-smoke 16 臂 ×2 绿（type_text → `.App.Edit` →
  state 链路实证），为同构换装的消费方先例。

**约束**（041 README「vm 组件边界」+ PLAN-067 裁定，全程有效）：
①回调 props 使组件 vm 模式退化空 fallback；②组件子树对 MCP 快照不可见
（故编辑器仍留根视图，不入组件）；③view fn 片段参数化条件不求值 → tab 条
必须激活/非激活双分支；④`*_set_text`/`autodown_*` 内建编译进 store handler
产坏字节码 → 本计划**不引入任何内建调用**（读经 `.Edit` 全文载荷，写经
`content:` 播种）；⑤播种通道 = `content:` 绑定初值 + key 变重挂载
（README §9.2 口径，标签无关地平移到 autodown_editor）。

## 3. 技术栈

- auto-lang .at DSL（`autodown_editor` 标签 / actions DSL 不新增）；
  iced VM 渲染器（`auto run -r vm`，split+merged 双模）；
- jade 后端 `jade-garden-back.exe`（split 模式 :8199，零改动）；
- vm-smoke.mjs（AutoUI MCP over Streamable HTTP，node 驱动）；
- fixture：`tmp/wiki-demo`（恢复协议复用）。

## 4. 需求分析与背景调查

**授权记录**：用户 2026-09-15 在 PLAN-067 归档复看后提出——"Demo 里已经是
autodown 组件的最新的编辑器模式，可以模仿它来做正文编辑器"，并指名
`/auto-plan:new` 起草后续计划。授权范围 = auto-down 仓
`jade-garden/front/desktop/**`（app.at / vm-smoke.mjs / README.md）；
预算未限定；自动续行默认。web 轨、auto-lang 仓、后端均不在授权内。

**证据清单**：

| 证据 | 出处 |
| --- | --- |
| SPI 注册面（双拼写 + feature 门 + 降级链） | auto-lang `crates/auto-lang/src/ui/widget_registry.rs:172-190`；`Cargo.toml:99`（`autodown = ["ui-iced", "dep:autodown-core"]`）+ `:57`（ui-iced ⇒ code-editor）；`crates/auto/Cargo.toml:26`（default 集） |
| 原生编辑器视图转换（key/id、content/value、final 默认 true、oninput/input 事件） | auto-lang `crates/auto-lang/src/ui/aura_view_builder.rs:3054-3080` |
| 快照面（View::Custom kind=注册名 + props 明文透传 + 事件逐条 extract_action；AutodownEditor 臂 key/value/internal_text） | auto-lang `crates/auto-lang/src/ui/snapshot_builder.rs:252-276` |
| demo 用法与通道同约性（content 播种；oninput `.Edit`；"VM: edit signal … INPUT_TEXT channel — same convention as code_editor"） | 本仓 `autodown/demo/auto/src/front/app.at:19-23,247-267`；demo `vm-smoke.mjs:269-310`（textarea 输入面 + type_text → .App.Edit 实证） |
| `final` 语义（true=终态渲染；流式悬挂剥离仅在 false 期） | auto-lang `examples/capability-tests/042-autodown-vm/README.md:20-26` |
| 041 tab 条形态与 Plan 449 双分支约束 | auto-lang `examples/ui/041-auto-edit/src/front/app.at:119-175`（激活高亮行 + 脏星 amber + x icon 钮 + plus 钮 + h-px 分隔线；双分支注释在案） |
| jade 现状 tab 排与编辑区 | `jade-garden/front/desktop/src/front/app.at:402-421`（裸按钮排 / code_editor + 空态锚 + save_note） |
| `.CloseTab` 活动语义（零参，关活动 tab） | app.at msg 块（:63）+ handler（~195-215：`Tabs.Close(.active_path)`） |
| smoke 编辑器绑定与 tabs 臂断言面 | `vm-smoke.mjs:512`（isEditorNode）、:396-460（save 臂 type→dirty→save→磁盘）、:568-625（tabs①-⑤：串页/脏关/重复 Open/保存） |
| 现行契约（播种口径/绑定表/共享面） | `jade-garden/front/desktop/README.md` §9.2/§9.4/§9.5 |
| 工具链漂移处置（R-067-1 先例） | `docs/plans/archived/067-…md` merge 记录：工具链重建即重跑双模 smoke 作消费方核验 |

## 5. 详细设计

### 5.1 tab 条 041 化（G1）

`app.at` tab 行替换为双分支（h-8 条 + `bg-muted/30` 底 + `h-px bg-border`
分隔线，类值照 041）：

```at
row (style: "h-8 items-center bg-muted/30 shrink-0 w-full gap-0") {
    for t in .tabs {
        if t.path == .active_path {
            row (style: "items-center bg-[#1C1D24]") {
                button (text: t.title, variant: "text") {
                    onclick: .SwitchTab(t.path)
                    style: "h-8 px-3 text-[12px] text-zinc-200 font-medium"
                }
                if t.dirty {
                    text "*" { style: "text-[12px] text-amber-400 mr-1" }
                }
                button (variant: "text") {
                    icon (name: "x", style: "h-3 w-3 text-zinc-500") {}
                    onclick: .CloseTab
                    style: "h-7 w-6 px-0 py-0 mr-2"
                }
            }
        }
        if t.path != .active_path {
            row (style: "items-center") {
                button (text: t.title, variant: "text") {
                    onclick: .SwitchTab(t.path)
                    style: "h-8 px-3 text-[12px] text-zinc-500"
                }
                if t.dirty {
                    text "*" { style: "text-[12px] text-amber-400 mr-1" }
                }
            }
        }
    }
}
col (style: "h-px w-full bg-border shrink-0")
```

裁定：
- **x 钮用零参 `.CloseTab`**（= 关活动 tab，`Tabs.Close(.active_path)`），
  与 041 的 `.CloseTab(i)` 不同——x 只出现在激活 tab 上，语义吻合；不新增
  带参 msg（tabs_store 零改动红线）。
- **不移植 041 的 "+" 新建钮**：jade 六流无新建文件（msg 块无对应 handler），
  补流需动 tabs_store/web 共享面，越出授权范围——登记偏差（README §9）。
- **双分支结构是 Plan 449 约束**（view fn 片段参数化条件不求值），非风格
  选择；041 注释同款。
- smoke 定位不受影响：激活/非激活 tab 仍是 `button` ownText = `t.title`
  （每 tab 恰一个带文本按钮，x 为 icon 钮无文本）。

### 5.2 正文编辑器换装 autodown_editor（G2）

`app.at` 编辑区替换（空态锚与 `text .save_note` 不动）：

```at
autodown_editor (key: .active_path, final: true, style: "flex-1 w-full") {
    content: .active_body
    oninput: .Edit
}
```

- **播种通道平移**：`content:` 绑定 = 初值 + 每帧外部 diff 回写；key 变
  重挂载读 content（§9.2 口径标签无关）。打开/切换路径**不调用任何
  `autodown_editor_text`/`*_set_text` 内建**（规避 041④ 坏字节码家族，
  且读路径已由 `.Edit` 全文载荷覆盖）。
- **`.Edit(str)` 通道不变**：渲染器全文发布回写 state → `Tabs.SetBody`
  （dirty 由 store 按 original_body 判定）——demo 同环实证
  （type_text → .App.Edit → state.content）。
- **`final: true` 显式**：jade 文档恒终态（无流式语义）。
- 富 props（placeholder/dark_mode/accent/scroll_sync）不消费（非目标）。
- `.Edit` handler 头注与 app.at 编辑区注释随换装更新（通道描述改为
  autodown_editor 同约定表述，计划号登记）。

### 5.3 vm-smoke 锁步（G3）

- `isEditorNode`（:512）双形态 → 多形态：接受 `textarea `（内层输入面，
  demo 先例）/ `code_editor `（保留）/ `autodown_editor ` /
  `AutodownEditor `（原生件快照拼写二选一，**以 T-02 实机快照为准**
  ——决定工件记入 README §9.4）。
- `textareaValue`（:517）读 `value:`/`content:` props 的逻辑不变
  （PLAN-066 外部件快照 props 明文透传，key/value 在场）。
- tabs 臂新增**激活 tab x 钮断言**（有界）：脏置后快照中存在 icon 钮
  （激活 tab 高亮行内），press 其 element_id → `status=discarded-dirty:*`
  流与 `pressAction('.CloseTab')` 等价——证 x 钮真实接线。
- 其余臂（read/save/links/cards/d4/search）零改动：状态字段与驱动锚不变。

### 5.4 回退裁定（决策点）

若实机出现**每键光标跳变/IME 中文输入阻断**（`content:` 每帧回写环 ×
块编辑器重解析的交互风险；反证：demo 同环绿 + vm-ime-chinese.png 先例）：

- 首选回退 = 依赖注册表降级链（缺 feature 形态等同 textarea 注册）不可取
  （改工具链越授权）→ 实际回退 = 编辑区退回 `code_editor`（T-02 前基线），
  tab 条工作保留；决策工件（快照/复现步骤）落 `9. 复审记录`，升级用户
  决策是否缩窄目标。

### 规范增量

| delta_id | add/modify/retire | 目标（canonical） | before/after 规则 | rationale | acceptance IDs |
| --- | --- | --- | --- | --- | --- |
| SD-01 | modify | `jade-garden/front/desktop/README.md` §9（jade/desktop-view-contract，账本 P067-1 派生面；merge 时派生 P068-x） | before：tab 条无契约登记（slice-5 裸按钮形态）；after：新增 tab 条契约小节——041 双分支形态、激活高亮 + 脏标 + x（零参 `.CloseTab` 活动语义）、无 "+" 钮裁定、smoke 定位锚不变口径 | tab 条首次入契约，防再漂移 | AC-1 |
| SD-02 | modify | 同上 §9.2/§9.4 | before：正文 = code_editor（播种口径/`.Edit` 通道/isEditorNode 双形态绑定表）；after：正文 = autodown_editor 原生外部件——播种口径泛化为标签无关（content: + key 重挂载），`.Edit` 通道同约定表述，isEditorNode 多形态绑定表（实机快照拼写冻结），`final: true` 口径，内建零调用红线 | 编辑器换装的持久行为契约 | AC-2, AC-3, AC-4 |

## 6. 测试设计

- **vm-smoke 全臂（split）**：`cd jade-garden/front/desktop && node vm-smoke.mjs`
  ——九臂全跑（open-ws/files/read/save/links/cards/d4/search/tabs①-⑤，
  16 检查）含新增 x 钮断言；fixture hash 前后一致。
- **merged 模式**：`VM_MERGED=1 node vm-smoke.mjs`（后端进程内）。
- **人工/探针核验**（T-03）：键入光标连续性（连续键入不跳位）、IME 中文
  输入、激活 tab 高亮/脏星/x 视觉、空态锚在无 tab 时在场。
- **diff 审查**：`git diff -- jade-garden/front/desktop/src/front/tabs_store.at`
  恒空；web 轨零触碰。
- **失败语义**：任一臂红 → 修复后全臂重跑（不接受单臂绿收口）；工具链
  重建（R-067-1 处置）→ 双模重跑作消费方核验。

## 7. 验收标准

| ID | 可观察行为 | 验证方法与预期 |
| --- | --- | --- |
| AC-1 | tab 条 041 形态：激活 tab 高亮行 + 脏 `*` + x 钮；非激活淡色；x 钮触发活动 tab 关闭流（脏态 `discarded-dirty:*`） | vm-smoke tabs 臂（含新增 x 断言）绿；split 全臂 PASS |
| AC-2 | `.ad` 正文由 autodown_editor 原生件渲染：快照含原生编辑器节点（kind 以实机冻结）且内层输入面可定位；key/content 播种在案 | read 臂绿（active_title/active_body 全文标记）+ 快照节点断言 |
| AC-3 | 编辑六流保形：type→dirty→save→磁盘落盘 | save 臂绿（marker 落盘 `tmp/wiki-demo/wiki/Hello World.ad`） |
| AC-4 | tab 切换/重开播种正确：正文不串页、脏关弃置、重复 Open 在途编辑存活 | tabs①②③⑤ 臂绿 |
| AC-5 | 双模全臂：split + merged 全 PASS，fixture 恢复 hash 一致 | 两命令退出码 0 + PASS 输出在案 |
| AC-6 | tabs_store.at 零 diff；README §9 增量落账（SD-01/SD-02） | git diff 审查空；README §9 新小节在案且与代码交叉一致 |

## 8. 执行步骤

| ID | 任务 | 文件/落点 | 依赖 | 验证命令与预期 | linked AC |
| --- | --- | --- | --- | --- | --- |
| T-01 | tab 条 041 化（双分支 + 脏星 + x 钮；无 "+" 裁定落注）+ tabs 臂 x 断言扩展 | `src/front/app.at`（tab 行）、`vm-smoke.mjs`（tabs 臂） | — | `node vm-smoke.mjs --arms open-ws,files,read,save,tabs` PASS | AC-1 |
| T-02 | 编辑区换装 autodown_editor（key/final/content/oninput）+ isEditorNode 多形态（实机快照冻结拼写，决策工件记 §9.4）+ 相关注释更新 | `src/front/app.at`（编辑区）、`vm-smoke.mjs`（isEditorNode） | T-01（同文件串行） | `node vm-smoke.mjs`（split 全臂）PASS | AC-2, AC-3, AC-4 |
| T-03 | 双模全臂 + 人工核验（光标/IME/视觉/空态锚）；若触发 §5.4 回退则记决策工件 | 无新改动（验证 + 记录） | T-02 | `node vm-smoke.mjs` 与 `VM_MERGED=1 node vm-smoke.mjs` 双 PASS | AC-5 |
| T-04 | README §9 落账（tab 条小节 + §9.2/§9.4 编辑器口径泛化 + 绑定表冻结）+ tabs_store 零 diff 审查登记 | `README.md` | T-03 | `git diff -- …/tabs_store.at` 为空；README §9 与代码交叉一致 | AC-6, AC-1..4 收口 |

（T-01/T-02 同文件故串行；总 4 步与 frontmatter `total_steps` 对齐。）

执行进度（work，2026-09-15）：

- [x] T-01 [✅ 已完成] 84679ca：tab 条 041 双分支（激活高亮 + amber 脏标 +
  x 钮零参 `.CloseTab`）；**两项实机裁定**：①内层行走括号 `style:` 形式
  （`class:` 括号式遇 `bg-[#1C1D24]` 任意值整串丢弃，快照实证——外层条/
  分隔线 class 花括号式不受影响）；②smoke x 钮锚 = 唯一空文本 button
  （icon 快照渲染 `[Image]` 文本节点，name prop 不可见）。tabs③a x 钮接线
  断言加入。验证：`node vm-smoke.mjs --arms open-ws,files,read,save,tabs`
  PASS（split 子集，AC-1）。
- [x] T-02 [✅ 已完成] d62ce52：正文换装 `autodown_editor (key: .active_path,
  final: true, style: "flex-1 w-full")` + content 播种 + `.Edit` 通道；零内
  建调用（041④ 红线）。**Q1 冻结**：本机 exe（v0.4.2-753-g4e26b3237-dirty）
  投影 = `textarea` + `value:` 全文——同 exe demo 编辑面同形（对照实证），
  真块编辑壳拼写 autodown_editor/AutodownEditor 为未来面预留；isEditorNode
  四拼写。验证：`node vm-smoke.mjs` split 全臂 PASS（16 检查，AC-2/3/4）。
- [x] T-03 [✅ 已完成] （验证任务，无新改动）：`VM_MERGED=1 node
  vm-smoke.mjs` merged 全臂 PASS（16 检查）——AC-5 双模齐；fixture hash
  恢复一致 ×2。探针核验：连续两次 type_text（含中文载荷）active_body 全文
  回写 ✓；x 钮关 tab → 空态锚回场 ✓。真键盘/IME 手感 = 人工项（非阻断），
  已留探针窗口供把玩。
- [x] T-04 [✅ 已完成] 411ec60：README §9 落账——新增 §9.6 tab 条契约
  （SD-01）；§9.2 播种口径泛化 + §9.4 四形态绑定表与 Q1 冻结（SD-02）；
  §9.5 PLAN-068 zero-touch 注记。审计：`git diff 3adc930..HEAD --
  jade-garden/front/desktop/src/front/tabs_store.at` 与 web/back 轨 diff
  均为空（AC-6；AC-1..4 断言由双模全臂背书收口）。

## 9. 复审记录

- 2026-09-15 drafting（起草交接，plan_revision 1）：stage: new，
  PLAN-068 rev1。背景调查齐（SPI 注册面/feature 链/demo 先例/041 形态/
  smoke 断言面五路证据，见 §4）；任务覆盖全部 AC 与 SD；路径与命令均对
  现行 master 实地核实。outcome: pass——授权范围内可直接执行，无阻塞决策
  （§5.4 回退与 §10 Q1/Q2 均为执行期有界决策点，owner=work 执行会话）。
  next: work。
- 2026-09-15 work 收口（work 交接）：stage: work | plan_id: PLAN-068 |
  plan_revision: 1 | outcome: pass | code_commit: plan-068-dev
  84679ca(T-01)→d62ce52(T-02)→411ec60(T-04)，base 3adc930，worktree
  .wt/auto-down-068/auto-down | task_ids: T-01..T-04 全完成（4/4） |
  evidence: split 全臂 PASS（16 检查，MCP :9264）+ merged 全臂 PASS
  （VM_MERGED=1，16 检查），fixture hash 恢复一致 ×2；T-03 探针：连续键入
  （含中文载荷）全文回写 + 空态锚回场；tabs_store.at 与 web/back 轨
  diff 3adc930..HEAD 为空；工具链 auto.exe v0.4.2-753-g4e26b3237-dirty
  （master 241ff02b4 时点，R-067-1 处置先例：merge 后若工具链重建重跑双模
  smoke 作消费方核验） | blockers: 无（真键盘/IME 手感 = 人工项，非阻断） |
  next: review。
- 2026-09-15 review 收口：stage: review | plan_id: PLAN-068 | plan_revision: 1
  | outcome: pass | reviewed_commit: 411ec6070c8a75e50e2fbc68d21047ed5f29126d
  | base_commit: 3adc930ca0d714ff386068dc760f93fc35851356（worktree
  .wt/auto-down-068/auto-down @ plan-068-dev，工作区干净） |
  dependency_revisions: auto.exe v0.4.2-753-g4e26b3237-dirty（复审期
  auto-lang master 前进 241ff02b4→de86e1d8e，docs-only，exe 不变，见
  R-068-1）；jade 后端主检出预构建 | spec_inputs: README.md@411ec60 sha256
  ea015d29a50ba4a980c661919e7916bc34bea9e60904fd17f5e75f7bf74d651f；
  app.at@411ec60 sha256
  a935826067a9058405b620a1008a9d3e43e78ea82ee882e564de419c88068a9c（SD-01/
  SD-02 冻结文本）；账本派生条目 merge 时由 README §9 增量落 P068-x |
  acceptance_results: AC-1 pass（tab 条双分支/脏标/x 钮源码对位 + tabs③a
  唯一空文本钮 press→discarded-dirty 行为断言，双模 PASS）；AC-2 pass
  （autodown_editor key/final/content/oninput 源码对位 + read 臂全文标记 +
  Q1 冻结投影 textarea+value）；AC-3 pass（save 臂 type→dirty→save→磁盘
  marker）；AC-4 pass（tabs①②③⑤：串页负向断言/脏关弃置负向断言/重复
  Open 在途编辑落盘）；AC-5 pass（复审重跑 split PASS + merged PASS 各
  16 检查，fixture hash 恢复一致 ×2，被审提交绑定）；AC-6 pass（tabs_store
  .at 与 web/back 轨 diff 复审复跑为空 + README §9.6/§9.2/§9.4 与代码交叉
  核对一致） | findings: R-068-1（observation，非阻断）= 工具链漂移：执行/
  复审期 auto-lang master docs-only 前进（exe 不变），处置同 R-067-1——
  merge 后若工具链重建，重跑 vm-smoke 双模作消费方核验（非门禁重开）；
  R-068-2（observation，非阻断）= 真键盘/IME 手感为人工项（MCP 载荷级中文
  往返已绿，Q2 部分收口在案），留给日常使用观察 | 独立性声明: 复审在实现
  会话内进行，裁定自工件重建（diff 逐行重读 app.at/vm-smoke.mjs/README、
  被审提交双模重跑、零 diff 审计复跑、证据哈希冻结），未采信执行摘要 |
  evidence: 双模 PASS 输出（复审重跑）+ 冻结哈希如上 + 审计空 diff |
  next: merge。
- 2026-09-15 merge 收据（PLAN-068:r1）：**prepared**——账本投影提交
  cbd0fe7（.autoos/specs.json 追加 P068-1 architecture 契约增量 + P068-2
  reviews 记录，纯增量 +24 行，reviewed_commit 411ec60 的
  docs/projection-only 后代，实现/依赖零变更）；**landed**——wt-guard
  clean 前置，merge 提交 57678dc（plan-068-dev → master），祖先链验证
  411ec60 ∈ master，canonical README §9.6/§9.2/§9.4 与 app.at
  autodown_editor 在 master 实地确认，主检出 smoke PASS（master
  known-good）；**ledger_refreshed**——tracked-file 路线，读回验证
  P068-1/P068-2 在 master specs.json（arch 41 条/reviews 40 条）；
  **archived**——本文件 git mv 至 docs/plans/archived/ + status: archived
  （见下方归档提交）；**cleaned** ✅——wt-guard clean 前置后
  worktree/分支 plan-068-dev(was cbd0fe7)/组目录 .wt/auto-down-068 全数
  移除验证完毕。completion_kind: delivered。

## 10. 待澄清事项

| # | 事项 | 处置 |
| --- | --- | --- |
| Q1 | 原生编辑器 MCP 快照节点拼写（`autodown_editor` vs `AutodownEditor`）与内层输入面形态——源码两臂并存（View::Custom / AutodownEditor 臂） | **✅ 已冻结（T-02）**：本机 exe 投影 = `textarea` + `value:` 全文，与 demo 编辑面同 exe 同形；isEditorNode 四拼写防回归；README §9.4 落账 |
| Q2 | `content:` 每帧回写环 × 块编辑器重解析下的光标/IME 连续性 | **部分收口（T-03）**：MCP 载荷级连续键入 + 中文载荷往返绿（§5.4 回退未触发）；真键盘/IME 手感 = 人工项，已留窗口 |
| Q3 | 富 props（placeholder/dark_mode 等）VM 臂是否可消费 | 本计划不消费（最小面）；需求出现时另行登记计划 |
