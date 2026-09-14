---
plan_id: PLAN-064
status: archived
feature_name: jade-garden VM 轨第一刀——ext 层审计建账 + vm-smoke harness + tabs_store 编辑器流 VM 化
author: zcode
created_at: 2026-09-12T12:30:00+08:00
updated_at: 2026-09-14T12:00:00+08:00
plan_revision: 1
current_step: 7
total_steps: 7
supersedes_spec_components: []
new_spec_components:
  - ".autoos/specs.json#P064-1"
  - ".autoos/specs.json#P064-2"
  - ".autoos/specs.json#P064-3"
  - ".autoos/specs.json#P064-4"
  - ".autoos/specs.json#P064-5"
  - ".autoos/specs.json#P064-6"
touched_goals: []
---

# PLAN-064 — jade-garden VM 轨第一刀（ext 审计 + harness + tabs 编辑器流）

## 0. 变更摘要

jade-garden 的桌面（VM/iced）形态现状是 plan-022 收口时的骨架探针：运行时、契约
（25 个 `#[api]` fn + 四方对拍门检）、后端三通道（split / merged /
`JADE_GARDEN_SERVER=vm`）、六条核心流全部实证可用；真正的缺口是 **front 层 29
widget 的交互逻辑一半活在 37 个 `*_ext.ts` TypeScript 文件里，VM 不可达**。本计划
是 29-widget 迁移的**第一刀兼模板**，三件事：

1. **ext 层复扫建账 + 能力桥注册表**：desktop/README §2 的 37 文件清单基线日
   2026-08-29，此后 blockParser.ts 已删、读路径已切 engine（plan-022 Phase 5），
   先复扫；再建**三分类注册表**（sink=下沉 `.at` / bridge=VM 原生·宿主桥 /
   deviation=登记偏差）并配门检脚本——未登记的 ext 导出一律红。注册表是后续
   28 个 widget 迁移的常设工件，形态对齐 `#[api]` 门检纪律。
2. **jade vm-smoke harness 落地**：移植 demo `auto/vm-smoke.mjs` 的
   AutoUI-MCP 驱动模式（plan-022 的 probe_driver_*.mjs 只存在于已归档 worktree，
   master 须重建）；六流臂先在骨架 app.at 上跑绿，作为 tabs 臂的载体。
3. **tabs_store 编辑器流 VM 化**：`tabs_store.at`（214 行）已是全量状态机
   （多 tab/脏态/双读竞争防护），VM 死穴是 `use back.api:` 里混入的 6 个 TS ext
   助手（rethrow / ensureBlockAnchors / recordRecent / stripExt / confirmClose /
   adoptSaveResult）。逐个按注册表处置后，骨架 app.at 编辑区升级为 tabs 驱动的
   多 tab 流，MCP 驱动断言全过。

**硬约束：vue 轨零改动**——gen.mjs 再生后 vue-tsc / vite / web e2e 23/23 必须
原样绿（P063 已验证该纪律可行）。本计划**不实施** auto-lang 侧任何改动，只产
提案清单（dir-picker / confirm 模态 / CALL_SPEC RC / tick 原语；P063 在案的
scroll_to 绝对偏移与 AnchorSlot downcast panic 引用不重复立项）。

与 PLAN-063 关系：两计划共用 auto-lang master 二进制（解释器 + iced 渲染），
T-03 起步时记录构建基线 commit；本计划不触及滚动同步面（editor widget 迁移时
才消费 063 的命令/显示分离契约）。

## 1. 目标

- **G1 注册表建账**：37 个 `*_ext.ts` 全量复扫，逐导出 fn 三分类登记，
  门检脚本可重跑、未登记即红（AC-01）。
- **G2 harness 可重复**：jade 版 vm-smoke 在主检出（worktree 内）一键跑通六流臂，
  内建 fixture 恢复协议（清偿 P022-6 终审登记的 probe 卫生债）（AC-02）。
- **G3 tabs 编辑器流 VM 通**：多 tab 打开/切换/脏守卫（降级语义）/保存落盘/
  双读竞争防护五断言经 MCP 驱动全过（AC-03）。
- **G4 web 零回归**：十套 node 门 + 契约门 + cargo + vue-tsc/vite + e2e 全绿
  （AC-04）。
- **G5 提案清单入档**：auto-lang 侧阻塞项五件各含实证引用，DEBTS + desktop
  README 双登记（AC-05）。
- **非目标**：其余 28 widget 的批量迁移；autodown_editor（cosmic-text）替换
  textarea（S3，前置 P063 T-04d 块锚定落地）；图谱力导向画布；Tauri 路线
  （P022 §7.1 已否决）；a2r-UI 编译端点（本计划只保障"一切可 `.at` 表达"
  前提）；auto-lang 仓内任何代码改动。

