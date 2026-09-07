import { createApp } from 'vue'
import App from './App.vue'
import './app.css'
import '@autodown/engine/style.css'
import 'katex/dist/katex.min.css'
// Highlight capability (plan 039 T6 host opt-in, demo/src/main.ts precedent):
// the stream/view panes self-enable inside StreamingRenderer, but the edit
// pane's fence previews gate on the flag — register explicitly before mount.
import { enableHighlight } from '@autodown/engine'

enableHighlight()
createApp(App).mount('#app')
