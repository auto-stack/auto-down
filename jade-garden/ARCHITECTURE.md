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
| PLAN-645 | auto-lang | 工具链债（bps fn 转译 + with_defaults 扫描根，L2 前置） | delivered（archived 2026-09-18；075 实勘定案——DEBTS.md 两行漏划销见下 L2 bullet） |
| PLAN-075 | 双仓 | L2 蓝图抽取首证（判定规则 + 骨架 bp ×2 + 蓝图级双端 gate，§8.6 L2 bullet） | delivered（archived 2026-09-19） |
| L1 修复滚动 | auto-down | 逐批 parity 修复（依赖 072，分批立项） | 待起草 |
| L3 收口 | auto-down | app 级 parity 收口（依赖 L1/L2） | 待起草 |

### 8.6 三桶清单与 L1 gallery（PLAN-072，2026-09-18）

三层统一（§8.4）的 Step 0 + L1 基建落地（SD-01）：

- **三桶清单（单元台账）**：`docs/plans/attachments/072-inventory.md`——
  29 web widget（↔29 部署 SFC 对拍）×desktop 3 件实勘。桶①双端都有 5 面
  （status_bar/tab 条/menubar/toolbar/filetree 行家族）；桶②只有 vue 有
  24 件（RC-D VM 缺件 16 / RC-C 组装级 6 / RC-E 引擎对拍 1 / RC-F 第三方
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
- **桶① 5 面基线已锁（PLAN-073，2026-09-18）**：status_bar/tab 条/
  menubar+toolbar/filetree 行家族 5 单元（toolbar 落点=MenuBar.vue 内，
  无独立 SFC 系设计使然）双端 gate 绿 + 截图基线 6 张在库
  （`component-gallery/e2e/baselines/`）；status_bar 配方化（style
  recipe sb_footer/sb_meta/sb_dim，字面 11px/zinc 清零）；复核债表
  D-1..D-5 落 gallery README（P622/P624 复核成立/070 R-1 tab 条各持/
  amber 主题债/编译器模板 zinc L2/filetree 缩进各持）。单元台账续册：
  `docs/plans/attachments/073-literal-style-inventory.md`。
- **PLAN-074 RC-D 批次 1（面板家族纯逻辑下沉，2026-09-18）**：backlinks/
  outgoing_links/outline/unlinked_references 四件 ext 数据编排与行构造
  下沉 .at（模块 fn + watch try/catch/finally + `use back.api` 契约通道；
  ext 薄化至 facade 再导出+契约别名+宿主桥），部署 SFC 经 a2ts 内联发射
  再生成；gallery 四单元 VM twin 臂建成（gate 双臂全绿 8 单元，截图基线
  8 张在库，command_palette 预期红占位不变）。**下沉模式文档**（RC-D
  批次 2/3 作业标准；判定规则/步骤/坑清单 G-1..G-8）：
  `docs/plans/attachments/074-sink-mode.md`；desktop 挂载裁定登记（内联
  vs 组件，装配归 L3）见其 §4。编译器侧：src/front 兄弟臂 fn 池重挂 +
  watch/Try api 扫描补丁落 auto-lang `plan-074-dev`（40d7488/899aa2e）。
- **PLAN-076 RC-D 批次 2（检索/导航族纯逻辑下沉，2026-09-19）**：
  search_panel/command_palette/quick_switcher 三件 ext 过滤链/行构造/
  递归 walk/模运算下沉 .at（模块 fn + debounce 闭包 try/catch/finally +
  `use back.api: search_pages` 契约通道 + gen stub；runPaletteItem 拆沉
  file 分支；ext 薄化至热键/焦点/再导出/真宿主流）；**command_palette
  缺件红占位转正**（负例样本由 editor_tab RC-E 状态占位续任，README
  F-6/072 台账注记在案）。VM filter 链 CJK 语义结论（P-7：P-6 字节-字符
  分歧不及于过滤域——twin 断言域可用 CJK；债表 D-6/D-7）。gallery gate
  双臂全绿 **11 真单元** + 截图基线 11 张在库（新增 3，旧 8 零漂移）；
  vue 臂 fill 门新增（query 输入 typing 面）。逐 fn 分类表/坑清单增补/
  desktop 挂载裁定：`docs/plans/attachments/074-sink-mode.md` §5/§4.1。
  编译器侧：api walker 补 Closure/Lambda 臂 + 闭包体 api 调用 async
  前缀，落 auto-lang `plan-076-dev`（58f2af2，074 三补丁后第四件，
  待折回）。
