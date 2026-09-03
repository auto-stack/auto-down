// Family parity e2e (plan 042 T1) — per-kind three-column parity pin. The
// fence family's code-block-parity.spec.ts pattern, extended to the remaining
// kind families: for every kind the EDITOR pane's focused (edit) face and the
// STREAMING pane's view face must agree on box metrics + key chrome
// (computed styles of the SAME-NAMED elements), because the family widget is
// the single chrome source — the historical drift (editor CSS vs
// StreamingRenderer's hand-copied :deep rules) is exactly what this spec
// exists to catch.
//
// Seven groups (the plan's coverage list): Callout / Details / Blockquote /
// List / Table / Heading / Paragraph. First run is expected RED — the
// failure list IS the measured diff list (工作清单, recorded in the plan's
// 复审记录); the family registration tasks turn it green.
//
// Addressing: both panes parse the same demo document, and the streaming
// pane assigns data-block-id="block-N" positionally to top-level slots —
// each group sanity-asserts text so an id mismatch fails loudly instead of
// comparing the wrong blocks.

import { test, expect, type Page } from '@playwright/test'

type Chrome = Record<string, string>

/** Computed chrome of the element `sel`: box metrics + the border/padding/
 *  color fields the kind groups compare. Height is rect-based, rounded to
 *  1/100 px (the code-block-parity idiom). */
async function chromeOf(page: Page, sel: string): Promise<Chrome> {
  return page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) throw new Error(`no element for ${s}`)
    const cs = getComputedStyle(el)
    const h = Math.round(el.getBoundingClientRect().height * 100) / 100
    return {
      height: String(h),
      lineHeight: cs.lineHeight,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      borderRadius: cs.borderRadius,
      borderTopWidth: cs.borderTopWidth,
      borderTopColor: cs.borderTopColor,
      borderLeftWidth: cs.borderLeftWidth,
      borderLeftColor: cs.borderLeftColor,
      paddingTop: cs.paddingTop,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      paddingRight: cs.paddingRight,
      marginTop: cs.marginTop,
      marginBottom: cs.marginBottom,
      listStyleType: cs.listStyleType,
    }
  }, sel)
}

/** Focus the left pane's block (click its node-slot) and wait for the edit
 *  face's marker so measurement never races the face swap. */
async function focusLeft(page: Page, blockId: string, editMarker: string): Promise<void> {
  await page.locator(`.left .node-slot[data-block-id="${blockId}"]`).click()
  await page.waitForSelector(editMarker, { timeout: 5000 })
}

/** Collect every field diff as a soft failure (one report line each) — the
 *  red list doubles as the measured diff list for the plan's 复审记录.
 *  Margin fields are deliberately NOT compared cross-pane: slot-edge margin
 *  rhythm is owned by scroll-sync measurement mode (the right pane's is-sync
 *  zeroing + the editor's own injection, pinned by the 039 T3 zero-jump
 *  specs) — comparing them here would measure the sync mode, not chrome. */
function expectChromeParity(kind: string, part: string, left: Chrome, right: Chrome, fields: string[]): void {
  for (const f of fields) {
    expect.soft(left[f] === right[f] ? 'equal' : `${left[f]} vs ${right[f]}`, `${kind} ${part}: ${f}`).toBe('equal')
  }
}

/** Height equality with the code-block-parity tolerance (sub-pixel). */
function expectHeightParity(kind: string, part: string, left: Chrome, right: Chrome): void {
  const lh = Number(left.height)
  const rh = Number(right.height)
  const diff = Math.abs(lh - rh)
  expect.soft(diff <= 0.5 ? 'equal' : `${lh} vs ${rh} (|diff| ${diff.toFixed(2)}px)`, `${kind} ${part}: height`).toBe('equal')
}

async function ready(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-1"]', { timeout: 10000 })
  await page.waitForSelector('.right .streaming-document', { timeout: 10000 })
  await page.evaluate(() => document.fonts.ready)
  // let the load-time focus + scroll-sync spacer injection settle
  await page.waitForTimeout(300)
}

