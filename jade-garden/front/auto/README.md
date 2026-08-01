# Jade Garden — Auto sources

Vue components of `jade-garden/front` are being rewritten in the Auto
language (plan 011). This directory is the embedded Auto project (same
pattern as `autodown/packages/editor/src/auto`).

## Layout

- `pac.at` — Auto project manifest (`scene: "ui"`, `render: "vue"`)
- `src/front/*.at` — widget sources (one component per file)
- `src/front/app.at` — placeholder root widget (never deployed; required so
  real widgets are emitted as standalone `components/<Name>.vue`)
- `src/front/utils/*_ext.ts` — handwritten TS extensions, only for what the
  DSL genuinely cannot express (npm libs, try/catch, regex literals)
- `stubs/` — gen-project stubs for dual-resolution shims (see editor's
  src/auto/README.md for the mechanism): `gen_lib_*.ts` (lib mirrors),
  `gen_stores/*.ts` (facade mirrors), `gen_components/*.vue` (untranslated
  child-component mirrors, batch 3 — the compiler overwrites each with the
  real SFC when that component is translated)
- `gen/` — generated Vue project (gitignored)

## Regenerate

```sh
cd jade-garden/front/auto
D:/autostack/auto-lang/target/debug/auto.exe build -d .
# then copy + sed-rewrite generated SFCs into front/src/ (per-component,
# see editor package README for the @/ext -> relative import rewrite)
```

**Caveat:** `auto build` does NOT fail on widget parse errors — it logs
`Warning: Failed to compile <path>` and leaves the stale SFC in place.
Always check the output for that warning after editing a widget.

Do NOT run `auto run` / `auto build` from the jade-garden root: the legacy
AutoUI project files were archived to `jade-garden/legacy-autoui/`
(plan 011 Phase 5.0a) precisely because the old workflow overwrote
`front/src/App.vue` with a placeholder.

## Store 翻译模式

（plan 011 Phase 5.1 试点实证：tabs store，2026-07-31。后续 9 个 store
的批量翻译照此流程执行。）

### 已验证的文件布局

- `src/front/tabs_store.at` — `store Tabs { ... }` 声明（见下文语法）。
- `src/front/utils/tabs_store_ext.ts` — 手写 TS 扩展：DSL 表达不了的
  部分（try/catch、正则、跨 store 调用、`confirm`），经相对路径
  `../../../../src/lib/api` 引用 front 树的真实模块（dual-resolution，
  与 editor 包同模式）。
- `stubs/gen_lib_api.ts` — gen 工程专用 stub，重新生成时镜像到
  `gen/front/vue/src/lib/api.ts`（gen 侧 vue-tsc 需要；永不发布）。
- `front/src/stores/auto/useTabsStore.ts` — 生成产物（拷贝 + sed 改写
  import），**不要手改**。
- `front/src/stores/tabs.ts` — 手写 facade（薄层）：保持原 Pinia store
  的 API 形状（camelCase 状态、可选参数、`Tab` 接口导出），消费方零改动。

### store .at 语法（实证可用）

```auto
use back.api: readWikiSafe, writeWikiSafe, ensureBlockAnchors, recordRecent, stripExt, confirmClose

store Tabs {                      // store Tabs -> 生成 useTabsStore.ts / useTabsStore()
    model {
        var tabs Array<str> = []  // Array<str> = any
        var active_path ?str = None   // None -> null
    }
    msg Msg { Open(map), Close(str), Load(str) }   // 见限制 1
    computed {
        active_tab => .tabs.find(t => t.path == .active_path)
        all_tags => []            // 见限制 2（必须声明，占位即可）
    }
    on {
        .Open(args) -> {
            var path = args.path
            var existing = .tabs.find(t => t.path == path)
            if existing != null { .active_path = path }
            if existing == null {
                .tabs.push({ path: path, title: "t", dirty: false })
                .active_path = path
                var doc = readWikiSafe(path)      // api 函数自动 await，handler 变 async
                ...
            }
        }
    }
}
```

