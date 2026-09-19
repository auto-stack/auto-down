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
| errorMessage | 必留（strict 桥，**T-02 增设**；review F-2 补行） | DSL catch 绑定发射裸 `catch (e)`，front tsconfig strict ⇒ unknown 域属性访问 TS18046——错误消息提取须在类型化 TS 侧（query_block_widget 编辑器先例） | 留 ext；Init debounce 闭包 catch 体调用 |
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
名）：sink 11 + 拆沉 1（runPaletteItem）+ 必留 10（hotkey 对 ×2 件计
4 fn + focus ×2 + buildCommands + PaletteIcon + snippetHtml +
scheduleScrollToBlock；sink 枚举 = §5.1 两行 + §5.2 五 fn + §5.3 四 fn）。
（review F-1 勘正：初版误记 12+1+9——sink 行枚举 2+5+4=11、必留括注
自和=10；总数 22 恰好掩盖拆分错。）另：T-02 执行期增设 errorMessage
strict 桥（§5.1 表行在案）与 search_pages 薄别名（§5.1 searchSafe 行
去向在案）、T-03 拆沉残臂 runCommandAction（§5.2 runPaletteItem 行
去向在案）——批次后 ext 逻辑 fn 面 = 必留 10 + 新增 3 = 13。


### 4.1 desktop 消费登记·批次 2（PLAN-076 T-04 扩表；装配归 L3）

| 面板 | desktop 现状 | 挂载裁定（登记） | 约束注记 |
| --- | --- | --- | --- |
| search_panel | app.at 搜索流内联（.DoSearch 直拉 search_pages） | **组件挂载**为本批后可选：搜索编排已 .at 单源（with_search_display 模块 fn + debounce 闭包 try/catch/finally + `use back.api: search_pages` 契约同通道）；内联流在 L3 装配前维持现状 | snippet 高亮 regex 属 vue 显示面（ext 桥），VM twin 不镜像；errorMessage 桥 = vue 轨 strict 域（VM 轨契约调用语义不同——desktop 内联流自持 try 面）；G-2：VM 轨禁 CJK find/slice 索引算术（filter 域 P-7 不涉） |
| command_palette | desktop 无 palette 流（命令面 = ui_config menubar/toolbar，PLAN-073） | **组件挂载 = 唯一路径**（如 L3 需 palette）：过滤链/构造/模运算已 .at 单源（filter_palette 等）；但 buildCommands 为 web 宿主流整体（DOM/Blob/dispatchEvent/dynamic import）——desktop 消费侧命令清单应从 ui_config 单源重建（§8.5 口径），非移植 buildCommands | icon 组件值 = view 双分支注入（ruling B）；runCommandAction 桥 = command 分支对象闭包（desktop 侧等价物走 ui_config action 面）；热键/焦点 = window 级 ext 域 |
| quick_switcher | desktop 无 switcher 流（开页走 filetree） | **组件挂载 = 唯一路径**：collect_files 递归/filter_files/模运算已 .at 单源，fileTree facade 通道双端同形 | 'jade-open-quick-switcher' CustomEvent = web 宿主通道（desktop 装配时换自家开面板事件/api）；热键/焦点 = window 级 ext 域；G-2：VM 轨文件名过滤 = P-7 域（contains 链双轨一致）可用 |

## 6. RC-D 批次 3 扩节：属性/文件/主题/闪卡/日程七件（PLAN-077 T-00，2026-09-19）

> 作业标准续册。批次 3 = properties_panel 267L / recent_files_panel 113L /
> create_page_prompt 92L / workspace_opener 133L / theme_popover 120L /
> flashcard_modal 222L / agenda_panel 131L（合计 1078L；图谱族两件
> graph_sidebar/graph_controls 归批次 4 独立立项）。形状 = "拉取/派生 →
> 行列表/表单"（074/076 两轮已验证）+ 两个新域（JSON 域/时间格式化域）。
> 编译器 = master v0.4.2-1305-ga38461ba3（074/076 折回补丁全在）——本批
> 无新增编译器补丁（P-9 缺口按 P614 惯例走纪律登记，不阻断）。

### 6.0 批次 3 探针结论（T-00 实证）

探针工件：`jade-garden/front/tmp/p077-probe/`（worktree 一次性，双轨绿后
弃；auto.exe v0.4.2-1305 主检出 debug exe）。vue 轨 = auto build（内跑
vue-tsc && vite build）全绿；VM 轨 = auto run -r vm + MCP state/snapshot
断言全绿（SHAPE-1 诊断项除外）。

