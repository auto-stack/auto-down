# Plan 016：统一块模型内核（block_model + serializer + 双端发射探针）

## Status: CLOSED

> 状态：**CLOSED（2026-08-25）**。Phase 0-4 全部完成，五项验收标准全过：
> 三源在册 vue-tsc 绿 ✓；操作快照测试（每操作 ≥3 例 + roundtrip）✓；
> parity 43 不破 + roundtrip 三层验收 ✓；a2r 探针 REPORT + crate 骨架 ✓；
> 三仓 regen 不受影响 ✓。
> Phase 4 产物：
> - **auto-lang a2r 发射器修复 8 组**（`trans/rust.rs` +315/-8，均以
>   "Plan 016" 注释）：R1 迭代变量跨函数泄漏清场、R4 owned List 实参
>   补 clone（is_owned_list_arg 全调用点）、unit 变体零参去括号、
>   import 签名全量注册基础设施、expr_contains_string 三扩、Dot-arg
>   move 分派（param_takes_ownership）、struct 字面量字段 move 补
>   clone、vec! 元素 move + 推断补强；全量回归 3172/0 + 342 个
>   .expected.rs golden 零改动（纯增量）。
> - **`autodown-core` crate 试点**：`packages/core/rust/`（零依赖独立
>   workspace），block_model + serializer 干净发射（cargo check 0 错，
>   从 35 错逐轮收敛）；`cargo test` 5/5（smoke 4 + parity 1）。
> - **TS/rust 双端对拍落地**：rust-parity-gen.test.ts 生成 golden +
>   parity.rs 逐字节比对，随 core `pnpm test` 常跑。
> - .at 源加 `pub` 注解（58+27 处，TS 侧零 diff 实证）；markdown_parser
>   不进 crate（RegExp/any 索引缺口）登记 plan 019 Phase 1。
> Phase 3 产物：
> - `serializer.at`（~350 行）：块树 → `.ad` 文本，`serialize(root,
>   emitIds)` / `serializeBlocks` 出口；只依赖 block_model（IAL 内置
>   `ialText` 复刻 `buildIAL` 有对拍），留在 Phase 4 a2r 无缺口子集。
> - roundtrip 三层验收全过：①语义等价 5 musk fixtures + 22 定向
>   （强树归一化对拍 + fixpoint 三轮）；②字节稳定（快照 + 二轮
>   serialize 逐字节相等）——S1 setext 多行 heading 保真回退已修，
>   S2 表格分隔行归一（`:---`）为风格登记项；③BlockId roundtrip：
>   `^anchor` 随文本保留，emitIds=true 追加 ` ^<id>` 重解析不漂移。
> - 扩展块（callout/details/wikilink/query/embed/mermaid/math）定向
>   构造序列化快照钉死（AutoDown 方言表面语法）。
> - 门：core 104/104（43+15+46）、vue 82/82、editor 22/22；gen
>   确定性两连跑一致。
> - 保真限制登记（REPORT S 补记）：span 内字面字符/attr 值不转义
>   （占位级）、rows-only IAL 不回环、`loading` 标志不序列化。
> Phase 2 产物：
> - `markdown_parser.at`（1505 行）从 vue 包迁入 `packages/core/auto/`，
>   尾部新增强类型转换层：`parse_blocks(src, final) -> BlockTree` +
>   convertBlock/convertInlines/attachIAL；IAL 预处理接入 `parse_blocks`
>   （`parseDocument` 不接 IAL，字节级旧行为钉死）。
> - 块 id 策略落地：`^anchor` 优先，否则 `block-<i>`/`<parent>-<j>`；
>   SourceRange 暂零占位（Phase 3+ 缺口登记）。
> - vue 包消费面零改动：`markdown-parser.generated.ts` 替换为 re-export
>   redirect（`export { parseDocument } from '@autodown/core'`）。
> - gen.mjs 三源发射 + 新后修 M1（use 导入改写置顶）；探针报告追加 T5
>   （零 payload 变体裸引用 TS2345）。
> - 门全绿：core 58/58、vue 82/82（parity 43 经 redirect 打 core）、
>   editor 22/22、demo e2e 9/9；gen 两连跑 md5 一致。
> Phase 1 产物：
> - `autodown/packages/core/auto/block_model.at`（723 行）：BlockNode/
>   InlineSpan/Mark/BlockType（17 变体含扩展块）/Attr/Value/BlockPos/
>   Selection + 查找遍历（findBlock/parentOf/pathOf）+ 树手术原语
>   （spliceChildren/spliceRange/replaceNode）+ 7 操作 applyOp +
>   invertOp undo 反演；发射 `src/block-model.ts`（913 行）经
>   `src/index.ts` 导出。
> - 测试 43/43 绿（每操作 ≥ 正/反/边界 3 例 + 6 个 invertOp
>   roundtrip + 1 快照）；core tsc 绿；消费面零回归（vue 82/82、
>   editor 22/22）。
> - **设计偏离追认**：attrs 用 `List<Attr>`、marks 用 `List<Mark>`
>   （非 §5.1 示意的 `Map<str, Value>`/`Set<Mark>`）——a2ts 把 Map 发成
>   Record 但 `.contains` 透传坏 JS、a2r 原生 map 下标断裂，列表扫描
>   在小集合上双端全通，定为双端约束下的正式形态。
> - gen.mjs 管线扩展为双源发射 + 断言式后修（B1 return/let 位置补
>   `new`、B2 const enum→enum）；a2ts/a2r 新缺口 T1-T4/R1/R4 已登记
>   DEBTS（均不阻塞，R 类为 Phase 4 前置）。
> Phase 0 产物：
> - **a2r 探针 REPORT**：`tmp/dsl-probes/plan016/REPORT.md`——总结论
>   **Go（带条件）**：块模型+序列化器可行（ADT+match/递归类型原生过；
>   Map/Set 走 `use.rust HashMap/HashSet` 路线 + set/get/cloned 纪律；
>   内核纯函数风格规避 a2r 值语义陷阱）；auto-lang 侧 5 个发射器小修
>   可清零变通（不阻塞）；`markdown_parser.at` 原样不过 a2r（285 错
>   归 10 类，结构性缺口=匿名对象字面量/`any`/JS 风格 RegExp）——
>   按既定方向节点类型化 + 正则改 `use.rust regex` 重写，源码侧中修。
>   a2r 调用：`auto.exe trans --path file.at rust -e 100`（产物在源旁
>   `<name>.a2r.rs`）；工程级 `auto build -r rust`。
> - **yjs 死依赖清理**：editor 8 个死依赖出 package.json（yjs 系 6 个 +
>   `tiptap-markdown` + `extension-node-range`），editor 22/22 + vue-tsc 绿。
> 前置：~~plan 015 CLOSED 或 PLAN-037 裁定落地~~ **已解除（2026-08-25）**——
> 015 CLOSED；PLAN-037 经 auto-lang plan 443（`38adb1ef4`，defineModel 降级
> 收窄）裁定落地；auto-lang worktree `auto-down` 分支修复已全部合并 master
> （`73861f8d`）。三仓 regen 已采用 plan-443 形态（`767c2dc`），无 regen
> 冲突窗口。
> 开发模式：本计划执行在 auto-down worktree（`.worktree/plan-016`）进行，
> 完成合并回 master；a2r 探针若暴露 auto-lang 侧缺口，在 auto-lang 的
> `.worktree/auto-down` worktree 修复并合并（沿用既有约定）。
> 关联：plan 008（渲染自研奠基，`markdown_parser.at` 为本计划吸收对象）、
> auto-lang Plan 413（rust 通道蓝本）、auto-lang plan 032（a2r 通道硬化，
> G1/G2.1 已于 2026-08-25 合入——探针清单以其后现状为准）。

