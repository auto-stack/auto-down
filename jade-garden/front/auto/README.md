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

```sh
cd jade-garden/front/auto
# gen 侧 stub 镜像必须先于 auto build（gen 的 vue-tsc 会检查 store 产物）
mkdir -p gen/front/vue/src/lib
cp stubs/gen_lib_api.ts gen/front/vue/src/lib/api.ts
D:/autostack/auto-lang/target/debug/auto.exe build -d .
# 拷贝 + sed 改写 '@/lib/api' → 真实扩展模块（相对路径）
sed 's|@/lib/api|../../../auto/src/front/utils/tabs_store_ext|g' \
  gen/front/vue/src/stores/useTabsStore.ts > ../src/stores/auto/useTabsStore.ts
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
