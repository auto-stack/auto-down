---
plan_id: PLAN-080
status: archived
completion_kind: delivered
feature_name: l3-assembly-batch2（L3 收口批次 2：graph 族真渲染装配 + properties 配对通道 + search/flashcard 转正 + L3 全量 DoD）
author: [zhaopuming]
created_at: 2026-09-20
updated_at: 2026-09-20
plan_revision: 1
current_step: 6
total_steps: 6

supersedes_spec_components: []
new_spec_components: []        # 见 §5：SD-01（jade ARCHITECTURE §8.6 L3 批次 2 bullet）；模式文档扩节 = 079-l3-assembly-mode §2 批次 2 表
touched_goals: []

affects: [jade-garden/front, jade-garden/back]
---

# [PLAN-080] l3-assembly-batch2——L3 收口批次 2（graph 族装配 + properties 配对通道 + L3 全量 DoD 终验）

> 机制依据：design 30 §2 L3 行（parity 单元 = 流程+布局组装+数据流；隔离面
> = jade 本体；门 = vm-smoke 双模 + 全量 playwright + 双端截图基线；
> **DoD = 全绿，剩余差异仅限布局组装级**——批次 2 = 该 DoD 的终验批）。
> 079 §5 划出表 + 079 模式文档 §2（β 内联消费装配形态，批次 1 已定形
> 并交付）+ P661-D4 消费侧交接（auto-lang KNOWN-DEBT：graph_view 真渲染
> [布局 .at 侧生成→三表灌入→onhit 打开页]、gallery 第三单元转正、
> desktop 图谱页装配——上游依赖 661 AC-01/02/05/06 全绿**已达成**）。
>
> 前置解锁（661 交付，2026-09-19 五 checkpoint 闭环 delivered）：canvas
> 场景契约 v2 三表族+onhit（详规 auto-lang docs/specs/auto-lang/ui/design/
> canvas-scene.md）+ **Slider 三轨补全**（P-12 解除——DSL slider 词位 VM
> 渲染 + vue type=range + MCP set_value）+ **map 括号写修复**（P-11 解除
> ——graph settings 写通道可用）。⚠ 环境前置：主检出 auto.exe 仍为
> v0.4.2-1414-dirty（**不含 661 运行时特性**）——T-00 重建。

## 0. 变更摘要

| 面 | 内容 |
| --- | --- |
| 环境与定形 | T-00：auto-lang 主检出 exe 重建（master 4cbc810eb ≥ 661 交付版）+ 049 四能力样板复跑冒烟 + graph 环形布局 .at 形态定形 + properties 契约设计定稿（WikiDoc 扩 frontmatter_pairs）+ 079 模式文档批次 2 扩节 |
| properties 配对通道 | backend WikiDoc 增 frontmatter_pairs（map→pairs 序列化，加法字段）+ canonical api.at + desktop 契约副本 + **web tabs_store.at 单源扩字段**（frontmatter_pairs 进 tab model，字节部署同步）+ desktop 属性面板装配（pairs→行，只读 v1——P-9 域绕开） |
| desktop graph 族 | graph_view 真渲染：LoadGraph 升级 = 环形布局 fn（.at 侧 math.cos，049 样板形态）→ 三表 CSV 行族 → `canvas (scene/coords/onhit)` + onhit 打开页；graph_sidebar/graph_controls 挂载（078 下沉 fn 部署副本 + DSL slider 词位 + settings 点号写/P-11 已修 + localStorage 持久化）；图谱页入口（menubar 视图→图谱页，全局 v1） |
| 转正面 | gallery graph_view 单元转正（twin canvas 三表 + press(id) 断言——第 21 真件）+ search/flashcard 内联流转正装配（076/077 下沉 fn 部署副本消费） |
| L3 门（终验版） | 全量套件（vm-smoke 双模 + front e2e 全量 + gallery gate）+ 结构基线更新（批次 2 后态）+ **L3 DoD 终验陈述**（剩余差异仅限布局组装级的差异表收口）+ 账面（SD-01 批次 2 bullet + 消费登记表 §4.3/§4.4 终版 + merge 账本 P080-x） |

## 1. 目标

1. **T-00 定形在案**：exe ≥ 661 交付版锚定 + 四能力冒烟绿（三表/onhit/
   slider/map 写）+ 环形布局 .at 形态 + properties 契约定稿 + 模式文档
   批次 2 扩节（079 模式文档随批成长）。
