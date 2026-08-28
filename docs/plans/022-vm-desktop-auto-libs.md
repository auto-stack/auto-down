# Plan 022：jade-garden VM（桌面）化——后端逻辑与 lib 层并入 Auto 双端库

> 改号（2026-08-28）：原序号 021 与「编辑层 UI 再 Auto 化」计划（2026-08-26
> 立项先占、已终审归档且全域引用）冲突，本计划顺延为 **022**，内容零改动。
> 状态：**执行中（Phase 1 + Phase 2 完成，2026-08-28）**。决议来源：2026-08-27 会话方向裁定——
> 执行注记（2026-08-28 改号会话）：本计划 Phase 2 的 slice 1-3 由前序会话按
> 旧号执行并已合 master（accf064 slice1 块解析 / bdcccfc slice2 链接提取 /
> e20de45 slice3 查询求值器+任务扫描——提交信息写的 plan-021，历史不改，
> 此处对号入座）；slice 4 由改号后本会话执行。
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

> **进度（2026-08-28 Phase 1 完成，欠账回补）**：back/auto/api.at 契约单源
> 落地——34 类型覆盖全部 28 条现役路由（workspace/files CRUD/assets/wiki/
> links×3/search×3/tasks/agenda/query/cards×2/import/export/sync/whiteboard/
> blocks×2/unlinked，含 ApiError `{"error": …}` 错误面）；请求体类型化
> （FileCreateRequest 等），查询参数与 multipart 在 ROUTE 注记登记。
> a2ts 单向发射（`tsOnly`，backend serde DTO 留守运行时权威），部署副本
> `front/src/lib/api_gen.ts` 由 gen.mjs 产出；`lib/api.ts` 手写 interface
> 全退役改为 re-export，fetch 层 + `LinksResponse<T>` 泛型信封 +
> `GraphSettings`（front 本地视图模型）留守。表达力探针：`str?`→
> `string | null`、递归 `List<FileNode>`、`type` 字段名双端可用；开放对象
> （frontmatter/properties）以空结构 `JsonAny` 标记 + gen 后修 J1 →
> `Record<string, any>`。路由覆盖检查 `tests/api-contract-routes.mjs`
> （main.rs ↔ api.at ROUTE 标记 28/28）。门：vue-tsc 零错（抓到一例旧
> 接口说谎：线上 priority 恒为 string|null，旧手写接口却声明
> `priority?: string`——agenda 视图模型已诚实化）+ vite build +
> jade e2e 23/23。**契约变更流程**（细则在 api.at 头注）：后端 DTO 先行
> → api.at 镜像 → `node gen.mjs` 再生 → api.ts 跟随 → vue-tsc 卡客户端
> 漂移 → ROUTE 检查卡漏登记；e2e 为行为对拍门。
>
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

