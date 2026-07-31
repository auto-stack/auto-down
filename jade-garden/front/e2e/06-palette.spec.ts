import { expect, test } from '@playwright/test'
import { openApp, visibleEditor } from './helpers'

test.describe('command palette (Ctrl+P) and quick switcher (Ctrl+O)', () => {
  test('Ctrl+P opens the command palette, Escape closes it', async ({ page }) => {
    await openApp(page)

    await page.keyboard.press('Control+p')
    const input = page.locator('input[placeholder="Type a command or recent file..."]')
    await expect(input).toBeVisible()

    // Typing filters commands.
    await input.fill('global graph')
    await expect(page.getByText('Open global graph', { exact: true })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(input).toBeHidden()
  })

  test('Ctrl+P → "Open global graph" opens the graph tab', async ({ page }) => {
    await openApp(page)

    await page.keyboard.press('Control+p')
    const input = page.locator('input[placeholder="Type a command or recent file..."]')
    await expect(input).toBeVisible()
    await input.fill('global graph')
    await page.keyboard.press('Enter')

    await expect(page.locator('button', { hasText: '全局图谱' }).first()).toBeVisible()
    await expect(page.locator('.graph-view canvas').first()).toBeVisible({ timeout: 20_000 })
  })

  test('Ctrl+O opens quick switcher and opens a file', async ({ page }) => {
    await openApp(page)

    await page.keyboard.press('Control+o')
    const input = page.locator('input[placeholder="Search files..."]')
    await expect(input).toBeVisible()

    await input.fill('Tasks')
    await page.locator('li', { hasText: 'Tasks.ad' }).first().click()

    await expect(visibleEditor(page)).toContainText('项目 A 任务')
    await expect(page.locator('button', { hasText: 'Tasks' }).first()).toBeVisible()
  })

  test('Ctrl+P → "Review flashcards" opens the flashcard modal', async ({ page }) => {
    await openApp(page)

    await page.keyboard.press('Control+p')
    const input = page.locator('input[placeholder="Type a command or recent file..."]')
    await expect(input).toBeVisible()
    await input.fill('flashcards')
    await page.keyboard.press('Enter')

    // Fixture has no flashcards → modal renders its empty state.
    await expect(page.getByText('No cards due for review')).toBeVisible()
  })
})
