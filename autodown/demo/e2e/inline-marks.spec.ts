// Inline marks e2e (plan 024 P2T4) — the rich host, pinned on the real DOM:
// focusing a marked-up paragraph renders inline elements; Ctrl+B wraps
// in-place (browser contenteditable bold); blur writes the structure back
// (preview + serialize roundtrip through the live right pane). IME smoke:
// typing CJK commits through the input-diff protocol.

import { test, expect } from '@playwright/test'

/** Select `len` chars starting at the first occurrence of `needle` inside the
 *  focused rich host, and focus the host. */
async function selectInHost(page: import('@playwright/test').Page, needle: string, len: number): Promise<void> {
  await page.evaluate(
    ({ needle, len }) => {
      const host = document.querySelector('.left .autodown-block-host') as HTMLElement | null
      if (!host) throw new Error('no focused rich host')
      host.focus()
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        const idx = (node.textContent ?? '').indexOf(needle)
        if (idx >= 0) {
          const range = document.createRange()
          range.setStart(node, idx)
          range.setEnd(node, idx + len)
          const sel = window.getSelection()
          sel?.removeAllRanges()
          sel?.addRange(range)
          return
        }
      }
      throw new Error(`needle not found in host: ${needle}`)
    },
    { needle, len },
  )
}

test('rich host renders marks inline, Ctrl+B writes back through blur', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id]', { timeout: 10000 })

  // focus the marked-up paragraph (initially a preview slot)
  await page.locator('.left [data-node-type="Paragraph"]').first().click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()
  // the mount render is RICH: existing marks become inline elements
  await expect(host.locator('strong')).toHaveText('bold')
  await expect(host.locator('em')).toHaveText('italic')
  await expect(host.locator('code')).toHaveText('inline code')
  await expect(host.locator('a[href="https://example.com"]')).toHaveText('link')

  // bold "This is" in place (browser contenteditable bold → <b>)
  await selectInHost(page, 'This is', 7)
  await page.keyboard.press('Control+b')

  // blur via the Save button — it sits OUTSIDE the views list, so the click
  // survives the writeback repaint (a click aimed at a preview block gets
  // swallowed when the blur writeback replaces it mid-gesture; see plan
  // 待澄清). The writeback serializes into the live right pane.
  await page.locator('.autodown-editor-save').click()
  await page.waitForTimeout(300)
  await expect(page.locator('.right [data-block-slot-id="block-1"] strong').first()).toHaveText('This is')
  await expect(page.locator('.right [data-block-slot-id="block-1"] strong').nth(1)).toHaveText('bold')

  // focus leave: the second click lands (no pending writeback anymore) and
  // the paragraph re-renders as a preview slot from the model
  await page.locator('.left [data-node-type="Heading"]').first().click()
  await page.waitForTimeout(300)
  const leftPara = page.locator('.left [data-node-type="Paragraph"]').first()
  await expect(leftPara.locator('strong').first()).toHaveText('This is')
  expect(await leftPara.innerHTML()).not.toContain('data-autodown-link') // preview pipeline, not the host
})

test('IME smoke: typing CJK in the rich host commits through the diff protocol', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id]', { timeout: 10000 })

  await page.locator('.left [data-node-type="Paragraph"]').first().click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()
  await host.click()
  await page.keyboard.press('End')
  await page.keyboard.type('你好世界')
  await expect(host).toContainText('你好世界')

  await page.locator('.left [data-node-type="Heading"]').first().click()
  await page.waitForTimeout(300)
  const right = await page.locator('.right .streaming-document').innerHTML()
  expect(right).toContain('你好世界')
})
