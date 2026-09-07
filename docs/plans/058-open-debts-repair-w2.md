---
plan_id: PLAN-058
status: reviewed
feature_name: 开放债修复轮 W2——jade 语义双修（uuid 稳定化 + 图谱 Obsidian 口径收敛）+ auto-lang 转介单执行波（②④⑥+048）+ e2e D3 断言加固 + 台账顺手清理
author: [zhaopuming]
created_at: 2026-09-07
updated_at: 2026-09-07
# worktree: /d/autostack/.wt/auto-down-058/auto-down (plan-058-dev)

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components:
  - "P022-2/P022-4（jade-garden VM 化目标与阶段划分）：storage 壳语义修订——块 uuid 稳定化（^id 锚块跨保存复用、无锚每存换新为登记行为）、链接行 block_uuid 与 BlockRow 同源、链接四面 Obsidian 口径统一（graphData title-only 解析）、VM 信封 base64 扩展（022 Phase 3 D4 豁免清零）"
  - "P052-2/P052-3（开放债修复轮 W1 + 转介单）：转介单 ②④⑥ 三条终结——②三缺口经 plan 576 清偿验证+绕道物理退役、④观感消费、⑥ base64 信封通道"
  - "P055-5/P055-2（表格编辑器测试设计）：D3 scroll-sync 底部断言收敛轮询化（expect.poll，判据=原目标合取）"
new_spec_components:
  - "PLAN-058 六节存款（goals/architecture/designs/tests/reviews/reports，merge 时入 specs.json）：面 A 语义双修裁定与实现、面 B 转介执行波（探针先例口径+绕道退役）、面 C 断言加固形态、面 D 台账清理"
touched_goals:
  - "P022-2: jade-garden VM 化——storage uuid/链接语义与信封通道收口"
  - "P046-2/P047-2: VM demo 对齐——观感残段（py-4 px-5/thumb/mermaid 标签）收口"
  - "P052-2: 开放债修复轮 W1——转介单余量清偿"
  - "P055-2: VM 表格编辑计划遗留 D3 测试债清偿"
  - "P057-2: VM 编辑链路——043 绕道退役回归（解释器真消费）"

current_step: 17
total_steps: 17
---

# [PLAN-058] 开放债修复轮 W2

## 变更摘要

四合一开放债批次（承接 PLAN-052 W1 之后的第二轮）：

- **面 A（组二·本仓 jade back 语义双修）**：两笔悬置语义裁定落地——①块 uuid
  跨保存稳定化（恢复 SQLite 原意图：`^id` 锚定块复用旧 uuid，查找挪到删除前；
  无锚块照旧每存换新）+ links/tags 行的 block_uuid 引用统一到稳定化后的
  BlockRow uuid；②图谱 `graphData` 收敛对齐 Obsidian 口径——裸 `[[alias]]`
  链接不再经 alias 解析建边（未解析即丢边，与反链 canonical-only、unlinked
  mentions 含 alias 的既有三面口径统一为「裸 alias 写法 = 未解析」）。
- **面 B（组一·auto-lang 转介单执行波）**：转介单 052 附件余量 ②④⑥ 三条 +
  048 mermaid 标签观感，在 auto-lang 仓修复（worktree 双侧，PLAN-057 先例）：
  ②043 三件引擎缺口（子件 handler 体 computed 解析 / 引号 emit 计算实参派发
  路由 / nanbox 整值 float 位型保真）→ 修复后本仓退役 custom_scrollbar.at
  双轨分派与 app.at `+1e-3` 分数化两绕道；④046 观感类 class 消费
  （`py-4 px-5` 内边距 + thumb 观感）+ 048 mermaid 标签可读性；⑥022 VM HTTP
  信封二进制通道（路线待澄清①，默认 base64-in-JSON）。
- **面 C（组三·仅 D3）**：055 D3 scroll-sync e2e 两处底部断言收敛轮询化
  （固定 `waitForTimeout(200)` + 即时断言 → `expect.poll` 收敛，满载重试余量）。
- **面 D（组四·台账顺手清理）**：DEBTS.md line22 陈旧重复行销号、面 A/B/C
  对应债行收口注记、027 Dependabot 行随 merge push 后重扫消账。

## 目标

1. **uuid 契约明确化**：`^id` 锚定块 uuid 跨保存稳定（对齐 parser.rs Block.uuid
   头注「Never changes once assigned」的声明语义），无锚块维持每存换新；
   LinkRow.source_block_uuid / TagRow.block_uuid 与 BlockRow.uuid 同源，
   反链跳块等消费面不再指向悬空 uuid。
