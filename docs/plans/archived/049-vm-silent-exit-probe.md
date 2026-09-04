---
plan_id: PLAN-049
status: archived
feature_name: VM demo 窗口静默退出根因排查（exit 1 无栈无日志）
author: [zhaopuming]
created_at: 2026-09-04T00:00:00+08:00
updated_at: 2026-09-04T12:30:00+08:00

supersedes_spec_components: []
new_spec_components: []
touched_goals:
  - "P047-2: VM demo 观感收尾——运行时稳定性外延：窗口静默退出裁定为
    共享机外部击杀（非产品缺陷），vm-smoke 双门『全过』结论的条件边界
    由此修正（DEBTS 049 行 + 归因修正三件套）"

current_step: 6
total_steps: 6
---

# [PLAN-049] VM demo 窗口静默退出根因排查

## 变更摘要

排查 `auto.exe run -r vm` 起的 VM demo 桌面窗口在运行约 1 分钟后静默退出
（退出码 1、无 panic 栈、无错误日志）的问题：建立复现矩阵、静态圈定退出
路径、动态取证、裁定根因，最后按修复面大小收口——小则修复并回归，大则
登记 DEBTS.md 并修正 vm-smoke.mjs 头注的归因表述。

## 目标

1. 稳定复现：拿到 ≥3 种启动形态下的存活时长/退出码/日志尾部三列数据。
2. 定位：圈定与"无栈、无日志、code 1"特征吻合的退出路径（file:line 级），
   并用动态取证抓到退出瞬间的最后一行日志。
3. 裁定：产出一句可检验的根因陈述 + 支撑它的对照实验证据。
4. 收口：修复（soak ≥10 分钟不退 + vm-smoke 退出码 0）或债登记
   （DEBTS.md 新行 + vm-smoke.mjs 头注归因修正 + demo README 运行注意）。

## 架构方案

排查不动产品架构。涉及的既有机制（全部已核实 file:line）：

- **CLI 分发**：`crates/auto/src/main.rs:917-937` —— `-r vm` 走 renderer vm 轨。
- **MCP 服务**：`crates/auto-lang/src/ui/mcp_server.rs:3284-3298`
  `start_mcp_server` 把 `McpUiServer::run()` 放进 detached `std::thread`；
  `:3300-3305` `mcp_port()` 读 `AUTOUI_MCP_PORT`（默认 9247）。
- **心跳**：`crates/auto-lang/src/ui/iced/renderer.rs:6329-6348`
  `mcp_heartbeat_subscription`（Plan 314）——MCP 活跃时每 2s 发
  `__mcp_heartbeat` 消息保持快照新鲜，注释明言"消息不匹配任何 update() 臂"
  是设计预期；`:11395` 是 update 里的配置热重载臂（借心跳节拍做 500ms 节流）。
  VM 轨下该消息走到 VM handler 分发路径，因 demo 模块无 `__mcp_heartbeat`
  符号而打三行告警（CALL_HANDLER_FOR_NOT_FOUND + 两级 fallback）——良性噪音。

## 技术栈

Rust（auto-lang / auto crates，debug 构建已存在于
`D:/autostack/auto-lang/target/debug/auto.exe`）、Node（探针/soak 脚本，
沿用 vm-smoke.mjs 的 MCP 协议封装）、Git Bash（netstat/tasklist/后台任务）。

## 需求分析与背景调查

### 实测观测（2026-09-04 会话实证，PLAN-047 合入后的 auto.exe，构建于 09-04 00:45）

| # | 形态 | 现象 |
|---|------|------|
| A | 9248 启动 → vm-smoke.mjs 全过（11 断言，退出码 0）→ 数十秒后 | 进程消失，后台任务退出码 1；taskkill 扑空 |
| B | 9248 重启 → +8s MCP snapshot 探测成功（row/col + 种子 FOUND）→ 数分钟内 | 静默退出，退出码 1 |

