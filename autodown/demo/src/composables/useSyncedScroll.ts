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
    const editor = options.editorRef.value
    const renderer = options.rendererRef.value
    if (!editor || !renderer?.containerRef) return

    observeElements()

    const leftEl = editor.getBlockMap()[0]?.el?.closest('.autodown-editor-content-wrapper') as HTMLElement | undefined
    const rightEl = renderer.containerRef
    if (!leftEl || !rightEl) return

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
    leftScrollHeight.value = leftEl.scrollHeight

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
    const diff = leftEl.scrollHeight - rightEl.scrollHeight
    if (diff > 0) {
      spacer.style.height = `${diff}px`
    }
    rightScrollHeight.value = rightEl.scrollHeight

    leftBlocks.value = normalizeBlocks(
      editor.getBlockMap().map((b) => ({ id: b.id, top: b.top, height: b.height }))
    )
    rightBlocks.value = measureRightBlocks(renderer.containerRef)
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
