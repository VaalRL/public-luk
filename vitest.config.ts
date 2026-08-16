import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './vitest.setup.ts',
        // 排除建置產物，否則 `next build` 之後 .next/standalone 下的測試副本會被重複收集
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.next/**',
            '**/electron-dist-temp/**',
            '**/dist-electron/**',
        ],
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})
