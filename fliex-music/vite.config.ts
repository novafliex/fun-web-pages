/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base 允许通过 DEPLOY_BASE 覆盖（GitHub Actions 按 GITHUB_REPOSITORY 推导），
// 默认对应当前仓库的 Pages 子路径；Fork 后无需手改源码。
export default defineConfig({
  plugins: [react()],
  base: process.env.DEPLOY_BASE ?? '/fun-web-pages/fliex-music/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
