# Plan 022：jade-garden VM（桌面）化——后端逻辑与 lib 层并入 Auto 双端库

---
supersedes_spec_components:
  - "jade-garden back/server 手写业务逻辑体（parser/links 提取/search 匹配/tasks/agenda/query/srs 数学）: 逻辑退役至 back/auto/*.at 双发射 *_gen 壳内直调（壳保留 axum/fs/chrono 装配——Phase 1-3 复审裁定：薄壳化为既定形态，字面『模块删除』由 Phase 5 全量退役承接）"
  - "jade-garden 索引存储 SQLite（rusqlite + FTS5 虚拟表）: 退役为内存行表 + jade-garden-index.json 持久化（存储裁定项销号，rusqlite 依赖摘除）"
  - "jade front lib/api.ts 手写 wire interface（24 个）: 退役为 back/auto/api.at 契约单源 a2ts 生成（api_gen.ts 部署 + re-export；fetch 层/LinksResponse 泛型信封/GraphSettings 视图模型留守）"
new_spec_components:
  - "back/auto/api.at 契约源 + gen.mjs tsOnly/front 部署通道 + tests/api-contract-routes.mjs 路由覆盖门（28/28）: 新增（Phase 1）"
  - "back/auto/{parser,links,tasks,query,agenda,srs,search}.at 单源双发射（a2ts 孪生 + a2r 壳内）+ 七套 parity fixtures 双侧同源断言: 新增（Phase 2）"
  - "VM 服务面：vm_server（host bridge jade.api + run_file）+ vm_dispatch（28 臂信封路由双壳单核）+ auto/server.at 入口 + jade_server.at 28 路由（442-c2 适配器，JADE_GARDEN_SERVER=vm 切换）: 新增（Phase 3）"
  - "auto-lang OpCode::VALID 真值表不变式（枚举判别集派生）+ match_route Path 参数百分号解码: 跨仓修复已合 auto-lang master（2bfd6475c / 5441dda28）"
touched_goals:
  - "022 目标1 逻辑单源: Phase 2 七模块 .at 单源 + api.at 契约单源 + 双发射金标对拍（达成，Phase 1-3 复审 2026-08-29）"
  - "022 目标3 网页版零回归: rust/VM 双后端 e2e 23/23（达成）"
  - "022 目标4 退役重复实现: 后端逻辑侧就位；blockParser.ts 前端镜像冻结未删（Phase 5 承接）"
  - "022 目标2 VM 桌面版: Phase 3 完成 VM 路由接管（网页版形态）；桌面形态待 Phase 4/5"
---

> 改号（2026-08-28）：原序号 021 与「编辑层 UI 再 Auto 化」计划（2026-08-26
> 立项先占、已终审归档且全域引用）冲突，本计划顺延为 **022**，内容零改动。
> 状态：**执行中（Phase 1-3 复审通过；Phase 4 五门全量绿并 fold
> master @ 2ce0d59，2026-08-30；Phase 5 待启动）**。决议来源：2026-08-27 会话方向裁定——
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

