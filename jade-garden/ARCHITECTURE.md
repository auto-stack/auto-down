# Jade Garden — Architecture (plan 022 state)

> 收口于 2026-08-30（plan 022 Phase 5）。本文描述双形态架构与单源管线；
> 过程裁定与 slice 级细节在 `front/desktop/README.md`，债务台账在
> `DEBTS.md`，计划全文在 `docs/plans/022-vm-desktop-auto-libs.md`。

## 1. 总览

```
                     ┌──────────────────────────── 单源层 ───────────────────────────┐
                     │ back/auto/*.at          front/auto/src/front/*.at             │
                     │ api.at(契约+#[api])     29 widgets + 9 stores + ext helpers   │
                     │ parser/links/search/…   tabs_store.at / blocks_store.at / …   │
                     └──────────────┬────────────────────────────┬──────────────────┘
                                    │ gen.mjs（a2ts + a2r）       │ a2ts（Vue SFC + ext）
                                    ▼                            ▼
                     ┌──────────────────────────┐   ┌──────────────────────────────┐
   web 形态           │ server/src/*_gen.rs      │   │ gen/front/vue（Vue 工程）     │
   （浏览器）  ───────│ axum 薄壳（*_impl+路由）  │   │  → 部署 front/src（facade）   │
                     └────────────┬─────────────┘   └──────────────────────────────┘
                                  │ HTTP /api/*（JSON；multipart/二进制仅此通道）
   桌面形态            ┌──────────┴─────────────┐            ┌────────────────────────┐
   （VM iced）  ──────│ front/desktop（VM 前台）│───loopback─▶ 同一 /api/* 面          │
                      │ #[api]→340 改写/原生直连│            └────────────────────────┘
                      └────────────────────────┘
```

- **web 形态**：29 个 widget `.at` 经 a2ts 生成 Vue SFC；商店逻辑在 `.at`
  store + ext 视图装配层；后端为 axum 薄壳（或 `JADE_GARDEN_SERVER=vm` 的
  VM 内服务器，Phase 3 起 e2e 双跑等价）。
- **桌面形态**：同一批 widget DSL 由 AutoVM 解释、iced 原生渲染
  （`auto run -r vm`）；前台以 `use back.api:` 契约调用后端
  （split=HTTP 改写 / merged=宿主派发）。

## 2. 单源管线（gen.mjs）

`back/auto/gen.mjs` 对每个 `.at` 做双发射 + 部署：

| 产物 | 去向 | 消费方 |
| --- | --- | --- |
| `gen-ts/<name>_gen.ts` | TS twin | `tests/*-parity.mjs`（node 侧对拍） |
| `server/src/<name>_gen.rs` | a2r | axum 壳（`mod <name>_gen;`） |
| `front/src/lib/api_gen.ts` | api.at 类型面 | 手写 fetch 层 re-export（K1 剥 fn） |
| `front/src/lib/parser_gen.ts` | parser.at 分段（PBlock 带行号） | save 路径锚点注入 |
| `front/desktop/src/back/api.at` | 契约原文 | 桌面 `use back.api:` 解析（门检漂移对拍） |

已知发射器边界与配方（登记于 DEBTS/计划）：`.length` 算术须 `.to(int)`；
结构体字面量须显式 `StructName(args)`；Vec 参数按值传递；`{@*path}` 通配
与 GET query 已在 340 改写器支持（plan-022 跨仓修复）。

## 3. 契约（api.at）

- 每路由：类型 + `// ROUTE:` 注释 + `#[api(method,path)]` stub fn
  （25/28；assets-upload、export/import markdown 三路由 multipart/二进制
  不入 VM 信封，豁免显式登记）。
- 门检 `tests/api-contract-routes.mjs`：rust 路由表 ↔ ROUTE 注释 ↔
  `#[api]` fn ↔ desktop 副本，四处对拍。
- 变更流程：后端 DTO → 契约镜像（type+ROUTE+fn）→ `node gen.mjs` →
  api.ts → `pnpm build`（vue-tsc 卡漂移）→ 门检卡漏登记。

## 4. 桌面形态要点（plan-022 Phase 4/5）

- **运行**：`auto run -r vm`（AutoVM 解释 widget DSL → iced 原生窗口）；
  后端经 `AUTO_BACKEND`（split）或宿主派发（merged）。
- ** store 消费**：`use store:`（VM 原生形态，442 corpus）；
  `use back.api:` 走契约（desktop/src/back/api.at 为 gen 部署副本）。
- **导入导出（D4 裁定：原生直连）**：`http.request` →
  `multipart_file`/`body_to_file` 原生（2226）——字节不过 VM 字符串
  管线；不经 `#[api]` JSON 改写。