handler 体内实证可用：`var` 局部变量、if（无 else，用两个互斥 if）、
`&&`/`||`/`!`、find/findIndex/index 访问/`.splice(i,1)`/`.len()`、
对象字面量 push（camelCase 键、`None` 值）、f-string
（`f"局部图谱：${x}"`）、`Math.min`、对 find 到的对象引用直接写字段。
`use back.api:` 列出的函数调用会被自动加 `await`（同步函数被 await
无害）。

### 单例语义

生成的 composable 把 `ref` 声明在**模块顶层**，`useTabsStore()` 每次
调用返回同一批 ref —— 天然单例，与 Pinia 一致。facade 在模块顶层
`const g = useGeneratedTabsStore()` 实例化一次即可，不要再包 reactive()。

### facade（front/src/stores/tabs.ts）

生成 API 与原 Pinia API 有三处形状差异，由 facade 抹平，消费方零改动：

1. 状态是裸 ref（snake_case）→ facade 用 getter/setter 暴露 camelCase
   值（`get tabs() { return g.tabs.value }`；`activePath` 需要 setter，
   MainArea 直接赋值）。
2. msg 动作为 PascalCase 且多参数动作只收一个 map（见限制 1）→
   facade 做参数归一化：`open(path, title?) => g.Open({ path, title: title ?? '' })`。
   可选/可空参数用哨兵值（`centerPath ?? ''`）传入，store 内判断 `== ""`。
3. computed getter 找不到时返回 `undefined`（原 Pinia 返回 `null`）→
   facade `?? null` 归一。

### 重新生成（store）

**多 store 项目的限制（Phase 5.1 批量翻译实证）**：编译器每次 build 只
发射**最后编译的那个 .at 文件**里的 store（`generate_component_from_file`
每个文件编译前清空 STORE_EXTRA_FILES 线程局部存储；增量扫描会编译所有
.at，线程局部最终只剩最后一个文件的产物）。规避：**一次只留一个
`*_store.at`**——其余临时移出 `src/front/`，build，sed 拷贝，再移回。
`gen/front/vue/src/stores/` 跨 build 保留，gen 侧 vue-tsc 不受影响。
另注意：增量扫描路径对 parse 失败**完全静默**（无 Warning）——判据是
输出里有没有该 store 的 `✓ Store composable:` 行 + 检查 gen 产物内容。

```sh
cd jade-garden/front/auto
# gen 侧 stub 镜像必须先于 auto build（gen 的 vue-tsc 会检查 store 产物）
mkdir -p gen/front/vue/src/lib
cp stubs/gen_lib_api.ts gen/front/vue/src/lib/api.ts
# 一次一个 store：其余 *_store.at 临时移出
mv src/front/tabs_store.at src/front/sidebar_store.at ... /tmp/store_hold/
D:/autostack/auto-lang/target/debug/auto.exe build -d .
mv /tmp/store_hold/*.at src/front/
# 拷贝 + sed 改写 '@/lib/api' → 该 store 的扩展模块（相对路径）
sed 's|@/lib/api|../../../auto/src/front/utils/<name>_store_ext|g' \
  gen/front/vue/src/stores/use<Name>Store.ts > ../src/stores/auto/use<Name>Store.ts
```

### 验证

`cd front && pnpm build`（vue-tsc）+ `pnpm test:e2e`（Playwright 19 基线）
全绿。facade 不改消费方，故 diff 即回归面。

### 编译器限制与规避（批量翻译前必读）

1. **msg payload 单类型**：`Open(str, str)` 解析失败（"Expected term, got
   RBrace"），每个 variant 只能带一个类型。多参数动作改收 map：
   `Open(map)` + handler 内 `var path = args.path`；facade 侧组装对象。
2. **all_tags 硬编码注入**：store codegen 对任何不含 all_tags 的 store
   注入一个引用 `notes.value` 的 getter（015-notes 专用 hack），会导致
   TS2304。规避：store 里声明一个占位 `all_tags => []` computed 即可抑制。
