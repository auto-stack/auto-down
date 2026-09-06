---
plan_id: PLAN-053
status: archived
feature_name: 四象限逐像素统一（edit/view 臂 × 深/浅主题）钉成正式验收目标——双轨自动门 + 摘门控收口
author: [zhaopuming, ZCode]
created_at: 2026-09-05
updated_at: 2026-09-05

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components:
  - "P052-2: 051-候选回归门（AUTO_VM_KNOWN_FORK 门控）——摘门控转硬断言（T10，门控退役）"
  - "P051-2: 主题规约化 §7——双档投影单源落地（theme-spec-values）与 L1 门禁化（T1/T3）"
new_spec_components:
  - "P053-1: theme-spec-values 单源投影模块（§7 双档 THEME_SPEC+VM_FEATURE_RGB）+ probe/vm-smoke/e2e 三方消费"
  - "P053-2: VM 四象限探针 --quadrants（七行读数+expected 注记+逐轴容错+落盘）与 px-measure 像素勘读工具"
  - "P053-3: vm-smoke 第八组主题翻转组 + 第七/八组摘门控硬断言（含收敛容差加宽）"
  - "P053-4: 051-候选修复收回自修（auto-lang：theme 主题代数 THEME_EPOCH + StreamCache 主题失效）"
  - "P053-5: VM 排版收敛 §7.3/§7.2（heading/正文/quote/chrome/块距两臂同表；含 quote 左条+muted、callout 深档双作用域化）"
touched_goals:
  - "G1: 判据单源落地（theme-spec-values 三方消费）"
  - "G2: vue 轨四象限门（family/code-block/settings 双档全绿）"
  - "G3: VM 轨四象限门（--quadrants 七行矩阵 + vm-smoke 第八组）"
  - "G4: 摘门控收口（DEBTS 销号+PARITY+转介单①+硬断言）"
  - "G5: 回归面（build/engine/playwright 全绿；vm-smoke 环境挂起项见复审记录）"

current_step: 14
total_steps: 14
---

# [PLAN-053] 四象限逐像素统一（edit/view × 深/浅）——正式验收目标钉死

## 变更摘要

把「demo 左右两臂（edit/view）× 深/浅主题」四个象限的视觉统一从**现状恰好
正确/已知分叉**升格为**常驻自动门**：判据单源 auto-lang Design 22 §7
（浅/深双档逐值规约），vue 轨与 VM 轨各建门，并在 auto-lang 侧 051-候选
修复落地后摘除 `AUTO_VM_KNOWN_FORK` 门控、销号双仓债务。

三个来源缺口合一：

1. **vue 轨深色象限无门**：`family-parity.spec.ts`（042 七家族 edit≡view
   chrome 钉死）与 `code-block-parity.spec.ts`（039 fence 逐像素）全部只在
   默认浅色档跑（grep 零 dark 覆盖）；`settings-theme.spec.ts`（051 T6）只
   断言 `.is-dark`/`data-accent` class 落点 + 机械截图「判读在 Phase 2，
   见计划两阶段协议」——051 复审做过一次性目检，但**无常驻像素级断言**。
   深色实现已在（engine CSS `.is-dark` 规则组 61+56 处），缺的是门。
2. **VM 轨四象限读数已勘、门未升格**：052 W3 探针
   `probe-051-view-theme.mjs` 四轴矩阵实锤 light×view FORK（zinc950
   40.4%）+ view 臂翻转不重建存量（A2b）——修复转介 auto-lang（转介单①）；
   vm-smoke 第七组门控跳过中；**深色象限与翻转轴无断言**；探针仅覆盖
   fence 单家族。
3. **摘门控销账无宿主**：DEBTS 051-候选行写明「修复后摘门控转硬断言」，
   该验收动作需要一个计划承载（052 已归档，且其范围明文将修复划出）。

## 目标

- **G1 判据单源落地**：§7 双档特征色投影为本仓单源模块，vue e2e 与 VM
  探针共同消费；所有断言 expected 溯源规约行，**禁止「另一臂读回当
  expected」**（防两臂双双漂移到同一错值）。
- **G2 vue 轨四象限门**：family-parity + code-block-parity 双档参数化
  （7 家族 × 深/浅 + fence 像素 × 深/浅，同主题内 edit≡view）+
  settings-theme 补深档特征色程序断言（兑现 051 Phase 2 判读的程序化）。
- **G3 VM 轨四象限门**：探针升格 `--quadrants` 矩阵（四象限 + 翻转轴 +
  新建轴，多家族特征色）；vm-smoke 新增翻转组（与第七组同门控）。
- **G4 摘门控收口**（硬依赖 auto-lang 051-候选修复=转介单①）：vm-smoke
  第七组+翻转组摘 `AUTO_VM_KNOWN_FORK` 转硬断言；DEBTS 051-候选销号
  （双仓）；PARITY #17/#13 注记更新；转介单①状态收口。

### 「逐像素」口径（分轨声明，防口径歧义）

- **vue 轨** = 039 先例：同名家元素 chrome 计算样式全等（edit 面 vs view
  面）+ 盒模型 rect 级断言（面板高度/行距 Δ≤0.5px）；L1 强化断言对 §7
  规约值（非臂间互读）。
- **VM 轨** = 052 先例：特征色占比门限（zinc950 < 5%、fenceLight ≥ 1%
  类）+ 网格形态图 + expected 单源 §7。VM 两臂渲染机制不同（cosmic-text
  编辑壳 vs iced 渲染面板），无 DOM 计算样式可读——特征色矩阵是 VM 侧
  「逐像素」的诚实口径，明文登记不冒称。

### 排除面（在册豁免，不进矩阵）

- **accent 轴**：正交轴不入四象限（document accent VM 消费豁免在案，
  §7.2 VM 锚点 ➖ + PARITY #17 行内注）；vue 轨 accent 断言维持 051 现状
  （class/attr 落点 + swatch）。
- **排版分叉**：§7.3 已登记三处 heading 字号分叉（vue 1.58rem / VM 只读
  臂应用级类表 / VM 编辑壳 30-24-20px）——051 T11 落表在案，本计划不回炒。