- **P-9 map 键值迭代 VM 轨零迭代（P614 同族，Q-4 关联面）**：`for (k, v)
  in map` vue 轨发射 `for (const [k, v] of Object.entries(map))`
  （ts_adapter.rs:799，执行正确）；VM 轨 codegen 有臂（codegen.rs:3319，
  经 auto.hashmap.keys native）但运行时零迭代（顶层 map 字面量 fixture
  实证：count 恒 0，无错误输出）。**处置（P614 惯例，不补编译器）**：
  map 迭代 fn 为 vue 轨执行面（sync_entries）；VM twin 以配对列表
  fixture 播种行（search_panel Init 播种先例），不镜像 map 迭代；L3
  desktop 消费侧行遍历禁 map-for-in（P614 while+索引纪律同款注记）。
- **P-10 try/finally 无 catch 解析红**：parser expected "Catch" found
  "finally"（探针实证）——DSL try 必须带 catch。workspace .Open 的
  busy 复位形态 = try/catch(空)/finally：空 catch 吞 rejection（原
  openWorkspaceFlow().finally() 链的传播 = console 域 unhandled
  rejection，UI 面零变化——error 显示源自 store.error 而非 rejection）。
  嵌套 try/catch/finally 双轨绿（flashcard .Rate reload 形态实证：
  inner:fin 投影正确）。
- **五点裁定（计划 §6/T-00）**：
  1. **JSON 域（Q-2，默认成立）**：`JSON.stringify` vue 轨透传可用
     （ts_adapter.rs:2033 stringify 直传）；VM 轨无词位（engine
     CALL_SPEC 无 JSON 臂）→ fmJson/propsDirty **留 ext 桥**（.at
     watch/computed 经 use fn 通道）；facade 写（tab.frontmatter/
     tab.dirty lvalue）**必留 ext**（非 DSL lvalue，clearWorkspaceError
     先例）。**增证（预分类校正）**：DSL 无 typeof/is_array 词位
     （parser/ui_gen 全查无）→ commitFrontmatter 重建循环（值域 typeof
     分派 + Number/isNaN 强转）与 setEntryType（Boolean()/Array.isArray/
     String() 强转）**整体必留 ext**——重建循环与强转/facade 写三面
     同体不可分离，计划 "部分沉" 预判不成立。
  2. **时间格式化域（Q-3，默认成立）**：Date/toLocale* 无 DSL 词位 →
     行构造沉 .at + time/formatted_date 字段经 ext 桥逐行预计算
     （snippet_html 先例）；VM twin 直显 raw 值不镜像格式化。
  3. **静态 Obj 字面量列表（Q-4 关闭，双轨绿）**：`fn f() List { return
     [{...}, {...}] }` vue 轨发射数组字面量、VM 轨 acc_count=2 +
     snapshot 行渲染（indigo/emerald）——theme accents 可沉，VM Obj
     全键形状锁定域实证无碍。
  4. **map for-in 迭代**：见 P-9（vue 执行面 + twin 播种裁定）。
  5. **to_upper**：双轨绿（ts_adapter.rs:1500 → toUpperCase /
     engine.rs:7102 upper 臂；VM "TODO" state 实证）→ markerClass 沉
     （ASCII 域，G-2 不及）。
- **词位增证**：f-string `\"` 转义双轨绿（`{k}` 单括号 = 字面量复证
  ——076 结论）；camelCase 字段名（openedAt）读写双轨绿；DSL `!= null`
  发射松散 `!= null`（JS null+undefined 双捕获，部署 SFC 实证）——
  两步守卫等价 `??` 域。