3. **store 的唯一 import 通道是 `@/lib/api`**：`use back.api:` 列什么名
   就 import 什么名（不校验 back.api 是否真实存在），其他模块
   （blockParser、其他 Pinia store）无法直接 import —— 全部经 ext 模块
   中转，拷贝时 sed 改写 `@/lib/api` 为 ext 路径；gen 侧用 stub 镜像。
4. **无 try/catch/finally**：错误分支改为 ext 的 safe 包装
   （catch → log + 返回 null），store 内 `if doc == null` 分支复刻原
   catch 逻辑。已知行为偏差：原 save() 失败会向调用方传播 rejection
   （无调用方 await save，唯一差异是 unhandled rejection 变为
   console.error）—— 记录在 ext 注释与此处。
5. **无正则字面量**：`path.replace(/\.ad$/, '')` 放 ext（`stripExt`）。
6. **无 early return**：用 if 守卫反转（`if tab != null && !tab.loaded`）。
7. **三元在 handler 可用**；`cond && a || b` 惯例在 handler/computed 均
   可用（tabs store 的 `doc.frontmatter && doc.frontmatter.title || tab.title`
   实证通过）。
8. api 名单中的同步函数也会被自动 `await`（无害）；f-string 插值内的
   调用不加 await（对同步函数正好正确）。

### Phase 5.1 批量翻译新增限制（9 个 store 实证）

9. **每次 build 只发射一个 store**：见上文「重新生成（store）」的多
   store 限制与逐文件 build 流程。增量路径 parse 失败静默无 Warning。
10. **handler 无返回值**：msg handler 不返回任何值，带返回值的方法
    （blocks 的 getBlocks/blockById/headings/parse）只能放 facade/ext，
    facade 直接读写生成 store 的 state ref。
11. **无 Map/Set 类型**：model 里声明 `var x ?str = None` 占位，facade
    顶层赋 `new Map()`/`new Set()`；增删改经 ext helper 原地 mutate
    （Vue 3 对 reactive Map/Set 的 mutate 有依赖跟踪，实证可用）。
12. **无 watch**：跨 store watch（blocks 的 tabs.activeTab 同步）与
    状态变化副作用（theme 的 apply+persist）放 facade 模块顶层
    `watch(...)`，语义与 Pinia setup 内 watch 一致。
13. **错误传播的两种复刻**：原 action 有 try/catch 吞下错误 → ext 返回
    `{ ..., error: "" }` map，store 内 `if res.error == ""` 双分支
    （workspace/graph/fileTree.load/plugins）；原 action 让 rejection
    传播 → ext 用 RAW 包装直接 throw，rejection 穿过 async handler 到
    facade 调用方（fileTree 的 create/duplicate/rename/delete，行为与
    原 Pinia 完全一致）。「设置 error 后再 re-throw」（workspace.open）
    由 facade 在 await 后检查 error 并 throw。
14. **$patch**：消费方用到 Pinia `$patch` 时（graph settings reset），
    facade 手工仿真（只覆盖实际用到的 key）。
15. 无 payload 的 msg variant 可用（`ToggleLeft`），handler 写法
    `.Name -> {`（无括号）；model 类型 `bool`/`int`/`str` 可用，
    `var settings map = {}` 能编译但初值是 `ref(null)`（由 facade 赋真值）。
16. model 初值不能调 ext 函数：所有需要计算/IO 的初值（localStorage、
    matchMedia、new Map/Set）一律 facade 顶层赋值（`.at` 里只占位）。

## Widget 翻译模式

（plan 011 Phase 5.1 简单面板批次实证：BacklinksPanel /
OutgoingLinksPanel / UnlinkedReferencesPanel / OutlinePanel /
RecentFilesPanel，2026-07-31。）

### 文件布局（widget）

