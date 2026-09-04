---
plan_id: PLAN-052
status: drafting
feature_name: 开放债修复轮 W1——依赖安全清偿 + npm publish 前置 + 051-候选 VM 主题回归排查 + auto-lang 转介单
author: [zhaopuming]
created_at: 2026-09-04T23:50:28+08:00
updated_at: 2026-09-04T23:50:28+08:00

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 0
total_steps: 15
---

# [PLAN-052] 开放债修复轮 W1（DEBTS 开放债清偿第一波）

## 变更摘要

对 DEBTS.md 开放债（2026-09-04 调研盘点，见需求分析）执行第一波清偿：

1. **依赖安全清偿**（DEBTS 027）：`pnpm audit` 16 项（9 高/6 中/1 低，全在
   semver 补丁区间）清零 + 全门回归；
2. **engine npm publish 技术前置**（DEBTS 008 行8 余量）：旧包 shim 已物理
   归档（2026-09-04，DEBTS 020 行28 销号）后，engine 已零 workspace 依赖，
   剩余前置 = changesets 对账（0.x 版本策略）+ publishConfig.exports 剥
   `development` 条件 + `pnpm pack` tarball 验证；实际 publish 择时由用户裁定；
3. **051-候选 VM 主题回归排查**（DEBTS 051-候选行）：VM 浅色档 view 臂深色
   chrome 的稳定复现探针 + 嫌疑面隔离 + vm-smoke 回归断言 + auto-lang 转介；
4. **auto-lang 侧转介单**：043①②③ / 048 / 046 残段 / 016 / 022 五组打包成
   带本仓复现命令的转介文档。

不进本轮（按需池，见需求分析末节）：019 a2r 性能、008 parser 扩集余量
（footnote/mark/sub/sup/insert/html/linkify）、030 方言四件、039 CodeMirror
目标态（两前置裁定后另立计划）。

## 目标

- **G1**：`pnpm audit` 在 autodown workspace 清零（16→0），门回归全绿
  （engine test/build、demo/stream-demo build、demo e2e、crate cargo test）；
  GitHub Dependabot 报警随 push 后消账（DEBTS 027 行销号注记）。
- **G2**：`pnpm pack` 产出的 engine tarball（a）不含 src/（files: ['dist'] 不
  变），（b）内嵌 package.json 的 exports 无 `development` 条件（publishConfig
  覆盖，工作区 dev-直连纪律不动——P027-2 development 条件出口语义保形），
  （c）临时工程装入 tarball 后 `./parser` 出口可 import 且 `parse_blocks` 真
  跑通。changesets pending 集合合并结果 = 单次 minor（0.x 策略对账）。
- **G3**：051-候选有可复现读数（探针脚本在库，当前 master 二进制 view 臂
  vs edit 臂 chrome 档分叉实测在案）、嫌疑面 pinpoint 到 auto-lang 文件级、
  vm-smoke 增回归断言组（known-fork 门控）、DEBTS 行更新为「转介在案」。
- **G4**：转介单 `docs/plans/attachments/052-auto-lang-transfer.md` 在库，五
  组条目每条含症状/本仓复现命令/嫌疑面/绕道现状/建议验收；DEBTS 对应行加
  转介注记。

## 架构方案

- **依赖升级不跨 major**：16 项 advisory 全在补丁区间（mermaid 11.16.0→
  11.16.1 为 engine 直依赖 `^11.16.0` 内更新；brace-expansion/fast-uri/
  js-yaml/nanoid/dompurify/postcss 为传递依赖），主路径 = `pnpm audit --fix`
  + `pnpm update`，残项 `pnpm.overrides`（autodown/package.json）钉补丁版。
  vite 6/vitest 3/vue 3.5 主依赖不跟 major。
- **publish 剥离走 publishConfig 而非改 exports**：engine 五出口的
  `development` 条件是 P027-2 dev/e2e 直连源码的结构性依赖（jade/demo
  optimizeDeps.exclude + serve conditions 消费），工作区语义不动；npm 面
  由 pnpm publish 的 publishConfig.exports 字段覆盖（pack 时替换）。这保住
  「同一 package.json 双形态」——工作区 dev 直连 / tarball 纯 dist。