### 6.1 properties_panel_ext.ts 逐 fn 分类（192L，14 导出名；T-00 校正定稿）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useTabsStore/useDebounceFn/Plus/Trash2/Check/X（再导出） | 必留 | facade shim + npm + lucide | 留 ext |
| syncEntries | **sink** | for (k, v) in map 键值迭代 + 行构造（P-9：vue 执行面，twin 播种）；activeTab null 守卫两步；infer_type 逐值 ext 桥（highlight_context 先例） | properties_panel.at 模块 fn `sync_entries` |
| normalize | **拆沉** | null 透传/undefined 臂（Object.entries 域不可达）丢弃；私有副本留 ext 供 propsDirty | 沉入 `sync_entries` 内联 + ext 私有 |
| inferType | 必留（**校正：预分类 "拆沉" 不成立**） | typeof/Array.isArray/regex 三重无词位；改导出供 .at use fn 逐值桥 | 留 ext（导出 inferType） |
| fmJson | 必留（JSON 桥，Q-2） | JSON.stringify VM 无词位 | 留 ext |
| propsDirty | 必留（JSON 桥） | JSON.stringify 深比较 + Object.keys 计数 | 留 ext |
| commitFrontmatter | 必留（**校正：预分类 "部分沉" 不成立**） | 重建循环 typeof 值域分派 + Number/isNaN + facade 写三面同体 | 留 ext |
| setEntryType | 必留（**校正：预分类 "sink" 不成立**） | Boolean()/Array.isArray()/String() 强转 + typeof 分派 | 留 ext |
| tryAddProperty | **sink** | dup 检测 for-loop + push + alert 透传（f-string 转义引号探针绿；alert = 浏览器全局，VM twin 不镜像 alert 臂） | properties_panel.at 模块 fn `try_add_property` |
| withPropDisplay | **sink** | 就地字段写循环 + bool_label（`== true` 显式）+ placeholder 双 if | properties_panel.at 模块 fn `with_prop_display` |
| eventValue | **消解** | handler 直写 `evt.target.value`（search_panel QueryInput 先例） | 删（handler 内联） |
| tabsActiveTab | **sink** | 两步 null 守卫（Call body 免 gap-28 误型） | properties_panel.at 模块 fn `tabs_active_tab` |

### 6.2 recent_files_panel_ext.ts 逐 fn 分类（37L，5 导出名）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useRecentFilesStore/useTabsStore/Clock/X/Trash2（再导出） | 必留 | facade shim + lucide | 留 ext |
| recentFilesWithTime | **sink** | map → for+push 行构造；time 字段经 ext formatTime 桥逐行预计算（Q-3；snippet_html 先例）；path/title/openedAt 显式字段保真 | recent_files_panel.at 模块 fn `recent_files_with_time` |
| formatTime | 必留（Q-3 桥） | Date/toLocaleTimeString | 留 ext |
| removeRecent | 必留一行桥 | DSL `.remove(...)` → `.splice` 误射在案 | 留 ext |

### 6.3 create_page_prompt_ext.ts 逐 fn 分类（18L，2 导出名）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| wikiTitleToPath（re-export） | 必留 | regex 桥（wikiLink.ts 单源；DSL 无 lib 导入通道） | 留 ext |
| CodeTag | 必留 | code 标签 h 组件（dyn 代位） | 留 ext |

（极薄件零 sink 面——批次价值 = VM 渲染臂首验 + props/emits 契约；
orphan 组件无消费者，头注在案。）

### 6.4 workspace_opener_ext.ts 逐 fn 分类（93L，9 导出名）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useWorkspaceStore/useFileTreeStore/FolderOpen/Info（再导出） | 必留 | facade shim + lucide | 留 ext |
| openWorkspaceFlow | **消解（编排内联）** | 双 store 调用内联 .Open handler try/catch(空)/finally（P-10 形态）；workspace 走 store facade 通道（open_workspace 契约在 store 内部、error 状态由 store 维护——直调契约将丢 error 置位面）；busy 复位落 finally | 删（handler 内联） |
| workspaceErrorText | **sink** | `?? ""` 两步守卫（`!= null` 松散发射实证） | workspace_opener.at 模块 fn `workspace_error_text` |
| clearWorkspaceError | 必留 | facade 写（非 DSL lvalue） | 留 ext |
| chooseWorkspaceDir | 必留 | showDirectoryPicker + focus/select（window DOM——Q-1 VM 臂不覆盖） | 留 ext |
| WorkspaceLogo | 必留 | SVG h 组件 | 留 ext |

### 6.5 theme_popover_ext.ts 逐 fn 分类（51L，5 导出名含 interface）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useThemeStore/Sun/Moon（再导出） | 必留 | facade shim + lucide | 留 ext |
| themeAccents | **sink** | 静态五 accent Obj 字面量列表 return（Q-4 探针双轨绿——6.0#3） | theme_popover.at 模块 fn `theme_accents` |
| isOutsideThemePopover | 必留 | DOM closest（.Close 恒真化注记保真留 ext） | 留 ext |
| AccentSwatch interface | **删** | sink 后无消费者（ThemeAccent 依 typealias 一并清理） | 删 |

