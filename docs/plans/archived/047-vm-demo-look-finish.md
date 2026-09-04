---
plan_id: PLAN-047
status: archived
feature_name: VM demo 观感收尾（W2 主题对齐 + W3 初始文档种子）——「与 vue 版并排看不出差别」
author: [zhaopuming]
created_at: 2026-09-04
updated_at: 2026-09-04

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components:
  - "P047-1: reports——变更摘要（VM demo 观感收尾：W2 主题对齐 + W3 初始种子收编；执行期新发现：musk.exe 长占 MCP 9247 走 AUTOUI_MCP_PORT=9248、多 VM 实例残留致探针读旧窗的净窗纪律、gen/ 非整体 gitignored——均登记非阻塞）"
  - "P047-2: goals——六验收全达成（浅色+种子+并排三要素截图/适配器在册+STUBS=0 真符号/单源回路幂等/双门 playwright 73+smoke 0/三处修准 grep 零残留/auto-lang 零改动双核）；STUBS=0「正常运行」按真符号非桩口径（D2）"
  - "P047-3: architecture——主题机制：app.at 声明 renderer 识别名 dark_mode 变量，Plan 370 D-GAP sync 每 view 更新推 iced_adapter::set_dark_mode（声明初值即首帧主题，458 env 种子仅 AUTO_UI_THEME 设置时介入）；种子机制：content.ts 单源→scripts/gen-vm-content.mjs 转义字面量生成 app_ext.vm.at→顶层 use.web.fn 经 app_ext.at 锚走 442 A3 适配器链（.ts 路径从不进链；auto-man ext 拷贝 widget-use only，锚/顶层 use.web.fn 对 vue 构建双不可见）"
  - "P047-4: designs——适配器接线契约：initial_content 移出 widget use 块入顶层 use.web.fn（SFC 生成器对顶层 use.web.fn 也发射 import——直指 vm.at 曾 Duplicate identifier；终形两 import 同 specifier 符号不相交行为恒等）；app_ext.at=码评注释锚（port 面，两轨均不加载）；载体案 a（转义 \\n 字面量，a2r.at 先例）；STUBS=0 读数口径（Undefined 符号名单=真符号证明法）"
  - "P047-5: tests——双门口径：playwright 73 全量（vue 零回归门：首跑 scroll-sync 1 红=并行 flake 隔离 7/7+净重跑绿，同 046 复审协议）+ vm-smoke 净窗退出码 0；单源回路实证（probe 行改动→生成→autoui_exists 双臂命中+vue 截图→还原→NOT FOUND）；生成器幂等（复跑 git diff 空）；并排三要素截图（vm-vue-side-by-side.png 拼接+两原件）"
  - "P047-6: reviews——复审记录（六验收逐条复验全过；遗漏/延后/workaround 清查零阻塞；债候选 D1-D4：README gen/-gitignored 过时表述、STUBS=0 完整运行需四符号真实现、scroll-sync 并行 flake 族、9247 样例环境注记）"
touched_goals:
  - "P046-2: VM demo 对齐 vue 版——主题观感（PARITY #5）与初始种子（#6）两波次收口，剩余差异仅登记在册小项（web-only 降级/CJK tofu/空态 placeholder/py-4 px-5+thumb 观感残段转介 auto-lang）"

current_step: 6
total_steps: 6
---

# [PLAN-047] VM demo 观感收尾（主题 + 初始种子）

## 变更摘要

PLAN-046 预留波次 W2/W3 的收编立项（046 变更摘要原文：「后续波次
留位……前置在 auto-lang 侧」）。两波前置均已就绪或已勘测：

- **W2 主题对齐**：527 T8 已落地 `set_dark_mode` 执行臂
  （renderer.rs:8687-8704，Plan 518 G1：语义 token 即时失效重读 +
  已声明 `dark_mode` 应用状态变量同步——458 语义）与
  `DARK_MODE` 线程态语义色双盘（theme.rs:173-235 浅深成对）。
  VM demo 默认深色（renderer 初始 `theme::dark_mode()`，theme.rs:14
  注记默认 Theme::Dark）；本计划让 demo 声明浅色初值，VM 轨窗口
  底色与语义色翻浅盘，对齐 vue 版的浅色观感。