- **已裁定留壳**：OfMatrix EDN parse/save（float 解析/格式化为 a2r 边界）。
- **登记待办**：目录/文件选择器宿主能力；CALL_SPEC 返回列表 RC 接线；
  `.type` 元属性撞名；confirm 模态语义。

## 5. 镜像归一（三镜像销号，2026-08-30）

markdown 解析历史三镜像：engine `markdown_parser.at`（单源）/ 前端手写
`blockParser.ts` / rust `parser.rs`。现状：

- 后端：`parser_gen`（Phase 2 slice 1）；
- 前端读路径：`blocks_store_ext` → `@autodown/engine/parser`
  （`parse_blocks`）；
- 前端 save 路径：`ensureBlockAnchors` → `parser_gen.parseBody`
  （PBlock 自带行号，锚点行拼接）；
- `blockParser.ts` 已删除（020 Phase 3 裁定项随之销号）。

## 6. 验收基线（2026-08-30）

| 门 | 结果 |
| --- | --- |
| 九套 node parity 门 + 契约门（28/28 + 副本漂移） | 绿 |
| back/server cargo（含双侧 parity fixtures） | 40/40 |
| front vue-tsc + vite build | 0 错 |
| rust 后端 e2e | 23/23 |
| VM 后端 e2e | 23/23 |
| 桌面六流（打开/编辑/保存/反链/图谱/闪卡 + 导入导出） | 驱动断言全过 |

结构性视觉基线：`front/desktop/baseline/iced-slice5-structure.txt`；
web 侧基线：e2e 08-screenshots specs。

## 7. 组件复用与命令面（PLAN-070，2026-09-18）

三类共享面、三种机制，替代历史上的"手工复制移植"惯例：

| 共享面 | 机制 | 唯一源 | 门 |
| --- | --- | --- | --- |
| filetree 支撑件（tree_util/tree_icon） | auto-lang **Blueprint 包**跨包导入（`dep bps` + `use bps.navigation.filetree.<file>:`，L1 零副本） | `auto-lang/blueprints/navigation/filetree/` | `desktop/scripts/bp-gate.mjs`（副本归零 + 幽灵导入 + ×4 消费位） |
| tabs_store | **单源 + 字节部署**：唯一源 front/auto/src/front/，desktop 副本由 `tabs-store-sync.mjs` 部署（产物非资产；跨包导入不可行的原因=`use back.api:` 位置即绑定） | front/auto/src/front/tabs_store.at | `tabs-store-sync.mjs --check`（字节等价） |
| 命令面（actions/menubar/toolbar） | **ui_config 单源声明**（front/auto/app-config.at，Plan 418/639 形态）：桌面/VM 运行时加载 + vue 轨经 T-05 handler 交集选择性继承合成（Menu.vue 组件级参与）；MenuBar.vue 部署 + AppShell 壳顶 | front/auto/app-config.at | e2e/24-menubar.spec.ts（DOM + 保存落盘端到端） |

裁定记录：jade web 的 file_tree/fileTree_store 与 status_bar 三版（desktop 值
props / 041 store 直读 / web ext+composable）均为**同名不同物**（数据流/运行时
惯用/功能面互异），裁定不收敛（DEBTS 070 行 + blueprints spec gotcha#2）；
收敛重启条件=出现第三消费方或对应谱系需改。

## 8. 功能版图与统一路线（PLAN-070 后续战略，2026-09-18）

### 8.1 现有功能盘点（六环）

| 环节 | 已有 | 成色 |
| --- | --- | --- |
| 捕获/编辑 | 富文本 markdown（标题/列表/任务/代码块/粗斜体/wikilink）、每日笔记、~~whiteboard 雏形~~（PLAN-071 移除） | 编辑器为日常主战场 |
| 组织 | 文件树、双 tab+keep-alive、properties、recent files | 基本可用 |
| 链接 | wikilink、块锚、反链/出链/未链接提及三面板、linkgraph、图谱 tab | 对标核心环已立住 |
| 检索 | search 面板、command palette、quick switcher | query 后端引擎在、前端视图缺 |
| 消化（差异化） | SRS 闪卡 + agenda | 强于 Obsidian core |
| 系统 | 主题、菜单栏（070）、zip 导入导出（命令面板，PLAN-071 勾定）、~~plugins_store~~（PLAN-071 移除） | — |

### 8.2 缺口（P0 补日常刚需 / P1 深化 / P2 明确不做）

- **P0**：标签系统 UI（后端 links.at 已扫描 tag）、wikilink 悬停预览、图片/附件流、文档内查找替换、反链上下文片段。
- **P1**：query 前端视图（引擎已就绪）、数学公式渲染面、footnote/mark（引擎 DEBTS）、图谱过滤/orphans、日历视图。
- **P2 不做**：发布、同步服务、多 vault。

### 8.3 瘦身裁定（PLAN-071，2026-09-18 处置落地勾记）

