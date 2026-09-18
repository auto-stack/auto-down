import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      // 真件 SFC / facade 的 `@/...` 导入 → front/src（零副本消费：
      // 同一构建产物即生产面）。
      '@': resolve(here, '../src'),
    },
  },
  server: { port: 3100 },
  preview: { port: 3100 },
})
