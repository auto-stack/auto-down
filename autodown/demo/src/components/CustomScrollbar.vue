<!-- CustomScrollbar component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  visible?: boolean
  is_vm?: boolean
}>(), {
  visible: false,
  is_vm: false,
})

const dragging = ref<number>(0)
const hovering = ref<number>(0)
const grab_armed = ref<number>(0)
const grab_offset = ref<number>(0)
const left_top = ref<number>(0)
const left_height = ref<number>(0)
const left_client = ref<number>(0)
const right_top = ref<number>(0)
const right_height = ref<number>(0)
const right_client = ref<number>(0)

const trackEl = ref<HTMLElement | null>(null)

const thumb_h = computed<any>(() => (props.scrollHeight > props.clientHeight ? (props.clientHeight / props.scrollHeight * props.clientHeight < 32 ? 32 : props.clientHeight / props.scrollHeight * props.clientHeight) : 0))
const thumb_t = computed<any>(() => (props.scrollHeight > props.clientHeight && props.clientHeight - thumb_h.value > 0 ? props.scrollTop / (props.scrollHeight - props.clientHeight) * (props.clientHeight - thumb_h.value) : 0))

const emit = defineEmits<{
  'update:scrollTop': [number]
  'hover-change': [number]
  TrackDown: [any]
  ThumbDown: [any]
  ThumbUp: []
  Move: [number, number]
}>()

function Move(x: any, y: any): void {
  if (dragging.value == 1) {if (props.scrollHeight > props.clientHeight) {let thumb_h2: number = (() => { if (props.clientHeight / props.scrollHeight * props.clientHeight < 32) { return 32; } else { return props.clientHeight / props.scrollHeight * props.clientHeight; } })();
  let track_avail: number = props.clientHeight - thumb_h2;
  if (track_avail > 0) {if (grab_armed.value == 1) {grab_armed.value = 0;
  grab_offset.value = y - props.scrollTop / (props.scrollHeight - props.clientHeight) * track_avail;
  }let v: number = (y - grab_offset.value) / track_avail * (props.scrollHeight - props.clientHeight);
  if (v < 0) {v = 0;
  }let max_scroll2 = props.scrollHeight - props.clientHeight;
  if (v > max_scroll2) {v = max_scroll2;
  }






  if (props.is_vm) {left_top.value = v;
  if (left_height.value > left_client.value && right_height.value > right_client.value) {right_top.value = v / (left_height.value - left_client.value) * (right_height.value - right_client.value);
  }} else {let _ = update_scrollTop(v);
  }}}}

  emit('Move', x, y)
}

function ThumbDown(e: any): void {
  dragging.value = 1;
  grab_armed.value = 0;
  grab_offset.value = e.clientY - trackEl.value!.getBoundingClientRect().top - thumb_t.value;

  emit('ThumbDown', e)
}

function ThumbUp(): void {
  dragging.value = 0;

  emit('ThumbUp')
}

function TrackDown(e: any): void {
  dragging.value = 1;
  grab_armed.value = 1;
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

function hover_change(v: any): void {
  hovering.value = v;



  if (v == 0) {dragging.value = 0;
  }



  v = v == 1;

  emit('hover-change', v)
}

function update_scrollTop(v: any): void {

  emit('update:scrollTop', v)
}


</script>

<template>
    <div class="custom-scrollbar absolute top-0 right-0 bottom-0 w-[10px] h-full" :class="{ visible: props.visible || hovering == 1 || dragging == 1, dragging: dragging == 1 }" ref="trackEl" @mousedown="TrackDown($event)" @mouseenter="hover_change(1)" @mouseleave="hover_change(0)" @mousemove="e => Move(e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left, e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top)" @mouseup="ThumbUp" @scroll="update_scrollTop">
      <div class="custom-scrollbar-thumb w-[8px] rounded bg-black/30" :style="({ height: `${thumb_h}px`, transform: `translateY(${thumb_t}px)` } as any)" @mousedown.stop="ThumbDown($event)" />
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
