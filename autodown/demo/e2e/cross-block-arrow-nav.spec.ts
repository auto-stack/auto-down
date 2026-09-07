// Cross-block vertical navigation e2e — pins the web-track ↑/↓ block
// crossing on the real keyboard path (web parity with the VM shell's
// navigate_vertical; user ruling 2026-09-07: the landing is the previous
// block's END / the next block's START — the geometry-exact "directly
// above" glyph match is deliberately deferred).
//
// Keyboard-only by design: the demo auto-focuses block-0 at mount, and the
// block-boundary click-insert layer (autodown-block-boundary) intercepts
// pointer hit-tests over block text, so clicks are neither needed nor used.
//
// 1. ↓ at the last visual line moves into the NEXT block at its start;
//    ↑ back at the first visual line moves into the PREVIOUS block at its
//    end.
// 2. Mid-first-line ↑ also crosses (the rule is line-granular, not
//    offset-0-granular).
// 3. Inside a wrapped paragraph ↑/↓ keep the native in-block behaviour —
//    they move between the block's own lines and only cross at the boundary.

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.left .autodown-block-host')).toBeVisible()
})

/** The focused block's id + caret text-offset, read off the live host. */
function focusedCaret(page: Page) {
  return page.evaluate(() => {
    const host = document.querySelector('.left .autodown-block-host')
    const sel = window.getSelection()
    let offset = -1
    if (host && sel && sel.rangeCount > 0) {
      const range = document.createRange()
      range.selectNodeContents(host)
      range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset)
      offset = range.toString().length
    }
    return {
      blockId: (host as HTMLElement | null)?.getAttribute('data-block-id') ?? null,
      offset,
    }
  })
}

test('↓ enters the next block at its start; ↑ returns to the previous block end', async ({ page }) => {
  // load state: block-0 auto-focused, caret at its end (mountHost)
  const start = await focusedCaret(page)
  expect(start.blockId).toBe('block-0')

  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(300)
  let caret = await focusedCaret(page)
  expect(caret.blockId).toBe('block-1')
  expect(caret.offset).toBe(0) // next block's FIRST position

  await page.keyboard.press('ArrowUp')
  await page.waitForTimeout(300)
  caret = await focusedCaret(page)
  expect(caret.blockId).toBe('block-0')
  expect(caret.offset).toBe('Heading One'.length) // previous block's END
})

test('↑ mid-first-line also crosses (line-granular, not offset-0-granular)', async ({ page }) => {
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(300)
  // caret at block-1 offset 0 — walk right: still on the block's first
  // (only) visual line, but no longer at offset 0
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowUp')
  await page.waitForTimeout(300)

  const caret = await focusedCaret(page)
  expect(caret.blockId).toBe('block-0')
  expect(caret.offset).toBe('Heading One'.length)
})

test('inside a wrapped paragraph ↑/↓ keep the native in-block behaviour', async ({ page }) => {
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(300)
  // caret at block-1 start — prepend words until the block wraps
  await page.keyboard.type(
    'wrapping words arrive here first so the visual line breaks somewhere below '
  )
  await page.waitForTimeout(250)
  const wrapped = await page.evaluate(() => {
    const host = document.querySelector('.left .autodown-block-host')
    if (!host) return false
    const range = document.createRange()
    range.selectNodeContents(host)
    const rects = Array.from(range.getClientRects()).filter((r) => r.height > 0)
    return rects.some((r) => rects.some((o) => o.top > r.top + 5))
  })
  if (!wrapped) {
    test.skip()
    return
  }

  // Home puts the caret on the FIRST line; ↓ must stay inside the block
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(250)
  let caret = await focusedCaret(page)
  expect(caret.blockId).toBe('block-1')

  // ↑ from the second line goes back to the first line — same block
  await page.keyboard.press('ArrowUp')
  await page.waitForTimeout(250)
  caret = await focusedCaret(page)
  expect(caret.blockId).toBe('block-1')

  // only NOW (first line again) does ↑ cross into the heading
  await page.keyboard.press('ArrowUp')
  await page.waitForTimeout(300)
  caret = await focusedCaret(page)
  expect(caret.blockId).toBe('block-0')
})
