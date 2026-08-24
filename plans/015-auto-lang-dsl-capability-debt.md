# Plan 015：Auto 语言 DSL 能力债消除

> 状态：Phase 0 完成（探针仲裁 5/5，REPORT 在 tmp/dsl-probes/plan015/）；
> Phase 1 批次 A/B 完成并已提交（CustomScrollbar 声明式重写 + 原名 emit
> 恢复，demo e2e 9/9；jade MainArea v-show 回迁，jade e2e 23/23）。
> 编译器修复已合并回 auto-lang master（`e332c4d3`，quoted msg variant
> on-block 调用净化 + used_handlers 注册）。
> **复审补记（2026-08-24）**：批次 B 复盘发现两处遗留并已修复——
> ① df880ac 误入无引用的 `CodeEditor.vue`（依赖未进 package.json，致
> jade vue-tsc 8 错）→ 已删除；② Phase 5.1 起 fileTree/blocks 两 store 的
> `?str` 占位类型（DSL 无 Map/Set 标注，facade 注入真值）在 ext 签名处
> 类型冲突 → ext 侧按运行时形态收宽（instanceof 分流，行为不变）。
> 修复后 jade vue-tsc build + e2e 23/23 全绿。
> **批次 C 销号（2026-08-24）**：核验 key 规避/空 handler/手写 `.value`
> 三类回迁对象——源内实际残留为零（012 自愈 + 批次 A/B 已消化），仅存
> 注释级历史记录，无需执行。
> **Phase 2 完成（2026-08-24，auto-lang 分支 plan-015-p0 @ 44afea19，
> 待 auto-lang 侧合并 master）**：P0 三件套落地——①`auto build` 默认
> strict（`--lenient` 逃生门），暴露并清掉三仓存量 R006 共 16 处
> （jade 12 + editor 4，全部为 v-for 补显式 key）；②stale SFC 清理
> （UICache 认领制，auto run 增量路径；三仓 gen 树中 df880ac 遗留的
> CodeEditor.vue 孤儿已手工清除；build 全量路径的 cache 集成为已知边界
> → DEBTS.md）；③确定性发射：aura Widget.handlers HashMap→BTreeMap +
> vue.rs props/events 迭代 12 处排序 + stub 循环排序（gap 56 销号）；
> 附带修复 R005 对 quoted event 键名的误报。验收全绿：auto-lang
> 3129/3129、三仓 regen 两连跑逐字节一致（jade/demo 全流程、editor
> gen-only）、jade e2e 23/23、demo e2e 9/9（1 例浏览器启动超时为环境
> flake，单跑通过）。
> **Phase 3 批次（2026-08-24，auto-lang 分支 plan-015-p0 @ 690abfc2）**：
> P1 #4-#7 完成——#4 msg handler 全发射（函数+defineEmits 去 used 门，
> ext 调用 handler 不再静默丢，inert @scroll 诱饵根因消除）；#5 view 事件
> 实参 bool/float 字面量（.HoverChange(true)）；#6 defineEmits 完整 payload
> 元组（不再截断首类型）；#7 let x = nil 局部变量 .contains/.remove 不再
> 误映射（null_init_locals 追踪）。每项配 cap_* 测试。**#8（保留字撞名
> 响亮报错）设计已定（validator 路线）未实现，剩余继续**。附带发现登记
> （→ DEBTS.md）：顶层裸兄弟元素+带参事件的组合在 master 即解析失败
> （col 内正常），与 #5 邻接的预存缺陷。验证：lib 3129/3129 +
> capabilities 53/54（唯一失败为 012 遗留 cap_vmodel_fold master 回归，
> 预存）；三仓 regen gen 树 vue-tsc 全绿（editor gen 树顺带清除 shadcn
> 残留 ui/ 目录）。
> 剩余：~~Phase 3 的 #8~~、~~Phase 4（P2/P3 立项登记）~~——均已收口
> （2026-08-24 续：#8 落地为 R016 + 顶层裸兄弟 parser 缺陷修复，在
> auto-lang worktree `auto-down` 分支待合并；Phase 4 登记见下）。
> 当前唯一在途项：PLAN-037 defineModel 语义变更的三仓 regen 验证
> （见 Phase 4 末尾），完成后本计划可 CLOSED。
> **PLAN-037 验证结果（2026-08-24）：阻断，产物不采用**——
> ①TS2440（defineModel 编译宏被生成 import，与 Volar shim 冲突）
> **已修**（auto-lang worktree `auto-down` 分支：不再 import
> defineModel + needs_ref 收窄防 TS6133 + a2vue golden 8 例更新，
> editor regen 后 vue-tsc --force 绿）；②深 mutation 响应性断裂
> （defineModel 未绑定态 get 返回裸 localValue，`doc.value.shapes
> .push()` 不触发 computed，jade e2e 白板红 22/23）**未修，上报
> auto-lang 侧**——正确修法需 T5 channel 绑定信息收窄 T4 降级范围，
> 属 roadmap 语义决策。三仓部署文件已全部回退 HEAD（editor/jade
> vue-tsc 绿，基线 e2e 不受影响）。详证见 DEBTS.md 015 阻断行。
> 调研来源：demo/editor/jade 三份 auto README 的 gotchas 全量盘点 +
> plans/010-014 workaround 记录 + auto-lang master（c8ae053a）代码现状核对。

