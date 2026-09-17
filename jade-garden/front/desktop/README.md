# jade-garden front/desktop — Phase 4 iced 双渲染（plan-022）

Phase 4 slice 1 的落盘产物：**ui_gen iced 后端成熟度确认**、**ext 层 DOM 依赖
清单化与逐项裁定**、**图谱（cytoscape）裁定**、**VM-iced 渲染探针实证**。
后续 slice 在本目录增量推进（桌面 app 工程）。

## 1. ui_gen iced 后端成熟度确认（Phase 4 声明依赖）

结论：**成熟度满足 Phase 4 启动条件**。证据（2026-08-29 实测，auto-lang
master @ c83435764，`target/debug/auto.exe` 当日构建）：

| 能力 | 证据 |
| --- | --- |
| iced 渲染器 | `auto-lang/src/ui/iced/`（renderer / virtual_window / popover / layout_collector）；ui:: 测试 565/565 绿（Plan 472 T5 提交记录） |
| widget DSL → iced | VM 渲染模式（`auto run -r vm`）解释 view 块 → View 树 → iced；Tailwind class 经 `Style::parse` 映射（含任意值 `text-[11px]`、`text-amber-500`、`rounded`、`border`、间距类） |
| store 在 VM 内运行 | Plan 442 `test/ui/plan442_store_facade` corpus：`use store:` 形态 + msg 派发 + 视图读，全绿 |
| web 全局桥 | Plan 442 `plan442_webcompat`：`localStorage`（Plan 401 session KV）/ `encodeURIComponent` 已桥接，同源双端 |
| markdown 渲染/编辑 | Plan 446：autodown_editor（cosmic-text 块编辑）+ autodown-core 单源渲染（本仓 engine parser 的 a2r 产物） |
| 桌面壳体系 | Plan 462-472：虚拟窗口 / dock / 任务栏 / workspace 分区 / 热键，MCP 实机验收通过 |
| api 调用通道 | Plan 340：契约 fn 带 `#[api(method,path)]` 属性时，VM 渲染模式下调用自动改写为 HTTP（api_over_http）；Plan 060 M3 host 分派同享该元数据 |
| 前后台进程形态 | `auto run -r vm` 实测输出 "vm+vm merged mode: backend runs in-process"；split 模式走 HTTP（`--no-merge`） |

**探针实证**（本仓 `tmp/iced-probe/`，`auto run -r vm` 实机窗口）：
`use store:` store Init、`for` 循环按钮列表、`if` 条件视图、Tailwind class
（主题深色底 / amber 强调 / 11px 状态行）全部正确渲染；指针事件经
msg → handler → `store.SetActive` → 视图重渲染管线实测打通（窗口态由
"store-ready/ready" 变为 "picked:a/a"）。

**已识别缺口**（不阻断，登记处置）：
- jade 契约 `back/auto/api.at` 用 `// ROUTE:` 注释做门检（Phase 1 设计），
  尚无 `#[api]` 属性——VM 侧 api_over_http 改写需要它。处置：契约 fn
  增补 `#[api]` 属性（与 ROUTE 注释并存，api-contract-routes 门检不受影响）。
- jade widget 的 `use { composable/fn: … from "….ts" }` ext 通道 VM 不可达
  （TS 不入 VM）。处置：见下节逐项裁定——纯逻辑下沉 `.at`，平台能力走
  VM 原生/宿主桥。

## 2. ext 层 DOM 依赖清单（37 个 *_ext.ts，2026-08-29 机扫）

扫描对象：`front/auto/src/front/utils/*_ext.ts`（29 widget ext + 8 store
ext）。每文件命中类别（脚本判定，同文件可多类别）：

| 类别 | 文件数 | 文件 |
| --- | --- | --- |
| regex（纯字符串辅助） | 37 | 全部 |
| dom-walk/bindings | 11 | app_shell, command_palette, editor_tab, file_tree_node, graph_view, main_area, outline_panel, quick_switcher, theme_popover, workspace_opener, theme_store(classList) |
| confirm 对话框 | 4 | editor_tab, file_tree_node, outgoing_links_panel, tabs_store |
| localStorage | 3 | graph_store, recentFiles_store, theme_store |
| clipboard | 1 | editor_tab（copyBlockLink/copyWikiLink → `navigator.clipboard.writeText`） |
| 目录选择器 | 1 | workspace_opener（`showDirectoryPicker`，带能力探测与降级） |
| timers | 2 | editor_tab（hover 300ms 延迟）, search_panel（150ms 后滚动） |
| matchMedia | 1 | theme_store（`prefers-color-scheme` 初值） |
| 直接 fetch | 0 | —（API 流量全部走 store 的 `use back.api:` 通道） |

