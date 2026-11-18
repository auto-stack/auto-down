// PLAN-983 C0-B：**页面消费真实 `/api/workspace` 响应**（外部 AV 直连后端或
// 982 `auto service --server av` 启动的后端）。
//
// 与 01-workspace 的区别：本文件不拦截 `/api/workspace`，直接断言浏览器发出的
// 真实请求及其响应体；页面 shell 正常渲染且 WorkspaceOpener 不出现（root 已由
// 后端返回）。运行方式：
//   JADE_E2E_BACKEND_URL=http://127.0.0.1:<port> pnpm exec playwright test 01b
//
// 前置：外部后端以 `JADE_GARDEN_DEFAULT_WORKSPACE=<fixture workspace>` 启动
// （global-setup 会核对该变量确实产生非空 root）。
import { expect, test } from '@playwright/test'
import { BACKEND_URL, MANAGED_BACKEND } from './runtime'

test.describe('workspace real-response consumption (external AV/CLI backend)', () => {
  test.skip(
    MANAGED_BACKEND,
    'external backend mode only: set JADE_E2E_BACKEND_URL to the AV/CLI service',
  )

  test('the page consumes the real /api/workspace response', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().startsWith(`${BACKEND_URL}/api/workspace`) ||
        (response.url().includes('/api/workspace') &&
          response.request().method() === 'GET'),
    )
    await page.goto('/')
    const response = await responsePromise
    expect(response.status()).toBe(200)
    const info = (await response.json()) as {
      root: string | null
      wiki_dir: string | null
    }
    expect(info.root, 'the real backend returned a workspace root').toBeTruthy()
    // 页面 shell 真的挂载并进入主视图（不是 opener）：页面确实用了真实 root，
    // 而不是被拦截的 {"root":null,"wiki_dir":null} stub。
    await expect(page.locator('#app *').first()).toBeVisible()
    await expect(
      page.getByText('Select a file from the sidebar to open it.'),
    ).toBeVisible()
    await expect(page.locator('input[placeholder*="粘贴完整目录路径"]')).toHaveCount(0)
  })
})
