# jade-garden component-gallery

L1 widget parity 隔离面（PLAN-072；机制：auto-lang
`docs/design/30-autoui-parity-three-layer.md` §2/§5）。每个 parity 单元
双轨渲染 + 双端 gate：**vue 臂**挂真件部署 SFC（截图基线），**VM 臂**跑
twin 结构（MCP 快照/状态断言）。单元台账（三桶清单）见
`docs/plans/attachments/072-inventory.md`。

隔离面原则：不依赖 jade app 全局态与后端；数据 = fixture（vue 臂 API
shim 应答 + facade 直播种；VM 臂 root model Init 播种）。

## 架构（T-01 实测裁定，偏差已记计划 §7）

```
component-gallery/
├── src/                # vue 臂：真件挂载 harness（vite + fixture API shim）
│   ├── bootstrap.ts    #   fetch shim——先于一切 store 模块导入
│   ├── App.vue         #   ?unit= 深链路由（gate 口径）
│   └── pages/          #   每单元一页（真件 SFC 零副本直挂）
├── vm/                 # VM 臂：自包含 auto 项目（twin 单元页 + root 投影）
│   ├── pac.at          #   无 dep（实测：声明 dep 即被构建层 junction 物化）
│   └── src/front/      #   app.at（root fixture/标记/切换单元）+ twin 页
└── scripts/
    ├── vue-probe.mjs   #   静态服 dist + playwright 真件渲染断言
    └── vm-probe.mjs    #   auto run -r vm + MCP autoui_state/snapshot 断言
```

计划起草时假设"单 pac 双形态 + `dep jadeauto` 引真件"。实测否证（偏差
记录）：

1. **dep 声明即物化**：构建层把 dep 急切物化为 junction（wt-guard 违例
   类）并全量扫描编译（bps 的 bp 包 loader 因 reference/components 缺目
   录中止；jadeauto 全量 38 件 + ext 深路径拷贝断裂）。
2. **真件不可 VM 直挂**：web widget 数据层 = TS ext composable（TS 不入
   VM，desktop README §1 在案）→ 单 pac 双形态只能渲染 twin-vs-twin。
   故 vue 臂改直挂真件部署 SFC（vite alias `@` → front/src，零副本），
   parity 参照物更强；VM 臂 twin（derived 探针工件，头注标
   derived-from，desktop StatusBar 先例）。
3. `use jadeauto.front.<widget>` 编译通道（resolve_module_path 的
   `<pkg>/src/front/*.at` 探针）本身已证可用——pac.at 头注留档，T-02 作
   实验探针另测，不入骨架。

## 运行

```sh
cd jade-garden/front/component-gallery
# vue 臂
pnpm install                # 独立安装（pnpm-workspace.yaml 隔离 front 工作区）
pnpm exec vite build
node scripts/vue-probe.mjs  # 断言 + artifacts/*.png
# VM 臂（无 npm 依赖）
cd vm && D:/autostack/auto-lang/target/debug/auto.exe build -d .  # DSL 校验 + gen
cd .. && node scripts/vm-probe.mjs   # boot + MCP 断言（可 --port）
```

注意（worktree 执行环境）：

- front/node_modules 的 `@autodown/engine` link 指向本 checkout 的
  engine（gen 无 dist）→ worktree 内须改指主检出已构建 dist
  （`mklink /J`，vm-smoke 的 MAIN_REPO 预构建工件同款惯例）；
  gallery 自身 package.json 的 link 已直接写主检出绝对路径。
- Windows 保留端口段（`netsh interface ipv4 show excludedportrange`）
  会吃 3xxx 段端口——probe 默认 3100/9321 实测可用，自定义 `--port` 时
  先查排除段。

## T-01 实测发现（VM 语言语义，喂给 L1 修复与 auto-lang 登记）