### 逐项裁定

| 类别 | 裁定 | 依据 |
| --- | --- | --- |
| regex | 纯逻辑下沉 `.at`（手写扫描），双发射单源；**不引入 regex 依赖** | engine 四件套 + Phase 2 七模块完整先例；`unlinked.rs` 是后端侧同款在册项（Phase 5） |
| `use back.api:` | 保持 DSL 通道；契约增补 `#[api]` 属性 → VM 侧 Plan 340 改写（merged 模式进程内 / split 模式 loopback HTTP） | 340 corpus `#[api(method="GET", path=…)]` 形态；Phase 3 VM 服务器已实证同契约 28 路由 |
| localStorage | **零改动**：VM 已桥（Plan 401 session KV，442 webcompat 实证） | graph_store/recentFiles_store/theme_store 原样 |
| clipboard | VM 原生能力：`auto_lang::ui::clipboard`（arboard，ui-iced feature 内建，411 预览卡复制按钮已用） | 无需新桥 |
| confirm | iced 模态对话框（446 popover/模态机制）；迁移期语义保形：默认确认 + 登记偏差 | confirm 是阻塞式浏览器 API，iced 无直接等价；4 处均为删除/建页确认 |
| dir-picker | 宿主能力需求：host 桥暴露目录选择（桌面侧 rfd 一类）；到达前 widget 保留手动输入路径（workspace_opener 已带降级分支） | 桌面壳 Phase 5 一并收口；不阻断核心流 |
| dom-walk: hover 定位 | editor_tab 的 `getBoundingClientRect`+timer → iced widget bounds + 鼠标事件（layout_collector 已有）；hover 弹层用 popover 机制 | 机制成熟（446 c1） |
| dom-walk: 滚动定位 | scrollToBlock/scrollToHeading → iced `scroll_to` 操作；`CustomEvent` 总线 → VM msg 直派（更直接，无需延迟 hack） | 464 已用 operation::focus 同类机制 |
| dom-walk: 主题 classList | `document.documentElement.classList` → `AUTO_UI_THEME` env（渲染器已消费）+ VM 主题态 | 渲染器已有主题链路 |
| timers | hover/滚动延迟在 iced 下大半失去必要性（无 DOM 传播时序）；确需延迟用 VM tick 原语（DynamicComponent tick_interval 已有） | — |
| matchMedia | 桌面形态无系统主题跟随需求 → 登记偏差：初值恒 dark（或读 AUTO_UI_THEME），不阻塞 | — |

### 2.1 复扫与注册表建账（PLAN-064 T-01，2026-09-14）

- **机扫复跑**：37 文件与基线数量一致（29 widget ext + 8 store ext），
  文件级漂移为零；内容级漂移两笔，均 P022 Phase 5 已收口项：
  ① blocks_store_ext 读路径改接 engine parser 单源（blockParser.ts 已
  删除，DEBTS 020 已清偿行）；② tabs_store_ext 的 ensureBlockAnchors
  改接 parser_gen（`front/src/lib/parser_gen.ts`，gen.mjs 部署副本）。
- **逐导出 fn 三分类注册表落盘**：`desktop/ext-registry.json`
  （302 导出：sink 245 / bridge 36 / deviation 21；schema 与三分类语义
  见该文件 `schema` 字段）。sink 含 web-codegen shim（图标/组件/facade
  再导出——widget .at 化即原生语法取代，无独立迁移动作）。
- **门检**：`desktop/scripts/ext-registry-gate.mjs`（T-02）双表对拍：
  导出面 ↔ 注册表逐 (file, fn) 精确匹配（未登记=红；死账=红）；
  store `use back.api:` 名单 ⊆ 对应 `<stem>_ext.ts` 导出面（sed 契约）；
  .at 源 `use { … from "…_ext.ts" }` 引用必须已登记。

## 3. 图谱视图（cytoscape）裁定

**裁定：iced 形态 v1 = 列表/树状图谱视图（数据面全量可达），力导向画布
不在 Phase 4 交付。**

- 依据：cytoscape 是 canvas 力导向布局库，iced 无等价物；补齐需自研
  canvas 渲染管线（超出本计划范围）。而图谱的**数据与导航价值**（节点/
  边/度数/点击跳转）经 `GET /api/graph` + backlinks/outlinks 数据即可
  以列表形态交付。
- 备选路线登记（Phase 5 后再议，非本计划内）：
  1. 桌面壳若走 Tauri 路线 → 图谱页保留 webview 子区（零改动复用）；
  2. 纯 VM 窗口路线 → 评估 462-472 虚拟窗口内嵌 webview 或自研简化
     力导向（iced canvas widget）。
