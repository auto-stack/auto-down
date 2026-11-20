// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive } from 'vue'
import StreamingRenderer from '../StreamingRenderer.vue'

const sample = (id: string) => readFileSync(
  `src/parser/__tests__/fixtures/book-reading/${id}.ad`, 'utf8',
)
const root = document.createElement('main')
document.body.append(root)
let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
  window.getSelection()?.removeAllRanges()
  vi.restoreAllMocks()
})

async function mountBook(id: string) {
  const props = reactive({ readingMode: true, readingChapterId: id, readingCardId: '',
    readingTargetId: '', source: sample(id), onBookselect: vi.fn() })
  const app = createApp({ render: () => h(StreamingRenderer, { ...props }) })
  app.mount(root)
  dispose = () => app.unmount()
  await nextTick()
  return props
}

it('renders the third Xue Er card alone, emits its span, and returns to its full paragraph', async () => {
  const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
  const props = await mountBook('lunyu-001')
  const full = [...root.querySelectorAll('p')].find(p => p.textContent?.includes('巧言令色'))!
  expect(full.textContent).toContain('吾日三省吾身')
  props.readingCardId = 'lunyu-001-s003'
  props.readingTargetId = 'xy-u003'
  await nextTick()
  await nextTick()
  const text = root.querySelector('.autodown-book p')!
  expect(text.textContent).toBe('子曰：“巧言令色，鲜矣仁！”')
  expect(root.querySelectorAll('.autodown-book p')).toHaveLength(1)
  const range = document.createRange()
  const node = document.createTreeWalker(text, NodeFilter.SHOW_TEXT).nextNode()!
  range.setStart(node, 4)
  range.setEnd(node, 8)
  document.getSelection()!.addRange(range)
  text.dispatchEvent(new Event('pointerup', { bubbles: true }))
  expect(props.onBookselect).toHaveBeenCalledOnce()
  expect(JSON.parse(props.onBookselect.mock.calls[0][0])).toMatchObject({
    chapterId: 'lunyu-001', paragraphId: 'xy-p01', targetId: 'xy-u003',
    cardId: 'lunyu-001-s003', text: '巧言令色',
  })
  props.readingCardId = ''
  await nextTick()
  await nextTick()
  const anchor = root.querySelector('[data-book-id="xy-p01"]')
  expect(anchor?.textContent).toContain('吾日三省吾身')
  expect(scrolled.mock.instances.at(-1)).toBe(anchor)
})

it('scrolls to the second paragraph of the Shiji card and keeps the card heading out of chapter view', async () => {
  const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
  const props = await mountBook('shiji-062')
  expect(root.querySelector('.autodown-book-title')).toBeNull()
  props.readingCardId = 'shiji-062-s004'
  props.readingTargetId = 'yue-protest'
  await nextTick()
  await nextTick()
  const target = root.querySelector('[data-book-id="yue-protest"]')
  expect(target?.textContent).toContain('延入为上客')
  expect(scrolled.mock.instances.at(-1)).toBe(target)
  expect(root.querySelectorAll('.autodown-book p')).toHaveLength(2)
})
