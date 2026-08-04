# Plan: Auto DSL → Vue codegen 编译器 Backlog

> 状态：📋 待启动（backlog 梳理完成，三批修复建议未排期；执行在 auto-lang，建议沿用 worktree 模式）。
> 来源：plan 011（Jade-Garden Auto 化）全程实证，55 条编译器缺口/陷阱记录在 `jade-garden/front/auto/README.md`（编号 1-16 为 store 模式，17-55 为 widget 批次；另含 editor 包 plan 010 期间已记录的 D1-D3 旧 bug）。
> 执行对象：auto-lang（`D:/autostack/auto-lang`，`crates/auto-lang/src/ui_gen/vue.rs`）。本文件只做优先级梳理与修复方向建议，不涉实现排期。
> 标注说明：gap 编号 = README 编号；✅ DONE = 已在 5.0b/c2779bc8 修复，仅留档。

## 优先级定义

- **P0 静默失败类**：编译产物静默出错（无告警、vue-tsc 甚至能过），运行期行为错误。最危险，jade 全程靠 e2e + 截图 + 人工 grep 兜底。
- **P1 假绿/测试缺口类**：编译器自测通过但真实路径坏，或关键路径无测试。
- **P2 表达力缺口类**：DSL 表达不了，但已有稳定规避（ext 层 / facade / mapper 预计算）。
- **P3 体验类**：报错定位、告警质量、生成流程的坑。

---

## P0 静默失败类（未修 9 项 + 已修 1 项）

| # | gap | 现象 | 现有规避 | 修复方向 |
|---|---|---|---|---|
| 1 | 30 | view 子节点之间误写逗号 → 静默多发射空 `<div />` 间隔元素，无任何告警 | 规则约定 + 生成后 `grep "<div />"` | parser 对子节点位置的逗号报错或告警；或生成器对空 div 间隔告警 |
| 2 | 20 | 普通元素上的动态 `class:` 表达式被静默丢弃（`span { class: ol.x }` → `<span/>`） | `style:` prop 三元 hack（Plan 346）或 quoted-key style map | codegen 对无法处理的 `class:` 非字面量值告警；长期支持 `:class` 动态绑定 |
| 3 | 9a | 多 store 项目每次 build 只发射**最后编译的那个 .at** 的 store（STORE_EXTRA_FILES 线程局部每文件清空） | 一次只留一个 `*_store.at`，逐文件 build | STORE_EXTRA_FILES 跨文件累积，或在多 store 检出时聚合发射 |
| 4 | 9b | 增量扫描路径对 parse 失败**完全静默**（连 Warning 都没有）；非增量路径有 Warning 但不 fail、留 stale SFC | 人工检查输出有无 `✓ Store composable:` 行 | 增量/非增量统一：parse 失败打 Warning 且 build 返回非零（或 `--strict` 开关） |
| 5 | 2 | store codegen 对不含 `all_tags` 的 store 硬编码注入引用 `notes.value` 的 getter（015-notes 专用 hack）→ TS2304 | store 里声明占位 `all_tags => []` | 删除该 hack 或改为按模板显式 opt-in |
| 6 | 44 | computed 体内引用其他 computed 不解包 ref → 裸 ref 恒真，条件静默失效，无告警（`.is_expanded` 发射成 `is_expanded` 而非 `is_expanded.value`） | 手写 `.value` 后缀 | codegen 在 script 表达式里对 computed ref 自动解包（与模板侧一致），或对裸 ref 出现在布尔位置告警 |
| 7 | 45 | `expose {}` 不标记**带参** handler 为 used → handler 不生成，引用处静默退化为裸名，命中 `window.open` 全局，**vue-tsc 不报错**，运行期完全错误 | quoted msg variant + 永假 v-if 守卫元素强行引用 | used_handlers 把 expose 条目（含带参、quoted 名）计入 used；quoted 名与 on 块 pattern 对齐 |
| 8 | 19 | `.remove(x)` 被映射为 `.splice(x, 1)`（**任意接收者**，包括 store facade）——与 `.contains`→`.includes` 同类 | ext 帮手中转 | 方法映射只对已证明为数组的接收者生效；其他接收者透传或告警 |
| 9 | 47 | `.x != null` 编译为 `!== undefined` —— 父组件显式传 null 时语义反转，静默错误 | ext 真值守卫函数 | DSL `null` 映射同时覆盖 null/undefined（`x != null` 语义），或提供 `?.`/`is none` 原语 |
| 10 | — | ✅ DONE：widget 内 slot outlet 缺失，`slot` 被静默编译成 `<div/>`、子内容被吞且无告警 | — | auto-lang 5.0b（f6f0c059 = 17627f1a + 集成合并 9926ab47）：`slot`/`slot(name:)` outlet + 父侧具名 slot；剩余项：无 outlet 却传子内容时应告警（见 P3） |

