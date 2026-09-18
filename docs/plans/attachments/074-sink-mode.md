# PLAN-074 下沉模式文档：ext → .at 作业标准（RC-D 批次 1 产物）

> 状态：随批次成长（T-00 建 §1/§2；T-04 定稿判定规则/步骤/坑清单）。
> 机制依据：auto-lang Plan 522（use 模块 fn 池内联发射）/ Plan 367 P2-4
> （store/模块文件顶层 fn）/ Plan 559 W2（back.api 双轨解析）/ tabs_store.at
> 六-helper 处置先例（PLAN-064 T-04）；072-inventory §5（ext 通道 TS 不入 VM）。

## 1. 四件 ext 逐 fn 分类表（T-00 产物 → AC-01）

判定口径（计划 §2）：**可沉** = 数据变换/排序/过滤/字符串处理（无 DOM、
无第三方、无 Pinia 细节）；**必留 ext** = DOM/window 交互、第三方库调用、
Pinia 响应式细节、DSL 无词位的构造（regex 字面量）。

### 1.1 outline_panel_ext.ts（71L 件）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useBlocksStore/useTabsStore（再导出） | 必留（web-codegen shim） | Pinia facade 双解析垫面，VM 无迁移动作（ext-registry 既有口径） | 留 ext 原样 |
| outlineHeadings | **sink** | 纯 filter/map + pad 数学（行构造）；`(level ?? 1)` 改显式 null 守卫（P618 两步赋值） | outline_panel.at 模块 fn `outline_headings` |
| dispatchScrollToHeading | 必留（bridge） | window.dispatchEvent + CustomEvent——DSL 不可表达 | 留 ext |

### 1.2 backlinks_panel_ext.ts（117L 件）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useTabsStore（再导出） | 必留（web-codegen shim） | 同 1.1 | 留 ext |
| tabFileStem | **sink** | 纯字符串处理（末段 + 去扩展名）；下沉形态见 §2 P-2 | backlinks_panel.at 模块 fn `tab_file_stem` |
| fetchBacklinksSafe | **sink**（编排部分） | try/catch 吞错映射 + 装载编排沉 .at watch（try/catch/finally 编译器 ≥ c5b5fecf）；`getBacklinks` 客户端调用经契约通道（§2 P-4） | backlinks_panel.at watch + `use back.api: get_backlinks`；ext 增契约别名 `get_backlinks`（薄别名，tabs_store_ext read_wiki 同款） |

### 1.3 outgoing_links_panel_ext.ts（102L 件）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useTabsStore（再导出） | 必留（web-codegen shim） | 同 1.1 | 留 ext |
| tabFileStem | **sink** | 同 1.2（重复实现，随件各沉一份——.at 无跨文件导入，见 §3 G-3） | outgoing_links_panel.at 模块 fn |
| fetchOutlinksSafe | **sink**（编排部分） | 同 1.2（get_outlinks 通道） | watch + `use back.api: get_outlinks`；ext 增契约别名 |
| openOutlinkTarget | 必留（bridge） | confirm()（window）+ createWikiPage/fileTree.load 跨 store 宿主流 | 留 ext 整体（半沉会造成宿主/纯逻辑缝合面） |

### 1.4 unlinked_references_panel_ext.ts（97L 件）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useTabsStore（再导出） | 必留（web-codegen shim） | 同 1.1 | 留 ext |
| tabTitle / tabPath | **sink** | 平凡访问器（null → "" 哨兵） | unlinked_references_panel.at 模块 fn |
| highlightContext | 必留（bridge） | regex 字面量 DSL 无词位；行 html 预计算（编译器 c7034bf5 `html:` 通道消费） | 留 ext；.at watch 逐行调用（use fn 通道） |
| fetchUnlinkedSafe | **sink**（编排部分） | 同 1.2（get_unlinked_refs 通道）+ 行构造循环沉 .at（html 字段经 ext highlight_context 逐行预计算） | watch + `use back.api: get_unlinked_refs`；ext 增契约别名 |

## 2. back.api 通道核对 + 下沉机制实测（T-00 探针证据）