- `src/front/<panel>_panel.at` — widget 源（一个组件一个文件）。
- `src/front/utils/<panel>_ext.ts` — 手写 TS 扩展：facade 再导出
  （dual-resolution shim，`../../../../src/stores/<x>` 在 front 树解析到
  真 facade，在 gen 树解析到 stub）、try/catch 安全包装、正则、
  `new Date`/`new CustomEvent`、lucide 图标再导出（gen 工程自带
  lucide-vue-next 依赖，无需 shim）、v-html 函数式组件。
- `stubs/gen_stores/<x>.ts` — facade 的 gen 侧 stub（`useXStore(): any`），
  重新生成时镜像到 `gen/front/vue/src/stores/<x>.ts`；永不发布。
- `stubs/gen_lib_wikiLink.ts` — wikiLink 的 gen 侧 stub（镜像到
  `gen/front/vue/src/lib/wikiLink.ts`）。`stubs/gen_lib_api.ts` 已扩入
  getBacklinks/getOutlinks/getUnlinkedRefs/createWikiPage 及相关 interface。

### store facade 消费（`use { composable }`，实证）

```auto
use {
    composable: useTabsStore from "src/front/utils/backlinks_panel_ext.ts"
    fn: tabFileStem, fetchBacklinksSafe from "src/front/utils/backlinks_panel_ext.ts"
}
```

codegen 在 `<script setup>` 顶层发射 `const tabsStore = useTabsStore()`
（local 名 = 去 `use` 前缀 + 首字母小写，不可选；零参调用）。
`.tabsStore.activeTab` 在 view 绑定 / computed / handler 三处都原样
发射 `tabsStore.activeTab`（非 state/prop/ref 的首段 ident 透传为裸名）
—— facade 的 getter 在渲染/computed 求值时执行，响应式跟踪成立。
多个 composable 可以并列（`composable: useBlocksStore, useTabsStore`）。

### 重新生成（widget）

```sh
cd jade-garden/front/auto
# gen 侧 stub 镜像必须先于 auto build（gen 的 vue-tsc 会检查 ext 拷贝）
mkdir -p gen/front/vue/src/lib gen/front/vue/src/stores gen/front/vue/src/components
cp stubs/gen_lib_api.ts gen/front/vue/src/lib/api.ts
cp stubs/gen_lib_wikiLink.ts gen/front/vue/src/lib/wikiLink.ts
cp stubs/gen_lib_dailyNote.ts gen/front/vue/src/lib/dailyNote.ts
cp stubs/gen_stores/*.ts gen/front/vue/src/stores/
cp stubs/gen_components/*.vue gen/front/vue/src/components/
# 双重 src 镜像（gap 32：ext 的 ../../../../src/... 在 gen 树解析到 src/src/...）
mkdir -p gen/front/vue/src/src
cp -r gen/front/vue/src/lib gen/front/vue/src/src/lib
cp -r gen/front/vue/src/stores gen/front/vue/src/src/stores
cp -r gen/front/vue/src/components gen/front/vue/src/src/components
D:/autostack/auto-lang/target/debug/auto.exe build -d .
# 检查输出无 "Warning: Failed to compile"，且 components/<Name>.vue 已更新
# 拷贝 + sed 改写 ext import（front/src/components 的相对深度是 ../../）
sed 's|@/ext/src/front/utils/<panel>_ext|../../auto/src/front/utils/<panel>_ext|g' \
  gen/front/vue/src/components/<Panel>.vue > ../src/components/<Panel>.vue
```

### widget 翻译新增限制（本批次实证）

17. **widget 的 msg variant 不带 payload 类型**：`msg Msg { OpenSource(map) }`
    解析失败（"Expected term, got RBrace"——报错位置在 view 块深处，具有
    迷惑性）。widget 写法是 `msg Msg { OpenSource }` + handler 声明参数
    `.OpenSource(bl) -> {`（对比：store 的 msg variant 必须带一个类型）。
18. **循环变量不能命名 `link`**：`link` 是 DSL 元素关键字（router-link
    映射），`for link in ...` + `link.x` 会把后续内容错解析成 router-link
    垃圾或 "Expected term, got RBrace"。换名（bl/ol/r/h/rf 均已验证）。
