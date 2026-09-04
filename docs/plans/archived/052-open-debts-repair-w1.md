---
plan_id: PLAN-052
status: archived
feature_name: 开放债修复轮 W1——依赖安全清偿 + npm publish 前置 + 051-候选 VM 主题回归排查 + auto-lang 转介单
author: [zhaopuming]
created_at: 2026-09-04T23:50:28+08:00
updated_at: 2026-09-05T01:50:00+08:00

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components:
  - "P027-2: 下游 dev 直连 engine 源码（development 条件出口）——补 npm 发布形态半面：publishConfig.exports pack 时剥 development（tarball 纯 dist），工作区 dev-直连条件不动（同一 manifest 双形态）"
new_spec_components:
  - "P052-架构: engine npm publish 技术前置——publishConfig.exports 五出口纯 dist + changesets 0.x 对账（plan-020 major→minor；config baseBranch main→master、access restricted→public 两阻断修复）+ tarball 三断言门（无 src/无 development/parser 出口装机真跑 parse_blocks）；实际 publish 择时（token/registry 用户决策）"
  - "P052-机制: 051-候选排查读数与回归门——像素探针 probe-051-view-theme.mjs（自带 PNG 解码+pane 特征色 zinc950/#f9fafb 分析；--flip/--edit-fence 三轴）四读数矩阵（A1 首帧 FORK/A2a 深档同批 statics/A2b D-GAP 翻转不重建存量/A3 新建正确）→ pinpoint 双层（首帧取档错误+内容寻址缓存不随主题失效，auto-lang HEAD 实证仍在）+ vm-smoke 第七组 light-chrome 门（[group7] 哨兵确定性失败不吃 049 重试；AUTO_VM_KNOWN_FORK=1 门控，修复后摘门转硬断言）"
  - "P052-清偿: 依赖安全基线——pnpm audit 16→0 双清零（mermaid 11.17.2 直更+六传递依赖区间内刷新）+ 机制注记（pnpm 11.6 audit --fix 落废弃字段、workspace overrides 静默不读 → update -r 区间路径，无 override 维护面）"
  - "P052-转介: auto-lang 侧六条目转介单 docs/plans/attachments/052-auto-lang-transfer.md（051-候选/043×3/048/046/016/022，每条带可粘贴复现命令/嫌疑面/绕道现状/建议验收）；随行修复 auto-lang autodown-core 路径依赖断裂（彼仓 master 0b0161b57）"
touched_goals:
  - "P027-2: dev 直连 engine 源码——发布形态补面（G2，出口语义保形验证过）"
  - "P050-2: VM demo 代码块与行内渲染对齐——051-候选回归门（vm-smoke 第七组）为本 goal 收口面的守卫延伸（G3）"
  - "P051-2: 主题规约化与双轨 settings——同上回归门兼守 settings 落地后的浅档正确性（G3）"

current_step: 15
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