- **W3 初始文档种子**：ext 桩机制经 Plan 442 A3 重构后有了
  **适配器链 `X.at → X.vm.at → X.web.at`**（ext_stubs.rs 头注：
  纯 Auto 适配器 fn 成为真模块符号，其余 TS/npm 符号才走平台桩；
  stdlib 七个 `.vm.at` + plan051 测试夹具先例）。demo 新增
  `src/front/utils/app_ext.vm.at` 给 `initial_content()` 真实现，
  VM 起步即载 content.ts 同款文档（现状：VM 空文档起步，
  DEBTS 040 行 43 与 README「starts empty」登记在案）。

**旧桩机制勘测注记**：`initial_content` 符号已不在
`ui/ext_stubs.rs`（桩机制 442 A3 变形为「适配器链 + 按调用点 arity
合成平台桩」通用机制）——W3 的落点是新机制下的适配器，不是旧
五符号桩表；DEBTS 行 43 的五符号表述执行时一并修准。

**验收口径（本计划的存在理由）**：vue 版与 VM 版并排对照——同
文档、同浅色主题、同双栏结构，观感一致；留并排双截图为证。
完成后 demo VM 轨剩余差异仅 web-only 块降级（mermaid/query/math）、
mono CJK tofu、编辑器空态 placeholder（登记在册小项）。

**时序硬前置**：PLAN-046 折入 master——app.at（W2 声明同文件）、
README/DEBTS（收口同区）、PARITY.md（046 T3 产出，本计划 T5
回填主题/种子两行）三处冲突面。

## 目标

1. VM demo 浅色主题：窗口底色与语义色浅盘，与 vue 版并排主题
   一致（截图留证）；vue 轨零回归。
2. VM demo 起步即载 content.ts 同款文档（双轨单源不漂移），
   vm-smoke 全过。
3. `app_ext.vm.at` 适配器在册：`initial_content()` VM 真实现，
   其余 ext 符号桩语义不变（is_vue/logSave/logCancel/
   useDemoAppBridge 仍平台桩）。
4. PARITY 清册主题/种子两行销号；README「starts empty」表述与
   DEBTS 040 行 43 五符号表述修准。
5. 并排对照双截图留档（结构+主题+内容三要素一致）。

## 架构方案

```
W2 主题（renderer.rs:8687 set_dark_mode 执行臂 + 458 变量同步语义）
  app.at model 声明 var dark_mode bool = false（浅色初值）
        │  初始读入路径（二选一，实施时定稿记复审）：
        │  a. renderer 启动读已声明变量初值 → DARK_MODE
        │  b. .Init handler 调 set_dark_mode 执行臂
        ▼
  iced 主题翻浅盘：窗口底色 + 语义 token（theme.rs 浅盘）
  demo 面板类（046 T1 的 tailwind 工具类）双主题中性，不动
        │
W3 种子（ext_stubs.rs 适配器链：X.at → X.vm.at → X.web.at）
  src/front/utils/app_ext.ts（vue 面，content.ts 直读——不动）
        │  单源方向：content.ts 为文档唯一源
        ▼
  scripts/gen-vm-content.mjs（新）：读 content.ts 生成
  src/front/utils/app_ext.vm.at：
    fn initial_content() -> str { "<content.ts 转义字面量>" }
    （纯 Auto 适配器 fn → VM 真符号；is_vue 等 TS 符号仍平台桩）
        ▼
  auto run -r vm：.Init 经 initial_content() 载入同一文档
```

**载体三案**（T2 勘测后定稿，默认案 a）：
a. **生成转义字面量**（默认）：脚本从 content.ts 机械生成 `.vm.at`
   （`\n` 转义字面量在 .at 有先例：flow.at/aavm.at/pac.at）；
   content.ts 改动经脚本再生成，双轨单源不漂移。
b. **运行时文件读取**：适配器 fn 调 VM 文件读取 native 加载
   `content.md`——依赖 native 面勘测，若有现成可调用则升级为此案。
c. **编译期 asset embed**（`asset("content.md")` 语言特性）——新
   特性成本高，仅在 a/b 均不可行时立项，不在本计划范围。

**vue 轨不回归保证**：`dark_mode` 变量与 `.vm.at` 适配器均为
VM 面产物——vue 生成器对未消费 prop/适配器文件不发射（046 T3 同
款惰性证明）；e2e 73 全过即零回归证明。

## 技术栈

