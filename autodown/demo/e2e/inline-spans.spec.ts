// Inline spans e2e (plan 036 T8) — the modelized [[wikilink]] and
// $inline math$ faces on the real demo: preview click contract
// (stopPropagation — no edit-face switch), the edit host's atomic label
// mounts, the blur writeback recycling both span kinds back into the
// model, and the same span faces across view / stream / edit modes.

import { test, expect } from '@playwright/test'

const WIKI_LABEL = 'Hello World'
const MATH_SRC = 'a^2+b^2=c^2'

test('preview click on a wikilink label keeps the block in preview (stopPropagation)', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id]', { timeout: 10000 })

  const para = page.locator('.left [data-node-type="Paragraph"]', {
    has: page.locator('.autodown-wikilink-label'),
  })
  await expect(para).toHaveCount(1)
  const label = para.locator('.autodown-wikilink-label')
  await expect(label).toHaveText(WIKI_LABEL)
  await expect(label).toHaveAttribute('data-wikilink-title', WIKI_LABEL)

  // the click emits open-wiki-link (app-side) and must NOT fall through to
  // the block's click-to-focus (the decorator's stopPropagation contract)
  await label.click()
  await expect(para.locator('.autodown-block-host')).toHaveCount(0)
})

test('three modes + blur recycle: edit, write back, then compare all faces', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id]', { timeout: 10000 })

  const para = page.locator('.left [data-node-type="Paragraph"]', {
    has: page.locator('.autodown-wikilink-label'),
  })
  await expect(para.locator('.autodown-wikilink-label')).toHaveText(WIKI_LABEL)

  // edit mode first: click the paragraph center — line two, plain text
  // (line one sits inside the previous block's insert-handle strip, and
  // the wikilink/math spans have their own click semantics). In the edit
  // face the focused leaf mounts the host BARE — the slot chrome (and its
  // data-block-id wrapper) is replaced, so the host is scoped globally
  // (one focused block at a time).
  await para.click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()

  // the host mounts the atomic labels: the wikilink label contract and the
  // math SOURCE literal (D4 v1)
  await expect(
    host.locator('.autodown-wikilink-label[data-wikilink-title="Hello World"]')
  ).toHaveText(WIKI_LABEL)
  await expect(host.locator('.autodown-math-inline[data-math-src]')).toHaveText(MATH_SRC)

  // type a suffix, then blur through the heading (the writeback walk)
  await host.click()
  await page.keyboard.press('End')
  await page.keyboard.type(' tail')
  await page.locator('.left [data-node-type="Heading"]').first().click()
  await page.waitForTimeout(300)

  // the model caught up: the preview re-renders with BOTH spans intact and
  // the typed text present — the blur walk recovered wikilink + math
  await expect(para.locator('.autodown-wikilink-label')).toHaveText(WIKI_LABEL)
  await expect(para.locator('.autodown-math-inline')).toHaveAttribute('data-math-src', MATH_SRC)
  await expect(para).toContainText(' tail')

  // three-mode span consistency — view (left preview) and stream (right
  // pane) render the same faces through the same pipeline; math renders
  // katex inside the carrier span
  const right = page.locator('.right .streaming-document')
  await expect(right.locator('.autodown-wikilink-label').first()).toHaveText(WIKI_LABEL)
  await expect(right.locator('.autodown-math-inline').first()).toHaveAttribute('data-math-src', MATH_SRC)
  await expect(right.locator('.autodown-math-inline .katex').first()).toBeVisible()
})
