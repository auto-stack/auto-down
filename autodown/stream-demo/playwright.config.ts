import { defineConfig, devices } from '@playwright/test'

// PLAN-051 T8: stream-demo 对拍 e2e（view≡stream 自动门）。端口可让位
// （demo 轨 5173 常驻）：E2E_PORT=5288 pnpm test。
const port = Number(process.env.E2E_PORT || 5288)
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.E2E_PORT,
  },
})
