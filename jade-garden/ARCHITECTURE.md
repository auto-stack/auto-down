# Jade Garden — Architecture (plan 022 state)

> 收口于 2026-08-30（plan 022 Phase 5）。本文描述双形态架构与单源管线；
> 过程裁定与 slice 级细节在 `front/desktop/README.md`，债务台账在
> `DEBTS.md`，计划全文在 `docs/plans/022-vm-desktop-auto-libs.md`。

## 1. 总览

```
                     ┌──────────────────────────── 单源层 ───────────────────────────┐
                     │ back/auto/*.at          front/auto/src/front/*.at             │
                     │ api.at(契约+#[api])     29 widgets + 9 stores + ext helpers   │
                     │ parser/links/search/…   tabs_store.at / blocks_store.at / …   │
                     └──────────────┬────────────────────────────┬──────────────────┘
                                    │ gen.mjs（a2ts + a2r）       │ a2ts（Vue SFC + ext）
                                    ▼                            ▼
                     ┌──────────────────────────┐   ┌──────────────────────────────┐
   web 形态           │ server/src/*_gen.rs      │   │ gen/front/vue（Vue 工程）     │
   （浏览器）  ───────│ axum 薄壳（*_impl+路由）  │   │  → 部署 front/src（facade）   │
                     └────────────┬─────────────┘   └──────────────────────────────┘
                                  │ HTTP /api/*（JSON；multipart/二进制仅此通道）
   桌面形态            ┌──────────┴─────────────┐            ┌────────────────────────┐
   （VM iced）  ──────│ front/desktop（VM 前台）│───loopback─▶ 同一 /api/* 面          │
                      │ #[api]→340 改写/原生直连│            └────────────────────────┘
                      └────────────────────────┘
```

- **web 形态**：29 个 widget `.at` 经 a2ts 生成 Vue SFC；商店逻辑在 `.at`
  store + ext 视图装配层；后端为 axum 薄壳（或 `JADE_GARDEN_SERVER=vm` 的
  VM 内服务器，Phase 3 起 e2e 双跑等价）。
- **桌面形态**：同一批 widget DSL 由 AutoVM 解释、iced 原生渲染
  （`auto run -r vm`）；前台以 `use back.api:` 契约调用后端
  （split=HTTP 改写 / merged=宿主派发）。

## 2. 单源管线（gen.mjs）

`back/auto/gen.mjs` 对每个 `.at` 做双发射 + 部署：

| 产物 | 去向 | 消费方 |
| --- | --- | --- |
| `gen-ts/<name>_gen.ts` | TS twin | `tests/*-parity.mjs`（node 侧对拍） |
| `server/src/<name>_gen.rs` | a2r | axum 壳（`mod <name>_gen;`） |
| `front/src/lib/api_gen.ts` | api.at 类型面 | 手写 fetch 层 re-export（K1 剥 fn） |
| `front/src/lib/parser_gen.ts` | parser.at 分段（PBlock 带行号） | save 路径锚点注入 |
| `front/desktop/src/back/api.at` | 契约原文 | 桌面 `use back.api:` 解析（门检漂移对拍） |

已知发射器边界与配方（登记于 DEBTS/计划）：`.length` 算术须 `.to(int)`；
结构体字面量须显式 `StructName(args)`；Vec 参数按值传递；`{@*path}` 通配
与 GET query 已在 340 改写器支持（plan-022 跨仓修复）。

## 3. 契约（api.at）

- 每路由：类型 + `// ROUTE:` 注释 + `#[api(method,path)]` stub fn
  （25/28；assets-upload、export/import markdown 三路由 multipart/二进制
  不入 VM 信封，豁免显式登记）。
- 门检 `tests/api-contract-routes.mjs`：rust 路由表 ↔ ROUTE 注释 ↔
  `#[api]` fn ↔ desktop 副本，四处对拍。
- 变更流程：后端 DTO → 契约镜像（type+ROUTE+fn）→ `node gen.mjs` →
  api.ts → `pnpm build`（vue-tsc 卡漂移）→ 门检卡漏登记。

## 4. 桌面形态要点（plan-022 Phase 4/5）

- **运行**：`auto run -r vm`（AutoVM 解释 widget DSL → iced 原生窗口）；
  后端经 `AUTO_BACKEND`（split）或宿主派发（merged）。
- ** store 消费**：`use store:`（VM 原生形态，442 corpus）；
  `use back.api:` 走契约（desktop/src/back/api.at 为 gen 部署副本）。
- **导入导出（D4 裁定：原生直连）**：`http.request` →
  `multipart_file`/`body_to_file` 原生（2226）——字节不过 VM 字符串
  管线；不经 `#[api]` JSON 改写。
- **已裁定留壳**：OfMatrix EDN parse/save（float 解析/格式化为 a2r 边界）。
- **登记待办**：目录/文件选择器宿主能力；CALL_SPEC 返回列表 RC 接线；
  `.type` 元属性撞名；confirm 模态语义。

## 5. 镜像归一（三镜像销号，2026-08-30）

markdown 解析历史三镜像：engine `markdown_parser.at`（单源）/ 前端手写
`blockParser.ts` / rust `parser.rs`。现状：

- 后端：`parser_gen`（Phase 2 slice 1）；
- 前端读路径：`blocks_store_ext` → `@autodown/engine/parser`
  （`parse_blocks`）；
- 前端 save 路径：`ensureBlockAnchors` → `parser_gen.parseBody`
  （PBlock 自带行号，锚点行拼接）；
- `blockParser.ts` 已删除（020 Phase 3 裁定项随之销号）。

## 6. 验收基线（2026-08-30）

| 门 | 结果 |
| --- | --- |
| 九套 node parity 门 + 契约门（28/28 + 副本漂移） | 绿 |
| back/server cargo（含双侧 parity fixtures） | 40/40 |
| front vue-tsc + vite build | 0 错 |
| rust 后端 e2e | 23/23 |
| VM 后端 e2e | 23/23 |
| 桌面六流（打开/编辑/保存/反链/图谱/闪卡 + 导入导出） | 驱动断言全过 |

结构性视觉基线：`front/desktop/baseline/iced-slice5-structure.txt`；
web 侧基线：e2e 08-screenshots specs。
