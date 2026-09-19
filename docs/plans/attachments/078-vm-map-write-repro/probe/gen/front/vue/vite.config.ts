import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    // AUTO_FRONT_PORT (default 3000) lets multiple `auto run` instances coexist.
    port: Number(process.env.AUTO_FRONT_PORT || 3000),
    // Only auto-open browser when NOT running under Tauri
    // Tauri sets TAURI_ENV before running vite
    open: !process.env.TAURI_ENV,
    // Proxy API requests to Rust backend.
    // Read the backend port at RUNTIME from AUTO_HTTP_PORT (set by `auto run -B`),
    // so the proxy target updates without regenerating vite.config.ts.
    proxy: {
      '/api': {
        target: process.env.AUTO_HTTP_PROXY || `http://127.0.0.1:${process.env.AUTO_HTTP_PORT || 8080}`,
        changeOrigin: true,
      }
    }
  }
})