- Phase 4 验收口径：「图谱」核心流在 iced 下 = 图谱数据页可打开、节点
  可见可点（跳转对应 wiki 页），不做视觉力导向对拍。

## 4. 双端视觉基线

- 基线策略：**Tailwind class 即视觉契约**。VM 侧 `Style::parse` 已映射
  常用类（布局/间距/字阶/边框/圆角/主题色）；widget 源不改 class。
  双端截图对拍按核心流逐 widget 建立（后续 slice）。
- 已知差异（登记）：任意值类（`text-[11px]` 等）已支持；栅格级像素级
  对齐不做（跨渲染引擎不现实），以「结构一致 + 主题一致 + 可用」为准。

## 5. slice 排布（Phase 4 剩余）

1. ✅ slice 1（2026-08-29）：成熟度确认 + 清单 + 裁定 + 渲染探针。
2. ✅ slice 2（2026-08-29）：契约 `#[api]` fn 层落地——25 个 stub fn
   （28 路由 − 3 个 multipart/二进制豁免，对齐 Phase 3 D4）+ BacklinkList/
   OutlinkList 信封类型具体化；gen.mjs K1 后修剥离 TS 发射中的 fn 块
   （实测 a2ts 发射 25 个 `export function` 全部命中剥离）；门检扩展双
   登记对拍（ROUTE ↔ #[api]，豁免显式清单）28/28 + 25 fn 绿；再生后七
   个 parity 模块逐字节不变（发射器确定性佐证）；vue-tsc + vite build 绿。
   追加（slice 3 中发现）：POST 体约定改为字段级标量参数（单结构体参数
   会被 340 改写器包成 `{"req": {...}}` 与 axum `Json<Struct>` 平铺错位；
   auto-musk 同款惯例）。
3. ✅ slice 3（2026-08-29）：核心流实机通 + 桌面工程骨架（本目录）。
   - **auto-lang 侧修复 ×1（跨仓，TDD，已折 auto-lang master @ b385e3ab5）**：
     340 改写器 `emit_api_http_call` 补 ①`{*param}` 通配 splice（此前字面
     `{*path}` 透传 404、参数静默丢弃）②GET/DELETE query 参数发射（此前
     非路径参数收集进 body 桶后丢弃）③路径参数 percent 编码（单段
     auto.url.encode 全量 / 通配新增 `auto.url.encode_path` 保留 `/`——
     浏览器 fetch 对等行为，服务端逐段解码复原）。3 新测先红后绿，
     musk brace 回归 + 目录一致性测试全绿。
   - **核心流实机通（AutoUI MCP 驱动，四调用全断言）**：open-ws（POST 体
     {root}）→ root 回填 ✓；files（GET query ?path=&recursive=）→ 6 文件 ✓；
     read（GET /api/wiki/Hello%20World.ad——带空格标题通配回环）→ 全文
     markdown ✓；save（POST 体 {frontmatter, body}）→ 回显 + **磁盘落盘
     验证** ✓。split（AUTO_VM_MERGE=0 + AUTO_BACKEND）与 merged（宿主派发
     消费 AUTO_BACKEND）双模式同通；纯 merged 无后端地址时契约 stub 执行
     （None，符合设计）。驱动脚本 tmp/core-probe/probe_driver.mjs。
   - **骨架落盘**：本目录 pac.at + src/front/app.at（核心流按钮面板，slice 4
     起被真 UI 替换）+ src/back/api.at（gen.mjs 生成的契约副本，门检有漂移
     对拍）。
   - **登记项**：① 空 map 字面量经 json.from_value 序列化为 `null`（探针
     frontmatter 变 `---\nnull\n---`）——编辑器写回路径需 map 保真，slice 4
     处理（提 auto-lang 侧确认 from_value 对空 map 的语义）；② 物理合成
     点击下探针进程偶发静默 exit(1)（无栈、无日志），AutoUI MCP 驱动通道
     稳定——探针环境观察项，非产品代码路径。
