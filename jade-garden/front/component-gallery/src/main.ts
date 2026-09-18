// main.ts — gallery vue 臂入口（PLAN-072 T-01）。
// bootstrap（fixture API shim）必须最先导入：store 单例模块在后续导入
// 链上立即求值，其间发出的 api 调用须已被 shim 截获。
import './bootstrap'
import './gallery.css'
import App from './App.vue'
import { createApp } from 'vue'

createApp(App).mount('#app')
