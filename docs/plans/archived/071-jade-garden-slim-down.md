---
plan_id: PLAN-071
status: archived               # drafting → executing → execution_done → reviewed → archived
completion_kind: delivered
feature_name: jade-garden-slim-down（瘦身：六项过剩处置）
author: [zhaopuming]
created_at: 2026-09-18
updated_at: 2026-09-18
plan_revision: 1

supersedes_spec_components: []
new_spec_components: []        # 本仓无 docs/specs/；账本 P071-1/2 已由 merge 落 .autoos/specs.json
touched_goals: []

affects: [jade-garden/front]
current_step: 7
total_steps: 7
---

# [PLAN-071] jade-garden-slim-down——六项过剩处置

> 依据：ARCHITECTURE.md §8.3 瘦身裁定（PLAN-070 后续战略）。统一期（三层
> parity）前置——每删一个过剩面，双形态少维护一个。web 侧为主；desktop 六流
> 无对应面，vm-smoke 仅作无回归佐证。

## 0. 变更摘要

| # | 处置对象 | 处置 | 理由 |
| --- | --- | --- | --- |
| 1 | legacy-autoui/（plan-011 归档残留） | 目录删除 | 零引用死树 |
| 2 | plugins_store + 插件面 | UI 面移除，store 与引用一并删 | 早期插件框架=过度设计；git 历史可取回 |
| 3 | whiteboard（whiteboard_page.at + 导航入口） | 移除，标注实验性可回归 | 155 行雏形不可用占维护面 |
| 4 | SRS 入口收敛 | cards probe/E2E Cards 页归测试资产；flashcard modal=唯一复习流；agenda 面板保留 | 功能留、入口收敛 |
| 5 | zip 导入导出 | 菜单栏降级进命令面板 | 备份操作不占壳顶 |
| 6 | query.at 后端引擎 | **保留**，文档标注"引擎就绪、无前端" | 引擎资产零维护成本 |

## 1. 目标

1. 六项处置全部落地，front/auto 无死引用（vue-tsc/build 绿）。
2. 双模 vm-smoke 无回归（desktop 面不受影响佐证）。
3. playwright 全量：删除面的既有 spec 同步修/删，基线按需更新，全套绿。

## 2. 架构方案

纯减法重构，零新增面。删除顺序：先摘消费点（导航入口/路由/组件引用），再删
store 与页面文件，每步构建绿。cards probe/E2E Cards 页面文件移入
`e2e/fixtures-pages/`（或按既有测试资产惯例处置，T-04 内定）。

## 3. 需求分析与背景调查

**授权记录**：2026-09-18 用户裁定的 PLAN-070 后续战略组合之一；仅起草。
**证据**：ARCHITECTURE §8.3 裁定表；plugins_store 消费点需 T-01 清点
（left_sidebar/command_palette 疑似引用）。

## 4. 详细设计

删除面与既有 e2e spec 的关联在 T-01 一并清点：凡 spec 断言涉及被删面者，
spec 同步删改（08-screenshots 基线预期受 §0-2/3/5 影响）。

### 规范增量

| delta_id | add/modify/retire | 目标文档 | before/after | rationale | acceptance |
| --- | --- | --- | --- | --- | --- |
| SD-01 | modify | jade-garden/README.md（功能面描述） | 功能清单含 plugins/whiteboard/zip 菜单 → 移除后口径 | 瘦身裁定 | AC-01 |
| SD-02 | modify | jade-garden/ARCHITECTURE.md §8.3 | 裁定表 → 处置完成状态勾记 | 账实同步 | AC-01 |

## 5. 测试设计

- front：pnpm build（vue-tsc+vite）绿。
- playwright：全量复跑；删除面对应 spec 删改；基线更新（--update-snapshots）
  后复跑绿。
- desktop：vm-smoke 双模快验（desktop 面未被触及，作无回归佐证）。

## 6. 验收标准

| ID | 可观察行为 | 验证方法 |
| --- | --- | --- |
| AC-01 | 六项处置落地 + 文档口径同步 | 逐项文件缺席/存在断言 + README/ARCHITECTURE 勾记 |
| AC-02 | 构建与测试面全绿 | pnpm build + playwright 全量（基线更新后）+ vm-smoke 双模 |