探针：`jade-garden/front/tmp/p074-sinkprobe/`（worktree 内一次性工件，
build 双轨绿后即弃；auto.exe v0.4.2-1140 同源）。发现记 P-1..P-6：

- **P-1 模块 fn 三通道全通**：widget .at 文件顶层 `fn` 被 SFC 内联发射
  （Plan 367 P2-4 口径，`function` 声明提升，computed/handler 裸名调用零改写）；
  body 由 ts_adapter 转译——`let/var/if/for/return/break/try` 全支持，
  `while` 经 a2ts 回退正确发射。
- **P-2 字符串词位双轨映射**：`find`→indexOf、`slice`→substring、
  `char_at`→charAt（ts_adapter 映射表实证）；末段提取用 `find`+递归形态
  实测双轨发射正确（vue-tsc + vite 绿）。
- **P-3 f-string 数学内插可用**：`f"${(level - 1) * 0.6 + 0.375}rem"` 双轨
  发射正确（outline pad 下沉依据）；模块 fn 局部 `var` + null 守卫 +
  for-in 参数列表循环发射正确。
- **P-4 契约通道双轨**：widget `use back.api: get_backlinks` + watch 内
  try/catch/finally 调用 → SFC 发射 `await get_backlinks(...)`；api 导入行
  由 auto-man 管线 `with_project_api_functions(widget.api_imports)` 注入
  （探针项目无契约文件无导入行 = 探针伪影，真实 front/auto 工程由 T-02
  构建复核）。web 部署 sed 增第二表达式把 `@/lib/api` 改写到 ext 薄别名
  （tabs_store_ext read_wiki 契约别名同款）；VM 轨解析 desktop 契约副本
  （#[api] 340 改写，desktop app.at 消费形态在案）。
- **P-5 撞名坑（R013 类，实锤）**：模块 fn 局部变量与 widget model 字段
  同名时，state-ref 改写把局部误改写为 `X.value`（探针 vue-tsc TS2551
  实证）；use 导入 fn 的 R013 冲突检查只覆盖 fn 名，不覆盖 fn 体内局部名。
  **作业纪律：模块 fn 局部名避开本件 model/computed 名。**
- **P-6 VM 字符串语义分歧（微探针实锤，L3 纪律项）**：`"wiki/引言.ad"`
  上 `find(".")`=11（**字节索引**）、`slice(5,10)`=“引”（**字节区间**）、
  `char_at(7)`=0（**字节索引**，跨界返回 0）、`length`=10（**字符数**）——
  VM 轨 length 是字符、find/slice/char_at 是字节，非 ASCII 域四者混用双轨
  不可移植（vue 轨全字符语义，探针 MCP state 断言实证）。**处置：本批次
  下沉 fn 为 vue 轨执行面（web SFC），VM 可达性指形态可编译可加载；L3
  desktop 装配消费标题类派生一律走 tabs_store `strip_ext` 纪律（ASCII
  后缀比较域）或 store title 权威，禁止在 VM 轨对 CJK 域做 find/slice
  索引算术。**坑表随 gallery README 债表 D 系列维护。

## 3. 步骤与坑清单（T-04 定稿）

**步骤**（逐件流水）：

1. 逐 fn 分类（§1 口径），记入本档 §1 表。
2. 沉 .at：纯 fn → widget 文件顶层模块 fn（find+递归末段形态 P-2、
   f-string 数学内插 P-3、null 显式守卫）；fetch 编排 → watch 块
   try/catch/finally（catch=原吞错映射，finally=loading 复位）。
3. 契约通道接线：.at 顶 `use back.api: <fn>`；ext 增 snake 契约别名
   （薄转发手写客户端）；`stubs/gen_lib_api.ts` 增同名 gen stub
   （`assert-api-stub-sync` 门 B/C 要求 cp stub → gen 两处镜像位）。
4. 再生成部署 SFC：`auto build`（须用含 PLAN-074 补丁的编译器）→ sed
   双表达式部署（ext import + `@/lib/api` 两条都改写到 ext shim）。
5. gallery 双臂 gate（新单元：vue 页 + shim 路由 + VM twin + units.mjs
   登记 + `--update-snapshots` 建基线）；`node scripts/gate.mjs` 全绿。
