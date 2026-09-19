# PLAN-072 T-00 三桶盘点：jade-garden 双端 .at widget 全量清单

> 2026-09-18，worktree `down-072/auto-down` @ base `fae21d9`（plan-071 cleaned
> 后 master）；依赖 auto-lang 兄弟 @ `fc8264f4a`。枚举对象：`jade-garden/
> front/auto/src/front/*.at`（web 轨）+ `jade-garden/front/desktop/src/front/
> *.at`（VM 轨）。机制依据：auto-lang `docs/design/30-autoui-parity-three-layer.md`
> §3/§4。本文档 = L1 修复滚动计划的单元台账（SD-01 指针落 ARCHITECTURE §8.6）。

## 1. 枚举与交叉校验（防漏）

| 校验项 | 命令/来源 | 结果 |
| --- | --- | --- |
| web .at 全量 | `ls auto/src/front/*.at` | **38** 件 = 29 widget + 8 store + app.at（占位根，never deployed） |
| web widget 声明 | `grep -c "^widget "` 逐文件 | 29 文件各 1 个 widget 声明 ✅ |
| 构建产物对拍 | `ls front/src/components/*.vue` | **29** SFC ↔ 29 .at widget **一一对应** ✅（Agenda…WorkspaceOpener，无多余无缺失） |
| desktop .at | `ls desktop/src/front/` | 3 件：app.at（543L 壳+六流内联）、status_bar.at（StatusBar 值 props 版）、tabs_store.at（web 单源部署副本，`tabs-store-sync --check` 门） |
| store 层 | 8 store（blocks/fileTree/graph/recentFiles/sidebar/tabs/theme/workspace） | 数据层支撑件，非 L1 gate 单元（§5） |
| 第三方边界 | ui/（shadcn 手写层）、cytoscape、@autodown/engine | 机制 §4：内核不比，宿主面才入 L1（§3 RC-F/RC-E 注记） |
| 前勘对拍 | PLAN-070 T-00 矩阵"41 个 .at" | 差 3 = whiteboard_page.at + plugins_store.at（PLAN-071 已删）+ 计数口径；本表以当前 master 实勘为准 ✅ |

## 2. 桶① 双端都有、可能有差异（L1 修复对象）——5 面

> 判定：双端各有实现面（组件或内联视图），存在可对照结构。desktop 多为
> **重表达形态**（041 适配/内联投影），vue 轨为 a2ts 生成件——这正是 parity
> 差异本体。修复循环顺序依 §5 机制：配方先行 → 双端 gate → 修复 → 锁基线。

| # | 单元面 | web 轨 | VM 轨 | 已知差异/债 | 预估修复类 |
| --- | --- | --- | --- | --- | --- |
| ①-1 | status_bar | status_bar.at→StatusBar.vue（96L，ext:3） | desktop status_bar.at（值 props 版，041 形态适配；**组件子树对 MCP 快照不可见**，断言走 autoui_state） | 同名不同物：web ext-composable 耦合 vs VM 值 props；11px/zinc token 密集 | RC-A 配方先行 + RC-B |
| ①-2 | tab 条 | tab_strip.at→TabStrip.vue（147L，ext:3；lucide dyn、daily-note ext） | app.at 内联 tabs 区（tabs_store facade 投影镜像 active_*） | 070 R-1：各应用自持不 bp 化；VM 语义债在案（P622 splice 已修、P624 ?str→哨兵规避） | RC-B + VM 语言语义复核 |
| ①-3 | menubar | menu_bar.at（27L）+ app-config.at bp-edit 合成 MenuBar.vue（AppShell.vue:56 挂载） | app.at actions{} + menubar 配置合成（067） | ui_config 单源已成立（070 T-06/24-menubar e2e）；对照点=渲染结构 | RC-B |
| ①-4 | toolbar | app-config.at `toolbar{}` 声明在案；**front/src/components 无 Toolbar.vue**——vue 渲染落点待复核 | app.at toolbar 配置合成（041 同款） | web 声明面有、渲染件缺席（近似反向差）；T-04 回填复核结论。**【073 T-00 已复核】落点=MenuBar.vue 内（menu_bar.at 第二 view 块，ui_config 合成）——无缺件，非反向差；详见 `073-literal-style-inventory.md` §1** | RC-B（落点复核后定）→【073】已锁（menubar+toolbar 单元） |
| ①-5 | filetree 行家族 | file_tree.at（81L）+ file_tree_node.at（192L）+ fileTree_store（104L，api:1）——谱系 C（070 Q-7 裁定独立，DEBTS 在案） | app.at 内联 ft_rows（`flatten_tree` 纯函数 + bps.navigation.filetree tree_icon/tree_util 消费，P614/P618 纪律） | bp spec gotcha#2 在案；行形态/icon/展开交互对照 | RC-B |

