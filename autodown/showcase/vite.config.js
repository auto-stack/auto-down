import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            // The generated root SFC imports the SettingsPopover child via
            // '@/components/...' (demo precedent — the alias stays, vite resolves).
            '@': resolve(__dirname, 'src'),
        },
    },
    optimizeDeps: {
        // plan 027: workspace:* 的 engine 按源处理（serve 默认激活 development
        // 条件，无需显式 resolve.conditions）；不走预打包则避免命中 dist。
        exclude: ['@autodown/engine'],
    },
    server: {
        port: 5175,
    },
});