- **051-候选排查形态**：不猜修 auto-lang 代码（彼仓纪律），本仓侧交付
  「读数 + pinpoint + 回归门」。探针复用 vm-smoke 的 MCP 驱动通道（043/044/
  045 先例：合成消息 + 快照断言），读 view 臂（renderer 右栏）与 edit 臂
  fence 块 chrome 底色并对照 FENCE_CHROME_LIGHT 期望值；隔离变量 = 首帧 vs
  D-GAP 翻转后、StreamCache 冷/热、family_of 读取时机三轴。
- **转介单形态**：单一 markdown 附件（docs/plans/attachments/ 先例：051 的
  PNG/对拍门附件），条目结构对齐 DEBTS 行字段，每条附可直接粘贴执行的
  复现命令（demo mjs 探针或 cargo test 定向）。

## 技术栈

pnpm 9 workspace / changesets / vitest / vue-tsc / vite / Playwright（demo
e2e）/ cargo（packages/engine/rust crate，2026-09-04 迁入）/ MCP 驱动
vm-smoke（node mjs）。

## 需求分析与背景调查

### 开放债盘点（2026-09-04，DEBTS.md 逐行调研）

**本仓可执行（进本轮）：**

| 债 | 证据（本次调研实测） | 归宿 |
|---|---|---|
| 027 依赖漏洞 | `pnpm audit`（autodown/）实测 16 项：high×9（brace-expansion ≥4<5.0.9、fast-uri ≥3<3.1.5、js-yaml ≥3<3.15.1、nanoid <3.3.18）、moderate×6（dompurify ≤3.4.12、postcss ≤8.5.22）、low×1（mermaid <11.16.1，engine 直依赖 ^11.16.0 内可更）；`--prod` 面 8 项。jade-garden 无 pnpm-lock（link: 形态，audit 不可跑）——GitHub 报 30 项含多 manifest 面，本地清零后随 push 消账 | 本仓 |
| 008 行8 publish 前置 | 旧包 core/vue/editor 已归档（DEBTS 020 行28 销号 2026-09-04），engine deps 零 workspace:*；唯 exports 五出口全带 `development`（./src 直连）而 files: ['dist']——tarball 面 dev 条件命中即断（plan 027 复审裁定原文）。changesets pending 五件中 plan-020 仍是 `major`，与 2026-08-28 版本策略（0.x 不得占 1.0）冲突，须对账 | 本仓 |
| 051-候选 VM view 臂深 chrome | 干净启动 12s 稳定复现，dark 档两臂一致；master A/B 实证非 051 引入（050 证档时点 view 臂浅档正常→回归落在 050 折入后并行合并 532/539/546/548/549 窗口）；嫌疑面 = aura_view_builder autodown 臂 + StreamCache/Element 缓存主题档解析（D-GAP 标脏重建语义或 family_of 读取时机）。本仓侧 app.at 双臂 `dark_mode`/`accent` 声明接线已验（051 T5） | 复现在本仓 / 修复在 auto-lang |

**auto-lang 侧（本轮只出转介单）：**

| 债 | 症状 | 本仓侧证据位 |
|---|---|---|
| 043① | use 导入子件 handler 体内 computed 不解析（Nil 传播静默假） | demo/auto/src/front/custom_scrollbar.at T10 绕道注记 |
| 043② | 子件引号 emit（带计算实参）无派发路由 | 同上（父传 is_vm prop 双轨分派绕道） |
| 043③ nanbox | 整值 float 编码丢 float 标签（write_state 写入读回 0） | 043 滚动同步 rust 直写 +1e-3 分数化绕道 |
| 048 | 真实键盘编辑不回写 .at state.content（on_change publish→解释器 .App.Edit 消费链断；MCP type_text 专用通道正常——046/047 验证均走 type_text 故未暴露） | demo/auto/src/front/app.at:251 `oninput: .Edit` 接线；PLAN-048 待澄清⑩ |
| 046 残段 | 渲染面板 py-4 px-5 等观感类 VM 缺席 + CustomScrollbar thumb 观感 | demo/auto/PARITY.md #4/#8 |
| 016 | a2ts T1-T4 / a2r R1/R4+五小修（Phase 4 crate 试点硬前置） | tmp/dsl-probes/plan016/REPORT.md |
| 022 | VM 信封不过 multipart/二进制（assets/import/export 三路由 400，桌面导入导出无通道） | jade-garden back dispatch；desktop/README §3 |