### 6.6 flashcard_modal_ext.ts 逐 fn 分类（71L，7 导出名）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| Brain（再导出） | 必留 | lucide | 留 ext |
| getDueCardsSafe | **sink（编排）** | try/catch/finally 直调 `use back.api: get_due_cards`（Init/is_open watch/Rate reload 三处 body——catch=error 置位、finally=loading 复位；错误消息经 errorMessage strict 桥——076 先例）；ext 增 get_due_cards 薄别名 + gen stub | flashcard_modal.at 三处 handler body |
| reviewCardSafe | **sink（编排）** | .Rate try/catch 直调 `review_card` 契约（成功臂 index+1/隐藏/ exhaustion reload；失败臂 error 置位——原 safe 包装零 reject 语义由 try/catch 等价承载） | flashcard_modal.at .Rate body |
| cardAt | **sink** | 越界 null 守卫（for+计数两步——避免索引表达式双轨域） | flashcard_modal.at 模块 fn `card_at` |
| cardQuestion/cardAnswer | **sink** | `?.question \|\| raw` 改显式 if 链（null+空串双守卫——\|\| 字符串域） | 模块 fn `card_question`/`card_answer` |
| counterText | **sink** | f-string `${index + 1} / ${count}`（P-3 数学内插） | 模块 fn `counter_text` |
| errorMessage（**T-00 增设**） | 必留（strict 桥） | catch e unknown 域属性访问 TS18046——076 search_panel 同款 | 留 ext（新增） |

### 6.7 agenda_panel_ext.ts 逐 fn 分类（104L，5 导出名）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useTabsStore/CalendarClock（再导出） | 必留 | facade shim + lucide | 留 ext |
| tabPath | **sink** | `?? ""` 两步守卫（074 tabTitle/tabPath 先例） | agenda_panel.at 模块 fn `tab_path` |
| fetchAgendaSafe | **sink（编排）** | watch body try/catch/finally + `use back.api: get_agenda` 契约直用；catch 空（原 console.error 仅日志域，丢弃注记——无 UI face）；finally loading 复位；ext 增 get_agenda 薄别名 + gen stub | agenda_panel.at watch body |
| formatDate | 必留（Q-3 桥） | Date/toLocaleDateString——formatted_date 逐组经 ext | 留 ext |
| markerClass | **sink（并入行构造）** | switch 改互斥布尔 if 链（DOING/NOW→primary、DONE→done、其余→muted——default 臂显式化）；to_upper ASCII 域（6.0#5） | 沉入 `agenda_display` |
| agendaDisplay | **sink（行构造）** | 双层 for+push；`title \|\| page_path` 改 `!= null && != ""` 显式 if（\|\| 字符串域空串语义保真）；formatted_date 逐组 ext 桥 | agenda_panel.at 模块 fn `agenda_display` |

### 6.8 批次 3 计数勘正

计划 §5 预分类 "~40 fn 基型" 勘正为 **34 实义 fn**（纯再导出名不计）：
sink **17**（properties 4 + recent 1 + theme 1 + flashcard 6 + agenda 4 +
workspace 1）+ 消解 **2**（eventValue、openWorkspaceFlow 内联）+ 拆沉
**1**（normalize 部分沉）+ 必留 **13**（properties 5[inferType 改导出 +
JSON 域 ×2 + commitFrontmatter + setEntryType] + recent 2 + cpp 2 +
workspace 4[chooseWorkspaceDir/clearWorkspaceError/WorkspaceLogo +
isOutsideThemePopover 归 theme] + theme 1 + flashcard 0 + agenda 1）+
**T-00 增设 1**（errorMessage strict 桥）+ **契约别名 3**（get_agenda/
get_due_cards/review_card——workspace 走 store facade 不增）。校正要点：
typeof 无词位使 properties 四 fn（inferType/commitFrontmatter/
setEntryType 必留 + fmJson/propsDirty JSON 域）离开 sink 面，预分类
properties 12 实义中 sink 6 → 实沉 4。

### 4.2 desktop 消费登记·批次 3（PLAN-077 T-06 扩表；装配归 L3）

