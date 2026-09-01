import { createApp } from 'vue'
import App from './App.vue'
import './app.css'
import '@autodown/engine/style.css'
import 'katex/dist/katex.min.css'
// Query/Embed mock loaders (plan 038 T7): registered on the engine's
// module-level slot BEFORE mount — the editor's query/embed samples and
// the right-pane static render both resolve through it.
import { registerDemoLoaders } from './mockLoaders'

registerDemoLoaders()
createApp(App).mount('#app')