## 2. 架构方案

```
                    ┌─ 能力桥注册表（新工件）────────────────────────┐
                    │ desktop/ext-registry.json                      │
                    │ {file, fn, class: sink|bridge|deviation,       │
                    │  target, evidence, gate}                       │
                    │ desktop/scripts/ext-registry-gate.mjs（门检）  │
                    └───────────────┬────────────────────────────────┘
                                    │ 三分类处置
  web 轨（零回归）                   ▼                    VM 轨（本计划主战场）
  ┌──────────────────────┐   gen.mjs 双发射不变   ┌─────────────────────────────┐
  │ a2ts → SFC/ext 门面  │◀──── 同一份 .at ─────▶│ auto run -r vm（iced 窗口） │
  │ front/src + e2e 23/23│                        │ desktop/src/front/app.at    │
  └──────────────────────┘                        │  └ tabs_store 驱动多 tab 流 │
                                                  │ AUTOUI_MCP_PORT → vm-smoke  │
                                                  └─────────────────────────────┘
```

- **注册表是接缝的制度化**：ext fn 的三种归宿各有既有先例背书（sink：engine
  四件套 / unlinked.at 摘 regex；bridge：clipboard=arboard、localStorage=Plan
  401 session KV、http 原生族 2225/2226；deviation：plan-022 迁移期 confirm
  语义保形、matchMedia 恒 dark）。禁止第四类"jade 侧绕过"——平台能力缺口走
  auto-lang 提案（P022 §7.1 裁定延续）。
- **harness 模式照搬 demo**：`auto.exe run -r vm` + `AUTOUI_MCP_PORT`，断言走
  autoui_state / autoui_snapshot / autoui_action 合成通道（物理点击通道环境
  不稳，P022 slice 3 登记项②，验收以 MCP 通道为准）；移植 demo 的杂散进程
  清扫与端口冲突处理先例。
- **web 侧零改动面**：`tabs_store.at` 修改经 gen.mjs 再生，`tabs_store_ext.ts`
  仅收缩为 web 轨消费的生成对拍面；`front/src/stores/tabs.ts` 手写 facade
  （Tab 接口宿主）不动。

## 3. 技术栈

- DSL/运行时：auto-lang master（`auto run -r vm`；AutoUI MCP 驱动；
  442 store facade / 401 session KV / 340 api_over_http 均为已折 master 能力）。
- 生成管线：`jade-garden/back/auto/gen.mjs`（a2ts + a2r 双发射 + 部署）。
- web 门：node parity 套件（`back/auto/tests/*-parity.mjs`）、契约门
  （`api-contract-routes.mjs`）、vue-tsc + vite（`front/`）、playwright e2e。
- 桌面门：新 harness `desktop/vm-smoke.mjs`（node，MCP over port）。

## 4. 需求分析与背景调查

**授权记录（2026-09-12 会话）**：用户批准按推荐立项——第一刀 = S0 审计建账 +
harness 落地 + tabs_store 编辑器流 VM 化，作为后续 28 widget 迁移模板。范围：
本仓 jade-garden 与 docs/；auto-lang 侧仅产出提案文档，不跨仓改码。预算与自动
续跑限制：用户未指定。

**背景调查（本仓实勘，2026-09-12）**：

| 事实 | 证据 |
| --- | --- |
| tabs_store.at 已是全量状态机（214 行）：多 tab、脏态、保存 try/catch/finally、Open/Load 双读竞争防护（post-await re-check） | `jade-garden/front/auto/src/front/tabs_store.at` 头注 + L44-58 |
| VM 死穴精确：store 经 `use back.api:` 混入 6 个 TS ext 助手——rethrow、ensureBlockAnchors、recordRecent、stripExt、confirmClose、adoptSaveResult（gen 管线 sed 改写到 tabs_store_ext.ts） | 同上 L15 注释块；`utils/tabs_store_ext.ts`（ensureBlockAnchors 新家，DEBTS 020 已清偿行） |
| Tab 接口宿主是手写 facade（web 侧），.at 侧 `Array<str>`=any | `front/src/stores/tabs.ts`；tabs_store.at L11-13 |
| ext 清单基线漂移：README §2 机扫日 2026-08-29（37 文件），此后 blockParser.ts 删除、读路径切 engine | desktop/README §2；P022-6；DEBTS 020 行 |
| probe 驱动不在 master：probe_driver*.mjs 属已归档 worktree `.worktree/plan-022/tmp/core-probe/` | `tmp/core-probe/` 主检出为空（实勘 2026-09-12） |
| harness 先例完整可移植：MCP 端口约定、杂散 auto.exe 清扫、断言臂组织、已知 fork 门演进 | `autodown/demo/auto/vm-smoke.mjs`（plan 042 T8 起，052/053 演进） |
| VM 子件登记纪律与 tick 缺位：子件须顶层 `use <模块>`；timer 走 ext 逃生舱（vue-only） | DEBTS 059 行 |
| P063 在执行：scroll_to 仅绝对偏移、AnchorSlot 委托层 downcast panic 挂起 | `docs/plans/063-vm-scroll-sync-oneway-anchor.md` §0/§4.2；commit 77e8fde |
| 契约面现成：25 个 `#[api]` stub fn（28 路由 − 3 multipart 豁免），四方对拍门检在库 | `back/auto/api.at`；`back/auto/tests/api-contract-routes.mjs` |
| 仓库级 AGENTS.md 缺位（根目录与 jade-garden/ 均无），流程约定以本 Plan 与 auto-plan 技能为准 | 实勘 2026-09-12 |

