# Plan: Auto DSL → Vue codegen 编译器 Backlog

> 状态：✅ **收工 CLOSED**（2026-08-12）。P0 全 13 项修复；P1 测试债回填（vue_capabilities 真实管线锁）；P2 高价值项全落地（v-show/try-catch/保留字治理/else-if/裸 return/store 表达力/v-html/Teleport/报错定位/check_symbol span），jade 侧规避随编译器自愈逐一回迁（gap 37 多参数、5.3c emit 多实参、gap 40 手写 .value、ext teleport/v-html 迁移）。**残留全部有稳定规避且无需求驱动，重开条件=出现实际需求方**：P2 niche（Map/Set=11、$patch=14、正则字面量=5、scoped slot、model 初值 ext 调用=16、prop 类型透传=43/48、shadcn 过度映射=38、关键字 prop=53、保留字换名=18/29/34、code/svg 降级=31、text Call=46、import 常量 computed=28、quoted v-model payload=41、on* prop 名=51、key 启发式告警=39 剩余、空 style 块=42）；P3 长尾（双重 src 镜像=32/50/55、pac.at 版本分隔符=49、反斜杠四倍=35 等）；**唯一 🔲 缺陷** = cap_vmodel_fold master 回归（P1 表 #5，master 侧 pre-existing，与本计划批次无关）。
> 来源：plan 011（Jade-Garden Auto 化）全程实证，55 条编译器缺口/陷阱记录在 `jade-garden/front/auto/README.md`（编号 1-16 为 store 模式，17-55 为 widget 批次；另含 editor 包 plan 010 期间已记录的 D1-D3 旧 bug）。
> 执行对象：auto-lang（`D:/autostack/auto-lang`，`crates/auto-lang/src/ui_gen/vue.rs`）。本文件只做优先级梳理与修复方向建议，不涉实现排期。
> 标注说明：gap 编号 = README 编号；✅ DONE = 已在 5.0b/c2779bc8 修复，仅留档。

## 优先级定义

- **P0 静默失败类**：编译产物静默出错（无告警、vue-tsc 甚至能过），运行期行为错误。最危险，jade 全程靠 e2e + 截图 + 人工 grep 兜底。
- **P1 假绿/测试缺口类**：编译器自测通过但真实路径坏，或关键路径无测试。
- **P2 表达力缺口类**：DSL 表达不了，但已有稳定规避（ext 层 / facade / mapper 预计算）。
- **P3 体验类**：报错定位、告警质量、生成流程的坑。

---

## P0 静默失败类（全部 10 项已修 + 后续新发现 2 项待修）