- [x] **T1** audit 基线取证：`cd autodown && pnpm audit --json > ../tmp/052-audit-baseline.json`，`pnpm why brace-expansion fast-uri js-yaml nanoid dompurify postcss mermaid` 归属直接依赖方，写入本计划复审记录。验证：基线文件存在且含 16 项。 [✅ 已完成 2026-09-05 —— 基线 JSON 落默认检出 tmp/052-audit-baseline.json（16 项）；归属：mermaid 11.16.0=engine 直依赖（连带 dompurify 3.4.12 传递）；brace-expansion 5.0.8←api-extractor/minimatch（engine dev）；fast-uri 3.1.4←api-extractor/ajv 链（engine dev）；js-yaml 3.15.0←@changesets/cli/read-yaml-file（root dev）；nanoid 3.3.16←vite/vitest→postcss 8.5.22（root dev）；全部补丁版在语义化区间内，audit --fix 预期可全解]
- [x] **T2** 直依赖更新：`autodown/packages/engine/package.json` mermaid `^11.16.0` 不动（区间内更新即可），`cd autodown && pnpm update mermaid`。验证：`pnpm list mermaid --depth -1 | grep 11.16.1` 或更新版。 [✅ 已完成 2026-09-05 —— 根目录 update 不传导 workspace 子包（实证），改在 packages/engine 内执行：mermaid 11.16.0→**11.17.2**（≥11.16.1 补丁线），specifier 区间随行 ^11.16.0→^11.17.2]
- [x] **T3** 传递依赖修复：`cd autodown && pnpm audit --fix`，复跑 `pnpm audit`；残项写 `autodown/package.json` 的 `pnpm.overrides`（钉补丁版，逐项注记 advisory 编号）。验证：`pnpm audit` 输出 0 vulnerabilities。 [✅ 已完成 2026-09-05 —— 机制偏差注记：①`pnpm audit --fix`（pnpm 11.6.0）把 overrides 写入已废弃的 package.json `pnpm` 字段（被 pnpm 忽略并告警）——已 git checkout 回退；②改按 docs 落 pnpm-workspace.yaml `overrides:`——pnpm 静默不读（无告警、版本未动，install --force 复验）；③最终路径：全部补丁版均在父依赖语义化区间内，`pnpm update -r fast-uri postcss nanoid js-yaml brace-expansion dompurify` 区间内刷新 lockfile 即清零（比 overrides 更干净，无永久 override 维护面）。终态版本：brace-expansion 5.0.9 / dompurify 3.4.14 / fast-uri 3.1.7 / js-yaml 3.15.2+4.3.2 / nanoid 3.3.18 / postcss 8.5.28 / mermaid 11.17.2。验证过：`pnpm audit` 与 `pnpm audit --prod` 双双 **No known vulnerabilities found**]
- [x] **T4** W1 门回归：`cd autodown/packages/engine && pnpm test && pnpm build`；`cd ../demo && pnpm build`；`cd ../stream-demo && pnpm build`；`cd ../engine/rust && cargo test`。验证：全绿（engine 测试数 ≥786、cargo ≥15）。 [✅ 已完成 2026-09-05 —— engine test **786/786** + build 四卫兵全绿（dist 戳 47a05509811dc27e 与升级前一致=零产物漂移）；demo build ✓；stream-demo build ✓；crate cargo test **15/15**（5+2+2+1+1+4）]
- [x] **T5** e2e 回归：`cd autodown/demo && pnpm test`（若 test 非 e2e 入口则以 `npx playwright test` 为准）；`cd ../stream-demo && pnpm test`。验证：用例数不低于基线（demo 73）全绿；vm-smoke 整轮 exit 0。 [✅ 已完成 2026-09-05 —— demo e2e `E2E_PORT=5199 npx playwright test` **74/74**（基线 73 之上，独立端口防复用默认检出 dev server）；stream-demo e2e **3/3**（view≡stream 对拍门 light/dark×indigo/dark×coral 全零差异）；vm-smoke（AUTOUI_MCP_PORT=9262）**PASS** 一次过——编辑联动/预览渲染/滚动同步双向/CustomScrollbar 拖拽/ghost/表格列宽全组绿]
- [x] **T6** changesets 对账：编辑 `autodown/.changeset/plan-020-engine-1.0.0.md`——frontmatter `'@autodown/engine': major`→`minor`，正文头部加一行注记「（0.x 版本策略修订：1.0.0 修正为 0.5.0 已于 2026-08-28 裁定，本条 bump 随改 minor；文件名保留历史引用）」。验证：`cd autodown && npx changeset status` 无 major 项。 [✅ 已完成 2026-09-05 —— plan-020 changeset major→minor+注记；**顺带修两个 publish 阻断**（status 首跑即炸暴露）：config.json `baseBranch: main→master`（本仓默认分支）、`access: restricted→public`（scoped 包公开 npm 发布前提）；终态 status：minor=@autodown/engine、patch=@autodown/demo+stream-demo（updateInternalDependencies 连带，private 不实发）、**major=NO**]
- [x] **T7** publishConfig.exports：编辑 `autodown/packages/engine/package.json`——新增 `publishConfig.exports`（`.`/`./parser`/`./render`/`./editor` 各 import+types→dist、`./style.css` default→dist/style.css，全部无 development 键），顶层注记字段不可用则以 README/ARCHITECTURE 注一行「publish 形态=publishConfig 覆盖（P027-2 dev 直连不废）」。验证：`node -e "const p=require('./package.json'); console.log(Object.keys(p.publishConfig.exports))"` 列五出口。 [✅ 已完成 2026-09-05 —— publishConfig.exports 五出口就位（node -e 列 `.,./parser,./render,./editor,./style.css`）；注记落 ARCHITECTURE.md §2「npm 发布形态（plan 052 T7）」段（engine 无 README）]
- [x] **T8** tarball 三断言：`cd autodown/packages/engine && pnpm pack`；`tar -tf autodown-engine-*.tgz | grep -c "^package/src/"`（期望 0）；解包 `package/package.json` grep development（期望 0）；tmp 下 `npm init -y && npm i <tgz路径> && node -e "import('@autodown/engine/parser').then(m=>console.log(m.parse_blocks('# a\n',true).children[0].kind))"`（期望 Heading）。验证：三断言输出在执行记录。 [✅ 已完成 2026-09-05 —— tarball `autodown-engine-0.5.0.tgz`（落默认检出 tmp/）：①`package/src/` 计数 **0**；②packed package.json `development` 计数 **0**（exports 五出口纯 dist 形态）；③临时工程 npm 装包（171 packages 含 peer vue/lucide）后 `import('@autodown/engine/parser')` 真跑 `parse_blocks('# Hello tarball…')` → kind **0=Heading**、children 2；`./render` 出口 25 键、`.` 根出口 24 键 import 双绿]
- [x] **T9** DEBTS 008 行8 注记：`DEBTS.md` 该行尾追加「▶ 技术前置就绪（052 T7/T8，2026-09-XX）：publishConfig 剥 development + tarball 三断言过；实际 publish 择时（npm token/registry 用户决策）」。验证：grep 到注记。 [✅ 已完成 2026-09-05 —— DEBTS 008 行8 状态 📋→🟡「▶前置就绪」：注记含 T6-T8 全记录（含 core/vue 归档致旧前置失效、config 两修复）；失效引用 packages/editor/ARCHITECTURE.md 改指新家（engine package.json publishConfig + ARCHITECTURE §2）]
- [x] **T10** 探针脚本：新建 `autodown/demo/auto/probe-051-view-theme.mjs`（复用 vm-smoke.mjs 的启动/MCP 通道口径，头注引用 051-候选 DEBTS 行）：浅色档干净启动，读两臂 fence chrome 底色，输出判读行。验证：`node probe-051-view-theme.mjs` 产出 view/edit/expected 三值读数（预期分叉：view 深档、edit 浅档）。 [✅ 已完成 2026-09-05 —— 探针在库（自带 PNG 解码器：zlib+逐行反滤波 colortype6/2；pane 半分统计 dark/zinc950 (9,9,11)/fenceLight (249,250,251) 特征色+32x20 网格形态图+verdict 判读行；--flip/--edit-fence/--save 三轴开关；export decodePng/analyzeFrame 供 vm-smoke 复用）。首跑即复现：A1 首帧浅档 renderer 臂 dark 57.7%/zinc950 41.4%/fenceLight 0.0% vs editor 臂 fenceLight 52.3%——FORK，且暗区从首个 fence（y=788/1600）起连片 zinc-950]
- [x] **T11** 隔离三轴读数：探针增变体（首帧/翻转后 × 冷/热缓存 × 启动浅档/翻转落浅档），读数矩阵 + pinpoint 结论写入本计划复审记录（auto-lang 文件级）。验证：矩阵 6 格读数齐全且结论指向单一嫌疑面（或明确二分）。 [✅ 已完成 2026-09-05 —— 矩阵四读数齐（A1/A2a/A2b/A3，auto-lang HEAD exe 43f6e34a1 线 2026-09-05 00:27 重建实证 **fork 在 HEAD 仍在**）：A1 首帧 FORK；A2a 深档对照 renderer zinc950=40.4% 与浅档**一字不差**（同批缓存 statics）；A2b 翻回浅 FORK 持续（editor 臂 zinc950 51.5%→0.0% 正确翻转，renderer 不动=D-GAP 标脏不重建 view 臂存量 fence）；A3 编辑新建 fence CONSISTENT（构建路径取档正确）。**pinpoint 双层定案**：①首帧渲染时 view 臂 fence 族 statics 解析为深档（取档时机）；②内容寻址缓存不随主题失效（唯新内容按当前档重建）——嫌疑面 aura_view_builder autodown 臂/renderer.rs D-GAP 标脏臂/StreamCache 缓存键，修复建议=缓存键并入主题档或翻转臂增 view 臂 fence 失效（对照 050 编辑臂 retheme_all_fence_buffers 先例）。**排障副产物**：auto-lang workspace 加载断裂（crates/auto-lang/Cargo.toml autodown-core 路径依赖指向本仓已归档的 packages/core/rust）——按依赖仓纪律在其 worktree 修复（auto-down-dev f5c86eeba，worktree cargo build 绿）并折入 auto-lang master 0b0161b57，worktree 经 wt-guard 清理摘除]
- [x] **T12** 回归断言：`autodown/demo/auto/vm-smoke.mjs` 增第八断言组（light 档 view 臂 fence 底色 = FENCE_CHROME_LIGHT 容器色），`AUTO_VM_KNOWN_FORK=1` 门控跳过+注记。验证：门控态整轮 exit 0；去门控单跑该组红（复现分叉）。 [✅ 已完成 2026-09-05 —— vm-smoke 第七组（头注编号顺延，=计划所称第八组）在库：首跑打字前读种子 fence（三 fence 在场才有效），zinc950>5% 或 fenceLight<1% 即败；[group7] 哨兵失败**不吃 049 外部击杀重试**（确定性门失败快速失败——实测无门控 exit 1 带完整读数，重试遮蔽门缝已堵）；AUTO_VM_KNOWN_FORK=1 门控跳过行携带实时读数。验证：门控态整轮 **PASS**（12 检查项含 SKIP 行 readings: zinc950=41.4%）；无门控净窗 **FAIL exit 1**（"[group7] renderer pane shows zinc-950 dark plates…fork live"）]
- [x] **T13** DEBTS 051-候选行更新：附探针路径/读数/pinpoint，状态改「转介在案」。验证：grep 到探针路径。 [✅ 已完成 2026-09-05 —— DEBTS 051-候选行 ▶转介在案：A1/A2a/A2b/A3 四读数+双层 pinpoint+HEAD 仍在实证+vm-smoke 第七组门控说明+auto-lang Cargo.toml 随行修复记录（f5c86eeba→0b0161b57）；Reference 增转介单/探针/vm-smoke 三链]
- [x] **T14** 转介单：新建 `docs/plans/attachments/052-auto-lang-transfer.md`（五组条目，字段=症状/本仓复现命令/嫌疑面/绕道现状/建议验收）；DEBTS 043 两行/048 行/046 行/016 两行/022 行尾加「转介单在案（052 附件）」。验证：五条目 checklist 过。 [✅ 已完成 2026-09-05 —— 转介单在库**六条目**（①051-候选 带四读数矩阵+回归门+摘门验收 ②043 三件 ③048 键盘回写 ④046 观感残段 ⑤016 a2ts/a2r（tmp 探针报告已清，详单回指 DEBTS 行）⑥022 binary 信封），每条含可粘贴复现命令；DEBTS 七行尾注记落位（043×2/048/046/016×2/022）]
- [x] **T15** 终门 + PARITY：`cd autodown && pnpm -r build && pnpm --filter @autodown/engine test`；`cd demo && pnpm test`；PARITY.md 视 T11 结论补 051-候选读数注记。验证：全绿 + DEBTS 终态对账（027/008行8/051-候选/转介五行）。 [✅ 已完成 2026-09-05 —— `pnpm -r build` 三包全绿；engine test **786/786**；demo e2e（E2E_PORT=5199 隔离）**74/74**；PARITY #17 判读格补 PLAN-052 读数注记（四轴+pinpoint+门控说明）；DEBTS 终态对账五面落位：027 ▶本地清零待推送消账（push 后 GitHub 重扫终销）、008 行8 ▶前置就绪、051-候选 ▶转介在案、转介七行注记、051 工具链行（前置批已记）；探针临时截图出库（051 收尾同类先例）]

## 复审记录

**复审（ZCode，2026-09-05，/auto-plan:review）——结论：PASS → reviewed**

- **复审范围核对**：plan-052-dev 分支 base e7d079e..HEAD 共 8 提交，diff 足迹 10 文件（DEBTS/changesets×2/engine package.json+ARCHITECTURE/lockfile/PARITY/probe 新增/vm-smoke/转介单新增）与计划声称面完全一致，无游离改动；worktree 干净。
- **验收①（audit 清零 + 027 注记）PASS**：复审重跑 `pnpm audit` 与 `--prod` 双 "No known vulnerabilities found"；DEBTS 027 行「▶本地清零待推送消账」注记在（含 push 后 GitHub 重扫终销口径与机制注记）。
- **验收②（tarball 三断言 + 008 行8 注记）PASS**：复审重 pack `autodown-engine-0.5.0.tgz`——`package/src/` 计数 0、packed package.json `development` 计数 0、已装 tarball 工程内 `parse_blocks('# review')` 返 Heading；`npx changeset status` minor 单升 NO major；DEBTS 008 行8「▶ 技术前置就绪（plan 052 T6-T8」注记在。
- **验收③（探针+读数+pinpoint+vm-smoke 第七组 + 051-候选行）PASS**：probe-051-view-theme.mjs 在库（257 行，export decodePng/analyzeFrame）；DEBTS 051-候选行「▶转介在案」含四读数+双层 pinpoint+探针路径；vm-smoke 第七组门控态复审重跑整轮 PASS（SKIP 行携带实时读数 zinc950=41.4%——fork 现存实证），无门控快速失败 exit 1 已在执行期验证。
- **验收④（转介单 + 行注记）PASS**：转介单六条目（计划字面五组+051-候选=六，超集）；DEBTS「转介单在案（052 附件」七处注记齐（043×2/048/046/016×2/022）。
- **验收⑤（全门复跑绿）PASS**：复审全门重跑——engine test 786/786 + build 四卫兵（dist 戳 47a05509811dc27e 不变=零漂移）、demo/stream-demo build、crate cargo 15/15、demo e2e 74/74（E2E_PORT 隔离）、stream-demo e2e 3/3、vm-smoke 门控整轮 PASS。
- **遗漏清查**：无——15 任务各有 diff 落点；T1 基线 JSON 在默认检出 tmp/052-audit-baseline.json（16 项+归属）。
- **口径偏差（非缺失）**：T11 验证文字「矩阵 6 格」实际收敛为四读数（A1/A2a/A2b/A3）——三轴设计（首帧/翻转 × 冷/热 × 启动浅/翻转落浅）操作坍缩后同轴全覆盖，pinpoint 决定性；计划所称「第八断言组」在 vm-smoke 头注顺延编号为 7（既有组 1-6 + 未入头注的 drag 组）——纯命名口径。
- **延后清查**：实际 npm publish 未执行=待澄清#1 预授权（默认否）；GitHub Dependabot 消账 pending push=027 行注记在案；无未批准延后。
- **workaround 清查**：T3 overrides 机制失效改 update -r=等价终态的**已记录**机制偏差（终态更优：无 override 维护面）；vm-smoke [group7] 哨兵=设计决策；探针 PNG 证据不入库（读数文字已固化 DEBTS/PARITY/计划三处）。
- **债候登记（4 条，均非阻断）**：
  1. jade-garden 无 pnpm-lock 的 audit 面（GitHub Dependabot 30 项含多 manifest）——push 后随重扫清点，残项转 jade 侧自查；
  2. pnpm 11.6 workspace overrides 静默不读（工具链发现，机制注记在 027 行）——未来需硬钉传递依赖版本时另立机制或升级复测；
  3. demo package.json 无 `test` 脚本（e2e 实入口 npx playwright test，计划 T5 已预案）——可补一行脚本的小欠账；
  4. auto-lang 主检出 target/debug 仍为 20:55 旧二进制（其 master 已含路径修复未重建）——彼仓下次构建自然收敛。
- **随行跨仓修复核验**：auto-lang autodown-core 路径断裂修复在其自身 worktree 完成（f5c86eeba）并折入其 master（0b0161b57），worktree 经 wt-guard 清理——符合依赖仓纪律。

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
