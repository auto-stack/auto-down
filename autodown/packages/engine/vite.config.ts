import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

// Multi-entry lib build (plan 017): one bundle per public exit —
// index (full engine), parser (vue-free), render, editor. All layers share
// one css asset (style.css); editor's autodown-editor.css is imported by the
// editor barrel and lands in the same asset.
export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        parser: resolve(__dirname, 'src/parser.ts'),
        render: resolve(__dirname, 'src/render.ts'),
        editor: resolve(__dirname, 'src/editor.ts'),
      },
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        'vue',
        /^@tiptap\/.*/,
        /^lucide-vue-next$/,
        'katex',
        'mermaid',
        'lowlight',
        'hast-util-to-html',
      ],
      output: {
        globals: {
          vue: 'Vue',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'style.css'
          return assetInfo.name ?? 'assets/[name][extname]'
        },
      },
    },
    cssCodeSplit: false,
  },
})
