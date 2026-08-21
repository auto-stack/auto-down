<!-- CustomScrollbar component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const dragging = ref<number>(0)
const hovering = ref<number>(0)
const drag_start = ref<number>(0)
const scroll_start = ref<number>(0)
const thumb_h = ref<number>(32)

const trackEl = ref<HTMLElement | null>(null)
const thumbEl = ref<HTMLElement | null>(null)

const props = defineProps<{
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  visible: boolean
}>()

const emit = defineEmits<{
  UpdateScrollTop: [number]
  HoverChange: [number]
  TrackDown: [any]
  StartDrag: [any]
  DragMove: [any]
  EndDrag: []
  ScrollSync: []
  SyncThumb: []
}>()

function ScrollSync(): void {
  let _ = SyncThumb();

  emit('ScrollSync')
}

function HoverChange(v: any): void {
  hovering.value = v;
  let _ = SyncThumb();

  emit('HoverChange', v)
}

function DragMove(e: any): void {
  if (dragging.value == 1) {let track_avail = props.clientHeight - thumb_h.value;
  if (track_avail > 0) {let max_scroll = props.scrollHeight - props.clientHeight;
  let delta = e.clientY - drag_start.value;
  let ratio = delta / track_avail;
  let v = scroll_start.value + ratio * max_scroll;
  if (v < 0) {v = 0;
  }if (v > max_scroll) {v = max_scroll;
  }let _ = UpdateScrollTop(v);
  }}

  emit('DragMove', e)
}

function SyncThumb(): void {
  if (props.scrollHeight > props.clientHeight) {let h = props.clientHeight / props.scrollHeight * props.clientHeight;
  if (h < 32) {h = 32;
  }thumb_h.value = h;
  let max_scroll = props.scrollHeight - props.clientHeight;
  let track_avail = props.clientHeight - h;
  let thumb_t: number = 0;
  if (max_scroll > 0) {if (track_avail > 0) {thumb_t = props.scrollTop / max_scroll * track_avail;
  }}thumbEl.value!.style.height = `${h}px`;
  thumbEl.value!.style.transform = `translateY(${thumb_t}px)`;
  } else {thumb_h.value = 0;
  thumbEl.value!.style.height = '0px';
  thumbEl.value!.style.transform = 'translateY(0px)';
  }

  emit('SyncThumb')
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

function TrackDown(e: any): void {
  if (e.target == e.currentTarget) {if (props.scrollHeight > props.clientHeight) {let track_avail = props.clientHeight - thumb_h.value;
  if (track_avail > 0) {let rect = trackEl.value!.getBoundingClientRect();
  let rel_y: number = e.clientY - rect.top - thumb_h.value / 2;
  let ratio: number = rel_y / track_avail;
  if (ratio < 0) {ratio = 0;
  }if (ratio > 1) {ratio = 1;
  }let max_scroll = props.scrollHeight - props.clientHeight;
  let _ = UpdateScrollTop(ratio * max_scroll);
  }}}

  emit('TrackDown', e)
}

function UpdateScrollTop(v: any): void {
  let _ = v;

  emit('UpdateScrollTop', v)
}

onMounted(() => {
  let _ = SyncThumb();
})

function __auto_gl_mousemove_DragMove(e: any) {
  DragMove(e)
}

onMounted(() => {
  window.addEventListener('mouseup', EndDrag)
  window.addEventListener('mousemove', __auto_gl_mousemove_DragMove)
  window.addEventListener('scroll', ScrollSync, { capture: true })
})

onUnmounted(() => {
  window.removeEventListener('mouseup', EndDrag)
  window.removeEventListener('mousemove', __auto_gl_mousemove_DragMove)
  window.removeEventListener('scroll', ScrollSync, { capture: true })
})


</script>

<template>
    <div class="custom-scrollbar" :class="{ visible: props.visible || hovering == 1 || dragging == 1, dragging: dragging == 1 }" ref="trackEl" @scroll="UpdateScrollTop" @mousedown="TrackDown($event)" @mouseenter="HoverChange(1)" @mouseleave="HoverChange(0)">
      <div class="custom-scrollbar-thumb" ref="thumbEl" @mousedown.stop="StartDrag($event)" @scroll="SyncThumb" />
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
