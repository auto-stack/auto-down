// Extension block e2e (plan 030 T8) — the engine's own serialization dialect
// ($callout/$details/%{ }%/```mermaid/task lists) pinned on the real demo DOM:
// focusing a callout's body keeps the card chrome while editing in place;
// the details summary edits through the borderless AttrHost; task checkboxes
// flip on click; %{ }% renders a KaTeX panel in the right pane; the Save
// output round-trips the dialect verbatim.

import { test, expect, type Page } from '@playwright/test'

async function captureSaves(page: Page): Promise<() => string> {
  const saved: string[] = []
  page.on('console', (msg) => {
    const text = msg.text()
    if (msg.type() === 'log' && text.startsWith('saved:')) saved.push(text.slice('saved:'.length))
  })
  return () => saved[saved.length - 1] ?? ''
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 10000 })
})

test('focusing a callout body keeps the card chrome and edits in place', async ({ page }) => {
  const left = page.locator('.left')
  // preview first: the builtin panel renders the card (no unknown-node)
  const card = left.locator('.callout-node[data-callout-type="warning"]')
  await expect(card).toBeVisible()
  // click into the card body — the container expands, the body paragraph
  // mounts a host, the chrome classes survive verbatim
  await card.scrollIntoViewIfNeeded()
  await card.getByText('warning callout').first().click()
  await page.waitForTimeout(250)
  const host = left.locator('.autodown-block-host')
  await expect(host).toBeVisible()
  await expect(host).toHaveText(/warning callout/)
  await expect(card).toBeVisible()
  await expect(card.locator('.autodown-callout-title')).toBeVisible()
  // the title host is a borderless in-place attr editor (no <input>)
  await expect(card.locator('.autodown-attr-host.autodown-callout-title')).toBeVisible()
  await expect(card.locator('input')).toHaveCount(0)
})

test('the details summary edits through the borderless AttrHost', async ({ page }) => {
  const left = page.locator('.left')
  const preview = left.locator('.autodown-details').first()
  await expect(preview).toBeVisible()
  await preview.scrollIntoViewIfNeeded()
  // the preview panel rides the editor's live node-view host: clicking the
  // summary text flips `open` through updateAttributes
  await preview.getByText('Click to expand').click()
  await page.waitForTimeout(250)
  // clicking the (now visible) body focuses its first paragraph — the
  // container expands and the summary becomes the borderless AttrHost
  await preview.getByText('Details block', { exact: false }).click()
  await page.waitForTimeout(250)
  const summary = left.locator('.autodown-details .autodown-attr-host.autodown-details-summary-text')
  await expect(summary).toBeVisible()
  await expect(summary).toHaveText('Click to expand')
  await summary.click()
  await page.waitForTimeout(150)
  await page.keyboard.press('Control+a')
  await page.keyboard.type('Renamed summary')
  // Enter commits (blur) — the right pane re-renders the new summary
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  await expect(page.locator('.right').getByText('Renamed summary')).toBeVisible()
})

test('task checkboxes flip on click and serialize the flag', async ({ page }) => {
  const left = page.locator('.left')
  // click into the task list to expand the live assembly
  await left.getByText('Task item pending').first().click()
  await page.waitForTimeout(250)
  const pending = left.locator('.task-item', { hasText: 'Task item pending' }).locator('.task-checkbox')
  await expect(pending).toBeVisible()
  await expect(pending).not.toBeChecked()
  await pending.click()
  await expect(pending).toBeChecked()
  // committed through the attr channel → right pane shows a checked box
  const right = page.locator('.right .task-item', { hasText: 'Task item pending' })
  await expect(right.locator('.task-checkbox')).toBeChecked()
})

test('%{ }% renders a KaTeX panel and the mermaid fence a mermaid panel in the right pane', async ({ page }) => {
  const right = page.locator('.right')
  await expect(right.locator('.autodown-math-block .autodown-math-preview')).toBeVisible()
  await expect(right.locator('.katex')).toHaveCount(1)
  // mermaid renders async — poll for the SVG inside the mermaid panel
  await expect(right.locator('.autodown-mermaid-block')).toBeVisible()
  await expect(right.locator('.autodown-mermaid-block svg')).toBeVisible({ timeout: 10000 })
})

test('Save round-trips the dialect verbatim ($callout / - [x])', async ({ page }) => {
  const lastSave = await captureSaves(page)
  await page.locator('.autodown-editor-save').click()
  await expect
    .poll(() => lastSave())
    .toContain('$callout(type: "warning", title: "Warning") {')
  await expect
    .poll(() => lastSave())
    .toContain('- [x] Task item done')
  await expect
    .poll(() => lastSave())
    .toContain('- [ ] Task item pending')
  await expect
    .poll(() => lastSave())
    .toContain('$details(summary: "Click to expand") {')
  await expect
    .poll(() => lastSave())
    .toContain('%{')
})