## 背景

现状三包中**不存在文档模型**（调研 2026-08-25）：

- `@autodown/core` 仅 IAL 工具（`auto/ial.at` 67 行）；
- `@autodown/vue` 的 `parseDocument -> List<any>` 是弱类型渲染树，
  无选区/位置模型；
- `@autodown/editor` 的文档语义全部外包给 ProseMirror（schema/doc/selection，
  md↔doc 转换经 `@tiptap/markdown`）；
- 块级寻址仅 editor 的 `BlockId` 装饰（`data-block-id` DOM + `getBlockMap()`）。

设计文档 §5 要求的强类型块树 + 选区 + 操作序列 + 序列化，全部是净新增，
且是后续 017（渲染统一）/018（编辑内核）/019（rust）的共同地基。

## 目标

1. **块模型 .at 单源**：`BlockNode`/`InlineSpan`/`BlockPos`/`Selection` +
   操作序列（`insert_text`/`split_block`/`merge_blocks`/`set_block_type`/
   `lift_block`/`wrap_block`/`replace_range`）纯函数实现。
2. **解析器吸收**：`markdown_parser.at`（1282 行）迁入内核目录，输出适配
   强类型块树（保留弱类型投影一个过渡版本供 017 前的旧渲染层消费）。
3. **序列化器**：`serializer.at`（块树 → `.ad` 文本），吸收
   `@tiptap/markdown` 角色；roundtrip 验收。
4. **BlockId 内核化**：块 ID 生成/复用/持久化策略（解析注入、序列化可选
   输出，按 `docs/02-ad-format.md` §3.1）进模型层。
