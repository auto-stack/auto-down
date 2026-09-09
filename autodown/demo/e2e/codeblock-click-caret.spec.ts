// CodeBlock click-caret e2e — pins the view→edit focus handoff on the real
// mouse path (the gap that let the original bug ship: the unit tests pin the
// ext bridge's pure store, but only a real click exercises the bubbling
// order — pre handler before node-slot selectBlock — and the caret API):
//
// 1. Clicking the fence's preview face mounts the edit face with the caret
//    AT THE CLICKED OFFSET (not at end-of-text — the old focusCodeArea
//    default), and the click lands on the FIRST line without the caret
//    being thrown to a trailing empty line.
// 2. The textarea drafts the COLLAPSED code: the closed-fence representation
//    newline (parser stores one trailing "\n") never shows up as a phantom
//    empty last line.
// 3. Blur commits without dirtying the text: the model keeps its
//    representation newline, and re-opening the fence shows the same
//    content (no accumulated empty lines).

import { test, expect } from '@playwright/test'

const JS_CODE = "const foo = 'bar'\nconsole.log(foo)"

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.left')).toBeVisible()
})

test('first click on a fence places the caret at the clicked offset, no phantom line', async ({
  page,
}) => {
  const pre = page.locator('.left pre.language-javascript')
  await expect(pre).toBeVisible()
  await pre.scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)

  const box = await pre.boundingBox()
  expect(box).not.toBeNull()
  // ~30px into the first text line (padding 0.75rem + a couple of glyphs)
  const px = box!.x + 30
  const py = box!.y + 14

  // the offset the click SHOULD produce (same caret-API convention the
  // handler uses); also proves the point actually hits line 1
  const expectedOffset = await page.evaluate(
    ([x, y]) => {
      const target = document.querySelector('.left pre.language-javascript')
      if (!target) return -1
      const pos = document.caretRangeFromPoint(x, y)
      if (!pos) return -1
      const range = document.createRange()
      range.selectNodeContents(target.querySelector('code') ?? target)
      range.setEnd(pos.startContainer, pos.startOffset)
      return range.toString().length
    },
    [px, py],
  )
  expect(expectedOffset).toBeGreaterThanOrEqual(0)
  expect(expectedOffset).toBeLessThanOrEqual(JS_CODE.indexOf('\n'))

  await page.mouse.click(px, py)
  const ta = page.locator('.left .code-editor-textarea')
  await expect(ta).toBeVisible()

  const state = await ta.evaluate((el: HTMLTextAreaElement) => ({
    value: el.value,
    selStart: el.selectionStart,
    selEnd: el.selectionEnd,
    focused: document.activeElement === el,
  }))
  expect(state.focused).toBe(true)
  // collapsed draft — the representation newline never reaches the face
  expect(state.value).toBe(JS_CODE)
  // the caret sits at the pointed-at offset, not at end-of-text
  expect(state.selStart).toBe(state.selEnd)
  expect(state.selStart).toBe(expectedOffset)
})

test('blur commits without growing the text; reopening shows the same code', async ({
  page,
}) => {
  const pre = page.locator('.left pre.language-javascript')
  await pre.scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  const box = await pre.boundingBox()
  await page.mouse.click(box!.x + 30, box!.y + 14)

  const ta = page.locator('.left .code-editor-textarea')
  await expect(ta).toBeVisible()
  await expect(ta).toHaveValue(JS_CODE)

  // blur: click a heading far above
  await page.locator('.left').getByText('Heading One', { exact: true }).click()
  await expect(ta).toBeHidden()

  // the model kept its representation newline — the read pane's code is
  // unchanged, so no phantom line leaked into the document
  const viewCode = await page.evaluate(() => {
    const code = document.querySelector('.right pre.language-javascript code')
    return code?.textContent ?? ''
  })
  expect(viewCode).toBe(JS_CODE + '\n')

  // reopen: same collapsed draft, caret at the new click point (line 2 this
  // time — deep enough to prove the handoff is not a one-shot at offset 0).
  // The click point is anchored in CONTENT space (the glyph box of plaintext
  // offset 20, i.e. line 2) — viewport geometry after the blur-scroll is
  // never guessed. expected2 re-runs the exact caret-API probe the handler
  // uses, so the equality below pins the whole handoff chain.
  await pre.scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  const TARGET = 20
  const expected2 = await page.evaluate((target) => {
    const code = document.querySelector('.left pre.language-javascript code')
    if (!code) return { x: 0, y: 0, offset: -1 }
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT)
    let n: Node | null
    let consumed = 0
    while ((n = walker.nextNode())) {
      const len = (n.textContent ?? '').length
      if (consumed + len > target) {
        const local = target - consumed
        const r = document.createRange()
        r.setStart(n, local)
        r.setEnd(n, local + 1)
        const rect = r.getBoundingClientRect()
        const x = rect.x + rect.width / 2
        const y = rect.y + rect.height / 2
        const pos = document.caretRangeFromPoint(x, y)
        if (!pos) return { x, y, offset: -1 }
        const cr = document.createRange()
        cr.selectNodeContents(code)
        cr.setEnd(pos.startContainer, pos.startOffset)
        return { x, y, offset: cr.toString().length }
      }
      consumed += len
    }
    return { x: 0, y: 0, offset: -1 }
  }, TARGET)
  expect(expected2.offset).toBeGreaterThan(JS_CODE.indexOf('\n'))
  expect(expected2.offset).toBeLessThan(JS_CODE.length)
  await page.mouse.click(expected2.x, expected2.y)
  await expect(ta).toBeVisible()
  const state = await ta.evaluate((el: HTMLTextAreaElement) => ({
    value: el.value,
    selStart: el.selectionStart,
  }))
  expect(state.value).toBe(JS_CODE)
  expect(state.selStart).toBe(expected2.offset)
})
