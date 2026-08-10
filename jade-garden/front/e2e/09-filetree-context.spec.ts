import { expect, test } from '@playwright/test'
import { openApp, treeNode } from './helpers'

// File-tree context-menu CRUD. The menu is rendered via <teleport to="body">
// (.file-context-menu lives outside the sidebar DOM), and every action goes
// through native window.prompt/confirm — auto-answered via page.on('dialog').
// Effects are verified both in the reloaded tree and through the backend API.

// NOTE: backend errors come back as HTTP 200 text/plain (axum's String
// IntoResponse), so res.ok() alone cannot detect "file not found" — a real
// WikiDoc is JSON, an error is plain text.
const wikiDocExists = async (page: import('@playwright/test').Page, path: string) => {
  const res = await page.request.get(`/api/wiki/${encodeURIComponent(path)}`)
  if (!res.ok()) return false
  try {
    await res.json()
    return true
  } catch {
    return false
  }
}

test.describe('file tree context menu', () => {
  test('new file / new folder / rename / delete via right-click menu', async ({ page }) => {
    // Answer each native dialog by its prompt text. Actions are separated by
    // visibility waits, so at most one dialog is pending at any time.
    page.on('dialog', (dialog) => {
      const msg = dialog.message()
      if (msg.startsWith('New file name:')) void dialog.accept('E2E Created.ad')
      else if (msg.startsWith('New folder name:')) void dialog.accept('E2E Folder')
      else if (msg.startsWith('Rename to:')) void dialog.accept('E2E Renamed.ad')
      else void dialog.accept() // confirm('Delete "..."?')
    })

    await openApp(page)
    const menu = page.locator('.file-context-menu')

    // --- New file (right-clicking a file creates next to it, i.e. at root) ---
    await treeNode(page, 'Hello World.ad').click({ button: 'right' })
    await expect(menu).toBeVisible()
    await menu.getByText('New file', { exact: true }).click()
    await expect(treeNode(page, 'E2E Created.ad')).toBeVisible()
    await expect.poll(() => wikiDocExists(page, 'E2E Created.ad')).toBe(true)

    // --- New folder ---
    await treeNode(page, 'Hello World.ad').click({ button: 'right' })
    await expect(menu).toBeVisible()
    await menu.getByText('New folder', { exact: true }).click()
    await expect(treeNode(page, 'E2E Folder')).toBeVisible()

    // --- Rename ---
    await treeNode(page, 'E2E Created.ad').click({ button: 'right' })
    await expect(menu).toBeVisible()
    await menu.getByText('Rename', { exact: true }).click()
    await expect(treeNode(page, 'E2E Renamed.ad')).toBeVisible()
    await expect.poll(() => wikiDocExists(page, 'E2E Renamed.ad')).toBe(true)
    await expect.poll(() => wikiDocExists(page, 'E2E Created.ad')).toBe(false)

    // --- Delete ---
    await treeNode(page, 'E2E Renamed.ad').click({ button: 'right' })
    await expect(menu).toBeVisible()
    await menu.getByText('Delete', { exact: true }).click()
    await expect(treeNode(page, 'E2E Renamed.ad')).toBeHidden()
    await expect.poll(() => wikiDocExists(page, 'E2E Renamed.ad')).toBe(false)
  })
})