- auto-down：`demo/auto/src/front/app.at`（dark_mode 声明 +
  regen）、`demo/auto/src/front/utils/app_ext.vm.at`（新）、
  `scripts/gen-vm-content.mjs`（新，或 gen/ 流程内联——实施时按
  regen.sh gitignored 现状定安置）、`demo/auto/vm-smoke.mjs`
  （初态断言适配，若空文档假设在案）、`demo/auto/README.md`、
  `DEBTS.md`、PARITY.md（回填）
- auto-lang（仅当初始读入路径缺 a 案时）：`ui/iced/renderer.rs`
  启动读已声明 dark_mode 变量（预计 518 G1 已覆盖，实施时实测）
- 验证链：`bash gen/regen.sh`、`npx playwright test`、
  `auto.exe run -r vm`、`node demo/auto/vm-smoke.mjs`、
  MCP autoui_screenshot（并排对照双截图）

## 需求分析与背景调查

（spec 台账离线：P04x 系 039-043 未沉淀（045 merge 记录在案），
本计划以 2026-09-04 双仓实勘为据。）

- **046 预留波次原文**：W2 主题对齐（前置 527 T8）、W3 初始种子
  （前置「auto-lang ext 资产机制或 DSL 多行字面量」）；046 T1 已
  落地两栏（35016cb，playwright 73/73），T2-T5 在途（worktree
  `.wt/auto-down-046`）。
- **主题机制实勘**：`set_dark_mode` 执行臂即时生效 + 写回已声明
  `dark_mode` 变量（renderer.rs:8687-8704）；`DARK_MODE` 线程态 +
  浅深语义色成对表（theme.rs:173-235）；默认 Theme::Dark
  （theme.rs:14 注记指 renderer.rs ~4540）。**未决点**：启动时是否
  读已声明变量初值（a 案）——实施时实测，缺则走 b 案（.Init 调
  执行臂）。
- **ext 适配器链实勘**：ext_stubs.rs（Plan 442 A3）——`.at` 适配
  器链解析为真符号；TS/npm 符号按调用点 arity 合成平台桩
  （AUTO_VM_EXT_STUBS=0 复原硬错）；stdlib
  `async/char/conv/env.vm.at` 等 + plan051 夹具先例。demo 现状：
  app_ext.ts 五符号全平台桩 → initial_content 返回空（README
  「VM track starts empty」）；`initial_content` 已不在旧五符号桩
  表（机制变形，DEBTS 行 43 表述过时）。
- **内容源现状**：`demo/src/content.ts` 142 行（plan 014 提取，
  头注明言「DSL 无多行模板字面量」故居 TS）；vue 面
  app_ext.ts `initial_content()` 直读。`.at` 转义 `\n` 字面量先例
  在册（flow.at/aavm.at/pac.at/token.at）。
- **PARITY 回填点**：046 T3 将产出的 PARITY.md 十二项清册中
  「主题观感」「初始文档种子」两行归宿 = 本计划；T5 回填销号
  （若 046 尚未折入则 T5 兜底待澄清⑤）。
- **DEBTS 040 行 43**：五符号桩告警行——initial_content 转真实现
  后该行表述修准（剩余四符号仍桩，告警面收窄）。

## 详细设计

1. **T1 主题对齐（W2）**：app.at model 加
   `var dark_mode bool = false`；实测启动初始读入路径（a 案：
   renderer 读声明变量初值——在 renderer 初始化处断点/日志核实；
   缺则 b 案：.Init 显式调 set_dark_mode 执行臂，形态沿 518 G1
   的 DSL 调用面）；VM 轨窗口底色与语义色翻浅。验证：
   `auto run -r vm` 截图浅色两栏 + `cd autodown/demo && npx
   playwright test` 73 全过（vue 面零变化）。
2. **T2 种子适配器（W3）**：定稿载体案（默认 a：脚本生成转义
   字面量）；新增 `scripts/gen-vm-content.mjs`（读
   `demo/src/content.ts` 的模板字面量 → 转义单行 → 生成
   `app_ext.vm.at` 的 initial_content；头部注释标注 generated-from
   与再生成命令）；其余 ext 符号不在适配器中声明（保持平台桩
   语义）。验证：`auto run -r vm` 起步即见 Heading One 文档
   （截图）；`AUTO_VM_EXT_STUBS=0` 下仍正常（真符号非桩）。
3. **T3 双轨单源校验**：改动 content.ts 任一段落 → 跑生成脚本 →
   regen → vue 与 VM 两侧同现改动（单源不漂移的实证回路）；
   还原。验证：regen OK + 双侧截图各一。