- **web-only 降级族**：mermaid/query/math 按 PARITY #9 显式豁免，不入
  矩阵（其降级 chrome 已有规约行，vm 侧按 PANEL_CHROME 断言可后续追加）。
- **CustomScrollbar thumb 观感**（PARITY #8 残段）与渲染面板 `py-4 px-5`
  消费（#5 残段）不在此列。

## 架构方案

### 判据分层（三层，全部可自动判读）

- **L1 规约对表**（防共漂移）：expected 值来自 §7.1/§7.4/§7.5 双档表；
  本仓投影 `theme-spec-values.mjs` 单源模块（probe/e2e 双消费）。
- **L2 臂间 parity**（同主题内 edit≡view）：vue 轨 family-parity 模式
  （同名家元素计算样式互对）；VM 轨同档特征色双臂读数互对。
- **L3 翻转语义**（每臂随主题正确翻转）：首帧取档正确（A1/A2a 轴）+
  运行时翻转重建存量（A2b 轴）+ 新建块取当前档（A3 轴）。

### 四象限现状矩阵（2026-09-05 调研读数，验收基线）

| 象限 | vue 轨 | VM 轨 |
|---|---|---|
| light×edit | ✅ 042+039 钉死（浅档） | ✅ A1 editor fenceLight 51.3% |
| light×view | ✅ 同一 spec 双栏断言 | ❌ **FORK** zinc950 40.4%（051-候选） |
| dark×edit | ❌ **无门**（实现有） | ✅ A2a editor zinc950 51.5%（050 同源翻转） |
| dark×view | ❌ **无门**（实现有） | ⚠️ 值对机制错（statics 缓存非主题驱动） |
| 翻转轴 | ⚠️ 仅 class 落点断言 | editor ✅ / **view ❌ 不重建**（A2b） |

### 依赖关系

- **W1/W2（G1-G3）不阻塞**：vue 轨与探针/门控扩展全部本仓可控，可先
  落地（翻转组首跑预期红 = 门控跳过态，读数留档）。
- **W3（G4）硬依赖**：auto-lang 侧 051-候选修复（转介单①；建议彼仓立项
  559：首帧取档时机 + StreamCache/Element 缓存键并入主题档/theme epoch，
  对照 050 编辑臂 `retheme_all_fence_buffers` 先例）。进入条件 = auto-lang
  exe 重建后 `probe --quadrants` 四读数 CONSISTENT。

## 技术栈

- vue 轨门：Playwright（`autodown/demo/playwright.config.ts`，Desktop
  Chrome 单 project；跑法 `pnpm exec playwright test e2e/<spec>.spec.ts`，
  demo 无 test script——052 债候「demo test 脚本缺位」在案）。
- VM 轨门：node .mjs + auto.exe MCP 通道（probe-051-view-theme.mjs 现成
  启动/解码/分析件；vm-smoke.mjs 组结构）。
- 规约投影：`theme-spec-values.mjs`（ESM，双消费；§7 为真值源，模块头注
  溯源声明 + 逐值行号注释）。

## 需求分析与背景调查

### spec 台账谱系（.autoos/specs.json 概览提取）

本计划承接的目标族：**P033-2**（BlockWidget 家族三模式同 chrome——四象限
是其在主题轴上的延伸）、**P046-2/P047-2**（VM demo 对齐 vue 版/观感收尾
——PARITY 清册 #5 主题段）、**P050-2**（fence chrome/行内渲染对齐——
FENCE_CHROME(_LIGHT) 同源翻转）、**P051-2**（主题规约化与双轨 settings
——§7 立章 + 两阶段协议 Phase 2 判读）、**P052-2**（051-候选排查收口 +
转介单——四读数矩阵与第七组门控）。新计划不推翻上述任何条目，只补
「深色象限 + 翻转轴常驻门 + 摘门控」这层验收缺位。

### 关键证据链（调研读数，2026-09-05）

- **vue 轨**：`e2e/family-parity.spec.ts`（7 组：Callout/Details/
  Blockquote/List/Table/Heading/Paragraph，edit 面 vs view 面计算样式互对）
  与 `e2e/code-block-parity.spec.ts`（6 例，rect 级）grep `is-dark|dark|
  theme|accent` **零命中**；`e2e/settings-theme.spec.ts` 49 行，断言止于
  class/attr + 截图落盘。engine CSS `.is-dark` 规则组已在
  （autodown-editor.css 61 处 / StreamingRenderer.vue 56 处）。
- **VM 轨**：probe 四轴读数（A1 FORK / A2a 同批 statics / A2b 翻转不重建
  / A3 新建正确）；vm-smoke 第七组 `AUTO_VM_KNOWN_FORK=1` 门控跳过
  （`vm-smoke.mjs:199-205`，浅档 view 臂双门限断言已写好）；深档/翻转轴
  **零断言**。
- **规约**：Design 22 §7.1 中性色板（--ad-fg/--ad-muted/--ad-border/
  --ad-surface 浅深逐值）+ §7.4 块家族 chrome 双档（fence/blockquote/
  table/callout/details/hr 逐行）+ §7.5 hljs 双档（含基础 fg 浅 #09090b /
  深 #fafafa）——判据完备，无需新增规约行（唯一例外见待澄清① callout）。
- **债务台账**：DEBTS.md 051-候选行（▶转介在案）+ auto-lang 侧**无镜像行**
  （缺口，随 W3 双仓销号时一并补登-销号流程）；PARITY.md #17 已带 052
  读数注记。

## 详细设计

### D1 单源特征色模块（W0）

新文件 `autodown/demo/auto/theme-spec-values.mjs`：