2. **链接语义四面统一（Obsidian 口径）**：`[[Title|alias]]` 显示形态三面计入
   （既有）／裸 `[[alias]]` 反链不计入（既有）／unlinked mentions 含 alias
   纯文本（既有）／图谱不建边（本计划收敛）——「图里有边、反链没有」的
   消费面分裂消除。
3. **auto-lang 三件引擎缺口清偿**：computed 子件体解析、emit 计算实参派发
   路由、nanbox 整值 float 保真——两绕道（双轨分派 / 分数化）退役，vm-smoke
   全组净窗绿。
4. **观感残段清偿**：渲染面板内边距/thumb 观感 VM 点亮（PARITY 清单转 ✅）、
   mermaid 降级臂标签实机可读。
5. **桌面导入导出通道**：VM 形态 multipart/二进制过信封（路线按待澄清①）。
6. **e2e 稳健性**：scroll-sync 底部两断言获得收敛重试余量，满载 flake 消解。
7. **台账卫生**：陈旧行清除、收口行注记、Dependabot 终销。

## 架构方案

- **面 A 走单源再生纪律（P022-3 即日生效纪律）**：`linkgraph.at` 为唯一源，
  `node gen.mjs`（jade-garden/back/auto）双发射 `gen-ts/linkgraph_gen.ts` 与
  `server/src/linkgraph_gen.rs`；graphData 收敛在 .at 层做（新增 title-only
  解析 helper），不手改生成物。uuid 稳定化只在 server 壳层 index.rs（无 .at
  单源——storage 壳面，022 Phase 5 裁定形态）。
- **面 B 走 worktree 双侧纪律（Plan 529 / PLAN-057 先例）**：auto-lang 侧修复
  在彼仓工作臂推进，master 收净后折回；本仓侧只做绕道退役 + 验收门
  （vm-smoke / PARITY / probe）。auto-lang 嫌疑面以转介单 052 附件为 file 级
  指归（改写器 / 派发器 / renderer.rs nanbox / ui/autodown_blocks.rs /
  VM HTTP 信封）。
- **面 C 只动 demo e2e 断言形态**（Playwright `expect.poll` 收敛），不动被测
  行为；vue 轨 demo src 零改动承诺保持。
- **面 D 台面动作**：DEBTS.md 行级编辑，无代码。
- **不动面**：EDITOR-CONTRACT 冻结面零触碰；engine 包零触碰（面 B 本仓侧仅
  demo .at 与探针）；反链 `backlinksOf`/`outlinksOf`/`resolvePagePath` 既有
  语义零改动（Obsidian 口径下「查询侧 alias 解析」保留——打开别名的反链
  面板仍定位到 canonical 页）。

## 技术栈

Rust（axum server 壳 + serde JSON 索引）、Auto .at 单源（a2ts/a2r 双发射）、
auto-lang 编译器/VM（iced、mcp_server）、Playwright e2e、vm-smoke MCP 探针。

## 需求分析与背景调查

- **spec 台账**（.autoos/specs.json）：本计划触及 P022-2（jade VM 化——面 A
  属其 storage 壳面）、P022-3（即日生效纪律——.at 再生约束）、P046-2/P047-2
  （VM demo 对齐——面 B ④观感残段为其余量）、P052-2（债修轮 W1——转介单
  052 附件为本计划面 B 的直接输入）、P055-5（D3 flake 在册）、P057-2/P057-6
  （最新编辑链路口径与 vm-smoke 门控态基准——面 B 验收门沿用）。
- **DEBTS 台账开放项映射**：面 A 对应 022 两行（uuid 重新生成 `DEBTS.md:36`、
  反链 alias `DEBTS.md:51`）；面 B 对应 043 两行（`DEBTS.md:44-45`）、046 残段
  （`DEBTS.md:61`）、048 mermaid 标签（`DEBTS.md:66`）、022 multipart
  （`DEBTS.md:49`）；面 C 对应 055 D3（`DEBTS.md:72`）；面 D 对应 020 陈旧行
  （`DEBTS.md:22`，与 `:24` 同债重复未划线）+ 027（`DEBTS.md:52`，本地清零
  待 push 消账）。
- **裁定记录（2026-09-07 会话，用户拍板）**：①uuid 选「恢复原意图」——查找
  挪到删除前，只稳 `^id` 锚定块；②图谱/反链以 Obsidian 兼容为准绳——官方
  文档明确「补全插入 `[[真标题|alias]]`、裸 `[[alias]]` 刻意不解析（Wikilink
  互操作性）」，故反链维持 canonical-only、收敛方向在 graphData（唯一分歧
  面）。本仓 unlinked.rs:31-37 已含 alias 扫描（与 Obsidian unlinked mentions
  一致），无需动。
