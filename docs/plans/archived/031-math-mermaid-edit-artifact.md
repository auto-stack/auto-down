# [PLAN-031] Math/Mermaid 编辑态深化 + 渲染工件契约（VM-ready）+ stream 钉死

---
plan_id: PLAN-031
status: archived
feature_name: MathBlock/Mermaid 源码+实时预览同屏编辑面 + SVG 工件契约（hash 单源、宿主注入存储） + 流式态测试钉死
author: [zhaopuming]
created_at: 2026-08-31
updated_at: 2026-09-01

# /auto-plan:review 填定（merge 时沉淀）
supersedes_spec_components: []
new_spec_components:
  - ".autoos/specs.json 六节 P031-1..6: math/mermaid 编辑态深化 + 渲染工件契约 + stream 钉死——P1 编辑面：MathEditBlock（auto/editor/math_edit_block.at，源码 textarea+同步 katex 实时预览同屏，rows 近似容高，readonly 横幅）/ MermaidEditBlock（mermaid_edit_block.at，300ms debounce 异步三态 loading/svg/error，版本号防陈旧回填）两 widget + math_edit_ext/mermaid_edit_ext 桥（预览转发+focusCodeArea/textareaRows 复用+scheduleMermaidRender）；部署清单 14→16 SFC + 9→11 ext（gen.mjs 计数 18/EXT_DEPLOY/DEPLOY_COMPONENTS/assert-editor-gen 同步）；EngineEditor mathEditSlot/mermaidEditSlot（CodeEditorController 复用 + blockText 源=030 inlines，blur 整段一步 undo），替换 030 Mermaid→fenceEditSlot 复用与 MathBlock→BlockHost 文本兜底。P2 工件契约：auto/render/artifact_hash.at 单源 FNV-1a 32（UTF-16 码单元 + NUL 分隔 + len 混入，键 kind:<len>:<8hex>）双发射——a2ts 零 post-fix / a2r RP2 encode_utf16 包装器；preview.ts 增 RenderedArtifact{kind:html|svg,body,error}+artifactFor+recordArtifact（成功 final 才写、键幂等）+renderMathBlockPreview 桥（math_block_node_view.at 改用）；optional-capabilities 增 enableArtifactStore({get,put}) 宿主注入（engine 零落盘、.ad 零变化、未注册=行为逐字节同前）；对拍金标 10 组语料（中文/星面 emoji/多行/空/反斜杠）TS↔rust 逐字符一致（rust tests/artifact_hash_parity.rs）。P3 stream 钉死：渐进三态 fixture 4 用例（未闭合 %{ 段落字面/开放 fence 不渲染 mermaid/闭合两 kind 面板）+ readonly SSR 钉死 + put 恰一次断言。编译器约束适配四件（在案）：>2^31 字面量不可发射→算术构造；混合优先级括号被发射器丢弃→单运算符语句化；朴素乘积 2^57 超 JS double 精确域 2^53→mulMod32 16 位分裂乘法（中间量 <2^49）；码单元迭代无跨端可移植原语→UTF-16 单位序列化留平台边界（TS charCodeAt/rust encode_utf16，同 npm/timer 边界惯用法）。demo content.ts +2 样例、extension-blocks e2e +4（含 fill() 注记：本机 Windows 键盘布局 keyboard.type 丢反斜杠）、screenshot 留档两张；EDITOR-CONTRACT 选择器表 +2 + 手验清单 031 条目；ARCHITECTURE §5 余量改写/§6 16 部署物+11 ext+渲染工件契约段；DEBTS 020 余量销号/026② 部分销号/020 绿行工件契约化/新增 031 math SVG 选型跟踪行（merman·RaTeX·MathJax·web 回填）。测试：engine 528（030 基线 505+031 新 23）、cargo 10、demo 40（scroll-sync 2 例环境性 flake 先于本计划存在，master A/B 同败在案）"
touched_goals:
  - ".autoos/specs.json P023-2: 分类型编辑面目标——math/mermaid 两类获得专用源码+实时预览编辑面（edit 槽位注册，controller-prop 协议延续），目标第 3 条编辑面谱系补齐两 kind"
  - ".autoos/specs.json P026-2: 挂载宿主协议目标——② NodeView 编辑态深度部分清偿（math/mermaid 源码级富编辑经 BlockComponent edit 槽位+inlines 写回，非 updateAttributes 通道）"
  - ".autoos/specs.json P022-2: jade VM 目标——view 模式工件通道铺路（mermaid→SVG 工件 resvg 可显、键 TS/rust 字节一致、宿主注入存储），VM 磁盘缓存消费位就绪待接"

