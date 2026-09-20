---
plan_id: PLAN-081
status: archived
completion_kind: delivered
feature_name: jade-edit-bootstrap（jade-edit 初始版：独立仓立起 + 单工程双轨 vm/vue + engine 编辑器消费 + jade-garden-back 契约复用 + 双轨一致性门 v0）
author: [zhaopuming]
created_at: 2026-09-20
updated_at: 2026-09-20
plan_revision: 1
current_step: 9
total_steps: 9

supersedes_spec_components: []
new_spec_components: [jade-edit/docs/ARCHITECTURE.md]   # SD-01（+docs/README 定版）；复审定版——jade-edit 新仓 spec 面即其 docs/
touched_goals: []   # 空说明：新仓首计划无既有 goal 面（jade-edit 自建档）；auto-down 冻结零 spec 增量（AC-07）

affects: [jade-edit（新独立仓 D:\autostack\jade-edit）, auto-down（只读消费 + 零改动纪律）, auto-lang（仅勘定引用与词位风险登记，本计划不改动）]
---

# [PLAN-081] jade-edit-bootstrap——jade-edit 初始版（独立仓 + 单工程双轨 + engine 编辑器 + 契约复用）

> 裁定来源（2026-09-20 用户三裁定，见 §4 授权记录）：① jade-edit 独立仓
> （auto-edit 家族）；② 编辑器留守 auto-down——`@autodown/engine` 经
> **外部官方组件**件位（VM 侧 `autodown_editor`，auto-lang PLAN-068 T-02）
> 消费，编辑器路线问题已销号；③ 旧 jade-garden 冻结零改动作功能池。
> 战略依据：design 30 三层统一（L1/L2/L3 已收口，PLAN-073..080 delivered）
> 的**方向翻转续篇**——此前"vue 领先、VM 追平"，jade-edit 起"AutoUI
> 领先、vue 为渲染通道"，从初始版起双轨一致性（不再积累组装级差异）。

## 0. 变更摘要

| 面 | 内容 |
| --- | --- |
| 新仓立起 | D:\autostack\jade-edit 独立仓（git init + pac.at + src/front 单源 + tests + docs；README/PROVENANCE 记"全新应用，非 examples 拷贝"） |
| 单工程双轨（首例） | **一个 pac.at 工程同时供 vm/vue 两轨**：VM 形态 = `auto run -r vm` 解释渲染（iced）；vue 形态 = `auto build` 生成 Vue 工程（vite）。旧 jade-garden 是两工程分裂（front/auto vue + front/desktop VM twin），jade-edit 以单工程双轨从根上消除该分裂——机制支持度 T-00 勘定（R-1） |
| MVP 功能环 | boot → filetree（`dep bps` navigation/filetree，L1 零副本）→ 打开 `.ad` → 编辑（`autodown_editor` 外部官方组件）→ 保存（/api 契约）→ 重载可见。menubar/toolbar 面 = 最小化（待澄清 #1/#4 联动 R-2 勘定） |
| 后端复用 | jade-garden-back **外部服务器**消费（零后端改动）：split 模式 `AUTO_BACKEND` 指向（axum 或 `JADE_GARDEN_SERVER=vm` AutoVM 内服务器，R-3 勘定选一）；契约类型面 = api.at 冻结源**副本 + 漂移门** |
| 双轨一致性门 v0 | 双臂同断言域 smoke 门（vm 矩阵 MCP + vue playwright 同一检查单）+ vm 结构基线 v0 + 差异登记表 v0（继承 jade L3 差异表方法论，从第一天记账） |
| 纪律 | auto-down 零 tracked 改动（AC-07）；jade-edit 新面"双轨同日落地"纪律自初始版生效 |

## 1. 目标

1. **独立仓落成**：jade-edit 仓结构、pac.at（deps + 双轨声明）、溯源文档
   定型，首 commit 在库。
