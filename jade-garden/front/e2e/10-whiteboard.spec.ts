import { expect, test } from '@playwright/test'
import { openApp, treeNode } from './helpers'

// Whiteboard (.canvas) interaction. The fixture has no .canvas files, so the
// test creates both halves of the app's split storage via the backend API:
//   - `e2e-board.canvas` at the wiki root — the file-tree node whose click
//     opens a whiteboard tab (MainArea routes .canvas to WhiteboardPage);
//   - `whiteboards/e2e-board.canvas` — the actual shape document, written via
//     POST /api/whiteboard/:path (the backend namespaces storage under
//     whiteboards/).
// Saves (blur / Add note, both fire-and-forget) are verified by polling the
// whiteboard API, never sleeps.

const BOARD = 'e2e-board.canvas'

async function readBoard(page: import('@playwright/test').Page) {
  const res = await page.request.get(`/api/whiteboard/${BOARD}`)
  if (!res.ok()) return { shapes: [] as { label: string }[] }
  return (await res.json()) as { shapes: { label: string }[] }
}

test.describe('whiteboard page', () => {
  test('open .canvas from tree, edit note label on blur, add note', async ({ page }) => {
    // Seed the shape document and the tree-visible .canvas marker.
    const seed = await page.request.post(`/api/whiteboard/${BOARD}`, {
      data: {
        shapes: [{ id: 's1', kind: 'note', x: 50, y: 50, width: 160, height: 100, label: 'E2E seed note' }],
      },
    })
    expect(seed.ok()).toBe(true)
    const marker = await page.request.post('/api/files/create', {
      data: { path: BOARD, is_dir: false },
    })
    expect(marker.ok()).toBe(true)

    await openApp(page)
    await treeNode(page, BOARD).click()

    // WhiteboardPage mounts with the seeded shape.
    const shape = page.locator('[contenteditable="true"]', { hasText: 'E2E seed note' })
    await expect(shape).toBeVisible()

    // Edit the label, then blur by clicking the header → save fires.
    await shape.click()
    await page.keyboard.press('Control+a')
    await page.keyboard.type('E2E edited note', { delay: 20 })
    await page.locator('span', { hasText: BOARD }).first().click() // blur target: header
    await expect.poll(async () => (await readBoard(page)).shapes[0]?.label).toBe('E2E edited note')

    // "Add note" appends a shape and saves immediately.
    await page.getByRole('button', { name: 'Add note' }).click()
    await expect.poll(async () => (await readBoard(page)).shapes.length).toBe(2)
    await expect(page.locator('[contenteditable="true"]', { hasText: 'New note' })).toBeVisible()
  })
})
