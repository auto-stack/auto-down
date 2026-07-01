const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (err) => {
    errors.push(err.message)
    console.log('PAGEERROR:', err.message)
  })

  await page.goto('http://localhost:3000/')
  await page.waitForTimeout(3000)

  const input = page.locator('input[type="text"]').first()
  if (await input.isVisible().catch(() => false)) {
    await input.fill('D:\\autostack\\auto-down\\tmp\\wiki-demo')
    await page.click('button:has-text("Open")')
    await page.waitForTimeout(1500)
  }

  // Open first document
  await page.locator('text=index.ad').first().click()
  await page.waitForTimeout(1000)
  const firstHtml = await page.locator('.autodown-editor-content').first().innerHTML().catch(() => '')
  console.log('first doc length:', firstHtml.length, 'has content:', firstHtml.includes('欢迎来到'))

  // Open second document
  await page.locator('text=Tasks.ad').first().click()
  await page.waitForTimeout(1200)
  // Active editor is the visible one.
  const secondHtml = await page.locator('.autodown-editor-content:visible').first().innerHTML().catch(() => '')
  console.log('second doc length:', secondHtml.length, 'has content:', secondHtml.includes('项目 A 任务'))

  // Switch back to first by clicking its sidebar entry (re-activates the tab).
  await page.locator('text=index.ad').first().click()
  await page.waitForTimeout(800)
  const backHtml = await page.locator('.autodown-editor-content:visible').first().innerHTML().catch(() => '')
  console.log('back to first length:', backHtml.length, 'has content:', backHtml.includes('欢迎来到'))

  // Switch to second again to confirm it survived.
  await page.locator('text=Tasks.ad').first().click()
  await page.waitForTimeout(800)
  const second2 = await page.locator('.autodown-editor-content:visible').first().innerHTML().catch(() => '')
  console.log('second again length:', second2.length, 'has content:', second2.includes('项目 A 任务'))

  console.log('TOTAL PAGE ERRORS:', errors.length)
  await browser.close()
  process.exit(0)
})()