current_step: 12
total_steps: 12
---

## 变更摘要

三个互相咬合的部分，共同销掉 DEBTS 三行欠账，并为 VM/iced 端铺好 view 模式
的工件通道：

**P1 编辑态深化**（销 DEBTS 020 余量"math/mermaid 编辑态深化"、DEBTS 026②
"NodeView 编辑态深度"）：MathBlock 与 Mermaid 各得一个专用编辑面——
源码 textarea + 实时预览同屏（.at 单源 chrome，沿用 CodeEditorBlock 的
controller-prop 协议与 ext 桥模式）。math 预览走同步 katex；
mermaid 预览走 debounce 异步 + loading/error 三态。Mermaid 编辑面**替换**
plan 030 的 fenceEditSlot 复用；MathBlock 编辑面**替换**当前的 BlockHost
文本兜底。

**P2 渲染工件契约**（升级 DEBTS 020 绿行"rust/VM katex/mermaid v1 降级"）：
preview.ts 的字符串契约升级为 `RenderedArtifact { kind: 'html'|'svg', body,
error }`；mermaid 立即产 SVG（天然 VM/iced 可显示物），math v1 产 HTML
（SVG 生成器选型后置，见待澄清①）。工件键 = **单源 hash**（新增
`auto/render/artifact_hash.at`，FNV-1a 32 + len 混合，gen:render 双发射 +
rust trans 对拍），存储经 `enableArtifactStore({ get, put })` 注入
（optional-capabilities 既有模式）——engine 不落盘、`.ad` 文档零污染，
demo/jade 接内存实现，VM 端将来接磁盘缓存 + resvg 显示。

**P3 stream 钉死**：030 已把流式安全做完（未闭合 `%{` → 段落字面、开放
mermaid fence → codeNode loading、闭合才成块 = 源码必完整），本计划不建
新 stream 机器，只做三件收口：渐进态 fixture 钉死、final 后工件 put 断言、
新编辑面 readonly（"流式生成中"横幅）与既有 `BlockEditCtx.readonly` 对齐。

**不做的**：MathInline（行内层，DEBTS 026③，独立计划）；math SVG 生成器
选型与引入（待澄清①，DEBTS 跟踪）；VM/iced 端实现本身（auto-lang 侧
413 natives 线，本计划只交付契约与键的单源）；Query/Embed 数据装载
（DEBTS 026①）。

## 目标

1. **编辑面**：聚焦 MathBlock/Mermaid 块时显示"源码 + 实时预览"同屏编辑面
   （.at 生成 chrome）；blur 整段提交（一步 undo，复用
   CodeEditorController 提交协议）；源码非法时显示错误横幅且预览区降级；
   流式进行中 readonly + "流式生成中"横幅（与 Fence/Table 编辑面同型）。
2. **工件契约**：web 端 view 渲染成功后产出可持久化工件（mermaid→SVG、
   math→HTML v1）；工件键 hash 在 TS/rust 双端字节一致（金标对拍）；
   存储经注入接口，engine 零落盘、序列化零变化（roundtrip 金标不动）。
3. **stream 钉死**：流式渐进三态（未闭合字面 / 加载态 codeNode / 闭合成块）
   有自动化测试在册；final 成块渲染成功 → 工件 put 恰好一次（键形状断言）。
4. **契约文档**：EDITOR-CONTRACT 选择器表 +2（两编辑面）；ARCHITECTURE
   §6 chrome 部署清单 14→16（guard 同步）；DEBTS 三行销号/改写。

## 架构方案

