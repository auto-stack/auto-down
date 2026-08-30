import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    // plan 027: dev serve 解析 @autodown/engine 到 src（exports development
    // 条件）。vite serve 本就激活 development，这里显式声明是双保险。
    conditions: ['development'],
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // linked 包按源处理，不走预打包（预打包走 node 解析会命中 dist）。
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
})