| 面板 | desktop 现状 | 挂载裁定（登记） | 约束注记 |
| --- | --- | --- | --- |
| properties_panel | desktop 无对应流 | **组件挂载 = 唯一路径**：sync_entries/with_prop_display/try_add_property/tabs_active_tab 已 .at 单源；frontmatter 编辑/facade 写（commitFrontmatter）= vue 轨 strict 域 | **P-9 纪律首事主**：sync_entries 的 map 键值迭代 VM 轨零迭代——desktop 挂载前需 twin 侧配对列表通道或编译器补课（P614 同族）；JSON.stringify 域不入 VM |
| recent_files_panel | desktop 无对应流 | **组件挂载**（唯一路径）：recent_files_with_time 行构造已 .at 单源 | formatTime 桥 TS 域——desktop 消费侧时间显示走 raw 或自家格式化 |
| create_page_prompt | desktop 无对应流 | **组件挂载**（唯一路径）：零 sink 面（wikiTitleToPath regex 桥/CodeTag ext） | wikiTitleToPath = web lib 单源——desktop 消费侧需等价 path 推导（ASCII 域 strip_ext 纪律） |
| workspace_opener | app.at OpenWs 流内联（app.at:128，menubar action ws.open Ctrl+O） | **内联流维持现状**（OpenWs 流已覆盖打开面）；组件挂载为可选（Q-1 裁定：picker 按钮=window 级 DOM 不进 VM 断言域，desktop 装配走自家 menubar action 不消费 picker 通道） | .Open 编排链（promise 链 busy 复位）已 .at 单源；open_workspace 契约在 store Open 内部持 error 状态——desktop 直挂组件时 error 面同通道 |
| theme_popover | desktop 无 popover 流（主题走 status_bar/settings 面） | **组件挂载 = 唯一路径**：theme_accents 字面量列表已 .at 单源（Q-4 VM 全键形状锁定域实证） | accent key 类型 = web ThemeAccent union——desktop 侧五 accent 单源自家声明 |
| flashcard_modal | app.at 闪卡流内联（app.at:261 LoadCards/:267 Grade） | **组件挂载**为本批后可选：Init/watch/Rate 编排已 .at 单源（get_due_cards/review_card 契约直用双端在案）；内联流在 L3 装配前维持现状 | errorMessage strict 桥 = vue 轨域（desktop 内联流自持 try 面）；card_at 走查形态双轨安全 |
| agenda_panel | desktop 无对应流 | **组件挂载 = 唯一路径**：tab_path/agenda_display 行构造 + watch 编排已 .at 单源（get_agenda 契约直用） | formatDate 桥 TS 域（Q-3）——desktop 消费侧日期显示走 raw 或自家格式化；to_upper marker 链 P-7 双轨一致可复用 |

> 登记 ≠ 装配（§4 同款）：desktop app.at 面板装配归 L3/后续计划；P-9
> （map 迭代）为 properties_panel 挂载前置约束源（本档 §6.0）。

## 7. RC-D 批次 4 扩节：图谱族两件 + RC-F 宿主面首单元（PLAN-078 T-00，2026-09-19）

> 作业标准续册。批次 4 = graph_sidebar 162L / graph_controls 216L（+82L
> styleblock 伴生）两件 RC-D 下沉 + graph_view 141L **RC-F 宿主面首单元**
>（cytoscape 内核豁免，壳+过滤派生入 L1）。本批 = **RC-D 清零批**
>（16 件全闭：4+3+7+2）。编译器 = master v0.4.2-1378-g0c6b03fd3（074/076
> 折回补丁全在）——本批无新增编译器补丁预期（探针五点双轨全绿实证）。

### 7.0 批次 4 探针结论（P-11..P-14，T-00 实证）

探针工件：`jade-garden/front/tmp/p078-probe/`（worktree 一次性，双轨绿后
弃；auto.exe v0.4.2-1378 主检出 debug exe 同源）。vue 轨 = auto build
（内跑 vue-tsc && vite build）全绿；VM 轨 = auto run -r vm + MCP
state/snapshot/action（press/toggle）断言全绿。

- **P-11 map 括号写 VM 轨静默吞 handler（Q-3 关联，P-9 同族新员）**：
  `.settings["key"] = v`（字面量键与 var 键同病）在 VM msg handler 体内
  **静默中止**——写后语句全部不执行、无错误输出（isolation 四形态实证：
  纯 int 写绿/全量 map 字面量重赋绿/括号写两形态计数恒 0）。**可用水位**：
  点号写 `.settings.nodeSize = 20` 绿（读回 20）、括号读
  `.settings["nodeSize"]` 绿（读回 20）、msg→msg 链 `.Tail()` 绿、全量
  字面量重赋 `.settings = {...}` 绿。vue 轨括号写发射正确
  （`settings.value[args.key] = args.value`，探针 SFC 实文）。
  **处置**：settings 写通道按 Q-3 裁定走 store fn（vue 轨执行面）；VM
  twin 不镜像 settings 交互写（F-1 播种投影口径）；L3 desktop 装配图谱
  设置流时禁 map 括号写（点号写/重赋/集合 fn 通道）——P614 纪律同款登记。
