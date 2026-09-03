// Code block pane parity e2e (plan 039 T6) — the editor pane's preview of a
// fence block must carry the SAME chrome the streaming pane renders: the
// gray header bar inside .code-block-container and the lowlight token
// colors. The retired editor CSS scoped the header to pre[data-language]
// (header INSIDE the pre), which the 033 family widget's sibling markup
// never matches — the language label floated above a bare pre-box instead.
//
// Later tasks extend this spec: T7 pins the in-header language trigger +
// CodeBlockMenu popup, T9/T10 pin the edit face's visible highlighting.

import { test, expect, type Page } from '@playwright/test'

type CodeChrome = {
  headerBg: string | null
  headerMinHeight: string | null
  headerFontSize: string | null
  headerBorderBottomColor: string | null
  titleText: string | null
  keywordColor: string | null
  preMarginTop: string | null
  prePadding: string | null
  containerBorderRadius: string | null
}

async function codeChromeOf(page: Page, containerSelector: string): Promise<CodeChrome> {
  return page.evaluate((sel) => {
    const container = document.querySelector(sel)
    if (!container) throw new Error(`no container for ${sel}`)
    const header = container.querySelector('.code-block-header')
    const title = header?.querySelector('.code-header-title')
    const keyword = container.querySelector('pre code .hljs-keyword')
    const pre = container.querySelector('pre[data-language]')
    const cs = (el: Element) => getComputedStyle(el)
    return {
      headerBg: header ? cs(header).backgroundColor : null,
      headerMinHeight: header ? cs(header).minHeight : null,
      headerFontSize: header ? cs(header).fontSize : null,
      headerBorderBottomColor: header ? cs(header).borderBottomColor : null,
      titleText: title?.textContent ?? null,
      keywordColor: keyword ? cs(keyword).color : null,
      preMarginTop: pre ? cs(pre).marginTop : null,
      prePadding: pre ? cs(pre).padding : null,
      containerBorderRadius: cs(container).borderRadius,
    }
  }, containerSelector)
}

test('fence preview chrome matches the streaming pane', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-5"]', { timeout: 10000 })

  // left editor pane: the first fence (javascript, block-5) is in preview;
  // right streaming pane: the same document's same fence
  const left = await codeChromeOf(page, '.left [data-block-id="block-5"] .code-block-container')
  const right = await codeChromeOf(page, '.right .streaming-document .code-block-container')

  // sanity: we are really looking at the javascript fence on both sides
  expect(left.titleText).toBe('javascript')
  expect(right.titleText).toBe('javascript')

  // chrome parity: gray header bar INSIDE the container, same metrics
  expect(left.headerBg).toBe(right.headerBg)
  expect(left.headerMinHeight).toBe(right.headerMinHeight)
  expect(left.headerFontSize).toBe(right.headerFontSize)
  expect(left.headerBorderBottomColor).toBe(right.headerBorderBottomColor)
  expect(left.preMarginTop).toBe(right.preMarginTop)
  expect(left.prePadding).toBe(right.prePadding)
  expect(left.containerBorderRadius).toBe(right.containerBorderRadius)

  // the header bar is actually styled (not the retired unstyled label)
  expect(left.headerBg).toBe('rgb(229, 231, 235)')

  // lowlight tokens colored identically on both panes (and not the base fg)
  expect(left.keywordColor).toBe(right.keywordColor)
  expect(left.keywordColor).not.toBe(null)
  expect(left.keywordColor).not.toBe('rgb(17, 24, 39)')
})

test('fence preview panel is pixel-equal to the streaming pane (plan 039 T13)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-5"] .code-block-container', { timeout: 10000 })
  // web-font reflow would skew the pixel comparison
  await page.evaluate(() => document.fonts.ready)

  const geo = await page.evaluate(() => {
    const box = (el: Element | null) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return { w: r.width, h: Math.round(r.height * 100) / 100, lineHeight: cs.lineHeight, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom }
    }
    return {
      leftContainer: box(document.querySelector('.left [data-block-id="block-5"] .code-block-container')),
      rightContainer: box(document.querySelector('.right .streaming-document .code-block-container')),
      leftPre: box(document.querySelector('.left [data-block-id="block-5"] pre')),
      rightPre: box(document.querySelector('.right .streaming-document .code-block-container pre')),
    }
  })
  // line pitch + paddings identical → panel heights identical (the reported
  // bug: the editor pane's code was display:block, lines at 21.12px, while
  // the streaming pane's inline code rode the pre's 24.32px pitch)
  expect(geo.leftContainer!.lineHeight).toBe(geo.rightContainer!.lineHeight)
  expect(geo.leftPre!.lineHeight).toBe(geo.rightPre!.lineHeight)
  expect(geo.leftPre!.paddingTop).toBe(geo.rightPre!.paddingTop)
  expect(geo.leftPre!.paddingBottom).toBe(geo.rightPre!.paddingBottom)
  expect(geo.leftPre!.h).toBe(geo.rightPre!.h)
  expect(Math.abs(geo.leftContainer!.h - geo.rightContainer!.h)).toBeLessThanOrEqual(0.5)
})