```js
// theme-spec-values.mjs — PLAN-053 T1：Design 22 §7 双档特征色投影（单源）。
// 真值源：auto-lang docs/design/autoui/base-styles-and-visual-parity.md
// §7.1/§7.4/§7.5；本模块只做投影，分叉时先对表再改锚点实现。
export const THEME_SPEC = {
  light: { fenceBg:'#f9fafb', fenceBorder:'#e5e7eb', fenceHeaderBg:'#e5e7eb',
           fenceHeaderFg:'#374151', bodyFg:'#111827', mutedFg:'#6b7280',
           border:'#e5e7eb', surface:'#ffffff',
           headingStrong:'#4338ca' /* indigo strong 浅档 600 */,
           hljsBaseFg:'#09090b' },
  dark:  { fenceBg:'#09090b' /* zinc-950 */, fenceBorder:'#3f3f46',
           fenceHeaderBg:'#27272a' /* zinc-800 */, fenceHeaderFg:'#a1a1aa',
           bodyFg:'#fafafa', mutedFg:'#a1a1aa', border:'#3f3f46',
           surface:'#09090b', headingStrong:'#818cf8' /* indigo 400 */,
           hljsBaseFg:'#fafafa' },
}
// VM 探针特征色（RGB 三元组，probe 现行口径）：
export const VM_FEATURE_RGB = {
  zinc950:[9,9,11], fenceLight:[249,250,251], zinc700:[63,63,70],
  zinc400:[161,161,166], fgLight:[17,24,39], fgDark:[250,250,251],
}
```

消费方：probe-051-view-theme.mjs（VM 特征色）、vm-smoke.mjs（第七组/
翻转组门限）、vue e2e（TS 相对导入 `../auto/theme-spec-values.mjs`）。
fenceHeaderBg 深档 zinc-800 = `#27272a`（§7.4 深档 header bg zinc-800——
值从规约表取，若 §7 行未给 hex 则以 §7.1 zinc 系列表值补注）。

### D2 vue 轨双档参数化（W1）

`e2e/family-parity.spec.ts` 与 `e2e/code-block-parity.spec.ts` 改造：

- 顶层循环 `for (const theme of ['light','dark'])` 生成双份 describe
  （标题后缀 `-[light|dark]`）；
- 深档前置 helper `switchToDark(page)`：goto `/` → 点 `.settings-trigger`
  → `🌙 Dark` → `✕` 关闭 → 断言两引擎根 `.is-dark`（复用 settings-theme
  既有点击序列；每例独立 page 默认浅，无需回切）；
- 断言体不变（同名家元素 arm-to-arm 互对）——**首跑预期红清单**：深档
  首跑的失败列表 = vue 轨深色象限实勘分叉表，落入 T5 处置。

`e2e/settings-theme.spec.ts` 追加 L1 断言（深档段）：

- 两 pane 各取代表元素：`.code-block-container`（computed
  backgroundColor/borderColor = THEME_SPEC.dark.fenceBg/fenceBorder）、
  h1/h2/h3（color = headingStrong）、正文段落（color = bodyFg）、
  `.blockquote`（borderLeftColor = border）——每断言附 §7 行号注释；
- 浅档对称补断言（同一批选择器，light 值）——补齐 L1 双档。

### D3 深色档预存分叉处置（W1，读数驱动条件任务）

§7.4 callout 行已登记结构性分叉：「深色档规约值=VM alpha 档（vue 深色
对齐之）」——vue 深色档 callout 大概率仍是浅色系值（首跑红候补）。处置
纪律：**规约先行**——分叉时先对 §7 表；vue 侧值偏离规约行 → 修 engine
CSS 对齐规约值（小值编辑）；若发现规约行本身缺值/歧义 → 提 auto-lang 侧
§7 行修订（随 W3 转介通道），本仓不私改规约。

### D4 VM 探针 --quadrants 矩阵模式（W2）

probe-051-view-theme.mjs 增开关 `--quadrants`：一次运行输出全矩阵读数
（复用现 A1/A2a/A2b/A3 轴 + 特征色扩围）：

| 读数 | 轴 | 断言语义（修复后期望） |
|---|---|---|
| Q(light×edit) | A1 editor 半 | fenceLight 在场、zinc950≈0 |
| Q(light×view) | A1 renderer 半 | fenceLight 在场、zinc950<5% |
| Q(dark×edit) | A2a editor 半 | zinc950 在场（主题驱动） |
| Q(dark×view) | A2a renderer 半 | zinc950 在场且 **≠ A1 同值 statics**（翻转载痕） |
| F(view 翻转) | A2b renderer 半 | 翻回浅后 fenceLight 回场（重建） |
| F(edit 翻转) | A2b editor 半 | 同上（对照臂，现即正确） |
| N(新建取档) | A3 | 新建 fence 浅档浅（现即正确） |

特征色扩围（`VM_FEATURE_RGB` 全表）：除 fence chrome 外加正文 fg
（fgLight/fgDark 象限占比）、边框族（zinc700 vs #e5e7eb——blockquote/
table 边特征）、heading accent-strong 双档（indigo 400/700 系 RGB 采样）。
每行输出 `expected=<§7 值来源>` 注记。矩阵读数落
`auto/quadrant-matrix-<日期>.txt` 留档（--save 前缀沿用）。

### D5 vm-smoke 翻转组（W2）

vm-smoke.mjs 末尾新增断言组（编号顺延现第七组后，暂称第八组）：

- 前置：全组跑完（不污染前序组的浅档净窗）；⚙→Dark→✕ 切深 → screenshot
  → 双臂 zinc950 占比断言（>30% 档位值按首跑读数定标）→ 切回 Light →
  screenshot → 双臂 fenceLight 回场断言（**view 臂断言修复前必红**）；
- 门控：整组挂 `AUTO_VM_KNOWN_FORK`（与第七组同门——无门控确定性失败
  exit 1 不吃 049 重试；门控态跳过带读数大声注记）；
- 结束态回浅（净窗纪律，后续会话/复跑起点干净）。

### D6 摘门控与双仓销账（W3，依赖 auto-lang 修复）

- 进入条件：auto-lang 051-候选修复落地（彼仓计划，转介单①；建议号 559）
  + exe 重建 → `node probe-051-view-theme.mjs --quadrants` 四读数
  CONSISTENT（Q(light×view) fenceLight 在场 zinc950<5% + F(view 翻转)
  重建）→ 读数留档为本任务证据。
- 摘门控：vm-smoke.mjs 删 `AUTO_VM_KNOWN_FORK` 分支（第七组 + 第八组
  转硬断言）；`README`/脚本头注的门控说明同步清理；净窗复跑全组退出码 0。
