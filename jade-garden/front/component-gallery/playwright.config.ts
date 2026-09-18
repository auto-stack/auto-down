import { defineConfig } from '@playwright/test'

// playwright.config.ts — gallery vue 臂 gate（PLAN-072 T-02）。
// 08-screenshots 模式同款：toHaveScreenshot 基线（e2e/baselines/），
// maxDiffPixelRatio 与 front 对齐（0.02）。
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['list']],
  snapshotPathTemplate: '{testDir}/baselines/{arg}{ext}',
  use: {
    viewport: { width: 800, height: 400 },
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.02,
    },
  },
})