## 背景

plans/010-014 把 editor 内核、jade-garden front、demo app 迁到 Auto widget
DSL 的过程中，积累了约 40 条 DSL 缺口记录，每条都对应一处 workaround
（ext 绕路、命令式逃生舱、噪声 emit、代码重复）。本次调研的重大发现：
**其中一批"缺口"已被后续 auto-lang 版本原生支持，但 workaround 仍在役**
（README 记述互相矛盾）——所以本计划分两条线：

- **回迁线**（不动编译器）：用已有能力退役 workaround；
- **编译器线**（auto-lang worktree 开发，合并回 master 由 auto-lang 侧
  agent 处理）：修真实缺口。

## 一、已核实"早已原生支持"的能力（记述过时，可直接回迁）

auto-lang master 代码实证：

| 能力 | 现状证据 | 在役 workaround（可退役对象） |
| --- | --- | --- |
| emit 字面量名（quoted msg variant `"update:scrollTop"`） | ✅ parser.rs:12462 `quoted` 标记；vue.rs:2331 恒声明、2490 恒尾 emit；`cap_quoted_emit_*` 锁定 | CustomScrollbar 的 `UpdateScrollTop`/`HoverChange` 改名（demo README 接口差异表整体可回退） |
| `:style` 对象绑定（`style_obj: { top: expr, "z-index": 50 }`） | ✅ parser.rs:13161 StyleBinding；vue.rs:5482 `style_obj_to_vue` | CustomScrollbar 的 thumbEl 命令式几何（含 scrollHeight 陈旧残留 bug） |
| widget 级 `watch`（多源、`.immediate`/`.deep`） | ✅ parser.rs:11670/11877；vue.rs:2383-2413 | CustomScrollbar 的 window scroll 捕获代替 watch；demo 的"DSL 无 watch"记述 |
| v-show（`show:`） | ✅ plan 013 Phase 1 落地（editor README） | jade MainArea 的 `style_obj: { display }` keep-alive 复刻（gap 52 可消除） |
| 显式 `key:` 覆盖自动 `:key` | ✅ jade 5.3a 实证（c2779bc8） | 部分 `item?.id ?? item` 规避 |

## 二、仍有效的真实缺口（编译器线候选）

按杠杆分级（出处略写，详表见三份 README）：

### P0 工程化（最危险，静默失败类）

1. **`auto build` 对 widget parse 错误不 fail**：只打 Warning、留陈旧 SFC
   后报成功（`--strict` 才 fail）。所有 regen 流程靠人工 grep warning
   兜底。→ 建议：widget 场景默认 strict 或失败时非零退出码。
2. **regen 不清理重命名/删除的旧产物**：stale SFC 继续参与 vue-tsc 门禁
   （咬过 AutoDownEditorInner 改名）。→ build 前清空组件输出目录或
   产物清单 diff。
3. **发射顺序跨 build 不稳定**（HashMap 迭代序，jade gap 56）：同批
   regen 产物有顺序 churn，diff 噪声大、"以最后一次 build 为准"的部署
   纪律脆弱。→ 关键集合换 BTreeMap/IndexMap，产出确定性。

### P1 高杠杆（消除大片 workaround）

4. **未被 view 事件引用的 msg handler 不发射** → inert `@scroll` 绑定
   （demo）、共享逻辑整块复制（jade 多处）。→ used_handlers 过滤改为
   全发射或显式 `private` 标记反向过滤。
5. **view 事件实参不能写字面量**（`.HoverChange(true)` 解析失败）→ int
   1/0 代替 bool、map 归一化。→ parser 放行字面量实参（gap 37a 已改
   响亮报错，补支持）。
