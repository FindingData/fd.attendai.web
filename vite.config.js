import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ mode, command }) => {
  // 约定：mode=dev 使用 .env.dev；mode=prod 使用 .env.prod
  const isDev = command === 'serve' || mode === 'dev'
  const env = loadEnv(mode, process.cwd(), 'VITE_') // 只取以 VITE_ 开头的变量

  return {
    plugins: [vue(), isDev && vueDevTools()].filter(Boolean),
    server: {
      host: true,
      port: Number(env.VITE_DEV_PORT ?? 5167),
      proxy: {
        // 前端请求 /api 会被代理到 .NET
        '/api': {
          target: env.VITE_API_BASE_URL ?? 'http://localhost:5166',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    // 部署根路径（需要时在 .env.* 里用 VITE_BASE 配置）
    base: env.VITE_BASE || '/',
    // 开发保留 sourcemap，生产关闭（可按需改）
    build: { sourcemap: isDev },
  }
})
