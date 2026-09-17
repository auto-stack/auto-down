# PLAN-070 T-00 决策工件：消费面矩阵与裁定

> 2026-09-18，PLAN-070 执行会话产出。证据基于三仓实勘（sha256/diff/grep，
> 命令与结果随行）。PLAN-639 状态：reviewed、merge 进行中；blueprints/ 包库
> 结构已见 auto-lang master（README + data-display/editor/form/navigation +
> pac.at）。标 **[P]** 的裁定为 provisional——639 merge 收口后复核一次。

## 1. 三消费面清单（实勘 2026-09-18）

**jade web** `jade-garden/front/auto/src/front/`（a2ts→Vue 生成链 + facade）：
41 个 .at——app.at、app_shell.at、tab_strip.at、status_bar.at、left/right_sidebar.at、
main_area.at、ribbon.at、fileTree_store.at、file_tree.at、file_tree_node.at、
tabs_store.at、theme_store.at、workspace_store.at、sidebar_store.at、
graph_*（5）、*_panel（backlinks/outline/agenda/search/recent/properties/unlinked/outgoing）、
command_palette.at、quick_switcher.at、theme_popover.at、blocks_store.at、
plugins_store.at、recentFiles_store.at、whiteboard_page.at、graph_page.at、
create_page_prompt.at、flashcard_modal.at、workspace_opener.at、utils/。
**actions/menubar/toolbar：零命中**（grep 实证，web 无命令系统）。

**jade desktop** `jade-garden/front/desktop/src/front/`：app.at（067 起 actions{}
+menubar/toolbar）、tabs_store.at、status_bar.at、components/{filetree,package,
tree_icon,tree_util}.at（无 treeview）。

**041-auto-edit** `auto-lang/examples/ui/041-auto-edit/src/front/`：app.at
（actions{} 17 action @ app.at:38）、editor_store.at（tab 状态内嵌于此）、
status_bar.at、console_panel.at、ctx_menu.at、components/{filetree,package,
tree_icon,tree_util,treeview}.at。

## 2. sha256 对拍（8 位缩写）

| 文件 | jade desktop | widgets-gallery | 041 |
| --- | --- | --- | --- |
| filetree.at | ba5de834 | ba5de834 | 27e88afd（漂移：chevron） |
| tree_icon.at | 28f42744 | 28f42744 | 042afa27（漂移） |
| tree_util.at | 4f4ba602 | 4f4ba602 | 4f4ba602（三方同） |
| package.at | b6ff9789 | **93543315（gallery 已漂移）** | b6ff9789 |
| treeview.at | —（无此件） | — | d1571ef0（041 独有） |

tabs_store 孪生：web 287fdc55 / desktop 2bd6cfe0（diff 68 行，定性见 §4）。
status_bar：web 有 status_bar.at（a2ts 面）/ desktop 99c81736 / 041 7bae0381（互异）。
ctx_menu：仅 041 有（aa452216）。

**谱系修正**（相对起草假设）：filetree 是**三谱系**——A：VM 自包含四件
（desktop≅gallery，但 gallery 的 package.at 已独走）；B：041 适配五件（多
treeview）；C：web 独立实现（fileTree_store + file_tree + file_tree_node，
a2ts 面）。canonical=jade desktop 仅对 filetree/tree_icon/tree_util 成立；
**package.at 版本裁定（b6ff9789 vs 93543315）与 treeview 归属是 T-01 前置小裁定**。

## 3. 消费面 × 收敛动作矩阵