> **进度（2026-08-28 slice 1 完成）**：back/auto/parser.at 单源落地——
> 块分段/锚点剥离/属性扫描退役 parser.rs（薄壳化，pub API 零改动）；
> back/auto/gen.mjs 双发射 a2ts/a2r；fixtures.json 单源对拍
> （rust parse_gen_parity_fixtures + node tests/parity.mjs 双侧断言）。
> 登记偏差：有序列表统一为「数字串 + . 」（原 parse_list_item 只认
> 1./0.，与 is_block_start 的 ORDERED_RE 不一致，"12. x" 行会进空段落
> 死循环——顺带修复）。
>
> **进度（2026-08-28 slice 4 完成，改号后）**：agenda + srs 纯逻辑 .at 化——
> `agenda.at`（日期校验归一/窗口分组，退役 tasks.rs 的 parse_task_date +
> BTreeMap 分组）与 `srs.at`（CARD/CLOZE 识别与 QA 构建/属性行区扫描/
> OF 矩阵 factor+update/调度数学/复盘属性行手术，退役 srs.rs 三个正则与
> schedule/update/QA/property 手写体）；壳保留 axum/fs/chrono 与全部
> str↔float 解析格式化（a2r 不能降阶 to(float)/toFixed——float 只跨边界
> 传值，算术在 .at）。新增跨端纪律两条：`(a op b) * c` 括号被发射器丢弃
> → let 中转变量（DEBTS 013 残留复现）；`x.max(y)`/`/` 双端不同形
> （TS number 无方法 / a2ts 浮点除）→ 比较辅助 fmax/fmin 与减法整除。
> 对拍：agenda 15 日期 + 2 分组、srs 7 QA + 6 属性 + 2 抽取 + 5 factor +
> 2 update + 4 调度 + 3 手术（node TS 孪生 + rust include_str 双侧同
> fixtures）。门：server cargo 33/33（24 既有全存活 = 语义保形证据）+
> 六套 parity 全绿 + jade e2e 23/23（worktree 需先构建 engine dist 与
> 同步 tmp/wiki-demo fixture，与 021 会话同款环境项）。剩余 slice：
> search（触发 SQLite 存储裁定项）；Phase 1（api.at 契约固化）仍欠。
>
> **进度（2026-08-28 slice 5 完成）**：search 纯逻辑 .at 化 + FTS5 退役 +
> SQLite 存储裁定落定——`search.at`（查询 trim+ASCII 折叠 / 大小写不敏感
> 子串匹配 / 首命中词对齐窗口 snippet（壳注入 \u0001 标记包裹、两侧省略
> 号）/ 确定性排序（页先块后、命中数降序、path/uuid/blockId 升序决胜）/
> limit 截断）退役 index.rs 的 FTS5 虚拟表+6 触发器+escape_fts_query+
> rebuild_fts（init 含旧库 DROP 清理）；壳收缩为「SQL 读行 →
> search_gen::searchAll」。高亮标记串由壳注入——`\u0001` 转义字面量两侧
> 发射器都不解释（探针实测，透传为字面反斜杠）。
> **存储裁定（裁定项销号，倾向落地为裁定）**：JSON 文件存储方向，否决
> rusqlite FFI。实测依据：a2r-std fs+json 面完整可用；FTS5 退役后 SQLite
> 只剩普通行表（索引可再生缓存），JSON 化无技术障碍；为可再生缓存引
> rusqlite 绑定面违背减 FFI 面。落地分两步：本 slice 已卸掉 FTS5（SQLite
> 在索引中的唯一不可替代件），行缓存迁 `jade-garden-index.json` 立为独立
> 小步（涉 index.rs 全部消费方，防 blast radius），Phase 3（VM 接管）前
> 完成即可。搜索语义登记偏差（FTS5→char-scan，无测试钉死 bm25/分词——
> e2e 23 条零搜索断言）：子串匹配替代 unicode61 分词（CJK 连续串内可
> 命中，实测「项目」命中「项目二」，FTS5 时代查不到，属增强）；bm25 换
> 命中数排序（tie path/uuid 升序，确定性）；查询字面化（FTS5 语法与引号
> 转义壳消亡）；页 snippet 命中 title 时改取 title（旧恒取 frontmatter
> 列，UX 修正）。新增跨端纪律：a2r 不转义 Rust 2024 保留字 `final`（.at
> 局部变量撞名即 E0530）→ 标识符避用保留字（DEBTS 022 行，修复属
> auto-lang 关键字转义表）。对拍：search 15 fixtures（大小写折叠/CJK
> 子串/页先块后限截/计数排序/路径 uuid 决胜/长文窗口省略号/frontmatter
> snippet/字面括号/多词短语/limit 0/空白 trim；build-search-fixtures.mjs
> 构造生成，node TS 孪生 + rust include_str 双侧同 fixtures）。门：server
> cargo 34/34（33 既有全存活）+ 七套 parity 全绿 + jade e2e 23/23 + 生产
> API 冒烟（scratch 副本起后端，/api/search 三端点 markers 正确）。剩余：
> Phase 1（api.at 契约固化）仍欠；index 行缓存 JSON 迁移小步新立。
>
> **进度（2026-08-28 slice 2 完成）**：back/auto/links.at 单源落地——
> wikilink/block-ref/tag 三个正则扫描器与 extract_links/extract_tags 行级
> 编排退役 index.rs 正则；alias [[a|b]] 不匹配、空标题丢弃、中文标签
> 不支持等边界逐项对齐旧语义。后续 slice：search/tasks/query → srs。
>
> **进度（2026-08-28 slice 6 完成）**：index 行缓存 JSON 迁移（存储裁定
> 第二步落地，裁定项两步全销号）——index.rs 全量重写为内存索引
> （pages/blocks/links/tags 四行表 Vec + 扫描，`&mut self` 变更、RWLock
> 串行化等价旧互斥锁），持久化 `jade-garden-index.json`（serde 序列化 +
> tmp/rename 原子写；启动重建末尾 flush 一次，增量变更经 links.rs 壳逐笔
> flush）；rusqlite 依赖摘除（Cargo.toml），旧库文件自愈式弃用（缺失/
> 损坏 → 空表起步，重建即重写）。语义保形：COLLATE NOCASE≈ASCII 折叠、
> ORDER BY 显式复刻（backlinks source_page / outlinks target_page /
> graph path+source_page）、find_block 先 uuid 后 block_id 与 LIMIT 1 取
> 首语义、resolve 先 title 后 alias。**存量潜伏 bug 按原样保形**：uuid
> 稳定性查找在删除之后执行（SQLite 时代继承）恒空 → 块 uuid 每存必换；
> 消费面均走 block_id（块引用/闪卡复盘/滚动定位），uuid 仅信息性，DEBTS
> 022 行在册，修复属独立语义决策。门：cargo 37/37（34 既有全存活 +
> 新增 rename 全行种更新 / remove 全行种删除 / JSON flush-reload 往返
> 3 测试）+ jade e2e 23/23 + 运行时 JSON 文件实证（11 pages / 73 blocks /
> 11 links / 9 tags）。剩余：Phase 3（VM 内路由接管）起待启动。
>
- **前置（过渡期工具链依赖，2026-08-27 登记）**：a2r 转译须用含
  plan-019 发射器修复（r# 保留字转义等 8 组）的 auto.exe。该修复
  2026-08-27 13:46 才合入 auto-lang master（`45b005d01`）；主检出
  `target/debug/auto.exe` 构建于修复之前（产出缺 r# 转义的损坏 Rust）。
  过渡期统一使用隔离构建：
  `D:\autostack\auto-lang-wt\target\debug\auto.exe trans --path X.at rust`
  （worktree 钉在 `45b005d01`，仅含构建产物，无独有提交——主检出
  `cargo build -p auto` 成功重建后即可
  `git worktree remove D:\autostack\auto-lang-wt` 撤除）。
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
- SQLite 存储裁定项：**已裁定并两步全落地（2026-08-28 slice 5 + 6）**——
  JSON 文件存储方向，否决 rusqlite FFI；slice 5 退役 FTS5，slice 6 行缓存
  迁 `jade-garden-index.json`（rusqlite 依赖已摘除）。实测依据与落地路径
  见上方 slice 5/6 进度注记。
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