## 7. 执行步骤

- **T-00** [x] [调查] 插件面/whiteboard/SRS 页/zip 的全部引用点清点（含 e2e
  spec 关联矩阵）。产物：引用清点表（计划附件）。依赖：无。→ 全体
  [✅ 已完成] 附件 `attachments/071-consumption-matrix.md`。要点：plugins 无
  UI 消费点（起草疑似引用不成立，store 已全死）；zip web 菜单栏 070 后本无
  zip 项（处置已达成，T-05 转验证+勾记）；cards probe=未跟踪本地探针页
  `tmp/wiki-demo/wiki/Cards Probe.ad`（Q-1 落点裁定：`front/e2e/fixtures-pages/`
  新建跟踪目录）；E2E Cards 页=12-flashcards 运行时 API 创建（已是测试资产，
  无文件动作）；back whiteboard 端点与 plugins 均无后端参与面/不在处置对象
  （whiteboard.rs 保留为可回归通道）（Q-2 答案：desktop 零 plugins 引用）；
  e2e 关联=删 10-whiteboard + README 表两处删改；08-screenshots 预计零基线
  变化。执行布局：worktree `D:/autostack/.wt/down-071/auto-down`
  （plan-071-dev，基 d8f11bf）；依赖：无外部仓。
- **T-01** [x] [删] legacy-autoui/ 目录删除。依赖：T-00。→ AC-01
  [✅ 已完成] f7d7271：目录 7 文件 git rm + README 结构树去行（front 转末
  项连接符修正）；残留引用仅历史注释（back/desktop api.at 种子来源注记、
  auto/README 归档史）与裁定表勾记位，零活引用。
- **T-02** [x] [删] plugins 面移除（入口+组件+store+ext，按清点表）。依赖：T-00。→ AC-01
  [✅ 已完成] e38a887：四件删（plugins_store.at/plugins_store_ext.ts/
  usePluginsStore.ts/plugins.ts）+ stub loadPluginsResult 孤儿去拍 +
  auto/README:219 模式示例同步；UI 消费点清点为零；pnpm build（vue-tsc+vite）
  绿（engine dist 先行重建）。
- **T-03** [x] [删] whiteboard 移除（入口+页面）。依赖：T-00。→ AC-01
  [✅ 已完成] 2a64229：消费链倒序摘除（file_tree_node .canvas 分支→
  tabs_store OpenWhiteboard msg/handler→tabs facade isWhiteboard/openWhiteboard→
  main_area 装配→main_area_ext→whiteboard_page.at/ext/WhiteboardPage.vue 三件
  删→api.ts readWhiteboard/writeWhiteboard+类型面）；auto.exe build 再生
  MainArea.vue/useTabsStore.ts 部署；tabs_store 单源 desktop 副本 sync 部署
  +--check 字节等价；back 契约/端点保留（可回归通道）；pnpm build 绿。
  流程注记：gen 树（gitignored）在全新 worktree 需按主检出协议重建镜像
  （stub 双位 cp + src/src=gen 形态组件+gen_stores 门面镜像+types；无
  src/auto 镜像位——首发误植已纠正），重建后 auto build/stub-sync 双绿。
- **T-04** [x] [改] SRS 入口收敛（cards probe/E2E Cards 归测试资产；复习流收敛
  flashcard modal）。依赖：T-00。→ AC-01
  [✅ 已完成] b839137：Cards Probe.ad（未跟踪本地探针页）字节等价归位
  `front/e2e/fixtures-pages/` 并删 tmp 本地副本（Q-1 落点裁定落实）；e2e/README
  增测试资产节；断言复习流唯一入口=palette Review flashcards→
  jade-open-flashcards→FlashcardModal（dispatch/listen 全仓唯一点）；
  AgendaPanel 保留在册；E2E Cards 页=12-flashcards 运行时 API 创建（已是
  测试资产，无文件动作）。