- **P-12 slider 词位 VM 轨缺席（Q-4 主证据）**：DSL `slider` 元素在 VM
  轨 **静默丢弃**——aura_view_builder 无 slider 臂（input/checkbox 有臂
  ，crates/auto-lang/src/ui/aura_view_builder.rs:2075/2181），快照零节点
  ，set_value 动作不可达；iced View::Slider 运行时形态仅 a2r codegen 轨
  （rust.rs:3706，PLAN-025 T-03）可达。vue 轨 slider 发射
  `<input :min :max :step :value @change>` 但**无 type="range"**（vue.rs
  slider→input 映射不带 type 注入，探针 SFC 实文）——**RangeInput ext
  桥必留**（生产件滑条 DOM 保真），DSL slider 词位双轨均不可用作生产。
- **P-13 checkbox 词位双轨可用（Q-4 副证据）**：VM 轨 checkbox 原生词位
  可驱动——MCP `toggle` 动作 → on_toggle msg 通道 → 布尔翻转投影实证
  （ps_flag true）；vue 轨 checkbox 自带 `type="checkbox"` + `:checked`
  （vue.rs:7175 注入臂）。**twin 断言面可用 checkbox 驱动布尔投影**。
- **P-14 math.round 双轨词位（opacityLabel 沉降依据）**：`math.round(x)`
  vue 轨发 `Math.round(x)`（ts_adapter.rs:2217 math 模块臂）、VM 轨走
  静态模块白名单 → `auto.math.round` native（codegen.rs:9167 白名单 +
  native_catalog.rs:325 注册）——探针 "85%" 双轨绿。ASCII 后缀剥除按
  strip_ext 纪律形态（length+slice+尾比较）双轨绿（"wiki/Intro" 剥成）
  ；CJK 路径 VM 原样退化（G-2 字节域确证，centerLabel=vue 轨执行面）
  。
- **五点探针总览（计划 §6/T-00 对应）**：①排序下沉（copy+while 选排+
  cap+break+display 显式 if）双轨绿（top_count=3/first=引言）；②形态
  算术（math.round/strip_ext）见 P-14；③slider/checkbox 见 P-12/P-13
  ；④嵌套写通道见 P-11；⑤过滤拆沉（showMissing/showOrphans 节点过滤
  + 边端点 kept×边表双成员扫描——无 Set 词位）双轨绿（F/F 默认 2/1，
  翻转后 3/3——graph_view filter_domains 拆沉形态实证）。

### 7.1 graph_sidebar_ext.ts 逐 fn 分类（47L，5 导出名）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useGraphStore/useTabsStore/Network（再导出） | 必留 | facade shim + lucide 组件值（dyn 渲染） | 留 ext |
| graphStats | **sink** | 四 filter/length 计数 + stats Obj 构造（probe_stats 同形，探针⑤同族双轨绿） | graph_sidebar.at 模块 fn `graph_stats` |
| topDegreeNodes | **sink** | spread/sort/slice 三无词位 → copy+while 选排 + cap 15 + break（探针①双轨绿）；`label || id` → 显式 if（display 字段预计算——gap 46 口径维持，click 仍传 raw label） | graph_sidebar.at 模块 fn `top_degree_nodes` |

### 7.2 graph_controls_ext.ts 逐 fn 分类（~110L，13 导出名）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| useGraphStore/Search/SlidersHorizontal/Palette/Magnet/Focus（再导出） | 必留 | facade shim + lucide | 留 ext |
| RangeInput | 必留 | h 组件；DSL input 映射 shadcn Input 丢 min/max/step 在案 + **P-12：DSL slider 词位 vue 轨无 type="range"、VM 轨缺席**——生产滑条 DOM 保真唯一通道 | 留 ext |
| centerLabel | **sink** | regex `.ad$` → strip_ext 纪律形态（探针②ASCII 双轨绿；CJK 域 VM 退化 G-2——**vue 轨执行面**，VM twin 不镜像 CJK 臂） | graph_controls.at 模块 fn `center_label` |
| opacityLabel | **sink** | Math.round → `math.round` 双轨词位（P-14）+ f-string `%` 后缀 | graph_controls.at 模块 fn `opacity_label` |
| eventValue | **消解** | handler 直写 `e.target.value`（077 properties 先例，部署 SFC 实证） | 删（handler 内联） |
| eventNumber/eventChecked | **必留 cast 桥** | Number() 强转 + checked 读——v-model.number 语义；VM 臂交互断言走 P-13 checkbox 投影，slider 交互不进 VM 断言（Q-4 裁定面） | 留 ext |
| setGraphNumber/setGraphFlag/resetGraphSettings | **转 store fn 通道**（Q-3，随 T-00 终裁执行） | 括号写词位 vue 轨可行（探针④ SFC 实文）但 VM 轨 P-11 静默吞——写通道收敛 `graph_store.at` `set_setting`/`reset_settings` 两 fn（store 单源，saveSettings 内聚）；VM twin 不镜像（F-1） | graph_store.at 增 fn；ext 三 fn 删 |
| styleblock 伴生（82L） | 维持 | regen 追加流程（既有部署管线）；style 面不进 VM 断言 | 维持 |

