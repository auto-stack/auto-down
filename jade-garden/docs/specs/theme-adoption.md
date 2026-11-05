# 主题接入（theme-adoption）— jade-garden（auto-down 嵌套 front/auto）

> 来源：auto-os/PLAN-061（主合同）。宿主策略定义见 OS
> `docs/specs/shell/host-theme-policy-and-delivery.md`；批次登记见 OS
> `docs/specs/apps/product-theme-batch-061.md`。本页只记本产品的实际表面
> 与合法固定值，不重复宿主机制。

## 接入形态（2026-11-05，PLAN-061 T-03）——构建链静态投影

本产品为手写 Vue facade（front/src）+ Auto 生成组件镜像（front/auto），
消费形态与其余四产品（运行时注册）不同：

- `front/auto/vendor/themes`：固定版本快照（themes 0.2.0，内容 digest
  `9fa07742dc68aa5377ae06cb2d966386002063f184c515b6c5dddf8a6bef838e`）。
- `front/auto/pac.at`：`dep themes { path: "vendor/themes" }`；占位根
  app.at：`use themes.themes: Auto` + `design { theme: "Auto", mode: "dark" }`
  （构建投影取值源，占位根不部署）。
- **投影链**：`auto build -d .` → 生成 `gen/front/vue/src/assets/index.css`
  四块（Auto light/dark core+sidebar 官方值；`.theme-inputs.json` receipt
  = 消费凭证）→ 部署面 `front/src/assets/index.css` 的 `:root`/`.dark`
  核心 role 变量取投影值（再生流程：重跑构建并同步两变量块）。

## 保留层（品牌 overlay 与业务）

- `.theme-<accent>` 品牌 accent 预设（indigo/emerald/rose/amber/slate，
  覆写 primary/ring；默认 theme-indigo 238 55% 58% = 品牌紫）：品牌身份
  overlay，类级联于官方族之上。
- `--af-*` 语义别名与 `--af-success/warning/error/info` 状态色：app 自有
  语义面（级联官方变量）。
- 模式业务（`.dark` 类 + ThemePopover + localStorage + matchMedia 初始）：
  原业务全保留，真实 popover 驱动实测。

## 边界（具名，非缺陷遮蔽）

静态投影单族（Auto）——第二族（Solarized）需运行时切换通道
（`__AUTO_TREE_THEMES__`/主题 JS），本批不新增业务。owner=auto-ui 投影
扩展 / jade-garden 运行时消费。

## 主题腿实录（front/tests/test_061_theme.mjs，5 腿）

A dark boot 官方值（--background 240 10% 4% CSS var 读回）/ B 真 popover
翻转 light + 品牌 overlay + localStorage 持久化 / C 单族边界负向对照 /
D 开档+键入跨模式翻转守恒 / E reload 持久化。原门 `pnpm test:e2e`
24/24 全绿（官方投影在场）。