**Spec 关系**：权威基线 = `.autoos/specs.json#P022-1..6`（jade VM 化全计划，含
P022-3 即日生效纪律与 P022-6 终审门/已登记延后项）。本计划全部为新增组件
（P064-1..6），不改写 P022 任何条目。

## 5. 详细设计

### 5.1 注册表工件（T-01/T-02）

`desktop/ext-registry.json` 条目 schema：

```json
{ "file": "editor_tab_ext.ts", "fn": "listenEditorHover",
  "class": "bridge", "target": "iced widget bounds + popover（464 先例）",
  "evidence": "README §2 dom-walk 裁定", "gate": "T-05 迁移臂" }
```

- 机扫脚本先重跑 37 文件清单（对照 README §2 基线，输出漂移：blockParser 已删、
  读路径 engine 化），再逐导出 fn 补 `class/target/evidence`。
- 门检 `desktop/scripts/ext-registry-gate.mjs`：扫描 `utils/*_ext.ts` 的导出面
  与 `.at` 源的 `use { ... from "...ts" }` 引用，双表对拍——**引用了但未登记 = 红；
  登记了但引用已消失 = 红（防死账）**。接入点：独立 node 脚本，本计划内随
  vm-smoke 与 web 门一并跑，暂不改 gen.mjs（避免发射器面扩大）。

### 5.2 tabs_store 六助手处置表（T-04 核心裁定）

| 助手 | 分类 | 处置 | 依据 |
| --- | --- | --- | --- |
| rethrow | sink | 语义内联进 tabs_store.at 既有 try/catch（编译器 ≥ c5b5fecf 已支持真实 try/catch/finally） | store 头注 gap 4 先例 |
| stripExt | sink | `.at` 纯函数（字符串后缀剥离） | engine 四件套先例 |
| adoptSaveResult | sink | 保存回写纯状态逻辑移入 store handler | 022 Phase 3 双读竞争防护同域 |
| recordRecent | bridge | VM 侧 Plan 401 session KV（localStorage 桥）；web 侧原 localStorage 语义不动 | 442 webcompat 实证 |
| confirmClose | deviation | VM 轨默认确认（关闭即弃），登记偏差；auto-lang confirm 模态到位后升级 bridge | P022-6 已登记延后项的既定语义保形 |
| ensureBlockAnchors | deviation（v1） | VM 轨保存不注入 `^锚点`（与骨架 app.at 现行为一致）；登记前置=VM 侧 parser 原生面可消费时升级 sink | 骨架 save 已实证可用（slice 4，frontmatter 保真）；parser 行号面在 parser_gen（TS 产物），VM 不可达 |

> 处置表落注册表后由门检钉死；执行期若发现 VM 侧有现成 parser 原生面，
> ensureBlockAnchors 可升级 sink——属等价实现内裁定，不扩授权。

recordRecent 的 VM 侧 KV 确切 API 名（Plan 401/442 corpus 面）在 T-04 内做
**有界调查**（查 auto-lang corpus 与 442 webcompat 断言，产出一行证据入
注册表），不单列任务。

### 5.3 harness（T-03）

`desktop/vm-smoke.mjs`，参照 demo 同名件：

- 启动：`AUTOUI_MCP_PORT=<port> auto.exe run -r vm`（cwd=desktop/；AUTO_BACKEND
  指向 `back/server` 起的 8199；merged/split 二选一臂，默认 split）。
- 前置：起后端 + fixture 恢复协议（`restore-fixture.mjs` 语义重建——探针直写
  共享 fixture 的卫生债，P022-6 登记；隔离工作区仍被 app.at 硬编码路径阻塞，
  维持登记）。
- 臂组织（v1）：六流臂 = open-ws / files / read / save / links / cards / d4 /
  search（对齐 P022-6 驱动验收口径的断言语义，重建于 master）；启动即记录
  auto-lang 二进制 commit（`auto --version` 或构建目录实勘），登记入运行日志。
