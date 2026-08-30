# jade-garden / front

Vue 3 + Vite 前端（AutoLang 生成组件 + 手写 store facade，见 `auto/README.md`）。

## 依赖形态：@autodown/engine（plan 027）

- **dev / e2e 吃源**：vite serve 经 engine exports 的 `development` 条件直连
  `autodown/packages/engine/src`（`resolve.conditions` 仅 serve 生效 +
  `optimizeDeps.exclude`），engine 源码改动即时生效，无需重建 dist。
- **build 吃 dist + 卫兵**：production build 走 `import` 条件消费 engine
  dist；`prebuild` 与 `e2e-prepare` 前置 `assert-dist-fresh.mjs`——src/auto
  内容 hash 与 `dist/.dist-stamp` 不符即拦截，按提示执行
  `pnpm --filter @autodown/engine build` 重建后重试。
