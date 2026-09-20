# PLAN-081 T-00 三勘定决策档（R-1/R-2/R-3 + engine 消费面风险）

> 勘定时点：2026-09-20。工具链基线：auto.exe
> `0.1.0+v0.4.2-1476-ge85eba3f7-dirty`（D:/autostack/auto-lang/target/debug/auto.exe，
> ≥ 计划假设的 1457 钉版）；auto-lang master HEAD `f7b6af91e`。
> 勘定探针工程：`D:/autostack/tmp/081-probe/`（pac.at + src/front/app.at
> = 002-counter 模板改锚文本 `Probe081`；探针脚本 probe-run-vm.mjs）。

## R-1 双轨机制裁定

**裁定：候选 A' = `render: ["vm","vue"]` 单声明 + 双命令分工。**

- vm 轨命令：`auto run -r vm`（CLI `--render` 运行期覆盖，main.rs:992
  `am.set_render`；MCP 经 `AUTOUI_MCP_PORT` env 开放）。
- vue 轨命令：`auto build -r vue [--gen-only]`（build 期同款覆盖）。
- pac 声明 `render: ["vm","vue"]` 使双轨**以配置面自文档**（pac.rs:226-232
  Multi 形态；BackendType::Vm 存在于 config.rs:145/162）。

**判据实证**（探针复跑命令逐条）：

| # | 命令（cwd=081-probe） | 结果 | 裁定含义 |
| --- | --- | --- | --- |
| ① | `render:["vm","vue"]` + `auto build --gen-only` | 走 vm→C/ninja 转译路径（"Transpiling auto code to c code"，产出 build/），**不产 vue 工程** | 裸 `auto build` 在 Multi 下选 vm 项（其 build 语义=C 移植）——**脚枪**，见围栏 |
| ② | `render:["vm","vue"]` + `auto build --gen-only -r vue` | vue 工程生成于 `gen/front/vue`（exit 0） | 候选 A' vue 侧成立 |
| ③ | `render:["vm","vue"]` + `auto run -r vm`（AUTOUI_MCP_PORT=9371） | MCP initialize 可达；`autoui_snapshot` 树含锚 `Probe081: 0`（col/text/row/button 全渲染） | 候选 A' vm 侧成立 |
| ④ | `render:"vue"` + `auto run -r vm` | 同③ PASS | 候选 B 亦成立（备胎） |
| ⑤ | ④ 之后重跑 `auto build --gen-only` | exit 0，重生成正常 | 生成物互不污染 |

**围栏（脚枪①的纪律）**：jade-edit 的 vue 生成一律经脚本携带 `-r vue`
（T-06 生成链 / README 运行矩阵固定命令形态），仓内禁止裸 `auto build`；
`build/`（C 产物）入 .gitignore。

**弃用理由**：候选 B（`render:"vue"` 单声明）vm 轨靠运行期隐式约定、pac
不自文档双轨；候选 A' 与计划 §0"render 双轨声明"目标一致。若 T-02/T-06
在含 deps（bps/stylekit/npm_deps）的完整工程上遇 Multi 声明新阻力，降级
候选 B（判据④⑤已备）。

## R-2 actions-vue 现状勘定

**裁定：F-1（auto-edit README"vue 生成器尚未接入 action 配置"）已过时；
vue 生成器现支持 actions 消费，初始版无阻断。menubar 取舍仍按默认 #4
（最小面：无 menubar 仅 status 行）——不因缺口销号而扩初始版规模。**

证据（源码级，2026-09-20 auto-lang master）：

- `ui_gen/vue.rs:6835-6848`：`menubar {}`/`toolbar {}` 占位标签在 widget
  带 `actions {}` 块且无显式子时**合成组件树**；注释明示
  **"PLAN-070 T-05: no longer shadcn-mode-gated"**——不限 shadcn 模式，
  plain（shadcn: off）工程同样合成（旧 jade-garden front 即此形态）。
- `ui_gen/vue.rs:6177-6200`：`actions_menubar_available`/`actions_toolbar_available`
  守卫 + `generate_actions_menubar_html`/`generate_actions_toolbar_html`
  （结构镜像 vm 侧 convert_menubar；enabled_if/checked_if 经
  convert_condition 转译）。
