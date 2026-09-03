import { createApp } from 'vue'
import App from './App.vue'
import './app.css'
import '@autodown/engine/style.css'
import 'katex/dist/katex.min.css'
// Query/Embed mock loaders (plan 038 T7): registered on the engine's
// module-level slot BEFORE mount — the editor's query/embed samples and
// the right-pane static render both resolve through it.
import { registerDemoLoaders } from './mockLoaders'
// Highlight capability (plan 039 T6): heavy capabilities are host opt-ins
// (plan 008 goal 3) — the editor pane's fence preview gates on the flag
// (renderViewHighlight). The right pane self-enables inside
// StreamingRenderer, but relying on that module having been imported left
// the left column's previews degraded to plain text; register explicitly
// before mount so both panes render token-colored code.
import { enableHighlight } from '@autodown/engine'

registerDemoLoaders()
enableHighlight()
createApp(App).mount('#app')