- 退出日志（`/tmp/vm-demo2.log`）：**无 panic、无 error、无栈**，仅
  `__mcp_heartbeat` handler-not-found 告警 87 行 = 29 次 × 3 行；按 2s 节拍
  ≈ **存活 58 秒**——与两次"约 1 分钟"的体感吻合（存疑的定量线索，见 H2）。
- 环境注记：9247 被 musk.exe 长占（PLAN-047 债 D4 在案），本观测走 9248。
- `DEBTS.md` 无对应条目（grep heartbeat/静默退出/silently/净窗 零命中）。

### 已知坑的在案表述（待修正的对象）

`autodown/demo/auto/vm-smoke.mjs` 头注：被探测进程"occasionally exits
silently with code 1 (no stack, no log)"，归因 **physical synthetic
clicks**，workaround 为留守 MCP 逻辑通道 + 整轮重试一次。本次观测
**无任何物理点击**仍退出——归因大概率不准，T6 需按实证根因修正该注释。

### Spec 概览相关性

触及 P047（VM demo 观感收尾）的运行时稳定性外延与 vm-smoke 双门协议的
可信度（被测窗口中途自退会让 smoke 的"全过"结论带条件）。不 supersede
任何既有 spec 组件；048（vm-editing-behavior）为并行 active 计划，本计划
只读其冲突面（无——048 动编辑行为，本计划动进程生命周期）。

## 详细设计

### 假设清单（T5 逐个裁定或排除）

- **H1 客户端断开触发**：最后一个 MCP 客户端断开后，server 线程或 iced
  侧某收尾路径退出。观测 A/B 均符合"客户端活动结束后不久退"。
- **H2 心跳计数阈值**：VM 轨心跳分发失败累计到某阈值（29 次？）触发退出。
  两实例都存活 ~58s 的定量吻合是本假设的线索，也可能只是巧合。
- **H3 被吞的 panic / 运行时错误**：主线程或关键线程 panic。Rust panic
  默认打 stderr 栈，日志里没有 → 大部分 panic 面可排除，但
  `panic = "abort"` 之外的静默路径（如 join handle 丢弃）仍需 T3 圈定。
- **H4 环境干扰**：musk.exe（占 9247）或会话宿主对后台进程的回收。
  判别点：前台手工启动是否同样退出（T2 可选臂）。

### 复现矩阵设计（T1/T2）

| 臂 | 启动 | MCP 客户端行为 | 观察窗 |
|----|------|----------------|--------|
| a 空载 | 9248 起 | 从不连接 | ≥3 分钟或退出即止 |
| b 连后断 | 9248 起 | initialize + initialized 后立即断开 | 断开后 ≥3 分钟 |
| c 常连 | 9248 起 | 每 5s 一次 autoui_snapshot 常连 | ≥3 分钟 |
| d（可选） | 用户前台手工起 | 无 | 对照环境因素 |

每臂记录：存活时长、退出码、日志尾 10 行、心跳告警条数。心跳仅在 MCP
活跃时启用（renderer.rs:6338-6344 注释）——臂 a 若零心跳告警说明 MCP 未
激活，该臂若仍退出则 H1/H2 大幅弱化。

### 取证手段（T3/T4）

1. 静态：grep `std::process::exit` / `ExitCode::from(1)` / `exit(1)` /
   主返回 Err 面在 `crates/auto/src/main.rs` + `crates/auto-lang/src/ui/`。
2. 动态：`RUST_BACKTRACE=full` 复跑常连臂；候选路径插临时 `eprintln!`
   标记行后 `cargo build -p auto`（debug 增量）复跑，抓退出前最后一行。

## 测试设计

- 探针脚本沿用 `vm-smoke.mjs:91-113` 的 MCP JSON-RPC 封装（initialize →
  tools/call），新脚本只放 `tmp/` 或就地内联 node -e，不入 demo 正式面
  （除非 T6 裁定 soak 脚本值得转正）。
- 回归门按 T6 改动面定：改了 auto-lang → `cargo test -p auto-lang ui::`
  相关模块 + vm-smoke.mjs 退出码 0；只改 demo/文档 → vm-smoke.mjs 即可。