```
P1（chrome 层 .at 单源 + 平台层适配）
auto/editor/math_edit_block.at      新 widget：textarea + 同步 katex 预览
auto/editor/mermaid_edit_block.at   新 widget：textarea + debounce 异步预览
auto/editor/ext/math_edit_ext.ts    桥：renderKatexPreview 转发 + focus/resize
auto/editor/ext/mermaid_edit_ext.ts 桥：renderMermaidPreview 转发 + debounce + focus/resize
  └─ 部署：pnpm gen:editor → src/editor/components/{Math,Mermaid}EditBlock.vue
     + src/editor/ext/ 逐字节桥；scripts/assert-editor-gen.mjs 清单 14→16
src/editor/components/EngineEditor.vue
  ├─ registerBlockComponent('MathBlock', { edit: mathEditSlot })    （替换 BlockHost 兜底）
  ├─ registerBlockComponent('Mermaid', { edit: mermaidEditSlot })   （替换 fenceEditSlot 复用）
  └─ 两 slot 适配器：new CodeEditorController(ctx.engine, ctx.blockId)
     + source=blockText(node)（030 起 math/mermaid 源码即 inlines）

P2（工件契约，render 层单源 + 注入）
auto/render/artifact_hash.at        FNV-1a 32 + len 混合键；gen:render 双发射
  └─ 部署：src/render/artifact-hash.generated.ts + rust 侧 artifact_hash.a2r.rs
     （auto.exe trans + cp，palette_map.at 同通道）
src/render/preview.ts               增 RenderedArtifact 类型 + artifactFor(kind, source)
src/render/optional-capabilities.ts 增 enableArtifactStore({ get, put })
  └─ final 渲染成功 → store.put(artifactHash(kind, source), artifact)
```

**为何 controller 复用而非新写**：math/mermaid 的编辑语义 = 整段文本 blur
提交（单步 undo），与 Fence 完全同构——CodeEditorController 本就 kind 无关
（engine + blockId + commit(text)），复制它只会制造第二份提交协议。

**为何 hash 放 .at 单源**：VM 端将来按同一键查磁盘缓存，TS/rust 两端必须
对同一 source 算出同一键；32 位 FNV-1a + len 在两端都是平凡循环（TS number
位运算 / rust u32 wrapping），无 BigInt、无外部依赖。

## 技术栈

- Auto widget DSL（.at 单源，gen.mjs 管线，两连跑逐字节确定）
- Vue 3 SFC（生成物）+ TypeScript（平台层适配与 ext 桥）
- katex / mermaid（npm，仅经 preview.ts 既有桥，DSL 不直接 import）
- Playwright（demo e2e）+ Vitest（engine 单测）+ rust 双发射对拍（既有
  rust-parse-parity-gen 通道）

## 需求分析与背景调查

（来源：.autoos/specs.json 六节总览、DEBTS.md、engine 源码核查 2026-08-31）

**现状盘点（plan 030 后）**：
- 解析/roundtrip 已全通：`%{ }%` math 与闭合 ```mermaid fence 均成块
  （源码原样入 inlines，不走内联解析）；未闭合/非法降级段落字面，流式安全
  （spec P030-1..6）。
- Mermaid edit = fenceEditSlot 复用（CodeEditorBlock 源码态，徽章恒
  mermaid）；MathBlock edit = BlockHost 文本兜底（无专用面）。
- view = node-view 面板实时渲染（MathBlockNodeView→katex、
  MermaidNodeView→mermaid，经 preview.ts 唯一桥；npm import 与 try/catch
  在 DSL 不可表达——plan 017 定界）。
- stream：panel-registry 解析链 custom→builtin→degrade；闭合成块后源码必
  完整，实时渲染安全；未闭合态 030 已处理。
- BlockComponent 三模式契约（spec P023-2）与挂载宿主协议（spec P026-2）
  是本计划的两个既有机制支点：edit 槽位注册面、controller-prop 扁平
  chrome props 先例（Fence/Table）。
- DEBTS 对账：020 行余量"math/mermaid 编辑态深化"（前置=面板注入位——
  026 已落）、026 行②"NodeView 编辑态深度"、020 绿行"rust/VM katex/mermaid
  v1 降级纯文本"——本计划分别销号/部分销号/升级为工件契约。
- VM 背景（spec P022 系列）：jade-garden VM 桌面化已完成读路径六流；
  编辑器在 VM 侧的断层之一即本计划所铺的工件通道（另一断层 BlockHost/
  RichTextHost 属后续计划）。
- 生态调研结论（2026-08）：mermaid 纯 Rust 渲染器（merman 等）处 alpha；
  TeX→SVG 现成路 = V8 嵌真 MathJax（重）或 RaTeX（输出形态待验证）——
  均不引入 v1，仅作工件契约选型跟踪（待澄清①）。

## 详细设计

### D1 MathEditBlock widget（auto/editor/math_edit_block.at）

props 扁平 chrome：`controller: Array<str>, blockId: str, source: str,
readonly: bool`。结构 = CodeEditorBlock 骨架变体：

```
div.autodown-math-editor[data-block-id][data-node-type="MathBlock"]
├─ if readonly → div.autodown-stream-banner "流式生成中"
├─ div.math-editor-stack（预览上、源码下，与 node-view 预览版式区分）
│   ├─ if !error → div.autodown-math-preview[html=.preview_html]
│   ├─ if error → div.autodown-math-error[title="Math preview error"] .error_text
│   └─ textarea.math-editor-textarea[value=.draft][oninput/.AreaInput]
│        [onblur=.Blur][disabled=.readonly][spellcheck="false"]
└─ 预览 = computed：renderKatexPreview(.draft, true)（经 ext 桥转发，
   同步、无 promise 舞蹈——同 math_block_node_view.at 先例）
