import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { BlockInfo } from '@autodown/engine'

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

/**
 * Absolute scroll coordinate of the first block's top edge, i.e. how far the
 * content is pushed down by container padding and the first block's margin.
 * Block tops are normalized to start at 0 (see normalizeBlocks), so scroll
 * coordinates must be shifted by this offset before comparing them against
 * measured block tops.
 */
function firstBlockAbsTop(container: HTMLElement, selector: string): number {
  const first = container.querySelector(selector) as HTMLElement | null
  if (!first) return 0
  const containerRect = container.getBoundingClientRect()
  return first.getBoundingClientRect().top - containerRect.top + container.scrollTop
}

function measureRightBlocks(container: HTMLElement): MeasuredBlock[] {
  const containerRect = container.getBoundingClientRect()
  const blocks = Array.from(container.querySelectorAll('.node-slot[data-block-slot-id]')).map((el) => {
    const htmlEl = el as HTMLElement
    const rect = htmlEl.getBoundingClientRect()
    return {
      id: htmlEl.getAttribute('data-block-slot-id')!,
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
  sourceScrollTop: number,
  sourceFirstOffset: number,
  targetFirstOffset: number
): number {
  if (targetBlocks.length === 0) return sourceScrollTop

  // Above the first block both sides show container padding; interpolate
  // between the two first-block offsets so 0 maps to 0 and the first block
  // top maps to the first block top.
  if (sourceScrollTop <= sourceFirstOffset) {
    return sourceFirstOffset > 0
      ? (sourceScrollTop / sourceFirstOffset) * targetFirstOffset
      : sourceScrollTop
  }

  const pos = findBlockPosition(sourceBlocks, sourceScrollTop - sourceFirstOffset)
  if (!pos) return sourceScrollTop

  const sourceBlock = sourceBlocks[pos.index]
  // Prefer matching by block ID so missing or differently-rendered blocks
  // (e.g. a failed image) do not throw the whole mapping out of alignment.
  let targetBlock = targetBlocks.find((b) => b.id === sourceBlock?.id)
  if (!targetBlock) {
    targetBlock = targetBlocks[pos.index]
  }
  if (!targetBlock) return sourceScrollTop

  return targetFirstOffset + targetBlock.top + targetBlock.height * pos.ratio
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

let spacerStyleEl: HTMLStyleElement | null = null
let measuring = false
let blockResizeObserver: ResizeObserver | null = null

function clearBlockSpacers() {
  if (spacerStyleEl) {
    spacerStyleEl.textContent = ''
  }
}

const MIN_BLOCK_GAP = 16

/**
 * Ensure every matched block pair is followed by at least MIN_BLOCK_GAP, and
 * add extra bottom margin to the shorter side so that subsequent blocks start
 * at the same vertical position on both sides. This keeps block-level scroll
 * sync aligned without requiring identical content heights, while guaranteeing
 * a consistent minimum visual gap between blocks. We use a dynamic stylesheet
 * because ProseMirror may overwrite inline styles on editor block nodes.
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

    // Align the very first matched pair. The editor's first block may have a
    // top margin (e.g. H1) while the preview slot may not, so use viewport
    // coordinates to compute the actual first-block vertical offset.
    if (i === 0) {
      // normalizeBlocks() resets the first block top to 0, so use viewport
      // coordinates to compute the actual first-block vertical offset.
      const topOffset = left.el.getBoundingClientRect().top - right.el.getBoundingClientRect().top
      if (Math.abs(topOffset) > 0.5) {
        rules.push(
          `.streaming-document .node-slot[data-block-slot-id="${right.id}"] { margin-top: ${topOffset}px !important; }`
        )
      }
    }

    // The distance from one block top to the next should be the same on both
    // sides: the taller block's height plus a guaranteed minimum gap. We zero
    // the next block's margin-top so this bottom margin is the only thing that
    // controls the gap. The last matched pair has no next block, so a bottom
    // margin there would only add dead scroll range below the content (worse,
    // asymmetric dead range, since the shorter side gets the bigger margin).
    if (leftNext && rightNext) {
      const commonDistance = Math.max(left.height, right.height) + MIN_BLOCK_GAP
      const leftMarginBottom = commonDistance - left.height
      const rightMarginBottom = commonDistance - right.height

      rules.push(
        `.autodown-editor-content [data-block-id="${left.id}"] { margin-bottom: ${leftMarginBottom}px !important; }`,
        `.streaming-document .node-slot[data-block-slot-id="${right.id}"] { margin-bottom: ${rightMarginBottom}px !important; }`
      )
    }

    if (leftNext) {
      rules.push(
        `.autodown-editor-content [data-block-id="${left.id}"] + [data-block-id] { margin-top: 0 !important; }`
      )
    }
    if (rightNext) {
      rules.push(
        `.streaming-document .node-slot[data-block-slot-id="${right.id}"] + .node-slot { margin-top: 0 !important; }`
      )
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
  const leftFirstOffset = ref(0)
  const rightFirstOffset = ref(0)
  const leftScrollHeight = ref(0)
  const rightScrollHeight = ref(0)

  const scrollHeight = computed(() => {
    return Math.max(leftScrollHeight.value, rightScrollHeight.value, clientHeight.value)
  })

  let observedLeftEl: HTMLElement | null = null
  let observedRightEl: HTMLElement | null = null
  let observedActionsEl: HTMLElement | null = null
  let observedResizeLeftEl: HTMLElement | null = null
  let observedResizeRightEl: HTMLElement | null = null
  let observedResizeLeftContent: HTMLElement | null = null
  let observedResizeRightContent: HTMLElement | null = null
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
      // characterData matters: the streaming renderer grows blocks by
      // appending text, which changes block heights without any childList
      // mutation — without it the block map and sync spacer go stale.
      mutationObserver.observe(leftEl, { childList: true, subtree: true, characterData: true })
      mutationObserver.observe(rightEl, { childList: true, subtree: true, characterData: true })
      observedLeftEl = leftEl
      observedRightEl = rightEl
    }

    const actionsEl = leftEl.closest('.autodown-editor')?.querySelector('.autodown-editor-actions') as HTMLElement | null
    if (actionsEl && actionsEl !== observedActionsEl) {
      actionsResizeObserver.disconnect()
      actionsResizeObserver.observe(actionsEl)
      observedActionsEl = actionsEl
    }

    if (!blockResizeObserver) {
      blockResizeObserver = new ResizeObserver(() => {
        measure()
        syncContainers()
      })
    }
    // Observe the content roots, not just the fixed-height wrappers: the
    // content box resizes on any reflow of the rendered document (streaming,
    // web fonts, images, async highlighting), including changes that produce
    // no DOM mutation. Without this the block map and sync spacer go stale
    // once the document settles after the last mutation. Only re-observe when
    // the targets actually change — observe() re-fires an initial
    // notification, so re-observing on every measure would loop forever.
    const leftContent = leftEl.querySelector('.autodown-editor-content') as HTMLElement | null
    const rightContent = rightEl.querySelector('.markdown-renderer') as HTMLElement | null
    if (
      leftEl !== observedResizeLeftEl ||
      rightEl !== observedResizeRightEl ||
      leftContent !== observedResizeLeftContent ||
      rightContent !== observedResizeRightContent
    ) {
      blockResizeObserver.disconnect()
      blockResizeObserver.observe(leftEl)
      blockResizeObserver.observe(rightEl)
      if (leftContent) blockResizeObserver.observe(leftContent)
      if (rightContent) blockResizeObserver.observe(rightContent)
      observedResizeLeftEl = leftEl
      observedResizeRightEl = rightEl
      observedResizeLeftContent = leftContent
      observedResizeRightContent = rightContent
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
    leftFirstOffset.value = firstBlockAbsTop(leftEl, '.autodown-editor-content [data-block-id]')
    rightFirstOffset.value = firstBlockAbsTop(renderer.containerRef, '.node-slot[data-block-slot-id]')

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

    const leftMaxScrollTop = Math.max(0, leftEl.scrollHeight - leftEl.clientHeight)

    let targetRightScrollTop: number
    if (targetLeftScrollTop >= leftMaxScrollTop - 1) {
      // At the bottom edge the block mapping cannot express "scrolled to the
      // end" (the viewport top still sits inside an earlier block, and each
      // side's content ends at a slightly different height). Snap both panes
      // to their own maximum so the shared scrollbar's bottom always means
      // both sides are at their bottom.
      targetRightScrollTop = Math.max(0, rightEl.scrollHeight - rightEl.clientHeight)
    } else if (editorActionsHeight.value <= 0 || targetLeftScrollTop <= leftContentBottom) {
      targetRightScrollTop = computeScrollTopFromSource(
        leftBlocks.value,
        rightBlocks.value,
        targetLeftScrollTop,
        leftFirstOffset.value,
        rightFirstOffset.value
      )
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

  let observedWorkspace: HTMLElement | null = null
  let workspaceResizeObserver: ResizeObserver | null = null

  function initWorkspace(workspace: HTMLElement) {
    observedWorkspace = workspace
    workspaceResizeObserver = new ResizeObserver(() => {
      measure()
      setScrollTop(scrollTop.value)
    })
    workspaceResizeObserver.observe(workspace)

    workspace.addEventListener('wheel', onWheel, { passive: false, capture: true })

    // Initial measure after content has rendered.
    requestAnimationFrame(() => {
      measure()
      setScrollTop(0)
    })
  }

  onMounted(() => {
    const workspace = options.workspaceRef.value
    if (workspace) initWorkspace(workspace)
  })

  // Lazy init: when the composable is wired through a generated bridge (plan
  // 014), the workspace ref is populated by the widget's own onMounted, which
  // runs AFTER this composable's. Pick the element up as soon as it appears.
  watch(
    () => options.workspaceRef.value,
    (workspace) => {
      if (workspace && !observedWorkspace) initWorkspace(workspace)
    },
    { flush: 'post' }
  )

  onUnmounted(() => {
    workspaceResizeObserver?.disconnect()
    mutationObserver.disconnect()
    actionsResizeObserver.disconnect()
    blockResizeObserver?.disconnect()
    blockResizeObserver = null
    observedWorkspace?.removeEventListener('wheel', onWheel, true)
    observedWorkspace = null
    observedLeftEl = null
    observedRightEl = null
    observedActionsEl = null
    observedResizeLeftEl = null
    observedResizeRightEl = null
    observedResizeLeftContent = null
    observedResizeRightContent = null
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