| 处置 | 状态 |
| --- | --- |
| plugins_store + 插件面移除 | ✅ 移除——UI 消费点清点为零（store 全死）；store/ext/生成物/facade 四件删 |
| whiteboard 移除/标注实验 | ✅ front 面全删（页面/入口/facade/api 手写层）；back 契约与端点保留＝实验性可回归通道（git 历史可取回 front 面） |
| legacy-autoui 删除 | ✅ 目录删除（零引用死树；历史注释保留） |
| SRS 入口收敛 | ✅ flashcard modal＝唯一复习流（palette 命令唯一点，全仓断言）；agenda 面板保留；Cards Probe 页归 `front/e2e/fixtures-pages/` 测试资产 |
| zip 导入导出降级命令面板 | ✅ 实证达成——070 菜单栏 v1 即无 zip 项，palette 双命令在册；裁定注记落 app-config.at/menu_bar.at/menu_bar_ext（zip/闪卡停留命令面板，不进菜单栏） |
| query.at 后端引擎保留 | ✅ 保留，README 树行标注"engine ready, no front view" |

### 8.4 双形态战略（A'：冻结-瘦身-三层统一-解冻）

vue 轨功能冻结；力量转向三层统一（机制详见 auto-lang
`docs/design/30-autoui-parity-three-layer.md`）：

1. **L1 Widget**：盘点分类（三桶：双端差异/VM 缺件/vue 缺件）→ 组件 gallery
   → 逐单元配方化+双端 gate+锁基线；
2. **L2 Blueprint**：可复用组合抽取（判定规则见 design 30 §6）→ bp gallery
   → 蓝图级 parity（前置：bps fn 转译缺口偿还，auto-lang PLAN-645）；
3. **L3 App**：流程/布局/数据流 parity 收口（vm-smoke 双模+全量
   playwright+双端截图基线）。

**解冻条件**：三层 DoD 达成（L1 清单 gate 全绿+L2 gallery 绿+L3 套件绿）→
新功能双形态同日落地。纪律：行为/逻辑留 `.at` 单源+ui_config，vue 专属仅进
ext/视图样式层；每个 web 新特性附 VM 复刻注记（gap 台账）。

### 8.5 计划组合

| 计划 | 仓 | 内容 | 状态 |
| --- | --- | --- | --- |
| PLAN-071 | auto-down | 瘦身（§8.3 六项） | delivered（archived 2026-09-18） |
| PLAN-072 | auto-down | 盘点分类 + L1 组件 gallery 基建（三桶/双端 gate 骨架，§8.6） | executing |
| PLAN-645 | auto-lang | 工具链债（bps fn 转译 + with_defaults 扫描根，L2 前置） | drafting |
| L2 抽取+gallery | 双仓 | bp 抽取（判定规则）+蓝图级 parity（依赖 072 清单+645） | 待起草 |
| L1 修复滚动 | auto-down | 逐批 parity 修复（依赖 072，分批立项） | 待起草 |
| L3 收口 | auto-down | app 级 parity 收口（依赖 L1/L2） | 待起草 |

### 8.6 三桶清单与 L1 gallery（PLAN-072，2026-09-18）

三层统一（§8.4）的 Step 0 + L1 基建落地（SD-01）：

- **三桶清单（单元台账）**：`docs/plans/attachments/072-inventory.md`——
  29 web widget（↔29 部署 SFC 对拍）×desktop 3 件实勘。桶①双端都有 5 面
  （status_bar/tab 条/menubar/toolbar/filetree 行家族）；桶②只有 vue 有
  22 件（RC-D VM 缺件 15 / RC-C 组装级 5 / RC-E 引擎对拍 1 / RC-F 第三方
  边界 1）；桶③只有 vm 有 **空桶**。修复类预估 RC-A..F 定义在册。
- **L1 gallery**：`jade-garden/front/component-gallery/`——双臂隔离面：
  vue 臂挂真件部署 SFC（fixture API shim，截图基线 e2e/baselines/）+
  VM 臂自包含 twin 项目（MCP autoui_state/snapshot 断言）；gate =
  `scripts/gate.mjs`（单元配置 `scripts/units.mjs`）。
- **样板 gate 绿**：status_bar（纯展示）/tab_strip（交互）/backlinks
  （数据绑定）+outline 列表，双臂全绿；command_palette 缺件红占位在册。
- **实测发现（F-1..F-6，详见 gallery README）**：子件子树 MCP 快照不可见
  （当前 master 复测）；computed `>` 作 if 条件不进分支；f-string 内插
  computed 不解析；`dyn` 双轨可用；blocks.ts activeTab watch 原地改引用
  失活（候选 DEBTS）；缺件即红 = ext no-op stub 静默降级（非崩溃）。