## 3. 桶② 只有 vue 有（VM 缺件待办）——24 件

> 机制 §3：进"VM 实现待办"（lighthouse 流素材）。gallery 对本桶挂
> **缺件红占位单元**（gate 检测 VM 臂缺席=红，即缺件即红语义）。
> 注：desktop 六流（搜索/反链出链/闪卡/图谱/导入导出）有**流粒度内联等价物**
> （app.at 内联视图 + vm-smoke 六流臂），但非组件级——组件级 VM 臂缺席成立。

### RC-D VM 缺件（组件渲染臂待实现）——16 件

| 件 | 行数 | 耦合事实（ext=TS ext 通道引用数） | 流粒度等价物 |
| --- | --- | --- | --- |
| agenda_panel.at | 131 | ext:3 | desktop 闪卡流内联（LoadCards/Grade） |
| backlinks_panel.at | 117 | ext:4（useTabsStore + fetchBacklinksSafe） | desktop 反链流内联（get_backlinks）——【074】已下沉 .at（模块 fn+watch 编排+契约通道），ext 薄化，VM twin 双绿 |
| outgoing_links_panel.at | 102 | ext:3 | desktop 出链流内联（get_outlinks）——【074】已下沉 .at 同款，VM twin 双绿 |
| outline_panel.at | 71 | ext:3（useBlocksStore/useTabsStore）；**F-6 缺件即红实证单元（T-03：VM 直挂=ext no-op stub 静默降级）+ gallery 样板（twin 双绿）**——【074】outline_headings 已下沉 .at（正式化） | — |
| unlinked_references_panel.at | 97 | ext:3——【074】已下沉 .at（高亮 regex 留 ext 桥），VM twin 双绿 | — |
| properties_panel.at | 267 | ext:3 | — |
| recent_files_panel.at | 113 | ext:3 | — |
| search_panel.at | 177 | ext:3 | desktop 搜索流内联（search_pages，.type 撞名→search_pages 规避在案）——【076】已下沉 .at（debounce 闭包体 try/catch/finally + search_pages 契约通道 + with_search_display 行构造），ext 薄化，VM twin 双绿 |
| command_palette.at | 184 | ext:4——【076】已下沉 .at（过滤链/构造/模运算 + runPaletteItem 拆沉）+ 缺件红占位**转正**（VM twin 双绿，负例由 editor_tab 续任） | — |
| quick_switcher.at | 165 | ext:3——【076】已下沉 .at（collect_files 递归 / filter_files CJK 链 / 模运算），ext 薄化至热键/焦点，VM twin 双绿 | — |
| theme_popover.at | 120 | ext:3 | — |
| create_page_prompt.at | 92 | ext:2 | — |
| workspace_opener.at | 133 | ext:3 | desktop OpenWs 流（showDirectoryPicker VM 通道=目录选择器裁定待办） |
| flashcard_modal.at | 222 | ext:2 | desktop 闪卡流内联 |
| graph_sidebar.at | 162 | ext:3 | desktop 图谱流内联（get_graph） |
| graph_controls.at | 216 | ext:4（+styleblock 伴生） | — |

### 其他修复类（桶②内细分）——8 件