- **T-05** [x] [改] zip 导入导出降级命令面板（菜单栏动作移除）。依赖：T-00。→ AC-01
  [✅ 已完成] 83b25f6：处置目标实证达成——070 菜单栏 v1 即无 zip 项（历史
  web 壳本无菜单栏），palette export/import 双命令在册；app-config.at/
  menu_bar.at/menu_bar_ext 三处"另接"注记升级为 PLAN-071 裁定口径（zip/
  闪卡停留命令面板不进菜单栏）；注释不入 SFC（MenuBar.vue 零 diff）；
  auto build+pnpm build 双绿。
- **T-06** [x] [改] 回归收口：spec 删改/基线更新/双模 smoke/文档勾记
  （SD-01/02）。依赖：T-01..T-05。→ AC-02
  [✅ 已完成] 4ae3b28+671652e：10-whiteboard.spec.ts 删+e2e/README 两处删改；
  README 计数=24 tests（实测口径，旧值 23 系陈旧）×4+query.at 树行标注；
  ARCHITECTURE §8.3 勾记表/§8.1 划线注/§8.5 executing（SD-01/02 worktree
  备置）；ext-registry 清算（白板面死账 12 行销+menu_bar_ext 5 行 070 补登）
  gate PASS 293/293；desktop 三门（bp-gate/ext-registry-gate/sync --check）
  全绿；**playwright 全量 24/24 绿（39.5s，08-screenshots 基线零更新直接
  过——T-00 预测证实）**；vm-smoke split+merged 双模全臂绿（open-ws/files/
  read/save/links/cards/d4/search+tabs①-⑤+fixture hash 等价）。

## 8. 复审记录

