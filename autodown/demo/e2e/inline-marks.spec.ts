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

  // blur by DIRECTLY clicking the Heading — the click that triggers the
  // writeback repaint survives it (025's stable assembly shell keeps the
  // slot DOM identity; plan 028 P1 removed the old Save-button detour) —
  // and the writeback serializes into the live right pane.
  await page.locator('.left [data-node-type="Heading"]').first().click()
  await page.waitForTimeout(300)
  await expect(page.locator('.right [data-block-slot-id="block-1"] strong').first()).toHaveText('This is')
  await expect(page.locator('.right [data-block-slot-id="block-1"] strong').nth(1)).toHaveText('bold')

  // the paragraph re-renders as a preview slot from the model
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

test('bubble menu: shows over the selection, reflects active marks, no underline', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id]', { timeout: 10000 })
  await page.locator('.left [data-node-type="Paragraph"]').first().click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()

  // select the existing bold run — the bubble appears above the selection
  await selectInHost(page, 'bold', 4)
  const bubble = page.locator('.autodown-bubble-menu')
  await expect(bubble).toBeVisible()
  // underline is clipped (no Mark representation); the other four remain
  await expect(bubble.locator('button')).toHaveCount(5)
  await expect(bubble.locator('button[title="Underline"]')).toHaveCount(0)
  // isActive: the selection is inside **bold** → bold button active
  await expect(bubble.locator('button[title="Bold"]')).toHaveClass(/active/)

  // click italic: the live host DOM gets an <em> around the selection
  await bubble.locator('button[title="Italic"]').click()
  await expect(host.locator('em').filter({ hasText: 'bold' })).toHaveText('bold')

  // blur by directly clicking the Heading → writeback. The MODEL keeps both
  // marks (left pane re-renders from the engine doc); serialize emits
  // ***bold*** and the v1 parser cannot re-nest *** (generated parser gap —
  // plan 028 P2), so the right (markdown-roundtrip) pane only shows the
  // strong.
  await page.locator('.left [data-node-type="Heading"]').first().click()
  await page.waitForTimeout(300)
  await expect(page.locator('.left [data-node-type="Paragraph"] strong').filter({ hasText: 'bold' }).first()).toHaveText('bold')
  await expect(page.locator('.left [data-node-type="Paragraph"] em').filter({ hasText: 'bold' }).first()).toHaveText('bold')
  await expect(page.locator('.right [data-block-slot-id="block-1"] strong').filter({ hasText: 'bold' }).first()).toHaveText('bold')
})

test('Ctrl+K link: prompt channel, anchor roundtrip', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id]', { timeout: 10000 })
  await page.locator('.left [data-node-type="Paragraph"]').first().click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()

  page.on('dialog', (d) => d.accept('https://example.org/wiki'))
  await selectInHost(page, 'paragraph', 9)
  await page.keyboard.press('Control+k')
  // the live host renders an uneditable anchor
  await expect(host.locator('a[href="https://example.org/wiki"]')).toHaveText('paragraph')

  // blur by directly clicking the Heading → writeback lands in the pane
  await page.locator('.left [data-node-type="Heading"]').first().click()
  await page.waitForTimeout(300)
  await expect(page.locator('.right [data-block-slot-id="block-1"] a[href="https://example.org/wiki"]').first()).toHaveText('paragraph')
})

test('edit then click another block directly: one click lands (no Save detour)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id]', { timeout: 10000 })

  await page.locator('.left [data-node-type="Paragraph"]').first().click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()

  // a rich edit (Ctrl+B wraps in place) leaves the writeback pending on blur
  await selectInHost(page, 'This is', 7)
  await page.keyboard.press('Control+b')

  // click the Heading with RAW mouse events: locator.click() re-resolves the
  // target when the writeback repaint detaches it (actionability retry),
  // which papers over exactly the swallow a real user hits — a human's
  // mousedown→mouseup spans the repaint. Hold the press across it.
  const heading = page.locator('.left [data-node-type="Heading"]').first()
  const box = (await heading.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + Math.min(box.height / 2, 24)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.waitForTimeout(80) // the blur-writeback repaint lands mid-gesture
  await page.mouse.up()

  // the heading hosts on the FIRST click…
  await expect(page.locator('.left .autodown-block-host[data-node-type="Heading"]')).toBeVisible({ timeout: 3000 })
  // …and the blur writeback still landed (bold survives the roundtrip pane)
  await expect(page.locator('.right [data-block-slot-id="block-1"] strong').first()).toHaveText('This is')
})

test('code edit face renders the syntax highlight overlay', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id]', { timeout: 10000 })

  // focus the javascript fence — CodeEditorBlock mounts with the overlay
  await page.locator('.left [data-node-type="Fence"]').first().click()
  const editor = page.locator('.left .autodown-code-editor')
  await expect(editor).toBeVisible()

  // the overlay pre exists, is aria-hidden, and carries lowlight spans
  const pre = editor.locator('pre.code-editor-highlight')
  await expect(pre).toHaveAttribute('aria-hidden', 'true')
  await expect(pre.locator('span.hljs-keyword').first()).toBeVisible()
  // the textarea's text is transparent (overlay shows it) but keeps a caret
  const caret = await editor.locator('textarea.code-editor-textarea').evaluate((el) => getComputedStyle(el).caretColor)
  expect(caret).not.toBe('rgba(0, 0, 0, 0)')

  // typing updates the overlay live (escaped fallback or hljs spans)
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('const zz = 1\n')
  await expect(pre).toContainText('const zz = 1')

  // height sync: overlay tracks the auto-resized textarea
  const heights = await editor.evaluate((el) => {
    const area = el.querySelector('textarea.code-editor-textarea') as HTMLElement
    const layer = el.querySelector('pre.code-editor-highlight') as HTMLElement
    return { area: area.offsetHeight, layer: layer.offsetHeight }
  })
  expect(Math.abs(heights.area - heights.layer)).toBeLessThanOrEqual(2)
})
