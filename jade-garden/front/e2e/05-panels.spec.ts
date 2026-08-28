import { expect, test } from '@playwright/test'
import { openApp, openFile, rightSidebar } from './helpers'

// Panels requested by plan 011 (Outline/Backlinks/Tags/Tasks/Flashcards/Bookmarks)
// map onto what the app actually has: Outline + Backlinks panels exist;
// "Tasks" ≈ AgendaPanel; Flashcards is a modal (covered in 06-palette);
// Tags and Bookmarks panels do not exist in the app (see e2e/README.md).
const PANEL_HEADINGS = ['Agenda', 'Outline', 'Backlinks', 'Outgoing links', 'Unlinked References', 'Properties']

test.describe('right sidebar panels', () => {
  test('all panels render for an open document', async ({ page }) => {
    await openApp(page)
    await openFile(page, 'Hello World.ad', '这是一段示例文本')

    const sidebar = rightSidebar(page)
    for (const heading of PANEL_HEADINGS) {
      await expect(sidebar.getByText(heading, { exact: true }).first()).toBeVisible()
    }
  })

  test('Backlinks panel lists incoming links', async ({ page }) => {
    await openApp(page)
    await openFile(page, 'Hello World.ad', '这是一段示例文本')

    // index.ad, Tasks.ad and CAP 定理.ad all contain [[Hello World]]
    // (CAP 定理.ad gained its link section with the wiki-demo fixture
    // refresh landing alongside plan 021's link-extraction work).
    const panel = rightSidebar(page).locator('> div', { hasText: 'Backlinks' }).first()
    await expect(panel.locator('li').first()).toBeVisible()
    await expect(panel.locator('li')).toHaveCount(3)
  })

  test('Outline panel renders (currently empty — known app gap)', async ({ page }) => {
    await openApp(page)
    await openFile(page, 'Hello World.ad', '这是一段示例文本')

    // The app's blocks store is never populated (nothing calls blocks.parse),
    // so the panel currently renders its empty state even for docs with
    // headings. This test pins the CURRENT behavior as the migration baseline.
    const panel = rightSidebar(page).locator('> div', { hasText: 'Outline' }).first()
    await expect(panel.getByText('No headings.')).toBeVisible()
  })

  test('Properties panel shows frontmatter of the active document', async ({ page }) => {
    await openApp(page)
    await openFile(page, 'Hello World.ad', '这是一段示例文本')

    const panel = rightSidebar(page).locator('> div', { hasText: 'Properties' }).first()
    // Hello World.ad frontmatter: title/tags/status/summary/updated_at.
    // Keys are <input> values, not text nodes; the backend returns frontmatter
    // keys in alphabetical order.
    const values = await panel.locator('input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))
    expect(values).toContain('title')
    expect(values).toContain('status')
  })
})
