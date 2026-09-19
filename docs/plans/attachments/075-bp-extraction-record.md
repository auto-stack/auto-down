# PLAN-075 T-00 判定记录：L2 蓝图抽取（首批 L1 基线存量 9 单元）+ 四项裁定

> 2026-09-19，主检出实勘（auto-down @a615d69 / auto-lang @3d0d633）。
> 机制依据：auto-lang design 30 §6（判定规则四通道：≥2 使用位抽 bp / 具名
> 跨 app 预期 / 同名不同物→骨架+slot / 不收敛登记）。判定对象 = 073 已锁
> 基线 5 面（072-inventory §2）+ 074 面板行族 4 件（074-sink-mode §1）。
> 本档 = AC-01 判定记录本体；SD-01 §8.6 bullet 指向此档。

## 1. 9 单元判定表

| # | 单元 | 使用位证据 | 判定（四通道之一） | 落点 |
| --- | --- | --- | --- | --- |
| U-1 | status_bar（①-1） | ①jade web `auto/src/front/status_bar.at`→StatusBar.vue（ext-composable 耦合，96L）②jade desktop `desktop/src/front/status_bar.at`（值 props 版，041 形态适配）③auto-lang `examples/ui/041-auto-edit/src/front/status_bar.at`——**3 使用位，三版同名不同物**（数据流 web store 绑定/desktop 值 props/041 静态适配互异） | **骨架 bp + 内容 slot**（§6 通道③：不硬抽全量 bp，骨架收敛、内容 slot 各持） | T-02 抽取 `layout/status-bar` |
| U-2 | tab 条（①-2） | jade web TabStrip.vue + desktop tabs_store facade 投影（单 app 双端，无第三 app 使用位） | **不收敛登记**（070 R-1 裁定：各应用自持不 bp 化；VM 语义债 P622/P624 在案） | §4 登记 |
| U-3 | menubar（①-3） | jade 双端经 ui_config 单源合成（070 T-06）；跨 app 通用物=命令面配置形态而非组件本体 | **不收敛登记**（ui_config 单源 app 特有——命令面与 app 配置单源耦合，抽 bp 即双源） | §4 登记 |
| U-4 | toolbar（①-4） | 落点=MenuBar.vue 第二 view 块（073 T-00 已复核，无独立件） | **不收敛登记**（同 U-3，ui_config 合成面；073 已锁双面结构基线） | §4 登记 |
| U-5 | filetree 行家族（①-5） | jade web 谱系（file_tree.at+file_tree_node.at+store）+ desktop app.at 内联 ft_rows（tree_util/tree_icon 消费）+ bp 包本体 | **已有 bp 家族归位**（`bps.navigation.filetree` 包在库，PLAN-070 建/645 组合形态恢复；web 谱系 Q-7=A 独立不收编，gotchas#2 维持） | 包级 gate 归 L2=T-03 首证对象 |
| U-6 | backlinks（074-1） | jade web BacklinksPanel（下沉 .at 模块 fn+watch 编排）+ desktop 反链流内联 | **row-list 骨架使用位**（"数据拉取→行列表渲染"公共形状） | T-02 抽取 `data-display/row-list` |
| U-7 | outgoing_links（074-2） | jade web OutgoingLinksPanel（同款下沉）+ desktop 出链流内联 | 同 U-6 | 同上 |
| U-8 | outline（074-3） | jade web OutlinePanel（outline_headings 已下沉）+ gallery twin | 同 U-6 | 同上 |
| U-9 | unlinked_references（074-4） | jade web UnlinkedReferencesPanel（高亮 regex 留 ext 桥） | 同 U-6 | 同上 |

**row-list 使用位计数**：U-6..U-9 四件 + 076 检索/导航族三件（search_panel/
quick_switcher/command_palette 同形——Q-4 裁定按设计形状登记为追加使用位，
076 落地后自然补强，不构成本计划依赖）= **7 使用位**，远超 ≥2 门槛。