4. ✅ slice 4（2026-08-29）：编辑器核心流 + 闪卡核心流实机通（app.at 升级
   为三栏面板：文件树 | 编辑器 | 卡片列）。
   - **编辑器 6/6 断言**：文件列表点开 → read_wiki 载入正文 → textarea
     `value:` 绑定 + oninput 置脏（MCP type_text 驱动）→ save → 脏标清除
     + 磁盘新正文 + **frontmatter map 保真**（`title: Hello World` 原样
     回写——slice 3 登记项①实证闭环：非空 map 往返无损；空 map `{}` 字面
     量的 null 边缘仅存于新建无 frontmatter 场景，缩窄登记）。骨架期为
     单活动文档 + 打开历史列表；tabs_store 全量状态机（多 tab/脏守卫/
     adoptSaveResult 双读竞争防护）随 29-widget 迁移归位。
   - **闪卡 4/4 断言**：驱动经 API 预置卡文档（`- 探针问题：1+1=? #card
     ^probe-c1`）→ cards 面板 due 列表呈现 → good 评分（review_card POST，
     循环项多参数 `onclick: .Grade(c.page_path, c.block_id, 3)`）→
     review_note 回填 + due 清空（fresh 卡 grade 3 排程次日）+ **排程属性
     落盘**（`card-next-schedule:: 2026-08-30` 写回文档）。
   - 驱动：tmp/core-probe/probe_driver_edit.mjs / probe_driver_cards.mjs。
5. ✅ slice 5（2026-08-29）：反链/图谱/搜索面板实机通（app.at 四区面板）+
   结构视觉基线落盘。
   - **面板 10/10 断言**（probe_driver_links.mjs）：CAP 定理 打开 →
     title 剥离（`.split(".ad")[0]`）+ 反链 3/出链 2 计数与按钮呈现 →
     反链点击跳转 Hello World ✓；graph → 8 边 + 节点按钮可点 ✓；
     search_pages("CAP") → 1 命中渲染为页按钮 ✓。
   - **auto-lang 侧修复 ×2（跨仓，TDD，已折推送 master）**：
     ① 属性形式 `.length`（engine/vue 侧源码的普遍拼写）在 VM 两种通道
     均恒 0——typed 接收者缺 `auto.list.length`/`auto.str.length` 懒表
     别名（NATIVE_ID_ENTRIES + bigvm 返回类型表，复用 103/170）；untyped
     接收者（obj 参数/调用结果链）GET_FIELD 落堆列表失配——运行时
     GET_FIELD 的 length 回退（镜像 ARRAY_LEN 语义，含 0 哨兵不变式）。
     plan046 三新测先红后绿，plan340/catalog 全绿。
     ②（app 侧规避 + 登记）SearchResult 的 wire 判别字段 `type` 与 DSL
     元属性 `.type`（返回表达式类型名）撞名——VM 侧不可读；缺席字段的
     读出是 0 哨兵而非 null，存在性分支不可靠。app 处置：改用
     search_pages（页命中 title/path 全在场）+ handler 内行模型规范化
     （视图零字段分支/零 null 比较）。两者已登记 auto-lang 侧
     （`.type` 转义/命中字段语义），随后续 slice 提案。
   - **结构视觉基线**：baseline/iced-slice5-structure.txt（AutoUI
     snapshot @ 满状态：工作区+文档+反链出链+卡片+图谱+页搜索，可 diff
     重生成 save_baseline.mjs）；web 侧基线 = jade e2e 23/23。像素级截图
     通道本会话环境不稳（iced 窗口偶发自退/句柄不可枚举），登记工具链
     债，Phase 5 收口时补像素对拍。
6. 依赖回填：dir-picker 宿主能力、confirm 模态语义（若 DSL 需扩充，
   提 auto-lang 侧提案，不绕过）。

## 6. 运行方式（当前骨架）

```bash
# 1. 起 jade 服务器（rust 后端；或 Phase 3 的 JADE_GARDEN_SERVER=vm 模式）
cd jade-garden/back/server && JADE_GARDEN_PORT=8199 cargo run
curl -X POST http://127.0.0.1:8199/api/workspace/open \
  -H "Content-Type: application/json" -d '{"root": "<wiki 工作区根>"}'

# 2. 跑桌面前台（split 模式：340 HTTP 改写 → loopback）
cd jade-garden/front/desktop
AUTO_VM_MERGE=0 AUTO_BACKEND=http://127.0.0.1:8199 \
  D:/autostack/auto-lang/target/debug/auto.exe run -r vm
```

- `AUTO_BACKEND` 缺省回落 `http://127.0.0.1:$AUTO_HTTP_PORT`（默认 8080）。
- merged 模式（不设 AUTO_VM_MERGE=0）：api 调用经宿主派发，同样消费
  `AUTO_BACKEND` 实测可达；无后端地址时契约 stub 执行（`return None`）。
- 驱动/断言：AutoUI MCP（`AUTOUI_MCP_PORT=<port>`，autoui_state /
  autoui_snapshot / autoui_action），先例 auto-lang plan446 corpora；
  物理点击通道在探针环境不稳定（§5 slice 3 登记项 ②）。

## 7. Phase 5 记录（2026-08-30 起）

