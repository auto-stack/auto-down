import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@autodown/editor/style.css'
import '@autodown/vue/style.css'
import './assets/index.css'
import './assets/autodown-editor.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