2. **单工程双轨定形**：同一份 widget/store `.at` 单源，vm 轨 `auto run
   -r vm` 可跑、vue 轨 `auto build` 可生成且 build/dev 绿——机制勘定与
   形态裁定落档（T-00 决策档）。
3. **MVP 编辑环双轨全通**：filetree 打开 `.ad` → autodown_editor 编辑 →
   保存落盘 → 重载可见，vm/vue 两轨各自可验证（MCP 矩阵 / playwright）。
4. **契约复用定形**：jade-garden-back 外部消费通道 + 契约副本漂移门
   （对 auto-down 冻结源）常绿。
5. **一致性门 v0 在库**：双臂同单 gate 脚本 + 差异登记表 v0 首版。

**非目标**：旧 jade-garden 任何改动（冻结功能池）；auto-edit 仓改动（其
vue 通道受益属后续另行）；`actions{}` vue 生成器接入（若 R-2 勘定确缺，
上游另立计划，本计划只登记依赖与降级形态）；后端 merged/进程内模式；
auto-os manifest/daemon 注册；反链/图谱/检索等 jade 功能面移植（后续批）。

## 2. 架构方案

```
jade-edit/（新独立仓，auto-edit 家族栈形态）
├── pac.at                 # scene: ui；render 双轨声明（形态 T-00 R-1 定）；
│                          # dep bps（../../../auto-lang/blueprints）
│                          # dep stylekit（跨仓路径，待澄清 #3）
│                          # npm_deps: @autodown/engine link:auto-down（vue 轨）
├── src/front/
│   ├── app.at             # App 壳：filetree + 编辑区 + status 行（最小）
│   ├── editor_store.at    # 038/449 store 形态（tabs/脏标/保存流最小集）
│   └── back/api.at        # 契约副本（GENERATED from auto-down，漂移门守）
├── tests/                 # vm 矩阵（MCP autoui_state/snapshot）+ 结构基线 v0
├── e2e/                   # vue playwright smoke（同检查单）
├── scripts/               # gate.mjs（双臂）/ run-back.mjs（后端定位+启动）
│                          # / contract-sync.mjs（副本部署+漂移门）
└── docs/                  # README + ARCHITECTURE 简版 + t00 决策档 + plans/
```

- **双轨机制**（R-1 勘定后按裁定点回填）：pac.rs 实勘支持
  `render: ["vue","arkts"]` Multi 形态（crates/auto-man/src/pac.rs:226）
  且 `auto run -r vm` 为运行时渲染模式选择（jade desktop README §表）。
  候选形态 A = `render: ["vm","vue"]` 单声明；候选形态 B = `render:
  "vue"` + 运行期 `-r vm` 覆盖。择一定形并冒烟，落 t00 决策档。
- **编辑器**：vm 轨 = `autodown_editor (key:, final:)`（jade desktop
  app.at:1022-1031 消费形态同款；INPUT_TEXT 通道回写约定同）；vue 轨 =
  engine 经 npm_deps link + `gen_autodown_editor.d.ts` 式 stub（jade
  regen.sh 同配方）。experimental 面风险（engine ARCHITECTURE §2 rust/VM
  平台面未稳定 + DEBTS 041 mono tofu 债）登记差异表。
- **后端**：jade-garden-back.exe 为独立进程（split），vm/vue 两轨同指。
  axum 模式（现状 debug exe）vs VM 模式（`JADE_GARDEN_SERVER=vm`，442-c2
  server.at → jade_server.at 28 路由）由 R-3 勘定选一为初始版推荐；
  fixture workspace 拷贝隔离（jade e2e-prepare.mjs 模式，不污染源）。
- **契约**：api.at 类型/ROUTE 面自 auto-down 冻结源部署副本至
  `src/back/api.at`，漂移门 = 副本 ↔ 源四对拍裁剪版（api-contract-
  routes.mjs 模式）。auto-down 冻结 ⇒ 副本稳定，门为单向守漂移。

## 3. 技术栈