### 7.1 桌面壳裁定：纯 VM 窗口（auto run -r vm 体系），否决 Tauri

- **裁定**：桌面壳走纯 VM 窗口路线——`auto run -r vm`（Phase 4 全程实测
  通路）+ auto-lang 桌面壳体系（462-472 虚拟窗口/dock/任务栏，MCP 实机
  验收；auto-cosmic Plan 365 W3/W4 活跃）。
- **否决 Tauri 的依据**：①jade 前端无任何 TAURI 钩子残留（vite.config 零
  匹配），Tauri 壳是从零新建；②与「back/server 手写 Rust 全量退役」方向
  相逆（Tauri = 又一个 rust 宿主）；③webview 子区的唯一收益是 cytoscape
  图谱一站，而图谱已有列表形态 v1（本 README §3 裁定）。
- **宿主能力落点**：dir-picker → VM 宿主能力桥（host bridge 能力面，
  桌面侧 OS 对话框）；confirm → iced 模态；均随桌面壳体系在 auto-lang
  侧提案，不在 jade 侧绕过。

### 7.2 blockParser.ts 退役（进行中：读路径已切换）

- **读路径 ✅**：blocks_store_ext.ts 解析改接 `@autodown/engine/parser`
  （单源 auto/markdown_parser.at 的 a2ts 产物；ext 只做 BlockNode 树 →
  扁平行模型的视图装配），outline/blocks 缓存不再消费镜像。parser 门面
  （src/parser.ts，017 冻结面）扩充四个纯助手：BlockType/anchorOf/
  attrGetInt/spansText（vue-free 断言保持绿）。vue-tsc + rust e2e 23/23。
- **save 路径 ⏳**：ensureBlockAnchors（保存时 `^锚点` 懒注入）需要块
  **行号**做文本拼接，而引擎 parse_blocks 的 BlockNode.source 恒
  rng(0,0)——阻塞于引擎侧行号发射工作项：markdown_parser.at 行号追踪 →
  convertBlock 填充 source（autodown 仓，pnpm gen 再生）。完成时
  save 切换 + blockParser.ts 删除（其内 parse 镜像届时仅存 save 消费）。
  三镜像销号（020 Phase 3 裁定项）随删除落账。

### 7.3 D4 裁定与实施（2026-08-30）：导入导出 = 原生直连，无信封扩展

- **裁定**：VM 信封不扩展。三条 multipart/二进制路由（assets/upload、
  import/export markdown）由桌面 .at **直连既有原生族**：
  - 导入/上传：`http.request("POST", url)` →
    `.multipart_file(field, 本地路径)` → `.send()`——宿主按路径读文件，
    字节不过 VM 字符串管线；
  - 导出：`http.request("GET", url).send()` →
    `res.body_to_file(本地路径)`——字节直落盘。
- **auto-lang 配套原生**（已折推送 master 5102c5fc1）：
  `Response.body_bytes`(2225，字节忠实列表) 与
  `Response.body_to_file`(2226，字节直落盘)——`Response.body` 是 UTF-8
  lossy 文本（446 E3），二进制经它损坏，故有此对。
- **实测**：导出 zip PK 落盘 + 导入 8 文档（imported:8）回读可读。
- **遗留（登记）**：①选择器宿主能力（目录/文件对话框）就位前，导入导出
  路径为探针常量（workspace_opener 同款先例）；②返回列表在 CALL_SPEC
  拦截返回值上缺 RC 接线（Plan 432 D26 对偶）——`.length` 恒 0，改用
  body_to_file 直落盘规避，RC 工作项登记 auto-lang 侧。

## 8. auto-lang 提案清单（PLAN-064 T-06，2026-09-14 入档；彼仓裁定，本仓不跨仓改码）

