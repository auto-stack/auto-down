# PLAN-079 L3 装配模式文档：desktop 面板装配作业标准（T-00 产物）

> 状态：T-00 定形（2026-09-19）。074-sink-mode 的 L3 对应物——下沉（RC-D）
> 把面板逻辑收进 web 侧 .at 单源；本文档定义 desktop 侧如何**消费**这些
> 单源（装配 = 消费侧作业标准）。
>
> 机制依据：design 30 §2 L3 行（parity 单元 = 流程+布局组装+数据流）；
> 074-078 四张 desktop 消费登记表（074-sink-mode §4/§4.1/§4.2/§4.3）。

## 1. 探针证据矩阵（T-00，unlinked_references 探针件）

探针工件：`jade-garden/front/tmp/p079-probe/`（worktree 一次性，双态绿后
弃；auto.exe v0.4.2-1414 主检出 debug exe）。探针件选型：唯一路径件 +
desktop 无等价流 + 高亮 regex ext 桥不进 VM（消费面最薄）。驱动 =
driver.mjs（后端真数据：Tasks 标题 → 3 条未链引用 = Projects.ad 块引用
×2 + 自页标题 ×1，API 实查定值）。

| # | 通道 | 结果 | 证据 |
| --- | --- | --- | --- |
| E-1 | α·dep 声明（pac.at `dep jadeauto`） | **run 轨零 junction 物化** | 驱动前后 reparse point 扫描零差分；F-6 在案口径复证（run 走 pac.at 直读，build 才物化——desktop 纯 VM 项目不跑 build） |
| E-2 | α·widget 挂载（`use jadeauto.front.<file>: <Widget>` + view 挂载） | **编译/boot 绿，面板零运行时痕迹** | 无 ext stub WARN（gallery F-6 同项目挂载尚有 WARN——dep 文件挂载更死）、无 watch 活动、无报错；挂载子树对 MCP 快照黑盒（F-1：面板文本不可见） |
| E-3 | α·数据面 | **死** | watch 源头 `.tabsStore.activeTab` 读 ext composable stub → 短路（title=""→refs=[]），契约调用从未执行——facade 路由缺口实锤（登记表预判复证） |
| E-4 | α·断言面 | **死** | F-1：挂载组件子树对 autoui_snapshot 不可见——vm-smoke 无法断言面板内容、无法 press 面板行 |
| E-5 | β·契约直拉（app.at `use back.api: get_unlinked_refs`） | **绿** | ul_count=3 真值断言过（split 模式 #[api]→340 HTTP→真后端） |
| E-6 | β·行构造 + 根视图行渲染 | **绿** | 行按钮 Projects.ad 在快照可见（F-1 口径：行在根视图 = MCP 可断言可驱动） |
| E-7 | β·行交互 | **绿** | press 行按钮 → .OpenFile(Projects.ad) → active_title=Projects |
| E-8 | β·fn 跨项目 dep 通道（`use jadeauto.front.<file>: <fn>`） | **红·静默死面（新坑 P-15）** | fn 导入后 App 空视图：MCP up、view() 首拍后零按钮、零报错、Init 后无 handler 活动；隔离实验定谳（撤导入即复活，dep 声明本身无害） |
| E-9 | β·fn 同项目文件通道（desktop `use <stem>: <fn>`） | **绿** | unlinked_fns.at 部署副本 `use unlinked_fns: ul_tab_title` 真调用 + 断言过——生产形态的 fn 载体通道 |
| E-10 | 对照·bps fn 通道（既有） | 绿 | `use bps.navigation.filetree.tree_util: flatten_tree` 在库（纯模块包；E-8 红专属"widget+ext 承载文件"的 fn 导入） |

## 2. 装配形态裁定（Q-1 定形）

**裁定：β 内联消费 = L3 批次 1 的装配形态；α 组件挂载不采用（批次 1
无此需求面）；按件混合仅体现在"行族 β 装配 / 交互独立面 desktop 自持
β 变体"。**

- **行族面板（11 件唯一/首选路径件）**：desktop 侧 = ①契约直拉
  （desktop `src/back/api.at` 副本既有 #[api] 面）+ ②下沉 fn **随件部署
  副本**（落 `desktop/src/front/<panel>_fns.at` 独立文件，app.at 经
  `use <stem>: <fn>` 引回——E-9 通道；tabs_store.at 字节部署同族先例）
  + ③行渲染留根视图（F-1 口径：MCP 可断言可驱动）+ ④计数/状态投影
  留根 model 字段（vm-smoke 断言锚）。