test('callout family: edit face vs view face chrome parity', async ({ page }) => {
  await ready(page)
  // block-15 = $callout(type: "warning", title: "Warning")
  await expect(page.locator('.right [data-block-id="block-15"] .autodown-callout')).toContainText('warning')

  const rightRoot = await chromeOf(page, '.right [data-block-id="block-15"] .autodown-callout-warning')
  const rightTitle = await chromeOf(page, '.right [data-block-id="block-15"] .autodown-callout-title')
  await focusLeft(page, 'block-15', '.left .autodown-attr-host.autodown-callout-title')
  const leftRoot = await chromeOf(page, '.left [data-block-id="block-15"] .autodown-callout-warning')
  const leftTitle = await chromeOf(page, '.left [data-block-id="block-15"] .autodown-callout-title')

  expectChromeParity('callout', 'card', leftRoot, rightRoot, [
    'backgroundColor', 'borderTopWidth', 'borderTopColor', 'borderLeftWidth', 'borderLeftColor',
    'borderRadius', 'paddingTop', 'paddingBottom', 'paddingLeft', 'lineHeight',
  ])
  expectChromeParity('callout', 'title', leftTitle, rightTitle, [
    'fontSize', 'fontWeight', 'lineHeight', 'color',
  ])
  // the card is actually chrome'd on both panes (not default transparent)
  expect.soft(rightRoot.backgroundColor, 'callout card: view bg is styled').not.toBe('rgba(0, 0, 0, 0)')
  expect.soft(leftRoot.backgroundColor, 'callout card: edit bg is styled').not.toBe('rgba(0, 0, 0, 0)')
})

test('details family: edit face vs view face chrome parity', async ({ page }) => {
  await ready(page)
  // block-18 = $details(summary: "Click to expand") — both panes render the
  // family widget face (div.autodown-details, the panel pipeline); the
  // summary ROW is the same-named comparable element.
  await expect(page.locator('.right [data-block-id="block-18"] .autodown-details-summary-text')).toContainText('Click to expand')

  const rightSummary = await chromeOf(page, '.right [data-block-id="block-18"] .autodown-details-summary')
  // the collapsed card's marker/text clicks TOGGLE open (stopPropagation —
  // they never reach the slot's select handler), so open it explicitly, then
  // click the revealed content paragraph to focus a leaf inside the container
  await page.locator('.left [data-block-id="block-18"] .autodown-details-marker').click()
  await page.waitForSelector('.left [data-block-id="block-18"] .autodown-details-content p')
  await page.locator('.left [data-block-id="block-18"] .autodown-details-content p').click()
  await page.waitForSelector('.left .autodown-attr-host.autodown-details-summary-text', { timeout: 5000 })
  const leftSummary = await chromeOf(page, '.left [data-block-id="block-18"] .autodown-details-summary')
  expectChromeParity('details', 'summary row', leftSummary, rightSummary, [
    'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor',
    'paddingTop', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRadius',
  ])
  expectHeightParity('details', 'summary row', leftSummary, rightSummary)
})

test('blockquote family: edit face vs view face chrome parity', async ({ page }) => {
  await ready(page)
  // block-4 = the single blockquote
  await expect(page.locator('.right [data-block-id="block-4"] blockquote')).toContainText('blockquote')

  const rightRoot = await chromeOf(page, '.right [data-block-id="block-4"] blockquote')
  const rightP = await chromeOf(page, '.right [data-block-id="block-4"] blockquote p')
  await focusLeft(page, 'block-4', '.left [data-block-id="block-4"] blockquote .markdown-renderer')
  const leftRoot = await chromeOf(page, '.left [data-block-id="block-4"] blockquote')
  const leftP = await chromeOf(page, '.left [data-block-id="block-4"] blockquote p')

  expectChromeParity('blockquote', 'card', leftRoot, rightRoot, [
    'borderLeftWidth', 'borderLeftColor', 'paddingLeft', 'paddingTop', 'paddingBottom', 'color',
  ])
  expectChromeParity('blockquote', 'body p', leftP, rightP, ['lineHeight', 'fontSize'])
})