| # | 发现 | 证据 |
| --- | --- | --- |
| F-1 | 子件（组件）子树对 MCP 快照不可见——当前 master 复测仍成立（041 README「vm 组件边界」②确认） | vm-probe：StatusBarPage 子件内容不在 snapshot；root 内联/标记可见 |
| F-2 | computed 数值比较（`>`）作 if 条件不进入分支（`==` 计算字段正常）；规避 = bool model 字段开关 | vm-probe 迭代：`if .ol_has_rows`（`.ol_count > 0`）零输出 → `if .ol_has`（Init 置 true）正常 |
| F-3 | f-string 内插 computed 不解析（`${.ol_count}` 原样出现）；model 字段内插正常（sb_marker 证明） | 同上迭代 |
| F-4 | `dyn (.tag)` 双轨可用：VM 快照可见（渲染为容器+文本子树），vue 臂为生成 SFC 常规形态 | vm-probe：dyn ul/li 行文本可断言 |
| F-5 | blocks.ts 的 activeTab watch 因 Open 原地改 tab 对象（引用不变）不重触发——生产侧 pinned-empty 掩盖；gallery 改显式 `blocks.parse` 播种 | OutlinePage 注释 + vue-probe；候选 DEBTS（front 侧修复归 L1 修复循环/app 层） |
| F-6 | **缺件即红的真实形态 = 静默降级，非崩溃**：真件（outline_panel 代表）VM 直挂经 `dep jadeauto` 通道可 load/render，但 TS ext 全量降级为 no-op stub（`WARN ext stub: outlineHeadings/useBlocksStore ... no-op platform stub`）→ 数据面空渲染（"No headings."）。红信号 = stub WARN 日志 + 数据投影为空。`auto run` 的 dep 解析走编译器 pac.at 直读，不物化 junction（build 才物化） | T-03 一次性实验（临时 dep + 挂载，已还原）；本表即证据留档 |

## 债表（PLAN-073 T-02 复核结论在档）

| # | 单元 | 结论 | 证据/去向 |
| --- | --- | --- | --- |
| D-1 | ①-2 tab 条·VM 语言语义复核 | **P622/P624 修复在当前 master 成立**（auto.exe v0.4.2-1140）：find 闭包（捕获本地变量 `.tabs.find(tt => tt.path == path)` / 根态字段 `== .active_path`，desktop app.at L156/181/197/203/237/252）、splice 写回、`?:` 三元（tab_strip.at L66 class 三元 / app.at `enabled:`）均正常。固化载体 = gallery tab_strip 单元（twin 切换交互，本 gate 在案）+ desktop vm-smoke tabs 臂五断言（运行收据归 PLAN-073 T-04） | units.mjs tab_strip 双绿 + desktop/vm-smoke.mjs |
| D-2 | ①-2 tab 条·结构对照 | **两端各持合法（070 R-1，不 bp 化）**：web=button/tab（active `bg-primary/10 text-primary`、truncate、dirty `●` text-[9px]、hover 显 close X、局部图谱/今日笔记/daily 导航附加钮）；desktop=row/tab（Plan 449 view fn 片段双分支、active `bg-[#1C1D24]`、dirty `*` amber、x 钮仅活动行、无附加钮）。结构差异=各应用自持形态，不做对齐修复；parity 锁在各自 gate | tab_strip 单元（072 样板）+ desktop app.at L408-441 |
| D-3 | ①-1/①-2 dirty 标色 | web `text-amber-500`（亮底）vs VM `text-amber-400`（暗底）——调色板字面，统一需主题 warning 语义 token（shadcn 默认无），留主题系统流；不在 AC-02 字面范围（11px/zinc） | 073-literal-style-inventory.md §4.3 |
| D-4 | ①-3 menubar·快捷键标注 | MenuBar.vue 快捷键 `<span class="ml-auto text-[11px] text-zinc-500">` ×4 源自编译器合成模板（auto-lang `ui_gen/vue.rs:6056`）——跨仓 codegen 面，菜单结构对照不受影响，模板 token 化留 L2 | 073-literal-style-inventory.md §2 |
| D-5 | ①-5 filetree 行家族·结构对照 | **行解剖两端对齐，缩进表示各持合法**：web（file_tree_node.at）=margin 缩进（level*12px style_obj）+ chevron span（h-4 w-4）+ NodeIcon ext 函数件 + name truncate，行点击 dir=toggle/file=open；desktop（app.at ft_rows）=guides 竖线（041 同款）+ mouse-area chevron（w-3.5 h-3.5）+ bps TreeIcon + label 钮。chevron 双态（right/down）、icon 按型、label 语义两端一致；ctx 菜单/新增钮为 web 独有面（desktop 无对应流）。bp spec gotcha#2 在案：bps 家族（flatten_tree/tree_icon）desktop 消费侧 gate 归本 twin（pac 自包含裁定，icon 以内置名替代），包级 gate 归 L2 | filetree 单元双臂绿（vue 点击展开 + VM ▸→▾ 翻转 rows:3→4）@本仓 T-03 |