- **单源**：AutoUI widget/store DSL（`.at`；038/449 store 形态、013 式
  组件纪律、vm 组件边界三约束照 auto-edit README Concepts 执行）。
- **双轨**：vm = auto-lang auto.exe（`run -r vm`，iced）；vue = auto.exe
  `build` 生成（Vue3+Vite，npm_deps link engine）。
- **deps**：bps（filetree：tree_util/tree_icon）；stylekit（styles.at）。
- **后端**：jade-garden-back（axum / AutoVM 内服务器）+ /api JSON 契约。
- **测试**：vm MCP 矩阵（desktop_mcp.py / vm-smoke.mjs 形态）+ vue
  playwright（e2e/runtime webServer 模式）+ 双臂 gate.mjs（component-
  gallery scripts/gate.mjs 模式裁剪版）+ 契约漂移门（node）。

## 4. 需求分析与背景调查

**授权记录**：
- 2026-09-20 用户口述三裁定（jade-edit 独立仓 / 编辑器留守 auto-down 经
  外部官方组件消费 / 旧 jade-garden 冻结零改动）+ "OK，起草" 授权起草
  本计划。执行授权未给（drafting → work 需另行授权）。
- 规模裁定：初始版 = MVP 编辑环 + 双轨机制定形；actions{} vue 接入、
  功能面移植（反链/图谱/检索）、auto-edit 联动均不在本版。

**实勘快照（2026-09-20，auto-down 主检出 + auto-edit/auto-lang 只读）**：

| # | 事实 | 出处 |
| --- | --- | --- |
| F-1 | auto-edit README 明载：vue 生成器尚未接入 action 配置（快捷键失效/menubar 空壳/toolbar 无映射），041 pac 固定 `render:"vm"` | auto-edit/specs/auto-edit/README.md（Concepts·vue 模式限制） |
| F-2 | KNOWN-DEBT 451 又有 vue 侧 actions 痕迹（convert_condition / collect_use_module_actions 一级扫描）——与 F-1 时序关系不明，**R-2 勘定** | auto-lang docs/plans/KNOWN-DEBT-AND-RISKS.md 451 行 146-147 |
| F-3 | pac `render` 支持 Multi 形态（`["vue","arkts"]` 先例）——单工程多渲染目标有配置面基础 | crates/auto-man/src/pac.rs:226-232 |
| F-4 | `auto run -r vm` = 运行时渲染模式（merged 模式实测 "backend runs in-process"；split 走 HTTP `--no-merge`） | jade-garden/front/desktop/README.md:15-21 |
| F-5 | VM 内服务器：`JADE_GARDEN_SERVER=vm` → vm_server.rs 经 run_file 跑 server.at → jade_server.at 28 路由，/api 面整体在 AutoVM | jade-garden/back/server/src/vm_server.rs；back/auto/server.at |
| F-6 | vue 轨 bps 跨文件 fn 转译已销号（645 T-02/03 + 075 增收），filetree 组合形态 vue 轨恢复 | auto-lang DEBTS.md 070 行（✅已销账） |
| F-7 | `autodown_editor` VM 件位在 auto-lang ui（PLAN-068 T-02 更名自 code_editor）；已知债 = fence mono CJK tofu、hljs 主题定格 | crates/auto-lang/src/ui/autodown_editor/core.rs；auto-lang DEBTS 041 |
| F-8 | engine 出口契约 1.0 冻结（四出口+style.css）；dist 新鲜度卫兵 assert-dist-fresh；rust/VM 平台面 experimental | autodown/packages/engine/ARCHITECTURE.md §1-2 |
| F-9 | 契约 api.at：25/28 路由 ROUTE+#[api] 登记（3 条 multipart 豁免）；四处对拍门在库 | jade-garden/back/auto/api.at；tests/api-contract-routes.mjs |
| F-10 | 双臂 gate 模式成熟可裁剪复刻（vue 真件臂 + VM twin 臂 + units.mjs + 截图基线） | jade-garden/front/component-gallery/（scripts/gate.mjs） |
| F-11 | auto-edit 001/002 delivered：bps 由 fork 改 dep 消费（`dep bps` path 同族形态） | auto-edit/docs/plans/archived/002-bps-dep-consume.md |
| F-12 | 计划号分配：docs/plans 本体仅 archived/attachments，max=080 ⇒ **081**；单写者 = 本会话（复核时点 2026-09-20） | auto-down docs/plans/ 实勘 |
| F-13 | 旧 jade-garden vue 工程的生成/部署链（regen.sh + gen-support.sh + stubs）为 vue 轨工程化配方 | jade-garden/front/auto/gen/regen.sh、gen-support.sh |

