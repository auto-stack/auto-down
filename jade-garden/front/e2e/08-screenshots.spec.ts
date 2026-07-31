import { expect, test } from '@playwright/test'
import { openApp, openFile, rightSidebar, visibleEditor } from './helpers'

// Pixel baselines for the migration comparison. Baselines live in
// e2e/08-screenshots.spec.ts-snapshots/ (Playwright default). Regenerate with:
//   pnpm test:e2e:update
// The graph canvas is deliberately NOT screenshotted: cytoscape-fcose layout
// is nondeterministic across runs (see e2e/README.md).
const PANELS: Array<[string, string]> = [
  ['Agenda', 'agenda'],
  ['Outline', 'outline'],
  ['Backlinks', 'backlinks'],
  ['Outgoing links', 'outgoing-links'],
  ['Unlinked References', 'unlinked-references'],
  ['Properties', 'properties'],
]

test.describe('screenshot baselines', () => {
  test('main layout with open document', async ({ page }) => {
    await openApp(page)
    await openFile(page, 'index.ad', '欢迎来到 Jade Garden')

    // Park the mouse over the status bar to avoid hover-state pixels.
    await page.mouse.move(720, 895)
    await expect(page).toHaveScreenshot('main-layout.png')
  })

  test('editor area', async ({ page }) => {
    await openApp(page)
    await openFile(page, 'index.ad', '欢迎来到 Jade Garden')

    await page.mouse.move(720, 895)
    await expect(visibleEditor(page)).toHaveScreenshot('editor-index.png')
  })

  test('right sidebar panels', async ({ page }) => {
    await openApp(page)
    await openFile(page, 'Hello World.ad', '这是一段示例文本')

    const sidebar = rightSidebar(page)
    // Wait for async panels (backlinks etc.) to settle.
    await expect(sidebar.locator('> div', { hasText: 'Backlinks' }).locator('li')).toHaveCount(2)

    await page.mouse.move(720, 895)
    for (const [heading, slug] of PANELS) {
      const panel = sidebar.locator('> div', { hasText: heading }).first()
      await expect(panel).toHaveScreenshot(`panel-${slug}.png`)
    }
  })
})