> **进度（2026-08-29 Phase 3 验收达成，VM e2e 23/23）**：架构与嵌入面
> 全部实证。架构：宿主 `back/server` 增加 auto-lang 库依赖（path 绝对路径
> D:/autostack/auto-lang）；`--vm` 模式（JADE_GARDEN_SERVER=vm，playwright
> config 透传）走 `vm_server.rs`——host bridge 单函数 `jade.api`（Plan
> 060 M3）→ 大栈线程 `run_file` 跑 `back/auto/server.at`（入口）+
> `jade_server.at`（28 路由 `use.rust axum` 链经 442-c2 适配器装机）→
> 自动起 AutoVM HTTP server。**16 个 handler 模块完成 impl 核抽取**（每
> 路由 `X_impl` 同步逻辑核，axum 壳变薄包装），`vm_dispatch.rs` 28 臂经
> 信封 `{method,path,query,body}` 调同一批 impl——双壳单核。
> **验收：rust 后端 e2e 23/23 + VM 后端 e2e 23/23 ×2 轮（前端零改动，
> 同一 binary 同一路由面）——Phase 3 验收标准（网页版前端零改动跑在
> VM 后端上）达成。**收口过程中挖出并修复**前端存量双读竞争**（rust
> 模式时序侥幸掩盖，VM 单 worker 放大暴露）：`Open`（新 tab 分支）与
> `Load`（EditorTab 挂载触发）各自 readWiki 同一文档，await 守卫都在
> await 前——VM 下两往返秒级乱序，迟到的磁盘 echo 无条件覆写 tab，
> 静默回滚用户编辑（11-properties 败因，三层调试插桩实证：commit 落库
> ✓ → entries 被磁盘态重建 → Save 发出 draft）。修复三层：①
> tabs_store.at 全部磁盘读回写在 await 后复查 `loaded == false`（迟到者
> 弃权，先到者拥有 tab）；② Save 响应采纳改 `adoptSaveResult` 引用 CAS
> （往返中用户已 commit 则保留现场只补 updated_at，防 stale echo 覆写
> ——同类竞态的保存侧）；③ `commitFrontmatter` 补 `tab.dirty = true`
> （frontmatter-only 编辑此前不置 dirty，saveTabIfDirty 门控下只有搭
> body 脏窗才落盘——独立存量缺陷顺带修复）。ext/组件/store 经 auto
> build 再生部署（gen 工程自身 vue-tsc 的 @/lib/api 报错为已知 stub
> 场景不影响产物）。**跨仓修复 ×2（auto-lang worktree，均 fold+push
> master）**：① `OpCode::VALID` 真值表重生（2bfd6475c）；② match_route
> Path 参数百分号解码对齐 axum 语义（5441dda28，空格/CJK 标题 11 败
> 根因）。**.at 配方纪律（探针实得）**：`routes` 保留字；`use.rust`
> 点号形式且仅导入模块解析（入口只放 dep+use+main）；extractor 值是
> Plan 446 doc 句柄——`json.from_value`（Plan 340）转文本后进信封；
> `json.get` 文本语义 → statusText 字面量等值分支设 response_status；
> 响应对象 status 缺省 0 必须恒设。**在册（auto-lang 侧后续）**：
> wildcard `{*path}` 的 Path extractor 交付空值 → wiki/whiteboard 用
> 显式深度 1..3 路由替代（e2e 平铺 fixture 全覆盖，嵌套超 3 段不
> 支持）；multipart（assets/import）与二进制（export zip）不能过 VM
> 信封 → dispatch 返回 400 登记偏差（e2e 不测）。
>
- Plan 442-c2 模式推广：VM 注册全部 `/api/*` 路由（Phase 2 的 a2r 产物
  + FFI 壳），网页版前端直连 VM 后端（loopback HTTP 或进程内派发，
  442 已两者验证）。
- 验收：**网页版前端零改动**跑在 VM 后端上，jade e2e 全量复用通过。

### Phase 4 — UI 双渲染（iced）