| # | 提案 | 实证引用（本仓在案） |
| --- | --- | --- |
| ① | **目录/文件选择器宿主能力**（rfd 一类）：解除 app.at 工作区根硬编码与导入导出探针常量（tmp/jade-probe），workspace_opener 降级分支同步升级 | desktop/README §7.1/§7.3 遗留登记；app.at ExportWs/ImportZip 常量 |
| ② | **confirm 模态语义**：脏态关闭守卫从"默认确认即弃"偏差升级为真确认；outgoing 虚链建页确认同族 | tabs_store §5.2 处置表（confirmClose=deviation）；ext-registry.json tabs 行；P022-6 已登记延后项 |
| ③ | **CALL_SPEC 返回列表 RC 接线**（`.length` 恒 0，Plan 432 D26 对偶）：导入导出返回计数面 | desktop/README §7.3 遗留①；plan-022 slice 3 D4 |
| ④ | **tick/timer 原语**：hover/滚动延迟类交互在 VM 轨的等价物（DynamicComponent tick_interval 面） | DEBTS 059；desktop/README §2 timers 裁定 |
| ⑤ | 交叉引用 P063 在案两项（不重复立项）：scroll_to 仅绝对偏移限制；AnchorSlot 委托层 downcast panic | docs/plans/archived/063-vm-scroll-sync-oneway-anchor.md §0/§4.2 |
| ⑥ | **store facade VM 缺口簇**（2026-09-14 PLAN-622 精化：a/b/c 经最小语料实证当前 master 已健康，守卫语料 `plan622_store_facade_gap_tests` 钉死；**d 已修** auto.list.splice 2071；**e 已修** 捕获槽位编址 + self 特判捕获 __state）；**残余接缝（facade 切换实机新发现）**：合并单态路径 widget handler 读 store 字段解析 App_State 报 Field not found（repro：本目录 app.at facade 形态 `.tabs.find` 实机崩），伴生 `?str` 跨状态读 Invalid object ID、`&&/||` 为 VM 布尔逻辑、findIndex 静默失效——jade 侧规避形态已备（plain str 哨兵/显式空值守卫/显式索引狩猎，tabs_store.at 预备副本见 git 历史）。**✅ 闭合（2026-09-15，PLAN-067 落账）**：残余接缝经 auto-lang PLAN-624 清偿（跨状态字段解析的帧协议/值语义修复 + auto.list.splice/find_index 2071/2072；624 merge 门 smoke split+merged 双模 PASS 实证 facade 形态无 VM 缺陷）；"Field not found" 真相 = tabs_store.at 转写遗失 `active_path` 声明行（622 时代），**非 VM 缺陷**——桌面副本已补声明（PLAN-067 T-01a 基线 230dc57），app.at facade 形态 + `view_*`→`active_*` 投影对齐正式落地（§9 契约节），smoke 双模全臂绿背书 | desktop/ext-registry.json tabs_store_ext 行；vm-smoke tabs 臂（本轮全部断言经等价实现绕行实证）；PLAN-064 §9 work 复审记录；PLAN-067 §9 复审记录 |
| ⑦ | **原生组件外部注册 SPI**（2026-09-14 入档，同日实施）：VM/iced 富组件现为编译期闭集（aura_view_builder 硬编码臂 ×38 + View 闭集枚举 + 快照穷尽 match），无外部组件类型注册通道；提案立 `View::Custom` 透传变体 + name→factory NativeWidgetRegistry + 快照/事件配套，**autodown_editor 首迁外部件** + stream 渐进臂（对齐 engine 032 三态/TS stream→edit v1 裁定——现状 streaming 恒按 final 豁免已摘除）；terminal/code_editor/video 同款受益。**✅ 已实施（PLAN-066）**：auto-lang `auto-down-dev` 分支 72fd9d70c+31a2a1035（NativeWidgetRegistry 双入口/派发序接线/快照配套/编辑器臂迁出/流式只读门+状态条），全量新红=0，vm-smoke 16 臂 ×2 绿（worktree exe）；折 master 随 merge 通道 | docs/plans/attachments/066-auto-lang-native-widget-spi.md（提案全文+证据索引）+ docs/plans/066-auto-lang-native-widget-spi.md（实施记录 §4/§9）；aura_view_builder.rs:1727-1887/3375-3525；widget_registry.rs（.at 件注册表，原生件无通道）；Cargo.toml:132 autodown-core 跨仓 path 依赖先例 |

> 提案⑥修复后：desktop/src/front/tabs_store.at 回归（git 历史 plan-064-dev
> 5eb0279 前后可考），app.at 切 `use store: Tabs` facade 形态，vm-smoke
> tabs 臂断言面不变。
>
> **2026-09-14 facade 切换实机结果**：切换已实装并实测——a/b/c 语义健康面
> 确认（title/read 臂过），d/e 修复生效面确认，但残余接缝（合并单态跨状态
> 字段读 Field not found on App_State）使 Save/Edit 臂崩，已按门纪律回退
> workaround 形态（smoke 复验 16 ✓）。tabs_store.at 预备副本（含三处 VM
> delta：findIndex 索引狩猎、&&/|| 显式守卫、active_path str 哨兵）在
> commit 历史；残余接缝转介 auto-lang（repro = 本次切换 diff）。

## 9. 桌面视图标准组件契约（PLAN-067，2026-09-15；PLAN-068 增量）