```

- `on .Blur -> controller.commit(e.target.value)`（单步 undo）。
- `on .AreaInput ->` 无需 resize（textarea 固定 min-height + CSS
  field-sizing 容高不可用则 rows 由源码行数近似——v1 用
  `attr rows: str(...)` 经 ext 桥小helper计算，或 CSS max-height+overflow）。
- 挂载 `.Init -> focusCodeArea(.area, .readonly)`（复用
  code_editor_block_ext 导出，ext 桥 re-export，不在 DSL 写元素转型）。

### D2 MermaidEditBlock widget（auto/editor/mermaid_edit_block.at）

props 同 D1。预览三态（异步）：

```
model { draft str, svg str = "", error_text str = "", loading bool = false }
computed { show_preview => .loading == false && .error_text == "" && .svg != "" }
on .AreaInput(e) -> { .draft = …; debouncedRender(.draft) }   // ext 桥
  debouncedRender：300ms debounce → loading=true → renderMermaidPreview
  → { svg, error_text, loading=false } 回填（回调经 msg）
```

- mermaid.render 是异步全库初始化，首渲染 ~百毫秒级：loading 态显示
  `div.mermaid-editor-loading "渲染中…"`；错误横幅 idiom 同 node view。
- DSL 无定时器原语 → debounce 住 ext 桥（`scheduleMermaidRender`，
  内部 setTimeout + 版本号防陈旧回填）。

### D3 ext 桥与部署

- `auto/editor/ext/math_edit_ext.ts`：re-export `renderKatexPreview`
  （from `../../render/preview`）+ re-export `focusCodeArea`（from
  `./code_editor_block_ext.ts`）。
- `auto/editor/ext/mermaid_edit_ext.ts`：`scheduleMermaidRender(source,
  cb)`（debounce + 陈旧版本丢弃）+ re-export renderMermaidPreview /
  focusCodeArea。
- `pnpm gen:editor` 再生 → `src/editor/components/{Math,Mermaid}EditBlock.vue`
  部署 + ext 桥逐字节部署至 `src/editor/ext/`；
  `scripts/assert-editor-gen.mjs` 部署清单 += 2 SFC + 2 ext（三项断言：
  生成头注 ↔ .at 存在性、清单精确性、ext 桥同步）。

### D4 编辑槽位注册（EngineEditor.vue plain script）

```
function mathEditSlot(node, ctx) {
  return h(MathEditBlock, { controller: new CodeEditorController(ctx.engine,
    ctx.blockId), blockId: ctx.blockId, source: blockText(node),
    readonly: ctx.readonly })
}
registerBlockComponent('MathBlock', { edit: mathEditSlot })
// mermaidEditSlot 同型；删除 030 的 Mermaid→fenceEditSlot 复用注册
```

`blockText` 对 math/mermaid 已走 inlines（030 静态回退模型同源）。

### D5 工件 hash 单源（auto/render/artifact_hash.at）

```
fn artifactHash(kind str, source str) str {
    // FNV-1a 32 over kind+'\u0000'+source code units；h ^= u; h *= 16777619 (wrapping)
    // 键 = kind + ":" + len(source) + ":" + hex(h)   （len 混入缩小碰撞伤害）
}
```

- 双发射：`pnpm gen:render` → `src/render/artifact-hash.generated.ts`
  （number `Math.imul`/`>>>0` 保无符号语义）；rust 侧 `auto.exe trans
  --path` + cp → `packages/core/rust/.../artifact_hash.a2r.rs`（u32
  wrapping_mul，palette_map.a2r.rs 同通道同 README 命令）。
- 对拍：金标 fixtures（kind × source 语料 ≥8 组，含中文/emoji/多行）
  双侧 hex 输出逐字符一致——进既有 rust-parse-parity-gen 断言口径。

### D6 工件契约与存储注入（src/render/preview.ts + optional-capabilities.ts）

```
export interface RenderedArtifact { kind: 'html' | 'svg'; body: str; error: str }
// renderKatexPreview / renderMermaidPreview 保持不动（在册消费者零扰动）
export function artifactFor(blockKind: 'MathBlock' | 'Mermaid',
  source: str): RenderedArtifact        // math→html(katex) mermaid→svg