6. 回归收口：`pnpm build`（front vue-tsc）+ `pnpm test:e2e`（05-panels
   等 web 行为面）+ desktop vm-smoke 双模快验。

**坑清单**：

- **G-1 撞名（P-5）**：模块 fn 局部名避开本件 model/computed 名
  （state-ref 改写误发 `local.value`；R013 检查不覆盖 fn 体内局部名）。
- **G-2 VM 字符串语义分歧（P-6）**：非 ASCII 域 find/slice/char_at
  （字节系）× length（字符系）混用双轨不可移植；VM 轨标题派生走
  tabs_store `strip_ext`（ASCII 后缀域）或 store title 权威。
- **G-3 无跨文件导入**：.at 模块间 import 缺位（links.at 头注在案）→
  tab_file_stem 等重复 fn 随件各沉，模式表登记，不抽象共享模块。
- **G-4 关键字撞名**：`link` 为 DSL 元素关键字，循环变量禁用（既有）。
- **G-5 ext 同名优先**：use 导入 fn 与 ext 导出同名时手写赢（Plan 522
  发射前过滤）→ 沉 fn 后必须从 ext 删除同名导出，否则 SFC 继续走旧 ext。
- **G-6 编译器通道补丁（本批次落 auto-lang `plan-074-dev`，40d7488 +
  899aa2e9c）**：src/front 兄弟生成臂 bare-regen 丢 fn 池（同文件模块 fn
  + use 导入池，Plan 522 只补了 components//bps 与 dep 通道）；watch 块体
  不入 api 调用扫描；api walker 无 Try 臂。**未修面**：components//bps
  通道的同文件模块 fn 同病（无消费方，待后续编译器计划收口）。旧版
  编译器（≤1140）跑本批次 .at 必现 TS2304 类红——regen 须用补丁版。
- **G-7 PLAN-646 gen 支持件（环境项）**：编译器 ≥646 的 `auto build` 在
  gen main.ts 追加 overlay 动态 import 但不落 `auto-select/overlay.ts`
  与 `vite-env.d.ts`——worktree regen 后手工补两文件（gitignored 环境件，
  不入 git；`src/src` 镜像在 build 前刷新，build 后再刷一次）。
- **G-8 部署 sed 双表达式**：`.at` 头注 regen 命令已更新为
  `-e ext -e '@/lib/api'` 双改写；漏 `@/lib/api` 臂 = TS2304。

## 4. desktop 消费登记（T-04 定稿；装配归 L3，本批次仅登记）

| 面板 | desktop 现状 | 挂载裁定（登记） | 约束注记 |
| --- | --- | --- | --- |
| backlinks | app.at 反链流内联（.OpenFile 直拉 get_backlinks） | **组件挂载**为本批后首选：逻辑已 .at 单源（模块 fn + watch 编排），desktop 侧复用=编译消费本 .at（`use` 通道同款）；内联流在 L3 装配前维持现状 | F-1：子件子树对 MCP 快照不可见——装配后断言/交互面走 root 投影；G-2：VM 轨标题派生禁 CJK find/slice 索引算术（走 store title 权威） |
| outgoing_links | app.at 出链流内联（get_outlinks） | 同 backlinks | openTarget 桥（confirm）VM 侧语义缺口在案（api.at 助手层同款偏差登记路径）；P614 for-in 参数列表零迭代 → VM 消费侧行遍历用 while+索引纪律 |
| unlinked_references | desktop 无对应流 | **组件挂载**（唯一路径）；数据通道 #[api] get_unlinked_refs 双端契约已在 | 高亮 html 为 vue 显示面（regex ext 桥），VM twin 不镜像（本批次 units.mjs 口径） |
| outline | desktop 无对应流；web 面 pinned-empty | **组件挂载**；行构造已 .at 单源（outline_headings） | F-5：blocks facade activeTab watch 原地改引用不重触发（072 在案）——desktop 挂载需显式 parse 播种或等 watch 修复（候选 DEBTS 归 app 层） |

> 登记 ≠ 装配：desktop app.at 面板装配（含内联流退役）归 L3/后续计划；
> P614/P618 深帧与 G-2 纪律为装配时的前置约束源（本档 §2/§3）。