4. **T4 vm-smoke 初态适配**：核实 smoke 断言是否依赖空文档起步
   （042 T8 版本：编辑联动断言组 type 后校验——初态有文档不影
   响 set_value 覆盖语义，预计零改动；若 snapshot 基线类断言在案
   则适配）。验证：净窗 `auto run -r vm` + `node
   demo/auto/vm-smoke.mjs` 退出码 0。
5. **T5 文档收口**：README「VM track starts empty」表述改种子
   描述 + ext 桩清单修准（initial_content 移出桩列）；DEBTS 040
   行 43 五符号表述修准（四符号）；PARITY.md 主题/种子两行销号
   （046 已折入则直接回填，未折入按待澄清⑤兜底）。验证：grep
   「starts empty」「initial_content」桩表述零残留。
6. **T6 并排对照验收 + 全量回归**：同文档双截图并排留档
   （`demo/auto/vm-vue-side-by-side.png`：vue 浏览器截图 + VM
   截图各一拼接或两文件成对，沿 041 双截图口径）；playwright 73
   + vm-smoke 双门复跑。验证：退出码全 0，结果记复审记录。

## 测试设计

- vue 回归门：regen + playwright 73 全过（app.at 是唯一 vue 消费
  面，dark_mode 变量 vue 臂惰性证明）。
- VM 验收门：vm-smoke 退出码 0 + 起步文档/浅色主题截图；
  `AUTO_VM_EXT_STUBS=0` 严苛档复跑（真符号非桩的证明）。
- 单源不漂移：T3 的 content.ts 改动→再生成→双侧同现回路。
- 手验留档：并排对照双截图（本计划验收主证）。

## 验收标准

1. VM demo 浅色主题 + 起步即载 content.ts 同款文档；与 vue 版
   并排对照截图留档，结构/主题/内容三要素一致。
2. `app_ext.vm.at` 适配器在册且 `AUTO_VM_EXT_STUBS=0` 下正常
   运行；其余 ext 符号桩语义不变。
3. content.ts 双轨单源回路在册（脚本 + 再生成命令）。
4. vue e2e 73 全过零回归；vm-smoke 退出码 0。
5. README/DEBTS/PARITY 三处表述修准（starts empty 销号、五符号
   修准四符号、主题/种子两行销号）。
6. auto-lang 侧零改动或仅启动读入路径小改（b 案则零改动）——
   超出即范围蔓延，回本计划待澄清重议。

## 执行步骤

- T1 app.at dark_mode 声明 + 初始读入路径定稿（a/b 二选一记
  复审）+ VM 浅色截图。验证：`npx playwright test` 73 全过。
  [前置：PLAN-046 折入 master]
  [✅ 已完成] a 案定稿：renderer.rs:14718 Plan 370 D-GAP sync 每次
  view 更新读已声明 dark_mode 变量→set_dark_mode，声明
  `var dark_mode bool = false` 即首帧起浅色（零 auto-lang 改动，
  Plan 458 env 种子仅 AUTO_UI_THEME 设置时介入）；worktree
  app.at +9 行（gen App.vue 同步再生存档），vm-light-theme.png
  浅色两栏实证（AUTOUI_MCP_PORT=9248，musk.exe 占 9247），playwright
  73/73 过。
- T2 `scripts/gen-vm-content.mjs` + `app_ext.vm.at` 生成产物 +
  VM 起步文档验证（含 `AUTO_VM_EXT_STUBS=0` 档）。
  [✅ 已完成] 载体案 a 定稿；脚本安置 scripts/ 入库（③勘测修正：
  gen/regen.sh 实为 tracked 非 gitignored，README 115 行表述过时）。
  接线定稿（比架构草图多一实测弯）：SFC 生成器对顶层 use.web.fn
  也发射 import（直指 vm.at 曾致 vue-tsc Duplicate identifier），
  终形=initial_content 移出 widget use 块 + 顶层
  `use.web.fn initial_content from "src/front/utils/app_ext.at"`
  + 新增码评注释锚文件 app_ext.at（链 X.at→X.vm.at 真服务）——
  vue 侧两条 import 同 specifier 符号不相交，行为恒等。证据：VM
  起步即现 Heading One 全文档（vm-seeded-start.png，浅色两栏）；
  桩告警恰余四 TS 符号（initial_content 不再桩）；STUBS=0 严苛档
  Undefined symbol 仅 is_vue（initial_content 为真符号非桩）；regen
  OK + App.vue 仅 import 拆分 + playwright 73/73。
