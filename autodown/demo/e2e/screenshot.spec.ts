import { test, expect } from '@playwright/test'

test('capture initial viewport screenshot', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 5000 })
  await page.waitForTimeout(1000)

  await page.screenshot({ path: 'e2e/screenshots/initial-viewport.png', fullPage: false })
  console.log('Screenshot saved to e2e/screenshots/initial-viewport.png')

  expect(true).toBe(true)
})

// plan 031 T10 — the math/mermaid typed edit faces, archived for the
// manual-verification record (029 T10 口径): focus each block so the
// source+live-preview face mounts, capture the editor pane.
test('capture math and mermaid edit-face screenshots (plan 031)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 10000 })

  const left = page.locator('.left')
  await left.locator('.autodown-math-block').first().scrollIntoViewIfNeeded()
  await left.locator('.autodown-math-block').first().click()
  await page.waitForTimeout(400)
  await expect.soft(left.locator('.autodown-math-editor .autodown-math-preview .katex')).toBeVisible()
  await left.locator('.autodown-math-editor').screenshot({ path: 'e2e/screenshots/math-edit-face.png' })

  await left.locator('.autodown-mermaid-block').first().scrollIntoViewIfNeeded()
  await left.locator('.autodown-mermaid-block').first().click()
  await page.waitForTimeout(400)
  await expect.soft(left.locator('.autodown-mermaid-editor .autodown-mermaid-preview svg')).toBeVisible({ timeout: 10000 })
  await left.locator('.autodown-mermaid-editor').screenshot({ path: 'e2e/screenshots/mermaid-edit-face.png' })
})

// plan 033 T8 — the three pilot families' three-mode chrome, archived for
// the manual-verification record (029/031 T10 口径): one composite per kind
// (view / stream / edit side by side). view+stream come from the 032
// stream harness (feed() holds the tri-state frames stably — same corpus
// shape as the tri-state e2e); edit comes from the demo editor pane with
// the block focused. The composites pin the family mechanism's whole
// point: one chrome across the modes.
const MODE_CASES = [
  {
    name: 'fence',
    closed: '```rust\nfn main() {\n    println!("hello");\n}\n```',
    streamFeed: '```rust\nfn main() {',
    streamSel: '#stream-pane .code-block-container.autodown-block-placeholder.is-loading',
    viewSel: '#final-pane .code-block-container',
    previewSel: '.left .code-block-container',
    editSel: '.left .autodown-codeblock-node',
  },
  {
    name: 'math',
    closed: '%{\ne = mc^2\n}%',
    streamFeed: '%{\ne = mc^',
    streamSel: '#stream-pane .paragraph-node',
    viewSel: '#final-pane .autodown-math-block',
    previewSel: '.left .autodown-math-block',
    editSel: '.left .autodown-math-editor',
  },
  {
    name: 'mermaid',
    closed: '```mermaid\ngraph TD; A-->B;\n```',
    streamFeed: '```mermaid\ngraph TD; A',
    streamSel: '#stream-pane .code-block-container.autodown-block-placeholder.is-loading',
    viewSel: '#final-pane .autodown-mermaid-block',
    previewSel: '.left .autodown-mermaid-block',
    editSel: '.left .autodown-mermaid-editor',
  },
] as const

const MODES = ['view', 'stream', 'edit'] as const

test('capture three-mode comparison screenshots (plan 033)', async ({ page }) => {
  // -- harness panes: view + stream captures --------------------------------
  await page.goto('/stream-harness.html')
  await page.waitForFunction(() => (window as any).__streamHarness != null)
  const shots: Record<string, Record<typeof MODES[number], Buffer>> = {}
  for (const c of MODE_CASES) {
    await page.evaluate((t) => (window as any).__streamHarness.feed(t), c.closed)
    await page.locator(c.viewSel).first().waitFor({ state: 'visible', timeout: 10000 })
    await page.waitForTimeout(400)
    const view = await page.locator(c.viewSel).first().screenshot()

    await page.evaluate((t) => (window as any).__streamHarness.feed(t), c.streamFeed)
    await page.locator(c.streamSel).first().waitFor({ state: 'visible', timeout: 10000 })
    await page.waitForTimeout(400)
    const stream = await page.locator(c.streamSel).first().screenshot()
    shots[c.name] = { view, stream, edit: Buffer.alloc(0) }
  }

  // -- demo editor pane: edit captures --------------------------------------
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 10000 })
  test.setTimeout(120000)
  for (const c of MODE_CASES) {
    // the edit face exists only after focusing the block — click the PREVIEW
    // face (or the pane-local container), then wait the edit face in
    const preview = page.locator(c.previewSel).first()
    await preview.scrollIntoViewIfNeeded()
    await preview.click()
    const face = page.locator(c.editSel).first()
    await face.waitFor({ state: 'visible', timeout: 10000 })
    await page.waitForTimeout(600)
    shots[c.name].edit = await face.screenshot()
    // blur back to the preview face (Save button steals focus harmlessly)
    await page.locator('.autodown-editor-save').click()
    await page.waitForTimeout(200)
  }

  // -- compose one comparison image per kind --------------------------------
  for (const c of MODE_CASES) {
    const figures = MODES.map((m) => {
      const b64 = shots[c.name][m].toString('base64')
      return `<figure style="margin:0"><figcaption style="font-size:12px;font-weight:600;color:#374151;padding:4px 0">${c.name} &middot; ${m}</figcaption><img src="data:image/png;base64,${b64}" style="display:block;border:1px solid #d1d5db;background:#fff"/></figure>`
    }).join('')
    await page.setContent(
      `<body style="margin:0;font-family:system-ui;background:#f3f4f6"><div style="display:flex;gap:12px;align-items:flex-start;padding:12px">${figures}</div></body>`,
    )
    await page.waitForTimeout(200)
    await page.screenshot({ path: `e2e/screenshots/${c.name}-three-modes.png`, fullPage: true })
  }
})