**假设**：auto-lang 主检出 exe ≥ 1457（661 交付版，PLAN-080 merge 已钉）
可用；auto-down jade-garden-back debug exe 可构建/在库。若 R-3 选 VM 模式
后端，须确认该 exe 的 vm 分支运行时同源。

## 5. 详细设计

### 5.1 双轨形态（T-00 R-1 输出回填处）

候选 A（`render: ["vm","vue"]`）与候选 B（`render: "vue"` + `-r vm` 运行
覆盖）择一；判据 = ① `auto build` 能否在含 vm 项的声明下仍出 vue 工程；
② `run -r vm` 能否在 `render:"vue"` 工程上解释运行（F-4 先例为 desktop
独立工程，非本形态）；③ 生成物互不污染。裁定与冒烟证据落 t00 决策档。

### 5.2 store 与视图（最小集）

- `editor_store.at`：tabs（path/内容/脏标）+ open/save/reload handler；
  vm 字节码规避与 view 不能调 fn 等 038/402 约束照 auto-edit Concepts。
- `app.at`：filetree（bps tree_util/tree_icon）+ 编辑区（autodown_editor，
  key=path 重挂载播种通道，jade desktop app.at:301 形态）+ status 行。
- 保存流：INPUT_TEXT 全文回写（041 editor_store 同约定）→ /api save。

### 5.3 契约副本与漂移门

`scripts/contract-sync.mjs --check`：`src/back/api.at` ↔ auto-down
`jade-garden/back/auto/api.at` 字节等价（冻结源，单向部署）；ROUTE/#[api]
语法面校验复用对拍思路（F-9）。jade-edit 消费的最小类型集 = files/read/
save/health 四路由起步（其余路由副本携带但初始版不消费）。

### 5.4 双轨一致性门 v0

`scripts/gate.mjs`：顺序跑 ① vm 矩阵（六检查：boot/tree/open/edit/
save/reload）② vue playwright（**同一检查单**）③ 契约漂移门。断言域 =
两轨交集（结构/文本断言，非像素）；差异登记表 `docs/parity-ledger.md`
v0 首版：初始已知差异 = F-7 tofu/hljs 债 + engine experimental 面 +
R-2 未决面（若 menubar 降级则记入）。

### 5.5 规范增量

| delta_id | add/modify/retire | target | before/after | rationale | AC |
| --- | --- | --- | --- | --- | --- |
| SD-01 | add | jade-edit/docs/ARCHITECTURE.md（+README 定版） | before：无（新仓）/ after：单工程双轨架构定版（双轨机制裁定、外部官方组件消费、契约复用、差异登记 v0、双轨同日落地纪律） | 新应用首个 spec 面；后续所有功能的架构锚 | AC-01/02/05 |

auto-down 侧**零 spec 增量**（冻结纪律，AC-07 守）；auto-lang 侧零改动
（勘定结论仅登记引用）。

## 6. 测试设计