19. **`.remove(...)` 被映射为 `.splice(...)`（任意接收者）**——与
    `.contains`→`.includes` 同类陷阱：`recentFilesStore.remove(path)`
    误发射 `recentFilesStore.splice(path, 1)`。经 ext 帮手中转
    （`removeRecent(path)`）。
20. **普通元素上的动态 `class:` 表达式被静默丢弃**：
    `span { class: ol.dot_class }` 发射 `<span/>`（只认字符串字面量与
    style 映射）。条件 class 用 **`style` prop 里的三元**（Plan 346）：
    `style: ol.exists ? "bg-a" : "bg-b"` → `:class="ol.exists ? 'bg-a' : 'bg-b'"`，
    循环变量条件可用，与原 `:class` 三元绑定逐字一致。
21. **watch 已有 `.immediate`**：`watch { .src.immediate -> { ... } }` →
    `watch(src, () => {...}, { immediate: true })`。watch 源必须是
    model/prop/computed 名（原样发射；computed 以 ref 形式被 watch）。
    editor 包 README「DSL watch 无 immediate」的记述已过时。
22. **v-html 用函数式组件**：ext 里
    `export const HtmlDiv = (props) => h('div', { class: props.class, innerHTML: props.html ?? '' })`，
    widget 里 `use { component: HtmlDiv }` + `HtmlDiv (class: "...", html: r.html)`。
    单变量 v-for 内 PascalCase 组件会自动加 `:key="'HtmlDiv-1-' + (r?.id ?? r)"`，
    item 为 any 时 vue-tsc 通过。
23. **`text f"...${x}..."`** f-string 在 view text 可用
    （`text f"#${ol.block_id}"` → `#{{ ol.block_id }}`）。
24. **`onclick.stop: .Remove(x)`** 修饰符 + 带参 handler 可用，与
    `@click.stop="Remove(x)"` 等价（替代 `$event.stopPropagation()`）。
25. **handler 调用 facade 方法**：`.tabsStore.open(a, b)` →
    `tabsStore.open(a, b)`（非内建方法名透传）；view 引用的 handler 会
    额外携带一句无害的 `emit('Open', x)`（无监听者，editor 批次先例）。

### Phase 5.1 batch 2 新增限制（Ribbon/StatusBar/AgendaPanel/SearchPanel/ThemePopover 实证）

26. **ext 内嵌的 Tailwind class 字符串不在扫描路径内**：ext .ts 里的
    class 字面量（如 `<mark>` 高亮的 `bg-primary/20 text-primary`）不在
    front/tailwind.config.cjs 的 content glob（`./src/**`）内，Tailwind
    不生成对应 utility —— batch 1 靠未翻译的 SearchPanel.vue 原文里的
    同款字面量兜底（隐性依赖），SearchPanel 翻译后字面量移入 ext，
    `.bg-primary/20` 消失，`<mark>` 退回 UA 默认黄色，e2e 截图基线立刻
    抓出。修复：content 加入 `./auto/src/front/utils/*.ts`（已落地）。
    教训：凡是 ext 里以字符串形式携带 Tailwind class 的，都必须落在
    content 扫描路径内。
27. **`to:` prop 在 dyn 块上误解析**：`to` 是关键字 token（同 editor
    README 的 `type:`/`as:`），`dyn (.Teleport) { to: "body", ... }` 被
    错解析成垃圾 `<div>` 子节点（含 `<div>body</div>`）。规避：ext 包
    一个固定 `to="body"` 的函数式组件（BodyTeleport），经 dyn 渲染，
    挂载 DOM 与 `<Teleport to="body">` 一致。
28. **computed 体为「指向 import 常量的 dot-ref」时被误推断为
    `computed<number>`**：`accents => .THEME_ACCENTS` 经名字启发式
    （非 is_/has_ 前缀 → number）发射 `computed<number>(() => THEME_ACCENTS)`，
    TS2769。规避：ext 提供零参函数，`accents => themeAccents()`（Call 体
    发射 `computed<any>`，backlinks current_title 先例）。
