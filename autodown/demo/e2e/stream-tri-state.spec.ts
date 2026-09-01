// Stream tri-state e2e (plan 032 T8): the tri-state corpus (engine
// fixtures/tri-state.ts — same source as the unit audit) fed frame by frame
// through the demo dev server's stream harness page (stream-harness.html):
//   unclosed → open (skeleton) → closed (panel), asserted on the progressive
//   pane's live DOM; plus computed-style parity between the streaming pane
//   and the final pane for Heading/Paragraph/Fence/Table (待澄清② scope —
// extension-block parity waits for plan 033's shared chrome).
import { test, expect, type Page } from '@playwright/test'
import { TRI_STATE } from '../../packages/engine/src/render/__tests__/fixtures/tri-state'

const stream = (sel: string) => `#stream-pane ${sel}`
const fin = (sel: string) => `#final-pane ${sel}`

async function feed(page: Page, text: string) {
  await page.evaluate((t) => (window as any).__streamHarness.feed(t), text)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/stream-harness.html')
  await page.waitForFunction(() => (window as any).__streamHarness != null)
})

test('fence tri-state: paragraph literal → loading skeleton → closed panel', async ({ page }) => {
  await feed(page, TRI_STATE.Fence.unclosed!)
  await expect(page.locator(stream('.paragraph-node'))).toBeVisible()
  await expect(page.locator(stream('.code-block-container'))).toHaveCount(0)

  await feed(page, TRI_STATE.Fence.open!)
  const open = page.locator(stream('.code-block-container.autodown-block-placeholder.is-loading'))
  await expect(open).toBeVisible()
  await expect(open.locator('pre[data-language="rust"]')).toHaveAttribute('aria-busy', 'true')
  await expect(open).toContainText('fn streaming_example')

  await feed(page, TRI_STATE.Fence.closed!)
  const closed = page.locator(stream('.code-block-container'))
  await expect(closed).toBeVisible()
  await expect(closed).not.toHaveClass(/is-loading/)
  await expect(closed.locator('pre[data-language="rust"]')).toHaveAttribute('aria-busy', 'false')
})

test('mermaid tri-state: open fence never renders mermaid; closed mounts the panel', async ({ page }) => {
  await feed(page, TRI_STATE.Mermaid.open!)
  const open = page.locator(stream('.code-block-container.is-loading'))
  await expect(open).toBeVisible()
  await expect(open.locator('pre[data-language="mermaid"]')).toBeVisible()
  await expect(page.locator(stream('.autodown-mermaid-block'))).toHaveCount(0)

  await feed(page, TRI_STATE.Mermaid.closed!)
  await expect(page.locator(stream('.autodown-mermaid-block'))).toBeVisible()
  await expect(page.locator(stream('.mermaid-source'))).toBeVisible()
})

test('math tri-state: unclosed %{ is a paragraph literal; closed paints katex', async ({ page }) => {
  await feed(page, TRI_STATE.MathBlock.unclosed!)
  await expect(page.locator(stream('.paragraph-node'))).toContainText('e = mc^2')
  await expect(page.locator(stream('.autodown-math-block'))).toHaveCount(0)

  await feed(page, TRI_STATE.MathBlock.closed!)
  const panel = page.locator(stream('.autodown-math-block'))
  await expect(panel).toBeVisible()
  // katex paints on mount in the browser (031 pinned)
  await expect(panel.locator('.katex')).toBeVisible({ timeout: 10_000 })
})

test('table tri-state: header-first progressive → closed table-node contract', async ({ page }) => {
  await feed(page, TRI_STATE.Table.unclosed!)
  await expect(page.locator(stream('.paragraph-node'))).toBeVisible()
  await expect(page.locator(stream('table.table-node'))).toHaveCount(0)

  await feed(page, TRI_STATE.Table.open!)
  const open = page.locator(stream('table.table-node'))
  await expect(open).toBeVisible()
  await expect(open.locator('thead th').first()).toContainText('名称')

  await feed(page, TRI_STATE.Table.closed!)
  const closed = page.locator(stream('table.table-node'))
  await expect(closed).toBeVisible()
  await expect(closed.locator('.table-node__resize-handle')).toHaveCount(2)
  await expect(closed.locator('tbody tr')).toHaveCount(2)
})

test('callout tri-state: unclosed container is plain text; closed renders the card', async ({ page }) => {
  await feed(page, TRI_STATE.Callout.unclosed!)
  await expect(page.locator(stream('.paragraph-node'))).toContainText('正文还在流式')
  await expect(page.locator(stream('.callout-node'))).toHaveCount(0)

  await feed(page, TRI_STATE.Callout.closed!)
  const card = page.locator(stream('.callout-node.autodown-callout-warning'))
  await expect(card).toBeVisible()
  await expect(card).toContainText('卡片正文')
})

test('computed-style parity: streaming pane vs final pane (Heading/Paragraph/Fence/Table)', async ({ page }) => {
  const doc = [
    TRI_STATE.Heading.closed!,
    '',
    TRI_STATE.Paragraph.closed!,
    '',
    TRI_STATE.Fence.closed!,
    '',
    TRI_STATE.Table.closed!,
  ].join('\n')
  await feed(page, doc)
  // wait for full reveal on both panes (typewriter reveals the last node)
  await expect(page.locator(stream('table.table-node tbody tr'))).toHaveCount(2)
  await expect(page.locator(fin('table.table-node tbody tr'))).toHaveCount(2)
  await expect(page.locator(stream('.code-block-container code'))).toContainText('x * 2')
  await expect(page.locator(fin('.code-block-container code'))).toContainText('x * 2')

  const cases: { sel: string; props: string[] }[] = [
    { sel: '.node-content h2', props: ['font-size', 'font-weight', 'line-height', 'margin-top', 'margin-bottom', 'color'] },
    { sel: '.node-content p', props: ['font-size', 'line-height', 'margin-top', 'margin-bottom'] },
    { sel: '.code-block-container pre[data-language]', props: ['border-radius', 'padding-top', 'font-size', 'font-family'] },
    { sel: 'table.table-node', props: ['border-collapse', 'width'] },
    { sel: 'table.table-node th', props: ['padding', 'border-color', 'font-weight', 'text-align'] },
    { sel: 'table.table-node td', props: ['padding', 'border-color'] },
  ]
  for (const { sel, props } of cases) {
    const read = async (pane: string) =>
      page
        .locator(`${pane} ${sel}`)
        .first()
        .evaluate((el, ps) => ps.map((p) => getComputedStyle(el).getPropertyValue(p)), props)
    const streaming = await read('#stream-pane')
    const final = await read('#final-pane')
    for (let i = 0; i < props.length; i++) {
      expect(streaming[i], `${sel} ${props[i]}`).toBe(final[i])
    }
  }
})