- T3 content.ts 单源回路实证（改动→再生成→双侧同现→还原）。
  验证：regen OK + 双侧截图。
  [✅ 已完成] 追加 probe 行→脚本再生成 vm.at（2383→2457 字符）→
  regen OK→重启 VM：VM 侧 autoui_exists 命中 2 处（左 Textarea 全
  文+右渲染 Text，VTree 实证）+ vue 侧截图 probe 行在 editor 面渲染
  （gen/vue-probe.png）；还原 content.ts→再生成（2383 字符复原）→
  probe NOT FOUND + Heading One FOUND×2。教训入档：多 VM 实例残留
  会令 9248 探针读旧窗（曾三实例并存），净窗纪律=先 Get-Process
  auto 全清再单实例。
- T4 vm-smoke 初态核实/适配。验证：净窗退出码 0。
  [✅ 已完成] ④落定：smoke 零改动——脚本自产 nonce 文档打字覆盖
  （set_value 语义），无空文档断言在案；净窗（单实例）跑
  AUTOUI_MCP_PORT=9248 全组过退出码 0（联动/预览/滚动同步/
  CustomScrollbar/拖拽/ghost/表格 resize 全组 ✓）。
- T5 README/DEBTS/PARITY 三处收口。验证：grep 零残留。
  [✅ 已完成] README：Theme/Initial seed 两 bullet 翻 CONSUMED since
  PLAN-047 + ext 桩清单四符号修准 + Layout 节补 app_ext.at/app_ext.vm.at/
  scripts 三条目 + csb bullet thumb 残段指针修准；DEBTS 040 行五符号
  修准四符号（initial_content 出桩列）+ 046 主题行改观感残段（padding/
  thumb 转介 auto-lang，🟡维持）+ 046 种子行 ✅已销号（删除线保留
  史）；PARITY #5/#6 ✅047 收口 + #8/#11 修准 + 预留波次索引 W2/W3
  两行闭合（残段转介注记）+ 组件臂注记更新。grep「starts empty/
  空文档起步/五符号」零活性残留（唯一命中在销号行删除线史内）。
- T6 并排对照双截图留档 + 双门复跑。验证：退出码全 0。
  [✅ 已完成] vm-vue-side-by-side.png（vue|VM 拼接图 + 两原件
  vm-vue-side-by-side-vue/-vm.png 在库）：同文档（Heading One 全文）、
  同浅色主题、同双栏结构三要素一致，剩余可见差异即登记在册小项
  （VM code fence 深底、heading 强调色差、web-only 降级、CJK tofu）。
  双门复跑：vm-smoke 净窗退出码 0（全组 ✓）；playwright 73/73
  （首跑 scroll-sync bottom 1 红=并行 flake，隔离复跑 7/7 + 净重跑
  73/73，同 046 复审口径）。worktree 提交 43095b2（14 文件）。

## 复审记录

**复审**：/auto-plan:review，2026-09-04（执行与复审同会话接力）。基
线：worktree plan-047-dev @ 43095b2（vs 939a38b，14 文件 174+/31-，
diff 面与执行申报一致，零 TODO/HACK 标记）。

**六验收逐条（全部复验，非采信执行申报）**：

1. ✅ 浅色主题 + 种子起步 + 并排三要素：复审独立净窗重启 VM——
   截图实证浅色两栏 + Heading One 全文档；`autoui_exists` Heading
   One FOUND×2（编辑+渲染两臂）、T3 probe 行 NOT FOUND（还原态
   洁净）；vm-vue-side-by-side.png 拼接图三要素一致在库。
2. ✅ 适配器在册 + STUBS=0 + 四符号桩不变：启动桩告警恰四条
   （is_vue/logSave/logCancel/useDemoAppBridge，initial_content 不在
   列）；`AUTO_VM_EXT_STUBS=0` 严苛档 `Undefined symbol: is_vue` 唯
   一——initial_content 为真符号。**口径注记**：验收原文「STUBS=0
   下正常运行」字面不可达（四 TS 符号硬错为 442 A3 既有语义，047
   前即如此，且 goal 3 要求桩语义不变——两者互斥）；按「真符号非
   桩」执行口径通过，登记债候选 D2。