6. **多类型 payload 的 emit 元组截断**：msg variant 声明 `(str, int)`
   时 defineEmits 只取第一个（vue.rs:2281），实参却全转发 → TS 报错
   隐患。→ 元组升级为全部 payload 类型。
7. **`.contains`/`.remove` 方法名误映射残留**：typed_arrays/typed_strings
   门控后仍误伤 null 初值局部变量（plan 013 批次 1 试迁回退）。→ 门控
   条件补"已知非集合类型"分支或局部变量类型追踪。
8. **保留字/关键字撞名类**（6 例：view/link/task/path/`type:`/`as:`/
   `to:`）→ bracket 写法、圆括号 prop 形式规避。→ parser 上下文敏感化
   或统一响亮报错。

### P2 类型系统

9. **widget prop 类型透传损坏**：`map` 发损坏 import、`Array<User>` 发
   `any` 丢类型（gap 43/48）。
10. **生成 SFC 不能导出类型** → `SlashItem` 等 interface 永留手写文件。
11. **widget msg variant 不能带 payload 类型 vs store 必须带且只能一个**
    ——两边规则相反（gap 17），统一之。

### P3 长尾（有稳定规避，按需）

12. 全局 style 通道（`style {}` 只出 scoped，vue.rs:1756 双槽无 DSL
    入口）→ demo app.css 抽取可回迁。
13. DSL 元素表不全（`code`/`ul`/`li`/`svg`/`select` 降级 div/shadcn）。
14. `?.` 在 Auto 是错误传播语法、无 JS 可选链语义；`??` 在模板绑定
    路径不支持（R013 fallback）。
15. check_symbol span：表达式节点不带 span，extract/codegen 阶段报错
    无法定位源码行列。
16. shadcn 过度映射（`select`/`option` 无条件映射，丢 min/max/step）。
17. view text/attr 不支持 Call 表达式（gap 46）；computed 指 import 常量
    误推 `computed<number>`（gap 28）。
18. 杂项语法：无正则字面量、无 early return、无 `+=`、无多行模板
    字符串、无 Map/Set、model 初值不能调 ext 函数。
19. jade 双重 src 镜像（gap 32/50/55）：ext 相对路径在 gen 树解析错位。

### 明确不修（设计性边界）

- 三元条件 `==/!= ""` 坍缩为 `!`/`!!`（PLAN-026 故意语义）。
- composable 导入零参限制（bridge 模式已是惯例，改动面过大）。
- import 通道封闭（ext/dual-resolution 是政策，非缺陷）。
- ~~cap_vmodel_fold master 回归~~ —— 已在 plan-015-p0 轮自愈（现绿）。

## 三、需探针仲裁的记述冲突 —— 已仲裁（Phase 0 结论）

1. 空 handler 体 `-> {}` —— **可解析**（editor 对；demo gotcha 4 过时）。
2. computed/handler/watch 体内 computed ref `.value` —— **全自动解包**
   （editor note 6 / jade gap 40 过时，残留手写 `.value` 可试回迁）。
3. 显式 `key:` **抑制**自动 `:key`（jade 5.3a 对；editor note 7 过时）。
   附带发现新 quirk：v-for 内裸 handler 引用会被传入循环变量而非
   `$event` —— 接线一律用 `.Handler($event)` 显式形式。
4. widget 可选 prop 默认值 —— **withDefaults 原生**（`?str = None` →
   `string | null` 默认 null）；demo `visible` required 限制可消除。
5. quoted v-model payload —— **gap 41 仍有效**（需 on-block handler +
   体内重赋值）；恶化发现：无 on-block handler 时生成无 emit 的 TODO
   stub，v-model 静默断裂（并入 P0#1 静默失败类）。

## Phase 0：探针仲裁（tmp/dsl-probes/plan015/，gitignored）—— ✅ 完成

结论见上方第三节回填与 `tmp/dsl-probes/plan015/REPORT.md`。

## Phase 1：workaround 回迁批次（零编译器改动）

按 Phase 0 结论执行，每批独立 e2e 门禁：

1. **批次 A（demo CustomScrollbar 声明式重写）**：quoted msg variant 恢复
   `update:scrollTop`/`hover-change` 原名；`watch` + `style_obj:` 替代
   SyncThumb 命令式几何（消除 scrollHeight 陈旧残留 bug）；可选 prop
   恢复 `visible` optional。门禁：demo e2e 9/9 + 与原手写版 diff 仅
   注释/顺序级。