29. **循环变量不能命名 `task`**：与 `link`（gap 18）同类，`task` 是
    DSL 关键字 token，`for task in ...` 报 "Expected term, got
    RBrace"（报错位置在循环收尾处）。换名（tk 已验证）。

### Phase 5.1 batch 2 新验证能力（非限制，之前未用过）

- **子组件事件监听**：`ThemePopover { open: .theme_open, onclose: .CloseTheme }`
  → `@close="CloseTheme"`（未知 onxxx 键剥离 `on` 前缀）；子 widget 的
  自动 `emit('Close', e)` 与父侧 `@close`（编译为 onClose）匹配——子向
  父的 emit 通道就此打通，无需手写 wrapper。
- **quoted-key style map**：`style: { "text-primary bg-primary/10": item.active }`
  → `:class="{ 'text-primary bg-primary/10': item.active }"`，与原件的
  `:class` 对象形式逐字一致（条件必须是字段访问，Call 会 emit null）。
- **v-model 折叠**：`value: .query` + `oninput: .QueryInput($event)` →
  `v-model="query"`（editor README CodeBlockMenu note 3 的 jade 首用）；
  handler 发射但不被调用。
- **model var 存函数 + let-bind 调用**：`.Init` 里
  `.debounced_search = useDebounceFn(run, 250)`（Array<str>=any 占位），
  watch/handler 里 `let f = .debounced_search` 后 `f()`（TableMenu
  let-bind 先例），debounce 语义与原件 useDebounceFn 一致。
- **无 view 事件的 widget 可省略 msg/on 块**（StatusBar：全部逻辑在
  watch + computed）。

### 生成产物与原手写 SFC 的细微差异（面板批次，DOM 行为等价）

- v-if 分支包在透明 `<template>` 里；文本多一层内联 `<span>`；
  v-for 无 `:key`；`==`/`===` 差异；ul/li 经 `<component :is="'ul'">`
  渲染为真标签；`title`/`type` 静态属性以绑定形式发射
  （`:title="'...'"`）；PascalCase 组件带自动 `:key`；HtmlDiv 的 class
  以 `:class="'...'"` 传入。

### Phase 5.1 batch 3 新增限制（WorkspaceOpener / CreatePagePrompt /
### AppShell / LeftSidebar / RightSidebar / TabStrip 实证）

30. **子元素之间的逗号产生垃圾 `<div />`**：view 块里在子节点（元素 /
    text / if / for / dyn）之后写逗号（prop 列表习惯误带），会在该位置
    静默多发射一个空 `<div />` 间隔元素，且无任何告警。规则：props
    之间用逗号；兄弟子节点之间一律不用逗号。生成后 grep `<div />`
    即可检出。
31. **`code` 不是 DSL 元素**：`code { class: ... }` 静默降级为 `<div>`
    （保留 class、丢失 UA monospace 样式）。经 ext 函数式组件
    （CodeTag，`h('code', { class: props.class }, slots)`）+ dyn 渲染
    真实标签（BodyTeleport slot 先例；class 以 props.class 传入）。
    本批验证的元素表：`aside`/`main`/`nav`/`h1`/`h3`/`p`/`input`/
    `button` 为已知元素；`svg` 不是（inline SVG 走 ext 函数式组件 +
    innerHTML）。
32. **gen 工程 dual-resolution 差一层（双重 src）**：jade 的 `auto/`
    直接挂在 `front/` 下（editor 包挂在 `editor/src/` 下），ext 里的
    `../../../../src/...` 在 front 树 4 层上溯到 `front/` 后接 `src/`
    正好命中真模块；而 gen 树的 ext 副本位于
    `gen/front/vue/src/ext/src/front/utils/`，4 层上溯已到 gen 的
    `src/`，再接 `src/` 变成 `src/src/...` → vue-tsc TS2307 全灭
    （batch 1/2 的所有 ext 同样失败——当时 gen 脚手架 build 失败被
    SFC 已先行发射的事实掩盖，未被发现）。规避：stub 镜像额外复制到
    `gen/front/vue/src/src/{lib,stores,components}`（见上文重新生成
    流程）。另注：gen strict 模式下 ext 回调参数需显式标注
    （unlinked_references_panel_ext 的 `(r: any)`，本批顺手修复）。