| # | gap | 现象 | 状态 |
|---|---|---|---|
| 1 | 30 | view 子节点之间误写逗号 → 静默多发射空 `<div />` 间隔元素，无任何告警 | ✅ DONE（批次 A，be17713e）：codegen 跳过 + R008 告警 |
| 2 | 20 | 普通元素上的动态 `class:` 表达式被静默丢弃（`span { class: ol.x }` → `<span/>`） | ✅ DONE（批次 A）：真支持 `:class` 绑定（含三元、与 style: 合并） |
| 3 | 9a | 多 store 项目每次 build 只发射**最后编译的那个 .at** 的 store（STORE_EXTRA_FILES 线程局部每文件清空） | ✅ DONE：全量路径上游 a96d4da2（plan 043）；增量路径批次 B（94fc2d3e）补完 |
| 4 | 9b | 增量扫描路径对 parse 失败**完全静默**（连 Warning 都没有）；非增量路径有 Warning 但不 fail、留 stale SFC | ✅ DONE（批次 B）：5 处统一为 `Warning: Failed to compile`（与 fresh 同字符串），`--strict` 非零退出 |
| 5 | 2 | store codegen 对不含 `all_tags` 的 store 硬编码注入引用 `notes.value` 的 getter（015-notes 专用 hack）→ TS2304 | ✅ DONE（批次 B）：hack 删除，jade/015 占位仍合法（不必要） |
| 6 | 44 | computed 体内引用其他 computed 不解包 ref → 裸 ref 恒真，条件静默失效，无告警 | ✅ DONE（批次 A）：自动解包 + 手写 `.value` 幂等守卫 |
| 7 | 45 | `expose {}` 不标记**带参** handler 为 used → handler 不生成，引用处静默退化为裸名，命中 `window.open` 全局 | ✅ DONE（批次 A）：expose 按 base pattern 计入 used + R009 告警兜底 |
| 8 | 19 | `.remove(x)` 被映射为 `.splice(x, 1)`（**任意接收者**）——与 `.contains`→`.includes` 同类 | ✅ DONE（批次 A）：类型门控映射，facade/composable 接收者透传 + R010 Info |
| 9 | 47 | `.x != null` 编译为 `!== undefined` —— 父组件显式传 null 时语义反转，静默错误 | ✅ DONE（批次 A）：补 `Expr::Null` arm + 松散 `!= null` 语义 |
| 10 | — | ✅ DONE（5.0b f6f0c059）：widget 内 slot outlet 缺失，`slot` 被静默编译成 `<div/>`、子内容被吞且无告警（含无 outlet 却传子内容时的告警，033 实证） | — |
| 11 | — | `label`/`select` 元素静态 `class:` 在 shadcn 路径静默丢弃（plan 337 drift guard 注册 Label 副作用，jade regen 实证抓出，e2e 未捕获） | ✅ DONE（280e50c2）：push_native_classes + R011 告警；**遗留也已清**（批次 D，63569c34）：match 后 choke point 统一补发，133 个从不看 class 的分支全部转发（仅 ~41 个经 DSL tag 可达，choke point 防御未来派发拓宽） |
| 12 | — | `oninput: .H({ q: .query })` 中**状态字段**作 map 字面量实参 → 发射 `this.query`（Vue 3 模板表达式中 `this` 无效，静默运行期错误；批次 C 探针发现，生产实证模式用循环变量故未踩） | ✅ DONE（批次 D，63569c34）：`vue_event_param()` 任意标识符位剥离 `this.`（map 值/嵌套调用/全局监听），3 个先红后绿测试 |
| 13 | — | `class:` 三种坏形式（jade 清理批次探针发现，2026-08-07）：① 同元素第二个 `class:` **静默覆盖**静态 class（无告警）；② map 形式键不引号化 → 输出语法错误；③ `+` 拼接与数组形式发射 `null` | ✅ DONE（a59ffdce）：① aura/extract 合并为数组绑定；② js_obj_key 引号化；③ Expr::If 臂 + R011 响亮拒绝兜底；shadcn choke point 自动继承。**follow-up（P3）**：`expr_to_vue_bound_value` 的 `_ => "null"` 兜底未动，`style:` 臂与数组元素级不支持形式仍可能静默带 null——后续改 Err + 逐调用点接警告 |

## P1 假绿/测试缺口类

| # | gap | 现象 | 修复方向 |
|---|---|---|---|
| 1 | — | ✅ DONE：内建 overlay 的 `v-model:open` 被静默丢弃（`extract_state_ref` vue.rs:8231 只认裸 Ident），相关单测是**手构 AST** 才过的假绿——真实 parse 路径从未覆盖 | auto-lang 5.0b（f6f0c059）：修复 + `"update:modelValue"` 契约；教训：ui_gen 测试必须走真实 parse 管线 |
| 2 | 32 附注 | gen 脚手架 vue-tsc build 失败曾被"SFC 已先行发射"掩盖（batch 1/2 的 ext 在 gen 侧全灭未被发现）——codegen 产物发射与 gen 工程类型检查之间无门 | ✅ 已核实无需修（批次 B）：gen `build` 脚本 = `vue-tsc && vite build`，npm 失败已传播为 `auto build` 非零退出 |
| 3 | 9b 衍生 | 增量编译路径（含 store 逐文件 build 流程）无任何自动化测试，jade 侧靠人工核对输出行 | ✅ DONE（批次 B）：`incremental_compile_changed` 抽出 + 2 个增量集成测试（多 store 发射、parse 失败语义，含反向对照） |
| 4 | — | README 中大量"实证可用"能力（`.finally`、闭包实参回写、多语句闭包、style_obj 混合值等）只在 jade/editor 两个下游项目验证，编译器仓内无对应单测，回归无保护 | ✅ DONE（批次 C）：`tests/vue_capabilities.rs` 16 条真实管线片段断言锁（递归自引用、.window 监听清理、可选 prop 默认值、小写 emit 双侧、v-model 折叠、style_obj 混合值等）；同时 17 个手构 AST 测试转真实管线，假绿发现 0 |
| 5 | — | **cap_vmodel_fold 在 master 确定性失败**（63569c34 之后某提交引入）：v-model 折叠同时发射 `v-model` 和 `@input`（应只发 v-model）。P2 批次在干净树复跑 4/4 全红确认 pre-existing，疑似 plan 399/ash-gui 期间回归 | 🔲 OPEN（master 侧，待排查）；这正是批次 C 能力锁的设计目的——抓到即修 |