- **执行期发现（立案时勘察）**：parser.rs:42 每次解析为 Block 重新
  `generate_uuid()`，而 index_file 循环又独立生成 BlockRow uuid——两族 uuid
  从不同源，`extract_links`（index.rs:634-665）以 parsed.blocks 构造
  line_blocks，故 **LinkRow.source_block_uuid 现状恒指向 parser 临时 uuid，
  与 BlockRow.uuid 永不相等**（悬空引用，SQLite 保形继承）。面 A 目标 1 的
  引用统一即针对此。
- **转介单状态**：052 附件六条中 ①③⑤ 已结项；②④⑥ 开放——面 B 即其余量。
- **D3 读数基线**：057 复审 88/88（轻载全绿）+ 执行期 86/88（满载 2 败，
  master 基线同败实锤）——断言无重试余量是唯一短板，被测行为无缺陷。

## 详细设计

### A1 uuid 稳定化（jade-garden/back/server/src/index.rs）

`index_file` 现状：L119-126 四行 `retain` 先删本页旧行 → L139-148 稳定性
查找在 `self.data.blocks`（已空）上执行恒 miss。修改：

1. retain 块**之前**快照旧锚定行：
   `let old_anchored: Vec<(String,String)> = self.data.blocks.iter()
   .filter(|b| b.page_path == rel).filter_map(|b| b.block_id.as_ref()
   .map(|bid| (bid.clone(), b.uuid.clone()))).collect();`
2. L139-148 查找改在 `old_anchored` 上按 block_id 命中复用 uuid；同页重复
   block_id 取首命中（原意图语义，first-match-wins）。
3. 头注 L13-19「known latent quirk」段与 L119-122/L138 行内注释改写为已修
   语义（`^id` 锚定块跨保存稳定、无锚块每存换新为登记行为）。

### A2 links/tags uuid 引用统一（index.rs + links.at 消费面）

`extract_links`/`extract_tags`（index.rs:634-676）入参从 `&[Block]`（parser
产物，自带临时 uuid）改为直接接收 `(uuid, line_start, line_end)` 行集，由
index_file 以**稳定化后的 BlockRow 集**构造——LinkRow.source_block_uuid、
TagRow.block_uuid 从此与 BlockRow.uuid 同源。执行期核对 extract_tags 全部
调用面（links.rs rebuild 路径）同口径。

### A3 graphData Obsidian 收敛（jade-garden/back/auto/linkgraph.at）

1. 新增 title-only 解析（对照既有 resolvePagePath L114-126 形态）：
   `fn resolvePagePathByTitle(pages, title)` —— 只走 `eqIgnoreCase(p.title,
   title)`，不扫 aliases。
2. `graphData`（L239 起）边构造循环内的 `resolvePagePath(pages, aliases,
   l.targetPage)` 替换为 `resolvePagePathByTitle(pages, l.targetPage)`——裸
   alias target 解析为 "" → 边丢弃（与既有「unresolved dropped」语义合流）。
   `resolvePagePath` 本体不动（backlinksOf/outlinksOf 查询侧与 links.rs:232
   resolve API 继续含 alias）。
3. `node gen.mjs` 再生（AUTO_EXE 缺省 D:/autostack/auto-lang/target/debug/
   auto.exe）→ `linkgraph.raw.rs`/`linkgraph.raw.ts`/`server/src/
   linkgraph_gen.rs` 同步。
4. fixture 金标新增（linkgraph-fixtures.json，kind: graph，对照 L70「graph
   assembly degree and unresolved dropped」既有格式）：双链接用例——canonical
   链接建边 + 裸 alias 链接不建边；既有 case 2（backlinks alias not matched）
   原样保留。

### B auto-lang 转介执行波

按转介单 052 附件条目②④⑥ + DEBTS 048 行推进，全部走 auto-lang 仓工作臂
（PLAN-057 双侧先例：worktree 开工 → 彼仓 master merge → 本仓折回验收）：

- **②-① computed 子件体解析**：改写器 handler 解析面（现只认本件
  state_fields）扩认本件 computed 表——`.thumb_h` 类引用编译出真值，Nil
  静默传播消除。探针 = custom_scrollbar.at T10 注记场景的 computed 化
  重写（绕道退役的前置证据）。
- **②-② 引号 emit 计算实参派发路由**：子件体内 `."update:x"(v)` 编译为
  内联直调的现状改为经派发器路由（父级 `on<name>` 回送触发；剥离回放认
  `on_*` 之外的名形并携带计算实参快照）。
- **②-③ nanbox 整值 float 位型保真**：renderer.rs auto_val nanbox（PLAN-043
  T6 注记位）——整值 float（240.0/0.0）编码不再丢 float 标签；实参绑定与
  write_state 读写往返保真。