## P1 假绿/测试缺口类

| # | gap | 现象 | 修复方向 |
|---|---|---|---|
| 1 | — | ✅ DONE：内建 overlay 的 `v-model:open` 被静默丢弃（`extract_state_ref` vue.rs:8231 只认裸 Ident），相关单测是**手构 AST** 才过的假绿——真实 parse 路径从未覆盖 | auto-lang 5.0b（f6f0c059）：修复 + `"update:modelValue"` 契约；教训：ui_gen 测试必须走真实 parse 管线 |
| 2 | 32 附注 | gen 脚手架 vue-tsc build 失败曾被"SFC 已先行发射"掩盖（batch 1/2 的 ext 在 gen 侧全灭未被发现）——codegen 产物发射与 gen 工程类型检查之间无门 | `auto build` 把 gen 侧 vue-tsc 失败作为 build 失败；或至少把 gen build 状态显式打印 |
| 3 | 9b 衍生 | 增量编译路径（含 store 逐文件 build 流程）无任何自动化测试，jade 侧靠人工核对输出行 | auto-lang 侧为增量路径补集成测试：parse 失败、多 store、stale SFC 三个场景 |
| 4 | — | README 中大量"实证可用"能力（`.finally`、闭包实参回写、多语句闭包、style_obj 混合值等）只在 jade/editor 两个下游项目验证，编译器仓内无对应单测，回归无保护 | 把下游实证的用法回写成 `examples/ui/` 最小示例 + codegen 快照测试 |

## P2 表达力缺口类（有稳定规避）

按主题分组，gap 编号见 README。

### 控制流 / 错误处理

| gap | 缺口 | 规避 |
|---|---|---|
| 4 | 无 try/catch/finally | ext safe 包装（catch→null / `{error:""}` map / RAW throw 三模式）；`.finally(()=>{})` 可复刻 finally |
| 6 | 无 early return | if 守卫反转 |
| 54 | 无 v-else-if / v-else | 互斥 v-if + ext 守卫 computed |
| 5 | 无正则字面量 | ext（stripExt 等） |

### 类型 / 数据结构

| gap | 缺口 | 规避 |
|---|---|---|
| 11 | 无 Map/Set | model 占位 + facade 顶层 `new Map()` + ext 原地 mutate |
| 1 | store msg payload 单类型（`Open(str,str)` 解析失败） | 单 map payload + facade 参数归一 |
| 17 | widget msg variant 不能带 payload 类型（与 store 规则相反，报错位置迷惑） | `msg Msg { X }` + handler 声明参数 |
| 10 | handler 无返回值 | 带返回值方法放 facade/ext，直读写生成 store 的 state ref |
| 12 | store 内无 watch | facade 模块顶层 `watch(...)` |
| 14 | 无 `$patch` | facade 手工仿真用到的 key |
| 15 | store `var x map = {}` 初值发射 `ref(null)`（widget 侧同写法保留 `{}`，行为不一致） | facade 赋真值 |
| 16 | model 初值不能调 ext 函数 | facade 顶层赋值 |
| 43 | prop 类型名原样透传为 `@/lib/api` import；`map` 作 prop 类型发射损坏 import | 真实 TS interface 名 + 双侧 stub 同步 |
| 48 | `Array<User>` prop 类型发射 `any` 且不 import | 暂丢类型，等 codegen 支持 List<User> |
| 3 | store 唯一 import 通道是 `@/lib/api`（use 名单不校验真实存在） | 全部经 ext 中转 + sed 改写 + gen stub |

### 事件 / handler 调用

