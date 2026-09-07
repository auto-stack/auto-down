<!-- App component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AutoDownEditor, StreamingRenderer } from '@autodown/engine'

import { initial_content } from '@/ext/src/front/utils/showcase_ext'
import { log_ready, is_vue } from '@/ext/src/front/utils/showcase_ext'


const content = ref<string>('')
const stream_text = ref<string>('')
const show_edit = ref<boolean>(true)
const show_view = ref<boolean>(true)
const show_stream = ref<boolean>(true)
const feed_source = ref<string>('')
const playing = ref<boolean>(false)
const speed = ref<number>(96)

const stream_len = computed<any>(() => stream_text.value.length)
const source_len = computed<any>(() => feed_source.value.length)
const settled = computed<boolean>(() => source_len.value > 0 && stream_text.value === feed_source.value)
const stream_pct = computed<any>(() => (source_len.value === 0 ? 100 : stream_len.value * 100 / source_len.value))
const stream_status = computed<any>(() => (settled.value ? '已落定' : (playing.value ? '流式中 ' + stream_pct.value.toString() + '%' : (source_len.value > 0 ? '已暂停' : '未开始'))))

const emit = defineEmits<{
  Init: []
  Edit: [string]
  ToggleEdit: []
  ToggleView: []
  ToggleStream: []
  FeedStep: []
  FeedReset: []
  FeedPlayPause: []
  FeedSetSpeed: [number]
}>()

function Edit(md: any): void {
  content.value = md;

  emit('Edit', md)
}

function FeedPlayPause(): void {
  if (feed_source.value == '' || stream_text.value == feed_source.value) {feed_source.value = content.value;
  stream_text.value = '';
  }
  playing.value = !playing.value;

  emit('FeedPlayPause')
}

function FeedReset(): void {
  feed_source.value = content.value;
  stream_text.value = '';
  playing.value = false;

  emit('FeedReset')
}

function FeedSetSpeed(v: any): void {
  speed.value = v;

  emit('FeedSetSpeed', v)
}

function FeedStep(): void {
  if (feed_source.value.length > 0 && stream_text.value.length < feed_source.value.length) {stream_text.value = feed_source.value.substring(0, (0) + (Math.min(feed_source.value.length, stream_text.value.length + speed.value)));
  } else {playing.value = false;
  }

  emit('FeedStep')
}

function ToggleEdit(): void {
  show_edit.value = !show_edit.value;

  emit('ToggleEdit')
}

function ToggleStream(): void {
  show_stream.value = !show_stream.value;

  emit('ToggleStream')
}

function ToggleView(): void {
  show_view.value = !show_view.value;

  emit('ToggleView')
}

onMounted(() => {
  content.value = initial_content();
  if (is_vue() != null) {log_ready('init');
  }
})


</script>