> **进度（2026-08-29 slice 1 完成：成熟度确认 + ext 清单裁定 + 渲染探针）**：
> 产物落 `jade-garden/front/desktop/README.md`（worktree plan-022）。要点：
> **① ui_gen iced 后端成熟度确认达成**（Phase 4 声明依赖销号）——iced 渲染
> 器 + VM 渲染模式（`auto run -r vm`）解释 widget DSL（Tailwind class 经
> Style::parse 含任意值类）、store 在 VM 内运行（442 store_facade）、web 全
> 局桥（442 webcompat localStorage/encodeURIComponent）、markdown 块编辑
> （446 autodown-editor，消费本仓 engine a2r 产物）、桌面壳（462-472 虚拟
> 窗口/dock/MCP 实机验收）、api 通道（340 `#[api]` 属性 → api_over_http
> 改写）；ui:: 测试 565/565。**② 实机探针**（tmp/iced-probe）：`use store:`
> + for/if + Tailwind 全正确渲染，指针事件 msg→handler→store→重渲染管线
> 打通（实测窗口态 store-ready/ready → picked:a/a）。**③ ext 层 37 文件
> 机扫清单 + 逐项裁定**：regex×37 → 纯逻辑下沉 .at（engine/Phase 2 先例）；
> localStorage×3 零改动（VM 已桥）；clipboard×1 → VM 原生 arboard（411
> 先例）；confirm×4 → iced 模态（迁移期默认确认+登记偏差）；dir-picker×1
> → 宿主能力需求（rfd，Phase 5 收口，widget 自带降级）；dom-walk×11 →
> hover=widget bounds+popover / 滚动=scroll_to 操作+msg 直派（CustomEvent
> 总线退役）/ 主题=AUTO_UI_THEME env；timers×2 → 大半失去必要性；ext 直接
> fetch=0（API 全走 `use back.api:` DSL 通道）。**④ cytoscape 裁定**：iced
> v1=列表/树状图谱视图（数据面全量可达：/api/graph+backlinks/outlines 数
> 据、节点可点跳转），力导向画布不在 Phase 4 交付；webview 子区（Tauri
> 路线）与自研 canvas 登记为 Phase 5 后备选。**⑤ 已识别缺口（登记）**：
> jade 契约 `// ROUTE:` 注释与 340 所需 `#[api]` 属性并存待增补（slice 2）；
> jade widget `use {…from "….ts"}` ext 通道 VM 不可达——纯逻辑下沉 .at、
> 平台能力走 VM 原生/宿主桥（slice 3 起）。**⑥ 视觉基线策略**：Tailwind
> class 即视觉契约，双端以「结构+主题+可用」对拍，不做跨引擎像素级对齐。
> > **slice 排布见 desktop/README §5。**
> >
> > **进度（2026-08-29 slice 2 完成：契约 #[api] fn 层 + 双登记门检）**：
> > jade 契约补齐 VM 侧调用元数据——25 个 `#[api(method,path)]` stub fn
> > （28 路由 − assets/upload、export/import markdown 三项 multipart/二
> > 进制豁免，与 Phase 3 D4 登记偏差对齐；auto-musk 同款声明形态，axum
> > 风格 {title}/{*path} 路径）；BacklinkList/OutlinkList 信封类型具体化
> > （原注释级 wire 形状升为类型）。gen.mjs K1 后修：a2ts 会把 stub 体发
> > 射为 TS 函数（实测 25 个 `export function`），顶层块剥离——TS 客户端
> > 面仍归手写 fetch 层独占（Phase 1 设计不变）。门检扩展：ROUTE ↔
> > #[api] 双登记对拍 + VM_ENVELOPE_EXEMPT 显式豁免清单（豁免路由带 fn
> > 即败），28/28 路由 + 25 fn 一致性绿。再生验证：七 parity 模块
> > *_gen.{ts,rs} 逐字节不变（发射器确定性佐证）；vue-tsc + vite build
> > 绿。slice 3（桌面工程 + 核心流实机探针，merged/split 二路 + {*path}
> > 通配在 340 改写器的支持面确认）起待启动。
> >
> > **进度（2026-08-29 slice 3 完成：核心流实机通 + 桌面工程骨架 + 跨仓
> > 修复）**：**auto-lang 侧修复 ×1（TDD，已折并推送 auto-lang master
> > b385e3ab5）**——340 改写器 emit_api_http_call 补 ①`{*param}` 通配
> > splice（此前 `{*path}` 字面透传必 404、参数被静默丢弃）②GET/DELETE
> > query 参数发射（此前非路径参数收集进 body 桶后丢弃，`?q=&limit=` 类
> > 端点自 VM 前台不可达）③路径参数 percent 编码（单段 auto.url.encode
> > 全量，通配新增 auto.url.encode_path 原生件 id 2013 保留 `/` 分隔符——
> > 浏览器 fetch 对等，服务端逐段解码可复原）。3 新测先红后绿，musk
> > brace 回归 + 目录一致性测试全绿。**核心流实机通（AutoUI MCP 驱动，
> > split 与 merged 双模式同断言全过）**：open-ws → root 回填；files →
> > GET query 文件列表；read → 带空格标题 `Hello World.ad` 通配回环全文；
> > save → 回显 + 磁盘落盘验证。纯 merged（无 AUTO_BACKEND）契约 stub
> > 执行（None，符合设计）。**桌面骨架落盘**：jade-garden/front/desktop/
> > （pac.at + 核心流 app.at + gen.mjs 生成的契约副本 api.at，门检加副本
> > 漂移对拍）。api.at POST 体约定改字段级标量（单结构体参数会被改写器
> > 包成 `{"req":..}` 与 axum Json<Struct> 错位；musk 同款）。**登记项**：
> > 空 map 字面量经 json.from_value 序列化为 null（编辑器写回路径 slice 4
> > 处理）；物理合成点击下探针进程偶发静默 exit(1)（MCP 驱动为稳定通道，
> > 非产品代码路径）。slice 4（编辑器核心流：tabs_store/editor_tab 迁移 +
> > map 保真）起待启动。
> >
> > **进度（2026-08-29 slice 4+5 完成：Phase 4 核心流验收 6/6 达成）**：
> > slice 4（编辑器+闪卡）与 slice 5（反链/图谱/搜索面板）连续落地，提交
> > b80c7cf / 910440f（worktree plan-022）。**Phase 4 验收口径全达**：
> > 打开工作区 ✓ / 编辑 ✓ / 保存 ✓ / 反链 ✓（backlinks/outlinks 计数+
> > 点击跳转）/ 图谱 ✓（列表形态裁定落地：8 边、节点可点）/ 闪卡 ✓
> > （due→评分→排程落盘）；双端视觉基线：baseline/iced-slice5-structure.txt
> > （AutoUI snapshot 结构树，可 diff）+ web 侧 e2e 23/23，像素对拍通道
> > 登记工具链债（Phase 5 收口）。**跨仓修复 ×2 已折推送 auto-lang
> > master**：①340 改写器（{*path} 通配/GET query/percent 编码 +
> > encode_path 原生件 2013）；②属性 `.length` VM 恒 0（typed 懒表别名
> > auto.list|str.length + untyped GET_FIELD length 回退），plan046/340
> > TDD 全绿。**登记（auto-lang 侧备案）**：`.type` 撞 DSL 元属性；
> > NestedObject 缺席字段读 0 哨兵（非 null）致存在性分支不可靠——app 以
> > search_pages + handler 行模型规范化规避。**Phase 4 收口待办**：主题/
> > 设置面板（低优）与 confirm 模态/dir-picker 宿主能力（登记项）随
> > Phase 5；下一步按计划进 Phase 5（桌面壳裁定 + 全量退役）前，先跑
> > Phase 4 阶段域复核（全量门 + e2e 双跑）。
> >
> > **进度（2026-08-29 slice 4 完成：编辑器与闪卡核心流实机通）**：app.at
> > 升级为三栏面板（文件树 | 编辑器 | 卡片列）。**编辑器 6/6 断言**（MCP
> > type_text 驱动）：文件列表点开 → read_wiki 载入 → textarea `value:`
> > 绑定 + oninput 置脏 → save → 脏标清除 + 磁盘新正文 + **frontmatter
> > map 保真**（title 原样回写——slice 3 的 null 登记项实证闭环：非空
> > map 往返无损，空 map `{}` 字面量 null 边缘缩窄登记）。骨架期为单活动
> > 文档 + 打开历史列表，tabs_store 全量状态机（多 tab/脏守卫/
> > adoptSaveResult）随 29-widget 迁移归位。**闪卡 4/4 断言**：due 列表
> > 呈现 → good 评分（review_card 循环项多参数 onclick）→ due 清空 +
> > 排程属性行落盘（card-next-schedule:: 次日）。Phase 4 验收核心流盘点：
> > 打开工作区 ✓ / 编辑 ✓ / 保存 ✓ / 闪卡 ✓；反链、图谱（列表形态）、
> > 双端视觉基线归 slice 5。
> >
> > **进度（2026-08-29 slice 5 完成：反链/图谱/搜索面板）**：app.at 四区
> > 面板。10/10 断言：title 剥离、反链 3/出链 2 计数与点击跳转、图谱
> > 8 边节点可点、search_pages 命中渲染为页按钮。**跨仓修复 ×2（已折
> > 推送 auto-lang master）**：①340 改写器补 {*path} 通配 splice / GET
> > query 发射 / percent 编码（新原生件 auto.url.encode_path 2013 保留
> > `/`）；②属性 `.length` VM 恒 0——typed 接收者补懒表别名
> > auto.list|str.length（NATIVE_ID_ENTRIES + bigvm 返回表），untyped 接
> > 收者 GET_FIELD 落堆列表失配补运行时 length 回退；plan046/340 TDD 先
> > 红后绿。**登记（auto-lang 侧备案，app 已规避）**：`.type` 撞 DSL 元
> > 属性；NestedObject 缺席字段读 0 哨兵而非 null。结构视觉基线
> > baseline/iced-slice5-structure.txt（snapshot 树可 diff）；像素截图通
> > 道环境不稳登记工具链债。
> >
> > **进度（2026-08-30 Phase 4 收口：阶段域复核五门全量绿 + fold）**：
> > worktree 全量门重跑全绿——八套 node 门（parity 6 / links 9 / query 21
> > / agenda 15+2 / srs 全家 / search 15 / tasks 2 / 契约 28/28 + desktop
> > 副本漂移对拍）+ back/server cargo **37/37** + front vue-tsc/vite 0 错
> > + **rust 后端 e2e 23/23** + **VM 后端 e2e 23/23**。fold：plan-022 →
> > master @ **2ce0d59**，worktree 已回同步。Phase 4 验收（核心流 iced 下
> > 可用 + 双端视觉基线）达成；主题/设置面板与 confirm 模态、dir-picker
> > 宿主能力三项登记项随 Phase 5 收口。**下一步：Phase 5**（桌面壳裁定
> > Tauri vs 纯 VM 窗口、back/server 手写层全量退役、blockParser.ts 删除、
> > 文档收口）→ 全计划终审。
> >
- 29 个 widget `.at` 接 ui_gen iced 发射；ext 层 DOM 依赖清单化并逐项
  裁定：clipboard / confirm / showDirectoryPicker / DOM walk（hover 定位、
  scrollToBlock）→ VM 能力或 iced 等价物。
  **[✅ 已完成（清单化+裁定+成熟度确认+探针，2026-08-29 slice 1）；widget
  批量迁移本身归 slice 3-5 逐批验收]**