- **④ 观感 class 消费**：ui/autodown_blocks.rs 族组件臂 class 整串消费——
  渲染面板 `py-4 px-5` 内边距 + CustomScrollbar thumb 观感 VM 点亮。
- **048 mermaid 标签可读性**：FENCE_HEADER 族 Mermaid 家族 chrome 配色对齐
  math「math · web-only」可读先例（标签色/底对比）。
- **⑥ 信封二进制通道（待澄清①裁定后实施）**：默认 base64-in-JSON——VM
  HTTP 信封扩二进制字段族（如 `content_b64`），jade back assets/import/
  export 三路由 dispatch 适配；桌面形态导入导出往返为验收。

**本仓侧退役面（修复折回后）**：demo/auto/src/front/custom_scrollbar.at
T10 双轨分派段退役（恢复 vue emit 原语义单轨）；app.at rust 直写快道
`+1e-3` 分数化绕道退役（恢复朴素 write_state）；demo 再生 + e2e + vm-smoke
全组净窗复跑。

### C e2e D3 断言收敛（autodown/demo/e2e/scroll-sync.spec.ts）

两处（055/057 在册行号 :144/:176，现行文件「bottom toolbar does not cover
the last block」与「both panels reach their max scroll together」两用例）：
点击滚动条轨道底部后的 `waitForTimeout(200)` + 即时几何断言，改为
`expect.poll(() => …, { timeout: 5000 })` 收敛判据（工具栏用例 poll 至
`leftBottom <= actionsTop + 1`；max-scroll 用例 poll 至
`|leftScrollTop - leftMaxScroll| < 1`）。右栏 10px 容差与既有注释语义保形，
断言强度不降（收敛目标即原断言目标），仅获得满载下的重试余量。

### D 台账清理（DEBTS.md）

- line 22（020 blockParser 镜像保留陈旧重复行，真身 line 24 已销号）划线
  补销或删除；
- 022 uuid 行 / 022 反链行 / 043 两行 / 046 残段行 / 048 行 / 022 multipart
  行 / 055 D3 行：按面 A/B/C 实际收口状态注记销号；
- 027 Dependabot 行：merge push 后 GitHub alert 重扫确认终销（本计划内只
  注记动作，push 属 merge 阶段）。

## 测试设计

- **A1/A2 单测**（index.rs tests 模块，`open_in_memory` + 两次 `index_file`）：
  ①同 `^id` 锚块二次索引 uuid 不变；②无锚块二次索引 uuid 变化；③
  `extract_links` 后 LinkRow.source_block_uuid == 对应 BlockRow.uuid；
  ④`find_block(uuid)` 对二次索引后的旧 uuid 命中。
- **A3 双端金标**：`node tests/linkgraph-parity.mjs`（a2ts 臂）+
  `cargo test`（rust 臂，server/src/linkgraph_gen.rs parity 测试）——新
  fixture 双臂同断。
- **面 B 验收门**：vm-smoke 全组净窗（049 重试口径 + 057 待澄清④门控态
  基准）；PARITY.md T1/T2 实测类消费清单重跑（④两项转 ✅）；
  vm-webonly-chrome.png 复拍（048 标签可读）；⑥ 桌面形态导入导出往返
  （e2e 或手验留档）。auto-lang 侧单测按彼仓惯例随修随钉。
- **面 C**：`npx playwright test e2e/scroll-sync.spec.ts`（autodown/demo）
  连跑 ×3 + 全量 e2e 一轮 88/88。
- **回归门**：jade back `cargo test` 全绿；demo `pnpm build` 双绿（.at 再生
  后）；受影响面对照 057 口径（autodown_editor / mcp 探针不回退）。

## 验收标准

1. 022 uuid 债行可销：`^id` 锚块跨保存 uuid 稳定有单测钉死，links/tags
   block_uuid 与 BlockRow 同源有单测钉死。
2. 022 反链债行可销：裁定注记落册（Obsidian 口径），graphData 裸 alias
   不建边有双端金标，「图有边/反链没有」分裂消除。
3. 转介单 ②④⑥ + 048 可结项：三件引擎缺口修复 + 两绕道退役 + vm-smoke
   全组净窗绿；PARITY ④ 两项转 ✅；mermaid 标签实机可读留档；桌面导入
   导出往返成功。
4. 055 D3 债行可销：scroll-sync 两断言收敛轮询化，targeted ×3 + 全量
   88/88。
5. 台账卫生：line 22 清除，各收口行注记落册，027 push 消账动作注记在案。
6. 零回归：jade back cargo test 全绿、demo build/e2e 全绿、vm-smoke 既有
   组零漂移。