- 杂散进程清扫与端口冲突处理照搬 demo 先例；窗口偶发自退按登记处置：重试一次
  + MCP 合成通道断言为准。

### 5.4 app.at tabs 流升级（T-05）

- `use tabs_store:`（442 store facade 原生形态）替换 app.at 内联的
  active_* 模型；视图改绑 `.tabs/.active_path`。
- 打开/切换/关闭/保存 handler 走 store msg（Open/Close/SetBody/Save）；
  关闭脏 tab 经 confirmClose deviation 通道（默认确认）。
- 断言五件（vm-smoke tabs 臂）：①双 tab 打开且列表在场；②切换回读正文不串页；
  ③脏态关闭（降级语义）+ 状态行登记；④Save 清脏 + 磁盘落盘；⑤同路径重复
  Open 不覆盖已 loaded tab（双读竞争防护，022 Phase 3 e2e 11-properties 同款）。
- 视图新增子件遵守顶层 `use <模块>` 登记纪律（DEBTS 059 先例）。

### 5.5 auto-lang 提案清单（T-06，只产文档）

五件，各含实证引用：①目录/文件选择器宿主能力（rfd；解除 app.at 硬编码路径与
导入导出探针常量）；②confirm 模态语义；③CALL_SPEC 返回列表 RC 接线
（`.length` 恒 0，432 D26 对偶）；④tick/timer 原语（DEBTS 059 同族）；
⑤引用 P063 在案两项（scroll_to 绝对偏移限制、AnchorSlot downcast panic）——
仅交叉引用不重复立项。落点：DEBTS 新行（编号 064）+ desktop/README 新 §8
提案节。

### 5.6 规范增量

| delta_id | add/modify/retire | 目标 | before/after | rationale | AC |
| --- | --- | --- | --- | --- | --- |
| SD-01 | add | .autoos/specs.json#P064-1 | 无 → 变更摘要（第一刀范围 + vue 轨零改动纪律） | 接续 P022 的 VM 轨演进 | AC-04 |
| SD-02 | add | .autoos/specs.json#P064-2 | 无 → 目标 G1-G5 + 非目标 | 立项范围权威化 | 全部 |
| SD-03 | add | .autoos/specs.json#P064-3 | 无 → 注册表三分类纪律 + 门检 + harness 模式 | ext 接缝制度化为常设工件 | AC-01, AC-02 |
| SD-04 | add | .autoos/specs.json#P064-4 | 无 → 六助手处置表 + tabs 流形态 | tabs_store VM 化裁定记录 | AC-03 |
| SD-05 | add | .autoos/specs.json#P064-5 | 无 → 测试设计（门清单 + 臂列表 + 竞争断言） | 可重复验收面 | AC-02..AC-04 |
| SD-06 | add | .autoos/specs.json#P064-6 | 无 → 验收/复审记录（终审时回填） | 复审留痕 | AC-05, AC-06 |

## 6. 测试设计

- **web 零回归门（全部既有，不新增）**：十套 node parity 门 + 契约门
  （`back/auto/tests/`）28/28 + 25 fn + desktop 副本漂移；`back/server`
  cargo（P022-6 基线 40/40）；`front/` vue-tsc + vite build 0 错；
  playwright e2e 23/23。gen.mjs 再生后跑（tabs_store.at 与 ext 收缩的
  双发射确定性对拍）。
- **桌面新门**：`desktop/vm-smoke.mjs` 全臂 PASS（六流臂 + tabs 臂），
  断言全部经 MCP 合成通道（autoui_state / snapshot / action），臂内含
  fixture 恢复与杂散进程清扫。
- **注册表门**：`ext-registry-gate.mjs` exit 0（双表对拍，见 5.1）。
- **竞争防护专项**：tabs 臂第⑤断言以重复 Open 同路径驱动（VM 后端双读乱序
  语义，022 Phase 3 e2e 11-properties 先例）。

## 7. 验收标准

| ID | 标准 | 验证方法 | 期望 |
| --- | --- | --- | --- |
| AC-01 | 注册表全覆盖且门检绿 | `node jade-garden/front/desktop/scripts/ext-registry-gate.mjs` | exit 0；README §2 更新为复扫结果，无未登记引用、无死账 |
| AC-02 | harness 六流臂可重复绿 | 后端起 + `node jade-garden/front/desktop/vm-smoke.mjs`（AUTOUI_MCP_PORT） | 全臂 PASS ×2 连续跑；fixture 恢复协议生效（跑前后 fixture 内容一致）；日志含 auto-lang 构建基线 |
| AC-03 | tabs 五断言过 | 同上，tabs 臂 | §5.4 五件全过（含双读竞争防护⑤） |
| AC-04 | web 零回归全门 | 十套 node 门 + 契约门 + cargo + vue-tsc/vite + e2e | 与 P022-6 基线同口径全绿（e2e 23/23） |
| AC-05 | 提案清单入档 | 读 DEBTS 064 行 + desktop/README §8 | 五件各含实证引用；P063 两项为交叉引用 |
| AC-06 | 结构基线更新 | `baseline/` 重生成脚本 diff | tabs 面板结构在案（对齐 slice 5 基线格式） |

