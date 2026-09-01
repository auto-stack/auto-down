// Query/Embed data-loading e2e (plan 038 T7): the demo's mock loader
// routes (src/mockLoaders.ts — fixed results / empty / reject / not-found,
// registered on the engine's module-level slot at entry) drive the family
// widgets' load states on the real demo DOM — the right pane is the static
// render (parse-side WNodes → panelOf fallback), the left pane is the
// editor preview (model back-link); both consume the same loaders. The
// harness leg pins the LOADING TIMING (032 ruling A): an unclosed $query
// stays a paragraph with ZERO loader calls; the call fires only when the
// block closes.

import { test, expect, type Page } from '@playwright/test'

const right = (sel: string) => `.right ${sel}`
const stream = (sel: string) => `#stream-pane ${sel}`

async function loaderCalls(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as any).__mockLoaderCalls ?? [])
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 10000 })
})

test('query fixed-result route: results list with normalized fields', async ({ page }) => {
  const block = page.locator(right('.autodown-query-block'), { hasText: 'TAG #project' })
  await expect(block).toBeVisible()
  await expect(block.locator('.query-results')).toBeVisible()
  await expect(block.locator('.result-content').first()).toContainText('Fixed result row one')
  // normalize: source = title || page_path, priority badge = [#2]
  await expect(block.locator('.result-source').first()).toContainText('Demo Page A')
  await expect(block.locator('.result-priority').first()).toContainText('[#2]')
  // the header carries the query text
  await expect(block.locator('.query-code')).toContainText('TAG #project')
})

test('query empty route: No results state', async ({ page }) => {
  const block = page.locator(right('.autodown-query-block'), { hasText: 'demo empty route' })
  await expect(block).toBeVisible()
  await expect(block.locator('.query-state')).toContainText('No results')
  await expect(block.locator('.query-results')).toHaveCount(0)
})

test('query error route: the error banner with the thrown message', async ({ page }) => {
  const block = page.locator(right('.autodown-query-block'), { hasText: 'trigger demo fail' })
  await expect(block).toBeVisible()
  await expect(block.locator('.query-error')).toContainText('mock query failure')
  await expect(block.locator('.query-results')).toHaveCount(0)
})

test('embed block-load route: label + loaded content', async ({ page }) => {
  const block = page.locator(right('.autodown-block-embed'), { hasText: 'docs/guide.md' })
  await expect(block).toBeVisible()
  await expect(block.locator('.embed-title')).toContainText('docs/guide.md#anchor-1')
  await expect(block.locator('.embed-content')).toContainText('body of block anchor-1')
})

test('embed not-found route: Block not found', async ({ page }) => {
  // the error branch renders no header (the label face drops with the
  // block) — the banner IS the route's visible face
  const banner = page.locator(right('.autodown-block-embed .embed-error'))
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('Block not found')
})

test('embed page-level reference: label face, no loader work', async ({ page }) => {
  const block = page.locator(right('.autodown-block-embed'), { hasText: '../other.ad' })
  await expect(block).toBeVisible()
  await expect(block.locator('.embed-title')).toContainText('../other.ad')
  await expect(block.locator('.embed-content')).toHaveCount(0)
  // the page-level reference itself never reaches the block-id-keyed
  // loader: every block: call comes from the two anchor samples
  const calls = await loaderCalls(page)
  const blockCalls = calls.filter((c) => c.startsWith('block:'))
  expect(blockCalls.length).toBeGreaterThan(0)
  expect(blockCalls.every((c) => c === 'block:anchor-1' || c === 'block:missing-anchor')).toBe(true)
})

test('the editor preview pane loads through the same slot (left pane)', async ({ page }) => {
  const block = page.locator('.left .autodown-query-block', { hasText: 'TAG #project' })
  await expect(block.locator('.result-content').first()).toContainText('Fixed result row one')
})

// -- loading timing (032 ruling A): no loader work while streaming ---------

test('an unclosed $query stays a paragraph with ZERO loader calls; the load fires only on final', async ({ page }) => {
  await page.goto('/stream-harness.html')
  await page.waitForFunction(() => (window as any).__streamHarness != null)

  const feed = (text: string) => page.evaluate((t) => (window as any).__streamHarness.feed(t), text)

  // unclosed: plain paragraph text, no query widget anywhere
  await feed('$query(TAG #proj')
  await expect(page.locator(stream('.paragraph-node'))).toBeVisible()
  await expect(page.locator(stream('.autodown-query-block'))).toHaveCount(0)
  // nothing closed anywhere — zero loader calls
  expect((await loaderCalls(page)).filter((c) => c.startsWith('query:'))).toHaveLength(0)

  // closed construct, stream STILL OPEN (streaming pane renders final=false
  // for the whole tree — 032 ruling A): the query panel mounts as the
  // loading skeleton and does NOT load; the final pane (final=true) loads
  await feed('$query(TAG #project)')
  const streamBlock = page.locator(stream('.autodown-query-block'))
  await expect(streamBlock).toBeVisible()
  await expect(streamBlock).toContainText('Loading query…')
  await expect(streamBlock.locator('.query-results')).toHaveCount(0)
  await expect(page.locator('#final-pane .query-results')).toBeVisible()
  // exactly ONE query load — the final pane's; the streaming skeleton
  // contributed none
  const queryCalls = (await loaderCalls(page)).filter((c) => c.startsWith('query:'))
  expect(queryCalls).toEqual(['query:TAG #project'])
})
