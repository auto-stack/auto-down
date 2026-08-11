import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

// Flashcard review with real cards (06-palette only covers the empty state).
// Card syntax (back/server/src/srs.rs + parser.rs): a block tagged `#card`
// with a `^block-id` anchor; `{{cloze <answer> \ <hint>}}` renders as
// {{hint}} in the question and **answer** in the answer. A card with no
// card-next-schedule property is always due.
// The card document is created via the backend API (fixture stays static).

const DOC = 'E2E Cards.ad'

test.describe('flashcard review', () => {
  test('due card renders question, reveals answer, rating persists schedule', async ({ page }) => {
    const created = await page.request.post(`/api/wiki/${encodeURIComponent(DOC)}`, {
      data: {
        frontmatter: { title: 'E2E Cards' },
        body: '- 法国的首都是哪里？{{cloze Paris \\ 城市}} #card ^e2ecard1\n',
      },
    })
    expect(created.ok()).toBe(true)

    await openApp(page)

    // Open the review modal via the command palette (same flow as 06-palette).
    await page.keyboard.press('Control+p')
    const input = page.locator('input[placeholder="Type a command or recent file..."]')
    await expect(input).toBeVisible()
    await input.fill('flashcards')
    await page.keyboard.press('Enter')

    // Question side: cloze shown as {{hint}}, #card stripped.
    await expect(page.getByText('Question', { exact: true })).toBeVisible()
    await expect(page.getByText('法国的首都是哪里？{{城市}}')).toBeVisible()

    // Reveal the answer and the four rating buttons.
    await page.getByRole('button', { name: 'Show answer' }).click()
    await expect(page.getByText('Answer', { exact: true })).toBeVisible()
    await expect(page.getByText('法国的首都是哪里？**Paris**')).toBeVisible()
    for (const grade of ['Again', 'Hard', 'Good', 'Easy']) {
      await expect(page.getByRole('button', { name: grade })).toBeVisible()
    }

    // Rate "Good": the review writes SRS properties into the document body...
    await page.getByRole('button', { name: 'Good' }).click()
    await expect
      .poll(async () => {
        const res = await page.request.get(`/api/wiki/${encodeURIComponent(DOC)}`)
        if (!res.ok()) return ''
        const doc = (await res.json()) as { body: string }
        return doc.body
      })
      .toContain('card-next-schedule::')

    // After the last rating the modal refetches due cards; with the schedule
    // now read back (fixed in srs::parse_block_properties, 2026-08-11), the
    // card is no longer due and the modal shows the empty state.
    await expect(page.getByText('No cards due for review')).toBeVisible()
    await expect(page.getByText('法国的首都是哪里？{{城市}}')).not.toBeVisible()

    // The due endpoint agrees: zero due cards after the review.
    await expect
      .poll(async () => {
        const res = await page.request.get('/api/cards/due')
        if (!res.ok()) return -1
        return ((await res.json()) as { cards: unknown[] }).cards.length
      })
      .toBe(0)
  })
})
