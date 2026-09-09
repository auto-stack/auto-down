// Block click-caret e2e — the first click on ANY unfocused rich-text block
// (heading / paragraph / list item) must land the caret where the user
// pointed. The original bug (user report: "H1/H2 first click throws the
// caret to the end"): the click only SELECTS the block (block-granular
// selectBlock), the edit face mounts as a fresh DOM replacement and the
// browser cannot carry the caret across it, so every face fell back to its
// mount default — end of text. The handoff (engine/click-caret.ts) records
// the pointed-at point on the preview click; the face's mount re-resolves it
// against its own glyphs. The fence family is pinned separately
// (codeblock-click-caret.spec.ts — textarea, plaintext-offset payload).
//
// The expected offset is never hand-computed: each case runs the exact
// caret-API probe the handoff uses at the click point and asserts the caret
// lands on it, so the test pins the whole chain (preview click → capture →
// remount → point re-resolution), not a magic number.

import { test, expect, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.left')).toBeVisible()
})

/** Point at the glyph box of plaintext offset `target` inside `sel` and
 *  resolve the offset the browser's caret API yields at that point — the
 *  handoff must reproduce exactly this. Scrolls first (Playwright's own
 *  scrollIntoViewIfNeeded: the demo's scroll-sync owns the panes' scrollTop,
 *  so a raw scrollIntoView inside the measuring evaluate can be reverted
 *  before the click lands), then re-measures until the point resolves INTO
 *  the element — a stale geometry would silently click another block. */
async function probeAt(page: Page, sel: string, target: number) {
  const loc = page.locator(sel)
  for (let attempt = 0; attempt < 3; attempt++) {
    await loc.scrollIntoViewIfNeeded()
    await page.waitForTimeout(120)
    const p = await page.evaluate(
      ([selector, offset]) => {
        const el = document.querySelector(selector as string)
        if (!el) return null
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        let n: Node | null
        let consumed = 0
        while ((n = walker.nextNode())) {
          const len = (n.textContent ?? '').length
          if (consumed + len > (offset as number)) {
            const local = (offset as number) - consumed
            const r = document.createRange()
            r.setStart(n, local)
            r.setEnd(n, Math.min(local + 1, len))
            const rect = r.getBoundingClientRect()
            const x = rect.x + rect.width / 2
            const y = rect.y + rect.height / 2
            const pos = document.caretRangeFromPoint(x, y)
            if (!pos) return { x, y, expected: -1, inside: false }
            const cr = document.createRange()
            cr.selectNodeContents(el)
            cr.setEnd(pos.startContainer, pos.startOffset)
            return { x, y, expected: cr.toString().length, inside: el.contains(pos.startContainer) }
          }
          consumed += len
        }
        return null
      },
      [sel, target],
    )
    if (p && p.inside) return p
  }
  return null
}

/** Caret offset inside the focused host, in plaintext terms. */
async function caretOffset(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null
    const sel = window.getSelection()
    if (!active || !sel || sel.rangeCount === 0) return null
    const r = sel.getRangeAt(0)
    if (!active.contains(r.startContainer)) return null
    const pre = document.createRange()
    pre.selectNodeContents(active)
    pre.setEnd(r.startContainer, r.startOffset)
    return pre.toString().length
  })
}

test('first click on an unfocused heading lands the caret at the clicked offset', async ({ page }) => {
  const HEADING = 'Heading Two'
  const sel = '.left .node-slot[data-block-id="block-2"] .heading-node'
  const p = await probeAt(page, sel, 4) // the "i" of "Heading"
  expect(p).not.toBeNull()
  // sanity: the probe point is inside the text, NOT the end (the old bug's
  // landing spot) — otherwise this test could pass vacuously
  expect(p!.expected).toBeGreaterThan(0)
  expect(p!.expected).toBeLessThan(HEADING.length)

  await page.mouse.click(p!.x, p!.y)
  const host = page.locator('.left .autodown-block-host[data-block-id="block-2"]')
  await expect(host).toBeVisible()
  expect(await caretOffset(page)).toBe(p!.expected)
})

test('first click on an unfocused paragraph with inline marks lands at the clicked offset', async ({
  page,
}) => {
  const sel = '.left .node-slot[data-block-id="block-1"] .paragraph-node'
  // "italic" sits inside an <em> — the point-based handoff must see through
  // the mark wrappers (text-offset shortcuts would too, but only because the
  // mark text is 1:1; this pins the general case)
  const start = await page.evaluate((selector) => {
    const el = document.querySelector(selector as string)
    return el ? (el.textContent ?? '').indexOf('italic') : -1
  }, sel)
  expect(start).toBeGreaterThan(0)
  const p = await probeAt(page, sel, start + 2)
  expect(p).not.toBeNull()
  expect(p!.expected).toBeGreaterThan(0)

  await page.mouse.click(p!.x, p!.y)
  await expect(page.locator('.left .autodown-block-host[data-block-id="block-1"]')).toBeVisible()
  expect(await caretOffset(page)).toBe(p!.expected)
})