2. **properties 闭环**：backend 配对契约（加法字段，web 零破坏——
   e2e/build 全绿背书）+ web 单源扩面（tabs_store.at 单源 + 字节部署）
   + desktop 属性面板装配（只读 v1，P-9 域经配对通道绕开——079 Q-5
   裁定 A 的批次 2 兑现）。
3. **desktop graph 族三件装配**：graph_view 真渲染（canvas 三表 +
   onhit 开页，MCP press(id) 可驱动断言）+ graph_sidebar/graph_controls
   挂载（078 下沉 fn 单源消费 + slider/settings 双解锁面）。
4. **转正面**：gallery 第 21 真件（graph_view 单元）+ search/flashcard
   内联流升级为 fn 单源消费装配。
5. **L3 全量 DoD 终验**：全量套件绿 + 双端基线在库/更新 + 差异表收口
   （剩余差异仅限布局组装级——批次 1 差异表 + 本批新增差异登记合账）
   + 账面（SD-01 + 登记表终版 + merge 账本 P080-x）。

**非目标**：fcose 力导布局（P661-D3 后置——v1 环形，布局归属 R-3 口径）；
局部图谱（centerPath BFS——ext Set/queue 域，v1 全局图谱先行，Q-3）；
properties 编辑面（commitFrontmatter = vue strict 域，只读 v1，Q-2）；
edges/labels 命中上报（P661-D2 后置——v1 命中域 nodes only）；editor_tab
（RC-E lighthouse 流）；ext-registry 死账清偿（074/077 遗留尾事——按用户
习惯不进计划契约，L0 fix worktree 时机自定）；web 侧重构/新功能（装配只
动消费面 + 契约加法字段）。

## 2. 架构方案

```
graph_view 真渲染（β 装配的 canvas 变体——079 模式 §2 延用）：
  desktop app.at LoadGraph 升级：
    get_graph() → nodes[{id,label,path,exists,degree}]/edges[{source,target}]
    → 环形布局 fn（.at 模块 fn：math.cos/sin 算 x/y——049 样板形态，
      布局归属 R-3：上游 .at 侧生成坐标，渲染端只收绝对坐标）
    → 三表 CSV 行族（canvas 场景契约 v2）：
        .graph_nodes  = ["id,x,y,circle,color,r", ...]   id=path（onhit 载荷）
        .graph_edges  = ["x1,y1,x2,y2,color,width"]       坐标自 node 表派生
        .graph_labels = ["x,y,label"]                     CJK 直写
    → canvas (scene: .graph, coords: "WxH", onhit: .OpenGraphPage)
    → onhit 收节点 id（=path）→ .OpenFile(path)
  ⚠ 契约要点（canvas-scene.md）：CSV 行宽容解析（畸形跳过）；逻辑坐标
    按 extent 独立线性缩放；绘制序 edges→nodes→labels；tap 判定 4px 容差
    倒序 topmost；MCP = snapshot nodes 计数/ids + press(value=id) 直达。

properties 配对通道（079 Q-5 裁定 A 的兑现路径）：
  backend：WikiDoc 增 frontmatter_pairs: List<FrontmatterPair{key,value}>
    （read 路径 split_ad 后 map→pairs 序列化；serde_json Value→Vec 顺序
    保序——YAML 映射序）；写路径不收 pairs（回写仍走 frontmatter map，
    加法只读通道）。
  wire：canonical back/auto/api.at + desktop/src/back/api.at 副本镜像
    （门：api-contract-routes 对拍 + assert-api-stub-sync）。
  web 单源：tabs_store.at（唯一源）Open 存 frontmatter_pairs 进 tab
    model → 字节部署 tabs-store-sync 同步 desktop 副本（--check 门）。
  desktop 消费：属性段 = tab.frontmatter_pairs → 行（sync_entries 行构造
    语义的 pairs 形状适配副本——P-9 map 迭代经配对通道绕开）；只读 v1
    （bool pill/编辑面 = vue strict 域差异登记）。
```

- **graph_controls 双解锁**（661 交付面消费）：DSL `slider` 词位 VM 轨
  已渲染（P-12 解除）——九滑条可直用词位（RangeInput ext 桥退役评估）；
  settings 写通道 = gc_set_setting/gc_reset_settings 部署副本（点号写
  P-11 安全形维持 + 括号写已修——写形态以副本单源为准）；localStorage
  持久化（Plan 401 session KV 桥，graph_store_ext 同款域）。
- **search/flashcard 转正**（079 Q-3"延后批次 2 顺带"兑现）：内联流
  升级为下沉 fn 部署副本消费（with_search_display 行构造族 / card_at·
  card_question·card_answer·counter_text），形态沿 079 模式 §3 流水。
