# Plan 021：jade-garden VM（桌面）化——后端逻辑与 lib 层并入 Auto 双端库

> 状态：**立项（2026-08-27 评估完成，未开工）**。决议来源：2026-08-27 会话方向裁定——
> jade-garden 未来直接依赖 autodown 的 Auto 实现库，使 VM（桌面）版成为可能，
> 而不是限于网页版。
> 立项：2026-08-27。前置：无硬前置（Phase 1 可即日开工）；Phase 3 依赖
> auto-lang Plan 442-c2 成果（已实证）；Phase 4 依赖 ui_gen iced 后端成熟度确认。
> 关联：Plan 020（jade 迁移收口不受阻，Phase 2 与其"三镜像合一"裁定合流）；
> Plan 011 Phase 5.0a（legacy-autoui 归档——本计划复活其 api.at/service.at 种子）；
> auto-lang Plan 387/397/416/417（a2r 管线活跃开发中）。
> 评估依据：2026-08-27 双仓调研（auto-lang crates 实测 + engine .at 头注释
> a2r 约束清单 + jade 三手写层盘点），详见下文背景。

## 背景

三块拼图的成熟度（2026-08-27 实测）：

**Auto 侧（运行时）——基本就绪。**

- `auto-lang/crates/auto-vm`：VM 主体。
- `auto-lang/crates/a2r-std`：Auto→Rust 标准库，已含 **fs / http（含 async，
  Plan 024 sync-in-async）/ json / env / hashmap / list / math**——桌面后端
  所需原语已成库且活跃迭代（a2r 管线 Plan 387/397/416/417 提交在案）。
- `ui_gen` 已有 **iced 渲染后端**（widget DSL → 桌面 UI 通路存在）。
- **Plan 442-c2 实证**：VM 内经 axum 适配层注册完整路由并完成 HTTP 派发
  （13 路由注册 + 200 派发）——"网页架构平移进 VM"的关键先例。

**autodown 侧（双端库）——模式已验证，覆盖面待扩。**

- engine parser 四件套（`block_model.at` / `markdown_parser.at` /
  `serializer.at` / `ial.at`）按 **a2r-clean subset** 编写，头注释明确
  "dual-emittable (a2ts acceptance now, a2r per …)"并列出 a2r 约束清单
  （无 regex；字符串操作限 `.slice/.length/+/==/.split`；字段名避 Rust
  关键字；不用 map 原生索引——list 扫描替代；无 `f(x) ?? dflt`）。
- render 层 scheduler / palette_map / streaming 同为 `.at` 源；
  77a2eaf（palette_map.at a2r 发射并入 autodown-core crate）已走通该路。

**jade-garden 侧（对 VM 的三个手写阻塞层）。**

| 层 | 现状 | VM 化障碍 |
| --- | --- | --- |
| 后端 | 手写 Rust Axum ×19 模块（workspace/files/wiki/links(SQLite)/search(FTS)/tasks/query/srs/import_export/sync/whiteboard/assets/blocks…） | 非 Auto 源，VM 无法接管；但 HTTP 契约（`/api/*`）稳定且前端只依赖此面 |
| front lib + ext | 手写 TS：`lib/api.ts`（fetch 客户端）、`lib/blockParser.ts`（引擎 parser 的 TS 镜像）、`lib/wikiLink.ts`、`lib/dailyNote.ts`、`lib/templates.ts`、9 个 store facade、各 widget ext（try/catch、正则、DOM/clipboard/confirm） | 浏览器绑定；blockParser 与引擎 a2r 产物语义重复（三镜像问题，020 Phase 3 在册） |
| UI | 29 个 widget `.at` → `@autodown/vue` → DOM | iced 发射目标需接入（ui_gen iced 后端已存在） |

**有利结构**：前端只认 `/api/*` HTTP 面 + `vite.config.ts` 已预留
`TAURI_ENV` 钩子 + `legacy-autoui/` 归档的 `api.at / db.at / service.at /
back.pac.at` 种子（plan-011 归档原因是旧工具链覆盖问题，非方向问题）。

## 目标

1. **逻辑单源**：jade-garden 后端服务逻辑与 front lib 迁为 `.at`
   （a2r-clean subset）单源，a2ts + a2r 双发射，金标对拍兜底。
2. **VM 桌面版**：Tauri/VM 壳 + iced 渲染 + VM 内路由（Plan 442-c2 模式）
   的桌面形态可用。
3. **网页版零回归**：同一套 Auto 源，网页版（DOM + 远端/进程内 Axum）
   保持现行为与 e2e 基线。
4. **退役重复实现**：`back/server` 手写 Rust 与 `front/src/lib/blockParser.ts`
   镜像逐步退役，消除三镜像漂移面。

## 即日生效纪律（防迁移债增殖）

- 新增后端功能：逻辑一律写 a2r-clean subset 兼容的 `.at` + 薄 FFI 壳，
  **不再新增手写 Rust 业务模块**。
- front lib 中与引擎重叠的模块（`blockParser.ts`）冻结：只修 bug，
  不加新逻辑；新能力放引擎侧。

## 阶段划分