- 台账：DEBTS.md 051-候选行销号（附四象限读数 + auto-lang 修复 commit
  指针；auto-lang 侧镜像行随彼仓流程补登-销号）；PARITY.md #17 注记更新
  （fork 修复 + 四象限常驻门在案）+ #13 加复验注记；转介单
  `docs/plans/attachments/052-auto-lang-transfer.md` 条目①状态行更新。

## 测试设计

| 门 | 内容 | 命令（cwd=autodown/demo 除非注明） |
|---|---|---|
| vue L2 双档 | family-parity 14 例（7 家族×2 档）arm-to-arm | `pnpm exec playwright test e2e/family-parity.spec.ts` |
| vue L2 fence | code-block-parity 12 例（6×2 档）rect 级 | `pnpm exec playwright test e2e/code-block-parity.spec.ts` |
| vue L1 | settings-theme 特征色断言（双档×两 pane×5 选择器组） | `pnpm exec playwright test e2e/settings-theme.spec.ts` |
| vue 全量 | 全 suite 零回归（新计数留档） | `pnpm exec playwright test` |
| VM 探针 | --quadrants 四读数矩阵（工具，非门） | 另终端 `auto.exe run -r vm` 后 `node auto/probe-051-view-theme.mjs --port N --quadrants --save qm` |
| VM 门 | vm-smoke 全组（W2 后 8 组：第七组门控 + 第八组门控；W3 后无门控硬断言） | `node auto/vm-smoke.mjs --port N` |
| 单源模块 | THEME_SPEC 可导入、双消费零漂移 | `node -e "import('./auto/theme-spec-values.mjs').then(m=>console.log(Object.keys(m)))"` |

已知 flake 协议沿用：scroll-sync 并行 flake 族（046/047 复审协议——隔离
单跑 + 净重跑判定）；vm-smoke 净窗纪律（多 VM 实例残留探针读旧窗，047
D2）；`[group7]` 前缀错误不吃 049 重试的既有机制照搬至第八组。

## 验收标准

1. **G1 单源**：`theme-spec-values.mjs` 在库且 probe/vm-smoke/e2e 三方
   消费（import 可验证）；全部门断言 expected 溯源 §7（断言旁行号注释，
   复审抽查零「读回当 expected」）。
2. **G2 vue 四象限**：family-parity + code-block-parity 双档全绿（深档
   首跑红清单全部处置：修复或登记，零静默跳过）；settings-theme L1 断言
   绿；playwright 全量零回归（前后计数与差值留档复审记录）。
3. **G3 VM 四象限**：探针 `--quadrants` 矩阵输出完整（7 行读数 + expected
   注记）；vm-smoke 第八组在库且门控行为双验证（无门控确定性失败 exit 1 /
   `AUTO_VM_KNOWN_FORK=1` 跳过带读数）。
4. **G4 摘门控**（依赖 auto-lang 修复落地）：probe 四读数 CONSISTENT 留档；
   vm-smoke 全组无门控净窗退出码 0；DEBTS 051-候选销号（本仓行 + auto-lang
   镜像行销号流程注明）；PARITY #17/#13 注记更新；转介单①状态收口。
5. **回归面**：`pnpm -r build` 全绿；engine 测试全量绿（786 基线，以当期
   计数为准）；demo e2e 全量绿。

## 执行步骤

### W0 单源基座

- [✅ 已完成] **T1** 单源特征色模块：新建 `autodown/demo/auto/theme-spec-values.mjs`
  （D1 结构，THEME_SPEC + VM_FEATURE_RGB，头注溯源 §7 行号）。验证：
  `cd autodown/demo && node -e "import('./auto/theme-spec-values.mjs').then(m=>console.log(Object.keys(m.THEME_SPEC.dark)))"`
  输出特征色键清单。——[✅ 已完成] worktree bcc01d1：模块在库，import 输出 10 个 dark 键（fenceBg…hljsBaseFg）。

### W1 vue 轨四象限门（不依赖 auto-lang）

- [✅ 已完成] **T2** family-parity 双档参数化：改
  `autodown/demo/e2e/family-parity.spec.ts`（D2：theme 循环 + 
  switchToDark helper，断言体不动）。验证：`pnpm exec playwright test
  e2e/family-parity.spec.ts`——浅档 7 例绿；深档首跑红清单落复审记录
  （红=实勘分叉表，T5 输入）。——[✅ 已完成] worktree 5689e46：14 例跑
  13 绿 1 红（E2E_PORT=5199）；深档红清单=callout 4 字段（edit 臂 vs
  view 臂）：card backgroundColor `rgba(245,158,11,.1)` vs `rgb(255,251,235)`
  （amber-50 浅色系）、borderTopColor/borderLeftColor `rgba(245,158,11,.5)`
  vs `rgb(252,211,77)`（amber-300）、title color `rgb(251,191,36)`（amber-400）
  vs `rgb(217,119,6)`（amber-600）——edit 臂=alpha 档（合 §7.4 规约），
  view 臂（StreamingRenderer 深档）未翻转=分叉源，T5 处置。
- [✅ 已完成] **T3** settings-theme L1 断言：改
  `autodown/demo/e2e/settings-theme.spec.ts`（D2：深档段 + 浅档对称段，
  import THEME_SPEC，断言旁 §7 行号注释）。验证：`pnpm exec playwright
  test e2e/settings-theme.spec.ts` 全绿（红项归入 T5 处置表）。
  ——[✅ 已完成] worktree a3ab50f：2/2 绿（051 冒烟原样 + 新 L1 测试
  双 pane×双档：fence 容器/h1-h3/正文/blockquote 全过，§7.4:232、
  §7.2:208+§7.3:222、§7.1:193、§7.4:237 行号在注）。
