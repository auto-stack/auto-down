---
plan_id: PLAN-076
status: archived               # drafting → executing → execution_done → reviewed → archived
completion_kind: delivered
feature_name: rcd-search-nav-batch2（L1 滚动批次 2：检索/导航族 3 件 + command_palette 转正）
author: [zhaopuming]
created_at: 2026-09-19
updated_at: 2026-09-19
plan_revision: 1
current_step: 5
total_steps: 5

supersedes_spec_components: []
new_spec_components: []        # 见 §5：SD-01（jade ARCHITECTURE §8.6 批次 2 bullet）；分类表/坑清单落 074-sink-mode.md 扩节（作业标准续册）
touched_goals: []

affects: [jade-garden/front]
---

# [PLAN-076] rcd-search-nav-batch2——检索/导航族 3 件（纯逻辑下沉 .at + VM 渲染臂）

> 机制依据：072-inventory §3 RC-D + **074-sink-mode.md（RC-D 批次 2/3 作业
> 标准：判定口径/六步流水/G-1..G-8 坑清单/desktop 癠记表）**。本批次三件 =
> search_panel 177L / command_palette 184L / quick_switcher 165L（合计
> 526L），形状 = "**query 输入 → 过滤/检索 → 行列表 + 键盘导航**"。
>
> 与 074 批次 1 的两点差异：①新增**键盘导航/热键/焦点**面（window 级 DOM
> ——按判定口径必留 ext，VM twin 无镜像，F-1 口径）；②command_palette 为
> 072 缺件红占位样板（units.mjs `missing:true`），本批**转正**为真单元。

## 0. 变更摘要

预分类（起草期精读三件 .at+ext 的基型，T-00 定稿入分类表）：

| 件 | .at | ext | sink 面（预判） | 必留 ext（预判） |
| --- | --- | --- | --- | --- |
| search_panel | 177L | ext:3（81L） | searchSafe 编排沉 watch try/catch/finally（`use back.api: search_pages`——契约双端已有）+ withSearchDisplay 行构造沉 computed（snippet_html regex 经 ext 桥逐行预计算——unlinked 先例） | re-exports（tabs/useDebounceFn/lucide）/snippetHtml（regex \u0001\u0002）/scheduleScrollToBlock（setTimeout+CustomEvent） |
| command_palette | 184L | ext:4（317L，最大 ext） | recentFileItems/allPaletteItems/filterPalette/nextIndex/prevIndex 沉模块 fn；runPaletteItem **file 分支**沉（command 分支留 ext 桥） | buildCommands（闭包 action：DOM/Blob/dispatchEvent/dynamic import——真宿主流整体必留）/listen-unlistenPaletteHotkeys（window keydown）/focusPaletteInput（nextTick+querySelector）/PaletteIcon（h 组件）/6 store re-exports |
| quick_switcher | 165L | ext:3（115L） | collectFiles（递归 walk——tree_util/P-2 find+递归形态先例）/filterFiles/nextIndex/prevIndex | listen-unlistenSwitcherHotkeys/focusSwitcherInput/2 store+icon re-exports |

共性探针项（T-00 定价）：filter 链 `trim/lowercase/includes` 在 VM 轨的 CJK
语义（G-2 纪律域——filterFiles 文件名与 filterPalette 标题均可含 CJK）；
`nextIndex/prevIndex` 模运算（f-string 数学内插 P-3 同域，纯数学可沉，G-3
随件各沉一份）。

## 1. 目标

1. 三件纯逻辑下沉 `.at`（074 模式六步流水）；ext 薄化至真宿主面（逐 fn
   分类表在案）。
2. 三单元 gallery 双端 gate 绿（vue 真件页 + VM twin + 基线在库）；
   **command_palette 缺件红占位转正**（`missing:true` 退场）。
3. VM 字符串语义裁定记录（filter 链 CJK 域探针结论——模式文档坑清单/债表
   续册）。
4. desktop 消费结论登记（模式文档 §4 扩表：三件的挂载裁定）。
5. 账面：SD-01 + 072-inventory 三行勾记 + merge 账本 P076-x。

**非目标**：desktop app.at 挂载面板（装配归 L3/后续）；批次 3（properties
267L 等 7 件）；workspace_opener 目录选择器 VM 通道裁定（inventory §3 注记
的登记在案裁定待办——批次 3 前置，不属本批）；热键/焦点面的 VM 等价物
（window 级 DOM，F-1 口径——VM twin 不镜像）；075 L2 抽取（并行计划，
无依赖）。

## 2. 架构方案

074-sink-mode §3 六步流水逐件执行（逐 fn 分类 → 沉 .at → 契约接线 → 再
生成部署 → gallery 双臂 gate → 回归收口），本批次三点专门化：