- **gallery graph_view 转正**：VM twin = canvas 三表真渲染 twin（播种
  fixture → 三表行 → canvas + onhit；断言 = snapshot nodes 计数/ids +
  press(id) 消息投影）；vue 臂 = 真件部署 SFC（cytoscape ext 浏览器域，
  既有管线零改动）。

## 3. 技术栈

- **jade-garden/back**（**扩面**）：wiki.rs WikiDoc/frontmatter_pairs +
  serde 序列化 + cargo test（read 路径对拍）；main.rs 路由零新增（加法
  字段进既有 GET /api/wiki/{*path} 应答）。
- **jade-garden/front**：desktop `src/front/app.at`（图谱面 + 属性段 +
  search/flashcard 流升级）+ 新 `panels_graph_fns.at`/`panels_d_fns.at`
  部署副本族；`desktop/src/back/api.at` 契约副本镜像；web 单源
  `auto/src/front/tabs_store.at` 扩字段（**web 侧唯一实质改动**——
  加法字段 + regen 部署 SFC 流程）；`desktop/baseline/` 结构基线更新。
- **component-gallery**：units.mjs 增 graph_view 真件单元（第 21）+
  twin（vm/src/front/app.at 扩节）；gate 计数口径 21 真件 + 占位族。
- **auto-lang 编译器**：主检出 master @ 4cbc810eb（661 交付版）**重建
  debug exe**（T-00 环境步——现 exe v0.4.2-1414-dirty 不含 canvas 三表/
  slider/map 写）；探针出编译缺口按惯例兄弟分支补丁 + 折回（非预期）。
- **门**：vm-smoke 双模（增 graph 真渲染/properties/slider 臂）+ front
  e2e 全量（web 零破坏背书——tabs_store 扩字段面）+ gallery gate（21
  真件）+ tabs-store-sync --check + assert-api-stub-sync + cargo test
  （back 扩面）+ 结构基线更新复跑。

## 4. 需求分析与背景调查

**授权记录**：2026-09-20 用户批准起草批次 2（含 properties 配对通道扩面
jade-garden/back——上一轮对话建议方案被采纳："并入 080 但要扩 affects，
你在批准 080 时一并授权"）；**仅起草，执行未授权**。Q-1..Q-3 为默认预案
级（随任务落地销号，079 Q-2/Q-3 先例口径）；Q-4 为环境风险注记。

**既有依据（2026-09-20 主检出实勘）**：

| 依据 | 实勘落点 |
| --- | --- |
| 661 交付实勘 | auto-lang master tip 4cbc810eb（merge 收据 cleaned 五 checkpoint 闭环）；delivery 7b0982d07（T-05 canvas 三表+onhit + T-06 049 四合一样板 + SD-01 canvas-scene.md + KNOWN-DEBT P661-D1..D7）；P661-D4 消费侧交接 = 本计划 §0/§2 直接依据 |
| canvas 场景契约 v2 | auto-lang docs/specs/auto-lang/ui/design/canvas-scene.md（76L）：三表 CSV 行族 + 解析宽容 + extent 独立缩放 + 绘制序 + onhit nodes-only/4px/topmost + MCP press(id) + 布局归属 R-3（上游 .at 侧） |
| 049 样板 | examples/capability-tests/049-canvas-graph/app.at：`canvas (scene: .graph, coords: "300x300", clear:, onhit: .NodeTap)` + `.graph_nodes/_edges/_labels` CSV 行 + 环形布局 math.cos 上游生成——T-02 消费形态模板 |
| exe 缺口 | 主检出 auto.exe v0.4.2-1414-gd03afa88d-dirty（079 基线，**不含 661**）——T-00 重建 + 版本回读锚定 |
| graph wire 形状 | desktop api.at:228-247：GraphNode{id,label,path,exists,degree}/GraphEdge{source,target,block_id?}——无坐标（布局 .at 生成）/edges 按引用（绝对坐标派生） |
| graph 族登记表 | 074-sink-mode §4.3（graph_sidebar 可选→本批挂载/graph_controls 唯一路径——Q-4 前置 Slider 已随 661 解除/graph_view 划出 078→本批承接）+ §7.1/7.2/7.3 分类表 + §4.4 批次 1 回填表 |
| properties 前置 | 079 §9 复审 F-R1/Q-5 裁定 A：P-9 map 迭代 + 无整页 frontmatter 列表契约 → 配对通道为批次 2 前置；backend wiki.rs:14-27（WikiDoc.frontmatter: Value/split_ad）= 加法字段落点 |
| search/flashcard | 079 Q-3 裁定（内联维持延后批次 2 顺带）+ 074-sink-mode §5.1（with_search_display）/§6.6（card_at/card_question/card_answer/counter_text）下沉 fn 面 |
| 079 模式文档 | attachments/079-l3-assembly-mode.md：β 装配形态/部署副本纪律（P-15/E-9 通道）/§3 流水/§4 坑清单——本批作业标准基座（扩节非新档） |
| gallery 计数口径 | units.mjs 20 真件 + editor_tab missing + 六占位（079 T-04）——本批 graph_view 转正后 21 真件；负例语义不变 |
| 排除项 | ext-registry-gate 死账（074/077 下沉遗留——079 F-R4 同一笔）：按用户习惯尾事不进契约，L0 fix worktree 时机自定（非本计划面） |

