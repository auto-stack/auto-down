# PLAN-073 T-00 产物：toolbar 渲染落点复核 + 桶① 5 单元字面 style 清单

> 2026-09-18，worktree `down-073/auto-down` @ base `6dd8bfb`（master）。
> 勘探对象：`jade-garden/front/{auto/src/front,src/components,desktop/src/front,
> component-gallery}`。机制依据：auto-lang `docs/design/30-autoui-parity-three-layer.md`
> §5（配方先行）+ `10-language-syntax.md`（style recipe 语法）。

## 1. ①-4 toolbar 渲染落点复核结论（AC-03）

| 项 | 结论 |
| --- | --- |
| 声明面 | `auto/src/front/menu_bar.at` view **双块**：`menubar (class: "items-center border-b")` + `toolbar (class: "px-2 py-1 gap-1 border-b") {}`（空块，内容经 ui_config 合成） |
| 合成通道 | `auto/app-config.at` L22 `toolbar { item{action:"file.save"} item{action:"tab.close"} item{action:"files.reload"} }` → pac.at `ui_config:` → T-05 组件级选择性继承（handler 交集门） |
| **渲染落点** | **`front/src/components/MenuBar.vue` L108-118**（menubar 的兄弟块）：3 个 ghost Button（Save/X/RefreshCw icon + title）↔ app-config 3 action **一一对应** |
| 无独立 Toolbar.vue 的原因 | **设计使然，非缺件**：toolbar 不是独立 widget，是 MenuBar widget 的第二 view 块；072 盘点表"渲染件缺席（近似反向差）"表述据此修正 |
| 路径勘误 | 计划 §2 写 `gen/front/vue/src/components/MenuBar.vue`——gen 中间产物在 `front/auto/gen/front/vue/`，部署件经 sed 改导入路径后拷贝至 `front/src/components/`（.at 头注流程）；复核以部署件为准 |
| 裁定 | **落点 = MenuBar.vue 内，无缺件，无需按 046 形态补发射**（不触发回 new）；①-4 与 ①-3 合并为同一 menubar+toolbar 单元对照（渲染结构对照点见 §2） |

desktop 对照（`desktop/src/front/app.at` L326/L353）：`menubar (class:"items-center")`（三菜单 file/view/cards，067 动作集）+ `toolbar (class:"ml-auto") {}`（空，actions DSL 配置合成，041 同款）。web 是 desktop 动作集的**有意子集**（PLAN-071 裁定 zip 导入导出/闪卡复习不进 web 菜单栏）——菜单面差异非缺陷；结构对照点 = menubar-menu/trigger/content/item 层级 + shortcut 标注形态 + toolbar 按钮（icon/variant/尺寸 token）。

## 2. 桶① 5 单元字面 style 清单（配方化定价）

> 口径：字面 = Tailwind 任意值 `…\[…\]` + 调色板字面色（zinc/amber/slate 等）；
> 语义 token 类（bg-card/text-muted-foreground/border 等 shadcn hsl var）不算字面。
> 生成 SFC 与 .at 同源（脱糖产物），清单以 .at 源面计。