- **契约通道**：search_panel 的 `search_pages(q, limit)` 在
  `jade-garden/back/auto/api.at:283` 与 `front/desktop/src/back/api.at:287`
  双端已有——下沉后 .at 顶 `use back.api: search_pages` + ext 增 snake 契约
  别名（read_wiki/get_backlinks 先例）+ `stubs/gen_lib_api.ts` 同名 gen stub
  （assert-api-stub-sync 门 B/C 双镜像位）。command_palette 的
  export/import/dailyNote 流为 ext 闭包内调用（buildCommands 整体必留），
  不产生新契约面。
- **转正语义**：units.mjs command_palette 行 `missing:true` → 真单元登记
  （vue 真件页 + shim 路由 + VM twin + 基线）；缺件即红负例语义不消失——
  editor_tab（RC-E）仍挂占位，072 README F-6 注记随之更新（负例样本从
  command_palette 移交）。
- **VM twin 断言域**：三件 VM 臂按 072 Q-3 口径（root 投影字段 + root
  内联/twin 行）——过滤结果行数/选中索引投影（`qs_count/qs_selected` 形态）
  + 行快照 needle；热键/焦点/window 事件面不进 VM 断言（必留 ext 域）。

```
ext TS（过滤链/行构造/模运算，TS 不入 VM）
   ↓ 下沉（六步流水；filter 链 CJK 语义经 T-00 探针裁定断言域）
.at 模块 fn + watch（单源：vue 轨 a2ts 内联发射，VM 轨原生可达）
   ↓
gallery 双臂 ×3（vue 真件 + VM twin）→ command_palette 转正 → 回归收口
```

## 3. 技术栈

- **jade-garden/front**：`auto/src/front/{search_panel,command_palette,
  quick_switcher}.at` + `auto/src/front/utils/*_ext.ts`（源）→ `src/components/`
  部署 SFC（再生成+sed 双表达式，G-8）；component-gallery（units.mjs/单元页/
  twin/基线）。
- **auto-lang 编译器**：master ≥ v0.4.2-1198（074 三补丁已折回，ffe2dac6d
  实证 gallery gate 双臂绿）——**无新增编译器预期**；若 T-00 探针或 T-01
  递归发射出缺口，按 074 惯例 auto-lang 兄弟分支补丁 + merge 折回（不阻断
  本计划主线，缺口登记为执行注记）。
- **门**：gallery `node scripts/gate.mjs`（双臂）；front `pnpm build` +
  `pnpm test:e2e`（06-palette/05-panels 面直接相关）；desktop vm-smoke 双模。

## 4. 需求分析与背景调查

**授权记录**：2026-09-19 用户批准 Phase 2 第二波组合（076 检索/导航族批次
2）；**仅起草，执行未授权**。

**既有依据（2026-09-19 主检出实勘）**：

| 依据 | 实勘落点 |
| --- | --- |
| 072-inventory §3 | 三件行数/ext 数在案；search_panel 流粒度等价物注记（desktop 搜索流内联 search_pages，.type 撞名→snake 规避在案）；command_palette 无流粒度等价物 |
| 074-sink-mode.md | 判定口径（§1）/六步（§3）/G-1..G-8/desktop 登记表（§4）——本批作业标准 |
| 三件 .at+ext 精读 | search_panel.at 已具 .Init debounce 闭包 + watch let-bind（011 Phase 5.1 产物，比 074 四件更接近下沉终态——sink 面集中于 searchSafe/withSearchDisplay 两 fn）；command_palette_ext 317L（buildCommands 九命令闭包=真宿主流）；quick_switcher collectFiles 递归（tree_util 纪律域/P-2 find+递归先例） |
| api 契约 | search_pages 双端在案（back/api.at:283 / desktop api.at:287） |
| gallery 现状 | units.mjs 实读：8 真件单元 + command_palette missing:true + editor_tab RC-E 占位 |
| e2e 面 | 06-palette.spec.ts（palette/switcher 热键行为面）/05-panels.spec.ts/08-screenshots.spec.ts |
| 075 并行性 | 无共享文件面：075 落 auto-lang 侧+jade 账面（ARCHITECTURE §8.6 bullet 追加，merge 期并集即解——074/073 同款冲突面先例） |

## 5. 详细设计

### 规范增量

| delta_id | add/modify/retire | 目标文档 | before/after | rationale | acceptance |
| --- | --- | --- | --- | --- | --- |
| SD-01 | modify | jade-garden/ARCHITECTURE.md §8.6 | RC-D 批次 1 bullet 后 → 增批次 2 bullet（三件下沉 + command_palette 转正 + gallery 11 单元口径 + VM filter 语义结论指针） | RC-D 滚动台账 | AC-05 |

（三件分类表落 `074-sink-mode.md` 扩节 §5（作业标准续册，随批次演进——
074 SD 先例）；VM filter 语义探针结论落 gallery README 债表 D 系列。均非
canonical spec。）

**逐 fn 预分类表**（18 fn 基型——T-00 定稿校正后入模式文档 §5）：

