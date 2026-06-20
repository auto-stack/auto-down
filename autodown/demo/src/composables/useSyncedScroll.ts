import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { BlockInfo } from '@autodown/editor'

export interface SyncedScrollOptions {
  workspaceRef: Ref<HTMLElement | null>
  editorRef: Ref<{ getBlockMap: () => BlockInfo[] } | null | undefined>
  rendererRef: Ref<{ containerRef: HTMLElement | null } | null | undefined>
}

export interface SyncedScrollState {
  scrollTop: Ref<number>
  scrollHeight: Ref<number>
  clientHeight: Ref<number>
  setScrollTop: (value: number) => void
}

interface MeasuredBlock {
  id: string
  top: number
  height: number
  el: HTMLElement
}

function normalizeBlocks(blocks: MeasuredBlock[]): MeasuredBlock[] {
  if (blocks.length === 0) return blocks
  const minTop = Math.min(...blocks.map((b) => b.top))
  return blocks.map((b) => ({ ...b, top: b.top - minTop }))
}

function measureRightBlocks(container: HTMLElement): MeasuredBlock[] {
  const containerRect = container.getBoundingClientRect()
  const blocks = Array.from(container.querySelectorAll('[data-block-id]')).map((el) => {
    const htmlEl = el as HTMLElement
    const rect = htmlEl.getBoundingClientRect()
    return {
      id: htmlEl.getAttribute('data-block-id')!,
      top: rect.top - containerRect.top,
      height: htmlEl.offsetHeight,
      el: htmlEl,
    }
  })
  return normalizeBlocks(blocks)
}

function measureLeftBlocks(wrapper: HTMLElement): MeasuredBlock[] {
  const wrapperRect = wrapper.getBoundingClientRect()
  const blocks = Array.from(wrapper.querySelectorAll('.autodown-editor-content [data-block-id]')).map((el) => {
    const htmlEl = el as HTMLElement
    const rect = htmlEl.getBoundingClientRect()
    return {
      id: htmlEl.getAttribute('data-block-id')!,
      top: rect.top - wrapperRect.top,
      height: htmlEl.offsetHeight,
      el: htmlEl,
    }
  })
  return normalizeBlocks(blocks)
}

function findBlockPosition(blocks: MeasuredBlock[], scrollTop: number) {
  if (blocks.length === 0) return null
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (scrollTop < block.top + block.height) {
      return {
        index: i,
        ratio: block.height > 0 ? Math.max(0, scrollTop - block.top) / block.height : 0,
      }
    }
  }
  return {
    index: blocks.length - 1,
    ratio: 0,
  }
}