3. ✅ 单源回路在册：scripts/gen-vm-content.mjs + 头注再生命令；复审
   复跑生成器 → git diff 空（幂等）；T3 改动→同现→还原回路执行段
   已实证（probe FOUND×2→NOT FOUND）。
4. ✅ 双门：复审独立复跑 playwright **73/73**（1.1m）+ vm-smoke 净窗
   **退出码 0**（全组 ✓）。vue 零回归链：app.at 唯一 vue 消费面，
   regen 后 App.vue 仅 dark_mode 惰性 ref + import 拆分（同 specifier
   行为恒等）。
5. ✅ 三处修准：grep「starts empty」零残留、「五符号」零命中；
   README CONSUMED×2 + 桩清单四符号 + Layout 三条目；DEBTS 040 修
   准 + 046 种子行销号（删除线保留史）；PARITY #5/#6 ✅ + #8/#11
   修准 + 波次索引 W2/W3 闭合。
6. ✅ auto-lang 零改动：`git -C auto-lang status` 无 tracked 源码改动
   （仅并行会话的 docs/plans 编辑与 scratch/，非本计划所为）；本计
   划未开 auto-lang worktree。

**遗漏/延后/workaround 清查**：diff 与 T1-T6 申报逐项对上，无丢子
项、无计划外文件；残段（PARITY #8 thumb、#4 py-4 px-5 消费臂）系
W2 立项时即排除的外围，转介 auto-lang 已在册（PARITY/DEBTS/README
三处一致），非本计划范围偷减；端口 9247 被 musk.exe 占用走内置
AUTOUI_MCP_PORT=9248（两侧同读该变量，非 hack）。

**债候选**：
- D1：README「gen/ …(gitignored, safe to delete)」表述过时——gen/
  非整体 ignore（gen/front/vue/src/App.vue 等 tracked，复审实测）；
  不在 T5 三处范围，未修，登记。
- D2：STUBS=0 档 demo 不可完整运行（四 TS 符号硬错，既有语义）；
  「正常运行」按真符号口径执行并记录；全绿需四符号真实现，另行
  立项。
- D3：scroll-sync e2e 并行 flake 一次（bottom-reach），隔离 7/7 + 净
  重跑 73/73——同 046 复审已登记 flake 族，无新增面。
- D4：vm-smoke/README 命令样例默认 9247——本机 musk.exe 占用为环
  境现状，`--port`/AUTOUI_MCP_PORT 机制已在文档，未改样例（轻微）。

**spec-impact**：见 frontmatter（supersedes=[]；new=P047-1..6 六节；
touched_goals=P046-2）。

**结论：六验收全过、无阻塞债 → status: reviewed，交 /auto-plan:merge。**

## 待澄清事项

（执行侧落定口径：①=**a 案**（声明变量初值，370 D-GAP sync 已覆盖，
零 auto-lang 改动）；②=**a 案载体**（生成转义字面量，b/c 未触发）；
③=**scripts/ 入库**（原「regen.sh gitignored」前提已过时——regen.sh
实为 tracked，倾向入库的定稿理由仍在）；④=**零适配**（nonce 覆盖
语义，无空文档断言）；⑤=**未触发**（046 先折后 047 开工，时序无
错位）；⑥=**维持不做口径**。）

- ① dark_mode 初始读入路径（renderer 读声明变量初值 vs .Init 调
  set_dark_mode 执行臂）实施时实测二选一，所选案与理由记复审；
  若需 auto-lang 改动，控制在本计划验收标准 6 的边界内。
- ② 种子载体三案（生成转义字面量 / 运行时读文件 native / 编译期
  asset 语言特性）——默认 a 案；实勘发现现成可调用文件读取
  native 则可升级 b 案；c 案超出本计划（新语言特性另立）。
- ③ 生成脚本安置：scripts/（入库、可复现）vs gen/ 流程内联
  （gen/regen.sh 现为 gitignored）——T2 实施时定，倾向 scripts/
  入库保单源可复现。
- ④ vm-smoke 初态断言若依赖空文档（预计不依赖），T4 适配幅度
  实测定。
- ⑤ PARITY.md 回填的时序错位：046 先折则 T5 直接回填；若 047
  先行开工（不建议），PARITY 两行回填顺延至 046 折后的收尾提交。
- ⑥ 深浅色运行时切换入口（设置面）不在本计划——demo 无设置面，
  登记为不做口径。
