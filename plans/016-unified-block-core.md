# Plan 016：统一块模型内核（block_model + serializer + 双端发射探针）

> 状态：**草案（待立项）**。设计依据：[docs/09-unified-document-engine.md](../docs/09-unified-document-engine.md) §5。
> 立项：2026-08-25。
> 前置：**plan 015 CLOSED 或 PLAN-037 裁定落地**（defineModel 深响应性 🔴 阻断项
> 上报 auto-lang 侧待修，且 auto-lang worktree `auto-down` 分支有未合并修复——
> 三仓 regen 逐字节一致是现行工作模式，本计划大量新增 .at 源，必须避开 regen
> 冲突窗口）。
> 关联：plan 008（渲染自研奠基，`markdown_parser.at` 为本计划吸收对象）、
> auto-lang Plan 413（rust 通道蓝本）。

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

- 确认 015 状态：PLAN-037 裁定 + auto-lang worktree `auto-down` 分支
  （`e332c4d3`/`690abfc2`/R016 等）合并 master 与否。
- **a2r 探针**：块模型需要的语言特性清单（代数数据类型/模式匹配/
  `Map<str, Value>`/递归类型/`Set<Mark>`）逐项在 rust 发射通道跑通或
  记缺口——产出 `tmp/dsl-probes/plan016/REPORT.md`（循 015 模式）。
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