## P2 表达力缺口类（有稳定规避）

按主题分组，gap 编号见 README。

> **已落地（c5b5fecf，2026-08-08）**：v-show（52 → `show:` prop）、try/catch/finally（4 → 语言级支持 + 修复 Vue 路径静默丢弃）、保留字治理（18/27/29/34/43/53 → link/task 标识符化、关键字 prop 键、map 类型、path 测试锁定；残留：裸 link/task 作 view 子节点仍是元素语义，文档化）。下表中这些行仅作历史留档。

### 控制流 / 错误处理

| gap | 缺口 | 规避 |
|---|---|---|
| 4 | 无 try/catch/finally | ext safe 包装（catch→null / `{error:""}` map / RAW throw 三模式）；`.finally(()=>{})` 可复刻 finally |
| 6 | 无 early return | ✅ DONE（批次 F，56355c01）：裸 `return` 换行即终止（修复了下一条语句被静默吞为返回值的 P0 级陷阱，Plan 241 旧语义正式反转）；VM/ts_adapter 本已支持 |
| 54 | 无 v-else-if / v-else | ✅ DONE：master 本已实现（Plan 367 parser + Plan 043 M5 codegen 展平相邻链），批次 F（5b76d82d）补三分支/单 else/链内组合 3 个覆盖测试；互斥 v-if 规避可逐步淘汰 |
| 5 | 无正则字面量 | ext（stripExt 等） |

### 类型 / 数据结构

| gap | 缺口 | 规避 |
|---|---|---|
| 11 | 无 Map/Set | model 占位 + facade 顶层 `new Map()` + ext 原地 mutate |
| 1 | store msg payload 单类型（`Open(str,str)` 解析失败） | ✅ 已自愈（Plan 043 M5，`MsgDecl.payload: Vec<Type>`），批次 G（1694e109）配防回退测试；单 map payload 规避可逐步淘汰 |
| 17 | widget msg variant 不能带 payload 类型（与 store 规则相反，报错位置迷惑） | `msg Msg { X }` + handler 声明参数 |
| 10 | handler 无返回值 | ✅ 已自愈（批次 F 后通用语句层带值 return 直达 store handler，Pinia action 返回值合法），批次 G（b281ce4f）配防回退测试 |
| 12 | store 内无 watch | ✅ DONE（批次 G，0daa826a）：store 体支持 `watch {}` 块，codegen 在 composable 模块级发射 `watch(...)`（.immediate/.deep/多源），与 facade 手写法同构 |
| 14 | 无 `$patch` | facade 手工仿真用到的 key |
| 15 | store `var x map = {}` 初值发射 `ref(null)`（widget 侧同写法保留 `{}`，行为不一致） | ✅ DONE（批次 G，4d656863）：store 初值 Object 字面量如实发射（`ref({})`）；jade 唯一命中 graph_store settings，facade 赋真值兼容 |
| 16 | model 初值不能调 ext 函数 | facade 顶层赋值 |
| 43 | prop 类型名原样透传为 `@/lib/api` import；`map` 作 prop 类型发射损坏 import | 真实 TS interface 名 + 双侧 stub 同步 |
| 48 | `Array<User>` prop 类型发射 `any` 且不 import | 暂丢类型，等 codegen 支持 List<User> |
| 3 | store 唯一 import 通道是 `@/lib/api`（use 名单不校验真实存在） | 全部经 ext 中转 + sed 改写 + gen stub |

### 事件 / handler 调用