- **交互独立面（palette/switcher 弹层、theme popover、cpp 确认）**：
  desktop 自持 UI 消费下沉 fn（部署副本）——palette 命令清单走 ui_config
  单源重建（073 已单源，不移植 buildCommands）；theme/cpp 面落 desktop
  自有形态（menubar/status_bar 面），逻辑复用部署副本 fn。
- **α 不采用的依据**：数据面（E-3 facade stub 短路）与断言面（E-4 F-1
  黑盒）两面死——装配的核心价值（可验证行为等价）不可达。若未来批次
  需真组件挂载（如 editor 级重组件），需先补：facade 路由桥（ext
  composable → desktop .at store 映射，编译器/构建层缺口归 auto-lang）
  + 挂载子树快照可见性（F-1 解冻）——两缺口登记，非批次 1 面。
- **fn 单源口径**：E-8 红封闭了"跨项目 fn 引用"单源路——下沉 fn 的
  desktop 消费一律**部署副本**（副本头注标 derived-from 源文件 + 同步
  纪律）。与 G-3（.at 无跨文件导入 → web 侧 fn 本就随件各沉一份）同族：
  单源性由"web 侧唯一真源 + desktop 副本可追溯"承载，tabs_store.at
  字节部署先例（scripts/tabs-store-sync.mjs 门检模式）为重件参照。

### 逐件裁定表（对齐 074-sink-mode §4/§4.1/§4.2 登记表）

| 批 | 件 | 登记表裁定 | T-00 定形动作 |
| --- | --- | --- | --- |
| A | backlinks/outgoing_links | 首选挂载 | **β 装配**：既有内联流升级——tab_file_stem 等下沉 fn 部署副本化（内联流已直拉契约）；内联流退役 = 并入装配面（同一流的形状收敛，无双流并存） |
| A | unlinked_references | 唯一路径 | β 装配（探针件，E-5..E-7 全绿形态即生产形态） |
| A | outline | 唯一路径 | β 装配：outline_headings 部署副本 + blocks 面显式播种（F-5：blocks facade watch 原地改引用不重触发——desktop 在 OpenFile 流显式 parse 播种） |
| B | command_palette | 唯一路径 | β 变体（desktop 自持）：filter_palette/next_index/prev_index 部署副本 + 命令清单 ui_config 重建 + 热键走 menubar action shortcut 面（window 级 ext 不进 VM） |
| B | quick_switcher | 唯一路径 | β 变体（desktop 自持）：collect_files/filter_files 部署副本 + 开面板入口（menubar 视图菜单 + action） |
| B | search_panel | 可选（Q-3） | **裁定：内联流维持，组件装配延后批次 2**——搜索内联流已覆盖功能面（.DoSearch），装配收益仅形态统一；避免批次膨胀（计划 Q-3 默认预案） |
| C | properties/recent_files/create_page_prompt/theme_popover/agenda | 唯一路径 | β 装配/β 变体：sync_entries（P-9 map 迭代 → twin 播种口径：desktop 以配对列表通道装配）、recent_files_with_time、cpp = desktop 自持确认面（wikiTitleToPath 等价 path 推导 = strip_ext 纪律 ASCII 域）、theme_accents 部署副本（accent 单源 desktop 自声明）、agenda_display 部署副本 |
| C | flashcard_modal | 可选（Q-3） | **裁定：内联流维持，组件装配延后批次 2**——闪卡内联流已覆盖（LoadCards/Grade + due 列），同 search_panel 口径 |
| （维持） | workspace_opener | 内联维持（077 §4.2） | 零动作（OpenWs 流已覆盖） |
| （批次 2） | graph 族四件 | §4.3 + 661 交接 | 划出（gated on PLAN-661 AC 全绿） |

## 3. 装配步骤（行族流水，逐件）

1. **fn 部署副本**：web 件模块 fn → `desktop/src/front/<panel>_fns.at`
   （头注 derived-from 源路径 + 本档为作业标准引用）；VM 纪律复核
   （P614 参数列表 while+索引 / G-2 CJK 禁索引算术 / P-9 map 迭代禁面）。
2. **契约接线**：app.at `use back.api:` 增该件契约 fn（desktop api.at
   副本核对在库，缺则按 ROUTE 对拍补镜像）。
3. **流挂接**：OpenFile/加载 action 内契约直拉 + 行构造（fns 副本调用）
   + 计数/状态投影字段；watch 型面板（agenda/recent/properties）=
   OpenFile 流重取（desktop 无 watch immediate 依赖面）。
4. **根视图行渲染**：右栏/对应槽位 col + 行按钮（onclick 走既有
   .OpenFile/action 面）；文本面纪律沿 desktop 既有 11px/zinc 形态。
