import fs from 'node:fs'
import { request } from '@playwright/test'
import { BACKEND_EXE, BACKEND_URL, MANAGED_BACKEND, WORKSPACE_ROOT } from './runtime'

export default async function globalSetup() {
  // PLAN-983 C0-B：外部后端（AV 服务/CLI 服务）已由调用方启动，本 setup 只
  // 验证 `/api/workspace` 真的可用且带着 fixture 工作区；不 spawn、不 POST
  // `/open`（C0 的 AV 源只读，`/open` 不在本切片）。
  if (!MANAGED_BACKEND) {
    const ctx = await request.newContext()
    try {
      const res = await ctx.get(`${BACKEND_URL}/api/workspace`)
      if (!res.ok()) {
        throw new Error(
          `[e2e] external backend /api/workspace returned ${res.status()} (${BACKEND_URL})`,
        )
      }
      const info = (await res.json()) as { root: string | null }
      if (!info.root) {
        throw new Error(
          '[e2e] external backend has no workspace root; start it with JADE_GARDEN_DEFAULT_WORKSPACE=' +
            WORKSPACE_ROOT,
        )
      }
    } finally {
      await ctx.dispose()
    }
    return
  }

  if (!fs.existsSync(BACKEND_EXE)) {
    throw new Error(
      `[e2e] ${BACKEND_EXE} missing. Run via \`pnpm test:e2e\` (the pretest:e2e hook prepares the runtime).`,
    )
  }

  const ctx = await request.newContext()
  try {
    const res = await ctx.get(`${BACKEND_URL}/api/workspace`)
    if (!res.ok()) throw new Error(`[e2e] backend /api/workspace returned ${res.status()}`)
    const info = (await res.json()) as { root: string | null }
    if (!info.root) {
      const open = await ctx.post(`${BACKEND_URL}/api/workspace/open`, {
        data: { root: WORKSPACE_ROOT },
      })
      if (!open.ok()) {
        throw new Error(`[e2e] failed to open fixture workspace: ${await open.text()}`)
      }
    }
  } finally {
    await ctx.dispose()
  }
}
