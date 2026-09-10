// Inline input rules e2e (plan-062 T-06): real-keyboard flow input over the
// rich-text edit face. AC-01/02 type `**agc**` and assert the span transform
// (marker gone, cursor after the mark, new typing plain); AC-03 pins the
// single-undo semantics; AC-05 exercises the cancel channel (caret into a
// formatted token → bubble + active toggle-off); AC-06 the selection
// shortcut. Serif details of the matcher live in the engine unit matrix
// (inline-input-rules.test.ts).

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.left')).toBeVisible()
})

const HOST = '.left [data-block-id][contenteditable]'

test.describe('inline input rules', () => {
  test('AC-01/02: **agc** converts to bold, marker gone, cursor after the mark', async ({
    page,
  }) => {
    const host = page.locator(HOST).first()
    await host.click()
    await host.fill('') // the seed block is non-empty — start every case clean
    await page.keyboard.type('**agc**')
    await expect(host.locator('strong')).toHaveText('agc')
    await expect(host).not.toContainText('**')
    // AC-02: the caret parked after the mark — new typing lands OUTSIDE the
    // strong element as plain text.
    await page.keyboard.type('x')
    await expect(host.locator('strong')).toHaveText('agc')
    expect((await host.innerHTML()).replace(/​/g, '')).toBe('<strong>agc</strong>x')
  })

  test('AC-03: one Ctrl+Z reverts to the typed marker text', async ({ page }) => {
    const host = page.locator(HOST).first()
    await host.click()
    await host.fill('') // the seed block is non-empty — start every case clean
    await page.keyboard.type('**agc**')
    await expect(host.locator('strong')).toHaveText('agc')
    await page.keyboard.press('Control+z')
    await expect(host).toContainText('**agc**')
    await expect(host.locator('strong')).toHaveCount(0)
  })

  test('AC-04: ~~strike~~ and *em* transform; escaped opener does not fire', async ({
    page,
  }) => {
    const host = page.locator(HOST).first()
    await host.click()
    await host.fill('') // the seed block is non-empty — start every case clean
    await page.keyboard.type('~~gone~~')
    await expect(host.locator('s, strike, del')).toHaveText('gone')
    await page.keyboard.type(' *it*')
    await expect(host.locator('em')).toHaveText('it')
    // "\*lit*" — the backslash-escaped opener must not fire; the literal
    // asterisks stay visible (serializer escaping is a registered debt).
    await page.keyboard.type(' \\*lit\\*')
    await expect(host.locator('em')).toHaveCount(1)
  })

  test('AC-05: caret into a bold token shows the bubble; the button toggles it off', async ({
    page,
  }) => {
    const host = page.locator(HOST).first()
    await host.click()
    await host.fill('') // the seed block is non-empty — start every case clean
    await page.keyboard.type('**bold** tail')
    await expect(host.locator('strong')).toHaveText('bold')
    // caret into the middle of the bold token
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    const bubble = page.locator('.autodown-bubble-menu')
    await expect(bubble).toBeVisible()
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(400)
      console.log('PAGE cls:', await bubble.locator('.autodown-bubble-btn[title="Bold"]').getAttribute('class'))
    }
    const boldBtn = bubble.locator('.autodown-bubble-btn[title="Bold"]')
    await expect(boldBtn).toHaveClass(/active/)
    await boldBtn.click()
    await expect(host.locator('strong')).toHaveCount(0)
    await expect(host).toContainText('bold')
  })

  test('AC-06: Ctrl+B toggles bold over a word selection', async ({ page }) => {
    const host = page.locator(HOST).first()
    await host.click()
    await host.fill('') // the seed block is non-empty — start every case clean
    await page.keyboard.type('plain word')
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Control+b')
    await expect(host.locator('strong')).toHaveText('plain')
  })
})