## 2. 裁定 R-A（Q-1）：骨架 bp kind 归属与命名

**定案：`layout/status-bar` + `data-display/row-list`（= 计划暂名默认）。**

依据：contract.md Q5 kind 词表（PLAN-640 对齐磁盘现实）=
form/navigation/dashboard/data-display/feedback/editor/**layout**/composite——
两 kind 均在词表内，**无需扩表**；`layout` 磁盘尚无包目录（首包即建目录），
bps-gallery kindOrder 偏好序已含 layout（`examples/bps-gallery/src/bps.ts:75`
实勘），无 gallery 同步动作。kind 治理规则（新增 kind 须更新词表+kindOrder）
不触发——两 kind 皆词表内存量。

## 3. 裁定 R-B（Q-2）：gate harness 落点与形态

**定案：auto-lang `examples/bp-gate/` 独立最小双端 harness（= 计划默认），
bps-gallery 浏览 UI 不动。**

- **落点**：跨 app 通用件 canonical 家 = auto-lang（072 Q-1 裁定）；gate 是
  自动化构建渲染断言基建，不是 dev-time live-render 接线（后者 UI 增强另议）。
- **vue 臂形态**：harness host 工程（pac.at `dep bps` + 单元页 app.at）提交
  在库；gate 脚本把 host+blueprints **复制到仓库外临时沙箱**后 `auto build`、
  serve dist、playwright 断言+截图基线（基线文件在库 `e2e/baselines/`）。
- **VM 臂形态**：沙箱内 `auto run -r vm` boot host 工程（pac.at dep 直读、
  不物化 junction——072-inventory §7 实测口径），MCP autoui_state/snapshot
  断言（vm-probe.mjs 模式，jade gallery 同款）。

**沙箱裁定的硬依据（2026-09-19 探针实证）**：`auto build --gen-only` 在
`dep bps { path: ... }` 工程内**物化 `deps/bps` junction**（pac.rs
materialize_local_dep Mode B：symlink_dir/mklink /J；探针
`/tmp/bp075-probe/x/y/p047` 复制件实跑，`dir /s /b /a:l` 捕获
`deps\bps` reparse point，构建本身 EXIT=0/22 组件绿）。junction 落 worktree
内 = Plan 529 红线（wt-guard 拦截移除、`git worktree remove` 穿透删除）——
**任何 `auto build` 类验证一律沙箱形态**，worktree 内只跑 vite/playwright/
cargo/pnpm（node_modules 实勘无 reparse point，jade gallery 先例 wt-guard
clean）。046/047 历史构建的 worktree 内 junction 属 645 期未成文纪律，本裁定
后 KNOWN-DEBT 注记（见 §5）。

## 4. 裁定 R-C（Q-3）：filetree 组合形态 VM 臂断言形态

**定案：消费方内联 twin（= 计划默认，gotchas#1 right 形态）。**

依据：组合件直挂 = 子件子树对 MCP 快照不可见（F-1，041 README「vm 组件
边界」②）且组件行 press 静默崩溃（P614-C1/P618-D4）——VM 臂单元页在 root
视图**内联树行**（`for r in flatten_tree(...)` 派生循环，desktop app.at /
jade gallery filetree twin 同款），直用包内支撑件 tree_util/tree_icon；
组合形态 FileTree 仍挂载（证明 VM 轨可加载消费），断言面走内联 twin 行 +
root 投影字段。骨架 bp（fn-free 纯布局）VM 臂同律：真件挂载 + twin/投影
断言。

## 5. 裁定 R-D（T-01 重定范围）：L2 第零任务现状勘定

**发现（起草证据陈旧，2026-09-19 实勘定案）**：auto-lang **PLAN-645
（toolchain-parity-debt）已于 2026-09-18 17:41 落地 master**（ed43e9e8e，
早于本计划 2026-09-19 起草实勘时点），覆盖：

