import { test, expect } from '@playwright/test'

test('capture initial viewport screenshot', async ({ page }) => {
  await page.goto('http://localhost:5173/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 5000 })
  await page.waitForTimeout(1000)

  await page.screenshot({ path: 'e2e/screenshots/initial-viewport.png', fullPage: false })
  console.log('Screenshot saved to e2e/screenshots/initial-viewport.png')

  expect(true).toBe(true)
})