- 图谱视图（cytoscape）裁定项：iced 下换渲染后端或保留 webview 子区。
  **[✅ 已裁定（iced v1=列表/树状图谱视图，画布后置；2026-08-29 slice 1）]**
- 验收：核心流（打开工作区/编辑/保存/反链/图谱/闪卡）iced 下可用；
  双端视觉基线建立。

### Phase 5 — 桌面壳与手写层退役

> **复审补录（2026-08-29，Phase 1-3 复审退役面盘点）**：Phase 5 全量退役
> 的手写清单 = 薄壳层（16 模块 X_impl 双壳装配）+ 以下 Phase 2 清单外
> 遗留逻辑体（复审新发现，见复审记录 D1/D2）：① unlinked.rs
> find_unlinked_references 的 regex 扫描（regex crate 仅存消费方）；
> ② index.rs 行扫描/解析排序（resolve_page_path/backlinks 过滤排序/
> graph 边装配）与 links.rs graph degree 装配；③ srs.rs OfMatrix EDN
> load/save（壳内最厚件，观察项）。

- 桌面壳：Tauri（`TAURI_ENV` 钩子激活）或纯 VM 窗口（auto-cosmic）二选一，
  Phase 4 结束按 iced 成熟度裁定。
- `back/server` 手写 Rust 全量退役；`front/src/lib/blockParser.ts` 删除
  （消费引擎 a2ts 产物）；三镜像归一完成（020 Phase 3 该项随之销号）。