## 5. 详细设计

### 规范增量

| delta_id | add/modify/retire | 目标文档 | before/after | rationale | acceptance |
| --- | --- | --- | --- | --- | --- |
| SD-01 | modify | jade-garden/ARCHITECTURE.md §8.6 | L3 批次 1 bullet 后 → 增 L3 批次 2 bullet（graph 真渲染装配 + properties 配对通道 + 转正面 + L3 DoD 终验陈述 + 差异表收口） | L3 台账 | AC-05 |

（**模式文档扩节** = attachments/079-l3-assembly-mode.md §2 增批次 2 表
（graph 族/properties/search·flashcard 实际形态）+ §4 坑清单增补（本批
实录）。**契约引用** = auto-lang canvas-scene.md v2（他仓 canonical，
本计划消费不改）。均非本仓 canonical spec 新建。）

**装配分批与登记表对齐**：

| 批 | 件 | 登记表裁定 | 本批动作 |
| --- | --- | --- | --- |
| properties | properties_panel | 079 Q-5 裁定 A 划批次 2 | 配对通道（backend 加法字段 + web 单源扩面 + desktop 只读装配） |
| graph | graph_view | §4.3 划出 078 → 661 交接 | **真渲染装配**（环形布局→三表→canvas→onhit 开页；cytoscape 退役评估[desktop 面]） |
| graph | graph_sidebar | §4.3 可选挂载 | 装配（graph_stats/top_degree_nodes 副本 + 右栏段） |
| graph | graph_controls | §4.3 唯一路径（前置 Slider 已解锁） | 装配（gc_* 副本 + DSL slider 词位 + settings 写 + localStorage） |
| graph | graph_page | §4.3 批次 2 | 图谱页入口（menubar 视图→图谱页，全局 v1；局部 BFS 划出 Q-3） |
| 转正 | search_panel/flashcard_modal | 079 Q-3 延后顺带 | 内联流升级 fn 单源消费（副本 + 显示面小升级） |

**L3 门（终验版）**：全量套件（vm-smoke 双模 + e2e 全量 + gallery 21 真件
+ cargo test[back] + sync/stub 门）+ 结构基线批次 2 后态更新（--save-
baseline 同通道）+ **L3 DoD 差异表收口**：079 批次 1 差异登记（outline
行扫描/时间列/键盘域/运行时主题应用等）+ 本批新增（环形布局 vs fcose/
properties 只读/局部图谱划出/edges·labels 命中后置）合账成表——"剩余
差异仅限布局组装级"的可陈述性 = 终验判据（差异表逐项归档级或组装级）。

## 6. 测试设计

- **T-00 冒烟**：049 样板复跑（VM 侧 desktop_mcp 11/11 或等价子集——
  三表初始态/press 命中/set_value/map 写读回）+ 重建 exe 版本回读。
- **properties 臂**：OpenFile 后属性段计数/行在场（fixture 页 frontmatter
  键真值——CAP 定理 5 键/Hello World 5 键）；web 零破坏 = e2e 全量 +
  11-properties 既有测不变绿（web 编辑面不受加法字段影响）+ cargo test
  （backend read 对拍：pairs 序 = YAML 映射序）。
- **graph 真渲染臂**：LoadGraph → snapshot canvas nodes 计数/ids 暴露 →
  press(value=id) → .OpenFile 开页断言（active_title 跟随）；controls：
  slider set_value → 投影字段变化（661 set_value 闭环消费）；sidebar：
  计数卡 + top_degree 行在场。
- **gallery graph_view 单元**：twin 播种三表 → snapshot nodes 计数 →
  press(id) 投影；vue 臂真件 SFC 既有管线（截图基线新增 1 张）。