5. **断言锚**：vm-smoke 增/迁移臂断言（root 投影字段 + 行按钮快照）；
   退役内联流的断言先迁移后退役（行为等价验证先行）。
6. **登记表回填**：074-sink-mode §4/§4.1/§4.2 各行"挂载裁定"列回填
   实际形态（β 装配/desktop 自持/内联维持 + 本档引用）。

## 4. 坑清单（L3 版作业纪律）

- **P-15（新，E-8）：跨项目 fn 导入静默死面**——`use jadeauto.front.<file>:
  <fn>` 使 App 空视图（零报错、MCP up、无按钮、Init 后无活动）；
  dep 声明本身无害（E-1/E-8 隔离定谳）。**纪律：desktop 不声明 jadeauto
  dep；下沉 fn 消费一律部署副本 + 同项目 use 引回（E-9）。**候选 auto-lang
  缺口登记（fn 导入应报错而非静默死），随批次收口进 DEBTS 提名。
- **F-1（沿）：挂载组件子树对 MCP 快照不可见**——装配面断言/交互全走
  根投影 + 根视图行（desktop README §9.4 契约）。
- **F-5（沿，outline 前置）：blocks facade watch 原地改引用不重触发**——
  desktop 装配在 OpenFile 流显式播种（gallery OutlinePage 先例）。
- **G-2（沿）：VM 轨 CJK 域禁 find/slice/char_at 索引算术**——标题派生
  走 tabs_store strip_ext（ASCII 后缀域）或 store title 权威
  （.active_title）。
- **P614（沿）：for-in 对参数列表零迭代**——部署副本 fn 带参遍历一律
  while+索引。
- **P-9（沿，properties 前置）：map 键值迭代 VM 零迭代**——sync_entries
  消费侧以配对列表通道装配（twin 播种口径），map-for-in 禁面。
- **P-11（沿）：map 括号写 VM 静默吞 handler**——批次 1 装配面无 map 写
  需求（graph 设置族划批次 2）；如需 = 点号写/全量重赋。
- **探针路径坑（环境项）**：tmp 深层目录复用 desktop pac.at 时 bps 相对
  深度 +2（探针实录：dep 路径落空 = 运行时 Undefined symbol 静默红，
  非编译期报错）。

## 5. Q-4 定价：app 级双端截图基线（VM 侧形态）

**裁定：snapshot 断言锚 + 结构基线文件起步，不建像素截图基建。**

- 依据：①像素通道在案不稳（desktop README §5 slice 5：iced 窗口偶发
  自退/句柄不可枚举，工具链债登记）；②结构基线通道在库成熟
  （baseline/iced-tabs-structure.txt = state+AURA snapshot @ 满状态，
  --save-baseline 再生成）；③vm-smoke 9 臂 + gallery VM gate 全走
  snapshot/state 断言锚。
- 落地（T-05）：装配后态跑 `--save-baseline` 建首批 app 级结构基线
  （六流装配后 + 壳面满状态），入库 baseline/；vm-smoke 断言面即
  行为基线。像素对拍基建延后（差异表登记，随 L3 批次 2 评估）。

## 6. Q-2 证据整理：ribbon parity 定义

**裁定（默认预案落地）：ribbon = web-only 特有面**（073 Q-1 daily-note
同款口径）——gallery 挂状态占位 + L3 差异表登记，desktop 无对应面。

- 证据：ribbon.at（118L）= 左 activity bar 家具——lucide 图标轨
  （dyn 组件值）+ sidebar 三 facade（useSidebarStore/useTabsStore/
  useFileTreeStore 全 ext 域）+ ThemePopover 挂载 + 今日笔记
  （openDailyNote = web daily-note 流，073 已裁 web-only）+ 全局图谱
  入口（openGraph = 图谱页流，批次 2）。desktop 命令面 = menubar/
  toolbar（ui_config 单源，073）；同名不同物在案（desktop toolbar ≠
  ribbon）。若未来用户裁 VM 侧补 activity bar 对应面 → 升级独立设计项
  （回 new 评估）。

## 7. RC-C 四件 + graph_page 占位口径（T-04 消费面）

app_shell/main_area/left_sidebar/right_sidebar = 组装级单元（归 L3 口径，
072 台账"L1 挂占位"）；graph_page = 批次 2（gated on 661）。gallery
units.mjs 增状态占位行（`missing: false` 的状态注记形态——负例语义仅
editor_tab 续任，占位 ≠ 缺件红，登记措辞区分；gate 汇总单独一行可见）。
