// WYSIWYG block typography e2e (plan 029) — the focused edit host carries the
// semantic tag + view-side class (h1-h6.heading-node / p.paragraph-node), so
// the editor CSS styles the host exactly like the preview: typography parity
// across the focus toggle, zero layout jump for the neighbors, inline marks
// inside a heading host, and the `# ` input rule flipping the host live.
//
// Parity baseline notes (empirically pinned on the live demo):
// - The focused host mounts as a DIRECT child of .autodown-editor-content
//   (no node-slot chrome), while a preview block nests
//   node-slot[data-block-id] > node-content > … > p/h1. Scroll-sync injects
//   per-block margin rules keyed on [data-block-id] — the host matches them
//   directly, the preview carries them on its SLOT wrapper. So margin parity
//   is asserted host ↔ preview-slot (the two states of the same block rhythm
//   position), and font metrics are asserted against both the same-pane
//   preview element and the right streaming pane.

import { test, expect, type Page } from '@playwright/test'

type Face = {
  tag: string
  fontSize: string
  fontWeight: string
  marginTop: string
  marginBottom: string
  lineHeight: string
  outlineStyle: string
}

async function faceOf(page: Page, selector: string): Promise<Face> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null
    if (!el) throw new Error(`no element for ${sel}`)
    const cs = getComputedStyle(el)
    return {
      tag: el.tagName,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      marginTop: cs.marginTop,
      marginBottom: cs.marginBottom,
      lineHeight: cs.lineHeight,
      outlineStyle: cs.outlineStyle,
    }
  }, selector)
}

async function topOf(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null
    if (!el) throw new Error(`no element for ${sel}`)
    return el.getBoundingClientRect().top
  }, selector)
}

/** Select `len` chars from the first occurrence of `needle` in the focused
 *  host (same technique as inline-marks.spec.ts). */
async function selectInHost(page: Page, needle: string, len: number): Promise<void> {
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

test('focused H1 host: semantic tag, typography parity, no outline, zero jump', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-1"]', { timeout: 10000 })

  // the demo auto-focuses block-0 on load — park focus on the far H3 so
  // block-0/1 are both preview and the H1 toggle is isolated
  await page.locator('.left [data-block-id="block-3"]').click()
  await page.waitForSelector('.left .autodown-block-host[data-block-id="block-3"]')

  const preview = await faceOf(page, '.left [data-block-id="block-0"] h1')
  const nextTopBefore = await topOf(page, '.left [data-block-id="block-1"]')

  await page.locator('.left [data-block-id="block-0"]').click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()
  await expect(host).toHaveText('Heading One')

  const edit = await faceOf(page, '.left .autodown-block-host')
  // semantic face: real h1 + the view-side classes (plan 029 core)
  expect(edit.tag).toBe('H1')
  expect(await host.evaluate((el) => el.classList.contains('heading-node') && el.classList.contains('heading-1'))).toBe(true)
  expect(await host.getAttribute('dir')).toBe('auto')
  // host hygiene: no browser focus outline (T4) — the caret is the indicator
  expect(edit.outlineStyle).toBe('none')

  // typography parity: same metrics as the preview h1 it replaced …
  expect(edit.fontSize).toBe(preview.fontSize)
  expect(edit.fontWeight).toBe(preview.fontWeight)
  expect(edit.lineHeight).toBe(preview.lineHeight)
  // … and as the right streaming pane's h1
  const stream = await faceOf(page, '.right .streaming-document h1.heading-node')
  expect(edit.fontSize).toBe(stream.fontSize)
  expect(edit.fontWeight).toBe(stream.fontWeight)
  expect(edit.lineHeight).toBe(stream.lineHeight)

  // zero layout jump: the next sibling block does not move on the toggle
  const nextTopAfter = await topOf(page, '.left [data-block-id="block-1"]')
  expect(Math.abs(nextTopAfter - nextTopBefore)).toBeLessThanOrEqual(1)
})

test('focused paragraph host: p.paragraph-node, margin parity vs its slot, zero jump', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-1"]', { timeout: 10000 })

  // block-0 is auto-focused at load → block-1 is preview; measure its inner
  // element AND its slot wrapper (the slot carries the scroll-sync margins
  // the host will inherit, see header note)
  const preview = await faceOf(page, '.left [data-block-id="block-1"] p')
  const slot = await faceOf(page, '.left [data-block-id="block-1"]')
  const nextTopBefore = await topOf(page, '.left [data-block-id="block-2"]')

  await page.locator('.left [data-block-id="block-1"]').click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()

  const edit = await faceOf(page, '.left .autodown-block-host')
  expect(edit.tag).toBe('P')
  expect(await host.evaluate((el) => el.classList.contains('paragraph-node'))).toBe(true)
  // font metrics match the preview paragraph
  expect(edit.fontSize).toBe(preview.fontSize)
  expect(edit.lineHeight).toBe(preview.lineHeight)
  // margins match the slot the host replaced (same injected rhythm position)
  expect(edit.marginTop).toBe(slot.marginTop)
  expect(edit.marginBottom).toBe(slot.marginBottom)

  const nextTopAfter = await topOf(page, '.left [data-block-id="block-2"]')
  expect(Math.abs(nextTopAfter - nextTopBefore)).toBeLessThanOrEqual(1)
})