test('list family: edit face vs view face chrome parity', async ({ page }) => {
  await ready(page)
  // block-11 = the nested bullet list
  // direct-child ul: block-11 has a NESTED list inside the first item — the
  // outer ul is the comparable root
  await expect(page.locator('.right [data-block-id="block-11"] > ul')).toContainText('Bullet item one')

  const rightUl = await chromeOf(page, '.right [data-block-id="block-11"] > ul.list-node')
  const rightLi = await chromeOf(page, '.right [data-block-id="block-11"] > ul.list-node > li')
  await focusLeft(page, 'block-11', '.left [data-block-id="block-11"] ul.list-node .markdown-renderer')
  const leftUl = await chromeOf(page, '.left [data-block-id="block-11"] ul.list-node')
  const leftLi = await chromeOf(page, '.left [data-block-id="block-11"] ul.list-node > li')

  expectChromeParity('list', 'ul', leftUl, rightUl, ['paddingLeft', 'listStyleType'])
  expectChromeParity('list', 'li', leftLi, rightLi, ['paddingTop', 'paddingBottom', 'lineHeight'])
  expectHeightParity('list', 'li', leftLi, rightLi)
})

test('table family: edit face vs view face cell chrome parity', async ({ page }) => {
  await ready(page)
  // block-14 = the 3x4 table; edit face root is .autodown-table-editor (its
  // toolbar is an edit affordance — cell chrome is the comparable surface)
  await expect(page.locator('.right [data-block-id="block-14"] table')).toContainText('Foo')

  const rightTh = await chromeOf(page, '.right [data-block-id="block-14"] table th')
  const rightTd = await chromeOf(page, '.right [data-block-id="block-14"] table tbody td')
  await focusLeft(page, 'block-14', '.left [data-block-id="block-14"] .autodown-table-editor .te-toolbar')
  const leftTh = await chromeOf(page, '.left [data-block-id="block-14"] .autodown-table-editor table th')
  const leftTd = await chromeOf(page, '.left [data-block-id="block-14"] .autodown-table-editor table tbody td')

  expectChromeParity('table', 'th', leftTh, rightTh, [
    'borderTopWidth', 'borderTopColor', 'borderLeftWidth', 'borderLeftColor',
    'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
    'fontSize', 'fontWeight', 'lineHeight', 'backgroundColor',
  ])
  expectChromeParity('table', 'td', leftTd, rightTd, [
    'borderTopWidth', 'borderTopColor', 'borderLeftWidth', 'borderLeftColor',
    'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'fontSize', 'lineHeight',
  ])
  expectHeightParity('table', 'th', leftTh, rightTh)
})

test('heading family: focused host vs view face typography parity', async ({ page }) => {
  await ready(page)
  // block-2 = "## Heading Two" (single line — height is comparable)
  await expect(page.locator('.right [data-block-id="block-2"] h2')).toContainText('Heading Two')

  const right = await chromeOf(page, '.right [data-block-id="block-2"] h2.heading-node')
  await focusLeft(page, 'block-2', '.left .autodown-block-host[data-block-id="block-2"]')
  const left = await chromeOf(page, '.left .autodown-block-host[data-block-id="block-2"]')

  expectChromeParity('heading', 'h2', left, right, ['fontSize', 'fontWeight', 'lineHeight', 'color'])
  expectHeightParity('heading', 'h2', left, right)
})

test('paragraph family: focused host vs view face typography parity', async ({ page }) => {
  await ready(page)
  // block-1 = the intro paragraph (long text — wrap-dependent height is NOT
  // comparable across panes; line pitch + margins + mark colors are)
  await expect(page.locator('.right [data-block-id="block-1"] p')).toContainText('bold')

  const right = await chromeOf(page, '.right [data-block-id="block-1"] p.paragraph-node')
  const rightStrong = await chromeOf(page, '.right [data-block-id="block-1"] p strong')
  await focusLeft(page, 'block-1', '.left .autodown-block-host[data-block-id="block-1"]')
  const left = await chromeOf(page, '.left .autodown-block-host[data-block-id="block-1"]')
  const leftStrong = await chromeOf(page, '.left .autodown-block-host[data-block-id="block-1"] strong')

  expectChromeParity('paragraph', 'p', left, right, ['fontSize', 'lineHeight', 'color'])
  expectChromeParity('paragraph', 'strong', leftStrong, rightStrong, ['fontWeight', 'color'])
})
