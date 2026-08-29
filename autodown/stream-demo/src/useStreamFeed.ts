import { onBeforeUnmount, ref, type Ref } from 'vue'

export interface StreamFeed {
  /** 已到达的文本（持续增长，直到 source 耗尽） */
  text: Ref<string>
  /** 流是否仍在进行中 */
  streaming: Ref<boolean>
  /** 0-1 */
  progress: Ref<number>
  play: () => void
  pause: () => void
  restart: () => void
  finish: () => void
}

/**
 * 模拟 LLM 流式输出：按 tick 匀速吐出 chunk。
 * 真实场景里把 SSE/WS 的 onchunk 换成 text.value += chunk 即可。
 */
export function useStreamFeed(source: string, chunkSize = 4, intervalMs = 24): StreamFeed {
  const text = ref('')
  const streaming = ref(false)
  const progress = ref(0)
  let cursor = 0
  let timer: ReturnType<typeof setInterval> | null = null

  function tick() {
    if (cursor >= source.length) {
      stop()
      return
    }
    cursor = Math.min(source.length, cursor + chunkSize)
    text.value = source.slice(0, cursor)
    progress.value = cursor / source.length
  }

  function stop() {
    streaming.value = false
    if (timer != null) {
      clearInterval(timer)
      timer = null
    }
  }

  function play() {
    if (timer != null) return
    if (cursor >= source.length) return
    streaming.value = true
    timer = setInterval(tick, intervalMs)
  }

  onBeforeUnmount(stop)

  return {
    text,
    streaming,
    progress,
    play,
    pause: stop,
    restart() {
      stop()
      cursor = 0
      text.value = ''
      progress.value = 0
      play()
    },
    finish() {
      stop()
      cursor = source.length
      text.value = source
      progress.value = 1
    },
  }
}