function computeScrollTopFromSource(
  sourceBlocks: MeasuredBlock[],
  targetBlocks: MeasuredBlock[],
  sourceScrollTop: number
): number {
  const pos = findBlockPosition(sourceBlocks, sourceScrollTop)
  if (!pos || targetBlocks.length === 0) return sourceScrollTop

  const sourceBlock = sourceBlocks[pos.index]
  // Prefer matching by block ID so missing or differently-rendered blocks
  // (e.g. a failed image) do not throw the whole mapping out of alignment.
  let targetBlock = targetBlocks.find((b) => b.id === sourceBlock?.id)
  if (!targetBlock) {
    targetBlock = targetBlocks[pos.index]
  }
  if (!targetBlock) return sourceScrollTop

  return targetBlock.top + targetBlock.height * pos.ratio
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

let spacerStyleEl: HTMLStyleElement | null = null
let measuring = false

function clearBlockSpacers() {
  if (spacerStyleEl) {
    spacerStyleEl.textContent = ''
  }
}

/**
 * Add bottom margin to the shorter side of each matched block pair so that
 * subsequent blocks start at the same vertical position on both sides. This
 * keeps block-level scroll sync aligned without requiring identical content
 * heights. We use a dynamic stylesheet because ProseMirror may overwrite inline
 * styles on editor block nodes.
 */
function applyBlockSpacers(leftBlocks: MeasuredBlock[], rightBlocks: MeasuredBlock[]) {
  if (!spacerStyleEl) {
    spacerStyleEl = document.createElement('style')
    spacerStyleEl.id = 'autodown-block-spacers'
    document.head.appendChild(spacerStyleEl)
  }
  spacerStyleEl.textContent = ''

  const rightIndexById = new Map(rightBlocks.map((b, idx) => [b.id, idx]))
  const rules: string[] = []

  for (let i = 0; i < leftBlocks.length; i++) {
    const left = leftBlocks[i]
    const rightIdx = rightIndexById.get(left.id)
    if (rightIdx === undefined) continue

    const right = rightBlocks[rightIdx]
    const leftNext = leftBlocks[i + 1]
    const rightNext = rightBlocks[rightIdx + 1]

    // Use the distance to the next block as the effective height on the right
    // side so that margins/gaps are accounted for. The left side gets an
    // explicit margin-bottom, and the next block's margin-top is zeroed to
    // avoid margin collapse swallowing the spacer.
    const leftEff = leftNext ? leftNext.top - left.top : left.height
    const rightEff = rightNext ? rightNext.top - right.top : right.height
    const diff = rightEff - leftEff

    if (Math.abs(diff) < 1) continue

    if (diff > 0) {
      rules.push(
        `.autodown-editor-content [data-block-id="${left.id}"] { margin-bottom: ${diff}px !important; }`
      )
      if (leftNext) {
        rules.push(
          `.autodown-editor-content [data-block-id="${left.id}"] + [data-block-id] { margin-top: 0 !important; }`
        )
      }
    } else {
      rules.push(
        `.streaming-document [data-block-id="${right.id}"] { margin-bottom: ${-diff}px !important; }`
      )
      if (rightNext) {
        rules.push(
          `.streaming-document [data-block-id="${right.id}"] + [data-block-id] { margin-top: 0 !important; }`
        )
      }
    }
  }

  if (rules.length > 0) {
    spacerStyleEl.textContent = rules.join('\n')
  }
}

export function useSyncedScroll(options: SyncedScrollOptions): SyncedScrollState {
  const scrollTop = ref(0)
  const clientHeight = ref(0)
  const editorActionsHeight = ref(0)

  const leftBlocks = ref<MeasuredBlock[]>([])
  const rightBlocks = ref<MeasuredBlock[]>([])
  const leftScrollHeight = ref(0)
  const rightScrollHeight = ref(0)

  const scrollHeight = computed(() => {
    return Math.max(leftScrollHeight.value, rightScrollHeight.value, clientHeight.value)
  })

  let observedLeftEl: HTMLElement | null = null
  let observedRightEl: HTMLElement | null = null
  let observedActionsEl: HTMLElement | null = null
  const mutationObserver = new MutationObserver(() => {
    measure()
    syncContainers()
  })
  const actionsResizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    const height = entry.target.getBoundingClientRect().height
    editorActionsHeight.value = height
    if (observedLeftEl) {
      observedLeftEl.style.paddingBottom = `${height}px`
    }
    if (observedRightEl) {
      observedRightEl.style.paddingBottom = `${height}px`
      const rightPadding = parseFloat(getComputedStyle(observedRightEl).paddingTop) + parseFloat(getComputedStyle(observedRightEl).paddingBottom)
      if (observedLeftEl) {
        observedRightEl.style.flex = '0 0 auto'
        observedRightEl.style.setProperty('height', `${observedLeftEl.clientHeight - rightPadding}px`, 'important')
      }
    }
    measure()
    syncContainers()
  })

  function getElements() {
    const editor = options.editorRef.value
    const renderer = options.rendererRef.value
    if (!editor || !renderer?.containerRef) return null

    const leftEl = editor.getBlockMap()[0]?.el?.closest('.autodown-editor-content-wrapper') as HTMLElement | undefined
    const rightEl = renderer.containerRef
    if (!leftEl || !rightEl) return null

    return { leftEl, rightEl }
  }

  function observeElements() {
    const elements = getElements()
    if (!elements) return
    const { leftEl, rightEl } = elements

    if (leftEl !== observedLeftEl || rightEl !== observedRightEl) {
      mutationObserver.disconnect()
      mutationObserver.observe(leftEl, { childList: true, subtree: true })
      mutationObserver.observe(rightEl, { childList: true, subtree: true })
      observedLeftEl = leftEl
      observedRightEl = rightEl
    }

    const actionsEl = leftEl.closest('.autodown-editor')?.querySelector('.autodown-editor-actions') as HTMLElement | null
    if (actionsEl && actionsEl !== observedActionsEl) {
      actionsResizeObserver.disconnect()
      actionsResizeObserver.observe(actionsEl)
      observedActionsEl = actionsEl
    }
  }

  function measure() {
    if (measuring) return
    measuring = true

    const editor = options.editorRef.value
    const renderer = options.rendererRef.value
    if (!editor || !renderer?.containerRef) {
      measuring = false
      return
    }

    observeElements()

    const leftEl = editor.getBlockMap()[0]?.el?.closest('.autodown-editor-content-wrapper') as HTMLElement | undefined
    const rightEl = renderer.containerRef
    if (!leftEl || !rightEl) {
      measuring = false
      return
    }

    if (observedActionsEl) {
      const height = observedActionsEl.getBoundingClientRect().height
      editorActionsHeight.value = height
      leftEl.style.paddingBottom = `${height}px`
      rightEl.style.paddingBottom = `${height}px`
      // Make the right scrolling viewport the same height as the left one so
      // both sides share the same scroll range and scrollbar ratio.
      const rightPadding = parseFloat(getComputedStyle(rightEl).paddingTop) + parseFloat(getComputedStyle(rightEl).paddingBottom)
      rightEl.style.flex = '0 0 auto'
      rightEl.style.setProperty('height', `${leftEl.clientHeight - rightPadding}px`, 'important')
    }

    clientHeight.value = leftEl.clientHeight

    // Remove previously injected per-block spacers before measuring so we never
    // double-count them when computing new spacers.
    clearBlockSpacers()

    const naturalLeftBlocks = measureLeftBlocks(leftEl)
    const naturalRightBlocks = measureRightBlocks(renderer.containerRef)

    // Insert per-block spacers on the shorter side so each matching block pair
    // starts at the same vertical position, keeping the two panes aligned even
    // when a rendered block is much taller than its source counterpart.
    applyBlockSpacers(naturalLeftBlocks, naturalRightBlocks)

    // Re-measure after spacers have shifted subsequent blocks; these are the
    // positions used for scroll mapping.
    leftBlocks.value = measureLeftBlocks(leftEl)
    rightBlocks.value = measureRightBlocks(renderer.containerRef)

    // Add an invisible spacer on the shorter side so both containers have the
    // same total scroll range. Reset it first so the diff is calculated from
    // the real content height (not a previous spacer).
    let spacer = rightEl.querySelector('.autodown-sync-spacer') as HTMLElement | null
    if (!spacer) {
      spacer = document.createElement('div')
      spacer.className = 'autodown-sync-spacer'
      spacer.style.pointerEvents = 'none'
      rightEl.appendChild(spacer)
    }
    spacer.style.height = '0px'
    leftScrollHeight.value = leftEl.scrollHeight
    const diff = leftEl.scrollHeight - rightEl.scrollHeight
    if (diff > 0) {
      spacer.style.height = `${diff}px`
    }
    rightScrollHeight.value = rightEl.scrollHeight
    measuring = false
  }

  function syncContainers() {
    const editor = options.editorRef.value
    const renderer = options.rendererRef.value
    if (!editor || !renderer?.containerRef) return

    const leftEl = editor.getBlockMap()[0]?.el?.closest('.autodown-editor-content-wrapper') as HTMLElement | undefined
    const rightEl = renderer.containerRef
    if (!leftEl || !rightEl) return

    const targetLeftScrollTop = clamp(scrollTop.value, 0, Math.max(0, scrollHeight.value - clientHeight.value))

    const leftContentBottom = leftBlocks.value.length
      ? leftBlocks.value[leftBlocks.value.length - 1].top + leftBlocks.value[leftBlocks.value.length - 1].height
      : 0
    const rightContentBottom = rightBlocks.value.length
      ? rightBlocks.value[rightBlocks.value.length - 1].top + rightBlocks.value[rightBlocks.value.length - 1].height
      : 0

    let targetRightScrollTop: number
    if (editorActionsHeight.value <= 0 || targetLeftScrollTop <= leftContentBottom) {
      targetRightScrollTop = computeScrollTopFromSource(leftBlocks.value, rightBlocks.value, targetLeftScrollTop)
    } else {
      const ratio = (targetLeftScrollTop - leftContentBottom) / editorActionsHeight.value
      targetRightScrollTop = rightContentBottom + ratio * editorActionsHeight.value
    }

    leftEl.scrollTop = targetLeftScrollTop
    rightEl.scrollTop = targetRightScrollTop
  }

  function setScrollTop(value: number) {
    const maxScroll = Math.max(0, scrollHeight.value - clientHeight.value)
    scrollTop.value = clamp(value, 0, maxScroll)
    syncContainers()
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault()
    setScrollTop(scrollTop.value + event.deltaY)
  }

  onMounted(() => {
    const workspace = options.workspaceRef.value
    if (!workspace) return

    const resizeObserver = new ResizeObserver(() => {
      measure()
      setScrollTop(scrollTop.value)
    })
    resizeObserver.observe(workspace)

    workspace.addEventListener('wheel', onWheel, { passive: false, capture: true })

    // Initial measure after content has rendered.
    requestAnimationFrame(() => {
      measure()
      setScrollTop(0)
    })

    onUnmounted(() => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      actionsResizeObserver.disconnect()
      workspace.removeEventListener('wheel', onWheel, true)
      observedLeftEl = null
      observedRightEl = null
      observedActionsEl = null
    })
  })

  watch(
    () => options.rendererRef.value?.containerRef,
    () => {
      measure()
      setScrollTop(scrollTop.value)
    },
    { flush: 'post' }
  )

  return {
    scrollTop,
    scrollHeight,
    clientHeight,
    setScrollTop,
  }
}
