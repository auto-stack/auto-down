import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

test.describe('graph view', () => {
  test('ribbon button opens graph tab and mounts cytoscape canvas', async ({ page }) => {
    await openApp(page)

    await page.locator('button[title="全局图谱"]').click()

    // Graph tab becomes active.
    await expect(page.locator('button', { hasText: '全局图谱' }).first()).toBeVisible()

    // Cytoscape mounts canvas elements inside .graph-view.
    await expect(page.locator('.graph-view canvas').first()).toBeVisible({ timeout: 20_000 })

    // Graph sidebar shows stats; fixture has 6 wiki pages.
    const pages = page.locator('.stat-card', { hasText: '页面' }).locator('.stat-value')
    await expect(pages).toBeVisible()
    expect(Number(await pages.innerText())).toBeGreaterThanOrEqual(5)
  })
})