| 件 | 行数 | 修复类 | 说明 |
| --- | --- | --- | --- |
| app_shell.at | 99 | RC-C 组装级 | 壳组装 → L3 边界（vm-smoke 双模 + 全量 playwright 已盖流）；L1 挂占位 |
| main_area.at | 98 | RC-C 组装级 | 同上（编辑区装配，TabStrip 挂载点） |
| left_sidebar.at | 53 | RC-C 组装级 | 同上 |
| right_sidebar.at | 53 | RC-C 组装级 | 同上 |
| ribbon.at | 118 | RC-C 组装级 | 壳面家具（左 activity bar，lucide 图标轨 + 主题触发）；desktop 无对应面（desktop toolbar ≠ ribbon——同名不同物注记） |
| graph_page.at | 202 | RC-C 组装级 | 同上（图谱页装配） |
| editor_tab.at | 211 | RC-E 引擎对拍 | **Q-2 裁定（默认）**：AutoDownEditor 引擎对拍（autodown-engine TS ↔ autodown-core Rust）归 autodown lighthouse 流；gallery 只挂状态占位单元。**PLAN-651 状态更新（2026-09-18）**：对拍 gate 已常驻在库——auto-lang `t651_*` 测试组（`cargo nextest run -p auto-lang --lib --features autodown,code-editor t651`，9/9 绿：T-01 五格闭合 + T-02 三格闭合 + closure corpus 幂等锚）；三态支持矩阵在案（auto-lang `docs/plans/attachments/651-matrix.md`，17 kind × 三态 × 双实现逐格）；gallery 已登记 `editor_tab` 状态占位单元（units.mjs，missing=expected-red 可见化，不设 gate） |
| graph_view.at | 141 | RC-F 第三方边界 | cytoscape 内核不比；图谱视图面（宿主面）入 L1，VM 侧实现形态（native/canvas）单列待办 |

## 4. 桶③ 只有 vm 有（反向补 vue）——**空桶（0 件）**

证据：desktop widget 级 .at 仅 3 件——status_bar.at（web 有对应件）、app.at
（壳，web 有 app_shell 对应）、tabs_store.at（web 同名单源副本）。desktop
menubar/toolbar/actions 已 ui_config 单源（070 T-06）；六流内联视图均有 web
流/组件等价物。**无 web 缺席的 vm 独有件**；唯一反向差近似 = ①-4 toolbar 的
web 渲染件落点复核（已在桶①注记，不构成独立反向补 vue 件）。

## 5. 支撑件（非 L1 gate 单元，登记备查）

| 层 | 清单 | gallery 关系 |
| --- | --- | --- |
| store（8） | blocks/fileTree/graph/recentFiles/sidebar/tabs/theme/workspace_store.at | 单元页 fixture 注入的替代对象；tabs_store 为 web/desktop 单源（sync 门） |
| ext（37） | 29 widget ext + 8 store ext（desktop README §2 机扫） | **TS 不入 VM**——VM 臂不可达通道；L1 修复方向=纯逻辑下沉 .at（唯一源纪律，机制 §7） |
| api 契约 | back/auto/api.at + desktop/src/back/api.at 孪生 | `use back.api:` 通道；gallery 单元页用 fixture 替代（不 boot 后端） |
| ui_config | front/auto/app-config.at（bp-edit：5 action + menubar + toolbar） | ①-3/①-4 单源声明面 |
| shadcn ui 模块 | front/src/components/ui/（手写宿主层） | 机制 §4：宿主自备内核，不比 |
| styleblock | graph_controls.styleblock | graph_controls 伴生样式块，随件处置 |

## 6. 修复类汇总

| 类 | 定义 | 件数 |
| --- | --- | --- |
| RC-A | 配方先行：style recipe/token 化后再 gate（PLAN-607/635/637 机制） | 与 RC-B 叠加（status_bar 等 token 密集面） |
| RC-B | 结构对齐：双端都有，结构/类差修复后锁基线 | 桶① 5 面 |
| RC-C | 组装级：L3 边界（app 层既有基建盖），L1 挂占位 | 6 |
| RC-D | VM 缺件：渲染臂待实现（lighthouse 素材），gallery 挂缺件红占位 | 16 |
| RC-E | 引擎对拍：autodown lighthouse 流 | 1 |
| RC-F | 第三方边界：内核不比，宿主面单列 | 1 |

## 7. T-03 样板单元选点（T-04 回填：gate 结果已落）