### Phase 1 — API 契约固化（api.at 复活）

- 以 `legacy-autoui/api.at` 为种子恢复正式契约源：逐端点固化现役
  `/api/*` 请求/响应形状（workspace / files CRUD / wiki / backlinks /
  outlinks / graph / search×3 / tasks / agenda / query / cards×2 /
  import / export / sync / whiteboard / blocks×2 / unlinked / assets，
  含 021 前置的 ApiError `{"error": ...}` 错误面）。
- `lib/api.ts` 与契约对拍（类型同源生成或一致性校验脚本二选一，倾向
  生成——契约即唯一真源）。
- 验收：契约覆盖全部现役路由；TS 客户端改由契约产出后 jade e2e 全绿；
  契约变更流程写进本文档。

### Phase 2 — 后端纯逻辑 .at 化（a2r-clean subset）

- 迁移顺序（纯逻辑 → 副作用薄壳）：
  1. wiki 读写 + 块解析（`parser.rs` 退役第一枪；`ANCHOR_SUFFIX_RE` /
     `PROPERTY_RE` 等正则改手写字符扫描——先例：engine `extractAnchorBlock`）；
  2. links 索引（SQLite 交互留 FFI 壳，纯逻辑下沉）；
  3. search / tasks / agenda / query（query 表达式解析器是纯逻辑标杆）；
  4. srs（CARD/CLOZE 识别 + schedule 矩阵，纯逻辑）。
- 副作用面（fs / SQLite / notify 文件监听）：extern FFI 壳；a2r-std
  `fs/http/json` 可用面先行确认（Plan 024 async API）。
- 金标：每模块 a2ts + a2r 双发射 + 对拍测试（复制 engine 四件套的
  roundtrip/parity 三层模式）。
- SQLite 存储裁定项：a2r-std 无 db 绑定——FFI 绑 rusqlite，或降级
  JSON 文件存储（索引可再生，倾向后者减 FFI 面，实测后定）。
- 验收：对应手写 Rust 模块删除；双端金标测试绿；jade e2e 无回归。

### Phase 3 — VM 内路由接管

- Plan 442-c2 模式推广：VM 注册全部 `/api/*` 路由（Phase 2 的 a2r 产物
  + FFI 壳），网页版前端直连 VM 后端（loopback HTTP 或进程内派发，
  442 已两者验证）。
- 验收：**网页版前端零改动**跑在 VM 后端上，jade e2e 全量复用通过。

### Phase 4 — UI 双渲染（iced）

- 29 个 widget `.at` 接 ui_gen iced 发射；ext 层 DOM 依赖清单化并逐项
  裁定：clipboard / confirm / showDirectoryPicker / DOM walk（hover 定位、
  scrollToBlock）→ VM 能力或 iced 等价物。
- 图谱视图（cytoscape）裁定项：iced 下换渲染后端或保留 webview 子区。
- 验收：核心流（打开工作区/编辑/保存/反链/图谱/闪卡）iced 下可用；
  双端视觉基线建立。

### Phase 5 — 桌面壳与手写层退役

- 桌面壳：Tauri（`TAURI_ENV` 钩子激活）或纯 VM 窗口（auto-cosmic）二选一，
  Phase 4 结束按 iced 成熟度裁定。
- `back/server` 手写 Rust 全量退役；`front/src/lib/blockParser.ts` 删除
  （消费引擎 a2ts 产物）；三镜像归一完成（020 Phase 3 该项随之销号）。
- 验收：桌面版端到端（打开工作区/编辑/保存/搜索/闪卡/导入导出）；
  网页版 e2e 无回归；DEBTS/README/ARCHITECTURE 文档收口。

## 风险与约束

- **a2r-clean subset 限制**：无 regex、字符串操作受限、无 map 原生索引。
  后端现有正则逻辑（ANCHOR_SUFFIX_RE / PROPERTY_RE / CARD_TAG_RE /
  ORDERED_RE / query 表达式）需改写为手写扫描。缓解：engine 四件套是
  完整先例库；约束能反向带来双端确定性。
- **a2r 发射器仍在活跃开发**（Plan 387/397/416/417 提交密集，bug 修复
  型提交占比高）。缓解：金标对拍测试先行，发射器问题在 auto-lang 侧
  提修复而非绕过。
- **SQLite**：a2r-std 无 db 绑定（裁定项见 Phase 2）。
- **ext 层 DOM 能力**：剪贴板/目录选择器/hover DOM 定位在 iced 下无
  直接等价（裁定项见 Phase 4）。
- **cytoscape 图谱**：桌面渲染方案未定（裁定项见 Phase 4）。

## 与其他计划的关系

- **Plan 020**：Phase 3 收口（wikilink 点击/菜单/e2e 23/23）不受本计划
  阻塞；本计划 Phase 2 完成即销号 020 的"三镜像合一"裁定项。
- **Plan 011**：legacy-autoui 归档维持（`auto run` 覆盖风险仍在），
  本计划只取其 `.at` 种子，不恢复旧 AutoUI 工作流。
- **auto-lang Plan 442-c2 / 024**：直接消费其成果，回归问题反馈
  auto-lang 侧。
