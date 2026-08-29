import { defineConfig } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BACKEND_EXE,
  BACKEND_PORT,
  BACKEND_URL,
  FRONTEND_PORT,
  FRONTEND_URL,
  RUNTIME_DIR,
  WORKSPACE_ROOT,
} from './e2e/runtime'

const frontDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  // Shared backend + shared fixture workspace: tests must run serially.
  workers: 1,
  retries: 1,
  timeout: 60_000,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: FRONTEND_URL,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      // Copied cargo binary (see scripts/e2e-prepare.mjs). Its config file
      // lives next to the exe inside .runtime/, fully isolated from dev runs.
      command: `"${BACKEND_EXE}"`,
      cwd: RUNTIME_DIR,
      env: {
        JADE_GARDEN_PORT: String(BACKEND_PORT),
        JADE_GARDEN_DEFAULT_WORKSPACE: WORKSPACE_ROOT,
        // Plan 022 Phase 3: setting JADE_GARDEN_SERVER=vm on the
        // playwright invocation switches the backend onto the AutoVM
        // serve path (same binary, same routes).
        ...(process.env.JADE_GARDEN_SERVER
          ? { JADE_GARDEN_SERVER: process.env.JADE_GARDEN_SERVER }
          : {}),
      },
      url: `${BACKEND_URL}/api/workspace`,
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      command: `node node_modules/vite/bin/vite.js --port ${FRONTEND_PORT} --strictPort --host 127.0.0.1`,
      cwd: frontDir,
      env: {
        AUTO_HTTP_PROXY: BACKEND_URL,
      },
      url: FRONTEND_URL,
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
})