**按需池（明确不进本轮）：** 019 a2r chars 性能（1MB parse 33s，优化路径
在案：char_at 分派/运行段重写/chars 缓存——触发条件=出现全量 parse 消费
场景）；008 行6 parser 扩集余量（footnote/mark/sub/sup/insert/html 块/
linkify，按 036 口径每项金标+守恒，触发=出现需求方）；030 方言四件（①
alias 用户已裁定不做）；039 CodeMirror 目标态（前置①npm 组件桥通道②
@codemirror 依赖族裁定，达成后另立计划）。

### 规约锚点（specs overview）

- P027-2「下游 dev 直连 engine 源码（development 条件出口）」——本轮 G2
  不得破坏该出口语义（publishConfig 覆盖而非删条件）；
- P050-2 / P051-2（VM 代码块渲染对齐 / 主题规约化与双轨 settings）——
  051-候选是两目标收口后的回归残段，回归门（G3）是两 goal 的守卫延伸；
- 架构四层纪律（.at 单源 → gen → 部署 → 测试对拍）：探针/断言走 vm-smoke
  既有 MCP 通道，不新增并行机制。

## 详细设计

### W1 依赖安全（G1）

1. 基线取证：`pnpm audit --json` 存档 + `pnpm why <pkg>` 逐项归属直接依赖
   方（写入执行记录，DEBTS 027 行销号注记引用）；
2. 修复序：`pnpm update mermaid`（直依赖）→ `pnpm audit --fix`（lockfile
   重写）→ 复跑 audit；残项在 autodown/package.json `pnpm.overrides` 钉
   补丁版本（如 `"js-yaml@<3.15.1": ">=3.15.1"` 形态）；
3. 门回归四件套 + demo e2e（浏览器端依赖链 vite/playwright 实际加载面）。

### W2 publish 前置（G2）

1. changesets 对账：`.changeset/plan-020-engine-1.0.0.md` frontmatter
   `major`→`minor`（0.x 策略，2026-08-28-engine-version-policy-0-5-0.md
   裁定在案），文件名与标题的 1.0.0 字样加删改注记不重命名（历史引用面）；
   `npx changeset status` 核对 pending 集合合并 = 单次 minor；
2. engine package.json 增 `publishConfig.exports`：五出口同名键、剥
   `development` 条件（`./style.css` 保留 default→dist）；头注交叉引用
   P027-2 dev-直连纪律；
3. `pnpm pack` 验证三断言：tar -tf 无 `package/src/`；解包 package.json
   无 `"development"` 键；临时工程（tmp 下 npm init + 装tarball）node
   import `@autodown/engine/parser` 且 `parse_blocks('# a\n', true)` 真跑
   （`./render`/`.` 出口 import-only smoke）。

### W3 051-候选排查（G3）

1. 探针 `demo/auto/probe-051-view-theme.mjs`：复用 vm-smoke 启动/MCP 通道；
   浅色档（干净启动默认）读 view 臂与 edit 臂各一个 fence 块的 chrome 底
   色（MCP 快照/截图取色二选一，以 050 证档脚本口径为准），输出
   `view=<值> edit=<值> expected(FENCE_CHROME_LIGHT)=<值>` 判读行；
2. 隔离三轴：首帧 vs 运行 settings 翻转（浅→深→浅）后；StreamCache 命中
   （同文档二次渲染）vs 冷；启动即浅档 vs D-GAP 翻转落浅档——读数矩阵定
   嫌疑面（aura_view_builder 读档时机 vs 缓存陈旧 vs 标脏重建语义），结论
   写入复审记录并给 auto-lang 文件级 pinpoint（候选：auto-lang ui/iced/
   renderer.rs dynamic_view D-GAP 标脏臂 / aura_view_builder autodown 臂 /
   StreamCache 重建条件）；
