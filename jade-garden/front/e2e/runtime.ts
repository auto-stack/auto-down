import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Shared constants for the E2E suite. Imported by playwright.config.ts,
// global-setup.ts and the specs.
const frontDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const BACKEND_PORT = 18181
export const FRONTEND_PORT = 13100
export const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
export const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`

export const RUNTIME_DIR = path.join(frontDir, 'e2e', '.runtime')
// Forward slashes: the Rust backend canonicalizes either form on Windows.
export const WORKSPACE_ROOT = path.join(RUNTIME_DIR, 'workspace').replace(/\\/g, '/')
export const BACKEND_EXE = path.join(RUNTIME_DIR, 'jade-garden-back.exe')