| 门 | 形态 | 预期 |
| --- | --- | --- |
| vm 矩阵 | MCP autoui_state/snapshot 六检查（tests/） | 全绿 exit 0 |
| 结构基线 v0 | vm 轨 iced 结构快照（jade baseline txt 形态） | 首锁后零漂移 |
| vue smoke | playwright 六检查同单（e2e/） | N/N pass |
| vue build | `pnpm build`（vue-tsc+vite） | 0 错 |
| 契约门 | contract-sync --check | exit 0 |
| 双臂 gate | gate.mjs（①+②+③ 顺序） | exit 0 |
| 冻结纪律 | auto-down `git status` tracked 面 | 净（AC-07） |

## 7. 验收标准

- **AC-01（仓落成）**：`D:\autostack\jade-edit` git 仓存在、首 commit 含
  pac.at/src/tests/docs 全骨架；`git -C D:/autostack/jade-edit status`
  clean。验证 = 目录实查 + git log。
- **AC-02（双轨定形）**：t00 决策档在库（三勘定 R-1/R-2/R-3 各含裁定 +
  可复跑勘定命令 + 证据）；pac.at 双轨形态与档一致。验证 = 档在 +
  `auto build` 与 `auto run -r vm` 双冒烟命令复跑通过。
- **AC-03（vm 环全通）**：vm 矩阵六检查全绿（boot/filetree 列出 fixture
  wiki 文件/open `.ad` 进 autodown_editor/编辑回写/保存落盘文件字节可
  验/重载可见新内容）。验证 = `node tests/vm_matrix.mjs`（暂名）exit 0。
- **AC-04（vue 环全通）**：同一检查单 playwright 全过 + `pnpm build`
  0 错。验证 = `pnpm test:e2e` + `pnpm build`。
- **AC-05（一致性门 v0）**：`node scripts/gate.mjs` 顺序三段全绿 exit 0；
  `docs/parity-ledger.md` v0 在库且初始差异项与实勘一致。验证 = 复跑
  gate + 档存在性/条目核对。
- **AC-06（契约复用）**：漂移门绿（副本 ↔ auto-down 源字节等价）；
  run-back.mjs 可一键起后端（axum 或 VM 模式，按 R-3 裁定）+ fixture
  workspace 隔离拷贝。验证 = `contract-sync.mjs --check` exit 0 + 手跑
  run-back 后 health ok。
- **AC-07（冻结纪律）**：本计划全程 auto-down 无 tracked 改动
  （`git -C D:/autostack/auto-down status` 除既有 untracked 外净）。

## 8. 执行步骤

