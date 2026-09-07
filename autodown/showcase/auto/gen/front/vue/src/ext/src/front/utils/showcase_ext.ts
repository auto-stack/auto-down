// showcase_ext.ts — hand-written TS extension for the showcase root widget
// (../showcase.at, PLAN-059; demo app_ext.ts precedent plan 014 Phase 0).
// Imported via `use { fn: ... }`; the Auto build copies it into the gen
// project as src/ext/src/front/utils/showcase_ext.ts, and the generated
// App.vue (deployed to showcase/src/ by gen/regen.sh) imports it from
// ./auto/src/front/utils/showcase_ext.
//
// What lives here per task:
// - initial_content — reads the sample.ts single source (demo content.ts
//   precedent, plan 040 单源化); the VM track resolves the same port name
//   to the GENERATED showcase_ext.vm.at adapter instead.
// - is_vue — the track probe (demo precedent, plan 040): vue track returns
//   true; VM track degrades to the ext no-op stub returning None, so
//   `if is_vue() != None` discriminates on both tracks. Guards every
//   vue-only bridge write (VM state has no template-ref fields).
// - log_ready — init console marker (the demo logSave/logCancel slot).

import { reactive, ref } from 'vue'
import { SAMPLE_DOCUMENT } from '../../../../src/sample'

export function initial_content(): string {
  return SAMPLE_DOCUMENT
}

export function is_vue(): boolean {
  return true
}

export function log_ready(msg: string) {
  console.log('showcase:', msg)
}

// PLAN-059 T6: vue-track autoplay bridge — the timer lives here (jade
// precedent: the DSL has no tick primitive; timers are an ext escape-hatch,
// vue-only). The feed window state is BRIDGE-OWNED on the vue track (demo
// csb_* dual-source precedent: computeds dispatch by track — vue reads the
// bridge, VM reads the widget model state the T5 state machine drives).
// Widget handlers guard with is_vue() and delegate to reset/step/play/stop.
export function useShowcaseBridge() {
  const feedSource = ref('')
  const streamText = ref('')
  const playing = ref(false)
  const speed = ref(96)
  let timer: number | null = null

  // One feed tick: grow the window by `speed` chars; auto-settle at the end
  // (playing flag down + interval cleared — no dangling timer, plan T6).
  function step() {
    if (streamText.value.length < feedSource.value.length) {
      const next = Math.min(feedSource.value.length, streamText.value.length + speed.value)
      streamText.value = feedSource.value.slice(0, next)
      if (next >= feedSource.value.length) {
        playing.value = false
        stop()
      }
    } else {
      playing.value = false
      stop()
    }
  }

  function play() {
    stop()
    timer = window.setInterval(step, 90)
  }

  function stop() {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  // Replay semantics (mirrors the VM arm of .FeedReset / .FeedPlayPause):
  // snapshot the CURRENT content — edits during playback don't disturb the
  // running replay; the next replay takes a fresh snapshot.
  function reset(src: string) {
    stop()
    feedSource.value = src
    streamText.value = ''
    playing.value = false
  }

  return reactive({
    feedSource,
    streamText,
    playing,
    speed,
    step,
    play,
    stop,
    reset,
  })
}