- **PLAN-077 RC-D 批次 3（属性/文件/主题/闪卡/日程七件下沉，2026-09-19）**：
  properties_panel/recent_files_panel/create_page_prompt/workspace_opener/
  theme_popover/flashcard_modal/agenda_panel 七件 ext 逻辑下沉 .at（模块 fn
  + handler/watch try/catch finally 编排 + `use back.api: get_agenda/
  get_due_cards/review_card` 契约直用 + gen stub；workspace 走 store facade
  通道——openWorkspaceFlow 消解为显式 promise 链保真 rejection 透传；ext
  薄化至 re-export/Q-3 时间桥/JSON 域/typeof 强转域——T-00 校正 properties
  预分类 sink 6→4）。**两个新域裁定**：JSON 域（JSON.stringify vue 透传/
  VM 无词位→ext 桥）与时间格式化域（Date/toLocale*→行构造沉 + 格式化字段
  ext 桥逐行预计算）；**Q-4 关闭**（静态 Obj 字面量列表 return 双轨绿）。
  探针结论 P-9（map 键值迭代 VM 轨零迭代——P614 同族纪律不补编译器，twin
  配对列表播种）/P-10（try/finally 无 catch 解析红→空 catch/链式形态）落
  模式文档 §6.0。**workspace_opener VM 通道裁定销号**（072 台账 Q-1：VM
  twin 断言域=path+Open 流形状，picker 按钮 window 级 DOM 不进域，desktop
  装配走 menubar action）。gallery gate 双臂全绿 **18 真件单元** + editor_tab
  占位 + 截图基线 18 张在库（新增 7，旧 11 零漂移）；front e2e 全量 24
  passed（11-properties/12-flashcards 直接相关）+ desktop vm-smoke split/
merged 双模 PASS。逐 fn 分类表（34 实义 fn）/desktop 挂载裁定登记：
  `docs/plans/attachments/074-sink-mode.md` §6/§4.2。编译器零新增补丁
  （exe ≥ v0.4.2-1305 同源含 074/076 折回全量）。
- **PLAN-078 RC-D 批次 4（图谱族两件下沉 + RC-D 清零，2026-09-19）**：
  graph_sidebar/graph_controls 两件 ext 逻辑下沉 .at（graph_stats/
  top_degree_nodes 选排 cap15+display 显式 if；gc_center_label strip_ext
  纪律形/gc_opacity_label math.round/gc_set_setting bracket 写/
  gc_reset_settings 逐字段点号写 P-11 安全形 + eventValue 消解——077
  先例），ext 薄化至真宿主面（RangeInput/cast 桥/icons/store 再导出）。
  **T-00 探针新发现 P-11..P-14**（模式文档 §7.0）：map 括号写 VM 轨静默
  吞 handler（复现包 handoff auto-lang，修复前 VM 禁括号写）/slider 词位
  VM 缺席+vue 无 type=range（RangeInput 必留）/checkbox 原生可驱动/
  math.round 双轨词位。**graph_view RC-F 终裁（用户 2026-09-19）**：
  canvas 元素 Plan 563 双轨已在（笔笔画契约）——真渲染=场景契约扩容
  （图元/标签/命中）+AutoUI Slider 补全+cytoscape 对位**独立计划**（草案
  attachments/078-canvas-graph-scene-plan-draft.md，立项归 auto-lang），
  宿主面单元划出记 DEBTS。**RC-D 16 件清零**（4+3+7+2）；gallery 双臂
  全绿 **20 真件单元** + editor_tab 占位（新增 2 张基线，旧 18 零漂移）；
  front pnpm build 绿。逐 fn 分类表/desktop 挂载裁定：
  `docs/plans/attachments/074-sink-mode.md` §7/§4.3；判定档
  `attachments/078-graph-view-ruling.md`。编译器零新增补丁（exe ≥1378）。