- 修复分支加 soak：修复后常连臂 ≥10 分钟存活且日志无新增告警类别。

## 验收标准

1. 复现矩阵 ≥3 臂完成，三列数据（存活时长/退出码/日志尾）齐全成表。
2. 退出路径清单 ≥1 条与"无栈无日志 code 1"吻合，动态取证抓到退出瞬间
   最后一行日志（插桩标记或 RUST_BACKTRACE 输出）。
3. 根因裁定成文：一句可检验根因陈述 + 对照实验命令与预期/实测结果，
   写入本计划复审记录。
4. 收口二选一完成：修复（soak ≥10 分钟不退 + vm-smoke 退出码 0）或
   DEBTS.md 债登记（含复现命令与证据指针）。
5. `vm-smoke.mjs` 头注的退出归因按实证修正（无论修复与否——归因修正
   本身独立成立）。
6. 若 T6 改了 auto-lang：相关 `cargo test -p auto-lang` 模块全过。

## 执行步骤

### T1 复现矩阵臂 a（空载）
- 操作：`AUTOUI_MCP_PORT=9248 auto.exe run -r vm > /tmp/soak-a.log 2>&1`
  后台起；循环 `sleep 30 && netstat -ano | grep :9248` 探测，共 6 轮
  （3 分钟）或退出即止；退出则记 `echo $?` 与日志尾 10 行、grep -c heartbeat。
- 文件：无代码改动，数据记入本计划「复审记录」临时表。
- 验证：臂 a 行三列数据齐。
- [✅ 已完成] 臂 a：11:06:58 起 → **t=91s 退出 code=1**（11:08:29），心跳
  0 行（MCP 从未激活），日志 191 行止于窗口建后 3 条初始 scroll
  UI_EVENT，之后 ~90s 全静默。空载也退出 → H1/H2 直接排除（计划预判
  的弱化实为排除）。

### T2 复现矩阵臂 b/c（连后断 / 常连）
- 操作：node 内联脚本走 `initialize` + `notifications/initialized` 后
  立即断开（臂 b）；另一实例每 5s `autoui_snapshot`（臂 c）；观察窗同 T1。
  可选臂 d：请用户前台手工起一次对照（记录即可，不阻塞）。
- 文件：探针可内联 node -e（协议照 vm-smoke.mjs:91-113）。
- 验证：臂 b/c（d 若做）三列数据齐；臂 a/b/c 差异可对照。
- [✅ 已完成] 臂 b：11:10:03 起，客户端 t≈20s initialize 后断开 →
  **t=180s 退出 code=1**；心跳 42 行=14 拍（t≈20→48s 后停=客户端沉默
  ~28-30s 会话过期），死前 ~130s 全静默。臂 c：11:20:08 起，常连客户端
  每 5s snapshot + 心跳 330 行=110 拍连绵 → **观察窗 240s 全程存活**
  （脚本收尾 kill，非自发退出），客户端死亡时刻与脚本清理对齐。
  臂 d 未做（H4 由环境取证替代，见 T4/T5）。三臂差异可对照：**无客户端
  或客户端已走 → 必死（91s/180s/原观测 58s）；常连客户端 → 存活**。

### T3 静态圈定退出路径
- 操作：`grep -rn "process::exit\|ExitCode" crates/auto/src/main.rs
  crates/auto-lang/src/ui/`；追 `main.rs:917-937` vm 分发到 iced run 的
  返回值处理；产出候选清单（file:line + 触发条件）写入复审记录。
- 文件：`D:/autostack/auto-lang/crates/auto/src/main.rs`、
  `D:/autostack/auto-lang/crates/auto-lang/src/ui/**`（只读）。