1. **DEBTS 070 第一行**（registry 扫描根）：`with_defaults` 三级运行时解析
   （AUTO_BLUEPRINTS_ROOT env → cwd 向上找 blueprints/ → 编译期兜底）——已闭。
2. **DEBTS 070 第二行**（bps 扫描跨文件 fn 转译）：auto-man Plan 475 dep
   通道挂 `collect_use_module_fns` 池 + Phase 1c 增量腿同律 + filetree
   reference/default.at 组合形态恢复 + 047-bp-compose 回归夹具 +
   plan645_bp_tests 正/负测试——**已闭**。075 起草时 DEBTS.md 070 两行仍 🟡
   是**陈旧账面**（645 T-04 的"DEBTS 两行销号"只落了 KNOWN-DEBT 核销，
   DEBTS.md 本体漏划——本记录即其误导后果的实证）。

**T-01 重定（对计划 §5 第零任务修点设计的替换）**：

| 原设计 | 实勘后执行面 |
| --- | --- |
| vue.rs bps 扫描臂挂 plan522 式 fn 转译（跨文件） | ~~待做~~ 645 已落——本计划**验证**：沙箱 047 构建 + plan645 测试绿（见 T-01 证据） |
| components//bps 通道同文件模块 fn 池（G-6 未修面） | **仍开放，本计划收口**：auto-man vue.rs 两臂（components//bps 臂 :3122 段 + dep 臂 :3274 段）补 `same_file_module_fns` 重挂（074 补丁 src/front 兄弟臂 :3213 同款逻辑移植；645 只补了两臂的跨文件池，同文件池两臂均缺） |
| 行为锚=046 断裂复现转绿 | 645 已闭——本计划行为锚改为 **048 夹具**（`examples/capability-tests/048-bp-module-fn`：fixture 本地 mini bp 包 + 消费工程，首个同文件模块 fn 真实消费方，G-6"无消费方"注记就此销号） |
| SD-02 = DEBTS 070 第二行销账 | **维持**（语义重定：划销归属双记——主体工作 645 落地、G-6 尾面 075 收口、DEBTS.md 本体划销补记 075 执行）；**顺带第一行划销**（645 T-01 已闭的事实修正，防陈账再误导后续计划） |

## 6. Q-4 处理

076 三件（检索/导航族）按**设计形状**登记为 row-list 追加使用位（§1 计 7
位），076 落地后自然补强；不构成本计划依赖、不阻塞 AC-01。

## 7. 交叉校验命令记录

```sh
# 使用位实勘（jade 双端 + 041）
ls jade-garden/front/auto/src/front/status_bar.at            # ①web
ls jade-garden/front/desktop/src/front/status_bar.at         # ②desktop
ls auto-lang examples/ui/041-auto-edit/src/front/status_bar.at  # ③041
# kind 词表与 kindOrder
grep -n "kind 词表" auto-lang docs/specs/blueprint/contract.md   # Q5 行
grep -n "layout" auto-lang examples/bps-gallery/src/bps.ts       # kindOrder:75
# 645 已落地面
git -C auto-lang log -1 --format='%h %ad %s' ed43e9e8e          # 2026-09-18 17:41
grep -n "collect_use_module_fns" auto-lang crates/auto-man/src/vue.rs  # :3144/:3212/:3309
# G-6 两臂缺同文件池（对照 :3213 src/front 臂有 same_file_module_fns）
# junction 物化探针（仓库外沙箱）
cp -r blueprints /tmp/bp075-probe/blueprints && cp -r 047 /tmp/bp075-probe/x/y/p047
cd /tmp/bp075-probe/x/y/p047 && auto.exe build --gen-only        # EXIT=0
MSYS_NO_PATHCONV=1 cmd /c dir /s /b /a:l <p047>                  # → deps\bps（junction 实锤）
```