// optional-capabilities.ts:
export function enableArtifactStore(store:
  { get(key: str): str | undefined; put(key: str, artifact: RenderedArtifact): void }): void
```

- 写入点：**final 渲染成功后**（`error == ""`）`put(artifactHash(kind,
  source), artifact)`——挂在两处：编辑面 blur 提交后的预览重渲染、
  StreamingRenderer/panel 面板 final 渲染路径（node view 的 render 成功
  分支）。恰一次语义由"final 才写 + 源码键幂等"保证（重复 put 同键无害）。
- `get` 仅供测试与 VM 消费演示；web 端自身渲染不依赖缓存（live 渲染
  不变）。engine 默认无 store = 行为与今日完全一致（零注册零写入）。

### D7 stream 钉死（不建新机器）

- 渐进三态 fixture：`%{` 未闭合 → 段落字面（030 行为）；```mermaid 开放
  → codeNode loading；闭合 → Mermaid/MathBlock kind。断言不抛错、不渲染
  mermaid（开放态）。
- final 断言：闭合成块 + final 渲染成功 → artifactStore.put 恰被调用且
  键形状 `Mermaid:<len>:<hex>`。
- 编辑面 readonly：streaming 中聚焦两块 → `.autodown-stream-banner`
  可见 + textarea disabled（e2e）。

## 测试设计

- **单测（vitest）**：
  - artifact-hash：TS 实现对金标语料输出固定 hex（语料与 rust fixture
    同源）；kind/len 混入有效性（同 source 异 kind 异键）。
  - artifactFor：math→kind html、mermaid→kind svg；error 透传。
  - enableArtifactStore：注册后 final 渲染触发 put（键形状、恰一次/
    幂等）；未注册零副作用；clearOptionalCapabilities 清 store。
  - edit 槽位：editSlotFor('MathBlock'/'Mermaid') 非 undefined 且
    render VNode 带 data-block-id/data-node-type。
  - mermaid edit 桥：debounce 调度与陈旧版本丢弃（fake timers）。
- **对拍**：artifact_hash 双发射金标（rust 侧 cargo test 同语料 hex）。
- **e2e（demo/e2e/extension-blocks.spec.ts 增节）**：math 块聚焦出编辑面
  （textarea + 预览区选择器）；改源码 → 预览更新/错误横幅；blur → 模型
  更新（保存后 roundtrip）；mermaid 编辑面三态（loading→svg、错误源 →
  横幅）；streaming readonly 横幅（stream demo 或 canEdit 流式用例）。
- **回归**：serializer-roundtrip / parse_parity 全量（文档零变化的
  守卫）；demo e2e 既有 12 spec 全绿。

## 验收标准

1. 聚焦 `%{ }%` 块与闭合 mermaid 块 → 专用编辑面（源码+预览同屏），
   blur 一步 undo 提交；非法源码 → 错误横幅且不崩。
2. 流式中两编辑面 readonly + 横幅；流式渐进三态测试在册全绿。
3. `artifactFor` 产 `svg`（mermaid）/`html`（math）；final 成功渲染触发
   `put`，键 = 双端一致的 `artifactHash`；未注册 store 时全部行为与
   今日一致（既有测试零改动通过）。
4. gen:editor 两连跑逐字节确定；assert-editor-gen 清单 16 SFC +
   9+2 ext 全绿；gen:render 与 rust trans 后对拍金标绿。
5. `.ad` 序列化格式零变化（roundtrip 金标零改动）；EDITOR-CONTRACT /
   ARCHITECTURE / DEBTS 更新在案。

## 执行步骤

- [x] T1 `auto/editor/math_edit_block.at` 新建 widget（D1 结构，含
      style 段与 readonly 横幅）；验证：`pnpm --filter @autodown/engine
      gen:editor` 两连跑 gen/components 出 `MathEditBlock.vue` 且逐字节
      确定。
      [✅ 已完成] MathEditBlock.vue 生成（v-model 折叠 + rows 绑定 +
      area ref + stream banner），两连跑 diff -r 逐字节一致；配套
      math_edit_ext.ts 桥先行落位（stage 引用需要）；gen.mjs widget
      计数 16→17。
- [x] T2 `auto/editor/mermaid_edit_block.at` 新建 widget（D2 三态）；
      验证同 T1（`MermaidEditBlock.vue`）。
      [✅ 已完成] MermaidEditBlock.vue 生成（loading/error/svg 三态 computed
      + scheduleMermaidRender 回调闭包 + v-model 折叠），两连跑 diff -r
      逐字节一致；配套 mermaid_edit_ext.ts（debounce 300ms + 版本号陈旧
      丢弃 + 空源同步直返）先行落位；gen.mjs 计数 17→18。
- [x] T3 `auto/editor/ext/math_edit_ext.ts` + `mermaid_edit_ext.ts`
      新建（D3：转发 + debounce + focus 复用）；验证：`node
      auto/editor/gen.mjs` 通过且 ext 无 TS 报错（vue-tsc）。
      [✅ 已完成] 两桥经 EXT_DEPLOY 部署至 src/editor/ext/；vue-tsc -b
      --force 退出码 0（math：renderKatexPreview/focusCodeArea/textareaRows
      re-export；mermaid：scheduleMermaidRender debounce+版本丢弃）。
- [x] T4 `scripts/assert-editor-gen.mjs` 部署清单 += 2 SFC + 2 ext，
      全量 regen + 部署至 `src/editor/`；验证：`node
      scripts/assert-editor-gen.mjs` 零退出。
      [✅ 已完成] assert 输出 "16 chrome products sourced, 11 ext bridges
      in sync"，退出码 0；DEPLOY_COMPONENTS += MathEditBlock/MermaidEditBlock
      → src/editor/components/。
- [x] T5 `src/editor/components/EngineEditor.vue`：mathEditSlot /
      mermaidEditSlot 注册（D4），删除 Mermaid→fenceEditSlot 复用；
      验证：`pnpm --filter @autodown/engine test` 编辑器用例绿 +
      demo 手检聚焦两块。
      [✅ 已完成] 两专用槽位注册（CodeEditorController 复用 +
      blockText 源），030 fence 复用删除；TDD 新
      math-mermaid-edit-block.test.ts 11 用例（注册/SSR chrome/错误横幅/
      readonly/blur-commit undo/roundtrip）；engine 全测 34 文件 505 用例
      绿。demo 手检聚焦两块并入 T10（样例落地后一并截图留档）。
- [x] T6 `auto/render/artifact_hash.at` 新建 + `pnpm gen:render` 双发射
      + rust trans/cp + 对拍金标语料（≥8 组）；验证：engine vitest
      hash 用例 + cargo 侧同语料测试绿。
      [✅ 已完成] 双发射（TS artifact-hash.generated.ts 零 post-fix + rust
      RP2 encode_utf16 包装器追加）；语料 10 组（中文/星面 emoji/多行/空/
      反斜杠）；TS 6 用例 + cargo artifact_hash_parity 2 用例绿，全 crate
      10 用例绿。**执行中发现的编译器约束与适配**（对拍测试当场逮到真实
      发散后修复）：① a2ts 不可发射 >2^31 的整数字面量→常数改算术构造；
② 发射器丢混合优先级括号→全部单运算符语句化；③ 朴素乘积峰值 2^57 超出
      JS double 精确域 2^53→mulMod32 16 位分裂乘法（中间量 < 2^49）；
      ④ 字符码单元迭代无跨端可移植原语（charCodeAt 仅 TS / char_at 仅
      rust / .length 两端语义分裂）→UTF-16 单位序列化留在平台边界
      （TS artifact-key.ts charCodeAt / rust encode_utf16），算法本体
      （FNV 循环 + len 混合 + 键装配）仍 .at 单源。
- [x] T7 `src/render/preview.ts`：RenderedArtifact + artifactFor
      （D6）；验证：vitest 新用例（math/mermaid kind 与 error 透传）。
      [✅ 已完成] preview-artifact.test.ts 4 用例（math→html katex body、
      非法源 error 数据化透传、mermaid→svg kind + body/error 互斥不变式、
      空源）全绿；renderKatexPreview/renderMermaidPreview 原样未动。
- [x] T8 `src/render/optional-capabilities.ts`：enableArtifactStore +
      final 成功 put 挂接（编辑面重渲染 + node view final 路径）；
      验证：vitest put 键形状/幂等/未注册零副作用。
      [✅ 已完成] put 咽喉点 recordArtifact（preview.ts，未注册 no-op）；
      node_view_ext 桥挂接：renderMathBlockPreview（新，math_block_node_view.at
      改用并 regen）+ renderMermaidPreview 包装（mermaid .at 零改动）；
      MathInline 保持无 put。artifact-store.test.ts 9 用例（恰一次/键形状/
      失败不写/幂等同键/未注册零副作用/clear 分离/桥路径）全绿；engine
      全测 524 用例绿（030 基线 505 + 031 新增 19）。编辑面 blur 后的
      预览重渲染由 panel final 路径覆盖（同一咽喉点，键幂等）。
- [x] T9 `demo/e2e/extension-blocks.spec.ts` 增 math/mermaid 编辑面 +
      渐进三态 + readonly 用例；验证：`pnpm --filter demo exec
      playwright test e2e/extension-blocks.spec.ts` 全绿。
      [✅ 已完成] 8/8 全绿：math 编辑面（聚焦挂载/实时预览/错误横幅/blur
      提交 Save roundtrip）+ mermaid 三态（loading→svg、错误源横幅）。
      渐进三态 fixture 落 engine 单测 streaming-math-mermaid.test.ts（4
      用例：未闭合 %{ 段落字面/开放 fence 不渲染 mermaid/闭合两 kind 面板）
      ——e2e 黑盒无法驱动渐进源（demo 无流式输入通道），fixture 归属与
      030 流式测试同族。readonly 横幅钉在 SSR 单测（T5，023 CodeEditorBlock
      先例：demo App 无 streaming 通道，改动生成 App.vue 超本步清单）。
      执行注记：e2e 文本注入用 fill()（本机 Windows 布局 keyboard.type
      丢反斜杠）。
- [x] T10 `demo/src/content.ts` 增两块编辑样例；`EDITOR-CONTRACT.md`
      选择器表 += 2（`.autodown-math-editor` / mermaid 同位类）+ 手验
      清单条目；验证：手检截图两张留档（同 029 T10 口径）。
      [✅ 已完成] content.ts 追加 \sum 求和公式 + flowchart LR 样例（追加
      在既有块后，不扰动 .first() 语义）；EDITOR-CONTRACT 选择器表 +2 行 +
      手验清单 031 条目（030 fence 复用表述同步改写）；截图
      math-edit-face.png / mermaid-edit-face.png 留档 e2e/screenshots/ 并
      目检（预览上/源码下、公式与 SVG 均渲染）；030 旧断言 .katex count=1
      因样例增补改 first()（不再钉样例数）；两 spec 10/10 全绿。
- [x] T11 `packages/engine/ARCHITECTURE.md` §5/§6（chrome 清单 14→16、
      工件契约段）+ `DEBTS.md`（020 余量销号 / 026② 部分销号 / 020 绿行
      改写为工件契约在册 / 新行：math SVG 选型跟踪 merman·RaTeX·MathJax）；
      验证：文档 diff 复核。
      [✅ 已完成] ARCHITECTURE §5 余量改写（编辑态深化销号，剩 Query/Embed
      装载）+ §6 部署物 14→16、ext 9→11 + 渲染工件契约段（三小节：工件
      形态/单源 hash 双发射/存储注入）；DEBTS：020🟡行销号（031 落地记录
      + 日期链 2026-09-01）、020 绿行改写为工件契约在册、026② 部分销号、
      新增 031 选型跟踪行（merman·RaTeX·MathJax·web 回填四候选）。diff
      与 UTF-8 完整性复核通过。
- [x] T12 全量回归：`pnpm --filter @autodown/engine build && pnpm
      --filter @autodown/engine test && pnpm --filter demo exec
      playwright test`；验证：三者全绿，零金标改动。
      [✅ 已完成] build ✓（vue-tsc + vite + parser-pure/no-tiptap/
      editor-gen/dist-stamp 五断言全过）；engine test 528/528 ✓（030 基线
      505 + 031 新增 23）；demo playwright 40/40 ✓（首轮 1 例瞬态失败，
      重跑全绿）；既有金标/fixture 零改动（唯一新金标 = 031 的
      artifact-hash.golden.txt，随 T6 在册）；cargo 侧全 crate 10/10
      （T6 在案）。

## 复审记录

**复审人**：/auto-plan:review（zhaopuming 会话）· 2026-09-01 · 于 .worktrees/plan-031-dev 复验（11 提交，39 文件 +2337/−46，工作树净）

**逐条验收（独立复跑，非采信勾选）**

1. **编辑面** PASS — extension-blocks e2e 4 新用例全绿（聚焦挂载/实时预览刷新/
   非法源错误横幅不崩/blur 提交 Save roundtrip 含新源）；单测 11 用例含 undo
   单步与 serialize roundtrip 断言。
2. **流式钉死** PASS — 渐进三态 fixture 4/4（未闭合字面/开放 fence 不渲染
   mermaid/闭合成块两 kind）；readonly 横幅+disabled SSR 双面钉死。注：readonly
   未做 e2e（demo 无 streaming 通道，改动生成 App.vue 超计划清单；SSR 钉死 =
   023 CodeEditorBlock 先例）——执行期在案偏差，等效覆盖。
3. **工件契约** PASS — artifactFor kind/error 断言 4/4；put 恰一次/键形状/
   幂等同键/未注册零副作用/clear 分离 9/9；TS↔rust 金标 10 语料逐字符一致
   （vitest 6/6 + cargo 2/2）；未注册时既有 505 用例零改动通过（全量 528）。
4. **生成门** PASS — 复审独立重跑 gen:editor 两连跑 diff -r 零差异；
   assert-editor-gen "16 chrome products, 11 ext bridges"；gen:render 后
   cargo 对拍绿；全部 regen+全测后工作树 git status 零改动（发射逐字节稳定）。
5. **零变化+文档** PASS — roundtrip/parse-parity 金标零改动（diff 无此类文件）；
   DEBTS（4 处）/ARCHITECTURE（§5/§6+契约段）/EDITOR-CONTRACT（表+2+清单）
   更新在案并经 diff 复核。

**全量门（本技能唯一一次）**：engine build（vue-tsc -b --force 干净；一次
TS2307 MarkdownRender.vue 瞬态，后续三次全 build 零复现——增量态竞态，非
031 所致）+ engine test 528/528 + demo playwright 38/40 + cargo 10/10。

**遗漏/延后/workaround 排查**

- 延后（在案·计划明文边界）：math SVG 选型（DEBTS 031 行四候选）、MathInline
  （DEBTS 026③）、VM 磁盘缓存消费、Query/Embed 装载（DEBTS 026①）——均经
  计划审定，非擅自缩水。
- 偏差（在案·执行期记录）：readonly e2e→SSR 钉死；渐进三态→engine fixture
  （e2e 黑盒无法驱动渐进源）；"编辑面 blur 后预览重渲染" put 位由 panel final
  路径覆盖（同一咽喉点、键幂等）。
- workaround（在案）：.at 编译器四约束适配（头注+ARCHITECTURE §6+T6 证据）；
  e2e fill()（Windows 键盘布局）；030 旧断言 .katex count=1→first()（样例
  增补后不再钉样例数）。
- **新发现 debt 候选（先于本计划）**：demo scroll-sync 底部两用例环境性
  flake——master 内容 A/B 同败（同值 3539/3575，master 两轮 2/6、3/6 败漂移），
  根因疑为自定义滚动条底部点击几何近似（track.height−10 不足全滚）随环境
  放大；非 031 回归（031 内容 2/6 败不多于 master）。建议单列小计划修滚动
  到底语义（SetScrollTop(1) 类绝对定位）或 DEBTS 登记。

**裁定**：五条验收全 PASS，无阻断性欠账 → status: archived，移交
/auto-plan:merge。

## 待澄清事项

1. **math SVG 生成器选型**（建议：v1 不引入，DEBTS 跟踪）——候选：V8 嵌
   真 MathJax（视觉最保真，~81MB 依赖，重）/ RaTeX（纯 Rust、宣称 >99.5%
   KaTeX 覆盖，输出形态待验证）/ web 侧渲染服务回填（vm host bridge
   `render` 动词，P022 先例）。工件契约的 `kind: 'html'|'svg'` 已为任一
   选型留位；v1 math 产 html，VM 端 math 维持源码降级（020 绿行现状）。
2. **Mermaid 编辑面替换 fence 复用**（建议：替换）——030 的复用是编辑态
   深化前的过渡；专用面带预览后 Fence 复用注册删除。若用户倾向保留
   复用 + 只加预览开关，D4 改为参数化 Fence 面 Tiger 一处（不推荐：高亮
   overlay 与 debounce 预览的状态机不同型）。
3. **工件 store 的 host 消费面**（建议：v1 仅注入接口 + demo 内存实现）——
   jade-garden 是否本计划内接磁盘缓存（`.preview-cache/` 侧车目录）？
   涉及 jade 端文件管理约定，倾向后置独立小计划。
