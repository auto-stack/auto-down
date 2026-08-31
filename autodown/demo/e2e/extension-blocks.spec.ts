// Extension block e2e (plan 030 T8) — the engine's own serialization dialect
// ($callout/$details/%{ }%/```mermaid/task lists) pinned on the real demo DOM:
// focusing a callout's body keeps the card chrome while editing in place;
// the details summary edits through the borderless AttrHost; task checkboxes
// flip on click; %{ }% renders a KaTeX panel in the right pane; the Save
// output round-trips the dialect verbatim.
//
// plan 031 T9 additions — the math/mermaid typed edit faces: focusing the
// blocks mounts source+live-preview editors (MathEditBlock synchronously via
// katex, MermaidEditBlock debounced with the loading/error/svg tri-state);
// blur commits through the shared CodeEditorController protocol and Save
// round-trips. (The streaming readonly banner is pinned at SSR level in the
// engine tests — math-mermaid-edit-block.test.ts, the 023 CodeEditorBlock
// precedent: the demo app exposes no streaming toggle.)

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

// -- plan 031 T9: the math/mermaid typed edit faces --------------------------------

test('focusing the math block mounts the source + live-preview edit face', async ({ page }) => {
  const left = page.locator('.left')
  const preview = left.locator('.autodown-math-block').first()
  await expect(preview).toBeVisible()
  await preview.scrollIntoViewIfNeeded()
  await preview.click()
  await page.waitForTimeout(250)
  const editor = left.locator('.autodown-math-editor')
  await expect(editor).toBeVisible()
  const area = editor.locator('textarea.math-editor-textarea')
  await expect(area).toBeVisible()
  await expect(area).toHaveValue(/E = mc\^2/)
  // katex is synchronous — the live preview paints over the textarea
  await expect(editor.locator('.autodown-math-preview .katex')).toBeVisible()
})

test('editing math source updates the preview live; invalid source shows the error banner; blur commits', async ({ page }) => {
  const lastSave = await captureSaves(page)
  const left = page.locator('.left')
  await left.locator('.autodown-math-block').first().scrollIntoViewIfNeeded()
  await left.locator('.autodown-math-block').first().click()
  await page.waitForTimeout(250)
  const editor = left.locator('.autodown-math-editor')
  const area = editor.locator('textarea.math-editor-textarea')
  // fill() (not keyboard.type): the local Windows layout drops literal
  // backslashes from simulated keystrokes — fill sets the value and fires
  // the input event through the same v-model path
  await area.fill('\\int_0^1 x^2 \\, dx')
  // live: the new source renders immediately
  await expect(editor.locator('.autodown-math-preview .katex')).toBeVisible()
  // invalid source: the banner replaces the preview (no crash)
  await area.fill('\\frac{')
  await expect(editor.locator('.autodown-math-error')).toBeVisible()
  await expect(editor.locator('.autodown-math-preview')).toHaveCount(0)
  // fix and commit: blur writes the whole source back (one undo step)
  await area.fill('\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}')
  await expect(editor.locator('.autodown-math-preview .katex')).toBeVisible()
  await left.getByText('Heading One').click()
  await page.waitForTimeout(300)
  await page.locator('.autodown-editor-save').click()
  await expect
    .poll(() => lastSave())
    .toContain('\\frac{n(n+1)}{2}')
})

test('focusing the mermaid block mounts the debounced face (loading → svg, error banner on bad source)', async ({ page }) => {
  const left = page.locator('.left')
  const preview = left.locator('.autodown-mermaid-block').first()
  await expect(preview).toBeVisible()
  await preview.scrollIntoViewIfNeeded()
  await preview.click()
  await page.waitForTimeout(250)
  const editor = left.locator('.autodown-mermaid-editor')
  await expect(editor).toBeVisible()
  const area = editor.locator('textarea.mermaid-editor-textarea')
  await expect(area).toBeVisible()
  await expect(area).toHaveValue(/graph TD/)
  // the initial render settles into an svg preview (debounce + first
  // mermaid.render is slow — poll generously)
  await expect(editor.locator('.autodown-mermaid-preview svg')).toBeVisible({ timeout: 10000 })
  // typing flips to loading synchronously (inside the 300ms debounce
  // window), then settles back to the svg
  await area.fill('graph LR\n  A[开始] --> B[结束]')
  await expect(editor.locator('.mermaid-editor-loading')).toBeVisible()
  await expect(editor.locator('.autodown-mermaid-preview svg')).toBeVisible({ timeout: 10000 })
  // invalid source: the error banner replaces the preview
  await area.fill('this is not a diagram')
  await expect(editor.locator('.autodown-mermaid-error')).toBeVisible({ timeout: 10000 })
  await expect(editor.locator('.autodown-mermaid-preview')).toHaveCount(0)
})
