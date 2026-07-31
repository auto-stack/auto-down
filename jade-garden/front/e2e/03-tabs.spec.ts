import { expect, test } from '@playwright/test'
import { appendToEditor, marker, openApp, openFile, visibleEditor } from './helpers'

test.describe('multi-tab keep-alive', () => {
  test('switching tabs preserves each tab editor content (v-show contract)', async ({ page }) => {
    const text = marker('E2E-TAB')
    await openApp(page)

    // Tab A: open and type.
    await openFile(page, 'Hello World.ad', '这是一段示例文本')
    await appendToEditor(page, ` ${text}`)
    await expect(visibleEditor(page)).toContainText(text)

    // Tab B: open another file. Both editors stay mounted (v-show keep-alive).
    await openFile(page, 'index.ad', '欢迎来到 Jade Garden')
    await expect(page.locator('.autodown-editor')).toHaveCount(2)
    await expect(page.locator('.autodown-editor:visible')).toHaveCount(1)

    // Back to tab A: typed text is still there (same Tiptap instance).
    await page.locator('button', { hasText: 'Hello World' }).first().click()
    await expect(visibleEditor(page)).toContainText(text)

    // And tab B still intact after another round trip.
    // (index.ad's tab shows its frontmatter title 首页.)
    await page.locator('button', { hasText: '首页' }).first().click()
    await expect(visibleEditor(page)).toContainText('欢迎来到 Jade Garden')
    await page.locator('button', { hasText: 'Hello World' }).first().click()
    await expect(visibleEditor(page)).toContainText(text)
  })
})