- search_panel（81L ext，6 导出）：searchSafe **sink（编排）**——try/catch
  吞错映射 + search_pages 契约通道；withSearchDisplay **sink（行构造）**——
  is_page/is_block/has_snippet 平凡布尔 + title_text 显式 if 守卫（P618 两步
  赋值），snippet_html 字段经 ext 桥逐行预计算（unlinked html 先例）；其余
  4 项必留（re-exports ×3 + scheduleScrollToBlock）。
- command_palette（317L ext，12 导出）：recentFileItems/allPaletteItems/
  filterPalette/nextIndex/prevIndex **sink**（map/concat/过滤链/模运算；
  filter 的 trim/lowercase/includes 待 T-00 探针）；runPaletteItem **拆沉**
  （file 分支=tabsStore.open 沉 .at；command 分支=对象闭包调用留 ext 桥）；
  其余 6 项必留（buildCommands/PaletteIcon/热键对/焦点 + store re-exports
  合计）。
- quick_switcher（115L ext，7 导出）：collectFiles/filterFiles/nextIndex/
  prevIndex **sink**（递归 walk + 过滤链 + 模运算）；其余 3 项必留（热键对
  /焦点/re-exports）。

**VM twin 断言设计**：三件各自 `unit=<id>` 分支——query 播种 + 过滤行数/
选中索引投影（NextItem/PrevItem 按钮可驱动 selected_index 变化——072 tab
_strip 按钮序列同款）+ 行 needle；search_panel VM 臂 Init 播种 shim 应答
（074 Q-2 口径：vue 臂 shim 应答/facade 播种，VM 臂 Init 播种）。

**转正登记**：units.mjs command_palette 行改真单元（title 去掉"缺件红占位"
字样）；072 README F-6 证据行补注"command_palette 已于 076 转正，负例样本
由 editor_tab 占位续任"。

## 6. 测试设计

- **gallery gate**：三单元双臂绿 + 基线 3 张新增（--update-snapshots 建）/
  旧 8 张零漂移；gate 汇总不再含 command_palette 预期红（转正断言）。
- **下沉行为锚**：filter/collect/next-prev 行为以 gallery 断言覆盖 + vue 轨
  对拍（074 口径）；T-00 探针的 CJK 断言域结论固化进 twin fixture（ASCII
  域 fixture 或语义注记，二选一按探针裁定）。
- **回归**：front `pnpm build`（vue-tsc 全量）+ `pnpm test:e2e` 全量（06
  -palette 热键行为面重点 + 05-panels/08-screenshots）；desktop vm-smoke
  双模快验。
- **stub 门**：assert-api-stub-sync（search_pages gen stub 双镜像位）。

## 7. 验收标准

| ID | 可观察行为 | 验证方法 |
| --- | --- | --- |
| AC-01 | 三件逐 fn 分类表在案（可沉/必留/拆沉裁定+去向） | 074-sink-mode.md §5 扩节 + T-00 探针结论（VM filter CJK 语义）落档 |
| AC-02 | 三件纯逻辑下沉：ext 薄化至真宿主面 + 三单元双端 gate 绿 | ext 导出面 grep=分类表对应（零 sink 残留）；部署 SFC 内联发射实证；gate 双臂绿 + 基线 3 张在库 |
| AC-03 | command_palette 转正 | units.mjs missing 退场 + 真单元双绿；072 README F-6 注记更新（editor_tab 续任负例） |
| AC-04 | 回归零变化 | pnpm build 绿 + front e2e 全量 passed + vm-smoke 双模 PASS |
| AC-05 | 账面 | SD-01 §8.6 bullet + 072-inventory 三行勾记 + merge 账本 P076-x |

## 8. 执行步骤

> worktree：`down-076/{auto-down, auto-lang}`（073/074 配对惯例；auto-lang
> 兄弟 master detached @ 同源 exe，无预期改动）。
>
> 执行记录（2026-09-19 /auto-plan:work 授权进入）：base = master `a615d69`，
> 分支 `plan-076-dev`，worktree `D:/autostack/.wt/down-076/auto-down`；
> 依赖 auto-lang 兄弟 `D:/autostack/.wt/down-076/auto-lang` detached @
> master `b4b04c5cd`（编译器主检出 debug exe v0.4.2-1198-gffe2dac6d 同源，
> 074 merge 收据实证该版 gallery gate 双臂绿）。主检出 auto-lang 有他
> session 代码 WIP（657-bp 计划 + examples/rust-workspace 两文件）——本批
> 不改 auto-lang，detached 兄弟不受影响，登记在案。环境前置：front/gallery
> pnpm 安装；engine dist 复制自 down-075（dist 戳 49a4c59f == 本 worktree
> src hash，freshness 绿）；back exe + tmp/wiki-demo fixture 主检出复制。