- **PLAN-079 L3 收口批次 1（desktop 面板装配 + RC-C 壳面 + L3 门固化，
  2026-09-19）**：**装配形态裁定 = β 内联消费**（模式文档
  `docs/plans/attachments/079-l3-assembly-mode.md`——T-00 双路径探针：α
  组件挂载编译/boot 绿但数据面死[tabsStore facade stub 短路]+断言面死
  [F-1 挂载子树快照黑盒]；β 契约直拉+根视图行渲染全链绿；**新坑 P-15
  跨项目 fn 导入静默死面** → 下沉 fn 一律部署副本 + 同项目 use 引回）。
  **10 件装配落地**（§4.4 回填表）：批 A 右栏四件（backlinks/outgoing
  doc_title 收敛 tab_file_stem + SwitchTab 刷新语义；unlinked 契约直拉
  行按钮；outline 行扫描等价推导——blocks 源不可达差异）+ 批 B palette/
  switcher desktop 自持（ui_config 重建清单 × 静态行绑定[DSL 无按名
  派发]；sw fns 形状适配；search/flashcard 内联维持裁定）+ 批 C agenda/
  recent/theme 装配 + cpp 改道自持（后端 outlinks exists 恒真——
  linkgraph targetPage 裸标题实勘，缺失分支双端死路）；**properties 划
  批次 2**（P-9 map 迭代前置）。**RC-C 壳面**：gallery units.mjs 六状态
  占位（app_shell/main_area/left·right_sidebar 组装级 + ribbon Q-2
  web-only 特有面裁定 + graph_page 批次 2 注记——placeholder 形态 ≠
  缺件红）。**L3 门批次 1 版**：desktop 首批结构基线
  （desktop/baseline/iced-l3-batch1-structure.txt）+ vm-smoke 双模 22
  检查项（13 臂含 palette/switcher/agenda/recent/cpp/theme 新六臂）+
  front e2e + gallery gate（20 真件零漂移 + 占位族可见）。执行期坑实录
  （裸 var x=[] VM 静默坏列表·typed List 纪律/同值 status 断言竞态/
  SCHEDULED 语法）见 079 计划 T-03 收据。消费登记表回填：
  `docs/plans/attachments/074-sink-mode.md` §4.4。编译器零新增补丁
  （exe v0.4.2-1414）。**批次 2 = graph 族四件**（gated on auto-lang
  PLAN-661 交付 + properties 配对列表通道）。
- **PLAN-075 L2 首证（2026-09-19）**：首批 L1 基线存量 9 单元（073 五面 +
  074 四件）跑完 design 30 §6 判定——判定记录
  `docs/plans/attachments/075-bp-extraction-record.md`（U-1 status_bar 骨架+
  slot / U-2..U-4 不收敛登记[R-1 tab 条/ui_config 单源] / U-5 filetree bp
  家族归位 / U-6..U-9 row-list 骨架 7 使用位）。**两件骨架 bp 入库**
  （auto-lang `blueprints/layout/status-bar` + `data-display/row-list`，
  fn-free 三件套）；**蓝图级双端 gate 首证**（auto-lang
  `examples/bp-gate/`：vue 臂沙箱构建+playwright 截图基线 × VM 臂 MCP
  boot 断言，三单元全绿复跑 exit 0——design 30 §2 L2 门首次落地）。
  编译器侧：DEBTS 070 第二行经 PLAN-645 落地（075 实勘定案，DEBTS.md
  本体漏划销已补）+ 074-sink-mode G-6 未修面（components//bps 与 dep 臂
  同文件模块 fn）随 075 收口（048 夹具首个消费方）。jade 代码零改动。