- **回归**：vm-smoke 双模全臂 + e2e 全量 + gallery gate 21 真件零漂移
  （旧 20 张基线不动）+ tabs-store-sync --check + stub-sync。

## 7. 验收标准

| ID | 可观察行为 | 验证方法 |
| --- | --- | --- |
| AC-01 | T-00 定形在案：exe ≥ 661 交付版 + 四能力冒烟绿 + 布局/契约定形 + 模式文档批次 2 扩节 | exe --version 回读 + 049 冒烟收据 + 扩节 diff |
| AC-02 | properties 配对通道闭环：backend 加法契约 + web 单源扩面零破坏 + desktop 只读属性面装配 | cargo test 绿 + e2e 全量绿（11-properties 不变）+ tabs-store-sync --check + vm-smoke properties 臂绿（行计数真值） |
| AC-03 | desktop graph 族三件：canvas 真渲染 press(id) 开页 + sidebar/controls 挂载（slider set_value + settings 写投影） | vm-smoke graph 臂族绿（snapshot nodes 计数/ids + press 开页 + set_value 投影） |
| AC-04 | gallery 第 21 真件（graph_view 单元双臂）+ search/flashcard fn 单源消费装配 + 图谱页入口 | gallery gate 双臂 21 真件零漂移 + app.at diff 对应登记表回填 + 图谱页菜单入口在场 |
| AC-05 | L3 全量 DoD：全量套件绿 + 基线更新 + 差异表收口（批次 1+2 合账，逐项归档级/组装级）+ 账面 | 全量门复跑收据 + 基线文件更新在库 + 差异表（ARCHITECTURE/模式文档 §2 终版）+ SD-01 bullet + merge 账本 P080-x |

## 8. 执行步骤

> worktree：`down-080/{auto-down, auto-lang}`（auto-lang 兄弟 master
> detached @ 重建基线 commit；编译缺口补丁走兄弟分支惯例）。

- **T-00** [调查+环境+定形] exe 重建（auto-lang master 4cbc810eb，cargo
  build + 版本回读锚定）+ 049 四能力样板复跑冒烟 + 环形布局 fn 设计定形
  （nodes→坐标→三表 CSV 行构造）+ properties 契约定稿（WikiDoc 加法字段
  形态 + 序语义）+ 模式文档批次 2 扩节。依赖：无。→ AC-01
  [✅ 已完成：worktree down-080/auto-lang @4cbc810eb 重建（--features
  ui-iced）版本回读 0.4.2-1457-g4cbc810eb；049 冒烟 11/11 PASS（三表
  5/press 3/set_value 2/map 写 1）；布局/契约定形 + 模式文档批次 2 扩节
  落 079-mode §2（commit 2df2f7d）。实勘修正：serde_json 未开
  preserve_order——pairs=YAML 序走 serde_yaml::Value 二次解析（定稿记
  模式文档，计划草案"Value 保序"假设作废）。Q-4 销号：重建时点 master
  tip = 4cbc810eb 恰为 661 交付版，无漂移]
- **T-01** [改] properties 配对通道 + desktop 属性面板装配（backend +
  双 api.at + web tabs_store.at 单源扩面 + 字节部署 + 只读属性段 +
  cargo/e2e/vm-smoke 门）。依赖：T-00。→ AC-02
  [✅ 已完成：worktree commit 01b000f。backend = WikiDoc.frontmatter_pairs
  加法字段（serde_yaml::Value 二次解析保 YAML 序——serde_json 未开
  preserve_order，计划草案"Value 保序"假设作废已录模式文档；写路径
  serde default）；api.at = FrontmatterPair 类型 + WikiDoc 可选字段（
  List<FrontmatterPair>?，POST 缺省语义）经 gen.mjs 全投影；web 单源
  tabs_store.at 四点存 pairs + regen 部署 + 字节部署（sync 门绿）；
  desktop = panels_d_fns.at props_rows 副本 + app.at 右栏末位属性段 +
  四流刷新（OpenFile/SwitchTab/CloseTab 清/CppCreate 清）。门全绿：
  cargo test 47/47（wiki pairs 序判别 zebra/alpha/mike/kilo）+
  assert-api-stub-sync + front build + e2e 24/24（11-properties 不变绿
  + 08 截图零漂移 = web 零破坏）+ vm-smoke properties 臂 split PASS
  （prop_count=5/五键/summary·updated_at 标量值端到端/切换刷新）。
  merged 模式臂随 T-05 双模收口。Q-2 销号：只读 v1 落地，编辑面差异
  登记模式文档 §2 批次 2 表]