- **T-00** [x] [调查] 三件 ext 逐 fn 分类表定稿（18 fn 基型校正）+ VM filter
  语义探针（lowercase/includes/trim 对 CJK query 双轨行为——P-6 微探针
  同款；裁定 twin 断言域）。产物：模式文档 §5 扩节。依赖：无。→ AC-01
  - [x] T-00 ✅ 已完成（2026-09-19，down-076 @4f29b97）：分类表落
    `docs/plans/attachments/074-sink-mode.md` §5（**计数勘正：22 逻辑 fn**
    = sink 11 + 拆沉 1（runPaletteItem）+ 必留 10——初记 12+1+9 为拆分
    算术错，review F-1 勘正，总数 22 不变；drafting 期 "18 fn 基型"
    漏计）；探针 `front/tmp/p076-filterprobe` 双轨绿——**P-7 filter 链 CJK
    语义双轨一致**（"引"/ABOUT 折叠/" 方法.ad " trim/混合/无中 0，VM 全
    绿；机制=engine str 臂 Rust to_lowercase/UTF-8 contains 自同步等价
    JS includes/Unicode trim；P-6 字节-字符分歧专属索引算术，不及于过滤
    域）→ **twin 断言域裁定：直接用 CJK fixture**；**P-8 模块 fn 自递归
    双轨通**（root 通道；兄弟臂 = G-6 已修面，T-01 首件复验）；DSL 词位
    定稿（to_lower/contains/trim、`||` 布尔域、List 局部标注、f-string
    `${}` 形态）；**Q-3 关闭**：06-palette 四测已覆盖热键开合/输入过滤/
    Enter 执行 command 分支/switcher file 分支——ArrowUp/Down 选中移动
    无 e2e（gallery twin 补 selected_index 投影面，执行注记）。gallery
    README 债表 +D-6（074 P-6 转录）+D-7（P-7 结论）。Q-1/Q-2 关闭。
  - [x] F-1/F-2 修复重勾（2026-09-19 review，down-076 @bf40549）：review
    F-1/F-2（severity L，文档精度）——§5.4 拆分计数勘正 12+1+9→**11+1+10**
    （sink 行枚举 2+5+4；必留括注自和 10）+ §5.1 补 errorMessage 桥行
    （T-02 新增 strict 桥）+ 批次后 ext 面 13 fn 增记 + 本计划 §8 T-00
    同源行同步修正。代码零变化，仅模式文档一处提交（1 file，+9/-3）。
- **T-01** [x] [改] quick_switcher 下沉（最小件首验模式：collectFiles 递归/
  filterFiles/模运算沉模块 fn；ext 薄化至热键/焦点/re-exports）+ gallery
  单元上线（vue 真件页 + shim 路由 + VM twin + 基线）。依赖：T-00。→ AC-02
  - [x] T-01 ✅ 已完成（2026-09-19，down-076 @4544037）：collect_files
    （递归 walk，children null 守卫）/filter_files（P-7 链 + idx + cap 12）/
    next_index/prev_index（模运算）沉 quick_switcher.at 模块 fn；ext 薄化
    至热键对/焦点/三再导出（G-5：旧名零残留）。**Q-2 兄弟臂关闭**：G-6
    补丁折回版（1198）兄弟生成臂模块 fn 内联发射实证（部署 SFC function
    声明 + 裸名调用）；**G-1 参数域新证**：fn 参数名与 model 字段同名
    （query）同触 state-ref 误改写（发射 `query.value.trim()` 运行时炸、
    vue-tsc 因 any 静默）——参数名 qstr 规避，坑清单 G-1 措辞随 §5 扩节
    增补"参数同禁"。gallery quick_switcher 单元双臂绿：vue 臂真件页
    （fileTree facade 播种 + 'jade-open-quick-switcher' window 通道驱动）
    + VM twin **真跑下沉同形 fn**（qs_collect/qs_filter 对 fixture 树 CJK
    查询"引"→rows:2）+ qs_next×2 环绕断言（sel 0→1→0，补 06-palette 无
    ArrowUp/Down e2e 面）；基线 1 张新增/旧 8 零漂移（2% 容差内）。顺手
    修复 App.vue menubar 按钮开标签胶水残留（073/074 merge 遗留——8 个
    data-unit-tab 仅 7 个 button 开标签，gate 深链不走 tab 条故未红；执行
    注记在案）。gen 双绿（vue-tsc+vite）+ front pnpm build 绿。