test('focused H2/H3 hosts keep their level face', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-1"]', { timeout: 10000 })

  // H2 — park focus on the paragraph first so block-2 is preview
  await page.locator('.left [data-block-id="block-1"]').click()
  const previewH2 = await faceOf(page, '.left [data-block-id="block-2"] h2')
  const slotH2 = await faceOf(page, '.left [data-block-id="block-2"]')
  await page.locator('.left [data-block-id="block-2"]').click()
  await expect(page.locator('.left .autodown-block-host')).toBeVisible()
  const editH2 = await faceOf(page, '.left .autodown-block-host')
  expect(editH2.tag).toBe('H2')
  expect(editH2.fontSize).toBe(previewH2.fontSize)
  expect(editH2.marginTop).toBe(slotH2.marginTop)
  expect(editH2.marginBottom).toBe(slotH2.marginBottom)

  // H3 — focus straight from the H2 host (blur writeback, then focus)
  const previewH3 = await faceOf(page, '.left [data-block-id="block-3"] h3')
  const slotH3 = await faceOf(page, '.left [data-block-id="block-3"]')
  await page.locator('.left [data-block-id="block-3"]').click()
  await expect(page.locator('.left .autodown-block-host')).toBeVisible()
  const editH3 = await faceOf(page, '.left .autodown-block-host')
  expect(editH3.tag).toBe('H3')
  expect(editH3.fontSize).toBe(previewH3.fontSize)
  expect(editH3.marginTop).toBe(slotH3.marginTop)
  expect(editH3.marginBottom).toBe(slotH3.marginBottom)
})

test('inline marks inside the heading host serialize back (# ... **...** roundtrip)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 10000 })

  await page.locator('.left [data-block-id="block-0"]').click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()

  // bold "Heading" inside the live h1 host
  await selectInHost(page, 'Heading', 7)
  await page.keyboard.press('Control+b')
  await expect(host.locator('strong')).toHaveText('Heading')

  // blur by focusing the next heading — the writeback serializes the mark
  await page.locator('.left [data-block-id="block-2"]').click()
  await page.waitForTimeout(300)
  await expect(page.locator('.right [data-block-slot-id="block-0"] h1 strong')).toHaveText('Heading')

  // refocus: the h1 host still mounts as h1 with the strong inside
  await page.locator('.left [data-block-id="block-0"]').click()
  await expect(page.locator('.left .autodown-block-host')).toBeVisible()
  expect(await page.locator('.left .autodown-block-host').evaluate((el) => el.tagName)).toBe('H1')
  await expect(page.locator('.left .autodown-block-host strong')).toHaveText('Heading')
})

test('`# ` input rule on an empty paragraph flips the host live and typing continues', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-1"]', { timeout: 10000 })

  // split the intro paragraph → fresh empty paragraph host
  await page.locator('.left [data-block-id="block-1"]').click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()
  await host.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await expect(page.locator('.left .autodown-block-host')).toBeVisible()

  // `# ` converts the block to a heading (the host remounts with the h1
  // face); typing keeps landing at a human cadence (the remount swaps the
  // DOM node mid-word — zero-delay bursts can outpace it)
  await page.keyboard.type('# Task', { delay: 60 })
  await expect(page.locator('.left .autodown-block-host')).toContainText('Task')

  // blur → the model serializes as a real `# ` heading and streams right
  await page.locator('.left [data-block-id="block-2"]').click()
  await page.waitForTimeout(300)
  const h1s = page.locator('.right .streaming-document h1.heading-node')
  await expect(h1s.filter({ hasText: 'Task' })).toHaveCount(1)

  // refocus the converted block: the host mounts as a semantic h1
  const converted = page.locator('.left [data-node-type="Heading"]', { hasText: 'Task' }).first()
  await converted.click()
  const host2 = page.locator('.left .autodown-block-host')
  await expect(host2).toBeVisible()
  expect(await host2.evaluate((el) => el.tagName)).toBe('H1')
})