## 执行步骤

> granularity：每步 = 原子动作 + 文件 + 验证命令。面 B 的 auto-lang 侧
> 任务在彼仓工作臂执行（worktree 路径按 Plan 529 布局执行期落定）。

- [x] **T1** `jade-garden/back/server/src/index.rs` index_file：retain 块前
  快照 `old_anchored`（(block_id, uuid) 对，filter page_path==rel）；L139-148
  查找改查快照；头注 L13-19 与 L119-122/L138 注释改写。验证：
  `cd jade-garden/back/server && cargo test index` 全绿。
  [✅ 已完成] 快照查找落地（构造改 map→new_rows 单趟）；TDD 红→绿：
  `anchored_block_uuid_stable_across_saves` 红读数 v1≠v2（9e5a…≠d26b…）→
  绿；`cargo test index` 9/9。
- [x] **T2** `jade-garden/back/server/src/index.rs` extract_links/extract_tags：
  入参改收 (uuid, line_start, line_end) 行集，index_file 以稳定化后 BlockRow
  构造；核对 links.rs rebuild 路径调用面同口径。验证：`cargo test` 编译零
  警告全绿。
  [✅ 已完成] 两 helper 签名改 `&[BlockRow]`，index_file 以 new_rows 构造；
  调用面核对：extract_links/extract_tags 仅 index_file 消费（links.rs rebuild
  走 idx.index_file 同路径）；cargo check 无 index.rs 新警告（既有警告均在
  生成物/他模块）。
- [x] **T3** `jade-garden/back/server/src/index.rs` tests 模块：新增四用例
  （锚块 uuid 稳定 / 无锚块换新 / LinkRow.source_block_uuid==BlockRow.uuid /
  find_block 旧 uuid 命中）。验证：`cargo test` 新用例全绿。
  [✅ 已完成] 三测试覆盖四断言（稳定用例含 find_block(v1) 命中）；红读数：
  `link_and_tag_rows_reference_block_uuids` 红（link row uuid 3616… not in
  blocks——悬空 parser uuid 实锤）→ 绿；`unanchored_block_uuid_regenerates`
  改造前后恒绿（语义保形）。
- [x] **T4** `jade-garden/back/auto/linkgraph.at`：新增
  `resolvePagePathByTitle`；graphData 边循环改用之。`node gen.mjs` 再生。
  验证：`git diff --stat` 仅 linkgraph 三产物（raw.rs/raw.ts/_gen.rs）漂移。
  [✅ 已完成] .at 改造（新 fn 含 Obsidian 口径注记）+ gen.mjs 再生，漂移面
  = linkgraph 五件（.at/raw.rs/raw.ts/gen-ts/_gen.rs）+ fixture，无溢出。
- [x] **T5** `jade-garden/back/auto/tests/linkgraph-fixtures.json`：新增 graph
  裸-alias-不建边金标（对照 L70 既有 graph case 格式）。验证：
  `cd jade-garden/back/auto && node tests/linkgraph-parity.mjs` +
  `cd ../server && cargo test linkgraph` 双绿。
  [✅ 已完成] TDD 先红：rust 臂 `Journal degree 3≠1`（自环 j→daily 经 alias
  解析 + 入边，现行行为实锤）；改后双臂绿（`linkgraph parity ok — 8
  cases` / rust 1 passed）。
- [x] **T6** 面 A 回归门：`cd jade-garden/back/server && cargo test` 全量；
  jade front `pnpm build`（linkgraph_gen.ts 消费面零破坏）。读数入册。
  [✅ 已完成] back cargo test **43/43**；消费面核勘：linkgraph_gen.ts 在
  jade front **零 import**（grep 全仓仅 back/auto/gen-ts 与 tests/parity
  runner 消费，ts 臂由 parity 覆盖绿）——front build 对面 A 无新验证增量，
  免冷装（证据在册，复审可复查）。
- [x] **T7** auto-lang 工作臂开工：按 Plan 529 布局建 worktree，基线
  `cargo test --features autodown` 收净。验证：wt-guard clean 基线绿。
  [✅ 已完成-附基线红普查] worktree `.wt/auto-down-058/auto-lang`（branch
  auto-down-058-dev @ 67dc9ce6a，零 diff 基线）；**基线非净**：
  `cargo test -p auto-lang --features autodown --lib` = 4587 绿/201 红——
  稳定语义红 ~6（plan370 d2/d8/z6、plan492 c2、plan412、musk_vm_track——
  d2 判读为 AUTO_VM_MERGE merged-mode 下 #[api] no-op 链断裂，属彼仓域），
  ui:: 194 红→隔离跑收敛 19（负载相关 flake 放大，049 共享机族）；另
  workspace 级 --lib 被 `auto-cosmic-host-libcosmic` E0063 预存红阻断
  （missing field `selectable`）。**本计划门径修订**：面 B 验收 = 修复点
  定向测试红→绿 + 相对本基线零新增失败（基线普查在案可复核）。环境
  随行：aliyun 镜像新发 crate 文件缺失（find-msvc-tools 0.1.12/zstd-safe
  7.3.0）经 static.crates.io 补入 cargo 缓存（零仓内改动）。