| ID | 任务 | 依赖 | 关键产出 | AC | 验证命令（预期） |
| --- | --- | --- | --- | --- | --- |
| T-00 | 三勘定：R-1 双轨机制（5.1 判据）/ R-2 actions-vue 现状（F-1↔F-2 矛盾勘定）/ R-3 后端选型（axum vs VM 模式）+ engine 消费面风险 | — | `docs/plans/attachments/081-t00-rulings.md`（决策档，T-01 后平移入 jade-edit 仓 docs/） | AC-02 | 档内勘定命令逐条复跑一致 [✅ 已完成 2026-09-20：三勘定全落——R-1 裁 A'（Multi 声明+双命令分工，五探针实证：③④⑤ PASS/①脚枪围栏/②成立）；R-2 裁 F-1 过时（vue.rs:6835 PLAN-070 T-05 去门化，actions 双轨可用，残余=use 深度不对称纪律）；R-3 裁 axum（双轨在跑配方）+VM 模式一 env 开关留战略后续；§10 五默认裁定随"开工"授权采纳（见档尾表）。证据：attachments/081-t00-rulings.md + 探针 D:/autostack/tmp/081-probe/（probe-run-vm.mjs 快照锚 Probe081 双形态命中）] |
| T-01 | 仓库骨架：git init、目录树、.gitignore、README+PROVENANCE（全新应用溯源）、首 commit | T-00 | 仓 + 骨架 commit | AC-01 | `git -C D:/autostack/jade-edit log` [✅ 已完成 2026-09-20：139ee98（init -b master；.gitignore 含 R-1 围栏 gen/build/dist；docs/README+PROVENANCE+t00 决策档平移；八文件骨架）] |
| T-02 | pac.at 定稿（deps bps/stylekit + npm_deps engine link + 双轨声明按 R-1）+ app.at/editor_store.at 最小壳 + filetree bps 消费 | T-01 | 单源核心壳，vm 轨可 boot | AC-02/03 | `auto run -r vm` 手动冒烟 boot [✅ 已完成 2026-09-20：commit 6fad6cb——render:["vm","vue"] A' 声明 + EditorStore 四 handler + App 壳（filetree bps 零副本/编辑器绑定/空态锚）。冒烟 ALL PASS：后端 health ok + status ready + filetree 列出 fixture 五 .ad（Hello World.ad 等按钮锚）+ 空态文本；MCP 快照 58 行结构完整；vue 侧 `auto build -r vue --gen-only` 解析同过（useEditorStore.ts/api client 生成）] |
| T-03 | 编辑器接入：autodown_editor 绑定（key 播种 + INPUT_TEXT 回写）+ 保存流接 /api；vue 轨 engine stub 配方（F-13） | T-02 | 编辑环 vm 轨可用 | AC-03 | vm 手动开/编/存 [✅ 已完成 2026-09-20：commit 93ca7be——两 VM 硬约束实测定律并修（JsonAny 经 VM 变量/Obj 字面量存取均损坏⇒Save 现读现传；INPUT_TEXT=整文替换语义）；vue 轨 stub 配方实为 T-06 regen-vue 生成链内补件（auto-sources stub/env.d.ts）+ npm_deps link 直连 engine（无独立 stub 层——生成器原生映射 AutoDownEditor），登记于 D-3/D-4 与 ARCHITECTURE §4] |
| T-04 | 契约副本部署 + contract-sync 漂移门 + run-back.mjs（后端定位/启动/fixture 隔离） | T-01（并行 T-02/03） | 后端通道 + 门 | AC-06 | `node scripts/contract-sync.mjs --check`（exit 0）[✅ 已完成 2026-09-20：契约面 0a33794（ROUTE 31/#[api] 28 门绿）+ run-back 面 ccdf338（exe 拷贝隔离根治 config-压-env 事故 + workspace 实际根 belt 断言；手跑 health ok 实证）] |
| T-05 | vm 矩阵六检查 + vm 结构基线 v0 首锁 | T-03/04 | `tests/vm_matrix` + baseline | AC-03 | `node tests/vm_matrix.mjs`（exit 0）[✅ 已完成 2026-09-20：commit 2e7f8a1——7/7 PASS（六检查 + 基线即时复跑零漂移）；基线=## state 全量+## snapshot 原始（vnode id 结构确定性哈希）] |
| T-06 | vue 面：`auto build` 生成链 + vite 工程 + stubs 再部署脚本 + playwright 六检查同单 + build 绿 | T-03/04 | vue 轨全通 | AC-04 | `pnpm test:e2e && pnpm build` [✅ 已完成 2026-09-20：commit c0cf42f——build 绿（vue-tsc+vite）+ test:e2e 6/6 同单；单源重构 013 形态（.store.* 读面）+ 生成链四缺口补丁（regen-vue.mjs）；stubs 再部署=无 deploy 步（vue 面纯生成物，jade-edit 无手写 vue 文件）] |
| T-07 | gate.mjs 双臂门 + docs/ARCHITECTURE.md 定版（SD-01）+ parity-ledger v0 | T-05/06 | 一致性门 + spec 面 | AC-05 | `node scripts/gate.mjs`（exit 0）[✅ 已完成 2026-09-20：commit 69b06fc——gate ALL GREEN 四段（vm 矩阵/vue build/vue e2e/契约）；ARCHITECTURE SD-01 + C-1..C-6 定律表；parity-ledger v0 九项三分类] |
| T-08 | 收尾：README 使用节（运行矩阵：vm/vue/后端三命令）、冻结纪律终验、复审交接（/auto-plan:review） | T-07 | 复审就绪态 | AC-07 | `git -C D:/autostack/auto-down status`（tracked 净）[✅ 已完成 2026-09-20：commit 7ab3911——README 运行矩阵五块命令全实测回填；冻结终验=auto-down status 仅既有 untracked（plan 文件+attachment+front/tmp），tmp/wiki-demo 途中被写坏一次已 git restore 还原并经 run-back exe 拷贝隔离根治（ccdf338）] |

## 9. 复审记录

| 日期 | 记录 |
| --- | --- |
| 2026-09-20 | stage: new / PLAN-081 r1 起草完毕，/auto-plan:new 交 work 前用户裁决 §10 五项。outcome: pass（起草面）/ next: 用户裁待澄清 → work。 |
| 2026-09-20 | stage: work / PLAN-081 r1 / 用户"开工"授权 drafting→executing，§10 五项按默认采定（决策档尾表）/ outcome: T-00 pass（三勘定+决策档 attachments/081-t00-rulings.md）/ code_commit: jade-edit 仓未建（T-01）/ task_ids: T-00 / evidence: R-1 五探针（Multi+双命令分工裁 A'）、R-2 vue.rs:6835 源码级勘定、R-3 axum 双轨在跑配方 / blockers: 无 / next: T-01 仓骨架。 |
| 2026-09-20 | stage: work / PLAN-081 r1 / outcome: **pass（T-01..T-08 全闭环，execution_done）** / code_commit: jade-edit 仓 9 commits（139ee98→7ab3911，master）/ task_ids: T-00..T-08 全 / evidence: 双臂 gate ALL GREEN（vm 矩阵 7/7 含基线零漂移 + vue build 绿 + e2e 6/6 同单 + 契约门）；T-00 三勘定档；SD-01 ARCHITECTURE + parity-ledger v0 在库；冻结纪律=auto-down 全程 tracked 净（AC-07；tmp/wiki-demo 一次写坏已还原+根治）/ blockers: 无 / next: /auto-plan:review（复审）。执行注记：① 单源定形 013 形态（.store.* 读面——合并裸读/computed 均 vue 发射坏，T-06 实证）；② 保存流 VM 定律：JsonAny 不得经 VM 变量存取（现读现传）+ INPUT_TEXT=整文替换；③ 生成 api client 四上游缺口（regen-vue 补丁守）；④ 后端 config-压-env 事故机理与 exe 拷贝隔离根治；⑤ T-03 的"vue stub 配方"实收窄为生成链内补件+原生映射（无独立 stub 层，差异登记 D-3/D-4）。 |
| 2026-09-20 | stage: review / PLAN-081 r1 / outcome: **pass** / reviewed_commit: jade-edit 7ab3911（master，9 commits 139ee98→7ab3911；工作树净）+ auto-down d1a83b6（未动，冻结净——仅既有 untracked）/ base_commit: d1a83b6 / dependency_revisions: auto-lang f7b6af91e（exe v0.4.2-1476；examples/rust-workspace/Cargo.toml 既有 WIP 非本计划）、auto-down jade-garden-back.exe（库内 debug 构建）/ spec_inputs: §5 SD-01 表 + jade-edit docs/ARCHITECTURE.md + parity-ledger v0 + t00 决策档 / acceptance_results: AC-01 pass（仓在/骨架齐/status 净/git log 实查；RF-1 info）；AC-02 pass（t00 档在库三勘定齐 + pac.at render:["vm","vue"] 与裁定一致 + 双冒烟以更强形态复跑=gate vm 7/7 与 vue build 绿）；AC-03 pass（vm_matrix 7/7 复跑，六检查含保存落盘字节三验/重载可见）；AC-04 pass（pnpm build 绿 + test:e2e 1 passed 六检查同单）；AC-05 pass（gate.mjs exit 0 四段复跑 ALL GREEN + parity-ledger v0 在库与实勘一致[D-01 tofu/D-02 experimental/D-05 R-2 残余]）；AC-06 pass（contract-sync --check exit 0 复跑 + run-back 手跑 health ok 实证[本复审独立端口 8215]）；AC-07 pass（auto-down 全程 tracked 净终验） / findings: RF-1 info（AC-01 字面"首 commit 含 pac.at"——pac.at 落 T-02 commit 6fad6cb，骨架两笔成型，终态齐/验证法[目录实查+git log]通过，不改验收实质）；RF-2 info（T-03 子项"vue stub 配方"收窄为生成链内补件+原生映射，意图达成并验证，D-3/D-4 登记）；RF-3 info（复审同会话非独立——以门复跑+git/工件实查重建结论，不采信执行叙述）；RF-4 info（t00 探针目录 tmp/081-probe 为临时复跑面，核心命令在真实仓有等价更强形态）/ evidence: node scripts/gate.mjs ALL GREEN（vm 7/7+build+e2e+契约，复审基线复跑）；run-back 8215 health ok；jade-edit git log 9 commits 实查；auto-down status 净 / next: merge。 |
| 2026-09-20 | stage: merge / **PLAN-081:r1 五 checkpoint**——① prepared：reviewed 7ab3911（jade-edit master 9 commits，工作树净）+冻结 delta（auto-down 零 spec 增量 AC-07；SD-01 在 jade-edit/docs/ARCHITECTURE.md 随彼仓交付）+投影目标 .autoos/specs.json（250 条基线）→ worktree D:/autostack/.wt/down-081/auto-down @ plan-081-dev 提交 e2cea48（P081-1 reviews 收据，JSON round-trip indent=1 最小 diff 12 行）；② landed：主检出 `git merge --ff-only plan-081-dev` → master tip = e2cea48（无 merge commit；本计划 auto-down 零代码改动，delivery=jade-edit 仓 7ab3911——跨仓交付形态，ff 链=纯投影）；③ ledger_refreshed：主检出读回 251 items/reviews 53/P081-1 file=docs/plans/archived/081-jade-edit-bootstrap.md ✓；④ archived：本 commit（untracked 计划平移入册 status archived + completion_kind delivered + t00 附件随档入册；jade-edit 仓内 docs/plans/081-t00-rulings.md 为持久决策档副本）；⑤ cleaned：wt-guard clean（无 reparse point）→ worktree D:/autostack/.wt/down-081/auto-down 移除 + plan-081-dev 删除（was e2cea48，fully contained in master）+ 组目录 down-081 移除 + prune 零残留（worktree list 无 down-081 项）——本 commit 回填。 |

## 10. 待澄清事项（均用户裁定，默认值供采）

1. **actions{} vue 生成器缺口归属**（R-2 勘定输入）：若确未接入——上游
   另立计划（**默认建议**，jade-edit 初始版 menubar 降级为最小/无）vs
   本计划内含 auto-lang 侧任务（扩规模）。影响 T-02 视图面与 AC-05 断言面。
2. **本计划归属**：PLAN-081 落 auto-down 账本（**默认**，上下文与账本
   所在；merge 时归档此间）vs 迁 jade-edit 仓为 001。
3. **stylekit 消费路径**：跨仓相对路径 `../auto-edit/specs/stylekit`
   （**默认**，dep 为 path 型即可）vs stylekit 先升位独立包/入 bps。
4. **初始版 menubar 取舍**（联动 #1）：无 menubar 仅 status 行（**默认
   最小**）vs DSL 直建静态 menubar（jade desktop menubar-menu 元素族
   形态）。
5. **后端二进制消费约定**：直引 auto-down 构建产物路径（**默认**，
   run-back.mjs 内一处定位 + 缺失时提示构建命令）vs 部署副本 + 新鲜度
   门（engine assert-dist-fresh 式）。