- 验收：桌面版端到端（打开工作区/编辑/保存/搜索/闪卡/导入导出）；
  网页版 e2e 无回归；DEBTS/README/ARCHITECTURE 文档收口。

## 复审记录（Phase 1-3 阶段域，2026-08-29）

> 复审人：ZCode 会话（/auto-plan:review）。域：Phase 1-3（Phase 4/5 未
> 启动，状态保持执行中——本记录为阶段域验收，全计划 `reviewed` 路由留待
> Phase 4/5 收口时终审）。全部验证本会话在 worktree 重跑，未采信历史勾选。

**五门全量（worktree 重跑）**：back/server cargo test **37/37**；八套
node parity/契约门全绿（parser 6 / links 9 / tasks / query 21 / agenda
15+2 / srs 7+6+2+5+2+4+3 / search 15 / api-contract-routes **28/28**）；
front `vue-tsc` **0 错**；rust 后端 e2e **23/23**；VM 后端 e2e
（JADE_GARDEN_SERVER=vm）**23/23**。

**Phase 1 验收（3/3 pass）**：
- 契约覆盖全部现役路由 → api-contract-routes 28/28（main.rs 路由表 ↔
  api.at ROUTE 标记机器对拍）✓
- TS 客户端改由契约产出后 e2e 全绿 → api.ts 全量 re-export api_gen.ts，
  仅存 2 个本地 interface（LinksResponse 泛型信封 / GraphSettings 视图
  模型，均为设计内留守）+ rust e2e 23/23 ✓