- 验证：清单 ≥1 条特征吻合（无栈/无日志/code 1 可解释）。
- [✅ 已完成] 候选清单（全仓 105 处 `process::exit` 清点后收窄）：
  1. `crates/auto/src/main.rs` ×77——全部在 CLI 参数校验/命令分发错误
     臂，exit 前有 eprintln/format_error_json，且属启动期路径，UI 运行
     中不可达；run 命令唯一的运行期错误面 `am.run(args)`（main.rs:1094）
     走 miette，**必打印**。
  2. `crates/auto-lang/src/vm/ffi/stdlib.rs:684` `shim_process_exit`
     （VM `Process.exit`）——进程内**唯一**无输出 exit(code) 点；但 demo
     的 .at 源（app.at/app_ext.at/app_ext.vm.at/custom_scrollbar.at）
     grep exit/set_timeout/set_interval 零命中，宿主侧无内部调用者。
  3. `ui/**`（renderer/mcp_server/vm_bridge/session）——**零** exit 调用；
     iced `.run()?`（renderer.rs:14632）错误上浮 AppResult → miette 打印。
  4. 无 `panic=abort` profile、无 watchdog/idle-timeout 逻辑（grep
     watchdog/idle/inactivity 零命中）。
  5. 结论：**进程内不存在可达的静默 exit(1) 路径** → 特征吻合项为
     "外部终止"：受控实验实测 `taskkill /F` → 进程退出码恰为 1 且零输出；
     另 Windows 上 Rust std `Child::kill()`/Node libuv kill 均走
     `TerminateProcess(handle, 1)`，静默 code 1 即监管者击杀签名。

### T4 动态取证
- 操作：`RUST_BACKTRACE=full` 复跑臂 c；若静态清单不足以定位，在候选
  路径插临时 `eprintln!("EXIT-PATH-MARK …")` 后
  `cargo build -p auto`（debug 增量，路径
  `D:/autostack/auto-lang`）复跑至抓到退出前最后一行。
- 文件：`crates/auto-lang/src/ui/**`（临时插桩，取证后还原）。
- 验证：日志末行为插桩标记或 backtrace，指认唯一退出点。
- [✅ 已完成] RUST_BACKTRACE=full 贯穿臂 c/a2/c2/a3：零 panic 输出（无
  进程内崩溃）。插桩分支未启用——静态清空（T3）+ 100ms 轮询 watcher
  （taskkill.exe 出现 + auto.exe 集合变化 + 死亡时戳精确到 ms）+ 受控
  taskkill 退出码实验已足够定位，**auto-lang 零改动**。现场捕获：
  ① 外部实例 30708 于 **taskkill 出现后 8ms** 消失（11:31:57.584→.592，
  硬杀现行）；② a2@90.9s / c2@260.0s 干净关闭（code 0 + `end` 脚注，
  无 taskkill 现场，CloseRequested 探针不触发=Plan 065 已钉死的
  「Windows 壳层先行代关」路径）；③ 实验环境 11:23-11:35 期间 taskkill.exe
  出现 7+ 次（并行 agent 会话的清理扫杀是常态背景活动）。

### T5 根因裁定
- 操作：按 T4 证据做对照实验（示例：H2 → 心跳计数断点/加大节拍对照；
  H1 → 常连 vs 断开存活时长对照；H4 → 前台臂对照），产出根因陈述
  （假设编号 + 证据链 + 实验命令）写入复审记录。
- 文件：本计划文档复审记录节。
- 验证：陈述含可复现实验命令与预期/实测对照。
- [✅ 已完成] 假设裁定：**H1 ✗**（臂 a 无客户端亦死）、**H2 ✗**（臂 a
  心跳 0 行；心跳停止=客户端沉默 ~28-30s 的 MCP 会话过期，与死亡时刻
  无关）、**H3 ✗**（T3 进程内静默路径清空 + RUST_BACKTRACE 零 panic）、
  **H4 ✓（精化）**：共享机上并行 agent 会话的清理击杀。根因陈述与
  复现矩阵/对照实验全表见「复审记录」。

