import { defineConfig, devices } from '@playwright/test'

// PLAN-059 T8: showcase smoke e2e. Port yields to siblings (demo 5173,
// stream-demo 5288): E2E_PORT=5299 pnpm test.
const port = Number(process.env.E2E_PORT || 5299)
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
