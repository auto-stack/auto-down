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

- **G-1 撞名（P-5；076 T-01 参数域增证）**：模块 fn 局部名**与参数名**避开本件 model/computed 名（filter_files 参数 query 撞 model.query 发射 query.value.trim() 运行时炸、vue-tsc 因 any 静默——参数与局部同禁）
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
  编译器（≤1140）跑本批次 .at 必现 TS2304 类红——regen 须用补丁版。**076 增补（plan-076-dev 58f2af2）**：api walker 补 Closure/Lambda 臂（on-handler 闭包体契约调用 TS2304）+ 闭包体 api 调用 async 前缀（TS1308）——search_panel debounce 闭包首件实证，074 同款折回候。
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

## 5. RC-D 批次 2 扩节：检索/导航族三件（PLAN-076 T-00，2026-09-19）

> 作业标准续册（随批次演进）。批次 2 = search_panel 177L / command_palette
> 184L / quick_switcher 165L，形状 = "query 输入 → 过滤/检索 → 行列表 +
> 键盘导航"。与批次 1 的差异面：①键盘导航/热键/焦点 = window 级 DOM，
> 必留 ext 域（VM twin 不镜像，F-1 口径）；②command_palette 缺件红占位
> 转正真单元。编译器 = master v0.4.2-1198-gffe2dac6d（074 三补丁已折回）
> ——本批无新增编译器预期（P-8 兄弟通道首验在 T-01）。

### 5.0 批次 2 探针结论（P-7/P-8，T-00 实证）

探针工件：`jade-garden/front/tmp/p076-filterprobe/`（worktree 一次性，
双轨绿后弃；auto.exe v0.4.2-1198 主检出 debug exe）。

- **P-7 filter 链 CJK 语义双轨一致（Q-1 关闭）**：`trim()/to_lower()/
  contains()` 在 CJK/ASCII/混合域 VM 全绿（"引"→1 命中且首行正确、
  "ABOUT"→2 命中折叠、" 方法.ad "→trim 后 1 命中、"方法/探"→混合命中、
  无中→0）。机制：VM 引擎 str 臂 `lower`→Rust `to_lowercase`（Unicode
  字符域）、`contains`→Rust `String::contains`（UTF-8 字节子串，自同步
  性质 ⇒ 与 JS `includes` 真值等价）、`trim`→Unicode 空白、`len`→字符数
  （engine.rs CALL_SPEC str 臂实勘）。**P-6 字节-字符分歧不及于过滤域**——
  该分歧专属索引算术（find/slice/char_at 返回字节索引与字符系 length 混
  用）；filter 链不产生不消费索引。vue 轨发射 `q.trim().toLowerCase()`/
  `n.toLowerCase().includes(needle)`（ts_adapter 映射实证）。**裁定：twin
  断言域直接用 CJK fixture（无 ASCII 限制）；下沉 fn 为 vue 轨执行面 +
  VM 形态可编译可运行（探针已证）。**
- **P-8 模块 fn 自递归双轨通（Q-2 root 通道关闭）**：collectFiles 形态
  （模块 fn 顶层自递归 walk 嵌套 {is_dir, children}) vue 轨发射为
  `function probe_walk(){...probe_walk(...)}` 提升声明、VM 轨深度优先
  序正确（引言.ad→探针.ad→b.md）。root 通道（app.at）实证；**兄弟生成
  臂（widget .at → 部署 SFC）为 G-6 已修面（074 补丁 40d7488 折回
  1198），T-01 quick_switcher 首件复验**。
- **DSL 词位（批次 2 新用面）**：filter 链 = `.trim()/.to_lower()/
  .contains()`（vue.rs/ts_adapter/engine 三表一致）；布尔或 `a || b`
  布尔域可用（tabs_store:208 先例，值传播差异不涉布尔）；列表局部/
  返回 = `var out List = []` / `fn f() List`（outline_headings 先例，
  裸 `var x = []` 发射 TS7034）；f-string 插值必须 `${...}` 形态
  （`{.x}` 发射为字面量，探针实证）。
- **Q-3 关闭（e2e 盘点）**：06-palette 四测已覆盖热键开合（Ctrl+P/Ctrl+O/
  Escape）+ 输入过滤（fill 'global graph'/'Tasks'）+ Enter 执行 command
  分支（图谱/闪卡）+ switcher file 分支点击开页——下沉行为面 e2e 在案。
  缺口（执行注记）：ArrowDown/ArrowUp 选中移动无 e2e 断言（现测 Enter
  均在 selected=0 态隐式执行）——gallery twin 以 NextItem/PrevItem 按钮
  序列断言 selected_index 投影补此面；e2e 增补非本批 gate。

### 5.1 search_panel_ext.ts 逐 fn 分类（81L，9 导出名）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useTabsStore（再导出） | 必留 | facade shim | 留 ext |
| useDebounceFn（再导出） | 必留 | @vueuse/core npm（DSL 不能导入） | 留 ext |
| Search/FileText/Box（再导出） | 必留 | lucide 组件值（dyn 渲染） | 留 ext |
| searchSafe | **sink（编排）** | try/catch 吞错映射沉 watch try/catch/finally；`search(q,30)` 客户端调用改 `use back.api: search_pages` 契约通道（双端 api.at:283/287 在案） | search_panel.at watch；ext 增 `search_pages` 薄别名（get_backlinks 同款）+ gen stub |
| snippetHtml | 必留（bridge） | regex 字面量 \u0001\u0002 无 DSL 词位 | 留 ext；下沉行构造经 use fn 逐行调用（unlinked highlight_context 先例） |
| withSearchDisplay | **sink（行构造）** | is_page/is_block/has_snippet 平凡布尔 + title_text 显式 if 守卫（P618 两步赋值）；snippet_html 字段经 ext 桥逐行预计算 | search_panel.at 模块 fn |
| scheduleScrollToBlock | 必留（bridge） | setTimeout + CustomEvent + dispatchEvent | 留 ext |

