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
  src/auto/README.md for the mechanism)
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