### 7.3 graph_view_ext.ts 逐 fn 分类（~200L，8 导出名；RC-F 宿主面切分）

| fn | 分类 | 裁定 | 去向 |
| --- | --- | --- | --- |
| buildElements | **拆沉** | 前段过滤 = nodes×settings[showMissing/showOrphans] 节点过滤 + 边端点双成员扫描（探针⑤双轨绿——kept 列表×边表内标，无 Set 词位）→ .at 模块 fn `filter_domains(nodes, edges, settings)` 返回 {kept_nodes, kept_edges}；后段 cytoscape element Obj 构造留 ext 消费 filter_domains 产物 | graph_view.at 模块 fn + ext 改造 |
| initGraph/updateGraphElements/applyGraphSettings/applyGraphHighlight/destroyGraph/graphFit/graphRelayout | 必留（RC-F 内核豁免面） | cytoscape 实例生命周期全家（init/fcose/tap/高亮/fit/relayout/destroy）——plan 011 非目标 #3 封装策略；宿主面 .at 壳经 use fn 通道调用（形态维持） | 留 ext |
| hsl/buildStyle/runLayout/updateHighlight（ext 内私有） | 必留 | 同上（RC-F 豁免域） | 留 ext（私有） |

> 宿主面切分裁定（Q-1 **终裁 2026-09-19：划出 078**——graph_view 真渲染
> 随 canvas 场景契约独立计划，草案 attachments/078-canvas-graph-scene-
> plan-draft.md；宿主面单元一并划出记 DEBT。终裁记录与事实勘误见判定档
> §5/§6：**canvas 元素双轨已在**（Plan 563，场景=笔笔画契约），本节
> "VM 无 canvas 词位"表述作废；slider = a2r 完整/aura 臂缺/vue 缺
> type=range 的补全面。§7.1/7.2 两件 RC-D 下沉裁定不受影响，078 照常
> 执行；§7.3 graph_view 分类表移存独立计划 T-0 复用）。

### 4.3 desktop 消费登记·批次 4（PLAN-078 T-04 扩表；装配归 L3）

| 面板 | desktop 现状 | 挂载裁定（登记） | 约束注记 |
| --- | --- | --- | --- |
| graph_sidebar | app.at LoadGraph 流内联（app.at:304：get_graph 计数 + graph_rows 行按钮，无视图） | **组件挂载**为本批后可选：graph_stats/top_degree_nodes 已 .at 单源（统计/选排 P-14 探针双轨绿）；内联流在 L3 装配前维持现状 | 行 click（tabs.open）= web 宿主通道——desktop 装配走自家开页流；Network 图标 dyn 渲染面 VM twin 以内置 icon 名替代（gallery 同款） |
| graph_controls | desktop 无对应流（图谱设置面缺位） | **组件挂载 = 唯一路径**：gc_center_label/gc_opacity_label/gc_set_setting/gc_reset_settings 已 .at 单源（写通道 = 点号写/bracket 写 vue 执行面——P-11 修复前 VM 轨禁括号写）；RangeInput/eventNumber/eventChecked = vue 滑条/勾选域 | **Q-4 收敛口径**：slider 词位 VM 缺席（P-12）+ AutoUI Slider 补全随独立计划（DEBTS 078）——desktop 装图谱设置面前置依赖该计划；saveSettings 持久化 = localStorage 域（graph_store_ext），desktop 侧等价物归 L3 裁 |
| graph_view | desktop 无图谱视图（LoadGraph 仅计数行按钮） | **划出 078**（用户终裁 2026-09-19）：真渲染随 canvas 场景契约独立计划（草案 attachments/078-canvas-graph-scene-plan-draft.md——Plan 563 canvas 双轨已在、场景契约扩容 + Slider 补全 + cytoscape 对位）；宿主面单元一并划出 | DEBTS 078 行在案；判定档 attachments/078-graph-view-ruling.md §5/§6 |