- **T-02** [改] desktop graph_view 真渲染（panels_graph_fns.at 环形布局
  fn + 三表构造 + canvas 挂载 + onhit 开页 + smoke graph 臂）。依赖：
  T-00。→ AC-03
  [✅ 已完成：worktree commit 9ab416b。panels_graph_fns.at graph_ring_tables
  副本（049 形态：环形布局 R-3 上游坐标——float 累计器代 int 除法[VM 无
  int→float 混算先例]、edges 坐标按 node 位表线性扫描、exists 杂色
  预留[后端恒 true]）；app.at LoadGraph 升级（平铺行退役 → canvas 三表
  + 计数投影[graph_edges int 改名 graph_edge_count 让位 canvas 表名]
  + graph_page 图谱页视图开关）；GraphNodeTap(id) → .OpenFile 直开页
  （OpenFile 内 graph_page 自闭）。门：vm-smoke graph 臂 PASS（三表
  path-id/CJK 标签/边表 + canvas 图谱页 + press(id) 开页 + 自闭）+
  全量 split 17 臂零回归。fixture 实录：cpp 臂历史 untracked 泄漏页
  入图（17 节点）——臂计数改下限式]
- **T-03** [改] graph_sidebar/graph_controls 挂载（078 fn 副本 + slider
  词位 + settings 写 + localStorage + 图谱页 menubar 入口 + smoke 臂
  扩展）。依赖：T-02。→ AC-03
  [✅ 已完成：worktree commit 2038e0b。panels_graph_fns.at 扩 078 副本
  （graph_stats/top_degree_nodes P614 适配 + gc_set_setting 括号写
  [P-11 已修] + defaults）；graph_ring_tables 消费 settings（r/宽/双
  过滤）；app.at：Gc 双滑条（DSL slider 词位）+ flags 双分支按钮 +
  reset + .GcRebuild 统一重灌 + 右栏 graph 段 + 视图菜单图谱页入口。
  门：全量 split 18 臂 PASS（sidebar stats/top 行 + set_value→r=24
  投影 + 孤立过滤 6→5 + reset）。差异登记：localStorage 持久化 =
  session KV str 域读回无 parse 词位→v1 会话内 model 态（AC-03 不含
  持久化，兼容）；checkbox→双分支按钮；力导四参不装配。坑实录三条
  收账模式文档 §4（P-16 撞名 link 死 + fixture clean -x 修正[18 泄漏
  清零，fixture 回真 5 页] + 同值竞态两处判别字段轮询）]
- **T-04** [改] gallery graph_view 单元转正（twin canvas + press 断言 +
  基线 1 张）+ search/flashcard 转正装配（fn 副本消费 + 流升级）。依赖：
  T-00（gallery 面可与 T-02/03 并行）。→ AC-04
  [✅ 已完成：worktree commit 955ed02（test-results 工件误入已 amend
  剔除）。gallery 第 21 真件双臂：vue = 真件 GraphView.vue 零改动 +
  GraphViewPage/App.vue 接线（cytoscape 像素面走截图基线，DOM 无文本
  needle）；vm = twin gv_ring_tables 副本 → canvas 三表 + press(id)
  onhit 投影（vm-probe 扩 canvas press 步型）；基线 graph-view.png 新增
  1 张、旧 20 张字节零漂移；graph_page 占位注记回填已装配。desktop
  转正：panels_sf_fns.at（with_search_display P614 适配 + snippet mark
  桥 ext 域差异 / card_* 近逐字）+ DoSearch/LoadCards/Grade fn 单源
  消费（title_text 全形状行 + raw 回落 + counter 行序 + answer 行）。
  门：gallery gate 双臂全绿 21 真件 + scoped search/cards 臂 PASS +
  全量 split PASS]
- **T-05** [改] L3 门终验收口：全量套件 + 结构基线批次 2 后态更新 + 差异
  表合账收口 + 账面（SD-01 + 登记表 §4.3/§4.4 终版 + 模式文档终版）。
  依赖：T-01..T-04。→ AC-05
  [✅ 已完成：worktree commit cd81321。全量套件：vm-smoke 双模（split
  18 臂 + merged 全 PASS——properties/graph 新臂双模绿）+ front e2e
  24/24 + gallery gate 双臂 21 真件（旧 20 基线字节零漂移）+ cargo test
  47/47 + tabs-store-sync/stub-sync + front build 全绿。结构基线 =
  iced-l3-batch2-structure.txt（--save-baseline 满状态通道，含图谱页
  canvas 三表/sidebar/controls/properties 配对行）。差异表收口 =
  079-mode §8（批次 1+2 合账 19 项：归档级 8 / 组装级 11，两类之外零
  未决——design 30 §2 L3 DoD 陈述成立）。账面 = SD-01 bullet（§8.6）+
  074-sink-mode §4.3 终版注记/§4.5 批次 2 终版回填七行 + 模式文档终版。
  merge 账本 P080-x 随 merge 阶段]

