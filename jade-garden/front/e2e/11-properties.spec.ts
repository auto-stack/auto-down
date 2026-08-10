import { expect, test } from '@playwright/test'
import { openApp, openFile, rightSidebar } from './helpers'

// PropertiesPanel editing flow (05-panels only asserts read-only rendering).
// The panel commits entry edits into the active tab's frontmatter and
// debounce-saves (1.2 s) the whole document; persistence is verified by
// polling GET /api/wiki/:path, not sleeps.
// The target document is created via the backend API (fixture stays static).

const DOC = 'E2E Props.ad'

test.describe('properties panel editing', () => {
  test('edit existing property + add new property → saved to frontmatter', async ({ page }) => {
    const created = await page.request.post(`/api/wiki/${encodeURIComponent(DOC)}`, {
      data: {
        frontmatter: { title: 'E2E Props', status: 'draft' },
        body: '# E2E Props\n\n属性编辑测试文档。\n',
      },
    })
    expect(created.ok()).toBe(true)

    await openApp(page)
    await openFile(page, DOC, '属性编辑测试文档')

    const panel = rightSidebar(page).locator('> div', { hasText: 'Properties' }).first()

    // --- Edit the existing `status` property: draft → done ---
    // Keys are <input> values (not text nodes), and this Playwright version
    // has no getByDisplayValue — scan the rows and match by inputValue.
    const rows = panel.locator('.group')
    let valueInput = null
    for (let i = 0; i < (await rows.count()); i++) {
      if ((await rows.nth(i).locator('input').first().inputValue()) === 'status') {
        // Row inputs: [0] = key, [1] = value.
        valueInput = rows.nth(i).locator('input').nth(1)
        break
      }
    }
    expect(valueInput, 'status row present').not.toBeNull()
    await valueInput!.fill('done')

    // --- Add a new property via the key/value inputs at the panel bottom ---
    // (entry value inputs share the "value" placeholder — scope to the add row)
    const addRow = panel.locator('div.mt-3')
    await addRow.getByPlaceholder('key').fill('reviewed')
    await addRow.getByPlaceholder('value').fill('yes')
    await addRow.getByPlaceholder('value').press('Enter')

    // Debounced save lands on disk; backend also re-stamps updated_at.
    await expect
      .poll(
        async () => {
          const res = await page.request.get(`/api/wiki/${encodeURIComponent(DOC)}`)
          if (!res.ok()) return {}
          const doc = (await res.json()) as { frontmatter: Record<string, unknown> }
          return doc.frontmatter
        },
        { timeout: 15_000, intervals: [500, 1000, 1000] },
      )
      .toMatchObject({ status: 'done', reviewed: 'yes', title: 'E2E Props' })
  })
})
