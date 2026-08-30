// Undo/redo e2e (plan 028 P0T2) — the Ctrl+Z/Y wiring on the real DOM:
// rich host typing reverts/restores through the history hop (the focused
// face remounts from the restored tree — its draft DOM is non-reactive),
// and a committed code-block edit reverts the same way (blur commit is one
// applyTree entry; Ctrl+Z over the textarea routes to the engine, native
// textarea undo is prevented).

import { test, expect } from '@playwright/test'

test('rich host: Ctrl+Z reverts the typed run, Ctrl+Y restores it', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id]', { timeout: 10000 })

  await page.locator('.left [data-node-type="Paragraph"]').first().click()
  const host = page.locator('.left .autodown-block-host')
  await expect(host).toBeVisible()
  // mount render keeps the baseline text (link is the last inline)
  await expect(host).toContainText('link.')

  // type a run at the end — adjacent InsertText coalesces into ONE entry
  await page.keyboard.type(' more')
  await expect(host).toContainText('link. more')

  // Ctrl+Z: the run reverts in the focused face AND the re-emitted md
  await page.keyboard.press('Control+z')
  await expect(host).toContainText('link.')
  await expect(host).not.toContainText('link. more')
  await expect(page.locator('.right [data-block-slot-id="block-1"]')).not.toContainText('link. more')

  // Ctrl+Y: the run replays (face + roundtrip pane)
  await page.keyboard.press('Control+y')
  await expect(host).toContainText('link. more')
  await expect(page.locator('.right [data-block-slot-id="block-1"]')).toContainText('link. more')

  // Ctrl+Shift+Z is the redo alias after another undo
  await page.keyboard.press('Control+z')
  await expect(host).not.toContainText('link. more')
  await page.keyboard.press('Control+Shift+z')
  await expect(host).toContainText('link. more')
})

test('code block: Ctrl+Z reverts a committed edit, Ctrl+Y restores it', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id]', { timeout: 10000 })

  // focus the javascript fence, type a line (stays a draft until blur)
  await page.locator('.left [data-node-type="Fence"]').first().click()
  const editor = page.locator('.left .autodown-code-editor')
  await expect(editor).toBeVisible()
  const area = editor.locator('textarea.code-editor-textarea')
  await page.keyboard.press('Control+Home')
  await page.keyboard.type('const zz = 1\n')
  await expect(editor.locator('pre.code-editor-highlight')).toContainText('const zz = 1')

  // blur by directly clicking the Heading — ONE commit entry (applyTree)
  await page.locator('.left [data-node-type="Heading"]').first().click()
  await page.waitForTimeout(300)
  await expect(page.locator('.right')).toContainText('const zz = 1')

  // refocus the fence — the face mounts from the committed model
  await page.locator('.left [data-node-type="Fence"]').first().click()
  await expect(page.locator('.left .autodown-code-editor textarea')).toHaveValue(/const zz = 1/)

  // Ctrl+Z over the textarea routes to the engine: the commit reverts, the
  // focused face remounts from the restored tree (native textarea undo is
  // prevented — the draft would otherwise re-commit on the next blur)
  await page.keyboard.press('Control+z')
  await expect(page.locator('.left .autodown-code-editor textarea')).not.toHaveValue(/const zz = 1/)
  await expect(page.locator('.right')).not.toContainText('const zz = 1')

  // Ctrl+Y replays the commit
  await page.keyboard.press('Control+y')
  await expect(page.locator('.left .autodown-code-editor textarea')).toHaveValue(/const zz = 1/)
  await expect(page.locator('.right')).toContainText('const zz = 1')
})
