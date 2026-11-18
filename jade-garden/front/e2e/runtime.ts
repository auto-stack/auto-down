import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Shared constants for the E2E suite. Imported by playwright.config.ts,
// global-setup.ts and the specs.
const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const BACKEND_PORT = 18181
export const FRONTEND_PORT = 13100
// PLAN-983 C0-B：可指向**外部已启动**的真实后端（AV 直连服务或 982 CLI
// 启动的服务），从而验证页面消费真实 `/api/workspace` 响应而不是被拦截的
// stub。未设置时维持原有"playwright 自起 jade-garden-back.exe"形态。
export const EXTERNAL_BACKEND_URL = process.env.JADE_E2E_BACKEND_URL ?? ''
export const MANAGED_BACKEND = EXTERNAL_BACKEND_URL === ''
export const BACKEND_URL = EXTERNAL_BACKEND_URL || `http://127.0.0.1:${BACKEND_PORT}`
export const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`

export const RUNTIME_DIR = path.join(frontDir, 'e2e', '.runtime')
// Forward slashes: the Rust backend canonicalizes either form on Windows.
export const WORKSPACE_ROOT = path.join(RUNTIME_DIR, 'workspace').replace(/\\/g, '/')
export const BACKEND_EXE = path.join(RUNTIME_DIR, 'jade-garden-back.exe')
