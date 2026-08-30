import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [vue()],
  resolve: {
    // plan 027: dev serve 让 @autodown/engine 解析到 src（exports development
    // 条件）。必须只在 serve 生效——vite 6 的 resolve.conditions 是整体替换
    // 默认集 ['module','browser','development|production']，且 serve/build 共
    // 用；无条件声明 development 会让 production build 也吃 src（实证：build
    // 深入 src+mermaid 源码图静默狂奔），破坏"build 吃 dist"不变量。这里显
    // 式复刻默认集 + development（真加性，双保险）。
    ...(command === 'serve'
      ? { conditions: ['module', 'browser', 'development|production', 'development'] }
      : {}),
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // linked 包按源处理，不走预打包（预打包走 node 解析会命中 dist）。
    // optimizeDeps 本就是 dev-only 概念，build 不读它。
    exclude: ['@autodown/engine'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.AUTO_HTTP_PROXY || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
}))