- DEBTS 451 行"keydown 回退层不挑模式，任何模式都随声明发射"——
  快捷键经脚本侧 keydown 回退层在 vue 生效（vue.rs:2301 域）。
- F-2（KNOWN-DEBT 451 vue 侧痕迹）与 F-1 的矛盾解释：DEBTS 451 三行登记于
  451 时点，其中"plain 模式占位不合成"行已被 PLAN-070 T-05 的去门化
  **部分超越**（该 DEBTS 行未同步更新）；auto-edit README 的"vue 模式
  限制"节写于更早时点，双过时。

**残余真缺口**（登记 parity-ledger / 上游跟踪，不改初始版）：

- use 深度不对称：vue 的 collect_use_module_actions 只扫一级 use 模块
  （DEBTS 451 行在册）——jade-edit 纪律：**actions 块只放根 widget**。
- auto-edit README 该节陈述过时（auto-edit 仓文档债，归属 auto-edit 侧
  后续；PLAN-081 不改 auto-edit）。
- 上游 menubar 展开快照回归（auto-edit 矩阵 39/6 注记）属 auto-lang 664
  待接手面，jade-edit 初始版无 menubar 不受影响。

## R-3 后端选型裁定

**裁定：初始版推荐 axum 模式（`JADE_GARDEN_PORT` +
`JADE_GARDEN_DEFAULT_WORKSPACE` env，exe 直引 auto-down 构建产物路径
——默认裁定 #5）；VM 模式（`JADE_GARDEN_SERVER=vm`）为同 exe 一 env
开关，登记为战略后续（切换验证另行，不扩初始版）。**

证据：

- exe 在库：`D:/autostack/auto-down/jade-garden/back/server/target/debug/
  jade-garden-back.exe`（缺失时 run-back.mjs 提示
  `cd jade-garden/back/server && cargo build`）。
- axum 模式 = 双轨既有在跑配方：jade desktop vm-smoke split 臂
  （`BACKEND_EXE` + `JADE_GARDEN_PORT`，vm-smoke.mjs:335-336）与 jade
  front e2e（playwright.config.ts:44-53 webServer 段）均消费。
- VM 模式同 exe 可切：main.rs:71 `JADE_GARDEN_SERVER=vm` → vm_server
  路径（server.at → jade_server.at 28 路由，plan-022 Phase 3 实证 /api
  面）；旧 e2e 的 env 透传（playwright.config.ts:52-53）即为此预留。
  但当前无任何在跑门消费 VM 模式——成熟度低于 axum，故初始版不选。
- run-back.mjs 形态：定位 exe → 起 `JADE_GARDEN_PORT=<port>
  JADE_GARDEN_DEFAULT_WORKSPACE=<fixture 拷贝>`（`--vm` 加
  `JADE_GARDEN_SERVER=vm` 透传，标注实验）→ health 探活。

## engine 消费面风险（vue 轨）

- `@autodown/engine` 出口契约 1.0 冻结（四出口+style.css）、**rust/VM
  平台面 experimental**（engine ARCHITECTURE §1-2）——vue 轨经 npm_deps
  link 消费属契约面（稳定）；编辑器深层行为差异登记 parity-ledger
  初始差异（F-7 tofu/hljs 债同列）。
- dist 新鲜度卫兵 `autodown/packages/engine/scripts/assert-dist-fresh.mjs`
  纳入 gate.mjs（旧 jade e2e-prepare 同款前置），防并行会话 engine src
  领先 dist 的白屏债务。

## §10 默认裁定采纳记录（用户"开工"授权 + 自主执行按默认）

| # | 事项 | 采纳 |
| --- | --- | --- |
| 1 | actions 缺口归属 | 上游另立计划（R-2 勘定后实为"已销号+残余登记"，无需上游计划立项；仅 use 深度不对称留纪律） |
| 2 | 计划归属 | PLAN-081 落 auto-down 账本（merge 时归档此间） |
| 3 | stylekit 路径 | 跨仓相对路径 dep：`../auto-edit/specs/stylekit`（jade-edit 仓根 pac.at 相对位） |
| 4 | menubar | 无 menubar 仅 status 行（最小面） |
| 5 | 后端二进制 | 直引 auto-down 构建产物路径（run-back.mjs 一处定位 + 缺失提示） |
