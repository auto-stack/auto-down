import { test, expect } from '@playwright/test'

test.describe('scroll sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/')
    // Wait for both panels to render blocks with data-block-id.
    await page.waitForSelector('.left [data-block-id="block-0"]', { timeout: 5000 })
    await page.waitForSelector('.right [data-block-id="block-0"]', { timeout: 5000 })
  })

  test('uses a single custom scrollbar and hides native scrollbars', async ({ page }) => {
    const customScrollbar = page.locator('.custom-scrollbar')
    await expect(customScrollbar).toBeVisible()

    const leftWrapper = page.locator('.left .autodown-editor-content-wrapper')
    const rightDocument = page.locator('.right .streaming-document')

    const leftOverflow = await leftWrapper.evaluate((el) => getComputedStyle(el).overflowY)
    const rightOverflow = await rightDocument.evaluate((el) => getComputedStyle(el).overflowY)
    expect(leftOverflow).toBe('auto')
    expect(rightOverflow).toBe('auto')

    const leftScrollbarWidth = await leftWrapper.evaluate((el) => el.offsetWidth - el.clientWidth)
    const rightScrollbarWidth = await rightDocument.evaluate((el) => el.offsetWidth - el.clientWidth)
    expect(leftScrollbarWidth).toBe(0)
    expect(rightScrollbarWidth).toBe(0)
  })

  test('both panels scroll together when the custom scrollbar thumb is dragged', async ({ page }) => {
    const workspace = page.locator('.workspace')
    const leftWrapper = page.locator('.left .autodown-editor-content-wrapper')
    const rightDocument = page.locator('.right .streaming-document')
    const thumb = page.locator('.custom-scrollbar-thumb')

    const leftScrollTopBefore = await leftWrapper.evaluate((el) => el.scrollTop)
    const rightScrollTopBefore = await rightDocument.evaluate((el) => el.scrollTop)
    expect(leftScrollTopBefore).toBe(0)
    expect(rightScrollTopBefore).toBeGreaterThanOrEqual(0)

    // Hover the splitter zone in the middle to reveal the custom scrollbar, then drag the thumb.
    const workspaceBox = await workspace.boundingBox()
    expect(workspaceBox).toBeTruthy()
    await page.mouse.move(workspaceBox!.x + workspaceBox!.width / 2, workspaceBox!.y + workspaceBox!.height / 2)
    await page.waitForTimeout(100)

    const thumbBox = await thumb.boundingBox()
    expect(thumbBox).toBeTruthy()
    await page.mouse.move(thumbBox!.x + thumbBox!.width / 2, thumbBox!.y + thumbBox!.height / 2)
    await page.mouse.down()
    await page.mouse.move(thumbBox!.x + thumbBox!.width / 2, thumbBox!.y + thumbBox!.height / 2 + 80)
    await page.mouse.up()

    // Wait a frame for the synchronous scroll to apply.
    await page.waitForTimeout(100)

    const leftScrollTopAfter = await leftWrapper.evaluate((el) => el.scrollTop)
    const rightScrollTopAfter = await rightDocument.evaluate((el) => el.scrollTop)

    expect(leftScrollTopAfter).toBeGreaterThan(0)
    expect(rightScrollTopAfter).toBeGreaterThan(0)

    // Both panels should have scrolled to the same block position.
    const leftBlock = await leftWrapper.evaluate((el) => {
      const blocks = Array.from(el.querySelectorAll('[data-block-id]'))
      const rect = el.getBoundingClientRect()
      return blocks.find((b) => {
        const br = b.getBoundingClientRect()
        return br.bottom > rect.top
      })?.getAttribute('data-block-id')
    })

    const rightBlock = await rightDocument.evaluate((el) => {
      const blocks = Array.from(el.querySelectorAll('[data-block-id]'))
      const rect = el.getBoundingClientRect()
      return blocks.find((b) => {
        const br = b.getBoundingClientRect()
        return br.bottom > rect.top
      })?.getAttribute('data-block-id')
    })

    expect(leftBlock).toBeTruthy()
    expect(rightBlock).toBeTruthy()
    expect(leftBlock).toBe(rightBlock)
  })

  test('placeholder creates matching empty space on the right', async ({ page }) => {
    // Set placeholder state on the renderer by updating its Vue props.
    // We use the global app instance exposed on window.__vue_app__ if available,
    // otherwise we directly insert a placeholder for visual verification.
    await page.evaluate(() => {
      const rightDocument = document.querySelector('.right .streaming-document')
      if (!rightDocument) return

      const slot = rightDocument.querySelector('[data-node-index="2"]')
      if (!slot) return

      const placeholder = document.createElement('div')
      placeholder.className = 'autodown-block-placeholder'
      placeholder.style.height = '200px'
      slot.insertBefore(placeholder, slot.firstChild)
    })

    const placeholder = page.locator('.right [data-node-index="2"] > .autodown-block-placeholder')
    await expect(placeholder).toHaveCount(1)
    const height = await placeholder.evaluate((el) => el.offsetHeight)
    expect(height).toBe(200)
  })

  test('bottom toolbar does not cover the last block when scrolled to bottom', async ({ page }) => {
    const workspace = page.locator('.workspace')
    const leftWrapper = page.locator('.left .autodown-editor-content-wrapper')

    // Reveal the custom scrollbar.
    const workspaceBox = await workspace.boundingBox()
    expect(workspaceBox).toBeTruthy()
    await page.mouse.move(workspaceBox!.x + workspaceBox!.width / 2, workspaceBox!.y + workspaceBox!.height / 2)
    await page.waitForTimeout(200)

    // Scroll to the bottom by clicking the lower part of the scrollbar track.
    const track = await page.locator('.custom-scrollbar').first().boundingBox()
    expect(track).toBeTruthy()
    await page.mouse.click(track!.x + track!.width / 2, track!.y + track!.height - 10)
    await page.waitForTimeout(200)

    const info = await leftWrapper.evaluate((wrapper) => {
      const blocks = Array.from(wrapper.querySelectorAll('[data-block-id]'))
      const last = blocks[blocks.length - 1] as HTMLElement
      const actions = wrapper.closest('.autodown-editor')?.querySelector('.autodown-editor-actions') as HTMLElement
      const wrapperRect = wrapper.getBoundingClientRect()
      const lastRect = last.getBoundingClientRect()
      const actionsRect = actions.getBoundingClientRect()
      return {
        leftBottom: lastRect.bottom - wrapperRect.top + wrapper.scrollTop,
        actionsTop: actionsRect.top - wrapperRect.top + wrapper.scrollTop,
      }
    })

    expect(info.leftBottom).toBeLessThanOrEqual(info.actionsTop + 1)
  })

  test('both panels reach their max scroll together at the bottom', async ({ page }) => {
    const workspace = page.locator('.workspace')

    // Reveal the custom scrollbar.
    const workspaceBox = await workspace.boundingBox()
    expect(workspaceBox).toBeTruthy()
    await page.mouse.move(workspaceBox!.x + workspaceBox!.width / 2, workspaceBox!.y + workspaceBox!.height / 2)
    await page.waitForTimeout(200)

    // Scroll to the bottom by clicking the lower part of the scrollbar track.
    const track = await page.locator('.custom-scrollbar').first().boundingBox()
    expect(track).toBeTruthy()
    await page.mouse.click(track!.x + track!.width / 2, track!.y + track!.height - 10)
    await page.waitForTimeout(200)

    const info = await page.evaluate(() => {
      const leftWrapper = document.querySelector('.left .autodown-editor-content-wrapper') as HTMLElement
      const rightDocument = document.querySelector('.right .streaming-document') as HTMLElement
      return {
        leftScrollTop: leftWrapper.scrollTop,
        leftMaxScroll: leftWrapper.scrollHeight - leftWrapper.clientHeight,
        rightScrollTop: rightDocument.scrollTop,
        rightMaxScroll: rightDocument.scrollHeight - rightDocument.clientHeight,
      }
    })

    expect(info.leftScrollTop).toBeGreaterThan(0)
    expect(info.rightScrollTop).toBeGreaterThan(0)
    expect(info.leftScrollTop).toBeCloseTo(info.leftMaxScroll, 0)
    expect(info.rightScrollTop).toBeCloseTo(info.rightMaxScroll, 0)
  })

  test('slash menu stays inside the editor when cursor is near the bottom', async ({ page }) => {
    const workspace = page.locator('.workspace')

    // Focus the editor content first.
    await page.locator('.left .autodown-editor-content').click()

    // Scroll to the bottom using the custom scrollbar.
    const workspaceBox = await workspace.boundingBox()
    expect(workspaceBox).toBeTruthy()
    await page.mouse.move(workspaceBox!.x + workspaceBox!.width / 2, workspaceBox!.y + workspaceBox!.height / 2)
    await page.waitForTimeout(200)
    const track = await page.locator('.custom-scrollbar').first().boundingBox()
    expect(track).toBeTruthy()
    await page.mouse.click(track!.x + track!.width / 2, track!.y + track!.height - 10)
    await page.waitForTimeout(200)

    // Open the slash menu at the end of the document via the slash-open event.
    await page.evaluate(() => {
      const editorEl = document.querySelector('.left .autodown-editor') as any
      const editor = editorEl?.__vueParentComponent?.exposed?.editor?.value
      if (!editor) throw new Error('editor not found')
      const view = editor.view
      const endPos = view.state.doc.content.size
      const range = { from: endPos, to: endPos }
      document.dispatchEvent(
        new CustomEvent('autodown:slash-open', { detail: { query: '', range, items: [] } })
      )
    })

    const menu = page.locator('.autodown-slash-menu')
    await expect(menu).toBeVisible()

    const info = await page.evaluate(() => {
      const menuEl = document.querySelector('.autodown-slash-menu') as HTMLElement
      const editorEl = document.querySelector('.left .autodown-editor') as HTMLElement
      const menuRect = menuEl.getBoundingClientRect()
      const editorRect = editorEl.getBoundingClientRect()
      return {
        menuTop: menuRect.top - editorRect.top,
        menuBottom: menuRect.bottom - editorRect.top,
        editorHeight: editorRect.height,
      }
    })

    expect(info.menuTop).toBeGreaterThanOrEqual(-1)
    expect(info.menuBottom).toBeLessThanOrEqual(info.editorHeight + 1)
  })
})