| gap | 缺口 | 规避 |
|---|---|---|
| 37 | view 事件实参不能写字面量；handler 多参数只有第一个进作用域（报错 span 错位） | 单 map 实参 `.H({ entry: e, evt: $event })` |
| 41 | quoted v-model emit 的 payload 是 handler 形参原样转发 | handler 体内给形参重新赋值发固定值 |
| —（5.3c 实证） | 组件 emit 多实参只接通第一个 | 双实参走 prop 回调通道（`props.onX?.(a, b)`） |
| 51 | `on*` 开头 prop 名被 view 解析当事件监听 → 小写塌陷错误接线 / 同名 TS2300 | ext stateful 单根 wrapper 改名回 `onXxx` |

### 视图 / 元素映射

| gap | 缺口 | 规避 |
|---|---|---|
| 52 | 无 v-show | `style_obj: { display: ... }` 复刻（可见 `''`/隐藏 `'none'`） |
| 27 | Teleport 无原生支持；`to:` 是关键字 token，dyn 块上误解析成垃圾子节点 | BodyTeleport 函数式组件 + dyn |
| 38 | shadcn 过度映射：无 class 的 input/button/textarea/checkbox 变 shadcn 组件丢绑定；select/option 无论有无 class 都映射 Select | dyn + 字符串标签；ext 函数式组件（RangeInput） |
| 53 | `type:` 等关键字 token prop 块内写法错解析成垃圾子节点 | 圆括号 prop 写法 `button (type: "button")` |
| 18/29/34 | 保留字 token 碰撞：循环变量/变量不能命名 `link`/`task`/`path`（prop 声明除外） | 换名（bl/tk/page_path） |
| 31 | `code`/`svg` 等不在元素表 → 静默降级 `<div>` | ext 函数式组件 + dyn |
| 46 | view text 不支持 Call 表达式 | ext mapper 预计算展示字段 |
| 22 | 无 v-html | ext 函数式组件 `h('div', { innerHTML })` |
| 40 | watch 体内 model var 不能再写 `.value`；computed 作 watch 源相反要写 `.c.value` —— 规则靠口口相传 | 按 watch 源种类区分 |
| 28 | computed 指向 import 常量时被名字启发式误推断 `computed<number>` | ext 零参函数包装（Call 体发射 `computed<any>`） |
| —（5.0b 遗留） | 无 scoped slot（具名 slot 已通，作用域 slot 数据传递没有） | 目前无需求方，记录备查 |
| 39 + MainArea 决策 | 自动 `:key` 启发式（`item?.id ?? item` / 索引 `idx?.id`）不看元素类型，item 无 id 字段时发常量 key 或 TS2339 | ✅ 显式 `key:` prop 已通（auto-lang c2779bc8，example 035）；剩余：无显式 key 时的启发式仍危险，建议告警 |
| 42 剩余 | codegen 总追加空 `<style>` 块（scoped style 已由 `style {}` 块解决，027-native-css） | 无害，美观问题 |

## P3 体验类

| gap | 现象 | 建议 |
|---|---|---|
| 17/37/46/53 | parse 报错位置严重错位（报在 view 收尾 `}`、循环收尾、附近注释），排错靠经验 | parser 错误 span 绑定到真实 token |
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

**批次 A：静默发射防护（P0 #1/#2/#6/#7/#8/#9 + P3 告警通道）**
先建 codegen warning 基础设施，再把六处静默错误逐个改为告警或正确发射：逗号垃圾 div、动态 class 丢弃、computed 裸 ref、expose 带参 handler、`.remove` 误映射、`!= null` 语义。收益最大——jade/editor 下游全部规避代码可随告警出现而审计清理。

**批次 B：store 编译正确性（P0 #3/#4/#5 + P1 #2/#3）**
STORE_EXTRA_FILES 跨文件聚合、增量/非增量路径失败语义统一（Warning + 非零退出）、删除 all_tags 硬编码 hack、gen 侧 vue-tsc 状态接入 build 结果。直接消灭 jade"一次一个 store 逐文件 build"的 regen 流程。

**批次 C：测试债回填（P1 #1 已修教训 + #4）**
ui_gen 测试全部改走真实 parse 管线（禁手构 AST）；把 jade/editor 实证的 30+ 条"已验证能力"回写成 examples/ui 快照测试，锁定不再回归。

P2 表达力缺口不单独立项：优先级最高的是 v-show（52）、try/catch（4）、保留字治理（18/27/29/34/53 一批同根），可在批次 A/B 触到同一代码区域时顺手做。