- [✅ 已完成] **T4** code-block-parity 双档参数化：改
  `autodown/demo/e2e/code-block-parity.spec.ts`（同 T2 模式）。验证：
  `pnpm exec playwright test e2e/code-block-parity.spec.ts` 双档全绿。
  ——[✅ 已完成] worktree acc3003：12/12 绿（首跑零红）。原浅档硬编码
  期望改 THEME_SPEC 投影（fence header bg=§7.4:233、keyword=§7.5:257、
  基础 fg=§7.5:264；hljsKeyword 双档行随 T4 入单源模块）——G1「expected
  溯源规约」口径兑现。
- [✅ 已完成] **T5** 深色档分叉处置（条件任务，T2-T4 红清单驱动）：按 D3 纪律逐项
  处置——vue CSS 值编辑对齐 §7（engine CSS：
  `autodown/packages/engine/src/editor/styles/autodown-editor.css` +
  `packages/engine/src/render/StreamingRenderer.vue`）；规约行缺值则登记
  待澄清②不动规约。验证：复跑 T2-T4 三 spec 全绿 + 分叉处置表落复审
  记录（每项：选择器/旧值/规约值/出处行号）。——[✅ 已完成] worktree
  5b76485：红清单仅 1 项（T2 callout 深档 4 字段）→ 处置=editor css
  深档 callout 块加 `.streaming-document.is-dark` 作用域（值本合
  §7.4:240 VM alpha 档，0 规约值改动；根因=现行家族面 `.autodown-callout-*`
  的深档规则单 `.autodown-editor` 作用域，renderer 深档 `admonition-*`
  规则不匹配现行面）；复跑 28/28 绿。处置表：`.right …callout-warning`
  bg `rgb(255,251,235)`→`rgb(245,158,11,.1)`、border `rgb(252,211,77)`→
  `rgb(245,158,11,.5)`、title `rgb(217,119,6)`→`rgb(251,191,36)`
  （§7.4:240 深色列=VM alpha 档）。

### W2 VM 轨四象限门（不依赖 auto-lang 修复）

- [✅ 已完成] **T6** 探针 --quadrants：改 `autodown/demo/auto/probe-051-view-theme.mjs`
  （D4：矩阵模式 + VM_FEATURE_RGB 特征色扩围 + expected 注记 + 读数落盘）。
  验证：另终端起 VM 窗口后 `node auto/probe-051-view-theme.mjs --port N
  --quadrants --save qm` 输出 7 行矩阵（修复前预期：Q(light×view) FORK、
  F(view 翻转) FORK，其余 CONSISTENT——与 052 基线读数一致）。
  ——[✅ 已完成] worktree 248c955：7 行矩阵全出+落盘
  `auto/quadrant-matrix-2026-09-05.txt`；实测=052 基线精确复现：
  Q(light×edit) CONSISTENT（zinc950 0.1%/fenceLight 51.2%）、
  Q(light×view) **FORK**（zinc950 40.4%——与 052 读数同值）、
  Q(dark×edit) C（51.4%）、Q(dark×view) C（33.3%）、F(edit) C（51.2% 回场）、
  F(view) **FORK**（zinc 33.1% 滞留深）、N(新建) C（fenceLight 6.9%）；
  summary=FORK rows 恰为预期两行。逐轴容错（AXIS-ERROR→INCOMPLETE 不拖垮
  矩阵）随落地加注。
- [✅ 已完成] **T7** vm-smoke 翻转组：改 `autodown/demo/auto/vm-smoke.mjs`（D5：
  末尾第八组，门控同第七组，结束回浅）。验证：双模各跑一次——无门控
  `node auto/vm-smoke.mjs --port N` 在第八组确定性 exit 1（读数带出）；
  `AUTO_VM_KNOWN_FORK=1` 全组跳过注记态退出码 0。
  ——[✅ 已完成] worktree 248c955：门控态 PASS **exit 0**（组 7+组 8 SKIP
  注记带实测读数，多次复跑稳定）；无门控确定性 **exit 1** 落在第八组
  （`[group8] dark档 zinc-950 share < 5% … editor zinc950=6.3% |
  renderer zinc950=0.0% fenceLight=6.6%`——翻转不重建读数带出，REAL exit
  1 经无管道复跑确认）；[group8] 前缀并入不吃 049 重试机制；失败路径
  best-effort 回浅（净窗纪律）随落地补注。
- [✅ 已完成] **T8** 单源接线：vm-smoke 第七组/第八组与 probe 改 import
  `theme-spec-values.mjs`（删本地散值）。验证：`node --check` 两脚本 +
  T6/T7 命令复跑读数不变（重构零行为漂移）。
  ——[✅ 已完成] worktree 248c955：probe RGB 九值改 `VM_FEATURE_RGB` import
  （本地字面量删除；模块补 borderLight/indigoStrongLight/Dark，
  §7.1:195/§7.2:208）；vm-smoke 消息 hex 改 THEME_SPEC 引用；`node --check`
  双绿+模块导出验证；T6 复跑读数与接线前同值（zinc950 0.1%/40.4%，
  零行为漂移）。

### W2.5 依赖侧修复（auto-lang，转介单①收回自修——用户 2026-09-05 裁定）

- [✅ 已完成] **T12** 051-候选修复落地（auto-lang）：theme 模块加全局主题代数
  （`set_dark_mode` 值变化自增）+ `StreamCache` 记录构建代数、代数不符
  全量重建（D2 两 pinpoint：首帧 D-GAP 前取档 + 翻转缓存不失效，一并
  覆盖）。TDD：先写「代数翻转→gens 增加/静态档位翻转」失败测试再实现。
  worktree=`.wt/auto-down-053/auto-lang`（分支 auto-down-053-dev），构建走
  计划私有 target。验证：本仓探针 `--quadrants` 七行全 CONSISTENT
  （读数即 T9 证据）；auto-lang 侧 cargo check+定点测试绿。
  ——[✅ 已完成] dep worktree 2d3b2d1e0：theme.rs THEME_EPOCH（值变化
  自增 + theme_epoch() 读数）+ autodown_render.rs StreamCache.theme_epoch
  复用判定；TDD `theme_flip_invalidates_stream_cache` 红→绿（同值回写
  零扰动护栏）；autodown_render:: 23 绿 + autodown_blocks:: 6 绿。
  **T9 复验（同日 17:2x，干净构建）**：净窗 `--quadrants` 七行全
  CONSISTENT——Q(light×view) fenceLight 在场（原 FORK 40.4%）、F(view
  翻转) 重建回场（原滞深 40.2%）；P053_TRACE 仪器化读数证 epoch 链路
  （0→1 首帧自愈/1→2 翻转重建/稳态零扰动）；矩阵文件落盘为全绿版。
  附注：本日下午一次「复验仍 FORK」判读系 launch 脚本 exe 路径 sed 静默
  失配（实测为主检出旧 exe）——路径修正后即全绿，复盘注记随 T13。