- [x] **T8** 转介②-①：改写器 handler 解析扩本件 computed 表（Nil 静默传播
  消除）。验证：彼仓定向探针（custom_scrollbar computed 化重写样本）绿。
  [✅ 已清偿-探针降级回归锁] PLAN-576 D2 已修（handler_codegen.rs:88-113
  computed→隐藏函数改写）；探针 = plan058_engine_gap_tests 语料
  computed_resolves_in_used_child_handler（Child58 handler 体 `.half` 解析
  120.0）绿。
- [x] **T9** 转介②-②：引号 emit 计算实参改经派发器路由（父级 `on<name>`
  回送触发 + 剥离回放携带实参）。验证：彼仓派发路由单测绿。
  [✅ 已清偿-探针降级回归锁] PLAN-576 G3 已修（__emit 桥 + dynamic.rs
  G3 收尾读账清账走 lookup_route 链）；探针 =
  quoted_emit_with_computed_arg_routes_to_parent（root_half 经
  handler_App_GotHalf(Double(120.0))）绿。
- [x] **T10** 转介②-③：renderer.rs auto_val nanbox 整值 float 位型保真。
  验证：彼仓 nanbox 往返单测（240.0/0.0 write_state 读回）绿。
  [✅ 已清偿-探针降级回归锁] nanbox float 系过渡计划已修（plan499
  float_to_int 在册）；探针 5 例（write_state 往返/payload 绑定/三参首参
  /复合算式 RHS/int 宽化）全绿。三件均按转介⑤ R1/R4 先例降级为回归锁
  （auto-lang 1399bed5c）。
- [x] **T11** 本仓绕道退役：`autodown/demo/auto/src/front/custom_scrollbar.at`
  T10 双轨分派段恢复单轨；app.at `+1e-3` 分数化退役；demo 再生（auto gen
  流程）+ `npx playwright test`（demo e2e 全量）+ vm-smoke 全组净窗。读数
  入册（对照 057 门控态基准零漂移）。
  [✅ 已完成] custom_scrollbar.at：is_vm prop/Move 直写臂/left_* 双声明
  六字段移除（单轨 emit）；app.at：OnLeft/OnRightScroll 补快道同款对栏
  级联（SetScrollTop 本就等价）、is_vm 传参移除；auto-lang renderer.rs
  043 T6 三事件拦截臂整体移除（含 frac +1e-3）（e12edc1be/3ec54a0）。
  门：REGEN OK（worktree exe 再生+vue-tsc）；demo e2e **86/88**（2 败
  =scroll-sync :144/:176 = 055 D3 在册满载 flake，隔离复跑同败形）；净窗
  vm-smoke **门控态整轮 PASS**（VM_SKIP_SCROLL_LEG=1，组4 环境债 057
  待澄清④ 口径）+ 非门控组4 读数与基线同形（left_top 240.001 不收敛族，
  0.001 残差=offset 写入臂既有形态）零漂移。
