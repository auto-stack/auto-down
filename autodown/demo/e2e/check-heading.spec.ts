import { test, expect } from '@playwright/test'

test('check heading top space', async ({ page }) => {
  await page.goto('http://localhost:5173/')
  await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 5000 })

  const leftInfo = await page.evaluate(() => {
    const wrapper = document.querySelector('.left .autodown-editor-content-wrapper') as HTMLElement
    const h1 = document.querySelector('.left [data-block-id="block-0"]') as HTMLElement
    const wrapperRect = wrapper.getBoundingClientRect()
    const h1Rect = h1.getBoundingClientRect()
    return {
      wrapperTop: wrapperRect.top,
      h1Top: h1Rect.top,
      h1MarginTop: getComputedStyle(h1).marginTop,
    }
  })

  const rightInfo = await page.evaluate(() => {
    const wrapper = document.querySelector('.right .streaming-document') as HTMLElement
    const block = document.querySelector('.right [data-block-id="block-0"]') as HTMLElement
    const h1 = block?.querySelector(':scope > h1') as HTMLElement
    const wrapperRect = wrapper.getBoundingClientRect()
    const h1Rect = h1.getBoundingClientRect()
    return {
      wrapperTop: wrapperRect.top,
      h1Top: h1Rect.top,
      h1MarginTop: getComputedStyle(h1).marginTop,
    }
  })

  console.log('LEFT:', leftInfo)
  console.log('RIGHT:', rightInfo)

  expect(true).toBe(true)
})