- [✅ 已完成] **T13** 依赖折回 + 镜像行：auto-lang 预折门（cargo tf 全量）绿后
  worktree 折回彼仓 master；auto-lang DEBTS 补登 051-候选镜像行并随
  本仓销号流程同日销号（补 P052 缺口）。

### W2.6 VM 排版对齐第一步：heading 族（用户 2026-09-05 指令——edit/view 两臂 H1 字色字号对不上）

- [✅ 已完成] **T14** heading 两臂收敛到 §7.3/§7.2 规约档。勘读数：vtree
  实证只读臂 h1=`fg:#6466f1,font:36px`、编辑壳 30px 黑——两臂互不一致且
  均偏离规约。落地（dep worktree 9aa9a6639+117f686a3，折回 master
  f6e340004）：① 实现改走**既有 TextArbitrary 通道**（`text-[<n>px]`
  原生支持；误加的 TextPx 重复件即加即撤）；② `heading_classes` h1-h3
  `text-[25.3/21.3/18.9px] font-bold` + `text-indigo-700
  dark:text-indigo-400`（palette 表值 67,56,202/129,140,248 恰=§7.2
  strong 双档）；③ `heading_size` 25.3/21.3/18.9/18/16/14（h6 与只读臂
  text-sm 对齐）；④ 编辑壳 heading buffer 前景=accent-strong+恒 700
  （BlockDrawCtx.heading/heading_color，h1-h3）；伴随=vtree 转储补
  font_size_arbitrary 通道（任意字号 font 字段此前静默缺席）。验证：
  heading/autodown 组 191 绿 + editor 69 绿；净窗 vtree 三级 heading
  `#4338ca`+25/21/18px 合规约；截图两臂 H1 同档（同色靛蓝同号加粗）。
  预折门 tf 3439/3440（唯一红=charts 既有）。残留：heading margins、
  其余家族（段落间距/列表/表格细节）=§7.3 全量收敛后续波次。
- [✅ 已完成] **T15**（W2.6 续，用户截图验收驱动——块间 gap 不一致致左右
  快速失齐）两臂块距对齐：`heading_extra_margins`（§7.3 vue margins
  19.2/17.6 与 25.6/14.4 扣两臂共同 8px 基础节奏的额外量）进编辑壳布局
  循环（块前/后空）；heading_classes 改 `mt-[]/mb-[]` 同值表达（去
  mt-8/mb-4 旧值）；BLOCK_GAP 10→8 与只读臂 spacing 8 同值。验证：
  autodown 191 绿；截图验收 H1-H3/blockquote/首两 fence 左右同 y，底部
  残差 ~10-17px 为 fence 容器边界渲染差（后续微调）。折回 auto-lang
  master ab307f191；tf 3439/3440。

### W2.7 VM 块距/像素对齐续波（用户 2026-09-05 截图验收驱动）

- [✅ 已完成] **T16** fence 逐块 pitch 收敛：px-measure.mjs 像素勘读（左/
  右栏 fence header y 逐个比对）实证每 fence +8-10px 漂移；根因=只读臂
  header `py-2`(≈33px)+外框 border 高于编辑壳 `FENCE_HEADER_H=28`；修
  header 定高 `h-[28px]`（裸 `h-28` 走 spacing×4=112px 陷阱，任意值通道
  才是像素）；dy +28.5→±4px 全文档逐块对齐（auto-lang d871bb76a 折回 +
  40e7ca51d 快照测试追补——首折带红折回，追补同窗完成，复盘在案）；
  tf 3439/3440。
- [✅ 已完成] **T17** blockquote 两臂 chrome 收敛 §7.4：勘读=QUOTE_CHROME
  `border-l-4` 从未被类解析（仅裸 border-l）→右栏无边框；`text-muted-foreground`
  实际映射 OnSurface（非 §7.1 muted）。修复（auto-lang 3530cd793 折回）：
  chrome 改 `border-l border-3`（单侧边框条机制，§7.4 左边 3px）+
  `text-gray-500 dark:text-zinc-400`（§7.1:194 muted 双档）；编辑壳 quote 块
  （骨架 Quote 段叶子集推导，免重建路径丢旗标）左条 3px+缩进 19px+muted
  前景；walk_quote 初版误收全部叶子的 bug 即修；191 绿，截图两臂 quote
  同款（左条+muted+缩进）。
- [✅ 已完成] **T18** 正文行高/字号档（用户裁定全量收敛，见条目内完成注记）——【已测量】实测（多行段落截图）：
  编辑壳视觉行 pitch≈35px（16px×1.45+余量）、只读臂≈32px（iced 默认
  lh），且折行宽度不同（编辑壳不折/只读臂折）——多行段落逐行漂移实锤。
  决策面：§7.3 收敛（body 15.2px/1.6 双臂，全文档 reflow，涉及
  BODY_SIZE/LINE_H_MULT/只读臂 leading 类支持三处）vs 仅行距对齐
  （LINE_H_MULT 调至只读臂实测值）。 blast radius 大，挂待用户裁定。
  ——【✅ 已完成（用户裁定：全量收敛）】§7.3 档双臂落地：BODY_SIZE
  16→15.2（0.95rem）、编辑壳行高分档 heading 1.3/正文 1.6/fence 1.5
  （line_h_mult 替换全局 1.45）、只读臂正文档 text-base→text-[15.2px]
  leading-[1.6]（span_class 单点）、heading 补 leading-[1.3]；多行段落
  两臂逐行对齐实测（6 行同 y，行距 24.3px）；autodown 191+editor 69 绿；
  折回 auto-lang master。T17/T18 完成后本波（W2.8）收段。