<template>
    <div class="app">
      <header class="toolbar">
        <div class="toolbar-inner">
          <span>AutoDown Showcase</span>
          <div class="toggles">
            <button :class="(show_edit ? 'toggle toggle-on toggle-edit' : 'toggle toggle-edit')" @click="ToggleEdit">edit</button>
            <button :class="(show_view ? 'toggle toggle-on toggle-view' : 'toggle toggle-view')" @click="ToggleView">view</button>
            <button :class="(show_stream ? 'toggle toggle-on toggle-stream' : 'toggle toggle-stream')" @click="ToggleStream">stream</button>
          </div>
          <div class="stream-controls">
            <template v-if="is_vue() != null">
              <button :class="(playing ? 'ctrl-btn ctrl-on btn-play' : 'ctrl-btn btn-play')" @click="FeedPlayPause">▶</button>
            </template>
            <button class="ctrl-btn btn-step" @click="FeedStep">⏭</button>
            <button class="ctrl-btn btn-replay" @click="FeedReset">↻</button>
            <div class="speed-select">
              <button :class="(speed == 24 ? 'ctrl-btn speed-btn-on speed-lo' : 'ctrl-btn speed-lo')" @click="FeedSetSpeed(24)">慢</button>
              <button :class="(speed == 96 ? 'ctrl-btn speed-btn-on speed-mid' : 'ctrl-btn speed-mid')" @click="FeedSetSpeed(96)">中</button>
              <button :class="(speed == 384 ? 'ctrl-btn speed-btn-on speed-hi' : 'ctrl-btn speed-hi')" @click="FeedSetSpeed(384)">快</button>
            </div>
          </div>
        </div>
      </header>
      <main class="workspace">
        <div class="flex flex-row h-full w-full">
          <template v-if="show_edit">
            <div class="flex flex-col flex-1 min-w-0 overflow-hidden col-edit">
              <div class="pane-header">
                <span>edit</span>
              </div>
              <AutoDownEditor :content="content" :placeholder="'Start typing...'" :can-edit="true" :show-actions="true" :dark-mode="false" class="flex-1 min-h-0 overflow-hidden" @update:modelValue="Edit" :key="'AutoDownEditor-1'" />
            </div>
          </template>
          <template v-if="show_view">
            <div class="flex flex-col flex-1 min-w-0 overflow-hidden col-view">
              <div class="pane-header">
                <span>view</span>
              </div>
              <StreamingRenderer :source="content" :streaming="false" :scroll-sync="true" :dark-mode="false" class="flex-1 min-h-0 overflow-hidden py-4 px-5" :key="'StreamingRenderer-2'" />
            </div>
          </template>
          <template v-if="show_stream">
            <div class="flex flex-col flex-1 min-w-0 overflow-hidden col-stream">
              <div class="pane-header">
                <span>stream</span>
                <span class="pane-status">
                  <span>{{ stream_status }}</span>
                </span>
              </div>
              <StreamingRenderer :source="stream_text" :streaming="true" :scroll-sync="true" :dark-mode="false" class="flex-1 min-h-0 overflow-hidden py-4 px-5" :key="'StreamingRenderer-3'" />
            </div>
          </template>
        </div>
      </main>
    </div>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        .app {
            display: flex;
            flex-direction: column;
            height: 100vh;
            font-family: system-ui, -apple-system, sans-serif;
            color: #111827;
        }

        .toolbar {
            flex-shrink: 0;
            height: 48px;
            display: flex;
            align-items: center;
            padding: 0 1.25rem;
            border-bottom: 1px solid #e5e7eb;
            background: #fff;
            font-weight: 600;
            font-size: 1rem;
        }

        .toolbar-inner {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .toggles {
            display: flex;
            gap: 8px;
        }

        .toggle {
            padding: 4px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background: #fff;
            color: #374151;
            font-size: 13px;
            cursor: pointer;
        }

        .toggle-on {
            background: #6366f1;
            border-color: #6366f1;
            color: #fff;
        }

        .workspace {
            position: relative;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

        .stream-controls {
            display: flex;
            gap: 6px;
            align-items: center;
        }

        .ctrl-btn {
            padding: 4px 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background: #fff;
            color: #374151;
            font-size: 12px;
            cursor: pointer;
        }

        .ctrl-on {
            background: #10b981;
            border-color: #10b981;
            color: #fff;
        }

        .speed-select {
            display: flex;
            gap: 4px;
            margin-left: 4px;
        }

        .speed-btn-on {
            background: #6366f1;
            border-color: #6366f1;
            color: #fff;
        }

        .pane-header {
            flex-shrink: 0;
            height: 32px;
            display: flex;
            align-items: center;
            padding: 0 12px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #6b7280;
            background: #f3f4f6;
            border-bottom: 1px solid #e5e7eb;
        }

        .pane-status {
            margin-left: auto;
            font-weight: 400;
            text-transform: none;
            letter-spacing: 0;
            font-size: 11px;
            color: #6b7280;
        }

        /* Utility classes (vue track: the DSL maps row/col/flex-1 to real
         * CSS via these scoped rules — demo app.at precedent; VM track
         * consumes row/col/flex-1 natively, unknown tokens zero-effect). */
        .flex {
            display: flex;
        }

        .flex-row {
            flex-direction: row;
        }

        .flex-col {
            flex-direction: column;
        }

        .flex-1 {
            flex: 1 1 0%;
        }

        .h-full {
            height: 100%;
        }

        .w-full {
            width: 100%;
        }

        .min-w-0 {
            min-width: 0;
        }

        .min-h-0 {
            min-height: 0;
        }

        .overflow-hidden {
            overflow: hidden;
        }

        .px-5 {
            padding-left: 1.25rem;
            padding-right: 1.25rem;
        }

        .py-4 {
            padding-top: 1rem;
            padding-bottom: 1rem;
        }

        :deep(.autodown-editor) {
            border: none;
            border-radius: 0;
        }

        :deep(.autodown-editor-content-wrapper) {
            height: 100%;
            overflow-y: auto;
        }
    </style>