### T6 收口（修复或债登记 + 归因修正）
- 操作（按 T5 分支）：
  - 修复分支：实施最小修复（落点由 T5 定），soak 常连臂 ≥10 分钟不退，
    `node vm-smoke.mjs --port 9248` 退出码 0；若改 auto-lang 另跑
    `cargo test -p auto-lang ui::` 相关模块。
  - 债登记分支：`DEBTS.md` 新行（复现命令 + 证据指针 + 影响面）。
  - 两分支共同：`autodown/demo/auto/vm-smoke.mjs` 头注退出归因按实证
    修正；`autodown/demo/auto/README.md` 运行注意补一条（若影响使用者）。
- 文件：`D:/autostack/auto-down/DEBTS.md`、
  `D:/autostack/auto-down/autodown/demo/auto/vm-smoke.mjs`、
  `D:/autostack/auto-down/autodown/demo/auto/README.md`、（修复分支）
  `D:/autostack/auto-lang/crates/**`。
- 验证：分支各自命令退出码 0；grep 头注旧归因表述零残留。
- [✅ 已完成] **债登记分支**（T5 裁定外部击杀→无产品修复面）：
  DEBTS.md 049 新行（运行环境 🟡，复现命令/证据指针/绕道齐）；
  vm-smoke.mjs 头注归因改 PLAN-049 实证版（physical synthetic
  clicks 退役）+重试 bar 指针同步；README.md VM smoke Notes 补
  Running caveat（两型死法特征/重启即可/孤儿 Start-Process 长 soak
  法）。worktree 提交 a8afef3（3 文件）。验证：grep「PHYSICAL
  synthetic|physical-click probes|jade README:127」demo 目录零残留；
  `node vm-smoke.mjs --port 9248` 实跑 **11 断言组 PASS 退出码 0**；
  auto-lang 零改动（全程只读）。臂 d（前台对照）未做——由 a4 孤儿臂
  +外部实例 red-handed 击杀替代覆盖 H4，不阻塞。

## 复审记录

### 复现矩阵总表（T1/T2/T5 对照实验，2026-09-04 11:06-11:42 实测）

| 臂 | 形态 | 存活时长 | 退出码 | 日志尾/脚注 | watcher 现场（100ms 轮询） |
|----|------|---------|--------|------------|---------------------------|
| a | 9248 空载（无客户端） | 死于 (60,91]s | **1** | 无 `end` 脚注；3 条初始 scroll UI_EVENT 后全静默；心跳 0 行 | 未开 watcher |
| b | 9248 连后断（t≈20s initialize 即走） | 死于 (150,180]s | **1** | 无脚注；心跳 42 行=14 拍（t≈48s 停=会话过期），死前 ~130s 静默 | 未开 watcher |
| c | 9248 常连（5s snapshot） | ≥240s（脚本收尾杀，非自发） | — | 心跳 330 行连绵至死 | 死亡时刻=脚本清理 |
| a2 | 9248 空载 | **90.9s**（watcher 精确） | **0** | **有 `end` 脚注**（干净收尾） | 无 taskkill 现场 → 壳层关窗路径 |
| c2 | 9249 常连 | **260.0s** | **0** | 有脚注；心跳至死方休（客户端活着窗口仍被关） | 无 taskkill 现场 → 壳层关窗路径 |
| a3 | 9248 空载 | 360s 全活（脚本杀） | — | — | 全程无事件（击杀波间歇期） |
| a4 | 9250 孤儿游离（Start-Process 脱树） | **≥5min 仍活** | — | — | watcher4 期内无事件 |
| 外部 30708 | 并行会话的 `run --render=vm` | 11:16:58→11:31:57 | 被杀 | — | **taskkill 出现 8ms 后消失**（硬杀现行） |
| 原观测 A/B | 会话后台任务 | ~58s（心跳计数口径） | 1 | 无脚注 | —（2026-09-04 晨间，PLAN-047 后构建） |

### 根因裁定（T5）

