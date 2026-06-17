<template>
  <div
    ref="trackRef"
    class="custom-scrollbar"
    :class="{ 'is-dragging': dragging, 'is-visible': isVisible }"
    @mousedown="onTrackMouseDown"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div
      class="custom-scrollbar-thumb"
      :style="thumbStyle"
      @mousedown.stop="onThumbMouseDown"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  visible?: boolean
}>()

const emit = defineEmits<{
  'update:scrollTop': [value: number]
  'hover-change': [value: boolean]
}>()

const trackRef = ref<HTMLElement | null>(null)
const dragging = ref(false)
const hovering = ref(false)

const isVisible = computed(() => props.visible || hovering.value || dragging.value)

const thumbHeight = computed(() => {
  if (props.scrollHeight <= props.clientHeight) return 0
  const ratio = props.clientHeight / props.scrollHeight
  const minHeight = 32
  return Math.max(minHeight, ratio * props.clientHeight)
})

const thumbTop = computed(() => {
  if (props.scrollHeight <= props.clientHeight) return 0
  const maxScroll = props.scrollHeight - props.clientHeight
  const trackAvailable = props.clientHeight - thumbHeight.value
  if (maxScroll <= 0 || trackAvailable <= 0) return 0
  return (props.scrollTop / maxScroll) * trackAvailable
})

const thumbStyle = computed(() => ({
  height: `${thumbHeight.value}px`,
  transform: `translateY(${thumbTop.value}px)`,
}))

function setScrollTopFromY(y: number) {
  const track = trackRef.value
  if (!track || props.scrollHeight <= props.clientHeight) return
  const rect = track.getBoundingClientRect()
  const trackAvailable = props.clientHeight - thumbHeight.value
  if (trackAvailable <= 0) return
  const relativeY = y - rect.top - thumbHeight.value / 2
  const ratio = Math.max(0, Math.min(1, relativeY / trackAvailable))
  const maxScroll = props.scrollHeight - props.clientHeight
  emit('update:scrollTop', ratio * maxScroll)
}

function onTrackMouseDown(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    setScrollTopFromY(event.clientY)
  }
}

function onThumbMouseDown(event: MouseEvent) {
  dragging.value = true
  const startY = event.clientY
  const startScrollTop = props.scrollTop

  function onMouseMove(e: MouseEvent) {
    const track = trackRef.value
    if (!track) return
    const deltaY = e.clientY - startY
    const trackAvailable = props.clientHeight - thumbHeight.value
    if (trackAvailable <= 0) return
    const maxScroll = props.scrollHeight - props.clientHeight
    const ratio = deltaY / trackAvailable
    emit('update:scrollTop', Math.max(0, Math.min(maxScroll, startScrollTop + ratio * maxScroll)))
  }

  function onMouseUp() {
    dragging.value = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseEnter() {
  hovering.value = true
  emit('hover-change', true)
}

function onMouseLeave() {
  hovering.value = false
  emit('hover-change', false)
}
</script>

<style scoped>
.custom-scrollbar {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 10px;
  background: transparent;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
  pointer-events: auto;
}

.custom-scrollbar.is-visible,
.custom-scrollbar.is-dragging {
  opacity: 1;
}

.custom-scrollbar-thumb {
  width: 8px;
  margin-left: 1px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.35);
  cursor: pointer;
  will-change: transform;
}

.custom-scrollbar:hover .custom-scrollbar-thumb,
.custom-scrollbar.is-dragging .custom-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.55);
}
</style>