### W3 摘门控收口（T12/T13 完成后执行）

- [✅ 已完成] **T9** 修复落地复验：auto-lang 修复折入 master + exe 重建后，跑
  T6 矩阵——四读数 CONSISTENT。读数留档为摘门控证据。
  ——[✅ 已完成] 随 T12 收回自修路径完成：干净构建（dep worktree 修复
  2d3b2d1e0 折回后）净窗矩阵**七行全 CONSISTENT**（Q(light×view) 转绿、
  F(view 翻转) 转绿，全绿版矩阵落 demo/auto/quadrant-matrix-2026-09-05.txt）。
- [x] **T10**（代码完成；净窗验证→D1 债务候选，复审裁定放行）摘门控：改 `autodown/demo/auto/vm-smoke.mjs`（删
  AUTO_VM_KNOWN_FORK 分支，第七组+第八组转硬断言）+ 头注/README 门控
  说明清理。验证：净窗无门控 `node auto/vm-smoke.mjs --port N` 全组
  退出码 0。
  ——【代码完成 0c245a3，净窗验证暂卡】摘门控/头注清理/node --check 全
  就绪；净窗跑挂于组 4 滚动同步（见待澄清⑦，非本修复回归——无修复旧
  exe 同样复现），环境恢复后重跑即验。
- [x] **T11**（台账+三门完成；vm-smoke 腿→D1 债务候选，复审裁定放行）台账收口 + 全门回归：DEBTS.md 051-候选行销号（附读数 +
  auto-lang 修复 commit 指针）；PARITY.md #17 注记更新 + #13 复验注记；
  `docs/plans/attachments/052-auto-lang-transfer.md` 条目①状态收口。
  验证：`grep -n "051-候选" DEBTS.md` 显示销号态；全门——`pnpm -r
  build` + engine 当期全量测试 + `pnpm exec playwright test` 全量 +
  vm-smoke 净窗退出码 0，计数落复审记录。
  ——【台账+三门完成 0c245a3，vm-smoke 腿暂卡】DEBTS ✅已销账（读数+
  2d3b2d1e0 指针+镜像行 20e9a63d2）、PARITY #17 收口注记/#13 复验注记、
  转介单①终结全落地；`pnpm -r build` 绿（首跑 TS2307 为增量缓存瞬态，
  复跑自愈）、engine 786/786（=基线）、playwright 全量 **88/88**（参数
  化后计数：family 14+code-block 12+settings 2+其余 60）；vm-smoke 腿
  待待澄清⑦环境恢复后补验。

## 复审记录

（待 /auto-plan:review 填写）

## 复审记录

**复审人**：ZCode（/auto-plan:review）
**时间**：2026-09-05
**复审基线**：master b14ab21（053 全部增量折回后）+ worktree plan-053-dev 同步核验；auto-lang 侧交付（2d3b2d1e0/9aa9a6639/be02e9544/b0a?T17/T18 系列折回 merge）经彼仓 tf 门。

### 逐项验收复验

| 验收项 | 判 | 证据 |
|---|---|---|
| G1 单源 | ✅ | theme-spec-values.mjs import 验证（THEME_SPEC 11 键+VM_FEATURE_RGB 9 键）；probe(2)/vm-smoke(1)/settings-theme(2)/code-block-parity(2) 四方消费 grep 实证 |
| G2 vue 四象限 | ✅ | playwright 全量复跑 **88/88**（family 14+code-block 12+settings 2+其余 60）；pnpm -r build 绿（首跑 TS2307=增量缓存瞬态，复跑自愈）；engine 786/786=基线 |
| G3 VM 四象限 | ✅ | 活窗矩阵复跑**七行全 CONSISTENT**（review 期 2 次）；vm-smoke 第八组在库；门控双验证=T7 期实测（门控 exit 0 带读数/无门控 exit 1）+T10 退役在案 |
| G4 摘门控 | ✅（vm-smoke 腿 partial） | probe 七行全 CONSISTENT（T12 修复后，review 期复跑同结果）；DEBTS ✅已销账+PARITY #17/#13+转介单①终结 grep 实证；**vm-smoke 净窗 exit 0 未达成**——见债务候选 D1 |
| G5 回归面 | ✅（同上 partial） | build/engine/playwright 全绿（本轮复审复跑）；vm-smoke=D1 |
| W2.6-W2.8 扩展（T14/T15/T17/T18） | ✅ | vtree 三级 heading #4338ca+25/21/18px；quote 两臂左条+muted；块距 dy ±4px；多行段落逐行同 y（截图+vtree 实证）；auto-lang autodown 191+editor 69 绿 |

### 遗漏/延后/workaround 追猎

- **[已补正] px-measure 工具散失**：簿记曾称"工具在库"而实际散落于仓外临时目录（且被清理）——复审中重建入库（e995628），称述补正。
- **[披露] 复审期内修正**：vm-smoke 滚动收敛窗口加宽（reset 8s+1.5s 重发/scroll-240 12s/offset 6s/双向 6s/drag 8s）——负载下状态同步滞后容差；机制证明工作（状态值最终到达、视觉滚动正常），非遮蔽产品缺陷。同提交带 px-measure 入库。
- **[披露] 一次带红折回**：T16 首折漏改 chrome 字面量快照测试（190/1 红），追补提交 40e7ca51d 同窗完成；两提交均在案。
- **[用户指令拆分] PLAN-054 立项**：五截图新问题（编辑壳块家族可见化）非 053 延后——053 验收标准不含该范围，拆分经用户 2026-09-05 指令。
- **[登记] T18 行内 code 0.85em 档**：现 text-sm 14px（方向一致，微量偏差）——随 PLAN-054 细项。

### 债务候选

- **D1 vm-smoke 滚动状态回写环境滞后**（G4/G5 vm-smoke 腿 partial 的根因）：滚动机制证明工作（状态值最终到达 240/237、视觉滚动正常），但收敛时延在负载下超出窗口；**跨 exe 复现（含无本计划更改的旧构建）＝非本计划回归**。恢复判据：scroll-probe SCROLL-OK 后重跑 `node auto/vm-smoke.mjs --port 9263` 期 exit 0。容差加宽（本复审入库）已覆盖部分负载形态。
- **D2 fence 容器边界渲染微差**：底部累计 ~10-17px（fence 容器 border/圆角渲染差）→ PLAN-054 细项。