## 9. 复审记录

- 2026-09-20 draft handoff：`stage: new | plan_id: PLAN-080 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权——Q-1..Q-3 默认预案级随任务销号，
  Q-4 环境注记） | next: 用户授权 → work`。
- 2026-09-20 work handoff：`stage: work | plan_id: PLAN-080 |
  plan_revision: 1 | outcome: pass | code_commit: plan-080-dev cd81321
  （T-00 2df2f7d / T-01 01b000f / T-02 9ab416b / T-03 2038e0b /
  T-04 955ed02[amend 剔 test-results 工件] / T-05 cd81321）| task_ids:
  T-00..T-05 全勾 | evidence: ①T-00 exe 重建 @4cbc810eb（版本回读
  0.4.2-1457）+ 049 冒烟 11/11；②T-01 cargo 47/47（pairs YAML 序判别）
  + e2e 24/24（11-properties 不变绿/08 截图零漂移）+ properties 臂
  split PASS；③T-02/03 全量 split 18 臂 PASS（graph 臂三表/press(id)
  开页/set_value 投影/孤立过滤/reset）+ merged 双模；④T-04 gallery
  gate 双臂 21 真件（graph-view.png 新增 1 张/旧 20 零漂移）+ search/
  cards 臂过；⑤T-05 全量复跑双模全绿 + 基线 iced-l3-batch2 + 差异表
  19 项收口 + SD-01/§4.5/模式文档账面。Q-1..Q-4 全销号。实勘修正两处
  记模式文档（serde_json preserve_order 缺席 → 二次解析；session KV
  str 域 → settings 会话内态差异 D-12）。新坑三条录模式文档 §4
  （P-16 撞名 link 死/fixture clean -x/同值竞态再现——restore 协议
  修正连带清 18 个历史泄漏页，fixture 回真 5 页基线）| blockers: 无 |
  环境注记：worktree 现存 pnpm install reparse point 残留（autodown
  engine + front/gallery 工作区链接——079 merge 收据同款已知类；执行/
  复审期保留功能性安装态，摘链归 merge cleaned 阶段按 079 配方处理，
  wt-guard 于彼时复跑过闸）| next: review`。
- 2026-09-20 review：`stage: review | plan_id: PLAN-080 | plan_revision: 1
  | outcome: pass | reviewed_commit: cd81321ef455f42171a66984266204c04aaa94b0
  | base_commit: 3f73737f1598f024b1aa735fca8afc7b5170f37f |
  dependency_revisions: auto-lang worktree down-080 @
  4cbc810eb3175195933733fd818a10b37d2be37c（exe 重建基线，clean）；back
  Cargo path dep → auto-lang 主检出（复审时点 1d6dc1f86——漂移提交为 ui
  NullCoalesce 修复，非 canvas/slider/map 面，Q-4 处置口径内，功能门
  双模全绿为锚）| spec_inputs: jade-garden/ARCHITECTURE.md §8.6（079
  bullet 前态）；attachments/079-l3-assembly-mode.md（批次 1 版）；
  attachments/074-sink-mode.md §4.3/§4.4；auto-lang docs/specs/auto-lang/
  ui/design/canvas-scene.md v2（他仓 canonical，消费不改）|
  acceptance_results: AC-01 pass（exe @4cbc810eb 版本回读 + 049 冒烟
  11/11 复现 + 模式文档扩节 diff@2df2f7d）；AC-02 pass（cargo 47/47 +
  e2e 24/24 复现[11-properties 不变绿] + tabs-store-sync --check +
  properties 臂 split/merged 双模）；AC-03 pass（graph 臂双模：三表
  state 真值 + canvas 在场 + press(id) 开页 active_title 跟随 +
  set_value→r=24 投影 + 孤立过滤 + reset）；AC-04 pass（gallery 双臂
  21 真件严格基线比对复现零漂移 + §4.5 回填 + 图谱页菜单入口
  pressMenuItem 实证）；AC-05 pass（全量门六组复现：cargo 47/049
  11/11/split PASS/merged PASS/front build+e2e+sync 三门/gallery 双臂
  + 基线 iced-l3-batch2 288 行在库 + 差异表 19 项两类收口 + SD-01/§4.5
  账面）| findings: F-R1 🟢info（AC-05 字面含"merge 账本 P080-x"——
  账本投影为 merge 阶段结构交付[079 先例分工]，review 时点 SD-01/
  登记表/差异表已备妥）；F-R2 🟢info（AC-03 验证方法写"snapshot
  nodes 计数/ids"——实现以 state 直读三表 + canvas 快照在场 +
  press(value=id) 寻址实证承载[049 断言通道同款]，gallery graph_view
  单元补 canvas press 面——语义等价无弱化）；F-R3 🟢info（分支顺带
  删除 master 上 072 误入库的 test-results/.last-run.json 运行工件
  ——卫生清理，建议保留删除并于 merge 收据注记）；两处实勘修正
  （serde preserve_order 缺席→二次解析；session KV str 域→settings
  会话内态 D-12）已记模式文档——authorized adaptation，契约意图不变
  | evidence: 本复审独立复跑六组门全绿（复审 session 内执行——独立
  性受限已声明，裁定从工件重构：全部门命令复现 + master..HEAD diff
  审计[28 文件 +1594/-68，docs 面 143 行与账面声明一致]）；基线/
  门命令与结果均已录本记录，worktree tracked 零脏 | next: merge`。