| 单元 | web .at 面 | VM 轨（desktop） | codegen 模板（跨仓，本轮不改） |
| --- | --- | --- | --- |
| ①-1 status_bar | status_bar.at：`text-[11px]`（footer L54）；`max-w-[240px]`（L58，非 AC 范围保留）；`text-amber-500`（dirty 三元 L66，调色板字面） | desktop status_bar.at：`text-[11px] text-zinc-300` ×1 + `text-[11px] text-zinc-400` ×3（L15-18）；twin status_bar_page.at 同构 ×4 | — |
| ①-2 tab 条 | tab_strip.at：`h-[var(--header-height)]`（L62，var 引用非字面值，保留）；`max-w-[180px]` ×2（三元 L66）；`text-[9px]`（dirty 点 L73） | desktop app.at tabs 区 L408-441：`text-[12px] text-zinc-200/500`、`text-amber-400` ×2、`bg-[#1C1D24]`（括号 style: 形态，070 T-01 实证在案） | — |
| ①-3 menubar | menu_bar.at **零字面**（仅 "items-center border-b"） | app.at menubar 配置区（L326-352）无类串 | **auto-lang `ui_gen/vue.rs:6056`**：MenuBar.vue 快捷键标注 `<span class="ml-auto text-[11px] text-zinc-500">` ×4 源自编译器合成模板——跨仓 codegen 面，留 L2（Q-2 同口径：共享化不在本轮） |
| ①-4 toolbar | menu_bar.at toolbar 块类零字面 | app.at `toolbar (class:"ml-auto")` 零字面 | — |
| ①-5 filetree 行家族 | file_tree.at：`h-[var(--header-height)]`（L40，保留）、`text-[11px]`（L41）；file_tree_node.at：`min-w-[140px]`（ctx 菜单 L109）；行三元 L85 为语义 token（bg-primary/10 text-primary vs text-foreground hover:bg-accent）非字面 | app.at ft_rows 区 L369-398：`w-4 h-6`/`w-px h-6 bg-border`/`w-3.5 h-3.5 text-muted-foreground`/`w-5 shrink-0` **全 token 类，零字面**（chevron/icon/guide 形态与 web 对齐良好） | — |

ext 通道（6 个相关 *_ext.ts）机扫**零类串**（gap 26 不涉及本批单元）。

## 3. style recipe 机制实证（探针记录，T-01..T-03 依据）

探针项目：`/d/autostack/tmp/p073-styleprobe`（scene:"ui"，auto.exe v0.4.2-1140）。

| # | 实验 | 命令 | 结果 |
| --- | --- | --- | --- |
| P-1 | 顶层 `style meta_text = "text-[11px] text-muted-foreground"` + `text { style: meta_text }`（bare-ident 消费） | `auto.exe build -d .` | ✅ vue gen 展开为 `class="text-[11px] text-muted-foreground"`（脱糖在 aura extract 共享层：`auto-lang/src/aura/extract.rs:1028 desugar_style_expr`） |
| P-2 | 同探针 VM 轨 | `auto.exe run -r vm` + MCP autoui_state/snapshot | ✅ 无警告渲染，state/快照正常（recipe 经同一 parse→extract 路径，运行时消费脱糖结果） |
| P-3 | `text { class: meta_text }`（**class: 属性位** recipe 消费） | build 后读 App.vue | ✅ 同样脱糖（`class="text-[11px] …"`）——`class:` 与 `style:` 两个属性位均接受 recipe 引用 |
| P-4 | VM iced 对标准 token 类支持 | `text { class: "text-xs text-zinc-500" }` VM 运行 | ✅ 无 unknown-class 警告（desktop 已有 bg-border/bg-muted/30/text-muted-foreground/text-foreground 先例） |
| P-5 | PLAN-635 跨文件 recipe use-import | 未探（本轮不需） | Q-2 裁定 app 内单文件 recipe 即满足；跨 package 共享化留 L2 |

## 4. 配方化落点与口径裁定（Q-2 落定）

1. **落点**：各单元 .at 文件内顶层 `style` 声明（app 内单源）；跨文件/跨 package 共享化留 L2（机制 §5/§6 bp 抽取另立）。
2. **值级口径**：字面任意值字号 → 标准 token（`text-[11px]` → `text-xs`，视觉 +1px，vue 臂截图基线随配方化重刷——计划 §5 在案）；字面调色板色 → 语义 token（zinc-300→text-foreground、zinc-400→text-muted-foreground，VM 主题既有映射）。
3. **不改**：`h-[var(--header-height)]`（var 引用非字面）、`max-w-[240px]`/`[180px]`/`min-w-[140px]`（非 AC 范围）、`text-amber-*`（两端主题语义差异：web amber-500 亮底 vs VM amber-400 暗底，统一需主题 warning token，记债表留主题系统流）、MenuBar.vue 快捷键 zinc（编译器模板，留 L2）。
4. **01-1 配方形态**（T-01 依据）：web footer 类串拆 `style sb_shell`（布局）+ `style sb_meta`（字号色 token）；desktop 4 文本行收敛 `style sb_meta = "text-xs text-foreground"` / `style sb_dim = "text-xs text-muted-foreground"` 双配方；gallery twin 随 desktop 同步（derived 镜像纪律）。