test('preview title bar: caret hidden until hover; hover+click opens the language menu (plan 039 T13)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-5"] .code-block-container', { timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)

  const trigger = page.locator('.left [data-block-id="block-5"] .code-block-header [data-codeblock-language-badge]')
  await expect(trigger).toBeVisible()
  // un-hovered: the caret affordance is transparent (pixel parity with the
  // plain view title bar)
  const caret = trigger.locator('.code-header-caret')
  await expect(caret).toHaveCSS('opacity', '0')

  // hover the language item: the affordance appears
  await trigger.hover()
  await expect(caret).not.toHaveCSS('opacity', '0')

  // click: the language menu opens (CodeBlockMenu anchors on the badge)
  await trigger.click()
  const menu = page.locator('.left .autodown-codeblock-menu')
  await expect(menu).toBeVisible()
  await menu.getByText('Python', { exact: true }).click()
  // the preview header now shows the new language
  await expect(trigger).toContainText('python')
})

test('edit face: language trigger lives in the title bar; popup switches language', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-5"]', { timeout: 10000 })
  await page.locator('.left [data-block-id="block-5"]').click()
  const node = page.locator('.left .autodown-codeblock-node')
  await expect(node).toBeVisible()

  // the edit face keeps the view container chrome (plan 039 T7: one chrome,
  // three modes) — the gray title bar is INSIDE the bordered container
  expect(await node.evaluate((el) => el.classList.contains('code-block-container'))).toBe(true)
  const trigger = node.locator('.code-block-header [data-codeblock-language-badge]')
  await expect(trigger).toBeVisible()
  // the old outside badge is gone: exactly one badge marker, in the header
  expect(await node.locator('[data-codeblock-language-badge]').count()).toBe(1)
  await expect(node.locator(':scope > [data-codeblock-language-badge]')).toHaveCount(0)
  // the trigger shows the current language plus the select affordance
  await expect(trigger).toContainText('javascript')

  // popup (CodeBlockMenu): pick python, the title bar updates
  await trigger.click()
  const menu = page.locator('.left .autodown-codeblock-menu')
  await expect(menu).toBeVisible()
  await menu.getByText('Python', { exact: true }).click()
  await expect(trigger).toContainText('python')
})

test('header actions: copy + collapse visible on both panes; collapse toggles (plan 039 T14)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-5"] .code-block-container', { timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)

  // visible in BOTH panes' headers (the actions left the widget when the
  // family widget absorbed the builtin panel — restored in T14). The right
  // pane has many fences — assert its first container.
  await expect(page.locator('.left [data-block-id="block-5"] [data-codeblock-copy-btn]')).toBeVisible()
  await expect(page.locator('.left [data-block-id="block-5"] [data-codeblock-expand-btn]')).toBeVisible()
  const rightFirst = page.locator('.right .streaming-document .code-block-container').first()
  await expect(rightFirst.locator('[data-codeblock-copy-btn]')).toBeVisible()
  await expect(rightFirst.locator('[data-codeblock-expand-btn]')).toBeVisible()

  // collapse toggles the widget pre's is-collapsed (editor pane)
  const pre = page.locator('.left [data-block-id="block-5"] pre')
  await page.locator('.left [data-block-id="block-5"] [data-codeblock-expand-btn]').click()
  await expect(pre).toHaveClass(/is-collapsed/)
  // and the streaming pane's own click handler toggles its pre too
  const rightPre = rightFirst.locator('pre')
  await rightFirst.locator('[data-codeblock-expand-btn]').click()
  await expect(rightPre).toHaveClass(/is-collapsed/)
})

test('edit face: the overlay highlight is visibly token-colored (plan 039 T9)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-5"]', { timeout: 10000 })
  await page.locator('.left [data-block-id="block-5"]').click()
  const overlayKeyword = page.locator(
    '.left .autodown-codeblock-node .code-editor-highlight code .hljs-keyword'
  )
  await expect(overlayKeyword).toHaveCount(1)
  // the token chain (pre code .hljs-*) must actually color the span — the
  // regression shape was bare spans under the pre (no <code> wrapper),
  // which rendered in the pre's base fg and looked unhighlighted
  const color = await overlayKeyword.evaluate((el) => getComputedStyle(el).color)
  expect(color).not.toBe('rgb(17, 24, 39)')
  expect(color).toBe('rgb(215, 58, 73)')
})
