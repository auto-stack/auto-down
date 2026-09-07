import { test, expect, type Page } from '@playwright/test'

// PLAN-059 T8: showcase smoke e2e — seven cases pinning the three-mode
// surface: pane toggles, edit→view sync, feed replay/autoplay/settled with
// stream≡view DOM equality, theme propagation. Anchors are showcase-owned
// (col-edit/col-view/col-stream, toggle-*, btn-*, speed-*); the demo's
// .left/.right set is untouched (PLAN-059 冻结锚零扰动).

const streamDoc = (page: Page) => page.locator('.col-stream .streaming-document')
const viewDoc = (page: Page) => page.locator('.col-view .streaming-document')

/** stream-demo waitSettled semantics: the engine's typewriter/scheduler
 * keeps flushing after the source stops changing — two frames 300ms apart
 * must agree before the DOM is comparable. */
async function renderSettled(page: Page): Promise<string> {
  const doc = streamDoc(page)
  for (let i = 0; i < 40; i++) {
    const snap = await doc.innerHTML()
    await page.waitForTimeout(300)
    if ((await doc.innerHTML()) === snap) return snap
  }
  throw new Error('stream pane render never settled')
}

test('default layout: three panes visible', async ({ page }) => {
  await page.goto('/')
  for (const name of ['col-edit', 'col-view', 'col-stream']) {
    await expect(page.locator(`.${name}`)).toHaveCount(1)
  }
})

test('pane toggles hide and restore each column', async ({ page }) => {
  await page.goto('/')
  for (const [toggle, col] of [
    ['.toggle-edit', '.col-edit'],
    ['.toggle-view', '.col-view'],
    ['.toggle-stream', '.col-stream'],
  ] as const) {
    await page.click(toggle)
    await expect(page.locator(col)).toHaveCount(0)
    await page.click(toggle)
    await expect(page.locator(col)).toHaveCount(1)
  }
})

test('edit input mirrors into the view pane live', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('.col-edit .autodown-editor [contenteditable]').first()
  await editor.click()
  await editor.fill('')
  await editor.type('## E2E Sync Probe')
  await expect(page.locator('.col-view')).toContainText('E2E Sync Probe')
})

test('replay → autoplay → settled: stream DOM equals view DOM', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.streaming-document', { timeout: 10000 })

  await page.click('.btn-replay')
  await page.click('.speed-hi')
  await page.click('.btn-play')

  // autoplay must reach the settled state hands-free (T6 bridge)
  await expect(page.locator('.pane-status')).toHaveText('已落定', { timeout: 30000 })
  const streamHtml = await renderSettled(page)

  // 041 T12 invariant, regression-pinned here: the streamed-settled pane and
  // the one-shot view pane render the same document identically.
  const viewHtml = await viewDoc(page).innerHTML()
  expect(streamHtml).toBe(viewHtml)
})

test('dark theme reaches all three panes and the app chrome', async ({ page }) => {
  await page.goto('/')
  await page.click('.settings-trigger')
  await page.click('text=🌙 Dark')
  // per-pane roots: the render panes are .streaming-document, the edit pane
  // root is .autodown-editor (051 darkMode prop → component root .is-dark).
  await expect(page.locator('.col-view .streaming-document.is-dark')).toHaveCount(1)
  await expect(page.locator('.col-stream .streaming-document.is-dark')).toHaveCount(1)
  await expect(page.locator('.col-edit .autodown-editor.is-dark')).toHaveCount(1)
  await expect(page.locator('.app-dark')).toHaveCount(1)
})

test('accent switch propagates data-accent to all panes', async ({ page }) => {
  await page.goto('/')
  await page.click('.settings-trigger')
  await page.click('.settings-popover .settings-btn.bg-rose-500')
  await expect(page.locator('[data-accent="coral"]')).toHaveCount(3)
})

test('speed selector echoes the active step size', async ({ page }) => {
  await page.goto('/')
  // plan's downgraded assertion (allowed by 测试设计 #7): the active speed
  // button carries the highlight class; step-count monotonicity is covered
  // by the T5/T6 probes, not pinned here.
  await expect(page.locator('.speed-mid')).toHaveClass(/speed-btn-on/)
  await page.click('.speed-lo')
  await expect(page.locator('.speed-lo')).toHaveClass(/speed-btn-on/)
  await expect(page.locator('.speed-mid')).not.toHaveClass(/speed-btn-on/)
})