3. 回归断言：vm-smoke 增第八断言组「light-mode view-arm fence chrome =
   FENCE_CHROME_LIGHT 容器色」，`AUTO_VM_KNOWN_FORK=1` 环境门控跳过并大声
   注记（auto-lang 修复后摘门控转硬断言——047/048 known-flake 门控先例）；
4. DEBTS 051-候选行更新：附探针路径 + 读数 + pinpoint，状态「转介在案」。

### W4 转介单（G4）

`docs/plans/attachments/052-auto-lang-transfer.md` 五组条目（043①②③合
一条、048、046 残段、016、022），每条字段：症状 / 本仓复现命令（可粘贴
执行）/ 嫌疑面（文件级）/ 绕道现状 / 建议验收；DEBTS 对应行尾加「转介单
在案（052 附件）」注记。

## 测试设计

- **W1 门**：engine `pnpm test`（786 基线）+ `pnpm build`（含四卫兵）；
  demo/stream-demo `pnpm build`；crate `cargo test`（15 基线）；demo
  Playwright e2e（73 用例基线）+ stream-demo e2e；
- **W2 门**：`pnpm audit` exit 0；`npx changeset status` 输出 minor 单升；
  tarball 三断言（无 src / 无 development / parser 出口真跑）；
- **W3 门**：探针在当前 master 二进制复现分叉（预期红读数）；vm-smoke
  整轮 known-fork 门控下 exit 0；判读矩阵三轴读数齐全；
- **W4 门**：转介单五条目字段完备性 checklist。

## 验收标准

1. `pnpm audit`（autodown/）0 vulnerabilities；DEBTS 027 行销号注记（含
   GitHub 面「随 push 消账」说明）；
2. engine tarball 三断言全过；DEBTS 008 行8 注记「publish 技术前置就绪，
   实际 publish 择时（token/registry 用户决策）」；
3. 探针脚本 + 读数 + pinpoint + vm-smoke 第八组（门控态）在库；DEBTS
   051-候选行「转介在案」；
4. 转介单在库且五组齐全；DEBTS 043/048/046/016/022 行尾注记；
5. 全门复跑绿（engine test/build、demo/stream-demo build、cargo test、
   demo e2e）；无 .at 源与部署物漂移（assert-editor-gen 等卫兵含在 build）。

## 执行步骤

> 每步原子：文件路径 + 操作 + 验证命令。工作树纪律按 /auto-plan:work。