### 5.2 command_palette_ext.ts 逐 fn 分类（317L，18 导出名含 6 store 再导出 + LucideIcon type）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| 6 store 再导出（tabs/fileTree/sidebar/theme/recentFiles/workspace） | 必留 | facade shim | 留 ext |
| buildCommands | 必留（真宿主流整体） | 九命令闭包：DOM（dispatchEvent/ createElement）、Blob/URL、alert、dynamic import、pickFile——半沉造成缝合面（openOutlinkTarget 先例） | 留 ext 整体 |
| PaletteIcon | 必留 | h() 函数组件（`<component :is>` 代位） | 留 ext |
| recentFileItems | **sink** | map 行构造（id f-string/显式字段）；**icon 字段 = 宿主组件值**——裁定 A（默认）：沉 fn 收 icon 实参（Clock 经 use fn 通道传入，search_panel lucide fn 导入先例），T-03 发射首验；发射红则裁 B：行不带 icon，view 双分支注入 | command_palette.at 模块 fn |
| allPaletteItems | **sink** | spread concat → for-push | command_palette.at 模块 fn |
| filterPalette | **sink** | trim/to_lower/contains 链（P-7 双轨一致）+ idx/has_subtitle 行构造 + cap 20 + join(" ") 改双 contains 布尔或（`||` 布尔域） | command_palette.at 模块 fn |
| runPaletteItem | **拆沉** | file 分支 = tabsStore.open 沉 on-handler；command 分支 = 对象闭包调用（DSL 不能调对象上闭包）留 ext 桥 `run_command_action` | .at on + ext 桥 |
| nextIndex / prevIndex | **sink** | 模运算（P-3 数学内插同域，纯 int） | command_palette.at 模块 fn |
| listen/unlistenPaletteHotkeys | 必留 | window keydown（Ctrl/Cmd+P 守卫 + Escape），handler 同一性移除 | 留 ext |
| focusPaletteInput | 必留 | nextTick + querySelector focus（无模板 ref） | 留 ext |

### 5.3 quick_switcher_ext.ts 逐 fn 分类（115L，10 导出名）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useFileTreeStore/useTabsStore/Search（再导出） | 必留 | facade shim + lucide 组件值 | 留 ext |
| collectFiles | **sink** | 递归 walk（P-8 双轨实证；G-3 无跨文件导入 → 与 palette 各沉各份） | quick_switcher.at 模块 fn |
| filterFiles | **sink** | name/path 双 contains 布尔或 + idx 行构造 + cap 12（P-7） | quick_switcher.at 模块 fn |
| nextIndex / prevIndex | **sink** | 模运算 | quick_switcher.at 模块 fn |
| listen/unlistenSwitcherHotkeys | 必留 | window keydown（Ctrl/Cmd+O + Escape）+ 'jade-open-quick-switcher' CustomEvent | 留 ext |
| focusSwitcherInput | 必留 | nextTick + querySelector focus | 留 ext |

### 5.4 批次 2 计数勘正

计划 §5 预分类 "18 fn 基型" 勘正为 **22 逻辑 fn**（4+11+7，不含纯再导出
名）：sink 12 + 拆沉 1（runPaletteItem）+ 必留 9（含 hotkey 对合 1 行
×2 件计 4 fn + focus ×2 + buildCommands + PaletteIcon + snippetHtml +
scheduleScrollToBlock）。


### 4.1 desktop 消费登记·批次 2（PLAN-076 T-04 扩表；装配归 L3）

| 面板 | desktop 现状 | 挂载裁定（登记） | 约束注记 |
| --- | --- | --- | --- |
| search_panel | app.at 搜索流内联（.DoSearch 直拉 search_pages） | **组件挂载**为本批后可选：搜索编排已 .at 单源（with_search_display 模块 fn + debounce 闭包 try/catch/finally + `use back.api: search_pages` 契约同通道）；内联流在 L3 装配前维持现状 | snippet 高亮 regex 属 vue 显示面（ext 桥），VM twin 不镜像；errorMessage 桥 = vue 轨 strict 域（VM 轨契约调用语义不同——desktop 内联流自持 try 面）；G-2：VM 轨禁 CJK find/slice 索引算术（filter 域 P-7 不涉） |
| command_palette | desktop 无 palette 流（命令面 = ui_config menubar/toolbar，PLAN-073） | **组件挂载 = 唯一路径**（如 L3 需 palette）：过滤链/构造/模运算已 .at 单源（filter_palette 等）；但 buildCommands 为 web 宿主流整体（DOM/Blob/dispatchEvent/dynamic import）——desktop 消费侧命令清单应从 ui_config 单源重建（§8.5 口径），非移植 buildCommands | icon 组件值 = view 双分支注入（ruling B）；runCommandAction 桥 = command 分支对象闭包（desktop 侧等价物走 ui_config action 面）；热键/焦点 = window 级 ext 域 |
| quick_switcher | desktop 无 switcher 流（开页走 filetree） | **组件挂载 = 唯一路径**：collect_files 递归/filter_files/模运算已 .at 单源，fileTree facade 通道双端同形 | 'jade-open-quick-switcher' CustomEvent = web 宿主通道（desktop 装配时换自家开面板事件/api）；热键/焦点 = window 级 ext 域；G-2：VM 轨文件名过滤 = P-7 域（contains 链双轨一致）可用 |