> 登记 ≠ 装配（§4 同款）：desktop 图谱族装配归 L3；graph_controls 挂载
> 的前置 = 独立计划 Slider 补全（Q-4）；graph_sidebar 挂载无前置约束
> （P-14 域 + G-2 CJK 剥除退化已知）。

### 4.4 desktop 消费登记·L3 批次 1 回填（PLAN-079 T-05，2026-09-19）

> §4/§4.1/§4.2 各行"挂载裁定"的**实际装配形态**回填。形态裁定依据 =
> `079-l3-assembly-mode.md`（T-00 双路径探针：α 组件挂载数据面/断言面
> 双死——E-2..E-4；β 内联消费定形——E-5..E-9；跨项目 fn 导入静默死面
> P-15 → 下沉 fn 一律部署副本 + 同项目 use 引回）。

| 件 | 登记表裁定（当时） | 实际装配形态（PLAN-079） |
| --- | --- | --- |
| backlinks | 组件挂载首选 | **β 装配（内联流收敛升级）**：fetch key 收敛 tab_file_stem 部署副本（doc_title 单源化）+ SwitchTab 面板刷新（web watch activeTab 语义对齐）；vm-smoke bl 锚不变绿 = 行为等价 |
| outgoing_links | 同 backlinks | 同 backlinks（tab_file_stem 一副本双登记） |
| unlinked_references | 组件挂载（唯一路径） | **β 装配**（T-00 探针件 → 生产形态）：契约直拉 + 根视图行按钮开页；高亮 html = vue 显示面差异登记 |
| outline | 组件挂载（唯一路径） | **β 装配**：ol_headings 行扫描等价推导（# 级别 + 围栏守卫 + ^锚/{#id} 剥除）——blocks 源不可达（blocks 契约仅按 id 单取，无整页列表路由；backend 出 079 affects）+ scroll_to 点击面差异 |
| search_panel | 组件挂载可选 | **内联流维持**（Q-3 裁定：.DoSearch 已覆盖功能面；装配延后批次 2 顺带） |
| command_palette | 组件挂载（唯一路径） | **β 变体 desktop 自持**：视图菜单 + Ctrl+P 入口；命令清单 = actions 注册表 ui_config 单源重建（本表裁定口径兑现）；pal_match 过滤门 × 静态行绑定（DSL 无按名派发通道）；Enter/方向键 = 键盘 ext 域差异 |
| quick_switcher | 组件挂载（唯一路径） | **β 变体 desktop 自持**：Ctrl+K 入口；sw_collect/sw_filter 部署副本（入参形状适配 ft_nodes）+ 行点击开页 + 随开页自闭 |
| properties_panel | 组件挂载（唯一路径） | **划批次 2**：P-9 map 键值迭代 VM 零迭代（本表预判复证）——配对列表通道需 backend/编译器面，出 079 affects |
| recent_files_panel | 组件挂载（唯一路径） | **β 装配**：desktop 会话自记账（recordRecent no-op 偏差的装配侧补偿——去重前插 cap10）+ rf_rows 副本；时间列（openedAt/formatTime）= Date/locale TS 域差异，持久化（web localStorage）差异登记 |
| create_page_prompt | 组件挂载（唯一路径） | **β 变体 desktop 自持（改道）**：文件菜单「新建页面」→ 标题输入 + Create → create_file 真建页——**后端 outlinks exists 恒真**（linkgraph targetPage 裸标题 → is_some 恒 true，079 实勘）+ web cpp 本表外实证为孤儿组件（§6.3 在案），缺失出链触发分支双端死路；wikiTitleToPath regex 桥不镜像（直拼 ${title}.ad，fixture 域等价） |
| theme_popover | 组件挂载（唯一路径） | **β 变体 desktop 自持**：视图菜单主题面板（Light/Dark + theme_accents 逐字副本五 accent 行）；运行时应用 = AUTO_UI_THEME env 域差异（web = classList 即时） |
| flashcard_modal | 组件挂载可选 | **内联流维持**（Q-3 裁定：LoadCards/Grade 流已覆盖；延后批次 2） |
| workspace_opener | 内联流维持 | **零动作**（裁定兑现，OpenWs 流覆盖） |

> 图谱族四件（graph_view/graph_page/graph_sidebar·controls 挂载）= L3
> 批次 2，gated on auto-lang PLAN-661（2026-09-19 已 execution_done 待
> review——map 写修复/Slider/canvas 三表 onhit 在案）。gallery RC-C 六
> 占位（units.mjs placeholder 形态）+ ribbon Q-2 web-only 特有面裁定
> 落地见 072-inventory RC-C 行注记。