**一句可检验陈述**：`auto run -r vm` 窗口的静默退出（code 1、无栈、无
日志）**不是 demo/auto-lang/MCP 的进程内缺陷**——退出由共享机器上并行
agent 会话的清理击杀（`taskkill /F` 类 `TerminateProcess`，实测该类击杀
的进程退出码恰为 1 且零输出）造成；另有同体验的姊妹路径：OS/壳层关窗
（Plan 065 钉死的「壳层先行代关」，CloseRequested 不达应用）→ 窗口关
闭 → iced daemon 语义全窗退出 → `run()` Ok → **exit 0 + `end` 脚注**
（a2/c2 两例）。死亡时机跟随并行会话活动波次（11:26-11:31 有击杀波、
11:32-11:40 间歇），**无固定定时器**（a3 空载 360s 全活、a4 孤儿 ≥5min、
c2 常连 260s、a2 91s——时长谱连续无周期）。与 physical synthetic
clicks 无关（空载臂零交互亦死），与客户端断开/心跳计数无关（臂 a 无
客户端无心跳仍死）。

**证据链**：
1. T3 静态清空：进程内无可达静默 exit(1)（main.rs 77 处皆打印且属启动
   期；ui/ 零 exit；`Process.exit` 无调用者；iced 错误必经 miette 打印；
   无 panic=abort/watchdog）。
2. 受控实验：`taskkill /F /PID <ping>` → bash 报退出码 **恰为 1**、零
   输出（`Stop-Process -Force` 则 -1）；Rust `Child::kill()`/Node libuv
   kill 同走 `TerminateProcess(handle,1)`——静默 code 1 即监管者击杀签名。
3. 现行捕获：30768→30708 实例死于 taskkill.exe 出现后 8ms；环境 12
   分钟内 taskkill.exe 出现 7+ 次（并行会话清理为常态背景）。
4. 干净关闭对照：a2/c2 死时无 taskkill 现场、有 `end` 脚注、code 0、
   CloseRequested 探针不触发——与 renderer.rs:14557 Plan 065 注记
   「Windows 壳层先行代关」逐点吻合。
5. 反例排除：a3（空载树内）360s 全活 + a4（孤儿）≥5min——排除固定
   定时器与「孤儿/树内」强相关；击杀目标为外部活动所选，非进程属性。

**对照实验命令**（复现）：臂 a/a2 同款 `AUTOUI_MCP_PORT=9248 auto.exe
run -r vm > /tmp/soak.log 2>&1 &` 后 `while kill -0 $!; do sleep 30; done;
wait $!; echo $?`——预期（实测）：共享机并行会话活跃期 1-4 分钟内退出
码 1 无输出（a、b、原观测）；间歇期全程存活（a3、a4）；壳层关窗波及
时退出码 0 且日志尾有 `------------- end --------------`（a2、c2）。

**遗留边界**：具体「哪一支」并行会话/宿主发出每次击杀，需管理员权限
进程创建审计（auditpol 4688 + 命令行）方可逐击指认——本环境无管理员
（auditpol Access denied），已按外部类别收口；vm-smoke 重试一次的
workaround 维持有效（击杀间歇即过）。

### 复审结论（/auto-plan:review，2026-09-04）

**复审对象**：worktree `plan-049-dev` @ `4a74499`（单提交，3 文件
+32/−9——DEBTS.md/README.md/vm-smoke.mjs；纯文档+注释改动，唯一
非注释行是 vm-smoke 重试日志的文案字符串，零逻辑变化）。auto-lang
仓本计划零改动（全程只读；该仓工作区的 532/536 计划文件改动属并行
会话，与本计划无关）。

**逐条验收复核**（复审亲验，非转录执行期勾）：

1. **复现矩阵 ≥3 臂三列成表 — PASS**：复审记录 9 行总表（a/b/c +
   a2/c2/a3/a4 + 外部实例 + 原观测）；证据文件在位抽查：`/tmp/soak-a.log`
   心跳 grep=0、`soak-b.log`=42、`watcher.log` 3695B 在案，与矩阵数值
   一致。