- [ ] **T1** audit 基线取证：`cd autodown && pnpm audit --json > ../tmp/052-audit-baseline.json`，`pnpm why brace-expansion fast-uri js-yaml nanoid dompurify postcss mermaid` 归属直接依赖方，写入本计划复审记录。验证：基线文件存在且含 16 项。
- [ ] **T2** 直依赖更新：`autodown/packages/engine/package.json` mermaid `^11.16.0` 不动（区间内更新即可），`cd autodown && pnpm update mermaid`。验证：`pnpm list mermaid --depth -1 | grep 11.16.1` 或更新版。
- [ ] **T3** 传递依赖修复：`cd autodown && pnpm audit --fix`，复跑 `pnpm audit`；残项写 `autodown/package.json` 的 `pnpm.overrides`（钉补丁版，逐项注记 advisory 编号）。验证：`pnpm audit` 输出 0 vulnerabilities。
- [ ] **T4** W1 门回归：`cd autodown/packages/engine && pnpm test && pnpm build`；`cd ../demo && pnpm build`；`cd ../stream-demo && pnpm build`；`cd ../engine/rust && cargo test`。验证：全绿（engine 测试数 ≥786、cargo ≥15）。
- [ ] **T5** e2e 回归：`cd autodown/demo && pnpm test`（若 test 非 e2e 入口则以 `npx playwright test` 为准）；`cd ../stream-demo && pnpm test`。验证：用例数不低于基线（demo 73）全绿；vm-smoke 整轮 exit 0。
- [ ] **T6** changesets 对账：编辑 `autodown/.changeset/plan-020-engine-1.0.0.md`——frontmatter `'@autodown/engine': major`→`minor`，正文头部加一行注记「（0.x 版本策略修订：1.0.0 修正为 0.5.0 已于 2026-08-28 裁定，本条 bump 随改 minor；文件名保留历史引用）」。验证：`cd autodown && npx changeset status` 无 major 项。
- [ ] **T7** publishConfig.exports：编辑 `autodown/packages/engine/package.json`——新增 `publishConfig.exports`（`.`/`./parser`/`./render`/`./editor` 各 import+types→dist、`./style.css` default→dist/style.css，全部无 development 键），顶层注记字段不可用则以 README/ARCHITECTURE 注一行「publish 形态=publishConfig 覆盖（P027-2 dev 直连不废）」。验证：`node -e "const p=require('./package.json'); console.log(Object.keys(p.publishConfig.exports))"` 列五出口。
- [ ] **T8** tarball 三断言：`cd autodown/packages/engine && pnpm pack`；`tar -tf autodown-engine-*.tgz | grep -c "^package/src/"`（期望 0）；解包 `package/package.json` grep development（期望 0）；tmp 下 `npm init -y && npm i <tgz路径> && node -e "import('@autodown/engine/parser').then(m=>console.log(m.parse_blocks('# a\n',true).children[0].kind))"`（期望 Heading）。验证：三断言输出在执行记录。
- [ ] **T9** DEBTS 008 行8 注记：`DEBTS.md` 该行尾追加「▶ 技术前置就绪（052 T7/T8，2026-09-XX）：publishConfig 剥 development + tarball 三断言过；实际 publish 择时（npm token/registry 用户决策）」。验证：grep 到注记。
- [ ] **T10** 探针脚本：新建 `autodown/demo/auto/probe-051-view-theme.mjs`（复用 vm-smoke.mjs 的启动/MCP 通道口径，头注引用 051-候选 DEBTS 行）：浅色档干净启动，读两臂 fence chrome 底色，输出判读行。验证：`node probe-051-view-theme.mjs` 产出 view/edit/expected 三值读数（预期分叉：view 深档、edit 浅档）。
- [ ] **T11** 隔离三轴读数：探针增变体（首帧/翻转后 × 冷/热缓存 × 启动浅档/翻转落浅档），读数矩阵 + pinpoint 结论写入本计划复审记录（auto-lang 文件级）。验证：矩阵 6 格读数齐全且结论指向单一嫌疑面（或明确二分）。
- [ ] **T12** 回归断言：`autodown/demo/auto/vm-smoke.mjs` 增第八断言组（light 档 view 臂 fence 底色 = FENCE_CHROME_LIGHT 容器色），`AUTO_VM_KNOWN_FORK=1` 门控跳过+注记。验证：门控态整轮 exit 0；去门控单跑该组红（复现分叉）。
- [ ] **T13** DEBTS 051-候选行更新：附探针路径/读数/pinpoint，状态改「转介在案」。验证：grep 到探针路径。
- [ ] **T14** 转介单：新建 `docs/plans/attachments/052-auto-lang-transfer.md`（五组条目，字段=症状/本仓复现命令/嫌疑面/绕道现状/建议验收）；DEBTS 043 两行/048 行/046 行/016 两行/022 行尾加「转介单在案（052 附件）」。验证：五条目 checklist 过。
- [ ] **T15** 终门 + PARITY：`cd autodown && pnpm -r build && pnpm --filter @autodown/engine test`；`cd demo && pnpm test`；PARITY.md 视 T11 结论补 051-候选读数注记。验证：全绿 + DEBTS 终态对账（027/008行8/051-候选/转介五行）。

## 复审记录

（T1 基线取证与 T11 隔离矩阵读数落此处）

## 待澄清事项

1. **实际 npm publish 是否本轮执行**：默认否——G2 只交付技术前置
   （tarball 三断言），publish 动作（registry/token/公开面）是用户决策；
2. **依赖是否允许跨 major 跟版**：默认否——16 项全在补丁区间，vite 6/
   vitest 3 主版本不动；若 audit --fix 后仍有残项且只有 major 可解，暂停
   上报再裁定；
3. **051-候选若排查落点在本仓**（如 demo .at 绑定时序而非 auto-lang 缓存）：
   允许改判本仓直修，改判记录入复审记录；
4. **Dependabot 消账口径**：本地 audit 清零 ≠ GitHub alert 消失，须 push
   后 GitHub 重扫确认（T9 注记明示，避免误销号）。