## 8. 执行步骤

| ID | 任务 | 依赖 | 文件/符号（实勘） | 产出 | AC | 验证 |
| --- | --- | --- | --- | --- | --- | --- |
| [x] T-01 | ext 层复扫 + 注册表落盘 | — | `front/auto/src/front/utils/*_ext.ts`（37）；`front/desktop/ext-registry.json`（**新**）；desktop/README §2 更新 | 机扫漂移清单 + 全量注册表 | AC-01 | 机扫脚本重跑输出与 README §2 一致 |
| [x] T-02 | 注册表门检脚本 | T-01 | `front/desktop/scripts/ext-registry-gate.mjs`（**新**） | 双表对拍门检 | AC-01 | 故意删一条登记 → 红；复原 → 绿 |

> T-01 ✅ 2026-09-14（commit 7b2d9b7）：复扫 37 文件与基线一致（29 widget +
> 8 store），文件级漂移零；内容漂移两笔均 P022 Phase 5 已收口
> （blocks_store_ext 读路径→engine、ensureBlockAnchors→parser_gen、
> blockParser.ts 已删）。注册表落盘 `desktop/ext-registry.json`：302 导出 =
> sink 245 / bridge 36 / deviation 21；README §2.1 复扫小节。
> T-02 ✅ 2026-09-14（commit 7b2d9b7）：门检四规则（未登记/死账/sed 契约破/
> 引用悬空）+ 五字段校验；绿基线 PASS（exports=302 registry=302 atRefs=293，
> exit 0）；红测三条：删 stripExt 登记行→红(rule 1)、插 ghostFn→红(rule 2)、
> 探针 .at 引 noSuchFn→红(rule 4)，复原→绿。
| [x] T-03 | vm-smoke harness + fixture 恢复协议 | — | `front/desktop/vm-smoke.mjs`（**新**）；`front/desktop/scripts/restore-fixture.mjs`（**新**）；fixture=`tmp/wiki-demo` | master 可跑的六流臂 | AC-02 | 全臂 PASS ×2；记录 auto-lang 构建基线 commit |

> T-03 ✅ 2026-09-14（commit c2ac590）：全臂 PASS ×2 连续（open-ws / files /
> read / save / links / cards / d4 / search，MCP 合成通道 autoui_state /
> snapshot / action）；fixture git 语义恢复协议（scoped checkout+clean，
> hash 契约=wiki/**/*.ad 文档面，后端索引 sqlite/edn 非契约）前后一致 ×2；
> 基线 auto.exe=v0.4.2-401-gd3a44aa6f-dirty（auto-lang master 1098b418f）。
> 实勘修正：①app.at d4 探针常量 .worktree/plan-022（已归档）→ tmp/jade-probe；
> ②反链计数口径 engine 化后 bl=2/ol=2（P022 时点 3/2 旧口径——Tasks 的块引用
> 不并入页级反链）；③MCP initialize ≠ UI 已渲染，臂前须轮询首帧快照；
> ④端口 8199 曾被旧构建后端占用（无 /api/health 路由 404）——主检出
> jade-garden-back.exe 已重建（增量 1m10s），harness 加端口占用明确报错。
| [x] T-04 | 六助手处置 + gen 再生 | T-01,T-02 | `tabs_store.at`；`utils/tabs_store_ext.ts`（收缩）；`back/auto/gen.mjs` 再生产物；recordRecent KV 面有界调查（401/442 corpus） | 处置表全落注册表 | AC-01, AC-04 | web 十门 + 契约门 + cargo + vue-tsc/vite 全绿 |

