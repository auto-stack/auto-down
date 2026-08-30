// Container editing e2e (plan 025 P2T1) — list/blockquote editing pinned on
// the real DOM: click into a list item edits the nested paragraph in place
// (focus-path assembly); Enter splits items / exits empty items; Tab /
// Shift+Tab indent and outdent; the "> " input rule wraps a blockquote with
// a clean marker consumption; scroll sync survives the nested data-block-id
// geometry. Demo document (content.ts) carries the list under test:
// "- Bullet item one / - Bullet item two / - Nested bullet A / - B".

import { test, expect, type Locator, type Page } from '@playwright/test'

/** Click into the `n`-th list item's paragraph and wait for its in-place
 *  host. The first click expands the (possibly still preview) list — a
 *  preview container click resolves to its first item — and the direct
 *  re-click lands on the item's own deeply-addressable paragraph text even
 *  mid-writeback-repaint (025's stable assembly shell keeps slot DOM
 *  identity; plan 028 P1 removed the old Save-button detour). */
async function focusListItem(page: Page, n: number): Promise<Locator> {
  const text = n === 0 ? 'Bullet item one' : 'Bullet item two'
  const target = page.locator('.left').getByText(text, { exact: true }).first()
  await target.scrollIntoViewIfNeeded()
  await target.click()
  if (n > 0) {
    await page.waitForTimeout(250)
    await target.click()
  }
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()
  await expect(host).toHaveText(new RegExp(`Bullet item ${n === 0 ? 'one' : 'two'}`))
  return host
}

/** Blur by directly clicking the Heading block and let the change serialize
 *  to the right pane — the direct click survives the writeback repaint (025
 *  stable shell; plan 028 P1 removed the Save-button detour). */
async function commitToRightPane(page: Page): Promise<void> {
  await page.locator('.left [data-node-type="Heading"]').first().click()
  await page.waitForTimeout(300)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 10000 })
})

test('clicking a list item edits the nested paragraph in place', async ({ page }) => {
  const host = await focusListItem(page, 1)
  await expect(host).toHaveText(/Bullet item two/)
  // sibling branches stay preview: item one and the nested bullets render
  // from the preview pipeline inside the same expanded list
  await expect(page.locator('.left .list-item').first()).toContainText('Bullet item one')
  await page.keyboard.type(' edited')
  await commitToRightPane(page)
  await expect(page.locator('.right .list-item', { hasText: 'Bullet item two edited' })).toBeVisible()
})

test('Enter splits the item; Enter on the empty item exits the list', async ({ page }) => {
  const host = await focusListItem(page, 0)
  await expect(host).toHaveText(/Bullet item one/)
  await page.keyboard.press('Enter') // caret at end → empty continuation item
  const host2 = page.locator('.left .autodown-block-host')
  await expect(host2).toHaveText('')
  await page.keyboard.type('second item')
  await commitToRightPane(page)
  const items = page.locator('.right .list-item')
  await expect(items.nth(0)).toContainText('Bullet item one')
  await expect(items.nth(1)).toContainText('second item')
  await expect(items.nth(2)).toContainText('Bullet item two')

  // Enter again on the (freshly emptied) item exits the list structure
  await page.locator('.left .autodown-block-host').click()
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+End')
  await page.keyboard.press('Backspace') // empty the item text
  await page.keyboard.press('Enter') // empty item → exit
  await expect(page.locator('.left .list-item .autodown-block-host')).toHaveCount(0)
  await expect(page.locator('.left .autodown-block-host')).toBeVisible()
})

test('Tab indents the item under the previous one; Shift+Tab outdents; Tab round-trips', async ({ page }) => {
  const host = await focusListItem(page, 1)
  await expect(host).toHaveText(/Bullet item two/)

  await page.keyboard.press('Tab')
  await commitToRightPane(page)
  // item two now nests under item one (and keeps its own nested bullets)
  const outer = page.locator('.right .list-item').first()
  await expect(outer).toContainText('Bullet item one')
  await expect(outer.locator('.list-item').first()).toContainText('Bullet item two')

  // re-focus the (possibly remounted) host, then outdent
  await page.locator('.left .autodown-block-host').click()
  await page.keyboard.press('Shift+Tab')
  await commitToRightPane(page)
  await expect(page.locator('.right .list-item').nth(1)).toContainText('Bullet item two')

  // indenting again restores the nesting (engine-level one-step undo is
  // pinned by the headless list-commands suite; the UI has no Ctrl+Z wiring)
  await page.locator('.left .autodown-block-host').click()
  await page.keyboard.press('Tab')
  await commitToRightPane(page)
  await expect(
    page.locator('.right .list-item').first().locator('.list-item').first()
  ).toContainText('Bullet item two')
})

test('"> " input rule wraps a blockquote and consumes the marker cleanly', async ({ page }) => {
  const host = await focusListItem(page, 0)
  await expect(host).toHaveText(/Bullet item one/)
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+End')
  await page.keyboard.type('> ')
  // the rule fired: the same host now lives inside an expanded blockquote
  // with the marker consumed (DOM resync — no '> ' leaks into the model)
  const wrapped = page.locator('.left .autodown-block-host')
  await expect(wrapped).toHaveText('')
  // the same host now lives inside an expanded blockquote (in the item)
  await expect(page.locator('.left blockquote .autodown-block-host')).toBeVisible()
  await page.keyboard.type('quoted note')
  await commitToRightPane(page)
  await expect(page.locator('.right blockquote', { hasText: 'quoted note' })).toBeVisible()
})

test('scroll sync keeps working with nested list blocks', async ({ page }) => {
  // focus deep into the list so the editor side carries nested
  // data-block-id geometry, then drag the custom scrollbar like the
  // scroll-sync spec does — both panes must move together
  await focusListItem(page, 0)
  const workspace = page.locator('.workspace')
  await page.mouse.move(0, 0)
  const box = await workspace.boundingBox()
  expect(box).toBeTruthy()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.waitForTimeout(100)
  const thumb = page.locator('.custom-scrollbar-thumb')
  const thumbBox = await thumb.boundingBox()
  expect(thumbBox).toBeTruthy()
  await page.mouse.move(thumbBox!.x + thumbBox!.width / 2, thumbBox!.y + thumbBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(thumbBox!.x + thumbBox!.width / 2, thumbBox!.y + thumbBox!.height / 2 + 120)
  await page.mouse.up()
  await page.waitForTimeout(150)
  const leftTop = await page.locator('.left .autodown-editor-content-wrapper').evaluate((el) => el.scrollTop)
  const rightTop = await page.locator('.right .streaming-document').evaluate((el) => el.scrollTop)
  expect(leftTop).toBeGreaterThan(0)
  expect(rightTop).toBeGreaterThan(0)
})