2. **退出路径清单吻合 + 动态取证 — PASS（带形态偏离注记）**：T3 清单
   第 5 条（外部 `TerminateProcess(1)`）与三特征完全吻合；动态证据
   未走「插桩标记/backtrace」字面路径——外部击杀在进程内日志上**不可能**
   留下标记（TerminateProcess 不给进程任何收尾机会），实际以 watcher
   现行（taskkill 出现 8ms 后外部实例消失）+ 受控退出码实验（taskkill /F
   → 恰 1 零输出）+ 两型死亡方式（硬杀 1 无脚注 / 干净 0 有脚注）钉死，
   证据强度高于日志标记；RUST_BACKTRACE 全程零 panic 亦即「非进程内
   崩溃」的反向证据。
3. **根因裁定成文 — PASS**：一句可检验陈述 + 复现命令 + 预期/实测
   对照 + 假设四裁定（H1✗/H2✗/H3✗/H4✓精化）齐备于本记录。
4. **债登记 — PASS**：DEBTS.md 049 新行（复现命令经归档指针 +
   证据指针 + 影响面/绕道）；指针已修为 `docs/plans/archived/049`
   前瞻路径（与 039 行同例，merge 归档后不漂移）。
5. **vm-smoke 头注归因修正 — PASS**：grep「PHYSICAL synthetic /
   physical-click probes / jade README:127」worktree demo 目录零残留
   （复审亲跑）。
6. **auto-lang 模块测试 — N/A**：diff 零 rust 文件，不适用。

**门禁**：vm-smoke 复审亲跑 **PASS 11 断言组 / 退出码 0**（9248 净窗
起-测-收，窗口已清）。playwright 73 未跑——改动面为 DEBTS/README/
纯注释脚本，按计划测试设计「只改 demo/文档 → vm-smoke.mjs 即可」的
范围裁定（明示记录，非静默跳过）。

**遗漏/延后/workaround 清查**（惰性收敛检查）：
- 臂 d（可选前台对照）未做：计划明标可选不阻塞，已由 a4 孤儿臂 +
  外部实例 red-handed 击杀替代覆盖 H4（T6 标记与待澄清②在案）——
  非静默丢弃。
- 击杀者逐击身份未指认：环境无管理员（auditpol denied）的固有边界，
  DEBTS 049 行在案——非未经批准的延期。
- retry-once workaround 维持：既有 bar 重赋因（归因修正本身就是本计划
  交付物），未新增 hack，零 TODO 引入。
- 债候选：**D1** 将来取得管理员权限时可做一次进程创建审计逐击指认
  击杀者（已含于 DEBTS 049 行边界，不单列新行）。无其他候选。

**结论**：六条验收全 PASS（1 条 N/A），无阻塞债，无未批准延期——
**status → reviewed**，交 `/auto-plan:merge`。

## 待澄清事项

1. ~~修复落点若在 auto-lang 仓：跨仓改动是否随本计划携带~~ → **已消解**：
   T5 裁定外部击杀，进程内无修复面——auto-lang 零改动（全程只读），
   走债登记分支收口。
2. ~~臂 d（前台手工对照）需用户配合起一次窗口~~ → **已替代**：a4 孤儿
   臂（Start-Process 脱离会话树，≥5min 存活）+ 外部实例 red-handed
   击杀（taskkill 出现 8ms 后消失）覆盖了 H4 的环境判别，臂 d 不再必要。

## 执行后记（/auto-plan:work 收尾）

- 全部 6 步完成，验收 1-5 达成（6 不适用——未改 auto-lang）：矩阵
  9 行三列齐（含 a2/c2/a3/a4 对照臂）；退出路径清单+静默签名吻合
  （外部 TerminateProcess(1)）；根因陈述+对照实验写入复审记录；债登记
  三件套落盘 worktree a8afef3；vm-smoke 归因修正与回归门绿。
- 遗留边界（登记于 DEBTS 049 行）：逐击指认具体击杀发出者需管理员
  进程创建审计（本环境 auditpol Access denied），按外部类别收口。
