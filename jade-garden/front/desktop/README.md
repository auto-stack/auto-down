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
3. slice 3：桌面 app 工程（本目录 pac.at + app）+ 核心流探针实机通
   （workspace.open → files → readWiki → writeWiki 经 VM 通道；merged
   模式进程内 / split 模式 loopback HTTP 二路探明，`{*path}` 通配参数
   在 340 改写器的支持面就地确认，缺口提 auto-lang 侧）+ 无 DOM 依赖
   widget 首批（status_bar / ribbon 纯逻辑下沉）。
4. slice 4：编辑器核心流（tabs_store + editor_tab，hover/scroll 映射）
   + 闪卡（flashcard_modal）；随后 backlinks/outlinks/outline/search。
5. slice 5：图谱列表视图 + 主题/设置；双端视觉基线截图归档。
6. 依赖回填：dir-picker 宿主能力、confirm 模态语义（若 DSL 需扩充，
   提 auto-lang 侧提案，不绕过）。