| gap | 缺口 | 规避 |
|---|---|---|
| 37 | view 事件实参不能写字面量；handler 多参数只有第一个进作用域（报错 span 错位） | ✅ 已迁移（2026-08-11）：37b 多参数自愈后，jade 16 处单 map 实参全部改回多参数直写（graph_controls ×11、properties_panel ×4、whiteboard_page ×1），6 个 handler 改多形参；emit 元组自动升 `[any, any]`，e2e 23/23。残留：bool 字面量实参仍不支持（37a 改响亮报错，int/str 可用） |
| 41 | quoted v-model emit 的 payload 是 handler 形参原样转发 | handler 体内给形参重新赋值发固定值 |
| —（5.3c 实证） | 组件 emit 多实参只接通第一个 | ✅ 已迁移（2026-08-11）：机制=37b 多参数自愈 + quoted event 裸 handler 引用（Vue 传全部实参），editor_tab 的 open-wiki-link 从 prop 回调通道迁回 `on "open-wiki-link": .OpenWikiLink(title, block_id)`；ext `openWikiLinkFn` 闭包改直调 `openWikiLink`，EditorShell 不再做 openWikiLink 改名转发；auto-lang bcafc6f7 配守护测试 |
| 51 | `on*` 开头 prop 名被 view 解析当事件监听 → 小写塌陷错误接线 / 同名 TS2300 | ext stateful 单根 wrapper 改名回 `onXxx` |

### 视图 / 元素映射

| gap | 缺口 | 规避 |
|---|---|---|
| 52 | 无 v-show | `style_obj: { display: ... }` 复刻（可见 `''`/隐藏 `'none'`） |
| 27 | Teleport 无原生支持；`to:` 是关键字 token，dyn 块上误解析成垃圾子节点 | ✅ DONE：`to:` prop 解析已随保留字批次（c5b5fecf）修复；**批次 E3（f8acfb43）**：`teleport (to: "body")` 原生 → `<Teleport>`（含表达式 to、disabled、缺 to 发 R015）；ext BodyTeleport 可后续迁移删除 |
| 38 | shadcn 过度映射：无 class 的 input/button/textarea/checkbox 变 shadcn 组件丢绑定；select/option 无论有无 class 都映射 Select | dyn + 字符串标签；ext 函数式组件（RangeInput） |
| 53 | `type:` 等关键字 token prop 块内写法错解析成垃圾子节点 | 圆括号 prop 写法 `button (type: "button")` |
| 18/29/34 | 保留字 token 碰撞：循环变量/变量不能命名 `link`/`task`/`path`（prop 声明除外） | 换名（bl/tk/page_path） |
| 31 | `code`/`svg` 等不在元素表 → 静默降级 `<div>` | ext 函数式组件 + dyn |
| 46 | view text 不支持 Call 表达式 | ext mapper 预计算展示字段 |
| 22 | 无 v-html | ✅ DONE（批次 E2，c7034bf5）：`html:` prop 原生 → `v-html` + R014 冲突告警；ext 函数式组件 `h('div', { innerHTML })` 规避仍可工作，jade 可择机迁移 |
| 40 | watch 体内 model var 不能再写 `.value`；computed 作 watch 源相反要写 `.c.value` —— 规则靠口口相传 | ✅ 大部闭合（2026-08-11）：Plan 408 P4（7bd6d4e3）handler/watch 体内 ref 自动解包后，规则统一为"ref 上一律不写 `.value`"；jade 8 文件 20 处手写 `.value` 规避全部清除（其中 flashcard is_open boolean 型双重解包曾打断 regen）。残留：watch 源写法与模板/其它语境的细微差别仍靠惯例 |
| 28 | computed 指向 import 常量时被名字启发式误推断 `computed<number>` | ext 零参函数包装（Call 体发射 `computed<any>`） |
| —（5.0b 遗留） | 无 scoped slot（具名 slot 已通，作用域 slot 数据传递没有） | 目前无需求方，记录备查 |
| 39 + MainArea 决策 | 自动 `:key` 启发式（`item?.id ?? item` / 索引 `idx?.id`）不看元素类型，item 无 id 字段时发常量 key 或 TS2339 | ✅ 显式 `key:` prop 已通（auto-lang c2779bc8，example 035）；剩余：无显式 key 时的启发式仍危险，建议告警 |
| 42 剩余 | codegen 总追加空 `<style>` 块（scoped style 已由 `style {}` 块解决，027-native-css） | 无害，美观问题 |

