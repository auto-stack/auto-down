<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { StreamingRenderer } from '@autodown/engine/render'
import { useStreamFeed } from './useStreamFeed'
import { SAMPLE_DOCUMENT } from './sample'

const feed = useStreamFeed(SAMPLE_DOCUMENT, 4, 24)
const { text, streaming, progress } = feed

const done = computed(() => progress.value >= 1)

onMounted(() => feed.play())
</script>

<template>
  <div class="stream-demo">
    <header class="stream-demo__header">
      <h1>AutoDown Streaming Demo</h1>
      <a href="https://github.com/..." target="_blank" rel="noreferrer">@autodown/engine</a>
    </header>

    <div class="stream-demo__toolbar">
      <button class="stream-demo__toolbar-button--primary" @click="feed.play()" :disabled="streaming || done">播放</button>
      <button @click="feed.pause()" :disabled="!streaming">暂停</button>
      <button @click="feed.restart()">重播</button>
      <button @click="feed.finish()" :disabled="done">直达终点</button>
      <span class="stream-demo__status">
        {{ Math.round(progress * 100) }}% · {{ done ? '完成' : streaming ? '流式传输中…' : '已暂停' }}
      </span>
    </div>

    <div class="stream-demo__viewport">
      <StreamingRenderer :source="text" :streaming="streaming" :scroll-sync="false" />
    </div>
  </div>
</template>