- 2026-09-18 draft handoff：`stage: new | plan_id: PLAN-071 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权） | next: review → work`。
- 2026-09-18 work handoff #1（T-00 完成，进入执行）：`stage: work | plan_id:
  PLAN-071 | plan_revision: 1 | outcome: pass(T-00) | code_commit: 基 d8f11bf
  （实现提交随任务落） | worktree: D:/autostack/.wt/down-071/auto-down
  （plan-071-dev） | task_ids: T-00 | evidence: 附件
  attachments/071-consumption-matrix.md | blockers: 无 | next: T-01..T-05
  依清点表执行，T-06 收口`。
- 2026-09-18 work handoff #2（execution_done）：`stage: work | plan_id:
  PLAN-071 | plan_revision: 1 | outcome: pass | code_commit: plan-071-dev
  f7d7271+e38a887+2a64229+b839137+83b25f6+4ae3b28+671652e+a934e25（基 d8f11bf）
  | task_ids: T-00..T-06 全部 | evidence: AC-01 一站式断言 9 缺席/2 存在/1
  标注全过 + pnpm build 绿 + playwright 全量 24/24（08-screenshots 基线零
  更新）+ vm-smoke split+merged 双模全臂绿 + desktop 三门绿（bp-gate/
  ext-registry-gate 293/293/sync --check）+ auto build/stub-sync 绿 |
  dependency_revisions: 无外部仓改动；auto-lang 只读 detached 兄弟 worktree
  D:/autostack/.wt/down-071/auto-lang（@14de34e06，bp-gate 路径解析用，merge
  时随组清理） | blockers: 无（§9 O-1 为 master 预存损坏，不在 AC 内） |
  next: review`。
- 2026-09-18 review（实现会话内复审——独立性限制声明：无独立会话可用，按
  工件重建裁定，全部验证由复审视角重新执行，不采信执行期摘要）：
  `stage: review | plan_id: PLAN-071 | plan_revision: 1 | outcome: pass |
  reviewed_commit: plan-071-dev@a934e25edc70e82ac6f3085458f3d46bac8c7332 |
  base_commit: master@d8f11bfcd67a7f3022eed2a188fbb1a6c4462dfb（复审时 master
  未动） | dependency_revisions: 无外部仓改动；auto-lang 工具链（只读
  detached 兄弟 wt @14de34e06，bp-gate 路径解析）；back cargo build 于
  worktree 源（1m24s 绿）；engine dist worktree 重建 | spec_inputs: 本仓无
  docs/specs/（frontmatter 空影响已书面说明）；SD-01/02 备置于
  reviewed_commit 的 jade-garden/README.md+ARCHITECTURE.md（未发布，随
  merge 落地） | acceptance_results: AC-01=pass（9 缺席/2 存在/1 标注
  复断言全过）；AC-02=pass（复现：pnpm build 绿 16.3s；playwright 全量
  24 passed exit 0（46.2s，基线零更新）；vm-smoke split+merged 各 16 臂
  全绿且 fixture hash 前后等价，各复跑 2 轮；desktop 三门 bp-gate OK/
  ext-registry 293/293/sync 字节等价） | findings: F-1(info) §8.5 状态列
  "executing" 于 merge 时点必陈旧——活值元数据，归档流刷新，不改语义契约；
  F-2(info) tab_strip.at L6/L14 注记仍提 WhiteboardPage（习语史注释，零代码
  影响，处置对象外，留给后续顺手清洗）；F-3(info) §9 O-1 VM 后端 e2e
  master 预存损坏——已录证据与 unblock，AC 外 | evidence: 各提交可溯
  （8 commits d8f11bf..a934e25）+ 本记录复现命令与结果摘录；残留引用宽
  口径复扫=仅 back 保留层/历史注释/退役记 | next: merge`。

## 9. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | ~~cards probe/E2E Cards 页的"测试资产"落点~~ **已裁定（T-00）**：`front/e2e/fixtures-pages/` 新建跟踪目录，Cards Probe.ad 字节等价归位 | 已闭环 | — |
| Q-2 | ~~plugins_store 删除是否波及 desktop~~ **已裁定（T-00）**：desktop 零引用，不波及 | 已闭环 | — |
| O-1 | **观察（非本计划阻塞）**：`JADE_GARDEN_SERVER=vm` 后端 e2e 变体在 master 基线即坏——back/auto/server.at（plan-022 起 `use jade_server` + 裸调 `build_router()`）遭现役 auto-lang 运行时拒编译（"Undefined symbol: build_router"，错误处方=限定名或 `use jade_server: *`）；新旧 exe 双探针复现。desktop vm-smoke 双模不走该入口不受累；AC-02 口径（默认后端全量+双模 smoke）全绿 | 后续谁修：jade back 一行脚本修或 auto-lang 语义回提案，均超出本计划授权 | 建议 merge 时登记 DEBTS（unblock：server.at 调用点限定名化 + cargo 重建 + `JADE_GARDEN_SERVER=vm pnpm test:e2e` 复跑） |

## 10. merge 收据

- 2026-09-18 merge 收据 `PLAN-071:r1`：
  `prepared` = reviewed 基线 a934e25（plan-071-dev，8 commits d8f11bf..a934e25）+1 投影后代
  b999938（唯一 diff=.autoos/specs.json P071-1/P071-2，依冻结增量 SD-01/SD-02 派生）→
  delivery_commit；canonical 口径已在 reviewed_commit 内备置（jade-garden/README.md
  功能面+计数 24 tests+query.at 标注；ARCHITECTURE §8.1 划线注/§8.3 处置勾记表/§8.5）；
  `landed` = master eb2214d（merge plan-071-dev --no-ff；基 d8f11bf 复核无漂移；35 文件
  +143/−932）；落地后主检出复验绿：bp-gate / tabs-store-sync --check / ext-registry-gate
  293/293 + pnpm build（16.9s）；
  `ledger_refreshed` = .autoos/specs.json P071-1（architecture→jade-garden/ARCHITECTURE.md
  §8 瘦身裁定）/P071-2（reviews→本归档件），master 回读双 ID 在册（items 237→239）；
  `archived` = 本文件 git mv → docs/plans/archived/071-jade-garden-slim-down.md +
  status: archived + completion_kind: delivered（附件 071-consumption-matrix.md 一并收编
  docs/plans/attachments/）；
  `cleaned` = ⏳（worktree down-071/auto-down + 分支 plan-071-dev + 只读 auto-lang 兄弟
  wt + 组目录清理后补记）。