| 类型 | 单元 | vue 臂（真件） | VM 臂（twin/投影） | gate 结果 |
| --- | --- | --- | --- | --- |
| 纯展示 | status_bar 面 | StatusBar.vue + facade 播种/footer 断言 | StatusBarPage 值 props 子件 + root 投影 | ✅ 双绿 |
| 列表/展示 | outline 行 | OutlinePanel.vue + 显式 parse 播种（F-5）列表路径解锁 | root 内联 dyn ul/li 行 | ✅ 双绿 |
| 交互 | tab strip 面 | TabStrip.vue + 点击切换断言（data-active-path 投影） | root 行按钮 + TsSwitch state/marker | ✅ 双绿 |
| 数据绑定 | backlinks 行 | BacklinksPanel.vue + shim 拉取渲染行 | root 行 + bl_count 投影 | ✅ 双绿 |
| 缺件即红 | command_palette（RC-D 占位） | — | **RED(expected)**：missing+理由必填，gate 汇总可见化 | ⚠ 预期红在册（**076 转正**：已于 PLAN-076 T-03 转正真单元双臂绿，负例样本由 editor_tab RC-E 状态占位续任） |

> gate 基线：e2e/baselines/*.png 4 张；VM 断言 13 项。执行：`node
> scripts/gate.mjs`（--update-snapshots 刷基线）。
>
> **Q-3 已答（T-01/T-02 实测）**：VM 臂单元粒度 = root 投影字段 + root
> 内联/twin 行（**子件子树对 MCP 快照不可见**，当前 master 复测成立——
> README F-1）；交互/数据断言经 root state 字段。整页单 boot + 按钮切
> 单元（配置化序列）。
>
> **缺件即红实证（README F-6）**：真件 VM 直挂（dep jadeauto 通道）=
> ext 全量 no-op stub **静默降级**（数据面空渲染，非崩溃）——红信号 =
> stub WARN + 投影空；`auto run` 的 dep 走编译器 pac.at 直读、不物化
> junction。

## 8. 裁定记录

| Q | 裁定 | 依据 |
| --- | --- | --- |
| Q-1 gallery 落点 | **jade 特有件在 jade 仓** `jade-garden/front/component-gallery/`（已按此落地）；跨 app 通用件 canonical 家仍为 auto-lang blueprints / widgets-gallery（auto-os），bp 已收敛件（filetree bp 家族）在 jade gallery 只 gate jade 消费侧，包级 gate 归 L2 | 计划 §9 Q-1 默认 + 机制 §8 |
| Q-2 editor gate 归属 | **引擎对拍归 autodown lighthouse 流**；gallery 挂状态占位（RC-E，编辑器单元入册不设 gate） | 计划 §9 Q-2 默认 + 机制 §4 |
| Q-3 单元粒度 | **已答（T-01/T-02 实测）**：VM 臂 = root 投影字段 + root 内联/twin 行（F-1 子件子树快照不可见）；整页单 boot + 配置化按钮序列切单元 | gallery README F-1..F-6 + units.mjs |

> **L2 注记（PLAN-075，2026-09-19）**：Q-1 裁定的"包级 gate 归 L2"已首证
> 落地——auto-lang `examples/bp-gate/`（蓝图级双端 gate：vue 臂沙箱构建+
> playwright 截图基线 × VM 臂 MCP boot 断言；首批三单元 = 075 两件骨架 bp
> + filetree 组合形态，复跑 exit 0）。判定记录与本批 9 单元台账见
> `075-bp-extraction-record.md`；①-5 filetree 行家族由此归位 bp 包级 gate
> （jade gallery 消费侧 gate 维持不变）。

## 9. 交叉校验命令记录

```sh
# 枚举（38 .at = 29 widget + 8 store + app.at）
ls jade-garden/front/auto/src/front/*.at | wc -l   # → 38
grep -c "^widget " jade-garden/front/auto/src/front/*.at
# 构建产物对拍（29 SFC 一一对应）
ls jade-garden/front/src/components/*.vue | wc -l  # → 29
# desktop 面
ls jade-garden/front/desktop/src/front/            # → app.at status_bar.at tabs_store.at
grep -n "actions\|menubar\|toolbar" jade-garden/front/desktop/src/front/app.at
# 耦合机扫（ext/api/第三方 per 件）
for f in auto/src/front/*.at; do ... ext/api/ui/3p 计数 ...; done   # 结果见 §2/§3 表
```