> T-04 ✅ 2026-09-14（commit 1618f1e）。**有界调查结论**：①442 corpus
> `use store: X` facade + `use auth_util: fn` plain-fn 通道实证（VM 侧 store
> 可消费模块 fn）；②401 session KV = `localStorage.getItem/setItem`
> 在 .at 直呼（442 webcompat corpus None-on-miss 语义）；③Plan 367 P2-4
> store 文件内 module fn 双树可用（探针实证发射）；④**catch 强制必填**
> （`expected: Catch, found: finally`）且 DSL 无 throw——rethrow 处置由
> sink 修正为 deviation（web 保 ext 再抛 / VM plain fn 吞错登记）。
> **处置落座**：use 行 = `read_wiki, write_wiki, ensureBlockAnchors,
> recordRecent, confirmClose, rethrow`（契约 fn 名 + 4 助手）；stripExt →
> module fn `strip_ext`（parser.at endsWithStr 同款，无 regex）；adoptSaveResult →
> module fn `adopt_save_result` 纯值 CAS（语义逐字保形）；readWikiSafe →
> 3 调用点内联 try/catch null 映射；ext 收缩 8→6 导出（stub 同步换名）。
> **api.at 助手层**：+4 plain fn（无 #[api]，契约门不受计）随 gen.mjs 部署
> desktop 副本；ensureBlockAnchors=identity / confirmClose=true /
> recordRecent=localStorage(session KV) / rethrow=吞错，均登记偏差。
> **门**：十 node 门绿；assert-api-stub-sync 绿；ext-registry 绿（300/300）；
> vue-tsc + vite build 绿；e2e 23/23 绿。**两笔预存缺陷顺带修复**（master
> 上即红，非本计划引入）：①api-contract-routes 红——P013 T5 加 /api/health
> 未登记契约节（补 ROUTE 标记 + 门检 VM_ENVELOPE_EXEMPT 豁免，health 是
> daemon ping 非 JSON 契约）；②e2e 01-workspace 红——spec 断言 journals
> 树节点而该目录是 tmp/wiki-demo 的未跟踪 debris（worktree/全新 clone 必红），
> e2e-prepare 合成之（E2E-only fixture 既有模式）。
> **环境阻断登记**：cargo build/test 本会话 01:47 起全量被拒——rustc 写
> deps/*-<hash>.d 恒 "拒绝访问 os error 5"（跨卷复现：.wt 与主卷同拒；
> build/ 目录 .d 写正常、手写正常、build 脚本 .d 正常——EDR/AV 对哈希名
> 依赖文件批量创建的启发式拦截，本机多 agent 并行构建族，PLAN-049 同族
> 环境病）。缓解：server src 本计划零改动（双树 git 洁证），e2e/vm-smoke
> 用主检出 01:22 同源 exe；cargo test 门 T-07 重试，仍阻则按预存基线
> 登记转介。gen.mjs 再生：parser 九源逐字节不变；api_gen.ts 仅 +4 空行
> （K1 剥离 plain fn 后行结构残留，惰性）。
| [x] T-05 | app.at tabs 流升级 + tabs 臂 | T-03,T-04 | `front/desktop/src/front/app.at`；`vm-smoke.mjs` 增臂 | 多 tab 编辑器流 VM 通 | AC-03, AC-06 | tabs 臂五断言过；结构基线重生成 |

> T-05 ✅ 2026-09-14（commit 5eb0279）：tabs 臂五断言全绿 ×2（全臂跑，
> 六流臂同绿）：①双 tab 在场 ②切换回读不串页 ③脏态关闭降级语义 +
> 状态行 discarded-dirty 登记 ④保存清脏 + 磁盘落盘 ⑤重复 Open 在途编辑
> 存活（落盘实证）。结构基线 `baseline/iced-tabs-structure.txt`（slice 5
> 格式：## state + ## snapshot，再生 diff 空）；harness 加 --save-baseline
> 模式。**实现形态裁定（§5.4 修正）**：执行期实证 tabs_store facade 的 VM
> 面缺口簇——①widget handler 内读 store 字段失效（0/"" 哨兵）；②视图对
> store 字段不响应式回读（初始后冻结）；③store 模块内 #[api] 调用未走
> 340 HTTP 改写（静默执行 stub None，read/write 不落盘）；④lambda 捕获
> handler 本地变量/self 字段分别编译错/运行时静默失效（msg 参数捕获可用）；
⑤widget 模型数组 splice 静默失效。据此 tabs 流 v1 = widget 状态机等价
> 实现（022 Phase 3 语义字段级移植：closed 标记删除、⑤ loaded 守卫、CAS
> 回声采纳），§5.2 处置表语义全部保形；facade 迁移 = auto-lang 修复后置
> （README §8 提案⑥）。随行实证修正：反链 source_path 为页标题非路径
> （OpenFile 归一化 .ad 后缀，标题路径 tab 正文读 nil）；web 门快速复验
> 绿（vue-tsc/vite、e2e 23/23、注册表门 300/300）。
| T-06 | auto-lang 提案清单入档 | T-04（处置实证回填） | `DEBTS.md`（064 行）；desktop/README 新 §8 | 五件提案 + P063 交叉引用 | AC-05 | 文档评审：每件含证据路径 |

> T-06 ✅ 2026-09-14（commit bce4ebd）：README §8 六件提案各含实证路径
> （①rfd 目录/文件选择器 ②confirm 模态 ③CALL_SPEC 返回列表 RC ④tick/timer
> ⑤P063 两项交叉引用不重复立项 ⑥store facade VM 缺口簇——T-05 执行期实证
> 五子项，tabs_store facade 迁移前置）；DEBTS 064 行同口径入档。
| T-07 | 全量门复跑 + 收口 | 全部 | 本 Plan §9/进度注记 | 终审材料（六节 spec 回填） | AC-04, AC-06 | 全门绿 + 基线 diff 在案 |

> T-07 ✅ 2026-09-14：全门一致性复跑全绿——十套 node 门（api-contract-routes
> 29/29 路由 + desktop 副本字节一致）+ stub-sync + 注册表门（300/300）+
> vue-tsc/vite + e2e 23/23 + cargo test 45/45（worktree 本构建，EDR 阻断已
> 消退）+ vm-smoke 全臂（六流 + tabs 五断言）+ 基线再生 diff 空。7 个实现
> 单元 5 commit（7b2d9b7 / c2ac590 / 1618f1e / bce4ebd / 5eb0279）。
> 六节 spec 回填草案（merge 时落 .autoos/specs.json#P064-1..6）：
> - P064-1（goals·范围）：jade VM 轨第一刀 = ext 审计建账 + vm-smoke
>   harness + tabs 编辑器流；vue 轨零改动纪律（gen 再生确定性对拍）。
> - P064-2（goals·目标）：G1 注册表全覆盖门检绿 / G2 harness 可重复 /
>   G3 tabs 五断言 / G4 web 零回归 / G5 提案清单入档；非目标 = 28-widget
>   批量迁移、autodown_editor 替换（S3）、图谱画布、Tauri。
> - P064-3（architecture）：ext-registry.json 三分类（sink/bridge/
>   deviation）+ ext-registry-gate 双表对拍（未登记/死账/引用悬空红）+
>   vm-smoke harness 模式（MCP 合成通道 + fixture git 语义恢复协议）。
> - P064-4（designs）：六助手处置终态——rethrow/deviation（web ext 再抛/
>   VM 吞错）、stripExt/adoptSaveResult sunk（web composable module fn）、
>   readWikiSafe 内联、ensureBlockAnchors/confirmClose/recordRecent 按树
>   分置；api.at VM 助手层 4 plain fn（无 #[api]）。tabs 流 v1 形态裁定：
>   widget 状态机等价实现（022 Phase 3 双读竞争防护语义保形；closed 标记
>   删除——VM 模型数组 splice 失效绕行），tabs_store facade 迁移前置 =
>   auto-lang 提案⑥（desktop/README §8），修复后回归 `use store: Tabs`
>   形态（review F1 修正：补记持久裁定，实现未变）。
> - P064-5（tests）：十 node 门 + 契约门（health 豁免入册）+ cargo +
>   vue-tsc/vite + e2e 23/23 + 注册表门 + vm-smoke 全臂；tabs 五断言语义。
> - P064-6（reports/reviews）：终审回填（本记录 + AC-01..06 达标表）。

- 2026-09-14 stage:work handoff（/auto-plan:work，plan_revision 1）：
  `stage: work | PLAN-064 | rev 1 | pass | plan-064-dev@5eb0279（T-06/07 至
  bce4ebd+5eb0279，工作区洁） | T-01..T-07 | AC-01 注册表 300/300 门检绿；
  AC-02 harness 六流臂 PASS×2 + fixture hash 一致；AC-03 tabs 五断言×2；
  AC-04 十 node 门 + cargo 45/45 + vue-tsc/vite + e2e 23/23；AC-05 README
  §8 六件 + DEBTS 064；AC-06 基线再生 diff 空 | blockers: 无（cargo EDR
  阻断当轮消退；§5.4 facade 形态修正经等价实现闭环并挂提案⑥） | next:
  review（/auto-plan:review 复审）`
- AC 达标对照：AC-01 ✅（T-01/T-02/T-04）；AC-02 ✅（T-03）；AC-03 ✅
  （T-05）；AC-04 ✅（T-04/T-07）；AC-05 ✅（T-06）；AC-06 ✅（T-05/T-07
  基线再生 diff 空）。
- 遗留转介：①cargo EDR 环境病（本轮消退，复发属基础设施）；②tabs_store
  facade VM 缺口簇 → README §8 提案⑥（彼仓）；③journals 未跟踪 debris
  已由 e2e-prepare 合成消解。

- 2026-09-14 stage:review（/auto-plan:review，plan_revision 1，实现会话内
  复审——结论由工件独立重建，全部验证命令重跑）：
  `stage: review | PLAN-064 | rev 1 | pass | reviewed_commit
  bce4ebd4eac3746724a65071fb00ecd4cd811d66 | base_commit
  ad5b1d4c10516f5d2aa8566ae97843e6af584b9e | dependency_revisions: auto-lang
  master 557a815471（exe v0.4.2-401-gd3a44aa6f-dirty）| spec_inputs:
  .autoos/specs.json 新增 P064-1..6 草案（T-07 记录 + F1 修正）|
  acceptance_results: AC-01 pass（注册表门 300/300 重跑 + §5.2 处置逐行
  核对 + README §2.1 在档）；AC-02 pass（vm-smoke 全臂 PASS×2 重跑，16
  检查点，fixture hash 一致，auto-lang 基线入日志）；AC-03 pass（tabs 五
  断言含于全臂重跑逐项 ✓）；AC-04 pass（十 node 门 + stub-sync + cargo
  45/45 + vue-tsc/vite + e2e 23/23 全部重跑绿）；AC-05 pass（README §8
  六件 + DEBTS 064 行逐项核对）；AC-06 pass（--save-baseline 再生 diff
  空）| findings: F1（轻微，已闭环）= P064-4 草案缺 tabs 流 v1 形态裁定，
  复审中补记（实现未变，无契约变更，revision 不增）| evidence: 主检出本
  计划本节（持久）；worktree 提交 7b2d9b7/c2ac590/1618f1e/5eb0279/bce4ebd；
  ext-registry.json；baseline/iced-tabs-structure.txt；vm-smoke.mjs 断言面
  （负向断言抽查：串页/弃置残留/在途丢失/落盘/fixture 漂移五类在场）|
  next: merge（/auto-plan:merge；六节 spec 回填草案随 T-07/F1 记录落地）`

  复审核对附加项：①授权面——diff 19 文件均在授权范围（jade-garden +
  DEBTS.md），auto-lang 侧零改动（硬约束守恒）；②vue 轨零改动纪律——app
  源零改，仅再生 composable/ext 收缩/stub 换名 + 两笔 master 预存红修复
  （api-contract-routes health 豁免 = 门检设计内扩展点；e2e-prepare
  journals 合成 = 消解未跟踪 debris 隐藏依赖，断言强度不降），判定接受；
  ③规范增量无 P022 条目改写（纯新增 P064-1..6），无冲突。

- 2026-09-14 stage:merge 收据 **PLAN-064:r1**：
  - `prepared`：reviewed 基线 bce4ebd4；canonical diff = .autoos/specs.json
    新增 P064-1..6 六节（对齐 P063 模式：reports/goals/architecture/designs/
    tests/reviews；statuses published/proposed/stable/stable/verified/
    published）；projection 目标 = 本仓 .autoos/specs.json 六节数组；交付
    commit 候选 = docs/projection-only 后代。
  - `landed`：master fast-forward → e5eb595（plan064 merge canonical specs
    落账 commit；ancestry ad5b1d4→…→bce4ebd4→e5eb595 线性，代码 + canonical
    Specs 同落）；主检出冒烟：ext-registry-gate PASS + api-contract-routes
    desktop 副本字节一致。
  - `ledger_refreshed`：.autoos/specs.json（主检出 e5eb595）P064-1..6 读回
    验证（六节各有其一，related=[PLAN-064]，file 指向本 archived 路径）；
    本仓 ledger 与 canonical Specs 同体（六节 store），无独立运行时投影。
  - `archived`：本文件 docs/plans/archived/064-jade-vm-ext-audit-tabs-flow.md，
    status: archived，completion_kind: delivered。
  - `cleaned`：待清理后补记。

新路径标记：ext-registry.json、ext-registry-gate.mjs、vm-smoke.mjs、
restore-fixture.mjs 均为新增；其余为既有文件修改。

## 9. 复审记录

- 2026-09-12 stage:new handoff（/auto-plan:new，rev 1）：任务 T-01..07 覆盖
  AC-01..06 与 SD-01..06；路径与命令均实勘在案；无阻断性待澄清。
  `outcome: pass`，`next: work`（/auto-plan:work 在专用 worktree 执行；
  T-01/T-03 可并行起步）。
- 2026-09-14 stage:work 启动（/auto-plan:work）：实现 worktree
  `D:/autostack/.wt/auto-down-064/auto-down`，分支 `plan-064-dev`，base
  commit ad5b1d4（master）；依赖 auto-lang 侧零改动（共享 master 二进制，
  T-03 时记录构建基线 commit）。

## 10. 待澄清事项

无阻断项。两个执行期调查点已内嵌任务：①recordRecent 的 VM session KV 确切
API 面（T-04 有界调查，产出入注册表 evidence）；②ensureBlockAnchors 的 v1
deviation 已按 plan-022 骨架既定行为裁定，若 VM 侧现成 parser 原生面可消费则
等价升级 sink（不扩授权，处置表留痕）。
