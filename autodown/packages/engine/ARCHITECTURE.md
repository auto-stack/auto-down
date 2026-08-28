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
| editor | `src/editor/`（Auto 生成 + 手写内核） | `./editor` | 自研编辑内核（plan 018 退役 Tiptap）：块粒度 contenteditable 宿主 + 预览翻转、命令层 API、slash 菜单、预览 wikilink 装饰（plan 020） |

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
  1.0.0 changeset = plan-020-engine-1.0.0.md。

## 5. 已知边界（登记在案）

- 行内 mark 层（bold/italic bubble）、表格/代码块菜单、node view 富渲染
  （math/mermaid 编辑态）待行内 mark/面板注入位扩展 —— 见 DEBTS.md 020 行。
- engine parser 不产出 source 行号（`SourceRange` 为占位）、`:::` 容器/
  table 子集与 jade 前端镜像的差异清单 —— 见 DEBTS.md 020 行（镜像保留
  裁定的前置条件）。
