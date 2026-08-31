import { test, expect } from '@playwright/test'

test('capture initial viewport screenshot', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 5000 })
  await page.waitForTimeout(1000)

  await page.screenshot({ path: 'e2e/screenshots/initial-viewport.png', fullPage: false })
  console.log('Screenshot saved to e2e/screenshots/initial-viewport.png')

  expect(true).toBe(true)
})

// plan 031 T10 — the math/mermaid typed edit faces, archived for the
// manual-verification record (029 T10 口径): focus each block so the
// source+live-preview face mounts, capture the editor pane.
test('capture math and mermaid edit-face screenshots (plan 031)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 10000 })

  const left = page.locator('.left')
  await left.locator('.autodown-math-block').first().scrollIntoViewIfNeeded()
  await left.locator('.autodown-math-block').first().click()
  await page.waitForTimeout(400)
  await expect.soft(left.locator('.autodown-math-editor .autodown-math-preview .katex')).toBeVisible()
  await left.locator('.autodown-math-editor').screenshot({ path: 'e2e/screenshots/math-edit-face.png' })

  await left.locator('.autodown-mermaid-block').first().scrollIntoViewIfNeeded()
  await left.locator('.autodown-mermaid-block').first().click()
  await page.waitForTimeout(400)
  await expect.soft(left.locator('.autodown-mermaid-editor .autodown-mermaid-preview svg')).toBeVisible({ timeout: 10000 })
  await left.locator('.autodown-mermaid-editor').screenshot({ path: 'e2e/screenshots/mermaid-edit-face.png' })
})
