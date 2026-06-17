import { ref, nextTick, type Ref } from 'vue'

export interface MenuPosition {
  top: number
  left: number
}

export interface ContainerRect {
  width: number
  height: number
}

export interface TriggerRect {
  top: number
  left: number
  bottom: number
  right: number
  width: number
  height: number
}

export interface MenuBoundsOptions {
  placement?: 'bottom' | 'top'
  gap?: number
  align?: 'left' | 'right'
}

export function computeMenuPosition(
  trigger: TriggerRect,
  menuWidth: number,
  menuHeight: number,
  container: ContainerRect,
  placement: 'bottom' | 'top' = 'bottom',
  gap = 8,
  align: 'left' | 'right' = 'left'
): MenuPosition {
  let top: number

  if (placement === 'bottom') {
    top = trigger.bottom + gap
    if (top + menuHeight > container.height) {
      const flippedTop = trigger.top - menuHeight - gap
      if (flippedTop >= 0) {
        top = flippedTop
      } else {
        top = Math.max(0, container.height - menuHeight)
      }
    }
  } else {
    top = trigger.top - menuHeight - gap
    if (top < 0) {
      const flippedTop = trigger.bottom + gap
      if (flippedTop + menuHeight <= container.height) {
        top = flippedTop
      } else {
        top = 0
      }
    }
  }

  let left = align === 'right' ? trigger.right - menuWidth : trigger.left
  if (left + menuWidth > container.width) {
    left = Math.max(0, container.width - menuWidth)
  }
  if (left < 0) {
    left = 0
  }

  return { top, left }
}

export function useMenuBounds(menuRef: Ref<HTMLElement | undefined>) {
  const positionStyle = ref<Record<string, string>>({})

  function applyPosition(
    trigger: TriggerRect,
    container: ContainerRect,
    options: MenuBoundsOptions = {}
  ) {
    const { placement = 'bottom', gap = 8, align = 'left' } = options

    // Render once at the preferred position with zero size so we can measure
    // the real menu dimensions on the next tick without the browser clipping it.
    const initial = computeMenuPosition(trigger, 0, 0, container, placement, gap, align)
    positionStyle.value = {
      top: `${initial.top}px`,
      left: `${initial.left}px`,
      visibility: 'hidden',
    }

    nextTick(() => {
      const menu = menuRef.value
      if (!menu) return
      const rect = menu.getBoundingClientRect()
      const pos = computeMenuPosition(trigger, rect.width, rect.height, container, placement, gap, align)
      positionStyle.value = {
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        visibility: 'visible',
      }
    })
  }

  return {
    positionStyle,
    applyPosition,
  }
}