app.at 视图层已按 auto-lang `examples/ui/041-auto-edit` 结构模板完成标准组件
重构（actions 注册表 + menubar/toolbar 合成 + FileTree + code_editor +
StatusBar）。本节为重构后的持久行为契约——后续视图改动以此对账，防再漂移。
PLAN-068 增量：tab 条 041 化（§9.6）+ 正文编辑器换装 autodown_editor
（§9.2/§9.4 口径更新）。

### 9.1 actions 注册表（六流 action 化，Plan 451 DSL）

| action id | handler | 流 |
| --- | --- | --- |
| ws.open | .OpenWs | 打开工作区 |
| files.reload | .LoadFiles | 文件重载 |
| file.save | .Save（`enabled_if: ".active_title != ''"`） | 保存落盘 |
| tab.close | .CloseTab | 关闭标签（脏态默认确认即弃，P022-6 保形） |
| cards.load | .LoadCards | 闪卡 due |
| graph.load | .LoadGraph | 图谱 |
| ws.export | .ExportWs | 导出 zip |
| ws.import | .ImportZip | 导入归档 |

- 触发三源同源派发（同一 handler）：toolbar 合成（open/save/close/reload
  四高频件）、menubar 三菜单（文件=open/save/close；视图=reload，console
  位预留；卡片=cards/graph/export/import）、MCP 自动化（autoui_action）。
- 带参/输入事件**不走 action**：FileTree 点击 `.OpenFile(path)`、正文编辑器
  `oninput: .Edit(str)`（PLAN-068 起 autodown_editor）、搜索
  `.QChanged/.DoSearch`、评分 `.Grade(...)` 留根视图控件直连。

### 9.2 active_* 派生标量口径（widget 侧）

- tab 状态权威在 `Tabs` store（`src/front/tabs_store.at`，web 双轨共享）；
  App widget 只持投影镜像 `active_title/active_body/active_dirty/save_note`，
  每次 store 派发（Open/SetBody/Save/Close/SwitchTab）后重同步。
- **撞名裁定**：store 仅声明 `tabs/active_path`，`active_*` 三名与 store 无
  撞名（622 时代 `view_*` 前缀所避让的撞名对象——store 侧同名声明——已不
  复存在）；`active_path` 保持 store 独有（App 跨状态只读）。裁定由
  vm-smoke split+merged 全臂回归背书。
- **正文编辑器播种口径（PLAN-068：autodown_editor，原 code_editor）**：
  `content:` 绑定 = 初值 + 每帧外部 diff 回写；`key: .active_path` 键变即重
  挂载读 `content:`（口径标签无关——两代编辑器同通道）。显式 `*_set_text`/
  `autodown_*` 内建要求编辑器**已注册**（首次打开该 key 未挂载即 RuntimeError
  家族，本仓实机复现）——打开/切换路径不调用；PLAN-068 亦不引入任何
  autodown 内建调用（读路径由 `.Edit` 全文载荷覆盖）；041 约束（该族内建编
  译进 store handler 产坏字节码）继续有效，调用位留根 handler 面。
  `final: true` = 文档恒终态（无流式语义）。
- `.Edit(str)` 单参通道：真实键盘事件 = 渲染器发布携带全文的 input_value
  （auto-lang PLAN-057/PLAN-013 W2 通道）；MCP type_text = INPUT_TEXT 首参
  注入（单参 handler + 空实参 + 通道非空三条件）；INPUT_TEXT 通道约定与
  code_editor 同（autodown/demo/auto 同 exe 实证）。正文经首参落
  `Tabs.SetBody`（dirty 由 store 按 original_body 判定）。

### 9.3 FileTree（根视图行渲染）

- tree 组件四件自 041 移植为自包含副本（`components/{filetree,tree_util,
  tree_icon,package}.at`）；数据 = `list_files("", true)` 递归树 →
  `to_fs_nodes` 装配 fs 形态节点（id=path，while+索引遍历纪律）；行序列 =
  `computed ft_rows => flatten_tree(.ft_nodes, .ft_expanded, true, .ft_sel)`
  纯派生；目录展开受控（`.FtToggle` + `toggle_id`），选中态 `.ft_sel`。
- **行渲染留根视图**（裁定）：vm 组件子树对 MCP 快照不可见（041 README
  「vm 组件边界」②）且 MCP press 组件行在 VM 轨静默崩溃（auto-lang
  P614-C1 在册债务，P618-D4 家族）——smoke 定位/驱动的文件导航按 041 行
  结构（guides 缩进 + chevron mouse-area + TreeIcon + 行按钮）在 App 根
  视图渲染，点击 → `.OpenFile(path)` 流不变。

### 9.4 vm-smoke 元素绑定契约（锁步面）

