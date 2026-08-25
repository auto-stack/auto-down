# Plan 020：应用迁移与退役收口（demo / jade-garden / musk / 旧包）

> 状态：**草案（待立项）**。设计依据：[docs/designs/09-unified-document-engine.md](../designs/09-unified-document-engine.md) §10。
> 立项：2026-08-25。前置：**Plan 017 完成**（迁移最低门限：渲染统一 +
   shim 可用）；**018/019 完成为 1.0.0 门限**。
> 关联：DEBTS.md 008 行（musk T13/T10 欠账，本计划强制先清）。
> 协调项（017 Phase 3 移交）：engine 渲染根 class 已去掉 `markstream-vue`
> 历史段（现为 `markdown-renderer`）——musk 重新 vendor 时须在对拍脚本中确认
> 无该 class 依赖（本仓侧审计：demo/jade-garden 选择器干净）。

## 背景

应用侧影响面（2026-08-25 调研结论）：

- **消费面极窄**：demo + jade-garden + musk 合计仅 5 个导入符号
  （`AutoDownEditor`/`StreamingRenderer`/`BlockInfo`/两个 style.css），
  真正耦合在 DOM 契约（`data-block-id`/`.autodown-editor*`/
  `.streaming-document`/`.node-slot`）与两个 expose
  （`getBlockMap`/`containerRef`）。
- **jade-garden**：单栏 WYSIWYG，不用渲染包；唯一 tiptap 旁路
  `editor_tab_ext.ts:169`；`autodown-editor.css` 598 行中 `.ProseMirror*`
  覆写在 018 后大半作废。
- **demo**：双栏 harness，`useSyncedScroll.ts`（528 行）三重契约依赖；
  e2e 304 行选择器深耦合。
- **musk**：vendor 快照消费方，008 的 T13/T10 验证至今未执行
  （DEBTS 在册）。

## 目标

1. **musk 欠账清偿**：T13（渲染切换 markstream→`@autodown/vue 0.2.0`）
   与 T10（编辑器接入）在 musk 会话执行记录——engine 迁移的强制前置。
2. **demo 迁移**：消费切 `@autodown/engine`；双栏保留为诊断/对拍视图。
3. **jade-garden 迁移**：slash 旁路换命令层 API（018 `insertTemplate`）；
   CSS 覆写清理（`.ProseMirror*` 作废段删除）；`.ad` 块语义与引擎
   序列化器对齐校准。
4. **旧包退役**：`@autodown/vue`/`@autodown/editor`/`@autodown/core`
   shim 状态定版（deprecate 标注 + 退役时点裁定）。
5. **文档收口**：README/ARCHITECTURE/roadmap/docs 索引全面反映 engine
   架构；DEBTS 增量登记。

## 阶段划分

### Phase 1 — musk 欠账清偿（外部仓协调）

- 协调 musk 会话执行 T13/T10（渲染切换 + 编辑器接入 vendor 验证），
  记录进 DEBTS 008 行销号。
- 若 musk 侧排期不可得：裁定"合并验证"（musk 直接 vendor engine
  0.3.0+，跳过 0.2.0 中间态）——风险是丢失 0.2.0 基线对拍，需 musk
  侧同意并登记。

### Phase 2 — demo 迁移

- `demo/package.json` 依赖切 `@autodown/engine`（shim 可选路径跳过，
  demo 是本仓应用直接切目标态）；`app_ext.ts` re-export 源改 engine。
- `useSyncedScroll.ts`：三契约核验（`getBlockMap`/`containerRef`/
   `node-slot`）零改动预期；若有几何测量差异（018 编辑器 DOM 结构
   变化引起的 offsetParent 链差异），按块对齐语义修适配层不动机制。
- e2e：017/018 冻结清单核对，更新选择器仅限已显式破坏项。
- 验收：demo e2e 9/9 + 双栏对拍（左编辑右渲染一致性目检记录）。

### Phase 3 — jade-garden 迁移

- `editor_tab_ext.ts`：
  - `import { AutoDownEditor } from '@autodown/editor'` → engine；
  - slash 模板插入 `editor.chain()` → `insertTemplate(blocks)` 命令层
    API（018 产物）；
  - `EditorShell` 薄壳（onAssetUpload 改名转发）随 DSL 事件能力现状
    重新评估能否拆除（015 若已支持，删除薄壳）。
- `autodown-editor.css`：`.ProseMirror*` 作废段删除（018 后无此 DOM）；
  `.autodown-*` 保留段与 engine style.css 合并策略裁定（倾向覆写段
  收敛进 engine 主题变量，jade 侧只留布局类）。
- `lib/blockParser.ts`（304 行前端镜像解析）与后端 `parser.rs` 的块
  语义对齐：与 engine `./parser` 的 `parse_blocks` 输出投影比对，
  差异清单 → 三选一裁定（改前端镜像/改后端/直接消费 engine parser
  的 TS 发射物——倾向第三者，消除第三处镜像）。
- stub 更新：`gen_autodown_editor.d.ts` 指向 engine 类型。
- 验收：jade vue-tsc + e2e 23/23 + 手验（打开/编辑/保存/wikilink/
  slash 模板/图谱视图不受影响）。

### Phase 4 — 旧包退役与发版裁定

- 退役时点裁定（017 待澄清 3 收口）：musk 切换完成 + 无其他消费方
  查证 → `@autodown/vue`/`@autodown/editor`/`@autodown/core` 打
  deprecate 标注（README + npm 字段预留），1.0.0 时归档。
- 发版通道裁定：vendor 快照维持 vs npm publish（前提：engine 去
  `workspace:*` 内联依赖 + `.changeset` access 调整）——按届时 musk
  需求定，DEBTS 登记决策。
- `@autodown/engine` **1.0.0**（019 完成后）：双平台齐 + 契约冻结。

### Phase 5 — 文档与台账收口

- `docs/designs/README.md` 索引 + 关键决策表更新（engine 单包、ProseMirror
  AST 决策废止记录）；`docs/designs/03-architecture.md` 前端组件表改 engine；
  `docs/designs/06-roadmap.md` Phase 1 修订（canonical AST 改统一块模型，
  标注修订历史）。
- `packages/engine/ARCHITECTURE.md`：吸收并改写 editor 分层契约文档
  （三层架构 + 出口契约 + 发包形态）。
- DEBTS.md：本设计系列产生的延期/风险行集中登记（含 019 ark/jet
  编辑降级边界、rust katex/mermaid 降级）。

## 验收标准

1. musk T13/T10 有执行记录（或合并验证裁定 + 登记）；
2. demo/jade-garden `package.json` 无 `@autodown/vue`/`@autodown/editor`/
   `@autodown/core` 依赖；各自 e2e 全绿（9/9、23/23）；
3. jade-garden 无 `.ProseMirror` CSS 残留、无 tiptap API 引用
   （grep 断言）；块语义对齐差异清单归零或登记；
4. 旧包 shim deprecate 标注在册，退役时点有裁定记录；
5. engine 1.0.0 发布（vendor 或 npm 通道按裁定），文档收口清单逐项
   核验。

## 待澄清事项

1. **jade-garden 前端 blockParser 的最终归宿**（Phase 3 三选一）——
   影响后端 `parser.rs` 是否同步改，倾向前端直消费 engine parser
   发射物，后端只保 roundtrip 校验。
2. **musk 排期不可得时的合并验证**是否可接受——需 musk 侧会话确认。
3. **engine 1.0.0 的 API 冻结范围**：命令层 API（018）与 VM natives
   （019）是否随 1.0 冻结或标 experimental——倾向 natives 标
   experimental（413 natives 同期也未冻结）。
