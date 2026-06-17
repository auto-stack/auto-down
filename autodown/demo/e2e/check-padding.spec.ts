import { test, expect } from '@playwright/test'

test('check padding of left and right content containers', async ({ page }) => {
  await page.goto('http://localhost:5173/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 5000 })

  const leftPadding = await page.evaluate(() => {
    const el = document.querySelector('.left .autodown-editor-content-wrapper') as HTMLElement
    const style = getComputedStyle(el)
    return { paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight }
  })

  const rightPadding = await page.evaluate(() => {
    const el = document.querySelector('.right .streaming-document') as HTMLElement
    const style = getComputedStyle(el)
    return { paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight }
  })

  console.log('LEFT:', leftPadding)
  console.log('RIGHT:', rightPadding)

  expect(leftPadding.paddingTop).toBe(rightPadding.paddingTop)
})
