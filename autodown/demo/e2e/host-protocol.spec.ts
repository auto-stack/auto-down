// Host protocol e2e (plan 026 P2T3) — the mounted chrome drives the engine
// through the adapter protocol on the real DOM:
// - TableMenu: clicking the table focuses its edit face and floats the menu;
//   "Add row below" goes through the chain verb (commands.ts table transform)
//   and lands in the saved markdown.
// - CodeBlockMenu: the focused fence shows the host language badge; picking a
//   language goes through the setCodeBlock({language}) IAL channel and the
//   CodeEditorBlock title bar + serialized fence follow.
// - Details: the slash manifest's Details template converts a paragraph into
//   a Details block; the preview-side node-view toggle writes the open attr
//   back through updateAttributes and it persists to the serialized markdown.

import { test, expect } from '@playwright/test'

// Blur by directly clicking the Heading block and let the change serialize
// to the right pane — the direct click survives the writeback repaint (025
// stable shell; plan 028 P1 removed the Save-button detour).
async function commitToRightPane(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('.left [data-node-type="Heading"]').first().click()
  await page.waitForTimeout(300)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 10000 })
})

test('TableEditorBlock toolbar (single table entry) adds a row that lands in the markdown', async ({ page }) => {
  // click a body cell — the preview slot click focuses the table (focus
  // stops at the table face, plan 023 semantics) and the edit face swaps in
  // with its ABSORBED toolbar (TableMenu went dormant, adjudication #1)
  const cell = page.locator('.left').getByText('Alpha', { exact: true })
  await cell.scrollIntoViewIfNeeded()
  await cell.click()
  const toolbar = page.locator('.left .te-toolbar')
  await expect(toolbar).toBeVisible()
  // the floating menu is gone — one table UI only
  await expect(page.locator('.autodown-table-menu')).toHaveCount(0)

  // header + 3 body rows before; add-row-below appends after the last row
  await expect(page.locator('.left table tr')).toHaveCount(4)
  await toolbar.locator('[data-te-action="add-row"]').click()
  await expect(page.locator('.left table tr')).toHaveCount(5)

  await commitToRightPane(page)
  await expect(page.locator('.right table tr')).toHaveCount(5)
})

test('CodeBlockMenu switches the fence language through the IAL channel', async ({ page }) => {
  // focus the javascript fence (preview slot click → CodeEditorBlock face)
  const jsCode = page.locator('.left pre[data-language="javascript"]')
  await jsCode.scrollIntoViewIfNeeded()
  await jsCode.click()
  const badge = page.locator('.left [data-codeblock-language-badge]').first()
  await expect(badge).toBeVisible()
  await expect(badge).toHaveText(/javascript/)

  await badge.click()
  const cbMenu = page.locator('.autodown-codeblock-menu')
  await expect(cbMenu).toBeVisible()
  await cbMenu.locator('.autodown-codeblock-menu-search').fill('typescript')
  await cbMenu.locator('.autodown-codeblock-menu-item', { hasText: 'TypeScript' }).first().click()

  // title bar + badge + wrapper data-language all follow the new attr
  await expect(page.locator('.left .code-header-title').first()).toContainText('typescript')
  await expect(page.locator('.left .autodown-codeblock-node').first()).toHaveAttribute('data-language', 'typescript')

  await commitToRightPane(page)
  // the demo doc also carries a native typescript fence — the converted js
  // block is the first match
  await expect(page.locator('.right pre[data-language="typescript"]').first()).toBeVisible()
  await expect(page.locator('.right pre[data-language="typescript"]').first()).toContainText("const foo")
})

test('Details: slash template mounts the node-view; toggle persists open', async ({ page }) => {
  // focus the intro paragraph and trigger the slash menu at block start.
  // The click lands at the text's top edge — the next block's boundary
  // affordance strip overlays the lower part of single-line paragraphs.
  const para = page.locator('.left').getByText('This is a paragraph', { exact: false })
  await para.scrollIntoViewIfNeeded()
  await para.click({ position: { x: 4, y: 4 } })
  await page.waitForTimeout(250)
  await page.keyboard.press('Home')
  await page.keyboard.type('/deta')
  const slash = page.locator('.autodown-slash-menu')
  await expect(slash).toBeVisible()
  await slash.locator('.autodown-slash-menu-item', { hasText: 'Details' }).first().click()

  // the paragraph became a Details block: node-view mounted, closed. The
  // demo document already carries a $details sample (plan 030), so scope to
  // the converted one by its body text.
  const details = page.locator('.left .autodown-details').filter({ hasText: 'This is a paragraph' })
  await expect(details).toBeVisible()
  await expect(details).toHaveAttribute('data-open', 'false')

  // preview-side toggle writes the open attr back through the model
  await details.locator('.autodown-details-marker').click()
  await expect(details).toHaveAttribute('data-open', 'true')

  // and it persists through serialization — since plan 030 the right pane
  // PARSES the $details dialect, so the open flag surfaces as the rendered
  // panel's data-open (not raw surface text)
  await commitToRightPane(page)
  await expect(
    page.locator('.right .autodown-details').filter({ hasText: 'This is a paragraph' })
  ).toHaveAttribute('data-open', 'true')
})
