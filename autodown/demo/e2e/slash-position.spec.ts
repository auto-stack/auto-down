// SlashMenu caret positioning e2e (plan 028 P3T1) — the menu must open at
// the CARET's coordinate band (view.coordsAtPos over the focused rich host),
// not at the floating default position it fell back to when the adapter had
// no coordsAtPos face (021-F5).

import { test, expect } from '@playwright/test'

test('slash menu opens at the caret band, not the default corner', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id]', { timeout: 10000 })

  // focus the SECOND block (paragraph, below the heading) and trigger the
  // slash menu by typing " /" at the end of its text
  await page.locator('.left [data-node-type="Paragraph"]').first().click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()
  await page.keyboard.press('End')
  await page.keyboard.type(' /')
  const menu = page.locator('.autodown-slash-menu')
  await expect(menu).toBeVisible()
  await page.waitForTimeout(150) // two-stage: hidden → measured → visible

  const band = await page.evaluate(() => {
    const host = document.querySelector('.left .autodown-block-host') as HTMLElement
    const menu = document.querySelector('.autodown-slash-menu') as HTMLElement
    const content = document.querySelector('.left .autodown-editor-content') as HTMLElement
    const h = host.getBoundingClientRect()
    const m = menu.getBoundingClientRect()
    const c = content.getBoundingClientRect()
    return { hostTop: h.top, hostBottom: h.bottom, menuTop: m.top, menuLeft: m.left, contentTop: c.top, contentLeft: c.left }
  })
  // the menu floats in the caret's vertical band (just below the host's last
  // line), NOT at the content area's top-left default corner
  expect(band.menuTop).toBeGreaterThanOrEqual(band.hostTop - 8)
  expect(band.menuTop).toBeLessThanOrEqual(band.hostBottom + 24)
  expect(band.menuTop - band.contentTop).toBeGreaterThan(24) // below the first line of content
  expect(band.menuLeft).toBeGreaterThanOrEqual(band.contentLeft - 1)
})
