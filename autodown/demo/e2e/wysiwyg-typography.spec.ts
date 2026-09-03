// WYSIWYG block typography e2e (plan 029) — the focused edit host carries the
// semantic tag + view-side class (h1-h6.heading-node / p.paragraph-node), so
// the editor CSS styles the host exactly like the preview: typography parity
// across the focus toggle, zero layout jump for the neighbors, inline marks
// inside a heading host, and the `# ` input rule flipping the host live.
//
// Parity baseline notes (plan 039 T4b revision): the focused host mounts
// INSIDE the same node-slot chrome as its preview face (structural parity —
// the engine revision of plan 029's bare-host ruling), so a block's DOM
// shape no longer changes across the toggle. Margin parity is asserted
// host ↔ the preview's INNER leaf (the same-margin element), and font
// metrics are asserted against both the same-pane preview element and the
// right streaming pane.

import { test, expect, type Page } from '@playwright/test'

type Face = {
  tag: string
  fontSize: string
  fontWeight: string
  marginTop: string
  marginBottom: string
  lineHeight: string
  outlineStyle: string
  color: string
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
      color: cs.color,
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

/** Layout position of `selector` relative to its scrolling pane (plan 039
 *  T3): viewport rect plus the scroll container's scrollTop, so a focus
 *  click that scrolls the pane cannot masquerade as (or hide) a layout
 *  shift of the block itself. */
async function topInContainer(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null
    if (!el) throw new Error(`no element for ${sel}`)
    const scroller = el.closest('.autodown-editor-content-wrapper') as HTMLElement | null
    return el.getBoundingClientRect().top + (scroller?.scrollTop ?? 0)
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
  // pane-scroll compensated (focus may scroll the host into view — that is
  // not a layout shift): container-relative tops only
  const nextTopBefore = await topInContainer(page, '.left [data-block-id="block-1"]')
  // plan 039 T3: the clicked block's OWN position must not move either
  const selfTopBefore = await topInContainer(page, '.left [data-block-id="block-0"]')

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
  // accent parity (plan 039 T1): the editor heading carries the streaming
  // theme's accent-strong, not the editor CSS's old fg black
  expect(edit.color).toBe(stream.color)
  expect(edit.color).toBe('rgb(67, 56, 202)')

  // zero layout jump: the next sibling block does not move on the toggle
  const nextTopAfter = await topInContainer(page, '.left [data-block-id="block-1"]')
  expect(Math.abs(nextTopAfter - nextTopBefore)).toBeLessThanOrEqual(1)
  // plan 039 T3: …and neither does the clicked block itself (pane-scroll
  // compensated — pure layout shift)
  const selfTopAfter = await topInContainer(page, '.left .autodown-block-host[data-block-id="block-0"]')
  expect(Math.abs(selfTopAfter - selfTopBefore)).toBeLessThanOrEqual(0.5)
})

test('focused paragraph host: p.paragraph-node, margin parity vs its slot, zero jump', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-1"]', { timeout: 10000 })
  // let the load-time focus + scroll-sync spacer injection settle before
  // taking the baseline (measuring mid-settle bakes transient geometry in)
  await page.waitForTimeout(400)

  // block-0 is auto-focused at load → block-1 is preview; measure its inner
  // element (the same-margin element across the toggle — plan 039 T4b)
  const preview = await faceOf(page, '.left [data-block-id="block-1"] p')
  // pane-scroll compensated (focus may scroll the host into view — that is
  // not a layout shift): container-relative tops only. The zero-jump target
  // is the NEXT sibling block (block-2), measured before and after.
  const nextTopBefore = await topInContainer(page, '.left [data-block-id="block-2"]')

  await page.locator('.left .node-slot[data-block-id="block-1"]').click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()

  const edit = await faceOf(page, '.left .autodown-block-host')
  expect(edit.tag).toBe('P')
  expect(await host.evaluate((el) => el.classList.contains('paragraph-node'))).toBe(true)
  // font metrics match the preview paragraph
  expect(edit.fontSize).toBe(preview.fontSize)
  expect(edit.lineHeight).toBe(preview.lineHeight)
  // top margin matches the preview paragraph's (the same-margin element).
  // The bottom margin is owned by scroll-sync's injected margin-bottom,
  // which lands on slot AND host alike in the focused state — the effective
  // bottom rhythm is pinned by the next-block zero-jump assertion below.
  expect(edit.marginTop).toBe(preview.marginTop)

  const nextTopAfter = await topInContainer(page, '.left [data-block-id="block-2"]')
  expect(Math.abs(nextTopAfter - nextTopBefore)).toBeLessThanOrEqual(1)
})

test('focused H2/H3 hosts keep their level face', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-1"]', { timeout: 10000 })

  // H2 — park focus on the paragraph first so block-2 is preview
  await page.locator('.left [data-block-id="block-1"]').click()
  const previewH2 = await faceOf(page, '.left [data-block-id="block-2"] h2')
  // plan 039 T3: clicked-block self-top probe (preview slot ↔ host)
  const h2TopBefore = await topInContainer(page, '.left [data-block-id="block-2"]')
  await page.locator('.left [data-block-id="block-2"]').click()
  await expect(page.locator('.left .autodown-block-host')).toBeVisible()
  const editH2 = await faceOf(page, '.left .autodown-block-host')
  expect(editH2.tag).toBe('H2')
  expect(editH2.fontSize).toBe(previewH2.fontSize)
  // top margin matches the preview leaf; the bottom margin is scroll-sync
  // owned (injected on slot and host alike — see the paragraph test note)
  expect(editH2.marginTop).toBe(previewH2.marginTop)
  const h2TopAfter = await topInContainer(page, '.left .autodown-block-host[data-block-id="block-2"]')
  expect(Math.abs(h2TopAfter - h2TopBefore)).toBeLessThanOrEqual(0.5)

  // H3 — focus straight from the H2 host (blur writeback, then focus)
  const previewH3 = await faceOf(page, '.left [data-block-id="block-3"] h3')
  const h3TopBefore = await topInContainer(page, '.left [data-block-id="block-3"]')
  await page.locator('.left [data-block-id="block-3"]').click()
  await expect(page.locator('.left .autodown-block-host')).toBeVisible()
  const editH3 = await faceOf(page, '.left .autodown-block-host')
  expect(editH3.tag).toBe('H3')
  expect(editH3.fontSize).toBe(previewH3.fontSize)
  expect(editH3.marginTop).toBe(previewH3.marginTop)
  const h3TopAfter = await topInContainer(page, '.left .autodown-block-host[data-block-id="block-3"]')
  expect(Math.abs(h3TopAfter - h3TopBefore)).toBeLessThanOrEqual(0.5)
})

test('inline marks inside the heading host serialize back (# ... **...** roundtrip)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 10000 })

  // the demo auto-focuses block-0 on load — under plan 039 T4b the focused
  // face lives inside its slot, so address the SLOT and avoid a strict-mode
  // double match on [data-block-id]
  await page.locator('.left .node-slot[data-block-id="block-0"]').click()
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