- 2026-09-20 merge 收据 `PLAN-080:r1`（五 checkpoint）：
  - **prepared** ✓：账本投影落 worktree commit 2a8a07b（projection-only descendant of reviewed cd81321——.autoos/specs.json：P072-1 原地更新[title 批次 1/2、related +PLAN-080、content 增批次 2 段] + P080-1 reviews 收据新增，249→250 条，JSON round-trip indent=1 最小 diff；实现/依赖零改动核验=delivery 候选）；SD-01/模式文档/登记表已在分支内随 landed 落 master。
  - **landed** ✓：master 基点 3f73737 = merge-base（未动，免 rebase）→ `git merge --ff-only plan-080-dev` 直进，master tip = 2a8a07b = delivery commit（无 merge commit）。known-good：主检出 exe 更新（auto.exe 拷钉定版 0.4.2-1457-g4cbc810eb 替 1414-dirty + back exe 重建含 pairs 通道）后主检出 vm-smoke **双模 PASS**（默认通道）。
  - **ledger_refreshed** ✓：主检出回读 250 条（reviews 52）；P072-1 title/related/content 与 P080-1 file=docs/plans/archived/080-l3-assembly-batch2.md、related=[PLAN-080] 逐字段核对。
  - **archived** ✓：untracked 计划平移入册 docs/plans/archived/080-l3-assembly-batch2.md（status archived + completion_kind delivered + 本收据）。
  - **cleaned**：待补记（worktree/分支/组目录收口）。

## 10. 待澄清事项

| # | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | graph 布局 v1 形态：环形（049 样板形态，math.cos 上游生成）vs 网格 vs 其他 | T-02 布局 fn | 默认预案：**环形**（fcose 力导后置——P661-D3 上游布局侧同口径；布局归属 R-3：.at 侧生成坐标）；节点多时环形可读性缺陷登记差异表 |
| Q-2 | properties desktop v1 边界：只读属性面 vs 含编辑 | T-01 | ~~默认预案：只读 v1~~ **已销号（T-01）**：只读 v1 落地（编辑 commitFrontmatter/强转族 = vue strict 域，差异登记模式文档 §2 批次 2 表；编辑面后续随 strict 域评估） |
| Q-3 | 局部图谱（centerPath BFS 可见集）处置：v1 装配 vs 划出 | T-03 图谱页 | ~~默认预案：全局图谱 v1，局部划出~~ **已销号（T-03）**：全局图谱 v1 落地（视图→图谱页入口）；局部 BFS 划出（ext Set/queue 域；差异表登记） |
| Q-4 | exe 重建锚定与他 session 漂移风险：auto-lang master 活跃（661 后仍有他会话提交），重建时点版本 ≠ 4cbc810eb | T-00 环境步 | ~~处置：重建时回读实际版本并锚定 ≥ 661 交付~~ **已销号（T-00）**：重建时点 master tip = 4cbc810eb 恰为 661 交付版（无漂移）；worktree 重建版本回读 0.4.2-1457-g4cbc810eb + 049 功能冒烟 11/11 双锚定成立 |