5. **双端发射探针**：a2r（Auto → Rust crate）对块模型所需语言特性的
   覆盖探针 + 裁定报告（循 plan 015 Phase 0 探针模式）。

## 非目标

- 不动渲染层（017）、不动编辑层（018）。
- 不实现 AutoDown `$` 逻辑域块的执行（仅结构无损占位，设计 §5.3）。
- 不做协同（操作序列只留架构钩子）。

## 阶段划分

### Phase 0 — 前置与探针

- ~~确认 015 状态~~ **已解除**（见文头前置段：015 CLOSED + plan 443 落地 +
  worktree 已合并 master `73861f8d`）。
- **a2r 探针**：块模型需要的语言特性清单（代数数据类型/模式匹配/
  `Map<str, Value>`/递归类型/`Set<Mark>`）逐项在 rust 发射通道跑通或
  记缺口——产出 `tmp/dsl-probes/plan016/REPORT.md`（循 015 模式）。
  注意以 plan 032 G1/G2.1 合入后的最新 a2r 现状为基准。
- **parser 全量 a2r 冒烟**（修订新增）：`markdown_parser.at`（1282 行，
  零 ext）整文件过 a2r 发射通道 + `cargo check`——整文件过一遍暴露真实
  缺口比逐项特性探针更快；缺口清单同样进 REPORT。
- 顺手清理：editor `package.json` 的 8 个 yjs/collaboration 死依赖出依赖
  （零行为变更，`pnpm i` + editor 22/22 测试回归）。

### Phase 1 — 块模型与操作

- `packages/engine/auto/block_model.at`（engine 目录起骨架，见设计 §3.1；
  本阶段包尚未合并，先落 `packages/core/auto/`，017 时整体迁移——**决策点
  见待澄清 1**）：
  - 类型定义 + 构造/遍历/查找工具（`find_block(id)`/`path_of(id)`）；
  - 操作序列纯函数：`(tree, selection, op) -> (tree', selection')`，
    每操作配快照测试；
  - undo 反演函数（op → inverse op）。
- 对拍基线：不引入外部参照，快照测试自证（模型是净新增）。

### Phase 2 — 解析器吸收与强类型化

- `markdown_parser.at` 迁入 + 输出层改强类型块树：
  - 迁移期间维持现 `parseDocument` 出口（`@autodown/vue` 消费面零改动）；
  - 新增 `parse_blocks(src, final) -> BlockTree`；
  - IAL 预处理（`preprocessMarkdown`/`buildIAL`）接为前置步骤；
  - 既有 `markdown-parity.test.ts` 43 例平移不破（语义投影对拍口径不变）。

### Phase 3 — 序列化器与 roundtrip

- `serializer.at`：块树 → `.ad` 文本。覆盖 008 白名单块集 +
  AutoDown 扩展块（callout/details/wikilink/query/embed 占位）。
- 验收三层：
  1. `parse(serialize(parse(x)))` 语义等价（fixtures：musk 真实内容采样
     + 定向用例）；
  2. 关键 fixtures `serialize(parse(x))` 逐字节稳定（快照）；
  3. BlockId roundtrip：注入的 ID 序列化可选输出后重解析不漂移。

### Phase 4 — rust 发射裁定与试点

- 按 Phase 0 探针报告，块模型 + 解析器 + 序列化器走 a2r 发射
  `rust/autodown-core` crate 骨架（lib + 冒烟测试，不含渲染）。
- 若探针裁定特性缺口阻断：缺口清单上报 auto-lang 侧登记，crate 试点
  缩小到无缺口子集（模型 + 序列化），解析器后补。

## 验收标准

1. `block_model.at`/`markdown_parser.at`/`serializer.at` 三源在册，
   `pnpm gen` 产物 vue-tsc 绿；
2. 操作序列快照测试全绿（每操作 ≥ 正/反/边界 3 例）；
3. parity 43 例不破 + roundtrip 三层验收通过；
4. a2r 探针 REPORT 在册，crate 骨架（或缺口裁定）落地；
5. 三仓 regen（demo/jade/editor）不受影响（本计划不动消费面）。

## 待澄清事项

1. **新源落位**：`packages/core`（吸收 core 包，017 时随合并改名 engine）
   vs 直接起 `packages/engine` 目录——倾向前者（少一次目录搬动，core 包
   本就是被吸收方）。
2. **操作粒度**：`replace_range` 是否作为万能兜底操作（粗粒度）与细操作
   并存——倾向并存，undo 栈合并相邻细操作。
3. **`Value` 类型**（attrs 值域）：str/int/bool/List/Map 的判别联合在
   a2ts/a2r 两侧的表达方式——Phase 0 探针项。
