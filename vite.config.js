import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Forward /api calls to the FastAPI backend so the browser never makes a
  // cross-origin request during development (see src/config/api.js).
  const apiProxy = {
    '/api': {
      target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
      changeOrigin: true,
    },
  }

  return {
    plugins: [react()],
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
  }
})