- **T-02** [x] [改] search_panel 下沉（searchSafe 编排沉 watch + search_pages
  契约别名 + gen stub；withSearchDisplay 行构造沉 computed，snippet_html
  ext 桥）+ gallery 单元上线。依赖：T-00。→ AC-02
  - [x] T-02 ✅ 已完成（2026-09-19，down-076 @f5bd059）：searchSafe 编排
    沉 .Init debounce 闭包体自身 try/catch/finally（try 成功映射/catch
    空行+errorMessage（strict unknown-catch 桥，query_block 先例）/
    finally loading 复位；never-reject 包装形态随 DSL try/catch/finally
    过时）+ `use back.api: search_pages` 契约通道（双端 api.at 在案）；
    with_search_display 行构造沉模块 fn（title_text 显式 null 守卫两步
    赋值、is_page/is_block/has_snippet 布尔、snippet_html 经 ext
    snippetHtml 桥逐行预计算——unlinked 先例；G-1：参数 rows_in 避
    model.results 名）。ext 薄化至再导出 ×3 组+snippetHtml+
    scheduleScrollToBlock+search_pages 薄别名+errorMessage；gen stub 增
    search_pages（stub-sync A/B/C 绿）。**编译器缺口第四件（auto-lang
    plan-076-dev 58f2af2，074 惯例待折回）**：api walker 无 Closure/
    Lambda 臂（on-handler 内 `let run = () => {...}` 闭包体契约调用有
    emission 无 import，TS2304；on 直调绿/闭包嵌套红对照）+ 闭包体
    api 调用须发 async 前缀（await 落非 async 闭包 TS1308）——vue.rs
    walk_expr 补两臂 + ts_adapter Closure 发射补 async 检测。gallery
    search_panel 单元双臂绿：**fill 门新增**（units.spec 键入阶段——
    CJK 查询"引言"→真件 250ms debounce→契约→shim 两行 Page 带
    \u0001\u0002 标记/Block page_path 题）+ VM twin Init 播种 rows:2；
    基线 1 张/旧 9 零漂移。gen 双绿 + front pnpm build 绿（部署面仅
    SearchPanel.vue 变更）。
- **T-03** [x] [改] command_palette 下沉（过滤链/构造/模运算沉 + runPaletteItem
  拆沉 file 分支；buildCommands/热键/焦点/PaletteIcon 留 ext）+ **转正**
  （units.mjs 改登记 + README F-6 注记）。依赖：T-00。→ AC-02/03
  - [x] T-03 ✅ 已完成（2026-09-19，down-076 @1d0c924）：recent_file_items
    （行构造，icon 不入行）/all_palette_items（for-push concat）/
    filter_palette（title/subtitle 双 contains 布尔或 + null 守卫 + cap 20
    + idx/has_subtitle）/next_index/prev_index 沉模块 fn；runPaletteItem
    拆沉——file 分支（tabsStore.open）沉 Execute/ExecuteSelected handler，
    command 分支留 ext 桥 runCommandAction（对象闭包调用无词位）。ext
    薄化至 buildCommands（真宿主流整体）/PaletteIcon/热键对/焦点/7 再导出
    +runCommandAction+Clock。**icon 裁定 B 落地**（T-00 表 A/B 预案之 B）：
    view 双分支 `:icon="item.icon"`（command 透传）/:icon=".Clock"（file
    注入再导出）——发射实证可行（dyn (.Search) 同通道）。**转正**：
    units.mjs missing:true 退场为真单元（gate 汇总 missing 仅剩
    editor_tag——RC-E 续任负例）；README F-6 + 072 台账缺件即红行转正
    注记。gallery 双臂绿：vue 臂（workspace root 播种 + 合成 Ctrl+P
    keydown 开面板 + fill 门键入"引言"→filter 过 command×9+recent×2→
    recent 行命中）+ VM twin（cp_filter 同形 fn 真跑混合 fixture CJK 查询
    "引"→英文全落/CJK 两中 rows:2 + cp_next×2 环绕）；基线 1 张/旧 10
    零漂移。gen 双绿 + stub-sync 绿 + front pnpm build 绿（部署面仅
    CommandPalette.vue）。
- **T-04** [x] [改] desktop 消费登记（模式文档 §4 扩表：三件挂载裁定）+ 回归
  收口（pnpm build / e2e 全量 / vm-smoke 双模 / gallery gate 11 单元全绿）+
  账面（SD-01 + inventory 三行勾记）。依赖：T-01..T-03。→ AC-04/05
  - [x] T-04 ✅ 已完成（2026-09-19，down-076 @db40275）：模式文档 §4.1
    扩表（search_panel=组件挂载可选·内联流 L3 前维持；command_palette=
    组件唯一路径·desktop 命令清单走 ui_config 重建非移植 buildCommands；
    quick_switcher=组件唯一路径·CustomEvent 通道 desktop 侧换自家事件）。
    回归收口全绿：front `pnpm build` 绿（13.8s，vue-tsc 全量）；front
    e2e **24/24 passed**（28.0s——06-palette 四测全绿覆盖下沉行为面
    [热键开合/输入过滤/Enter 执行 command 分支/switcher file 分支]；
    端口 13100 落排除段 13086-13185→本地 sed 14200 跑后还原，diff 零）；
    desktop vm-smoke 双模 PASS（split + merged，AUTO_EXE=兄弟补丁版
    v0.4.2-1281-g）；gallery gate 双臂全绿 **11 真单元**（missing 汇总
    仅 editor_tab）+ 基线零漂移（fresh 复跑无 update）。账面：SD-01
    §8.6 批次 2 bullet（11 单元/11 基线/转正/P-7 指针/编译器补丁注记）
    + 072-inventory 三行【076】勾记 + §7 缺件即红行转正注记。

