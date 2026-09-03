<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { StreamingRenderer } from '@autodown/engine/render'
import { useStreamFeed } from './useStreamFeed'
import { SAMPLE_DOCUMENT } from './sample'
import { clearPaneDiffs, comparePanes } from './comparePanes'

const feed = useStreamFeed(SAMPLE_DOCUMENT, 4, 24)
const { text, streaming, progress } = feed

const done = computed(() => progress.value >= 1)

// PLAN-041 T12 对拍台：左栏 view 态（同一 StreamingRenderer 定格
// streaming=false，隔离「流式落定 vs 一次性」单一变量）；右栏保留
// feed 驱动流式。scroll-sync 两侧同值 false（开启时清 slot 边距属
// 刻意差异，见计划详细设计 10）。
const leftPane = ref<HTMLElement | null>(null)
const rightPane = ref<HTMLElement | null>(null)
const diffReport = ref('')
const comparing = ref(false)

/** DOM 指纹：innerHTML 全量比对（typewriter/调度器残余/fence loading
 * 旗标的任何活动都会改变内容）。 */
function fingerprint(el: HTMLElement): string {
  return el.innerHTML
}

/** 落定语义：done 后等 DOM 稳定——两帧 300ms innerHTML 不变（覆盖
 * typewriter 清零、调度器残余 flush、fence loading 旗标清）。 */
async function waitSettled(): Promise<void> {
  await new Promise((r) => setTimeout(r, 350))
  for (let i = 0; i < 20; i++) {
    const snap = fingerprint(rightPane.value!)
    await new Promise((r) => setTimeout(r, 300))
    if (snap === fingerprint(rightPane.value!)) return
  }
}

async function compare(): Promise<void> {
  const left = leftPane.value
  const right = rightPane.value
  if (!left || !right) return
  if (!done.value) {
    diffReport.value = '尚未落定：先播放至完成再对比'
    return
  }
  comparing.value = true
  diffReport.value = ''
  try {
    await waitSettled()
    clearPaneDiffs(left, right)
    // 栏标签（view/stream 提示文本）设计内不同文——排除，不参与对拍。
    const diffs = comparePanes(left, right, (el) =>
      el.classList.contains('stream-demo__pane-label'),
    )
    diffReport.value = diffs.length
      ? `差异 ${diffs.length} 处：首处 ${diffs[0].path} — ${diffs[0].reason}`
      : '零差异 ✓ view（一次性）与 stream（流式落定）结构+计算样式一致'
  } finally {
    comparing.value = false
  }
}

onMounted(() => feed.play())
</script>

<template>
  <div class="stream-demo">
    <header class="stream-demo__header">
      <h1>AutoDown Streaming Demo · 对拍台</h1>
      <a href="https://github.com/..." target="_blank" rel="noreferrer">@autodown/engine</a>
    </header>

    <div class="stream-demo__toolbar">
      <button class="stream-demo__toolbar-button--primary" @click="feed.play()" :disabled="streaming || done">播放</button>
      <button @click="feed.pause()" :disabled="!streaming">暂停</button>
      <button @click="feed.restart()">重播</button>
      <button @click="feed.finish()" :disabled="done">直达终点</button>
      <button class="stream-demo__compare" :disabled="comparing || !done" @click="compare">
        {{ comparing ? '对拍中…' : '对比' }}
      </button>
      <span class="stream-demo__status">
        {{ Math.round(progress * 100) }}% · {{ done ? '完成' : streaming ? '流式传输中…' : '已暂停' }}
      </span>
      <span
        v-if="diffReport"
        class="stream-demo__diff-report"
        :class="{ 'is-clean': diffReport.startsWith('零差异') }"
      >{{ diffReport }}</span>
    </div>

    <div class="stream-demo__panes">
      <div class="stream-demo__pane" ref="leftPane">
        <div class="stream-demo__pane-label">view · 一次性全量</div>
        <StreamingRenderer :source="SAMPLE_DOCUMENT" :streaming="false" :scroll-sync="false" />
      </div>
      <div class="stream-demo__pane" ref="rightPane">
        <div class="stream-demo__pane-label">stream · feed 驱动</div>
        <StreamingRenderer :source="text" :streaming="streaming" :scroll-sync="false" />
      </div>
    </div>
  </div>
</template>
