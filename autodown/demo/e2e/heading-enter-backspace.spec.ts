// Heading Enter/Backspace e2e — pins BOTH block-key fixes on the real
// keyboard path (the gap that let them regress silently: the headless unit
// tests call the controller directly, bypassing the DOM keydown wiring):
//
// 1. Enter at the end of "Heading One" opens a PLAIN PARAGRAPH block below —
//    the tail never stays a heading (block_model splitTailKind invariant: an
//    ATX heading is a single-line construct).
// 2. Enter mid-heading: the tail text becomes the new paragraph's content.
// 3. Backspace on the empty new block merges it away — the heading is whole
//    again and the caret lands at the junction (hostKeydown resolves the
//    previous sibling MODEL-side via controller.prevSiblingId; the old DOM
//    previousElementSibling route was always null inside the per-block slot
//    wrappers).

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.left')).toBeVisible()
})

/** The single live contenteditable host of the focused block, with the
 *  slot-level type read model-side (the ghost slot can interleave, so the
 *  host — not slot order — is the stable anchor). */
function focusedHostInfo(page: Page) {
  return page.evaluate(() => {
    const host = document.querySelector('.left .autodown-block-host')
    if (!host) return null
    const slot = host.closest('.node-slot')
    return {
      blockId: host.getAttribute('data-block-id'),
      tag: host.tagName,
      slotType: slot?.getAttribute('data-node-type') ?? null,
      text: host.textContent ?? '',
    }
  })
}

test('Enter at the end of a heading opens a paragraph, not a heading', async ({ page }) => {
  const heading = page.locator('.left').getByText('Heading One', { exact: true }).first()
  await heading.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)

  const info = await focusedHostInfo(page)
  expect(info).toEqual({
    blockId: expect.stringMatching(/^b-/), // fresh block id, not block-0
    tag: 'P',
    slotType: 'Paragraph',
    text: '',
  })

  // Backspace on the empty tail merges it away: heading whole again, caret
  // at the junction (end of the heading text).
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(250)
  const merged = await page.evaluate(() => {
    const slots = Array.from(document.querySelectorAll('.left .autodown-editor-content > .node-slot'))
    const host = document.querySelector('.left .autodown-block-host')
    const sel = window.getSelection()
    let caret = -1
    if (host && sel && sel.rangeCount > 0) {
      const range = document.createRange()
      range.selectNodeContents(host)
      range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset)
      caret = range.toString().length
    }
    return {
      first: slots[0]?.getAttribute('data-node-type') + '|' + (slots[0]?.textContent ?? ''),
      second: slots[1]?.getAttribute('data-node-type') + '|' + (slots[1]?.textContent ?? '').slice(0, 24),
      focusedBlockId: (document.activeElement as HTMLElement | null)?.getAttribute('data-block-id'),
      caret,
    }
  })
  expect(merged.first).toBe('Heading|Heading One')
  expect(merged.second).toBe('Paragraph|This is a paragraph with') // slice(0, 24)
  expect(merged.focusedBlockId).toBe('block-0')
  expect(merged.caret).toBe('Heading One'.length)
})

test('Enter mid-heading: the tail text becomes the new paragraph', async ({ page }) => {
  const heading = page.locator('.left').getByText('Heading One', { exact: true }).first()
  await heading.click()
  await page.keyboard.press('Home')
  for (let i = 0; i < 'Heading'.length; i++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)

  const info = await focusedHostInfo(page)
  expect(info).toEqual({
    blockId: expect.stringMatching(/^b-/),
    tag: 'P',
    slotType: 'Paragraph',
    text: ' One',
  })
})
