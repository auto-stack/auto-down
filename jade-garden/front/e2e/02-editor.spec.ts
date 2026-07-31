import { expect, test } from '@playwright/test'
import { appendToEditor, marker, openApp, openFile, visibleEditor } from './helpers'

test.describe('editor', () => {
  test('renders .ad file content', async ({ page }) => {
    await openApp(page)
    await openFile(page, 'index.ad', '欢迎来到 Jade Garden')

    const editor = visibleEditor(page)
    await expect(editor).toContainText('快速开始')
    // Tab title comes from frontmatter (index.ad → 首页).
    await expect(page.locator('button span.truncate', { hasText: '首页' }).first()).toBeVisible()
  })

  test('typing triggers debounced save (verified via backend API)', async ({ page }) => {
    const text = marker('E2E-SAVE')
    await openApp(page)
    await openFile(page, 'Hello World.ad', '这是一段示例文本')

    // Append text at the end of the document.
    await appendToEditor(page, ` ${text}`)

    // Status bar flips to dirty immediately...
    await expect(page.locator('footer').getByText('Unsaved', { exact: true })).toBeVisible()

    // ...and the debounced (2s) save lands on disk. Verify through the API.
    const encoded = encodeURIComponent('Hello World.ad')
    await expect
      .poll(
        async () => {
          const res = await page.request.get(`/api/wiki/${encoded}`)
          if (!res.ok()) return ''
          const doc = (await res.json()) as { body: string }
          return doc.body
        },
        { timeout: 15_000, intervals: [500, 1000, 1000] },
      )
      .toContain(text)

    await expect(page.locator('footer').getByText('Saved', { exact: true })).toBeVisible()
  })
})
