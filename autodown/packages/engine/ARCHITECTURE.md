# @autodown/engine — 分层契约（plan 020 Phase 5 定版）

`@autodown/engine` 是 AutoDown 的统一文档引擎：parser / render / editor
三合一单包（plan 017 起吸收 `@autodown/core` / `@autodown/vue` /
`@autodown/editor`，plan 020 起旧包为 deprecated re-export shim）。本文
固定三层架构、出口契约与发包形态；编辑器 DOM/事件面以
[EDITOR-CONTRACT.md](./EDITOR-CONTRACT.md) 为准（plan 018 冻结）。

## 1. 三层架构

| 层 | 目录 | 出口 | 职责 |
|----|------|------|------|
| parser | `src/parser/`（单源 `auto/parser/*.at`） | `./parser` | `.ad` ↔ 统一块模型：markdown 解析、IAL/锚点深剥离、序列化；vue-free（构建期 `assert-parser-pure` 断言） |
| render | `src/render/`（单源 `auto/render/*.at`） | `./render` | 块模型 → VNode：面板注册表（palette map 单源）、流式调度、表格、可选能力（katex/mermaid/highlight） |
| editor | `src/editor/`（Auto 生成 + 手写内核） | `./editor` | 自研编辑内核（plan 018 退役 Tiptap）：块粒度 contenteditable 宿主 + 预览翻转、命令层 API、slash 菜单、预览 wikilink 装饰（plan 020）；chrome 层 .at 单源再生（plan 021，见 §6） |

根出口 `.` 是三层的策展组合（`AutoDownEditor` / `StreamingRenderer` /
`getBlockMap` / `insertTemplate` 等命令层 + `BlockInfo` 等类型）；
`./style.css` 单一 css 资产（editor chrome + 渲染层共享）。

## 2. 出口契约（1.0.0 冻结面，plan 020 Phase 4）

- **四出口 + style.css**：`.` / `./parser` / `./render` / `./editor` ——
  新增出口非破坏；改/删出口符号 = 破坏性变更，须升主版本。
- **DOM/事件面**：EDITOR-CONTRACT.md 全清单（根 class、`data-block-id`、
  `.autodown-wikilink-label`、CustomEvent 四则、`getBlockMap`/`containerRef`
  expose）。
- **命令层 API**：`insertTemplate` / `replaceSelection` / `focusBlock` /
  `moveBlock` / `setBlockAttrs` / table ops / `createEditorAdapter`
  （plan 018 立，随 1.0 冻结）。
- **编辑器事件载荷**：`open-wiki-link(title, blockId?)`（plan 020 恢复
  发射；payload 与旧 Tiptap 契约一致）。
- **experimental（不随 1.0 冻结）**：rust/VM 平台面 —— autodown-core
  crate（a2r 发射、`packages/core/rust`）与 VM natives（413 清单，
  auto-lang 侧）：尚未稳定，破坏性变更不升主版本。

## 3. 双端与单源通道

- TS 端：`auto/parser`、`auto/render`（.at 单源）→ `pnpm gen:parser` /
  `gen:render` 再生成 `src/**/**.generated.ts`（纪律：改 .at 后必 regen，
  plan 019 批次七教训）。
- rust 端：autodown-core crate（`packages/core/rust`）消费同一 .at 的
  a2r 发射；双端金标对拍 = `tests/parse_parity.rs` ×
  `src/rust/tests/golden/parity.ad`（engine 侧金标）。
- 后端消费（jade-garden）：plan 021 起 back 块解析/链接提取同样单源到
  engine .at 发射物（parser.rs 退役为薄壳）。

## 4. 发包形态

- **vendor 快照通道**（现行裁定，plan 020 Phase 4）：消费方以 dist 快照
  形式 vendor（musk 0.2.0 快照已冻结于其仓 51b8abf）；npm publish 前置
  （去 workspace 内联依赖、changeset access 调整）登记于 DEBTS.md 008。
- 版本仪式：changesets 手写（`.changeset/*.md`），版本号手 bumped；
  契约冻结 changeset = plan-020-engine-1.0.0.md（原记 1.0.0；2026-08-28 版本策略修订改 0.5.0，见 .changeset/2026-08-28-engine-version-policy-0-5-0.md）。

## 5. 已知边界（登记在案）

- 行内 mark 层（bold/italic bubble）、表格/代码块菜单、node view 富渲染
  （math/mermaid 编辑态）待行内 mark/面板注入位扩展 —— 见 DEBTS.md 020 行。
- engine parser 不产出 source 行号（`SourceRange` 为占位）、`:::` 容器/
  table 子集与 jade 前端镜像的差异清单 —— 见 DEBTS.md 020 行（镜像保留
  裁定的前置条件）。

