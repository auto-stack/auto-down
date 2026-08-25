import { defineConfig, devices } from '@playwright/test'

// Port is overridable so e2e can run while another dev server occupies 5173:
//   E2E_PORT=5199 pnpm test:e2e
const port = Number(process.env.E2E_PORT || 5173)
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Serial: concurrent chrome-headless-shell launches intermittently hang
  // >180s on loaded dev machines (observed 2026-08-25), while the whole
  // 9-test suite runs in ~22s with one worker.
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