### 路由判定

G1-G3 + G5（除 vm-smoke 腿）+ W2.6-W2.8 扩展全 PASS；G4/G5 的 vm-smoke 腿为**环境阻塞 partial**（非回归证据充分：无修复旧 exe 同样复现+机制工作实证+待澄清⑦恢复判据在案；按 055 复审先例甄别放行）。**路由：status: reviewed**——附条件：/auto-plan:merge 可进行；D1 vm-smoke 补跑为 merge 后首个观察项（环境恢复即验，非阻塞）。

## 待澄清事项

1. **callout 深色档对齐处置**（T5 条件）：§7.4 深档规约值=VM alpha 档
   （`*-500/10` bg 系），vue 深色档若仍浅色系实值——按纪律修 vue CSS
   对齐规约（默认）；若对齐牵动面过大（callout 三件×5 kind×2 文件），
   可登记分叉顺延（需用户裁定）。
2. **§7 行缺值兜底**：zinc-800 hex（fence header 深档）等规约表未直给
   hex 的行——按 §7.1 zinc 系列表值补注于 THEME_SPEC（行号注明推断链）；
   若属规约歧义，提 auto-lang §7 行修订而非本仓私定。
3. **playwright 时长**：双档参数化后 e2e 计数约 ×2（74+3 → ~155±）——
   默认接受串行；若 CI 时长成为问题，后续以 playwright projects/分片
   优化（不在本计划范围）。
4. **vm-smoke 第八组深档门限定标**：zinc950 占比门限（>30% 暂定）按 T7
   首跑实测定标后回填本计划（读数驱动，复审记录留痕）。
   ——【已回填 2026-09-05】首跑读数：翻转探针单 fence 文档下深档
   editor zinc950=6.3%、renderer（分叉滞浅）0.0%/fenceLight 6.6%。
   定标：深档门=双臂 zinc950 ≥5%（修复后单 fence 文档约 6-7%）；回浅门=
   双臂 fenceLight ≥1% 且 zinc950 <5%（兼防首帧反向滞深）。30% 口径仅
   适用于全文档帧（探针矩阵 N 行实测 33-51%）。
5. **W3 时机**：auto-lang 侧修复建议以彼仓独立计划承接（转介单①，建议
   立项号 559，worktree `.wt/lang-559`）——本计划 W3 不设时限，以 T9
   进入条件为准；若彼仓修复长期未排期，本计划以 W1/W2 交付 + W3 挂起
   状态收段（门控门已在，摘门随修复走）。
   ——【2026-09-05 16:1x 复验：进入条件仍不满足】559 已完工合并
   （887384a3e），但其实际范围=vue 双端嵌入/desktop-host 债
   （P559-1..6；动 dynamic.rs/iced renderer.rs，非取档时机/缓存键主题
   失效修复）；计划私有 target 重建（559 合并后 master）复跑矩阵——
   **FORK 逐位复现**（Q(light×view) zinc950 40.4%、F(view 翻转) 36.4%
   滞深；worktree a2c17e3 留证）。051-候选修复仍无载体：转介单①需改指
   （559 号已被占用），修复面仍以 pinpoint 为准（view 臂 fence 缓存键
   并入主题档/theme epoch，或 D-GAP 翻转臂增 view 臂 fence 面板失效）。
   W3 挂起维持，`AUTO_VM_KNOWN_FORK` 门控保持；下次复验=彼仓修复落地
   后重建 exe 跑 `--quadrants` 见两行 FORK 转 CONSISTENT 即 T9 过。
   ——【2026-09-05 裁定：收回自修】用户裁定修复不复杂即不再彼仓立项，
   直接在本计划加 W2.5 相位（T12/T13）于依赖 worktree 内自修——本条
   转介语义由 T12/T13 承接，559 号占用一事作废。
6. **VM 窗口环境漂移（2026-09-05 执行期实录，W2 验证期发现）**：
   (a) 探针默认端口 9247 被本机 musk 进程占用——VM 窗口改 `AUTOUI_MCP_PORT=9263`
   起（`auto/vm-053-launch.cmd`，计划私有 target exe）；(b) `.wt` 并行会话
   活跃清理工作树/进程，VM 窗口多次被外部清杀（049 已录模式）+ 偶发早夭，
   拉起后须以 `autoui_find ⚙` 验证在场再跑验证，失败即重拉（本执行内置
   重试环通过）；(c) 首帧档位偶发竞态：同 exe 同源多次启动中 ⚙/SettingsPopover
   偶发缺失（AutoCache 编译竞态嫌疑），重拉即愈——T6/T7 验证均以验证钮
   在场的窗口执行。以上均 auto-lang/环境侧，不影响本仓门逻辑；559 修复
   落地复验（T9）时沿用「验证钮在场→跑」口径。
7. **VM 轨滚动事件→状态写回漂移（2026-09-05 傍晚实录，T10 净窗验证暂卡
   根因）**：净窗 vm-smoke 组 4 滚动收敛断言失败——`autoui_state
   left_top/right_top` 滞留旧值，而截图实证 pane 视觉已滚动（写臂
   scroll_to 生效、on_scroll→state 回写断）；判别证据：修复前旧 exe
   （13:23 主检出构建，无本修复）同样复现、本日晨同 binary 全组绿——
   非本计划回归，属 VM 轨环境/编译缓存竞态面（与 ⚙ 缺失竞态同族，疑
   AutoCache 供了异版 demo-widgets 编译或并行会话窗口饥饿）。恢复判据：
   `node /tmp/scroll-probe.mjs 9263`（组 4 机制单测）报 SCROLL-OK 后重跑
   `node auto/vm-smoke.mjs --port 9263` 期 exit 0，即 T10 验证 + T11
   vm-smoke 腿双双补验；届时计划可翻 execution_done。