| 共享件 | jade web | jade desktop | 041 | 收敛动作 | 落点 |
| --- | --- | --- | --- | --- | --- |
| filetree 家族 | 谱系 C（源头换 import+数据注入面改造） | 谱系 A 四件→删 | 谱系 B 五件→删（chevron 参数化、treeview 并入裁定） | bp `navigation/filetree` | auto-lang blueprints |
| tabs_store | 287fdc55（留任单源基） | 2bd6cfe0→删 | **不参与**（tab 状态内嵌 editor_store，业务形态不同，硬套失真） | 平台服务单源（非 bp） | jade web 源上提共享 |
| status_bar | status_bar.at→改造消费 | 99c81736→删 | 7bae0381→删 | bp（三版互异，需先做特性并集/差集裁定） | auto-lang blueprints |
| ctx_menu | —（暂不消费） | —（暂不消费） | aa452216→移出 | bp `overlay/ctx-menu` | auto-lang blueprints |
| actions/menubar/toolbar | **接入**（本次收敛主目标之一） | 已有（067） | 已有（范本） | **注册表不 bp 化**（应用组装层结构）；只要求 DSL/发射双轨一致 + web 接入 | DSL 能力（639 T-05） |

## 4. tabs_store 孪生 delta 定性（加速 T-02）

desktop 头注自认三处 delta（逐字共享 + VM 面适配）：

| # | delta | 定性 | 单源策略 |
| --- | --- | --- | --- |
| 1 | Close 用显式索引狩猎替代 findIndex | **疑似过时规避**（头注自记 splice 已由 PLAN-622 修复，关闭=真移除） | T-02 复验 findIndex 在 VM 现状；可修则共享源回归 findIndex |
| 2 | `&&/||` 链改显式空值守卫 | **真实语言语义差异**（VM 上 &&/|| 为布尔逻辑，无 JS 值传播） | 共享源直接采用显式守卫形态（两轨公共子集，web 侧语义等价） |
| 3 | active_path `str+""` 哨兵 vs web `?str` | **VM 缺陷规避**（?str 跨状态对象读崩 Invalid object ID，PLAN-624 登记） | T-02 验证 ?str 现状；未修则共享源取哨兵形态 |

结论：**无一处需要 bp 参数/变体**——三处都是双轨公共子集问题，单源=统一到
兼容形态。web 版为语义基，吸收 delta 2/3 的兼容形态后即为单源候选。

## 5. 裁定

- **R-1 [P] tab 分层**：tabs_store=平台服务单源（jade web/desktop 两面收敛，
  041 不参与）；tab 条 UI 三处形态互异（web tab_strip.at / desktop 内联 /
  041 内联），**不 bp 化、各应用自持**。
- **R-2 [P] jade web actions 接入形态**：优先 `.at` 直声明（app.at 增 actions{}，
  与 desktop/041 单源对齐），facade 仅做宿主接线（快捷键/command 面挂载）；
  若 639 发射面仅支持组件级配置，则 facade 转接兜底。639 merge 落地后依实际
  发射面定稿。
- **R-3 宿主落点（转正）**：共享 bp 包 = auto-lang `blueprints/`（master 已见
  包库结构与解析序）；widgets-gallery 保持 widget 层身份不变，其副本迁移登记
  DEBTS 后续。
- **R-4 actions 注册表不 bp 化**：actions{} 是应用组装层 DSL 结构而非可复用
  组件；070 T-03 的"actions 骨架"收敛语义收窄为"menubar/toolbar 视图件评估 +
  web 接入"，不改变 AC-03。
- **R-5 filetree 收敛前置小裁定（T-01 内完成）**：package.at 两版择一
  （倾向 b6ff9789，jade/041 双消费方在用）；treeview.at 并入 bp 或留 041
  应用侧（倾向并入，作可选件）。

## 6. 对计划的影响

- T-01 工作量上修：谱系 C 的数据注入面改造（fileTree_store 的 fs 读取按
  639 datasource 契约注入 bp）是 web 侧主要工作，非"源头换行"。
- T-02 工作量下修：三 delta 均为公共子集问题，无需变体机制；但 add 两项
  复验（findIndex/？str 的 VM 现状）。
- T-03 范围澄清（R-4）：menubar/toolbar 视图件评估 + web 接入。
- 启动条件不变：T-01+ 等 639 merge 收口（T-04/T-05 落 master 可见）。
