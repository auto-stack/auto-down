# 078 VM map 括号写 bug 复现包（handoff → auto-lang VM 侧修复）

> 产出：PLAN-078 T-00 终裁调查（用户 Q-3 判定：疑似 VM 实现问题，落最小
> 用例交 auto-lang 修复）。编译器基线：v0.4.2-1378-g0c6b03fd3（master 同
> 源 debug exe）。

## 1. 复现结论（probe/ 目录，drive.mjs 实录）

- **预期**：按 `DoIt` 后 `count=1`、`readback="2"`（vue 轨语义，T-00 探针
  SFC 实文发射 `settings.value[args.key] = args.value` 执行正确）。
- **实际（VM 轨 `auto run -r vm`）**：handler 在 `.m["b"] = 2` 处中止——

```
[VM-HANDLER] App.DoIt failed: VM error: RuntimeError("Invalid array ID: 4000000") (crash ip=0x1a in handler_App_DoIt)
count -> 0   readback -> "init"   （写后语句全部未执行）
```

- `4000000` = map 堆对象 tag 位（OBJECT tag）；字面量键与 var 键同病
  （T-00 isolation B/D 两形态），错误被 VM-HANDLER 捕获后仅日志、UI 无
  感——**静默吞 handler**。

## 2. 根因（静态定位，file:line）

DSL `m[k] = v`（Expr::Index 赋值目标，parser 支持在案）双臂不对称：

- **读** `m[k]`：codegen.rs:3405 对 map 目标有专门路由——发
  `CALL_NAT auto.hashmap.get`（native.rs:294 注册族）→ 读正常（T-00
  isolation G 实证 readback=20）。
- **写** `m[k] = v`：codegen.rs:6942（`Expr::Index` 赋值臂）**无条件发
  `SET_ELEM`**；engine.rs:5475 `OpCode::SET_ELEM` 只 downcast
  `ListData<Value>`（数组）→ map 堆对象落空 → `Err("Invalid array ID")`
  → handler 中止。

即：map 括号写= **codegen 缺 map→native 路由 + engine SET_ELEM 缺 map 臂**
的组合缺口。 neighboring 事实：`auto.hashmap.set`
（NATIVE_HASHMAP_INSERT_STR，native.rs:294）**已存在**，仅未被该路径消费。

## 3. 修复建议（供 auto-lang 侧裁定）

- 方案 i（codegen 侧）：index-assign 臂识别 map 型容器（静态类型
  `map`/ObjectData）→ 发 `CALL_NAT auto.hashmap.set`（push map_id, key,
  value），与读侧 `auto.hashmap.get` 对称。
- 方案 ii（engine 侧）：SET_ELEM 加 ObjectData/HashMap 臂。
- 无论何案：**补回归测试**（本包 probe/ 即最小用例：DoIt 后 count=1 +
  readback="2"）+ vue 轨零回归（发射面已正确）。
- 修复前作业纪律（已录 074-sink-mode.md §7.0 P-11）：VM 轨禁 map 括号
  写（点号写/全量字面量重赋/msg→msg 链均可用）。

## 4. probe/ 目录

- `pac.at` + `src/front/app.at` — 最小复现工程（按钮 + map 写 + 计数）。
- `drive.mjs` — MCP 驱动（press DoIt → state 断言），实录见 §1。
- gen/ 与 node_modules 不入库（gitignored 域）；VM 轨无需 npm 依赖。
