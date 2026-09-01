// Stream tri-state e2e harness entry (plan 032 T8): mounts two
// StreamingRenderer panes over one source ref —
//   #stream-pane: streaming=true  (the progressive read, final=false)
//   #final-pane:   streaming=false (the terminal view, final=true)
// scrollSync is OFF on both panes (plain streaming reads — the is-sync margin
// zeroing is the editor-alignment mode, not the streaming contract under
// test; identical flags on both sides keep the parity comparison honest).
// The editor barrel import pulls in the extension-panel registrations
// (MathBlock/Mermaid/Details/Query/Embed) exactly like the real demo's right
// pane, plus the engine stylesheet; katex css mirrors main.ts.
// e2e drives window.__streamHarness.feed(text) frame by frame.

import { createApp, h, ref } from 'vue'
import { StreamingRenderer } from '@autodown/engine'
import '@autodown/engine/editor'
import '@autodown/engine/style.css'
import 'katex/dist/katex.min.css'

const source = ref('')

const app = createApp({
  setup() {
    return () =>
      h('div', { class: 'harness-panes' }, [
        h('section', { class: 'harness-pane', id: 'stream-pane' }, [
          h('p', { class: 'pane-label' }, 'streaming'),
          h(StreamingRenderer, { source: source.value, streaming: true, scrollSync: false }),
        ]),
        h('section', { class: 'harness-pane', id: 'final-pane' }, [
          h('p', { class: 'pane-label' }, 'final'),
          h(StreamingRenderer, { source: source.value, streaming: false, scrollSync: false }),
        ]),
      ])
  },
})
app.mount('#app')

;(window as any).__streamHarness = {
  feed(text: string) {
    source.value = text
  },
}