## P3 体验类

| gap | 现象 | 建议 |
|---|---|---|
| 17/37/46/53 | parse 报错位置严重错位（报在 view 收尾 `}`、循环收尾、附近注释），排错靠经验 | ✅ 大部落地（报错定位专项，2026-08-11）：gap 17/18/29/34/37b/46 经保留字治理等批次**已自愈**并配防回退测试；37a 实质修复（c6e59f55：parse_event_arg 静默空转改响亮报错 + **error-limit 丢弃根因的共性机制**——超限不再只报收尾派生错误）；**Plan 410（4e7d274c）**：check_symbol UndefinedVariable span 指向表达式起始（立项 `docs/plans/410-check-symbol-error-span.md`，Phase 2 系统性表达式 span 留触发条件）。残留：错误恢复冲刷派生错误噪音（根因已排第一） |
| 30/31/44 等 | 大量静默降级无任何告警（本表 P0 的共性） | 引入 codegen warning 通道：所有"丢弃/降级/透传"行为统一告警，`--strict` 升级为错误 |
| — | `auto build -d` 路径处理：从错误目录运行会静默用错项目；jade 遗留地雷是 `auto run` 用占位覆盖真实 src（plan 011 5.0a 因此隔离） | 非项目目录硬失败；`auto run` 覆盖既有文件前要求确认/备份 |
| 32/50/55 | gen 工程双重 src（`src/src/...`）镜像：ext 相对上溯差一层、`cp -r` 已存在目标嵌套、组件接线改动后旧镜像 TS2724 | gen 侧用 tsconfig paths 别名替代物理镜像，消除双重 src |
| 49 | pac.at `npm_deps` 版本分隔符是 `@`，`:` 写法被整体当包名（ERR_PNPM_INVALID_DEPENDENCY_NAME） | 接受 `name:version` 或对非法包名前置校验报错 |
| 42 | 空 `<style>` 块总是追加 | 有 `style {}` 块时不再追加空块 |
| 35 | 属性字符串字面反斜杠需写四倍（`D:\\\\wiki`）才与 SFC 原始文本逐字一致 | 文档化或提供 raw string |
| 26 | ext 内嵌 Tailwind class 字符串不在 content 扫描路径（隐性依赖未翻译文件兜底） | 非编译器问题，已在 jade tailwind.config 修复；compiler 侧可在 ext 机制文档中提示 |

---

## 建议批次

P0/P1 归并为三个可独立交付的编译器工作批次（每批配 `examples/ui/` 最小示例 + 真实 parse 管线单测）：

**批次 A：静默发射防护（P0 #1/#2/#6/#7/#8/#9 + P3 告警通道）** ✅ DONE（be17713e）
warning 基础设施统一到 validators.rs（R008-R011 + `--strict`），六处静默错误全部修复（其中动态 `class:` 超预期做了真绑定支持）。jade 全量 regen 实证兼容，并借此抓出 P0#11（label class 主仓回归，280e50c2 修复）。

**批次 B：store 编译正确性（P0 #3/#4/#5 + P1 #2/#3）** ✅ DONE（94fc2d3e）
增量路径 store 聚合补完、失败语义统一（Warning + `--strict` 非零退出）、all_tags hack 删除；P1#2 核实现状已接入。jade 的"一次一个 store"流程已废（README 同步）。

**批次 C：测试债回填（P1 #1 已修教训 + #4）** ✅ DONE（1631fed1）
17 个手构 AST 测试转真实 parse 管线（0 假绿发现；顺手修了 1 个反向假红）；`tests/vue_capabilities.rs` 16 条能力回归锁（片段断言，免疫绝对路径 + HashMap 顺序两坑）。

**剩余建议**（新批次时再立）：P0#12（`this.query` map 实参）先写真实管线复现测试再修；P0#11 遗留的 ~130 个 shadcn 子组件 class 转发单独批次；P2 表达力缺口优先级最高的是 v-show（52）、try/catch（4）、保留字治理（18/27/29/34/53 一批同根）。
