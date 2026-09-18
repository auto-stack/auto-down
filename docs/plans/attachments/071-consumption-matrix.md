# PLAN-071 T-00 引用清点表（2026-09-18，worktree down-071/auto-down @ d8f11bf）

> 六项处置对象的全部引用点 + e2e spec 关联矩阵。动作列 = 本计划执行口径。

## #1 legacy-autoui/（目录，7 文件：api.at/db.at/service.at/back.pac.at/front.pac.at/root.pac.at/app.at.placeholder）

| 引用点 | 性质 | 动作 |
| --- | --- | --- |
| 代码（*.ts/*.vue/*.at/*.mjs/*.rs/*.toml/*.json） | **零引用**（grep 全仓实证） | 删目录 |
| jade-garden/README.md:38 树行 `legacy-autoui/ # archived plan-011 toolchain` | 功能面口径 | 随 SD-01 删行 |
| back/auto/api.at:3,10 + desktop/src/back/api.at:7 + front/auto/README.md:56 历史注释 | 过程史注（022 复活种子来源） | 保留（非功能面） |

e2e 关联：无。

## #2 plugins 面

| 引用点 | 性质 | 动作 |
| --- | --- | --- |
| front/auto/src/front/plugins_store.at（store 本体） | 单源 | 删 |
| front/auto/src/front/utils/plugins_store_ext.ts（loadPluginsResult/PluginManifest） | ext | 删 |
| front/src/stores/auto/usePluginsStore.ts（生成物） | 生成 | 删 |
| front/src/stores/plugins.ts（facade） | facade | 删 |
| UI 消费点（left_sidebar/command_palette/app_shell/ribbon/main_area/menu_bar） | **无**——起草时"疑似引用"不成立，store 已是全死代码（grep 实证零消费） | 无需摘除 |
| back/auto/api.at | **无 plugins 端点**（ext 自行扫文件树，后端零参与） | 无 |
| desktop | **零引用**（Q-2 答案：不波及） | 无 |

e2e 关联：无。

## #3 whiteboard（front 消费链，按删除序）

| # | 引用点 | 性质 | 动作 |
| --- | --- | --- | --- |
| 1 | auto/src/front/utils/file_tree_node_ext.ts `openNodeFile` .canvas 分支 | 导航入口（手写 ext） | 直改（去分支） |
| 2 | auto/src/front/tabs_store.at msg `OpenWhiteboard` + `.OpenWhiteboard` handler（L98/L211-224） | 打开动作（单源） | 直改 + ①再生 useTabsStore.ts ②desktop 副本 `tabs-store-sync.mjs` 重部署 |
| 3 | front/src/stores/tabs.ts `isWhiteboard` 字段 + `openWhiteboard` 方法（L26/L48-49） | facade | 直改 |
| 4 | auto/src/front/main_area.at `use whiteboard_page` + fn 表 + computed `has_whiteboard`/`whiteboard_path` + view `if .has_whiteboard WhiteboardPage` 块（L35/L40/L57-58/L89-94） | 页面装配 | 直改 + 再生部署 MainArea.vue |
| 5 | auto/src/front/utils/main_area_ext.ts `hasWhiteboardTab`/`whiteboardPath`（L51-59） | ext | 直改 |
| 6 | auto/src/front/whiteboard_page.at + utils/whiteboard_page_ext.ts + src/components/WhiteboardPage.vue | 页面（store+页面文件） | 删三件 |
| 7 | front/src/lib/api.ts `readWhiteboard`/`writeWhiteboard` + `WhiteboardDoc/WhiteboardShape` 导入（L26/L54-55/L290-297） | 手写 api 层死函数 | 直改（api_gen.ts=back 契约生成物，保留） |
| 8 | back/api.at whiteboard 契约 + server/src/whiteboard.rs + main.rs/vm_dispatch.rs 挂接 | 后端端点 | **保留**——处置对象口径为"whiteboard_page.at + 导航入口"（§0-3），后端不在内；作为实验性可回归通道（git 历史可取回 front 面） |
| 9 | desktop/src/front/tabs_store.at 副本 | 单源部署物 | 经 sync 机制随 #2 重部署（非手工） |
| 10 | stubs/gen_components/ | 已空（011 Phase 5.3d 后无 stub） | 无 |

desktop 无 whiteboard 页面/入口（六流无对应面佐证，grep 实证仅 tabs_store 副本与 back 契约孪生）。

e2e 关联：`10-whiteboard.spec.ts` **删除**；`e2e/README.md` 场景表 whiteboard 行 + "Whiteboard storage is split" 注记段 **删改**；`08-screenshots` 基线**预计零变化**（fixture 无 .canvas，树/主区渲染不受影响）——T-06 全量实证。

## #4 SRS 入口

| 引用点 | 性质 | 动作 |
| --- | --- | --- |
| command_palette_ext `Review flashcards` → `jade-open-flashcards` 事件 → AppShell FlashcardModal | web 复习流**唯一入口**（Ribbon/MenuBar/StatusBar/LeftSidebar 清点零复习入口） | 保留（flashcard modal=唯一复习流） |
| AgendaPanel（right_sidebar.at L44） | 面板 | 保留 |
| `tmp/wiki-demo/wiki/Cards Probe.ad` | **未跟踪**本地文件（gitignored tmp/，2026-08-30 SRS 手工探针页） | 内容移入 `front/e2e/fixtures-pages/Cards Probe.ad`（Q-1 落点裁定：e2e 测试资产目录，新建跟踪）+ 删 tmp 本地副本 |
| `E2E Cards.ad`（12-flashcards 运行时经 POST /api/wiki 创建） | 已是测试资产（fixture 保持 static 惯例，README 已载） | 无文件动作 |
| back srs.at/srs.raw.* + `/api/cards/due` | 后端引擎 | 保留 |

e2e 关联：06-palette（空态）/12-flashcards（复习流）保留不动。

## #5 zip 导入导出

| 引用点 | 性质 | 动作 |
| --- | --- | --- |
| MenuBar.vue（app-config.at 合成） | 仅 文件/查看 两菜单 5 动作（ws.open/file.save/tab.close/files.reload/graph.open），**无 zip 项**——070 落地面即此形态，历史 web 壳本无菜单栏 | 验证断言（无菜单栏动作可删，处置已达成） |
| command_palette_ext `export-markdown`/`import-markdown` + api.ts `exportMarkdown`/`importMarkdown` | zip 唯一 UI 位 | 保留（命令面板形态即处置目标） |
| desktop 六流含导入导出 | 桌面面 | 不受影响（web 侧为主） |

e2e 关联：06-palette 保留（zip 命令在册）；24-menubar 不涉及。

## #6 query.at

| 引用点 | 性质 | 动作 |
| --- | --- | --- |
| back/auto/query.at + query.raw.rs/ts | 后端引擎 | 保留 + 文档标注"引擎就绪、无前端"（SD-01/02） |
| front 消费 | 零 | 无 |

## 08-screenshots 基线预期

删除面均无可见 UI 变化（plugins 零 UI；whiteboard fixture 无 .canvas；菜单栏不动；SRS 入口不动）→ 预计全套绿、无需 --update-snapshots；T-06 全量复跑实证为准。

## 再生/同步机制注记（T-03 执行依赖）

- .at→SFC 再生：`cd jade-garden/front/auto && D:/autostack/auto-lang/target/debug/auto.exe build -d .`（二进制在位已验证），逐组件拷贝+sed 改写部署 `front/src/`（auto/README "Regenerate" 节）；**build 对 widget 解析错不 fail-fast，须查 warning 输出**。
- tabs_store 单源：`node desktop/scripts/tabs-store-sync.mjs`（部署）+ `--check`（字节等价门）。
- api stub 同步：白板 api.ts 手写层删改不涉 stub（stubs/gen_lib_api.ts 镜像 api_gen 契约，白板契约保留不动）。
