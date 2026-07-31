import fs from 'node:fs'
import { request } from '@playwright/test'
import { BACKEND_EXE, BACKEND_URL, WORKSPACE_ROOT } from './runtime'

export default async function globalSetup() {
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
