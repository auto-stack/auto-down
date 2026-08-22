<!-- CustomScrollbar component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const dragging = ref<number>(0)
const hovering = ref<number>(0)
const drag_start = ref<number>(0)
const scroll_start = ref<number>(0)

const trackEl = ref<HTMLElement | null>(null)

const thumb_h = computed<any>(() => (props.scrollHeight > props.clientHeight ? (props.clientHeight / props.scrollHeight * props.clientHeight < 32 ? 32 : props.clientHeight / props.scrollHeight * props.clientHeight) : 0))
const thumb_t = computed<any>(() => (props.scrollHeight > props.clientHeight && props.clientHeight - thumb_h.value > 0 ? props.scrollTop / (props.scrollHeight - props.clientHeight) * (props.clientHeight - thumb_h.value) : 0))

const props = withDefaults(defineProps<{
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  visible?: boolean
}>(), {
  visible: false,
})

const emit = defineEmits<{
  'update:scrollTop': [number]
  'hover-change': [number]
  TrackDown: [any]
  StartDrag: [any]
  DragMove: [any]
  EndDrag: []
}>()

function TrackDown(e: any): void {
  if (e.target == e.currentTarget) {if (props.scrollHeight > props.clientHeight) {let track_avail = props.clientHeight - thumb_h.value;
  if (track_avail > 0) {let rect = trackEl.value!.getBoundingClientRect();
  let rel_y: number = e.clientY - rect.top - thumb_h.value / 2;
  let ratio: number = rel_y / track_avail;
  if (ratio < 0) {ratio = 0;
  }if (ratio > 1) {ratio = 1;
  }let max_scroll = props.scrollHeight - props.clientHeight;
  let _ = update_scrollTop(ratio * max_scroll);
  }}}

  emit('TrackDown', e)
}

function update_scrollTop(v: any): void {

  emit('update:scrollTop', v)
}

function DragMove(e: any): void {
  if (dragging.value == 1) {let track_avail = props.clientHeight - thumb_h.value;
  if (track_avail > 0) {let max_scroll = props.scrollHeight - props.clientHeight;
  let delta = e.clientY - drag_start.value;
  let ratio = delta / track_avail;
  let v = scroll_start.value + ratio * max_scroll;
  if (v < 0) {v = 0;
  }if (v > max_scroll) {v = max_scroll;
  }let _ = update_scrollTop(v);
  }}

  emit('DragMove', e)
}

function EndDrag(): void {
  dragging.value = 0;

  emit('EndDrag')
}

function StartDrag(e: any): void {
  dragging.value = 1;
  drag_start.value = e.clientY;
  scroll_start.value = props.scrollTop;

  emit('StartDrag', e)
}

function hover_change(v: any): void {
  hovering.value = v;



  v = v == 1;

  emit('hover-change', v)
}

function __auto_gl_mousemove_DragMove(e: any) {
  DragMove(e)
}

onMounted(() => {
  window.addEventListener('mouseup', EndDrag)
  window.addEventListener('mousemove', __auto_gl_mousemove_DragMove)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', EndDrag)
  window.removeEventListener('mousemove', __auto_gl_mousemove_DragMove)
})


</script>

<template>
    <div class="custom-scrollbar" :class="{ visible: props.visible || hovering == 1 || dragging == 1, dragging: dragging == 1 }" ref="trackEl" @mouseenter="hover_change(1)" @scroll="update_scrollTop" @mousedown="TrackDown($event)" @mouseleave="hover_change(0)">
      <div class="custom-scrollbar-thumb" :style="({ height: `${thumb_h}px`, transform: `translateY(${thumb_t}px)` } as any)" @mousedown.stop="StartDrag($event)" />
    </div>

</template>

<style>
/* Component styles */

</style>

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

        .custom-scrollbar.visible,
        .custom-scrollbar.dragging {
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
        .custom-scrollbar.dragging .custom-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.55);
        }
    </style>