/** Tag the first element matching `selector` whose trimmed text is exactly
 *  `text` and return a unique CSS selector for it (the demo's containers
 *  hold several paragraphs, so text identity picks the right one). */
async function tagExactText(page: Page, selector: string, text: string): Promise<string> {
  return page.evaluate(
    ([sel, t]) => {
      const el = Array.from(document.querySelectorAll(sel as string)).find(
        (e) => (e.textContent ?? '').trim() === t,
      )
      if (!el) return ''
      el.setAttribute('data-e2e-probe', 'hit')
      return `${sel}[data-e2e-probe="hit"]`
    },
    [selector, text],
  )
}

/** Text of the focused host (the face the click should have focused). */
async function focusedText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null
    return (a?.textContent ?? '').trim()
  })
}

// Collapsed containers resolve the click to the ITEM under the point (not the
// deep-selection first leaf) and hand off the pointed-at position — one click
// lands focus AND caret in the clicked item.
for (const [label, text] of [
  ['bullet list item', 'Bullet item two'],
  ['ordered list item', 'Ordered item two'],
  ['task list item', 'Task item pending'],
] as const) {
  test(`first click on a collapsed list focuses the clicked ${label} at the clicked offset`, async ({
    page,
  }) => {
    const sel = await tagExactText(page, '.left .paragraph-node', text)
    expect(sel).not.toBe('')
    const p = await probeAt(page, sel, 3)
    expect(p).not.toBeNull()
    expect(p!.expected).toBeGreaterThan(0)
    expect(p!.expected).toBeLessThan(text.length)

    await page.mouse.click(p!.x, p!.y)
    await expect(page.locator('.left .autodown-block-host')).toHaveCount(1)
    expect(await focusedText(page)).toBe(text)
    expect(await caretOffset(page)).toBe(p!.expected)
  })
}

test('first click on a callout body lands the caret at the clicked offset', async ({ page }) => {
  const text =
    'This is a warning callout. It uses a light yellow background and an amber title/icon.'
  const sel = await tagExactText(page, '.left .paragraph-node', text)
  expect(sel).not.toBe('')
  const p = await probeAt(page, sel, 12) // inside "warning"
  expect(p).not.toBeNull()
  expect(p!.expected).toBeGreaterThan(0)
  expect(p!.expected).toBeLessThan(text.length)

  await page.mouse.click(p!.x, p!.y)
  await expect(page.locator('.left .autodown-block-host')).toHaveCount(1)
  expect(await focusedText(page)).toBe(text)
  expect(await caretOffset(page)).toBe(p!.expected)
})

test('first click on a details body lands the caret at the clicked offset', async ({ page }) => {
  // the body is collapsed by default — open it through the summary (which
  // toggles `open` without moving focus), then the body click is the first
  // click into the container
  await page.locator('.left .autodown-details-summary-text').first().click()
  const text =
    'This is a Details block. The content is collapsed by default and expanded when the summary is clicked.'
  const sel = await tagExactText(page, '.left .paragraph-node', text)
  expect(sel).not.toBe('')
  const p = await probeAt(page, sel, 14) // inside "Details"
  expect(p).not.toBeNull()
  expect(p!.expected).toBeGreaterThan(0)
  expect(p!.expected).toBeLessThan(text.length)

  await page.mouse.click(p!.x, p!.y)
  await expect(page.locator('.left .autodown-block-host')).toHaveCount(1)
  expect(await focusedText(page)).toBe(text)
  expect(await caretOffset(page)).toBe(p!.expected)
})

test('first click on a table cell focuses that cell at the clicked offset', async ({ page }) => {
  const table = '.left .node-slot[data-block-id="block-14"]'
  const sel = await tagExactText(page, `${table} td`, 'Bar')
  expect(sel).not.toBe('')
  const p = await probeAt(page, sel, 1)
  expect(p).not.toBeNull()
  expect(p!.expected).toBeGreaterThan(0)
  expect(p!.expected).toBeLessThan('Bar'.length)

  await page.mouse.click(p!.x, p!.y)
  const focused = page.locator('.left .autodown-table-editor td[data-cell-id]:focus')
  await expect(focused).toHaveCount(1)
  expect(await focusedText(page)).toBe('Bar')
  expect(await caretOffset(page)).toBe(p!.expected)
})