33. **view-if 条件支持比较/取反表达式**（本批探针实证）：
    `if .x != ""`、`if !.flag`、`if .panel == "files"`（含 composable
    字段访问 `.sidebarStore.leftOpen`）均发射正确的 v-if；不再需要为
    每个条件预声明 computed——但跨库调用/可选链仍走 ext（gap 28）。
34. **保留字 token 再加一例**：computed/变量不要命名 `path`（SVG path
    元素 token，与 gap 18 `link`、gap 29 `task` 同类）——改用
    page_path。
35. **属性字符串里的字面反斜杠**：原 SFC 模板属性是原始文本
    （`placeholder="...D:\\wiki\\demo"` 的两个 `\` 字面上屏），.at
    字符串 `\\` 会转义成单字符——保持 DOM 逐字一致需写四倍反斜杠
    （`D:\\\\wiki\\\\demo`）。
36. **父侧监听子组件 v-model 参数事件**：`Child(open: .flag) { on
    "update:open": .Changed }` → `:open="flag" @update:open="Changed"`，
    即 `v-model:open` 的脱糖（example 034-vmodel 模式，AppShell 的
    FlashcardModal 实证）。

### Phase 5.1 batch 3 新验证能力（非限制，之前未用过）

- **`.Init` / `.Destroy`** → onMounted / onUnmounted（editor 包先例，
  jade 首用于 AppShell 的启动引导与 window 事件注销）。
- **`onclick.self:`** → `@click.self`、**`onkeydown.enter:`** →
  `@keydown.enter`（修饰符原样透传；CreatePagePrompt 的
  click.self=emit('cancel')、WorkspaceOpener 的回车提交实证）。
- **`disabled: .busy`** → `:disabled="busy"`（布尔 attr 绑定）。
- **handler 内 promise `.finally(() => {...})`**：复刻原件
  try/finally 的 busy 复位且 rejection 继续传播（WorkspaceOpener）。
- **闭包实参回写 model**：ext 异步函数收 `v => { .path = v }` 闭包
  （chooseDirectory 的目录名回写；search_panel let-closure 先例的
  推广）。
- **widget 根节点即条件分支**：view 顶层直接 `if .open { div {...} }`
  发射 `<template v-if>` 包裹的 fragment 根（CreatePagePrompt/
  LeftSidebar/TabStrip 实证）。
- **`style_obj: { width: .computed }`** → `:style="{ width: c }"`
  （LeftSidebar 的 `:style="{ width: '${w}px' }"`）。

### Phase 5.2 batch 4 新增限制（FlashcardModal / PropertiesPanel /
### GraphControls / CommandPalette / QuickSwitcher 实证）

37. **view 事件实参不能写字面量；handler 多参数只有第一个进作用域**：
    `onclick.self: ."update:open"(false)` 解析失败（"Expected term,
    got RBrace"，报错位在 view 收尾 `}`，具有迷惑性）；`.Handler(a, e)`
    双参数 handler 编译期报 UndefinedVariable（只点后一个参数的名，
    报错 span 错位到附近注释/语句）。规避：view 侧传单个 map 实参
    `.Handler({ entry: entry, evt: $event })`（map 字面量实参实证
    可用），handler 声明 `.Handler(args) -> { args.entry.x = ... }`。
38. **无 class 的表单元素被映射为 shadcn 组件**：`input`/`button`/
    `textarea`/`checkbox` 仅当带 class/style prop 时才 force_native；
    无 class 的 `input (type: "range")` 变成 `<Input type="range">`
    （min/max/step/value 全部丢失，事件改接 @update:modelValue）。
    `select`/`option` **无论有无 class** 都映射为 shadcn Select。
    规避：select/option 用 dyn + 字符串标签（ul/li 先例）；range
    输入用 ext 函数式组件（RangeInput = `h('input', {...})`——dyn
    块上 `type:` 是关键字 token 会错解析，gap 27 同类）。
39. **带索引 v-for 内 PascalCase 组件的自动 :key 是 `idx?.id`**：
    `for idx, item in ...`（DSL 索引在前，Vue 发射值在前）里嵌
    PascalCase 组件时 key 用索引变量，`idx?.id` 对 number 报
    TS2339。规避：索引作为展示字段挂在 item 上（ext mapper 加
    `idx`），循环用无索引形式，handler 传 `entry.idx`。
40. **model var 的 watch 体内不要再写 `.value`**：watch 体里 `.x`
    （model var）已展开为 `x.value`，写 `.x.value` 变成
    `x.value.value`（TS2339）。computed 作 watch 源时相反，需要
    `.c.value`（flashcard is_open 实证）——按 watch 源种类区分。
41. **quoted v-model emit 的 payload 是 handler 形参原样转发**：
    `msg Msg { "update:open"(bool) }` + handler 的 auto-emit 在体
    之后执行 `emit('update:open', v)`；view 无参接线时 v 是 DOM
    事件对象。要发固定值，在 handler 体内给形参重新赋值
    （`v = false`；FlashcardModal 的 click.self 关闭实证）。
42. **codegen 总追加空 `<style>` 块，无法表达 scoped style**：
    GraphControls 原件的 `<style scoped>` 无 DSL 形式。规避：样式
    块原文存 `src/front/<name>.styleblock`，regen 流程在 sed 拷贝
    后 `cat` 追加（class 钩子不变，scoped data-v 选择器对生成模板
    同样生效，含子组件根元素）。

### Phase 5.2 batch 4 新验证能力（非限制，之前未用过）

- **map 字面量作 view 事件实参**：`oninput: .H({ entry: entry,
  evt: $event })` → `@input="H({ entry: entry, evt: $event })"`
  （gap 37 多参数 handler 的标准规避）。
- **key+prevent 修饰符组合**：`onkeydown.enter.prevent:` /
  `.down.prevent` / `.up.prevent` → `@keydown.enter.prevent` 等，
  与原 onKeydown 内逐 key preventDefault 分支逐字等价（palette /
  switcher 的键盘导航实证）。
- **`onmouseenter:`** → `@mouseenter`；**`checked:`** → `:checked`
  （checkbox 双向的显式形式）。
- **ext 函数式组件上的事件接线**：`RangeInput (..., oninput: .H)` →
  `@input="H"` → onInput prop，函数式组件内挂为原生 DOM 监听。
- **`h4`/`label` 是已知元素**；**watch 源为 computed 时发射
  `watch(c, ...)` 且体内 `.c.value` 正确**；**view-if 直接支持
  `.graphStore.centerPath` 这类 composable 字段真值判断**。

### MainArea 的处置（batch 3 决策记录）

MainArea 未整体翻译。其 tab strip 抽为新 widget `tab_strip.at` →
`front/src/components/TabStrip.vue`（新文件）；MainArea.vue 手工精简为
只保留 body（EditorTab 的 v-for+v-show keep-alive、GraphPage /
WhiteboardPage 的按需挂载与空态），并挂载 `<TabStrip />`——消费方
（AppShell）零改动。整体翻译推迟到 Phase 5.3，原因：

1. DSL 对 PascalCase 组件的 v-for 自动 `:key` 是
   `'EditorTab-1-' + (tab?.id ?? tab)`——Tab 无 `id` 字段，所有
   EditorTab 将共享一个常量 key，直接破坏 e2e 03-tabs 守卫的 per-tab
   实例身份（v-show keep-alive 契约）。
2. GraphPage / WhiteboardPage 依赖 `:key="path"` 在活动 tab 切换时强制
   重挂载（Cytoscape 需要全新容器）；自动常量 key 会静默改变该行为。