- 契约变更流程写进本文档 → api.at:16 头注五步流程 + Phase 1 注记 ✓

**Phase 2 验收（2/3 pass + 1 项裁定偏离）**：
- 双端金标测试绿 → 七套 parity fixtures 双侧同源断言全绿 ✓
- jade e2e 无回归 → 23/23 ✓；存储裁定项两步销号（FTS5 退役 + JSON
  行缓存，rusqlite 摘除）；blockParser.ts 冻结纪律守住（本计划零触碰，
  末次改动 d8ce121 先于立项）✓
- 「对应手写 Rust 模块删除」→ **裁定偏离（pass with rationale）**：实际
  形态为薄壳化（逻辑全量下沉 *_gen，壳保留装配，pub API 保形）——slice 1
  起即在进度注记中明示，且 Phase 5 明文承接全量退役；字面「删除」属起草
  期过严表述。语义意图（逻辑单源）已达成。

**Phase 3 验收（1/1 pass）**：
- 网页版前端零改动跑在 VM 后端上，e2e 全量复用 → VM e2e 23/23；front
  diff 复核 = 双读竞争修复（模式无关 bug fix，双端受益）+ playwright
  config 透传（测试基建），零 VM 专属应用代码 ✓

**遗漏/延后/绕道猎查（5 项，均记录非阻断）**：
- D1 unlinked.rs find_unlinked_references 仍 regex 手写——不在 Phase 2
  迁移清单（清单枚举 parser/links/search/tasks/agenda/query/srs），
  非漏项；已补录 Phase 5 退役面清单（regex crate 仅存消费方）
- D2 index.rs 行扫描/解析排序 + links.rs graph degree 装配仍手写——
  同上补录 Phase 5 清单
- D3 wildcard `{*path}` extractor 交付空值 → 显式深度 1..3 绕行（e2e
  fixture 全覆盖；正修在 auto-lang 侧在册）
- D4 multipart（assets/import）与二进制（export zip）不能过 VM 信封 →
  dispatch 400 登记偏差（e2e 不测）
- D5 srs.rs 壳 621 行偏厚（OfMatrix EDN load/save + Card 装配）——观察
  项，Phase 5 处置
- 新产物零 TODO/FIXME；调试插桩与临时 spec 全数清除（复检 0 残留）

**结论**：Phase 1-3 验收标准全数达成（1 项起草期表述偏离经裁定通过），
无未批准延后，无隐瞒绕道。spec-impact 元数据已填（frontmatter）。
后续：Phase 4（iced 双渲染）→ Phase 5（桌面壳 + 全量退役）→ 全计划
终审 `/auto-plan:review` → `/auto-plan:merge`。

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