| 臂交互 | 定位锚 |
| --- | --- |
| 六流 action（open/save/close/reload） | toolbar 合成按钮的 `onclick:` 绑定（`pressAction('.OpenWs')` 等；auto-lang Plan 418 §8.4①：合成按钮快照携带 onclick） |
| cards/graph/export/import | menubar 触发器文本（卡片）→ 菜单项文本，`pressMenuItem` 两步（菜单激活后自闭合） |
| 文件树/反链/命中/tab 条/评分按钮 | 根视图 button ownText（不变） |
| 正文键入 | `isEditorNode`（textarea/code_editor/autodown_editor/AutodownEditor 四形态节点）+ type_text。**Q1 冻结（PLAN-068）**：本机 exe 投影 = `textarea` + `value:` 全文——与 autodown/demo/auto 编辑面同 exe 同形；autodown_editor/AutodownEditor 拼写为真块编辑壳 exe 预留，非本机观测面 |
| 状态断言 | `autoui_state` 字段名不变：active_title/active_body/active_dirty/save_note/status/root/bl_count/ol_count/hit_count/io_note/review_note |

041 VM 约束清单（重构全程有效，见 041 README「vm 组件边界」）：①回调 props
使组件 vm 模式退化为空 fallback；②组件子树对 MCP 快照不可见；③view fn 片
段参数化条件不求值；④code_editor_set_text 进 store handler 产坏字节码；
⑤action 配置 vue 发射器不消费（本桌面以 VM 轨为主，web 面仅保 tabs_store
共享，视图同步另行计划）。

### 9.5 tabs_store 共享面口径（PLAN-070 T-02 起退役为历史注记）

**孪生已死（2026-09-18，PLAN-070 T-02）**：tabs_store 收敛为单源 +
字节部署——唯一源 = `jade-garden/front/auto/src/front/tabs_store.at`，
desktop 副本由 `node scripts/tabs-store-sync.mjs` 字节部署（产物非资产，
禁止手改副本；`--check` 门检非等价即红）。原"逐字共享 + diff 登记册"的
手工孪生维护就此取消。

历史 diff 登记册（PLAN-064/067 时代）的三处 VM 适配，处置如下：
1. `&&/||` 值传播链 → 单源已改显式空值守卫 ×3（web 语义等价）；
2. `active_path ?str` → 单源取 `str + ""` 哨兵（VM 已证形态；web 消费方
   falsy/等值判断兼容，`pnpm build` 门绿）；
3. Close `findIndex` → 单源取显式索引狩猎（**实机实证 findIndex 在 VM 轨
   仍静默失效**：tabs(3) idx 恒 -1 → 关闭失效、重开见脏文；desktop README
   §9 表 ⑥"624 已修 find_index 2072"的记载以本次实证推翻/修正——修复
   覆盖面不含 lambda findIndex 于 store 状态路径）。

不跨包导入（True single-file）的原因：store 内 `use back.api:` 按文件
位置解析——desktop 副本必须留在 `desktop/src/front/` 才能命中带 VM 助手
fn 的 `src/back/api.at` 契约副本；跨包导入实证 read_wiki 等符号调用期
失联（status 停在 files-reloaded，PLAN-070 T-02）。位置即绑定，字节部署
是该缝现工具链下的正确单源形态。

### 9.6 tab 条契约（PLAN-068，041 形态）

- **双分支结构**（Plan 449：view fn 片段参数化条件不求值）：`for t in .tabs`
  内 `t.path == .active_path` / `!=` 激活/非激活双分支，非风格选择。
- **激活 tab**：高亮行 `bg-[#1C1D24]` + 标题钮（zinc-200 medium）+ 脏标
  amber `*`（`t.dirty` 门控）+ x 钮（icon `name: "x"`）。**内层行走括号
  `style:` 形式（041 同款）**——`class:` 括号式遇 `bg-[#1C1D24]` 任意值整
  串丢弃（T-01 实机快照实证）；外层条/分隔线的 class 花括号式不受影响。
- **x 钮 = 零参 `.CloseTab`**（活动 tab 语义，`Tabs.Close(.active_path)`），
  只出现在激活行；与 041 的带索引 `.CloseTab(i)` 不同，不新增带参 msg
  （tabs_store 零改动红线）。
- **无 "+" 新建钮**（041 有）：六流无新建文件流，补流需动 tabs_store/web
  共享面——登记偏差，另行计划。
- **smoke 锚**：tab 标题钮 ownText = `t.title` 不变；x 钮 = **唯一空文本
  button**（icon 在快照渲染为 `[Image]` 文本节点，name prop 不可见——
  T-01 实机）；tabs③a 以其 press 驱动脏关流（与 `.CloseTab` 等价）。