- [x] **T12** 转介④：auto-lang `ui/autodown_blocks.rs` 族 class 消费
  （`py-4 px-5`/thumb）；`autodown/demo/auto/PARITY.md` T1/T2 清单重跑两项
  转 ✅。验证：清单读数 + 肉眼对照截图留档。
  [✅ 已完成] 双臂：auto-lang autodown 臂观感段内容侧 padded Container
  （autodown_padding_class helper）+ demo thumb token 改 bg-[#000000]/30
  （命名色+透明度 VM 不解析）；PARITY #5/#8/实测清单 py-px 行转 ✅；实机
  截图四点核验（右栏内边距/浅 fence 标签/thumb 灰色可见/浅主题）
  （be6f3f2ac/d8351ae）。
- [x] **T13** 048：Mermaid 家族 FENCE_HEADER chrome 标签配色对齐 math 可读
  先例。验证：`vm-webonly-chrome.png` 复拍标签实机可见。
  [✅ 已完成] 根因=family_of(Mermaid) 恒返暗档（Fence 有双档切换而
  Mermaid 无）；修=镜像 Fence 主题分派（FAMILY_MERMAID_LIGHT=
  FENCE_CHROME_LIGHT）+ 浅色档金标测试
  renders_degraded_mermaid_light_chrome；实机截图浅色 chrome 核验在案
  （be6f3f2ac）。
- [x] **T14** 转介⑥（待澄清①裁定后）：VM HTTP 信封 base64 字段族 + jade
  back assets/import/export 三路由适配。验证：桌面形态导入导出往返成功
  （e2e 或手验留档）。
  [✅ 已完成] 待澄清①按默认 **base64-in-JSON** 执行：三路由 core 抽取
  （export_markdown_core/import_markdown_core/upload_asset_core，axum 壳
  multipart/binary 原语义不动）+ vm_dispatch 三臂信封（{name,data_b64}/
  {data_b64}/{format,encoding,data}，导入后 rebuild_index_sync）+ api.at
  #[api] 三声明（门豁免清单清空，28/28 一致、桌面副本字节同步）；验证 =
  **dispatch 级往返双测**（导出→删源→导入→文件+索引恢复；资产字节
  落盘）+ back cargo test **45/45**（032a8bd）。web 轨 fetch 层零改动；
  desktop UI 按钮接线为后续面（债项=通道非 UI，披露在案）。
- [x] **T15** auto-lang 折回：彼仓 master merge（wt-guard clean）+ 转介单
  052 附件 ②④⑥ 条目收口注记 + 彼仓 DEBTS 镜像行销号。验证：双侧 master
  收净，merge 幂等。
  [✅ 已完成] auto-lang 侧 5 commit 折回（merge 1cfa2bd34 + DEBTS 注记
  d016aa4ba，wt-guard clean、worktree 已同步）；彼仓 DEBTS 043 两行补
  物理退役注记（plan 576 待澄清#2 的「另行立项」即本计划，闭环）；
  转介单 ②④⑥ 三条终结注记落册（d7169cc）；tv 档 3610 绿/1 红=charts
  在册（057 同款口径）。
- [x] **T16** `autodown/demo/e2e/scroll-sync.spec.ts`：两用例断言
  `expect.poll`（timeout 5000）收敛化。验证：`npx playwright test
  e2e/scroll-sync.spec.ts` ×3 + 全量 e2e 88/88。
  [✅ 已完成] 收敛轮询化（7bb1803）；隔离 ×3 **7/7×3 全绿** + 全量
  **88/88**（执行期同窗满载 86/88 的 D3 族消解——与 T11 门读数形成
  前/后对照）。
- [x] **T17** `DEBTS.md`：line 22 划线销号；022 uuid/反链、043×2、046、048、
  022-multipart、055-D3 各行按 T1-T16 实际收口注记；027 行补 push 后重扫
  消账动作注记。验证：台账行与计划验收 1-5 一一对应。
  [✅ 已完成] 九行销号 + line22 划线 + 027 注记（d55da8a）；与验收 1-5
  一一对应（uuid/反链→1-2、转介②④⑥+048→3、D3→4、台账→5）。

## 复审记录

**复审人**：zhaopuming 会话（ZCode）；**时间**：2026-09-07；**入口态**：execution_done → **裁定：reviewed（PASS）**。

### 逐项验收复审（全部独立复跑，不信勾选框）

1. **022 uuid 债可销 — PASS**：worktree 复跑 `cargo test`（45/45），四断言用例在
   册（anchored_block_uuid_stable_across_saves 含 find_block 旧 uuid 命中、
   unanchored 换新保形、link_and_tag_rows_reference_block_uuids 行引用同源）；
   index.rs:123 old_anchored 快照代码实读确认。
2. **022 反链债可销 — PASS**：裁定注记落册（Obsidian 口径，官方文档引证在
   计划正文）；`node tests/linkgraph-parity.mjs` 8 cases 绿 + rust 臂 45/45；
   linkgraph.at:131 resolvePagePathByTitle + :265 graphData 消费实读确认；
   金标自环反例在 fixtures（红→绿过程在 T5 证据）。
3. **转介②④⑥+048 可结项 — PASS**：auto-lang 侧 plan058 探针 + mermaid 浅色
   测试 **9/9 复跑绿**（master HEAD）；custom_scrollbar.at `is_vm` 计数=0、
   renderer.rs 拦截臂移除（仅注释提及）实读确认；PARITY #5/#8/实测清单行
   ✅ 注记在册；转介单 ②④⑥ 终结注记 ×3 在册；⑥ dispatch 级往返双测
   （vm_envelope_export_import_roundtrip/asset_upload）随 45/45 复跑绿，
   契约门 28/28 + 豁免清零 + 桌面副本字节一致。
4. **055 D3 债可销 — PASS**：scroll-sync.spec.ts 两用例 expect.poll 形态实读
   确认（判据=原断言合取）；复审期全量 demo e2e **88/88**（1.7m）。
5. **台账卫生 — PASS**：DEBTS 10 处 PLAN-058 注记（九行销号+027 push 注记）、
   line22 陈旧重复行划线、与验收 1-5 一一对应。
6. **零回归 — PASS**：范围核对 f316f9b..HEAD = 28 文件（jade back/demo/
   台账），**packages/engine 零触碰**；back cargo test 45/45、契约/parity 门
   绿、demo e2e 88/88、净窗 vm-smoke 门控态整轮 PASS（master HEAD exe 重建
   后复审自跑）、非门控组4 读数与在册基线同形（left_top 240.001 族零漂移）、
   auto-lang tv 档 3610 绿/唯一红=charts 在册（057 同款口径）。

### 遗漏/延后/workaround 清猎（Step 3 专项）

- **遗漏**：无——每任务均有对应 diff 证据；T4 验证文「三产物」与实际五件
  （含 .at/fixture）之差已在执行期 marker 内自纠为「五件」。
- **延后（均有披露、无静默）**：①desktop 导入导出 UI 按钮接线（债项=通道
  非_ui，验收按通道口径达成）；②vm-smoke 组4 环境债 DEBTS 补登记（归复审
  裁定，见下）；③027 push 后 GitHub 重扫（merge push 属用户动作）。
- **workaround/残留（非阻断债候，auto-lang 侧）**：①`__mcp_drag` 合成坐标
  仍 +0.001（renderer.rs ~11818——nanbox 绕道在测试仪器路径的余音，0.001px
  仪器噪声、产品面零影响）；②renderer.rs PLAN-043 T10 注释段残留
  「SetScrollTop fast-path/frac」旧措辞（纯注释陈旧）；③环境类：aliyun
  镜像 index 新版本条目回退致 Cargo.lock（彼仓 gitignored 本地件）经官方
  index 降 pin（find-msvc-tools 0.1.11/zstd-safe 7.2.4）——零仓内内容变更。
- **复审裁定（待澄清④延伸）**：vm-smoke 组4 环境债维持「不补 DEBTS 行」——
  057 待澄清④已追认门控态等效且注明「归债主计划裁定」，本计划零施工零
  漂移，再立一行属冗余登记；037 滚动状态回写漂移族的收口仍归彼族债主
  计划。

### 复审结论

六验收全 PASS，无阻断债；两项非阻断仪器/注释残留（auto-lang 侧）+ 三项
披露延后在案。**路由：reviewed，可进 /auto-plan:merge。**

## 待澄清事项

1. **转介⑥ 信封路线**：默认 **base64-in-JSON**（改动小、JSON 协议向后
   兼容、三路由适配面窄）；备选分块 multipart（协议强但工程重）或宿主
   文件能力桥（绕开信封但引入宿主 API）。若选非默认，T14 重设计。
2. **面 B 执行载体确认**：auto-lang 侧修复由本会话经彼仓 worktree 推进
   （057 双侧先例，T7-T15 即按此写）；若彼仓另有会话在推，改为转介登记
   面收口（T7-T15 缩为验收门）。
3. **T11 绕道退役的时序**：三件引擎缺口（T8-T10）须全部折回后再退役双轨
   分派与分数化（两绕道分别依赖 ②-①②-② 与 ②-③）；若某件彼仓修复受阻，
   对应绕道延后退役并披露，不阻塞面 A/C/D。
4. **vm-smoke 组 4 滚动腿环境债**（053 待澄清⑦族，057 追认门控态等效）：
   本计划不施工；复审时裁定是否顺手补一行 DEBTS 集中登记（现状散在三个
   计划文件）。
5. **auto-lang master 基线非净（T7 普查，2026-09-07）**：67dc9ce6a 上
   `cargo test -p auto-lang --features autodown --lib` 4587 绿/201 红——
   ~6 稳定语义红（plan370_015 d2_new_note_appends/d8_toggle_dark_mode/
   z6_export_prolog_alignment、plan492 m4 c2、plan412、musk_vm_track；
   d2 判读=merged-mode #[api] no-op 下 store 链断，待澄清 AUTO_VM_MERGE
   环境口径）+ ui:: 负载放大 flake 族（全量 194→隔离 19）+
   auto-cosmic-host-libcosmic E0063 阻断 workspace 级 --lib。**裁定请求**：
   ①面 B 门径按「定向红→绿 + 基线零新增」执行（已按此推进）；②彼仓
   基线修复是否单独立项归 auto-lang 侧裁定（本计划不施工）。