2. **批次 B（jade MainArea v-show 回迁）**：`show:` 替代 display hack。
   门禁：jade e2e 基线。
3. **批次 C（依探针结论追加）**：key: 抑制确认后清理 `item?.id ?? item`
   规避；空 handler 体确认后清理 no-op；等。

## Phase 2：编译器 P0 工程化批次（auto-lang worktree）

1. `auto build` widget parse 错误默认 fail（非零退出码 + 响亮汇总）。
2. build 前清理/校验组件输出目录（stale SFC 不再混入门禁）。
3. 关键 HashMap → BTreeMap 确定性发射（至少覆盖组件属性/事件/handler
   声明顺序三处 churn 源）。
验收：auto-lang 全量测试不新增失败；demo/editor/jade 三处 regen 两次
连跑产物逐字节一致。

## Phase 3：编译器 P1 批次（auto-lang worktree）

按第二节 4→8 顺序逐项：探针复现 → 修复 → `cap_*` 能力测试锁定 →
三仓 regen 验证 → 对应 workaround 回迁（inert @scroll、map 归一化、
bracket 写法等）。每项独立提交。

## Phase 4：P2/P3 立项登记（不展开实施）

P2 #9-11 与 P3 #12-19 逐条登记如下；统一重开条件 = 出现实际需求方
（新组件/新功能被缺口卡住且无低成本规避）。台账汇总行在
`DEBTS.md` 的 012 行（P2 niche + P3 长尾均有稳定规避）。

| # | 条目 | 现状规避 | 重开信号 |
| --- | --- | --- | --- |
| 9 | prop 类型透传损坏（`map` 坏 import、`Array<User>` 丢类型） | 真实 TS interface 名 + 双侧 stub | 组件需要精确 prop 类型契约 |
| 10 | SFC 不能导出类型 | interface 留手写 ext 文件 | 跨包复用组件类型 |
| 11 | widget/store msg payload 规则相反（gap 17） | 文档化 | store/widget 统一重构时 |
| 12 | 全局 style 通道（只出 scoped） | demo app.css 手写 | 第二个需要全局样式的根组件 |
| 13 | 元素表不全（code/ul/li/svg/select） | `dyn` + ext 函数式组件 | 富文本/表单密集 UI |
| 14 | 无 JS 可选链 `?.`；`??` 模板绑定不支持 | ext mapper / 命名 computed | 深层可选字段访问增多 |
| 15 | check_symbol span（表达式无定位） | —— | 编译器报错体验专项 |
| 16 | shadcn 过度映射（select/option 丢原生属性） | dyn + ext | 原生表单控件需求 |
| 17 | view text/attr 无 Call；computed 指 import 常量误推 number | ext mapper 预计算 | 展示逻辑复杂化 |
| 18 | 无正则/early return/`+=`/多行模板串/Map-Set/model 初值调 ext | ext/facade | 对应语法真实需求 |
| 19 | jade 双重 src 镜像 | regen.sh 双层 cp | gen 树布局调整时 |

PLAN-037 联动项（非本计划修复对象，登记跟踪）：widget model var 自
auto-lang PLAN-037 T4（c696a729，08-22 并入 master）起无条件降
`defineModel`——`cap_widget_map_model_init`（jade 5.3d 的 `ref<any>({})`
契约）因此在 master 红。含义变化：每个 widget 的 model var 都新增同名
prop + `update:x` emit，且 `{}` 默认值存在跨实例共享风险。处置：三仓用
master 二进制 regen 验证（vue-tsc + e2e）后按新契约改写该能力测试，或
向 auto-lang 侧反馈收窄。**这是三仓下次 regen 的前置闸门。**

cap_vmodel_fold 的 master 回归已在 plan-015-p0 轮自愈（现绿），从挂账
移除。

## 验收

- 三仓（demo/editor/jade）e2e 全绿，vue-tsc 无新增错误；
- 每条回迁/修复在三份 README 的 gotchas 清单中销号（标 RETIRED +
  修复出处）；
- auto-lang 侧每批次合并回 master 后，用 master 二进制重跑三仓 regen
  确认一致。

## 风险

- 记述冲突的仲裁结论可能推翻部分回迁假设 → Phase 0 先行正是为此。
- HashMap→BTreeMap 可能改变既有快照/测试的输出顺序 → 伴随更新锁定测试。
- P1#4（handler 全发射）会改变所有既有 SFC 的 defineEmits 面 → 需要
  三仓同步 regen 窗口，避免中间态。