## 6. 手写平台层与 .at 生成 chrome 层的边界（plan 021 Phase 4 定版）

编辑器内部按"平台装配层（手写）/ chrome 层（.at 生成）"二分，与 renderer
的手写壳待遇一致；本节为两边的定版边界。

**手写平台层（不 .at 化）**

- 引擎内核 `src/editor/engine/`：editor-engine / commands / composition /
  host-controller / input-rules / text-diff / tiptap-adapter。
- 装配壳 `components/EngineEditor.vue` + `components/BlockHost.vue`：
  IME/composition 平台逻辑密集（BlockHost 的 `contenteditable` +
  compositionstart/update/end 接线、光标偏移读取、CompositionSession 协议）
  ——widget DSL 无 contenteditable 属性与 composition 事件面（plan 013
  widget 集从未有 contenteditable widget，旧 EditorContent 恒为 Tiptap
  re-export）；EngineEditor 另承担 expose 契约（getBlockMap/handleSave）、
  宿主注册表、重绘版本号与预览 wikilink 装饰接线（plan 020）。
- `wikilink.ts`（预览装饰器）、`block-map.ts`、`slash-manifest.ts`、
  `menus/slashItem.ts`。

**.at 生成 chrome 层（`auto/editor/` 单源，`pnpm gen:editor` 再生）**

- 14 个部署物：`menus/{SlashMenu,BubbleMenu,TableMenu,CodeBlockMenu}.vue`、
  `components/{CodeLanguageIcon,CodeEditorBlock,TableEditorBlock}.vue`、
  `node-views/*.vue`（7）——gen 管线
  （暂存工程 `auto build --gen-only --lenient` → 收割 → E1 import 后修 →
  部署），两连跑逐字节确定。
- 9 个 ext 桥：`src/editor/ext/*.ts` 是 `auto/editor/ext/*.ts` 的逐字节
  部署（引擎接口，零 Tiptap）。
- build guard：`scripts/assert-editor-gen.mjs`——生成头注 ↔ .at 源存在性、
  部署清单精确性（增删均须显式改 guard 清单）、ext 桥同步，三项断言。

**BlockComponent 三模式契约（plan 023）**

- `src/render/block-component.ts`（手写桥，同 highlight.ts 模式）：每类型
  一个组件，`view`（终态=现有 panel 管线，经 BlockNode→WNode 桥
  `block-wnode.ts` 直连，EngineEditor 预览零 md 往返）/ `stream`（渐进态，
  缺省沿用 markdown 段路径）/ `edit`（分类型编辑面，缺省=BlockHost 文本
  兜底）三槽位；注册表键为 BlockType 枚举名（canonicalKind 归一
  'code_block'→'CodeBlock'）。
- 归属边界：**编辑面 SFC 归 chrome 层**（CodeEditorBlock/TableEditorBlock
  已 .at 化，扁平 chrome props）；**无头控制器与适配器归平台层**
  （engine/code-editor-controller、engine/table-editor-controller、
  EngineEditor plain script 里的 node/ctx→扁平 props 适配与注册）。
- **stream→edit v1 裁定**：`BlockEditCtx.readonly = streaming`——流式进行
  中编辑面只读（横幅"流式生成中"+disabled），流结束自动解锁；备选
  "流式中编辑转 final 截断流"交互更激进、改动面大，不取。
- 在册缺口：行内 WYSIWYG（段落内 mark 就地编辑、选区映射）不在 plan 023
  范围，单列后续计划；表格嵌套块单元格 v1 仅文本单元格可编辑。

**在册不部署的源（dormant，guard 豁免）**

- `app.at`：强制占位根（生成器总发 App.vue，产物丢弃）。
- `auto_down_editor.at` + `ext/auto_down_editor_ext.ts`：装配 widget 的
  参考实现，被 EngineEditor 平台壳取代（上述裁定）。桥内
  EngineContentHost 是活预览折衷的桥内移植，保留为"装配路径可行"的原型
  （过 vue-tsc、tree-shaken 不进 dist）；如未来重启装配 .at 化，须先移植
  wikilink 装饰与 slash 派发并过 IME 手验。
- 菜单三件套与 7 块视图目前为 **dormant 生成物**（已部署、未被
  EngineEditor 挂载）：运行时挂载需引擎菜单宿主协议（adapter
  `.on/.off('selectionUpdate')`、`isActive('table')`、`getAttributes`、
  表链命令、`view.dom` 定位 shim）与 block-view 挂载协议——见 §5 与
  DEBTS.md 020/021 行。
