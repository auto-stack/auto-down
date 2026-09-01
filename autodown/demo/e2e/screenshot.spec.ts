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

// plan 035 T8 — the container families' focused edit faces, archived for
// the manual-verification record (029/031/033 T10 口径): three cases the
// plan names — Callout title in place (AttrHost), Details summary + open
// flip, task checkbox flip. One composite image; purely additive.
test('capture container edit faces (plan 035)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 10000 })
  test.setTimeout(120000)
  const shots: Record<string, Buffer> = {}

  // 1. Callout: focus the body — the card keeps its chrome, the title
  //    becomes the AttrHost in-place host
  const callout = page.locator('.left .callout-node[data-callout-type="warning"]').first()
  await callout.scrollIntoViewIfNeeded()
  await callout.getByText('warning callout').first().click()
  await page.waitForTimeout(400)
  await expect.soft(callout.locator('.autodown-attr-host.autodown-callout-title')).toBeVisible()
  shots.callout = await callout.screenshot()
  await page.locator('.autodown-editor-save').click()
  await page.waitForTimeout(200)

  // 2. Details: focus the body — the summary becomes the AttrHost; flip
  //    open through the marker
  const details = page.locator('.left .autodown-details').filter({ hasText: 'Click to expand' }).first()
  await details.scrollIntoViewIfNeeded()
  await details.locator('.autodown-details-marker').click()
  await expect.soft(details).toHaveAttribute('data-open', 'true')
  await details.getByText('Details block', { exact: false }).first().click()
  await page.waitForTimeout(400)
  await expect.soft(details.locator('.autodown-attr-host.autodown-details-summary-text')).toBeVisible()
  shots.details = await details.screenshot()
  await page.locator('.autodown-editor-save').click()
  await page.waitForTimeout(200)

  // 3. Task list: focus an item — the checkbox is LIVE (command channel)
  const task = page.locator('.left li.task-item .task-checkbox').first()
  const taskList = task.locator('xpath=ancestor::ul').first()
  await taskList.scrollIntoViewIfNeeded()
  await taskList.click()
  await page.waitForTimeout(400)
  shots.task = await taskList.screenshot()

  const figures = Object.entries(shots).map(([name, buf]) => {
    const b64 = buf.toString('base64')
    return `<figure style="margin:0"><figcaption style="font-size:12px;font-weight:600;color:#374151;padding:4px 0">${name}</figcaption><img src="data:image/png;base64,${b64}" style="display:block;border:1px solid #d1d5db;background:#fff"/></figure>`
  }).join('')
  await page.setContent(
    `<body style="margin:0;font-family:system-ui;background:#f3f4f6"><div style="display:flex;gap:12px;align-items:flex-start;padding:12px">${figures}</div></body>`,
  )
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'e2e/screenshots/container-edit-faces.png', fullPage: true })
})

// plan 037 T6 — the table edit face's three manual-verification cases,
// archived (029/031/033/035 T10 口径): toolbar verb (add-row lands),
// cell blur commit (typed text lands in the markdown), undo single step
// (the commit reverts as ONE undo step, the added row survives it). One
// composite image; purely additive.
test('capture table edit faces (plan 037)', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 10000 })
  test.setTimeout(120000)
  const shots: Record<string, Buffer> = {}
  const face = page.locator('.left .autodown-table-editor')

  // focus the table through the preview face (host-protocol idiom)
  const cell = page.locator('.left').getByText('Alpha', { exact: true })
  await cell.scrollIntoViewIfNeeded()
  await cell.click()
  await expect.soft(face.locator('.te-toolbar')).toBeVisible()

  // 1. toolbar verb: add-row appends a fourth body row (ONE undo step)
  await expect.soft(face.locator('tbody tr')).toHaveCount(3)
  await face.locator('[data-te-action="add-row"]').click()
  await expect.soft(face.locator('tbody tr')).toHaveCount(4)
  shots.toolbar = await face.screenshot()

  // 2. cell blur commit: type into the new row's first cell, blur commits
  //    through the ext bridge (dataset.cellId → commitCell)
  const newCell = face.locator('tbody tr').last().locator('td').first()
  await newCell.click()
  await page.keyboard.type('Qux')
  await page.locator('.autodown-editor-save').click()
  await page.waitForTimeout(300)
  await expect.soft(face.locator('tbody tr').last().locator('td').first()).toContainText('Qux')
  shots.blur = await face.screenshot()

  // 3. undo single step: refocus the table, Ctrl+Z reverts ONLY the cell
  //    commit (the row survives; the typed text is gone)
  await cell.click()
  await page.waitForTimeout(300)
  await page.keyboard.press('Control+z')
  await expect.soft(face.locator('tbody tr')).toHaveCount(4)
  await expect.soft(face.locator('tbody tr').last().locator('td').first()).not.toContainText('Qux')
  shots.undo = await face.screenshot()

  const figures = Object.entries(shots).map(([name, buf]) => {
    const b64 = buf.toString('base64')
    return `<figure style="margin:0"><figcaption style="font-size:12px;font-weight:600;color:#374151;padding:4px 0">table &middot; ${name}</figcaption><img src="data:image/png;base64,${b64}" style="display:block;border:1px solid #d1d5db;background:#fff"/></figure>`
  }).join('')
  await page.setContent(
    `<body style="margin:0;font-family:system-ui;background:#f3f4f6"><div style="display:flex;gap:12px;align-items:flex-start;padding:12px">${figures}</div></body>`,
  )
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'e2e/screenshots/table-edit-faces.png', fullPage: true })
})