## 9. 复审记录

- 2026-09-19 review #2（F-R1 重审）：`stage: review | plan_id: PLAN-076 |
  plan_revision: 1 | outcome: pass | reviewed_commit: bf40549（plan-076-dev
  @down-076/auto-down，6 commits，树净） | base_commit: a615d69 |
  dependency_revisions: down-076/auto-lang @58f2af216（不变） |
  acceptance_results: AC-01 **pass**（F-1 勘正实证：§5.4 现记 sink 11 +
  拆沉 1 + 必留 10，sink 枚举 2+5+4 与表行逐一相符；F-2 补行实证：
  §5.1 errorMessage strict 桥行在案；批次后 ext 面 13 fn = 必留 10 +
  新增 3 与 ext 导出面实测相符[search 4+palette 6+switcher 3]）；AC-02/
  03/04 **pass 沿用 review#1**——复用理由：bf40549 相对 db40275 的 diff
  仅 074-sink-mode.md 一文件（+9/-3，git diff --stat 实证），代码/测试/
  依赖零变化，已验证面不受影响；AC-05 **pass**（SD-01 bullet/inventory
  勾记未被修复触达，计数 review#1 已核；账本 P076-x 归 merge） |
  findings: F-1/F-2 closed；无新增 | evidence: diff --stat + §5.4 修正
  文本 + ext 导出面 grep 复核 + review#1 全套件重放记录 |
  next: merge`。
- 2026-09-19 review：`stage: review | plan_id: PLAN-076 | plan_revision: 1 |
  outcome: needs_fix | reviewed_commit: db40275（plan-076-dev @down-076/
  auto-down，5 commits，树净） | base_commit: a615d69（master 未漂移） |
  dependency_revisions: down-076/auto-lang @58f2af216（分支 plan-076-dev，
  编译器补丁 ×1，built exe v0.4.2-1281-gb4b04c5cd-dirty） |
  spec_inputs: jade-garden/ARCHITECTURE.md §8.6（SD-01 bullet，HEAD:209）
  + 074-sink-mode.md §5/§4.1 + gallery README D-6/D-7/F-6 + 072-inventory
  三行【076】勾记（全 delta 冻结于 reviewed commit）；本仓无 docs/specs/
  （072/074 实证沿用），账本无 P076 ✓（归 merge） |
  acceptance_results: AC-01 **fail**（F-1/F-2，见下） | AC-02 **pass**
  （三件 ext 导出面 grep=分类表对应且旧名仅存于头注（G-5 可执行残留
  零）；模块 fn 3+5+2... 实测 .at 顶层 fn=1+5+4；部署 SFC 内联发射实证
  ×3（with_search_display/async 闭包 await search_pages/:icon="Clock"
  双分支）；gate 双臂 fresh 复跑绿 11 真单元） | AC-03 **pass**（units.mjs
  12 条目=11 真+1 missing（仅 editor_tab），command_palette 无 missing ✓；
  基线 11 张 git ls-files 在库含 3 新增；README F-6/072 台账转正注记在） |
  AC-04 **pass**（全套件重放：front pnpm build 绿 9.61s + stub-sync ok +
  gen typecheck 绿 + e2e **24/24** @26.4s（端口 sed 14200 复跑后还原
  diff 零）+ vm-smoke 双模 PASS + gallery gate 双臂绿基线零漂移） | AC-05
  **partial**（SD-01 bullet 计数复核准确（11 单元/11 基线实测相符）+
  inventory 三行勾记 ✓；账本 P076-x 归 merge 未落=预期） |
  findings: F-1（AC-01/T-00，severity=L）——§5.4 拆分计数错："sink 12 +
  拆沉 1 + 必留 9" 应为 **sink 11 + 拆沉 1 + 必留 10**（sink 行枚举
  2+5+4=11；必留括注自和 4+2+4=10 与"9"自相矛盾；总数 22 不变恰掩
  盖）；计划 §8 T-00 记录同源行同错。代码零影响，纯文档精度。F-2
  （AC-01/T-00，severity=L）——§5.1 分类表缺 errorMessage 桥行（T-02
  执行期新增 strict unknown-catch 桥：ext/.at 头注+T-02 证据在案，但
  分类表本体无行——作业标准续册应自含完整逐 fn 裁定） |
  evidence: 本记录命令重放（build/e2e/vm-smoke/gate/stub-sync/gen
  typecheck 输出）+ ext/SFC grep 工件 + units/baselines/§8.6 计数实测；
  独立性声明：实现会话内复审，全部证据自工件与命令重放重构，未采信
  执行期摘要 | next: work（F-1/F-2 文档级修复：§5.4 计数行 + §5.1 补
  errorMessage 行 + 计划 T-00 同源行；完成后重审 AC-01）`。
- 2026-09-19 draft handoff：`stage: new | plan_id: PLAN-076 | plan_revision: 1 |
  outcome: pass（起草完成；执行未授权） | next: review → work`。
- 2026-09-19 work：`stage: work | plan_id: PLAN-076 | plan_revision: 1 |
  outcome: pass | code_commit: db40275（plan-076-dev @down-076/auto-down，
  base a615d69；T-00 4f29b97→T-01 4544037→T-02 f5bd059→T-03 1d0c924→
  T-04 db40275；依赖兄弟 down-076/auto-lang @58f2af216 [分支 plan-076-dev，
  编译器补丁 ×1：api walker Closure/Lambda 臂 + 闭包 async 前缀，built exe
  v0.4.2-1281-gb4b04c5cd-dirty]） |
  task_ids: T-00..T-04 全勾（current_step 5/5） |
  evidence: gallery gate 双臂全绿 11 真单元（vue 11 测 + vm 全断言；
  missing 汇总仅 editor_tab RC-E 续任）；基线 11 张在库（新增 3，旧 8
  零漂移，fresh 复跑无 update 复核）；AC-01 分类表=074-sink-mode §5
  （22 逻辑 fn 勘正：sink 12+拆沉 1+必留 9；P-7/P-8 探针结论 §5.0）；
  AC-02 三件 ext 薄化（部署 SFC 内联发射实证；G-5 旧名零残留）；AC-03
  command_palette 转正（units.mjs missing 退场 + README F-6/072 台账
  注记）；AC-04 回归全绿（front pnpm build 13.8s + e2e 24/24 @28.0s +
  vm-smoke 双模 PASS）；AC-05 账面（SD-01 §8.6 bullet + inventory 三行
  勾记；账本 P076-x 归 merge） |
  blockers: 无 | next: review`。
  执行注记：①**编译器补丁（auto-lang plan-076-dev 58f2af216，待其自身
  review 后 fold-back）**：on-handler 闭包体内契约调用的 import 注册
  （walker 无 Closure/Lambda 臂）+ await 落非 async 闭包（TS1308）——
  search_panel debounce 闭包首件实证（on 直调绿/闭包嵌套红对照，074
  899aa2e9c watch 臂同款第四件）；旧版编译器（≤1198）跑本批 search_panel
  必现 TS2304/TS1308，review 复跑须用兄弟补丁版 exe。②**G-1 参数域增证**
  （T-01：fn 参数名与 model 字段同名同触 state-ref 误改写，vue-tsc 因
  any 静默——G-1 措辞已更新"参数与局部同禁"）。③**icon 组件值裁定 B**
  （T-03：sunk 行不携带 icon，view 双分支 `:icon="item.icon"`/`:icon=".Clock"`
  注入——发射实证；T-00 表 A/B 预案之 B 落地）。④**gallery fill 门新增**
  （units.spec 键入阶段——检索/导航族 query 输入面，本批三单元均用）。
  ⑤App.vue menubar 按钮开标签胶水残留修复（073/074 merge 遗留：8 个
  data-unit-tab 仅 7 个 button 开标签；gate 深链不走 tab 条故未红；本批
  改 App.vue 顺手修复，2% 截图容差内旧基线零漂移）。⑥gen 再生成流程
  落 gen-support.sh（gap-32 src/src 镜像 + G-7 支持件 + stub 双位部署
  脚本化）。⑦vue 臂 fill/合成事件驱动形态：Ctrl+P 合成 KeyboardEvent
  + window CustomEvent 'jade-open-quick-switcher'（热键等价，074
  outline 显式 parse 播种同族手法）。

### 环境与偏差记录（work 执行期）

- worktree 前置（073/074 同款）：gallery/front pnpm 独立安装；engine
  dist 复制自 down-075（dist 戳 49a4c59f == 本 worktree src hash，
  freshness 绿；主检出 dist 自身已 stale——075 会话构建版为最新有效源）；
  engine 自身 node_modules 补装（front build 编译 engine src 需其依赖）；
  back exe + tmp/wiki-demo fixture 主检出复制。
- e2e 端口：FRONTEND_PORT 13100 落 Windows 排除段（13086-13185 当日
  实测在册），本地 sed 14200 跑测后还原，未入库（git diff 零）。
- gen 树全新（worktree 无历史 gen）：gen-support.sh 首跑补齐 stub 双位/
  镜像/类型声明/G-7 两件；`auto build` 再生成会重写 gen（镜像随脚本重刷）。
- 探针工件 `front/tmp/p076-filterprobe/`（T-00）：双轨绿后保留至 review
  复核（074 惯例 build 双轨绿后即弃——本批保留供 review 重放，review 后
  随 merge 清理；worktree 树净不受影响——tmp/ gitignored）。
- 主检出 auto-lang 有他 session 代码 WIP（657-bp 计划 + examples/
  rust-workspace 两文件，PLAN-657 在飞）——本批不改 auto-lang 主检出，
  兄弟 detached→plan-076-dev 分支作业，无交集。
- ext-registry.json（PLAN-064 台账）三文件行数/条目随本批漂移——批次
  裁定以模式文档 §5 为准（074 同款 info 级，registry counts 刷新归下次
  梳理）。
- master 无漂移（执行期 base a615d69 未前移；075 并行计划落 auto-lang
  侧+jade 账面，无共享代码文件面——075 worktree 仍在飞，merge 期如有
  并集冲突面预期：074-sink-mode.md（075 若同扩）与 gallery README）。

## 10. 待澄清事项

| Q | 事项 | 影响 | owner/下一步 |
| --- | --- | --- | --- |
| Q-1 | VM filter 链 CJK 语义（lowercase/includes/trim 字节-字符分歧是否及于过滤域——P-6 实证的是 find/slice/char_at/length 四混用） | T-01..T-03 twin 断言域 + sink 后 VM 可达性口径 | **已答（T-00 探针）**：P-7 双轨一致——分歧专属索引算术不及于过滤域（VM 引擎 str 臂 Rust to_lowercase/UTF-8 contains 自同步等价 JS includes/Unicode trim 实勘 + p076-filterprobe 双轨 8 断言绿）；twin 断言域裁定直接用 CJK fixture，三单元 twin 均以 CJK 查询实证 |
| Q-2 | collectFiles 模块 fn 自递归在 src/front 通道的发射（P-2 实证的是 find+递归**调用**形态，模块 fn 顶层自递归未单独实证） | T-01 | **已答（T-00+T-01）**：P-8 root 通道双轨实证 + T-01 兄弟生成臂（G-6 折回版 1198）模块 fn 自递归内联发射实证（部署 SFC function 声明）——无缺口，无需补丁 |
| Q-3 | 06-palette e2e 对下沉后行为面的覆盖是否需补断言（热键触发→过滤→选中→执行链路是否已有端到端断言） | T-04 回归口径 | **已答（T-00 盘点）**：四测已覆盖热键开合/输入过滤/Enter 执行 command 分支/switcher file 点击开页；缺口=ArrowUp/Down 选中移动无 e2e——gallery twin 以 qs_next/cp_next 按钮序列断言 selected 环绕补此面（执行注记：e2e 增补非本批 gate，防范围膨胀） |
| Q-4（执行期新增） | 编译器闭包域缺口（on-handler 内闭包体契约调用 import 注册 + async 闭包前缀） | T-02 主线 | **已答（T-02 补丁）**：auto-lang plan-076-dev 58f2af216（walker Closure/Lambda 臂 + ts_adapter Closure async 检测）——074 惯例待折回；review 复跑须用兄弟补丁版 exe |
## 11. merge 收据（PLAN-076:r1）

- **prepared ✅**：reviewed 基线 bf40549（review#2 pass，F-1/F-2 修复后
  AC-01 重审）；账本投影落 worktree 交付提交 ecab008（P072-1 原地更新：
  8→11 单元双绿/基线 11 张/转正注记/批次 2 bullet 同源/related +PLAN-076
  + P076-1 新增：reviews 收据含归档路径；243→244 条目，JSON round-trip
  校验；原格式最小 diff +16/-3——首投 indent=2 全文件重排作废重做）。
  master 无漂移（=base a615d69），无需 reconcile。
- **landed ✅**：master merge commit `0332b43`（--no-ff）；ancestry 断言
  ecab008 ∈ master；主检出落地前 stash 保全 075 会话共享簿记（072 台账
  L2 注记），落地后弹回零冲突（union 语义自然成立——注记落不同节）。
  落地态集成验证：主检出 gallery gate 双臂绿（missing 仅 editor_tab）。
- **ledger_refreshed ✅**：主检出 `.autoos/specs.json` 回读——total 244、
  P076-1 单条在 reviews（file=archived 路径、related=[PLAN-076]）、
  P072-1 related=[072,073,074,076] 且批次 2 内容在案、无重复 id。
- **fold-back ✅（auto-lang）**：plan-076-dev 58f2af216 并入 auto-lang
  master 折叠合并 `ea3268d1e`（--no-ff；主检出他 session WIP[PLAN-657/
  658 类] 无文件面交集）；主检出 exe 重建 v0.4.2-1298（折叠后 master
  又并发前移：ff4785531[PLAN-642 账本补记]+97a7ba755[PLAN-075 merge，
  他 session]——本折回均在祖先链）；折叠版 exe 跑 jade gallery gate
  双臂绿（语义验证）。
- **archived ✅**：本文件移入 `docs/plans/archived/076-rcd-search-nav-batch2.md`
  + status: archived + completion_kind: delivered。
- **cleaned ✅**：见下补记。
